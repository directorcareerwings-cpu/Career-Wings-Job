"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jobs_controller_1 = require("../controllers/jobs.controller");
const candidate_controller_1 = require("../controllers/candidate.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', jobs_controller_1.searchJobs);
router.get('/featured', jobs_controller_1.getFeaturedJobs);
router.get('/:slug', jobs_controller_1.getJobDetail);
router.get('/:slug/similar', jobs_controller_1.getSimilarJobs);
router.post('/:jobId/apply', auth_1.authenticateToken, (0, auth_1.requireRole)('CANDIDATE'), candidate_controller_1.applyForJob);
exports.default = router;
//# sourceMappingURL=jobs.routes.js.map