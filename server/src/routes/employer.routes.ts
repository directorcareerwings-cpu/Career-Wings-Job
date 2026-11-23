import { Router } from 'express';
import {
  getCompanyProfile, updateEmployerProfile, updateCompany, uploadCompanyLogo,
  getEmployerJobs, postJob, getEmployerJobById, updateJob, updateJobStatus, deleteJob,
  getFeaturedJobQuota, toggleJobFeatured,
  getApplicants, getAllApplicants, updateApplicationStatus,
  searchCandidates, getCandidateDetail, downloadCandidateResume,
  revealCandidateContact, bulkDownloadCandidates, sendCandidateInterviewOffer,
  getSavedCandidates, saveCandidate, unsaveCandidate,
  getAnalytics, getEmployerSubscription, getEmployerPayments, getEmployerCounts,
  getEmployerDashboard,
} from '../controllers/employer.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { imageUpload, employerCompanyLogoUpload } from '../middleware/upload';
import { requireFeature, requireQuota } from '../middleware/packageGuard';
import { AppError } from '../lib/errors';

const router = Router();
router.use(authenticateToken, requireRole('EMPLOYER'));

// Profile & Company
router.get('/profile', getCompanyProfile);
router.put('/profile', updateEmployerProfile);
router.get('/company', getCompanyProfile);
router.put('/company', requireFeature('companyProfile', 'A branded company profile requires an active employer package.'), updateCompany);
router.post('/company/logo', (req, res, next) => {
  employerCompanyLogoUpload(req, res, (err) => {
    if (err) {
      if ((err as any).code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('Logo file size exceeds the 2 MB limit. Please select an image under 2 MB.', 400));
      }
      return next(err);
    }
    next();
  });
}, uploadCompanyLogo);

// Jobs
router.get('/jobs', getEmployerJobs);
router.get('/jobs/featured-quota', getFeaturedJobQuota);
router.post('/jobs', requireQuota('jobPostings', 1, 'Your job posting limit has been reached. Upgrade your package to post more jobs.'), postJob);
router.get('/jobs/:id', getEmployerJobById);
router.put('/jobs/:id', updateJob);
router.patch('/jobs/:id/feature', toggleJobFeatured);
router.patch('/jobs/:id/status', updateJobStatus);
router.delete('/jobs/:id', deleteJob);

// Applicants (ATS & Management)
router.get('/all-applicants', getAllApplicants);
router.get('/jobs/:jobId/applicants', requireFeature('applicationManagement', 'Applicant Tracking System (ATS) access requires an upgraded package.'), getApplicants);
router.patch('/jobs/:jobId/applicants/:applicationId/status', requireFeature('applicantShortlisting', 'Applicant shortlisting & status management requires an upgraded package.'), updateApplicationStatus);
router.put('/jobs/:jobId/applicants/:applicationId/status', requireFeature('applicantShortlisting', 'Applicant shortlisting & status management requires an upgraded package.'), updateApplicationStatus);

// Candidate Database & Resume Search
router.get('/candidates', searchCandidates);
router.get('/candidates/:candidateId', getCandidateDetail);
router.post('/candidates/bulk-download', bulkDownloadCandidates);
router.post('/candidates/:candidateId/reveal', revealCandidateContact);
router.post('/candidates/:candidateId/interview-offer', sendCandidateInterviewOffer);
router.get('/candidates/:candidateId/resume', downloadCandidateResume);

// Saved Candidates
router.get('/saved-candidates', getSavedCandidates);
router.post('/saved-candidates/:candidateId', requireFeature('applicantShortlisting', 'Saving and shortlisting candidate profiles requires an active recruitment package.'), saveCandidate);
router.delete('/saved-candidates/:candidateId', unsaveCandidate);

// Analytics & Subscription & Portal Counts & Dashboard
router.get('/dashboard', getEmployerDashboard);
router.get('/analytics', getAnalytics);
router.get('/counts', getEmployerCounts);
router.get('/subscription', getEmployerSubscription);
router.get('/payments', getEmployerPayments);

export default router;
