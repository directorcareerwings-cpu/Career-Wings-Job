import { Router, Request, Response, NextFunction } from 'express';
import {
  getDashboard,
  getAdminCandidates,
  toggleCandidateStatus,
  getAdminEmployers,
  verifyEmployer,
  toggleEmployerStatus,
  getAdminJobs,
  approveJob,
  rejectJob,
  toggleFeatureJob,
  getAdminPackages,
  createPackage,
  updatePackage,
  duplicatePackage,
  togglePackageActive,
  deletePackage,
  assignPackageManually,
  extendSubscriptionHandler,
  updateSubscriptionStatusHandler,
  getUserPackageHistoryHandler,
  getAdminPayments,
  getPaymentStatsHandler,
  getRazorpayAdminConfigHandler,
  updateRazorpayAdminConfigHandler,
  testRazorpayAdminConnectionHandler,
  getAdminSubscriptions,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  getEducationMaster,
  addEducationLevel,
  deleteEducationLevel,
  addHighestDegree,
  deleteHighestDegree,
  addCandidateEducation,
  deleteCandidateEducation,
  updateCandidateEducationAndDegree,
  getSettings,
  updateSetting,
  bulkUpdateSettings,
  getRevenueReport,
  getRegistrationReport,
  broadcastNotification,
  getAdminCoolPlaces,
  createCoolPlace,
  updateCoolPlace,
  deleteCoolPlace,
  uploadCoolPlaceLogo,
  uploadHeroImage,
  uploadLogo,
  getAdminEmailConfigHandler,
  updateAdminEmailConfigHandler,
  testAdminEmailConnectionHandler,
  getAdminEmailLogsHandler,
  retryAdminEmailHandler,
  getAdminEmailStatsHandler,
  getAdminEmailTemplatesHandler,
} from '../controllers/admin.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendPaginated } from '../lib/response';
import { AppError } from '../lib/errors';
import { imageUpload, heroImageUpload, companyLogoUpload, spreadsheetUpload } from '../middleware/upload';
import {
  getTargetFieldsHandler,
  downloadTemplateHandler,
  uploadAndPreviewHandler,
  parseSheetHandler,
  executeImportHandler,
  getJobProgressHandler,
  getImportHistoryHandler,
  downloadReportHandler,
  downloadOriginalFileHandler,
} from '../controllers/adminImport.controller';
import slugify from 'slugify';
import { hashPassword } from '../services/auth.service';

const router = Router();
router.use(authenticateToken, requireRole('ADMIN'));

// Dashboard
router.get('/dashboard', getDashboard);

// AI Smart Candidate Database Import
router.get('/smart-import/target-fields', getTargetFieldsHandler);
router.get('/smart-import/download-template', downloadTemplateHandler);
router.post('/smart-import/upload', spreadsheetUpload, uploadAndPreviewHandler);
router.post('/smart-import/parse-sheet', parseSheetHandler);
router.post('/smart-import/execute', executeImportHandler);
router.get('/smart-import/job/:id', getJobProgressHandler);
router.get('/smart-import/history', getImportHistoryHandler);
router.get('/smart-import/report/:id', downloadReportHandler);
router.get('/smart-import/original/:id', downloadOriginalFileHandler);

// Candidates
router.get('/candidates', getAdminCandidates);
router.get('/candidates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          include: {
            subscriptions: {
              include: { package: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        candidateSkills: { include: { skill: true } },
        education: true,
        experience: true,
        applications: { include: { job: { select: { title: true } } } },
      },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);
    sendSuccess(res, candidate);
  } catch (error) { next(error); }
});
router.put('/candidates/:id/status', toggleCandidateStatus);

