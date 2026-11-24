const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = (process.argv[2] || '').toLowerCase().trim();
const rootDir = path.resolve(__dirname, '..');
const targetSchema = path.join(rootDir, 'prisma', 'schema.prisma');
const mysqlSchema = path.join(rootDir, 'prisma', 'schema.mysql.prisma');
const sqliteSchema = path.join(rootDir, 'prisma', 'schema.sqlite.prisma');

if (target === 'mysql') {
  console.log('🐬 Switching active schema to MySQL (schema.mysql.prisma)...');
  fs.copyFileSync(mysqlSchema, targetSchema);
  console.log('✔ Switched to MySQL schema. Generating Prisma Client...');
  execSync('npx prisma generate --schema=./prisma/schema.prisma', { cwd: rootDir, stdio: 'inherit' });
  console.log('🚀 Ready for MySQL production!');
} else if (target === 'sqlite') {
  console.log('📁 Switching active schema to SQLite (schema.sqlite.prisma)...');
  fs.copyFileSync(sqliteSchema, targetSchema);
  console.log('✔ Switched to SQLite schema. Generating Prisma Client...');
  execSync('npx prisma generate --schema=./prisma/schema.prisma', { cwd: rootDir, stdio: 'inherit' });
  console.log('🚀 Ready for SQLite development!');
} else {
  console.error('Usage: node scripts/switch-db.js <mysql|sqlite>');
  process.exit(1);
}
