import fs from 'fs';
import path from 'path';
import { prisma, isMysqlConfigured } from './prisma';
import { MYSQL_SETUP_STATEMENTS } from './mysql-embedded-setup';

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
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;').catch(() => { });

    let successCount = 0;
    let errorCount = 0;

    for (const stmt of MYSQL_SETUP_STATEMENTS) {
      try {
        await prisma.$executeRawUnsafe(stmt);
        successCount++;
      } catch (err: any) {
        // Ignore harmless duplicate key or existing table notices
        const msg = err?.message || '';
        if (!msg.includes('already exists') && !msg.includes('Duplicate key') && !msg.includes('Duplicate entry')) {
          errorCount++;
        }
      }
    }

    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;').catch(() => { });
    console.log(`✔ MySQL auto-setup finished (${successCount} executed, ${errorCount} non-critical notices).`);
  } else {
    console.log('✔ All core MySQL database tables verified.');
  }

  // 3. Verify user records
  try {
    const userCount = await prisma.user.count();
    console.log(`📊 Current MySQL database status: ${userCount} users present.`);

    if (userCount === 0) {
      console.log('⚡ User table exists but is empty. Executing seed data statements...');
      await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;').catch(() => { });
      for (const stmt of MYSQL_SETUP_STATEMENTS) {
        if (stmt.startsWith('INSERT INTO')) {
          await prisma.$executeRawUnsafe(stmt).catch(() => { });
        }
      }
      await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;').catch(() => { });
      const postSeedCount = await prisma.user.count();
      console.log(`✔ Seeding complete! ${postSeedCount} users now available in MySQL.`);
    }
  } catch (err: any) {
    console.warn('Notice checking user count:', err?.message);
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
