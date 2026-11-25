"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderSeoHtmlForPath = exports.isCrawlerUserAgent = exports.CRAWLER_USER_AGENT_REGEX = exports.getClientIndexHtmlTemplate = exports.FALLBACK_SEO_HTML = exports.resolveClientDistDir = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../lib/prisma");
const seo_service_1 = require("./seo.service");
const resolveClientDistDir = () => {
    const potentialClientDirs = [
        path_1.default.join(process.cwd(), 'client', 'dist'),
        path_1.default.resolve(__dirname, '../../../client/dist'),
        path_1.default.resolve(__dirname, '../../client/dist'),
        path_1.default.resolve(__dirname, '../client/dist'),
        path_1.default.join(process.cwd(), 'dist'),
    ];
    return potentialClientDirs.find((dir) => fs_1.default.existsSync(path_1.default.join(dir, 'index.html')));
};
exports.resolveClientDistDir = resolveClientDistDir;
exports.FALLBACK_SEO_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Career Wings — Jobs in Guwahati, Assam &amp; Northeast India</title>
  </head>
  <body><div id="root"></div></body>
</html>`;
const getClientIndexHtmlTemplate = () => {
    const clientDistDir = (0, exports.resolveClientDistDir)();
    if (!clientDistDir)
        return exports.FALLBACK_SEO_HTML;
    try {
        return fs_1.default.readFileSync(path_1.default.join(clientDistDir, 'index.html'), 'utf-8');
    }
    catch {
        return exports.FALLBACK_SEO_HTML;
    }
};
exports.getClientIndexHtmlTemplate = getClientIndexHtmlTemplate;
const SITE_NAME = 'Career Wings';
const DEFAULT_SITE_URL = 'https://careerwings.in';
const DEFAULT_OG_IMAGE = `${DEFAULT_SITE_URL}/og-image.jpg`;
exports.CRAWLER_USER_AGENT_REGEX = /(Googlebot|Google-InspectionTool|AdsBot-Google|Storebot-Google|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|facebot|facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Applebot|Pinterestbot|Discordbot)/i;
const isCrawlerUserAgent = (userAgent) => Boolean(userAgent && exports.CRAWLER_USER_AGENT_REGEX.test(userAgent));
exports.isCrawlerUserAgent = isCrawlerUserAgent;
const escapeHtml = (str) => String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const toAbsoluteUrl = (rawUrl, siteUrl, fallback = DEFAULT_OG_IMAGE) => {
    if (!rawUrl || !rawUrl.trim())
        return fallback;
    const trimmed = rawUrl.trim();
    if (/^https?:\/\//i.test(trimmed))
        return trimmed;
    return `${siteUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};
