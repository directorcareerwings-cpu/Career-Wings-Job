const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const ddlPath = path.join(rootDir, 'mysql_tables.sql');
const dataPath = path.join(rootDir, 'careerwings_mysql_data.sql');

if (!fs.existsSync(ddlPath) || !fs.existsSync(dataPath)) {
  console.error('Missing mysql_tables.sql or careerwings_mysql_data.sql');
  process.exit(1);
}

const ddl = fs.readFileSync(ddlPath, 'utf8');
const data = fs.readFileSync(dataPath, 'utf8');

// Replace CREATE TABLE with CREATE TABLE IF NOT EXISTS
const safeDdl = ddl.replace(/CREATE TABLE /g, 'CREATE TABLE IF NOT EXISTS ');

const cleanedData = data
  .replace(/SET FOREIGN_KEY_CHECKS = [01];/g, '')
  .replace(/SET SQL_MODE = [^;]+;/g, '')
  .replace(/SET NAMES [^;]+;/g, '');

const fullSql = [
  '-- ==============================================================',
  '-- Career Wings — Full MySQL Database Setup & Seed',
  '-- Creates all 41 tables and seeds 100% of persistent data',
  '-- Suitable for 1-Click Import into Hostinger phpMyAdmin',
  '-- ==============================================================\n',
  'SET FOREIGN_KEY_CHECKS = 0;',
  'SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";',
  'SET NAMES utf8mb4;\n',
  '-- --------------------------------------------------------------',
  '-- PART 1: DDL — CREATE ALL TABLES IF NOT EXISTS',
  '-- --------------------------------------------------------------\n',
  safeDdl,
  '\n-- --------------------------------------------------------------',
  '-- PART 2: DML — INSERT ALL PRODUCTION DATA',
  '-- --------------------------------------------------------------\n',
  cleanedData,
  '\nSET FOREIGN_KEY_CHECKS = 1;',
  '-- ==============================================================',
  '-- Setup complete',
  '-- =============================================================='
].join('\n');

const targets = [
  path.join(rootDir, 'careerwings_complete_mysql_setup.sql'),
  path.join(rootDir, 'deploy_hostinger', 'careerwings_complete_mysql_setup.sql'),
  path.join(rootDir, 'server', 'prisma', 'careerwings_complete_mysql_setup.sql'),
];

for (const target of targets) {
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, fullSql, 'utf8');
  console.log(`Saved: ${target} (${(fs.statSync(target).size / 1024).toFixed(1)} KB)`);
}
