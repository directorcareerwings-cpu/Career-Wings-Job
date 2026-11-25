import { prisma } from '../lib/prisma';
import crypto from 'crypto';

export interface SeoAuditCheckResult {
  score: number;
  passedChecks: string[];
  warnings: string[];
  failedChecks: string[];
  recommendations: string[];
}

export interface GscInspectResult {
  inspectionUrl: string;
  verdict: 'INDEXED' | 'NOT_INDEXED' | 'UNKNOWN' | 'ERROR';
  coverageState?: string;
  crawlState?: string;
  indexingState?: string;
  lastCrawlTime?: string;
  robotsTxtState?: string;
  pageFetchState?: string;
  rawResponse?: any;
  message?: string;
}

// ─── 1. GLOBAL SETTINGS ───────────────────────────────────────────────────────

const DEFAULT_SITE_URL = 'https://careerwings.in';

const isLocalHostUrl = (url?: string | null): boolean =>
  Boolean(url && /(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.)/i.test(url));

export const resolveProductionSiteUrl = (raw?: string | null): string => {
  const candidate = (raw || process.env.CLIENT_URL || DEFAULT_SITE_URL).trim().replace(/\/+$/, '');
  if (!candidate || isLocalHostUrl(candidate)) {
    return DEFAULT_SITE_URL;
  }
  return candidate.replace(/^https?:\/\/www\.careerwings\.in/i, 'https://careerwings.in');
};

const buildDefaultRobotsTxt = (siteUrl: string): string => `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
Disallow: /employer/
Disallow: /candidate/
Disallow: /checkout
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /api/

Sitemap: ${siteUrl}/sitemap.xml
Sitemap: ${siteUrl}/sitemap-index.xml`;

const escapeXml = (str: string): string =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

let activeSeoSyncPromise: Promise<any> | null = null;

export const getOrCreateSeoGlobalSettings = async () => {
  let settings = await prisma.seoGlobalSetting.findUnique({
    where: { key: 'GLOBAL' },
  });

  const targetSiteUrl = resolveProductionSiteUrl(process.env.CLIENT_URL);

  if (!settings) {
    settings = await prisma.seoGlobalSetting.create({
      data: {
        key: 'GLOBAL',
        enableSeo: true,
        enableSitemap: true,
        enableIndexing: true,
        defaultRobotsPolicy: 'index,follow',
        defaultCanonicalPolicy: 'self',
        autoSubmitPublishedJobs: true,
        autoUpdateSitemap: true,
        siteUrl: targetSiteUrl,
        robotsTxtContent: buildDefaultRobotsTxt(targetSiteUrl),
      },
    });
  } else {
    const needsSiteUrlHeal =
      isLocalHostUrl(settings.siteUrl) || /www\.careerwings\.in/i.test(settings.siteUrl || '');
    const needsRobotsHeal =
      !settings.robotsTxtContent || isLocalHostUrl(settings.robotsTxtContent);

    if (needsSiteUrlHeal || needsRobotsHeal) {
      const healedSiteUrl = resolveProductionSiteUrl(settings.siteUrl);
      const healedRobots = settings.robotsTxtContent
        ? isLocalHostUrl(settings.robotsTxtContent)
          ? settings.robotsTxtContent.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/gi, healedSiteUrl)
          : settings.robotsTxtContent
        : buildDefaultRobotsTxt(healedSiteUrl);

      settings = await prisma.seoGlobalSetting.update({
        where: { key: 'GLOBAL' },
        data: {
          siteUrl: healedSiteUrl,
          robotsTxtContent: healedRobots,
        },
      });
    }
  }

  return settings;
};

// ─── 2. SEO HEALTH CHECKER / AUDITOR ─────────────────────────────────────────

export const calculatePageSeoAudit = (page: {
  url: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  isIndexable?: boolean;
  inSitemap?: boolean;
  structuredData?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
}): SeoAuditCheckResult => {
  let score = 100;
  const passedChecks: string[] = [];
  const warnings: string[] = [];
  const failedChecks: string[] = [];
  const recommendations: string[] = [];

  const title = (page.seoTitle || '').trim();
  const desc = (page.seoDescription || '').trim();

  // 1. Title Tag Check
  if (!title) {
    score -= 25;
    failedChecks.push('Missing Title Tag');
    recommendations.push('Add an SEO title tag with targeted keywords and company/portal branding.');
  } else if (title.length < 30) {
    score -= 10;
    warnings.push(`Title tag is brief (${title.length} characters)`);
    recommendations.push('Expand title tag to 30-60 characters for optimal click-through rates.');
  } else if (title.length > 65) {
    score -= 5;
    warnings.push(`Title tag may truncate in search (${title.length} characters)`);
    recommendations.push('Keep title tag under 60-65 characters so it is not clipped in Google SERPs.');
  } else {
    passedChecks.push(`Optimal Title length (${title.length} chars)`);
  }

  // 2. Meta Description Check
  if (!desc) {
    score -= 20;
    failedChecks.push('Missing Meta Description');
    recommendations.push('Provide a compelling meta description summarizing page contents.');
  } else if (desc.length < 80) {
    score -= 8;
    warnings.push(`Meta description is short (${desc.length} characters)`);
    recommendations.push('Aim for 120-160 characters in meta description for higher Google CTR.');
  } else if (desc.length > 165) {
    score -= 5;
    warnings.push(`Meta description is slightly long (${desc.length} characters)`);
    recommendations.push('Meta description should ideally stay within 120-160 characters.');
  } else {
    passedChecks.push(`Optimal Meta Description length (${desc.length} chars)`);
  }

  // 3. Canonical URL
  if (!page.canonicalUrl) {
    score -= 15;
    warnings.push('No explicit Canonical URL defined');
    recommendations.push('Specify a canonical URL to avoid duplicate content penalties.');
  } else {
    passedChecks.push('Valid Canonical URL configured');
  }

  // 4. Indexing & Sitemap Alignment
  if (page.isIndexable && !page.inSitemap) {
    score -= 8;
    warnings.push('Page is indexable but excluded from sitemap');
    recommendations.push('Include this page in XML sitemaps to ensure search engine discovery.');
  } else if (!page.isIndexable && page.inSitemap) {
    score -= 15;
    failedChecks.push('Conflict: Page is marked noindex but included in sitemap');
    recommendations.push('Remove noindex pages from XML sitemaps to prevent crawl waste.');
  } else if (page.isIndexable && page.inSitemap) {
    passedChecks.push('Indexable & included in XML Sitemap');
  } else {
    passedChecks.push('Noindex directive properly excluded from sitemap');
  }

  // 5. Open Graph & Social Cards
  if (page.ogTitle || page.ogDescription || page.ogImage) {
    passedChecks.push('Social OpenGraph tags configured');
  } else {
    score -= 5;
    warnings.push('Missing OpenGraph social preview tags');
    recommendations.push('Configure OG title, description, and image for rich social sharing previews.');
  }

  // 6. Structured Data
  if (page.structuredData) {
    try {
      JSON.parse(page.structuredData);
      passedChecks.push('Valid JSON-LD Structured Data Schema');
    } catch {
      score -= 10;
      failedChecks.push('Malformed JSON in Structured Data field');
      recommendations.push('Fix JSON syntax error in structured data schema.');
    }
  } else {
    if (page.url.startsWith('/jobs/')) {
      score -= 10;
      warnings.push('JobPosting Schema recommended for job detail page');
      recommendations.push('Add JobPosting structured data to qualify for Google for Jobs rich snippets.');
    }
  }

  const finalScore = Math.max(0, Math.min(100, score));

  return {
    score: finalScore,
    passedChecks,
    warnings,
    failedChecks,
    recommendations,
  };
};

