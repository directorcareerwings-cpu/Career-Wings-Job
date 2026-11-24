const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve('server/prisma/schema.mysql.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');

const lines = schema.split('\n');
let currentModel = null;
const modelFields = {};

for (const rawLine of lines) {
  const line = rawLine.trim();
  const modelMatch = line.match(/^model\s+(\w+)\s+\{/);
  if (modelMatch) {
    currentModel = modelMatch[1];
    modelFields[currentModel] = [];
    continue;
  }
  if (line === '}' && currentModel) {
    currentModel = null;
    continue;
  }
  if (currentModel) {
    const fieldMatch = line.match(/^(\w+)\s+DateTime(\?)?/);
    if (fieldMatch) {
      modelFields[currentModel].push({
        field: fieldMatch[1],
        nullable: !!fieldMatch[2],
      });
    }
  }
}

const queries = [];
for (const [model, fields] of Object.entries(modelFields)) {
  for (const { field, nullable } of fields) {
    const qModel = '`' + model + '`';
    const qCol = '`' + field + '`';

    if (nullable) {
      queries.push(`UPDATE ${qModel} SET ${qCol} = NULL WHERE ${qCol} < '1971-01-01' OR CAST(${qCol} AS CHAR) LIKE '0000%'`);
    } else if (field === 'endDate' || field === 'expiresAt') {
      queries.push(`UPDATE ${qModel} SET ${qCol} = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE ${qCol} < '1971-01-01' OR CAST(${qCol} AS CHAR) LIKE '0000%'`);
    } else {
      queries.push(`UPDATE ${qModel} SET ${qCol} = NOW() WHERE ${qCol} < '1971-01-01' OR CAST(${qCol} AS CHAR) LIKE '0000%'`);
    }
  }
}

console.log('Total DateTime fields across all models:', queries.length);
fs.writeFileSync('server/scripts/all_datetime_queries.json', JSON.stringify(queries, null, 2));
console.log('Saved to server/scripts/all_datetime_queries.json');