async function deleteCandidatesInternal(candidateIds: string[]): Promise<number> {
  if (!candidateIds || candidateIds.length === 0) return 0;

  const candidates = await prisma.candidate.findMany({
    where: { id: { in: candidateIds } },
    select: { id: true, userId: true },
  });

  if (candidates.length === 0) return 0;

  const validCandidateIds = candidates.map((c) => c.id);
  const userIds = candidates.map((c) => c.userId).filter(Boolean) as string[];

  await prisma.$transaction(async (tx) => {
    // 1. Delete Candidate relational records
    await tx.candidateSkill.deleteMany({ where: { candidateId: { in: validCandidateIds } } });
    await tx.candidateLanguage.deleteMany({ where: { candidateId: { in: validCandidateIds } } });
    await tx.certification.deleteMany({ where: { candidateId: { in: validCandidateIds } } });
    await tx.education.deleteMany({ where: { candidateId: { in: validCandidateIds } } });
    await tx.experience.deleteMany({ where: { candidateId: { in: validCandidateIds } } });
    await tx.application.deleteMany({ where: { candidateId: { in: validCandidateIds } } });
    await tx.savedJob.deleteMany({ where: { candidateId: { in: validCandidateIds } } });
    await tx.jobAlert.deleteMany({ where: { candidateId: { in: validCandidateIds } } });
    await tx.savedCandidate.deleteMany({ where: { candidateId: { in: validCandidateIds } } });
    await tx.resumeSearchLog.deleteMany({ where: { candidateId: { in: validCandidateIds } } });

    // Conversations & chat messages
    const conversations = await tx.conversation.findMany({
      where: { candidateId: { in: validCandidateIds } },
      select: { id: true },
    });
    if (conversations.length > 0) {
      const convoIds = conversations.map((cv) => cv.id);
      await tx.chatMessage.deleteMany({ where: { conversationId: { in: convoIds } } });
      await tx.conversation.deleteMany({ where: { id: { in: convoIds } } });
    }

    // 2. User relations
    if (userIds.length > 0) {
      await tx.chatMessage.deleteMany({ where: { senderId: { in: userIds } } });
      await tx.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
      await tx.passwordReset.deleteMany({ where: { userId: { in: userIds } } });
      await tx.emailLog.deleteMany({ where: { userId: { in: userIds } } });
      await tx.otpVerification.deleteMany({ where: { userId: { in: userIds } } });
      await tx.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await tx.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await tx.payment.deleteMany({ where: { userId: { in: userIds } } });
    }

    // 3. Delete Candidate
    await tx.candidate.deleteMany({ where: { id: { in: validCandidateIds } } });

    // 4. Delete User
    if (userIds.length > 0) {
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  return validCandidateIds.length;
}

// Bulk delete candidates
router.post('/candidates/bulk-delete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { candidateIds } = req.body;
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      throw new AppError('candidateIds array is required', 400);
    }
    const count = await deleteCandidatesInternal(candidateIds);
    sendSuccess(res, { count }, `${count} candidate(s) deleted successfully`);
  } catch (error) { next(error); }
});

// Delete single candidate
router.delete('/candidates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const count = await deleteCandidatesInternal([id]);
    if (count === 0) throw new AppError('Candidate not found', 404);
    sendSuccess(res, null, 'Candidate and account deleted successfully');
  } catch (error) { next(error); }
});

// Employers
router.get('/employers', getAdminEmployers);
router.get('/employers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employer = await prisma.employer.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          include: {
            subscriptions: {
              include: { package: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        company: true,
        jobs: true,
      },
    });
    if (!employer) throw new AppError('Employer not found', 404);
    sendSuccess(res, employer);
  } catch (error) { next(error); }
});
router.put('/employers/:id/verify', verifyEmployer);
router.put('/employers/:id/status', toggleEmployerStatus);