// ─── 3. SYNC ALL PUBLIC PAGES INTO CATALOG ────────────────────────────────────

export const syncAllPublicPagesToCatalog = async () => {
  const settings = await getOrCreateSeoGlobalSettings();
  const siteUrl = settings.siteUrl.replace(/\/$/, '');

  // 1. Static Pages
  const staticPages = [
    {
      url: '/',
      name: 'Home Page',
      pageType: 'HOMEPAGE',
      seoTitle: 'Career Wings — Find Top Jobs in Guwahati, Assam & Northeast India',
      seoDescription: 'Career Wings connects skilled job seekers with top employers in Assam and Northeast India. Search thousands of verified jobs and apply today.',
      sitemapPriority: 1.0,
      sitemapChangeFreq: 'daily',
    },
    {
      url: '/jobs',
      name: 'Browse All Jobs',
      pageType: 'JOB_LISTING',
      seoTitle: 'Browse Jobs in Assam, Northeast & All India | Career Wings',
      seoDescription: 'Find verified full-time, remote, hybrid, and contract jobs in Guwahati, Assam, and across Northeast India on Career Wings.',
      sitemapPriority: 0.9,
      sitemapChangeFreq: 'hourly',
    },
    {
      url: '/companies',
      name: 'Companies Directory',
      pageType: 'COMPANY_LISTING',
      seoTitle: 'Top Hiring Companies in Assam & Northeast India | Career Wings',
      seoDescription: 'Explore verified hiring companies, corporate profiles, open positions, and work culture in Assam on Career Wings.',
      sitemapPriority: 0.8,
      sitemapChangeFreq: 'daily',
    },
    {
      url: '/categories',
      name: 'Job Categories Directory',
      pageType: 'CATEGORY_LISTING',
      seoTitle: 'Explore Jobs by Category & Industry | Career Wings',
      seoDescription: 'Browse jobs by categories: IT & Software, Banking, Healthcare, Education, Sales, and more on Career Wings.',
      sitemapPriority: 0.8,
      sitemapChangeFreq: 'weekly',
    },
    {
      url: '/locations',
      name: 'Job Locations Directory',
      pageType: 'LOCATION_LISTING',
      seoTitle: 'Jobs by Location — Guwahati, Dibrugarh, Silchar, Shillong',
      seoDescription: 'Find jobs by city and state across Assam and Northeast India. Browse top vacancies in your preferred location.',
      sitemapPriority: 0.8,
      sitemapChangeFreq: 'weekly',
    },
    {
      url: '/blog',
      name: 'Career Wings Blog',
      pageType: 'BLOG_LISTING',
      seoTitle: 'Career Wings Blog — Career Advice, Resume Tips & Job Insights',
      seoDescription: 'Expert career advice, resume guides, interview preparation, and recruitment trends across Assam and Northeast India.',
      sitemapPriority: 0.8,
      sitemapChangeFreq: 'daily',
    },
    {
      url: '/pricing',
      name: 'Pricing & Packages',
      pageType: 'STATIC_PAGE',
      seoTitle: 'Pricing & Subscription Plans for Candidates & Employers | Career Wings',
      seoDescription: 'Transparent pricing for job seekers and recruiters. Choose the best plan to boost your career or hire top talent faster.',
      sitemapPriority: 0.7,
      sitemapChangeFreq: 'weekly',
    },
    {
      url: '/about',
      name: 'About Career Wings',
      pageType: 'STATIC_PAGE',
      seoTitle: 'About Us — Empowering Northeast India’s Workforce | Career Wings',
      seoDescription: 'Learn how Career Wings is bridging talent and opportunity across Assam and Northeast India.',
      sitemapPriority: 0.6,
      sitemapChangeFreq: 'monthly',
    },
    {
      url: '/contact',
      name: 'Contact Us',
      pageType: 'STATIC_PAGE',
      seoTitle: 'Contact Career Wings Support & Recruitment Team',
      seoDescription: 'Get in touch with Career Wings for assistance, corporate inquiries, or partnership opportunities.',
      sitemapPriority: 0.5,
      sitemapChangeFreq: 'monthly',
    },
    {
      url: '/privacy-policy',
      name: 'Privacy Policy',
      pageType: 'STATIC_PAGE',
      seoTitle: 'Privacy Policy | Career Wings Job Portal',
      seoDescription: 'Read the privacy policy of Career Wings regarding how candidate and employer data is handled securely.',
      sitemapPriority: 0.3,
      sitemapChangeFreq: 'monthly',
    },
    {
      url: '/terms-of-service',
      name: 'Terms of Service',
      pageType: 'STATIC_PAGE',
      seoTitle: 'Terms of Service | Career Wings Job Portal',
      seoDescription: 'Terms and conditions governing the use of Career Wings recruitment and job discovery platform.',
      sitemapPriority: 0.3,
      sitemapChangeFreq: 'monthly',
    },
    {
      url: '/refund-policy',
      name: 'Refund & Cancellation Policy',
      pageType: 'STATIC_PAGE',
      seoTitle: 'Refund Policy | Career Wings',
      seoDescription: 'Refund and cancellation guidelines for subscriptions and packages on Career Wings.',
      sitemapPriority: 0.3,
      sitemapChangeFreq: 'monthly',
    },
    // Custom SEO Landing Pages
    {
      url: '/jobs-in-guwahati',
      name: 'Jobs in Guwahati SEO Landing',
      pageType: 'SEO_LANDING',
      seoTitle: 'Jobs in Guwahati, Assam — Latest Vacancies & Hiring | Career Wings',
      seoDescription: 'Find urgent job openings in Guwahati for freshers and experienced candidates. Apply directly on Career Wings.',
      sitemapPriority: 0.9,
      sitemapChangeFreq: 'daily',
    },
    {
      url: '/jobs-in-assam',
      name: 'Jobs in Assam SEO Landing',
      pageType: 'SEO_LANDING',
      seoTitle: 'Jobs in Assam — Government & Private Sector Careers | Career Wings',
      seoDescription: 'Explore private and corporate jobs across Assam. Top companies hiring in Guwahati, Silchar, Dibrugarh, and Jorhat.',
      sitemapPriority: 0.9,
      sitemapChangeFreq: 'daily',
    },
    {
      url: '/jobs/category/it-software',
      name: 'IT & Software Jobs SEO Landing',
      pageType: 'SEO_LANDING',
      seoTitle: 'IT & Software Developer Jobs in Guwahati & Assam | Career Wings',
      seoDescription: 'Apply to high-paying software engineering, web development, and IT support jobs in Guwahati, Assam.',
      sitemapPriority: 0.8,
      sitemapChangeFreq: 'daily',
    },
  ];

  for (const page of staticPages) {
    const audit = calculatePageSeoAudit({
      url: page.url,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      canonicalUrl: page.url,
      isIndexable: true,
      inSitemap: true,
    });

    await prisma.seoPage.upsert({
      where: { url: page.url },
      update: {
        name: page.name,
        pageType: page.pageType,
        sitemapPriority: page.sitemapPriority,
        sitemapChangeFreq: page.sitemapChangeFreq,
        seoScore: audit.score,
        seoAuditResults: JSON.stringify(audit),
      },
      create: {
        url: page.url,
        name: page.name,
        pageType: page.pageType,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        canonicalUrl: page.url,
        sitemapPriority: page.sitemapPriority,
        sitemapChangeFreq: page.sitemapChangeFreq,
        isIndexable: true,
        isFollowable: true,
        inSitemap: true,
        seoScore: audit.score,
        seoAuditResults: JSON.stringify(audit),
      },
    });
  }

  // 2. Published Jobs
  const jobs = await prisma.job.findMany({
    where: {
      status: { in: ['PUBLISHED', 'FEATURED'] },
      deletedAt: null,
    },
    include: {
      company: true,
      location: true,
      category: true,
    },
  });

  for (const job of jobs) {
    const jobUrl = `/jobs/${job.slug}`;
    const companyName = job.company?.name || 'Top Employer';
    const locationCity = job.city || job.location?.city || 'Guwahati';
    const locationState = job.state || job.location?.state || 'Assam';

    const defaultTitle = job.seoTitle || `${job.title} at ${companyName} — Jobs in ${locationCity}, ${locationState}`;
    const defaultDesc =
      job.seoDescription ||
      `Apply for ${job.title} vacancy at ${companyName} in ${locationCity}, ${locationState}. ${
        job.experienceMin !== null && job.experienceMin !== undefined ? `${job.experienceMin}+ yrs experience.` : ''
      } Apply online on Career Wings.`;

    const jobSchema = buildJobPostingSchema(job, siteUrl);

    const audit = calculatePageSeoAudit({
      url: jobUrl,
      seoTitle: defaultTitle,
      seoDescription: defaultDesc,
      canonicalUrl: jobUrl,
      isIndexable: true,
      inSitemap: true,
      structuredData: JSON.stringify(jobSchema),
    });

    await prisma.seoPage.upsert({
      where: { url: jobUrl },
      update: {
        name: `${job.title} — ${companyName}`,
        pageType: 'JOB_DETAIL',
        entityId: job.id,
        seoScore: audit.score,
        seoAuditResults: JSON.stringify(audit),
        structuredData: JSON.stringify(jobSchema),
      },
      create: {
        url: jobUrl,
        name: `${job.title} — ${companyName}`,
        pageType: 'JOB_DETAIL',
        entityId: job.id,
        seoTitle: defaultTitle,
        seoDescription: defaultDesc,
        canonicalUrl: jobUrl,
        isIndexable: true,
        isFollowable: true,
        inSitemap: true,
        sitemapPriority: 0.8,
        sitemapChangeFreq: 'weekly',
        structuredData: JSON.stringify(jobSchema),
        seoScore: audit.score,
        seoAuditResults: JSON.stringify(audit),
      },
    });
  }

  // 3. Companies
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
  });

  for (const comp of companies) {
    const compUrl = `/companies/${comp.slug}`;
    const compTitle = `${comp.name} Careers, Jobs & Company Profile | Career Wings`;
    const compDesc = `Explore open vacancies, job opportunities, and company information for ${comp.name} in Assam and Northeast India.`;

    const audit = calculatePageSeoAudit({
      url: compUrl,
      seoTitle: compTitle,
      seoDescription: compDesc,
      canonicalUrl: compUrl,
      isIndexable: true,
      inSitemap: true,
    });

    await prisma.seoPage.upsert({
      where: { url: compUrl },
      update: {
        name: `${comp.name} Profile`,
        pageType: 'COMPANY_DETAIL',
        entityId: comp.id,
        seoScore: audit.score,
        seoAuditResults: JSON.stringify(audit),
      },
      create: {
        url: compUrl,
        name: `${comp.name} Profile`,
        pageType: 'COMPANY_DETAIL',
        entityId: comp.id,
        seoTitle: compTitle,
        seoDescription: compDesc,
        canonicalUrl: compUrl,
        isIndexable: true,
        isFollowable: true,
        inSitemap: true,
        sitemapPriority: 0.7,
        sitemapChangeFreq: 'weekly',
        seoScore: audit.score,
        seoAuditResults: JSON.stringify(audit),
      },
    });
  }

  // 4. Categories
  const categories = await prisma.category.findMany({
    where: { isActive: true },
  });

  for (const cat of categories) {
    const catUrl = `/categories/${cat.slug}`;
    const catTitle = `${cat.name} Jobs in Assam & Northeast India | Career Wings`;
    const catDesc = `Find the latest ${cat.name} job vacancies in Guwahati and Assam. Discover top hiring companies and apply online.`;

    const audit = calculatePageSeoAudit({
      url: catUrl,
      seoTitle: catTitle,
      seoDescription: catDesc,
      canonicalUrl: catUrl,
      isIndexable: true,
      inSitemap: true,
    });

    await prisma.seoPage.upsert({
      where: { url: catUrl },
      update: {
        name: `${cat.name} Category`,
        pageType: 'CATEGORY_DETAIL',
        entityId: cat.id,
        seoScore: audit.score,
        seoAuditResults: JSON.stringify(audit),
      },
      create: {
        url: catUrl,
        name: `${cat.name} Category`,
        pageType: 'CATEGORY_DETAIL',
        entityId: cat.id,
        seoTitle: catTitle,
        seoDescription: catDesc,
        canonicalUrl: catUrl,
        isIndexable: true,
        isFollowable: true,
        inSitemap: true,
        sitemapPriority: 0.6,
        sitemapChangeFreq: 'weekly',
        seoScore: audit.score,
        seoAuditResults: JSON.stringify(audit),
      },
    });
  }

  // 5. Locations
  const locations = await prisma.location.findMany();

  for (const loc of locations) {
    const locUrl = `/locations/${loc.slug}`;
    const locTitle = `Jobs in ${loc.city}, ${loc.state} — Latest Vacancies | Career Wings`;
    const locDesc = `Browse all active jobs and vacancies in ${loc.city}, ${loc.state}. Connect with verified recruiters on Career Wings.`;

    const audit = calculatePageSeoAudit({
      url: locUrl,
      seoTitle: locTitle,
      seoDescription: locDesc,
      canonicalUrl: locUrl,
      isIndexable: true,
      inSitemap: true,
    });

    await prisma.seoPage.upsert({
      where: { url: locUrl },
      update: {
        name: `Jobs in ${loc.city}`,
        pageType: 'LOCATION_DETAIL',
        entityId: loc.id,
        seoScore: audit.score,
        seoAuditResults: JSON.stringify(audit),
      },
      create: {
        url: locUrl,
        name: `Jobs in ${loc.city}`,
        pageType: 'LOCATION_DETAIL',
        entityId: loc.id,
        seoTitle: locTitle,
        seoDescription: locDesc,
        canonicalUrl: locUrl,
        isIndexable: true,
        isFollowable: true,
        inSitemap: true,
        sitemapPriority: 0.6,
        sitemapChangeFreq: 'weekly',
        seoScore: audit.score,
        seoAuditResults: JSON.stringify(audit),
      },
    });
  }

  // Mark expired, closed, rejected, or deleted jobs as non-indexable and remove from sitemap
  const inactiveJobs = await prisma.job.findMany({
    where: {
      OR: [
        { deletedAt: { not: null } },
        { status: { notIn: ['PUBLISHED', 'FEATURED'] } },
      ],
    },
    select: { slug: true },
  });
  if (inactiveJobs.length > 0) {
    const inactiveUrls = inactiveJobs.map((j) => `/jobs/${j.slug}`);
    await prisma.seoPage.updateMany({
      where: { url: { in: inactiveUrls } },
      data: {
        isIndexable: false,
        inSitemap: false,
        indexStatus: 'NOT_INDEXED',
      },
    });
  }

  // 6. Published Blog Posts
  try {
    const blogPosts = await prisma.blogPost.findMany({
      where: { isPublished: true },
    });

    for (const post of blogPosts) {
      const postUrl = `/blog/${post.slug}`;
      const postTitle = `${post.title} | Career Wings Blog`;
      const postDesc = (post.excerpt || post.title).slice(0, 160);
      const ogImg = post.coverImage
        ? (post.coverImage.startsWith('http') ? post.coverImage : `${siteUrl}${post.coverImage}`)
        : `${siteUrl}/og-image.jpg`;

      const blogSchema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: postDesc,
        image: ogImg,
        datePublished: (post.publishedAt || post.createdAt).toISOString(),
        dateModified: post.updatedAt.toISOString(),
        author: {
          '@type': 'Person',
          name: post.authorName || 'Career Wings Editorial Team',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Career Wings',
          logo: { '@type': 'ImageObject', url: `${siteUrl}/images/logo.png` },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}${postUrl}` },
      };

      const audit = calculatePageSeoAudit({
        url: postUrl,
        seoTitle: postTitle,
        seoDescription: postDesc,
        canonicalUrl: postUrl,
        isIndexable: true,
        inSitemap: true,
        structuredData: JSON.stringify(blogSchema),
        ogTitle: postTitle,
        ogDescription: postDesc,
        ogImage: ogImg,
      });

      await prisma.seoPage.upsert({
        where: { url: postUrl },
        update: {
          name: post.title,
          pageType: 'BLOG_POST',
          entityId: post.id,
          isIndexable: true,
          inSitemap: true,
          seoScore: audit.score,
          seoAuditResults: JSON.stringify(audit),
          structuredData: JSON.stringify(blogSchema),
          ogImage: ogImg,
        },
        create: {
          url: postUrl,
          name: post.title,
          pageType: 'BLOG_POST',
          entityId: post.id,
          seoTitle: postTitle,
          seoDescription: postDesc,
          canonicalUrl: postUrl,
          ogTitle: postTitle,
          ogDescription: postDesc,
          ogImage: ogImg,
          isIndexable: true,
          isFollowable: true,
          inSitemap: true,
          sitemapPriority: 0.7,
          sitemapChangeFreq: 'weekly',
          structuredData: JSON.stringify(blogSchema),
          seoScore: audit.score,
          seoAuditResults: JSON.stringify(audit),
        },
      });
    }
  } catch (blogSyncErr) {
    console.warn('SEO blog catalog sync notice:', blogSyncErr);
  }

  return { success: true, message: 'SEO Page catalog synced successfully' };
};

export const ensureSeoCatalogInitialized = async () => {
  const count = await prisma.seoPage.count().catch(() => 0);
  if (count > 0) return;
  if (!activeSeoSyncPromise) {
    activeSeoSyncPromise = syncAllPublicPagesToCatalog().finally(() => {
      activeSeoSyncPromise = null;
    });
  }
  await activeSeoSyncPromise;
};

// ─── 3B. SCHEMA.ORG JOBPOSTING ENGINE & VALIDATOR ───────────────────────────

export const mapEmploymentTypeToSchema = (type?: string): string => {
  if (!type) return 'FULL_TIME';
  const norm = type.toUpperCase().replace(/[-\s]/g, '_');
  if (norm === 'CONTRACT' || norm === 'FREELANCE' || norm === 'CONTRACTOR') return 'CONTRACTOR';
  if (norm === 'INTERNSHIP' || norm === 'INTERN') return 'INTERN';
  if (norm === 'PART_TIME') return 'PART_TIME';
  if (norm === 'TEMPORARY' || norm === 'TEMP') return 'TEMPORARY';
  if (norm === 'VOLUNTEER') return 'VOLUNTEER';
  if (norm === 'PER_DIEM') return 'PER_DIEM';
  if (norm === 'OTHER') return 'OTHER';
  return 'FULL_TIME';
};

export const cleanJobDescriptionForSchema = (raw?: string): string => {
  if (!raw) return '';
  let cleaned = raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .trim();

  if (!cleaned) return '';
  if (!/<(p|div|ul|ol|li|br|h[1-6])\b/i.test(cleaned)) {
    cleaned = cleaned
      .split(/\n\n+/)
      .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');
  }
  return cleaned;
};

const mapSalaryUnitToSchema = (period?: string): string => {
  const p = (period || 'MONTHLY').toUpperCase();
  if (p === 'YEARLY' || p === 'ANNUAL' || p === 'ANNUALLY') return 'YEAR';
  if (p === 'HOURLY') return 'HOUR';
  if (p === 'WEEKLY') return 'WEEK';
  if (p === 'DAILY') return 'DAY';
  return 'MONTH';
};

export const buildJobPostingSchema = (job: any, siteUrl: string) => {
  const companyName = job.company?.name || 'Career Wings Verified Employer';
  const companyProfileUrl = job.company?.slug ? `${siteUrl}/companies/${job.company.slug}` : siteUrl;
  const locationCity = job.city || job.location?.city || 'Guwahati';
  const locationState = job.state || job.location?.state || 'Assam';
  const streetAddress = job.locationText || `${locationCity}, ${locationState}, India`;

  const datePosted = job.publishedAt
    ? new Date(job.publishedAt).toISOString()
    : new Date(job.createdAt || Date.now()).toISOString();
  const validThrough = job.applicationDeadline
    ? new Date(job.applicationDeadline).toISOString()
    : job.expiresAt
    ? new Date(job.expiresAt).toISOString()
    : new Date(new Date(datePosted).getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const logoUrl = job.company?.logo
    ? (job.company.logo.startsWith('http') ? job.company.logo : `${siteUrl}${job.company.logo}`)
    : `${siteUrl}/images/logo.png`;

  const descriptionParts: string[] = [];
  const mainDesc = cleanJobDescriptionForSchema(job.description);
  if (mainDesc) descriptionParts.push(mainDesc);
  const respHtml = cleanJobDescriptionForSchema(job.responsibilities);
  if (respHtml) descriptionParts.push(`<p><strong>Responsibilities:</strong></p>${respHtml}`);
  const reqHtml = cleanJobDescriptionForSchema(job.requirements);
  if (reqHtml) descriptionParts.push(`<p><strong>Requirements:</strong></p>${reqHtml}`);
  const benHtml = cleanJobDescriptionForSchema(job.benefits);
  if (benHtml) descriptionParts.push(`<p><strong>Benefits:</strong></p>${benHtml}`);

  const fullDescription =
    descriptionParts.join('') || '<p>Detailed job description and online application available on Career Wings.</p>';

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: fullDescription,
    identifier: {
      '@type': 'PropertyValue',
      name: 'Career Wings',
      value: String(job.id || job.slug),
    },
    datePosted,
    validThrough,
    employmentType: mapEmploymentTypeToSchema(job.jobType),
    hiringOrganization: {
      '@type': 'Organization',
      name: companyName,
      sameAs: job.company?.website || companyProfileUrl,
      logo: logoUrl,
    },
    url: `${siteUrl}/jobs/${job.slug}`,
  };

  if (job.category?.name) {
    schema.occupationalCategory = job.category.name;
  }

  // Location logic
  const workMode = (job.workMode || '').toUpperCase();
  if (workMode === 'REMOTE') {
    schema.jobLocationType = 'TELECOMMUTE';
    schema.applicantLocationRequirements = {
      '@type': 'Country',
      name: 'India',
    };
  } else {
    schema.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress,
        addressLocality: locationCity,
        addressRegion: locationState,
        addressCountry: 'IN',
      },
    };
    if (workMode === 'HYBRID') {
      schema.jobLocationType = 'TELECOMMUTE';
      schema.applicantLocationRequirements = {
        '@type': 'Country',
        name: 'India',
      };
    }
  }

  // Salary logic
  const minSal = Number(job.salaryMin ?? 0);
  const maxSal = Number(job.salaryMax ?? 0);
  if (job.showSalary !== false && (minSal > 0 || maxSal > 0)) {
    const min = minSal > 0 ? minSal : maxSal;
    const max = maxSal > 0 ? maxSal : minSal;
    const unitText = mapSalaryUnitToSchema(job.salaryPeriod);

    const quantValue: any = {
      '@type': 'QuantitativeValue',
      unitText,
    };

    if (min === max) {
      quantValue.value = min;
    } else {
      quantValue.minValue = Math.min(min, max);
      quantValue.maxValue = Math.max(min, max);
    }

    schema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: job.salaryCurrency || 'INR',
      value: quantValue,
    };
  }

  schema.directApply = job.applicationMethod === 'PORTAL' || !job.applicationUrl;

  return schema;
};

export const buildJobBreadcrumbsSchema = (job: any, siteUrl: string) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${siteUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Jobs',
        item: `${siteUrl}/jobs`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: job.title,
        item: `${siteUrl}/jobs/${job.slug}`,
      },
    ],
  };
};

export const validateJobPostingSchema = (schema: any, jobStatus?: string) => {
  const requiredFields = ['title', 'description', 'datePosted', 'validThrough', 'hiringOrganization', 'jobLocation'];
  const missingFields: string[] = [];
  const invalidFields: string[] = [];
  const warnings: string[] = [];

  if (!schema || typeof schema !== 'object') {
    return {
      status: 'INVALID' as const,
      requiredFields,
      missingFields: ['ALL'],
      invalidFields: ['malformed_schema'],
      warnings: ['Schema is missing or empty'],
      googleTestUrl: '',
      schemaOrgTestUrl: '',
    };
  }

  if (schema['@type'] !== 'JobPosting') {
    invalidFields.push('@type must be JobPosting');
  }

  if (!schema.title?.trim()) missingFields.push('title');
  if (!schema.description?.trim()) missingFields.push('description');
  if (!schema.datePosted) missingFields.push('datePosted');
  if (!schema.validThrough) missingFields.push('validThrough');
  if (!schema.hiringOrganization?.name?.trim()) missingFields.push('hiringOrganization.name');

  // Location check: either jobLocation or jobLocationType === 'TELECOMMUTE'
  if (!schema.jobLocation && schema.jobLocationType !== 'TELECOMMUTE') {
    missingFields.push('jobLocation (or jobLocationType TELECOMMUTE)');
  }

  // Warnings
  if (!schema.baseSalary) {
    warnings.push('baseSalary omitted (recommended by Google for Jobs when known)');
  }
  if (!schema.hiringOrganization?.logo) {
    warnings.push('Employer logo not provided in hiringOrganization');
  }
  if (!schema.identifier?.value) {
    warnings.push('Unique identifier value recommended');
  }

  // Check expired state
  const isExpired =
    jobStatus === 'EXPIRED' ||
    jobStatus === 'CLOSED' ||
    (schema.validThrough && new Date(schema.validThrough).getTime() < Date.now());

  let status: 'VALID' | 'WARNING' | 'INVALID' | 'EXPIRED' = 'VALID';
  if (missingFields.length > 0 || invalidFields.length > 0) {
    status = 'INVALID';
  } else if (isExpired) {
    status = 'EXPIRED';
  } else if (warnings.length > 0) {
    status = 'WARNING';
  }

  const jobUrl = schema.url || '';
  const googleTestUrl = `https://search.google.com/test/rich-results?url=${encodeURIComponent(jobUrl)}`;
  const schemaOrgTestUrl = `https://validator.schema.org/#url=${encodeURIComponent(jobUrl)}`;

  return {
    status,
    requiredFields,
    missingFields,
    invalidFields,
    warnings,
    googleTestUrl,
    schemaOrgTestUrl,
  };
};

export const onJobPublished = async (jobId: string) => {
  try {
    const settings = await getOrCreateSeoGlobalSettings();
    const siteUrl = settings.siteUrl.replace(/\/$/, '');
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { company: true, location: true },
    });
    if (!job) return;

    const jobUrl = `/jobs/${job.slug}`;
    const companyName = job.company?.name || 'Top Employer';
    const locationCity = job.city || job.location?.city || 'Guwahati';
    const locationState = job.state || job.location?.state || 'Assam';

    const defaultTitle = job.seoTitle || `${job.title} at ${companyName} — Jobs in ${locationCity}, ${locationState}`;
    const defaultDesc =
      job.seoDescription ||
      `Apply for ${job.title} vacancy at ${companyName} in ${locationCity}, ${locationState}. Apply online on Career Wings.`;

    const jobSchema = buildJobPostingSchema(job, siteUrl);

    const isAvailable =
      job.status === 'PUBLISHED' || job.status === 'FEATURED';

    const audit = calculatePageSeoAudit({
      url: jobUrl,
      seoTitle: defaultTitle,
      seoDescription: defaultDesc,
      canonicalUrl: jobUrl,
      isIndexable: isAvailable,
      inSitemap: isAvailable,
      structuredData: JSON.stringify(jobSchema),
    });

    await prisma.seoPage.upsert({
      where: { url: jobUrl },
      update: {
        name: `${job.title} — ${companyName}`,
        pageType: 'JOB_DETAIL',
        entityId: job.id,
        isIndexable: isAvailable,
        inSitemap: isAvailable,
        seoScore: audit.score,
        seoAuditResults: JSON.stringify(audit),
        structuredData: JSON.stringify(jobSchema),
      },
      create: {
        url: jobUrl,
        name: `${job.title} — ${companyName}`,
        pageType: 'JOB_DETAIL',
        entityId: job.id,
        seoTitle: defaultTitle,
        seoDescription: defaultDesc,
        canonicalUrl: jobUrl,
        isIndexable: isAvailable,
        isFollowable: isAvailable,
        inSitemap: isAvailable,
        sitemapPriority: 0.8,
        sitemapChangeFreq: 'weekly',
        structuredData: JSON.stringify(jobSchema),
        seoScore: audit.score,
        seoAuditResults: JSON.stringify(audit),
      },
    });

    if (isAvailable && settings.autoSubmitPublishedJobs) {
      await enqueueUrlsForIndexing([jobUrl], 'SYSTEM_AUTO_PUBLISH');
    }
  } catch (err) {
    console.error('Error in onJobPublished SEO hook:', err);
  }
};

