import { Request, Response, NextFunction } from 'express';
import slugify from 'slugify';
import { prisma, isMysqlConfigured } from '../lib/prisma';
import { sendSuccess } from '../lib/response';
import { AppError } from '../lib/errors';
import { onBlogDeleted, onBlogPublished } from '../services/seo.service';

/**
 * Ensure BlogPost table exists in SQLite database (zero-dependency fail-safe)
 */
export const ensureBlogPostTable = async (): Promise<void> => {
  if (isMysqlConfigured()) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BlogPost" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "slug" TEXT NOT NULL UNIQUE,
        "excerpt" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "coverImage" TEXT,
        "category" TEXT NOT NULL DEFAULT 'Career Advice',
        "tags" TEXT,
        "authorName" TEXT NOT NULL DEFAULT 'Career Wings Editorial Team',
        "authorRole" TEXT DEFAULT 'Career Advisor',
        "authorAvatar" TEXT,
        "readTimeMin" INTEGER NOT NULL DEFAULT 5,
        "isFeatured" BOOLEAN NOT NULL DEFAULT 0,
        "isPublished" BOOLEAN NOT NULL DEFAULT 1,
        "publishedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "views" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "BlogPost_slug_key" ON "BlogPost"("slug");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BlogPost_category_idx" ON "BlogPost"("category");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BlogPost_isPublished_idx" ON "BlogPost"("isPublished");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BlogPost_isFeatured_idx" ON "BlogPost"("isFeatured");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BlogPost_createdAt_idx" ON "BlogPost"("createdAt");`);
  } catch (err) {
    console.warn('[BLOG TABLE INIT] Table setup notice:', err);
  }
};

/**
 * Initial curated high-impact seed articles for Northeast India Job Seekers & Employers
 */
