const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

function findDb() {
  const candidates = [
    path.resolve(__dirname, '../../persistent_data/careerwings_production.db'),
    path.resolve(__dirname, '../persistent_data/careerwings_production.db'),
    path.resolve(__dirname, '../../deploy_hostinger/api_server/prisma/dev.db'),
    path.resolve(__dirname, '../prisma/dev.db'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).size > 10000) {
      return c;
    }
  }
  return null;
}

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) {
    return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  // Check if string is an ISO date string
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    const formatted = val.slice(0, 19).replace('T', ' ');
    return `'${formatted}'`;
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

function exportDump() {
  const dbPath = findDb();
  if (!dbPath) {
    console.error('❌ Could not find a valid SQLite database to export.');
    process.exit(1);
  }

  console.log(`📦 Reading SQLite database from: ${dbPath} (${(fs.statSync(dbPath).size / 1024).toFixed(1)} KB)`);
  const db = new DatabaseSync(dbPath);

  // Desired table order for clean dependency resolution
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

  const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'").all().map(r => r.name);
  const remainingTables = allTables.filter(t => !tableOrder.includes(t));
  const fullOrder = [...tableOrder.filter(t => allTables.includes(t)), ...remainingTables];

  const sqlLines = [];
  sqlLines.push('-- ==============================================================');
  sqlLines.push('-- Career Wings — Full MySQL Database Dump');
  sqlLines.push(`-- Generated: ${new Date().toISOString()}`);
  sqlLines.push(`-- Source SQLite Database: ${path.basename(dbPath)}`);
  sqlLines.push('-- Suitable for 1-Click Import into Hostinger phpMyAdmin');
  sqlLines.push('-- ==============================================================\n');
  sqlLines.push('SET FOREIGN_KEY_CHECKS = 0;');
  sqlLines.push('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";');
  sqlLines.push('SET NAMES utf8mb4;\n');

  let totalRows = 0;
  const auditReport = [];

  for (const tableName of fullOrder) {
    try {
      const rows = db.prepare(`SELECT * FROM "${tableName}"`).all();
      auditReport.push({ table: tableName, count: rows.length });

      if (rows.length === 0) continue;
      totalRows += rows.length;

      sqlLines.push(`-- --------------------------------------------------------`);
      sqlLines.push(`-- Table data: \`${tableName}\` (${rows.length} records)`);
      sqlLines.push(`-- --------------------------------------------------------`);

      // Batch inserts in chunks of 50
      const columns = Object.keys(rows[0]);
      const quotedCols = columns.map(c => `\`${c}\``).join(', ');

      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const valueClauses = chunk.map(row => {
          const vals = columns.map(col => escapeSqlValue(row[col]));
          return `(${vals.join(', ')})`;
        });

        sqlLines.push(`INSERT INTO \`${tableName}\` (${quotedCols}) VALUES`);
        sqlLines.push(valueClauses.join(',\n') + ';');
      }
      sqlLines.push('');
    } catch (e) {
      console.warn(`Could not export table ${tableName}:`, e.message);
    }
  }

  sqlLines.push('SET FOREIGN_KEY_CHECKS = 1;');
  sqlLines.push('-- ==============================================================');
  sqlLines.push('-- End of Career Wings MySQL Data Dump');
  sqlLines.push('-- ==============================================================');

  const sqlContent = sqlLines.join('\n');

  const targets = [
    path.resolve(__dirname, '../../careerwings_mysql_data.sql'),
    path.resolve(__dirname, '../../deploy_hostinger/careerwings_mysql_data.sql'),
  ];

  for (const t of targets) {
    const parent = path.dirname(t);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.writeFileSync(t, sqlContent, 'utf8');
    console.log(`✔ Dump saved to: ${t} (${(fs.statSync(t).size / 1024).toFixed(1)} KB)`);
  }

  console.log('\n========================================');
  console.log('📊 SQLITE TO MYSQL EXPORT SUMMARY');
  console.log('========================================');
  for (const item of auditReport) {
    if (item.count > 0) {
      console.log(`  - \`${item.table}\`: ${item.count} rows`);
    }
  }
  console.log('----------------------------------------');
  console.log(`Total Tables Exported: ${auditReport.filter(a => a.count > 0).length}`);
  console.log(`Total Records Exported: ${totalRows}`);
  console.log('========================================\n');
}

exportDump();
