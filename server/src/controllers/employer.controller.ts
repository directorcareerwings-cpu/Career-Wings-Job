import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import slugify from 'slugify';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendPaginated } from '../lib/response';
import { AppError } from '../lib/errors';
import { AuthenticatedRequest } from '../middleware/auth';
import { checkLimit, consumeCredit, getSubscriptionSummary, getActiveSubscription } from '../services/subscription.service';
import { createNotification } from '../services/notification.service';
import { sendApplicationStatusEmail } from '../services/email.service';
import { generateCandidatePDFBuffer } from '../lib/pdfGenerator';

// ---- COMPANY PROFILE ----

export const getCompanyProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({
      where: { userId: req.user!.id },
      include: { company: true },
    });
    if (!employer) throw new AppError('Employer profile not found', 404);
    sendSuccess(res, employer);
  } catch (error) { next(error); }
};

export const updateEmployerProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { firstName, lastName, phone, designation } = req.body;
    const employer = await prisma.employer.update({
      where: { userId: req.user!.id },
      data: { firstName, lastName, phone, designation },
      include: { company: true },
    });
    sendSuccess(res, employer, 'Profile updated');
  } catch (error) { next(error); }
};

export const updateCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({
      where: { userId: req.user!.id },
      include: { company: true },
    });
    if (!employer) throw new AppError('Employer not found', 404);

    const { name, website, email, phone, description, industry, companySize, foundedYear, headquarters, linkedin, twitter, facebook } = req.body;

    let company;
    if (employer.companyId) {
      company = await prisma.company.update({
        where: { id: employer.companyId },
        data: { name, website, email, phone, description, industry, companySize, foundedYear, headquarters, linkedin, twitter, facebook },
      });
    } else {
      const baseSlug = slugify(name, { lower: true, strict: true });
      let slug = baseSlug;
      let count = 0;
      while (await prisma.company.findUnique({ where: { slug } })) slug = `${baseSlug}-${++count}`;

      company = await prisma.company.create({
        data: { name, slug, website, email, phone, description, industry, companySize, foundedYear, headquarters, linkedin, twitter, facebook },
      });
      await prisma.employer.update({ where: { userId: req.user!.id }, data: { companyId: company.id } });
    }

    sendSuccess(res, company, 'Company profile updated');
  } catch (error) { next(error); }
};

export const uploadCompanyLogo = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file || ((req as any).files && (req as any).files[0]);
    if (!file) throw new AppError('No logo image file provided. Please choose a file to upload.', 400);

    // Enforce 2MB maximum file size check
    if (file.size > 2 * 1024 * 1024) {
      throw new AppError('Logo file size exceeds the 2 MB limit. Please select an image under 2 MB.', 400);
    }

    const employer = await prisma.employer.findUnique({
      where: { userId: req.user!.id },
      include: { company: true },
    });
    if (!employer) throw new AppError('Employer not found', 404);

    const logoUrl = `/uploads/images/${file.filename}`;

    if (!employer.companyId) {
      const company = await prisma.company.create({
        data: {
          name: employer.firstName ? `${employer.firstName}'s Company` : 'My Company',
          slug: `company-${Date.now()}`,
          logo: logoUrl,
        },
      });
      await prisma.employer.update({
        where: { id: employer.id },
        data: { companyId: company.id },
      });
    } else {
      await prisma.company.update({
        where: { id: employer.companyId },
        data: { logo: logoUrl },
      });
    }

    sendSuccess(res, { logo: logoUrl }, 'Company logo uploaded successfully (Max 2 MB)');
  } catch (error) { next(error); }
};

// ---- JOBS ----

/**
 * Helper to calculate employer's active featured job allowance and current usage
 */
export const getEmployerFeaturedJobQuota = async (userId: string, employerId: string) => {
  try {
    const sub = await getActiveSubscription(userId);
    let limit = 0;
    if (sub?.limitsSnapshot) {
      try {
        const limits = JSON.parse(sub.limitsSnapshot);
        if (limits.featuredJobs !== undefined && limits.featuredJobs !== null) {
          limit = Number(limits.featuredJobs);
        }
      } catch {}
    }

    const isUnlimited = limit === -1;

    const used = await prisma.job.count({
      where: {
        employerId,
        isFeatured: true,
        deletedAt: null,
        status: { notIn: ['CLOSED', 'EXPIRED'] },
      },
    }).catch(() => 0);

    const remaining = isUnlimited ? 999999 : Math.max(0, limit - used);
    const canFeature = isUnlimited || used < limit;

    return {
      limit,
      used,
      remaining,
      isUnlimited,
      canFeature,
      packageName: sub?.package?.name || 'Free Plan',
      packageType: sub?.package?.type || 'EMPLOYER',
    };
  } catch (err) {
    console.warn('Notice in getEmployerFeaturedJobQuota:', err);
    return {
      limit: 0,
      used: 0,
      remaining: 0,
      isUnlimited: false,
      canFeature: false,
      packageName: 'Starter Plan',
      packageType: 'EMPLOYER',
    };
  }
};

export const getEmployerJobs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);

    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const statusParam = (req.query.status as string || '').toUpperCase();
    const skip = (page - 1) * limit;

    let statusCondition: any = undefined;
    if (statusParam === 'LIVE' || statusParam === 'PUBLISHED') {
      statusCondition = { in: ['PUBLISHED', 'FEATURED'] };
    } else if (statusParam === 'PENDING') {
      statusCondition = 'PENDING';
    } else if (statusParam === 'REJECTED') {
      statusCondition = 'REJECTED';
    } else if (statusParam && statusParam !== 'ALL') {
      statusCondition = statusParam;
    }

    const where: any = {
      employerId: employer.id,
      deletedAt: null,
      ...(statusCondition ? { status: statusCondition } : {}),
    };

    const [jobs, total, countsByStatus, totalAll] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          company: { select: { name: true, logo: true } },
          location: true,
          category: true,
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.job.count({ where }),
      prisma.job.groupBy({
        by: ['status'],
        where: { employerId: employer.id, deletedAt: null },
        _count: true,
      }),
      prisma.job.count({ where: { employerId: employer.id, deletedAt: null } }),
    ]);

    const statusMap: Record<string, number> = {};
    countsByStatus.forEach((item) => {
      statusMap[item.status] = item._count;
    });

    const counts = {
      all: totalAll,
      pending: statusMap['PENDING'] || 0,
      live: (statusMap['PUBLISHED'] || 0) + (statusMap['FEATURED'] || 0),
      rejected: statusMap['REJECTED'] || 0,
    };

    const featuredQuota = await getEmployerFeaturedJobQuota(req.user!.id, employer.id);

    sendPaginated(res, jobs, total, page, limit, 'Success', { counts, featuredQuota });
  } catch (error) { next(error); }
};

