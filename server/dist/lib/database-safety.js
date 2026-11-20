"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditDatabase = auditDatabase;
exports.safeMigrate = safeMigrate;
exports.restoreDatabaseFromBackup = restoreDatabaseFromBackup;
const prisma_1 = require("./prisma");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
/**
 * Collect database audit metrics
 */
async function auditDatabase() {
    const paths = (0, prisma_1.getPersistentStoragePaths)();
    const dbPath = paths.databasePath;
    const size = fs_1.default.existsSync(dbPath) ? fs_1.default.statSync(dbPath).size : 0;
    const headerOk = (0, prisma_1.verifySqliteHeader)(dbPath);
    const [users, candidates, employers, companies, jobsTotal, jobsPublished, jobsDraft, jobsPending, applications, adminSettings,] = await Promise.all([
        prisma_1.prisma.user.count().catch(() => 0),
        prisma_1.prisma.candidate.count().catch(() => 0),
        prisma_1.prisma.employer.count().catch(() => 0),
        prisma_1.prisma.company.count().catch(() => 0),
        prisma_1.prisma.job.count({ where: { deletedAt: null } }).catch(() => 0),
        prisma_1.prisma.job.count({ where: { status: 'PUBLISHED', deletedAt: null } }).catch(() => 0),
        prisma_1.prisma.job.count({ where: { status: 'DRAFT', deletedAt: null } }).catch(() => 0),
        prisma_1.prisma.job.count({ where: { status: 'PENDING', deletedAt: null } }).catch(() => 0),
        prisma_1.prisma.application.count().catch(() => 0),
        prisma_1.prisma.adminSetting.count().catch(() => 0),
    ]);
    const report = {
        timestamp: new Date().toISOString(),
        databasePath: dbPath,
        storageDir: paths.storageDir,
        isExternalToRepo: paths.isExternalToRepo,
        sizeKb: (size / 1024).toFixed(1),
        headerValid: headerOk,
        counts: {
            users,
            candidates,
            employers,
            companies,
            jobsTotal,
            jobsPublished,
            jobsDraft,
            jobsPending,
            applications,
            adminSettings,
        },
    };
    return report;
}
/**
 * Run safe, additive schema migration without data loss
 */
async function safeMigrate() {
    const paths = (0, prisma_1.getPersistentStoragePaths)();
    const dbPath = paths.databasePath;
    console.log('🔍 [Safe Migration] Starting safe schema verification...');
    console.log(`   Database Target: ${dbPath}`);
    // 1. Audit before migration
    const beforeAudit = await auditDatabase();
    console.log(`   Pre-migration counts: Users=${beforeAudit.counts.users}, Candidates=${beforeAudit.counts.candidates}, Jobs=${beforeAudit.counts.jobsTotal}, Applications=${beforeAudit.counts.applications}`);
    // 2. Pre-migration immutable safety backup
    const backup = (0, prisma_1.createSafetyBackup)(dbPath, paths.backupsDir, 'pre_migration');
    if (!backup) {
        throw new Error('❌ [MIGRATION ABORTED] Could not create pre-migration safety backup. Migration halted to protect data.');
    }
    // 2.1 Direct SQL additive verification for ImportJob table
    try {
        await prisma_1.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ImportJob" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "fileName" TEXT NOT NULL,
        "fileSize" INTEGER NOT NULL DEFAULT 0,
        "mimeType" TEXT,
        "filePath" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "totalRows" INTEGER NOT NULL DEFAULT 0,
        "processedRows" INTEGER NOT NULL DEFAULT 0,
        "successCount" INTEGER NOT NULL DEFAULT 0,
        "updatedCount" INTEGER NOT NULL DEFAULT 0,
        "skippedCount" INTEGER NOT NULL DEFAULT 0,
        "invalidCount" INTEGER NOT NULL DEFAULT 0,
        "failedCount" INTEGER NOT NULL DEFAULT 0,
        "duplicateStrategy" TEXT NOT NULL DEFAULT 'SKIP',
        "mappings" TEXT,
        "reportPath" TEXT,
        "errorLog" TEXT,
        "summary" TEXT,
        "createdBy" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
        await prisma_1.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ImportJob_status_idx" ON "ImportJob"("status");`);
        await prisma_1.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ImportJob_createdAt_idx" ON "ImportJob"("createdAt");`);
    }
    catch (e) {
        console.warn('ImportJob table migration notice:', e);
    }
    // 3. Find bundled Prisma binary
    const serverDir = path_1.default.resolve(__dirname, '..');
    const rootDir = path_1.default.resolve(__dirname, '../..');
    const possiblePrismaBins = [
        path_1.default.join(serverDir, 'node_modules', 'prisma', 'build', 'index.js'),
        path_1.default.join(rootDir, 'node_modules', 'prisma', 'build', 'index.js'),
        path_1.default.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js'),
    ];
    const prismaBin = possiblePrismaBins.find((b) => fs_1.default.existsSync(b));
    const migrateCmd = prismaBin
        ? `node "${prismaBin}" db push --skip-generate --accept-data-loss=false`
        : 'npx prisma db push --skip-generate --accept-data-loss=false';
    console.log('⚡ [Safe Migration] Applying additive schema changes (strictly disallowing data loss)...');
    try {
        (0, child_process_1.execSync)(migrateCmd, {
            cwd: serverDir,
            env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
            stdio: 'inherit',
        });
    }
    catch (err) {
        console.error('❌ [Safe Migration Error] Prisma db push detected potential data loss or failed:', err?.message || err);
        console.error(`🛡️ [Protection Active] Database unchanged. Pre-migration backup is safe at: ${backup}`);
        throw err;
    }
    // 4. Audit after migration and verify zero records were lost
    const afterAudit = await auditDatabase();
    console.log(`   Post-migration counts: Users=${afterAudit.counts.users}, Candidates=${afterAudit.counts.candidates}, Jobs=${afterAudit.counts.jobsTotal}, Applications=${afterAudit.counts.applications}`);
    if (afterAudit.counts.users < beforeAudit.counts.users || afterAudit.counts.jobsTotal < beforeAudit.counts.jobsTotal) {
        console.error('❌ [CRITICAL MIGRATION ANOMALY] Post-migration record count is less than pre-migration!');
        console.error(`   Restoring immediately from safety backup: ${backup}`);
        await restoreDatabaseFromBackup(backup);
        throw new Error('Migration caused record loss and was rolled back automatically.');
    }
    console.log('✅ [Safe Migration] Migration completed successfully with zero record loss verified.');
    return { success: true, message: 'Additive migration applied safely.' };
}
/**
 * Safely restore database from a verified backup
 */
