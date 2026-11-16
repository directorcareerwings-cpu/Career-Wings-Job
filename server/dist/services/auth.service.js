"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPasswordResetToken = exports.generatePasswordResetToken = exports.comparePassword = exports.hashPassword = exports.revokeAllUserRefreshTokens = exports.revokeRefreshToken = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../lib/errors");
const getAccessSecret = () => process.env.JWT_ACCESS_SECRET || 'cw-access-secret-change-in-production-2024';
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || 'cw-refresh-secret-change-in-production-2024';
const getAccessExpires = () => process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_DAYS = 7;
const generateAccessToken = (userId, role, email) => {
    return jsonwebtoken_1.default.sign({ userId, role, email }, getAccessSecret(), {
        expiresIn: getAccessExpires(),
    });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = async (userId) => {
    const token = (0, uuid_1.v4)();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);
    await prisma_1.prisma.refreshToken.create({
        data: { token, userId, expiresAt },
    });
    return token;
};
exports.generateRefreshToken = generateRefreshToken;
const verifyAccessToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, getAccessSecret());
    }
    catch {
        throw new errors_1.AppError('Invalid or expired access token.', 401);
    }
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = async (token) => {
    const record = await prisma_1.prisma.refreshToken.findUnique({ where: { token } });
    if (!record || record.isRevoked) {
        throw new errors_1.AppError('Invalid refresh token. Please log in again.', 401);
    }
    if (record.expiresAt < new Date()) {
        await prisma_1.prisma.refreshToken.update({ where: { token }, data: { isRevoked: true } });
        throw new errors_1.AppError('Refresh token expired. Please log in again.', 401);
    }
    return { userId: record.userId };
};
exports.verifyRefreshToken = verifyRefreshToken;
const revokeRefreshToken = async (token) => {
    await prisma_1.prisma.refreshToken.updateMany({
        where: { token },
        data: { isRevoked: true },
    });
};
exports.revokeRefreshToken = revokeRefreshToken;
const revokeAllUserRefreshTokens = async (userId) => {
    await prisma_1.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
    });
};
exports.revokeAllUserRefreshTokens = revokeAllUserRefreshTokens;
const hashPassword = async (password) => {
    return bcryptjs_1.default.hash(password, 12);
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hash) => {
    return bcryptjs_1.default.compare(password, hash);
};
exports.comparePassword = comparePassword;
const generatePasswordResetToken = async (userId) => {
    // Invalidate old tokens
    await prisma_1.prisma.passwordReset.updateMany({
        where: { userId, isUsed: false },
        data: { isUsed: true },
    });
    const token = (0, uuid_1.v4)();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry
    await prisma_1.prisma.passwordReset.create({
        data: { token, userId, expiresAt },
    });
    return token;
};
exports.generatePasswordResetToken = generatePasswordResetToken;
const verifyPasswordResetToken = async (token) => {
    const record = await prisma_1.prisma.passwordReset.findUnique({ where: { token } });
    if (!record || record.isUsed) {
        throw new errors_1.AppError('Invalid or already used password reset token.', 400);
    }
    if (record.expiresAt < new Date()) {
        throw new errors_1.AppError('Password reset token has expired. Please request a new one.', 400);
    }
    return record.userId;
};
exports.verifyPasswordResetToken = verifyPasswordResetToken;
//# sourceMappingURL=auth.service.js.map