export const postJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({
      where: { userId: req.user!.id },
      include: { company: true },
    });
    if (!employer) throw new AppError('Employer not found', 404);

    // Require Admin approval to post jobs
    if (!employer.isVerified) {
      throw new AppError(
        'Your employer account is currently pending Admin approval. Once our team approves your profile, you will be able to post jobs.',
        403
      );
    }

    // Check subscription limit
    let limitCheck = { allowed: true };
    try {
      limitCheck = await checkLimit(req.user!.id, 'jobPostings');
    } catch (err) {
      console.warn('Notice checking job limit:', err);
    }
    if (!limitCheck.allowed) {
      throw new AppError('You have reached your job posting limit. Please upgrade your subscription.', 403);
    }

    const {
      title, description, responsibilities, requirements, benefits,
      categoryId, industryId, department, salaryMin, salaryMax, salaryCurrency,
      salaryPeriod, showSalary, locationId, locationText, workMode, jobType,
      experienceMin, experienceMax, educationLevel, highestDegree, genderPreference, vacancies,
      state, district, city, country,
      applicationDeadline, applicationMethod, applicationEmail, applicationUrl,
      skills, isFeatured,
    } = req.body;

    // Validate Featured Job quota according to active package limits
    const wantsFeatured = Boolean(isFeatured);
    if (wantsFeatured) {
      const quota = await getEmployerFeaturedJobQuota(req.user!.id, employer.id);
      if (!quota.canFeature) {
        if (quota.limit <= 0) {
          throw new AppError(
            `Your active package (${quota.packageName}) does not include Featured Job listings. Please upgrade your package to feature this job.`,
            403
          );
        } else {
          throw new AppError(
            `You have used all ${quota.limit} featured job slots in your active package (${quota.used}/${quota.limit} used). Please unfeature another vacancy or upgrade your package.`,
            403
          );
        }
      }
    }

    const baseSlug = slugify(`${title}-${employer.company?.name || 'company'}`, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 0;
    while (await prisma.job.findUnique({ where: { slug } })) slug = `${baseSlug}-${++count}`;

    // All employer job postings must go through Admin Review & Approval
    const autoApprove = await prisma.adminSetting.findUnique({ where: { key: 'AUTO_APPROVE_JOBS' } });
    const isAutoApprove = autoApprove?.value === 'true';
    const status = isAutoApprove ? 'PUBLISHED' : 'PENDING';

    // Calculate job validity from subscription
    let jobDurationDays = 30;
    try {
      const subSummary = await getSubscriptionSummary(req.user!.id);
      jobDurationDays = (subSummary.limits?.jobDurationDays as number) || 30;
    } catch (err) {
      console.warn('Notice calculating job validity, fallback to 30 days:', err);
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + jobDurationDays);

    const fullLocationText = locationText || [city || 'Guwahati', district || 'Kamrup Metropolitan (Guwahati)', state || 'Assam'].filter(Boolean).join(', ');

    const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          slug,
          title,
          employerId: employer.id,
          companyId: employer.companyId || null,
          description,
          responsibilities: responsibilities || null,
          requirements: requirements || null,
          benefits: benefits || null,
          categoryId: categoryId || null,
          industryId: industryId || null,
          department: department || null,
          salaryMin: salaryMin != null && salaryMin !== '' ? Number(salaryMin) : 0,
          salaryMax: salaryMax != null && salaryMax !== '' ? Number(salaryMax) : 0,
          salaryCurrency: salaryCurrency || 'INR',
          salaryPeriod: salaryPeriod || 'MONTHLY',
          showSalary: showSalary !== false,
          locationId: locationId || null,
          locationText: fullLocationText,
          state: state || 'Assam',
          district: district || 'Kamrup Metropolitan (Guwahati)',
          city: city || 'Guwahati',
          country: country || 'India',
          workMode: workMode || 'ON_SITE',
          jobType: jobType || 'FULL_TIME',
          experienceMin: experienceMin != null && experienceMin !== '' ? Number(experienceMin) : 0,
          experienceMax: experienceMax != null && experienceMax !== '' ? Number(experienceMax) : 0,
          educationLevel: educationLevel || 'Any qualification',
          highestDegree: highestDegree || null,
          genderPreference: genderPreference || 'Any (no preference)',
          vacancies: vacancies != null && vacancies !== '' ? Number(vacancies) : 1,
          applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
          applicationMethod: applicationMethod || 'PORTAL',
          applicationEmail: applicationEmail || null,
          applicationUrl: applicationUrl || null,
          status: (wantsFeatured && status === 'PUBLISHED') ? 'FEATURED' : status,
          isFeatured: wantsFeatured,
          publishedAt: status === 'PUBLISHED' ? new Date() : null,
          expiresAt,
        },
      });

      // Add skills
      if (Array.isArray(skills) && skills.length > 0) {
        for (const skillItem of skills) {
          const rawVal = typeof skillItem === 'string' ? skillItem.trim() : (skillItem.name || skillItem.skillId || '').trim();
          const isRequired = typeof skillItem === 'object' && skillItem.isRequired !== undefined ? skillItem.isRequired : true;
          if (!rawVal) continue;

          // Find existing skill by ID, name or slug
          let skill = await tx.skill.findFirst({
            where: {
              OR: [
                { id: rawVal },
                { name: { equals: rawVal } },
                { slug: slugify(rawVal, { lower: true, strict: true }) },
              ],
            },
          });

          // Create if not exists
          if (!skill) {
            const skillSlug = slugify(rawVal, { lower: true, strict: true }) || `sk-${Date.now()}`;
            try {
              skill = await tx.skill.create({
                data: {
                  name: rawVal,
                  slug: skillSlug,
                },
              });
            } catch {
              skill = await tx.skill.findFirst({ where: { slug: skillSlug } });
            }
          }

          if (skill) {
            await tx.jobSkill.upsert({
              where: { jobId_skillId: { jobId: newJob.id, skillId: skill.id } },
              create: { jobId: newJob.id, skillId: skill.id, isRequired },
              update: {},
            });
          }
        }
      }

      return newJob;
    });

    // Consume posting credit
    await consumeCredit(req.user!.id, 'jobPostings').catch(console.error);

    // Notify admin about new job submission for review
    if (status === 'PENDING') {
      prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } }).then((admins) => {
        for (const admin of admins) {
          createNotification(
            admin.id,
            'SYSTEM',
            'New Job Pending Approval',
            `New Job "${title}" posted by ${employer.company?.name || employer.firstName || 'Employer'}`,
            '/admin/jobs'
          ).catch(console.error);
        }
      }).catch(console.error);
    }

    sendSuccess(res, job, status === 'PUBLISHED' ? 'Job posted successfully!' : 'Job submitted for Admin review and approval.', 201);
  } catch (error) { next(error); }
};

export const getEmployerJobById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);

    const job = await prisma.job.findFirst({
      where: { id: req.params.id, employerId: employer.id, deletedAt: null },
      include: { category: true, location: true, company: true, jobSkills: { include: { skill: true } } },
    });
    if (!job) throw new AppError('Job not found', 404);
    sendSuccess(res, job);
  } catch (error) { next(error); }
};