router.post('/employers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      designation,
      companyId,
      companyName,
      isVerified,
      isActive,
    } = req.body;

    if (!firstName || !firstName.trim()) throw new AppError('First name is required', 400);
    if (!lastName || !lastName.trim()) throw new AppError('Last name is required', 400);
    if (!email || !email.trim()) throw new AppError('Email address is required', 400);
    if (!password || password.length < 6) throw new AppError('Password must be at least 6 characters', 400);

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) throw new AppError('A user with this email address already exists', 400);

    let resolvedCompanyId = companyId || null;
    if (!resolvedCompanyId && companyName && companyName.trim()) {
      const baseSlug = slugify(companyName.trim(), { lower: true, strict: true }) || 'company';
      let slug = baseSlug;
      let count = 0;
      while (await prisma.company.findUnique({ where: { slug } })) {
        count++;
        slug = `${baseSlug}-${count}`;
      }
      const newCompany = await prisma.company.create({
        data: {
          name: companyName.trim(),
          slug,
          isVerified: !!isVerified,
        },
      });
      resolvedCompanyId = newCompany.id;
    }

    const passwordHash = await hashPassword(password);
    const verifiedStatus = isVerified !== false;

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: 'EMPLOYER',
          isActive: isActive !== false,
          isVerified: verifiedStatus,
          emailVerifiedAt: verifiedStatus ? new Date() : null,
        },
      });

      const newEmployer = await tx.employer.create({
        data: {
          userId: newUser.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone?.trim() || null,
          designation: designation?.trim() || null,
          companyId: resolvedCompanyId,
          isVerified: verifiedStatus,
          verifiedAt: verifiedStatus ? new Date() : null,
        },
        include: {
          user: { select: { id: true, email: true, role: true, isActive: true } },
          company: true,
        },
      });

      return newEmployer;
    });

    sendSuccess(res, result, 'Employer created successfully', 201);
  } catch (error) { next(error); }
});

router.put('/employers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.employer.findUnique({
      where: { id },
      include: { user: true, company: true },
    });
    if (!existing) throw new AppError('Employer not found', 404);

    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      designation,
      companyId,
      isVerified,
      isActive,
    } = req.body;

    const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
    if (normalizedEmail && normalizedEmail !== existing.user.email) {
      const conflict = await prisma.user.findFirst({
        where: { email: normalizedEmail, NOT: { id: existing.userId } },
      });
      if (conflict) throw new AppError('Email is already registered by another user', 400);
    }

    let newPasswordHash: string | undefined = undefined;
    if (password && password.trim()) {
      if (password.trim().length < 6) {
        throw new AppError('Password must be at least 6 characters', 400);
      }
      newPasswordHash = await hashPassword(password.trim());
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (normalizedEmail || isActive !== undefined || newPasswordHash) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(normalizedEmail ? { email: normalizedEmail } : {}),
            ...(isActive !== undefined ? { isActive: !!isActive } : {}),
            ...(newPasswordHash ? { passwordHash: newPasswordHash } : {}),
          },
        });
      }

      const updatedEmp = await tx.employer.update({
        where: { id },
        data: {
          ...(firstName !== undefined ? { firstName: firstName.trim() } : {}),
          ...(lastName !== undefined ? { lastName: lastName.trim() } : {}),
          ...(phone !== undefined ? { phone: phone ? phone.trim() : null } : {}),
          ...(designation !== undefined ? { designation: designation ? designation.trim() : null } : {}),
          ...(companyId !== undefined ? { companyId: companyId || null } : {}),
          ...(isVerified !== undefined ? { isVerified: !!isVerified, verifiedAt: isVerified ? (existing.verifiedAt || new Date()) : null } : {}),
        },
        include: {
          user: { select: { id: true, email: true, role: true, isActive: true } },
          company: true,
        },
      });

      return updatedEmp;
    });

    sendSuccess(res, updated, 'Employer updated successfully');
  } catch (error) { next(error); }
});

router.delete('/employers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.employer.findUnique({
      where: { id },
      include: {
        jobs: { select: { id: true } },
      },
    });
    if (!existing) throw new AppError('Employer not found', 404);

    const jobIds = existing.jobs.map((j) => j.id);

    await prisma.$transaction(async (tx) => {
      // Clean up jobs relations
      if (jobIds.length > 0) {
        await tx.jobSkill.deleteMany({ where: { jobId: { in: jobIds } } });
        await tx.savedJob.deleteMany({ where: { jobId: { in: jobIds } } });
        await tx.application.deleteMany({ where: { jobId: { in: jobIds } } });
        await tx.job.deleteMany({ where: { id: { in: jobIds } } });
      }

      // Clean up employer relations
      await tx.savedCandidate.deleteMany({ where: { employerId: id } });
      await tx.resumeSearchLog.deleteMany({ where: { employerId: id } });

      // Clean up user relations (subscriptions, notifications, refresh tokens)
      await tx.refreshToken.deleteMany({ where: { userId: existing.userId } });
      await tx.notification.deleteMany({ where: { userId: existing.userId } });
      await tx.passwordReset.deleteMany({ where: { userId: existing.userId } });
      await tx.subscription.deleteMany({ where: { userId: existing.userId } });
      await tx.payment.deleteMany({ where: { userId: existing.userId } });

      // Delete Employer and User
      await tx.employer.delete({ where: { id } });
      await tx.user.delete({ where: { id: existing.userId } });
    });

    sendSuccess(res, null, 'Employer and account deleted successfully');
  } catch (error) { next(error); }
});

