"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtp = exports.createOtpRecord = exports.checkOtpRateLimit = exports.verifyOtpHash = exports.hashOtp = exports.generateOtp = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../lib/errors");
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
const RATE_LIMIT_WINDOW_MINUTES = 15;
const MAX_OTP_REQUESTS_PER_WINDOW = 3;
/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
const generateOtp = () => {
    return crypto_1.default.randomInt(100000, 1000000).toString();
};
exports.generateOtp = generateOtp;
/**
 * Hash an OTP for secure database storage
 */
const hashOtp = async (otp) => {
    return bcryptjs_1.default.hash(otp, 10);
};
exports.hashOtp = hashOtp;
/**
 * Verify plain OTP against stored hash
 */
const verifyOtpHash = async (otp, hash) => {
    return bcryptjs_1.default.compare(otp, hash);
};
exports.verifyOtpHash = verifyOtpHash;
/**
 * Enforce rate limiting: Maximum 3 OTP generation requests per 15 minutes per email
 */
const checkOtpRateLimit = async (email, type) => {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
    const recentCount = await prisma_1.prisma.otpVerification.count({
        where: {
            email: email.toLowerCase().trim(),
            type,
            createdAt: { gte: windowStart },
        },
    });
    if (recentCount >= MAX_OTP_REQUESTS_PER_WINDOW) {
        throw new errors_1.AppError(`Too many OTP requests. Please wait ${RATE_LIMIT_WINDOW_MINUTES} minutes before requesting a new code.`, 429);
    }
};
exports.checkOtpRateLimit = checkOtpRateLimit;
/**
 * Create and persist a new OTP verification record.
 * Invalidates any existing unused OTPs for this email and type.
 * Returns the plain OTP string (only for immediate email sending).
 */
const createOtpRecord = async (email, type, userId) => {
    const normalizedEmail = email.toLowerCase().trim();
    // Rate limit check
    await (0, exports.checkOtpRateLimit)(normalizedEmail, type);
    // Invalidate previous unexpired OTPs for this email and type
    await prisma_1.prisma.otpVerification.updateMany({
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
    const plainOtp = (0, exports.generateOtp)();
    const otpHash = await (0, exports.hashOtp)(plainOtp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await prisma_1.prisma.otpVerification.create({
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
exports.createOtpRecord = createOtpRecord;
/**
 * Verify an entered OTP against active records for an email & type
 */
const verifyOtp = async (email, otp, type) => {
    const normalizedEmail = email.toLowerCase().trim();
    // Find the latest valid OTP record
    const record = await prisma_1.prisma.otpVerification.findFirst({
        where: {
            email: normalizedEmail,
            type,
            isUsed: false,
        },
        orderBy: { createdAt: 'desc' },
    });
    if (!record) {
        throw new errors_1.AppError('No active OTP found. Please request a new verification code.', 400);
    }
    // Check if expired
    if (new Date() > record.expiresAt) {
        await prisma_1.prisma.otpVerification.update({
            where: { id: record.id },
            data: { isUsed: true },
        });
        throw new errors_1.AppError('OTP has expired. Please request a new verification code.', 400);
    }
    // Check attempts
    if (record.attemptCount >= record.maxAttempts) {
        await prisma_1.prisma.otpVerification.update({
            where: { id: record.id },
            data: { isUsed: true },
        });
        throw new errors_1.AppError('Too many failed attempts. This OTP has been invalidated. Please request a new one.', 400);
    }
    // Verify hash
    const isValid = await (0, exports.verifyOtpHash)(otp.trim(), record.otpHash);
    if (!isValid) {
        const updatedAttempts = record.attemptCount + 1;
        const attemptsLeft = Math.max(0, record.maxAttempts - updatedAttempts);
        await prisma_1.prisma.otpVerification.update({
            where: { id: record.id },
            data: { attemptCount: updatedAttempts },
        });
        if (attemptsLeft === 0) {
            throw new errors_1.AppError('Invalid OTP. Maximum attempts reached. Please request a new code.', 400);
        }
        throw new errors_1.AppError(`Invalid OTP code. You have ${attemptsLeft} attempt(s) remaining.`, 400);
    }
    // Mark OTP as used
    await prisma_1.prisma.otpVerification.update({
        where: { id: record.id },
        data: {
            isUsed: true,
            usedAt: new Date(),
        },
    });
    return { success: true, userId: record.userId };
};
exports.verifyOtp = verifyOtp;
//# sourceMappingURL=otp.service.js.map