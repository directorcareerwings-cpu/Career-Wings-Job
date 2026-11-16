import { Router } from 'express';
import { searchJobs, getJobDetail, getSimilarJobs, getFeaturedJobs } from '../controllers/jobs.controller';
import { applyForJob } from '../controllers/candidate.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', searchJobs);
router.get('/featured', getFeaturedJobs);
router.get('/:slug', getJobDetail);
router.get('/:slug/similar', getSimilarJobs);
router.post('/:jobId/apply', authenticateToken, requireRole('CANDIDATE'), applyForJob);

export default router;
