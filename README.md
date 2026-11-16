# Career Wings — Full-Stack Job Portal

A modern, production-ready, mobile-first job portal for **Career Wings** ([www.careerwings.in](https://www.careerwings.in/)), designed for job seekers and employers across Guwahati, Assam, and Northeast India.

---

## Features

### For Candidates (Job Seekers)
- **Job Discovery:** Fast keyword, category, location, and experience search with filters (job type, work mode, salary slider).
- **1-Click Apply:** Quick application with profile data or custom resume and optional cover letter.
- **Profile Builder:** Multi-tab profile editor with real-time percentage completion meter (Education, Experience, Skills, Certifications).
- **Resume Hub:** Upload, preview, download, and toggle privacy (Public, Employers Only, Private).
- **Application Tracking:** Visual status timeline (`APPLIED` → `VIEWED` → `SHORTLISTED` → `INTERVIEW` → `SELECTED`/`REJECTED`).
- **Saved Jobs & Alerts:** Bookmark jobs and receive automated alerts for matching openings.

### For Employers (Recruiters)
- **Company Profile:** Corporate identity editor with logo upload, industry, size, and website links.
- **Job Posting Wizard:** 5-step intuitive posting flow with autosave drafts and credit check.
- **Applicant Tracking System (ATS):** Kanban board and list view with status updates, notes, and resume downloads.
- **Candidate Resume Database:** Search candidate pool with filter criteria and atomic credit deduction.
- **Analytics Dashboard:** Performance metrics for job views, application funnels, and candidate reach.

### For Super Admins
- **Control Center:** High-level KPI metrics, user growth charts, and revenue reports.
- **Job Moderation:** Review queue with 1-click Approve, Reject (with feedback), or Feature.
- **Package Management:** Create and configure subscription tiers with dynamic JSON limits.
- **CMS & Taxonomies:** Manage categories, locations, skills, industries, coupons, and site settings.

---

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Radix UI primitives, React Query, Zustand, VitePWA
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, SQLite (`dev.db`), Multer, Nodemailer, node-cron
- **Auth:** JWT (Access & Refresh tokens) with HTTP-only cookies and bcrypt password hashing
- **Payments:** Razorpay payment abstraction with webhook verification and coupon engine

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm (v9+)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd "j Portal antigarvity"

# Install all workspace dependencies
pnpm install
```

### Environment Setup

Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```

And in `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id
```

### Database Initialization & Seed

```bash
# Push schema to SQLite database
pnpm db:push

# Seed with initial data (Admin, Employer, Candidate, categories, locations, jobs)
pnpm db:seed
```

### Running Locally

```bash
# Run both Frontend and Backend concurrently
pnpm dev

# Or run separately:
pnpm dev:server    # Backend API on http://localhost:5000
pnpm dev:client    # Frontend on http://localhost:5173
```

---

## Default Test Accounts

| Role | Email | Password | Access |
|---|---|---|---|
| **Super Admin** | `admin@careerwings.in` | `Admin@123456` | Platform administration, moderation, packages |
| **Employer** | `recruiter@careerwings.in` | `Employer@123` | Post jobs, candidate search, review applicants |
| **Candidate** | `candidate@careerwings.in` | `Candidate@123` | Profile completion, job search, apply |

---

## Monorepo Structure

```
├── client/              # React 18 + Vite + Tailwind CSS frontend
│   ├── public/          # Favicon, PWA manifest, and app icons
│   ├── src/             # Pages, components, hooks, api, stores
│   └── dist/            # Production build bundle
├── server/              # Express + Prisma + SQLite backend
│   ├── prisma/          # schema.prisma, SQLite database, seed script
│   ├── src/             # Controllers, routes, services, middleware, crons
│   ├── uploads/         # Resumes and logos
│   └── dist/            # Compiled JavaScript
├── package.json         # Root pnpm workspaces configuration
└── pnpm-workspace.yaml  # Workspace package definition
```

---

## License

Proprietary © [Career Wings Placement Services](https://www.careerwings.in/). All rights reserved.
