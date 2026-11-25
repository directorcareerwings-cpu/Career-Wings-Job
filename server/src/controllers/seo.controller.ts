import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendPaginated } from '../lib/response';
import { AppError } from '../lib/errors';
import { invalidateCache } from '../lib/memoryCache';
import { AuthenticatedRequest } from '../middleware/auth';
import { renderSeoHtmlForPath } from '../services/seoRenderer.service';
import {
  getOrCreateSeoGlobalSettings,
  calculatePageSeoAudit,
  syncAllPublicPagesToCatalog,
  generateSitemapIndexXml,
  generateSectionSitemapXml,
  generateMasterSitemapXml,
  validateRobotsTxtContent,
  enqueueUrlsForIndexing,
  processIndexingQueueBatch,
  inspectUrlWithGoogleSearchConsole,
  getAllJobSchemasValidation,
  regenerateJobSchemaAndAudit,
  validateJobPostingSchema,
} from '../services/seo.service';

// ─── 1. SEO DASHBOARD STATS ───────────────────────────────────────────────────

export const getSeoDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await getOrCreateSeoGlobalSettings();

    // Auto-sync pages on first load if table is empty
    const totalPagesCount = await prisma.seoPage.count();
    if (totalPagesCount === 0) {
      await syncAllPublicPagesToCatalog();
    }

    const [
      totalPages,
      indexedPages,
      notIndexedPages,
      submittedPages,
      unknownPages,
      sitemapIncludedPages,
      pendingQueue,
      failedQueue,
      completedQueue,
      recentQueueItems,
    ] = await Promise.all([
      prisma.seoPage.count(),
      prisma.seoPage.count({ where: { indexStatus: 'INDEXED' } }),
      prisma.seoPage.count({ where: { indexStatus: 'NOT_INDEXED' } }),
      prisma.seoPage.count({ where: { indexStatus: 'SUBMITTED' } }),
      prisma.seoPage.count({ where: { indexStatus: 'UNKNOWN' } }),
      prisma.seoPage.count({ where: { inSitemap: true, isIndexable: true } }),
      prisma.indexingQueue.count({ where: { status: 'PENDING' } }),
      prisma.indexingQueue.count({ where: { status: 'FAILED' } }),
      prisma.indexingQueue.count({ where: { status: 'COMPLETED' } }),
      prisma.indexingQueue.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Check robots.txt status
    const robotsTxt = settings.robotsTxtContent || '';
    const robotsAnalysis = validateRobotsTxtContent(robotsTxt);

    // Calculate average SEO Health Score
    const avgScoreResult = await prisma.seoPage.aggregate({
      _avg: { seoScore: true },
    });
    const avgScore = Math.round(avgScoreResult._avg.seoScore || 85);

    sendSuccess(res, {
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
  } catch (error) {
    next(error);
  }
};

// ─── 2. PAGE INDEXING MANAGER ─────────────────────────────────────────────────

export const getSeoPages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const pageType = req.query.pageType as string;
    const indexStatus = req.query.indexStatus as string;
    const inSitemap = req.query.inSitemap as string;
    const isIndexable = req.query.isIndexable as string;

    const where: any = {};

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
      prisma.seoPage.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ updatedAt: 'desc' }],
      }),
      prisma.seoPage.count({ where }),
    ]);

    sendPaginated(res, pages, total, page, limit);
  } catch (error) {
    next(error);
  }
};

export const getSeoPageById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const page = await prisma.seoPage.findUnique({ where: { id } });
    if (!page) throw new AppError('SEO Page record not found', 404);
    sendSuccess(res, page);
  } catch (error) {
    next(error);
  }
};

