import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendPaginated } from '../lib/response';
import { AppError } from '../lib/errors';
import { AuthenticatedRequest } from '../middleware/auth';
import { optionalAuth } from '../middleware/auth';

// Public job search
export const searchJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 50); // Max 50 per page
    const skip = (page - 1) * limit;

    const {
      q, keyword, category, location, jobType, workMode, experienceMin, experienceMax,
      salaryMin, salaryMax, featured, datePosted, sort,
    } = req.query;

    const searchTerm = (q || keyword) as string;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: { in: ['PUBLISHED', 'FEATURED'] },
      deletedAt: null,
    };

    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm } },
        { description: { contains: searchTerm } },
        { company: { name: { contains: searchTerm } } },
      ];
    }
    if (category) where.category = { slug: category as string };
    if (location) where.OR = [
      ...(where.OR || []),
      { location: { slug: location as string } },
      { locationText: { contains: location as string } },
    ];
    if (jobType) where.jobType = (jobType as string).toUpperCase();
    if (workMode) where.workMode = (workMode as string).toLowerCase();
    if (experienceMin) where.experienceMin = { lte: parseInt(experienceMin as string, 10) };
    if (experienceMax) where.experienceMax = { gte: parseInt(experienceMax as string, 10) };
    if (salaryMin) where.salaryMax = { gte: parseInt(salaryMin as string, 10) };
    if (salaryMax) where.salaryMin = { lte: parseInt(salaryMax as string, 10) };
    if (featured === 'true') where.isFeatured = true;

    // Date filter
    if (datePosted) {
      const daysMap: Record<string, number> = { '24h': 1, '3d': 3, '7d': 7, '30d': 30 };
      const days = daysMap[datePosted as string];
      if (days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        where.publishedAt = { gte: cutoff };
      }
    }

    // Sorting
    const orderByMap: Record<string, object> = {
      latest: { publishedAt: 'desc' },
      createdAt: { createdAt: 'desc' },
      salary_high: { salaryMax: 'desc' },
      salary_low: { salaryMin: 'asc' },
      salary_desc: { salaryMax: 'desc' },
      salary_asc: { salaryMin: 'asc' },
    };
    const orderBy = orderByMap[sort as string] || [{ isFeatured: 'desc' }, { publishedAt: 'desc' }];

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          company: { select: { name: true, logo: true, slug: true } },
          location: { select: { city: true, state: true, slug: true } },
          category: { select: { name: true, slug: true } },
          jobSkills: { include: { skill: { select: { name: true } } }, take: 5 },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    sendPaginated(res, jobs, total, page, limit);
  } catch (error) { next(error); }
};

// Public job detail
export const getJobDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { slug } = req.params;
    const job = await prisma.job.findUnique({
      where: { slug },
      include: {
        company: true,
        location: true,
        category: true,
        industry: true,
        employer: { select: { firstName: true, designation: true } },
        jobSkills: { include: { skill: true } },
      },
    });

    if (!job || job.deletedAt || (job.status !== 'PUBLISHED' && job.status !== 'FEATURED')) {
      throw new AppError('Job not found', 404);
    }

    // Increment view count (best effort)
    prisma.job.update({ where: { slug }, data: { viewCount: { increment: 1 } } }).catch(console.error);

    sendSuccess(res, job);
  } catch (error) { next(error); }
};

// Similar jobs
export const getSimilarJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const job = await prisma.job.findUnique({ where: { slug: req.params.slug } });
    if (!job) throw new AppError('Job not found', 404);

    const similar = await prisma.job.findMany({
      where: {
        status: { in: ['PUBLISHED', 'FEATURED'] },
        deletedAt: null,
        id: { not: job.id },
        OR: [
          { categoryId: job.categoryId || undefined },
          { locationId: job.locationId || undefined },
          { jobType: job.jobType },
        ],
      },
      include: {
        company: { select: { name: true, logo: true } },
        location: { select: { city: true, state: true } },
      },
      take: 5,
      orderBy: { publishedAt: 'desc' },
    });

    sendSuccess(res, similar);
  } catch (error) { next(error); }
};

// Featured jobs
export const getFeaturedJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const jobs = await prisma.job.findMany({
      where: {
        status: { in: ['PUBLISHED', 'FEATURED'] },
        deletedAt: null,
      },
      include: {
        company: { select: { name: true, logo: true, slug: true } },
        location: { select: { city: true, state: true, slug: true } },
        category: { select: { name: true, slug: true } },
        jobSkills: { include: { skill: { select: { name: true } } }, take: 5 },
      },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      take: 12,
    });

    sendSuccess(res, jobs);
  } catch (error) { next(error); }
};
