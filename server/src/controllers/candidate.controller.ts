import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import slugify from 'slugify';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendPaginated } from '../lib/response';
import { AppError } from '../lib/errors';
import { AuthenticatedRequest } from '../middleware/auth';
import { checkLimit, consumeCredit, getSubscriptionSummary } from '../services/subscription.service';
import { createNotification } from '../services/notification.service';
import { sendApplicationReceivedEmail, sendNewApplicationEmployerEmail } from '../services/email.service';

// ---- PROFILE ----

export const getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { userId: req.user!.id },
      include: {
        candidateSkills: { include: { skill: true } },
        education: { orderBy: { startYear: 'desc' } },
        experience: { orderBy: { startDate: 'desc' } },
        certifications: true,
        languages: true,
      },
    });

    if (!candidate) throw new AppError('Candidate profile not found', 404);
    sendSuccess(res, candidate);
  } catch (error) { next(error); }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      firstName, lastName, fullName, phone, dateOfBirth, gender, headline, summary,
      currentLocation, preferredLocations, expectedSalaryMin, expectedSalaryMax,
      currentSalary, noticePeriod, availabilityStatus, resumeVisibility,
      profileVisibility, showEmail, showPhone, totalExperience,
      currentRole, currentJobRole, currentCompany, country, state, city,
      educationLevel, educationalQualification, highestDegree, college, skills,
      profilePhoto,
    } = req.body;

    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);

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

    const updated = await prisma.candidate.update({
      where: { userId: req.user!.id },
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
      const existingCandidateSkills = await prisma.candidateSkill.findMany({
        where: { candidateId: candidate.id },
        include: { skill: true },
      });

      // Add each new skill
      for (const sName of skills) {
        if (!sName || typeof sName !== 'string') continue;
        const trimmed = sName.trim();
        if (!trimmed) continue;
        const slug = slugify(trimmed, { lower: true, strict: true });
        const skill = await prisma.skill.upsert({
          where: { slug },
          create: { name: trimmed, slug },
          update: {},
        });
        await prisma.candidateSkill.upsert({
          where: { candidateId_skillId: { candidateId: candidate.id, skillId: skill.id } },
          create: { candidateId: candidate.id, skillId: skill.id, proficiency: 'INTERMEDIATE' },
          update: {},
        });
      }

      // Remove skills that are no longer in skills array
      for (const cs of existingCandidateSkills) {
        if (!skills.includes(cs.skill.name)) {
          await prisma.candidateSkill.delete({ where: { id: cs.id } });
        }
      }
    }

    // Handle education sync if college & degree passed
    if (college || highestDegree || educationalQualification) {
      const existingEdu = await prisma.education.findFirst({ where: { candidateId: candidate.id } });
      const inst = college || existingEdu?.institution || 'College / University';
      const deg = highestDegree || educationalQualification || existingEdu?.degree || 'Degree';
      const endYr = (req.body as any).educationEndYear
        ? parseInt((req.body as any).educationEndYear, 10)
        : (existingEdu?.endYear ?? new Date().getFullYear());
      if (existingEdu) {
        await prisma.education.update({
          where: { id: existingEdu.id },
          data: { institution: inst, degree: deg, endYear: endYr },
        });
      } else {
        await prisma.education.create({
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

    sendSuccess(res, updated, 'Profile updated successfully');
  } catch (error) { next(error); }
};

const calculateProfileCompletion = (profile: Record<string, unknown>): number => {
  const fields = [
    'firstName', 'lastName', 'phone', 'headline', 'summary',
    'currentLocation', 'resumeFile',
  ];
  let score = 0;
  fields.forEach(f => { if (profile[f]) score++; });
  return Math.round((score / fields.length) * 100);
};

export const uploadPhoto = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = req.files as any;
    const file =
      req.file ||
      (Array.isArray(files) ? files[0] : null) ||
      files?.photo?.[0] ||
      files?.avatar?.[0] ||
      files?.image?.[0] ||
      files?.file?.[0] ||
      files?.profilePhoto?.[0];

    if (!file) throw new AppError('No image file provided. Please choose a photo under 5 MB.', 400);

    const imageUrl = `/uploads/images/${file.filename}`;
    await prisma.candidate.update({
      where: { userId: req.user!.id },
      data: { profilePhoto: imageUrl },
    });
    sendSuccess(res, { profilePhoto: imageUrl }, 'Photo uploaded successfully');
  } catch (error) { next(error); }
};

// ---- EDUCATION ----

export const getEducation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);
    const education = await prisma.education.findMany({
      where: { candidateId: candidate.id },
      orderBy: { startYear: 'desc' },
    });
    sendSuccess(res, education);
  } catch (error) { next(error); }
};