export const updateJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({
      where: { userId: req.user!.id },
      include: { company: true },
    });
    if (!employer) throw new AppError('Employer not found', 404);

    const job = await prisma.job.findFirst({ where: { id: req.params.id, employerId: employer.id, deletedAt: null } });
    if (!job) throw new AppError('Job not found', 404);
    if (job.status === 'CLOSED' || job.status === 'EXPIRED') {
      throw new AppError('Cannot edit a closed or expired job', 400);
    }

    const { skills, isFeatured, ...jobData } = req.body;
    
    let finalIsFeatured = job.isFeatured;
    if (isFeatured !== undefined) {
      const wantsFeatured = Boolean(isFeatured);
      if (wantsFeatured && !job.isFeatured) {
        const quota = await getEmployerFeaturedJobQuota(req.user!.id, employer.id);
        if (!quota.canFeature) {
          if (quota.limit <= 0) {
            throw new AppError(
              `Your active package (${quota.packageName}) does not include Featured Job listings. Please upgrade your package to feature this job.`,
              403
            );
          } else {
            throw new AppError(
              `You have used all ${quota.limit} featured job slots available in your ${quota.packageName} package (${quota.used}/${quota.limit} used). Please unfeature another job or upgrade your plan.`,
              403
            );
          }
        }
      }
      finalIsFeatured = wantsFeatured;
    }

    // If editing a published or featured job, it requires Admin re-approval before live
    const autoApprove = await prisma.adminSetting.findUnique({ where: { key: 'AUTO_APPROVE_JOBS' } });
    const isLive = job.status === 'PUBLISHED' || job.status === 'FEATURED';
    const needsApproval = isLive && autoApprove?.value !== 'true';
    let newStatus = job.status;
    if (needsApproval) {
      newStatus = 'PENDING';
    } else if (finalIsFeatured && (job.status === 'PUBLISHED' || job.status === 'FEATURED')) {
      newStatus = 'FEATURED';
    } else if (!finalIsFeatured && job.status === 'FEATURED') {
      newStatus = 'PUBLISHED';
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedJob = await tx.job.update({
        where: { id: req.params.id },
        data: {
          ...jobData,
          isFeatured: finalIsFeatured,
          status: newStatus,
          ...(needsApproval ? { publishedAt: null } : {}),
        },
      });

      if (Array.isArray(skills)) {
        await tx.jobSkill.deleteMany({ where: { jobId: req.params.id } });
        for (const skillItem of skills) {
          const skillId = typeof skillItem === 'string' ? skillItem : skillItem.skillId;
          if (skillId) {
            await tx.jobSkill.create({ data: { jobId: req.params.id, skillId } });
          }
        }
      }

      return updatedJob;
    });

    // If edited job went back to PENDING, notify admins
    if (needsApproval) {
      prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } }).then((admins) => {
        for (const admin of admins) {
          createNotification(
            admin.id,
            'SYSTEM',
            'Edited Job Pending Approval',
            `Job "${job.title}" was updated by ${employer.company?.name || employer.firstName} and needs re-approval`,
            '/admin/jobs'
          ).catch(console.error);
        }
      }).catch(console.error);
    }

    sendSuccess(
      res,
      updated,
      needsApproval
        ? 'Job updated and submitted for Admin review. It will go live once re-approved.'
        : 'Job updated successfully'
    );
  } catch (error) { next(error); }
};

export const updateJobStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);

    const { status } = req.body;
    const allowedStatuses = ['DRAFT', 'PAUSED', 'CLOSED', 'PENDING'];
    if (!allowedStatuses.includes(status)) {
      throw new AppError(`Employers can only change status to: ${allowedStatuses.join(', ')}. Jobs must be approved by Admin before going live.`, 400);
    }

    await prisma.job.updateMany({
      where: { id: req.params.id, employerId: employer.id, deletedAt: null },
      data: { status },
    });
    sendSuccess(res, null, `Job ${status.toLowerCase()}`);
  } catch (error) { next(error); }
};

export const deleteJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);
    await prisma.job.updateMany({
      where: { id: req.params.id, employerId: employer.id },
      data: { deletedAt: new Date() },
    });
    sendSuccess(res, null, 'Job deleted');
  } catch (error) { next(error); }
};

export const getFeaturedJobQuota = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);
    const quota = await getEmployerFeaturedJobQuota(req.user!.id, employer.id);
    sendSuccess(res, quota);
  } catch (error) { next(error); }
};

export const toggleJobFeatured = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);

    const job = await prisma.job.findFirst({
      where: { id: req.params.id, employerId: employer.id, deletedAt: null },
    });
    if (!job) throw new AppError('Job not found or unauthorized', 404);

    const targetFeatured = req.body.isFeatured !== undefined ? Boolean(req.body.isFeatured) : !job.isFeatured;

    if (targetFeatured) {
      if (!job.isFeatured) {
        const quota = await getEmployerFeaturedJobQuota(req.user!.id, employer.id);
        if (!quota.canFeature) {
          if (quota.limit <= 0) {
            throw new AppError(
              `Your current package (${quota.packageName}) does not include Featured Job listings. Please upgrade your package to feature this job.`,
              403
            );
          } else {
            throw new AppError(
              `You have used all ${quota.limit} featured job slots available in your ${quota.packageName} package (${quota.used}/${quota.limit} used). Please unfeature another job or upgrade your plan.`,
              403
            );
          }
        }
      }

      const updatedJob = await prisma.job.update({
        where: { id: job.id },
        data: {
          isFeatured: true,
          status: job.status === 'PUBLISHED' ? 'FEATURED' : job.status,
        },
      });

      const updatedQuota = await getEmployerFeaturedJobQuota(req.user!.id, employer.id);
      sendSuccess(res, { job: updatedJob, quota: updatedQuota }, 'Job is now Featured on homepage and top of search!');
    } else {
      const updatedJob = await prisma.job.update({
        where: { id: job.id },
        data: {
          isFeatured: false,
          status: job.status === 'FEATURED' ? 'PUBLISHED' : job.status,
        },
      });

      const updatedQuota = await getEmployerFeaturedJobQuota(req.user!.id, employer.id);
      sendSuccess(res, { job: updatedJob, quota: updatedQuota }, 'Job unfeatured. 1 slot freed up in your package.');
    }
  } catch (error) { next(error); }
};

// ---- APPLICANTS ----

