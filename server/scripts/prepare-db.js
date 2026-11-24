const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env if present
const rootDir = path.resolve(__dirname, '..');
const envPaths = [
  path.join(rootDir, '.env'),
  path.join(rootDir, '..', '.env'),
  path.join(rootDir, '..', 'deploy_hostinger', 'api_server', '.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

const targetSchema = path.join(rootDir, 'prisma', 'schema.prisma');
const mysqlSchema = path.join(rootDir, 'prisma', 'schema.mysql.prisma');
const sqliteSchema = path.join(rootDir, 'prisma', 'schema.sqlite.prisma');

const dbUrl = (process.env.DATABASE_URL || '').trim();
const isMysql = dbUrl.startsWith('mysql://') || dbUrl.startsWith('mariadb://');

if (isMysql) {
  console.log(`🐬 [Database Config] Detected MySQL DATABASE_URL: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
  console.log('   Activating MySQL Prisma schema (schema.mysql.prisma)...');
  fs.copyFileSync(mysqlSchema, targetSchema);
} else {
  console.log('📁 [Database Config] Detected SQLite or local environment');
  console.log('   Activating SQLite Prisma schema (schema.sqlite.prisma)...');
  fs.copyFileSync(sqliteSchema, targetSchema);
}

console.log('✔ Active prisma/schema.prisma is ready.');