// Companies
router.get('/companies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const search = ((req.query.search as string) || (req.query.q as string) || '').trim();
    const industry = req.query.industry as string;
    const isVerified = req.query.isVerified as string;
    const isFeatured = req.query.isFeatured as string;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { industry: { contains: search } },
        { headquarters: { contains: search } },
        { email: { contains: search } },
        { slug: { contains: search } },
      ];
    }

    if (industry && industry !== 'ALL') {
      where.industry = industry;
    }

    if (isVerified !== undefined && isVerified !== '' && isVerified !== 'ALL') {
      where.isVerified = isVerified === 'true';
    }

    if (isFeatured !== undefined && isFeatured !== '' && isFeatured !== 'ALL') {
      where.isFeatured = isFeatured === 'true';
    }

    const skip = (page - 1) * limit;
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          _count: { select: { jobs: true, employers: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.company.count({ where }),
    ]);
    sendPaginated(res, companies, total, page, limit);
  } catch (error) { next(error); }
});

router.get('/companies/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { jobs: true, employers: true } },
        employers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            phone: true,
            isVerified: true,
            user: { select: { id: true, email: true, role: true, isActive: true } },
          },
        },
        jobs: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            jobType: true,
            workMode: true,
            city: true,
            createdAt: true,
            _count: { select: { applications: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 25,
        },
      },
    });
    if (!company) throw new AppError('Company not found', 404);
    sendSuccess(res, company);
  } catch (error) { next(error); }
});

router.post('/companies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      slug: customSlug,
      logo,
      website,
      email,
      phone,
      description,
      industry,
      companySize,
      foundedYear,
      headquarters,
      linkedin,
      twitter,
      facebook,
      isVerified,
      isFeatured,
    } = req.body;

    if (!name || !name.trim()) {
      throw new AppError('Company name is required', 400);
    }

    const baseSlug = customSlug && customSlug.trim()
      ? slugify(customSlug.trim(), { lower: true, strict: true })
      : slugify(name.trim(), { lower: true, strict: true }) || 'company';

    let finalSlug = baseSlug;
    let count = 0;
    while (await prisma.company.findUnique({ where: { slug: finalSlug } })) {
      count++;
      finalSlug = `${baseSlug}-${count}`;
    }

    const company = await prisma.company.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        logo: logo || null,
        website: website || null,
        email: email || null,
        phone: phone || null,
        description: description || null,
        industry: industry || null,
        companySize: companySize || null,
        foundedYear: foundedYear ? parseInt(String(foundedYear), 10) : null,
        headquarters: headquarters || null,
        linkedin: linkedin || null,
        twitter: twitter || null,
        facebook: facebook || null,
        isVerified: !!isVerified,
        isFeatured: !!isFeatured,
      },
      include: {
        _count: { select: { jobs: true, employers: true } },
      },
    });

    sendSuccess(res, company, 'Company created successfully', 201);
  } catch (error) { next(error); }
});