export function computeCandidateJobMatch(job: any, candidate: any) {
  let totalScore = 0;
  const criteria = {
    skills: false,
    education: false,
    location: false,
    experience: false,
    salary: false,
  };

  if (!job || !candidate) {
    return { matchPercentage: 0, isHighMatch: false, matchingCriteria: criteria };
  }

  // 1. Skills Match (Weight: 40%)
  const jobSkills: string[] = (job.jobSkills || [])
    .map((js: any) => js.skill?.name?.toLowerCase().trim())
    .filter(Boolean);
  const candSkills: string[] = (candidate.candidateSkills || [])
    .map((cs: any) => cs.skill?.name?.toLowerCase().trim())
    .filter(Boolean);

  let skillsScore = 0;
  if (jobSkills.length === 0) {
    skillsScore = 40;
    criteria.skills = true;
  } else {
    const matchedSkills = jobSkills.filter((reqSkill: string) => {
      const inSkills = candSkills.some((s: string) => s.includes(reqSkill) || reqSkill.includes(s));
      const inSummary = (candidate.summary || '').toLowerCase().includes(reqSkill);
      const inHeadline = (candidate.headline || '').toLowerCase().includes(reqSkill);
      return inSkills || inSummary || inHeadline;
    });
    const matchRatio = matchedSkills.length / jobSkills.length;
    skillsScore = Math.round(matchRatio * 40);
    if (matchRatio >= 0.6 || matchedSkills.length >= 2 || (jobSkills.length === 1 && matchedSkills.length === 1)) {
      criteria.skills = true;
    }
  }

  // 2. Experience Match (Weight: 25%)
  let experienceScore = 0;
  const jobMinExp = typeof job.experienceMin === 'number' ? job.experienceMin : 0;
  const candExp = typeof candidate.totalExperience === 'number' ? candidate.totalExperience : 0;

  if (jobMinExp === 0) {
    experienceScore = 25;
    criteria.experience = true;
  } else if (candExp >= jobMinExp) {
    experienceScore = 25;
    criteria.experience = true;
  } else if (candExp >= jobMinExp * 0.7) {
    experienceScore = 18;
    criteria.experience = true;
  } else if (candExp > 0) {
    experienceScore = Math.round((candExp / jobMinExp) * 20);
    criteria.experience = false;
  }

  // 3. Location Match (Weight: 15%)
  let locationScore = 0;
  const workMode = (job.workMode || '').toUpperCase();
  const jobCity = (job.city || job.locationText || '').toLowerCase();
  const jobState = (job.state || 'Assam').toLowerCase();
  const candLocation = (candidate.currentLocation || '').toLowerCase();
  const candCity = (candidate.city || '').toLowerCase();
  const candState = (candidate.state || '').toLowerCase();
  const candPref = (candidate.preferredLocations || '').toLowerCase();

  if (workMode === 'REMOTE') {
    locationScore = 15;
    criteria.location = true;
  } else {
    const isSameCity = (jobCity && (candLocation.includes(jobCity) || candCity.includes(jobCity))) ||
      (candPref && jobCity && candPref.includes(jobCity));
    const isSameState = (jobState && (candLocation.includes(jobState) || candState.includes(jobState))) ||
      (candLocation.includes('assam') && jobState.includes('assam'));

    if (isSameCity) {
      locationScore = 15;
      criteria.location = true;
    } else if (isSameState) {
      locationScore = 11;
      criteria.location = true;
    } else if (candLocation) {
      locationScore = 5;
    } else {
      locationScore = 10;
      criteria.location = true;
    }
  }

  // 4. Education Match (Weight: 10%)
  let educationScore = 0;
  const jobEdu = (job.highestDegree || job.educationLevel || '').toLowerCase();
  const candEdu = (candidate.highestDegree || candidate.educationLevel || '').toLowerCase();
  const candEduHistory = (candidate.education || []).map((e: any) => (e.degree || '').toLowerCase()).join(' ');

  if (!jobEdu) {
    educationScore = 10;
    criteria.education = true;
  } else {
    const eduMatches = candEdu.includes(jobEdu) || jobEdu.includes(candEdu) ||
      candEduHistory.includes(jobEdu) ||
      (jobEdu.includes('bachelor') && (candEdu.includes('bachelor') || candEdu.includes('b.') || candEdu.includes('degree'))) ||
      (jobEdu.includes('master') && (candEdu.includes('master') || candEdu.includes('m.') || candEdu.includes('mba')));

    if (eduMatches) {
      educationScore = 10;
      criteria.education = true;
    } else if (candEdu) {
      educationScore = 6;
      criteria.education = true;
    } else {
      educationScore = 5;
    }
  }

  // 5. Salary Match (Weight: 10%)
  let salaryScore = 10;
  if (job.salaryMax && candidate.expectedSalaryMin) {
    if (candidate.expectedSalaryMin <= job.salaryMax) {
      salaryScore = 10;
      criteria.salary = true;
    } else if (candidate.expectedSalaryMin <= job.salaryMax * 1.25) {
      salaryScore = 6;
    } else {
      salaryScore = 2;
    }
  } else {
    salaryScore = 10;
    criteria.salary = true;
  }

  totalScore = Math.min(100, Math.max(0, skillsScore + experienceScore + locationScore + educationScore + salaryScore));
  const isHighMatch = totalScore >= 80;

  return {
    matchPercentage: totalScore,
    isHighMatch,
    matchingCriteria: criteria,
  };
}

// ---- ALL APPLICANTS (ATS OVERVIEW) ----
export const getAllApplicants = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);

    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const status = req.query.status as string | undefined;
    const jobId = req.query.jobId as string | undefined;
    const keyword = req.query.keyword as string | undefined;
    const sortBy = req.query.sortBy as string || 'recent';
    const skip = (page - 1) * limit;

    // Get all employer jobs (for match computation and filtering)
    const employerJobs = await prisma.job.findMany({
      where: { employerId: employer.id, deletedAt: null },
      include: { jobSkills: { include: { skill: true } } },
    });
    const employerJobIds = employerJobs.map(j => j.id);
    const jobMap = new Map(employerJobs.map(j => [j.id, j]));

    if (employerJobIds.length === 0) {
      sendPaginated(res, [], 0, page, limit);
      return;
    }

    // Build where clause
    const where: any = {
      jobId: jobId ? jobId : { in: employerJobIds },
      deletedAt: null,
    };
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (keyword) {
      where.OR = [
        { candidate: { firstName: { contains: keyword, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: keyword, mode: 'insensitive' } } },
        { candidate: { headline: { contains: keyword, mode: 'insensitive' } } },
        { candidate: { currentLocation: { contains: keyword, mode: 'insensitive' } } },
      ];
    }

    // Order
    let orderBy: any = { appliedAt: 'desc' };
    if (sortBy === 'experience') {
      orderBy = { candidate: { totalExperience: 'desc' } };
    } else if (sortBy === 'package') {
      orderBy = { candidate: { expectedSalaryMax: 'desc' } };
    }

    const isCustomSort = sortBy === 'matching';

    const [rawApplications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          candidate: {
            include: {
              user: { select: { email: true } },
              candidateSkills: { include: { skill: true } },
              education: { take: 1, orderBy: { startYear: 'desc' } },
              experience: { take: 1, orderBy: { startDate: 'desc' } },
            },
          },
          job: {
            select: { id: true, title: true, slug: true, status: true, jobType: true, workMode: true, city: true, state: true },
          },
        },
        orderBy,
        ...(isCustomSort ? {} : { skip, take: limit }),
      }),
      prisma.application.count({ where }),
    ]);

    // Compute match and enrich
    const applications = rawApplications.map((app) => {
      const jobData = jobMap.get(app.jobId);
      const match = jobData ? computeCandidateJobMatch(jobData, app.candidate) : { matchPercentage: 0, isHighMatch: false, matchingCriteria: {} };
      return {
        ...app,
        matchPercentage: match.matchPercentage,
        isHighMatch: match.isHighMatch,
        matchingCriteria: match.matchingCriteria,
      };
    });

    // Sort by matching if requested
    let sortedApplications = applications;
    if (sortBy === 'matching') {
      sortedApplications = [...applications]
        .sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0))
        .slice(skip, skip + limit);
    }

    // Compute status counts across ALL employer jobs
    const [appliedCount, viewedCount, shortlistedCount, interviewCount, selectedCount, rejectedCount] = await Promise.all([
      prisma.application.count({ where: { jobId: { in: employerJobIds }, deletedAt: null, status: 'APPLIED' } }),
      prisma.application.count({ where: { jobId: { in: employerJobIds }, deletedAt: null, status: 'VIEWED' } }),
      prisma.application.count({ where: { jobId: { in: employerJobIds }, deletedAt: null, status: 'SHORTLISTED' } }),
      prisma.application.count({ where: { jobId: { in: employerJobIds }, deletedAt: null, status: 'INTERVIEW' } }),
      prisma.application.count({ where: { jobId: { in: employerJobIds }, deletedAt: null, status: 'SELECTED' } }),
      prisma.application.count({ where: { jobId: { in: employerJobIds }, deletedAt: null, status: 'REJECTED' } }),
    ]);

    res.json({
      success: true,
      data: sortedApplications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        statusCounts: {
          all: appliedCount + viewedCount + shortlistedCount + interviewCount + selectedCount + rejectedCount,
          applied: appliedCount,
          viewed: viewedCount,
          shortlisted: shortlistedCount,
          interview: interviewCount,
          selected: selectedCount,
          rejected: rejectedCount,
        },
        jobs: employerJobs.map(j => ({ id: j.id, title: j.title })),
      },
    });
  } catch (error) { next(error); }
};

