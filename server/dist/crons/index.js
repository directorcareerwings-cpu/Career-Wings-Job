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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = require("../lib/prisma");
const subscription_service_1 = require("../services/subscription.service");
const email_service_1 = require("../services/email.service");
const seo_service_1 = require("../services/seo.service");
const startCronJobs = () => {
    // 1. Expire subscriptions daily at midnight
    node_cron_1.default.schedule('0 0 * * *', async () => {
        try {
            console.log('[CRON] Running daily subscription expiry check...');
            await (0, subscription_service_1.expireSubscriptions)();
        }
        catch (err) {
            console.error('[CRON ERROR] Subscription expiry job failed:', err);
        }
    });
    // 2. Expire jobs past application deadline or duration daily at 00:05
    node_cron_1.default.schedule('5 0 * * *', async () => {
        try {
            console.log('[CRON] Checking expired jobs...');
            const now = new Date();
            const expiredJobs = await prisma_1.prisma.job.findMany({
                where: {
                    status: { in: ['PUBLISHED', 'FEATURED'] },
                    OR: [
                        { expiresAt: { lte: now } },
                        { applicationDeadline: { lte: now } },
                    ],
                },
                include: { employer: true },
            });
            for (const job of expiredJobs) {
                await prisma_1.prisma.job.update({
                    where: { id: job.id },
                    data: { status: 'EXPIRED' },
                });
                await (0, seo_service_1.onJobRemovedOrExpired)(job.id).catch(() => { });
                await prisma_1.prisma.notification.create({
                    data: {
                        userId: job.employer.userId,
                        type: 'JOB_EXPIRY',
                        title: 'Job Listing Expired',
                        message: `Your job posting "${job.title}" has reached its expiry date and is now closed.`,
                        link: `/employer/jobs`,
                    },
                });
            }
            console.log(`[CRON] Expired ${expiredJobs.length} jobs.`);
        }
        catch (err) {
            console.error('[CRON ERROR] Job expiry check failed:', err);
        }
    });
    // 3. Send Daily Job Alerts at 08:00 AM
    node_cron_1.default.schedule('0 8 * * *', async () => {
        try {
            console.log('[CRON] Processing job alerts...');
            const alerts = await prisma_1.prisma.jobAlert.findMany({
                where: { isActive: true },
                include: {
                    candidate: {
                        include: { user: { select: { email: true } } },
                    },
                },
            });
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            for (const alert of alerts) {
                const matchingJobs = await prisma_1.prisma.job.findMany({
                    where: {
                        status: { in: ['PUBLISHED', 'FEATURED'] },
                        publishedAt: { gte: yesterday },
                        deletedAt: null,
                        OR: [
                            alert.keyword ? { title: { contains: alert.keyword } } : {},
                            alert.locationText ? { locationText: { contains: alert.locationText } } : {},
                            alert.categoryId ? { categoryId: alert.categoryId } : {},
                            alert.jobType ? { jobType: alert.jobType } : {},
                        ],
                    },
                    include: { company: true },
                    take: 5,
                });
                if (matchingJobs.length > 0 && alert.candidate?.user?.email) {
                    await (0, email_service_1.sendJobAlertEmail)(alert.candidate.user.email, alert.candidate.firstName, matchingJobs.map((j) => ({
                        title: j.title,
                        company: j.company?.name || 'Career Wings',
                        location: j.locationText || 'Guwahati, Assam',
                        slug: j.slug,
                    })));
                    await prisma_1.prisma.jobAlert.update({
                        where: { id: alert.id },
                        data: { lastSentAt: new Date() },
                    });
                }
            }
        }
        catch (err) {
            console.error('[CRON ERROR] Job alert processing failed:', err);
        }
    });
    // 4. Send Package Expiry Reminders daily at 09:00 AM
    node_cron_1.default.schedule('0 9 * * *', async () => {
        try {
            console.log('[CRON] Checking upcoming subscription expirations...');
            const now = new Date();
            const intervals = [7, 3, 1];
            for (const days of intervals) {
                const targetDateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 0, 0, 0);
                const targetDateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 23, 59, 59);
                const expiringSubs = await prisma_1.prisma.subscription.findMany({
                    where: {
                        status: 'ACTIVE',
                        endDate: { gte: targetDateStart, lte: targetDateEnd },
                    },
                    include: {
                        package: true,
                        user: { include: { candidate: true, employer: true } },
                    },
                });
                for (const sub of expiringSubs) {
                    if (sub.user?.email && sub.package) {
                        const name = sub.user.candidate?.firstName || sub.user.employer?.firstName || 'Subscriber';
                        const { sendPackageExpiryEmail } = await Promise.resolve().then(() => __importStar(require('../services/email.service')));
                        await sendPackageExpiryEmail(sub.user.email, name, sub.package.name, days, sub.endDate, sub.userId).catch(console.error);
                    }
                }
            }
        }
        catch (err) {
            console.error('[CRON ERROR] Package expiry reminder check failed:', err);
        }
    });
    // 5. Automated Daily Database Safety Backup at 02:00 AM
    node_cron_1.default.schedule('0 2 * * *', async () => {
        try {
            console.log('[CRON] Executing scheduled daily database safety backup...');
            const paths = (0, prisma_1.getPersistentStoragePaths)();
            const backupResult = (0, prisma_1.createSafetyBackup)(paths.databasePath, paths.backupsDir, 'daily');
            if (backupResult) {
                console.log(`[CRON] Daily database backup completed successfully: ${backupResult}`);
            }
        }
        catch (err) {
            console.error('[CRON ERROR] Daily database backup failed:', err);
        }
    });
    // 6. Auto-process SEO Google Indexing Queue every 15 minutes
    node_cron_1.default.schedule('*/15 * * * *', async () => {
        try {
            const pendingCount = await prisma_1.prisma.indexingQueue.count({
                where: { status: { in: ['PENDING', 'FAILED'] }, attemptCount: { lt: 3 } },
            });
            if (pendingCount > 0) {
                console.log(`[CRON] Processing ${pendingCount} queued SEO indexing items...`);
                await (0, seo_service_1.processIndexingQueueBatch)(20);
            }
        }
        catch (err) {
            console.error('[CRON ERROR] SEO indexing queue processing failed:', err);
        }
    });
    // 7. Refresh full XML Sitemap & SEO catalog daily at 03:00 AM
    node_cron_1.default.schedule('0 3 * * *', async () => {
        try {
            console.log('[CRON] Synchronizing SEO page catalog and XML sitemaps...');
            await (0, seo_service_1.syncAllPublicPagesToCatalog)();
        }
        catch (err) {
            console.error('[CRON ERROR] Daily SEO catalog sync failed:', err);
        }
    });
    console.log('✔ Background cron jobs initialized');
};
exports.startCronJobs = startCronJobs;
//# sourceMappingURL=index.js.map