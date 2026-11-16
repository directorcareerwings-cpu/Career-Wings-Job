"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentHistory = exports.getSubscription = exports.markAllNotificationsRead = exports.markNotificationRead = exports.getNotifications = exports.deleteJobAlert = exports.updateJobAlert = exports.createJobAlert = exports.getJobAlerts = exports.unsaveJob = exports.saveJob = exports.getSavedJobs = exports.getApplications = exports.applyForJob = exports.deleteResume = exports.downloadResume = exports.uploadResume = exports.removeSkill = exports.addSkill = exports.getSkills = exports.deleteExperience = exports.updateExperience = exports.addExperience = exports.getExperience = exports.deleteEducation = exports.updateEducation = exports.addEducation = exports.getEducation = exports.uploadPhoto = exports.updateProfile = exports.getProfile = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const slugify_1 = __importDefault(require("slugify"));
const prisma_1 = require("../lib/prisma");
const response_1 = require("../lib/response");
const errors_1 = require("../lib/errors");
const subscription_service_1 = require("../services/subscription.service");
const notification_service_1 = require("../services/notification.service");
const email_service_1 = require("../services/email.service");
// ---- PROFILE ----
const getProfile = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({
            where: { userId: req.user.id },
            include: {
                candidateSkills: { include: { skill: true } },
                education: { orderBy: { startYear: 'desc' } },
                experience: { orderBy: { startDate: 'desc' } },
                certifications: true,
                languages: true,
            },
        });
        if (!candidate)
            throw new errors_1.AppError('Candidate profile not found', 404);
        (0, response_1.sendSuccess)(res, candidate);
    }
    catch (error) {
        next(error);
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res, next) => {
    try {
        const { firstName, lastName, fullName, phone, dateOfBirth, gender, headline, summary, currentLocation, preferredLocations, expectedSalaryMin, expectedSalaryMax, currentSalary, noticePeriod, availabilityStatus, resumeVisibility, profileVisibility, showEmail, showPhone, totalExperience, currentRole, currentJobRole, currentCompany, country, state, city, educationLevel, educationalQualification, highestDegree, college, skills, profilePhoto, } = req.body;
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        let parsedFirstName = firstName;
        let parsedLastName = lastName;
        if (fullName && (!firstName || !lastName)) {
            const parts = fullName.trim().split(' ');
            parsedFirstName = parts[0] || '';
            parsedLastName = parts.slice(1).join(' ') || '';
        }
        const resolvedCity = city || candidate.city;
        const resolvedState = state || candidate.state;
        const resolvedLoc = resolvedCity && resolvedState ? `${resolvedCity}, ${resolvedState}` : (currentLocation || candidate.currentLocation);
        const updated = await prisma_1.prisma.candidate.update({
            where: { userId: req.user.id },
            data: {
                firstName: parsedFirstName !== undefined ? parsedFirstName : candidate.firstName,
                lastName: parsedLastName !== undefined ? parsedLastName : candidate.lastName,
                profilePhoto: profilePhoto !== undefined ? profilePhoto : candidate.profilePhoto,
                phone: phone !== undefined ? phone : candidate.phone,
                dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : candidate.dateOfBirth,
                gender: gender !== undefined ? gender : candidate.gender,
                headline: headline !== undefined ? headline : candidate.headline,
                summary: summary !== undefined ? summary : candidate.summary,
                currentLocation: resolvedLoc,
                currentRole: (currentJobRole || currentRole) !== undefined ? (currentJobRole || currentRole) : candidate.currentRole,
                currentCompany: currentCompany !== undefined ? currentCompany : candidate.currentCompany,
                country: country || candidate.country || 'India IN',
                state: resolvedState,
                city: resolvedCity,
                educationLevel: (educationalQualification || educationLevel) !== undefined ? (educationalQualification || educationLevel) : candidate.educationLevel,
                highestDegree: highestDegree !== undefined ? highestDegree : candidate.highestDegree,
                college: college !== undefined ? college : candidate.college,
                totalExperience: totalExperience !== undefined ? (typeof totalExperience === 'number' ? totalExperience : parseFloat(totalExperience) || 0) : candidate.totalExperience,
                expectedSalaryMin: expectedSalaryMin !== undefined ? (typeof expectedSalaryMin === 'number' ? expectedSalaryMin : parseInt(expectedSalaryMin, 10) || 0) : candidate.expectedSalaryMin,
                expectedSalaryMax: expectedSalaryMax !== undefined ? (typeof expectedSalaryMax === 'number' ? expectedSalaryMax : parseInt(expectedSalaryMax, 10) || 0) : candidate.expectedSalaryMax,
                currentSalary: currentSalary !== undefined ? (typeof currentSalary === 'number' ? currentSalary : parseInt(currentSalary, 10) || 0) : candidate.currentSalary,
                noticePeriod: noticePeriod !== undefined ? noticePeriod : candidate.noticePeriod,
                availabilityStatus: availabilityStatus !== undefined ? availabilityStatus : candidate.availabilityStatus,
                resumeVisibility: resumeVisibility !== undefined ? resumeVisibility : candidate.resumeVisibility,
                profileVisibility: profileVisibility !== undefined ? profileVisibility : candidate.profileVisibility,
                showEmail: showEmail !== undefined ? showEmail : candidate.showEmail,
                showPhone: showPhone !== undefined ? showPhone : candidate.showPhone,
                profileCompletion: calculateProfileCompletion({ ...candidate, ...req.body }),
            },
            include: {
                candidateSkills: { include: { skill: true } },
                education: true,
            },
        });
        // Handle skills if passed as array of strings
        if (Array.isArray(skills)) {
            // Remove previous skills not in the list
            const existingCandidateSkills = await prisma_1.prisma.candidateSkill.findMany({
                where: { candidateId: candidate.id },
                include: { skill: true },
            });
            // Add each new skill
            for (const sName of skills) {
                if (!sName || typeof sName !== 'string')
                    continue;
                const trimmed = sName.trim();
                if (!trimmed)
                    continue;
                const slug = (0, slugify_1.default)(trimmed, { lower: true, strict: true });
                const skill = await prisma_1.prisma.skill.upsert({
                    where: { slug },
                    create: { name: trimmed, slug },
                    update: {},
                });
                await prisma_1.prisma.candidateSkill.upsert({
                    where: { candidateId_skillId: { candidateId: candidate.id, skillId: skill.id } },
                    create: { candidateId: candidate.id, skillId: skill.id, proficiency: 'INTERMEDIATE' },
                    update: {},
                });
            }
            // Remove skills that are no longer in skills array
            for (const cs of existingCandidateSkills) {
                if (!skills.includes(cs.skill.name)) {
                    await prisma_1.prisma.candidateSkill.delete({ where: { id: cs.id } });
                }
            }
        }
        // Handle education sync if college & degree passed
        if (college || highestDegree || educationalQualification) {
            const existingEdu = await prisma_1.prisma.education.findFirst({ where: { candidateId: candidate.id } });
            const inst = college || existingEdu?.institution || 'College / University';
            const deg = highestDegree || educationalQualification || existingEdu?.degree || 'Degree';
            const endYr = req.body.educationEndYear
                ? parseInt(req.body.educationEndYear, 10)
                : (existingEdu?.endYear ?? new Date().getFullYear());
            if (existingEdu) {
                await prisma_1.prisma.education.update({
                    where: { id: existingEdu.id },
                    data: { institution: inst, degree: deg, endYear: endYr },
                });
            }
            else {
                await prisma_1.prisma.education.create({
                    data: {
                        candidateId: candidate.id,
                        institution: inst,
                        degree: deg,
                        startYear: endYr - 3,
                        endYear: endYr,
                    },
                });
            }
        }
        (0, response_1.sendSuccess)(res, updated, 'Profile updated successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.updateProfile = updateProfile;
const calculateProfileCompletion = (profile) => {
    const fields = [
        'firstName', 'lastName', 'phone', 'headline', 'summary',
        'currentLocation', 'resumeFile',
    ];
    let score = 0;
    fields.forEach(f => { if (profile[f])
        score++; });
    return Math.round((score / fields.length) * 100);
};
const uploadPhoto = async (req, res, next) => {
    try {
        const files = req.files;
        const file = req.file ||
            (Array.isArray(files) ? files[0] : null) ||
            files?.photo?.[0] ||
            files?.avatar?.[0] ||
            files?.image?.[0] ||
            files?.file?.[0] ||
            files?.profilePhoto?.[0];
        if (!file)
            throw new errors_1.AppError('No image file provided. Please choose a photo under 5 MB.', 400);
        const imageUrl = `/uploads/images/${file.filename}`;
        await prisma_1.prisma.candidate.update({
            where: { userId: req.user.id },
            data: { profilePhoto: imageUrl },
        });
        (0, response_1.sendSuccess)(res, { profilePhoto: imageUrl }, 'Photo uploaded successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.uploadPhoto = uploadPhoto;
// ---- EDUCATION ----
const getEducation = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        const education = await prisma_1.prisma.education.findMany({
            where: { candidateId: candidate.id },
            orderBy: { startYear: 'desc' },
        });
        (0, response_1.sendSuccess)(res, education);
    }
    catch (error) {
        next(error);
    }
};
exports.getEducation = getEducation;
const addEducation = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        const edu = await prisma_1.prisma.education.create({
            data: { ...req.body, candidateId: candidate.id },
        });
        (0, response_1.sendSuccess)(res, edu, 'Education added', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.addEducation = addEducation;
const updateEducation = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        const edu = await prisma_1.prisma.education.findFirst({ where: { id: req.params.id, candidateId: candidate.id } });
        if (!edu)
            throw new errors_1.AppError('Education record not found', 404);
        const updated = await prisma_1.prisma.education.update({ where: { id: req.params.id }, data: req.body });
        (0, response_1.sendSuccess)(res, updated, 'Education updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateEducation = updateEducation;
const deleteEducation = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        await prisma_1.prisma.education.deleteMany({ where: { id: req.params.id, candidateId: candidate.id } });
        (0, response_1.sendSuccess)(res, null, 'Education deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteEducation = deleteEducation;
// ---- EXPERIENCE ----
const getExperience = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        const experience = await prisma_1.prisma.experience.findMany({
            where: { candidateId: candidate.id },
            orderBy: { startDate: 'desc' },
        });
        (0, response_1.sendSuccess)(res, experience);
    }
    catch (error) {
        next(error);
    }
};
exports.getExperience = getExperience;
const addExperience = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        const exp = await prisma_1.prisma.experience.create({ data: { ...req.body, candidateId: candidate.id } });
        (0, response_1.sendSuccess)(res, exp, 'Experience added', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.addExperience = addExperience;
const updateExperience = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        const exp = await prisma_1.prisma.experience.findFirst({ where: { id: req.params.id, candidateId: candidate.id } });
        if (!exp)
            throw new errors_1.AppError('Experience record not found', 404);
        const updated = await prisma_1.prisma.experience.update({ where: { id: req.params.id }, data: req.body });
        (0, response_1.sendSuccess)(res, updated, 'Experience updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateExperience = updateExperience;
const deleteExperience = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        await prisma_1.prisma.experience.deleteMany({ where: { id: req.params.id, candidateId: candidate.id } });
        (0, response_1.sendSuccess)(res, null, 'Experience deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteExperience = deleteExperience;
// ---- SKILLS ----
const getSkills = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        const skills = await prisma_1.prisma.candidateSkill.findMany({
            where: { candidateId: candidate.id },
            include: { skill: true },
        });
        (0, response_1.sendSuccess)(res, skills);
    }
    catch (error) {
        next(error);
    }
};
exports.getSkills = getSkills;
const addSkill = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        const { skillId, skillName, proficiency } = req.body;
        let targetSkillId = skillId;
        if (!skillId && skillName) {
            const slug = (0, slugify_1.default)(skillName, { lower: true, strict: true });
            const skill = await prisma_1.prisma.skill.upsert({
                where: { slug },
                create: { name: skillName, slug },
                update: {},
            });
            targetSkillId = skill.id;
        }
        const candidateSkill = await prisma_1.prisma.candidateSkill.upsert({
            where: { candidateId_skillId: { candidateId: candidate.id, skillId: targetSkillId } },
            create: { candidateId: candidate.id, skillId: targetSkillId, proficiency },
            update: { proficiency },
            include: { skill: true },
        });
        (0, response_1.sendSuccess)(res, candidateSkill, 'Skill added', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.addSkill = addSkill;
const removeSkill = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        await prisma_1.prisma.candidateSkill.deleteMany({ where: { candidateId: candidate.id, skillId: req.params.skillId } });
        (0, response_1.sendSuccess)(res, null, 'Skill removed');
    }
    catch (error) {
        next(error);
    }
};
exports.removeSkill = removeSkill;
// ---- RESUME ----
const uploadResume = async (req, res, next) => {
    try {
        if (!req.file)
            throw new errors_1.AppError('No resume file provided', 400);
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        // Delete old resume if exists
        if (candidate.resumeFile) {
            const oldPath = path_1.default.join(process.cwd(), candidate.resumeFile.replace('/uploads/', 'uploads/'));
            if (fs_1.default.existsSync(oldPath))
                fs_1.default.unlinkSync(oldPath);
        }
        const resumePath = `/uploads/resumes/${req.file.filename}`;
        await prisma_1.prisma.candidate.update({
            where: { userId: req.user.id },
            data: { resumeFile: resumePath, resumeFileName: req.file.originalname, resumeUpdatedAt: new Date() },
        });
        (0, response_1.sendSuccess)(res, { resumeFile: resumePath, resumeFileName: req.file.originalname }, 'Resume uploaded successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.uploadResume = uploadResume;
const downloadResume = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate || !candidate.resumeFile)
            throw new errors_1.AppError('No resume found', 404);
        const filePath = path_1.default.join(process.cwd(), candidate.resumeFile.replace('/uploads/', 'uploads/'));
        if (!fs_1.default.existsSync(filePath))
            throw new errors_1.AppError('Resume file not found on server', 404);
        res.download(filePath, candidate.resumeFileName || 'resume.pdf');
    }
    catch (error) {
        next(error);
    }
};
exports.downloadResume = downloadResume;
const deleteResume = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        if (candidate.resumeFile) {
            const filePath = path_1.default.join(process.cwd(), candidate.resumeFile.replace('/uploads/', 'uploads/'));
            if (fs_1.default.existsSync(filePath))
                fs_1.default.unlinkSync(filePath);
        }
        await prisma_1.prisma.candidate.update({
            where: { userId: req.user.id },
            data: { resumeFile: null, resumeFileName: null, resumeUpdatedAt: null },
        });
        (0, response_1.sendSuccess)(res, null, 'Resume deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteResume = deleteResume;
// ---- APPLICATIONS ----
const applyForJob = async (req, res, next) => {
    try {
        const { jobId } = req.params;
        const { coverLetter } = req.body;
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Candidate profile not found', 404);
        // Check subscription limit (server-side, never trust client)
        const limitCheck = await (0, subscription_service_1.checkLimit)(req.user.id, 'jobApplications');
        if (!limitCheck.allowed) {
            throw new errors_1.AppError(`You have used all your job applications for this month. Please upgrade your subscription to apply for more jobs.`, 403);
        }
        const job = await prisma_1.prisma.job.findUnique({
            where: { id: jobId },
            include: { employer: { include: { user: true } }, company: true },
        });
        if (!job)
            throw new errors_1.AppError('Job not found', 404);
        if (job.status !== 'PUBLISHED' && job.status !== 'FEATURED') {
            throw new errors_1.AppError('This job is not currently accepting applications', 400);
        }
        if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
            throw new errors_1.AppError('Application deadline has passed', 400);
        }
        // Check for duplicate application (enforced by DB unique constraint too)
        const existing = await prisma_1.prisma.application.findUnique({
            where: { candidateId_jobId: { candidateId: candidate.id, jobId } },
        });
        if (existing)
            throw new errors_1.AppError('You have already applied for this job', 409);
        // Create application in transaction
        const application = await prisma_1.prisma.$transaction(async (tx) => {
            const app = await tx.application.create({
                data: {
                    candidateId: candidate.id,
                    jobId,
                    coverLetter: coverLetter || null,
                    resumeSnapshot: candidate.resumeFile,
                },
            });
            // Consume application credit
            await tx.subscription.findFirst({ where: { userId: req.user.id, status: 'ACTIVE' } });
            // Update job application count
            await tx.job.update({ where: { id: jobId }, data: { applicationCount: { increment: 1 } } });
            return app;
        });
        // Consume credit AFTER successful application
        await (0, subscription_service_1.consumeCredit)(req.user.id, 'jobApplications').catch(console.error);
        // Notify employer
        await (0, notification_service_1.createNotification)(job.employer.userId, 'APPLICATION_RECEIVED', 'New Application Received', `${candidate.firstName} ${candidate.lastName} applied for "${job.title}"`, `/employer/jobs/${jobId}/applicants`);
        // Send email to candidate
        (0, email_service_1.sendApplicationReceivedEmail)(req.user.email, `${candidate.firstName} ${candidate.lastName}`, job.title, job.company?.name || 'Company', req.user.id).catch(console.error);
        // Send email alert to employer
        if (job.employer?.user?.email) {
            (0, email_service_1.sendNewApplicationEmployerEmail)(job.employer.user.email, `${job.employer.firstName} ${job.employer.lastName}`, `${candidate.firstName} ${candidate.lastName}`, job.title, job.company?.name || 'Your Company', job.id, job.employer.userId).catch(console.error);
        }
        (0, response_1.sendSuccess)(res, application, 'Application submitted successfully!', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.applyForJob = applyForJob;
const getApplications = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const status = req.query.status;
        const skip = (page - 1) * limit;
        const where = {
            candidateId: candidate.id,
            ...(status ? { status } : {}),
            deletedAt: null,
        };
        const [applications, total] = await Promise.all([
            prisma_1.prisma.application.findMany({
                where,
                include: {
                    job: {
                        include: { company: { select: { name: true, logo: true } }, location: true },
                    },
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
};
exports.getApplications = getApplications;
// ---- SAVED JOBS ----
const getSavedJobs = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '12', 10);
        const skip = (page - 1) * limit;
        const [saved, total] = await Promise.all([
            prisma_1.prisma.savedJob.findMany({
                where: { candidateId: candidate.id },
                include: { job: { include: { company: { select: { name: true, logo: true } }, location: true } } },
                orderBy: { savedAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.savedJob.count({ where: { candidateId: candidate.id } }),
        ]);
        (0, response_1.sendPaginated)(res, saved, total, page, limit);
    }
    catch (error) {
        next(error);
    }
};
exports.getSavedJobs = getSavedJobs;
const saveJob = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        await prisma_1.prisma.savedJob.upsert({
            where: { candidateId_jobId: { candidateId: candidate.id, jobId: req.params.jobId } },
            create: { candidateId: candidate.id, jobId: req.params.jobId },
            update: {},
        });
        (0, response_1.sendSuccess)(res, null, 'Job saved');
    }
    catch (error) {
        next(error);
    }
};
exports.saveJob = saveJob;
const unsaveJob = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        await prisma_1.prisma.savedJob.deleteMany({ where: { candidateId: candidate.id, jobId: req.params.jobId } });
        (0, response_1.sendSuccess)(res, null, 'Job unsaved');
    }
    catch (error) {
        next(error);
    }
};
exports.unsaveJob = unsaveJob;
// ---- JOB ALERTS ----
const getJobAlerts = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        const alerts = await prisma_1.prisma.jobAlert.findMany({ where: { candidateId: candidate.id } });
        (0, response_1.sendSuccess)(res, alerts);
    }
    catch (error) {
        next(error);
    }
};
exports.getJobAlerts = getJobAlerts;
const createJobAlert = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        // Check subscription limit
        const existing = await prisma_1.prisma.jobAlert.count({ where: { candidateId: candidate.id } });
        const limitCheck = await (0, subscription_service_1.checkLimit)(req.user.id, 'jobAlerts');
        if (limitCheck.limit !== null && existing >= (limitCheck.limit || 0)) {
            throw new errors_1.AppError('You have reached your job alert limit. Please upgrade to create more alerts.', 403);
        }
        const alert = await prisma_1.prisma.jobAlert.create({
            data: { ...req.body, candidateId: candidate.id },
        });
        (0, response_1.sendSuccess)(res, alert, 'Job alert created', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createJobAlert = createJobAlert;
const updateJobAlert = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        await prisma_1.prisma.jobAlert.updateMany({ where: { id: req.params.id, candidateId: candidate.id }, data: req.body });
        (0, response_1.sendSuccess)(res, null, 'Alert updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateJobAlert = updateJobAlert;
const deleteJobAlert = async (req, res, next) => {
    try {
        const candidate = await prisma_1.prisma.candidate.findUnique({ where: { userId: req.user.id } });
        if (!candidate)
            throw new errors_1.AppError('Profile not found', 404);
        await prisma_1.prisma.jobAlert.deleteMany({ where: { id: req.params.id, candidateId: candidate.id } });
        (0, response_1.sendSuccess)(res, null, 'Alert deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteJobAlert = deleteJobAlert;
// ---- NOTIFICATIONS & SUBSCRIPTION ----
const getNotifications = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '20', 10);
        const { notifications, total } = await (await Promise.resolve().then(() => __importStar(require('../services/notification.service')))).getUserNotifications(req.user.id, page, limit);
        const unreadCount = await (await Promise.resolve().then(() => __importStar(require('../services/notification.service')))).getUnreadCount(req.user.id);
        (0, response_1.sendSuccess)(res, { notifications, total, unreadCount, page, limit });
    }
    catch (error) {
        next(error);
    }
};
exports.getNotifications = getNotifications;
const markNotificationRead = async (req, res, next) => {
    try {
        await (await Promise.resolve().then(() => __importStar(require('../services/notification.service')))).markAsRead(req.params.id, req.user.id);
        (0, response_1.sendSuccess)(res, null, 'Marked as read');
    }
    catch (error) {
        next(error);
    }
};
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = async (req, res, next) => {
    try {
        await (await Promise.resolve().then(() => __importStar(require('../services/notification.service')))).markAllAsRead(req.user.id);
        (0, response_1.sendSuccess)(res, null, 'All notifications marked as read');
    }
    catch (error) {
        next(error);
    }
};
exports.markAllNotificationsRead = markAllNotificationsRead;
const getSubscription = async (req, res, next) => {
    try {
        const summary = await (0, subscription_service_1.getSubscriptionSummary)(req.user.id);
        (0, response_1.sendSuccess)(res, summary);
    }
    catch (error) {
        next(error);
    }
};
exports.getSubscription = getSubscription;
const getPaymentHistory = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const skip = (page - 1) * limit;
        const [payments, total] = await Promise.all([
            prisma_1.prisma.payment.findMany({
                where: { userId: req.user.id },
                include: { coupon: { select: { code: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.payment.count({ where: { userId: req.user.id } }),
        ]);
        (0, response_1.sendPaginated)(res, payments, total, page, limit);
    }
    catch (error) {
        next(error);
    }
};
exports.getPaymentHistory = getPaymentHistory;
//# sourceMappingURL=candidate.controller.js.map