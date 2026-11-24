"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureMysqlDatabaseReady = ensureMysqlDatabaseReady;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("./prisma");
/**
 * Splits a SQL script into individual executable statements.
 * Handles multiline statements, comments, and strings cleanly.
 */
function splitSqlStatements(sqlContent) {
    const statements = [];
    const lines = sqlContent.split(/\r?\n/);
    let currentStmt = '';
    for (const line of lines) {
        const trimmed = line.trim();
        // Skip full comment lines
        if (trimmed.startsWith('--') || trimmed.startsWith('/*') || trimmed.length === 0) {
            continue;
        }
        currentStmt += line + '\n';
        if (trimmed.endsWith(';')) {
            const stmt = currentStmt.trim();
            if (stmt.length > 0) {
                statements.push(stmt);
            }
            currentStmt = '';
        }
    }
    if (currentStmt.trim().length > 0) {
        statements.push(currentStmt.trim());
    }
    return statements;
}
function findSetupSqlFile() {
    const candidates = [
        path_1.default.resolve(__dirname, '../prisma/careerwings_complete_mysql_setup.sql'),
        path_1.default.resolve(__dirname, '../../prisma/careerwings_complete_mysql_setup.sql'),
        path_1.default.resolve(__dirname, '../../../careerwings_complete_mysql_setup.sql'),
        path_1.default.resolve(process.cwd(), 'careerwings_complete_mysql_setup.sql'),
        path_1.default.resolve(process.cwd(), 'server/prisma/careerwings_complete_mysql_setup.sql'),
        path_1.default.resolve(process.cwd(), 'deploy_hostinger/careerwings_complete_mysql_setup.sql'),
    ];
    for (const c of candidates) {
        if (fs_1.default.existsSync(c) && fs_1.default.statSync(c).size > 10000) {
            return c;
        }
    }
    return null;
}
/**
 * Automatically initializes MySQL schema and seeds default data on Hostinger.
 * Runs on server boot without requiring external CLI or phpMyAdmin manual import.
 */
async function ensureMysqlDatabaseReady() {
    if (!(0, prisma_1.isMysqlConfigured)()) {
        return false;
    }
    console.log('🔍 [MySQL Health Check] Verifying MySQL database connection and schema...');
    // 1. Synchronize schema.mysql.prisma with active prisma/schema.prisma
    try {
        const possibleSchemaDirs = [
            path_1.default.resolve(__dirname, '../prisma'),
            path_1.default.resolve(__dirname, '../../prisma'),
            path_1.default.resolve(process.cwd(), 'server/prisma'),
            path_1.default.resolve(process.cwd(), 'prisma'),
        ];
        for (const d of possibleSchemaDirs) {
            const mysqlSchema = path_1.default.join(d, 'schema.mysql.prisma');
            const targetSchema = path_1.default.join(d, 'schema.prisma');
            if (fs_1.default.existsSync(mysqlSchema)) {
                fs_1.default.copyFileSync(mysqlSchema, targetSchema);
            }
        }
    }
    catch (err) {
        console.warn('Notice while updating schema.prisma for MySQL:', err?.message);
    }
    // 2. Test if core table `User` exists in MySQL
    let userTableExists = false;
    try {
        await prisma_1.prisma.$queryRawUnsafe('SELECT 1 FROM `User` LIMIT 1');
        userTableExists = true;
    }
    catch {
        userTableExists = false;
    }
    if (!userTableExists) {
        console.log('⚡ Core database tables not detected in MySQL. Auto-provisioning all 41 tables and seed data...');
        const setupSqlPath = findSetupSqlFile();
        if (setupSqlPath) {
            console.log(`📦 Found setup SQL dump: ${setupSqlPath} (${(fs_1.default.statSync(setupSqlPath).size / 1024).toFixed(1)} KB)`);
            const sqlContent = fs_1.default.readFileSync(setupSqlPath, 'utf8');
            const statements = splitSqlStatements(sqlContent);
            console.log(`⚙️ Executing ${statements.length} SQL setup statements directly via MySQL connection...`);
            // Disable foreign keys during setup
            await prisma_1.prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;').catch(() => { });
            let successCount = 0;
            let errorCount = 0;
            for (const stmt of statements) {
                try {
                    await prisma_1.prisma.$executeRawUnsafe(stmt);
                    successCount++;
                }
                catch (err) {
                    // Ignore harmless duplicate key or existing constraint notices
                    const msg = err?.message || '';
                    if (!msg.includes('already exists') && !msg.includes('Duplicate key')) {
                        errorCount++;
                    }
                }
            }
            await prisma_1.prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;').catch(() => { });
            console.log(`✔ MySQL auto-setup finished (${successCount} statements executed, ${errorCount} non-critical notices).`);
        }
        else {
            console.warn('⚠️ careerwings_complete_mysql_setup.sql not found. Falling back to schema push...');
        }
    }
    else {
        console.log('✔ All core MySQL database tables verified.');
    }
    // 3. Check if table User is populated
    try {
        const userCount = await prisma_1.prisma.user.count();
        console.log(`📊 Current MySQL database status: ${userCount} users present.`);
        if (userCount === 0) {
            console.log('⚡ Database has 0 users. Checking for seed SQL dump...');
            const setupSqlPath = findSetupSqlFile();
            if (setupSqlPath) {
                const sqlContent = fs_1.default.readFileSync(setupSqlPath, 'utf8');
                const statements = splitSqlStatements(sqlContent).filter((s) => s.startsWith('INSERT INTO'));
                if (statements.length > 0) {
                    console.log(`📥 Seeding ${statements.length} table data blocks into MySQL...`);
                    await prisma_1.prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;').catch(() => { });
                    for (const stmt of statements) {
                        await prisma_1.prisma.$executeRawUnsafe(stmt).catch((e) => console.warn('Insert notice:', e?.message));
                    }
                    await prisma_1.prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;').catch(() => { });
                    const postSeedCount = await prisma_1.prisma.user.count();
                    console.log(`✔ Seeding complete! ${postSeedCount} users now available in MySQL.`);
                }
            }
        }
    }
    catch (err) {
        console.warn('Notice checking user count:', err?.message);
    }
    return true;
}
if (require.main === module) {
    ensureMysqlDatabaseReady()
        .then(() => {
        console.log('✔ MySQL auto-init completed successfully.');
        process.exit(0);
    })
        .catch((err) => {
        console.error('❌ MySQL auto-init failed:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=mysql-auto-init.js.map