export const updateSeoPage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.seoPage.findUnique({ where: { id } });
    if (!existing) throw new AppError('SEO Page record not found', 404);

    const {
      name,
      seoTitle,
      seoDescription,
      canonicalUrl,
      isIndexable,
      isFollowable,
      inSitemap,
      sitemapPriority,
      sitemapChangeFreq,
      ogTitle,
      ogDescription,
      ogImage,
      twitterTitle,
      twitterDescription,
      structuredData,
      indexStatus,
    } = req.body;

    // Recalculate SEO Health Audit
    const audit = calculatePageSeoAudit({
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

    const updated = await prisma.seoPage.update({
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
    await prisma.seoAuditLog.create({
      data: {
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'UPDATE_PAGE_META',
        targetUrl: existing.url,
        details: JSON.stringify({ previousScore: existing.seoScore, newScore: audit.score }),
      },
    });

    sendSuccess(res, updated, 'Page SEO metadata updated successfully');
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateSeoPages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { pageIds, action } = req.body;
    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      throw new AppError('Please provide a list of page IDs', 400);
    }

    const pages = await prisma.seoPage.findMany({
      where: { id: { in: pageIds } },
    });

    let affectedCount = 0;

    switch (action) {
      case 'SET_INDEXABLE':
        await prisma.seoPage.updateMany({
          where: { id: { in: pageIds } },
          data: { isIndexable: true },
        });
        affectedCount = pages.length;
        break;

      case 'SET_NOINDEX':
        await prisma.seoPage.updateMany({
          where: { id: { in: pageIds } },
          data: { isIndexable: false, inSitemap: false, indexStatus: 'NOT_INDEXED' },
        });
        affectedCount = pages.length;
        break;

      case 'ADD_SITEMAP':
        await prisma.seoPage.updateMany({
          where: { id: { in: pageIds } },
          data: { inSitemap: true, isIndexable: true },
        });
        affectedCount = pages.length;
        break;

      case 'REMOVE_SITEMAP':
        await prisma.seoPage.updateMany({
          where: { id: { in: pageIds } },
          data: { inSitemap: false },
        });
        affectedCount = pages.length;
        break;

      case 'SUBMIT_INDEXING':
        const urlsToQueue = pages.map((p) => p.url);
        const queued = await enqueueUrlsForIndexing(urlsToQueue, req.user?.email || 'ADMIN');
        affectedCount = queued.length;
        break;

      default:
        throw new AppError(`Unknown bulk action: ${action}`, 400);
    }

    // Record audit log
    await prisma.seoAuditLog.create({
      data: {
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: `BULK_${action}`,
        details: JSON.stringify({ count: affectedCount, pageIds }),
      },
    });

    sendSuccess(res, { affectedCount }, `Bulk action "${action}" completed for ${affectedCount} pages.`);
  } catch (error) {
    next(error);
  }
};

export const syncAllPages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await syncAllPublicPagesToCatalog();
    sendSuccess(res, result, 'Page catalog synchronized successfully');
  } catch (error) {
    next(error);
  }
};

// ─── 3. PUBLIC XML SITEMAPS ───────────────────────────────────────────────────

export const getSitemapIndexXml = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const xml = await generateSitemapIndexXml();
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (error) {
    next(error);
  }
};

export const getSectionSitemapXml = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { section } = req.params;
    const cleanSection = section.replace(/\.xml$/, '').replace(/^sitemap-/, '');
    const xml = await generateSectionSitemapXml(cleanSection);
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (error) {
    next(error);
  }
};

export const getMasterSitemapXml = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const xml = await generateMasterSitemapXml();
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (error) {
    next(error);
  }
};

export const renderCrawlerSeoHtml = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { getClientIndexHtmlTemplate } = await import('../services/seoRenderer.service');
    const targetPath = String(req.query.path || req.headers['x-original-url'] || '/');
    const template = getClientIndexHtmlTemplate();
    const { statusCode, html } = await renderSeoHtmlForPath(targetPath, template);
    res.status(statusCode).header('Content-Type', 'text/html; charset=utf-8').send(html);
  } catch (error) {
    next(error);
  }
};

// ─── 4. ROBOTS.TXT CONTROLLER ─────────────────────────────────────────────────

export const getRobotsTxt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await getOrCreateSeoGlobalSettings();
    res.type('text/plain');
    res.send(settings.robotsTxtContent || 'User-agent: *\nAllow: /\n');
  } catch (error) {
    next(error);
  }
};

export const updateRobotsTxt = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { content, allowDangerousOverride } = req.body;
    if (typeof content !== 'string') {
      throw new AppError('robots.txt content must be a text string', 400);
    }

    const validation = validateRobotsTxtContent(content);

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

    const updated = await prisma.seoGlobalSetting.update({
      where: { key: 'GLOBAL' },
      data: { robotsTxtContent: content },
    });

    await prisma.seoAuditLog.create({
      data: {
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'UPDATE_ROBOTS_TXT',
        details: JSON.stringify({ warnings: validation.warnings, overridden: !!allowDangerousOverride }),
      },
    });

    sendSuccess(res, { content: updated.robotsTxtContent }, 'Robots.txt updated successfully');
  } catch (error) {
    next(error);
  }
};

// ─── 5. INDEXING QUEUE CONTROLLERS ────────────────────────────────────────────

export const getIndexingQueue = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.indexingQueue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.indexingQueue.count({ where }),
    ]);

    sendPaginated(res, items, total, page, limit);
  } catch (error) {
    next(error);
  }
};

export const enqueueIndexing = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      throw new AppError('Please provide an array of URLs to submit', 400);
    }

    const items = await enqueueUrlsForIndexing(urls, req.user?.email || 'ADMIN');
    sendSuccess(res, items, `Enqueued ${items.length} URL(s) for indexing.`);
  } catch (error) {
    next(error);
  }
};

export const processQueueNow = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await processIndexingQueueBatch(20);
    sendSuccess(res, result, `Queue batch processed: ${result.processed} items processed.`);
  } catch (error) {
    next(error);
  }
};

export const retryFailedQueueItem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await prisma.indexingQueue.findUnique({ where: { id } });
    if (!item) throw new AppError('Queue item not found', 404);

    const updated = await prisma.indexingQueue.update({
      where: { id },
      data: {
        status: 'PENDING',
        attemptCount: 0,
        errorMessage: null,
      },
    });

    sendSuccess(res, updated, 'Queue item reset to PENDING');
  } catch (error) {
    next(error);
  }
};

