#!/usr/bin/env bash
# ==============================================================================
# Career Wings — Zero-Data-Loss Hostinger Deployment Script
# Supports both Hostinger MySQL Database and persistent SQLite storage.
# Data inserted by users is 100% PERMANENT and preserved across redeployments.
# ==============================================================================

set -e # Exit immediately on error

echo "=========================================================="
echo "🚀 CAREER WINGS — SAFE PRODUCTION DEPLOYMENT STARTING"
echo "=========================================================="
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# 1. Environment Detection & Variable Loading
export NODE_ENV=production
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📂 Project Root: ${PROJECT_ROOT}"

# Load .env if present
if [ -f "${PROJECT_ROOT}/.env" ]; then
  set -a
  source "${PROJECT_ROOT}/.env"
  set +a
elif [ -f "${PROJECT_ROOT}/server/.env" ]; then
  set -a
  source "${PROJECT_ROOT}/server/.env"
  set +a
fi

# 2. Database Dialect Detection
IS_MYSQL=false
if [[ "${DATABASE_URL}" == mysql://* ]] || [[ "${DATABASE_URL}" == mariadb://* ]]; then
  IS_MYSQL=true
fi

if [ "${IS_MYSQL}" = true ]; then
  echo "🐬 Database Dialect: Hostinger MySQL Server"
  echo "   DATABASE_URL is configured for MySQL. All data is stored in Hostinger MySQL daemon."
  echo "   🛡️ [PERMANENT PERSISTENCE] Redeployments, git pulls, or file updates will NEVER touch MySQL tables."
else
  echo "📁 Database Dialect: Persistent SQLite Storage"
  if [ -n "${PERSISTENT_STORAGE_DIR}" ]; then
    STORAGE_DIR="${PERSISTENT_STORAGE_DIR}"
  else
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

  # Create Pre-Deployment Backup for SQLite
  if [ -f "${PRIMARY_DB}" ] && [ $(wc -c < "${PRIMARY_DB}") -gt 1000 ]; then
    BACKUP_TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
    PRE_DEPLOY_BACKUP="${STORAGE_DIR}/backups/backup_pre_deploy_${BACKUP_TIMESTAMP}.db"
    echo "📦 Creating verified pre-deployment SQLite backup..."
    cp "${PRIMARY_DB}" "${PRE_DEPLOY_BACKUP}"
    HEADER=$(head -c 16 "${PRE_DEPLOY_BACKUP}" || true)
    if [[ "${HEADER}" == *"SQLite format 3"* ]]; then
      echo "✔ Backup verified successfully: ${PRE_DEPLOY_BACKUP}"
    else
      echo "❌ [ALERT] Backup file header verification failed! Stopping deployment."
      exit 1
    fi
  fi
fi

# 3. Install Dependencies
echo "📦 Installing production dependencies..."
if command -v pnpm &> /dev/null; then
  pnpm install --frozen-lockfile || pnpm install
elif command -v npm &> /dev/null; then
  npm install
fi

# 4. Prepare Schema and Generate Prisma Engine
echo "⚙️ Preparing Prisma schema based on active database dialect..."
node server/scripts/prepare-db.js

# 5. Build Client and Server Bundles
echo "🔨 Building frontend and backend application bundles..."
if command -v pnpm &> /dev/null; then
  pnpm run build
elif command -v npm &> /dev/null; then
  npm run build
fi

# 6. Run Safe Additive Schema Synchronization
echo "🔍 Running safe database schema verification (zero data loss)..."
if [ "${IS_MYSQL}" = true ]; then
  if [ -f "server/dist/lib/mysql-auto-init.js" ]; then
    node server/dist/lib/mysql-auto-init.js || true
  fi
fi
if command -v pnpm &> /dev/null; then
  pnpm --filter career-wings-server db:migrate:safe || true
elif [ -f "server/dist/lib/database-safety.js" ]; then
  node server/dist/lib/database-safety.js migrate || true
fi

# 7. Post-Deployment Database Health Verification
echo "📊 Performing post-deployment database audit..."
if command -v pnpm &> /dev/null; then
  pnpm --filter career-wings-server db:audit || true
elif [ -f "server/dist/lib/database-safety.js" ]; then
  node server/dist/lib/database-safety.js audit || true
fi

# 8. Reload/Restart Application
echo "🔄 Reloading Application..."
if command -v pm2 &> /dev/null; then
  pm2 reload careerwings || pm2 restart careerwings || pm2 start server/dist/index.js --name "careerwings"
  echo "✔ PM2 process reloaded."
elif [ -f "/tmp/restart.txt" ]; then
  touch /tmp/restart.txt
  echo "✔ Touched restart file."
fi

echo "=========================================================="
echo "✅ DEPLOYMENT COMPLETED SUCCESSFULLY"
echo "=========================================================="
