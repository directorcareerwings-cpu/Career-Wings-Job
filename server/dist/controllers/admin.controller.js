"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCoolPlace = exports.getAdminCoolPlaces = exports.broadcastNotification = exports.getRegistrationReport = exports.getRevenueReport = exports.bulkUpdateSettings = exports.updateSetting = exports.getSettings = exports.deleteSkill = exports.updateSkill = exports.createSkill = exports.getSkills = exports.deleteLocation = exports.updateLocation = exports.createLocation = exports.getLocations = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategories = exports.deleteCoupon = exports.updateCoupon = exports.createCoupon = exports.getCoupons = exports.getUserPackageHistoryHandler = exports.updateSubscriptionStatusHandler = exports.extendSubscriptionHandler = exports.assignPackageManually = exports.getAdminSubscriptions = exports.testRazorpayAdminConnectionHandler = exports.updateRazorpayAdminConfigHandler = exports.getRazorpayAdminConfigHandler = exports.getPaymentStatsHandler = exports.getAdminPayments = exports.deletePackage = exports.togglePackageActive = exports.duplicatePackage = exports.updatePackage = exports.createPackage = exports.getAdminPackages = exports.toggleFeatureJob = exports.rejectJob = exports.approveJob = exports.getAdminJobs = exports.toggleEmployerStatus = exports.verifyEmployer = exports.getAdminEmployers = exports.toggleCandidateStatus = exports.getAdminCandidates = exports.getDashboard = void 0;
exports.updateCandidateEducationAndDegree = exports.deleteCandidateEducation = exports.addCandidateEducation = exports.deleteHighestDegree = exports.addHighestDegree = exports.deleteEducationLevel = exports.addEducationLevel = exports.getEducationMaster = exports.DEFAULT_HIGHEST_DEGREES = exports.DEFAULT_EDUCATION_LEVELS = exports.getAdminEmailTemplatesHandler = exports.getAdminEmailStatsHandler = exports.retryAdminEmailHandler = exports.getAdminEmailLogsHandler = exports.testAdminEmailConnectionHandler = exports.updateAdminEmailConfigHandler = exports.getAdminEmailConfigHandler = exports.uploadLogo = exports.uploadHeroImage = exports.uploadCoolPlaceLogo = exports.deleteCoolPlace = exports.updateCoolPlace = void 0;
exports.getEducationMasterData = getEducationMasterData;
const prisma_1 = require("../lib/prisma");
const response_1 = require("../lib/response");
const errors_1 = require("../lib/errors");
const slugify_1 = __importDefault(require("slugify"));
const payment_service_1 = require("../services/payment.service");
const seo_service_1 = require("../services/seo.service");
const subscription_service_1 = require("../services/subscription.service");
const email_service_1 = require("../services/email.service");
const mysql_auto_init_1 = require("../lib/mysql-auto-init");
const memoryCache_1 = require("../lib/memoryCache");
const public_controller_1 = require("./public.controller");
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
// ---- DASHBOARD ----
const getDashboard = async (req, res, next) => {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const [totalCandidates, totalEmployers, activeJobs, pendingJobs, totalApplications, thisMonthRevenue, activeSubscriptions, recentCandidates, recentPayments, pendingJobsList,] = await Promise.all([
            prisma_1.prisma.candidate.count({ where: { deletedAt: null } }),
            prisma_1.prisma.employer.count({ where: { deletedAt: null } }),
            prisma_1.prisma.job.count({ where: { status: { in: ['PUBLISHED', 'FEATURED'] }, deletedAt: null } }),
            prisma_1.prisma.job.count({ where: { status: 'PENDING', deletedAt: null } }),
            prisma_1.prisma.application.count({ where: { deletedAt: null } }),
            prisma_1.prisma.payment.aggregate({ where: { status: 'SUCCESS', createdAt: { gte: monthStart } }, _sum: { amount: true } }),
            prisma_1.prisma.subscription.count({ where: { status: 'ACTIVE', endDate: { gte: now } } }),
            prisma_1.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, email: true, role: true, createdAt: true } }),
            prisma_1.prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { user: { select: { email: true } } } }),
            prisma_1.prisma.job.findMany({
                where: { status: 'PENDING', deletedAt: null },
                include: { employer: { include: { company: { select: { name: true } } } } },
                take: 10,
                orderBy: { createdAt: 'asc' },
            }),
        ]);
        // Monthly revenue for chart (last 6 months)
        const revenueByMonth = [];
        for (let i = 5; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const revenue = await prisma_1.prisma.payment.aggregate({
                where: { status: 'SUCCESS', createdAt: { gte: start, lte: end } },
                _sum: { amount: true },
            });
            revenueByMonth.push({
                month: start.toLocaleString('default', { month: 'short', year: '2-digit' }),
                revenue: revenue._sum.amount || 0,
            });
        }
        (0, response_1.sendSuccess)(res, {
            stats: {
                totalCandidates,
                totalEmployers,
                activeJobs,
                pendingJobs,
                totalApplications,
                thisMonthRevenue: thisMonthRevenue._sum.amount || 0,
                activeSubscriptions,
            },
            recentCandidates,
            recentPayments,
            pendingJobsList,
            revenueByMonth,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboard = getDashboard;
// ---- CANDIDATES ----
const getAdminCandidates = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '20', 10);
        const skip = (page - 1) * limit;
        const { q, status } = req.query;
        const where = { deletedAt: null };
        if (q)
            where.OR = [{ firstName: { contains: q } }, { lastName: { contains: q } }];
        if (status === 'active')
            where.user = { isActive: true };
        if (status === 'suspended')
            where.user = { isActive: false };
        const [candidates, total] = await Promise.all([
            prisma_1.prisma.candidate.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            isActive: true,
                            createdAt: true,
                            subscriptions: {
                                where: { status: 'ACTIVE', endDate: { gte: new Date() } },
                                include: { package: true },
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                            },
                        },
                    },
                },
                orderBy: { user: { createdAt: 'desc' } },
                skip,
                take: limit,
            }),
            prisma_1.prisma.candidate.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, candidates, total, page, limit);
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminCandidates = getAdminCandidates;
const toggleCandidateStatus = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { id: req.params.id }, include: { user: true } });
        if (!candidate)
            throw new errors_1.AppError('Candidate not found', 404);
        await prisma_1.prisma.user.update({ where: { id: candidate.userId }, data: { isActive: !candidate.user.isActive } });
        (0, response_1.sendSuccess)(res, null, `Candidate ${candidate.user.isActive ? 'suspended' : 'activated'}`);
    }
    catch (error) {
        next(error);
    }
};
exports.toggleCandidateStatus = toggleCandidateStatus;
// ---- EMPLOYERS ----
const getAdminEmployers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '20', 10);
        const skip = (page - 1) * limit;
        const { q, status } = req.query;
        const where = { deletedAt: null };
        if (q) {
            where.OR = [
                { firstName: { contains: String(q) } },
                { lastName: { contains: String(q) } },
                { designation: { contains: String(q) } },
                { company: { name: { contains: String(q) } } },
            ];
        }
        const statusParam = (status || '').toUpperCase();
        if (statusParam === 'PENDING') {
            where.isVerified = false;
        }
        else if (statusParam === 'APPROVED' || statusParam === 'VERIFIED') {
            where.isVerified = true;
        }
        const [employers, total, totalAll, totalPending, totalApproved] = await Promise.all([
            prisma_1.prisma.employer.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            isActive: true,
                            createdAt: true,
                            subscriptions: {
                                where: { status: 'ACTIVE', endDate: { gte: new Date() } },
                                include: { package: true },
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                            },
                        },
                    },
                    company: { select: { id: true, name: true, logo: true, isVerified: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.employer.count({ where }),
            prisma_1.prisma.employer.count({ where: { deletedAt: null } }),
            prisma_1.prisma.employer.count({ where: { deletedAt: null, isVerified: false } }),
            prisma_1.prisma.employer.count({ where: { deletedAt: null, isVerified: true } }),
        ]);
        (0, response_1.sendPaginated)(res, employers, total, page, limit, 'Employers retrieved', {
            counts: {
                all: totalAll,
                pending: totalPending,
                approved: totalApproved,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminEmployers = getAdminEmployers;
const verifyEmployer = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({
            where: { id: req.params.id },
            include: { user: true, company: true },
        });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const explicitApproval = req.body && typeof req.body.isVerified === 'boolean'
            ? req.body.isVerified
            : !employer.isVerified;
        const updated = await prisma_1.prisma.employer.update({
            where: { id: req.params.id },
            data: {
                isVerified: explicitApproval,
                verifiedAt: explicitApproval ? new Date() : null,
            },
            include: {
                user: true,
                company: true,
            },
        });
        // Also update company verification if employer is approved
        if (employer.companyId && explicitApproval) {
            await prisma_1.prisma.company.update({
                where: { id: employer.companyId },
                data: { isVerified: true },
            }).catch(() => null);
        }
        // Send in-app notification to the employer user
        await prisma_1.prisma.notification.create({
            data: {
                userId: employer.userId,
                type: explicitApproval ? 'ACCOUNT_VERIFIED' : 'ACCOUNT_SUSPENDED',
                title: explicitApproval ? 'Employer Account Approved!' : 'Employer Approval Revoked',
                message: explicitApproval
                    ? 'Congratulations! Your employer account has been approved and verified by the Admin. You can now post jobs and manage vacancies.'
                    : 'Your employer account approval status has been updated by the Admin.',
                link: '/employer/jobs/post',
            },
        }).catch(() => null);
        (0, response_1.sendSuccess)(res, updated, `Employer ${explicitApproval ? 'approved and verified successfully' : 'unverified'}`);
    }
    catch (error) {
        next(error);
    }
};
exports.verifyEmployer = verifyEmployer;
const toggleEmployerStatus = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { id: req.params.id }, include: { user: true } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        await prisma_1.prisma.user.update({ where: { id: employer.userId }, data: { isActive: !employer.user.isActive } });
        (0, response_1.sendSuccess)(res, null, `Employer ${employer.user.isActive ? 'suspended' : 'activated'}`);
    }
    catch (error) {
        next(error);
    }
};
exports.toggleEmployerStatus = toggleEmployerStatus;
// ---- JOBS ----
const getAdminJobs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '20', 10);
        const skip = (page - 1) * limit;
        const { q, status } = req.query;
        const where = { deletedAt: null };
        if (q) {
            const queryStr = String(q).trim();
            where.OR = [
                { title: { contains: queryStr } },
                { locationText: { contains: queryStr } },
                { company: { name: { contains: queryStr } } },
                { employer: { firstName: { contains: queryStr } } },
                { employer: { lastName: { contains: queryStr } } },
            ];
        }
        if (status && status !== 'ALL')
            where.status = status;
        const [jobs, total, pendingCount, publishedCount, featuredCount, rejectedCount, totalAll] = await Promise.all([
            prisma_1.prisma.job.findMany({
                where,
                include: {
                    company: { select: { id: true, name: true, logo: true, slug: true } },
                    employer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            designation: true,
                            phone: true,
                            user: { select: { email: true } },
                        },
                    },
                    location: { select: { id: true, city: true, state: true } },
                    category: { select: { id: true, name: true } },
                    jobSkills: { include: { skill: true } },
                    _count: { select: { applications: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.job.count({ where }),
            prisma_1.prisma.job.count({ where: { status: 'PENDING', deletedAt: null } }),
            prisma_1.prisma.job.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
            prisma_1.prisma.job.count({ where: { status: 'FEATURED', deletedAt: null } }),
            prisma_1.prisma.job.count({ where: { status: 'REJECTED', deletedAt: null } }),
            prisma_1.prisma.job.count({ where: { deletedAt: null } }),
        ]);
        const counts = {
            all: totalAll,
            pending: pendingCount,
            published: publishedCount,
            featured: featuredCount,
            rejected: rejectedCount,
        };
        (0, response_1.sendPaginated)(res, jobs, total, page, limit, 'Jobs loaded', { counts });
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminJobs = getAdminJobs;
const approveJob = async (req, res, next) => {
    try {
        const job = await prisma_1.prisma.job.update({
            where: { id: req.params.id },
            data: { status: 'PUBLISHED', publishedAt: new Date() },
            include: { employer: { include: { user: true } }, company: true },
        });
        // Notify employer
        await prisma_1.prisma.notification.create({
            data: {
                userId: job.employer.userId,
                type: 'SYSTEM',
                title: 'Job Approved',
                message: `Your job "${job.title}" has been approved and is now live!`,
                link: `/employer/jobs`,
            },
        });
        // Send email to employer
        if (job.employer?.user?.email) {
            (0, email_service_1.sendJobApprovedEmail)(job.employer.user.email, `${job.employer.firstName} ${job.employer.lastName}`, job.title, job.company?.name || 'Your Company', job.slug, job.employer.userId).catch(console.error);
        }
        // Hook into SEO Catalog & Indexing Queue
        (0, seo_service_1.onJobPublished)(job.id);
        (0, response_1.sendSuccess)(res, null, 'Job approved and published');
    }
    catch (error) {
        next(error);
    }
};
exports.approveJob = approveJob;
const rejectJob = async (req, res, next) => {
    try {
        const { reason } = req.body;
        const job = await prisma_1.prisma.job.update({
            where: { id: req.params.id },
            data: { status: 'REJECTED', rejectionReason: reason },
            include: { employer: { include: { user: true } }, company: true },
        });
        await prisma_1.prisma.notification.create({
            data: {
                userId: job.employer.userId,
                type: 'SYSTEM',
                title: 'Job Rejected',
                message: `Your job "${job.title}" was rejected. Reason: ${reason || 'No reason provided.'}`,
                link: `/employer/jobs`,
            },
        });
        // Send email to employer
        if (job.employer?.user?.email) {
            (0, email_service_1.sendJobRejectedEmail)(job.employer.user.email, `${job.employer.firstName} ${job.employer.lastName}`, job.title, job.company?.name || 'Your Company', reason, job.employer.userId).catch(console.error);
        }
        // Mark job non-indexable and remove from XML sitemap
        (0, seo_service_1.onJobRemovedOrExpired)(job.id).catch(() => { });
        (0, response_1.sendSuccess)(res, null, 'Job rejected');
    }
    catch (error) {
        next(error);
    }
};
exports.rejectJob = rejectJob;
const toggleFeatureJob = async (req, res, next) => {
    try {
        const job = await prisma_1.prisma.job.findUnique({ where: { id: req.params.id } });
        if (!job)
            throw new errors_1.AppError('Job not found', 404);
        await prisma_1.prisma.job.update({
            where: { id: req.params.id },
            data: { isFeatured: !job.isFeatured, status: !job.isFeatured ? 'FEATURED' : 'PUBLISHED' },
        });
        (0, seo_service_1.onJobPublished)(job.id).catch(() => { });
        (0, response_1.sendSuccess)(res, null, `Job ${job.isFeatured ? 'unfeatured' : 'featured'}`);
    }
    catch (error) {
        next(error);
    }
};
exports.toggleFeatureJob = toggleFeatureJob;
// ---- PACKAGES ----
const getAdminPackages = async (req, res, next) => {
    try {
        let packages;
        try {
            packages = await prisma_1.prisma.package.findMany({
                orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
            });
        }
        catch (dbErr) {
            if (dbErr?.message?.includes('invalid datetime') || dbErr?.message?.includes('Value out of range')) {
                await (0, mysql_auto_init_1.sanitizeMysqlDatetimes)().catch(() => { });
                packages = await prisma_1.prisma.package.findMany({
                    orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
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
exports.getAdminPackages = getAdminPackages;
const createPackage = async (req, res, next) => {
    try {
        const { name, type, description, price, durationDays, limits, features, color, badge, status = 'ACTIVE', sortOrder = 0, isActive, isFeatured = false, } = req.body;
        if (!name || !name.trim()) {
            throw new errors_1.AppError('Package name is required', 400);
        }
        if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
            throw new errors_1.AppError('Valid non-negative price is required', 400);
        }
        if (!durationDays || isNaN(Number(durationDays)) || Number(durationDays) <= 0) {
            throw new errors_1.AppError('Valid duration in days (> 0) is required', 400);
        }
        const effectiveStatus = ['ACTIVE', 'DRAFT', 'DISABLED'].includes(status) ? status : 'ACTIVE';
        const effectiveIsActive = isActive !== undefined ? !!isActive : effectiveStatus === 'ACTIVE';
        let baseSlug = (0, slugify_1.default)(`${name}-${type}`, { lower: true, strict: true }) || 'package';
        let slug = baseSlug;
        let counter = 1;
        while (await prisma_1.prisma.package.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        const pkg = await prisma_1.prisma.package.create({
            data: {
                name: name.trim(),
                slug,
                type: String(type).toUpperCase() === 'CANDIDATE' ? 'CANDIDATE' : 'EMPLOYER',
                description: description?.trim() || '',
                price: parseFloat(price),
                durationDays: parseInt(durationDays, 10),
                limits: typeof limits === 'object' ? JSON.stringify(limits) : (limits || '{}'),
                features: Array.isArray(features) ? JSON.stringify(features) : (features || '[]'),
                color: color || '#F97316',
                badge: badge?.trim() || null,
                status: effectiveStatus,
                isActive: effectiveIsActive,
                isFeatured: !!isFeatured,
                sortOrder: parseInt(sortOrder, 10) || 0,
            },
        });
        (0, response_1.sendSuccess)(res, pkg, 'Package created successfully', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createPackage = createPackage;
const updatePackage = async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.package.findUnique({ where: { id: req.params.id } });
        if (!existing)
            throw new errors_1.AppError('Package not found', 404);
        const { limits, features, status, isActive, price, durationDays, sortOrder, isFeatured, badge, ...rest } = req.body;
        const updateData = { ...rest };
        if (price !== undefined) {
            const parsedPrice = parseFloat(price);
            if (isNaN(parsedPrice) || parsedPrice < 0)
                throw new errors_1.AppError('Price cannot be negative', 400);
            updateData.price = parsedPrice;
        }
        if (durationDays !== undefined) {
            const parsedDuration = parseInt(durationDays, 10);
            if (isNaN(parsedDuration) || parsedDuration <= 0)
                throw new errors_1.AppError('Duration must be greater than 0', 400);
            updateData.durationDays = parsedDuration;
        }
        if (sortOrder !== undefined) {
            updateData.sortOrder = parseInt(sortOrder, 10) || 0;
        }
        if (isFeatured !== undefined) {
            updateData.isFeatured = !!isFeatured;
        }
        if (badge !== undefined) {
            updateData.badge = badge ? String(badge).trim() : null;
        }
        if (status !== undefined) {
            const effStatus = ['ACTIVE', 'DRAFT', 'DISABLED'].includes(status) ? status : existing.status;
            updateData.status = effStatus;
            updateData.isActive = effStatus === 'ACTIVE';
        }
        else if (isActive !== undefined) {
            updateData.isActive = !!isActive;
            updateData.status = updateData.isActive ? 'ACTIVE' : 'DISABLED';
        }
        if (limits !== undefined) {
            updateData.limits = typeof limits === 'object' ? JSON.stringify(limits) : limits;
        }
        if (features !== undefined) {
            updateData.features = Array.isArray(features) ? JSON.stringify(features) : features;
        }
        const pkg = await prisma_1.prisma.package.update({
            where: { id: req.params.id },
            data: updateData,
        });
        (0, response_1.sendSuccess)(res, pkg, 'Package updated successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.updatePackage = updatePackage;
const duplicatePackage = async (req, res, next) => {
    try {
        const original = await prisma_1.prisma.package.findUnique({ where: { id: req.params.id } });
        if (!original)
            throw new errors_1.AppError('Package not found', 404);
        const newName = `${original.name} (Copy)`;
        let baseSlug = (0, slugify_1.default)(`${newName}-${original.type}`, { lower: true, strict: true }) || 'package-copy';
        let slug = baseSlug;
        let counter = 1;
        while (await prisma_1.prisma.package.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        const duplicate = await prisma_1.prisma.package.create({
            data: {
                name: newName,
                slug,
                type: original.type,
                description: original.description,
                price: original.price,
                durationDays: original.durationDays,
                limits: original.limits,
                features: original.features,
                color: original.color,
                badge: original.badge ? `${original.badge}` : null,
                status: 'DRAFT',
                isActive: false, // Duplicates start as Draft / Inactive so they don't immediately publish
                isFeatured: false,
                sortOrder: (original.sortOrder || 0) + 1,
            },
        });
        (0, response_1.sendSuccess)(res, duplicate, `Package duplicated as "${newName}" (Draft)`, 201);
    }
    catch (error) {
        next(error);
    }
};
exports.duplicatePackage = duplicatePackage;
const togglePackageActive = async (req, res, next) => {
    try {
        const pkg = await prisma_1.prisma.package.findUnique({ where: { id: req.params.id } });
        if (!pkg)
            throw new errors_1.AppError('Package not found', 404);
        const newIsActive = !pkg.isActive;
        const newStatus = newIsActive ? 'ACTIVE' : 'DISABLED';
        await prisma_1.prisma.package.update({
            where: { id: req.params.id },
            data: {
                isActive: newIsActive,
                status: newStatus,
            },
        });
        (0, response_1.sendSuccess)(res, { isActive: newIsActive, status: newStatus }, `Package ${newIsActive ? 'activated' : 'disabled'}`);
    }
    catch (error) {
        next(error);
    }
};
exports.togglePackageActive = togglePackageActive;
const deletePackage = async (req, res, next) => {
    try {
        const count = await prisma_1.prisma.subscription.count({ where: { packageId: req.params.id, status: 'ACTIVE' } });
        if (count > 0)
            throw new errors_1.AppError(`Cannot delete: ${count} active subscription(s) use this package`, 400);
        await prisma_1.prisma.package.delete({ where: { id: req.params.id } });
        (0, response_1.sendSuccess)(res, null, 'Package deleted successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.deletePackage = deletePackage;
// ---- PAYMENTS ----
const getAdminPayments = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '20', 10);
        const skip = (page - 1) * limit;
        const { status, search } = req.query;
        const where = {};
        if (status && status !== 'ALL') {
            where.status = status;
        }
        if (search) {
            const q = String(search).trim();
            where.OR = [
                { invoiceNumber: { contains: q, mode: 'insensitive' } },
                { razorpayOrderId: { contains: q, mode: 'insensitive' } },
                { razorpayPaymentId: { contains: q, mode: 'insensitive' } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
            ];
        }
        const [payments, total] = await Promise.all([
            prisma_1.prisma.payment.findMany({
                where,
                include: {
                    user: { select: { id: true, email: true, role: true } },
                    subscriptions: {
                        take: 1,
                        include: { package: { select: { id: true, name: true, type: true } } },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.payment.count({ where }),
        ]);
        const formattedPayments = payments.map((p) => ({
            ...p,
            package: p.subscriptions[0]?.package || null,
        }));
        (0, response_1.sendPaginated)(res, formattedPayments, total, page, limit);
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminPayments = getAdminPayments;
const getPaymentStatsHandler = async (req, res, next) => {
    try {
        const [totalRevenueAgg, totalCount, successCount, pendingCount, failedCount] = await Promise.all([
            prisma_1.prisma.payment.aggregate({
                where: { status: 'SUCCESS' },
                _sum: { amount: true },
            }),
            prisma_1.prisma.payment.count(),
            prisma_1.prisma.payment.count({ where: { status: 'SUCCESS' } }),
            prisma_1.prisma.payment.count({ where: { status: 'PENDING' } }),
            prisma_1.prisma.payment.count({ where: { status: 'FAILED' } }),
        ]);
        (0, response_1.sendSuccess)(res, {
            totalRevenue: totalRevenueAgg._sum.amount || 0,
            totalCount,
            successCount,
            pendingCount,
            failedCount,
        }, 'Payment statistics');
    }
    catch (error) {
        next(error);
    }
};
exports.getPaymentStatsHandler = getPaymentStatsHandler;
const getRazorpayAdminConfigHandler = async (req, res, next) => {
    try {
        const config = await (0, payment_service_1.getRazorpayConfig)();
        const hasSecret = Boolean(config.keySecret && config.keySecret.trim() !== '');
        const hasWebhook = Boolean(config.webhookSecret && config.webhookSecret.trim() !== '');
        (0, response_1.sendSuccess)(res, {
            keyId: config.keyId || '',
            hasKeySecret: hasSecret,
            keySecretMasked: hasSecret ? '••••••••••••••••' : '',
            hasWebhookSecret: hasWebhook,
            webhookSecretMasked: hasWebhook ? '••••••••••••••••' : '',
            mode: config.mode,
            isEnabled: config.isEnabled,
            autoCapture: config.autoCapture,
        }, 'Razorpay configuration');
    }
    catch (error) {
        next(error);
    }
};
exports.getRazorpayAdminConfigHandler = getRazorpayAdminConfigHandler;
const updateRazorpayAdminConfigHandler = async (req, res, next) => {
    try {
        const { keyId, keySecret, webhookSecret, mode, isEnabled, autoCapture } = req.body;
        const updated = await (0, payment_service_1.saveRazorpayConfig)({
            keyId,
            keySecret,
            webhookSecret,
            mode,
            isEnabled,
            autoCapture,
        });
        const hasSecret = Boolean(updated.keySecret && updated.keySecret.trim() !== '');
        const hasWebhook = Boolean(updated.webhookSecret && updated.webhookSecret.trim() !== '');
        (0, response_1.sendSuccess)(res, {
            keyId: updated.keyId || '',
            hasKeySecret: hasSecret,
            keySecretMasked: hasSecret ? '••••••••••••••••' : '',
            hasWebhookSecret: hasWebhook,
            webhookSecretMasked: hasWebhook ? '••••••••••••••••' : '',
            mode: updated.mode,
            isEnabled: updated.isEnabled,
            autoCapture: updated.autoCapture,
        }, 'Razorpay configuration saved successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.updateRazorpayAdminConfigHandler = updateRazorpayAdminConfigHandler;
const testRazorpayAdminConnectionHandler = async (req, res, next) => {
    try {
        const { keyId, keySecret } = req.body || {};
        const result = await (0, payment_service_1.testRazorpayConnection)(keyId, keySecret);
        if (!result.success) {
            res.status(400).json({
                success: false,
                message: result.message,
            });
            return;
        }
        (0, response_1.sendSuccess)(res, result.details, result.message);
    }
    catch (error) {
        next(error);
    }
};
exports.testRazorpayAdminConnectionHandler = testRazorpayAdminConnectionHandler;
const getAdminSubscriptions = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '20', 10);
        const skip = (page - 1) * limit;
        const [subs, total] = await Promise.all([
            prisma_1.prisma.subscription.findMany({
                include: { user: { select: { email: true } }, package: { select: { name: true, type: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.subscription.count(),
        ]);
        (0, response_1.sendPaginated)(res, subs, total, page, limit);
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminSubscriptions = getAdminSubscriptions;
const assignPackageManually = async (req, res, next) => {
    try {
        const { userId, employerId, candidateId, packageId, durationDays, notes } = req.body;
        if (!packageId) {
            throw new errors_1.AppError('Package ID is required', 400);
        }
        const pkg = await prisma_1.prisma.package.findUnique({ where: { id: packageId } });
        if (!pkg) {
            throw new errors_1.AppError('Selected package not found', 404);
        }
        let targetUserId = userId;
        if (!targetUserId && employerId) {
            const employer = await prisma_1.prisma.employer.findUnique({ where: { id: employerId } });
            if (employer) {
                targetUserId = employer.userId;
            }
            else {
                const directUser = await prisma_1.prisma.user.findUnique({ where: { id: employerId } });
                if (!directUser)
                    throw new errors_1.AppError('Employer not found', 404);
                targetUserId = directUser.id;
            }
        }
        if (!targetUserId && candidateId) {
            const candidate = await prisma_1.prisma.candidate.findUnique({ where: { id: candidateId } });
            if (candidate) {
                targetUserId = candidate.userId;
            }
            else {
                const directUser = await prisma_1.prisma.user.findUnique({ where: { id: candidateId } });
                if (!directUser)
                    throw new errors_1.AppError('Candidate not found', 404);
                targetUserId = directUser.id;
            }
        }
        if (!targetUserId) {
            throw new errors_1.AppError('Please select an employer or candidate to assign the package', 400);
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: targetUserId },
            include: {
                employer: { select: { id: true, firstName: true, lastName: true, company: { select: { name: true } } } },
                candidate: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        if (!user)
            throw new errors_1.AppError('Target user not found', 404);
        const validityDays = durationDays && parseInt(String(durationDays), 10) > 0
            ? parseInt(String(durationDays), 10)
            : pkg.durationDays;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + validityDays);
        let paymentRecordId = null;
        try {
            const payment = await prisma_1.prisma.payment.create({
                data: {
                    userId: targetUserId,
                    packageId: pkg.id,
                    amount: 0,
                    currency: 'INR',
                    status: 'SUCCESS',
                    notes: notes?.trim() || `Admin manual allocation: ${pkg.name} (${validityDays} days)`,
                    invoiceNumber: `INV-MANUAL-${Date.now()}`,
                },
            });
            paymentRecordId = payment.id;
        }
        catch (paymentErr) {
            console.warn('Could not create manual payment audit entry, proceeding with paymentId null:', paymentErr);
            paymentRecordId = null;
        }
        // Atomically replace all prior active/suspended subscriptions for this user
        const subscription = await prisma_1.prisma.$transaction(async (tx) => {
            await tx.subscription.updateMany({
                where: {
                    userId: targetUserId,
                    status: { in: ['ACTIVE', 'SUSPENDED'] },
                },
                data: { status: 'CANCELLED' },
            });
            return tx.subscription.create({
                data: {
                    userId: targetUserId,
                    packageId: pkg.id,
                    limitsSnapshot: pkg.limits,
                    usageData: (0, subscription_service_1.createInitialUsageData)(),
                    status: 'ACTIVE',
                    startDate,
                    endDate,
                    paymentId: paymentRecordId,
                },
                include: {
                    package: true,
                },
            });
        });
        // Notify user
        const recipientName = user.employer
            ? `${user.employer.firstName} ${user.employer.lastName}`
            : user.candidate
                ? `${user.candidate.firstName} ${user.candidate.lastName}`
                : 'User';
        await prisma_1.prisma.notification.create({
            data: {
                userId: targetUserId,
                type: 'SUBSCRIPTION_ACTIVE',
                title: 'Package Assigned by Admin',
                message: `Admin has manually assigned the "${pkg.name}" package (${validityDays} days validity) to your account.${notes ? ` Note: ${notes}` : ''}`,
                link: user.role === 'EMPLOYER' ? '/employer/billing' : '/candidate/subscription',
            },
        }).catch(() => null);
        // Send package assigned email notification
        (0, email_service_1.sendPackageAssignedEmail)(user.email, recipientName, {
            packageName: pkg.name,
            packageId: pkg.id,
            durationDays: validityDays,
            amount: pkg.price,
            expiryDate: endDate,
        }, user.id).catch(console.error);
        (0, response_1.sendSuccess)(res, {
            subscription,
            user: {
                id: user.id,
                email: user.email,
                name: recipientName,
                role: user.role,
            },
            package: pkg,
        }, `Package "${pkg.name}" successfully assigned to ${recipientName} (${user.email})!`, 201);
    }
    catch (error) {
        next(error);
    }
};
exports.assignPackageManually = assignPackageManually;
const extendSubscriptionHandler = async (req, res, next) => {
    try {
        const { id } = req.params;
        const daysToAdd = parseInt(String(req.body.daysToAdd || '30'), 10);
        if (isNaN(daysToAdd) || daysToAdd <= 0) {
            throw new errors_1.AppError('Valid daysToAdd is required (must be positive number)', 400);
        }
        const updated = await (0, subscription_service_1.extendSubscription)(id, daysToAdd);
        (0, response_1.sendSuccess)(res, updated, `Subscription extended by ${daysToAdd} days`);
    }
    catch (error) {
        next(error);
    }
};
exports.extendSubscriptionHandler = extendSubscriptionHandler;
const updateSubscriptionStatusHandler = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED'];
        if (!validStatuses.includes(status)) {
            throw new errors_1.AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400);
        }
        const updated = await (0, subscription_service_1.updateSubscriptionStatus)(id, status);
        (0, response_1.sendSuccess)(res, updated, `Subscription status updated to ${status}`);
    }
    catch (error) {
        next(error);
    }
};
exports.updateSubscriptionStatusHandler = updateSubscriptionStatusHandler;
const getUserPackageHistoryHandler = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const [subs, payments, user] = await Promise.all([
            prisma_1.prisma.subscription.findMany({
                where: { userId },
                include: { package: true },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.payment.findMany({
                where: { userId },
                include: { package: true },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, role: true, isActive: true },
            }),
        ]);
        if (!user)
            throw new errors_1.AppError('User not found', 404);
        (0, response_1.sendSuccess)(res, { user, subscriptions: subs, payments });
    }
    catch (error) {
        next(error);
    }
};
exports.getUserPackageHistoryHandler = getUserPackageHistoryHandler;
// ---- COUPONS ----
const getCoupons = async (req, res, next) => {
    try {
        const coupons = await prisma_1.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
        (0, response_1.sendSuccess)(res, coupons);
    }
    catch (error) {
        next(error);
    }
};
exports.getCoupons = getCoupons;
const createCoupon = async (req, res, next) => {
    try {
        const coupon = await prisma_1.prisma.coupon.create({
            data: { ...req.body, code: req.body.code.toUpperCase() },
        });
        (0, response_1.sendSuccess)(res, coupon, 'Coupon created', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createCoupon = createCoupon;
const updateCoupon = async (req, res, next) => {
    try {
        const coupon = await prisma_1.prisma.coupon.update({ where: { id: req.params.id }, data: req.body });
        (0, response_1.sendSuccess)(res, coupon, 'Coupon updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateCoupon = updateCoupon;
const deleteCoupon = async (req, res, next) => {
    try {
        await prisma_1.prisma.coupon.delete({ where: { id: req.params.id } });
        (0, response_1.sendSuccess)(res, null, 'Coupon deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCoupon = deleteCoupon;
// ---- MASTER DATA (Categories, Locations, Skills, Industries) ----
const getCategories = async (req, res, next) => {
    try {
        const cats = await prisma_1.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
        (0, response_1.sendSuccess)(res, cats);
    }
    catch (error) {
        next(error);
    }
};
exports.getCategories = getCategories;
const createCategory = async (req, res, next) => {
    try {
        const { name, icon, description, sortOrder } = req.body;
        const slug = (0, slugify_1.default)(name, { lower: true, strict: true });
        const cat = await prisma_1.prisma.category.create({ data: { name, slug, icon, description, sortOrder: sortOrder || 0 } });
        (0, response_1.sendSuccess)(res, cat, 'Category created', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createCategory = createCategory;
const updateCategory = async (req, res, next) => {
    try {
        const cat = await prisma_1.prisma.category.update({ where: { id: req.params.id }, data: req.body });
        (0, response_1.sendSuccess)(res, cat, 'Category updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res, next) => {
    try {
        await prisma_1.prisma.category.delete({ where: { id: req.params.id } });
        (0, response_1.sendSuccess)(res, null, 'Category deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCategory = deleteCategory;
const getLocations = async (req, res, next) => {
    try {
        const locs = await prisma_1.prisma.location.findMany({ orderBy: { city: 'asc' } });
        (0, response_1.sendSuccess)(res, locs);
    }
    catch (error) {
        next(error);
    }
};
exports.getLocations = getLocations;
const createLocation = async (req, res, next) => {
    try {
        const { city, state, country, isPopular } = req.body;
        const slug = (0, slugify_1.default)(`${city}-${state}`, { lower: true, strict: true });
        const loc = await prisma_1.prisma.location.create({ data: { city, state, country: country || 'India', slug, isPopular: isPopular || false } });
        (0, response_1.sendSuccess)(res, loc, 'Location created', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createLocation = createLocation;
const updateLocation = async (req, res, next) => {
    try {
        const loc = await prisma_1.prisma.location.update({ where: { id: req.params.id }, data: req.body });
        (0, response_1.sendSuccess)(res, loc, 'Location updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateLocation = updateLocation;
const deleteLocation = async (req, res, next) => {
    try {
        await prisma_1.prisma.location.delete({ where: { id: req.params.id } });
        (0, response_1.sendSuccess)(res, null, 'Location deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteLocation = deleteLocation;
const getSkills = async (req, res, next) => {
    try {
        const { q } = req.query;
        const skills = await prisma_1.prisma.skill.findMany({
            where: q ? { name: { contains: q } } : undefined,
            orderBy: [{ isPopular: 'desc' }, { name: 'asc' }],
        });
        (0, response_1.sendSuccess)(res, skills);
    }
    catch (error) {
        next(error);
    }
};
exports.getSkills = getSkills;
const createSkill = async (req, res, next) => {
    try {
        const { name, category, isPopular } = req.body;
        const slug = (0, slugify_1.default)(name, { lower: true, strict: true });
        const skill = await prisma_1.prisma.skill.create({ data: { name, slug, category, isPopular: isPopular || false } });
        (0, response_1.sendSuccess)(res, skill, 'Skill created', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createSkill = createSkill;
const updateSkill = async (req, res, next) => {
    try {
        const skill = await prisma_1.prisma.skill.update({ where: { id: req.params.id }, data: req.body });
        (0, response_1.sendSuccess)(res, skill, 'Skill updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateSkill = updateSkill;
const deleteSkill = async (req, res, next) => {
    try {
        await prisma_1.prisma.skill.delete({ where: { id: req.params.id } });
        (0, response_1.sendSuccess)(res, null, 'Skill deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteSkill = deleteSkill;
// ---- SETTINGS / CMS ----
const getSettings = async (req, res, next) => {
    try {
        const settings = await prisma_1.prisma.adminSetting.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });
        const grouped = {};
        settings.forEach(s => {
            if (!grouped[s.group])
                grouped[s.group] = {};
            grouped[s.group][s.key] = s.value;
        });
        (0, response_1.sendSuccess)(res, { settings, grouped });
    }
    catch (error) {
        next(error);
    }
};
exports.getSettings = getSettings;
const updateSetting = async (req, res, next) => {
    try {
        const { value, label, group, type } = req.body;
        const setting = await prisma_1.prisma.adminSetting.upsert({
            where: { key: req.params.key },
            create: { key: req.params.key, value: String(value), label, group: group || 'GENERAL', type: type || 'TEXT' },
            update: { value: String(value), label, group, type },
        });
        (0, memoryCache_1.invalidateCache)('public_settings');
        (0, response_1.sendSuccess)(res, setting, 'Setting updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateSetting = updateSetting;
const bulkUpdateSettings = async (req, res, next) => {
    try {
        const { settings } = req.body; // Array of { key, value, label?, group?, type? }
        if (!Array.isArray(settings))
            throw new errors_1.AppError('settings must be an array', 400);
        await Promise.all(settings.map(s => prisma_1.prisma.adminSetting.upsert({
            where: { key: s.key },
            create: { key: s.key, value: String(s.value), label: s.label, group: s.group || 'GENERAL', type: s.type || 'TEXT' },
            update: { value: String(s.value) },
        })));
        (0, memoryCache_1.invalidateCache)('public_settings');
        (0, response_1.sendSuccess)(res, null, 'Settings updated');
    }
    catch (error) {
        next(error);
    }
};
exports.bulkUpdateSettings = bulkUpdateSettings;
// ---- REPORTS ----
const getRevenueReport = async (req, res, next) => {
    try {
        const months = parseInt(req.query.months || '12', 10);
        const now = new Date();
        const data = [];
        for (let i = months - 1; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const [revenue, count] = await Promise.all([
                prisma_1.prisma.payment.aggregate({ where: { status: 'SUCCESS', createdAt: { gte: start, lte: end } }, _sum: { amount: true } }),
                prisma_1.prisma.payment.count({ where: { status: 'SUCCESS', createdAt: { gte: start, lte: end } } }),
            ]);
            data.push({
                month: start.toLocaleString('default', { month: 'short', year: '2-digit' }),
                revenue: revenue._sum.amount || 0,
                transactions: count,
            });
        }
        (0, response_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
};
exports.getRevenueReport = getRevenueReport;
const getRegistrationReport = async (req, res, next) => {
    try {
        const months = parseInt(req.query.months || '6', 10);
        const now = new Date();
        const data = [];
        for (let i = months - 1; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const [candidates, employers] = await Promise.all([
                prisma_1.prisma.user.count({ where: { role: 'CANDIDATE', createdAt: { gte: start, lte: end } } }),
                prisma_1.prisma.user.count({ where: { role: 'EMPLOYER', createdAt: { gte: start, lte: end } } }),
            ]);
            data.push({
                month: start.toLocaleString('default', { month: 'short', year: '2-digit' }),
                candidates,
                employers,
            });
        }
        (0, response_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
};
exports.getRegistrationReport = getRegistrationReport;
// ---- NOTIFICATIONS ----
const broadcastNotification = async (req, res, next) => {
    try {
        const { title, message, link, role } = req.body;
        const where = role ? { role, isActive: true } : { isActive: true };
        const users = await prisma_1.prisma.user.findMany({ where, select: { id: true } });
        await prisma_1.prisma.notification.createMany({
            data: users.map(u => ({ userId: u.id, type: 'SYSTEM', title, message, link })),
        });
        (0, response_1.sendSuccess)(res, { sent: users.length }, `Notification sent to ${users.length} users`);
    }
    catch (error) {
        next(error);
    }
};
exports.broadcastNotification = broadcastNotification;
// ---- COOL PLACES TO WORK (ADMIN) ----
const getAdminCoolPlaces = async (req, res, next) => {
    try {
        const rawLogos = await prisma_1.prisma.coolPlaceLogo.findMany({ orderBy: { displayOrder: 'asc' } });
        const logos = await (0, public_controller_1.healCoolPlaceLogos)(rawLogos);
        (0, response_1.sendSuccess)(res, logos);
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminCoolPlaces = getAdminCoolPlaces;
const createCoolPlace = async (req, res, next) => {
    try {
        const { name, logoUrl, website, displayOrder, isActive } = req.body;
        if (!name || !logoUrl)
            throw new errors_1.AppError('name and logoUrl are required', 400);
        const logo = await prisma_1.prisma.coolPlaceLogo.create({
            data: { name, logoUrl, website, displayOrder: Number(displayOrder) || 0, isActive: isActive !== false },
        });
        (0, memoryCache_1.invalidateCache)('public_cool_places');
        (0, response_1.sendSuccess)(res, logo, 'Company logo added');
    }
    catch (error) {
        next(error);
    }
};
exports.createCoolPlace = createCoolPlace;
const updateCoolPlace = async (req, res, next) => {
    try {
        const { name, logoUrl, website, displayOrder, isActive } = req.body;
        const logo = await prisma_1.prisma.coolPlaceLogo.update({
            where: { id: req.params.id },
            data: { name, logoUrl, website, displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined, isActive },
        });
        (0, memoryCache_1.invalidateCache)('public_cool_places');
        (0, response_1.sendSuccess)(res, logo, 'Company logo updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateCoolPlace = updateCoolPlace;
const deleteCoolPlace = async (req, res, next) => {
    try {
        await prisma_1.prisma.coolPlaceLogo.delete({ where: { id: req.params.id } });
        (0, memoryCache_1.invalidateCache)('public_cool_places');
        (0, response_1.sendSuccess)(res, null, 'Company logo deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCoolPlace = deleteCoolPlace;
const uploadCoolPlaceLogo = async (req, res, next) => {
    try {
        if (!req.file)
            throw new errors_1.AppError('No file uploaded', 400);
        if (req.file.path && req.file.mimetype !== 'image/svg+xml') {
            try {
                const buf = fs_1.default.readFileSync(req.file.path);
                const normalized = await (0, sharp_1.default)(buf)
                    .trim({ threshold: 15 })
                    .resize(400, 160, { fit: 'inside', withoutEnlargement: true })
                    .toBuffer();
                fs_1.default.writeFileSync(req.file.path, normalized);
            }
            catch { }
        }
        const logoUrl = `/uploads/images/${req.file.filename}`;
        (0, memoryCache_1.invalidateCache)('public_cool_places');
        (0, response_1.sendSuccess)(res, { logoUrl }, 'Logo uploaded');
    }
    catch (error) {
        next(error);
    }
};
exports.uploadCoolPlaceLogo = uploadCoolPlaceLogo;
const uploadHeroImage = async (req, res, next) => {
    try {
        if (!req.file)
            throw new errors_1.AppError('No image file uploaded', 400);
        const imageUrl = `/uploads/images/${req.file.filename}`;
        const setting = await prisma_1.prisma.adminSetting.upsert({
            where: { key: 'HERO_IMAGE_URL' },
            create: {
                key: 'HERO_IMAGE_URL',
                value: imageUrl,
                group: 'CMS',
                label: 'Hero Banner Image URL',
                type: 'TEXT',
            },
            update: {
                value: imageUrl,
            },
        });
        (0, memoryCache_1.invalidateCache)('public_settings');
        (0, response_1.sendSuccess)(res, { imageUrl, setting }, 'Hero image uploaded and saved successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.uploadHeroImage = uploadHeroImage;
const uploadLogo = async (req, res, next) => {
    try {
        if (!req.file)
            throw new errors_1.AppError('No logo image file uploaded', 400);
        const logoUrl = `/uploads/images/${req.file.filename}`;
        const setting = await prisma_1.prisma.adminSetting.upsert({
            where: { key: 'SITE_LOGO_URL' },
            create: {
                key: 'SITE_LOGO_URL',
                value: logoUrl,
                group: 'CMS',
                label: 'Website Logo URL',
                type: 'TEXT',
            },
            update: {
                value: logoUrl,
            },
        });
        (0, memoryCache_1.invalidateCache)('public_settings');
        (0, response_1.sendSuccess)(res, { logoUrl, setting }, 'Website logo uploaded and saved successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.uploadLogo = uploadLogo;
// ========================================
// EMAIL & SMTP MANAGEMENT
// ========================================
const getAdminEmailConfigHandler = async (req, res, next) => {
    try {
        const config = await (0, email_service_1.getSmtpConfig)();
        (0, response_1.sendSuccess)(res, {
            host: config.host,
            port: config.port,
            secure: config.secure,
            user: config.user,
            hasPassword: Boolean(config.pass),
            maskedPassword: config.pass ? '••••••••••••' : '',
            fromEmail: config.fromEmail,
            fromName: config.fromName,
            replyTo: config.replyTo,
            isEnabled: config.isEnabled,
            mode: config.host && config.user ? 'PRODUCTION_SMTP' : 'SANDBOX_DEVELOPMENT',
        }, 'Email configuration retrieved');
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminEmailConfigHandler = getAdminEmailConfigHandler;
const updateAdminEmailConfigHandler = async (req, res, next) => {
    try {
        const { host, port, secure, user, pass, fromEmail, fromName, replyTo, isEnabled } = req.body;
        const upserts = [
            { key: 'SMTP_HOST', value: String(host || ''), label: 'SMTP Server Host' },
            { key: 'SMTP_PORT', value: String(port || '587'), label: 'SMTP Port' },
            { key: 'SMTP_SECURE', value: String(Boolean(secure)), label: 'SMTP SSL/TLS' },
            { key: 'SMTP_USER', value: String(user || ''), label: 'SMTP Username' },
            { key: 'SMTP_FROM_EMAIL', value: String(fromEmail || 'no-reply@careerwings.in'), label: 'Default From Email' },
            { key: 'SMTP_FROM_NAME', value: String(fromName || 'Career Wings'), label: 'Default From Name' },
            { key: 'SMTP_REPLY_TO', value: String(replyTo || 'support@careerwings.in'), label: 'Support Reply-To' },
            { key: 'SMTP_IS_ENABLED', value: String(isEnabled !== false), label: 'Email Dispatch Enabled' },
        ];
        if (pass && pass.trim() && pass !== '••••••••••••') {
            upserts.push({ key: 'SMTP_PASS', value: String(pass), label: 'SMTP Password' });
        }
        for (const item of upserts) {
            await prisma_1.prisma.adminSetting.upsert({
                where: { key: item.key },
                create: {
                    key: item.key,
                    value: item.value,
                    group: 'EMAIL',
                    label: item.label,
                    type: 'TEXT',
                },
                update: {
                    value: item.value,
                },
            });
        }
        (0, email_service_1.clearEmailConfigCache)();
        (0, response_1.sendSuccess)(res, null, 'Email & SMTP settings saved successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.updateAdminEmailConfigHandler = updateAdminEmailConfigHandler;
const testAdminEmailConnectionHandler = async (req, res, next) => {
    try {
        const { toEmail } = req.body;
        if (!toEmail)
            throw new errors_1.AppError('Recipient email address is required for sending test mail', 400);
        const result = await (0, email_service_1.sendTestEmail)(toEmail);
        (0, response_1.sendSuccess)(res, result, result.message);
    }
    catch (error) {
        next(error);
    }
};
exports.testAdminEmailConnectionHandler = testAdminEmailConnectionHandler;
const getAdminEmailLogsHandler = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '15', 10);
        const status = req.query.status;
        const type = req.query.type;
        const search = req.query.search;
        const where = {};
        if (status && status !== 'ALL')
            where.status = status;
        if (type && type !== 'ALL')
            where.emailType = type;
        if (search) {
            where.OR = [
                { recipientEmail: { contains: search } },
                { subject: { contains: search } },
            ];
        }
        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            prisma_1.prisma.emailLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.emailLog.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, logs, total, page, limit, 'Email logs retrieved');
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminEmailLogsHandler = getAdminEmailLogsHandler;
const retryAdminEmailHandler = async (req, res, next) => {
    try {
        const { id } = req.params;
        await (0, email_service_1.retryFailedEmail)(id);
        const updated = await prisma_1.prisma.emailLog.findUnique({ where: { id } });
        (0, response_1.sendSuccess)(res, updated, 'Email delivery retry initiated successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.retryAdminEmailHandler = retryAdminEmailHandler;
const getAdminEmailStatsHandler = async (req, res, next) => {
    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [totalSent, totalFailed, totalQueued, last24Hours] = await Promise.all([
            prisma_1.prisma.emailLog.count({ where: { status: 'SENT' } }),
            prisma_1.prisma.emailLog.count({ where: { status: 'FAILED' } }),
            prisma_1.prisma.emailLog.count({ where: { status: 'QUEUED' } }),
            prisma_1.prisma.emailLog.count({ where: { createdAt: { gte: oneDayAgo } } }),
        ]);
        const totalProcessed = totalSent + totalFailed;
        const successRate = totalProcessed > 0 ? Math.round((totalSent / totalProcessed) * 100) : 100;
        (0, response_1.sendSuccess)(res, {
            totalSent,
            totalFailed,
            totalQueued,
            last24Hours,
            successRate,
        }, 'Email statistics loaded');
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminEmailStatsHandler = getAdminEmailStatsHandler;
const getAdminEmailTemplatesHandler = async (req, res, next) => {
    try {
        const defaultTemplates = [
            {
                key: 'OTP_VERIFICATION',
                name: 'Account Verification OTP',
                category: 'Authentication',
                subject: 'Verify Your Career Wings Account — OTP',
                variables: ['name', 'otp', 'expiry_minutes'],
                description: 'Sent to new users during registration to verify their email address.',
            },
            {
                key: 'WELCOME',
                name: 'Welcome Verified User',
                category: 'Onboarding',
                subject: 'Welcome to Career Wings — Account Successfully Verified',
                variables: ['name', 'account_type', 'dashboard_url'],
                description: 'Sent immediately upon successful OTP verification.',
            },
            {
                key: 'PASSWORD_RESET_OTP',
                name: 'Password Reset OTP',
                category: 'Security',
                subject: 'Career Wings Password Reset OTP',
                variables: ['name', 'otp', 'expiry_minutes'],
                description: 'Sent when a user requests a password reset code.',
            },
            {
                key: 'PASSWORD_CHANGED',
                name: 'Password Changed Alert',
                category: 'Security',
                subject: 'Your Career Wings Password Was Changed',
                variables: ['name', 'date', 'ip_address'],
                description: 'Security alert sent after password is reset or updated.',
            },
            {
                key: 'PACKAGE_ASSIGNED',
                name: 'Package Activated',
                category: 'Billing',
                subject: 'Your Career Wings Package Has Been Activated',
                variables: ['name', 'package_name', 'duration_days', 'amount', 'expiry_date'],
                description: 'Sent when an administrator manually assigns a package or plan.',
            },
            {
                key: 'PAYMENT_SUCCESS',
                name: 'Payment Successful Receipt',
                category: 'Billing',
                subject: 'Payment Successful — Career Wings',
                variables: ['name', 'package_name', 'amount', 'transaction_id', 'order_id'],
                description: 'Sent when an online payment completes successfully.',
            },
            {
                key: 'JOB_APPROVED',
                name: 'Job Posting Approved',
                category: 'Moderation',
                subject: 'Your Job Posting Has Been Approved — {{job_title}}',
                variables: ['employer_name', 'job_title', 'company_name', 'job_url'],
                description: 'Sent to recruiter when their submitted job is approved and published.',
            },
            {
                key: 'NEW_APPLICATION_EMPLOYER',
                name: 'New Application Alert',
                category: 'Recruitment',
                subject: 'New Application for {{job_title}} — {{candidate_name}}',
                variables: ['employer_name', 'candidate_name', 'job_title', 'applicants_url'],
                description: 'Sent to employer as soon as a job seeker applies.',
            },
        ];
        (0, response_1.sendSuccess)(res, defaultTemplates, 'Email templates catalog');
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminEmailTemplatesHandler = getAdminEmailTemplatesHandler;
// ========================================
// EDUCATION & HIGHEST DEGREE MASTER MANAGEMENT
// ========================================
exports.DEFAULT_EDUCATION_LEVELS = [
    '10th / HSLC',
    '12th / Higher Secondary',
    'Diploma / Polytechnic',
    'Bachelor Degree',
    'Master Degree',
    'Post Graduate Diploma',
    'Doctorate / Ph.D',
    'Any qualification',
];
exports.DEFAULT_HIGHEST_DEGREES = [
    'B.A',
    'B.Com',
    'B.Sc',
    'B.Tech',
    'B.E',
    'BBA',
    'BCA',
    'B.Ed',
    'B.Pharm',
    'M.A',
    'M.Com',
    'M.Sc',
    'M.Tech',
    'MBA',
    'MCA',
    'M.Ed',
    'M.Pharm',
    'MBBS',
    'BDS',
    'BAMS',
    'BHMS',
    'Nursing (B.Sc / GNM)',
    'LLB',
    'LLM',
    'Diploma / Polytechnic',
    'ITI',
    'Ph.D / Doctorate',
    'CA / CS / ICWA',
];
async function getEducationMasterData() {
    const [eduSetting, degreeSetting] = await Promise.all([
        prisma_1.prisma.adminSetting.findUnique({ where: { key: 'MASTER_EDUCATION_LEVELS' } }),
        prisma_1.prisma.adminSetting.findUnique({ where: { key: 'MASTER_HIGHEST_DEGREES' } }),
    ]);
    let educationLevels = exports.DEFAULT_EDUCATION_LEVELS;
    if (eduSetting?.value) {
        try {
            const parsed = JSON.parse(eduSetting.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
                educationLevels = parsed;
            }
        }
        catch { }
    }
    let highestDegrees = exports.DEFAULT_HIGHEST_DEGREES;
    if (degreeSetting?.value) {
        try {
            const parsed = JSON.parse(degreeSetting.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
                highestDegrees = parsed;
            }
        }
        catch { }
    }
    return { educationLevels, highestDegrees };
}
const getEducationMaster = async (req, res, next) => {
    try {
        const data = await getEducationMasterData();
        (0, response_1.sendSuccess)(res, data, 'Education and degree master list');
    }
    catch (error) {
        next(error);
    }
};
exports.getEducationMaster = getEducationMaster;
const addEducationLevel = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            throw new errors_1.AppError('Education level name is required', 400);
        }
        const trimmed = name.trim();
        const data = await getEducationMasterData();
        const exists = data.educationLevels.some(l => l.toLowerCase() === trimmed.toLowerCase());
        if (exists) {
            throw new errors_1.AppError('This education qualification already exists', 400);
        }
        const updated = [...data.educationLevels, trimmed];
        await prisma_1.prisma.adminSetting.upsert({
            where: { key: 'MASTER_EDUCATION_LEVELS' },
            create: {
                key: 'MASTER_EDUCATION_LEVELS',
                value: JSON.stringify(updated),
                group: 'CONTENT',
                label: 'Master Educational Qualifications',
                type: 'JSON',
            },
            update: {
                value: JSON.stringify(updated),
            },
        });
        (0, response_1.sendSuccess)(res, { educationLevels: updated }, 'Education level added successfully', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.addEducationLevel = addEducationLevel;
const deleteEducationLevel = async (req, res, next) => {
    try {
        const name = decodeURIComponent(req.params.name || '').trim();
        if (!name) {
            throw new errors_1.AppError('Education level name is required', 400);
        }
        const data = await getEducationMasterData();
        const updated = data.educationLevels.filter(l => l.toLowerCase() !== name.toLowerCase());
        await prisma_1.prisma.adminSetting.upsert({
            where: { key: 'MASTER_EDUCATION_LEVELS' },
            create: {
                key: 'MASTER_EDUCATION_LEVELS',
                value: JSON.stringify(updated),
                group: 'CONTENT',
                label: 'Master Educational Qualifications',
                type: 'JSON',
            },
            update: {
                value: JSON.stringify(updated),
            },
        });
        (0, response_1.sendSuccess)(res, { educationLevels: updated }, 'Education level deleted successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteEducationLevel = deleteEducationLevel;
const addHighestDegree = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            throw new errors_1.AppError('Degree name is required', 400);
        }
        const trimmed = name.trim();
        const data = await getEducationMasterData();
        const exists = data.highestDegrees.some(d => d.toLowerCase() === trimmed.toLowerCase());
        if (exists) {
            throw new errors_1.AppError('This degree already exists', 400);
        }
        const updated = [...data.highestDegrees, trimmed];
        await prisma_1.prisma.adminSetting.upsert({
            where: { key: 'MASTER_HIGHEST_DEGREES' },
            create: {
                key: 'MASTER_HIGHEST_DEGREES',
                value: JSON.stringify(updated),
                group: 'CONTENT',
                label: 'Master Highest Degrees',
                type: 'JSON',
            },
            update: {
                value: JSON.stringify(updated),
            },
        });
        (0, response_1.sendSuccess)(res, { highestDegrees: updated }, 'Highest degree added successfully', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.addHighestDegree = addHighestDegree;
const deleteHighestDegree = async (req, res, next) => {
    try {
        const name = decodeURIComponent(req.params.name || '').trim();
        if (!name) {
            throw new errors_1.AppError('Degree name is required', 400);
        }
        const data = await getEducationMasterData();
        const updated = data.highestDegrees.filter(d => d.toLowerCase() !== name.toLowerCase());
        await prisma_1.prisma.adminSetting.upsert({
            where: { key: 'MASTER_HIGHEST_DEGREES' },
            create: {
                key: 'MASTER_HIGHEST_DEGREES',
                value: JSON.stringify(updated),
                group: 'CONTENT',
                label: 'Master Highest Degrees',
                type: 'JSON',
            },
            update: {
                value: JSON.stringify(updated),
            },
        });
        (0, response_1.sendSuccess)(res, { highestDegrees: updated }, 'Highest degree deleted successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteHighestDegree = deleteHighestDegree;
// Candidate Education Record management (Admin)
const addCandidateEducation = async (req, res, next) => {
    try {
        const { candidateId } = req.params;
        const { degree, institution, fieldOfStudy, startYear, endYear, grade } = req.body;
        if (!degree || !institution || !startYear) {
            throw new errors_1.AppError('Degree, institution, and start year are required', 400);
        }
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { id: candidateId } });
        if (!candidate)
            throw new errors_1.AppError('Candidate not found', 404);
        const record = await prisma_1.prisma.education.create({
            data: {
                candidateId,
                degree,
                institution,
                fieldOfStudy: fieldOfStudy || null,
                startYear: Number(startYear),
                endYear: endYear ? Number(endYear) : null,
                grade: grade || null,
            },
        });
        (0, response_1.sendSuccess)(res, record, 'Candidate education added successfully', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.addCandidateEducation = addCandidateEducation;
const deleteCandidateEducation = async (req, res, next) => {
    try {
        const { candidateId, educationId } = req.params;
        const record = await prisma_1.prisma.education.findFirst({
            where: { id: educationId, candidateId },
        });
        if (!record)
            throw new errors_1.AppError('Education record not found', 404);
        await prisma_1.prisma.education.delete({ where: { id: educationId } });
        (0, response_1.sendSuccess)(res, null, 'Candidate education deleted successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCandidateEducation = deleteCandidateEducation;
const updateCandidateEducationAndDegree = async (req, res, next) => {
    try {
        const { candidateId } = req.params;
        const { educationLevel, highestDegree } = req.body;
        const candidate = await prisma_1.prisma.candidate.update({
            where: { id: candidateId },
            data: {
                ...(educationLevel !== undefined ? { educationLevel } : {}),
                ...(highestDegree !== undefined ? { highestDegree } : {}),
            },
        });
        (0, response_1.sendSuccess)(res, candidate, 'Candidate qualification updated successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.updateCandidateEducationAndDegree = updateCandidateEducationAndDegree;
//# sourceMappingURL=admin.controller.js.map