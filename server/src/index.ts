import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { errorHandler, notFoundHandler } from './lib/errors';
import { prisma, getPersistentStoragePaths, getPersistentUploadsDir, findProjectRoot, isMysqlConfigured } from './lib/prisma';
import { startCronJobs } from './crons';

// Routers
import authRoutes from './routes/auth.routes';
import candidateRoutes from './routes/candidate.routes';
import employerRoutes from './routes/employer.routes';
import jobsRoutes from './routes/jobs.routes';
import adminRoutes from './routes/admin.routes';
import paymentRoutes from './routes/payment.routes';
import publicRoutes from './routes/public.routes';
import chatRoutes from './routes/chat.routes';
import blogRoutes, { adminBlogRouter } from './routes/blog.routes';
import { ensureBlogPostTable, seedDefaultBlogPostsIfEmpty } from './controllers/blog.controller';
import { ensureMysqlDatabaseReady } from './lib/mysql-auto-init';

const app: Express = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. Security & Optimizations
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://checkout.razorpay.com',
          'https://*.razorpay.com',
        ],
        scriptSrcElem: [
          "'self'",
          "'unsafe-inline'",
          'https://checkout.razorpay.com',
          'https://*.razorpay.com',
        ],
        frameSrc: [
          "'self'",
          'https://checkout.razorpay.com',
          'https://*.razorpay.com',
          'https://api.razorpay.com',
        ],
        connectSrc: [
          "'self'",
          'https://api.razorpay.com',
          'https://*.razorpay.com',
          'https://lumberjack.razorpay.com',
          'https://lumberjack-cx.razorpay.com',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https:',
          'https://*.razorpay.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'data:',
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);
const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://careerwings.in',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. Rate Limiting
const isDev = process.env.NODE_ENV !== 'production';
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100000 : 1000,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDev || req.ip === '127.0.0.1' || req.ip === '::1' || req.hostname === 'localhost',
});
app.use('/api', generalLimiter);

// 2.1 Smart Caching & Crawl Directives: Prevent indexing raw JSON APIs while letting crawlers render SPA data
app.use('/api', (req, res, next) => {
  if (
    !req.path.startsWith('/robots.txt') &&
    !req.path.startsWith('/sitemap') &&
    !req.path.startsWith('/seo/render')
  ) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }

  const isPublicCatalog = req.method === 'GET' && (
    req.path.startsWith('/categories') ||
    req.path.startsWith('/locations') ||
    req.path.startsWith('/cool-places') ||
    req.path.startsWith('/settings')
  );

  if (isPublicCatalog) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  } else {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// 3. Static Files (Uploads) with 7-day browser caching
const persistentUploads = getPersistentUploadsDir();
app.use('/uploads', express.static(persistentUploads.root, { maxAge: '7d', etag: true }));

const potentialUploadDirs = [
  path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
  path.join(process.cwd(), 'server', 'uploads'),
  path.resolve(__dirname, '../uploads'),
  path.resolve(__dirname, '../../uploads'),
  path.resolve(__dirname, '../../server/uploads'),
];

for (const dir of potentialUploadDirs) {
  if (fs.existsSync(dir) && path.resolve(dir) !== path.resolve(persistentUploads.root)) {
    app.use('/uploads', express.static(dir, { maxAge: '7d', etag: true }));
  }
}

import { seoAdminRoutes, seoPublicRoutes } from './routes/seo.routes';
import { getClientIndexHtmlTemplate, isCrawlerUserAgent, renderSeoHtmlForPath } from './services/seoRenderer.service';

// 4. Health Check
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const isMysql = isMysqlConfigured();
    const storagePaths = getPersistentStoragePaths();
    const [userCount, candidateCount, jobCount] = await Promise.all([
      prisma.user.count(),
      prisma.candidate.count(),
      prisma.job.count({ where: { deletedAt: null } }),
    ]);

    res.status(200).json({
      status: 'ok',
      db: 'connected',
      dialect: isMysql ? 'mysql' : 'sqlite',
      storage: isMysql
        ? {
          engine: 'Hostinger MySQL Database Server',
          persistence: 'Permanent (Independent of Git redeployments)',
        }
        : {
          dir: storagePaths.storageDir,
          database: path.basename(storagePaths.databasePath),
          isExternal: storagePaths.isExternalToRepo,
        },
      counts: {
        users: userCount,
        candidates: candidateCount,
        jobs: jobCount,
      },
      timestamp: new Date().toISOString(),
      service: 'Career Wings API',
    });
  } catch (err: any) {
    // Auto-heal if MySQL tables were missing
    if (isMysqlConfigured()) {
      try {
        console.log('⚡ Detected degraded DB in /api/health. Attempting auto-heal...');
        await ensureMysqlDatabaseReady(true);
        const retryUserCount = await prisma.user.count();
        return res.status(200).json({
          status: 'ok',
          db: 'connected (auto-repaired)',
          dialect: 'mysql',
          counts: { users: retryUserCount },
          timestamp: new Date().toISOString(),
          service: 'Career Wings API',
        });
      } catch (repairErr: any) {
        console.error('Auto-repair attempt failed:', repairErr?.message);
      }
    }

    res.status(200).json({
      status: 'degraded',
      db: 'error',
      error: err?.message || String(err),
      timestamp: new Date().toISOString(),
      service: 'Career Wings API',
    });
  }
});

