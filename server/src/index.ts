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
import { prisma } from './lib/prisma';
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

const app: Express = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. Security & Optimizations
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
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

// 2.1 Smart Caching: Allow short-term cache on public catalogs, no-store on dynamic/auth routes
app.use('/api', (req, res, next) => {
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
const potentialUploadDirs = [
  path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
  path.join(process.cwd(), 'server', 'uploads'),
  path.resolve(__dirname, '../uploads'),
  path.resolve(__dirname, '../../uploads'),
  path.resolve(__dirname, '../../server/uploads'),
];

for (const dir of potentialUploadDirs) {
  if (fs.existsSync(dir)) {
    app.use('/uploads', express.static(dir, { maxAge: '7d', etag: true }));
  }
}

import { seoAdminRoutes, seoPublicRoutes } from './routes/seo.routes';

// 4. Health Check
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    res.status(200).json({
      status: 'ok',
      db: 'connected',
      users: userCount,
      timestamp: new Date().toISOString(),
      service: 'Career Wings API',
    });
  } catch (err: any) {
    res.status(200).json({
      status: 'degraded',
      db: 'error',
      error: err?.message || String(err),
      timestamp: new Date().toISOString(),
      service: 'Career Wings API',
    });
  }
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
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
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
  app.use(express.static(clientDistDir, { maxAge: '1d', etag: true }));

  // Catch-all route to serve React index.html for client-side routing
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

// 7. Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Database initialization helper
const ensureDatabaseAndAdmin = async () => {
  try {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@careerwings.in' },
    });
    if (!admin) {
      console.log('⚡ Admin user not found. Creating default admin...');
      const adminPassword = await bcrypt.hash('Admin@123456', 12);
      await prisma.user.create({
        data: {
          email: 'admin@careerwings.in',
          passwordHash: adminPassword,
          role: 'ADMIN',
          isActive: true,
          isVerified: true,
        },
      });
      console.log('✔ Default admin created: admin@careerwings.in / Admin@123456');
    } else {
      console.log('✔ Admin user verified in database.');
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

    if (process.env.SMTP_PASS) {
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
