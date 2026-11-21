/**
 * Career Wings - Intelligent AI Blog & Career Guide Generator
 * Produces highly structured, SEO-optimized career articles tailored for Northeast India & Assam jobseekers.
 * Incorporates Top 100 High-Ranking Keywords for Google SEO.
 */

import { generateAIImageUrl } from './blogAIImageGenerator'

export interface GeneratedArticle {
  title: string
  slug: string
  category: string
  excerpt: string
  coverImage: string
  authorName: string
  authorRole: string
  readTimeMin: number
  tags: string
  content: string
}

export interface AIOptions {
  topic: string
  category?: string
  audience?: 'Freshers' | 'Experienced' | 'Career Switchers' | 'All Jobseekers'
  tone?: 'Professional' | 'Practical Guide' | 'Inspiring'
}

/**
 * Top 100 High-Ranking Target Keywords for Assam & Guwahati SEO
 */
export const TOP_SEO_KEYWORDS_ASSAM = [
  // Core Search & Portal
  'Jobs in Assam', 'Jobs in Guwahati', 'Assam Job Portal', 'Private Jobs in Assam', 'Private Jobs in Guwahati',
  'Latest Jobs in Assam', 'Latest Jobs in Guwahati', 'Job Vacancy in Assam', 'Job Vacancy in Guwahati',
  'Online Job Portal Assam', 'Assam Private Job Portal', 'Guwahati Job Portal', 'Career Wings Jobs',
  'Career Wings Assam', 'Jobs Near Me Guwahati', 'Urgent Jobs in Assam', 'Latest Private Job Vacancy Assam',
  'Apply Online Jobs Assam', 'Recruitment in Assam', 'Employment Opportunities in Assam',

  // Consultancy & Placement
  'Job Consultancy in Guwahati', 'Best Job Consultancy in Guwahati', 'Placement Consultancy in Guwahati',
  'Recruitment Agency in Guwahati', 'Best Placement Agency in Assam', 'Job Placement in Guwahati',
  'Private Job Consultancy Assam', 'HR Consultancy in Guwahati', 'Recruitment Services Assam',
  'Manpower Consultancy Guwahati', 'Staffing Agency in Assam', 'Job Placement Agency Assam',
  'Employment Agency Guwahati', 'Fresher Job Consultancy Guwahati', 'Career Guidance in Guwahati',

  // Freshers & Qualifications
  'Fresher Jobs in Guwahati', 'Fresher Jobs in Assam', 'Graduate Jobs in Assam', '12th Pass Jobs in Guwahati',
  'HS Pass Jobs in Assam', '10th Pass Jobs in Assam', 'Jobs for Freshers in Guwahati', 'Female Jobs in Guwahati',
  'Male Jobs in Guwahati', 'Part Time Jobs in Guwahati', 'Full Time Jobs in Assam', 'Work From Home Jobs Assam',
  'No Experience Jobs in Assam', 'Immediate Joining Jobs Guwahati', 'Entry Level Jobs in Assam',

  // Roles & Departments
  'BPO Jobs in Guwahati', 'Customer Support Jobs Assam', 'Telecaller Jobs in Guwahati', 'Data Entry Jobs in Assam',
  'Back Office Jobs Guwahati', 'Office Assistant Jobs Assam', 'HR Jobs in Guwahati', 'Accountant Jobs in Assam',
  'Sales Executive Jobs Guwahati', 'Receptionist Jobs in Guwahati', 'Banking Jobs in Assam',
  'Private Company Jobs Guwahati', 'Computer Operator Jobs Assam', 'Marketing Jobs in Guwahati',
  'Business Development Jobs Assam', 'E Commerce Jobs in Guwahati', 'Admin Jobs in Assam',
  'Field Executive Jobs Guwahati', 'Customer Care Jobs in Assam', 'Work From Office Jobs Guwahati',

  // Guwahati Key Locations & Major Cities
  'Jobs in Dispur', 'Jobs in Six Mile Guwahati', 'Jobs in Zoo Road Guwahati', 'Jobs in Beltola',
  'Jobs in GS Road Guwahati', 'Jobs in Maligaon', 'Jobs in Paltan Bazar', 'Jobs in Chandmari',
  'Jobs in Panjabari', 'Jobs in Christian Basti', 'Jobs in Bhangagarh', 'Jobs in Lokhra',
  'Jobs in Jorhat', 'Jobs in Dibrugarh', 'Jobs in Silchar',

  // Long-Tail & High Intent
  'Latest Private Company Vacancy in Guwahati', 'How to Find Private Jobs in Assam', 'Apply for Jobs Online in Guwahati',
  'Best Website for Jobs in Assam', 'Assam Job Vacancy for Freshers', 'Private Jobs for Graduates in Guwahati',
  'Urgent Hiring in Guwahati', 'Direct Company Jobs in Assam', 'Job Openings in Guwahati Today',
  'Walk in Interview Jobs in Guwahati', 'Daily Job Updates Assam', 'Latest BPO Vacancy in Guwahati',
  'Jobs for HS Passed Candidates in Assam', 'Top Recruitment Agency in Guwahati', 'Career Opportunities in Assam'
]

