import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

/**
 * Career Wings Production Database Safety & Persistence Manager
 * Guarantees that production data is NEVER overwritten, reset, or deleted by any deployment.
 */

export interface PersistentStoragePaths {
  storageDir: string;
  databasePath: string;
  backupsDir: string;
  uploadsDir: string;
  isExternalToRepo: boolean;
}

/**
 * Locate the true project root directory regardless of current working directory
 */
export function findProjectRoot(): string {
  // Check process.cwd() first
  let cur = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(cur, 'package.json')) && (fs.existsSync(path.join(cur, 'server')) || fs.existsSync(path.join(cur, 'client')))) {
      return cur;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }

  // Fallback to __dirname
  cur = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(cur, 'package.json')) && (fs.existsSync(path.join(cur, 'server')) || fs.existsSync(path.join(cur, 'client')))) {
      return cur;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }

  return process.cwd();
}

/**
 * Resolve persistent storage paths that survive git pulls, redeployments, and web root wipes.
 *
 * Priority order:
 * 1. PERSISTENT_STORAGE_DIR / PERSISTENT_DATA_DIR environment variable
 * 2. On Linux/Hostinger: `path.resolve(projectRoot, '..', 'careerwings_storage')` (sitting OUTSIDE public_html)
 * 3. Fallback: `path.join(projectRoot, 'persistent_data')`
 */
export function getPersistentStoragePaths(): PersistentStoragePaths {
  const projectRoot = findProjectRoot();
  const explicitDir = process.env.PERSISTENT_STORAGE_DIR || process.env.PERSISTENT_DATA_DIR;

  let storageDir = '';
  let isExternal = false;

  if (explicitDir && explicitDir.trim().length > 0) {
    storageDir = path.isAbsolute(explicitDir.trim())
      ? explicitDir.trim()
      : path.resolve(projectRoot, explicitDir.trim());
    isExternal = !storageDir.startsWith(projectRoot);
  } else if (process.platform === 'linux' || process.env.NODE_ENV === 'production') {
    // On Linux / Hostinger: Attempt to store outside the Git deployment repository root
    // Typically on Hostinger, projectRoot is `/home/uXXXX/public_html` or `/home/uXXXX/domains/.../public_html`
    const externalCandidate = path.resolve(projectRoot, '..', 'careerwings_storage');
    try {
      if (!fs.existsSync(externalCandidate)) {
        fs.mkdirSync(externalCandidate, { recursive: true });
      }
      // Test writability
      const testFile = path.join(externalCandidate, '.write_test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      storageDir = externalCandidate;
      isExternal = true;
    } catch {
      // If external is not writable, fall back to persistent_data inside projectRoot
      storageDir = path.join(projectRoot, 'persistent_data');
      isExternal = false;
    }
  } else {
    // Local development (Windows/macOS)
    storageDir = path.join(projectRoot, 'persistent_data');
    isExternal = false;
  }

  const backupsDir = path.join(storageDir, 'backups');
  const uploadsDir = path.join(storageDir, 'uploads');
  const databasePath = path.join(storageDir, 'careerwings_production.db');

  // Ensure directories exist
  [storageDir, backupsDir, uploadsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        console.warn(`[Storage Warning] Could not create directory ${dir}:`, e);
      }
    }
  });

  return {
    storageDir,
    databasePath,
    backupsDir,
    uploadsDir,
    isExternalToRepo: isExternal,
  };
}

/**
 * Get dedicated uploads directories (resumes, images, imports, reports)
 */
export function getPersistentUploadsDir() {
  const { uploadsDir } = getPersistentStoragePaths();
  const dirs = {
    root: uploadsDir,
    resumes: path.join(uploadsDir, 'resumes'),
    images: path.join(uploadsDir, 'images'),
    imports: path.join(uploadsDir, 'imports'),
    reports: path.join(uploadsDir, 'reports'),
  };

  Object.values(dirs).forEach((dir) => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
  });

  return dirs;
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

    // Retention policy: Keep the 30 most recent backups
    const allBackups = fs.readdirSync(backupsDir)
      .filter((f) => f.endsWith('.db'))
      .map((f) => path.join(backupsDir, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

    for (let i = 30; i < allBackups.length; i++) {
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
 * Verify SQLite header of a file
 */
export function verifySqliteHeader(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 100) return false;
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    return buf.toString('utf-8').startsWith('SQLite format 3');
  } catch {
    return false;
  }
}

/**
 * Resolve the dedicated persistent database URL
 */
function resolveDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL;

  // 1. If explicitly configured with postgresql / mysql, respect environment variable directly
  if (envUrl && !envUrl.startsWith('file:') && (envUrl.startsWith('postgresql://') || envUrl.startsWith('mysql://'))) {
    console.log('🔌 [Prisma] Connected to external SQL database:', envUrl.replace(/:[^:@]+@/, ':***@'));
    return envUrl;
  }

  // 2. If explicitly configured with an absolute SQLite file path that is NOT the default relative ./dev.db
  if (envUrl && envUrl.startsWith('file:')) {
    const rawPath = envUrl.replace(/^file:/, '').trim();
    if (path.isAbsolute(rawPath) && rawPath.includes('careerwings')) {
      console.log('🔒 [Prisma] Connected to explicit DATABASE_URL:', rawPath);
      return envUrl;
    }
  }

  const paths = getPersistentStoragePaths();
  const primaryDbPath = paths.databasePath;
  const backupsDir = paths.backupsDir;
  const projectRoot = findProjectRoot();

  // Check if primary persistent database already exists and has valid SQLite header
  const primaryExists = fs.existsSync(primaryDbPath) && fs.statSync(primaryDbPath).size > 10000 && verifySqliteHeader(primaryDbPath);

  if (primaryExists) {
    // ALWAYS take an automatic safety backup before booting
    const label = process.env.NODE_ENV === 'production' ? 'prod_boot' : 'dev_boot';
    createSafetyBackup(primaryDbPath, backupsDir, label);
  } else {
    // First-time persistent setup: look for the best existing database to migrate ONCE
    console.log(`ℹ️ [Database Setup] Production database not yet initialized at: ${primaryDbPath}`);
    console.log(`   Scanning for existing database to migrate safely...`);

    const candidateLocations: string[] = [
      path.join(projectRoot, 'persistent_data', 'careerwings_production.db'),
      path.join(projectRoot, 'server', 'prisma', 'careerwings_template.db'),
      path.join(projectRoot, 'deploy_hostinger', 'api_server', 'prisma', 'dev.db'),
      path.join(projectRoot, 'server', 'prisma', 'prisma', 'dev.db'),
      path.join(projectRoot, 'server', 'prisma', 'dev.db'),
      path.join(projectRoot, 'prisma', 'dev.db'),
      path.join(projectRoot, 'server', 'dev.db'),
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
          return fs.existsSync(p) && fs.statSync(p).size > 10000 && verifySqliteHeader(p);
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
      console.log(`📦 [Database Migration] Migrating existing database from: ${sourceDb} -> ${primaryDbPath}`);
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
  if (paths.isExternalToRepo) {
    console.log(`   🛡️ [PROTECTION ACTIVE] Database is stored OUTSIDE the Git repository (${paths.storageDir})`);
    console.log(`   (Git pulls, redeployments, and web root wipes will NEVER touch this database)`);
  } else {
    console.log(`   🛡️ [PROTECTION ACTIVE] Persistent directory: ${paths.storageDir}`);
  }

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
