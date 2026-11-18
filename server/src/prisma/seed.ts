import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.FORCE_PRODUCTION_SEED) {
    console.error('⛔ [CRITICAL SAFETY GUARD] Seeding is DISABLED in PRODUCTION environment to protect live data!');
    console.error('   Existing job posts, candidates, and employers cannot be modified by seed scripts.');
    process.exit(0);
  }

  console.log('🌱 Starting Career Wings database seeding...');

  // 1. Admin User
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@careerwings.in' },
    update: {},
    create: {
      email: 'admin@careerwings.in',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
    },
  });
  console.log(`✔ Admin created: ${admin.email}`);

  // 2. Candidate Packages
  const candidatePackages = [
    {
      name: 'Job Seeker Free',
      slug: 'candidate-free',
      type: 'CANDIDATE',
      price: 0,
      durationDays: 365,
      sortOrder: 1,
      color: '#3B82F6',
      description: 'Standard plan for freshers and active job seekers in Northeast India',
      limits: JSON.stringify({
        jobApplications: 15,
        resumeVisibility: true,
        jobAlerts: 3,
        featuredProfile: false,
      }),
      features: JSON.stringify([
        '15 Job Applications / month',
        'Upload & Manage Resume (PDF/DOCX)',
        '3 Custom Job Alerts',
        'Direct Application Tracking',
        'Standard Support',
      ]),
    },
    {
      name: 'Career Booster Pro',
      slug: 'candidate-pro',
      type: 'CANDIDATE',
      price: 499,
      durationDays: 60,
      sortOrder: 2,
      isFeatured: true,
      color: '#F97316',
      description: 'Fast-track your job search with priority visibility and unlimited applications',
      limits: JSON.stringify({
        jobApplications: -1, // unlimited
        resumeVisibility: true,
        jobAlerts: 10,
        featuredProfile: true,
      }),
      features: JSON.stringify([
        'Unlimited Job Applications',
        'Featured Candidate Profile (Top in Search)',
        '10 Instant Job Alerts via Email/SMS',
        'Direct Recruiter Contact Access',
        'Resume Review Assistance',
        'Priority Customer Support',
      ]),
    },
  ];

  for (const pkg of candidatePackages) {
    await prisma.package.upsert({
      where: { slug: pkg.slug },
      update: pkg,
      create: pkg,
    });
  }

  // 3. Employer Packages
  const employerPackages = [
    {
      name: 'Employer Starter',
      slug: 'employer-starter',
      type: 'EMPLOYER',
      price: 0,
      durationDays: 30,
      sortOrder: 1,
      color: '#0A2540',
      description: 'Ideal for local small businesses hiring occasionally in Assam & Northeast',
      limits: JSON.stringify({
        jobPostings: 2,
        resumeSearches: 15,
        profileViews: 30,
        resumeDownloads: 10,
        contactCandidates: 10,
        featuredJobs: 0,
        jobDurationDays: 30,
        featuredCompany: false,
      }),
      features: JSON.stringify([
        '2 Active Job Postings',
        '30-Day Job Validity',
        '15 Resume Database Searches',
        '30 Candidate Profile Views',
        '10 Resume Downloads',
        'Standard Application Management Portal',
      ]),
    },
    {
      name: 'Recruiter Growth',
      slug: 'employer-growth',
      type: 'EMPLOYER',
      price: 1999,
      durationDays: 60,
      sortOrder: 2,
      isFeatured: true,
      color: '#F97316',
      description: 'Best for growing companies and consultancies with regular hiring needs',
      limits: JSON.stringify({
        jobPostings: 10,
        resumeSearches: 100,
        profileViews: 200,
        resumeDownloads: 50,
        contactCandidates: 50,
        featuredJobs: 3,
        jobDurationDays: 60,
        featuredCompany: true,
      }),
      features: JSON.stringify([
        '10 Active Job Postings',
        '3 Featured Job Listings on Homepage',
        '60-Day Job Validity',
        '100 Candidate Resume Searches',
        '200 Candidate Profile Views',
        '50 Resume Downloads',
        'Featured Company Badge',
        'Dedicated Account Manager',
      ]),
    },
    {
      name: 'Corporate Enterprise',
      slug: 'employer-enterprise',
      type: 'EMPLOYER',
      price: 4999,
      durationDays: 90,
      sortOrder: 3,
      color: '#10B981',
      description: 'High-volume recruitment solution with maximum search credits and priority branding',
      limits: JSON.stringify({
        jobPostings: 35,
        resumeSearches: 500,
        profileViews: 1000,
        resumeDownloads: 250,
        contactCandidates: 250,
        featuredJobs: 10,
        jobDurationDays: 90,
        featuredCompany: true,
      }),
      features: JSON.stringify([
        '35 Active Job Postings',
        '10 Featured Job Listings',
        '90-Day Extended Job Validity',
        '500 Candidate Resume Searches',
        '1000 Candidate Profile Views',
        '250 Direct Resume Downloads',
        'Prime Employer Spotlight Banner',
        'Custom Recruitment Analytics',
        '24/7 Priority Relationship Manager',
      ]),
    },
  ];

  for (const pkg of employerPackages) {
    await prisma.package.upsert({
      where: { slug: pkg.slug },
      update: pkg,
      create: pkg,
    });
  }

  // 4. Categories
  const categories = [
    { name: 'IT & Software Development', slug: 'it-software', icon: 'Code', description: 'Software engineers, web developers, QA, DevOps' },
    { name: 'Banking & Financial Services', slug: 'banking-finance', icon: 'Briefcase', description: 'Accountants, loan officers, branch managers, tellers' },
    { name: 'Healthcare & Hospital', slug: 'healthcare-hospital', icon: 'Activity', description: 'Doctors, nurses, lab technicians, pharmacists' },
    { name: 'Sales & Business Development', slug: 'sales-marketing', icon: 'TrendingUp', description: 'Sales executives, BDMs, field sales agents' },
    { name: 'Civil & Construction EPC', slug: 'civil-construction', icon: 'HardHat', description: 'Site supervisors, civil engineers, project managers' },
    { name: 'Education & Teaching', slug: 'education-teaching', icon: 'GraduationCap', description: 'School teachers, college professors, tutors' },
    { name: 'Office Administration & HR', slug: 'admin-hr', icon: 'Users', description: 'Receptionists, office assistants, HR executives' },
    { name: 'Retail & FMCG', slug: 'retail-fmcg', icon: 'ShoppingBag', description: 'Store managers, cashiers, merchandisers' },
    { name: 'Logistics & Supply Chain', slug: 'logistics-supply', icon: 'Truck', description: 'Warehouse managers, delivery executives, dispatchers' },
    { name: 'Hospitality & Tourism', slug: 'hospitality-tourism', icon: 'Coffee', description: 'Hotel staff, chefs, front office, tour guides' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }

  // 5. Locations (Focus on Guwahati, Assam, Northeast India)
  const locations = [
    { city: 'Guwahati', state: 'Assam', slug: 'guwahati-assam', isPopular: true },
    { city: 'Dibrugarh', state: 'Assam', slug: 'dibrugarh-assam', isPopular: true },
    { city: 'Silchar', state: 'Assam', slug: 'silchar-assam', isPopular: true },
    { city: 'Jorhat', state: 'Assam', slug: 'jorhat-assam', isPopular: true },
    { city: 'Tezpur', state: 'Assam', slug: 'tezpur-assam', isPopular: false },
    { city: 'Nagaon', state: 'Assam', slug: 'nagaon-assam', isPopular: false },
    { city: 'Shillong', state: 'Meghalaya', slug: 'shillong-meghalaya', isPopular: true },
    { city: 'Itanagar', state: 'Arunachal Pradesh', slug: 'itanagar-arunachal', isPopular: false },
    { city: 'Dimapur', state: 'Nagaland', slug: 'dimapur-nagaland', isPopular: true },
    { city: 'Agartala', state: 'Tripura', slug: 'agartala-tripura', isPopular: true },
    { city: 'Aizawl', state: 'Mizoram', slug: 'aizawl-mizoram', isPopular: false },
    { city: 'Kolkata', state: 'West Bengal', slug: 'kolkata-west-bengal', isPopular: true },
    { city: 'Delhi NCR', state: 'Delhi', slug: 'delhi-ncr', isPopular: true },
    { city: 'Bengaluru', state: 'Karnataka', slug: 'bengaluru-karnataka', isPopular: true },
  ];

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { slug: loc.slug },
      update: loc,
      create: loc,
    });
  }

  // 6. Skills
  const skills = [
    'React', 'Node.js', 'TypeScript', 'Python', 'Java', 'SQL', 'MongoDB',
    'Tally Prime', 'GST Filing', 'Bookkeeping', 'Financial Analysis',
    'B2B Sales', 'Lead Generation', 'Digital Marketing', 'SEO',
    'AutoCAD', 'Site Supervision', 'Civil Estimation', 'Quality Control',
    'Human Resources', 'Recruitment', 'Payroll Processing',
    'Nursing', 'Patient Care', 'Pharmacy Management',
    'Graphic Design', 'Figma', 'Content Writing',
  ];

  for (const skill of skills) {
    const slug = skill.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await prisma.skill.upsert({
      where: { slug },
      update: {},
      create: { name: skill, slug, isPopular: true },
    });
  }

  // 7. Companies
  const companies = [
    {
      name: 'Career Wings Placement Services',
      slug: 'career-wings-placement',
      website: 'https://careerwings.in',
      email: 'info@careerwings.in',
      phone: '+91-8876211864',
      description: 'Premier job placement and recruitment agency in Guwahati connecting verified job seekers with top employers across Northeast India.',
      industry: 'Human Resources & Staffing',
      companySize: '11-50',
      foundedYear: 2017,
      headquarters: 'Zoo Road Tiniali, Guwahati, Assam',
      isVerified: true,
      isFeatured: true,
    },
    {
      name: 'Pragjyotish Infotech',
      slug: 'pragjyotish-infotech',
      website: 'https://pragjyotish.tech',
      email: 'hr@pragjyotish.tech',
      description: 'Enterprise IT solutions and web technology provider based in Guwahati.',
      industry: 'IT & Software Development',
      companySize: '51-200',
      foundedYear: 2019,
      headquarters: 'GS Road, Guwahati, Assam',
      isVerified: true,
      isFeatured: true,
    },
    {
      name: 'Brahmaputra Infrastructure Ltd',
      slug: 'brahmaputra-infra',
      website: 'https://brahmaputrainfra.in',
      description: 'Leading EPC engineering and highways contractor across Northeast India.',
      industry: 'Civil & Construction EPC',
      companySize: '201-500',
      foundedYear: 2010,
      headquarters: 'Six Mile, Guwahati, Assam',
      isVerified: true,
      isFeatured: true,
    },
    {
      name: 'Kamakhya Health City',
      slug: 'kamakhya-health-city',
      website: 'https://kamakhyahealth.org',
      description: 'Multi-speciality tertiary care medical facility in Assam.',
      industry: 'Healthcare & Hospital',
      companySize: '501-1000',
      foundedYear: 2015,
      headquarters: 'Dispur, Guwahati, Assam',
      isVerified: true,
      isFeatured: false,
    },
  ];

  for (const comp of companies) {
    await prisma.company.upsert({
      where: { slug: comp.slug },
      update: comp,
      create: comp,
    });
  }

  // 8. Create Demo Employer & Candidate
  const empPassword = await bcrypt.hash('Employer@123', 12);
  const employerUser = await prisma.user.upsert({
    where: { email: 'recruiter@careerwings.in' },
    update: {},
    create: {
      email: 'recruiter@careerwings.in',
      passwordHash: empPassword,
      role: 'EMPLOYER',
      isActive: true,
      isVerified: true,
    },
  });

  const cwCompany = await prisma.company.findUnique({ where: { slug: 'career-wings-placement' } });
  const employer = await prisma.employer.upsert({
    where: { userId: employerUser.id },
    update: {},
    create: {
      userId: employerUser.id,
      companyId: cwCompany?.id,
      firstName: 'Farnaz',
      lastName: 'Ahmed',
      phone: '+918876211864',
      designation: 'Senior Talent Acquisition Lead',
      isVerified: true,
    },
  });

  // Assign growth package to employer
  const empPkg = await prisma.package.findUnique({ where: { slug: 'employer-growth' } });
  if (empPkg) {
    const end = new Date();
    end.setDate(end.getDate() + 60);
    await prisma.subscription.create({
      data: {
        userId: employerUser.id,
        packageId: empPkg.id,
        status: 'ACTIVE',
        endDate: end,
        limitsSnapshot: empPkg.limits,
        usageData: JSON.stringify({ jobPostings: 1, resumeSearches: 5 }),
      },
    });
  }

  // Demo Candidate
  const candPassword = await bcrypt.hash('Candidate@123', 12);
  const candidateUser = await prisma.user.upsert({
    where: { email: 'candidate@careerwings.in' },
    update: {},
    create: {
      email: 'candidate@careerwings.in',
      passwordHash: candPassword,
      role: 'CANDIDATE',
      isActive: true,
      isVerified: true,
    },
  });

  await prisma.candidate.upsert({
    where: { userId: candidateUser.id },
    update: {},
    create: {
      userId: candidateUser.id,
      firstName: 'Rahul',
      lastName: 'Barman',
      phone: '+919876543210',
      headline: 'Full Stack Web Developer | React & Node.js',
      summary: 'Passionate software developer with 2+ years of experience building modern web apps. Based in Guwahati, open to remote and local opportunities.',
      currentLocation: 'Guwahati, Assam',
      expectedSalaryMin: 35000,
      expectedSalaryMax: 50000,
      availabilityStatus: 'ACTIVELY_LOOKING',
      totalExperience: 2.5,
      profileCompletion: 85,
    },
  });

  // 9. Demo Jobs
  const itCat = await prisma.category.findUnique({ where: { slug: 'it-software' } });
  const civilCat = await prisma.category.findUnique({ where: { slug: 'civil-construction' } });
  const bankCat = await prisma.category.findUnique({ where: { slug: 'banking-finance' } });
  const ghyLoc = await prisma.location.findUnique({ where: { slug: 'guwahati-assam' } });

  const jobsData = [
    {
      title: 'Site Supervisor - Civil Construction',
      slug: 'site-supervisor-guwahati-civil',
      description: 'We are looking for an experienced Site Supervisor to oversee daily construction activities, coordinate sub-contractors, manage on-site material inventories, and ensure safety and quality standards across project sites in Guwahati and adjoining areas.',
      responsibilities: '• Supervise daily civil work and contractor teams.\n• Monitor quality of materials and execution as per blueprints.\n• Prepare daily progress reports for project managers.\n• Enforce strict workplace safety protocols.',
      requirements: '• Diploma or B.Tech in Civil Engineering.\n• Minimum 1-3 years on-site supervisory experience.\n• Good understanding of civil drawings and measurements.',
      categoryId: civilCat?.id,
      locationId: ghyLoc?.id,
      companyId: cwCompany?.id,
      employerId: employer.id,
      salaryMin: 22000,
      salaryMax: 32000,
      salaryPeriod: 'MONTHLY',
      workMode: 'ON_SITE',
      jobType: 'FULL_TIME',
      experienceMin: 1,
      experienceMax: 3,
      vacancies: 2,
      status: 'PUBLISHED',
      isFeatured: true,
      publishedAt: new Date(),
    },
    {
      title: 'Junior React Frontend Developer',
      slug: 'junior-react-developer-guwahati',
      description: 'Join our growing software team in Guwahati to build responsive web portals and SaaS interfaces. You will work closely with senior engineers and UI/UX designers.',
      responsibilities: '• Build interactive UI components using React, TypeScript, and Tailwind CSS.\n• Integrate RESTful APIs and handle client-side caching.\n• Optimize web apps for maximum speed and mobile responsiveness.',
      requirements: '• Proficiency with JavaScript (ES6+), React, and HTML/CSS.\n• Understanding of Git version control.\n• Familiarity with REST APIs and state management.',
      categoryId: itCat?.id,
      locationId: ghyLoc?.id,
      companyId: cwCompany?.id,
      employerId: employer.id,
      salaryMin: 25000,
      salaryMax: 40000,
      salaryPeriod: 'MONTHLY',
      workMode: 'HYBRID',
      jobType: 'FULL_TIME',
      experienceMin: 1,
      experienceMax: 2,
      vacancies: 3,
      status: 'PUBLISHED',
      isFeatured: true,
      publishedAt: new Date(),
    },
    {
      title: 'Senior Accountant & GST Compliance Executive',
      slug: 'senior-accountant-gst-guwahati',
      description: 'Reputed distribution and manufacturing firm in Guwahati requires a senior accountant with in-depth knowledge of Tally Prime, GST filing, and TDS returns.',
      responsibilities: '• Manage day-to-day accounts, ledgers, and cash flow reports.\n• Monthly GST filing (GSTR-1, GSTR-3B) and reconciliation.\n• Coordinate with external auditors and management for quarterly filings.',
      requirements: '• B.Com or M.Com degree.\n• 3+ years experience with Tally Prime and Indian taxation.\n• Solid communication skills and attention to detail.',
      categoryId: bankCat?.id,
      locationId: ghyLoc?.id,
      companyId: cwCompany?.id,
      employerId: employer.id,
      salaryMin: 28000,
      salaryMax: 42000,
      salaryPeriod: 'MONTHLY',
      workMode: 'ON_SITE',
      jobType: 'FULL_TIME',
      experienceMin: 3,
      experienceMax: 6,
      vacancies: 1,
      status: 'PUBLISHED',
      isFeatured: false,
      publishedAt: new Date(),
    },
  ];

  for (const job of jobsData) {
    await prisma.job.upsert({
      where: { slug: job.slug },
      update: job,
      create: job,
    });
  }

  // 10. Admin Settings / CMS
  const settings = [
    { key: 'SITE_NAME', value: 'Career Wings', group: 'BRANDING', label: 'Platform Name' },
    { key: 'TAGLINE', value: 'Jobs in Guwahati & Across Northeast India', group: 'BRANDING', label: 'Site Tagline' },
    { key: 'CONTACT_EMAIL', value: 'info@careerwings.in', group: 'CONTACT', label: 'Official Email' },
    { key: 'CONTACT_PHONE', value: '+91-8876211864', group: 'CONTACT', label: 'Helpline Phone' },
    { key: 'CONTACT_ADDRESS', value: 'Zoo Road Tiniali, Hriday Ranjan Path, By Lane 6, House No 5, Guwahati, Assam 781003', group: 'CONTACT', label: 'Office Address' },
    { key: 'AUTO_APPROVE_JOBS', value: 'false', group: 'MODERATION', label: 'Auto-approve new job postings' },
    { key: 'HERO_TITLE', value: 'Find Verified Jobs in Guwahati & Northeast India', group: 'HOMEPAGE', label: 'Hero Headline' },
    { key: 'HERO_SUBTITLE', value: 'Connect directly with top recruiters in IT, Healthcare, Banking, Construction & Office jobs with zero placement fees.', group: 'HOMEPAGE', label: 'Hero Subtitle' },
  ];

  for (const s of settings) {
    await prisma.adminSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  // 11. Sample Coupon
  await prisma.coupon.upsert({
    where: { code: 'WINGS20' },
    update: {},
    create: {
      code: 'WINGS20',
      description: '20% off on all Employer & Candidate booster packages',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      maxDiscount: 1000,
      minOrderAmount: 400,
      isActive: true,
      applicableTo: 'ALL',
    },
  });

  console.log('🎉 Career Wings seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
