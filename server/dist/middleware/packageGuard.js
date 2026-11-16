"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPackageLimitRemaining = exports.hasPackageFeature = exports.requireQuota = exports.requireFeature = void 0;
const subscription_service_1 = require("../services/subscription.service");
Object.defineProperty(exports, "hasPackageFeature", { enumerable: true, get: function () { return subscription_service_1.hasPackageFeature; } });
Object.defineProperty(exports, "hasPackageLimitRemaining", { enumerable: true, get: function () { return subscription_service_1.hasPackageLimitRemaining; } });
/**
 * Reusable middleware to verify that the user's active package includes a given feature toggle
 */
const requireFeature = (featureKey, customMessage) => {
    return async (req, res, next) => {
        try {
            if (!req.user?.id) {
                res.status(401).json({ success: false, message: 'Authentication required' });
                return;
            }
            // Admins bypass package checks
            if (req.user.role === 'ADMIN') {
                return next();
            }
            const hasAccess = await (0, subscription_service_1.hasPackageFeature)(req.user.id, featureKey);
            if (!hasAccess) {
                res.status(403).json({
                    success: false,
                    code: 'FEATURE_NOT_INCLUDED',
                    feature: featureKey,
                    message: customMessage ||
                        `This premium feature requires an upgraded package. Please upgrade your package to gain access.`,
                    upgradeUrl: req.user.role === 'EMPLOYER' ? '/employer/subscription' : '/subscription',
                });
                return;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireFeature = requireFeature;
/**
 * Reusable middleware to verify that the user's active package has quota remaining for an action
 */
const requireQuota = (featureKey, amount = 1, customMessage) => {
    return async (req, res, next) => {
        try {
            if (!req.user?.id) {
                res.status(401).json({ success: false, message: 'Authentication required' });
                return;
            }
            // Admins bypass quota checks
            if (req.user.role === 'ADMIN') {
                return next();
            }
            const check = await (0, subscription_service_1.hasPackageLimitRemaining)(req.user.id, featureKey, amount);
            if (!check.allowed) {
                res.status(403).json({
                    success: false,
                    code: 'QUOTA_EXHAUSTED',
                    feature: featureKey,
                    remaining: check.remaining,
                    limit: check.limit,
                    used: check.used,
                    message: customMessage ||
                        `You have used all available ${featureKey} in your current package (${check.used}/${check.limit}). Upgrade your package to continue.`,
                    upgradeUrl: req.user.role === 'EMPLOYER' ? '/employer/subscription' : '/subscription',
                });
                return;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireQuota = requireQuota;
//# sourceMappingURL=packageGuard.js.map