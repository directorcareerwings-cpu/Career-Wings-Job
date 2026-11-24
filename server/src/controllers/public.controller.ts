import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendPaginated } from '../lib/response';
import { AppError } from '../lib/errors';
import { getCached, setCached } from '../lib/memoryCache';
import { sanitizeMysqlDatetimes } from '../lib/mysql-auto-init';
import { getEducationMasterData } from './admin.controller';

export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [totalJobs, totalCompanies, totalCandidates] = await Promise.all([
      prisma.job.count({ where: { status: { in: ['PUBLISHED', 'FEATURED'] }, deletedAt: null } }),
      prisma.company.count({ where: { deletedAt: null } }),
      prisma.candidate.count({ where: { deletedAt: null } }),
    ]);

    sendSuccess(res, {
      jobs: totalJobs || 1250,
      companies: totalCompanies || 450,
      candidates: totalCandidates || 15000,
      placed: 3800,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicPackages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type } = req.query;
    const where: Record<string, unknown> = { isActive: true };
    if (type) where.type = String(type).toUpperCase();

    let packages;
    try {
      packages = await prisma.package.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
      });
    } catch (dbErr: any) {
      if (dbErr?.message?.includes('invalid datetime') || dbErr?.message?.includes('Value out of range')) {
        await sanitizeMysqlDatetimes().catch(() => {});
        packages = await prisma.package.findMany({
          where,
          orderBy: { sortOrder: 'asc' },
        });
      } else {
        throw dbErr;
      }
    }
    sendSuccess(res, packages);
  } catch (error) {
    next(error);
  }
};

export const getFeaturedJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const jobs = await prisma.job.findMany({
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
    sendSuccess(res, jobs);
  } catch (error) {
    next(error);
  }
};

export const getCompanies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '12', 10);
    const skip = (page - 1) * limit;
    const { q, industry } = req.query;

    const where: Record<string, unknown> = { deletedAt: null };
    if (q) where.name = { contains: String(q) };
    if (industry) where.industry = String(industry);

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
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
      prisma.company.count({ where }),
    ]);

    sendPaginated(res, companies, total, page, limit);
  } catch (error) {
    next(error);
  }
};

export const getTopCompanies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companies = await prisma.company.findMany({
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
    sendSuccess(res, companies);
  } catch (error) {
    next(error);
  }
};

export const getCompanyBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const company = await prisma.company.findUnique({
      where: { slug: req.params.slug },
      include: {
        jobs: {
          where: { status: { in: ['PUBLISHED', 'FEATURED'] }, deletedAt: null },
          include: { location: true, category: true },
          orderBy: { publishedAt: 'desc' },
        },
      },
    });

    if (!company || company.deletedAt) {
      throw new AppError('Company not found', 404);
    }

    sendSuccess(res, company);
  } catch (error) {
    next(error);
  }
};

export const getCompanyJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const company = await prisma.company.findUnique({ where: { slug: req.params.slug } });
    if (!company) throw new AppError('Company not found', 404);

    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const skip = (page - 1) * limit;

    const where = {
      companyId: company.id,
      status: { in: ['PUBLISHED', 'FEATURED'] },
      deletedAt: null,
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: { location: true, category: true, company: true },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    sendPaginated(res, jobs, total, page, limit);
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cached = getCached<any[]>('public_categories');
    if (cached) {
      sendSuccess(res, cached);
      return;
    }

    const categories = await prisma.category.findMany({
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
    setCached('public_categories', categories, 60);
    sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
};

export const getCategoryBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: {
        jobs: {
          where: { status: { in: ['PUBLISHED', 'FEATURED'] }, deletedAt: null },
          include: { company: true, location: true },
          take: 20,
        },
      },
    });
    if (!category) throw new AppError('Category not found', 404);
    sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
};

export const getLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cached = getCached<any[]>('public_locations');
    if (cached) {
      sendSuccess(res, cached);
      return;
    }

    const locations = await prisma.location.findMany({
      include: {
        _count: {
          select: {
            jobs: { where: { status: { in: ['PUBLISHED', 'FEATURED'] }, deletedAt: null } },
          },
        },
      },
      orderBy: [{ isPopular: 'desc' }, { city: 'asc' }],
    });
    setCached('public_locations', locations, 60);
    sendSuccess(res, locations);
  } catch (error) {
    next(error);
  }
};

export const getLocationBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const location = await prisma.location.findUnique({
      where: { slug: req.params.slug },
      include: {
        jobs: {
          where: { status: { in: ['PUBLISHED', 'FEATURED'] }, deletedAt: null },
          include: { company: true, category: true },
          take: 20,
        },
      },
    });
    if (!location) throw new AppError('Location not found', 404);
    sendSuccess(res, location);
  } catch (error) {
    next(error);
  }
};

export const getSitemap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [jobs, companies, categories, locations] = await Promise.all([
      prisma.job.findMany({
        where: { status: { in: ['PUBLISHED', 'FEATURED'] }, deletedAt: null },
        select: { slug: true, updatedAt: true },
      }),
      prisma.company.findMany({
        where: { deletedAt: null },
        select: { slug: true, updatedAt: true },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        select: { slug: true, createdAt: true },
      }),
      prisma.location.findMany({
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
  } catch (error) {
    next(error);
  }
};

export const getRobots = (req: Request, res: Response): void => {
  const baseUrl = process.env.CLIENT_URL || 'https://careerwings.in';
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /dashboard/\nDisallow: /employer/\nSitemap: ${baseUrl}/sitemap.xml`);
};

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

export const getPublicCoolPlaces = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cached = getCached<any[]>('public_cool_places');
    if (cached) {
      sendSuccess(res, cached);
      return;
    }

    let logos = await prisma.coolPlaceLogo.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    // Auto-seed defaults if no logos exist
    if (logos.length === 0) {
      await prisma.coolPlaceLogo.createMany({
        data: DEFAULT_COOL_PLACES.map(d => ({ ...d, isActive: true })),
      });
      logos = await prisma.coolPlaceLogo.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      });
    }

    setCached('public_cool_places', logos, 60);
    sendSuccess(res, logos);
  } catch (error) {
    next(error);
  }
};

export const getPublicSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cached = getCached<Record<string, string>>('public_settings');
    if (cached) {
      sendSuccess(res, cached);
      return;
    }

    const settings = await prisma.adminSetting.findMany({
      where: {
        group: { in: ['GENERAL', 'CMS', 'HERO'] },
      },
    });
    const map: Record<string, string> = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });
    setCached('public_settings', map, 60);
    sendSuccess(res, map);
  } catch (error) {
    next(error);
  }
};

export const getPublicEducationMaster = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await getEducationMasterData();
    sendSuccess(res, data, 'Education and degree master list');
  } catch (error) {
    next(error);
  }
};


