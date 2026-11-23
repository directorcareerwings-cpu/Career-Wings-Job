"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employer_controller_1 = require("../controllers/employer.controller");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const packageGuard_1 = require("../middleware/packageGuard");
const errors_1 = require("../lib/errors");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken, (0, auth_1.requireRole)('EMPLOYER'));
// Profile & Company
router.get('/profile', employer_controller_1.getCompanyProfile);
router.put('/profile', employer_controller_1.updateEmployerProfile);
router.get('/company', employer_controller_1.getCompanyProfile);
router.put('/company', (0, packageGuard_1.requireFeature)('companyProfile', 'A branded company profile requires an active employer package.'), employer_controller_1.updateCompany);
router.post('/company/logo', (req, res, next) => {
    (0, upload_1.employerCompanyLogoUpload)(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(new errors_1.AppError('Logo file size exceeds the 2 MB limit. Please select an image under 2 MB.', 400));
            }
            return next(err);
        }
        next();
    });
}, employer_controller_1.uploadCompanyLogo);
// Jobs
router.get('/jobs', employer_controller_1.getEmployerJobs);
router.get('/jobs/featured-quota', employer_controller_1.getFeaturedJobQuota);
router.post('/jobs', (0, packageGuard_1.requireQuota)('jobPostings', 1, 'Your job posting limit has been reached. Upgrade your package to post more jobs.'), employer_controller_1.postJob);
router.get('/jobs/:id', employer_controller_1.getEmployerJobById);
router.put('/jobs/:id', employer_controller_1.updateJob);
router.patch('/jobs/:id/feature', employer_controller_1.toggleJobFeatured);
router.patch('/jobs/:id/status', employer_controller_1.updateJobStatus);
router.delete('/jobs/:id', employer_controller_1.deleteJob);
// Applicants (ATS & Management)
router.get('/all-applicants', employer_controller_1.getAllApplicants);
router.get('/jobs/:jobId/applicants', (0, packageGuard_1.requireFeature)('applicationManagement', 'Applicant Tracking System (ATS) access requires an upgraded package.'), employer_controller_1.getApplicants);
router.patch('/jobs/:jobId/applicants/:applicationId/status', (0, packageGuard_1.requireFeature)('applicantShortlisting', 'Applicant shortlisting & status management requires an upgraded package.'), employer_controller_1.updateApplicationStatus);
router.put('/jobs/:jobId/applicants/:applicationId/status', (0, packageGuard_1.requireFeature)('applicantShortlisting', 'Applicant shortlisting & status management requires an upgraded package.'), employer_controller_1.updateApplicationStatus);
// Candidate Database & Resume Search
router.get('/candidates', employer_controller_1.searchCandidates);
router.get('/candidates/:candidateId', employer_controller_1.getCandidateDetail);
router.post('/candidates/bulk-download', employer_controller_1.bulkDownloadCandidates);
router.post('/candidates/:candidateId/reveal', employer_controller_1.revealCandidateContact);
router.post('/candidates/:candidateId/interview-offer', employer_controller_1.sendCandidateInterviewOffer);
router.get('/candidates/:candidateId/resume', employer_controller_1.downloadCandidateResume);
// Saved Candidates
router.get('/saved-candidates', employer_controller_1.getSavedCandidates);
router.post('/saved-candidates/:candidateId', (0, packageGuard_1.requireFeature)('applicantShortlisting', 'Saving and shortlisting candidate profiles requires an active recruitment package.'), employer_controller_1.saveCandidate);
router.delete('/saved-candidates/:candidateId', employer_controller_1.unsaveCandidate);
// Analytics & Subscription & Portal Counts & Dashboard
router.get('/dashboard', employer_controller_1.getEmployerDashboard);
router.get('/analytics', employer_controller_1.getAnalytics);
router.get('/counts', employer_controller_1.getEmployerCounts);
router.get('/subscription', employer_controller_1.getEmployerSubscription);
router.get('/payments', employer_controller_1.getEmployerPayments);
exports.default = router;
//# sourceMappingURL=employer.routes.js.map