router.put('/companies/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) throw new AppError('Company not found', 404);

    const {
      name,
      slug: customSlug,
      logo,
      website,
      email,
      phone,
      description,
      industry,
      companySize,
      foundedYear,
      headquarters,
      linkedin,
      twitter,
      facebook,
      isVerified,
      isFeatured,
    } = req.body;

    let finalSlug = existing.slug;
    if (customSlug && customSlug.trim() && customSlug.trim() !== existing.slug) {
      const sanitized = slugify(customSlug.trim(), { lower: true, strict: true });
      const conflict = await prisma.company.findFirst({
        where: { slug: sanitized, NOT: { id } },
      });
      if (conflict) {
        throw new AppError('Slug already in use by another company', 400);
      }
      finalSlug = sanitized;
    } else if (name && name.trim() !== existing.name && !customSlug) {
      // Keep existing slug unless explicitly changed
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        slug: finalSlug,
        ...(logo !== undefined ? { logo: logo || null } : {}),
        ...(website !== undefined ? { website: website || null } : {}),
        ...(email !== undefined ? { email: email || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(industry !== undefined ? { industry: industry || null } : {}),
        ...(companySize !== undefined ? { companySize: companySize || null } : {}),
        ...(foundedYear !== undefined ? { foundedYear: foundedYear ? parseInt(String(foundedYear), 10) : null } : {}),
        ...(headquarters !== undefined ? { headquarters: headquarters || null } : {}),
        ...(linkedin !== undefined ? { linkedin: linkedin || null } : {}),
        ...(twitter !== undefined ? { twitter: twitter || null } : {}),
        ...(facebook !== undefined ? { facebook: facebook || null } : {}),
        ...(isVerified !== undefined ? { isVerified: !!isVerified } : {}),
        ...(isFeatured !== undefined ? { isFeatured: !!isFeatured } : {}),
      },
      include: {
        _count: { select: { jobs: true, employers: true } },
      },
    });

    sendSuccess(res, updated, 'Company updated successfully');
  } catch (error) { next(error); }
});

router.put('/companies/:id/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comp = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!comp) throw new AppError('Company not found', 404);
    const updated = await prisma.company.update({
      where: { id: req.params.id },
      data: { isVerified: !comp.isVerified },
    });
    sendSuccess(res, updated, `Company verification ${updated.isVerified ? 'enabled' : 'disabled'}`);
  } catch (error) { next(error); }
});

router.put('/companies/:id/feature', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comp = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!comp) throw new AppError('Company not found', 404);
    const updated = await prisma.company.update({
      where: { id: req.params.id },
      data: { isFeatured: !comp.isFeatured },
    });
    sendSuccess(res, updated, `Company ${updated.isFeatured ? 'marked as featured' : 'removed from featured'}`);
  } catch (error) { next(error); }
});

router.delete('/companies/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const comp = await prisma.company.findUnique({ where: { id } });
    if (!comp) throw new AppError('Company not found', 404);

    // Safely unlink employers and jobs to avoid foreign key constraints, then delete
    await prisma.$transaction([
      prisma.employer.updateMany({
        where: { companyId: id },
        data: { companyId: null },
      }),
      prisma.job.updateMany({
        where: { companyId: id },
        data: { companyId: null },
      }),
      prisma.company.delete({
        where: { id },
      }),
    ]);

    sendSuccess(res, null, 'Company deleted successfully');
  } catch (error) { next(error); }
});

router.post('/companies/upload-logo', (req: Request, res: Response, next: NextFunction) => {
  companyLogoUpload(req, res, (err) => {
    if (err) return next(err);
    const file = req.file || ((req as any).files && (req as any).files[0]);
    if (!file) return next(new AppError('No logo file provided', 400));
    const logoUrl = `/uploads/images/${file.filename}`;
    sendSuccess(res, { url: logoUrl }, 'Company logo uploaded');
  });
});

// Jobs
router.get('/jobs', getAdminJobs);
router.get('/jobs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { company: true, location: true, category: true, employer: true, jobSkills: { include: { skill: true } } },
    });
    if (!job) throw new AppError('Job not found', 404);
    sendSuccess(res, job);
  } catch (error) { next(error); }
});
router.put('/jobs/:id/approve', approveJob);
router.put('/jobs/:id/reject', rejectJob);
router.put('/jobs/:id/feature', toggleFeatureJob);
router.delete('/jobs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.job.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), status: 'CLOSED' } });
    const { onJobRemovedOrExpired } = await import('../services/seo.service');
    onJobRemovedOrExpired(req.params.id).catch(() => {});
    sendSuccess(res, null, 'Job deleted');
  } catch (error) { next(error); }
});

// Packages
router.get('/packages', getAdminPackages);
router.post('/packages', createPackage);
router.post('/packages/assign', assignPackageManually);
router.post('/packages/:id/duplicate', duplicatePackage);
router.put('/packages/:id', updatePackage);
router.patch('/packages/:id/toggle-active', togglePackageActive);
router.delete('/packages/:id', deletePackage);

