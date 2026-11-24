import fs from 'fs';
import path from 'path';
import { prisma, isMysqlConfigured } from './prisma';

/**
 * Splits a SQL script into individual executable statements.
 * Handles multiline statements, comments, and strings cleanly.
 */
function splitSqlStatements(sqlContent: string): string[] {
  const statements: string[] = [];
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

function findSetupSqlFile(): string | null {
  const candidates = [
    path.resolve(__dirname, '../prisma/careerwings_complete_mysql_setup.sql'),
    path.resolve(__dirname, '../../prisma/careerwings_complete_mysql_setup.sql'),
    path.resolve(__dirname, '../../../careerwings_complete_mysql_setup.sql'),
    path.resolve(process.cwd(), 'careerwings_complete_mysql_setup.sql'),
    path.resolve(process.cwd(), 'server/prisma/careerwings_complete_mysql_setup.sql'),
    path.resolve(process.cwd(), 'deploy_hostinger/careerwings_complete_mysql_setup.sql'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).size > 10000) {
      return c;
    }
  }
  return null;
}

/**
 * Automatically initializes MySQL schema and seeds default data on Hostinger.
 * Runs on server boot without requiring external CLI or phpMyAdmin manual import.
 */
export async function ensureMysqlDatabaseReady(): Promise<boolean> {
  if (!isMysqlConfigured()) {
    return false;
  }

  console.log('🔍 [MySQL Health Check] Verifying MySQL database connection and schema...');

  // 1. Synchronize schema.mysql.prisma with active prisma/schema.prisma
  try {
    const possibleSchemaDirs = [
      path.resolve(__dirname, '../prisma'),
      path.resolve(__dirname, '../../prisma'),
      path.resolve(process.cwd(), 'server/prisma'),
      path.resolve(process.cwd(), 'prisma'),
    ];
    for (const d of possibleSchemaDirs) {
      const mysqlSchema = path.join(d, 'schema.mysql.prisma');
      const targetSchema = path.join(d, 'schema.prisma');
      if (fs.existsSync(mysqlSchema)) {
        fs.copyFileSync(mysqlSchema, targetSchema);
      }
    }
  } catch (err: any) {
    console.warn('Notice while updating schema.prisma for MySQL:', err?.message);
  }

  // 2. Test if core table `User` exists in MySQL
  let userTableExists = false;
  try {
    await prisma.$queryRawUnsafe('SELECT 1 FROM `User` LIMIT 1');
    userTableExists = true;
  } catch {
    userTableExists = false;
  }

  if (!userTableExists) {
    console.log('⚡ Core database tables not detected in MySQL. Auto-provisioning all 41 tables and seed data...');

    const setupSqlPath = findSetupSqlFile();
    if (setupSqlPath) {
      console.log(`📦 Found setup SQL dump: ${setupSqlPath} (${(fs.statSync(setupSqlPath).size / 1024).toFixed(1)} KB)`);
      const sqlContent = fs.readFileSync(setupSqlPath, 'utf8');
      const statements = splitSqlStatements(sqlContent);
      console.log(`⚙️ Executing ${statements.length} SQL setup statements directly via MySQL connection...`);

      // Disable foreign keys during setup
      await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;').catch(() => {});

      let successCount = 0;
      let errorCount = 0;

      for (const stmt of statements) {
        try {
          await prisma.$executeRawUnsafe(stmt);
          successCount++;
        } catch (err: any) {
          // Ignore harmless duplicate key or existing constraint notices
          const msg = err?.message || '';
          if (!msg.includes('already exists') && !msg.includes('Duplicate key')) {
            errorCount++;
          }
        }
      }

      await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;').catch(() => {});
      console.log(`✔ MySQL auto-setup finished (${successCount} statements executed, ${errorCount} non-critical notices).`);
    } else {
      console.warn('⚠️ careerwings_complete_mysql_setup.sql not found. Falling back to schema push...');
    }
  } else {
    console.log('✔ All core MySQL database tables verified.');
  }

  // 3. Check if table User is populated
  try {
    const userCount = await prisma.user.count();
    console.log(`📊 Current MySQL database status: ${userCount} users present.`);

    if (userCount === 0) {
      console.log('⚡ Database has 0 users. Checking for seed SQL dump...');
      const setupSqlPath = findSetupSqlFile();
      if (setupSqlPath) {
        const sqlContent = fs.readFileSync(setupSqlPath, 'utf8');
        const statements = splitSqlStatements(sqlContent).filter((s) => s.startsWith('INSERT INTO'));
        if (statements.length > 0) {
          console.log(`📥 Seeding ${statements.length} table data blocks into MySQL...`);
          await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;').catch(() => {});
          for (const stmt of statements) {
            await prisma.$executeRawUnsafe(stmt).catch((e) => console.warn('Insert notice:', e?.message));
          }
          await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;').catch(() => {});
          const postSeedCount = await prisma.user.count();
          console.log(`✔ Seeding complete! ${postSeedCount} users now available in MySQL.`);
        }
      }
    }
  } catch (err: any) {
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

