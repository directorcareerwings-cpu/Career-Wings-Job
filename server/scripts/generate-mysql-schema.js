const fs = require('fs');
const path = require('path');

const sqliteSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.sqlite.prisma');
const mysqlSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.mysql.prisma');

let content = fs.readFileSync(sqliteSchemaPath, 'utf8');

// 1. Change datasource provider
content = content.replace(
  /datasource db \{\s*provider\s*=\s*"sqlite"/,
  'datasource db {\n  provider = "mysql"'
);

// 2. Map of model -> fields that should be @db.Text or @db.LongText
const longTextFields = new Set([
  'EmailLog.htmlBody',
  'EmailTemplate.bodyHtml',
  'BlogPost.content',
]);

const textFields = new Set([
  'Candidate.summary',
  'Candidate.preferredLocations',
  'Education.description',
  'Experience.description',
  'Company.description',
  'Job.description',
  'Job.responsibilities',
  'Job.requirements',
  'Job.benefits',
  'Job.seoDescription',
  'Category.description',
  'Application.coverLetter',
  'Application.employerNotes',
  'Application.rejectionReason',
  'SavedCandidate.notes',
  'Package.description',
  'Package.limits',
  'Package.features',
  'Subscription.limitsSnapshot',
  'Subscription.usageData',
  'Payment.notes',
  'Payment.failureReason',
  'Coupon.description',
  'Notification.message',
  'AdminSetting.value',
  'AuditLog.oldValues',
  'AuditLog.newValues',
  'AuditLog.details',
  'EmailLog.failureReason',
  'EmailLog.metadata',
  'EmailTemplate.variables',
  'SeoPage.seoDescription',
  'SeoPage.ogDescription',
  'SeoPage.twitterDescription',
  'SeoPage.structuredData',
  'SeoPage.seoAuditResults',
  'IndexingQueue.lastResponse',
  'IndexingQueue.errorMessage',
  'SeoGlobalSetting.gscPrivateKey',
  'SeoGlobalSetting.robotsTxtContent',
  'SeoAuditLog.details',
  'ChatMessage.message',
  'ImportJob.mappings',
  'ImportJob.errorLog',
  'ImportJob.summary',
  'BlogPost.excerpt',
  'BlogPost.tags',
]);

// Parse models and inject annotations
const lines = content.split('\n');
let currentModel = null;
const outputLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const modelMatch = line.match(/^model\s+([A-Za-z0-9_]+)\s*\{/);
  if (modelMatch) {
    currentModel = modelMatch[1];
    outputLines.push(line);
    continue;
  }
  if (currentModel && line.trim() === '}') {
    currentModel = null;
    outputLines.push(line);
    continue;
  }

  if (currentModel) {
    // Check if line defines a field: "  fieldName String? ..." or "  fieldName String ..."
    const fieldMatch = line.match(/^(\s+)([A-Za-z0-9_]+)(\s+)(String\??)(.*)$/);
    if (fieldMatch) {
      const [, indent, fieldName, space, type, rest] = fieldMatch;
      const key = `${currentModel}.${fieldName}`;

      if (longTextFields.has(key)) {
        outputLines.push(`${indent}${fieldName}${space}${type} @db.LongText${rest}`);
        continue;
      } else if (textFields.has(key)) {
        outputLines.push(`${indent}${fieldName}${space}${type} @db.Text${rest}`);
        continue;
      }
    }
  }

  outputLines.push(line);
}

fs.writeFileSync(mysqlSchemaPath, outputLines.join('\n'), 'utf8');
console.log('✔ Generated server/prisma/schema.mysql.prisma successfully');
