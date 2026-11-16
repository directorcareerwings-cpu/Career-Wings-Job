"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const candidate_controller_1 = require("../controllers/candidate.controller");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const packageGuard_1 = require("../middleware/packageGuard");
const aiResume_controller_1 = require("../controllers/aiResume.controller");
const router = (0, express_1.Router)();
// All routes require CANDIDATE role
router.use(auth_1.authenticateToken, (0, auth_1.requireRole)('CANDIDATE'));
// Profile Photo middleware with max 5MB limit check
const handleCandidatePhoto = (req, res, next) => {
    (0, upload_1.candidatePhotoUpload)(req, res, (err) => {
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
router.get('/profile', candidate_controller_1.getProfile);
router.put('/profile', candidate_controller_1.updateProfile);
router.post('/profile/photo', handleCandidatePhoto, candidate_controller_1.uploadPhoto);
router.put('/avatar', handleCandidatePhoto, candidate_controller_1.uploadPhoto);
router.post('/avatar', handleCandidatePhoto, candidate_controller_1.uploadPhoto);
// Education
router.get('/education', candidate_controller_1.getEducation);
router.post('/education', candidate_controller_1.addEducation);
router.put('/education/:id', candidate_controller_1.updateEducation);
router.delete('/education/:id', candidate_controller_1.deleteEducation);
// Experience
router.get('/experience', candidate_controller_1.getExperience);
router.post('/experience', candidate_controller_1.addExperience);
router.put('/experience/:id', candidate_controller_1.updateExperience);
router.delete('/experience/:id', candidate_controller_1.deleteExperience);
// Skills
router.get('/skills', candidate_controller_1.getSkills);
router.post('/skills', candidate_controller_1.addSkill);
router.delete('/skills/:skillId', candidate_controller_1.removeSkill);
// Resume
router.post('/resume/upload', (0, packageGuard_1.requireFeature)('resumeUpload', 'Uploading custom resumes requires an active candidate package.'), (req, res, next) => {
    (0, upload_1.resumeUpload)(req, res, (err) => { if (err)
        return next(err); next(); });
}, candidate_controller_1.uploadResume);
router.get('/resume/download', (0, packageGuard_1.requireFeature)('resumeDownload', 'Downloading formatted resumes requires an active candidate package.'), candidate_controller_1.downloadResume);
router.delete('/resume', candidate_controller_1.deleteResume);
// Applications
router.get('/applications', candidate_controller_1.getApplications);
router.post('/applications/:jobId/apply', (0, packageGuard_1.requireQuota)('jobApplications', 1, 'Your job application limit has been reached. Upgrade your package to apply for more jobs.'), candidate_controller_1.applyForJob);
// Saved Jobs
router.get('/saved-jobs', candidate_controller_1.getSavedJobs);
router.post('/saved-jobs/:jobId', (0, packageGuard_1.requireQuota)('savedJobs', 1, 'Your saved jobs limit has been reached. Upgrade your package to bookmark more jobs.'), candidate_controller_1.saveJob);
router.delete('/saved-jobs/:jobId', candidate_controller_1.unsaveJob);
// Job Alerts
router.get('/job-alerts', candidate_controller_1.getJobAlerts);
router.post('/job-alerts', (0, packageGuard_1.requireQuota)('jobAlerts', 1, 'Your job alert limit has been reached. Upgrade your package to create more alerts.'), candidate_controller_1.createJobAlert);
router.put('/job-alerts/:id', candidate_controller_1.updateJobAlert);
router.delete('/job-alerts/:id', candidate_controller_1.deleteJobAlert);
// Notifications
router.get('/notifications', candidate_controller_1.getNotifications);
router.put('/notifications/:id/read', candidate_controller_1.markNotificationRead);
router.put('/notifications/read-all', candidate_controller_1.markAllNotificationsRead);
// Subscription & Payments
router.get('/subscription', candidate_controller_1.getSubscription);
router.get('/payments', candidate_controller_1.getPaymentHistory);
// AI Resume Builder (Protected by resumeBuilder feature)
router.post('/ai-resume/generate-summary', (0, packageGuard_1.requireFeature)('resumeBuilder', 'The AI Resume Builder is a premium feature. Upgrade your package to access it.'), aiResume_controller_1.generateAISummary);
router.post('/ai-resume/enhance-experience', (0, packageGuard_1.requireFeature)('resumeBuilder', 'The AI Resume Builder is a premium feature. Upgrade your package to access it.'), aiResume_controller_1.enhanceExperience);
router.post('/ai-resume/suggest-skills', (0, packageGuard_1.requireFeature)('resumeBuilder', 'The AI Resume Builder is a premium feature. Upgrade your package to access it.'), aiResume_controller_1.suggestSkills);
router.post('/ai-resume/ats-audit', (0, packageGuard_1.requireFeature)('resumeBuilder', 'The AI Resume Builder is a premium feature. Upgrade your package to access it.'), aiResume_controller_1.auditATSScore);
router.get('/ai-resume/draft', (0, packageGuard_1.requireFeature)('resumeBuilder', 'The AI Resume Builder is a premium feature. Upgrade your package to access it.'), aiResume_controller_1.getResumeDraft);
router.put('/ai-resume/draft', (0, packageGuard_1.requireFeature)('resumeBuilder', 'The AI Resume Builder is a premium feature. Upgrade your package to access it.'), aiResume_controller_1.saveResumeDraft);
exports.default = router;
//# sourceMappingURL=candidate.routes.js.map