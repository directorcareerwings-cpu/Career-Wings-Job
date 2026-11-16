import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

const getAccessSecret = (): string => process.env.JWT_ACCESS_SECRET || 'cw-access-secret-change-in-production-2024';
const getRefreshSecret = (): string => process.env.JWT_REFRESH_SECRET || 'cw-refresh-secret-change-in-production-2024';
const getAccessExpires = (): string => process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_DAYS = 7;

export const generateAccessToken = (userId: string, role: string, email: string): string => {
  return jwt.sign({ userId, role, email }, getAccessSecret(), {
    expiresIn: getAccessExpires() as any,
  });
};

export const generateRefreshToken = async (userId: string): Promise<string> => {
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
};

export const verifyAccessToken = (token: string): { userId: string; role: string; email: string } => {
  try {
    return jwt.verify(token, getAccessSecret()) as { userId: string; role: string; email: string };
  } catch {
    throw new AppError('Invalid or expired access token.', 401);
  }
};

export const verifyRefreshToken = async (token: string): Promise<{ userId: string }> => {
  const record = await prisma.refreshToken.findUnique({ where: { token } });

  if (!record || record.isRevoked) {
    throw new AppError('Invalid refresh token. Please log in again.', 401);
  }

  if (record.expiresAt < new Date()) {
    await prisma.refreshToken.update({ where: { token }, data: { isRevoked: true } });
    throw new AppError('Refresh token expired. Please log in again.', 401);
  }

  return { userId: record.userId };
};

export const revokeRefreshToken = async (token: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { isRevoked: true },
  });
};

export const revokeAllUserRefreshTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { isRevoked: true },
  });
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generatePasswordResetToken = async (userId: string): Promise<string> => {
  // Invalidate old tokens
  await prisma.passwordReset.updateMany({
    where: { userId, isUsed: false },
    data: { isUsed: true },
  });

  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

  await prisma.passwordReset.create({
    data: { token, userId, expiresAt },
  });

  return token;
};

export const verifyPasswordResetToken = async (token: string): Promise<string> => {
  const record = await prisma.passwordReset.findUnique({ where: { token } });

  if (!record || record.isUsed) {
    throw new AppError('Invalid or already used password reset token.', 400);
  }

  if (record.expiresAt < new Date()) {
    throw new AppError('Password reset token has expired. Please request a new one.', 400);
  }

  return record.userId;
};