// ─── 6. GOOGLE SEARCH CONSOLE INTEGRATION ────────────────────────────────────

export const getGscConfig = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [settings, verificationSetting] = await Promise.all([
      getOrCreateSeoGlobalSettings(),
      prisma.adminSetting.findUnique({ where: { key: 'GOOGLE_SITE_VERIFICATION' } }).catch(() => null),
    ]);
    sendSuccess(res, {
      isConnected: settings.gscConnected,
      property: settings.gscProperty || '',
      authType: settings.gscAuthType,
      clientEmail: settings.gscClientEmail || '',
      hasPrivateKey: Boolean(settings.gscPrivateKey),
      hasRefreshToken: Boolean(settings.gscRefreshToken),
      siteUrl: settings.siteUrl,
      googleSiteVerification: verificationSetting?.value || '',
    });
  } catch (error) {
    next(error);
  }
};

export const updateGscConfig = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      isConnected,
      property,
      authType,
      clientEmail,
      privateKey,
      refreshToken,
      serviceAccountJson,
      googleSiteVerification,
    } = req.body;

    let parsedEmail = clientEmail;
    let parsedKey = privateKey;

    // Handle direct Service Account JSON upload / paste
    if (serviceAccountJson) {
      try {
        const json = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
        if (json.client_email) parsedEmail = json.client_email;
        if (json.private_key) parsedKey = json.private_key;
      } catch (err) {
        throw new AppError('Invalid Google Service Account JSON payload', 400);
      }
    }

    const data: any = {
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

    const updated = await prisma.seoGlobalSetting.update({
      where: { key: 'GLOBAL' },
      data,
    });

    if (googleSiteVerification !== undefined) {
      const cleanToken = String(googleSiteVerification || '')
        .trim()
        .replace(/^<meta[^>]*content=["']([^"']+)["'][^>]*>$/i, '$1');
      await prisma.adminSetting.upsert({
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
      invalidateCache('public_settings');
    }

    const verificationSetting = await prisma.adminSetting
      .findUnique({ where: { key: 'GOOGLE_SITE_VERIFICATION' } })
      .catch(() => null);

    sendSuccess(
      res,
      {
        isConnected: updated.gscConnected,
        property: updated.gscProperty,
        clientEmail: updated.gscClientEmail,
        hasPrivateKey: Boolean(updated.gscPrivateKey),
        googleSiteVerification: verificationSetting?.value || '',
      },
      'Google Search Console configuration saved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const inspectGscUrl = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const url = req.query.url as string;
    if (!url) throw new AppError('Please specify the URL to inspect', 400);

    const result = await inspectUrlWithGoogleSearchConsole(url);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

// ─── 7. GLOBAL SEO SETTINGS ───────────────────────────────────────────────────

export const getGlobalSeoSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await getOrCreateSeoGlobalSettings();
    sendSuccess(res, settings);
  } catch (error) {
    next(error);
  }
};

export const updateGlobalSeoSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      enableSeo,
      enableSitemap,
      enableIndexing,
      defaultRobotsPolicy,
      defaultCanonicalPolicy,
      autoSubmitPublishedJobs,
      autoUpdateSitemap,
      siteUrl,
      bingApiKey,
    } = req.body;

    const updated = await prisma.seoGlobalSetting.update({
      where: { key: 'GLOBAL' },
      data: {
        enableSeo: enableSeo !== undefined ? Boolean(enableSeo) : undefined,
        enableSitemap: enableSitemap !== undefined ? Boolean(enableSitemap) : undefined,
        enableIndexing: enableIndexing !== undefined ? Boolean(enableIndexing) : undefined,
        defaultRobotsPolicy: defaultRobotsPolicy || undefined,
        defaultCanonicalPolicy: defaultCanonicalPolicy || undefined,
        autoSubmitPublishedJobs:
          autoSubmitPublishedJobs !== undefined ? Boolean(autoSubmitPublishedJobs) : undefined,
        autoUpdateSitemap: autoUpdateSitemap !== undefined ? Boolean(autoUpdateSitemap) : undefined,
        siteUrl: siteUrl || undefined,
        bingApiKey: bingApiKey !== undefined ? bingApiKey : undefined,
      },
    });

    sendSuccess(res, updated, 'Global SEO Settings updated successfully');
  } catch (error) {
    next(error);
  }
};

// ─── 8. JOB SCHEMA VALIDATOR CONTROLLERS ──────────────────────────────────────

export const getJobSchemasList = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const search = req.query.search as string;
    const status = req.query.status as string;
    const schemas = await getAllJobSchemasValidation({ search, status });
    sendSuccess(res, schemas);
  } catch (error) {
    next(error);
  }
};

export const regenerateJobSchema = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await regenerateJobSchemaAndAudit(id);
    sendSuccess(res, result, 'JobPosting Schema.org JSON-LD regenerated successfully');
  } catch (error) {
    next(error);
  }
};

export const validateRawSchema = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { schema } = req.body;
    const validation = validateJobPostingSchema(schema);
    sendSuccess(res, validation);
  } catch (error) {
    next(error);
  }
};
