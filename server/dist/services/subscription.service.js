"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionSummary = exports.expireSubscriptions = exports.updateSubscriptionStatus = exports.extendSubscription = exports.activateSubscription = exports.consumeCredit = exports.checkLimit = exports.hasPackageLimitRemaining = exports.hasPackageFeature = exports.getActiveSubscription = exports.autoEnrollFreePackage = exports.getFreePackage = exports.getUserRole = void 0;
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../lib/errors");
const mysql_auto_init_1 = require("../lib/mysql-auto-init");
/**
 * Get user role helper
 */
const getUserRole = async (userId) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    return user?.role || null;
};
exports.getUserRole = getUserRole;
/**
 * Find default free package by type
 */
const getFreePackage = async (type) => {
    return prisma_1.prisma.package.findFirst({
        where: {
            price: 0,
            isActive: true,
            status: 'ACTIVE',
            ...(type ? { type } : {}),
        },
        orderBy: { sortOrder: 'asc' },
    });
};
exports.getFreePackage = getFreePackage;
/**
 * Auto-enrolls a user into the active free package if they don't have an active subscription
 */
const autoEnrollFreePackage = async (userId) => {
    const role = await (0, exports.getUserRole)(userId);
    if (!role || role === 'ADMIN')
        return null;
    const freePkg = await (0, exports.getFreePackage)(role);
    if (!freePkg)
        return null;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (freePkg.durationDays || 365));
    try {
        return await prisma_1.prisma.subscription.create({
            data: {
                userId,
                packageId: freePkg.id,
                limitsSnapshot: freePkg.limits,
                usageData: '{}',
                status: 'ACTIVE',
                startDate: new Date(),
                endDate,
            },
            include: { package: true },
        });
    }
    catch (err) {
        console.error('Auto-enroll free package error:', err);
        return null;
    }
};
exports.autoEnrollFreePackage = autoEnrollFreePackage;
/**
 * Fetch the active subscription for a user, automatically handling expiry
 */
