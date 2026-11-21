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
