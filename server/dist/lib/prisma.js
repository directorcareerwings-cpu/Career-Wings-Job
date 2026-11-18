"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.findProjectRoot = findProjectRoot;
exports.createSafetyBackup = createSafetyBackup;
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Locate the true project root directory regardless of current working directory
 */
function findProjectRoot() {
    // Check process.cwd() first
    let cur = process.cwd();
    for (let i = 0; i < 5; i++) {
        if (fs_1.default.existsSync(path_1.default.join(cur, 'package.json')) && fs_1.default.existsSync(path_1.default.join(cur, 'server'))) {
            return cur;
        }
        const parent = path_1.default.dirname(cur);
        if (parent === cur)
            break;
        cur = parent;
    }
    // Fallback to __dirname
    cur = __dirname;
    for (let i = 0; i < 5; i++) {
        if (fs_1.default.existsSync(path_1.default.join(cur, 'package.json')) && fs_1.default.existsSync(path_1.default.join(cur, 'server'))) {
            return cur;
        }
        const parent = path_1.default.dirname(cur);
        if (parent === cur)
            break;
        cur = parent;
    }
    return process.cwd();
}
/**
 * Create a verified backup of the database with retention policy
 */
function createSafetyBackup(dbPath, backupsDir, label = 'auto') {
    try {
        if (!fs_1.default.existsSync(dbPath) || fs_1.default.statSync(dbPath).size < 1000) {
            return null;
        }
        if (!fs_1.default.existsSync(backupsDir)) {
            fs_1.default.mkdirSync(backupsDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup_${label}_${timestamp}.db`;
        const backupPath = path_1.default.join(backupsDir, backupName);
        // Copy database safely
        fs_1.default.copyFileSync(dbPath, backupPath);
        // Verify backup exists and has identical size
        const origSize = fs_1.default.statSync(dbPath).size;
        const backupSize = fs_1.default.statSync(backupPath).size;
        if (backupSize !== origSize) {
            console.error(`❌ [BACKUP INTEGRITY ERROR] Size mismatch: original=${origSize}, backup=${backupSize}`);
            return null;
        }
        // Verify SQLite file header
        const fd = fs_1.default.openSync(backupPath, 'r');
        const buffer = Buffer.alloc(16);
        fs_1.default.readSync(fd, buffer, 0, 16, 0);
        fs_1.default.closeSync(fd);
        const header = buffer.toString('utf-8');
        if (!header.startsWith('SQLite format 3')) {
            console.error('❌ [BACKUP CORRUPTION ERROR] Backup file is not a valid SQLite database!');
            return null;
        }
        console.log(`🛡️ [BACKUP SUCCESS] Verified database backup created: ${backupName} (${(backupSize / 1024).toFixed(1)} KB)`);
        // Retention policy: Keep the 15 most recent backups
        const allBackups = fs_1.default.readdirSync(backupsDir)
            .filter((f) => f.endsWith('.db'))
            .map((f) => path_1.default.join(backupsDir, f))
            .sort((a, b) => fs_1.default.statSync(b).mtimeMs - fs_1.default.statSync(a).mtimeMs);
        for (let i = 15; i < allBackups.length; i++) {
            try {
                fs_1.default.unlinkSync(allBackups[i]);
            }
            catch { }
        }
        return backupPath;
    }
    catch (err) {
        console.warn('⚠️ [BACKUP WARNING] Failed to create safety backup:', err);
        return null;
    }
}
/**
 * Resolve the dedicated persistent database URL
 */
function resolveDatabaseUrl() {
    // If explicitly configured with postgresql / mysql, respect environment variable directly
    const envUrl = process.env.DATABASE_URL;
    if (envUrl && !envUrl.startsWith('file:') && (envUrl.startsWith('postgresql://') || envUrl.startsWith('mysql://'))) {
        console.log('🔌 [Prisma] Connected to external production database:', envUrl.replace(/:[^:@]+@/, ':***@'));
        return envUrl;
    }
    const projectRoot = findProjectRoot();
    const persistentDir = path_1.default.join(projectRoot, 'persistent_data');
    const backupsDir = path_1.default.join(persistentDir, 'backups');
    if (!fs_1.default.existsSync(persistentDir))
        fs_1.default.mkdirSync(persistentDir, { recursive: true });
    if (!fs_1.default.existsSync(backupsDir))
        fs_1.default.mkdirSync(backupsDir, { recursive: true });
    const isProduction = process.env.NODE_ENV === 'production';
    const targetDbName = isProduction ? 'careerwings_production.db' : 'careerwings_production.db';
    const primaryDbPath = path_1.default.join(persistentDir, targetDbName);
    // Check if primary persistent database already exists
    const primaryExists = fs_1.default.existsSync(primaryDbPath) && fs_1.default.statSync(primaryDbPath).size > 10000;
    if (primaryExists) {
        // ALWAYS take an automatic safety backup before booting
        createSafetyBackup(primaryDbPath, backupsDir, isProduction ? 'prod_boot' : 'dev_boot');
    }
    else {
        // First-time production setup: look for the best existing database to migrate ONCE
        console.log(`ℹ️ [Database Setup] ${targetDbName} not found in persistent_data. Checking existing databases to migrate...`);
        const candidateLocations = [
            path_1.default.join(projectRoot, 'server/prisma/careerwings_template.db'),
            path_1.default.join(projectRoot, 'server/prisma/prisma/dev.db'),
            path_1.default.join(projectRoot, 'server/prisma/dev.db'),
            path_1.default.join(projectRoot, 'prisma/dev.db'),
            path_1.default.join(projectRoot, 'server/dev.db'),
            path_1.default.join(projectRoot, 'dev.db'),
        ];
        if (envUrl && envUrl.startsWith('file:')) {
            const rawPath = envUrl.replace(/^file:/, '').trim();
            candidateLocations.unshift(path_1.default.isAbsolute(rawPath) ? rawPath : path_1.default.resolve(projectRoot, rawPath));
        }
        const viableDbs = candidateLocations
            .filter((p) => p !== primaryDbPath)
            .filter((p) => {
            try {
                return fs_1.default.existsSync(p) && fs_1.default.statSync(p).size > 10000;
            }
            catch {
                return false;
            }
        })
            .map((p) => ({
            path: p,
            size: fs_1.default.statSync(p).size,
            mtime: fs_1.default.statSync(p).mtimeMs,
        }))
            .sort((a, b) => b.size - a.size || b.mtime - a.mtime);
        if (viableDbs.length > 0) {
            const sourceDb = viableDbs[0].path;
            console.log(`📦 [Database Migration] Migrating existing database from ${sourceDb} to persistent storage: ${primaryDbPath}`);
            try {
                fs_1.default.copyFileSync(sourceDb, primaryDbPath);
                createSafetyBackup(primaryDbPath, backupsDir, 'initial_migrated');
            }
            catch (copyErr) {
                console.error('❌ Failed to copy to persistent DB:', copyErr);
            }
        }
        else {
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
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        datasources: {
            db: {
                url: resolvedDbUrl,
            },
        },
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
//# sourceMappingURL=prisma.js.map