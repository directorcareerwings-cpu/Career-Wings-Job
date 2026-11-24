import { Router } from 'express';
import {
  getStats,
  getPublicPackages,
  getFeaturedJobs,
  getCompanies,
  getTopCompanies,
  getCompanyBySlug,
  getCompanyJobs,
  getCategories,
  getCategoryBySlug,
  getLocations,
  getLocationBySlug,
  getSitemap,
  getRobots,
  getPublicCoolPlaces,
  getPublicSettings,
  getPublicEducationMaster,
} from '../controllers/public.controller';

const router = Router();

// Public endpoints
router.get('/stats', getStats);
router.get('/settings', getPublicSettings);
router.get('/education-master', getPublicEducationMaster);
router.get('/packages', getPublicPackages);
router.get('/jobs/featured', getFeaturedJobs);
router.get('/companies', getCompanies);
router.get('/companies/top', getTopCompanies);
router.get('/companies/:slug', getCompanyBySlug);
router.get('/companies/:slug/jobs', getCompanyJobs);
router.get('/categories', getCategories);
router.get('/categories/:slug', getCategoryBySlug);
router.get('/locations', getLocations);
router.get('/locations/:slug', getLocationBySlug);
router.get('/sitemap.xml', getSitemap);
router.get('/robots.txt', getRobots);
router.get('/cool-places', getPublicCoolPlaces);

export default router;