export const addEducation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);
    const edu = await prisma.education.create({
      data: { ...req.body, candidateId: candidate.id },
    });
    sendSuccess(res, edu, 'Education added', 201);
  } catch (error) { next(error); }
};

export const updateEducation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);
    const edu = await prisma.education.findFirst({ where: { id: req.params.id, candidateId: candidate.id } });
    if (!edu) throw new AppError('Education record not found', 404);
    const updated = await prisma.education.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, updated, 'Education updated');
  } catch (error) { next(error); }
};

export const deleteEducation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);
    await prisma.education.deleteMany({ where: { id: req.params.id, candidateId: candidate.id } });
    sendSuccess(res, null, 'Education deleted');
  } catch (error) { next(error); }
};

// ---- EXPERIENCE ----

export const getExperience = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);
    const experience = await prisma.experience.findMany({
      where: { candidateId: candidate.id },
      orderBy: { startDate: 'desc' },
    });
    sendSuccess(res, experience);
  } catch (error) { next(error); }
};

export const addExperience = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);
    const exp = await prisma.experience.create({ data: { ...req.body, candidateId: candidate.id } });
    sendSuccess(res, exp, 'Experience added', 201);
  } catch (error) { next(error); }
};

export const updateExperience = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);
    const exp = await prisma.experience.findFirst({ where: { id: req.params.id, candidateId: candidate.id } });
    if (!exp) throw new AppError('Experience record not found', 404);
    const updated = await prisma.experience.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, updated, 'Experience updated');
  } catch (error) { next(error); }
};

export const deleteExperience = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);
    await prisma.experience.deleteMany({ where: { id: req.params.id, candidateId: candidate.id } });
    sendSuccess(res, null, 'Experience deleted');
  } catch (error) { next(error); }
};

// ---- SKILLS ----

export const getSkills = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);
    const skills = await prisma.candidateSkill.findMany({
      where: { candidateId: candidate.id },
      include: { skill: true },
    });
    sendSuccess(res, skills);
  } catch (error) { next(error); }
};

export const addSkill = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);

    const { skillId, skillName, proficiency } = req.body;
    let targetSkillId = skillId;

    if (!skillId && skillName) {
      const slug = slugify(skillName, { lower: true, strict: true });
      const skill = await prisma.skill.upsert({
        where: { slug },
        create: { name: skillName, slug },
        update: {},
      });
      targetSkillId = skill.id;
    }

    const candidateSkill = await prisma.candidateSkill.upsert({
      where: { candidateId_skillId: { candidateId: candidate.id, skillId: targetSkillId } },
      create: { candidateId: candidate.id, skillId: targetSkillId, proficiency },
      update: { proficiency },
      include: { skill: true },
    });
    sendSuccess(res, candidateSkill, 'Skill added', 201);
  } catch (error) { next(error); }
};

export const removeSkill = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);
    await prisma.candidateSkill.deleteMany({ where: { candidateId: candidate.id, skillId: req.params.skillId } });
    sendSuccess(res, null, 'Skill removed');
  } catch (error) { next(error); }
};

// ---- RESUME ----

