const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '../..');
const prismaBin = path.join(rootDir, 'server', 'node_modules', 'prisma', 'build', 'index.js');
const mysqlSchema = path.join(rootDir, 'server', 'prisma', 'schema.mysql.prisma');
const dataPath = path.join(rootDir, 'careerwings_mysql_data.sql');

console.log('1. Generating clean UTF-8 MySQL DDL using Prisma CLI...');
const rawDdl = execSync(`node "${prismaBin}" migrate diff --from-empty --to-schema-datamodel "${mysqlSchema}" --script`, {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});

// Remove any null bytes or BOM
const cleanDdl = rawDdl.replace(/\0/g, '').replace(/^\uFEFF/, '');
const safeDdl = cleanDdl.replace(/CREATE TABLE /g, 'CREATE TABLE IF NOT EXISTS ');

console.log(`✔ DDL generated: ${(safeDdl.length / 1024).toFixed(1)} KB, null bytes: ${safeDdl.includes('\0')}`);

console.log('2. Reading data dump...');
let dataContent = fs.readFileSync(dataPath, 'utf8');
dataContent = dataContent.replace(/\0/g, '').replace(/^\uFEFF/, '');

const cleanedData = dataContent
  .replace(/SET FOREIGN_KEY_CHECKS = [01];/g, '')
  .replace(/SET SQL_MODE = [^;]+;/g, '')
  .replace(/SET NAMES [^;]+;/g, '');

console.log(`✔ Data loaded: ${(cleanedData.length / 1024).toFixed(1)} KB, null bytes: ${cleanedData.includes('\0')}`);

// 3. Combine into full setup SQL
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
  '-- ==============================================================\n'
].join('\n');

const sqlTargets = [
  path.join(rootDir, 'careerwings_complete_mysql_setup.sql'),
  path.join(rootDir, 'deploy_hostinger', 'careerwings_complete_mysql_setup.sql'),
  path.join(rootDir, 'server', 'prisma', 'careerwings_complete_mysql_setup.sql'),
  path.join(rootDir, 'server', 'dist', 'prisma', 'careerwings_complete_mysql_setup.sql'),
];

for (const target of sqlTargets) {
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, fullSql, 'utf8');
}
console.log(`✔ Combined setup SQL saved (${(fullSql.length / 1024).toFixed(1)} KB).`);

// 4. Parse all individual executable statements
const lines = fullSql.split(/\r?\n/);
const statements = [];
let currentStmt = '';

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('--') || trimmed.startsWith('/*') || trimmed.length === 0) {
    continue;
  }
  currentStmt += line + '\n';
  if (trimmed.endsWith(';')) {
    const s = currentStmt.trim().replace(/;$/, '');
    if (s.length > 0) {
      statements.push(s);
    }
    currentStmt = '';
  }
}

if (currentStmt.trim().length > 0) {
  statements.push(currentStmt.trim().replace(/;$/, ''));
}

console.log(`✔ Parsed ${statements.length} clean SQL statements.`);

// Verify statements
let nullByteCount = 0;
const ddlCount = statements.filter(s => s.startsWith('CREATE TABLE')).length;
const alterCount = statements.filter(s => s.startsWith('ALTER TABLE')).length;
const insertCount = statements.filter(s => s.startsWith('INSERT INTO')).length;

for (const s of statements) {
  if (s.includes('\0')) nullByteCount++;
}

console.log(`  - CREATE TABLE: ${ddlCount}`);
console.log(`  - ALTER TABLE:  ${alterCount}`);
console.log(`  - INSERT INTO:  ${insertCount}`);
console.log(`  - Null bytes check: ${nullByteCount} (must be 0)`);

if (nullByteCount > 0) {
  console.error('❌ Error: Statements contain null bytes!');
  process.exit(1);
}

// 5. Generate TypeScript module
const tsTarget = path.join(rootDir, 'server', 'src', 'lib', 'mysql-embedded-setup.ts');
const tsContent = `// Auto-generated embedded MySQL setup statements
// Zero filesystem dependency — executes directly in any Node.js environment

export const MYSQL_SETUP_STATEMENTS: string[] = ${JSON.stringify(statements, null, 2)};
`;

fs.writeFileSync(tsTarget, tsContent, 'utf8');
console.log(`✔ Embedded setup saved to: ${tsTarget} (${(fs.statSync(tsTarget).size / 1024).toFixed(1)} KB)`);