const normalizePath = (rawPath) => {
    const pathOnly = String(rawPath || '/').split('?')[0].split('#')[0] || '/';
    const withLeading = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
    return withLeading !== '/' ? withLeading.replace(/\/+$/, '') : '/';
};
const PRIVATE_ROUTE_REGEX = /^\/(admin|employer|dashboard|candidate|profile|my-applications|saved-jobs|job-alerts|notifications|subscription|my-package|payments|settings|messages|career-tools|checkout|forgot-password|reset-password)(\/|$)/i;
const buildHomeSchemas = (siteUrl) => [
    {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: `${siteUrl}/`,
        logo: `${siteUrl}/images/logo.png`,
        description: "Northeast India's premier job portal connecting skilled candidates with verified employers across Assam, Meghalaya, and Pan-India.",
        address: {
            '@type': 'PostalAddress',
            streetAddress: 'Zoo Road Tiniali, Hriday Ranjan Path, By Lane 6, House No 5',
            addressLocality: 'Guwahati',
            addressRegion: 'Assam',
            postalCode: '781003',
            addressCountry: 'IN',
        },
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+91-8876211864',
            contactType: 'customer support',
            email: 'info@careerwings.in',
            areaServed: 'IN',
        },
    },
    {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: SITE_NAME,
        publisher: { '@id': `${siteUrl}/#organization` },
        potentialAction: {
            '@type': 'SearchAction',
            target: `${siteUrl}/jobs?keyword={search_term_string}`,
            'query-input': 'required name=search_term_string',
        },
    },
];
const renderSeoHtmlForPath = async (rawPath, htmlTemplate) => {
    const settings = await (0, seo_service_1.getOrCreateSeoGlobalSettings)().catch(() => null);
    const siteUrl = (0, seo_service_1.resolveProductionSiteUrl)(settings?.siteUrl);
    const cleanPath = normalizePath(rawPath);
    const verificationRow = await prisma_1.prisma.adminSetting
        .findUnique({ where: { key: 'GOOGLE_SITE_VERIFICATION' } })
        .catch(() => null);
    const verificationToken = verificationRow?.value?.trim() || '';
    const seoPage = await prisma_1.prisma.seoPage
        .findUnique({ where: { url: cleanPath } })
        .catch(() => null);
    let resolved = {
        statusCode: 200,
        title: seoPage?.seoTitle || 'Jobs in Guwahati, Assam & Northeast India | Career Wings',
        description: seoPage?.seoDescription ||
            'Career Wings is Northeast India’s premier job portal. Browse thousands of verified jobs in Guwahati, Assam & Northeast India with zero placement fees.',
        canonicalUrl: `${siteUrl}${seoPage?.canonicalUrl || cleanPath}`,
        robots: seoPage && !seoPage.isIndexable
            ? 'noindex,nofollow'
            : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
        ogType: 'website',
        ogImage: toAbsoluteUrl(seoPage?.ogImage, siteUrl, `${siteUrl}/og-image.jpg`),
        schemas: cleanPath === '/' ? buildHomeSchemas(siteUrl) : [],
    };
    const categoryAltMatch = cleanPath.match(/^\/jobs\/category\/([^/]+)$/);
    const jobMatch = categoryAltMatch ? null : cleanPath.match(/^\/jobs\/([^/]+)$/);
    const companyMatch = cleanPath.match(/^\/companies\/([^/]+)$/);
    const blogMatch = cleanPath.match(/^\/blog\/([^/]+)$/);
    const categoryMatch = categoryAltMatch || cleanPath.match(/^\/categories\/([^/]+)$/);
    const locationSlugMatch = cleanPath.match(/^\/locations\/([^/]+)$/);
    const jobsInMatch = cleanPath.match(/^\/jobs-in-([^/]+)$/);
    if (PRIVATE_ROUTE_REGEX.test(cleanPath)) {
        resolved.robots = 'noindex,nofollow';
    }
    else if (jobMatch) {
        const slug = decodeURIComponent(jobMatch[1]);
        const job = await prisma_1.prisma.job
            .findUnique({
            where: { slug },
            include: { company: true, location: true, category: true },
        })
            .catch(() => null);
        if (!job || job.deletedAt) {
            resolved = {
                ...resolved,
                statusCode: 404,
                title: 'Job Not Found | Career Wings',
                description: 'This job listing is no longer available on Career Wings.',
                robots: 'noindex,nofollow',
                schemas: [],
            };
        }
        else {
            const isExpired = (job.status !== 'PUBLISHED' && job.status !== 'FEATURED') ||
                Boolean(job.applicationDeadline && new Date(job.applicationDeadline).getTime() < Date.now());
            const companyName = job.company?.name || 'Career Wings Employer';
            const city = job.city || job.location?.city || 'Guwahati';
            const state = job.state || job.location?.state || 'Assam';
            resolved = {
                statusCode: 200,
                title: seoPage?.seoTitle || job.seoTitle || `${job.title} at ${companyName} | Career Wings`,
                description: seoPage?.seoDescription ||
                    job.seoDescription ||
                    `${job.title} vacancy at ${companyName} in ${city}, ${state}. Apply online on Career Wings.`,
                canonicalUrl: `${siteUrl}/jobs/${job.slug}`,
                robots: isExpired
                    ? 'noindex,nofollow'
                    : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
                ogType: 'website',
                ogImage: toAbsoluteUrl(job.company?.logo || seoPage?.ogImage, siteUrl, `${siteUrl}/og-image.jpg`),
                schemas: isExpired
                    ? [(0, seo_service_1.buildJobBreadcrumbsSchema)(job, siteUrl)]
                    : [(0, seo_service_1.buildJobPostingSchema)(job, siteUrl), (0, seo_service_1.buildJobBreadcrumbsSchema)(job, siteUrl)],
            };
        }
    }
    else if (companyMatch) {
        const slug = decodeURIComponent(companyMatch[1]);
        const company = await prisma_1.prisma.company
            .findUnique({ where: { slug } })
            .catch(() => null);
        if (!company || company.deletedAt) {
            resolved = {
                ...resolved,
                statusCode: 404,
                title: 'Company Not Found | Career Wings',
                description: 'The requested employer profile was not found on Career Wings.',
                robots: 'noindex,nofollow',
                schemas: [],
            };
        }
        else {
            const compUrl = `${siteUrl}/companies/${company.slug}`;
            resolved = {
                statusCode: 200,
                title: seoPage?.seoTitle || `${company.name} Careers & Job Vacancies | Career Wings`,
                description: seoPage?.seoDescription ||
                    company.description?.slice(0, 155) ||
                    `Explore open job vacancies at ${company.name} in Guwahati & Northeast India on Career Wings.`,
                canonicalUrl: compUrl,
                robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
                ogType: 'website',
                ogImage: toAbsoluteUrl(company.logo, siteUrl, `${siteUrl}/og-image.jpg`),
                schemas: [
                    {
                        '@context': 'https://schema.org',
                        '@type': 'Organization',
                        name: company.name,
                        url: company.website || compUrl,
                        logo: toAbsoluteUrl(company.logo, siteUrl, `${siteUrl}/images/logo.png`),
                        description: company.description || `Careers at ${company.name} on Career Wings.`,
                    },
                    {
                        '@context': 'https://schema.org',
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
                            { '@type': 'ListItem', position: 2, name: 'Companies', item: `${siteUrl}/companies` },
                            { '@type': 'ListItem', position: 3, name: company.name, item: compUrl },
                        ],
                    },
                ],
            };
        }
    }
    else if (blogMatch) {
        const slug = decodeURIComponent(blogMatch[1]);
        const post = await prisma_1.prisma.blogPost
            .findUnique({ where: { slug } })
            .catch(() => null);
        if (!post || !post.isPublished) {
            resolved = {
                ...resolved,
                statusCode: 404,
                title: 'Article Not Found | Career Wings Blog',
                description: 'The requested career guide or blog article was not found.',
                robots: 'noindex,nofollow',
                schemas: [],
            };
        }
        else {
            const postUrl = `${siteUrl}/blog/${post.slug}`;
            const coverUrl = toAbsoluteUrl(post.coverImage, siteUrl, `${siteUrl}/og-image.jpg`);
            resolved = {
                statusCode: 200,
                title: seoPage?.seoTitle || `${post.title} | Career Wings Blog`,
                description: seoPage?.seoDescription || post.excerpt.slice(0, 160),
                canonicalUrl: postUrl,
                robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
                ogType: 'article',
                ogImage: coverUrl,
                schemas: [
                    {
                        '@context': 'https://schema.org',
                        '@type': 'BlogPosting',
                        headline: post.title,
                        description: post.excerpt,
                        image: coverUrl,
                        datePublished: (post.publishedAt || post.createdAt).toISOString(),
                        dateModified: post.updatedAt.toISOString(),
                        author: {
                            '@type': 'Person',
                            name: post.authorName || 'Career Wings Editorial Team',
                        },
                        publisher: {
                            '@type': 'Organization',
                            name: SITE_NAME,
                            logo: { '@type': 'ImageObject', url: `${siteUrl}/images/logo.png` },
                        },
                        mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
                    },
                    {
                        '@context': 'https://schema.org',
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
                            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
                            { '@type': 'ListItem', position: 3, name: post.title, item: postUrl },
                        ],
                    },
                ],
            };
        }
    }
    else if (categoryMatch) {
        const slug = decodeURIComponent(categoryMatch[1]);
        const category = await prisma_1.prisma.category.findUnique({ where: { slug } }).catch(() => null);
        if (category) {
            const catUrl = `${siteUrl}${cleanPath}`;
            resolved.title = seoPage?.seoTitle || `${category.name} Jobs in Guwahati & Northeast | Career Wings`;
            resolved.description =
                seoPage?.seoDescription ||
                    `Find verified ${category.name} job openings in Guwahati, Assam & Northeast India on Career Wings.`;
            resolved.canonicalUrl = catUrl;
            resolved.schemas = [
                {
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    itemListElement: [
                        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
                        { '@type': 'ListItem', position: 2, name: 'Categories', item: `${siteUrl}/categories` },
                        { '@type': 'ListItem', position: 3, name: category.name, item: catUrl },
                    ],
                },
            ];
        }
    }
    else if (locationSlugMatch || jobsInMatch) {
        const slugOrCity = decodeURIComponent((locationSlugMatch || jobsInMatch)[1]);
        const location = await prisma_1.prisma.location
            .findFirst({
            where: {
                OR: [
                    { slug: slugOrCity },
                    { city: { contains: slugOrCity.replace(/-/g, ' ') } },
                ],
            },
        })
            .catch(() => null);
        const cityLabel = location?.city || slugOrCity.replace(/-/g, ' ');
        const stateLabel = location?.state || 'Assam';
        const locUrl = `${siteUrl}${cleanPath}`;
        resolved.title = seoPage?.seoTitle || `Jobs in ${cityLabel}, ${stateLabel} | Career Wings`;
        resolved.description =
            seoPage?.seoDescription ||
                `Explore verified job vacancies in ${cityLabel}, ${stateLabel}. Direct recruitment with zero placement fees on Career Wings.`;
        resolved.canonicalUrl = locUrl;
        resolved.schemas = [
            {
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
                    { '@type': 'ListItem', position: 2, name: 'Locations', item: `${siteUrl}/locations` },
                    { '@type': 'ListItem', position: 3, name: `${cityLabel}, ${stateLabel}`, item: locUrl },
                ],
            },
        ];
    }
    else if (seoPage?.structuredData) {
        try {
            const parsed = JSON.parse(seoPage.structuredData);
            resolved.schemas = Array.isArray(parsed) ? parsed : [parsed];
        }
        catch { }
    }
    let html = htmlTemplate;
    const safeTitle = escapeHtml(resolved.title);
    const safeDesc = escapeHtml(resolved.description);
    const safeCanonical = escapeHtml(resolved.canonicalUrl);
    const safeImage = escapeHtml(resolved.ogImage);
    const safeRobots = escapeHtml(resolved.robots);
    // Strip baseline meta/title/canonical/schema tags before injecting route-accurate metadata
    html = html
        .replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`)
        .replace(/<meta\s+name="description"[^>]*>/gi, '')
        .replace(/<meta\s+name="robots"[^>]*>/gi, '')
        .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
        .replace(/<meta\s+property="og:(title|description|type|url|image)"[^>]*>/gi, '')
        .replace(/<meta\s+name="twitter:(title|description|image)"[^>]*>/gi, '')
        .replace(/<meta\s+name="google-site-verification"[^>]*>/gi, '')
        .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');
    const schemaScripts = resolved.schemas
        .map((s) => `<script type="application/ld+json">${JSON.stringify(s).replace(/<\/script/gi, '<\\/script')}</script>`)
        .join('\n    ');
    const injectedTags = [
        `<meta name="description" content="${safeDesc}" />`,
        `<meta name="robots" content="${safeRobots}" />`,
        `<link rel="canonical" href="${safeCanonical}" />`,
        verificationToken ? `<meta name="google-site-verification" content="${escapeHtml(verificationToken)}" />` : '',
        `<meta property="og:title" content="${safeTitle}" />`,
        `<meta property="og:description" content="${safeDesc}" />`,
        `<meta property="og:type" content="${resolved.ogType}" />`,
        `<meta property="og:url" content="${safeCanonical}" />`,
        `<meta property="og:image" content="${safeImage}" />`,
        `<meta name="twitter:title" content="${safeTitle}" />`,
        `<meta name="twitter:description" content="${safeDesc}" />`,
        `<meta name="twitter:image" content="${safeImage}" />`,
        schemaScripts,
    ]
        .filter(Boolean)
        .join('\n    ');
    html = html.replace('</head>', `    ${injectedTags}\n  </head>`);
    return { statusCode: resolved.statusCode, html };
};
exports.renderSeoHtmlForPath = renderSeoHtmlForPath;
//# sourceMappingURL=seoRenderer.service.js.map