# Career Wings — Hostinger Production Deployment & Persistence Guide

**Domain:** [https://www.careerwings.in](https://www.careerwings.in)  
**Rule No. 1:** Never delete, reset, replace, or overwrite existing production data during any code update or deployment.

---

## 1. Why Data Disappeared in Previous Deployments & Root Cause

Previously, when Antigravity code was committed to GitHub and deployed to Hostinger:
1. **Database Inside Working Directory:** The SQLite database file was stored inside the repository folder (`public_html` or `server/prisma/dev.db` or `persistent_data/`). When Hostinger performed `git pull` or `git reset --hard` or unzipped new code, any untracked or Git-ignored file inside the deployment root was deleted or replaced.
2. **Missing Tables Crash:** On clean deployments, `ensureDatabaseAndAdmin()` attempted `npx prisma db push`. In Hostinger's production environment, `npx` or devDependencies failed silently, leaving an empty 0-byte database. This caused `The table main.User does not exist` on `/login`.
3. **Template Overwriting:** The code previously fell back to copying `careerwings_template.db` whenever the primary database was missing, replacing real jobs with 0 jobs.
4. **Admin Password Overwrite:** The previous startup code reset the admin password back to `Admin@123456` on every reboot if it was changed.
5. **Uploads Wiped:** User-uploaded resumes and employer logos were stored inside the Git working tree (`uploads/`), which got deleted on deployment.

---

## 2. The Permanent Production Solution

### Architecture Overview
```
/home/u123456789/
├── careerwings_storage/             <--- DEDICATED PERSISTENT STORAGE (OUTSIDE GIT)
│   ├── careerwings_production.db   <--- PRODUCTION DATABASE (NEVER TOUCHED BY GIT)
│   ├── backups/                    <--- AUTOMATIC ROLLING BACKUPS (30 BACKUPS RETAINED)
│   └── uploads/                    <--- CANDIDATE RESUMES, PHOTOS & LOGOS
│       ├── resumes/
│       ├── images/
│       ├── imports/
│       └── reports/
│
└── public_html/ (or domains/careerwings.in/public_html)  <--- GIT REPOSITORY DEPLOYMENT ROOT
    ├── client/
    ├── server/
    ├── package.json
    └── deploy.sh
```

### Key Protections Implemented:
1. **Isolated Storage Outside Git:** The production database is automatically stored in `../careerwings_storage/careerwings_production.db` (outside the Git working directory). Hostinger git pulls only touch `public_html/`; they will **NEVER** touch `careerwings_storage/`.
2. **Automated Rolling Backups:**
   - **Boot Backup:** Taken automatically every time the server boots (`backup_prod_boot_*.db`).
   - **Pre-Deploy Backup:** Taken before any deployment or migration (`backup_pre_deploy_*.db`).
   - **Nightly Scheduled Backup:** Taken automatically at 02:00 AM every night via cron (`backup_daily_*.db`).
   - Retains the 30 most recent backups with SQLite header validation.
3. **Safe Additive Migrations:**
   - Command: `pnpm run db:migrate:safe`
   - Uses `--accept-data-loss=false`. If any migration could cause data loss, it **aborts immediately** and protects the database.
   - Audits record counts before and after migration. If any records are missing, it automatically rolls back from backup.
4. **Native Prisma CLI:** Prisma CLI is bundled into production dependencies so it does not rely on `npx` or global PATH.
5. **Credential & Setting Preservation:**
   - Existing admin accounts are verified and their passwords are **never** overwritten on boot.
   - Admin settings in the database are **never** overwritten by default values.
6. **Uploads Persistence:** Multer and Express static handlers store and serve uploaded files directly from `careerwings_storage/uploads/`.

---

## 3. Hostinger Environment Variables Setup

In Hostinger hPanel -> Advanced -> **Node.js** or in your production `.env` file inside `public_html`:

```ini
# Production Environment
NODE_ENV=production
PORT=5000
CLIENT_URL=https://www.careerwings.in

# Storage & Database (Leave empty for automatic detection, or set explicitly)
PERSISTENT_STORAGE_DIR=/home/YOUR_HOSTINGER_USER/careerwings_storage

# Auth Secrets (Keep confidential)
JWT_ACCESS_SECRET=your_production_jwt_access_secret_here
JWT_REFRESH_SECRET=your_production_jwt_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Hostinger SMTP Email Configuration
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@careerwings.in
SMTP_PASS=YOUR_HOSTINGER_EMAIL_PASSWORD
EMAIL_FROM="Career Wings <no-reply@careerwings.in>"

# Admin Credentials (Used only on brand-new setup if no admin exists)
ADMIN_EMAIL=admin@careerwings.in
ADMIN_PASSWORD=Admin@123456
```

---

## 4. How to Deploy Updates from GitHub to Hostinger

### Option A: Using Hostinger Git Tool (hPanel -> Git)
1. Commit and push your changes to GitHub `main` branch.
2. In Hostinger hPanel, go to **Git** -> Click **Deploy** (or set up Webhook for automatic deployment).
3. If using Hostinger Post-Deployment Command, set:
   ```bash
   bash deploy.sh
   ```
4. Done! Your code is updated, and your database in `careerwings_storage` remains untouched.

### Option B: Using SSH / Terminal on Hostinger
1. Connect via SSH:
   ```bash
   ssh uXXXXXXX@your-hostinger-ip
   cd public_html
   ```
2. Pull latest code and run the safe deployment script:
   ```bash
   git pull origin main
   bash deploy.sh
   ```

---

## 5. Verification & Health Monitoring

### Check Database Health via API:
Visit `https://www.careerwings.in/api/health` in your browser.
Response:
```json
{
  "status": "ok",
  "db": "connected",
  "storage": {
    "dir": "/home/uXXXX/careerwings_storage",
    "database": "careerwings_production.db",
    "isExternal": true
  },
  "counts": {
    "users": 118,
    "candidates": 116,
    "jobs": 0
  },
  "timestamp": "2026-11-20T...",
  "service": "Career Wings API"
}
```

### Run Local/Server Database Audit:
```bash
pnpm db:audit
```

### Restore Database from Backup:
If you ever need to restore a backup:
```bash
# List backups in careerwings_storage/backups/
pnpm db:restore backup_daily_2026-11-20T02-00-00-000Z.db
```
The restore system automatically takes a `pre_restore_checkpoint.db` before replacing the file, ensuring 100% recovery safety.
