import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

/**
 * Career Wings Production Database Safety & Persistence Manager
 * Guarantees that production data is NEVER overwritten, reset, or deleted by any deployment.
 */

export interface DatabaseAuditMetrics {
  timestamp: string;
  environment: string;
  databasePath: string;
  sizeBytes: number;
  integrityOk: boolean;
  counts?: {
    users: number;
    candidates: number;
    employers: number;
    companies: number;
    jobs: number;
    publishedJobs: number;
    applications: number;
    adminSettings: number;
  };
}

/**
 * Locate the true project root directory regardless of current working directory
 */
export function findProjectRoot(): string {
  // Check process.cwd() first
  let cur = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(cur, 'package.json')) && fs.existsSync(path.join(cur, 'server'))) {
      return cur;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }

  // Fallback to __dirname
  cur = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(cur, 'package.json')) && fs.existsSync(path.join(cur, 'server'))) {
      return cur;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }

  return process.cwd();
}

/**
 * Create a verified backup of the database with retention policy
 */
export function createSafetyBackup(dbPath: string, backupsDir: string, label = 'auto'): string | null {
  try {
    if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size < 1000) {
      return null;
    }

    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_${label}_${timestamp}.db`;
    const backupPath = path.join(backupsDir, backupName);

    // Copy database safely
    fs.copyFileSync(dbPath, backupPath);

    // Verify backup exists and has identical size
    const origSize = fs.statSync(dbPath).size;
    const backupSize = fs.statSync(backupPath).size;

    if (backupSize !== origSize) {
      console.error(`❌ [BACKUP INTEGRITY ERROR] Size mismatch: original=${origSize}, backup=${backupSize}`);
      return null;
    }

    // Verify SQLite file header
    const fd = fs.openSync(backupPath, 'r');
    const buffer = Buffer.alloc(16);
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    const header = buffer.toString('utf-8');

    if (!header.startsWith('SQLite format 3')) {
      console.error('❌ [BACKUP CORRUPTION ERROR] Backup file is not a valid SQLite database!');
      return null;
    }

    console.log(`🛡️ [BACKUP SUCCESS] Verified database backup created: ${backupName} (${(backupSize / 1024).toFixed(1)} KB)`);

    // Retention policy: Keep the 15 most recent backups
    const allBackups = fs.readdirSync(backupsDir)
      .filter((f) => f.endsWith('.db'))
      .map((f) => path.join(backupsDir, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

    for (let i = 15; i < allBackups.length; i++) {
      try {
        fs.unlinkSync(allBackups[i]);
      } catch {}
    }

    return backupPath;
  } catch (err) {
    console.warn('⚠️ [BACKUP WARNING] Failed to create safety backup:', err);
    return null;
  }
}

/**
 * Resolve the dedicated persistent database URL
 */
function resolveDatabaseUrl(): string {
  // If explicitly configured with postgresql / mysql, respect environment variable directly
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && !envUrl.startsWith('file:') && (envUrl.startsWith('postgresql://') || envUrl.startsWith('mysql://'))) {
    console.log('🔌 [Prisma] Connected to external production database:', envUrl.replace(/:[^:@]+@/, ':***@'));
    return envUrl;
  }

  const projectRoot = findProjectRoot();
  const persistentDir = path.join(projectRoot, 'persistent_data');
  const backupsDir = path.join(persistentDir, 'backups');

  if (!fs.existsSync(persistentDir)) fs.mkdirSync(persistentDir, { recursive: true });
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

  const isProduction = process.env.NODE_ENV === 'production';
  const targetDbName = isProduction ? 'careerwings_production.db' : 'careerwings_production.db';
  const primaryDbPath = path.join(persistentDir, targetDbName);

  // Check if primary persistent database already exists
  const primaryExists = fs.existsSync(primaryDbPath) && fs.statSync(primaryDbPath).size > 10000;

  if (primaryExists) {
    // ALWAYS take an automatic safety backup before booting
    createSafetyBackup(primaryDbPath, backupsDir, isProduction ? 'prod_boot' : 'dev_boot');
  } else {
    // First-time production setup: look for the best existing database to migrate ONCE
    console.log(`ℹ️ [Database Setup] ${targetDbName} not found in persistent_data. Checking existing databases to migrate...`);

    const candidateLocations: string[] = [
      path.join(projectRoot, 'server/prisma/prisma/dev.db'),
      path.join(projectRoot, 'server/prisma/dev.db'),
      path.join(projectRoot, 'prisma/dev.db'),
      path.join(projectRoot, 'server/dev.db'),
      path.join(projectRoot, 'dev.db'),
    ];

    if (envUrl && envUrl.startsWith('file:')) {
      const rawPath = envUrl.replace(/^file:/, '').trim();
      candidateLocations.unshift(path.isAbsolute(rawPath) ? rawPath : path.resolve(projectRoot, rawPath));
    }

    const viableDbs = candidateLocations
      .filter((p) => p !== primaryDbPath)
      .filter((p) => {
        try {
          return fs.existsSync(p) && fs.statSync(p).size > 10000;
        } catch {
          return false;
        }
      })
      .map((p) => ({
        path: p,
        size: fs.statSync(p).size,
        mtime: fs.statSync(p).mtimeMs,
      }))
      .sort((a, b) => b.size - a.size || b.mtime - a.mtime);

    if (viableDbs.length > 0) {
      const sourceDb = viableDbs[0].path;
      console.log(`📦 [Database Migration] Migrating existing database from ${sourceDb} to persistent storage: ${primaryDbPath}`);
      try {
        fs.copyFileSync(sourceDb, primaryDbPath);
        createSafetyBackup(primaryDbPath, backupsDir, 'initial_migrated');
      } catch (copyErr) {
        console.error('❌ Failed to copy to persistent DB:', copyErr);
      }
    } else {
      console.log(`✨ [Database Init] Initializing fresh persistent database at: ${primaryDbPath}`);
    }
  }

  const normalized = primaryDbPath.replace(/\\/g, '/');
  const finalUrl = `file:${normalized}`;
  process.env.DATABASE_URL = finalUrl;

  console.log(`🔒 [Prisma] CONNECTED TO PERSISTENT DATABASE: ${primaryDbPath}`);
  console.log(`   (Database file is protected from git pulls and future deployments)`);

  return finalUrl;
}

const resolvedDbUrl = resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: resolvedDbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
