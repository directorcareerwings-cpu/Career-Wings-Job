import cron from 'node-cron';
import { prisma, getPersistentStoragePaths, createSafetyBackup } from '../lib/prisma';
import { expireSubscriptions } from '../services/subscription.service';
import { sendJobAlertEmail } from '../services/email.service';
import {
  onJobRemovedOrExpired,
  processIndexingQueueBatch,
  syncAllPublicPagesToCatalog,
} from '../services/seo.service';

export const startCronJobs = (): void => {
  // 1. Expire subscriptions daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[CRON] Running daily subscription expiry check...');
      await expireSubscriptions();
    } catch (err) {
      console.error('[CRON ERROR] Subscription expiry job failed:', err);
    }
  });

  // 2. Expire jobs past application deadline or duration daily at 00:05
  cron.schedule('5 0 * * *', async () => {
    try {
      console.log('[CRON] Checking expired jobs...');
      const now = new Date();
      const expiredJobs = await prisma.job.findMany({
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
        await prisma.job.update({
          where: { id: job.id },
          data: { status: 'EXPIRED' },
        });

        await onJobRemovedOrExpired(job.id).catch(() => {});

        await prisma.notification.create({
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
    } catch (err) {
      console.error('[CRON ERROR] Job expiry check failed:', err);
    }
  });

  // 3. Send Daily Job Alerts at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    try {
      console.log('[CRON] Processing job alerts...');
      const alerts = await prisma.jobAlert.findMany({
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
        const matchingJobs = await prisma.job.findMany({
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
          await sendJobAlertEmail(
            alert.candidate.user.email,
            alert.candidate.firstName,
            matchingJobs.map((j) => ({
              title: j.title,
              company: j.company?.name || 'Career Wings',
              location: j.locationText || 'Guwahati, Assam',
              slug: j.slug,
            }))
          );

          await prisma.jobAlert.update({
            where: { id: alert.id },
            data: { lastSentAt: new Date() },
          });
        }
      }
    } catch (err) {
      console.error('[CRON ERROR] Job alert processing failed:', err);
    }
  });

  // 4. Send Package Expiry Reminders daily at 09:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('[CRON] Checking upcoming subscription expirations...');
      const now = new Date();
      const intervals = [7, 3, 1];

      for (const days of intervals) {
        const targetDateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 0, 0, 0);
        const targetDateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 23, 59, 59);

        const expiringSubs = await prisma.subscription.findMany({
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
            const { sendPackageExpiryEmail } = await import('../services/email.service');
            await sendPackageExpiryEmail(
              sub.user.email,
              name,
              sub.package.name,
              days,
              sub.endDate,
              sub.userId
            ).catch(console.error);
          }
        }
      }
    } catch (err) {
      console.error('[CRON ERROR] Package expiry reminder check failed:', err);
    }
  });

  // 5. Automated Daily Database Safety Backup at 02:00 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[CRON] Executing scheduled daily database safety backup...');
      const paths = getPersistentStoragePaths();
      const backupResult = createSafetyBackup(paths.databasePath, paths.backupsDir, 'daily');
      if (backupResult) {
        console.log(`[CRON] Daily database backup completed successfully: ${backupResult}`);
      }
    } catch (err) {
      console.error('[CRON ERROR] Daily database backup failed:', err);
    }
  });

  // 6. Auto-process SEO Google Indexing Queue every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const pendingCount = await prisma.indexingQueue.count({
        where: { status: { in: ['PENDING', 'FAILED'] }, attemptCount: { lt: 3 } },
      });
      if (pendingCount > 0) {
        console.log(`[CRON] Processing ${pendingCount} queued SEO indexing items...`);
        await processIndexingQueueBatch(20);
      }
    } catch (err) {
      console.error('[CRON ERROR] SEO indexing queue processing failed:', err);
    }
  });

  // 7. Refresh full XML Sitemap & SEO catalog daily at 03:00 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('[CRON] Synchronizing SEO page catalog and XML sitemaps...');
      await syncAllPublicPagesToCatalog();
    } catch (err) {
      console.error('[CRON ERROR] Daily SEO catalog sync failed:', err);
    }
  });

  console.log('✔ Background cron jobs initialized');
};
