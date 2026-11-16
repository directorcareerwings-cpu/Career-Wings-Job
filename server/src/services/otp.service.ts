import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
const RATE_LIMIT_WINDOW_MINUTES = 15;
const MAX_OTP_REQUESTS_PER_WINDOW = 3;

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
export const generateOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Hash an OTP for secure database storage
 */
export const hashOtp = async (otp: string): Promise<string> => {
  return bcrypt.hash(otp, 10);
};

/**
 * Verify plain OTP against stored hash
 */
export const verifyOtpHash = async (otp: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(otp, hash);
};

/**
 * Enforce rate limiting: Maximum 3 OTP generation requests per 15 minutes per email
 */
export const checkOtpRateLimit = async (email: string, type: string): Promise<void> => {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

  const recentCount = await prisma.otpVerification.count({
    where: {
      email: email.toLowerCase().trim(),
      type,
      createdAt: { gte: windowStart },
    },
  });

  if (recentCount >= MAX_OTP_REQUESTS_PER_WINDOW) {
    throw new AppError(
      `Too many OTP requests. Please wait ${RATE_LIMIT_WINDOW_MINUTES} minutes before requesting a new code.`,
      429
    );
  }
};

/**
 * Create and persist a new OTP verification record.
 * Invalidates any existing unused OTPs for this email and type.
 * Returns the plain OTP string (only for immediate email sending).
 */
export const createOtpRecord = async (
  email: string,
  type: 'REGISTRATION' | 'PASSWORD_RESET',
  userId?: string
): Promise<string> => {
  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit check
  await checkOtpRateLimit(normalizedEmail, type);

  // Invalidate previous unexpired OTPs for this email and type
  await prisma.otpVerification.updateMany({
    where: {
      email: normalizedEmail,
      type,
      isUsed: false,
    },
    data: {
      isUsed: true,
      usedAt: new Date(),
    },
  });

  const plainOtp = generateOtp();
  const otpHash = await hashOtp(plainOtp);

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpVerification.create({
    data: {
      email: normalizedEmail,
      userId: userId || null,
      otpHash,
      type,
      expiresAt,
      attemptCount: 0,
      maxAttempts: MAX_ATTEMPTS,
      isUsed: false,
    },
  });

  return plainOtp;
};

/**
 * Verify an entered OTP against active records for an email & type
 */
export const verifyOtp = async (
  email: string,
  otp: string,
  type: 'REGISTRATION' | 'PASSWORD_RESET'
): Promise<{ success: boolean; userId?: string | null }> => {
  const normalizedEmail = email.toLowerCase().trim();

  // Find the latest valid OTP record
  const record = await prisma.otpVerification.findFirst({
    where: {
      email: normalizedEmail,
      type,
      isUsed: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    throw new AppError('No active OTP found. Please request a new verification code.', 400);
  }

  // Check if expired
  if (new Date() > record.expiresAt) {
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { isUsed: true },
    });
    throw new AppError('OTP has expired. Please request a new verification code.', 400);
  }

  // Check attempts
  if (record.attemptCount >= record.maxAttempts) {
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { isUsed: true },
    });
    throw new AppError('Too many failed attempts. This OTP has been invalidated. Please request a new one.', 400);
  }

  // Verify hash
  const isValid = await verifyOtpHash(otp.trim(), record.otpHash);

  if (!isValid) {
    const updatedAttempts = record.attemptCount + 1;
    const attemptsLeft = Math.max(0, record.maxAttempts - updatedAttempts);

    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attemptCount: updatedAttempts },
    });

    if (attemptsLeft === 0) {
      throw new AppError('Invalid OTP. Maximum attempts reached. Please request a new code.', 400);
    }

    throw new AppError(`Invalid OTP code. You have ${attemptsLeft} attempt(s) remaining.`, 400);
  }

  // Mark OTP as used
  await prisma.otpVerification.update({
    where: { id: record.id },
    data: {
      isUsed: true,
      usedAt: new Date(),
    },
  });

  return { success: true, userId: record.userId };
};
