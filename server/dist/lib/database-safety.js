"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditDatabase = auditDatabase;
exports.restoreDatabaseFromBackup = restoreDatabaseFromBackup;
const prisma_1 = require("./prisma");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Collect database audit metrics
 */
async function auditDatabase() {
    const projectRoot = (0, prisma_1.findProjectRoot)();
    const dbPath = path_1.default.join(projectRoot, 'persistent_data', 'careerwings_production.db');
    const size = fs_1.default.existsSync(dbPath) ? fs_1.default.statSync(dbPath).size : 0;
    const [users, candidates, employers, companies, jobsTotal, jobsPublished, jobsDraft, jobsPending, applications, adminSettings,] = await Promise.all([
        prisma_1.prisma.user.count(),
        prisma_1.prisma.candidate.count(),
        prisma_1.prisma.employer.count(),
        prisma_1.prisma.company.count(),
        prisma_1.prisma.job.count({ where: { deletedAt: null } }),
        prisma_1.prisma.job.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
        prisma_1.prisma.job.count({ where: { status: 'DRAFT', deletedAt: null } }),
        prisma_1.prisma.job.count({ where: { status: 'PENDING', deletedAt: null } }),
        prisma_1.prisma.application.count(),
        prisma_1.prisma.adminSetting.count(),
    ]);
    const report = {
        timestamp: new Date().toISOString(),
        databasePath: dbPath,
        sizeKb: (size / 1024).toFixed(1),
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
 * Safely restore database from a verified backup
 */
async function restoreDatabaseFromBackup(backupFileName) {
    const projectRoot = (0, prisma_1.findProjectRoot)();
    const backupsDir = path_1.default.join(projectRoot, 'persistent_data', 'backups');
    const backupPath = path_1.default.isAbsolute(backupFileName) ? backupFileName : path_1.default.join(backupsDir, backupFileName);
    const targetDbPath = path_1.default.join(projectRoot, 'persistent_data', 'careerwings_production.db');
    if (!fs_1.default.existsSync(backupPath)) {
        throw new Error(`Backup file does not exist: ${backupPath}`);
    }
    // Verify backup header
    const fd = fs_1.default.openSync(backupPath, 'r');
    const buf = Buffer.alloc(16);
    fs_1.default.readSync(fd, buf, 0, 16, 0);
    fs_1.default.closeSync(fd);
    if (!buf.toString('utf-8').startsWith('SQLite format 3')) {
        throw new Error('Corrupt backup file: not a valid SQLite database!');
    }
    // Create safety snapshot of current DB before replacing
    if (fs_1.default.existsSync(targetDbPath)) {
        (0, prisma_1.createSafetyBackup)(targetDbPath, backupsDir, 'pre_restore_checkpoint');
    }
    // Copy backup to target
    fs_1.default.copyFileSync(backupPath, targetDbPath);
    console.log(`✅ [Database Restored] Successfully restored database from: ${backupPath}`);
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
                console.log(`Timestamp:       ${report.timestamp}`);
                console.log(`Database Path:   ${report.databasePath}`);
                console.log(`Database Size:   ${report.sizeKb} KB`);
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
                const projectRoot = (0, prisma_1.findProjectRoot)();
                const dbPath = path_1.default.join(projectRoot, 'persistent_data', 'careerwings_production.db');
                const backupsDir = path_1.default.join(projectRoot, 'persistent_data', 'backups');
                const backup = (0, prisma_1.createSafetyBackup)(dbPath, backupsDir, 'manual');
                if (backup) {
                    console.log(`✅ Verified backup created at: ${backup}`);
                }
                else {
                    console.error('❌ Backup creation failed.');
                    process.exit(1);
                }
            }
            else if (action === 'restore') {
                const backupFile = args[1];
                if (!backupFile) {
                    console.error('❌ Please specify the backup filename to restore. Example: npm run db:restore backup_prod_boot_2026-11-18.db');
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