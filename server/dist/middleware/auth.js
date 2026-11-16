"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("../lib/errors");
const prisma_1 = require("../lib/prisma");
const authenticateToken = async (req, res, next) => {
    try {
        let token;
        // Check Authorization header first
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        // Fallback to cookie
        if (!token && req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }
        if (!token) {
            throw new errors_1.AppError('Authentication required. Please log in.', 401);
        }
        const secret = process.env.JWT_ACCESS_SECRET || 'cw-access-secret-change-in-production-2024';
        const payload = jsonwebtoken_1.default.verify(token, secret);
        // Verify user still exists and is active
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true, isActive: true },
        });
        if (!user)
            throw new errors_1.AppError('User not found. Please log in again.', 401);
        if (!user.isActive)
            throw new errors_1.AppError('Your account has been suspended. Contact support.', 403);
        req.user = { id: user.id, email: user.email, role: user.role };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errors_1.AppError('Invalid or expired token. Please log in again.', 401));
        }
        else {
            next(error);
        }
    }
};
exports.authenticateToken = authenticateToken;
const optionalAuth = async (req, res, next) => {
    try {
        let token;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        if (!token && req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }
        if (!token) {
            next();
            return;
        }
        const secret = process.env.JWT_ACCESS_SECRET;
        if (!secret) {
            next();
            return;
        }
        const payload = jsonwebtoken_1.default.verify(token, secret);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true, isActive: true },
        });
        if (user && user.isActive) {
            req.user = { id: user.id, email: user.email, role: user.role };
        }
        next();
    }
    catch {
        // Silently fail for optional auth
        next();
    }
};
exports.optionalAuth = optionalAuth;
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            next(new errors_1.AppError('Authentication required.', 401));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next(new errors_1.AppError(`Access denied. Required role: ${roles.join(' or ')}.`, 403));
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth.js.map