// Payments & Subscriptions
router.get('/payments', getAdminPayments);
router.get('/payments/stats', getPaymentStatsHandler);
router.get('/payments/razorpay', getRazorpayAdminConfigHandler);
router.put('/payments/razorpay', updateRazorpayAdminConfigHandler);
router.post('/payments/razorpay/test', testRazorpayAdminConnectionHandler);
router.get('/subscriptions', getAdminSubscriptions);
router.post('/subscriptions/assign', assignPackageManually);
router.post('/subscriptions/:id/extend', extendSubscriptionHandler);
router.patch('/subscriptions/:id/status', updateSubscriptionStatusHandler);
router.get('/users/:userId/package-history', getUserPackageHistoryHandler);

// Coupons
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.put('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

// Master Data: Categories, Locations, Skills
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/locations', getLocations);
router.post('/locations', createLocation);
router.put('/locations/:id', updateLocation);
router.delete('/locations/:id', deleteLocation);

router.get('/skills', getSkills);
router.post('/skills', createSkill);
router.put('/skills/:id', updateSkill);
router.delete('/skills/:id', deleteSkill);

// Master Data: Education Qualifications & Highest Degrees
router.get('/education-master', getEducationMaster);
router.post('/education-levels', addEducationLevel);
router.delete('/education-levels/:name', deleteEducationLevel);
router.post('/highest-degrees', addHighestDegree);
router.delete('/highest-degrees/:name', deleteHighestDegree);

// Candidate Education Records (Admin Management)
router.post('/candidates/:candidateId/education', addCandidateEducation);
router.delete('/candidates/:candidateId/education/:educationId', deleteCandidateEducation);
router.put('/candidates/:candidateId/education-degree', updateCandidateEducationAndDegree);

// CMS & Settings
router.get('/cms', getSettings);
router.put('/cms', bulkUpdateSettings);
router.post('/cms/hero-image', (req, res, next) => { heroImageUpload(req, res, (err) => { if (err) return next(err); next(); }); }, uploadHeroImage);
router.post('/cms/logo', (req, res, next) => { imageUpload(req, res, (err) => { if (err) return next(err); next(); }); }, uploadLogo);
router.get('/settings', getSettings);
router.put('/settings', bulkUpdateSettings);
router.put('/settings/:key', updateSetting);

// Cool Places to Work
router.get('/cool-places', getAdminCoolPlaces);
router.post('/cool-places', createCoolPlace);
router.put('/cool-places/:id', updateCoolPlace);
router.delete('/cool-places/:id', deleteCoolPlace);
router.post('/cool-places/logo', (req, res, next) => { imageUpload(req, res, (err) => { if (err) return next(err); next(); }); }, uploadCoolPlaceLogo);

// Reports
router.get('/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = req.query.type as string;
    if (type === 'registrations') {
      return getRegistrationReport(req, res, next);
    }
    return getRevenueReport(req, res, next);
  } catch (error) { next(error); }
});
router.get('/reports/revenue', getRevenueReport);
router.get('/reports/registrations', getRegistrationReport);

// Notifications & Broadcast
router.post('/notifications', broadcastNotification);

// Applications overview
router.get('/applications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const where = status ? { status: String(status) } : {};
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          candidate: { select: { firstName: true, lastName: true, user: { select: { email: true } } } },
          job: { select: { title: true, company: { select: { name: true } } } },
        },
        orderBy: { appliedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.application.count({ where }),
    ]);
    sendPaginated(res, applications, total, page, limit);
  } catch (error) { next(error); }
});

// Email & SMTP Management
router.get('/emails/config', getAdminEmailConfigHandler);
router.put('/emails/config', updateAdminEmailConfigHandler);
router.post('/emails/test', testAdminEmailConnectionHandler);
router.get('/emails/logs', getAdminEmailLogsHandler);
router.post('/emails/logs/:id/retry', retryAdminEmailHandler);
router.get('/emails/stats', getAdminEmailStatsHandler);
router.get('/emails/templates', getAdminEmailTemplatesHandler);

export default router;