export const getApplicants = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);

    const job = await prisma.job.findFirst({
      where: { id: req.params.jobId, employerId: employer.id },
      include: {
        jobSkills: { include: { skill: true } },
      },
    });
    if (!job) throw new AppError('Job not found', 404);

    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    const where = { jobId: req.params.jobId, ...(status ? { status } : {}), deletedAt: null };
    const [rawApplications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          candidate: {
            include: {
              user: { select: { email: true } },
              candidateSkills: { include: { skill: true } },
              education: { take: 1, orderBy: { startYear: 'desc' } },
              experience: { take: 1, orderBy: { startDate: 'desc' } },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.application.count({ where }),
    ]);

    const applications = rawApplications.map((app) => {
      const match = computeCandidateJobMatch(job, app.candidate);
      return {
        ...app,
        matchPercentage: match.matchPercentage,
        isHighMatch: match.isHighMatch,
        matchingCriteria: match.matchingCriteria,
      };
    });

    sendPaginated(res, applications, total, page, limit);
  } catch (error) { next(error); }
};

export const updateApplicationStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);

    const job = await prisma.job.findFirst({ where: { id: req.params.jobId, employerId: employer.id } });
    if (!job) throw new AppError('Job not found', 404);

    const { status, employerNotes, rejectionReason } = req.body;
    const validStatuses = ['VIEWED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED'];
    if (!validStatuses.includes(status)) throw new AppError('Invalid status', 400);

    const application = await prisma.application.findFirst({
      where: { id: req.params.applicationId, jobId: req.params.jobId },
      include: { candidate: { include: { user: true } } },
    });
    if (!application) throw new AppError('Application not found', 404);

    await prisma.application.update({
      where: { id: req.params.applicationId },
      data: {
        status,
        employerNotes: employerNotes || null,
        rejectionReason: rejectionReason || null,
        viewedAt: status === 'VIEWED' && !application.viewedAt ? new Date() : application.viewedAt,
      },
    });

    // Notify candidate
    const statusMessages: Record<string, string> = {
      VIEWED: 'Your application has been reviewed.',
      SHORTLISTED: 'Congratulations! You have been shortlisted.',
      INTERVIEW: 'You have been invited for an interview!',
      SELECTED: 'Congratulations! You have been selected!',
      REJECTED: 'Unfortunately, your application was not selected.',
    };

    await createNotification(
      application.candidate.userId,
      status === 'SHORTLISTED' ? 'SHORTLISTED' : status === 'INTERVIEW' ? 'APPLICATION' : 'APPLICATION',
      `Application ${status}`,
      `Your application for "${job.title}" has been updated: ${statusMessages[status]}`,
      '/my-applications'
    ).catch(() => null);

    // Send email notification
    const candidateUser = application.candidate;
    sendApplicationStatusEmail(
      application.candidate.user?.email || '',
      `${candidateUser.firstName} ${candidateUser.lastName}`,
      job.title,
      status,
      employerNotes
    ).catch(console.error);

    sendSuccess(res, null, 'Application status updated');
  } catch (error) { next(error); }
};

// ---- CANDIDATE DATABASE ----

