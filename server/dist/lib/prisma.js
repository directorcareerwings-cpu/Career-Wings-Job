"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.findProjectRoot = findProjectRoot;
exports.getPersistentStoragePaths = getPersistentStoragePaths;
exports.getPersistentUploadsDir = getPersistentUploadsDir;
exports.doesUploadedAssetExist = doesUploadedAssetExist;
exports.createSafetyBackup = createSafetyBackup;
exports.verifySqliteHeader = verifySqliteHeader;
exports.isMysqlConfigured = isMysqlConfigured;
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
        if (fs_1.default.existsSync(path_1.default.join(cur, 'package.json')) && (fs_1.default.existsSync(path_1.default.join(cur, 'server')) || fs_1.default.existsSync(path_1.default.join(cur, 'client')))) {
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
        if (fs_1.default.existsSync(path_1.default.join(cur, 'package.json')) && (fs_1.default.existsSync(path_1.default.join(cur, 'server')) || fs_1.default.existsSync(path_1.default.join(cur, 'client')))) {
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
 * Resolve persistent storage paths that survive git pulls, redeployments, and web root wipes.
 *
 * Priority order:
 * 1. PERSISTENT_STORAGE_DIR / PERSISTENT_DATA_DIR environment variable
 * 2. On Linux/Hostinger: `path.resolve(projectRoot, '..', 'careerwings_storage')` (sitting OUTSIDE public_html)
 * 3. Fallback: `path.join(projectRoot, 'persistent_data')`
 */
function getPersistentStoragePaths() {
    const projectRoot = findProjectRoot();
    const explicitDir = process.env.PERSISTENT_STORAGE_DIR || process.env.PERSISTENT_DATA_DIR;
    let storageDir = '';
    let isExternal = false;
    if (explicitDir && explicitDir.trim().length > 0) {
        storageDir = path_1.default.isAbsolute(explicitDir.trim())
            ? explicitDir.trim()
            : path_1.default.resolve(projectRoot, explicitDir.trim());
        isExternal = !storageDir.startsWith(projectRoot);
    }
    else if (process.platform === 'linux' || process.env.NODE_ENV === 'production') {
        // On Linux / Hostinger: Attempt to store outside the Git deployment repository root
        // Typically on Hostinger, projectRoot is `/home/uXXXX/public_html` or `/home/uXXXX/domains/.../public_html`
        const externalCandidate = path_1.default.resolve(projectRoot, '..', 'careerwings_storage');
        try {
            if (!fs_1.default.existsSync(externalCandidate)) {
                fs_1.default.mkdirSync(externalCandidate, { recursive: true });
            }
            // Test writability
            const testFile = path_1.default.join(externalCandidate, '.write_test');
            fs_1.default.writeFileSync(testFile, 'test');
            fs_1.default.unlinkSync(testFile);
            storageDir = externalCandidate;
            isExternal = true;
        }
        catch {
            // If external is not writable, fall back to persistent_data inside projectRoot
            storageDir = path_1.default.join(projectRoot, 'persistent_data');
            isExternal = false;
        }
    }
    else {
        // Local development (Windows/macOS)
        storageDir = path_1.default.join(projectRoot, 'persistent_data');
        isExternal = false;
    }
    const backupsDir = path_1.default.join(storageDir, 'backups');
    const uploadsDir = path_1.default.join(storageDir, 'uploads');
    const databasePath = path_1.default.join(storageDir, 'careerwings_production.db');
    // Ensure directories exist
    [storageDir, backupsDir, uploadsDir].forEach((dir) => {
        if (!fs_1.default.existsSync(dir)) {
            try {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            catch (e) {
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
function getPersistentUploadsDir() {
    const { uploadsDir } = getPersistentStoragePaths();
    const dirs = {
        root: uploadsDir,
        resumes: path_1.default.join(uploadsDir, 'resumes'),
        images: path_1.default.join(uploadsDir, 'images'),
        imports: path_1.default.join(uploadsDir, 'imports'),
        reports: path_1.default.join(uploadsDir, 'reports'),
    };
    Object.values(dirs).forEach((dir) => {
        if (!fs_1.default.existsSync(dir)) {
            try {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            catch { }
        }
    });
    return dirs;
}
/**
 * Verify whether an uploaded `/uploads/...` URL points to an actual file in any upload directory
 */
function doesUploadedAssetExist(assetUrl) {
    if (!assetUrl || !assetUrl.startsWith('/uploads/'))
        return false;
    const relPath = decodeURIComponent(assetUrl.replace(/^\/uploads\//, '').split('?')[0]);
    if (!relPath || relPath.includes('..'))
        return false;
    const persistentUploads = getPersistentUploadsDir();
    const candidateRoots = [
        persistentUploads.root,
        path_1.default.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
        path_1.default.join(process.cwd(), 'server', 'uploads'),
        path_1.default.resolve(__dirname, '../uploads'),
        path_1.default.resolve(__dirname, '../../uploads'),
        path_1.default.resolve(__dirname, '../../server/uploads'),
    ];
    for (const rootDir of candidateRoots) {
        const resolvedRoot = path_1.default.resolve(rootDir);
        const resolvedFile = path_1.default.resolve(rootDir, relPath);
        if (resolvedFile.startsWith(resolvedRoot) && fs_1.default.existsSync(resolvedFile)) {
            return true;
        }
    }
    return false;
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
        // Retention policy: Keep the 30 most recent backups
        const allBackups = fs_1.default.readdirSync(backupsDir)
            .filter((f) => f.endsWith('.db'))
            .map((f) => path_1.default.join(backupsDir, f))
            .sort((a, b) => fs_1.default.statSync(b).mtimeMs - fs_1.default.statSync(a).mtimeMs);
        for (let i = 30; i < allBackups.length; i++) {
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
 * Verify SQLite header of a file
 */
function verifySqliteHeader(filePath) {
    try {
        if (!fs_1.default.existsSync(filePath) || fs_1.default.statSync(filePath).size < 100)
            return false;
        const fd = fs_1.default.openSync(filePath, 'r');
        const buf = Buffer.alloc(16);
        fs_1.default.readSync(fd, buf, 0, 16, 0);
        fs_1.default.closeSync(fd);
        return buf.toString('utf-8').startsWith('SQLite format 3');
    }
    catch {
        return false;
    }
}
/**
 * Detect whether MySQL or MariaDB is configured via DATABASE_URL
 */
function isMysqlConfigured() {
    const envUrl = (process.env.DATABASE_URL || '').trim();
    return envUrl.startsWith('mysql://') || envUrl.startsWith('mariadb://');
}
/**
 * Resolve the dedicated persistent database URL
 */
function resolveDatabaseUrl() {
    const envUrl = (process.env.DATABASE_URL || '').trim();
    // If MySQL / MariaDB URL is configured, connect directly to MySQL server
    if (isMysqlConfigured()) {
        const masked = envUrl.replace(/:[^:@]+@/, ':***@');
        console.log(`🐬 [Prisma] CONNECTED TO PRODUCTION MYSQL DATABASE: ${masked}`);
        console.log('   🛡️ [PERSISTENCE ACTIVE] Database is hosted on Hostinger MySQL server.');
        console.log('   (Git pulls, code redeployments, and web root wipes will NEVER touch MySQL data)');
        return envUrl;
    }
    const paths = getPersistentStoragePaths();
    const primaryDbPath = paths.databasePath;
    const backupsDir = paths.backupsDir;
    const projectRoot = findProjectRoot();
    // If explicitly configured with an absolute SQLite file path that is NOT the default relative ./dev.db
    if (envUrl && envUrl.startsWith('file:')) {
        const rawPath = envUrl.replace(/^file:/, '').trim();
        if (path_1.default.isAbsolute(rawPath) && rawPath.includes('careerwings') && fs_1.default.existsSync(rawPath)) {
            console.log('🔒 [Prisma] Connected to explicit DATABASE_URL:', rawPath);
            return envUrl;
        }
    }
    // Check if primary persistent database already exists and has valid SQLite header
    const primaryExists = fs_1.default.existsSync(primaryDbPath) && fs_1.default.statSync(primaryDbPath).size > 10000 && verifySqliteHeader(primaryDbPath);
    if (primaryExists) {
        // ALWAYS take an automatic safety backup before booting
        const label = process.env.NODE_ENV === 'production' ? 'prod_boot' : 'dev_boot';
        createSafetyBackup(primaryDbPath, backupsDir, label);
    }
    else {
        // First-time persistent setup: look for the best existing database to migrate ONCE
        console.log(`ℹ️ [Database Setup] Production database not yet initialized at: ${primaryDbPath}`);
        console.log(`   Scanning for existing database to migrate safely...`);
        const candidateLocations = [
            path_1.default.join(projectRoot, 'persistent_data', 'careerwings_production.db'),
            path_1.default.join(projectRoot, 'server', 'prisma', 'careerwings_template.db'),
            path_1.default.join(projectRoot, 'deploy_hostinger', 'api_server', 'prisma', 'dev.db'),
            path_1.default.join(projectRoot, 'server', 'prisma', 'prisma', 'dev.db'),
            path_1.default.join(projectRoot, 'server', 'prisma', 'dev.db'),
            path_1.default.join(projectRoot, 'prisma', 'dev.db'),
            path_1.default.join(projectRoot, 'server', 'dev.db'),
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
                return fs_1.default.existsSync(p) && fs_1.default.statSync(p).size > 10000 && verifySqliteHeader(p);
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
            console.log(`📦 [Database Migration] Migrating existing database from: ${sourceDb} -> ${primaryDbPath}`);
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
    if (paths.isExternalToRepo) {
        console.log(`   🛡️ [PROTECTION ACTIVE] Database is stored OUTSIDE the Git repository (${paths.storageDir})`);
        console.log(`   (Git pulls, redeployments, and web root wipes will NEVER touch this database)`);
    }
    else {
        console.log(`   🛡️ [PROTECTION ACTIVE] Persistent directory: ${paths.storageDir}`);
    }
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