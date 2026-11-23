"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const response_1 = require("../lib/response");
const errors_1 = require("../lib/errors");
const upload_1 = require("../middleware/upload");
const adminImport_controller_1 = require("../controllers/adminImport.controller");
const slugify_1 = __importDefault(require("slugify"));
const auth_service_1 = require("../services/auth.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'));
// Dashboard
router.get('/dashboard', admin_controller_1.getDashboard);
// AI Smart Candidate Database Import
router.get('/smart-import/target-fields', adminImport_controller_1.getTargetFieldsHandler);
router.get('/smart-import/download-template', adminImport_controller_1.downloadTemplateHandler);
router.post('/smart-import/upload', upload_1.spreadsheetUpload, adminImport_controller_1.uploadAndPreviewHandler);
router.post('/smart-import/parse-sheet', adminImport_controller_1.parseSheetHandler);
router.post('/smart-import/execute', adminImport_controller_1.executeImportHandler);
router.get('/smart-import/job/:id', adminImport_controller_1.getJobProgressHandler);
router.get('/smart-import/history', adminImport_controller_1.getImportHistoryHandler);
router.get('/smart-import/report/:id', adminImport_controller_1.downloadReportHandler);
router.get('/smart-import/original/:id', adminImport_controller_1.downloadOriginalFileHandler);
// Candidates
router.get('/candidates', admin_controller_1.getAdminCandidates);
router.get('/candidates/:id', async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({
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
        if (!candidate)
            throw new errors_1.AppError('Candidate not found', 404);
        (0, response_1.sendSuccess)(res, candidate);
    }
    catch (error) {
        next(error);
    }
});
router.put('/candidates/:id/status', admin_controller_1.toggleCandidateStatus);
async function deleteCandidatesInternal(candidateIds) {
    if (!candidateIds || candidateIds.length === 0)
        return 0;
    const candidates = await prisma_1.prisma.candidate.findMany({
        where: { id: { in: candidateIds } },
        select: { id: true, userId: true },
    });
    if (candidates.length === 0)
        return 0;
    const validCandidateIds = candidates.map((c) => c.id);
    const userIds = candidates.map((c) => c.userId).filter(Boolean);
    await prisma_1.prisma.$transaction(async (tx) => {
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
router.post('/candidates/bulk-delete', async (req, res, next) => {
    try {
        const { candidateIds } = req.body;
        if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
            throw new errors_1.AppError('candidateIds array is required', 400);
        }
        const count = await deleteCandidatesInternal(candidateIds);
        (0, response_1.sendSuccess)(res, { count }, `${count} candidate(s) deleted successfully`);
    }
    catch (error) {
        next(error);
    }
});
// Delete single candidate
router.delete('/candidates/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const count = await deleteCandidatesInternal([id]);
        if (count === 0)
            throw new errors_1.AppError('Candidate not found', 404);
        (0, response_1.sendSuccess)(res, null, 'Candidate and account deleted successfully');
    }
    catch (error) {
        next(error);
    }
});
// Employers
router.get('/employers', admin_controller_1.getAdminEmployers);
router.get('/employers/:id', async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({
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
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        (0, response_1.sendSuccess)(res, employer);
    }
    catch (error) {
        next(error);
    }
});
router.put('/employers/:id/verify', admin_controller_1.verifyEmployer);
router.put('/employers/:id/status', admin_controller_1.toggleEmployerStatus);
router.post('/employers', async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, phone, designation, companyId, companyName, isVerified, isActive, } = req.body;
        if (!firstName || !firstName.trim())
            throw new errors_1.AppError('First name is required', 400);
        if (!lastName || !lastName.trim())
            throw new errors_1.AppError('Last name is required', 400);
        if (!email || !email.trim())
            throw new errors_1.AppError('Email address is required', 400);
        if (!password || password.length < 6)
            throw new errors_1.AppError('Password must be at least 6 characters', 400);
        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser)
            throw new errors_1.AppError('A user with this email address already exists', 400);
        let resolvedCompanyId = companyId || null;
        if (!resolvedCompanyId && companyName && companyName.trim()) {
            const baseSlug = (0, slugify_1.default)(companyName.trim(), { lower: true, strict: true }) || 'company';
            let slug = baseSlug;
            let count = 0;
            while (await prisma_1.prisma.company.findUnique({ where: { slug } })) {
                count++;
                slug = `${baseSlug}-${count}`;
            }
            const newCompany = await prisma_1.prisma.company.create({
                data: {
                    name: companyName.trim(),
                    slug,
                    isVerified: !!isVerified,
                },
            });
            resolvedCompanyId = newCompany.id;
        }
        const passwordHash = await (0, auth_service_1.hashPassword)(password);
        const verifiedStatus = isVerified !== false;
        const result = await prisma_1.prisma.$transaction(async (tx) => {
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
        (0, response_1.sendSuccess)(res, result, 'Employer created successfully', 201);
    }
    catch (error) {
        next(error);
    }
});
router.put('/employers/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.prisma.employer.findUnique({
            where: { id },
            include: { user: true, company: true },
        });
        if (!existing)
            throw new errors_1.AppError('Employer not found', 404);
        const { firstName, lastName, email, password, phone, designation, companyId, isVerified, isActive, } = req.body;
        const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
        if (normalizedEmail && normalizedEmail !== existing.user.email) {
            const conflict = await prisma_1.prisma.user.findFirst({
                where: { email: normalizedEmail, NOT: { id: existing.userId } },
            });
            if (conflict)
                throw new errors_1.AppError('Email is already registered by another user', 400);
        }
        let newPasswordHash = undefined;
        if (password && password.trim()) {
            if (password.trim().length < 6) {
                throw new errors_1.AppError('Password must be at least 6 characters', 400);
            }
            newPasswordHash = await (0, auth_service_1.hashPassword)(password.trim());
        }
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
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
        (0, response_1.sendSuccess)(res, updated, 'Employer updated successfully');
    }
    catch (error) {
        next(error);
    }
});
router.delete('/employers/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.prisma.employer.findUnique({
            where: { id },
            include: {
                jobs: { select: { id: true } },
            },
        });
        if (!existing)
            throw new errors_1.AppError('Employer not found', 404);
        const jobIds = existing.jobs.map((j) => j.id);
        await prisma_1.prisma.$transaction(async (tx) => {
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
        (0, response_1.sendSuccess)(res, null, 'Employer and account deleted successfully');
    }
    catch (error) {
        next(error);
    }
});
// Companies
router.get('/companies', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '20', 10);
        const search = (req.query.search || req.query.q || '').trim();
        const industry = req.query.industry;
        const isVerified = req.query.isVerified;
        const isFeatured = req.query.isFeatured;
        const where = {
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
            prisma_1.prisma.company.findMany({
                where,
                include: {
                    _count: { select: { jobs: true, employers: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.company.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, companies, total, page, limit);
    }
    catch (error) {
        next(error);
    }
});
router.get('/companies/:id', async (req, res, next) => {
    try {
        const company = await prisma_1.prisma.company.findUnique({
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
        if (!company)
            throw new errors_1.AppError('Company not found', 404);
        (0, response_1.sendSuccess)(res, company);
    }
    catch (error) {
        next(error);
    }
});
router.post('/companies', async (req, res, next) => {
    try {
        const { name, slug: customSlug, logo, website, email, phone, description, industry, companySize, foundedYear, headquarters, linkedin, twitter, facebook, isVerified, isFeatured, } = req.body;
        if (!name || !name.trim()) {
            throw new errors_1.AppError('Company name is required', 400);
        }
        const baseSlug = customSlug && customSlug.trim()
            ? (0, slugify_1.default)(customSlug.trim(), { lower: true, strict: true })
            : (0, slugify_1.default)(name.trim(), { lower: true, strict: true }) || 'company';
        let finalSlug = baseSlug;
        let count = 0;
        while (await prisma_1.prisma.company.findUnique({ where: { slug: finalSlug } })) {
            count++;
            finalSlug = `${baseSlug}-${count}`;
        }
        const company = await prisma_1.prisma.company.create({
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
        (0, response_1.sendSuccess)(res, company, 'Company created successfully', 201);
    }
    catch (error) {
        next(error);
    }
});
router.put('/companies/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.prisma.company.findUnique({ where: { id } });
        if (!existing)
            throw new errors_1.AppError('Company not found', 404);
        const { name, slug: customSlug, logo, website, email, phone, description, industry, companySize, foundedYear, headquarters, linkedin, twitter, facebook, isVerified, isFeatured, } = req.body;
        let finalSlug = existing.slug;
        if (customSlug && customSlug.trim() && customSlug.trim() !== existing.slug) {
            const sanitized = (0, slugify_1.default)(customSlug.trim(), { lower: true, strict: true });
            const conflict = await prisma_1.prisma.company.findFirst({
                where: { slug: sanitized, NOT: { id } },
            });
            if (conflict) {
                throw new errors_1.AppError('Slug already in use by another company', 400);
            }
            finalSlug = sanitized;
        }
        else if (name && name.trim() !== existing.name && !customSlug) {
            // Keep existing slug unless explicitly changed
        }
        const updated = await prisma_1.prisma.company.update({
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
        (0, response_1.sendSuccess)(res, updated, 'Company updated successfully');
    }
    catch (error) {
        next(error);
    }
});
router.put('/companies/:id/verify', async (req, res, next) => {
    try {
        const comp = await prisma_1.prisma.company.findUnique({ where: { id: req.params.id } });
        if (!comp)
            throw new errors_1.AppError('Company not found', 404);
        const updated = await prisma_1.prisma.company.update({
            where: { id: req.params.id },
            data: { isVerified: !comp.isVerified },
        });
        (0, response_1.sendSuccess)(res, updated, `Company verification ${updated.isVerified ? 'enabled' : 'disabled'}`);
    }
    catch (error) {
        next(error);
    }
});
router.put('/companies/:id/feature', async (req, res, next) => {
    try {
        const comp = await prisma_1.prisma.company.findUnique({ where: { id: req.params.id } });
        if (!comp)
            throw new errors_1.AppError('Company not found', 404);
        const updated = await prisma_1.prisma.company.update({
            where: { id: req.params.id },
            data: { isFeatured: !comp.isFeatured },
        });
        (0, response_1.sendSuccess)(res, updated, `Company ${updated.isFeatured ? 'marked as featured' : 'removed from featured'}`);
    }
    catch (error) {
        next(error);
    }
});
router.delete('/companies/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const comp = await prisma_1.prisma.company.findUnique({ where: { id } });
        if (!comp)
            throw new errors_1.AppError('Company not found', 404);
        // Safely unlink employers and jobs to avoid foreign key constraints, then delete
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.employer.updateMany({
                where: { companyId: id },
                data: { companyId: null },
            }),
            prisma_1.prisma.job.updateMany({
                where: { companyId: id },
                data: { companyId: null },
            }),
            prisma_1.prisma.company.delete({
                where: { id },
            }),
        ]);
        (0, response_1.sendSuccess)(res, null, 'Company deleted successfully');
    }
    catch (error) {
        next(error);
    }
});
router.post('/companies/upload-logo', (req, res, next) => {
    (0, upload_1.companyLogoUpload)(req, res, (err) => {
        if (err)
            return next(err);
        const file = req.file || (req.files && req.files[0]);
        if (!file)
            return next(new errors_1.AppError('No logo file provided', 400));
        const logoUrl = `/uploads/images/${file.filename}`;
        (0, response_1.sendSuccess)(res, { url: logoUrl }, 'Company logo uploaded');
    });
});
// Jobs
router.get('/jobs', admin_controller_1.getAdminJobs);
router.get('/jobs/:id', async (req, res, next) => {
    try {
        const job = await prisma_1.prisma.job.findUnique({
            where: { id: req.params.id },
            include: { company: true, location: true, category: true, employer: true, jobSkills: { include: { skill: true } } },
        });
        if (!job)
            throw new errors_1.AppError('Job not found', 404);
        (0, response_1.sendSuccess)(res, job);
    }
    catch (error) {
        next(error);
    }
});
router.put('/jobs/:id/approve', admin_controller_1.approveJob);
router.put('/jobs/:id/reject', admin_controller_1.rejectJob);
router.put('/jobs/:id/feature', admin_controller_1.toggleFeatureJob);
router.delete('/jobs/:id', async (req, res, next) => {
    try {
        await prisma_1.prisma.job.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), status: 'CLOSED' } });
        (0, response_1.sendSuccess)(res, null, 'Job deleted');
    }
    catch (error) {
        next(error);
    }
});
// Packages
router.get('/packages', admin_controller_1.getAdminPackages);
router.post('/packages', admin_controller_1.createPackage);
router.post('/packages/assign', admin_controller_1.assignPackageManually);
router.post('/packages/:id/duplicate', admin_controller_1.duplicatePackage);
router.put('/packages/:id', admin_controller_1.updatePackage);
router.patch('/packages/:id/toggle-active', admin_controller_1.togglePackageActive);
router.delete('/packages/:id', admin_controller_1.deletePackage);
// Payments & Subscriptions
router.get('/payments', admin_controller_1.getAdminPayments);
router.get('/payments/stats', admin_controller_1.getPaymentStatsHandler);
router.get('/payments/razorpay', admin_controller_1.getRazorpayAdminConfigHandler);
router.put('/payments/razorpay', admin_controller_1.updateRazorpayAdminConfigHandler);
router.post('/payments/razorpay/test', admin_controller_1.testRazorpayAdminConnectionHandler);
router.get('/subscriptions', admin_controller_1.getAdminSubscriptions);
router.post('/subscriptions/assign', admin_controller_1.assignPackageManually);
router.post('/subscriptions/:id/extend', admin_controller_1.extendSubscriptionHandler);
router.patch('/subscriptions/:id/status', admin_controller_1.updateSubscriptionStatusHandler);
router.get('/users/:userId/package-history', admin_controller_1.getUserPackageHistoryHandler);
// Coupons
router.get('/coupons', admin_controller_1.getCoupons);
router.post('/coupons', admin_controller_1.createCoupon);
router.put('/coupons/:id', admin_controller_1.updateCoupon);
router.delete('/coupons/:id', admin_controller_1.deleteCoupon);
// Master Data: Categories, Locations, Skills
router.get('/categories', admin_controller_1.getCategories);
router.post('/categories', admin_controller_1.createCategory);
router.put('/categories/:id', admin_controller_1.updateCategory);
router.delete('/categories/:id', admin_controller_1.deleteCategory);
router.get('/locations', admin_controller_1.getLocations);
router.post('/locations', admin_controller_1.createLocation);
router.put('/locations/:id', admin_controller_1.updateLocation);
router.delete('/locations/:id', admin_controller_1.deleteLocation);
router.get('/skills', admin_controller_1.getSkills);
router.post('/skills', admin_controller_1.createSkill);
router.put('/skills/:id', admin_controller_1.updateSkill);
router.delete('/skills/:id', admin_controller_1.deleteSkill);
// CMS & Settings
router.get('/cms', admin_controller_1.getSettings);
router.put('/cms', admin_controller_1.bulkUpdateSettings);
router.post('/cms/hero-image', (req, res, next) => { (0, upload_1.heroImageUpload)(req, res, (err) => { if (err)
    return next(err); next(); }); }, admin_controller_1.uploadHeroImage);
