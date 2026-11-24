"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const public_controller_1 = require("../controllers/public.controller");
const router = (0, express_1.Router)();
// Public endpoints
router.get('/stats', public_controller_1.getStats);
router.get('/settings', public_controller_1.getPublicSettings);
router.get('/education-master', public_controller_1.getPublicEducationMaster);
router.get('/packages', public_controller_1.getPublicPackages);
router.get('/jobs/featured', public_controller_1.getFeaturedJobs);
router.get('/companies', public_controller_1.getCompanies);
router.get('/companies/top', public_controller_1.getTopCompanies);
router.get('/companies/:slug', public_controller_1.getCompanyBySlug);
router.get('/companies/:slug/jobs', public_controller_1.getCompanyJobs);
router.get('/categories', public_controller_1.getCategories);
router.get('/categories/:slug', public_controller_1.getCategoryBySlug);
router.get('/locations', public_controller_1.getLocations);
router.get('/locations/:slug', public_controller_1.getLocationBySlug);
router.get('/sitemap.xml', public_controller_1.getSitemap);
router.get('/robots.txt', public_controller_1.getRobots);
router.get('/cool-places', public_controller_1.getPublicCoolPlaces);
exports.default = router;
//# sourceMappingURL=public.routes.js.map