export const searchCandidates = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    const unlockedLogs = employer
      ? await prisma.resumeSearchLog.findMany({
          where: { employerId: employer.id, action: { in: ['CONTACT_UNLOCKED', 'DOWNLOADED'] } },
          select: { candidateId: true },
        })
      : [];
    const unlockedCandidateIds = new Set(unlockedLogs.map((l) => l.candidateId));

    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '100', 10);
    const skip = (page - 1) * limit;

    const {
      q,
      skills,
      qualification,
      highestDegree,
      location,
      city,
      district,
      state,
      experienceMin,
      experienceMax,
      gender,
      jobRole,
      hasResume,
      activeIn,
    } = req.query;

    const where: Record<string, unknown> = {
      deletedAt: null,
      resumeVisibility: { in: ['PUBLIC', 'EMPLOYERS_ONLY'] },
    };

    if (activeIn && activeIn !== 'ALL') {
      const daysMap: Record<string, number> = {
        '7_DAYS': 7,
        '15_DAYS': 15,
        '1_MONTH': 30,
        '6_MONTH': 180,
        '6_MONTHS': 180,
        '1_YEAR': 365,
      };
      const days = daysMap[activeIn as string];
      if (days) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        where.updatedAt = { gte: cutoff };
      }
    }

    if (q) {
      where.OR = [
        { firstName: { contains: q as string } },
        { lastName: { contains: q as string } },
        { headline: { contains: q as string } },
        { summary: { contains: q as string } },
      ];
    }

    if (skills) {
      where.candidateSkills = {
        some: {
          skill: {
            name: { contains: skills as string },
          },
        },
      };
    }

    if (qualification && qualification !== 'All Qualifications') {
      where.educationLevel = { contains: qualification as string };
    }

    if (highestDegree && highestDegree !== 'All Highest Degrees') {
      where.highestDegree = { contains: highestDegree as string };
    }

    const locSearch = (city || location) as string;
    if (locSearch) {
      where.OR = [
        ...(where.OR as any[] || []),
        { currentLocation: { contains: locSearch } },
        { city: { contains: locSearch } },
      ];
    }

    if (district && district !== 'All Districts of India') {
      where.OR = [
        ...(where.OR as any[] || []),
        { currentLocation: { contains: district as string } },
      ];
    }

    if (state && state !== 'All States of India') {
      where.OR = [
        ...(where.OR as any[] || []),
        { state: { contains: state as string } },
        { currentLocation: { contains: state as string } },
      ];
    }

    if (gender && gender !== 'Any gender') {
      where.gender = { equals: (gender as string).toUpperCase() };
    }

    if (jobRole) {
      where.OR = [
        ...(where.OR as any[] || []),
        { headline: { contains: jobRole as string } },
        { currentRole: { contains: jobRole as string } },
      ];
    }

    if (String(hasResume) === 'true') {
      where.resumeFile = { not: null };
    }

    if (experienceMin) {
      where.totalExperience = { gte: parseFloat(experienceMin as string) };
    }
    if (experienceMax) {
      where.totalExperience = {
        ...((where.totalExperience as object) || {}),
        lte: parseFloat(experienceMax as string),
      };
    }

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        include: {
          user: { select: { email: true } },
          candidateSkills: { include: { skill: { select: { name: true } } }, take: 8 },
          education: {
            take: 5,
            orderBy: { startYear: 'desc' },
            select: { id: true, degree: true, fieldOfStudy: true, institution: true, startYear: true, endYear: true, grade: true },
          },
          experience: {
            take: 5,
            orderBy: { startDate: 'desc' },
            select: {
              id: true,
              title: true,
              company: true,
              location: true,
              startDate: true,
              endDate: true,
              isCurrent: true,
              description: true,
            },
          },
          certifications: {
            take: 5,
            select: { id: true, name: true, issuer: true, issueDate: true },
          },
          languages: {
            take: 8,
            select: { id: true, language: true, proficiency: true },
          },
          applications: {
            take: 10,
            orderBy: { appliedAt: 'desc' },
            select: {
              id: true,
              status: true,
              appliedAt: true,
              job: {
                select: {
                  id: true,
                  title: true,
                  city: true,
                  district: true,
                  state: true,
                  jobType: true,
                  company: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.candidate.count({ where }),
    ]);

    const formattedCandidates = candidates.map((cand) => {
      const isUnlocked = unlockedCandidateIds.has(cand.id);
      const rawEmail = cand.user?.email || 'candidate@example.com';
      const maskedEmail = rawEmail.replace(/^(..)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c);
      const rawPhone = cand.phone || '+91 98765 43210';
      const maskedPhone = '📱 -';

      // Extract Job Applied For from imported summary/headline if present
      let jobAppliedFor: string | null = null;
      if (cand.summary && cand.summary.includes('Job Applied For:')) {
        const match = cand.summary.match(/Job Applied For:\s*([^|\n]+)/i);
        if (match && match[1]) jobAppliedFor = match[1].trim();
      } else if (cand.headline && cand.headline.startsWith('Applied for:')) {
        jobAppliedFor = cand.headline.replace(/^Applied for:\s*/i, '').trim();
      }

      const appliedJobs = (cand.applications || []).map((app) => ({
        id: app.id,
        status: app.status,
        appliedAt: app.appliedAt,
        jobId: app.job?.id,
        jobTitle: app.job?.title,
        companyName: app.job?.company?.name || null,
        location: [app.job?.city, app.job?.district, app.job?.state].filter(Boolean).join(', ') || null,
        jobType: app.job?.jobType || null,
      }));

      return {
        id: cand.id,
        firstName: cand.firstName,
        lastName: cand.lastName,
        headline: cand.headline || 'Active Job Seeker',
        currentLocation: cand.currentLocation || 'Guwahati, Assam',
        city: cand.city || null,
        state: cand.state || null,
        educationLevel: cand.educationLevel || 'Graduate / Diploma',
        highestDegree: cand.highestDegree || 'B.A',
        college: cand.college || cand.education?.[0]?.institution || null,
        totalExperience: cand.totalExperience ?? 2,
        gender: cand.gender || 'Not specified',
        dateOfBirth: cand.dateOfBirth || null,
        currentRole: cand.currentRole || null,
        currentCompany: cand.currentCompany || null,
        currentSalary: cand.currentSalary ?? null,
        expectedSalaryMin: cand.expectedSalaryMin ?? null,
        expectedSalaryMax: cand.expectedSalaryMax ?? null,
        noticePeriod: cand.noticePeriod || null,
        preferredLocations: cand.preferredLocations || null,
        summary: cand.summary || null,
        jobAppliedFor,
        appliedJobs,
        education: cand.education || [],
        experience: cand.experience || [],
        certifications: cand.certifications || [],
        languages: cand.languages || [],
        profilePhoto: cand.profilePhoto,
        resumeFile: cand.resumeFile,
        resumeFileName: cand.resumeFileName || (cand.resumeFile ? 'Verified_Resume.pdf' : null),
        candidateSkills: cand.candidateSkills,
        email: isUnlocked ? rawEmail : maskedEmail,
        phone: isUnlocked ? rawPhone : maskedPhone,
        realEmail: rawEmail,
        realPhone: rawPhone,
        isUnlocked,
        isVerifiedResume: Boolean(cand.resumeFile || cand.resumeFileName),
        updatedAt: cand.updatedAt,
        createdAt: cand.createdAt,
      };
    });

    sendPaginated(res, formattedCandidates, total, page, limit);
  } catch (error) { next(error); }
};

// ---- BULK DOWNLOAD DATA (CSV with credit deduction) ----
export const bulkDownloadCandidates = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);

    const { candidateIds } = req.body;
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      throw new AppError('No candidates selected for download', 400);
    }

    // Find already-unlocked candidates for this employer
    const alreadyUnlocked = await prisma.resumeSearchLog.findMany({
      where: {
        employerId: employer.id,
        candidateId: { in: candidateIds },
        action: { in: ['CONTACT_UNLOCKED', 'DOWNLOADED'] },
      },
      select: { candidateId: true },
    });
    const alreadyUnlockedIds = new Set(alreadyUnlocked.map((u) => u.candidateId));

    // Calculate how many NEW credits are needed
    const newUnlockIds = candidateIds.filter((id: string) => !alreadyUnlockedIds.has(id));
    const creditsNeeded = newUnlockIds.length;

    // Check if employer has enough credits (only for new unlocks)
    if (creditsNeeded > 0) {
      const sub = await prisma.subscription.findFirst({
        where: { userId: req.user!.id, status: 'ACTIVE', endDate: { gte: new Date() } },
        orderBy: { createdAt: 'desc' },
      });

      if (!sub) {
        throw new AppError('No active subscription found. Please purchase a package to download candidate data.', 403);
      }

      const limits = JSON.parse(sub.limitsSnapshot || '{}');
      const usage = JSON.parse(sub.usageData || '{}');
      const cvLimit = limits.resumeDownloads ?? limits.cvAccess ?? 0;
      const cvUsed = usage.resumeDownloads ?? usage.cvAccess ?? 0;
      const cvRemaining = typeof cvLimit === 'number' ? cvLimit - cvUsed : 999;

      if (cvLimit !== -1 && creditsNeeded > cvRemaining) {
        throw new AppError(
          `Not enough Resume Access credits. You need ${creditsNeeded} credits but only have ${cvRemaining} remaining. Select fewer candidates or upgrade your package.`,
          403
        );
      }

      // Consume credits for all new unlocks
      if (cvLimit !== -1) {
        const newUsage = {
          ...usage,
          resumeDownloads: cvUsed + creditsNeeded,
          cvAccess: cvUsed + creditsNeeded,
        };
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { usageData: JSON.stringify(newUsage) },
        });
      }
    }

    // Log new unlocks
    for (const candId of newUnlockIds) {
      await prisma.resumeSearchLog.create({
        data: {
          employerId: employer.id,
          candidateId: candId,
          action: 'DOWNLOADED',
        },
      }).catch(() => null);
    }

    // Fetch full candidate data for all requested IDs
    const candidates = await prisma.candidate.findMany({
      where: { id: { in: candidateIds } },
      include: {
        user: { select: { email: true } },
        candidateSkills: { include: { skill: true } },
        education: { take: 1, orderBy: { startYear: 'desc' } },
        experience: { take: 2, orderBy: { startDate: 'desc' } },
      },
    });

    // Format full data for download
    const downloadData = candidates.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.user?.email || '',
      phone: c.phone || '',
      headline: c.headline || '',
      currentLocation: c.currentLocation || '',
      gender: c.gender || '',
      totalExperience: c.totalExperience ?? 0,
      educationLevel: c.educationLevel || '',
      highestDegree: c.highestDegree || '',
      college: c.college || '',
      currentRole: c.currentRole || '',
      currentCompany: c.currentCompany || '',
      expectedSalaryMin: c.expectedSalaryMin ?? 0,
      expectedSalaryMax: c.expectedSalaryMax ?? 0,
      skills: (c.candidateSkills || []).map((cs) => cs.skill?.name || '').filter(Boolean).join(', '),
      resumeFile: c.resumeFile || '',
      latestDegree: c.education?.[0]?.degree || c.highestDegree || '',
      latestInstitution: c.education?.[0]?.institution || c.college || '',
      latestJobTitle: c.experience?.[0]?.title || c.currentRole || '',
      latestCompany: c.experience?.[0]?.company || c.currentCompany || '',
    }));

    sendSuccess(res, {
      candidates: downloadData,
      creditsConsumed: creditsNeeded,
      totalDownloaded: downloadData.length,
      alreadyUnlockedCount: candidateIds.length - creditsNeeded,
    }, `${downloadData.length} candidates downloaded. ${creditsNeeded} resume access credits consumed.`);
  } catch (error) { next(error); }
};

