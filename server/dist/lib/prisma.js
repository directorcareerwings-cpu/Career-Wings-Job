"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function resolveDatabaseUrl() {
    // If explicitly configured with postgres / mysql, keep as is
    const envUrl = process.env.DATABASE_URL;
    if (envUrl && !envUrl.startsWith('file:') && (envUrl.startsWith('postgresql://') || envUrl.startsWith('mysql://'))) {
        return envUrl;
    }
    // 1. Persistent Data Directory (Outside git tracking, NEVER deleted by git pull/redeploy)
    const persistentDir = path_1.default.resolve(process.cwd(), 'persistent_data');
    const backupsDir = path_1.default.join(persistentDir, 'backups');
    if (!fs_1.default.existsSync(persistentDir))
        fs_1.default.mkdirSync(persistentDir, { recursive: true });
    if (!fs_1.default.existsSync(backupsDir))
        fs_1.default.mkdirSync(backupsDir, { recursive: true });
    const primaryPersistentDb = path_1.default.join(persistentDir, 'careerwings_production.db');
    // Candidate locations where existing live or seeded database files might be found
    const candidateLocations = [
        primaryPersistentDb,
        path_1.default.resolve(process.cwd(), 'server/prisma/prisma/dev.db'),
        path_1.default.resolve(process.cwd(), 'server/prisma/dev.db'),
        path_1.default.resolve(process.cwd(), 'prisma/dev.db'),
        path_1.default.resolve(process.cwd(), 'server/dev.db'),
        path_1.default.resolve(process.cwd(), 'dev.db'),
        path_1.default.resolve(__dirname, '../../server/prisma/dev.db'),
        path_1.default.resolve(__dirname, '../prisma/dev.db'),
        path_1.default.resolve(__dirname, '../prisma/prisma/dev.db'),
        path_1.default.resolve(__dirname, '../../prisma/dev.db'),
        path_1.default.resolve(__dirname, '../dev.db'),
    ];
    if (envUrl && envUrl.startsWith('file:')) {
        const rawPath = envUrl.replace(/^file:/, '').trim();
        if (path_1.default.isAbsolute(rawPath)) {
            candidateLocations.unshift(rawPath);
        }
        else {
            candidateLocations.unshift(path_1.default.resolve(process.cwd(), 'server/prisma', rawPath));
            candidateLocations.unshift(path_1.default.resolve(process.cwd(), 'server', rawPath));
            candidateLocations.unshift(path_1.default.resolve(process.cwd(), rawPath));
        }
    }
    // Check if primary persistent DB exists and has valid data (> 10KB)
    let targetDb = primaryPersistentDb;
    const primaryExists = fs_1.default.existsSync(primaryPersistentDb) && fs_1.default.statSync(primaryPersistentDb).size > 10000;
    if (primaryExists) {
        // Automatically create a safety backup before server boot (keep last 5 backups)
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path_1.default.join(backupsDir, `backup_${timestamp}.db`);
            fs_1.default.copyFileSync(primaryPersistentDb, backupPath);
            // Clean old backups keeping last 5
            const allBackups = fs_1.default.readdirSync(backupsDir)
                .filter((f) => f.endsWith('.db'))
                .map((f) => path_1.default.join(backupsDir, f))
                .sort((a, b) => fs_1.default.statSync(b).mtimeMs - fs_1.default.statSync(a).mtimeMs);
            for (let i = 5; i < allBackups.length; i++) {
                try {
                    fs_1.default.unlinkSync(allBackups[i]);
                }
                catch { }
            }
        }
        catch (err) {
            console.warn('⚠️ Could not create automatic DB backup:', err);
        }
    }
    else {
        // Primary persistent DB does not exist yet. Migrate the best available existing database.
        const existingDbs = candidateLocations
            .filter((p) => p !== primaryPersistentDb)
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
        if (existingDbs.length > 0) {
            const bestDb = existingDbs[0].path;
            console.log(`📦 [Prisma] Migrating existing database (${bestDb}) to persistent storage: ${primaryPersistentDb}`);
            try {
                fs_1.default.copyFileSync(bestDb, primaryPersistentDb);
                const initBackup = path_1.default.join(backupsDir, 'initial_migrated_backup.db');
                fs_1.default.copyFileSync(bestDb, initBackup);
            }
            catch (err) {
                console.error('❌ Failed to copy to persistent DB, using bestDb directly:', err);
                targetDb = bestDb;
            }
        }
        else {
            console.log(`ℹ️ [Prisma] Initializing fresh persistent database at: ${primaryPersistentDb}`);
        }
    }
    // Also maintain synced copies in legacy locations so any relative paths stay safe
    const syncLocations = [
        path_1.default.resolve(process.cwd(), 'server/prisma/dev.db'),
        path_1.default.resolve(process.cwd(), 'server/prisma/prisma/dev.db'),
        path_1.default.resolve(process.cwd(), 'prisma/dev.db'),
        path_1.default.resolve(process.cwd(), 'server/dev.db'),
        path_1.default.resolve(process.cwd(), 'dev.db'),
    ];
    for (const syncTarget of syncLocations) {
        try {
            const dir = path_1.default.dirname(syncTarget);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            if (fs_1.default.existsSync(targetDb) && (!fs_1.default.existsSync(syncTarget) || fs_1.default.statSync(syncTarget).size === 0)) {
                fs_1.default.copyFileSync(targetDb, syncTarget);
            }
        }
        catch { }
    }
    const normalized = targetDb.replace(/\\/g, '/');
    const finalUrl = `file:${normalized}`;
    process.env.DATABASE_URL = finalUrl;
    console.log(`🔌 [Prisma] Connected to persistent database: ${targetDb}`);
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
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
//# sourceMappingURL=prisma.js.map