const DEFAULT_POSTS = [
  {
    title: 'Top In-Demand Career Opportunities in Guwahati & Northeast India for 2026',
    slug: 'top-in-demand-career-opportunities-guwahati-northeast-2026',
    excerpt: 'Explore the fastest-growing hiring sectors across Assam and Northeast India, from IT services and fintech to specialized healthcare and logistics hubs.',
    category: 'Career Advice',
    tags: JSON.stringify(['Guwahati Jobs', 'Career Trends', 'Northeast India', 'Hiring 2026']),
    authorName: 'Career Wings Editorial Team',
    authorRole: 'Career Insights Specialist',
    coverImage: '/images/hero-banner.png',
    readTimeMin: 5,
    isFeatured: true,
    isPublished: true,
    content: `
      <h2>The Rapid Transformation of Northeast India's Employment Landscape</h2>
      <p>Over the past few years, Assam and the Northeastern states have witnessed substantial industrial diversification. Guwahati, being the strategic gateway to Southeast Asia and the commercial hub of Northeast India, has seen exponential demand for skilled professionals across technology, healthcare, logistics, and retail.</p>
      
      <h3>1. Information Technology & Digital Services</h3>
      <p>With tech park developments in Guwahati and improved optical fiber connectivity, local startups and pan-Indian IT firms are setting up customer delivery and software support centers. High demand skills include <strong>Full-Stack Web Development, Data Analytics, Python, and Cloud Management</strong>.</p>
      
      <h3>2. Healthcare, Diagnostics & Pharmaceuticals</h3>
      <p>Northeast India has emerged as a premier medical center for neighboring states and countries like Bhutan and Bangladesh. Hospitals and pharmaceutical distributors in Guwahati, Silchar, and Dibrugarh actively recruit <strong>Doctors, Staff Nurses, Lab Technicians, Medical Representatives, and Healthcare Administrators</strong>.</p>

      <h3>3. Banking, Financial Services & Micro-Finance</h3>
      <p>Private banks, regional rural institutions, and NBFCs are rapidly expanding rural and semi-urban branch networks. Roles for <strong>Branch Managers, Relationship Officers, Credit Underwriters, and Accountants</strong> are available consistently throughout Assam.</p>

      <h3>4. Modern Logistics, Warehousing & E-Commerce</h3>
      <p>Guwahati serves as the regional distribution hub for Flipkart, Amazon, and logistics conglomerates. Career opportunities in <strong>Supply Chain Coordination, Fleet Management, and Warehouse Operations</strong> provide solid starting points for fresh graduates and experienced professionals alike.</p>

      <blockquote>
        "The key to securing high-paying roles in Northeast India is building verifiable, practical skills and connecting directly with verified employers through transparent portals."
      </blockquote>

      <h3>Key Recommendations for Job Seekers</h3>
      <ul>
        <li><strong>Tailor your resume:</strong> Highlight hands-on experience, computer literacy, and relevant language proficiencies (Assamese, Bengali, Hindi, English).</li>
        <li><strong>Set up real-time Job Alerts:</strong> Act quickly when new vacancies are published on Career Wings.</li>
        <li><strong>Never pay placement fees:</strong> Legitimate recruiters never charge money for employment.</li>
      </ul>
    `,
  },
  {
    title: 'How to Write a Winning Resume for Northeast India Employers: A Step-by-Step Guide',
    slug: 'how-to-write-a-winning-resume-northeast-employers',
    excerpt: 'Practical advice on structuring your resume, highlighting relevant skills, and avoiding the common mistakes that get candidates disqualified.',
    category: 'Resume Tips',
    tags: JSON.stringify(['Resume Guide', 'CV Writing', 'Interview Prep', 'Job Application']),
    authorName: 'Priyanka Sarma',
    authorRole: 'Senior HR Consultant',
    coverImage: '/images/hero-banner-hd.png',
    readTimeMin: 6,
    isFeatured: false,
    isPublished: true,
    content: `
      <h2>Why Your Resume Matters More Than Ever</h2>
      <p>Recruiters in Guwahati and across Assam spend an average of only 6 to 10 seconds scanning each resume before deciding whether to shortlist a candidate or move on. In a competitive market, a clear, well-formatted CV makes all the difference.</p>

      <h3>Essential Sections Every Resume Must Have</h3>
      <ol>
        <li><strong>Header & Contact Information:</strong> Your full legal name, current location (City & State), contact phone number, and a professional email address.</li>
        <li><strong>Professional Summary:</strong> A concise 2-3 sentence overview of your strengths, qualifications, and the value you bring to the employer.</li>
        <li><strong>Core Competencies & Skills:</strong> Specific technical and soft skills matching the job description.</li>
        <li><strong>Work Experience:</strong> Reverse-chronological listing of your past roles with quantifiable bullet points (e.g., "Increased sales by 22% in Kamrup district").</li>
        <li><strong>Education & Certifications:</strong> Degree, institution, university, and passing year.</li>
      </ol>

      <h3>Top 5 Mistakes to Avoid</h3>
      <ul>
        <li><strong>Spelling & Grammatical Errors:</strong> Always proofread your CV or have a mentor review it.</li>
        <li><strong>Generic Job Objectives:</strong> Replace outdated objectives with a tailored summary that addresses the employer's needs.</li>
        <li><strong>Unprofessional Email Addresses:</strong> Use a simple format like <code>firstname.lastname@gmail.com</code>.</li>
        <li><strong>Irrelevant Personal Information:</strong> There is no need to list marital status, religion, or passport number unless specifically requested.</li>
      </ul>
    `,
  },
  {
    title: 'Fresher Interview Guide: Top 10 Questions Asked by Top Recruiters in Assam',
    slug: 'fresher-interview-guide-top-10-questions-assam-recruiters',
    excerpt: 'Comprehensive model answers and expert interview tips for college graduates seeking their first job in Assam and neighboring states.',
    category: 'Interview Tips',
    tags: JSON.stringify(['Fresher Jobs', 'Interview Questions', 'Guwahati', 'Campus Placement']),
    authorName: 'Vikram Baruah',
    authorRole: 'Recruitment Lead',
    coverImage: '/images/hero-banner.png',
    readTimeMin: 7,
    isFeatured: false,
    isPublished: true,
    content: `
      <h2>Preparing for Your First Job Interview</h2>
      <p>Landing your first job after college is exciting, but interviews can feel daunting. Knowing the standard questions and practicing structured answers using the STAR method (Situation, Task, Action, Result) will boost your confidence.</p>

      <h3>1. "Tell me about yourself."</h3>
      <p>Keep your response focused on your academic background, key projects, technical proficiencies, and why you are enthusiastic about this specific role.</p>

      <h3>2. "Why do you want to work for our organization?"</h3>
      <p>Demonstrate that you researched the company. Mention their recent milestones, company values, or specific products they offer in the Northeast region.</p>

      <h3>3. "What are your greatest strengths and areas for growth?"</h3>
      <p>Choose strengths that align with the job description (e.g., adaptability, problem-solving). For areas of growth, explain what steps you are currently taking to improve.</p>

      <h3>4. "Where do you see yourself in 3 years?"</h3>
      <p>Express a desire for long-term growth, mastering your role, taking on greater responsibility, and contributing meaningfully to team success.</p>

      <h3>Day-of-Interview Best Practices</h3>
      <ul>
        <li>Arrive 15 minutes early for in-person interviews or test your camera/mic for virtual calls.</li>
        <li>Dress professionally in formal or smart-business attire.</li>
        <li>Carry 2 hard copies of your updated resume and academic certificates in a clean folder.</li>
      </ul>
    `,
  },
  {
    title: 'Zero Placement Fee Hiring: Why Transparent Recruitment is Transforming Northeast Job Seekers',
    slug: 'zero-placement-fee-hiring-transparent-recruitment-careerwings',
    excerpt: 'How Career Wings protects candidates from fraudulent middle-men and connects genuine talent directly to top companies for free.',
    category: 'Hiring & Recruitment',
    tags: JSON.stringify(['Zero Fee', 'Transparent Hiring', 'Career Wings', 'Recruiter Connect']),
    authorName: 'Career Wings Editorial Team',
    authorRole: 'Integrity & Verification Team',
    coverImage: '/images/hero-banner-hd.png',
    readTimeMin: 4,
    isFeatured: false,
    isPublished: true,
    content: `
      <h2>Ending Placement Scams in Northeast India</h2>
      <p>For years, job seekers across Assam, Meghalaya, and Manipur have faced predatory placement agents who demand upfront "registration fees" or "training security deposits" with false promises of government or MNC jobs. In almost all cases, candidates lose their hard-earned money without ever receiving a genuine offer.</p>

      <h3>The Career Wings Pledge: 100% Free for Candidates</h3>
      <p>Career Wings was founded on a simple principle: <strong>No candidate should ever pay to get a job.</strong> Legitimate companies pay recruitment platforms to find top talent; asking candidates for placement fees is unethical and often illegal.</p>

      <h3>Our Verification Process</h3>
      <ul>
        <li><strong>Employer KYC:</strong> Every employer registered on Career Wings undergoes verification to confirm company legitimacy.</li>
        <li><strong>Direct Recruiter Contact:</strong> Applications go straight to the company's HR inbox or ATS dashboard, eliminating fraudulent intermediaries.</li>
        <li><strong>WhatsApp & Email Alerts:</strong> Receive free, instant notifications when a verified recruiter reviews your profile or schedules an interview.</li>
      </ul>
    `,
  },
  {
    title: 'Govt vs Private Sector Jobs in Assam: Navigating Career Growth & Stability',
    slug: 'govt-vs-private-sector-jobs-assam-career-growth',
    excerpt: 'A balanced comparison of compensation packages, long-term learning curves, and emerging hybrid opportunities across Northeast India.',
    category: 'Industry Insights',
    tags: JSON.stringify(['Govt Jobs', 'Private Sector', 'Assam Employment', 'Career Choice']),
    authorName: 'Debabrata Saikia',
    authorRole: 'Economic Analyst',
    coverImage: '/images/hero-banner.png',
    readTimeMin: 6,
    isFeatured: false,
    isPublished: true,
    content: `
      <h2>The Great Career Debate in Northeast India</h2>
      <p>In Assam and the Northeastern states, government employment has traditionally been considered the gold standard of job security. However, with the rapid growth of private enterprise, corporate banks, modern retail, and tech services, the private sector now offers dynamic opportunities with faster wage growth and merit-based advancement.</p>

      <h3>Comparing Both Career Paths</h3>
      <p><strong>Government Roles:</strong> Offer unmatched job security, predictable working hours, and pension/health allowances. However, recruitment cycles often take 1 to 3 years with high competition ratios.</p>
      <p><strong>Private Sector Careers:</strong> Faster hiring cycles, performance-based promotions, continuous skill enhancement, and exposure to modern technologies and pan-India projects.</p>

      <h3>The Rise of Regional Corporate Hubs</h3>
      <p>Guwahati is now home to regional headquarters for national brands across telecom, insurance, FMCG, and hospitality. For graduates who invest in communication skills and technical proficiencies, private corporate careers provide high earning potential and rapid career growth right here in Assam.</p>
    `,
  },
];

