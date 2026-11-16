import { Router } from 'express';
import {
  getProfile, updateProfile, uploadPhoto,
  getEducation, addEducation, updateEducation, deleteEducation,
  getExperience, addExperience, updateExperience, deleteExperience,
  getSkills, addSkill, removeSkill,
  uploadResume, downloadResume, deleteResume,
  applyForJob, getApplications,
  getSavedJobs, saveJob, unsaveJob,
  getJobAlerts, createJobAlert, updateJobAlert, deleteJobAlert,
  getNotifications, markNotificationRead, markAllNotificationsRead,
  getSubscription, getPaymentHistory,
} from '../controllers/candidate.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { resumeUpload, imageUpload, candidatePhotoUpload } from '../middleware/upload';
import { requireFeature, requireQuota } from '../middleware/packageGuard';
import {
  generateAISummary,
  enhanceExperience,
  suggestSkills,
  auditATSScore,
  getResumeDraft,
  saveResumeDraft,
} from '../controllers/aiResume.controller';

const router = Router();

// All routes require CANDIDATE role
router.use(authenticateToken, requireRole('CANDIDATE'));

// Profile Photo middleware with max 5MB limit check
const handleCandidatePhoto = (req: any, res: any, next: any) => {
  candidatePhotoUpload(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds 5 MB limit. Please upload an image under 5 MB.',
        });
      }
      return next(err);
    }
    next();
  });
};

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/profile/photo', handleCandidatePhoto, uploadPhoto);
router.put('/avatar', handleCandidatePhoto, uploadPhoto);
router.post('/avatar', handleCandidatePhoto, uploadPhoto);

// Education
router.get('/education', getEducation);
router.post('/education', addEducation);
router.put('/education/:id', updateEducation);
router.delete('/education/:id', deleteEducation);

// Experience
router.get('/experience', getExperience);
router.post('/experience', addExperience);
router.put('/experience/:id', updateExperience);
router.delete('/experience/:id', deleteExperience);

// Skills
router.get('/skills', getSkills);
router.post('/skills', addSkill);
router.delete('/skills/:skillId', removeSkill);

// Resume
router.post('/resume/upload', requireFeature('resumeUpload', 'Uploading custom resumes requires an active candidate package.'), (req, res, next) => {
  resumeUpload(req, res, (err) => { if (err) return next(err); next(); });
}, uploadResume);
router.get('/resume/download', requireFeature('resumeDownload', 'Downloading formatted resumes requires an active candidate package.'), downloadResume);
router.delete('/resume', deleteResume);

// Applications
router.get('/applications', getApplications);
router.post('/applications/:jobId/apply', requireQuota('jobApplications', 1, 'Your job application limit has been reached. Upgrade your package to apply for more jobs.'), applyForJob);

// Saved Jobs
router.get('/saved-jobs', getSavedJobs);
router.post('/saved-jobs/:jobId', requireQuota('savedJobs', 1, 'Your saved jobs limit has been reached. Upgrade your package to bookmark more jobs.'), saveJob);
router.delete('/saved-jobs/:jobId', unsaveJob);

// Job Alerts
router.get('/job-alerts', getJobAlerts);
router.post('/job-alerts', requireQuota('jobAlerts', 1, 'Your job alert limit has been reached. Upgrade your package to create more alerts.'), createJobAlert);
router.put('/job-alerts/:id', updateJobAlert);
router.delete('/job-alerts/:id', deleteJobAlert);

// Notifications
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);
router.put('/notifications/read-all', markAllNotificationsRead);

// Subscription & Payments
router.get('/subscription', getSubscription);
router.get('/payments', getPaymentHistory);

// AI Resume Builder (Protected by resumeBuilder feature)
router.post('/ai-resume/generate-summary', requireFeature('resumeBuilder', 'The AI Resume Builder is a premium feature. Upgrade your package to access it.'), generateAISummary);
router.post('/ai-resume/enhance-experience', requireFeature('resumeBuilder', 'The AI Resume Builder is a premium feature. Upgrade your package to access it.'), enhanceExperience);
router.post('/ai-resume/suggest-skills', requireFeature('resumeBuilder', 'The AI Resume Builder is a premium feature. Upgrade your package to access it.'), suggestSkills);
router.post('/ai-resume/ats-audit', requireFeature('resumeBuilder', 'The AI Resume Builder is a premium feature. Upgrade your package to access it.'), auditATSScore);
router.get('/ai-resume/draft', requireFeature('resumeBuilder', 'The AI Resume Builder is a premium feature. Upgrade your package to access it.'), getResumeDraft);
router.put('/ai-resume/draft', requireFeature('resumeBuilder', 'The AI Resume Builder is a premium feature. Upgrade your package to access it.'), saveResumeDraft);

export default router;
