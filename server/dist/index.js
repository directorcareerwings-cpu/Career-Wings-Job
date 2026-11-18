"use strict";
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
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
// 1. Security & Optimizations
app.use((0, helmet_1.default)({
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
// 2.1 Smart Caching: Allow short-term cache on public catalogs, no-store on dynamic/auth routes
app.use('/api', (req, res, next) => {
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
const potentialUploadDirs = [
    path_1.default.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
    path_1.default.join(process.cwd(), 'server', 'uploads'),
    path_1.default.resolve(__dirname, '../uploads'),
    path_1.default.resolve(__dirname, '../../uploads'),
    path_1.default.resolve(__dirname, '../../server/uploads'),
];
for (const dir of potentialUploadDirs) {
    if (fs_1.default.existsSync(dir)) {
        app.use('/uploads', express_1.default.static(dir, { maxAge: '7d', etag: true }));
    }
}
const seo_routes_1 = require("./routes/seo.routes");
// 4. Health Check
app.get('/api/health', async (req, res) => {
    try {
        const userCount = await prisma_1.prisma.user.count();
        res.status(200).json({
            status: 'ok',
            db: 'connected',
            users: userCount,
            timestamp: new Date().toISOString(),
            service: 'Career Wings API',
        });
    }
    catch (err) {
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
app.use('/', seo_routes_1.seoPublicRoutes);
app.use('/api', seo_routes_1.seoPublicRoutes);
// 6. Mount API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/candidate', candidate_routes_1.default);
app.use('/api/employer', employer_routes_1.default);
app.use('/api/jobs', jobs_routes_1.default);
app.use('/api/admin/seo', seo_routes_1.seoAdminRoutes);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/payments', payment_routes_1.default);
app.use('/api/chat', chat_routes_1.default);
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
    app.use(express_1.default.static(clientDistDir, { maxAge: '1d', etag: true }));
    // Catch-all route to serve React index.html for client-side routing
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
            return next();
        }
        res.sendFile(path_1.default.join(clientDistDir, 'index.html'));
    });
}
// 7. Error Handling
app.use(errors_1.notFoundHandler);
app.use(errors_1.errorHandler);
// Database initialization helper
const ensureDatabaseAndAdmin = async () => {
    try {
        // 1. Verify database tables exist
        let hasUserTable = false;
        try {
            const tableCheck = await prisma_1.prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name='User'`);
            hasUserTable = Array.isArray(tableCheck) && tableCheck.length > 0;
        }
        catch {
            hasUserTable = false;
        }
        if (!hasUserTable) {
            console.log('⚡ Empty database or missing tables detected. Auto-initializing schema via prisma db push...');
            const schemaDir = path_1.default.resolve(__dirname, '..');
            (0, child_process_1.execSync)('npx prisma db push --skip-generate', {
                cwd: schemaDir,
                env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
                stdio: 'inherit',
            });
            console.log('✔ Schema initialized successfully.');
        }
        // 2. Ensure default admin user exists
        const admin = await prisma_1.prisma.user.findUnique({
            where: { email: 'admin@careerwings.in' },
        });
        const adminPassword = await bcryptjs_1.default.hash('Admin@123456', 12);
        if (!admin) {
            console.log('⚡ Admin user not found. Creating default admin...');
            await prisma_1.prisma.user.create({
                data: {
                    email: 'admin@careerwings.in',
                    passwordHash: adminPassword,
                    role: 'ADMIN',
                    isActive: true,
                    isVerified: true,
                },
            });
            console.log('✔ Default admin created: admin@careerwings.in / Admin@123456');
        }
        else {
            const isMatch = await bcryptjs_1.default.compare('Admin@123456', admin.passwordHash);
            if (!isMatch) {
                console.log('⚡ Syncing admin password to default Admin@123456...');
                await prisma_1.prisma.user.update({
                    where: { id: admin.id },
                    data: { passwordHash: adminPassword, isActive: true, isVerified: true },
                });
                console.log('✔ Admin password synchronized.');
            }
            else {
                console.log('✔ Admin user verified in database.');
            }
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
        if (process.env.SMTP_PASS) {
            await prisma_1.prisma.adminSetting.upsert({
                where: { key: 'SMTP_PASS' },
                update: { value: process.env.SMTP_PASS },
                create: { key: 'SMTP_PASS', value: process.env.SMTP_PASS, type: 'TEXT', group: 'EMAIL', label: 'SMTP Password' },
            });
        }
    }
    catch (err) {
        console.error('⚠️ [Database Notice during initialization]:', err);
    }
};
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