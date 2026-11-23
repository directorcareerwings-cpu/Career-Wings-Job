"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminBlogRouter = void 0;
const express_1 = require("express");
const blog_controller_1 = require("../controllers/blog.controller");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const response_1 = require("../lib/response");
const errors_1 = require("../lib/errors");
const router = (0, express_1.Router)();
// ─── Public Blog Endpoints ───────────────────────────────────────────────────
router.get('/', blog_controller_1.getPublicBlogPosts);
router.get('/categories', blog_controller_1.getBlogCategories);
router.get('/featured', blog_controller_1.getFeaturedBlogPosts);
router.get('/:slug', blog_controller_1.getBlogPostBySlug);
exports.default = router;
// ─── Admin Blog Endpoints (Exported separately for mounting under /api/admin/blog)
exports.adminBlogRouter = (0, express_1.Router)();
exports.adminBlogRouter.use(auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'));
exports.adminBlogRouter.get('/', blog_controller_1.adminGetBlogPosts);
exports.adminBlogRouter.post('/', blog_controller_1.adminCreateBlogPost);
exports.adminBlogRouter.put('/:id', blog_controller_1.adminUpdateBlogPost);
exports.adminBlogRouter.delete('/:id', blog_controller_1.adminDeleteBlogPost);
exports.adminBlogRouter.post('/upload-cover', (req, res, next) => {
    (0, upload_1.imageUpload)(req, res, (err) => {
        if (err)
            return next(err);
        const file = req.file;
        if (!file)
            return next(new errors_1.AppError('No image file provided', 400));
        const imageUrl = `/uploads/images/${file.filename}`;
        (0, response_1.sendSuccess)(res, { url: imageUrl }, 'Cover image uploaded successfully');
    });
});
//# sourceMappingURL=blog.routes.js.map