export const uploadResume = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) throw new AppError('No resume file provided', 400);

    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);

    // Delete old resume if exists
    if (candidate.resumeFile) {
      const oldPath = path.join(process.cwd(), candidate.resumeFile.replace('/uploads/', 'uploads/'));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const resumePath = `/uploads/resumes/${req.file.filename}`;
    await prisma.candidate.update({
      where: { userId: req.user!.id },
      data: { resumeFile: resumePath, resumeFileName: req.file.originalname, resumeUpdatedAt: new Date() },
    });

    sendSuccess(res, { resumeFile: resumePath, resumeFileName: req.file.originalname }, 'Resume uploaded successfully');
  } catch (error) { next(error); }
};

export const downloadResume = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate || !candidate.resumeFile) throw new AppError('No resume found', 404);

    const filePath = path.join(process.cwd(), candidate.resumeFile.replace('/uploads/', 'uploads/'));
    if (!fs.existsSync(filePath)) throw new AppError('Resume file not found on server', 404);

    res.download(filePath, candidate.resumeFileName || 'resume.pdf');
  } catch (error) { next(error); }
};

export const deleteResume = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);

    if (candidate.resumeFile) {
      const filePath = path.join(process.cwd(), candidate.resumeFile.replace('/uploads/', 'uploads/'));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.candidate.update({
      where: { userId: req.user!.id },
      data: { resumeFile: null, resumeFileName: null, resumeUpdatedAt: null },
    });
    sendSuccess(res, null, 'Resume deleted');
  } catch (error) { next(error); }
};

// ---- APPLICATIONS ----

export const applyForJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { jobId } = req.params;
    const { coverLetter } = req.body;

    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Candidate profile not found', 404);

    // Check subscription limit (server-side, never trust client)
    const limitCheck = await checkLimit(req.user!.id, 'jobApplications');
    if (!limitCheck.allowed) {
      throw new AppError(
        `You have used all your job applications for this month. Please upgrade your subscription to apply for more jobs.`,
        403
      );
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { employer: { include: { user: true } }, company: true },
    });

    if (!job) throw new AppError('Job not found', 404);
    if (job.status !== 'PUBLISHED' && job.status !== 'FEATURED') {
      throw new AppError('This job is not currently accepting applications', 400);
    }
    if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
      throw new AppError('Application deadline has passed', 400);
    }

    // Check for duplicate application (enforced by DB unique constraint too)
    const existing = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId } },
    });
    if (existing) throw new AppError('You have already applied for this job', 409);

    // Create application in transaction
    const application = await prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          candidateId: candidate.id,
          jobId,
          coverLetter: coverLetter || null,
          resumeSnapshot: candidate.resumeFile,
        },
      });

      // Consume application credit
      await tx.subscription.findFirst({ where: { userId: req.user!.id, status: 'ACTIVE' } });

      // Update job application count
      await tx.job.update({ where: { id: jobId }, data: { applicationCount: { increment: 1 } } });

      return app;
    });

    // Consume credit AFTER successful application
    await consumeCredit(req.user!.id, 'jobApplications').catch(console.error);

    // Notify employer
    await createNotification(
      job.employer.userId,
      'APPLICATION_RECEIVED',
      'New Application Received',
      `${candidate.firstName} ${candidate.lastName} applied for "${job.title}"`,
      `/employer/jobs/${jobId}/applicants`
    );

    // Send email to candidate
    sendApplicationReceivedEmail(
      req.user!.email,
      `${candidate.firstName} ${candidate.lastName}`,
      job.title,
      job.company?.name || 'Company',
      req.user!.id
    ).catch(console.error);

    // Send email alert to employer
    if (job.employer?.user?.email) {
      sendNewApplicationEmployerEmail(
        job.employer.user.email,
        `${job.employer.firstName} ${job.employer.lastName}`,
        `${candidate.firstName} ${candidate.lastName}`,
        job.title,
        job.company?.name || 'Your Company',
        job.id,
        job.employer.userId
      ).catch(console.error);
    }

    sendSuccess(res, application, 'Application submitted successfully!', 201);
  } catch (error) { next(error); }
};