/**
 * Seed default posts if BlogPost table is empty
 */
export const seedDefaultBlogPostsIfEmpty = async (): Promise<void> => {
  try {
    await ensureBlogPostTable();
    const count = await prisma.blogPost.count();
    if (count === 0) {
      console.log('📝 [Blog Seed] Seeding 5 initial high-value articles for Career Wings Blog...');
      for (const post of DEFAULT_POSTS) {
        await prisma.blogPost.create({
          data: post,
        });
      }
      console.log('✔ [Blog Seed] 5 articles seeded successfully.');
    }
  } catch (err) {
    console.warn('[Blog Seed Warning]:', err);
  }
};

// ─── Public API Handlers ─────────────────────────────────────────────────────

/**
 * Get published blog posts (with pagination, search, category filter)
 */
export const getPublicBlogPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureBlogPostTable();
    await seedDefaultBlogPostsIfEmpty();

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 9));
    const skip = (page - 1) * limit;

    const category = req.query.category as string;
    const search = req.query.search as string;

    const where: any = {
      isPublished: true,
    };

    if (category && category !== 'All') {
      where.category = category;
    }

    if (search && search.trim().length > 0) {
      where.OR = [
        { title: { contains: search.trim() } },
        { excerpt: { contains: search.trim() } },
        { content: { contains: search.trim() } },
        { tags: { contains: search.trim() } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: [
          { isFeatured: 'desc' },
          { publishedAt: 'desc' },
        ],
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          category: true,
          tags: true,
          authorName: true,
          authorRole: true,
          authorAvatar: true,
          readTimeMin: true,
          isFeatured: true,
          publishedAt: true,
          views: true,
          createdAt: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return sendSuccess(res, {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single blog post by slug with view increment and related posts
 */
export const getBlogPostBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureBlogPostTable();
    await seedDefaultBlogPostsIfEmpty();

    const { slug } = req.params;
    if (!slug) throw new AppError('Post slug is required', 400);

    const post = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (!post || (!post.isPublished && (req as any).user?.role !== 'ADMIN')) {
      throw new AppError('Article not found or not published', 404);
    }

    // Increment views asynchronously
    prisma.blogPost.update({
      where: { id: post.id },
      data: { views: { increment: 1 } },
    }).catch(console.error);

    // Fetch up to 3 related articles from the same category
    const relatedPosts = await prisma.blogPost.findMany({
      where: {
        id: { not: post.id },
        isPublished: true,
        category: post.category,
      },
      take: 3,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        category: true,
        readTimeMin: true,
        publishedAt: true,
      },
    });

    return sendSuccess(res, {
      post: {
        ...post,
        views: post.views + 1,
      },
      relatedPosts,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get distinct blog categories with post count
 */
export const getBlogCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureBlogPostTable();
    await seedDefaultBlogPostsIfEmpty();

    const categoriesRaw = await prisma.blogPost.groupBy({
      by: ['category'],
      where: { isPublished: true },
      _count: { id: true },
    });

    const categories = categoriesRaw.map((c) => ({
      name: c.category,
      count: c._count.id,
    }));

    return sendSuccess(res, { categories });
  } catch (err) {
    next(err);
  }
};

/**
 * Get featured blog posts for Homepage or widgets
 */
export const getFeaturedBlogPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureBlogPostTable();
    await seedDefaultBlogPostsIfEmpty();

    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true, isFeatured: true },
      take: 4,
      orderBy: { publishedAt: 'desc' },
    });

    return sendSuccess(res, { posts });
  } catch (err) {
    next(err);
  }
};