router.post('/cms/logo', (req, res, next) => { (0, upload_1.imageUpload)(req, res, (err) => { if (err)
    return next(err); next(); }); }, admin_controller_1.uploadLogo);
router.get('/settings', admin_controller_1.getSettings);
router.put('/settings', admin_controller_1.bulkUpdateSettings);
router.put('/settings/:key', admin_controller_1.updateSetting);
// Cool Places to Work
router.get('/cool-places', admin_controller_1.getAdminCoolPlaces);
router.post('/cool-places', admin_controller_1.createCoolPlace);
router.put('/cool-places/:id', admin_controller_1.updateCoolPlace);
router.delete('/cool-places/:id', admin_controller_1.deleteCoolPlace);
router.post('/cool-places/logo', (req, res, next) => { (0, upload_1.imageUpload)(req, res, (err) => { if (err)
    return next(err); next(); }); }, admin_controller_1.uploadCoolPlaceLogo);
// Reports
router.get('/reports', async (req, res, next) => {
    try {
        const type = req.query.type;
        if (type === 'registrations') {
            return (0, admin_controller_1.getRegistrationReport)(req, res, next);
        }
        return (0, admin_controller_1.getRevenueReport)(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
router.get('/reports/revenue', admin_controller_1.getRevenueReport);
router.get('/reports/registrations', admin_controller_1.getRegistrationReport);
// Notifications & Broadcast
router.post('/notifications', admin_controller_1.broadcastNotification);
// Applications overview
router.get('/applications', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '20', 10);
        const skip = (page - 1) * limit;
        const { status } = req.query;
        const where = status ? { status: String(status) } : {};
        const [applications, total] = await Promise.all([
            prisma_1.prisma.application.findMany({
                where,
                include: {
                    candidate: { select: { firstName: true, lastName: true, user: { select: { email: true } } } },
                    job: { select: { title: true, company: { select: { name: true } } } },
                },
                orderBy: { appliedAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.application.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, applications, total, page, limit);
    }
    catch (error) {
        next(error);
    }
});
// Email & SMTP Management
router.get('/emails/config', admin_controller_1.getAdminEmailConfigHandler);
router.put('/emails/config', admin_controller_1.updateAdminEmailConfigHandler);
router.post('/emails/test', admin_controller_1.testAdminEmailConnectionHandler);
router.get('/emails/logs', admin_controller_1.getAdminEmailLogsHandler);
router.post('/emails/logs/:id/retry', admin_controller_1.retryAdminEmailHandler);
router.get('/emails/stats', admin_controller_1.getAdminEmailStatsHandler);
router.get('/emails/templates', admin_controller_1.getAdminEmailTemplatesHandler);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map