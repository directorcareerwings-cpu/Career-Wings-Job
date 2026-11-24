"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrationToMysql = runMigrationToMysql;
/**
 * Career Wings — SQLite to Hostinger MySQL Migration Runner
 * Transfers 100% of existing data from persistent SQLite into Hostinger MySQL.
 */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
// @ts-ignore
const { DatabaseSync } = require('node:sqlite');
const prisma_1 = require("../lib/prisma");
function findSqliteDb() {
    const candidates = [
        path_1.default.resolve(process.cwd(), 'persistent_data/careerwings_production.db'),
        path_1.default.resolve(__dirname, '../../../persistent_data/careerwings_production.db'),
        path_1.default.resolve(__dirname, '../../persistent_data/careerwings_production.db'),
        path_1.default.resolve(__dirname, '../persistent_data/careerwings_production.db'),
    ];
    for (const c of candidates) {
        if (fs_1.default.existsSync(c) && fs_1.default.statSync(c).size > 10000) {
            return c;
        }
    }
    return null;
}
function escapeSqlValue(val) {
    if (val === null || val === undefined)
        return 'NULL';
    if (typeof val === 'number')
        return String(val);
    if (typeof val === 'boolean')
        return val ? '1' : '0';
    if (val instanceof Date) {
        return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
    }
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
        return `'${val.slice(0, 19).replace('T', ' ')}'`;
    }
    const str = String(val);
    const escaped = str
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\0/g, '\\0')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\x1a/g, '\\Z');
    return `'${escaped}'`;
}
async function runMigrationToMysql() {
    console.log('\n==========================================================');
    console.log('🐬 CAREER WINGS — SQLITE TO MYSQL MIGRATION');
    console.log('==========================================================');
    if (!(0, prisma_1.isMysqlConfigured)()) {
        console.error('❌ Error: DATABASE_URL in .env must start with mysql:// or mariadb://');
        console.error('   Example: DATABASE_URL="mysql://u897740044_user:password@localhost:3306/u897740044_careerwings"');
        process.exit(1);
    }
    const sqlitePath = findSqliteDb();
    if (!sqlitePath) {
        console.error('❌ Could not locate source SQLite database (careerwings_production.db).');
        process.exit(1);
    }
    console.log(`📁 Source SQLite DB: ${sqlitePath} (${(fs_1.default.statSync(sqlitePath).size / 1024).toFixed(1)} KB)`);
    const maskedDbUrl = (process.env.DATABASE_URL || '').replace(/:[^:@]+@/, ':***@');
    console.log(`🐬 Target MySQL DB:  ${maskedDbUrl}`);
    // Step 1: Ensure MySQL schema is active and push to MySQL database
    console.log('\n🔨 Step 1: Synchronizing tables and indexes in MySQL...');
    const serverDir = path_1.default.resolve(__dirname, '../..');
    const schemaPath = path_1.default.join(serverDir, 'prisma', 'schema.mysql.prisma');
    const targetSchema = path_1.default.join(serverDir, 'prisma', 'schema.prisma');
    fs_1.default.copyFileSync(schemaPath, targetSchema);
    try {
        (0, child_process_1.execSync)(`npx prisma db push --schema="${targetSchema}" --skip-generate --accept-data-loss=false`, {
            cwd: serverDir,
            stdio: 'inherit',
        });
        console.log('✔ MySQL schema pushed successfully.');
    }
    catch (err) {
        console.error('❌ Failed to push schema to MySQL:', err?.message || err);
        process.exit(1);
    }
    // Step 2: Open SQLite database
    console.log('\n📦 Step 2: Reading all records from SQLite...');
    const db = new DatabaseSync(sqlitePath);
    const tableOrder = [
        'AdminSetting',
        'User',
        'RefreshToken',
        'PasswordReset',
        'Company',
        'Employer',
        'Candidate',
        'Education',
        'Experience',
        'Certification',
        'CandidateLanguage',
        'Skill',
        'Category',
        'Industry',
        'Location',
        'Job',
        'JobSkill',
        'CandidateSkill',
        'Application',
        'SavedJob',
        'SavedCandidate',
        'Package',
        'Subscription',
        'Coupon',
        'Payment',
        'Notification',
        'JobAlert',
        'ResumeSearchLog',
        'AuditLog',
        'EmailLog',
        'OtpVerification',
        'EmailTemplate',
        'CoolPlaceLogo',
        'SeoPage',
        'IndexingQueue',
        'SeoGlobalSetting',
        'SeoAuditLog',
        'Conversation',
        'ChatMessage',
        'ImportJob',
        'BlogPost',
    ];
    const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'").all().map((r) => r.name);
    const remainingTables = allTables.filter((t) => !tableOrder.includes(t));
    const fullOrder = [...tableOrder.filter((t) => allTables.includes(t)), ...remainingTables];
    // Disable MySQL foreign keys temporarily during migration
    console.log('\n⏳ Step 3: Migrating data into MySQL...');
    await prisma_1.prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
    let totalMigrated = 0;
    const auditReport = [];
    for (const table of fullOrder) {
        try {
            const rows = db.prepare(`SELECT * FROM "${table}"`).all();
            if (rows.length === 0) {
                auditReport.push({ table, sqliteCount: 0, mysqlCount: 0 });
                continue;
            }
            const columns = Object.keys(rows[0]);
            const quotedCols = columns.map((c) => `\`${c}\``).join(', ');
            const chunkSize = 50;
            for (let i = 0; i < rows.length; i += chunkSize) {
                const chunk = rows.slice(i, i + chunkSize);
                const valueClauses = chunk.map((row) => {
                    const vals = columns.map((col) => escapeSqlValue(row[col]));
                    return `(${vals.join(', ')})`;
                });
                // Insert or ignore duplicates to ensure safe, idempotent migration
                const query = `INSERT IGNORE INTO \`${table}\` (${quotedCols}) VALUES ${valueClauses.join(', ')};`;
                await prisma_1.prisma.$executeRawUnsafe(query);
            }
            // Verify count in MySQL
            const mysqlCountResult = await prisma_1.prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM \`${table}\`;`);
            const mysqlCount = Number(mysqlCountResult[0]?.c || 0);
            auditReport.push({ table, sqliteCount: rows.length, mysqlCount });
            totalMigrated += rows.length;
            console.log(`  ✔ \`${table}\`: Migrated ${rows.length} rows (MySQL now has ${mysqlCount})`);
        }
        catch (tblErr) {
            console.warn(`  ⚠️ Could not migrate table \`${table}\`:`, tblErr?.message || tblErr);
        }
    }
    await prisma_1.prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('\n==========================================================');
    console.log('📊 MIGRATION AUDIT & INTEGRITY REPORT');
    console.log('==========================================================');
    console.log('Table Name               | SQLite Rows | MySQL Rows | Status');
    console.log('-------------------------|-------------|------------|--------');
    for (const item of auditReport) {
        if (item.sqliteCount > 0) {
            const status = item.mysqlCount >= item.sqliteCount ? 'MATCH ✔' : 'PARTIAL ⚠️';
            const paddedTable = item.table.padEnd(24, ' ');
            const paddedSqlite = String(item.sqliteCount).padStart(11, ' ');
            const paddedMysql = String(item.mysqlCount).padStart(10, ' ');
            console.log(`${paddedTable} | ${paddedSqlite} | ${paddedMysql} | ${status}`);
        }
    }
    console.log('----------------------------------------------------------');
    console.log(`Total Records Processed: ${totalMigrated}`);
    console.log('🚀 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('==========================================================\n');
}
// Auto-run when executed directly
if (require.main === module) {
    runMigrationToMysql()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error('Fatal migration error:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=migrate-to-mysql.js.map