export const revealCandidateContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);

    const candidate = await prisma.candidate.findUnique({
      where: { id: req.params.candidateId },
      include: {
        user: { select: { email: true } },
        candidateSkills: { include: { skill: true } },
        education: true,
        experience: true,
      },
    });

    if (!candidate) throw new AppError('Candidate not found', 404);

    const existingUnlock = await prisma.resumeSearchLog.findFirst({
      where: { employerId: employer.id, candidateId: candidate.id, action: 'CONTACT_UNLOCKED' },
    });

    if (!existingUnlock) {
      await consumeCredit(req.user!.id, 'resumeDownloads').catch(() => null);
      await prisma.resumeSearchLog.create({
        data: {
          employerId: employer.id,
          candidateId: candidate.id,
          action: 'CONTACT_UNLOCKED',
        },
      });
    }

    sendSuccess(res, {
      id: candidate.id,
      name: `${candidate.firstName} ${candidate.lastName}`,
      email: candidate.user?.email || 'candidate@careerwings.in',
      phone: candidate.phone || '+91 98765 43210',
      isUnlocked: true,
      resumeFile: candidate.resumeFile,
      resumeFileName: candidate.resumeFileName || 'Verified_Resume.pdf',
    }, 'Contact & Resume Unlocked');
  } catch (error) { next(error); }
};

export const sendCandidateInterviewOffer = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({
      where: { userId: req.user!.id },
      include: { company: true },
    });
    if (!employer) throw new AppError('Employer not found', 404);

    const candidate = await prisma.candidate.findUnique({
      where: { id: req.params.candidateId },
      include: { user: true },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);

    const { jobTitle, interviewType, scheduledAt, locationOrLink, notes } = req.body;
    const companyName = employer.company?.name || `${employer.firstName} ${employer.lastName || ''}`.trim();

    const messageBody = [
      `📋 Position: ${jobTitle || 'Job Position'}`,
      `🏢 Company: ${companyName}`,
      `📅 Date & Time: ${scheduledAt || 'To be confirmed'}`,
      `📍 Mode: ${interviewType || 'Online/In-person'}`,
      locationOrLink ? `📌 Location / Link: ${locationOrLink}` : null,
      notes ? `💬 Message: ${notes}` : null,
    ].filter(Boolean).join('\n');

    await createNotification(
      candidate.userId,
      'INTERVIEW',
      `🎯 Interview Invitation from ${companyName}`,
      messageBody,
      '/notifications'
    ).catch(() => null);

    await prisma.resumeSearchLog.create({
      data: {
        employerId: employer.id,
        candidateId: candidate.id,
        action: 'CONTACTED',
      },
    }).catch(() => null);

    sendSuccess(res, null, 'Interview offer sent successfully to candidate');
  } catch (error) { next(error); }
};

