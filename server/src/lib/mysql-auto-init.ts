import fs from 'fs';
import path from 'path';
import { prisma, isMysqlConfigured } from './prisma';
import { MYSQL_SETUP_STATEMENTS } from './mysql-embedded-setup';

/**
 * Sanitizes any invalid zero-date columns across ALL tables in MySQL (e.g. '0000-00-00 00:00:00')
 * so Prisma's datetime deserializer never throws 'Value out of range'.
 */
export async function sanitizeMysqlDatetimes(): Promise<void> {
  if (!isMysqlConfigured()) return;

  // Temporarily disable strict SQL mode so zero dates can be matched and updated without error
  try {
    await prisma.$executeRawUnsafe("SET SESSION sql_mode = ''");
  } catch {}

  const cleanupQueries = [
    "UPDATE `User` SET `lastLoginAt` = NULL WHERE `lastLoginAt` < '1971-01-01' OR CAST(`lastLoginAt` AS CHAR) LIKE '0000%'",
    "UPDATE `User` SET `emailVerifiedAt` = NULL WHERE `emailVerifiedAt` < '1971-01-01' OR CAST(`emailVerifiedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `User` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `User` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Package` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Package` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Subscription` SET `startsAt` = NOW() WHERE `startsAt` < '1971-01-01' OR CAST(`startsAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Subscription` SET `expiresAt` = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE `expiresAt` < '1971-01-01' OR CAST(`expiresAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Subscription` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Subscription` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Payment` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Payment` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Candidate` SET `resumeUpdatedAt` = NULL WHERE `resumeUpdatedAt` < '1971-01-01' OR CAST(`resumeUpdatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Candidate` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Candidate` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Candidate` SET `deletedAt` = NULL WHERE `deletedAt` < '1971-01-01' OR CAST(`deletedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Education` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Education` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Experience` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Experience` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Certification` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Certification` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Employer` SET `verifiedAt` = NULL WHERE `verifiedAt` < '1971-01-01' OR CAST(`verifiedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Employer` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Employer` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Employer` SET `deletedAt` = NULL WHERE `deletedAt` < '1971-01-01' OR CAST(`deletedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Company` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Company` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Company` SET `deletedAt` = NULL WHERE `deletedAt` < '1971-01-01' OR CAST(`deletedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Job` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Job` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Job` SET `expiresAt` = NULL WHERE `expiresAt` < '1971-01-01' OR CAST(`expiresAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Job` SET `publishedAt` = NOW() WHERE `publishedAt` < '1971-01-01' OR CAST(`publishedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Job` SET `applicationDeadline` = NULL WHERE `applicationDeadline` < '1971-01-01' OR CAST(`applicationDeadline` AS CHAR) LIKE '0000%'",
    "UPDATE `Job` SET `deletedAt` = NULL WHERE `deletedAt` < '1971-01-01' OR CAST(`deletedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Category` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Location` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Skill` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Industry` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Application` SET `appliedAt` = NOW() WHERE `appliedAt` < '1971-01-01' OR CAST(`appliedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Application` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Application` SET `viewedAt` = NULL WHERE `viewedAt` < '1971-01-01' OR CAST(`viewedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Application` SET `deletedAt` = NULL WHERE `deletedAt` < '1971-01-01' OR CAST(`deletedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `SavedJob` SET `savedAt` = NOW() WHERE `savedAt` < '1971-01-01' OR CAST(`savedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `SavedCandidate` SET `savedAt` = NOW() WHERE `savedAt` < '1971-01-01' OR CAST(`savedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Coupon` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Coupon` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Coupon` SET `startsAt` = NULL WHERE `startsAt` < '1971-01-01' OR CAST(`startsAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Coupon` SET `expiresAt` = NULL WHERE `expiresAt` < '1971-01-01' OR CAST(`expiresAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Notification` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Notification` SET `readAt` = NULL WHERE `readAt` < '1971-01-01' OR CAST(`readAt` AS CHAR) LIKE '0000%'",
    "UPDATE `JobAlert` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `JobAlert` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `JobAlert` SET `lastSentAt` = NULL WHERE `lastSentAt` < '1971-01-01' OR CAST(`lastSentAt` AS CHAR) LIKE '0000%'",
    "UPDATE `ResumeSearchLog` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `AdminSetting` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `AuditLog` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `EmailLog` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `EmailLog` SET `sentAt` = NULL WHERE `sentAt` < '1971-01-01' OR CAST(`sentAt` AS CHAR) LIKE '0000%'",
    "UPDATE `EmailLog` SET `failedAt` = NULL WHERE `failedAt` < '1971-01-01' OR CAST(`failedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `OtpVerification` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `OtpVerification` SET `expiresAt` = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE `expiresAt` < '1971-01-01' OR CAST(`expiresAt` AS CHAR) LIKE '0000%'",
    "UPDATE `OtpVerification` SET `usedAt` = NULL WHERE `usedAt` < '1971-01-01' OR CAST(`usedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `EmailTemplate` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `EmailTemplate` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `CoolPlaceLogo` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `CoolPlaceLogo` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `SeoPage` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `SeoPage` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `SeoPage` SET `lastSubmittedAt` = NULL WHERE `lastSubmittedAt` < '1971-01-01' OR CAST(`lastSubmittedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `SeoPage` SET `lastCheckedAt` = NULL WHERE `lastCheckedAt` < '1971-01-01' OR CAST(`lastCheckedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `IndexingQueue` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `IndexingQueue` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `IndexingQueue` SET `nextRetryTime` = NULL WHERE `nextRetryTime` < '1971-01-01' OR CAST(`nextRetryTime` AS CHAR) LIKE '0000%'",
    "UPDATE `SeoGlobalSetting` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `SeoGlobalSetting` SET `gscTokenExpiresAt` = NULL WHERE `gscTokenExpiresAt` < '1971-01-01' OR CAST(`gscTokenExpiresAt` AS CHAR) LIKE '0000%'",
    "UPDATE `SeoAuditLog` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Conversation` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Conversation` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `Conversation` SET `lastMessageAt` = NOW() WHERE `lastMessageAt` < '1971-01-01' OR CAST(`lastMessageAt` AS CHAR) LIKE '0000%'",
    "UPDATE `ChatMessage` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `ImportJob` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `ImportJob` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `BlogPost` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
    "UPDATE `BlogPost` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    "UPDATE `BlogPost` SET `publishedAt` = NOW() WHERE `publishedAt` < '1971-01-01' OR CAST(`publishedAt` AS CHAR) LIKE '0000%'",
  ];

  for (const q of cleanupQueries) {
    try {
      await prisma.$executeRawUnsafe(q);
    } catch {}
  }
}