const getActiveSubscription = async (userId) => {
    const now = new Date();
    // Find any active subscription where endDate has passed and expire it
    let expiredSubs = [];
    try {
        expiredSubs = await prisma_1.prisma.subscription.findMany({
            where: {
                userId,
                status: 'ACTIVE',
                endDate: { lt: now },
            },
            include: { package: true },
        });
    }
    catch (err) {
        console.warn('Notice querying expired subscriptions, attempting self-heal:', err?.message);
        await (0, mysql_auto_init_1.sanitizeMysqlDatetimes)().catch(() => { });
        try {
            expiredSubs = await prisma_1.prisma.subscription.findMany({
                where: {
                    userId,
                    status: 'ACTIVE',
                    endDate: { lt: now },
                },
                include: { package: true },
            });
        }
        catch {
            expiredSubs = [];
        }
    }
    for (const sub of expiredSubs) {
        await prisma_1.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'EXPIRED' },
        }).catch(() => null);
        await prisma_1.prisma.notification.create({
            data: {
                userId,
                type: 'PACKAGE_EXPIRY',
                title: 'Package Expired',
                message: `Your ${sub.package.name} package has expired. Upgrade or renew to restore all benefits.`,
                link: '/pricing',
            },
        }).catch(() => null);
    }
    // Find valid active subscription
    let activeSub = null;
    try {
        activeSub = await prisma_1.prisma.subscription.findFirst({
            where: {
                userId,
                status: 'ACTIVE',
                endDate: { gte: now },
            },
            include: { package: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    catch (err) {
        console.warn('Notice querying active subscription, running sanitize:', err?.message);
        await (0, mysql_auto_init_1.sanitizeMysqlDatetimes)().catch(() => { });
        try {
            activeSub = await prisma_1.prisma.subscription.findFirst({
                where: {
                    userId,
                    status: 'ACTIVE',
                    endDate: { gte: now },
                },
                include: { package: true },
                orderBy: { createdAt: 'desc' },
            });
        }
        catch {
            activeSub = null;
        }
    }
    // If no active subscription exists, auto-enroll into role-based free package
    if (!activeSub) {
        try {
            activeSub = await (0, exports.autoEnrollFreePackage)(userId);
        }
        catch {
            activeSub = null;
        }
    }
    return activeSub;
};
exports.getActiveSubscription = getActiveSubscription;
/**
 * Check whether a user has access to a feature toggle (boolean)
 */
const hasPackageFeature = async (userId, featureKey) => {
    const sub = await (0, exports.getActiveSubscription)(userId);
    if (!sub)
        return false;
    const limits = JSON.parse(sub.limitsSnapshot || '{}');
    const val = limits[featureKey];
    // If explicitly configured in limits
    if (typeof val === 'boolean')
        return val;
    if (typeof val === 'number')
        return val === -1 || val > 0;
    // Check features array in package
    try {
        const features = JSON.parse(sub.package.features || '[]');
        const lowerKey = featureKey.toLowerCase();
        const found = features.some((f) => f.toLowerCase().includes(lowerKey));
        if (found)
            return true;
    }
    catch {
        // ignore json parse error
    }
    // Safe defaults for foundational features if omitted in older starter limits
    const standardAllowedByDefault = [
        'profileVisibility',
        'resumeVisibility',
        'resumeUpload',
        'applicationTracking',
        'jobRecommendations',
        'candidateSearch',
        'candidateFiltering',
        'companyProfile',
        'applicationManagement',
        'emailNotifications',
    ];
    if (val === undefined && standardAllowedByDefault.includes(featureKey)) {
        return true;
    }
    return false;
};
exports.hasPackageFeature = hasPackageFeature;
/**
 * Check whether a user has remaining quota for a limited action
 */
const hasPackageLimitRemaining = async (userId, featureKey, amount = 1) => {
    const sub = await (0, exports.getActiveSubscription)(userId);
    if (!sub) {
        return { allowed: false, remaining: 0, limit: 0, used: 0 };
    }
    const limits = JSON.parse(sub.limitsSnapshot || '{}');
    const usage = JSON.parse(sub.usageData || '{}');
    const limit = limits[featureKey];
    const used = usage[featureKey] || 0;
    if (limit === undefined || limit === null) {
        return { allowed: true, remaining: null, limit: null, used };
    }
    if (typeof limit === 'boolean') {
        return { allowed: limit, remaining: null, limit: null, used };
    }
    const limitNum = limit;
    if (limitNum === -1) {
        // Unlimited
        return { allowed: true, remaining: null, limit: -1, used };
    }
    const remaining = Math.max(0, limitNum - used);
    const allowed = used + amount <= limitNum;
    return {
        allowed,
        remaining,
        limit: limitNum,
        used,
    };
};
exports.hasPackageLimitRemaining = hasPackageLimitRemaining;
/**
 * Legacy checkLimit compatibility wrapper
 */
const checkLimit = async (userId, featureKey) => {
    const res = await (0, exports.hasPackageLimitRemaining)(userId, featureKey, 1);
    return {
        allowed: res.allowed,
        remaining: res.remaining,
        limit: res.limit,
    };
};
exports.checkLimit = checkLimit;
/**
 * Consume quota credits securely in the database
 */
const consumeCredit = async (userId, featureKey, amount = 1) => {
    const sub = await (0, exports.getActiveSubscription)(userId);
    if (!sub) {
        throw new errors_1.AppError('No active package found. Please upgrade or choose a package to continue.', 403);
    }
    const limits = JSON.parse(sub.limitsSnapshot || '{}');
    const usage = JSON.parse(sub.usageData || '{}');
    const limit = limits[featureKey];
    if (limit === undefined || typeof limit === 'boolean')
        return;
    if (limit === -1)
        return; // Unlimited
    const limitNum = limit;
    const used = usage[featureKey] || 0;
    if (used + amount > limitNum) {
        throw new errors_1.AppError(`Your limit for ${featureKey} has been reached (${used}/${limitNum}). Please upgrade your package.`, 403);
    }
    // Atomic update
    const newUsage = { ...usage, [featureKey]: used + amount };
    await prisma_1.prisma.subscription.update({
        where: { id: sub.id },
        data: { usageData: JSON.stringify(newUsage) },
    });
};
exports.consumeCredit = consumeCredit;
/**
 * Activate or replace a user's subscription package on purchase/selection
 */
const activateSubscription = async (userId, packageId, paymentId) => {
    const pkg = await prisma_1.prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg)
        throw new errors_1.AppError('Package not found', 404);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (pkg.durationDays || 30));
    return prisma_1.prisma.$transaction(async (tx) => {
        // Always replace any prior active/suspended package for this user
        await tx.subscription.updateMany({
            where: {
                userId,
                status: { in: ['ACTIVE', 'SUSPENDED'] },
            },
            data: { status: 'CANCELLED' },
        });
        return tx.subscription.create({
            data: {
                userId,
                packageId,
                limitsSnapshot: pkg.limits,
                usageData: '{}',
                status: 'ACTIVE',
                startDate,
                endDate,
                paymentId: paymentId || null,
            },
            include: { package: true },
        });
    });
};
exports.activateSubscription = activateSubscription;
/**
 * Manually extend a subscription by days
 */
const extendSubscription = async (subscriptionId, daysToAdd) => {
    const sub = await prisma_1.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { package: true, user: true },
    });
    if (!sub)
        throw new errors_1.AppError('Subscription not found', 404);
    const baseTime = Math.max(Date.now(), new Date(sub.endDate).getTime());
    const newEndDate = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000);
    const updated = await prisma_1.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
            endDate: newEndDate,
            status: 'ACTIVE',
        },
        include: { package: true },
    });
    // Notify user
    await prisma_1.prisma.notification.create({
        data: {
            userId: sub.userId,
            type: 'SUBSCRIPTION_ACTIVE',
            title: 'Package Extended',
            message: `Your ${sub.package.name} package has been extended by ${daysToAdd} days until ${newEndDate.toLocaleDateString()}.`,
            link: sub.package.type === 'EMPLOYER' ? '/employer/subscription' : '/subscription',
        },
    }).catch(() => null);
    return updated;
};
exports.extendSubscription = extendSubscription;
/**
 * Update subscription status (suspend, activate, cancel)
 */
