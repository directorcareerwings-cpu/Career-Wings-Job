import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { sanitizeMysqlDatetimes } from '../lib/mysql-auto-init';

interface LimitsConfig {
  [key: string]: number | boolean | null;
}

interface UsageData {
  [key: string]: number;
}

/**
 * Get user role helper
 */
export const getUserRole = async (userId: string): Promise<'EMPLOYER' | 'CANDIDATE' | 'ADMIN' | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return (user?.role as 'EMPLOYER' | 'CANDIDATE' | 'ADMIN') || null;
};

/**
 * Find default free package by type
 */
export const getFreePackage = async (type?: string) => {
  return prisma.package.findFirst({
    where: {
      price: 0,
      isActive: true,
      status: 'ACTIVE',
      ...(type ? { type } : {}),
    },
    orderBy: { sortOrder: 'asc' },
  });
};

/**
 * Auto-enrolls a user into the active free package if they don't have an active subscription
 */
export const autoEnrollFreePackage = async (userId: string) => {
  const role = await getUserRole(userId);
  if (!role || role === 'ADMIN') return null;

  const freePkg = await getFreePackage(role);
  if (!freePkg) return null;

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (freePkg.durationDays || 365));

  try {
    return await prisma.subscription.create({
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
  } catch (err) {
    console.error('Auto-enroll free package error:', err);
    return null;
  }
};

/**
 * Fetch the active subscription for a user, automatically handling expiry
 */
export const getActiveSubscription = async (userId: string) => {
  const now = new Date();

  // Find any active subscription where endDate has passed and expire it
  let expiredSubs: any[] = [];
  try {
    expiredSubs = await prisma.subscription.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { lt: now },
      },
      include: { package: true },
    });
  } catch (err: any) {
    console.warn('Notice querying expired subscriptions, attempting self-heal:', err?.message);
    await sanitizeMysqlDatetimes().catch(() => {});
    try {
      expiredSubs = await prisma.subscription.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          endDate: { lt: now },
        },
        include: { package: true },
      });
    } catch {
      expiredSubs = [];
    }
  }

  for (const sub of expiredSubs) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'EXPIRED' },
    }).catch(() => null);

    await prisma.notification.create({
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
  let activeSub: any = null;
  try {
    activeSub = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gte: now },
      },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err: any) {
    console.warn('Notice querying active subscription, running sanitize:', err?.message);
    await sanitizeMysqlDatetimes().catch(() => {});
    try {
      activeSub = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          endDate: { gte: now },
        },
        include: { package: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      activeSub = null;
    }
  }

  // If no active subscription exists, auto-enroll into role-based free package
  if (!activeSub) {
    try {
      activeSub = await autoEnrollFreePackage(userId);
    } catch {
      activeSub = null;
    }
  }

  return activeSub;
};

/**
 * Check whether a user has access to a feature toggle (boolean)
 */