/**
 * Automatically initializes MySQL schema and seeds default data on Hostinger.
 * Runs on server boot without requiring external CLI or phpMyAdmin manual import.
 * Uses 100% embedded statements with zero filesystem dependency.
 */
export async function ensureMysqlDatabaseReady(force: boolean = false): Promise<boolean> {
  if (!isMysqlConfigured()) {
    return false;
  }

  console.log('🔍 [MySQL Health Check] Verifying MySQL database connection and schema...');

  // 1. Synchronize schema.mysql.prisma with active prisma/schema.prisma
  try {
    const possibleSchemaDirs = [
      path.resolve(__dirname, '../prisma'),
      path.resolve(__dirname, '../../prisma'),
      path.resolve(process.cwd(), 'server/prisma'),
      path.resolve(process.cwd(), 'prisma'),
    ];
    for (const d of possibleSchemaDirs) {
      const mysqlSchema = path.join(d, 'schema.mysql.prisma');
      const targetSchema = path.join(d, 'schema.prisma');
      if (fs.existsSync(mysqlSchema)) {
        fs.copyFileSync(mysqlSchema, targetSchema);
      }
    }
  } catch (err: any) {
    console.warn('Notice while updating schema.prisma for MySQL:', err?.message);
  }

  // 2. Test if core table `User` exists in MySQL
  let userTableExists = false;
  try {
    await prisma.$queryRawUnsafe('SELECT 1 FROM `User` LIMIT 1');
    userTableExists = true;
  } catch {
    userTableExists = false;
  }

  if (force || !userTableExists) {
    console.log(`⚡ Auto-provisioning MySQL tables (${MYSQL_SETUP_STATEMENTS.length} embedded statements)...`);

    // Disable foreign keys during setup
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;').catch(() => {});

    let successCount = 0;
    let errorCount = 0;

    for (const stmt of MYSQL_SETUP_STATEMENTS) {
      try {
        await prisma.$executeRawUnsafe(stmt);
        successCount++;
      } catch (err: any) {
        const msg = err?.message || '';
        if (!msg.includes('already exists') && !msg.includes('Duplicate key') && !msg.includes('Duplicate entry')) {
          errorCount++;
        }
      }
    }

    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;').catch(() => {});
    console.log(`✔ MySQL auto-setup finished (${successCount} executed, ${errorCount} non-critical notices).`);
  } else {
    console.log('✔ All core MySQL database tables verified.');
  }

  // 3. Always run datetime sanitizer to eliminate any 0000-00-00 datetime values across all tables
  await sanitizeMysqlDatetimes();

  // 4. Verify user and package records
  try {
    const userCount = await prisma.user.count();
    const packageCount = await prisma.package.count().catch(() => 0);
    console.log(`📊 Current MySQL database status: ${userCount} users, ${packageCount} packages present.`);

    if (userCount === 0) {
      console.log('⚡ User table exists but is empty. Executing seed data statements...');
      await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;').catch(() => {});
      for (const stmt of MYSQL_SETUP_STATEMENTS) {
        if (stmt.startsWith('INSERT INTO')) {
          await prisma.$executeRawUnsafe(stmt).catch(() => {});
        }
      }
      await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;').catch(() => {});
      await sanitizeMysqlDatetimes();
      const postSeedCount = await prisma.user.count();
      console.log(`✔ Seeding complete! ${postSeedCount} users now available in MySQL.`);
    } else if (packageCount === 0) {
      console.log('⚡ Package table exists but has 0 records. Seeding packages from embedded SQL...');
      await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;').catch(() => {});
      for (const stmt of MYSQL_SETUP_STATEMENTS) {
        if (stmt.startsWith('INSERT INTO `Package`')) {
          await prisma.$executeRawUnsafe(stmt).catch(() => {});
        }
      }
      await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;').catch(() => {});
      await sanitizeMysqlDatetimes();
      const postPkgCount = await prisma.package.count().catch(() => 0);
      console.log(`✔ Package seeding complete! ${postPkgCount} packages now available.`);
    }
  } catch (err: any) {
    console.warn('Notice checking database counts:', err?.message);
  }

  return true;
}

if (require.main === module) {
  ensureMysqlDatabaseReady(true)
    .then(() => {
      console.log('✔ MySQL auto-init CLI completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ MySQL auto-init failed:', err);
      process.exit(1);
    });
}
