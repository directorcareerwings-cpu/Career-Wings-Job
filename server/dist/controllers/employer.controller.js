"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmployerDashboard = exports.getEmployerCounts = exports.getEmployerPayments = exports.getEmployerSubscription = exports.getAnalytics = exports.unsaveCandidate = exports.saveCandidate = exports.getSavedCandidates = exports.downloadCandidateResume = exports.getCandidateDetail = exports.sendCandidateInterviewOffer = exports.revealCandidateContact = exports.bulkDownloadCandidates = exports.searchCandidates = exports.updateApplicationStatus = exports.getApplicants = exports.getAllApplicants = exports.toggleJobFeatured = exports.getFeaturedJobQuota = exports.deleteJob = exports.updateJobStatus = exports.updateJob = exports.getEmployerJobById = exports.postJob = exports.getEmployerJobs = exports.getEmployerFeaturedJobQuota = exports.uploadCompanyLogo = exports.updateCompany = exports.updateEmployerProfile = exports.getCompanyProfile = void 0;
exports.computeCandidateJobMatch = computeCandidateJobMatch;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const slugify_1 = __importDefault(require("slugify"));
const prisma_1 = require("../lib/prisma");
const response_1 = require("../lib/response");
const errors_1 = require("../lib/errors");
const subscription_service_1 = require("../services/subscription.service");
const notification_service_1 = require("../services/notification.service");
const email_service_1 = require("../services/email.service");
const pdfGenerator_1 = require("../lib/pdfGenerator");
// ---- COMPANY PROFILE ----
const getCompanyProfile = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({
            where: { userId: req.user.id },
            include: { company: true },
        });
        if (!employer)
            throw new errors_1.AppError('Employer profile not found', 404);
        (0, response_1.sendSuccess)(res, employer);
    }
    catch (error) {
        next(error);
    }
};
exports.getCompanyProfile = getCompanyProfile;
const updateEmployerProfile = async (req, res, next) => {
    try {
        const { firstName, lastName, phone, designation } = req.body;
        const employer = await prisma_1.prisma.employer.update({
            where: { userId: req.user.id },
            data: { firstName, lastName, phone, designation },
            include: { company: true },
        });
        (0, response_1.sendSuccess)(res, employer, 'Profile updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateEmployerProfile = updateEmployerProfile;
const updateCompany = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({
            where: { userId: req.user.id },
            include: { company: true },
        });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const { name, website, email, phone, description, industry, companySize, foundedYear, headquarters, linkedin, twitter, facebook } = req.body;
        let company;
        if (employer.companyId) {
            company = await prisma_1.prisma.company.update({
                where: { id: employer.companyId },
                data: { name, website, email, phone, description, industry, companySize, foundedYear, headquarters, linkedin, twitter, facebook },
            });
        }
        else {
            const baseSlug = (0, slugify_1.default)(name, { lower: true, strict: true });
            let slug = baseSlug;
            let count = 0;
            while (await prisma_1.prisma.company.findUnique({ where: { slug } }))
                slug = `${baseSlug}-${++count}`;
            company = await prisma_1.prisma.company.create({
                data: { name, slug, website, email, phone, description, industry, companySize, foundedYear, headquarters, linkedin, twitter, facebook },
            });
            await prisma_1.prisma.employer.update({ where: { userId: req.user.id }, data: { companyId: company.id } });
        }
        (0, response_1.sendSuccess)(res, company, 'Company profile updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateCompany = updateCompany;
const uploadCompanyLogo = async (req, res, next) => {
    try {
        const file = req.file || (req.files && req.files[0]);
        if (!file)
            throw new errors_1.AppError('No logo image file provided. Please choose a file to upload.', 400);
        // Enforce 2MB maximum file size check
        if (file.size > 2 * 1024 * 1024) {
            throw new errors_1.AppError('Logo file size exceeds the 2 MB limit. Please select an image under 2 MB.', 400);
        }
        const employer = await prisma_1.prisma.employer.findUnique({
            where: { userId: req.user.id },
            include: { company: true },
        });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const logoUrl = `/uploads/images/${file.filename}`;
        if (!employer.companyId) {
            const company = await prisma_1.prisma.company.create({
                data: {
                    name: employer.firstName ? `${employer.firstName}'s Company` : 'My Company',
                    slug: `company-${Date.now()}`,
                    logo: logoUrl,
                },
            });
            await prisma_1.prisma.employer.update({
                where: { id: employer.id },
                data: { companyId: company.id },
            });
        }
        else {
            await prisma_1.prisma.company.update({
                where: { id: employer.companyId },
                data: { logo: logoUrl },
            });
        }
        (0, response_1.sendSuccess)(res, { logo: logoUrl }, 'Company logo uploaded successfully (Max 2 MB)');
    }
    catch (error) {
        next(error);
    }
};
exports.uploadCompanyLogo = uploadCompanyLogo;
// ---- JOBS ----
/**
 * Helper to calculate employer's active featured job allowance and current usage
 */
const getEmployerFeaturedJobQuota = async (userId, employerId) => {
    try {
        const sub = await (0, subscription_service_1.getActiveSubscription)(userId);
        let limit = 0;
        if (sub?.limitsSnapshot) {
            try {
                const limits = JSON.parse(sub.limitsSnapshot);
                if (limits.featuredJobs !== undefined && limits.featuredJobs !== null) {
                    limit = Number(limits.featuredJobs);
                }
            }
            catch { }
        }
        const isUnlimited = limit === -1;
        const used = await prisma_1.prisma.job.count({
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
    }
    catch (err) {
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
exports.getEmployerFeaturedJobQuota = getEmployerFeaturedJobQuota;
const getEmployerJobs = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '50', 10);
        const statusParam = (req.query.status || '').toUpperCase();
        const skip = (page - 1) * limit;
        let statusCondition = undefined;
        if (statusParam === 'LIVE' || statusParam === 'PUBLISHED') {
            statusCondition = { in: ['PUBLISHED', 'FEATURED'] };
        }
        else if (statusParam === 'PENDING') {
            statusCondition = 'PENDING';
        }
        else if (statusParam === 'REJECTED') {
            statusCondition = 'REJECTED';
        }
        else if (statusParam && statusParam !== 'ALL') {
            statusCondition = statusParam;
        }
        const where = {
            employerId: employer.id,
            deletedAt: null,
            ...(statusCondition ? { status: statusCondition } : {}),
        };
        const [jobs, total, countsByStatus, totalAll] = await Promise.all([
            prisma_1.prisma.job.findMany({
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
            prisma_1.prisma.job.count({ where }),
            prisma_1.prisma.job.groupBy({
                by: ['status'],
                where: { employerId: employer.id, deletedAt: null },
                _count: true,
            }),
            prisma_1.prisma.job.count({ where: { employerId: employer.id, deletedAt: null } }),
        ]);
        const statusMap = {};
        countsByStatus.forEach((item) => {
            statusMap[item.status] = item._count;
        });
        const counts = {
            all: totalAll,
            pending: statusMap['PENDING'] || 0,
            live: (statusMap['PUBLISHED'] || 0) + (statusMap['FEATURED'] || 0),
            rejected: statusMap['REJECTED'] || 0,
        };
        const featuredQuota = await (0, exports.getEmployerFeaturedJobQuota)(req.user.id, employer.id);
        (0, response_1.sendPaginated)(res, jobs, total, page, limit, 'Success', { counts, featuredQuota });
    }
    catch (error) {
        next(error);
    }
};
exports.getEmployerJobs = getEmployerJobs;
const postJob = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({
            where: { userId: req.user.id },
            include: { company: true },
        });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        // Require Admin approval to post jobs
        if (!employer.isVerified) {
            throw new errors_1.AppError('Your employer account is currently pending Admin approval. Once our team approves your profile, you will be able to post jobs.', 403);
        }
        // Check subscription limit
        const limitCheck = await (0, subscription_service_1.checkLimit)(req.user.id, 'jobPostings');
        if (!limitCheck.allowed) {
            throw new errors_1.AppError('You have reached your job posting limit. Please upgrade your subscription.', 403);
        }
        const { title, description, responsibilities, requirements, benefits, categoryId, industryId, department, salaryMin, salaryMax, salaryCurrency, salaryPeriod, showSalary, locationId, locationText, workMode, jobType, experienceMin, experienceMax, educationLevel, highestDegree, genderPreference, vacancies, state, district, city, country, applicationDeadline, applicationMethod, applicationEmail, applicationUrl, skills, isFeatured, } = req.body;
        // Validate Featured Job quota according to active package limits
        const wantsFeatured = Boolean(isFeatured);
        if (wantsFeatured) {
            const quota = await (0, exports.getEmployerFeaturedJobQuota)(req.user.id, employer.id);
            if (!quota.canFeature) {
                if (quota.limit <= 0) {
                    throw new errors_1.AppError(`Your active package (${quota.packageName}) does not include Featured Job listings. Please upgrade your package to feature this job.`, 403);
                }
                else {
                    throw new errors_1.AppError(`You have used all ${quota.limit} featured job slots in your active package (${quota.used}/${quota.limit} used). Please unfeature another vacancy or upgrade your package.`, 403);
                }
            }
        }
        const baseSlug = (0, slugify_1.default)(`${title}-${employer.company?.name || 'company'}`, { lower: true, strict: true });
        let slug = baseSlug;
        let count = 0;
        while (await prisma_1.prisma.job.findUnique({ where: { slug } }))
            slug = `${baseSlug}-${++count}`;
        // All employer job postings must go through Admin Review & Approval
        const autoApprove = await prisma_1.prisma.adminSetting.findUnique({ where: { key: 'AUTO_APPROVE_JOBS' } });
        const isAutoApprove = autoApprove?.value === 'true';
        const status = isAutoApprove ? 'PUBLISHED' : 'PENDING';
        // Calculate job validity from subscription
        const subSummary = await (0, subscription_service_1.getSubscriptionSummary)(req.user.id);
        const jobDurationDays = subSummary.limits?.jobDurationDays || 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + jobDurationDays);
        const fullLocationText = locationText || [city || 'Guwahati', district || 'Kamrup Metropolitan (Guwahati)', state || 'Assam'].filter(Boolean).join(', ');
        const job = await prisma_1.prisma.$transaction(async (tx) => {
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
                    if (!rawVal)
                        continue;
                    // Find existing skill by ID, name or slug
                    let skill = await tx.skill.findFirst({
                        where: {
                            OR: [
                                { id: rawVal },
                                { name: { equals: rawVal } },
                                { slug: (0, slugify_1.default)(rawVal, { lower: true, strict: true }) },
                            ],
                        },
                    });
                    // Create if not exists
                    if (!skill) {
                        const skillSlug = (0, slugify_1.default)(rawVal, { lower: true, strict: true }) || `sk-${Date.now()}`;
                        try {
                            skill = await tx.skill.create({
                                data: {
                                    name: rawVal,
                                    slug: skillSlug,
                                },
                            });
                        }
                        catch {
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
        await (0, subscription_service_1.consumeCredit)(req.user.id, 'jobPostings').catch(console.error);
        // Notify admin about new job submission for review
        if (status === 'PENDING') {
            prisma_1.prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } }).then((admins) => {
                for (const admin of admins) {
                    (0, notification_service_1.createNotification)(admin.id, 'SYSTEM', 'New Job Pending Approval', `New Job "${title}" posted by ${employer.company?.name || employer.firstName || 'Employer'}`, '/admin/jobs').catch(console.error);
                }
            }).catch(console.error);
        }
        (0, response_1.sendSuccess)(res, job, status === 'PUBLISHED' ? 'Job posted successfully!' : 'Job submitted for Admin review and approval.', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.postJob = postJob;
const getEmployerJobById = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const job = await prisma_1.prisma.job.findFirst({
            where: { id: req.params.id, employerId: employer.id, deletedAt: null },
            include: { category: true, location: true, company: true, jobSkills: { include: { skill: true } } },
        });
        if (!job)
            throw new errors_1.AppError('Job not found', 404);
        (0, response_1.sendSuccess)(res, job);
    }
    catch (error) {
        next(error);
    }
};
exports.getEmployerJobById = getEmployerJobById;
const updateJob = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({
            where: { userId: req.user.id },
            include: { company: true },
        });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const job = await prisma_1.prisma.job.findFirst({ where: { id: req.params.id, employerId: employer.id, deletedAt: null } });
        if (!job)
            throw new errors_1.AppError('Job not found', 404);
        if (job.status === 'CLOSED' || job.status === 'EXPIRED') {
            throw new errors_1.AppError('Cannot edit a closed or expired job', 400);
        }
        const { skills, isFeatured, ...jobData } = req.body;
        let finalIsFeatured = job.isFeatured;
        if (isFeatured !== undefined) {
            const wantsFeatured = Boolean(isFeatured);
            if (wantsFeatured && !job.isFeatured) {
                const quota = await (0, exports.getEmployerFeaturedJobQuota)(req.user.id, employer.id);
                if (!quota.canFeature) {
                    if (quota.limit <= 0) {
                        throw new errors_1.AppError(`Your active package (${quota.packageName}) does not include Featured Job listings. Please upgrade your package to feature this job.`, 403);
                    }
                    else {
                        throw new errors_1.AppError(`You have used all ${quota.limit} featured job slots available in your ${quota.packageName} package (${quota.used}/${quota.limit} used). Please unfeature another job or upgrade your plan.`, 403);
                    }
                }
            }
            finalIsFeatured = wantsFeatured;
        }
        // If editing a published or featured job, it requires Admin re-approval before live
        const autoApprove = await prisma_1.prisma.adminSetting.findUnique({ where: { key: 'AUTO_APPROVE_JOBS' } });
        const isLive = job.status === 'PUBLISHED' || job.status === 'FEATURED';
        const needsApproval = isLive && autoApprove?.value !== 'true';
        let newStatus = job.status;
        if (needsApproval) {
            newStatus = 'PENDING';
        }
        else if (finalIsFeatured && (job.status === 'PUBLISHED' || job.status === 'FEATURED')) {
            newStatus = 'FEATURED';
        }
        else if (!finalIsFeatured && job.status === 'FEATURED') {
            newStatus = 'PUBLISHED';
        }
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
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
            prisma_1.prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } }).then((admins) => {
                for (const admin of admins) {
                    (0, notification_service_1.createNotification)(admin.id, 'SYSTEM', 'Edited Job Pending Approval', `Job "${job.title}" was updated by ${employer.company?.name || employer.firstName} and needs re-approval`, '/admin/jobs').catch(console.error);
                }
            }).catch(console.error);
        }
        (0, response_1.sendSuccess)(res, updated, needsApproval
            ? 'Job updated and submitted for Admin review. It will go live once re-approved.'
            : 'Job updated successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.updateJob = updateJob;
const updateJobStatus = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const { status } = req.body;
        const allowedStatuses = ['DRAFT', 'PAUSED', 'CLOSED', 'PENDING'];
        if (!allowedStatuses.includes(status)) {
            throw new errors_1.AppError(`Employers can only change status to: ${allowedStatuses.join(', ')}. Jobs must be approved by Admin before going live.`, 400);
        }
        await prisma_1.prisma.job.updateMany({
            where: { id: req.params.id, employerId: employer.id, deletedAt: null },
            data: { status },
        });
        (0, response_1.sendSuccess)(res, null, `Job ${status.toLowerCase()}`);
    }
    catch (error) {
        next(error);
    }
};
exports.updateJobStatus = updateJobStatus;
const deleteJob = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        await prisma_1.prisma.job.updateMany({
            where: { id: req.params.id, employerId: employer.id },
            data: { deletedAt: new Date() },
        });
        (0, response_1.sendSuccess)(res, null, 'Job deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteJob = deleteJob;
const getFeaturedJobQuota = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const quota = await (0, exports.getEmployerFeaturedJobQuota)(req.user.id, employer.id);
        (0, response_1.sendSuccess)(res, quota);
    }
    catch (error) {
        next(error);
    }
};
exports.getFeaturedJobQuota = getFeaturedJobQuota;
const toggleJobFeatured = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const job = await prisma_1.prisma.job.findFirst({
            where: { id: req.params.id, employerId: employer.id, deletedAt: null },
        });
        if (!job)
            throw new errors_1.AppError('Job not found or unauthorized', 404);
        const targetFeatured = req.body.isFeatured !== undefined ? Boolean(req.body.isFeatured) : !job.isFeatured;
        if (targetFeatured) {
            if (!job.isFeatured) {
                const quota = await (0, exports.getEmployerFeaturedJobQuota)(req.user.id, employer.id);
                if (!quota.canFeature) {
                    if (quota.limit <= 0) {
                        throw new errors_1.AppError(`Your current package (${quota.packageName}) does not include Featured Job listings. Please upgrade your package to feature this job.`, 403);
                    }
                    else {
                        throw new errors_1.AppError(`You have used all ${quota.limit} featured job slots available in your ${quota.packageName} package (${quota.used}/${quota.limit} used). Please unfeature another job or upgrade your plan.`, 403);
                    }
                }
            }
            const updatedJob = await prisma_1.prisma.job.update({
                where: { id: job.id },
                data: {
                    isFeatured: true,
                    status: job.status === 'PUBLISHED' ? 'FEATURED' : job.status,
                },
            });
            const updatedQuota = await (0, exports.getEmployerFeaturedJobQuota)(req.user.id, employer.id);
            (0, response_1.sendSuccess)(res, { job: updatedJob, quota: updatedQuota }, 'Job is now Featured on homepage and top of search!');
        }
        else {
            const updatedJob = await prisma_1.prisma.job.update({
                where: { id: job.id },
                data: {
                    isFeatured: false,
                    status: job.status === 'FEATURED' ? 'PUBLISHED' : job.status,
                },
            });
            const updatedQuota = await (0, exports.getEmployerFeaturedJobQuota)(req.user.id, employer.id);
            (0, response_1.sendSuccess)(res, { job: updatedJob, quota: updatedQuota }, 'Job unfeatured. 1 slot freed up in your package.');
        }
    }
    catch (error) {
        next(error);
    }
};
exports.toggleJobFeatured = toggleJobFeatured;
// ---- APPLICANTS ----
function computeCandidateJobMatch(job, candidate) {
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
    const jobSkills = (job.jobSkills || [])
        .map((js) => js.skill?.name?.toLowerCase().trim())
        .filter(Boolean);
    const candSkills = (candidate.candidateSkills || [])
        .map((cs) => cs.skill?.name?.toLowerCase().trim())
        .filter(Boolean);
    let skillsScore = 0;
    if (jobSkills.length === 0) {
        skillsScore = 40;
        criteria.skills = true;
    }
    else {
        const matchedSkills = jobSkills.filter((reqSkill) => {
            const inSkills = candSkills.some((s) => s.includes(reqSkill) || reqSkill.includes(s));
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
    }
    else if (candExp >= jobMinExp) {
        experienceScore = 25;
        criteria.experience = true;
    }
    else if (candExp >= jobMinExp * 0.7) {
        experienceScore = 18;
        criteria.experience = true;
    }
    else if (candExp > 0) {
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
    }
    else {
        const isSameCity = (jobCity && (candLocation.includes(jobCity) || candCity.includes(jobCity))) ||
            (candPref && jobCity && candPref.includes(jobCity));
        const isSameState = (jobState && (candLocation.includes(jobState) || candState.includes(jobState))) ||
            (candLocation.includes('assam') && jobState.includes('assam'));
        if (isSameCity) {
            locationScore = 15;
            criteria.location = true;
        }
        else if (isSameState) {
            locationScore = 11;
            criteria.location = true;
        }
        else if (candLocation) {
            locationScore = 5;
        }
        else {
            locationScore = 10;
            criteria.location = true;
        }
    }
    // 4. Education Match (Weight: 10%)
    let educationScore = 0;
    const jobEdu = (job.highestDegree || job.educationLevel || '').toLowerCase();
    const candEdu = (candidate.highestDegree || candidate.educationLevel || '').toLowerCase();
    const candEduHistory = (candidate.education || []).map((e) => (e.degree || '').toLowerCase()).join(' ');
    if (!jobEdu) {
        educationScore = 10;
        criteria.education = true;
    }
    else {
        const eduMatches = candEdu.includes(jobEdu) || jobEdu.includes(candEdu) ||
            candEduHistory.includes(jobEdu) ||
            (jobEdu.includes('bachelor') && (candEdu.includes('bachelor') || candEdu.includes('b.') || candEdu.includes('degree'))) ||
            (jobEdu.includes('master') && (candEdu.includes('master') || candEdu.includes('m.') || candEdu.includes('mba')));
        if (eduMatches) {
            educationScore = 10;
            criteria.education = true;
        }
        else if (candEdu) {
            educationScore = 6;
            criteria.education = true;
        }
        else {
            educationScore = 5;
        }
    }
    // 5. Salary Match (Weight: 10%)
    let salaryScore = 10;
    if (job.salaryMax && candidate.expectedSalaryMin) {
        if (candidate.expectedSalaryMin <= job.salaryMax) {
            salaryScore = 10;
            criteria.salary = true;
        }
        else if (candidate.expectedSalaryMin <= job.salaryMax * 1.25) {
            salaryScore = 6;
        }
        else {
            salaryScore = 2;
        }
    }
    else {
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
const getAllApplicants = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '50', 10);
        const status = req.query.status;
        const jobId = req.query.jobId;
        const keyword = req.query.keyword;
        const sortBy = req.query.sortBy || 'recent';
        const skip = (page - 1) * limit;
        // Get all employer jobs (for match computation and filtering)
        const employerJobs = await prisma_1.prisma.job.findMany({
            where: { employerId: employer.id, deletedAt: null },
            include: { jobSkills: { include: { skill: true } } },
        });
        const employerJobIds = employerJobs.map(j => j.id);
        const jobMap = new Map(employerJobs.map(j => [j.id, j]));
        if (employerJobIds.length === 0) {
            (0, response_1.sendPaginated)(res, [], 0, page, limit);
            return;
        }
        // Build where clause
        const where = {
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
        let orderBy = { appliedAt: 'desc' };
        if (sortBy === 'experience') {
            orderBy = { candidate: { totalExperience: 'desc' } };
        }
        else if (sortBy === 'package') {
            orderBy = { candidate: { expectedSalaryMax: 'desc' } };
        }
        const isCustomSort = sortBy === 'matching';
        const [rawApplications, total] = await Promise.all([
            prisma_1.prisma.application.findMany({
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
            prisma_1.prisma.application.count({ where }),
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
            prisma_1.prisma.application.count({ where: { jobId: { in: employerJobIds }, deletedAt: null, status: 'APPLIED' } }),
            prisma_1.prisma.application.count({ where: { jobId: { in: employerJobIds }, deletedAt: null, status: 'VIEWED' } }),
            prisma_1.prisma.application.count({ where: { jobId: { in: employerJobIds }, deletedAt: null, status: 'SHORTLISTED' } }),
            prisma_1.prisma.application.count({ where: { jobId: { in: employerJobIds }, deletedAt: null, status: 'INTERVIEW' } }),
            prisma_1.prisma.application.count({ where: { jobId: { in: employerJobIds }, deletedAt: null, status: 'SELECTED' } }),
            prisma_1.prisma.application.count({ where: { jobId: { in: employerJobIds }, deletedAt: null, status: 'REJECTED' } }),
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
    }
    catch (error) {
        next(error);
    }
};
exports.getAllApplicants = getAllApplicants;
const getApplicants = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const job = await prisma_1.prisma.job.findFirst({
            where: { id: req.params.jobId, employerId: employer.id },
            include: {
                jobSkills: { include: { skill: true } },
            },
        });
        if (!job)
            throw new errors_1.AppError('Job not found', 404);
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '20', 10);
        const status = req.query.status;
        const skip = (page - 1) * limit;
        const where = { jobId: req.params.jobId, ...(status ? { status } : {}), deletedAt: null };
        const [rawApplications, total] = await Promise.all([
            prisma_1.prisma.application.findMany({
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
            prisma_1.prisma.application.count({ where }),
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
        (0, response_1.sendPaginated)(res, applications, total, page, limit);
    }
    catch (error) {
        next(error);
    }
};
exports.getApplicants = getApplicants;
const updateApplicationStatus = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const job = await prisma_1.prisma.job.findFirst({ where: { id: req.params.jobId, employerId: employer.id } });
        if (!job)
            throw new errors_1.AppError('Job not found', 404);
        const { status, employerNotes, rejectionReason } = req.body;
        const validStatuses = ['VIEWED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED'];
        if (!validStatuses.includes(status))
            throw new errors_1.AppError('Invalid status', 400);
        const application = await prisma_1.prisma.application.findFirst({
            where: { id: req.params.applicationId, jobId: req.params.jobId },
            include: { candidate: { include: { user: true } } },
        });
        if (!application)
            throw new errors_1.AppError('Application not found', 404);
        await prisma_1.prisma.application.update({
            where: { id: req.params.applicationId },
            data: {
                status,
                employerNotes: employerNotes || null,
                rejectionReason: rejectionReason || null,
                viewedAt: status === 'VIEWED' && !application.viewedAt ? new Date() : application.viewedAt,
            },
        });
        // Notify candidate
        const statusMessages = {
            VIEWED: 'Your application has been reviewed.',
            SHORTLISTED: 'Congratulations! You have been shortlisted.',
            INTERVIEW: 'You have been invited for an interview!',
            SELECTED: 'Congratulations! You have been selected!',
            REJECTED: 'Unfortunately, your application was not selected.',
        };
        await (0, notification_service_1.createNotification)(application.candidate.userId, status === 'SHORTLISTED' ? 'SHORTLISTED' : status === 'INTERVIEW' ? 'APPLICATION' : 'APPLICATION', `Application ${status}`, `Your application for "${job.title}" has been updated: ${statusMessages[status]}`, '/my-applications').catch(() => null);
        // Send email notification
        const candidateUser = application.candidate;
        (0, email_service_1.sendApplicationStatusEmail)(application.candidate.user?.email || '', `${candidateUser.firstName} ${candidateUser.lastName}`, job.title, status, employerNotes).catch(console.error);
        (0, response_1.sendSuccess)(res, null, 'Application status updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateApplicationStatus = updateApplicationStatus;
// ---- CANDIDATE DATABASE ----
const searchCandidates = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        const unlockedLogs = employer
            ? await prisma_1.prisma.resumeSearchLog.findMany({
                where: { employerId: employer.id, action: { in: ['CONTACT_UNLOCKED', 'DOWNLOADED'] } },
                select: { candidateId: true },
            })
            : [];
        const unlockedCandidateIds = new Set(unlockedLogs.map((l) => l.candidateId));
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '100', 10);
        const skip = (page - 1) * limit;
        const { q, skills, qualification, highestDegree, location, city, district, state, experienceMin, experienceMax, gender, jobRole, hasResume, activeIn, } = req.query;
        const where = {
            deletedAt: null,
            resumeVisibility: { in: ['PUBLIC', 'EMPLOYERS_ONLY'] },
        };
        if (activeIn && activeIn !== 'ALL') {
            const daysMap = {
                '7_DAYS': 7,
                '15_DAYS': 15,
                '1_MONTH': 30,
                '6_MONTH': 180,
                '6_MONTHS': 180,
                '1_YEAR': 365,
            };
            const days = daysMap[activeIn];
            if (days) {
                const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
                where.updatedAt = { gte: cutoff };
            }
        }
        if (q) {
            where.OR = [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
                { headline: { contains: q } },
                { summary: { contains: q } },
            ];
        }
        if (skills) {
            where.candidateSkills = {
                some: {
                    skill: {
                        name: { contains: skills },
                    },
                },
            };
        }
        if (qualification && qualification !== 'All Qualifications') {
            where.educationLevel = { contains: qualification };
        }
        if (highestDegree && highestDegree !== 'All Highest Degrees') {
            where.highestDegree = { contains: highestDegree };
        }
        const locSearch = (city || location);
        if (locSearch) {
            where.OR = [
                ...(where.OR || []),
                { currentLocation: { contains: locSearch } },
                { city: { contains: locSearch } },
            ];
        }
        if (district && district !== 'All Districts of India') {
            where.OR = [
                ...(where.OR || []),
                { currentLocation: { contains: district } },
            ];
        }
        if (state && state !== 'All States of India') {
            where.OR = [
                ...(where.OR || []),
                { state: { contains: state } },
                { currentLocation: { contains: state } },
            ];
        }
        if (gender && gender !== 'Any gender') {
            where.gender = { equals: gender.toUpperCase() };
        }
        if (jobRole) {
            where.OR = [
                ...(where.OR || []),
                { headline: { contains: jobRole } },
                { currentRole: { contains: jobRole } },
            ];
        }
        if (String(hasResume) === 'true') {
            where.resumeFile = { not: null };
        }
        if (experienceMin) {
            where.totalExperience = { gte: parseFloat(experienceMin) };
        }
        if (experienceMax) {
            where.totalExperience = {
                ...(where.totalExperience || {}),
                lte: parseFloat(experienceMax),
            };
        }
        const [candidates, total] = await Promise.all([
            prisma_1.prisma.candidate.findMany({
                where,
                include: {
                    user: { select: { email: true } },
                    candidateSkills: { include: { skill: { select: { name: true } } }, take: 5 },
                    education: { take: 1, orderBy: { startYear: 'desc' }, select: { degree: true, institution: true } },
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.candidate.count({ where }),
        ]);
        const formattedCandidates = candidates.map((cand) => {
            const isUnlocked = unlockedCandidateIds.has(cand.id);
            const rawEmail = cand.user?.email || 'candidate@example.com';
            const maskedEmail = rawEmail.replace(/^(..)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c);
            const rawPhone = cand.phone || '+91 98765 43210';
            const maskedPhone = '📱 -';
            return {
                id: cand.id,
                firstName: cand.firstName,
                lastName: cand.lastName,
                headline: cand.headline || 'Active Job Seeker',
                currentLocation: cand.currentLocation || 'Guwahati, Assam',
                educationLevel: cand.educationLevel || 'Graduate / Diploma',
                highestDegree: cand.highestDegree || 'B.A',
                totalExperience: cand.totalExperience ?? 2,
                gender: cand.gender || 'Not specified',
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
        (0, response_1.sendPaginated)(res, formattedCandidates, total, page, limit);
    }
    catch (error) {
        next(error);
    }
};
exports.searchCandidates = searchCandidates;
// ---- BULK DOWNLOAD DATA (CSV with credit deduction) ----
const bulkDownloadCandidates = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const { candidateIds } = req.body;
        if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
            throw new errors_1.AppError('No candidates selected for download', 400);
        }
        // Find already-unlocked candidates for this employer
        const alreadyUnlocked = await prisma_1.prisma.resumeSearchLog.findMany({
            where: {
                employerId: employer.id,
                candidateId: { in: candidateIds },
                action: { in: ['CONTACT_UNLOCKED', 'DOWNLOADED'] },
            },
            select: { candidateId: true },
        });
        const alreadyUnlockedIds = new Set(alreadyUnlocked.map((u) => u.candidateId));
        // Calculate how many NEW credits are needed
        const newUnlockIds = candidateIds.filter((id) => !alreadyUnlockedIds.has(id));
        const creditsNeeded = newUnlockIds.length;
        // Check if employer has enough credits (only for new unlocks)
        if (creditsNeeded > 0) {
            const sub = await prisma_1.prisma.subscription.findFirst({
                where: { userId: req.user.id, status: 'ACTIVE', endDate: { gte: new Date() } },
                orderBy: { endDate: 'desc' },
            });
            if (!sub) {
                throw new errors_1.AppError('No active subscription found. Please purchase a package to download candidate data.', 403);
            }
            const limits = JSON.parse(sub.limitsSnapshot || '{}');
            const usage = JSON.parse(sub.usageData || '{}');
            const cvLimit = limits.resumeDownloads ?? limits.cvAccess ?? 0;
            const cvUsed = usage.resumeDownloads ?? usage.cvAccess ?? 0;
            const cvRemaining = typeof cvLimit === 'number' ? cvLimit - cvUsed : 999;
            if (cvLimit !== -1 && creditsNeeded > cvRemaining) {
                throw new errors_1.AppError(`Not enough Resume Access credits. You need ${creditsNeeded} credits but only have ${cvRemaining} remaining. Select fewer candidates or upgrade your package.`, 403);
            }
            // Consume credits for all new unlocks
            if (cvLimit !== -1) {
                const newUsage = {
                    ...usage,
                    resumeDownloads: cvUsed + creditsNeeded,
                    cvAccess: cvUsed + creditsNeeded,
                };
                await prisma_1.prisma.subscription.update({
                    where: { id: sub.id },
                    data: { usageData: JSON.stringify(newUsage) },
                });
            }
        }
        // Log new unlocks
        for (const candId of newUnlockIds) {
            await prisma_1.prisma.resumeSearchLog.create({
                data: {
                    employerId: employer.id,
                    candidateId: candId,
                    action: 'DOWNLOADED',
                },
            }).catch(() => null);
        }
        // Fetch full candidate data for all requested IDs
        const candidates = await prisma_1.prisma.candidate.findMany({
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
        (0, response_1.sendSuccess)(res, {
            candidates: downloadData,
            creditsConsumed: creditsNeeded,
            totalDownloaded: downloadData.length,
            alreadyUnlockedCount: candidateIds.length - creditsNeeded,
        }, `${downloadData.length} candidates downloaded. ${creditsNeeded} resume access credits consumed.`);
    }
    catch (error) {
        next(error);
    }
};
exports.bulkDownloadCandidates = bulkDownloadCandidates;
const revealCandidateContact = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const candidate = await prisma_1.prisma.candidate.findUnique({
            where: { id: req.params.candidateId },
            include: {
                user: { select: { email: true } },
                candidateSkills: { include: { skill: true } },
                education: true,
                experience: true,
            },
        });
        if (!candidate)
            throw new errors_1.AppError('Candidate not found', 404);
        const existingUnlock = await prisma_1.prisma.resumeSearchLog.findFirst({
            where: { employerId: employer.id, candidateId: candidate.id, action: 'CONTACT_UNLOCKED' },
        });
        if (!existingUnlock) {
            await (0, subscription_service_1.consumeCredit)(req.user.id, 'resumeDownloads').catch(() => null);
            await prisma_1.prisma.resumeSearchLog.create({
                data: {
                    employerId: employer.id,
                    candidateId: candidate.id,
                    action: 'CONTACT_UNLOCKED',
                },
            });
        }
        (0, response_1.sendSuccess)(res, {
            id: candidate.id,
            name: `${candidate.firstName} ${candidate.lastName}`,
            email: candidate.user?.email || 'candidate@careerwings.in',
            phone: candidate.phone || '+91 98765 43210',
            isUnlocked: true,
            resumeFile: candidate.resumeFile,
            resumeFileName: candidate.resumeFileName || 'Verified_Resume.pdf',
        }, 'Contact & Resume Unlocked');
    }
    catch (error) {
        next(error);
    }
};
exports.revealCandidateContact = revealCandidateContact;
const sendCandidateInterviewOffer = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({
            where: { userId: req.user.id },
            include: { company: true },
        });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const candidate = await prisma_1.prisma.candidate.findUnique({
            where: { id: req.params.candidateId },
            include: { user: true },
        });
        if (!candidate)
            throw new errors_1.AppError('Candidate not found', 404);
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
        await (0, notification_service_1.createNotification)(candidate.userId, 'INTERVIEW', `🎯 Interview Invitation from ${companyName}`, messageBody, '/notifications').catch(() => null);
        await prisma_1.prisma.resumeSearchLog.create({
            data: {
                employerId: employer.id,
                candidateId: candidate.id,
                action: 'CONTACTED',
            },
        }).catch(() => null);
        (0, response_1.sendSuccess)(res, null, 'Interview offer sent successfully to candidate');
    }
    catch (error) {
        next(error);
    }
};
exports.sendCandidateInterviewOffer = sendCandidateInterviewOffer;
const getCandidateDetail = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({
            where: { id: req.params.candidateId },
            include: {
                user: { select: { email: true } },
                candidateSkills: { include: { skill: true } },
                education: { orderBy: { startYear: 'desc' } },
                experience: { orderBy: { startDate: 'desc' } },
                certifications: true,
                languages: true,
            },
        });
        if (!candidate || candidate.deletedAt) {
            throw new errors_1.AppError('Candidate profile not found or not visible', 404);
        }
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        const isUnlocked = employer
            ? Boolean(await prisma_1.prisma.resumeSearchLog.findFirst({
                where: { employerId: employer.id, candidateId: candidate.id, action: { in: ['CONTACT_UNLOCKED', 'DOWNLOADED'] } },
            }))
            : false;
        const rawEmail = candidate.user?.email || 'candidate@example.com';
        const maskedEmail = rawEmail.replace(/^(..)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c);
        const rawPhone = candidate.phone || '+91 98765 43210';
        const maskedPhone = '📱 -';
        const result = {
            ...candidate,
            email: isUnlocked ? rawEmail : maskedEmail,
            phone: isUnlocked ? rawPhone : maskedPhone,
            isUnlocked,
        };
        if (employer) {
            await prisma_1.prisma.resumeSearchLog.create({
                data: { employerId: employer.id, candidateId: candidate.id, action: 'VIEWED' },
            }).catch(() => null);
        }
        (0, response_1.sendSuccess)(res, result);
    }
    catch (error) {
        next(error);
    }
};
exports.getCandidateDetail = getCandidateDetail;
const downloadCandidateResume = async (req, res, next) => {
    try {
        const limitCheck = await (0, subscription_service_1.checkLimit)(req.user.id, 'resumeDownloads');
        if (!limitCheck.allowed) {
            throw new errors_1.AppError('You have exhausted your resume download credits. Please upgrade your subscription.', 403);
        }
        const candidate = await prisma_1.prisma.candidate.findUnique({
            where: { id: req.params.candidateId },
            include: {
                user: { select: { email: true } },
                candidateSkills: { include: { skill: true } },
            },
        });
        if (!candidate || candidate.deletedAt) {
            throw new errors_1.AppError('Candidate not found or deleted', 404);
        }
        if (candidate.resumeVisibility === 'PRIVATE') {
            throw new errors_1.AppError('This candidate\'s resume is not available for download', 403);
        }
        const relPath = (candidate.resumeFile || `/uploads/resumes/${candidate.id}_resume.pdf`).replace('/uploads/', 'uploads/');
        const filePath = path_1.default.join(process.cwd(), relPath);
        // If file does not exist on disk, synthesize an authentic Career Wings PDF resume
        if (!fs_1.default.existsSync(filePath)) {
            const dir = path_1.default.dirname(filePath);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            const skillsStr = candidate.candidateSkills?.map((cs) => cs.skill?.name).filter(Boolean).join(', ') || '';
            const pdfBuf = (0, pdfGenerator_1.generateCandidatePDFBuffer)({
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
            fs_1.default.writeFileSync(filePath, pdfBuf);
        }
        // Log download
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (employer) {
            await prisma_1.prisma.resumeSearchLog.create({
                data: { employerId: employer.id, candidateId: candidate.id, action: 'DOWNLOADED' },
            }).catch(() => null);
        }
        await (0, subscription_service_1.consumeCredit)(req.user.id, 'resumeDownloads').catch(console.error);
        const downloadName = candidate.resumeFileName || `${candidate.firstName}_${candidate.lastName}_Resume.pdf`.replace(/\s+/g, '_');
        res.download(filePath, downloadName);
    }
    catch (error) {
        next(error);
    }
};
exports.downloadCandidateResume = downloadCandidateResume;
// ---- SAVED CANDIDATES ----
const getSavedCandidates = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const saved = await prisma_1.prisma.savedCandidate.findMany({
            where: { employerId: employer.id },
            orderBy: { savedAt: 'desc' },
        });
        (0, response_1.sendSuccess)(res, saved);
    }
    catch (error) {
        next(error);
    }
};
exports.getSavedCandidates = getSavedCandidates;
const saveCandidate = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        await prisma_1.prisma.savedCandidate.upsert({
            where: { employerId_candidateId: { employerId: employer.id, candidateId: req.params.candidateId } },
            create: { employerId: employer.id, candidateId: req.params.candidateId, notes: req.body.notes },
            update: { notes: req.body.notes },
        });
        (0, response_1.sendSuccess)(res, null, 'Candidate saved');
    }
    catch (error) {
        next(error);
    }
};
exports.saveCandidate = saveCandidate;
const unsaveCandidate = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        await prisma_1.prisma.savedCandidate.deleteMany({ where: { employerId: employer.id, candidateId: req.params.candidateId } });
        (0, response_1.sendSuccess)(res, null, 'Candidate unsaved');
    }
    catch (error) {
        next(error);
    }
};
exports.unsaveCandidate = unsaveCandidate;
// ---- ANALYTICS ----
const getAnalytics = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const [jobs, recentApplications] = await Promise.all([
            prisma_1.prisma.job.findMany({
                where: { employerId: employer.id, deletedAt: null },
                include: { _count: { select: { applications: true } } },
                orderBy: { applicationCount: 'desc' },
                take: 10,
            }),
            prisma_1.prisma.application.findMany({
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
        const statusBreakdown = await prisma_1.prisma.application.groupBy({
            by: ['status'],
            where: { job: { employerId: employer.id } },
            _count: true,
        });
        (0, response_1.sendSuccess)(res, {
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
    }
    catch (error) {
        next(error);
    }
};
exports.getAnalytics = getAnalytics;
const getEmployerSubscription = async (req, res, next) => {
    try {
        const summary = await (0, subscription_service_1.getSubscriptionSummary)(req.user.id);
        (0, response_1.sendSuccess)(res, summary);
    }
    catch (error) {
        next(error);
    }
};
exports.getEmployerSubscription = getEmployerSubscription;
const getEmployerPayments = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const skip = (page - 1) * limit;
        const [payments, total] = await Promise.all([
            prisma_1.prisma.payment.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            prisma_1.prisma.payment.count({ where: { userId: req.user.id } }),
        ]);
        (0, response_1.sendPaginated)(res, payments, total, page, limit);
    }
    catch (error) {
        next(error);
    }
};
exports.getEmployerPayments = getEmployerPayments;
const getEmployerCounts = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const [myListings, searchResumes, atsApplicants] = await Promise.all([
            prisma_1.prisma.job.count({ where: { employerId: employer.id, deletedAt: null } }),
            prisma_1.prisma.candidate.count({ where: { deletedAt: null, resumeVisibility: { in: ['PUBLIC', 'EMPLOYERS_ONLY'] } } }),
            prisma_1.prisma.application.count({ where: { job: { employerId: employer.id }, deletedAt: null } }),
        ]);
        (0, response_1.sendSuccess)(res, {
            myListings,
            searchResumes,
            atsApplicants,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getEmployerCounts = getEmployerCounts;
const getEmployerDashboard = async (req, res, next) => {
    try {
        const employer = await prisma_1.prisma.employer.findUnique({ where: { userId: req.user.id } });
        if (!employer)
            throw new errors_1.AppError('Employer not found', 404);
        const [totalJobs, activeJobs, allEmployerJobs, recentApplications, totalCandidates, totalApplications] = await Promise.all([
            prisma_1.prisma.job.count({ where: { employerId: employer.id, deletedAt: null } }),
            prisma_1.prisma.job.count({ where: { employerId: employer.id, deletedAt: null, status: { in: ['PUBLISHED', 'FEATURED'] } } }),
            prisma_1.prisma.job.findMany({
                where: { employerId: employer.id, deletedAt: null },
                select: { id: true, applicationCount: true, viewCount: true },
            }),
            prisma_1.prisma.application.findMany({
                where: { job: { employerId: employer.id, deletedAt: null }, deletedAt: null },
                include: {
                    candidate: { select: { firstName: true, lastName: true, profilePhoto: true, headline: true, currentLocation: true } },
                    job: { select: { title: true } },
                },
                orderBy: { appliedAt: 'desc' },
                take: 10,
            }),
            prisma_1.prisma.candidate.count(),
            prisma_1.prisma.application.count({ where: { job: { employerId: employer.id, deletedAt: null }, deletedAt: null } }),
        ]);
        const totalViews = allEmployerJobs.reduce((sum, j) => sum + (j.viewCount || 0), 0);
        (0, response_1.sendSuccess)(res, {
            stats: {
                totalJobs,
                activeJobs,
                totalApplications,
                totalViews,
                totalCandidates,
            },
            recentApplications,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getEmployerDashboard = getEmployerDashboard;
//# sourceMappingURL=employer.controller.js.map