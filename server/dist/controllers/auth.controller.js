"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.resetPasswordWithOtp = exports.verifyPasswordResetOtp = exports.forgotPassword = exports.getMe = exports.logout = exports.refreshToken = exports.login = exports.resendEmailOtp = exports.verifyEmailOtp = exports.register = exports.loginValidation = exports.registerValidation = void 0;
const express_validator_1 = require("express-validator");
const prisma_1 = require("../lib/prisma");
const response_1 = require("../lib/response");
const errors_1 = require("../lib/errors");
const auth_service_1 = require("../services/auth.service");
const email_service_1 = require("../services/email.service");
const otp_service_1 = require("../services/otp.service");
// Validation rules
exports.registerValidation = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
        .matches(/[0-9]/).withMessage('Password must contain a number'),
    (0, express_validator_1.body)('role').isIn(['CANDIDATE', 'EMPLOYER']).withMessage('Role must be CANDIDATE or EMPLOYER'),
    (0, express_validator_1.body)('firstName').trim().isLength({ min: 2 }).withMessage('First name required'),
    (0, express_validator_1.body)('lastName').trim().isLength({ min: 1 }).withMessage('Last name required'),
];
exports.loginValidation = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password required'),
];
const register = async (req, res, next) => {
    try {
        const { email, password, role, firstName, lastName, phone, companyName, designation } = req.body;
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new errors_1.AppError('An account with this email already exists.', 409);
        }
        const passwordHash = await (0, auth_service_1.hashPassword)(password);
        const user = await prisma_1.prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: { email, passwordHash, role },
            });
            if (role === 'CANDIDATE') {
                await tx.candidate.create({
                    data: {
                        userId: newUser.id,
                        firstName,
                        lastName,
                        phone: phone || null,
                    },
                });
            }
            else if (role === 'EMPLOYER') {
                let company = null;
                if (companyName) {
                    const slugify = (await Promise.resolve().then(() => __importStar(require('slugify')))).default;
                    const baseSlug = slugify(companyName, { lower: true, strict: true });
                    let slug = baseSlug;
                    let count = 0;
                    while (await tx.company.findUnique({ where: { slug } })) {
                        slug = `${baseSlug}-${++count}`;
                    }
                    company = await tx.company.create({
                        data: { name: companyName, slug },
                    });
                }
                await tx.employer.create({
                    data: {
                        userId: newUser.id,
                        firstName,
                        lastName,
                        phone: phone || null,
                        designation: designation || null,
                        companyId: company?.id || null,
                    },
                });
            }
            return newUser;
        });
        const accessToken = (0, auth_service_1.generateAccessToken)(user.id, user.role, user.email);
        const refreshToken = await (0, auth_service_1.generateRefreshToken)(user.id);
        // Set refresh token as httpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        // Generate secure 6-digit OTP and send to user
        const otp = await (0, otp_service_1.createOtpRecord)(user.email, 'REGISTRATION', user.id);
        (0, email_service_1.sendOtpEmail)(user.email, firstName, otp, 'REGISTRATION', 10, user.id).catch(console.error);
        (0, response_1.sendSuccess)(res, {
            requiresVerification: true,
            userId: user.id,
            email: user.email,
            role: user.role,
            firstName,
        }, 'Account created successfully! A 6-digit verification code has been sent to your email.', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const verifyEmailOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            throw new errors_1.AppError('Email and 6-digit OTP code are required', 400);
        }
        await (0, otp_service_1.verifyOtp)(email, otp, 'REGISTRATION');
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: {
                candidate: true,
                employer: { include: { company: true } },
            },
        });
        if (!user)
            throw new errors_1.AppError('User account not found', 404);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { isVerified: true, emailVerifiedAt: new Date() },
        });
        const firstName = user.candidate?.firstName || user.employer?.firstName || user.email.split('@')[0];
        const lastName = user.candidate?.lastName || user.employer?.lastName || '';
        // Issue tokens
        const accessToken = (0, auth_service_1.generateAccessToken)(user.id, user.role, user.email);
        const refreshToken = await (0, auth_service_1.generateRefreshToken)(user.id);
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        // Send Welcome & Confirmation Emails asynchronously
        (0, email_service_1.sendWelcomeEmail)(user.email, firstName, user.role, user.id).catch(console.error);
        (0, email_service_1.sendRegistrationConfirmationEmail)(user.email, firstName, user.role, user.id).catch(console.error);
        (0, response_1.sendSuccess)(res, {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName,
                lastName,
                avatar: user.candidate?.profilePhoto || null,
                profile: user.candidate || user.employer,
            },
        }, 'Email verified successfully! Welcome to Career Wings.');
    }
    catch (error) {
        next(error);
    }
};
exports.verifyEmailOtp = verifyEmailOtp;
const resendEmailOtp = async (req, res, next) => {
    try {
        const { email, type = 'REGISTRATION' } = req.body;
        if (!email)
            throw new errors_1.AppError('Email address is required', 400);
        const normalizedEmail = email.toLowerCase().trim();
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: { candidate: true, employer: true },
        });
        if (!user) {
            // Return success to avoid user enumeration
            (0, response_1.sendSuccess)(res, null, 'If an account exists, a new verification code has been sent.');
            return;
        }
        if (type === 'REGISTRATION' && user.isVerified) {
            throw new errors_1.AppError('Your email is already verified. Please proceed to log in.', 400);
        }
        const firstName = user.candidate?.firstName || user.employer?.firstName || 'User';
        const otp = await (0, otp_service_1.createOtpRecord)(normalizedEmail, type, user.id);
        (0, email_service_1.sendOtpEmail)(user.email, firstName, otp, type, 10, user.id).catch(console.error);
        (0, response_1.sendSuccess)(res, null, 'A new verification code has been dispatched to your email.');
    }
    catch (error) {
        next(error);
    }
};
exports.resendEmailOtp = resendEmailOtp;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new errors_1.AppError('Invalid email or password.', 401);
        if (!user.isActive)
            throw new errors_1.AppError('Your account has been suspended. Please contact support.', 403);
        const isValid = await (0, auth_service_1.comparePassword)(password, user.passwordHash);
        if (!isValid)
            throw new errors_1.AppError('Invalid email or password.', 401);
        await prisma_1.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        const accessToken = (0, auth_service_1.generateAccessToken)(user.id, user.role, user.email);
        const refreshToken = await (0, auth_service_1.generateRefreshToken)(user.id);
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        // Get profile info
        let profile = null;
        if (user.role === 'CANDIDATE') {
            profile = await prisma_1.prisma.candidate.findUnique({
                where: { userId: user.id },
                select: { id: true, firstName: true, lastName: true, profilePhoto: true, profileCompletion: true },
            });
        }
        else if (user.role === 'EMPLOYER') {
            profile = await prisma_1.prisma.employer.findUnique({
                where: { userId: user.id },
                select: { id: true, firstName: true, lastName: true, company: { select: { id: true, name: true, logo: true } } },
            });
        }
        (0, response_1.sendSuccess)(res, {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: profile?.firstName || (user.role === 'ADMIN' ? 'Admin' : (user.email.split('@')[0])),
                lastName: profile?.lastName || (user.role === 'ADMIN' ? 'User' : ''),
                avatar: profile?.profilePhoto || null,
                profile,
            },
        }, 'Login successful');
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const refreshToken = async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        if (!token)
            throw new errors_1.AppError('Refresh token required', 401);
        const { userId } = await (0, auth_service_1.verifyRefreshToken)(token);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true, isActive: true },
        });
        if (!user || !user.isActive)
            throw new errors_1.AppError('User not found or inactive', 401);
        // Revoke old token and issue new ones (token rotation)
        await (0, auth_service_1.revokeRefreshToken)(token);
        const newAccessToken = (0, auth_service_1.generateAccessToken)(user.id, user.role, user.email);
        const newRefreshToken = await (0, auth_service_1.generateRefreshToken)(user.id);
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        // Get profile info so client store stays populated
        let profile = null;
        if (user.role === 'CANDIDATE') {
            profile = await prisma_1.prisma.candidate.findUnique({
                where: { userId: user.id },
                select: { id: true, firstName: true, lastName: true, profilePhoto: true, profileCompletion: true },
            });
        }
        else if (user.role === 'EMPLOYER') {
            profile = await prisma_1.prisma.employer.findUnique({
                where: { userId: user.id },
                select: { id: true, firstName: true, lastName: true, company: { select: { id: true, name: true, logo: true } } },
            });
        }
        (0, response_1.sendSuccess)(res, {
            accessToken: newAccessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: profile?.firstName || (user.role === 'ADMIN' ? 'Admin' : (user.email.split('@')[0])),
                lastName: profile?.lastName || (user.role === 'ADMIN' ? 'User' : ''),
                avatar: profile?.profilePhoto || null,
                profile,
            },
        }, 'Token refreshed');
    }
    catch (error) {
        next(error);
    }
};
exports.refreshToken = refreshToken;
const logout = async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        if (token)
            await (0, auth_service_1.revokeRefreshToken)(token);
        res.clearCookie('refreshToken');
        res.clearCookie('accessToken');
        (0, response_1.sendSuccess)(res, null, 'Logged out successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
const getMe = async (req, res, next) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true, role: true, isVerified: true, createdAt: true, lastLoginAt: true },
        });
        if (!user)
            throw new errors_1.AppError('User not found', 404);
        let profile = null;
        if (user.role === 'CANDIDATE') {
            profile = await prisma_1.prisma.candidate.findUnique({
                where: { userId: user.id },
                include: {
                    candidateSkills: { include: { skill: true } },
                    education: { orderBy: { startYear: 'desc' } },
                    experience: { orderBy: { startDate: 'desc' } },
                    certifications: true,
                    languages: true,
                },
            });
        }
        else if (user.role === 'EMPLOYER') {
            profile = await prisma_1.prisma.employer.findUnique({
                where: { userId: user.id },
                include: { company: true },
            });
        }
        (0, response_1.sendSuccess)(res, {
            ...user,
            firstName: profile?.firstName || (user.role === 'ADMIN' ? 'Admin' : (user.email.split('@')[0])),
            lastName: profile?.lastName || (user.role === 'ADMIN' ? 'User' : ''),
            avatar: profile?.profilePhoto || null,
            isEmployerApproved: user.role === 'EMPLOYER' ? Boolean(profile?.isVerified) : true,
            profile,
        }, 'User retrieved');
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email)
            throw new errors_1.AppError('Email address is required', 400);
        const normalizedEmail = email.toLowerCase().trim();
        const user = await prisma_1.prisma.user.findUnique({ where: { email: normalizedEmail } });
        // Always return generic success to protect against account enumeration
        if (user) {
            const profile = (await prisma_1.prisma.candidate.findUnique({
                where: { userId: user.id },
                select: { firstName: true },
            })) ||
                (await prisma_1.prisma.employer.findUnique({
                    where: { userId: user.id },
                    select: { firstName: true },
                }));
            const firstName = profile?.firstName || 'User';
            // Generate secure 6-digit OTP
            const otp = await (0, otp_service_1.createOtpRecord)(normalizedEmail, 'PASSWORD_RESET', user.id);
            (0, email_service_1.sendOtpEmail)(user.email, firstName, otp, 'PASSWORD_RESET', 10, user.id).catch(console.error);
        }
        (0, response_1.sendSuccess)(res, null, 'If an account with this email exists, a 6-digit password reset code has been sent to your inbox.');
    }
    catch (error) {
        next(error);
    }
};
exports.forgotPassword = forgotPassword;
const verifyPasswordResetOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp)
            throw new errors_1.AppError('Email and 6-digit reset code are required', 400);
        const normalizedEmail = email.toLowerCase().trim();
        await (0, otp_service_1.verifyOtp)(normalizedEmail, otp, 'PASSWORD_RESET');
        (0, response_1.sendSuccess)(res, { verified: true }, 'Reset code verified successfully. You may now choose a new password.');
    }
    catch (error) {
        next(error);
    }
};
exports.verifyPasswordResetOtp = verifyPasswordResetOtp;
const resetPasswordWithOtp = async (req, res, next) => {
    try {
        const { email, otp, password } = req.body;
        if (!email || !otp || !password) {
            throw new errors_1.AppError('Email, 6-digit reset code, and new password are required', 400);
        }
        if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
            throw new errors_1.AppError('Password must be at least 8 characters with at least 1 uppercase letter and 1 number.', 400);
        }
        const normalizedEmail = email.toLowerCase().trim();
        // Verify OTP code
        await (0, otp_service_1.verifyOtp)(normalizedEmail, otp, 'PASSWORD_RESET');
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: { candidate: true, employer: true },
        });
        if (!user)
            throw new errors_1.AppError('User account not found', 404);
        const passwordHash = await (0, auth_service_1.hashPassword)(password);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash },
        });
        // Invalidate all active user sessions / refresh tokens
        await (0, auth_service_1.revokeAllUserRefreshTokens)(user.id);
        res.clearCookie('refreshToken');
        // Send confirmation email
        const firstName = user.candidate?.firstName || user.employer?.firstName || 'User';
        (0, email_service_1.sendPasswordChangedEmail)(user.email, firstName, req.ip, user.id).catch(console.error);
        (0, response_1.sendSuccess)(res, null, 'Your password has been changed successfully. Please log in with your new password.');
    }
    catch (error) {
        next(error);
    }
};
exports.resetPasswordWithOtp = resetPasswordWithOtp;
const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        const userId = await (0, auth_service_1.verifyPasswordResetToken)(token);
        const passwordHash = await (0, auth_service_1.hashPassword)(password);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: { candidate: true, employer: true },
        });
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
            prisma_1.prisma.passwordReset.updateMany({ where: { token }, data: { isUsed: true } }),
        ]);
        await (0, auth_service_1.revokeAllUserRefreshTokens)(userId);
        res.clearCookie('refreshToken');
        if (user) {
            const firstName = user.candidate?.firstName || user.employer?.firstName || 'User';
            (0, email_service_1.sendPasswordChangedEmail)(user.email, firstName, req.ip, user.id).catch(console.error);
        }
        (0, response_1.sendSuccess)(res, null, 'Password reset successfully. Please log in with your new password.');
    }
    catch (error) {
        next(error);
    }
};
exports.resetPassword = resetPassword;
//# sourceMappingURL=auth.controller.js.map