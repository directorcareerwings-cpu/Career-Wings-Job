const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const sqlFile = path.join(rootDir, 'careerwings_complete_mysql_setup.sql');

if (!fs.existsSync(sqlFile)) {
  console.error('SQL setup file not found:', sqlFile);
  process.exit(1);
}

const content = fs.readFileSync(sqlFile, 'utf8');

// Parse statements
const lines = content.split(/\r?\n/);
const statements = [];
let currentStmt = '';

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('--') || trimmed.startsWith('/*') || trimmed.length === 0) {
    continue;
  }
  currentStmt += line + '\n';
  if (trimmed.endsWith(';')) {
    const s = currentStmt.trim();
    if (s.length > 0) {
      // Remove trailing semicolon for executeRawUnsafe
      statements.push(s.replace(/;$/, ''));
    }
    currentStmt = '';
  }
}

if (currentStmt.trim().length > 0) {
  statements.push(currentStmt.trim().replace(/;$/, ''));
}

console.log(`Parsed ${statements.length} SQL statements.`);

// Generate TypeScript module
const tsTarget = path.join(rootDir, 'server', 'src', 'lib', 'mysql-embedded-setup.ts');
const tsContent = `// Auto-generated embedded MySQL setup statements
// Zero filesystem dependency — executes directly in any Node.js environment

export const MYSQL_SETUP_STATEMENTS: string[] = ${JSON.stringify(statements, null, 2)};
`;

fs.writeFileSync(tsTarget, tsContent, 'utf8');
console.log(`Saved embedded setup to: ${tsTarget} (${(fs.statSync(tsTarget).size / 1024).toFixed(1)} KB)`);