// Explicit database setup / auto-provision endpoint (callable via browser or curl)
app.all(['/api/setup-db', '/api/init-db'], async (req: Request, res: Response) => {
  try {
    const isMysql = isMysqlConfigured();
    if (isMysql) {
      await ensureMysqlDatabaseReady(true);
    }
    const [userCount, candidateCount, jobCount] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.candidate.count().catch(() => 0),
      prisma.job.count().catch(() => 0),
    ]);
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true, email: true, role: true },
    }).catch(() => null);

    res.status(200).json({
      success: true,
      message: 'Database schema and seed data successfully verified / initialized!',
      dialect: isMysql ? 'mysql' : 'sqlite',
      counts: { users: userCount, candidates: candidateCount, jobs: jobCount },
      admin,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || String(err),
      timestamp: new Date().toISOString(),
    });
  }
});

// Database readiness middleware for all API routes: auto-provisions tables before handling requests
let isDbReady = false;
let dbInitPromise: Promise<void> | null = null;

app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
  if (!isDbReady) {
    if (!dbInitPromise) {
      dbInitPromise = ensureDatabaseAndAdmin()
        .then(() => {
          isDbReady = true;
        })
        .catch((err) => {
          console.error('Database auto-provision notice on request:', err?.message);
        });
    }
    await dbInitPromise;
  }
  next();
});

// 5. Mount Public SEO Routes at Root & API (Robots.txt, Sitemap.xml, Sitemap-index.xml)
app.use('/', seoPublicRoutes);
app.use('/api', seoPublicRoutes);

// 6. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/employer', employerRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/admin/seo', seoAdminRoutes);
app.use('/api/admin/blog', adminBlogRouter);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api', publicRoutes);

// 6.1 Serve Frontend Static Client (React SPA)
const potentialClientDirs = [
  path.join(process.cwd(), 'client', 'dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.join(process.cwd(), 'dist'),
];

const clientDistDir = potentialClientDirs.find((dir) => fs.existsSync(path.join(dir, 'index.html')));

if (clientDistDir) {
  console.log(`📦 Serving frontend static assets from: ${clientDistDir}`);

  // Pre-render dynamic SEO meta tags & JSON-LD schema for search/social crawlers
  app.get('*', async (req: Request, res: Response, next: NextFunction) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path === '/robots.txt' ||
      req.path.startsWith('/sitemap') ||
      !isCrawlerUserAgent(req.headers['user-agent']) ||
      /\.(js|css|map|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|eot|json|xml|txt|pdf|webmanifest)$/i.test(req.path)
    ) {
      return next();
    }
    try {
      const { statusCode, html } = await renderSeoHtmlForPath(
        req.originalUrl || req.path,
        getClientIndexHtmlTemplate()
      );
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.status(statusCode).type('text/html; charset=utf-8').send(html);
    } catch {
      return next();
    }
  });

  app.use(
    express.static(clientDistDir, {
      maxAge: '1d',
      etag: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      },
    })
  );

  // Catch-all route to serve React index.html for client-side routing
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