// ─── Admin API Handlers ──────────────────────────────────────────────────────

/**
 * Admin: List all blog posts (including drafts)
 */
export const adminGetBlogPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureBlogPostTable();
    await seedDefaultBlogPostsIfEmpty();

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 15));
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const status = req.query.status as string; // 'PUBLISHED' | 'DRAFT' | 'ALL'

    const where: any = {};
    if (status === 'PUBLISHED') where.isPublished = true;
    if (status === 'DRAFT') where.isPublished = false;
    if (category && category !== 'All') where.category = category;

    if (search && search.trim().length > 0) {
      where.OR = [
        { title: { contains: search.trim() } },
        { excerpt: { contains: search.trim() } },
        { authorName: { contains: search.trim() } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return sendSuccess(res, {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Create a new blog post
 */
export const adminCreateBlogPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureBlogPostTable();

    const {
      title,
      slug: customSlug,
      excerpt,
      content,
      coverImage,
      category,
      tags,
      authorName,
      authorRole,
      readTimeMin,
      isFeatured,
      isPublished,
    } = req.body;

    if (!title || !excerpt || !content) {
      throw new AppError('Title, excerpt, and content are required.', 400);
    }

    let baseSlug = customSlug && customSlug.trim()
      ? slugify(customSlug.trim(), { lower: true, strict: true })
      : slugify(title.trim(), { lower: true, strict: true });

    if (!baseSlug) baseSlug = `post-${Date.now()}`;

    // Ensure unique slug
    let finalSlug = baseSlug;
    let count = 1;
    while (await prisma.blogPost.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${count++}`;
    }

    const newPost = await prisma.blogPost.create({
      data: {
        title: title.trim(),
        slug: finalSlug,
        excerpt: excerpt.trim(),
        content: content.trim(),
        coverImage: coverImage?.trim() || null,
        category: category?.trim() || 'Career Advice',
        tags: Array.isArray(tags) ? JSON.stringify(tags) : (tags || null),
        authorName: authorName?.trim() || 'Career Wings Editorial Team',
        authorRole: authorRole?.trim() || 'Career Advisor',
        readTimeMin: parseInt(readTimeMin, 10) || 5,
        isFeatured: Boolean(isFeatured),
        isPublished: isPublished !== false,
        publishedAt: isPublished !== false ? new Date() : null,
      },
    });

    onBlogPublished(newPost.id).catch(() => {});

    return sendSuccess(res, { post: newPost }, 'Article created successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Update an existing blog post
 */
export const adminUpdateBlogPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureBlogPostTable();

    const { id } = req.params;
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new AppError('Blog post not found', 404);

    const {
      title,
      slug: customSlug,
      excerpt,
      content,
      coverImage,
      category,
      tags,
      authorName,
      authorRole,
      readTimeMin,
      isFeatured,
      isPublished,
    } = req.body;

    const data: any = {};
    if (title) data.title = title.trim();
    if (excerpt !== undefined) data.excerpt = excerpt.trim();
    if (content !== undefined) data.content = content.trim();
    if (coverImage !== undefined) data.coverImage = coverImage?.trim() || null;
    if (category) data.category = category.trim();
    if (tags !== undefined) data.tags = Array.isArray(tags) ? JSON.stringify(tags) : (tags || null);
    if (authorName) data.authorName = authorName.trim();
    if (authorRole !== undefined) data.authorRole = authorRole.trim();
    if (readTimeMin !== undefined) data.readTimeMin = parseInt(readTimeMin, 10) || 5;
    if (isFeatured !== undefined) data.isFeatured = Boolean(isFeatured);

    if (isPublished !== undefined) {
      data.isPublished = Boolean(isPublished);
      if (Boolean(isPublished) && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    if (customSlug && customSlug.trim() && customSlug.trim() !== existing.slug) {
      const formattedSlug = slugify(customSlug.trim(), { lower: true, strict: true });
      const slugConflict = await prisma.blogPost.findUnique({ where: { slug: formattedSlug } });
      if (slugConflict && slugConflict.id !== id) {
        throw new AppError('An article with this slug already exists.', 400);
      }
      data.slug = formattedSlug;
    }

    const updated = await prisma.blogPost.update({
      where: { id },
      data,
    });

    if (data.slug && data.slug !== existing.slug) {
      onBlogDeleted(existing.slug).catch(() => {});
    }
    onBlogPublished(updated.id).catch(() => {});

    return sendSuccess(res, { post: updated }, 'Article updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Delete a blog post
 */
export const adminDeleteBlogPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureBlogPostTable();

    const { id } = req.params;
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new AppError('Blog post not found', 404);

    await prisma.blogPost.delete({ where: { id } });
    onBlogDeleted(existing.slug).catch(() => {});

    return sendSuccess(res, { id }, 'Article deleted successfully');
  } catch (err) {
    next(err);
  }
};