export const getApplications = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);

    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    const where = {
      candidateId: candidate.id,
      ...(status ? { status } : {}),
      deletedAt: null,
    };

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
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
      prisma.application.count({ where }),
    ]);

    sendPaginated(res, applications, total, page, limit);
  } catch (error) { next(error); }
};

// ---- SAVED JOBS ----

export const getSavedJobs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);

    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '12', 10);
    const skip = (page - 1) * limit;

    const [saved, total] = await Promise.all([
      prisma.savedJob.findMany({
        where: { candidateId: candidate.id },
        include: { job: { include: { company: { select: { name: true, logo: true } }, location: true } } },
        orderBy: { savedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.savedJob.count({ where: { candidateId: candidate.id } }),
    ]);

    sendPaginated(res, saved, total, page, limit);
  } catch (error) { next(error); }
};

export const saveJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);

    await prisma.savedJob.upsert({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: req.params.jobId } },
      create: { candidateId: candidate.id, jobId: req.params.jobId },
      update: {},
    });
    sendSuccess(res, null, 'Job saved');
  } catch (error) { next(error); }
};

export const unsaveJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);
    await prisma.savedJob.deleteMany({ where: { candidateId: candidate.id, jobId: req.params.jobId } });
    sendSuccess(res, null, 'Job unsaved');
  } catch (error) { next(error); }
};

// ---- JOB ALERTS ----

export const getJobAlerts = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);
    const alerts = await prisma.jobAlert.findMany({ where: { candidateId: candidate.id } });
    sendSuccess(res, alerts);
  } catch (error) { next(error); }
};

export const createJobAlert = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);

    // Check subscription limit
    const existing = await prisma.jobAlert.count({ where: { candidateId: candidate.id } });
    const limitCheck = await checkLimit(req.user!.id, 'jobAlerts');
    if (limitCheck.limit !== null && existing >= (limitCheck.limit || 0)) {
      throw new AppError('You have reached your job alert limit. Please upgrade to create more alerts.', 403);
    }

    const alert = await prisma.jobAlert.create({
      data: { ...req.body, candidateId: candidate.id },
    });
    sendSuccess(res, alert, 'Job alert created', 201);
  } catch (error) { next(error); }
};

export const updateJobAlert = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);
    await prisma.jobAlert.updateMany({ where: { id: req.params.id, candidateId: candidate.id }, data: req.body });
    sendSuccess(res, null, 'Alert updated');
  } catch (error) { next(error); }
};

export const deleteJobAlert = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) throw new AppError('Profile not found', 404);
    await prisma.jobAlert.deleteMany({ where: { id: req.params.id, candidateId: candidate.id } });
    sendSuccess(res, null, 'Alert deleted');
  } catch (error) { next(error); }
};

// ---- NOTIFICATIONS & SUBSCRIPTION ----

export const getNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const { notifications, total } = await (await import('../services/notification.service')).getUserNotifications(req.user!.id, page, limit);
    const unreadCount = await (await import('../services/notification.service')).getUnreadCount(req.user!.id);
    sendSuccess(res, { notifications, total, unreadCount, page, limit });
  } catch (error) { next(error); }
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await (await import('../services/notification.service')).markAsRead(req.params.id, req.user!.id);
    sendSuccess(res, null, 'Marked as read');
  } catch (error) { next(error); }
};

export const markAllNotificationsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await (await import('../services/notification.service')).markAllAsRead(req.user!.id);
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (error) { next(error); }
};

export const getSubscription = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const summary = await getSubscriptionSummary(req.user!.id);
    sendSuccess(res, summary);
  } catch (error) { next(error); }
};

export const getPaymentHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { userId: req.user!.id },
        include: { coupon: { select: { code: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where: { userId: req.user!.id } }),
    ]);

    sendPaginated(res, payments, total, page, limit);
  } catch (error) { next(error); }
};