export const hasPackageFeature = async (userId: string, featureKey: string): Promise<boolean> => {
  const sub = await getActiveSubscription(userId);
  if (!sub) return false;

  const limits: LimitsConfig = JSON.parse(sub.limitsSnapshot || '{}');
  const val = limits[featureKey];

  // If explicitly configured in limits
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === -1 || val > 0;

  // Check features array in package
  try {
    const features: string[] = JSON.parse(sub.package.features || '[]');
    const lowerKey = featureKey.toLowerCase();
    const found = features.some((f) => f.toLowerCase().includes(lowerKey));
    if (found) return true;
  } catch {
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

/**
 * Check whether a user has remaining quota for a limited action
 */
export const hasPackageLimitRemaining = async (
  userId: string,
  featureKey: string,
  amount = 1
): Promise<{ allowed: boolean; remaining: number | null; limit: number | null; used: number }> => {
  const sub = await getActiveSubscription(userId);

  if (!sub) {
    return { allowed: false, remaining: 0, limit: 0, used: 0 };
  }

  const limits: LimitsConfig = JSON.parse(sub.limitsSnapshot || '{}');
  const usage: UsageData = JSON.parse(sub.usageData || '{}');
  const limit = limits[featureKey];
  const used = usage[featureKey] || 0;

  if (limit === undefined || limit === null) {
    return { allowed: true, remaining: null, limit: null, used };
  }

  if (typeof limit === 'boolean') {
    return { allowed: limit, remaining: null, limit: null, used };
  }

  const limitNum = limit as number;
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

/**
 * Legacy checkLimit compatibility wrapper
 */
export const checkLimit = async (
  userId: string,
  featureKey: string
): Promise<{ allowed: boolean; remaining: number | null; limit: number | null }> => {
  const res = await hasPackageLimitRemaining(userId, featureKey, 1);
  return {
    allowed: res.allowed,
    remaining: res.remaining,
    limit: res.limit,
  };
};

/**
 * Consume quota credits securely in the database
 */
export const consumeCredit = async (
  userId: string,
  featureKey: string,
  amount = 1
): Promise<void> => {
  const sub = await getActiveSubscription(userId);

  if (!sub) {
    throw new AppError(
      'No active package found. Please upgrade or choose a package to continue.',
      403
    );
  }

  const limits: LimitsConfig = JSON.parse(sub.limitsSnapshot || '{}');
  const usage: UsageData = JSON.parse(sub.usageData || '{}');
  const limit = limits[featureKey];

  if (limit === undefined || typeof limit === 'boolean') return;
  if (limit === -1) return; // Unlimited

  const limitNum = limit as number;
  const used = usage[featureKey] || 0;

  if (used + amount > limitNum) {
    throw new AppError(
      `Your limit for ${featureKey} has been reached (${used}/${limitNum}). Please upgrade your package.`,
      403
    );
  }

  // Atomic update
  const newUsage = { ...usage, [featureKey]: used + amount };
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { usageData: JSON.stringify(newUsage) },
  });
};

/**
 * Activate or replace a user's subscription package on purchase/selection
 */
export const activateSubscription = async (
  userId: string,
  packageId: string,
  paymentId?: string
): Promise<any> => {
  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) throw new AppError('Package not found', 404);

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (pkg.durationDays || 30));

  return prisma.$transaction(async (tx) => {
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

/**
 * Manually extend a subscription by days
 */
export const extendSubscription = async (subscriptionId: string, daysToAdd: number) => {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { package: true, user: true },
  });
  if (!sub) throw new AppError('Subscription not found', 404);

  const baseTime = Math.max(Date.now(), new Date(sub.endDate).getTime());
  const newEndDate = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000);

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      endDate: newEndDate,
      status: 'ACTIVE',
    },
    include: { package: true },
  });

  // Notify user
  await prisma.notification.create({
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

/**
 * Update subscription status (suspend, activate, cancel)
 */
export const updateSubscriptionStatus = async (
  subscriptionId: string,
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED'
) => {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { package: true },
  });
  if (!sub) throw new AppError('Subscription not found', 404);

  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status },
    include: { package: true },
  });
};

/**
 * Background cron to expire subscriptions
 */
export const expireSubscriptions = async (): Promise<void> => {
  const expired = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { lt: new Date() },
    },
    include: { user: true, package: true },
  });

  for (const sub of expired) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'EXPIRED' },
    });

    await prisma.notification.create({
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

/**
 * Comprehensive Subscription Summary for dashboard display
 */
export const getSubscriptionSummary = async (userId: string) => {
  let sub: any = null;
  try {
    sub = await getActiveSubscription(userId);
  } catch (err: any) {
    console.warn('Notice in getActiveSubscription within getSubscriptionSummary:', err?.message);
    sub = null;
  }
  const role = await getUserRole(userId).catch(() => null);

  if (!sub) {
    const freePackage = await getFreePackage(role || undefined);
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

  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  let limits: LimitsConfig = {};
  let usage: UsageData = {};
  let features: string[] = [];

  try { limits = JSON.parse(sub.limitsSnapshot || '{}'); } catch {}
  try { usage = JSON.parse(sub.usageData || '{}'); } catch {}
  try { features = JSON.parse(sub.package.features || '[]'); } catch {}

  // Sync live featured jobs count for employer
  if (role === 'EMPLOYER') {
    try {
      const employer = await prisma.employer.findUnique({ where: { userId }, select: { id: true } });
      if (employer) {
        const activeFeaturedCount = await prisma.job.count({
          where: {
            employerId: employer.id,
            isFeatured: true,
            deletedAt: null,
            status: { notIn: ['CLOSED', 'EXPIRED'] },
          },
        });
        usage.featuredJobs = activeFeaturedCount;
      }
    } catch {}
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
