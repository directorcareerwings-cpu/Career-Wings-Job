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
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRawSchema = exports.regenerateJobSchema = exports.getJobSchemasList = exports.updateGlobalSeoSettings = exports.getGlobalSeoSettings = exports.inspectGscUrl = exports.updateGscConfig = exports.getGscConfig = exports.retryFailedQueueItem = exports.processQueueNow = exports.enqueueIndexing = exports.getIndexingQueue = exports.updateRobotsTxt = exports.getRobotsTxt = exports.renderCrawlerSeoHtml = exports.getMasterSitemapXml = exports.getSectionSitemapXml = exports.getSitemapIndexXml = exports.syncAllPages = exports.bulkUpdateSeoPages = exports.updateSeoPage = exports.getSeoPageById = exports.getSeoPages = exports.getSeoDashboardStats = void 0;
const prisma_1 = require("../lib/prisma");
const response_1 = require("../lib/response");
const errors_1 = require("../lib/errors");
const memoryCache_1 = require("../lib/memoryCache");
const seoRenderer_service_1 = require("../services/seoRenderer.service");
const seo_service_1 = require("../services/seo.service");
// ─── 1. SEO DASHBOARD STATS ───────────────────────────────────────────────────
const getSeoDashboardStats = async (req, res, next) => {
    try {
        const settings = await (0, seo_service_1.getOrCreateSeoGlobalSettings)();
        // Auto-sync pages on first load if table is empty
        const totalPagesCount = await prisma_1.prisma.seoPage.count();
        if (totalPagesCount === 0) {
            await (0, seo_service_1.syncAllPublicPagesToCatalog)();
        }
        const [totalPages, indexedPages, notIndexedPages, submittedPages, unknownPages, sitemapIncludedPages, pendingQueue, failedQueue, completedQueue, recentQueueItems,] = await Promise.all([
            prisma_1.prisma.seoPage.count(),
            prisma_1.prisma.seoPage.count({ where: { indexStatus: 'INDEXED' } }),
            prisma_1.prisma.seoPage.count({ where: { indexStatus: 'NOT_INDEXED' } }),
            prisma_1.prisma.seoPage.count({ where: { indexStatus: 'SUBMITTED' } }),
            prisma_1.prisma.seoPage.count({ where: { indexStatus: 'UNKNOWN' } }),
            prisma_1.prisma.seoPage.count({ where: { inSitemap: true, isIndexable: true } }),
            prisma_1.prisma.indexingQueue.count({ where: { status: 'PENDING' } }),
            prisma_1.prisma.indexingQueue.count({ where: { status: 'FAILED' } }),
            prisma_1.prisma.indexingQueue.count({ where: { status: 'COMPLETED' } }),
            prisma_1.prisma.indexingQueue.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        // Check robots.txt status
        const robotsTxt = settings.robotsTxtContent || '';
        const robotsAnalysis = (0, seo_service_1.validateRobotsTxtContent)(robotsTxt);
        // Calculate average SEO Health Score
        const avgScoreResult = await prisma_1.prisma.seoPage.aggregate({
            _avg: { seoScore: true },
        });
        const avgScore = Math.round(avgScoreResult._avg.seoScore || 85);
        (0, response_1.sendSuccess)(res, {
            summary: {
                totalPages,
                indexedPages,
                notIndexedPages,
                submittedPages,
                unknownPages,
                sitemapIncludedPages,
                pendingQueue,
                failedQueue,
                completedQueue,
                avgScore,
            },
            sitemap: {
                status: settings.enableSitemap ? 'ACTIVE' : 'DISABLED',
                masterUrl: `${settings.siteUrl}/sitemap.xml`,
                indexUrl: `${settings.siteUrl}/sitemap-index.xml`,
                totalIncluded: sitemapIncludedPages,
                lastUpdated: settings.updatedAt,
            },
            robotsTxt: {
                status: robotsAnalysis.isDangerous ? 'WARNING_DETECTED' : 'HEALTHY',
                isDangerous: robotsAnalysis.isDangerous,
                warnings: robotsAnalysis.warnings,
                hasSitemap: robotsAnalysis.suggestions.length === 0,
                content: robotsTxt,
            },
            gsc: {
                isConnected: settings.gscConnected,
                property: settings.gscProperty || 'Not Selected',
                authType: settings.gscAuthType,
            },
            recentActivity: recentQueueItems,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getSeoDashboardStats = getSeoDashboardStats;
// ─── 2. PAGE INDEXING MANAGER ─────────────────────────────────────────────────
const getSeoPages = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '20', 10);
        const skip = (page - 1) * limit;
        const search = req.query.search;
        const pageType = req.query.pageType;
        const indexStatus = req.query.indexStatus;
        const inSitemap = req.query.inSitemap;
        const isIndexable = req.query.isIndexable;
        const where = {};
        if (search) {
            where.OR = [
                { url: { contains: search } },
                { name: { contains: search } },
                { seoTitle: { contains: search } },
                { seoDescription: { contains: search } },
            ];
        }
        if (pageType && pageType !== 'ALL') {
            where.pageType = pageType;
        }
        if (indexStatus && indexStatus !== 'ALL') {
            where.indexStatus = indexStatus;
        }
        if (inSitemap && inSitemap !== 'ALL') {
            where.inSitemap = inSitemap === 'true';
        }
        if (isIndexable && isIndexable !== 'ALL') {
            where.isIndexable = isIndexable === 'true';
        }
        const [pages, total] = await Promise.all([
            prisma_1.prisma.seoPage.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ updatedAt: 'desc' }],
            }),
            prisma_1.prisma.seoPage.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, pages, total, page, limit);
    }
    catch (error) {
        next(error);
    }
};
exports.getSeoPages = getSeoPages;
const getSeoPageById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const page = await prisma_1.prisma.seoPage.findUnique({ where: { id } });
        if (!page)
            throw new errors_1.AppError('SEO Page record not found', 404);
        (0, response_1.sendSuccess)(res, page);
    }
    catch (error) {
        next(error);
    }
};
exports.getSeoPageById = getSeoPageById;
const updateSeoPage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.prisma.seoPage.findUnique({ where: { id } });
        if (!existing)
            throw new errors_1.AppError('SEO Page record not found', 404);
        const { name, seoTitle, seoDescription, canonicalUrl, isIndexable, isFollowable, inSitemap, sitemapPriority, sitemapChangeFreq, ogTitle, ogDescription, ogImage, twitterTitle, twitterDescription, structuredData, indexStatus, } = req.body;
        // Recalculate SEO Health Audit
        const audit = (0, seo_service_1.calculatePageSeoAudit)({
            url: existing.url,
            seoTitle: seoTitle !== undefined ? seoTitle : existing.seoTitle,
            seoDescription: seoDescription !== undefined ? seoDescription : existing.seoDescription,
            canonicalUrl: canonicalUrl !== undefined ? canonicalUrl : existing.canonicalUrl,
            isIndexable: isIndexable !== undefined ? isIndexable : existing.isIndexable,
            inSitemap: inSitemap !== undefined ? inSitemap : existing.inSitemap,
            structuredData: structuredData !== undefined ? structuredData : existing.structuredData,
            ogTitle: ogTitle !== undefined ? ogTitle : existing.ogTitle,
            ogDescription: ogDescription !== undefined ? ogDescription : existing.ogDescription,
            ogImage: ogImage !== undefined ? ogImage : existing.ogImage,
        });
        const updated = await prisma_1.prisma.seoPage.update({
            where: { id },
            data: {
                name: name !== undefined ? name : existing.name,
                seoTitle: seoTitle !== undefined ? seoTitle : existing.seoTitle,
                seoDescription: seoDescription !== undefined ? seoDescription : existing.seoDescription,
                canonicalUrl: canonicalUrl !== undefined ? canonicalUrl : existing.canonicalUrl,
                isIndexable: isIndexable !== undefined ? Boolean(isIndexable) : existing.isIndexable,
                isFollowable: isFollowable !== undefined ? Boolean(isFollowable) : existing.isFollowable,
                inSitemap: inSitemap !== undefined ? Boolean(inSitemap) : existing.inSitemap,
                sitemapPriority: sitemapPriority !== undefined ? parseFloat(sitemapPriority) : existing.sitemapPriority,
                sitemapChangeFreq: sitemapChangeFreq || existing.sitemapChangeFreq,
                ogTitle: ogTitle !== undefined ? ogTitle : existing.ogTitle,
                ogDescription: ogDescription !== undefined ? ogDescription : existing.ogDescription,
                ogImage: ogImage !== undefined ? ogImage : existing.ogImage,
                twitterTitle: twitterTitle !== undefined ? twitterTitle : existing.twitterTitle,
                twitterDescription: twitterDescription !== undefined ? twitterDescription : existing.twitterDescription,
                structuredData: structuredData !== undefined ? structuredData : existing.structuredData,
                indexStatus: indexStatus || existing.indexStatus,
                seoScore: audit.score,
                seoAuditResults: JSON.stringify(audit),
            },
        });
        // Record audit log
        await prisma_1.prisma.seoAuditLog.create({
            data: {
                userId: req.user?.id,
                userEmail: req.user?.email,
                action: 'UPDATE_PAGE_META',
                targetUrl: existing.url,
                details: JSON.stringify({ previousScore: existing.seoScore, newScore: audit.score }),
            },
        });
        (0, response_1.sendSuccess)(res, updated, 'Page SEO metadata updated successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.updateSeoPage = updateSeoPage;
const bulkUpdateSeoPages = async (req, res, next) => {
    try {
        const { pageIds, action } = req.body;
        if (!Array.isArray(pageIds) || pageIds.length === 0) {
            throw new errors_1.AppError('Please provide a list of page IDs', 400);
        }
        const pages = await prisma_1.prisma.seoPage.findMany({
            where: { id: { in: pageIds } },
        });
        let affectedCount = 0;
        switch (action) {
            case 'SET_INDEXABLE':
                await prisma_1.prisma.seoPage.updateMany({
                    where: { id: { in: pageIds } },
                    data: { isIndexable: true },
                });
                affectedCount = pages.length;
                break;
            case 'SET_NOINDEX':
                await prisma_1.prisma.seoPage.updateMany({
                    where: { id: { in: pageIds } },
                    data: { isIndexable: false, inSitemap: false, indexStatus: 'NOT_INDEXED' },
                });
                affectedCount = pages.length;
                break;
            case 'ADD_SITEMAP':
                await prisma_1.prisma.seoPage.updateMany({
                    where: { id: { in: pageIds } },
                    data: { inSitemap: true, isIndexable: true },
                });
                affectedCount = pages.length;
                break;
            case 'REMOVE_SITEMAP':
                await prisma_1.prisma.seoPage.updateMany({
                    where: { id: { in: pageIds } },
                    data: { inSitemap: false },
                });
                affectedCount = pages.length;
                break;
            case 'SUBMIT_INDEXING':
                const urlsToQueue = pages.map((p) => p.url);
                const queued = await (0, seo_service_1.enqueueUrlsForIndexing)(urlsToQueue, req.user?.email || 'ADMIN');
                affectedCount = queued.length;
                break;
            default:
                throw new errors_1.AppError(`Unknown bulk action: ${action}`, 400);
        }
        // Record audit log
        await prisma_1.prisma.seoAuditLog.create({
            data: {
                userId: req.user?.id,
                userEmail: req.user?.email,
                action: `BULK_${action}`,
                details: JSON.stringify({ count: affectedCount, pageIds }),
            },
        });
        (0, response_1.sendSuccess)(res, { affectedCount }, `Bulk action "${action}" completed for ${affectedCount} pages.`);
    }
    catch (error) {
        next(error);
    }
};
exports.bulkUpdateSeoPages = bulkUpdateSeoPages;
const syncAllPages = async (req, res, next) => {
    try {
        const result = await (0, seo_service_1.syncAllPublicPagesToCatalog)();
        (0, response_1.sendSuccess)(res, result, 'Page catalog synchronized successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.syncAllPages = syncAllPages;
// ─── 3. PUBLIC XML SITEMAPS ───────────────────────────────────────────────────
const getSitemapIndexXml = async (req, res, next) => {
    try {
        const xml = await (0, seo_service_1.generateSitemapIndexXml)();
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.send(xml);
    }
    catch (error) {
        next(error);
    }
};
exports.getSitemapIndexXml = getSitemapIndexXml;
const getSectionSitemapXml = async (req, res, next) => {
    try {
        const { section } = req.params;
        const cleanSection = section.replace(/\.xml$/, '').replace(/^sitemap-/, '');
        const xml = await (0, seo_service_1.generateSectionSitemapXml)(cleanSection);
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.send(xml);
    }
    catch (error) {
        next(error);
    }
};
exports.getSectionSitemapXml = getSectionSitemapXml;
const getMasterSitemapXml = async (req, res, next) => {
    try {
        const xml = await (0, seo_service_1.generateMasterSitemapXml)();
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.send(xml);
    }
    catch (error) {
        next(error);
    }
};
exports.getMasterSitemapXml = getMasterSitemapXml;
const renderCrawlerSeoHtml = async (req, res, next) => {
    try {
        const { getClientIndexHtmlTemplate } = await Promise.resolve().then(() => __importStar(require('../services/seoRenderer.service')));
        const targetPath = String(req.query.path || req.headers['x-original-url'] || '/');
        const template = getClientIndexHtmlTemplate();
        const { statusCode, html } = await (0, seoRenderer_service_1.renderSeoHtmlForPath)(targetPath, template);
        res.status(statusCode).header('Content-Type', 'text/html; charset=utf-8').send(html);
    }
    catch (error) {
        next(error);
    }
};
exports.renderCrawlerSeoHtml = renderCrawlerSeoHtml;
// ─── 4. ROBOTS.TXT CONTROLLER ─────────────────────────────────────────────────
const getRobotsTxt = async (req, res, next) => {
    try {
        const settings = await (0, seo_service_1.getOrCreateSeoGlobalSettings)();
        res.type('text/plain');
        res.send(settings.robotsTxtContent || 'User-agent: *\nAllow: /\n');
    }
    catch (error) {
        next(error);
    }
};
exports.getRobotsTxt = getRobotsTxt;
const updateRobotsTxt = async (req, res, next) => {
    try {
        const { content, allowDangerousOverride } = req.body;
        if (typeof content !== 'string') {
            throw new errors_1.AppError('robots.txt content must be a text string', 400);
        }
        const validation = (0, seo_service_1.validateRobotsTxtContent)(content);
        // If dangerous and user has not confirmed override
        if (validation.isDangerous && !allowDangerousOverride) {
            res.status(400).json({
                success: false,
                requiresConfirmation: true,
                warnings: validation.warnings,
                message: 'Potentially dangerous robots.txt rules detected. Confirmation required before applying.',
            });
            return;
        }
        const updated = await prisma_1.prisma.seoGlobalSetting.update({
            where: { key: 'GLOBAL' },
            data: { robotsTxtContent: content },
        });
        await prisma_1.prisma.seoAuditLog.create({
            data: {
                userId: req.user?.id,
                userEmail: req.user?.email,
                action: 'UPDATE_ROBOTS_TXT',
                details: JSON.stringify({ warnings: validation.warnings, overridden: !!allowDangerousOverride }),
            },
        });
        (0, response_1.sendSuccess)(res, { content: updated.robotsTxtContent }, 'Robots.txt updated successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.updateRobotsTxt = updateRobotsTxt;
// ─── 5. INDEXING QUEUE CONTROLLERS ────────────────────────────────────────────
const getIndexingQueue = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '20', 10);
        const skip = (page - 1) * limit;
        const status = req.query.status;
        const where = {};
        if (status && status !== 'ALL') {
            where.status = status;
        }
        const [items, total] = await Promise.all([
            prisma_1.prisma.indexingQueue.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.indexingQueue.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, items, total, page, limit);
    }
    catch (error) {
        next(error);
    }
};
exports.getIndexingQueue = getIndexingQueue;
const enqueueIndexing = async (req, res, next) => {
    try {
        const { urls } = req.body;
        if (!Array.isArray(urls) || urls.length === 0) {
            throw new errors_1.AppError('Please provide an array of URLs to submit', 400);
        }
        const items = await (0, seo_service_1.enqueueUrlsForIndexing)(urls, req.user?.email || 'ADMIN');
        (0, response_1.sendSuccess)(res, items, `Enqueued ${items.length} URL(s) for indexing.`);
    }
    catch (error) {
        next(error);
    }
};
exports.enqueueIndexing = enqueueIndexing;
const processQueueNow = async (req, res, next) => {
    try {
        const result = await (0, seo_service_1.processIndexingQueueBatch)(20);
        (0, response_1.sendSuccess)(res, result, `Queue batch processed: ${result.processed} items processed.`);
    }
    catch (error) {
        next(error);
    }
};
exports.processQueueNow = processQueueNow;
const retryFailedQueueItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const item = await prisma_1.prisma.indexingQueue.findUnique({ where: { id } });
        if (!item)
            throw new errors_1.AppError('Queue item not found', 404);
        const updated = await prisma_1.prisma.indexingQueue.update({
            where: { id },
            data: {
                status: 'PENDING',
                attemptCount: 0,
                errorMessage: null,
            },
        });
        (0, response_1.sendSuccess)(res, updated, 'Queue item reset to PENDING');
    }
    catch (error) {
        next(error);
    }
};
exports.retryFailedQueueItem = retryFailedQueueItem;
// ─── 6. GOOGLE SEARCH CONSOLE INTEGRATION ────────────────────────────────────
const getGscConfig = async (req, res, next) => {
    try {
        const [settings, verificationSetting] = await Promise.all([
            (0, seo_service_1.getOrCreateSeoGlobalSettings)(),
            prisma_1.prisma.adminSetting.findUnique({ where: { key: 'GOOGLE_SITE_VERIFICATION' } }).catch(() => null),
        ]);
        (0, response_1.sendSuccess)(res, {
            isConnected: settings.gscConnected,
            property: settings.gscProperty || '',
            authType: settings.gscAuthType,
            clientEmail: settings.gscClientEmail || '',
            hasPrivateKey: Boolean(settings.gscPrivateKey),
            hasRefreshToken: Boolean(settings.gscRefreshToken),
            siteUrl: settings.siteUrl,
            googleSiteVerification: verificationSetting?.value || '',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getGscConfig = getGscConfig;
const updateGscConfig = async (req, res, next) => {
    try {
        const { isConnected, property, authType, clientEmail, privateKey, refreshToken, serviceAccountJson, googleSiteVerification, } = req.body;
        let parsedEmail = clientEmail;
        let parsedKey = privateKey;
        // Handle direct Service Account JSON upload / paste
        if (serviceAccountJson) {
            try {
                const json = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
                if (json.client_email)
                    parsedEmail = json.client_email;
                if (json.private_key)
                    parsedKey = json.private_key;
            }
            catch (err) {
                throw new errors_1.AppError('Invalid Google Service Account JSON payload', 400);
            }
        }
        const data = {
            gscConnected: isConnected !== undefined ? Boolean(isConnected) : undefined,
            gscProperty: property !== undefined ? property : undefined,
            gscAuthType: authType || 'SERVICE_ACCOUNT',
            gscClientEmail: parsedEmail !== undefined ? parsedEmail : undefined,
        };
        if (parsedKey) {
            data.gscPrivateKey = parsedKey;
        }
        if (refreshToken) {
            data.gscRefreshToken = refreshToken;
        }
        const updated = await prisma_1.prisma.seoGlobalSetting.update({
            where: { key: 'GLOBAL' },
            data,
        });
        if (googleSiteVerification !== undefined) {
            const cleanToken = String(googleSiteVerification || '')
                .trim()
                .replace(/^<meta[^>]*content=["']([^"']+)["'][^>]*>$/i, '$1');
            await prisma_1.prisma.adminSetting.upsert({
                where: { key: 'GOOGLE_SITE_VERIFICATION' },
                create: {
                    key: 'GOOGLE_SITE_VERIFICATION',
                    value: cleanToken,
                    group: 'SEO',
                    label: 'Google Search Console Verification Meta Token',
                    type: 'TEXT',
                },
                update: {
                    value: cleanToken,
                    group: 'SEO',
                },
            });
            (0, memoryCache_1.invalidateCache)('public_settings');
        }
        const verificationSetting = await prisma_1.prisma.adminSetting
            .findUnique({ where: { key: 'GOOGLE_SITE_VERIFICATION' } })
            .catch(() => null);
        (0, response_1.sendSuccess)(res, {
            isConnected: updated.gscConnected,
            property: updated.gscProperty,
            clientEmail: updated.gscClientEmail,
            hasPrivateKey: Boolean(updated.gscPrivateKey),
            googleSiteVerification: verificationSetting?.value || '',
        }, 'Google Search Console configuration saved successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.updateGscConfig = updateGscConfig;
const inspectGscUrl = async (req, res, next) => {
    try {
        const url = req.query.url;
        if (!url)
            throw new errors_1.AppError('Please specify the URL to inspect', 400);
        const result = await (0, seo_service_1.inspectUrlWithGoogleSearchConsole)(url);
        (0, response_1.sendSuccess)(res, result);
    }
    catch (error) {
        next(error);
    }
};
exports.inspectGscUrl = inspectGscUrl;
// ─── 7. GLOBAL SEO SETTINGS ───────────────────────────────────────────────────
const getGlobalSeoSettings = async (req, res, next) => {
    try {
        const settings = await (0, seo_service_1.getOrCreateSeoGlobalSettings)();
        (0, response_1.sendSuccess)(res, settings);
    }
    catch (error) {
        next(error);
    }
};
exports.getGlobalSeoSettings = getGlobalSeoSettings;
const updateGlobalSeoSettings = async (req, res, next) => {
    try {
        const { enableSeo, enableSitemap, enableIndexing, defaultRobotsPolicy, defaultCanonicalPolicy, autoSubmitPublishedJobs, autoUpdateSitemap, siteUrl, bingApiKey, } = req.body;
        const updated = await prisma_1.prisma.seoGlobalSetting.update({
            where: { key: 'GLOBAL' },
            data: {
                enableSeo: enableSeo !== undefined ? Boolean(enableSeo) : undefined,
                enableSitemap: enableSitemap !== undefined ? Boolean(enableSitemap) : undefined,
                enableIndexing: enableIndexing !== undefined ? Boolean(enableIndexing) : undefined,
                defaultRobotsPolicy: defaultRobotsPolicy || undefined,
                defaultCanonicalPolicy: defaultCanonicalPolicy || undefined,
                autoSubmitPublishedJobs: autoSubmitPublishedJobs !== undefined ? Boolean(autoSubmitPublishedJobs) : undefined,
                autoUpdateSitemap: autoUpdateSitemap !== undefined ? Boolean(autoUpdateSitemap) : undefined,
                siteUrl: siteUrl || undefined,
                bingApiKey: bingApiKey !== undefined ? bingApiKey : undefined,
            },
        });
        (0, response_1.sendSuccess)(res, updated, 'Global SEO Settings updated successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.updateGlobalSeoSettings = updateGlobalSeoSettings;
// ─── 8. JOB SCHEMA VALIDATOR CONTROLLERS ──────────────────────────────────────
const getJobSchemasList = async (req, res, next) => {
    try {
        const search = req.query.search;
        const status = req.query.status;
        const schemas = await (0, seo_service_1.getAllJobSchemasValidation)({ search, status });
        (0, response_1.sendSuccess)(res, schemas);
    }
    catch (error) {
        next(error);
    }
};
exports.getJobSchemasList = getJobSchemasList;
const regenerateJobSchema = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await (0, seo_service_1.regenerateJobSchemaAndAudit)(id);
        (0, response_1.sendSuccess)(res, result, 'JobPosting Schema.org JSON-LD regenerated successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.regenerateJobSchema = regenerateJobSchema;
const validateRawSchema = async (req, res, next) => {
    try {
        const { schema } = req.body;
        const validation = (0, seo_service_1.validateJobPostingSchema)(schema);
        (0, response_1.sendSuccess)(res, validation);
    }
    catch (error) {
        next(error);
    }
};
exports.validateRawSchema = validateRawSchema;
//# sourceMappingURL=seo.controller.js.map