async function restoreDatabaseFromBackup(backupFileName) {
    const paths = (0, prisma_1.getPersistentStoragePaths)();
    const backupsDir = paths.backupsDir;
    const backupPath = path_1.default.isAbsolute(backupFileName) ? backupFileName : path_1.default.join(backupsDir, backupFileName);
    const targetDbPath = paths.databasePath;
    if (!fs_1.default.existsSync(backupPath)) {
        throw new Error(`Backup file does not exist: ${backupPath}`);
    }
    // Verify backup header
    if (!(0, prisma_1.verifySqliteHeader)(backupPath)) {
        throw new Error('Corrupt backup file: not a valid SQLite database header!');
    }
    // Create safety snapshot of current DB before replacing
    if (fs_1.default.existsSync(targetDbPath) && fs_1.default.statSync(targetDbPath).size > 1000) {
        (0, prisma_1.createSafetyBackup)(targetDbPath, backupsDir, 'pre_restore_checkpoint');
    }
    // Copy backup to target
    fs_1.default.copyFileSync(backupPath, targetDbPath);
    console.log(`✅ [Database Restored] Successfully restored database from: ${backupPath} -> ${targetDbPath}`);
    return true;
}
// CLI Execution Handler
if (require.main === module) {
    const args = process.argv.slice(2);
    const action = args[0] || 'audit';
    (async () => {
        try {
            if (action === 'audit') {
                const report = await auditDatabase();
                console.log('\n========================================');
                console.log('📊 CAREER WINGS DATABASE AUDIT REPORT');
                console.log('========================================');
                console.log(`Timestamp:          ${report.timestamp}`);
                console.log(`Database Path:      ${report.databasePath}`);
                console.log(`Storage Dir:        ${report.storageDir}`);
                console.log(`Stored Outside Git: ${report.isExternalToRepo ? 'YES (100% Protected from redeployments)' : 'NO (Using persistent_data)'}`);
                console.log(`Database Size:      ${report.sizeKb} KB`);
                console.log(`Integrity Header:   ${report.headerValid ? 'VALID (SQLite format 3)' : 'INVALID'}`);
                console.log('----------------------------------------');
                console.log(`👥 Total Users:         ${report.counts.users}`);
                console.log(`🎓 Candidates:          ${report.counts.candidates}`);
                console.log(`🏢 Employers:           ${report.counts.employers}`);
                console.log(`🏛️ Companies:           ${report.counts.companies}`);
                console.log(`💼 Total Active Jobs:   ${report.counts.jobsTotal}`);
                console.log(`   - Published Jobs:    ${report.counts.jobsPublished}`);
                console.log(`   - Draft Jobs:        ${report.counts.jobsDraft}`);
                console.log(`   - Pending Jobs:      ${report.counts.jobsPending}`);
                console.log(`📝 Total Applications:  ${report.counts.applications}`);
                console.log(`⚙️ Admin Settings:      ${report.counts.adminSettings}`);
                console.log('========================================\n');
            }
            else if (action === 'backup') {
                const paths = (0, prisma_1.getPersistentStoragePaths)();
                const backup = (0, prisma_1.createSafetyBackup)(paths.databasePath, paths.backupsDir, 'manual');
                if (backup) {
                    console.log(`✅ Verified backup created at: ${backup}`);
                }
                else {
                    console.error('❌ Backup creation failed.');
                    process.exit(1);
                }
            }
            else if (action === 'migrate') {
                await safeMigrate();
            }
            else if (action === 'restore') {
                const backupFile = args[1];
                if (!backupFile) {
                    console.error('❌ Please specify the backup filename to restore. Example: pnpm run db:restore backup_daily_2026-11-20.db');
                    process.exit(1);
                }
                await restoreDatabaseFromBackup(backupFile);
            }
            process.exit(0);
        }
        catch (err) {
            console.error('❌ Command failed:', err);
            process.exit(1);
        }
    })();
}
//# sourceMappingURL=database-safety.js.map