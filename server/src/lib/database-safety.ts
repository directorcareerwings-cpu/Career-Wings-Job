import { prisma, findProjectRoot, createSafetyBackup } from './prisma';
import path from 'path';
import fs from 'fs';

/**
 * Career Wings Database Safety, Audit & Recovery CLI Helper
 */

export interface DatabaseAuditReport {
  timestamp: string;
  databasePath: string;
  sizeKb: string;
  counts: {
    users: number;
    candidates: number;
    employers: number;
    companies: number;
    jobsTotal: number;
    jobsPublished: number;
    jobsDraft: number;
    jobsPending: number;
    applications: number;
    adminSettings: number;
  };
}

/**
 * Collect database audit metrics
 */
export async function auditDatabase(): Promise<DatabaseAuditReport> {
  const projectRoot = findProjectRoot();
  const dbPath = path.join(projectRoot, 'persistent_data', 'careerwings_production.db');
  const size = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;

  const [
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
  ] = await Promise.all([
    prisma.user.count(),
    prisma.candidate.count(),
    prisma.employer.count(),
    prisma.company.count(),
    prisma.job.count({ where: { deletedAt: null } }),
    prisma.job.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
    prisma.job.count({ where: { status: 'DRAFT', deletedAt: null } }),
    prisma.job.count({ where: { status: 'PENDING', deletedAt: null } }),
    prisma.application.count(),
    prisma.adminSetting.count(),
  ]);

  const report: DatabaseAuditReport = {
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
export async function restoreDatabaseFromBackup(backupFileName: string): Promise<boolean> {
  const projectRoot = findProjectRoot();
  const backupsDir = path.join(projectRoot, 'persistent_data', 'backups');
  const backupPath = path.isAbsolute(backupFileName) ? backupFileName : path.join(backupsDir, backupFileName);
  const targetDbPath = path.join(projectRoot, 'persistent_data', 'careerwings_production.db');

  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file does not exist: ${backupPath}`);
  }

  // Verify backup header
  const fd = fs.openSync(backupPath, 'r');
  const buf = Buffer.alloc(16);
  fs.readSync(fd, buf, 0, 16, 0);
  fs.closeSync(fd);
  if (!buf.toString('utf-8').startsWith('SQLite format 3')) {
    throw new Error('Corrupt backup file: not a valid SQLite database!');
  }

  // Create safety snapshot of current DB before replacing
  if (fs.existsSync(targetDbPath)) {
    createSafetyBackup(targetDbPath, backupsDir, 'pre_restore_checkpoint');
  }

  // Copy backup to target
  fs.copyFileSync(backupPath, targetDbPath);
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
      } else if (action === 'backup') {
        const projectRoot = findProjectRoot();
        const dbPath = path.join(projectRoot, 'persistent_data', 'careerwings_production.db');
        const backupsDir = path.join(projectRoot, 'persistent_data', 'backups');
        const backup = createSafetyBackup(dbPath, backupsDir, 'manual');
        if (backup) {
          console.log(`✅ Verified backup created at: ${backup}`);
        } else {
          console.error('❌ Backup creation failed.');
          process.exit(1);
        }
      } else if (action === 'restore') {
        const backupFile = args[1];
        if (!backupFile) {
          console.error('❌ Please specify the backup filename to restore. Example: npm run db:restore backup_prod_boot_2026-11-18.db');
          process.exit(1);
        }
        await restoreDatabaseFromBackup(backupFile);
      }
      process.exit(0);
    } catch (err) {
      console.error('❌ Command failed:', err);
      process.exit(1);
    }
  })();
}
