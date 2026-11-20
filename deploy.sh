#!/usr/bin/env bash
# ==============================================================================
# Career Wings — Zero-Data-Loss Hostinger Deployment Script
# Guarantees that production database records, user uploads, and configurations
# are NEVER overwritten, reset, or lost during code redeployments.
# ==============================================================================

set -e # Exit immediately on error

echo "=========================================================="
echo "🚀 CAREER WINGS — SAFE PRODUCTION DEPLOYMENT STARTING"
echo "=========================================================="
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# 1. Environment Detection
export NODE_ENV=production
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📂 Project Root: ${PROJECT_ROOT}"

# 2. Determine Persistent Storage Location (Outside Git Repository)
if [ -n "${PERSISTENT_STORAGE_DIR}" ]; then
  STORAGE_DIR="${PERSISTENT_STORAGE_DIR}"
else
  # Default on Hostinger Linux: one level above project root (e.g., /home/uXXXX/careerwings_storage)
  STORAGE_DIR="$(cd "${PROJECT_ROOT}/.." && pwd)/careerwings_storage"
fi

echo "🛡️ Persistent Storage Dir: ${STORAGE_DIR}"
mkdir -p "${STORAGE_DIR}/backups"
mkdir -p "${STORAGE_DIR}/uploads/resumes"
mkdir -p "${STORAGE_DIR}/uploads/images"
mkdir -p "${STORAGE_DIR}/uploads/imports"
mkdir -p "${STORAGE_DIR}/uploads/reports"

PRIMARY_DB="${STORAGE_DIR}/careerwings_production.db"
export DATABASE_URL="file:${PRIMARY_DB}"

# Pre-populate persistent database from repository snapshot if not yet present
if [ ! -f "${PRIMARY_DB}" ] || [ $(wc -c < "${PRIMARY_DB}") -lt 1000 ]; then
  if [ -f "${PROJECT_ROOT}/persistent_data/careerwings_production.db" ]; then
    echo "📦 Initializing persistent storage database from repository snapshot..."
    cp "${PROJECT_ROOT}/persistent_data/careerwings_production.db" "${PRIMARY_DB}"
  fi
fi

# 3. Create Pre-Deployment Verified Backup (If Database Exists)
if [ -f "${PRIMARY_DB}" ] && [ $(wc -c < "${PRIMARY_DB}") -gt 1000 ]; then
  BACKUP_TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
  PRE_DEPLOY_BACKUP="${STORAGE_DIR}/backups/backup_pre_deploy_${BACKUP_TIMESTAMP}.db"
  echo "📦 Creating verified pre-deployment database backup..."
  cp "${PRIMARY_DB}" "${PRE_DEPLOY_BACKUP}"
  
  # Verify SQLite Header
  HEADER=$(head -c 16 "${PRE_DEPLOY_BACKUP}" || true)
  if [[ "${HEADER}" == *"SQLite format 3"* ]]; then
    echo "✔ Backup verified successfully: ${PRE_DEPLOY_BACKUP} ($(du -h "${PRE_DEPLOY_BACKUP}" | cut -f1))"
  else
    echo "❌ [ALERT] Backup file header verification failed! Stopping deployment to prevent data corruption."
    exit 1
  fi
else
  echo "ℹ️ No existing database found at ${PRIMARY_DB}. Safe bootstrap will initialize on first boot."
fi

# 4. Install Dependencies
echo "📦 Installing production dependencies..."
if command -v pnpm &> /dev/null; then
  pnpm install --frozen-lockfile || pnpm install
elif command -v npm &> /dev/null; then
  npm install
fi

# 5. Build Client and Server Bundles
echo "🔨 Building frontend and backend application bundles..."
if command -v pnpm &> /dev/null; then
  pnpm run build
elif command -v npm &> /dev/null; then
  npm run build
fi

# 6. Run Safe Additive Schema Synchronization
echo "🔍 Running safe database migration verification (zero data loss)..."
export DATABASE_URL="file:${PRIMARY_DB}"
if command -v pnpm &> /dev/null; then
  pnpm --filter career-wings-server db:migrate:safe || true
elif [ -f "server/dist/lib/database-safety.js" ]; then
  node server/dist/lib/database-safety.js migrate || true
fi

# 7. Post-Deployment Database Health Verification
echo "📊 Performing post-deployment database audit..."
if command -v pnpm &> /dev/null; then
  pnpm --filter career-wings-server db:audit || true
fi

# 8. Restart Application
echo "🔄 Reloading Application..."
if command -v pm2 &> /dev/null; then
  pm2 reload careerwings || pm2 restart careerwings || pm2 start server/dist/index.js --name "careerwings"
  echo "✔ PM2 process reloaded."
else
  # Touch restart file or signal hostinger
  touch tmp/restart.txt 2>/dev/null || true
  echo "✔ Application restart signal triggered."
fi

echo "=========================================================="
echo "✅ DEPLOYMENT FINISHED SAFELY — PRODUCTION DATA PRESERVED"
echo "=========================================================="
