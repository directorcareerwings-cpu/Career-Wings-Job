"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicEducationMaster = exports.getPublicSettings = exports.getPublicCoolPlaces = exports.getRobots = exports.getSitemap = exports.getLocationBySlug = exports.getLocations = exports.getCategoryBySlug = exports.getCategories = exports.getCompanyJobs = exports.getCompanyBySlug = exports.getTopCompanies = exports.getCompanies = exports.getFeaturedJobs = exports.getPublicPackages = exports.getStats = void 0;
const prisma_1 = require("../lib/prisma");
const response_1 = require("../lib/response");
const errors_1 = require("../lib/errors");
const memoryCache_1 = require("../lib/memoryCache");
const mysql_auto_init_1 = require("../lib/mysql-auto-init");
const admin_controller_1 = require("./admin.controller");
const getStats = async (req, res, next) => {
    try {
        const [totalJobs, totalCompanies, totalCandidates] = await Promise.all([
            prisma_1.prisma.job.count({ where: { status: { in: ['PUBLISHED', 'FEATURED'] }, deletedAt: null } }),
            prisma_1.prisma.company.count({ where: { deletedAt: null } }),
            prisma_1.prisma.candidate.count({ where: { deletedAt: null } }),
        ]);
        (0, response_1.sendSuccess)(res, {
            jobs: totalJobs || 1250,
            companies: totalCompanies || 450,
            candidates: totalCandidates || 15000,
            placed: 3800,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getStats = getStats;
const getPublicPackages = async (req, res, next) => {
    try {
        const { type } = req.query;
        const where = { isActive: true };
        if (type)
            where.type = String(type).toUpperCase();
        let packages;
        try {
            packages = await prisma_1.prisma.package.findMany({
                where,
                orderBy: { sortOrder: 'asc' },
            });
        }
        catch (dbErr) {
            if (dbErr?.message?.includes('invalid datetime') || dbErr?.message?.includes('Value out of range')) {
                await (0, mysql_auto_init_1.sanitizeMysqlDatetimes)().catch(() => { });
                packages = await prisma_1.prisma.package.findMany({
                    where,
                    orderBy: { sortOrder: 'asc' },
                });
            }
            else {
                throw dbErr;
            }
        }
        (0, response_1.sendSuccess)(res, packages);
    }
    catch (error) {
        next(error);
    }
};
exports.getPublicPackages = getPublicPackages;
const getFeaturedJobs = async (req, res, next) => {
    try {
        const jobs = await prisma_1.prisma.job.findMany({
            where: {
                status: { in: ['PUBLISHED', 'FEATURED'] },
                deletedAt: null,
            },
            include: {
                company: { select: { name: true, logo: true, slug: true } },
                location: { select: { city: true, state: true } },
                category: { select: { name: true, slug: true } },
            },
            orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
            take: 8,
        });
        (0, response_1.sendSuccess)(res, jobs);
    }
    catch (error) {
        next(error);
    }
};
exports.getFeaturedJobs = getFeaturedJobs;
const getCompanyActiveJobsWhere = (companyId) => ({
    status: { in: ['PUBLISHED', 'FEATURED'] },
    deletedAt: null,
    OR: [
        { companyId },
        { companyId: null, employer: { companyId } },
    ],
});
/**
 * Computes accurate open-job counts per company, including jobs linked via the
 * employer's companyId when Job.companyId was left null.
 */
const attachCompanyJobCounts = async (companies) => {
    if (companies.length === 0)
        return companies;
    const companyIds = companies.map((c) => c.id);
    const matchingJobs = await prisma_1.prisma.job.findMany({
        where: {
            status: { in: ['PUBLISHED', 'FEATURED'] },
            deletedAt: null,
            OR: [
                { companyId: { in: companyIds } },
                { companyId: null, employer: { companyId: { in: companyIds } } },
            ],
        },
        select: {
            companyId: true,
            employer: { select: { companyId: true } },
        },
    });
    const countMap = new Map();
    for (const job of matchingJobs) {
        const cid = job.companyId || job.employer?.companyId;
        if (cid) {
            countMap.set(cid, (countMap.get(cid) || 0) + 1);
        }
    }
    return companies.map((comp) => {
        const totalJobs = countMap.get(comp.id) ?? 0;
        return {
            ...comp,
            totalJobs,
            _count: { ...(comp._count || {}), jobs: totalJobs },
        };
    });
};
const getCompanies = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '12', 10);
        const skip = (page - 1) * limit;
        const { q, industry } = req.query;
        const where = { deletedAt: null };
        if (q)
            where.name = { contains: String(q) };
        if (industry)
            where.industry = String(industry);
        const [companies, total] = await Promise.all([
            prisma_1.prisma.company.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            jobs: { where: { status: { in: ['PUBLISHED', 'FEATURED'] }, deletedAt: null } },
                        },
                    },
                },
                orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
                skip,
                take: limit,
            }),
            prisma_1.prisma.company.count({ where }),
        ]);
        const enrichedCompanies = await attachCompanyJobCounts(companies);
        (0, response_1.sendPaginated)(res, enrichedCompanies, total, page, limit);
    }
    catch (error) {
        next(error);
    }
};
exports.getCompanies = getCompanies;
const getTopCompanies = async (req, res, next) => {
    try {
        const companies = await prisma_1.prisma.company.findMany({
            where: { deletedAt: null },
            include: {
                _count: {
                    select: {
                        jobs: { where: { status: { in: ['PUBLISHED', 'FEATURED'] }, deletedAt: null } },
                    },
                },
            },
            orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
            take: 8,
        });
        const enrichedCompanies = await attachCompanyJobCounts(companies);
        (0, response_1.sendSuccess)(res, enrichedCompanies);
    }
    catch (error) {
        next(error);
    }
};
exports.getTopCompanies = getTopCompanies;
const getCompanyBySlug = async (req, res, next) => {
    try {
        const company = await prisma_1.prisma.company.findUnique({
            where: { slug: req.params.slug },
        });
        if (!company || company.deletedAt) {
            throw new errors_1.AppError('Company not found', 404);
        }
        const jobs = await prisma_1.prisma.job.findMany({
            where: getCompanyActiveJobsWhere(company.id),
            include: { location: true, category: true },
            orderBy: { publishedAt: 'desc' },
        });
        (0, response_1.sendSuccess)(res, {
            ...company,
            totalJobs: jobs.length,
            jobs,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getCompanyBySlug = getCompanyBySlug;
const getCompanyJobs = async (req, res, next) => {
    try {
        const company = await prisma_1.prisma.company.findUnique({ where: { slug: req.params.slug } });
        if (!company)
            throw new errors_1.AppError('Company not found', 404);
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const skip = (page - 1) * limit;
        const where = getCompanyActiveJobsWhere(company.id);
        const [jobs, total] = await Promise.all([
            prisma_1.prisma.job.findMany({
                where,
                include: { location: true, category: true, company: true },
                orderBy: { publishedAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.job.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, jobs, total, page, limit);
    }
    catch (error) {
        next(error);
    }
};
exports.getCompanyJobs = getCompanyJobs;
const getCategories = async (req, res, next) => {
    try {
        const cached = (0, memoryCache_1.getCached)('public_categories');
        if (cached) {
            (0, response_1.sendSuccess)(res, cached);
            return;
        }
        const categories = await prisma_1.prisma.category.findMany({
            where: { isActive: true },
            include: {
                _count: {
                    select: {
                        jobs: { where: { status: { in: ['PUBLISHED', 'FEATURED'] }, deletedAt: null } },
                    },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });
        (0, memoryCache_1.setCached)('public_categories', categories, 60);
        (0, response_1.sendSuccess)(res, categories);
    }
    catch (error) {
        next(error);
    }
};
exports.getCategories = getCategories;
const getCategoryBySlug = async (req, res, next) => {
    try {
        const category = await prisma_1.prisma.category.findUnique({
            where: { slug: req.params.slug },
            include: {
                jobs: {
                    where: { status: { in: ['PUBLISHED', 'FEATURED'] }, deletedAt: null },
                    include: { company: true, location: true },
                    take: 20,
                },
            },
        });
        if (!category)
            throw new errors_1.AppError('Category not found', 404);
        (0, response_1.sendSuccess)(res, category);
    }
    catch (error) {
        next(error);
    }
};
exports.getCategoryBySlug = getCategoryBySlug;
const getLocations = async (req, res, next) => {
    try {
        const cached = (0, memoryCache_1.getCached)('public_locations');
        if (cached) {
            (0, response_1.sendSuccess)(res, cached);
            return;
        }
        const locations = await prisma_1.prisma.location.findMany({
            include: {
                _count: {
                    select: {
                        jobs: { where: { status: { in: ['PUBLISHED', 'FEATURED'] }, deletedAt: null } },
                    },
                },
            },
            orderBy: [{ isPopular: 'desc' }, { city: 'asc' }],
        });
        (0, memoryCache_1.setCached)('public_locations', locations, 60);
        (0, response_1.sendSuccess)(res, locations);
    }
    catch (error) {
        next(error);
    }
};
exports.getLocations = getLocations;
const getLocationBySlug = async (req, res, next) => {
    try {
        const location = await prisma_1.prisma.location.findUnique({
            where: { slug: req.params.slug },
            include: {
                jobs: {
                    where: { status: { in: ['PUBLISHED', 'FEATURED'] }, deletedAt: null },
                    include: { company: true, category: true },
                    take: 20,
                },
            },
        });
        if (!location)
            throw new errors_1.AppError('Location not found', 404);
        (0, response_1.sendSuccess)(res, location);
    }
    catch (error) {
        next(error);
    }
};
exports.getLocationBySlug = getLocationBySlug;
const getSitemap = async (req, res, next) => {
    try {
        const [jobs, companies, categories, locations] = await Promise.all([
            prisma_1.prisma.job.findMany({
                where: { status: { in: ['PUBLISHED', 'FEATURED'] }, deletedAt: null },
                select: { slug: true, updatedAt: true },
            }),
            prisma_1.prisma.company.findMany({
                where: { deletedAt: null },
                select: { slug: true, updatedAt: true },
            }),
            prisma_1.prisma.category.findMany({
                where: { isActive: true },
                select: { slug: true, createdAt: true },
            }),
            prisma_1.prisma.location.findMany({
                select: { slug: true, createdAt: true },
            }),
        ]);
        const baseUrl = process.env.CLIENT_URL || 'https://careerwings.in';
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        xml += `  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
        xml += `  <url><loc>${baseUrl}/jobs</loc><changefreq>hourly</changefreq><priority>0.9</priority></url>\n`;
        xml += `  <url><loc>${baseUrl}/companies</loc><changefreq>daily</changefreq><priority>0.8</priority></url>\n`;
        xml += `  <url><loc>${baseUrl}/pricing</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
        jobs.forEach(j => {
            xml += `  <url><loc>${baseUrl}/jobs/${j.slug}</loc><lastmod>${j.updatedAt.toISOString()}</lastmod><priority>0.8</priority></url>\n`;
        });
        companies.forEach(c => {
            xml += `  <url><loc>${baseUrl}/companies/${c.slug}</loc><lastmod>${c.updatedAt.toISOString()}</lastmod><priority>0.7</priority></url>\n`;
        });
        categories.forEach(cat => {
            xml += `  <url><loc>${baseUrl}/categories/${cat.slug}</loc><priority>0.6</priority></url>\n`;
        });
        locations.forEach(loc => {
            xml += `  <url><loc>${baseUrl}/locations/${loc.slug}</loc><priority>0.6</priority></url>\n`;
        });
        xml += `</urlset>`;
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    }
    catch (error) {
        next(error);
    }
};
exports.getSitemap = getSitemap;
const getRobots = (req, res) => {
    const baseUrl = (process.env.CLIENT_URL || 'https://careerwings.in')
        .replace(/\/+$/, '')
        .replace(/^https?:\/\/www\.careerwings\.in/i, 'https://careerwings.in');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.type('text/plain');
    res.send(`User-agent: *\nAllow: /\nAllow: /api/jobs\nAllow: /api/companies\nAllow: /api/categories\nAllow: /api/locations\nAllow: /api/blog\nAllow: /api/settings\nAllow: /api/stats\nAllow: /api/packages\nAllow: /api/cool-places\nAllow: /api/education-master\nDisallow: /api/admin/\nDisallow: /api/auth/\nDisallow: /api/candidate/\nDisallow: /api/employer/\nDisallow: /api/payments/\nDisallow: /api/chat/\nDisallow: /admin/\nDisallow: /dashboard/\nDisallow: /employer/\nDisallow: /candidate/\nDisallow: /checkout\nDisallow: /forgot-password\nDisallow: /reset-password\n\nSitemap: ${baseUrl}/sitemap.xml\nSitemap: ${baseUrl}/sitemap-index.xml`);
};
exports.getRobots = getRobots;
// ---- COOL PLACES TO WORK ----
const DEFAULT_COOL_PLACES = [
    { name: 'Tata Consultancy', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Tata_Consultancy_Services_Logo.svg', website: 'https://www.tcs.com/careers', displayOrder: 1 },
    { name: 'Wipro', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Wipro_Primary_Logo_Color_RGB.svg', website: 'https://careers.wipro.com', displayOrder: 2 },
    { name: 'Infosys', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Infosys_logo.svg', website: 'https://www.infosys.com/careers', displayOrder: 3 },
    { name: 'Capgemini', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Cap_gemini_Logo_2COL_RGB.svg', website: 'https://www.capgemini.com/in-en/careers', displayOrder: 4 },
    { name: 'HCL Technologies', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/HCL_Technologies_logo.svg', website: 'https://www.hcltech.com/careers', displayOrder: 5 },
    { name: 'Kotak Mahindra', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Kotak_Mahindra_Bank_logo.svg', website: 'https://www.kotak.com/en/general/careers.html', displayOrder: 6 },
    { name: 'NTT Data', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/NTT_DATA_Logo.svg', website: 'https://in.nttdata.com/en/careers', displayOrder: 7 },
    { name: 'LTIMindtree', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/LTIMindtree_Logo.svg/1200px-LTIMindtree_Logo.svg.png', website: 'https://www.ltimindtree.com/careers', displayOrder: 8 },
    { name: 'Oil India Limited', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/97/Oil_India_Limited_logo.png', website: 'https://www.oil-india.com/careers', displayOrder: 9 },
    { name: 'HDFC Bank', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/28/HDFC_Bank_Logo.svg', website: 'https://www.hdfcbank.com/content/bbp/repositories/723fb80a-2dde-42a3-9793-7ae1be57c87f/careers', displayOrder: 10 },
];
const getPublicCoolPlaces = async (req, res, next) => {
    try {
        const cached = (0, memoryCache_1.getCached)('public_cool_places');
        if (cached) {
            (0, response_1.sendSuccess)(res, cached);
            return;
        }
        let logos = await prisma_1.prisma.coolPlaceLogo.findMany({
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
        });
        // Auto-seed defaults if no logos exist
        if (logos.length === 0) {
            await prisma_1.prisma.coolPlaceLogo.createMany({
                data: DEFAULT_COOL_PLACES.map(d => ({ ...d, isActive: true })),
            });
            logos = await prisma_1.prisma.coolPlaceLogo.findMany({
                where: { isActive: true },
                orderBy: { displayOrder: 'asc' },
            });
        }
        (0, memoryCache_1.setCached)('public_cool_places', logos, 60);
        (0, response_1.sendSuccess)(res, logos);
    }
    catch (error) {
        next(error);
    }
};
exports.getPublicCoolPlaces = getPublicCoolPlaces;
const getPublicSettings = async (req, res, next) => {
    try {
        const cached = (0, memoryCache_1.getCached)('public_settings');
        if (cached) {
            (0, response_1.sendSuccess)(res, cached);
            return;
        }
        const settings = await prisma_1.prisma.adminSetting.findMany({
            where: {
                group: { in: ['GENERAL', 'CMS', 'HERO', 'SEO'] },
            },
        });
        const map = {};
        settings.forEach((s) => {
            map[s.key] = s.value;
        });
        (0, memoryCache_1.setCached)('public_settings', map, 60);
        (0, response_1.sendSuccess)(res, map);
    }
    catch (error) {
        next(error);
    }
};
exports.getPublicSettings = getPublicSettings;
const getPublicEducationMaster = async (req, res, next) => {
    try {
        const data = await (0, admin_controller_1.getEducationMasterData)();
        (0, response_1.sendSuccess)(res, data, 'Education and degree master list');
    }
    catch (error) {
        next(error);
    }
};
exports.getPublicEducationMaster = getPublicEducationMaster;
//# sourceMappingURL=public.controller.js.map