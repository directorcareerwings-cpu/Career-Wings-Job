"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seoPublicRoutes = exports.seoAdminRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const seo_controller_1 = require("../controllers/seo.controller");
const router = (0, express_1.Router)();
// ─── ADMIN SEO MANAGEMENT (Protected: ADMIN only) ─────────────────────────────
const adminRouter = (0, express_1.Router)();
exports.seoAdminRoutes = adminRouter;
adminRouter.use(auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'));
// Dashboard & Pages
adminRouter.get('/dashboard', seo_controller_1.getSeoDashboardStats);
adminRouter.get('/pages', seo_controller_1.getSeoPages);
adminRouter.get('/pages/:id', seo_controller_1.getSeoPageById);
adminRouter.put('/pages/:id', seo_controller_1.updateSeoPage);
adminRouter.post('/pages/bulk', seo_controller_1.bulkUpdateSeoPages);
adminRouter.post('/pages/sync', seo_controller_1.syncAllPages);
// Schema.org JobPosting Validator & Engine
adminRouter.get('/schema/jobs', seo_controller_1.getJobSchemasList);
adminRouter.post('/schema/jobs/:id/regenerate', seo_controller_1.regenerateJobSchema);
adminRouter.post('/schema/validate', seo_controller_1.validateRawSchema);
// Robots.txt
adminRouter.get('/robots', seo_controller_1.getRobotsTxt);
adminRouter.put('/robots', seo_controller_1.updateRobotsTxt);
// Indexing Queue
adminRouter.get('/queue', seo_controller_1.getIndexingQueue);
adminRouter.post('/queue/submit', seo_controller_1.enqueueIndexing);
adminRouter.post('/queue/process', seo_controller_1.processQueueNow);
adminRouter.post('/queue/:id/retry', seo_controller_1.retryFailedQueueItem);
// Google Search Console & Indexing API
adminRouter.get('/gsc', seo_controller_1.getGscConfig);
adminRouter.put('/gsc', seo_controller_1.updateGscConfig);
adminRouter.get('/gsc/inspect', seo_controller_1.inspectGscUrl);
// Global Settings
adminRouter.get('/settings', seo_controller_1.getGlobalSeoSettings);
adminRouter.put('/settings', seo_controller_1.updateGlobalSeoSettings);
// ─── PUBLIC SEO ENDPOINTS (Robots.txt & XML Sitemaps) ────────────────────────
const publicRouter = (0, express_1.Router)();
exports.seoPublicRoutes = publicRouter;
publicRouter.get('/robots.txt', seo_controller_1.getRobotsTxt);
publicRouter.get('/sitemap.xml', seo_controller_1.getMasterSitemapXml);
publicRouter.get('/sitemap-index.xml', seo_controller_1.getSitemapIndexXml);
publicRouter.get('/sitemap-:section.xml', seo_controller_1.getSectionSitemapXml);
//# sourceMappingURL=seo.routes.js.map