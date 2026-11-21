import { Router } from 'express';
import {
  getPublicBlogPosts,
  getBlogPostBySlug,
  getBlogCategories,
  getFeaturedBlogPosts,
  adminGetBlogPosts,
  adminCreateBlogPost,
  adminUpdateBlogPost,
  adminDeleteBlogPost,
} from '../controllers/blog.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { imageUpload } from '../middleware/upload';
import { sendSuccess } from '../lib/response';
import { AppError } from '../lib/errors';

const router = Router();

// ─── Public Blog Endpoints ───────────────────────────────────────────────────
router.get('/', getPublicBlogPosts);
router.get('/categories', getBlogCategories);
router.get('/featured', getFeaturedBlogPosts);
router.get('/:slug', getBlogPostBySlug);

export default router;

// ─── Admin Blog Endpoints (Exported separately for mounting under /api/admin/blog)
export const adminBlogRouter = Router();
adminBlogRouter.use(authenticateToken, requireRole('ADMIN'));

adminBlogRouter.get('/', adminGetBlogPosts);
adminBlogRouter.post('/', adminCreateBlogPost);
adminBlogRouter.put('/:id', adminUpdateBlogPost);
adminBlogRouter.delete('/:id', adminDeleteBlogPost);
adminBlogRouter.post('/upload-cover', (req, res, next) => {
  imageUpload(req, res, (err) => {
    if (err) return next(err);
    const file = req.file;
    if (!file) return next(new AppError('No image file provided', 400));
    const imageUrl = `/uploads/images/${file.filename}`;
    sendSuccess(res, { url: imageUrl }, 'Cover image uploaded successfully');
  });
});