export const AI_TOPIC_PRESETS = [
  {
    topic: 'How to Find Private Jobs in Assam & Guwahati: Complete Guide for Freshers & Graduates',
    category: 'Career Advice',
    audience: 'All Jobseekers' as const,
  },
  {
    topic: 'Top In-Demand IT & Software Careers in Guwahati for 2026',
    category: 'Industry Insights',
    audience: 'All Jobseekers' as const,
  },
  {
    topic: 'Fresher & 12th Pass Jobs in Guwahati: Immediate Joining Opportunities in 2026',
    category: 'Career Advice',
    audience: 'Freshers' as const,
  },
  {
    topic: 'How Freshers in Assam Can Clear Walk-in Interviews with Confidence',
    category: 'Interview Tips',
    audience: 'Freshers' as const,
  },
  {
    topic: 'Location-Wise Job Guide: Finding Jobs in GS Road, Beltola, Dispur & Zoo Road Guwahati',
    category: 'Industry Insights',
    audience: 'All Jobseekers' as const,
  },
  {
    topic: 'Banking, Accountant & BPO Jobs in Assam: Eligibility, Salary and Hiring Process',
    category: 'Career Advice',
    audience: 'Career Switchers' as const,
  },
  {
    topic: 'Resume Writing Checklist: Getting Shortlisted by Top Employers in Northeast India',
    category: 'Resume Tips',
    audience: 'All Jobseekers' as const,
  },
  {
    topic: 'Top High-Paying Remote & Work-from-Home Jobs for Northeast Talent',
    category: 'Career Advice',
    audience: 'All Jobseekers' as const,
  },
]

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Intelligent AI Generation Logic incorporating Top 100 Ranking Keywords
 */
