import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  getSeoDashboardStats,
  getSeoPages,
  getSeoPageById,
  updateSeoPage,
  bulkUpdateSeoPages,
  syncAllPages,
  getRobotsTxt,
  updateRobotsTxt,
  getIndexingQueue,
  enqueueIndexing,
  processQueueNow,
  retryFailedQueueItem,
  getGscConfig,
  updateGscConfig,
  inspectGscUrl,
  getGlobalSeoSettings,
  updateGlobalSeoSettings,
  getJobSchemasList,
  regenerateJobSchema,
  validateRawSchema,
  getSitemapIndexXml,
  getSectionSitemapXml,
  getMasterSitemapXml,
} from '../controllers/seo.controller';

const router = Router();

// ─── ADMIN SEO MANAGEMENT (Protected: ADMIN only) ─────────────────────────────
const adminRouter = Router();
adminRouter.use(authenticateToken, requireRole('ADMIN'));

// Dashboard & Pages
adminRouter.get('/dashboard', getSeoDashboardStats);
adminRouter.get('/pages', getSeoPages);
adminRouter.get('/pages/:id', getSeoPageById);
adminRouter.put('/pages/:id', updateSeoPage);
adminRouter.post('/pages/bulk', bulkUpdateSeoPages);
adminRouter.post('/pages/sync', syncAllPages);

// Schema.org JobPosting Validator & Engine
adminRouter.get('/schema/jobs', getJobSchemasList);
adminRouter.post('/schema/jobs/:id/regenerate', regenerateJobSchema);
adminRouter.post('/schema/validate', validateRawSchema);

// Robots.txt
adminRouter.get('/robots', getRobotsTxt);
adminRouter.put('/robots', updateRobotsTxt);

// Indexing Queue
adminRouter.get('/queue', getIndexingQueue);
adminRouter.post('/queue/submit', enqueueIndexing);
adminRouter.post('/queue/process', processQueueNow);
adminRouter.post('/queue/:id/retry', retryFailedQueueItem);

// Google Search Console & Indexing API
adminRouter.get('/gsc', getGscConfig);
adminRouter.put('/gsc', updateGscConfig);
adminRouter.get('/gsc/inspect', inspectGscUrl);

// Global Settings
adminRouter.get('/settings', getGlobalSeoSettings);
adminRouter.put('/settings', updateGlobalSeoSettings);

export { adminRouter as seoAdminRoutes };

// ─── PUBLIC SEO ENDPOINTS (Robots.txt & XML Sitemaps) ────────────────────────
const publicRouter = Router();

publicRouter.get('/robots.txt', getRobotsTxt);
publicRouter.get('/sitemap.xml', getMasterSitemapXml);
publicRouter.get('/sitemap-index.xml', getSitemapIndexXml);
publicRouter.get('/sitemap-:section.xml', getSectionSitemapXml);

export { publicRouter as seoPublicRoutes };