const updateSubscriptionStatus = async (subscriptionId, status) => {
    const sub = await prisma_1.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { package: true },
    });
    if (!sub)
        throw new errors_1.AppError('Subscription not found', 404);
    return prisma_1.prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status },
        include: { package: true },
    });
};
exports.updateSubscriptionStatus = updateSubscriptionStatus;
/**
 * Background cron to expire subscriptions
 */
const expireSubscriptions = async () => {
    const expired = await prisma_1.prisma.subscription.findMany({
        where: {
            status: 'ACTIVE',
            endDate: { lt: new Date() },
        },
        include: { user: true, package: true },
    });
    for (const sub of expired) {
        await prisma_1.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'EXPIRED' },
        });
        await prisma_1.prisma.notification.create({
            data: {
                userId: sub.userId,
                type: 'PACKAGE_EXPIRY',
                title: 'Subscription Expired',
                message: `Your ${sub.package.name} package has expired. Renew to continue enjoying all benefits.`,
                link: sub.package.type === 'EMPLOYER' ? '/employer/subscription' : '/subscription',
            },
        }).catch(() => null);
    }
    console.log(`[CRON] Expired ${expired.length} subscriptions`);
};
exports.expireSubscriptions = expireSubscriptions;
/**
 * Comprehensive Subscription Summary for dashboard display
 */
const getSubscriptionSummary = async (userId) => {
    let sub = null;
    try {
        sub = await (0, exports.getActiveSubscription)(userId);
    }
    catch (err) {
        console.warn('Notice in getActiveSubscription within getSubscriptionSummary:', err?.message);
        sub = null;
    }
    const role = await (0, exports.getUserRole)(userId).catch(() => null);
    if (!sub) {
        const freePackage = await (0, exports.getFreePackage)(role || undefined);
        return {
            hasSubscription: false,
            subscriptionId: null,
            package: freePackage,
            status: 'FREE_TIER',
            usage: {},
            limits: freePackage ? JSON.parse(freePackage.limits || '{}') : {},
            features: freePackage ? JSON.parse(freePackage.features || '[]') : [],
            daysRemaining: freePackage?.durationDays || 365,
            startDate: new Date(),
            endDate: null,
        };
    }
    const daysRemaining = Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    let limits = {};
    let usage = {};
    let features = [];
    try {
        limits = JSON.parse(sub.limitsSnapshot || '{}');
    }
    catch { }
    try {
        usage = JSON.parse(sub.usageData || '{}');
    }
    catch { }
    try {
        features = JSON.parse(sub.package.features || '[]');
    }
    catch { }
    // Sync live featured jobs count for employer
    if (role === 'EMPLOYER') {
        try {
            const employer = await prisma_1.prisma.employer.findUnique({ where: { userId }, select: { id: true } });
            if (employer) {
                const activeFeaturedCount = await prisma_1.prisma.job.count({
                    where: {
                        employerId: employer.id,
                        isFeatured: true,
                        deletedAt: null,
                        status: { notIn: ['CLOSED', 'EXPIRED'] },
                    },
                });
                usage.featuredJobs = activeFeaturedCount;
            }
        }
        catch { }
    }
    return {
        hasSubscription: true,
        subscriptionId: sub.id,
        package: sub.package,
        status: sub.status,
        usage,
        limits,
        features,
        daysRemaining,
        startDate: sub.startDate,
        endDate: sub.endDate,
    };
};
exports.getSubscriptionSummary = getSubscriptionSummary;
//# sourceMappingURL=subscription.service.js.map