export function generateArticleWithAI(options: AIOptions): GeneratedArticle {
  const topic = options.topic.trim()
  const audience = options.audience || 'All Jobseekers'
  const lower = topic.toLowerCase()

  // 1. Comprehensive Master Private Jobs Guide (Targets all high-volume core keywords)
  if (lower.includes('private job') || lower.includes('find') || lower.includes('how to') || lower.includes('guide')) {
    const title = options.topic || 'How to Find Private Jobs in Assam & Guwahati: Complete 2026 Guide'
    const slug = generateSlug(title)
    return {
      title,
      slug,
      category: 'Career Advice',
      excerpt:
        'Looking for the latest private jobs in Assam or Guwahati? Discover top vacancies, direct company hiring, walk-in interview tips, and how Career Wings connects jobseekers to verified employers.',
      coverImage: generateAIImageUrl({ topic: title, category: 'Career Advice' }).url,
      authorName: 'Career Wings Editorial Team',
      authorRole: 'Senior Recruitment Strategist',
      readTimeMin: 7,
      tags: 'Jobs in Assam, Jobs in Guwahati, Assam Job Portal, Private Jobs in Assam, Latest Jobs in Guwahati, Job Vacancy in Assam, Fresher Jobs in Guwahati, Walk in Interview Jobs in Guwahati, Career Wings Assam',
      content: `<h2>Finding the Latest Private Jobs in Assam & Guwahati</h2>
<p>The job market in Northeast India is expanding rapidly. Whether you are searching for <strong>Jobs in Assam</strong>, urgent vacancies for <strong>Jobs in Guwahati</strong>, or exploring entry-level roles, knowing how to navigate the regional employment ecosystem is the key to landing an interview quickly.</p>
<p>Today, Career Wings stands out as the <strong>Best Website for Jobs in Assam</strong> and a dedicated <strong>Assam Private Job Portal</strong>, connecting thousands of talented professionals directly with verified recruiters.</p>

<h2>Top In-Demand Private Job Roles in Guwahati</h2>
<p>Local businesses, regional corporate offices, and national brands operating in Guwahati actively recruit for diverse job profiles. Here are the most popular sectors hiring right now:</p>

<h3>1. BPO & Customer Care Jobs in Assam</h3>
<p>Guwahati is home to booming contact centers and corporate customer desks. Leading firms regularly post <strong>BPO Jobs in Guwahati</strong>, <strong>Telecaller Jobs in Guwahati</strong>, and <strong>Customer Support Jobs Assam</strong> with fast onboarding and competitive incentives.</p>

<h3>2. Back Office, Data Entry & Office Assistant Roles</h3>
<p>For jobseekers seeking stable day-shift positions, openings for <strong>Data Entry Jobs in Assam</strong>, <strong>Back Office Jobs Guwahati</strong>, and <strong>Office Assistant Jobs Assam</strong> offer an ideal starting point. Basic proficiency in computer operations and Microsoft Office is usually all that is required.</p>

<h3>3. Sales, Marketing & Business Development</h3>
<p>From retail outlets on GS Road to pharmaceutical distribution networks across Assam, employers frequently recruit for <strong>Sales Executive Jobs Guwahati</strong>, <strong>Marketing Jobs in Guwahati</strong>, and <strong>Field Executive Jobs Guwahati</strong>.</p>

<h3>4. Accounting & Banking Jobs in Assam</h3>
<p>Finance professionals with Tally and GST knowledge can easily find lucrative <strong>Accountant Jobs in Assam</strong> and regional private <strong>Banking Jobs in Assam</strong> across Guwahati, Jorhat, Dibrugarh, and Silchar.</p>

<blockquote>
  "Finding reliable employment no longer requires paying heavy agency fees. Using a verified online portal like Career Wings gives you direct access to genuine company vacancies with zero consultancy commission."
</blockquote>

<h2>Top Locations for Jobs in Guwahati</h2>
<p>Guwahati's commercial activity is concentrated across several high-growth hubs. Jobseekers looking for <strong>Jobs Near Me Guwahati</strong> should target these key areas:</p>
<ul>
  <li><strong>GS Road & Christian Basti:</strong> The prime commercial hub for corporate offices, banks, retail showrooms, and marketing agencies.</li>
  <li><strong>Zoo Road & Six Mile:</strong> Healthcare clinics, educational institutions, retail centers, and customer service desks.</li>
  <li><strong>Beltola & Dispur:</strong> Government liaison offices, administrative firms, logistics desks, and distribution centers.</li>
  <li><strong>Paltan Bazar & Maligaon:</strong> Transport, hospitality, logistics, retail, and regional branch operations.</li>
  <li><strong>Lokhra & Chandmari:</strong> Warehousing, FMCG distribution, media houses, and regional trade hubs.</li>
</ul>

<h2>Jobs for Freshers, 12th Pass & Graduates in Assam</h2>
<p>If you have recently completed your studies, numerous doors are open. Career Wings features dedicated sections for:</p>
<ul>
  <li><strong>10th Pass Jobs in Assam & 12th Pass Jobs in Guwahati:</strong> Immediate joining roles in retail assistance, security, delivery, and basic data entry.</li>
  <li><strong>Fresher Jobs in Guwahati & HS Pass Jobs in Assam:</strong> Telecalling, customer support, document verification, and junior sales.</li>
  <li><strong>Graduate Jobs in Assam:</strong> Management trainees, HR recruiters, operations associates, and junior accountants.</li>
  <li><strong>Female Jobs in Guwahati & Work From Home Jobs Assam:</strong> Flexible remote and hybrid arrangements for content creation, online tutoring, and tele-sales.</li>
</ul>

<h2>How to Apply for Jobs Online in Guwahati on Career Wings</h2>
<ol>
  <li><strong>Create Your Free Profile:</strong> Sign up on the <strong>Career Wings Assam</strong> portal with your updated mobile number and email.</li>
  <li><strong>Upload Your Resume:</strong> Ensure your CV highlights your skills, educational qualifications, and location preference.</li>
  <li><strong>Set Job Alerts:</strong> Get instant notifications for <strong>Walk in Interview Jobs in Guwahati</strong> and daily job updates.</li>
  <li><strong>Apply Directly:</strong> Send your application with one click to verified employers without paying any middlemen.</li>
</ol>

<h2>Conclusion</h2>
<p>With thousands of active employment opportunities spanning every major sector, securing your ideal role in Assam is easier than ever. Register on <strong>Career Wings</strong> today and take the first decisive step towards your dream career!</p>`,
    }
  }

  // 2. Fresher & Entry-Level Jobs in Guwahati / Assam
  if (lower.includes('fresher') || lower.includes('12th') || lower.includes('entry') || lower.includes('graduate')) {
    const title = options.topic || 'Fresher & 12th Pass Jobs in Guwahati: Immediate Joining Vacancies 2026'
    const slug = generateSlug(title)
    return {
      title,
      slug,
      category: 'Career Advice',
      excerpt:
        'A comprehensive guide for freshers, 12th pass, and graduate jobseekers in Guwahati and Assam to land entry-level jobs with immediate joining and fair salaries.',
      coverImage: generateAIImageUrl({ topic: title, category: 'Career Advice', style: 'freshers_students' }).url,
      authorName: 'Vikram Baruah',
      authorRole: 'Career Wings Recruitment Advisor',
      readTimeMin: 5,
      tags: 'Fresher Jobs in Guwahati, 12th Pass Jobs in Guwahati, HS Pass Jobs in Assam, Graduate Jobs in Assam, Immediate Joining Jobs Guwahati, No Experience Jobs in Assam, Jobs for Freshers in Guwahati',
      content: `<h2>Top Opportunities for Freshers & 12th Pass Candidates in Assam</h2>
<p>Starting your professional journey can feel challenging, but Guwahati and Assam currently have an abundance of entry-level openings. Employers are actively searching for young, energetic talent for <strong>Fresher Jobs in Guwahati</strong>, <strong>12th Pass Jobs in Guwahati</strong>, and <strong>HS Pass Jobs in Assam</strong> across various service sectors.</p>

<h2>Top Roles Requiring No Prior Experience</h2>
<ul>
  <li><strong>Telecaller & Customer Support:</strong> High demand for bilingual speakers (Assamese, Hindi, English). Excellent launchpad with <strong>Immediate Joining Jobs Guwahati</strong>.</li>
  <li><strong>Data Entry & Computer Operator:</strong> If you have basic typing skills and knowledge of MS Word and Excel, openings for <strong>Data Entry Jobs in Assam</strong> offer stable work hours.</li>
  <li><strong>Retail & Showroom Executives:</strong> Prominent brands along GS Road and Zoo Road hire 12th-pass and graduate candidates for front-desk and customer assistance roles.</li>
  <li><strong>Office Assistant & Receptionist:</strong> Private companies across Dispur, Beltola, and Panjabari regularly recruit for <strong>Office Assistant Jobs Assam</strong> and <strong>Receptionist Jobs in Guwahati</strong>.</li>
</ul>

<blockquote>
  "Most entry-level employers prioritize enthusiasm, clear communication, and punctuality over years of resume experience. Present yourself with confidence and a clean CV."
</blockquote>

<h2>Step-by-Step Checklist to Get Hired Fast</h2>
<ol>
  <li>Keep 3 printed copies of your CV ready for walk-in interviews.</li>
  <li>Highlight your language proficiencies (Assamese, Bengali, Hindi, English).</li>
  <li>Filter vacancies on Career Wings by <strong>No Experience Jobs in Assam</strong>.</li>
  <li>Prepare your 60-second self-introduction highlighting your willingness to learn.</li>
</ol>`,
    }
  }

  // 3. Location-Wise Jobs in Guwahati Hotspots
  if (lower.includes('location') || lower.includes('gs road') || lower.includes('beltola') || lower.includes('dispur') || lower.includes('zoo road')) {
    const title = options.topic || 'Location-Wise Job Guide: Finding Jobs in GS Road, Beltola, Dispur & Zoo Road Guwahati'
    const slug = generateSlug(title)
    return {
      title,
      slug,
      category: 'Industry Insights',
      excerpt:
        'Explore commercial hotspots and top employment areas across Guwahati, from GS Road and Dispur to Beltola, Paltan Bazar, and Six Mile.',
      coverImage: generateAIImageUrl({ topic: title, category: 'Industry Insights', style: 'guwahati_business' }).url,
      authorName: 'Career Wings Editorial Team',
      authorRole: 'Regional Market Analyst',
      readTimeMin: 6,
      tags: 'Jobs in GS Road Guwahati, Jobs in Beltola, Jobs in Dispur, Jobs in Six Mile Guwahati, Jobs in Zoo Road Guwahati, Jobs in Paltan Bazar, Jobs in Maligaon, Jobs Near Me Guwahati',
      content: `<h2>Navigating Guwahati's Top Commercial Employment Hubs</h2>
<p>Guwahati's distinct neighborhoods serve as centers for different industries. Understanding which locality hosts your target sector makes your job search significantly faster when filtering for <strong>Jobs Near Me Guwahati</strong>.</p>

<h2>Key Locality Breakdown</h2>
<h3>1. Jobs in GS Road Guwahati & Christian Basti</h3>
<p>The corporate spine of Assam. Home to regional head offices, banking branches, automobile dealerships, and major retail malls. High hiring volume for <strong>Admin Jobs in Assam</strong>, sales consultants, and corporate executives.</p>

<h3>2. Jobs in Dispur & Beltola</h3>
<p>Surrounding the state secretariat, Dispur and Beltola feature numerous legal agencies, liaison consultancies, private schools, and logistics branch offices.</p>

<h3>3. Jobs in Zoo Road & Six Mile Guwahati</h3>
<p>Known for hospitals, diagnostic chains, coaching institutes, and customer service hubs. Frequent openings for <strong>Customer Care Jobs in Assam</strong> and healthcare support.</p>

<h3>4. Jobs in Paltan Bazar & Maligaon</h3>
<p>Transportation and transit centers with steady recruitment for railway support contractors, hotel staff, travel agencies, and inventory desks.</p>`,
    }
  }

  // 4. Default Intelligent Generator incorporating Top Keywords
  const title = topic || 'Latest Private Job Openings & Employment Opportunities in Assam'
  const slug = generateSlug(title)
  return {
    title,
    slug,
    category: options.category || 'Career Advice',
    excerpt: `Discover the latest private jobs in Assam and Guwahati for ${topic.toLowerCase()}. Learn about walk-in interviews, direct company vacancies, and career opportunities on Career Wings.`,
    coverImage: generateAIImageUrl({ topic: title, category: options.category || 'Career Advice' }).url,
    authorName: 'Career Wings Editorial Team',
    authorRole: 'Senior Career Advisor',
    readTimeMin: 5,
    tags: `${topic.split(' ').slice(0, 3).join(', ')}, Jobs in Assam, Jobs in Guwahati, Assam Job Portal, Private Jobs in Assam, Latest Jobs in Assam, Career Wings`,
    content: `<h2>Overview: ${topic}</h2>
<p>In 2026, finding the right <strong>${topic}</strong> has become more accessible with the rise of modern online hiring platforms. Whether you are looking for <strong>Jobs in Assam</strong>, exploring high-paying <strong>Jobs in Guwahati</strong>, or seeking direct company recruitment, having a targeted search strategy is essential.</p>

<h2>Why Assam's Job Market Is Growing</h2>
<p>With Guwahati developing as the gateway to Southeast Asia, multinational corporations and domestic enterprises are expanding their footprint across Kamrup Metropolitan, Dibrugarh, Jorhat, and Silchar. This rapid expansion has fueled demand for candidates across every educational qualification, from <strong>12th Pass Jobs in Guwahati</strong> to specialized <strong>Graduate Jobs in Assam</strong>.</p>

<h3>Essential Tips for ${audience}</h3>
<ul>
  <li><strong>Direct Application:</strong> Use the <strong>Career Wings Assam</strong> portal to apply directly to verified company openings without middlemen or registration fees.</li>
  <li><strong>Keep Resume Updated:</strong> Clearly list your key skills, language fluencies, and location preferences (such as <strong>Jobs in GS Road Guwahati</strong> or <strong>Jobs in Beltola</strong>).</li>
  <li><strong>Follow Daily Job Updates:</strong> Stay ahead of competition by checking <strong>Daily Job Updates Assam</strong> and attending scheduled <strong>Walk in Interview Jobs in Guwahati</strong>.</li>
</ul>

<blockquote>
  "Employers in Assam value punctuality, proactive communication, and candidates who take initiative. Presenting a professional profile makes you stand out immediately."
</blockquote>

<h2>Next Steps</h2>
<p>Explore thousands of verified vacancies on <strong>Career Wings</strong> today, set up your instant job alerts, and secure the role you deserve!</p>`,
  }
}
