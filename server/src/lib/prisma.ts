import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

function resolveDatabaseUrl(): string {
  // If explicitly configured with postgres / mysql, keep as is
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && !envUrl.startsWith('file:') && (envUrl.startsWith('postgresql://') || envUrl.startsWith('mysql://'))) {
    return envUrl;
  }

  // 1. Persistent Data Directory (Outside git tracking, NEVER deleted by git pull/redeploy)
  const persistentDir = path.resolve(process.cwd(), 'persistent_data');
  const backupsDir = path.join(persistentDir, 'backups');
  if (!fs.existsSync(persistentDir)) fs.mkdirSync(persistentDir, { recursive: true });
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

  const primaryPersistentDb = path.join(persistentDir, 'careerwings_production.db');

  // Candidate locations where existing live or seeded database files might be found
  const candidateLocations: string[] = [
    primaryPersistentDb,
    path.resolve(process.cwd(), 'server/prisma/prisma/dev.db'),
    path.resolve(process.cwd(), 'server/prisma/dev.db'),
    path.resolve(process.cwd(), 'prisma/dev.db'),
    path.resolve(process.cwd(), 'server/dev.db'),
    path.resolve(process.cwd(), 'dev.db'),
    path.resolve(__dirname, '../../server/prisma/dev.db'),
    path.resolve(__dirname, '../prisma/dev.db'),
    path.resolve(__dirname, '../prisma/prisma/dev.db'),
    path.resolve(__dirname, '../../prisma/dev.db'),
    path.resolve(__dirname, '../dev.db'),
  ];

  if (envUrl && envUrl.startsWith('file:')) {
    const rawPath = envUrl.replace(/^file:/, '').trim();
    if (path.isAbsolute(rawPath)) {
      candidateLocations.unshift(rawPath);
    } else {
      candidateLocations.unshift(path.resolve(process.cwd(), 'server/prisma', rawPath));
      candidateLocations.unshift(path.resolve(process.cwd(), 'server', rawPath));
      candidateLocations.unshift(path.resolve(process.cwd(), rawPath));
    }
  }

  // Check if primary persistent DB exists and has valid data (> 10KB)
  let targetDb = primaryPersistentDb;
  const primaryExists = fs.existsSync(primaryPersistentDb) && fs.statSync(primaryPersistentDb).size > 10000;

  if (primaryExists) {
    // Automatically create a safety backup before server boot (keep last 5 backups)
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupsDir, `backup_${timestamp}.db`);
      fs.copyFileSync(primaryPersistentDb, backupPath);

      // Clean old backups keeping last 5
      const allBackups = fs.readdirSync(backupsDir)
        .filter((f) => f.endsWith('.db'))
        .map((f) => path.join(backupsDir, f))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

      for (let i = 5; i < allBackups.length; i++) {
        try { fs.unlinkSync(allBackups[i]); } catch {}
      }
    } catch (err) {
      console.warn('⚠️ Could not create automatic DB backup:', err);
    }
  } else {
    // Primary persistent DB does not exist yet. Migrate the best available existing database.
    const existingDbs = candidateLocations
      .filter((p) => p !== primaryPersistentDb)
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

    if (existingDbs.length > 0) {
      const bestDb = existingDbs[0].path;
      console.log(`📦 [Prisma] Migrating existing database (${bestDb}) to persistent storage: ${primaryPersistentDb}`);
      try {
        fs.copyFileSync(bestDb, primaryPersistentDb);
        const initBackup = path.join(backupsDir, 'initial_migrated_backup.db');
        fs.copyFileSync(bestDb, initBackup);
      } catch (err) {
        console.error('❌ Failed to copy to persistent DB, using bestDb directly:', err);
        targetDb = bestDb;
      }
    } else {
      console.log(`ℹ️ [Prisma] Initializing fresh persistent database at: ${primaryPersistentDb}`);
    }
  }

  // Also maintain synced copies in legacy locations so any relative paths stay safe
  const syncLocations = [
    path.resolve(process.cwd(), 'server/prisma/dev.db'),
    path.resolve(process.cwd(), 'server/prisma/prisma/dev.db'),
    path.resolve(process.cwd(), 'prisma/dev.db'),
    path.resolve(process.cwd(), 'server/dev.db'),
    path.resolve(process.cwd(), 'dev.db'),
  ];

  for (const syncTarget of syncLocations) {
    try {
      const dir = path.dirname(syncTarget);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(targetDb) && (!fs.existsSync(syncTarget) || fs.statSync(syncTarget).size === 0)) {
        fs.copyFileSync(targetDb, syncTarget);
      }
    } catch {}
  }

  const normalized = targetDb.replace(/\\/g, '/');
  const finalUrl = `file:${normalized}`;
  process.env.DATABASE_URL = finalUrl;
  console.log(`🔌 [Prisma] Connected to persistent database: ${targetDb}`);
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
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