export const getCandidateDetail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: req.params.candidateId },
      include: {
        user: { select: { email: true } },
        candidateSkills: { include: { skill: true } },
        education: { orderBy: { startYear: 'desc' } },
        experience: { orderBy: { startDate: 'desc' } },
        certifications: true,
        languages: true,
        applications: {
          take: 10,
          orderBy: { appliedAt: 'desc' },
          select: {
            id: true,
            status: true,
            appliedAt: true,
            job: {
              select: {
                id: true,
                title: true,
                city: true,
                district: true,
                state: true,
                jobType: true,
                company: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!candidate || candidate.deletedAt) {
      throw new AppError('Candidate profile not found or not visible', 404);
    }

    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    const isUnlocked = employer
      ? Boolean(
          await prisma.resumeSearchLog.findFirst({
            where: { employerId: employer.id, candidateId: candidate.id, action: { in: ['CONTACT_UNLOCKED', 'DOWNLOADED'] } },
          })
        )
      : false;

    const rawEmail = candidate.user?.email || 'candidate@example.com';
    const maskedEmail = rawEmail.replace(/^(..)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c);
    const rawPhone = candidate.phone || '+91 98765 43210';
    const maskedPhone = '📱 -';

    let jobAppliedFor: string | null = null;
    if (candidate.summary && candidate.summary.includes('Job Applied For:')) {
      const match = candidate.summary.match(/Job Applied For:\s*([^|\n]+)/i);
      if (match && match[1]) jobAppliedFor = match[1].trim();
    } else if (candidate.headline && candidate.headline.startsWith('Applied for:')) {
      jobAppliedFor = candidate.headline.replace(/^Applied for:\s*/i, '').trim();
    }

    const appliedJobs = (candidate.applications || []).map((app) => ({
      id: app.id,
      status: app.status,
      appliedAt: app.appliedAt,
      jobId: app.job?.id,
      jobTitle: app.job?.title,
      companyName: app.job?.company?.name || null,
      location: [app.job?.city, app.job?.district, app.job?.state].filter(Boolean).join(', ') || null,
      jobType: app.job?.jobType || null,
    }));

    const result = {
      ...candidate,
      user: { email: isUnlocked ? rawEmail : maskedEmail },
      email: isUnlocked ? rawEmail : maskedEmail,
      phone: isUnlocked ? rawPhone : maskedPhone,
      jobAppliedFor,
      appliedJobs,
      isUnlocked,
    };

    if (employer) {
      await prisma.resumeSearchLog.create({
        data: { employerId: employer.id, candidateId: candidate.id, action: 'VIEWED' },
      }).catch(() => null);
    }

    sendSuccess(res, result);
  } catch (error) { next(error); }
};

export const downloadCandidateResume = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limitCheck = await checkLimit(req.user!.id, 'resumeDownloads');
    if (!limitCheck.allowed) {
      throw new AppError('You have exhausted your resume download credits. Please upgrade your subscription.', 403);
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: req.params.candidateId },
      include: {
        user: { select: { email: true } },
        candidateSkills: { include: { skill: true } },
      },
    });

    if (!candidate || candidate.deletedAt) {
      throw new AppError('Candidate not found or deleted', 404);
    }
    if (candidate.resumeVisibility === 'PRIVATE') {
      throw new AppError('This candidate\'s resume is not available for download', 403);
    }

    const relPath = (candidate.resumeFile || `/uploads/resumes/${candidate.id}_resume.pdf`).replace('/uploads/', 'uploads/');
    const filePath = path.join(process.cwd(), relPath);

    // If file does not exist on disk, synthesize an authentic Career Wings PDF resume
    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const skillsStr = candidate.candidateSkills?.map((cs) => cs.skill?.name).filter(Boolean).join(', ') || '';
      const pdfBuf = generateCandidatePDFBuffer({
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        headline: candidate.headline,
        currentLocation: candidate.currentLocation,
        phone: candidate.phone,
        email: candidate.user?.email,
        highestDegree: candidate.highestDegree,
        educationLevel: candidate.educationLevel,
        skills: skillsStr,
      });
      fs.writeFileSync(filePath, pdfBuf);
    }

    // Log download
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (employer) {
      await prisma.resumeSearchLog.create({
        data: { employerId: employer.id, candidateId: candidate.id, action: 'DOWNLOADED' },
      }).catch(() => null);
    }

    await consumeCredit(req.user!.id, 'resumeDownloads').catch(console.error);
    const downloadName = candidate.resumeFileName || `${candidate.firstName}_${candidate.lastName}_Resume.pdf`.replace(/\s+/g, '_');
    res.download(filePath, downloadName);
  } catch (error) { next(error); }
};

// ---- SAVED CANDIDATES ----

export const getSavedCandidates = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);
    const saved = await prisma.savedCandidate.findMany({
      where: { employerId: employer.id },
      orderBy: { savedAt: 'desc' },
    });
    sendSuccess(res, saved);
  } catch (error) { next(error); }
};

export const saveCandidate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);
    await prisma.savedCandidate.upsert({
      where: { employerId_candidateId: { employerId: employer.id, candidateId: req.params.candidateId } },
      create: { employerId: employer.id, candidateId: req.params.candidateId, notes: req.body.notes },
      update: { notes: req.body.notes },
    });
    sendSuccess(res, null, 'Candidate saved');
  } catch (error) { next(error); }
};

export const unsaveCandidate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);
    await prisma.savedCandidate.deleteMany({ where: { employerId: employer.id, candidateId: req.params.candidateId } });
    sendSuccess(res, null, 'Candidate unsaved');
  } catch (error) { next(error); }
};

// ---- ANALYTICS ----

export const getAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);

    const [jobs, recentApplications] = await Promise.all([
      prisma.job.findMany({
        where: { employerId: employer.id, deletedAt: null },
        include: { _count: { select: { applications: true } } },
        orderBy: { applicationCount: 'desc' },
        take: 10,
      }),
      prisma.application.findMany({
        where: { job: { employerId: employer.id } },
        include: {
          candidate: { select: { firstName: true, lastName: true, profilePhoto: true, headline: true } },
          job: { select: { title: true } },
        },
        orderBy: { appliedAt: 'desc' },
        take: 10,
      }),
    ]);

    const totalApplications = jobs.reduce((sum, j) => sum + j.applicationCount, 0);
    const totalViews = jobs.reduce((sum, j) => sum + j.viewCount, 0);

    // Application status breakdown
    const statusBreakdown = await prisma.application.groupBy({
      by: ['status'],
      where: { job: { employerId: employer.id } },
      _count: true,
    });

    sendSuccess(res, {
      jobs,
      recentApplications,
      stats: {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(j => j.status === 'PUBLISHED' || j.status === 'FEATURED').length,
        totalApplications,
        totalViews,
      },
      statusBreakdown,
    });
  } catch (error) { next(error); }
};

export const getEmployerSubscription = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const summary = await getSubscriptionSummary(req.user!.id);
    sendSuccess(res, summary);
  } catch (error) { next(error); }
};

export const getEmployerPayments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.payment.count({ where: { userId: req.user!.id } }),
    ]);
    sendPaginated(res, payments, total, page, limit);
  } catch (error) { next(error); }
};

export const getEmployerCounts = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);

    const [myListings, searchResumes, atsApplicants] = await Promise.all([
      prisma.job.count({ where: { employerId: employer.id, deletedAt: null } }),
      prisma.candidate.count({ where: { deletedAt: null, resumeVisibility: { in: ['PUBLIC', 'EMPLOYERS_ONLY'] } } }),
      prisma.application.count({ where: { job: { employerId: employer.id }, deletedAt: null } }),
    ]);

    sendSuccess(res, {
      myListings,
      searchResumes,
      atsApplicants,
    });
  } catch (error) { next(error); }
};

export const getEmployerDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) throw new AppError('Employer not found', 404);

    const [totalJobs, activeJobs, allEmployerJobs, recentApplications, totalCandidates, totalApplications] = await Promise.all([
      prisma.job.count({ where: { employerId: employer.id, deletedAt: null } }),
      prisma.job.count({ where: { employerId: employer.id, deletedAt: null, status: { in: ['PUBLISHED', 'FEATURED'] } } }),
      prisma.job.findMany({
        where: { employerId: employer.id, deletedAt: null },
        select: { id: true, applicationCount: true, viewCount: true },
      }),
      prisma.application.findMany({
        where: { job: { employerId: employer.id, deletedAt: null }, deletedAt: null },
        include: {
          candidate: { select: { firstName: true, lastName: true, profilePhoto: true, headline: true, currentLocation: true } },
          job: { select: { title: true } },
        },
        orderBy: { appliedAt: 'desc' },
        take: 10,
      }),
      prisma.candidate.count(),
      prisma.application.count({ where: { job: { employerId: employer.id, deletedAt: null }, deletedAt: null } }),
    ]);

    const totalViews = allEmployerJobs.reduce((sum, j) => sum + (j.viewCount || 0), 0);

    sendSuccess(res, {
      stats: {
        totalJobs,
        activeJobs,
        totalApplications,
        totalViews,
        totalCandidates,
      },
      recentApplications,
    });
  } catch (error) { next(error); }
};