export const onJobRemovedOrExpired = async (jobId: string) => {
  try {
    const settings = await getOrCreateSeoGlobalSettings();
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { slug: true },
    });
    if (!job) return;

    const jobUrl = `/jobs/${job.slug}`;
    await prisma.seoPage.updateMany({
      where: { url: jobUrl },
      data: {
        isIndexable: false,
        inSitemap: false,
        indexStatus: 'NOT_INDEXED',
      },
    });

    if (settings.autoSubmitPublishedJobs && settings.gscConnected) {
      await enqueueUrlsForIndexing([jobUrl], 'SYSTEM_AUTO_REMOVE', 'REMOVE');
    }
  } catch (err) {
    console.error('Error in onJobRemovedOrExpired SEO hook:', err);
  }
};

export const onBlogPublished = async (postId: string) => {
  try {
    const settings = await getOrCreateSeoGlobalSettings();
    const siteUrl = settings.siteUrl.replace(/\/$/, '');
    const post = await prisma.blogPost.findUnique({ where: { id: postId } });
    if (!post) return;

    const postUrl = `/blog/${post.slug}`;
    const isAvailable = Boolean(post.isPublished);
    const postTitle = `${post.title} | Career Wings Blog`;
    const postDesc = (post.excerpt || post.title).slice(0, 160);
    const ogImg = post.coverImage
      ? (post.coverImage.startsWith('http') ? post.coverImage : `${siteUrl}${post.coverImage}`)
      : `${siteUrl}/og-image.jpg`;

    const blogSchema = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: postDesc,
      image: ogImg,
      datePublished: (post.publishedAt || post.createdAt).toISOString(),
      dateModified: post.updatedAt.toISOString(),
      author: { '@type': 'Person', name: post.authorName || 'Career Wings Editorial Team' },
      publisher: {
        '@type': 'Organization',
        name: 'Career Wings',
        logo: { '@type': 'ImageObject', url: `${siteUrl}/images/logo.png` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}${postUrl}` },
    };

    const audit = calculatePageSeoAudit({
      url: postUrl,
      seoTitle: postTitle,
      seoDescription: postDesc,
      canonicalUrl: postUrl,
      isIndexable: isAvailable,
      inSitemap: isAvailable,
      structuredData: JSON.stringify(blogSchema),
      ogTitle: postTitle,
      ogDescription: postDesc,
      ogImage: ogImg,
    });

    await prisma.seoPage.upsert({
      where: { url: postUrl },
      update: {
        name: post.title,
        pageType: 'BLOG_POST',
        entityId: post.id,
        isIndexable: isAvailable,
        inSitemap: isAvailable,
        seoScore: audit.score,
        seoAuditResults: JSON.stringify(audit),
        structuredData: JSON.stringify(blogSchema),
        ogImage: ogImg,
      },
      create: {
        url: postUrl,
        name: post.title,
        pageType: 'BLOG_POST',
        entityId: post.id,
        seoTitle: postTitle,
        seoDescription: postDesc,
        canonicalUrl: postUrl,
        ogTitle: postTitle,
        ogDescription: postDesc,
        ogImage: ogImg,
        isIndexable: isAvailable,
        isFollowable: isAvailable,
        inSitemap: isAvailable,
        sitemapPriority: 0.7,
        sitemapChangeFreq: 'weekly',
        structuredData: JSON.stringify(blogSchema),
        seoScore: audit.score,
        seoAuditResults: JSON.stringify(audit),
      },
    });

    if (isAvailable && settings.autoSubmitPublishedJobs) {
      await enqueueUrlsForIndexing([postUrl], 'SYSTEM_AUTO_PUBLISH');
    } else if (!isAvailable && settings.autoSubmitPublishedJobs && settings.gscConnected) {
      await enqueueUrlsForIndexing([postUrl], 'SYSTEM_AUTO_REMOVE', 'REMOVE');
    }
  } catch (err) {
    console.error('Error in onBlogPublished SEO hook:', err);
  }
};

export const onBlogDeleted = async (slug: string) => {
  try {
    const settings = await getOrCreateSeoGlobalSettings();
    const postUrl = `/blog/${slug}`;
    await prisma.seoPage.updateMany({
      where: { url: postUrl },
      data: { isIndexable: false, inSitemap: false, indexStatus: 'NOT_INDEXED' },
    });
    if (settings.autoSubmitPublishedJobs && settings.gscConnected) {
      await enqueueUrlsForIndexing([postUrl], 'SYSTEM_AUTO_REMOVE', 'REMOVE');
    }
  } catch (err) {
    console.error('Error in onBlogDeleted SEO hook:', err);
  }
};

export const regenerateJobSchemaAndAudit = async (jobId: string) => {
  const settings = await getOrCreateSeoGlobalSettings();
  const siteUrl = settings.siteUrl.replace(/\/$/, '');
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { company: true, location: true, category: true },
  });

  if (!job) throw new Error('Job not found');

  const jobUrl = `/jobs/${job.slug}`;
  const jobSchema = buildJobPostingSchema(job, siteUrl);
  const breadcrumbsSchema = buildJobBreadcrumbsSchema(job, siteUrl);

  const combinedSchemas = [jobSchema, breadcrumbsSchema];

  const validation = validateJobPostingSchema(jobSchema, job.status);

  const audit = calculatePageSeoAudit({
    url: jobUrl,
    seoTitle: job.seoTitle || job.title,
    seoDescription: job.seoDescription || job.description.slice(0, 160),
    canonicalUrl: jobUrl,
    isIndexable: job.status === 'PUBLISHED' || job.status === 'FEATURED',
    inSitemap: job.status === 'PUBLISHED' || job.status === 'FEATURED',
    structuredData: JSON.stringify(jobSchema),
  });

  const updatedPage = await prisma.seoPage.upsert({
    where: { url: jobUrl },
    update: {
      structuredData: JSON.stringify(jobSchema),
      seoScore: audit.score,
      seoAuditResults: JSON.stringify(audit),
    },
    create: {
      url: jobUrl,
      name: `${job.title} — ${job.company?.name || 'Career Wings'}`,
      pageType: 'JOB_DETAIL',
      entityId: job.id,
      seoTitle: job.seoTitle || job.title,
      seoDescription: job.seoDescription || job.description.slice(0, 160),
      canonicalUrl: jobUrl,
      structuredData: JSON.stringify(jobSchema),
      seoScore: audit.score,
      seoAuditResults: JSON.stringify(audit),
      isIndexable: job.status === 'PUBLISHED' || job.status === 'FEATURED',
      inSitemap: job.status === 'PUBLISHED' || job.status === 'FEATURED',
    },
  });

  return {
    jobId: job.id,
    jobTitle: job.title,
    schema: jobSchema,
    combinedSchemas,
    validation,
    updatedPage,
  };
};

export const getAllJobSchemasValidation = async (params: { search?: string; status?: string }) => {
  const settings = await getOrCreateSeoGlobalSettings();
  const siteUrl = settings.siteUrl.replace(/\/$/, '');

  const where: any = { deletedAt: null };
  if (params.search) {
    where.OR = [
      { title: { contains: params.search } },
      { slug: { contains: params.search } },
    ];
  }
  if (params.status && params.status !== 'ALL') {
    where.status = params.status;
  }

  const jobs = await prisma.job.findMany({
    where,
    include: { company: true, location: true, category: true },
    orderBy: { updatedAt: 'desc' },
  });

  const items = jobs.map((job) => {
    const jobUrl = `/jobs/${job.slug}`;
    const schema = buildJobPostingSchema(job, siteUrl);
    const breadcrumbs = buildJobBreadcrumbsSchema(job, siteUrl);
    const validation = validateJobPostingSchema(schema, job.status);

    return {
      id: job.id,
      title: job.title,
      slug: job.slug,
      url: jobUrl,
      absoluteUrl: `${siteUrl}${jobUrl}`,
      company: job.company?.name || 'Career Wings Employer',
      companyLogo: job.company?.logo,
      location: job.city || job.location?.city || 'Guwahati, Assam',
      workMode: job.workMode,
      jobType: job.jobType,
      employmentTypeMapped: mapEmploymentTypeToSchema(job.jobType),
      status: job.status,
      showSalary: job.showSalary,
      salaryRange:
        job.salaryMin && job.salaryMax
          ? `₹${job.salaryMin.toLocaleString()} - ₹${job.salaryMax.toLocaleString()} / ${job.salaryPeriod || 'month'}`
          : job.salaryMin
          ? `₹${job.salaryMin.toLocaleString()} / ${job.salaryPeriod || 'month'}`
          : 'Not Disclosed',
      datePosted: job.publishedAt ? new Date(job.publishedAt).toLocaleDateString() : new Date(job.createdAt).toLocaleDateString(),
      validThrough: job.applicationDeadline
        ? new Date(job.applicationDeadline).toLocaleDateString()
        : '60 days standard',
      applicationMethod: job.applicationMethod,
      schema,
      breadcrumbs,
      validation,
      updatedAt: job.updatedAt,
    };
  });

  return items;
};

// ─── 4. DYNAMIC XML SITEMAP GENERATION ────────────────────────────────────────

export const generateSitemapIndexXml = async (): Promise<string> => {
  await ensureSeoCatalogInitialized();
  const settings = await getOrCreateSeoGlobalSettings();
  const siteUrl = settings.siteUrl.replace(/\/$/, '');
  const now = new Date().toISOString();

  const sections = [
    { loc: `${siteUrl}/sitemap-pages.xml`, lastmod: now },
    { loc: `${siteUrl}/sitemap-jobs.xml`, lastmod: now },
    { loc: `${siteUrl}/sitemap-companies.xml`, lastmod: now },
    { loc: `${siteUrl}/sitemap-categories.xml`, lastmod: now },
    { loc: `${siteUrl}/sitemap-locations.xml`, lastmod: now },
    { loc: `${siteUrl}/sitemap-blog.xml`, lastmod: now },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const s of sections) {
    xml += `  <sitemap>\n`;
    xml += `    <loc>${escapeXml(s.loc)}</loc>\n`;
    xml += `    <lastmod>${s.lastmod}</lastmod>\n`;
    xml += `  </sitemap>\n`;
  }

  xml += `</sitemapindex>`;
  return xml;
};

export const generateSectionSitemapXml = async (section: string): Promise<string> => {
  await ensureSeoCatalogInitialized();
  const settings = await getOrCreateSeoGlobalSettings();
  const siteUrl = settings.siteUrl.replace(/\/$/, '');

  let pageTypeFilter: string[] = [];
  switch (section.toLowerCase()) {
    case 'pages':
      pageTypeFilter = ['HOMEPAGE', 'JOB_LISTING', 'COMPANY_LISTING', 'CATEGORY_LISTING', 'LOCATION_LISTING', 'BLOG_LISTING', 'STATIC_PAGE'];
      break;
    case 'jobs':
      pageTypeFilter = ['JOB_DETAIL'];
      break;
    case 'companies':
      pageTypeFilter = ['COMPANY_DETAIL'];
      break;
    case 'categories':
      pageTypeFilter = ['CATEGORY_DETAIL'];
      break;
    case 'locations':
      pageTypeFilter = ['LOCATION_DETAIL'];
      break;
    case 'blog':
      pageTypeFilter = ['BLOG_POST', 'BLOG_LISTING', 'SEO_LANDING'];
      break;
    case 'landings':
      pageTypeFilter = ['SEO_LANDING'];
      break;
    default:
      pageTypeFilter = [];
  }

  const pages = await prisma.seoPage.findMany({
    where: {
      isIndexable: true,
      inSitemap: true,
      ...(pageTypeFilter.length > 0 ? { pageType: { in: pageTypeFilter } } : {}),
    },
    orderBy: [{ sitemapPriority: 'desc' }, { updatedAt: 'desc' }],
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const page of pages) {
    const loc = `${siteUrl}${page.canonicalUrl || page.url}`;
    const lastmod = page.updatedAt ? page.updatedAt.toISOString() : new Date().toISOString();
    const priority = page.sitemapPriority?.toFixed(1) || '0.7';
    const changefreq = page.sitemapChangeFreq || 'weekly';

    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(loc)}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>${changefreq}</changefreq>\n`;
    xml += `    <priority>${priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;
  return xml;
};

export const generateMasterSitemapXml = async (): Promise<string> => {
  await ensureSeoCatalogInitialized();
  // If count is greater than 500, serve as sitemapindex. Otherwise direct urlset
  const count = await prisma.seoPage.count({
    where: { isIndexable: true, inSitemap: true },
  });

  if (count > 500) {
    return generateSitemapIndexXml();
  }

  const settings = await getOrCreateSeoGlobalSettings();
  const siteUrl = settings.siteUrl.replace(/\/$/, '');

  const pages = await prisma.seoPage.findMany({
    where: { isIndexable: true, inSitemap: true },
    orderBy: [{ sitemapPriority: 'desc' }, { updatedAt: 'desc' }],
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const page of pages) {
    const loc = `${siteUrl}${page.canonicalUrl || page.url}`;
    const lastmod = page.updatedAt ? page.updatedAt.toISOString() : new Date().toISOString();
    const priority = page.sitemapPriority?.toFixed(1) || '0.7';
    const changefreq = page.sitemapChangeFreq || 'weekly';

    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(loc)}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>${changefreq}</changefreq>\n`;
    xml += `    <priority>${priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;
  return xml;
};

// ─── 5. ROBOTS.TXT MANAGER & VALIDATOR ────────────────────────────────────────

export const validateRobotsTxtContent = (
  content: string
): { isDangerous: boolean; warnings: string[]; suggestions: string[] } => {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const lines = content.split('\n').map((l) => l.trim().toLowerCase());

  // Check 1: Disallow: / (blocks entire site!)
  const disallowRoot = lines.some((l) => /^disallow:\s*\/\s*$/.test(l));
  if (disallowRoot) {
    warnings.push('CRITICAL: Rule "Disallow: /" blocks search engines from crawling the ENTIRE website!');
  }

  // Check 2: Blocking public directory paths
  if (lines.some((l) => /^disallow:\s*\/jobs\/?$/.test(l))) {
    warnings.push('WARNING: "Disallow: /jobs" blocks all job listing pages from Google indexing!');
  }
  if (lines.some((l) => /^disallow:\s*\/companies\/?$/.test(l) || /^disallow:\s*\/company\/?$/.test(l))) {
    warnings.push('WARNING: "Disallow: /companies" blocks company profile pages from Google indexing!');
  }
  if (lines.some((l) => /^disallow:\s*\/categories\/?$/.test(l) || /^disallow:\s*\/category\/?$/.test(l))) {
    warnings.push('WARNING: "Disallow: /categories" blocks category pages from Google indexing!');
  }
  if (lines.some((l) => /^disallow:\s*\/locations\/?$/.test(l) || /^disallow:\s*\/location\/?$/.test(l))) {
    warnings.push('WARNING: "Disallow: /locations" blocks city & regional job pages from search results!');
  }

  // Check 3: Sitemap directive present
  const hasSitemap = lines.some((l) => l.startsWith('sitemap:'));
  if (!hasSitemap) {
    suggestions.push('Recommended: Include "Sitemap: [YOUR_SITE_URL]/sitemap.xml" so search engines can discover all pages.');
  }

  return {
    isDangerous: warnings.length > 0,
    warnings,
    suggestions,
  };
};

// ─── 6. INDEXING QUEUE PROCESSOR ──────────────────────────────────────────────

export const enqueueUrlsForIndexing = async (
  urls: string[],
  requestedBy: string = 'ADMIN',
  action: 'INDEX' | 'REMOVE' = 'INDEX'
) => {
  const settings = await getOrCreateSeoGlobalSettings();
  const siteUrl = settings.siteUrl.replace(/\/$/, '');
  const queuedItems: any[] = [];

  for (const rawUrl of urls) {
    const formattedUrl = rawUrl.startsWith('http') ? rawUrl : `${siteUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
    const relativeUrl = rawUrl.startsWith('http') ? new URL(rawUrl).pathname : (rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`);

    // Find corresponding page if any
    const page = await prisma.seoPage.findUnique({ where: { url: relativeUrl } });

    // Deduplicate: avoid creating queue item if pending or already processing
    const existing = await prisma.indexingQueue.findFirst({
      where: {
        url: formattedUrl,
        action,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (!existing) {
      const item = await prisma.indexingQueue.create({
        data: {
          url: formattedUrl,
          pageId: page?.id,
          status: 'PENDING',
          action,
          requestedBy,
        },
      });
      queuedItems.push(item);
    }
  }

  return queuedItems;
};

export const submitUrlsToIndexNow = async (urls: string[], settings: any): Promise<void> => {
  if (!settings?.bingApiKey || urls.length === 0) return;
  try {
    const siteUrl = (settings.siteUrl || DEFAULT_SITE_URL).replace(/\/$/, '');
    const host = new URL(siteUrl).host;
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        key: settings.bingApiKey,
        keyLocation: `${siteUrl}/${settings.bingApiKey}.txt`,
        urlList: urls,
      }),
    });
  } catch (err) {
    console.warn('IndexNow submission notice:', err);
  }
};

export const processIndexingQueueBatch = async (limit = 10) => {
  const settings = await getOrCreateSeoGlobalSettings();
  const items = await prisma.indexingQueue.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      attemptCount: { lt: 3 },
    },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  if (items.length === 0) {
    return { processed: 0, message: 'Queue is currently empty' };
  }

  let processedCount = 0;
  const submittedUrlsForIndexNow: string[] = [];

  for (const item of items) {
    await prisma.indexingQueue.update({
      where: { id: item.id },
      data: {
        status: 'PROCESSING',
        attemptCount: { increment: 1 },
      },
    });

    try {
      const normalizedItemUrl = item.url.replace(
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
        resolveProductionSiteUrl(settings.siteUrl)
      );
      const relativeUrl = new URL(normalizedItemUrl).pathname;

      // Check if Google Search Console credentials exist
      if (!settings.gscConnected && !settings.gscClientEmail && !settings.gscRefreshToken) {
        // Record honest submission attempt: Not configured
        await prisma.indexingQueue.update({
          where: { id: item.id },
          data: {
            url: normalizedItemUrl,
            status: 'SUBMITTED',
            lastResponse: JSON.stringify({
              status: 'LOCAL_SUBMITTED',
              timestamp: new Date().toISOString(),
              note: 'URL queued and marked for crawl. Direct Google API transmission is awaiting Google Search Console Service Account connection in Admin Settings.',
            }),
          },
        });

        await prisma.seoPage.updateMany({
          where: { url: relativeUrl },
          data: {
            indexStatus: item.action === 'REMOVE' ? 'NOT_INDEXED' : 'SUBMITTED',
            lastSubmittedAt: new Date(),
          },
        });

        submittedUrlsForIndexNow.push(normalizedItemUrl);
        processedCount++;
        continue;
      }

      // If Google credentials are provided, call Google Indexing API
      const notificationType = item.action === 'REMOVE' ? 'URL_DELETED' : 'URL_UPDATED';
      const result = await submitUrlToGoogleIndexingApi(normalizedItemUrl, settings, notificationType);

      await prisma.indexingQueue.update({
        where: { id: item.id },
        data: {
          url: normalizedItemUrl,
          status: result.success ? 'COMPLETED' : 'FAILED',
          lastResponse: JSON.stringify(result.data || result.error),
          errorMessage: result.error ? String(result.error) : null,
        },
      });

      await prisma.seoPage.updateMany({
        where: { url: relativeUrl },
        data: {
          indexStatus: result.success ? (item.action === 'REMOVE' ? 'NOT_INDEXED' : 'SUBMITTED') : 'FAILED',
          lastSubmittedAt: new Date(),
        },
      });

      if (result.success) {
        submittedUrlsForIndexNow.push(normalizedItemUrl);
      }

      processedCount++;
    } catch (err: any) {
      await prisma.indexingQueue.update({
        where: { id: item.id },
        data: {
          status: 'FAILED',
          errorMessage: err.message || 'Submission error',
        },
      });
    }
  }

  if (submittedUrlsForIndexNow.length > 0 && settings.bingApiKey) {
    await submitUrlsToIndexNow(submittedUrlsForIndexNow, settings);
  }

  return { processed: processedCount, totalFound: items.length };
};

// ─── 7. GOOGLE SEARCH CONSOLE & GOOGLE INDEXING API CLIENT ────────────────────

export const submitUrlToGoogleIndexingApi = async (
  targetUrl: string,
  settings: any,
  type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'
): Promise<{ success: boolean; data?: any; error?: string }> => {
  if (!settings.gscClientEmail || !settings.gscPrivateKey) {
    return {
      success: false,
      error: 'Google Service Account credentials not configured in SEO Settings.',
    };
  }

  try {
    // Generate Google OAuth2 JWT token for Service Account
    const token = await getGoogleServiceAccountAccessToken(
      settings.gscClientEmail,
      settings.gscPrivateKey,
      ['https://www.googleapis.com/auth/indexing']
    );

    if (!token) {
      return { success: false, error: 'Failed to acquire Google OAuth access token' };
    }

    const response = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: targetUrl,
        type,
      }),
    });

    const data: any = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `Google API error: HTTP ${response.status}`,
        data,
      };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error communicating with Google Indexing API' };
  }
};

export const inspectUrlWithGoogleSearchConsole = async (
  targetUrl: string
): Promise<GscInspectResult> => {
  const settings = await getOrCreateSeoGlobalSettings();

  if (!settings.gscClientEmail || !settings.gscPrivateKey) {
    return {
      inspectionUrl: targetUrl,
      verdict: 'UNKNOWN',
      message: 'This information is not available through the Google API. Google Search Console credentials are not configured.',
    };
  }

  try {
    const token = await getGoogleServiceAccountAccessToken(
      settings.gscClientEmail,
      settings.gscPrivateKey,
      ['https://www.googleapis.com/auth/webmasters.readonly']
    );

    if (!token) {
      return {
        inspectionUrl: targetUrl,
        verdict: 'UNKNOWN',
        message: 'Could not authenticate with Google Search Console API. Check Service Account private key.',
      };
    }

    const propertyUrl = settings.gscProperty || settings.siteUrl || 'https://careerwings.in';

    const response = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        inspectionUrl: targetUrl,
        siteUrl: propertyUrl,
      }),
    });

    if (!response.ok) {
      const errData: any = await response.json();
      return {
        inspectionUrl: targetUrl,
        verdict: 'ERROR',
        message: errData.error?.message || `Google API error: HTTP ${response.status}`,
        rawResponse: errData,
      };
    }

    const data: any = await response.json();
    const result = data.inspectionResult?.indexStatusResult;

    let verdict: 'INDEXED' | 'NOT_INDEXED' | 'UNKNOWN' = 'UNKNOWN';
    if (result?.verdict === 'PASS') {
      verdict = 'INDEXED';
    } else if (result?.verdict === 'FAIL' || result?.verdict === 'NEUTRAL') {
      verdict = 'NOT_INDEXED';
    }

    return {
      inspectionUrl: targetUrl,
      verdict,
      coverageState: result?.coverageState || 'Not available through Google API',
      crawlState: result?.crawledAs || 'Googlebot Smartphone',
      indexingState: result?.indexingState || 'Unknown',
      lastCrawlTime: result?.lastCrawlTime,
      robotsTxtState: result?.robotsTxtState,
      pageFetchState: result?.pageFetchState,
      rawResponse: data,
    };
  } catch (err: any) {
    return {
      inspectionUrl: targetUrl,
      verdict: 'ERROR',
      message: err.message || 'Error communicating with Google Search Console API',
    };
  }
};

// ─── 8. HELPER: GOOGLE SERVICE ACCOUNT JWT TOKEN GENERATOR ──────────────────

async function getGoogleServiceAccountAccessToken(
  clientEmail: string,
  privateKeyPem: string,
  scopes: string[]
): Promise<string | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
      iss: clientEmail,
      scope: scopes.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const b64Claim = Buffer.from(JSON.stringify(claimSet)).toString('base64url');
    const signatureInput = `${b64Header}.${b64Claim}`;

    // Normalize private key string
    let formattedKey = privateKeyPem.replace(/\\n/g, '\n');
    if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
      formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
    }

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signatureInput);
    const signature = signer.sign(formattedKey, 'base64url');
    const jwt = `${signatureInput}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!res.ok) {
      console.error('Google OAuth token error:', await res.text());
      return null;
    }

    const tokenData: any = await res.json();
    return tokenData.access_token || null;
  } catch (err) {
    console.error('Failed to create Service Account JWT:', err);
    return null;
  }
}
