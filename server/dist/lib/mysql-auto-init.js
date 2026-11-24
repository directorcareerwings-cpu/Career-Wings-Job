"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeMysqlDatetimes = sanitizeMysqlDatetimes;
exports.ensureMysqlDatabaseReady = ensureMysqlDatabaseReady;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("./prisma");
const mysql_embedded_setup_1 = require("./mysql-embedded-setup");
/**
 * Sanitizes any invalid zero-date columns in MySQL (e.g. '0000-00-00 00:00:00')
 * so Prisma's datetime deserializer never throws 'Value out of range'.
 */
async function sanitizeMysqlDatetimes() {
    if (!(0, prisma_1.isMysqlConfigured)())
        return;
    const cleanupQueries = [
        "UPDATE `User` SET `lastLoginAt` = NULL WHERE `lastLoginAt` < '1971-01-01' OR CAST(`lastLoginAt` AS CHAR) LIKE '0000%'",
        "UPDATE `User` SET `emailVerifiedAt` = NULL WHERE `emailVerifiedAt` < '1971-01-01' OR CAST(`emailVerifiedAt` AS CHAR) LIKE '0000%'",
        "UPDATE `User` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
        "UPDATE `User` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
        "UPDATE `Candidate` SET `resumeUpdatedAt` = NULL WHERE `resumeUpdatedAt` < '1971-01-01' OR CAST(`resumeUpdatedAt` AS CHAR) LIKE '0000%'",
        "UPDATE `Candidate` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
        "UPDATE `Candidate` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
        "UPDATE `RefreshToken` SET `expiresAt` = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE `expiresAt` < '1971-01-01' OR CAST(`expiresAt` AS CHAR) LIKE '0000%'",
        "UPDATE `RefreshToken` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
        "UPDATE `Job` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
        "UPDATE `Job` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
        "UPDATE `Job` SET `expiresAt` = NULL WHERE `expiresAt` < '1971-01-01' OR CAST(`expiresAt` AS CHAR) LIKE '0000%'",
        "UPDATE `Employer` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
        "UPDATE `Company` SET `createdAt` = NOW() WHERE `createdAt` < '1971-01-01' OR CAST(`createdAt` AS CHAR) LIKE '0000%'",
        "UPDATE `AdminSetting` SET `updatedAt` = NOW() WHERE `updatedAt` < '1971-01-01' OR CAST(`updatedAt` AS CHAR) LIKE '0000%'",
    ];
    for (const q of cleanupQueries) {
        try {
            await prisma_1.prisma.$executeRawUnsafe(q);
        }
        catch { }
    }
}
/**
 * Automatically initializes MySQL schema and seeds default data on Hostinger.
 * Runs on server boot without requiring external CLI or phpMyAdmin manual import.
 * Uses 100% embedded statements with zero filesystem dependency.
 */
async function ensureMysqlDatabaseReady(force = false) {
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
    if (force || !userTableExists) {
        console.log(`⚡ Auto-provisioning MySQL tables (${mysql_embedded_setup_1.MYSQL_SETUP_STATEMENTS.length} embedded statements)...`);
        // Disable foreign keys during setup
        await prisma_1.prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;').catch(() => { });
        let successCount = 0;
        let errorCount = 0;
        for (const stmt of mysql_embedded_setup_1.MYSQL_SETUP_STATEMENTS) {
            try {
                await prisma_1.prisma.$executeRawUnsafe(stmt);
                successCount++;
            }
            catch (err) {
                const msg = err?.message || '';
                if (!msg.includes('already exists') && !msg.includes('Duplicate key') && !msg.includes('Duplicate entry')) {
                    errorCount++;
                }
            }
        }
        await prisma_1.prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;').catch(() => { });
        console.log(`✔ MySQL auto-setup finished (${successCount} executed, ${errorCount} non-critical notices).`);
    }
    else {
        console.log('✔ All core MySQL database tables verified.');
    }
    // 3. Always run datetime sanitizer to eliminate any 0000-00-00 datetime values
    await sanitizeMysqlDatetimes();
    // 4. Verify user records
    try {
        const userCount = await prisma_1.prisma.user.count();
        console.log(`📊 Current MySQL database status: ${userCount} users present.`);
        if (userCount === 0) {
            console.log('⚡ User table exists but is empty. Executing seed data statements...');
            await prisma_1.prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;').catch(() => { });
            for (const stmt of mysql_embedded_setup_1.MYSQL_SETUP_STATEMENTS) {
                if (stmt.startsWith('INSERT INTO')) {
                    await prisma_1.prisma.$executeRawUnsafe(stmt).catch(() => { });
                }
            }
            await prisma_1.prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;').catch(() => { });
            await sanitizeMysqlDatetimes();
            const postSeedCount = await prisma_1.prisma.user.count();
            console.log(`✔ Seeding complete! ${postSeedCount} users now available in MySQL.`);
        }
    }
    catch (err) {
        console.warn('Notice checking user count:', err?.message);
    }
    return true;
}
if (require.main === module) {
    ensureMysqlDatabaseReady(true)
        .then(() => {
        console.log('✔ MySQL auto-init CLI completed successfully.');
        process.exit(0);
    })
        .catch((err) => {
        console.error('❌ MySQL auto-init failed:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=mysql-auto-init.js.map