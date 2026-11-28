"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const errors_1 = require("./lib/errors");
const prisma_1 = require("./lib/prisma");
const memoryCache_1 = require("./lib/memoryCache");
const crons_1 = require("./crons");
// Routers
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const candidate_routes_1 = __importDefault(require("./routes/candidate.routes"));
const employer_routes_1 = __importDefault(require("./routes/employer.routes"));
const jobs_routes_1 = __importDefault(require("./routes/jobs.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const public_routes_1 = __importDefault(require("./routes/public.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const blog_routes_1 = __importStar(require("./routes/blog.routes"));
const blog_controller_1 = require("./controllers/blog.controller");
const mysql_auto_init_1 = require("./lib/mysql-auto-init");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
// 1. Security & Optimizations
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) ||
            /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// 2. Rate Limiting
const isDev = process.env.NODE_ENV !== 'production';
const generalLimiter = (0, express_rate_limit_1.default)({
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
    if (!req.path.startsWith('/robots.txt') &&
        !req.path.startsWith('/sitemap') &&
        !req.path.startsWith('/seo/render')) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
    const isPublicCatalog = req.method === 'GET' && (req.path.startsWith('/categories') ||
        req.path.startsWith('/locations') ||
        req.path.startsWith('/cool-places') ||
        req.path.startsWith('/settings'));
    if (isPublicCatalog) {
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    }
    else {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});
// 3. Static Files (Uploads) with 7-day browser caching
const persistentUploads = (0, prisma_1.getPersistentUploadsDir)();
app.use('/uploads', express_1.default.static(persistentUploads.root, { maxAge: '7d', etag: true }));
const potentialUploadDirs = [
    path_1.default.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
    path_1.default.join(process.cwd(), 'server', 'uploads'),
    path_1.default.resolve(__dirname, '../uploads'),
    path_1.default.resolve(__dirname, '../../uploads'),
    path_1.default.resolve(__dirname, '../../server/uploads'),
];
for (const dir of potentialUploadDirs) {
    if (fs_1.default.existsSync(dir) && path_1.default.resolve(dir) !== path_1.default.resolve(persistentUploads.root)) {
        app.use('/uploads', express_1.default.static(dir, { maxAge: '7d', etag: true }));
    }
}
const seo_routes_1 = require("./routes/seo.routes");
const seoRenderer_service_1 = require("./services/seoRenderer.service");
// 4. Health Check
app.get('/api/health', async (req, res) => {
    try {
        const isMysql = (0, prisma_1.isMysqlConfigured)();
        const storagePaths = (0, prisma_1.getPersistentStoragePaths)();
        const [userCount, candidateCount, jobCount] = await Promise.all([
            prisma_1.prisma.user.count(),
            prisma_1.prisma.candidate.count(),
            prisma_1.prisma.job.count({ where: { deletedAt: null } }),
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
                    database: path_1.default.basename(storagePaths.databasePath),
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
    }
    catch (err) {
        // Auto-heal if MySQL tables were missing
        if ((0, prisma_1.isMysqlConfigured)()) {
            try {
                console.log('⚡ Detected degraded DB in /api/health. Attempting auto-heal...');
                await (0, mysql_auto_init_1.ensureMysqlDatabaseReady)(true);
                const retryUserCount = await prisma_1.prisma.user.count();
                return res.status(200).json({
                    status: 'ok',
                    db: 'connected (auto-repaired)',
                    dialect: 'mysql',
                    counts: { users: retryUserCount },
                    timestamp: new Date().toISOString(),
                    service: 'Career Wings API',
                });
            }
            catch (repairErr) {
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
app.all(['/api/setup-db', '/api/init-db'], async (req, res) => {
    try {
        const isMysql = (0, prisma_1.isMysqlConfigured)();
        if (isMysql) {
            await (0, mysql_auto_init_1.ensureMysqlDatabaseReady)(true);
        }
        const [userCount, candidateCount, jobCount] = await Promise.all([
            prisma_1.prisma.user.count().catch(() => 0),
            prisma_1.prisma.candidate.count().catch(() => 0),
            prisma_1.prisma.job.count().catch(() => 0),
        ]);
        const admin = await prisma_1.prisma.user.findFirst({
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
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: err?.message || String(err),
            timestamp: new Date().toISOString(),
        });
    }
});
// Database readiness middleware for all API routes: auto-provisions tables before handling requests
let isDbReady = false;
let dbInitPromise = null;
app.use('/api', async (req, res, next) => {
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
app.use('/', seo_routes_1.seoPublicRoutes);
app.use('/api', seo_routes_1.seoPublicRoutes);
// 6. Mount API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/candidate', candidate_routes_1.default);
app.use('/api/employer', employer_routes_1.default);
app.use('/api/jobs', jobs_routes_1.default);
app.use('/api/admin/seo', seo_routes_1.seoAdminRoutes);
app.use('/api/admin/blog', blog_routes_1.adminBlogRouter);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/payments', payment_routes_1.default);
app.use('/api/chat', chat_routes_1.default);
app.use('/api/blog', blog_routes_1.default);
app.use('/api', public_routes_1.default);
// 6.1 Serve Frontend Static Client (React SPA)
const potentialClientDirs = [
    path_1.default.join(process.cwd(), 'client', 'dist'),
    path_1.default.resolve(__dirname, '../../client/dist'),
    path_1.default.resolve(__dirname, '../client/dist'),
    path_1.default.join(process.cwd(), 'dist'),
];
const clientDistDir = potentialClientDirs.find((dir) => fs_1.default.existsSync(path_1.default.join(dir, 'index.html')));
if (clientDistDir) {
    console.log(`📦 Serving frontend static assets from: ${clientDistDir}`);
    // Pre-render dynamic SEO meta tags & JSON-LD schema for search/social crawlers
    app.get('*', async (req, res, next) => {
        if (req.path.startsWith('/api') ||
            req.path.startsWith('/uploads') ||
            req.path === '/robots.txt' ||
            req.path.startsWith('/sitemap') ||
            !(0, seoRenderer_service_1.isCrawlerUserAgent)(req.headers['user-agent']) ||
            /\.(js|css|map|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|eot|json|xml|txt|pdf|webmanifest)$/i.test(req.path)) {
            return next();
        }
        try {
            const { statusCode, html } = await (0, seoRenderer_service_1.renderSeoHtmlForPath)(req.originalUrl || req.path, (0, seoRenderer_service_1.getClientIndexHtmlTemplate)());
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            return res.status(statusCode).type('text/html; charset=utf-8').send(html);
        }
        catch {
            return next();
        }
    });
    app.use(express_1.default.static(clientDistDir, {
        maxAge: '1d',
        etag: true,
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
            }
        },
    }));
    // Catch-all route to serve React index.html for client-side routing
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
            return next();
        }
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(path_1.default.join(clientDistDir, 'index.html'));
    });
}
// 7. Error Handling
app.use(errors_1.notFoundHandler);
app.use(errors_1.errorHandler);
// Database initialization helper
const ensureDatabaseAndAdmin = async () => {
    try {
        const isMysql = (0, prisma_1.isMysqlConfigured)();
        if (isMysql) {
            // Automatic MySQL Schema Creation and Data Seeding (No CLI or phpMyAdmin required)
            await (0, mysql_auto_init_1.ensureMysqlDatabaseReady)();
        }
        else {
            try {
                await prisma_1.prisma.$executeRawUnsafe(`
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
                await prisma_1.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ImportJob_status_idx" ON "ImportJob"("status");`);
                await prisma_1.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ImportJob_createdAt_idx" ON "ImportJob"("createdAt");`);
            }
            catch (e) {
                console.warn('ImportJob table setup notice:', e);
            }
            try {
                await (0, blog_controller_1.ensureBlogPostTable)();
                await (0, blog_controller_1.seedDefaultBlogPostsIfEmpty)();
            }
            catch (e) {
                console.warn('BlogPost table setup notice:', e);
            }
            // Verify core SQLite database tables exist
            let tablesReady = false;
            try {
                await prisma_1.prisma.user.findFirst({ select: { id: true } });
                tablesReady = true;
            }
            catch {
                tablesReady = false;
            }
            if (!tablesReady) {
                console.log('⚡ Core SQLite database tables not detected. Auto-syncing schema...');
                const projectRoot = (0, prisma_1.findProjectRoot)();
                const serverDir = fs_1.default.existsSync(path_1.default.join(projectRoot, 'server', 'prisma', 'schema.prisma'))
                    ? path_1.default.join(projectRoot, 'server')
                    : projectRoot;
                const schemaPath = path_1.default.join(serverDir, 'prisma', 'schema.prisma');
                const activeDbUrl = `file:${(0, prisma_1.getPersistentStoragePaths)().databasePath.replace(/\\/g, '/')}`;
                const possiblePrismaBins = [
                    path_1.default.join(serverDir, 'node_modules', 'prisma', 'build', 'index.js'),
                    path_1.default.join(projectRoot, 'node_modules', 'prisma', 'build', 'index.js'),
                    path_1.default.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js'),
                ];
                const prismaBin = possiblePrismaBins.find((b) => fs_1.default.existsSync(b));
                try {
                    if (prismaBin) {
                        (0, child_process_1.execSync)(`node "${prismaBin}" db push --schema="${schemaPath}" --skip-generate --accept-data-loss=false`, {
                            cwd: serverDir,
                            env: { ...process.env, DATABASE_URL: activeDbUrl },
                            stdio: 'inherit',
                        });
                    }
                    else {
                        (0, child_process_1.execSync)(`npx prisma db push --schema="${schemaPath}" --skip-generate --accept-data-loss=false`, {
                            cwd: serverDir,
                            env: { ...process.env, DATABASE_URL: activeDbUrl },
                            stdio: 'inherit',
                        });
                    }
                    console.log('✔ Schema synced successfully.');
                }
                catch (pushErr) {
                    console.error('❌ [Database Push Error] Could not auto-sync schema:', pushErr?.message || pushErr);
                }
            }
        }
        // 2. Ensure admin account exists (Strictly preserve existing credentials!)
        const existingAdmin = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { role: 'ADMIN' },
                    { email: 'admin@careerwings.in' },
                ],
            },
        });
        if (!existingAdmin) {
            console.log('⚡ No admin account detected. Provisioning initial admin: admin@careerwings.in...');
            const adminPassword = await bcryptjs_1.default.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', 12);
            await prisma_1.prisma.user.create({
                data: {
                    email: process.env.ADMIN_EMAIL || 'admin@careerwings.in',
                    passwordHash: adminPassword,
                    role: 'ADMIN',
                    isActive: true,
                    isVerified: true,
                },
            });
            console.log('✔ Default admin created: admin@careerwings.in / Admin@123456');
        }
        else {
            console.log(`✔ Verified existing admin account (${existingAdmin.email}). Password and permissions preserved.`);
        }
        // 2.1 Automated Data Sanitization: Eradicate any competitor URLs (e.g. apna.co) or section headings from skills
        try {
            const junkSkills = await prisma_1.prisma.skill.findMany({
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
                    await prisma_1.prisma.candidateSkill.deleteMany({ where: { skillId: s.id } }).catch(() => { });
                    await prisma_1.prisma.jobSkill.deleteMany({ where: { skillId: s.id } }).catch(() => { });
                    await prisma_1.prisma.skill.delete({ where: { id: s.id } }).catch(() => { });
                }
                console.log('✔ Junk skills cleaned successfully.');
            }
        }
        catch {
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
            await prisma_1.prisma.adminSetting.upsert({
                where: { key: setting.key },
                update: {},
                create: setting,
            });
        }
        if (process.env.SMTP_PASS && process.env.SMTP_PASS.trim() !== '') {
            await prisma_1.prisma.adminSetting.upsert({
                where: { key: 'SMTP_PASS' },
                update: { value: process.env.SMTP_PASS },
                create: { key: 'SMTP_PASS', value: process.env.SMTP_PASS, type: 'TEXT', group: 'EMAIL', label: 'SMTP Password' },
            });
        }
        // Ensure default hero banner URL is valid (heal broken /uploads/ references back to default banner)
        const heroSetting = await prisma_1.prisma.adminSetting.findUnique({ where: { key: 'HERO_IMAGE_URL' } }).catch(() => null);
        if (!heroSetting) {
            await prisma_1.prisma.adminSetting.create({
                data: { key: 'HERO_IMAGE_URL', value: '/images/hero-banner.png', type: 'TEXT', group: 'CMS', label: 'Hero Banner Image URL' },
            }).catch(() => { });
        }
        else if (heroSetting.value?.startsWith('/uploads/') && !(0, prisma_1.doesUploadedAssetExist)(heroSetting.value)) {
            console.log(`🔧 Healing missing uploaded hero banner (${heroSetting.value}) -> /images/hero-banner.png`);
            await prisma_1.prisma.adminSetting.update({
                where: { key: 'HERO_IMAGE_URL' },
                data: { value: '/images/hero-banner.png' },
            }).catch(() => { });
            (0, memoryCache_1.invalidateCache)('public_settings');
        }
    }
    catch (err) {
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
    (0, crons_1.startCronJobs)();
});
// 8. Graceful Shutdown
const shutdown = async () => {
    console.log('Stopping server gracefully...');
    server.close(async () => {
        await prisma_1.prisma.$disconnect();
        console.log('Prisma disconnected, server closed.');
        process.exit(0);
    });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
exports.default = app;
//# sourceMappingURL=index.js.map