// 7. Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Database initialization helper
const ensureDatabaseAndAdmin = async () => {
  try {
    const isMysql = isMysqlConfigured();

    if (isMysql) {
      // Automatic MySQL Schema Creation and Data Seeding (No CLI or phpMyAdmin required)
      await ensureMysqlDatabaseReady();
    } else {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "ImportJob" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "fileName" TEXT NOT NULL,
            "fileSize" INTEGER NOT NULL DEFAULT 0,
            "mimeType" TEXT,
            "filePath" TEXT,
            "status" TEXT NOT NULL DEFAULT 'PENDING',
            "totalRows" INTEGER NOT NULL DEFAULT 0,
            "processedRows" INTEGER NOT NULL DEFAULT 0,
            "successCount" INTEGER NOT NULL DEFAULT 0,
            "updatedCount" INTEGER NOT NULL DEFAULT 0,
            "skippedCount" INTEGER NOT NULL DEFAULT 0,
            "invalidCount" INTEGER NOT NULL DEFAULT 0,
            "failedCount" INTEGER NOT NULL DEFAULT 0,
            "duplicateStrategy" TEXT NOT NULL DEFAULT 'SKIP',
            "mappings" TEXT,
            "reportPath" TEXT,
            "errorLog" TEXT,
            "summary" TEXT,
            "createdBy" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ImportJob_status_idx" ON "ImportJob"("status");`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ImportJob_createdAt_idx" ON "ImportJob"("createdAt");`);
      } catch (e) {
        console.warn('ImportJob table setup notice:', e);
      }

      try {
        await ensureBlogPostTable();
        await seedDefaultBlogPostsIfEmpty();
      } catch (e) {
        console.warn('BlogPost table setup notice:', e);
      }

      // Verify core SQLite database tables exist
      let tablesReady = false;
      try {
        await prisma.user.findFirst({ select: { id: true } });
        tablesReady = true;
      } catch {
        tablesReady = false;
      }

      if (!tablesReady) {
        console.log('⚡ Core SQLite database tables not detected. Auto-syncing schema...');
        const projectRoot = findProjectRoot();
        const serverDir = fs.existsSync(path.join(projectRoot, 'server', 'prisma', 'schema.prisma'))
          ? path.join(projectRoot, 'server')
          : projectRoot;
        const schemaPath = path.join(serverDir, 'prisma', 'schema.prisma');
        const activeDbUrl = `file:${getPersistentStoragePaths().databasePath.replace(/\\/g, '/')}`;

        const possiblePrismaBins = [
          path.join(serverDir, 'node_modules', 'prisma', 'build', 'index.js'),
          path.join(projectRoot, 'node_modules', 'prisma', 'build', 'index.js'),
          path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js'),
        ];
        const prismaBin = possiblePrismaBins.find((b) => fs.existsSync(b));

        try {
          if (prismaBin) {
            execSync(`node "${prismaBin}" db push --schema="${schemaPath}" --skip-generate --accept-data-loss=false`, {
              cwd: serverDir,
              env: { ...process.env, DATABASE_URL: activeDbUrl },
              stdio: 'inherit',
            });
          } else {
            execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate --accept-data-loss=false`, {
              cwd: serverDir,
              env: { ...process.env, DATABASE_URL: activeDbUrl },
              stdio: 'inherit',
            });
          }
          console.log('✔ Schema synced successfully.');
        } catch (pushErr: any) {
          console.error('❌ [Database Push Error] Could not auto-sync schema:', pushErr?.message || pushErr);
        }
      }
    }

    // 2. Ensure admin account exists (Strictly preserve existing credentials!)
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { role: 'ADMIN' },
          { email: 'admin@careerwings.in' },
        ],
      },
    });

    if (!existingAdmin) {
      console.log('⚡ No admin account detected. Provisioning initial admin: admin@careerwings.in...');
      const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', 12);
      await prisma.user.create({
        data: {
          email: process.env.ADMIN_EMAIL || 'admin@careerwings.in',
          passwordHash: adminPassword,
          role: 'ADMIN',
          isActive: true,
          isVerified: true,
        },
      });
      console.log('✔ Default admin created: admin@careerwings.in / Admin@123456');
    } else {
      console.log(`✔ Verified existing admin account (${existingAdmin.email}). Password and permissions preserved.`);
    }

    // 2.1 Automated Data Sanitization: Eradicate any competitor URLs (e.g. apna.co) or section headings from skills
    try {
      const junkSkills = await prisma.skill.findMany({
        where: {
          OR: [
            { name: { contains: 'apna' } },
            { name: { contains: '4767' } },
            { name: { contains: '1874' } },
            { name: { contains: 'http' } },
            { name: { contains: 'KEY SKILLS' } },
            { name: { contains: 'COMPETENC' } },
            { slug: { contains: 'apna' } },
            { slug: { contains: '4767' } },
            { slug: { contains: '1874' } },
          ],
        },
      });

      if (junkSkills.length > 0) {
        console.log(`🧹 Cleaning ${junkSkills.length} junk skills from database...`);
        for (const s of junkSkills) {
          await prisma.candidateSkill.deleteMany({ where: { skillId: s.id } }).catch(() => { });
          await prisma.jobSkill.deleteMany({ where: { skillId: s.id } }).catch(() => { });
          await prisma.skill.delete({ where: { id: s.id } }).catch(() => { });
        }
        console.log('✔ Junk skills cleaned successfully.');
      }
    } catch {
      // ignore
    }

    // Ensure default SMTP configuration for Hostinger & no-reply@careerwings.in
    const defaultSmtpSettings = [
      { key: 'SMTP_HOST', value: process.env.SMTP_HOST || 'smtp.hostinger.com', type: 'TEXT', group: 'EMAIL', label: 'SMTP Server Host' },
      { key: 'SMTP_PORT', value: process.env.SMTP_PORT || '465', type: 'TEXT', group: 'EMAIL', label: 'SMTP Port' },
      { key: 'SMTP_SECURE', value: process.env.SMTP_SECURE || 'true', type: 'TEXT', group: 'EMAIL', label: 'SMTP SSL/TLS' },
      { key: 'SMTP_USER', value: process.env.SMTP_USER || 'no-reply@careerwings.in', type: 'TEXT', group: 'EMAIL', label: 'SMTP Username' },
      { key: 'SMTP_FROM_EMAIL', value: process.env.SMTP_FROM_EMAIL || 'no-reply@careerwings.in', type: 'TEXT', group: 'EMAIL', label: 'Default From Email' },
      { key: 'SMTP_FROM_NAME', value: process.env.SMTP_FROM_NAME || 'Career Wings', type: 'TEXT', group: 'EMAIL', label: 'Default From Name' },
      { key: 'SMTP_REPLY_TO', value: process.env.SMTP_REPLY_TO || 'support@careerwings.in', type: 'TEXT', group: 'EMAIL', label: 'Support Reply-To' },
      { key: 'SMTP_IS_ENABLED', value: 'true', type: 'TEXT', group: 'EMAIL', label: 'Email Dispatch Enabled' },
    ];

    for (const setting of defaultSmtpSettings) {
      await prisma.adminSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      });
    }

    if (process.env.SMTP_PASS && process.env.SMTP_PASS.trim() !== '') {
      await prisma.adminSetting.upsert({
        where: { key: 'SMTP_PASS' },
        update: { value: process.env.SMTP_PASS },
        create: { key: 'SMTP_PASS', value: process.env.SMTP_PASS, type: 'TEXT', group: 'EMAIL', label: 'SMTP Password' },
      });
    }
  } catch (err) {
    console.error('⚠️ [Database Notice during initialization]:', err);
  }
};

// Trigger asynchronous database initialization immediately on module load
ensureDatabaseAndAdmin().catch((e) => console.warn('Early db init notice:', e));

// 8. Server Initialization
const server = app.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`🚀 Career Wings API Server running on port ${PORT}`);
  console.log(`🌐 CORS enabled for: ${CLIENT_URL}`);

  await ensureDatabaseAndAdmin();

  // Start background schedulers
  startCronJobs();
});

// 8. Graceful Shutdown
const shutdown = async () => {
  console.log('Stopping server gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Prisma disconnected, server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
