"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveResumeDraft = exports.getResumeDraft = exports.auditATSScore = exports.suggestSkills = exports.enhanceExperience = exports.generateAISummary = void 0;
const response_1 = require("../lib/response");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../lib/prisma");
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const RESUME_DATA_DIR = path_1.default.join(process.cwd(), UPLOAD_DIR, 'resume_drafts');
// Ensure directory exists
if (!fs_1.default.existsSync(RESUME_DATA_DIR)) {
    fs_1.default.mkdirSync(RESUME_DATA_DIR, { recursive: true });
}
const ROLE_KNOWLEDGE_BASE = {
    software: {
        summaries: {
            impactful: 'Results-driven Software Engineer with proven expertise in building scalable, high-performance web applications and cloud architectures. Adept at full-stack development, database optimization, and implementing robust CI/CD pipelines to accelerate product delivery.',
            experienced: 'Seasoned Software Developer with extensive experience in architecting resilient microservices, writing clean testable code, and leading engineering teams. Passionate about solving complex system bottlenecks and driving architectural standards.',
            fresher: 'Enthusiastic and detail-oriented Software Engineering graduate with strong foundation in data structures, algorithms, and modern web frameworks. Eager to contribute to high-impact projects while rapidly mastering enterprise tech stacks.',
        },
        bulletPoints: [
            'Architected and deployed high-traffic RESTful and GraphQL APIs, reducing average latency by 35% across core microservices.',
            'Spearheaded the migration of legacy monolithic architecture to containerized microservices using Docker and Kubernetes, improving system scalability.',
            'Automated deployment workflows with CI/CD pipelines (GitHub Actions/GitLab), cutting deployment failure rates by 40%.',
            'Optimized SQL and NoSQL database queries, reducing response times for critical read-heavy endpoints by 45%.',
            'Collaborated closely with product managers and UX designers in Agile sprints to ship user-centric features on schedule.',
            'Mentored 4+ junior developers and led weekly code reviews to enforce code maintainability and test coverage standards.',
        ],
        techSkills: ['JavaScript / TypeScript', 'React / Next.js', 'Node.js / Express', 'Python', 'SQL & PostgreSQL', 'MongoDB', 'Docker & Kubernetes', 'AWS / Cloud', 'Git & CI/CD', 'REST & GraphQL'],
        softSkills: ['Problem Solving', 'Agile / Scrum', 'Team Leadership', 'Code Review', 'Cross-Functional Collaboration', 'Time Management'],
        certifications: ['AWS Certified Solutions Architect', 'Meta Front-End Developer', 'Oracle Certified Associate (Java)'],
    },
    sales: {
        summaries: {
            impactful: 'High-energy, target-driven Sales Specialist with a track record of consistently exceeding quarterly revenue quotas. Proven ability in client relationship management, consultative B2B selling, and opening new regional market territories.',
            experienced: 'Strategic Sales & Business Development Manager with deep expertise in enterprise sales cycles, lead pipeline growth, and closing multi-million rupee client accounts across Northeast India.',
            fresher: 'Dynamic and persuasive Business Development graduate with exceptional communication and negotiation skills. Eager to leverage relationship-building abilities to drive pipeline growth and client acquisition.',
        },
        bulletPoints: [
            'Surpassed annual sales quota by 130% for two consecutive quarters, generating over ₹45L in incremental revenue.',
            'Managed end-to-end B2B sales cycles from cold outreach and discovery meetings to contract negotiation and post-sales handoff.',
            'Expanded regional client footprint across Assam and Northeast India by establishing 25+ new corporate distributor partnerships.',
            'Conducted detailed market intelligence and competitor analysis to position products effectively and counter objections.',
            'Utilized CRM tools (Salesforce/HubSpot) to track leads, forecast sales velocity, and maintain a 90%+ accurate pipeline.',
            'Delivered engaging product demos and tailored pitches to C-level executives and key purchasing decision-makers.',
        ],
        techSkills: ['B2B Sales', 'CRM (Salesforce / HubSpot)', 'Lead Generation', 'Contract Negotiation', 'Pipeline Management', 'Cold Calling & Emailing', 'Market Research'],
        softSkills: ['Persuasive Communication', 'Relationship Building', 'Active Listening', 'Objection Handling', 'Resilience', 'Strategic Thinking'],
        certifications: ['Certified Inside Sales Professional (CISP)', 'HubSpot Inbound Sales Certification'],
    },
    finance: {
        summaries: {
            impactful: 'Detail-oriented Financial Analyst & Accountant with deep expertise in financial modeling, statutory compliance, budget forecasting, and tax planning. Dedicated to enhancing profitability and eliminating fiscal variances.',
            experienced: 'Accomplished Finance Professional with substantial experience managing comprehensive ledger audits, GST/TDS filings, payroll accounting, and executive financial reporting.',
            fresher: 'Motivated Commerce & Accounting graduate with strong theoretical acumen in financial accounting, auditing, and corporate taxation. Proficient in Tally Prime, Advanced Excel, and financial reconciliation.',
        },
        bulletPoints: [
            'Streamlined monthly accounts reconciliation process, cutting close-out cycles from 10 days to 4 business days.',
            'Supervised statutory compliance including GST, TDS, and Advance Tax returns, achieving zero compliance penalties.',
            'Formulated quarterly departmental budget forecasts and identified operational cost-saving avenues totaling ₹18L annually.',
            'Audited balance sheets, profit & loss statements, and cash flow reports in strict accordance with Indian Accounting Standards.',
            'Spearheaded computerized financial reporting using Tally Prime and ERP modules, drastically minimizing manual ledger errors.',
            'Prepared detailed variance analysis reports for senior leadership to support strategic investment evaluations.',
        ],
        techSkills: ['Tally Prime / ERP 9', 'Advanced Excel (VLOOKUP, Pivot, Macros)', 'GST & TDS Filings', 'Financial Modeling', 'Statutory Auditing', 'Budgeting & Forecasting'],
        softSkills: ['Analytical Rigor', 'Ethical Standards', 'Attention to Detail', 'Data Accuracy', 'Decision Making'],
        certifications: ['Chartered Accountant (Inter/Final)', 'Certified Management Accountant (CMA)', 'Diploma in Financial Accounting'],
    },
    marketing: {
        summaries: {
            impactful: 'Creative and data-informed Digital Marketing Specialist skilled in orchestrating high-ROI paid campaigns, SEO strategy, social media growth, and content marketing to drive inbound lead generation and brand awareness.',
            experienced: 'Senior Marketing Strategist with comprehensive experience overseeing cross-channel campaigns, performance marketing budgets, and brand positioning across competitive markets.',
            fresher: 'Ambitious Digital Marketing graduate passionate about social media trends, search engine optimization, and conversion-focused copywriting. Ready to amplify brand visibility through engaging campaigns.',
        },
        bulletPoints: [
            'Scaled monthly website organic traffic by 120% within 6 months through rigorous on-page, off-page, and technical SEO optimizations.',
            'Managed paid ad campaigns (Google Ads, Meta Ads) with a monthly spend of ₹2.5L, achieving a 3.8x Return on Ad Spend (ROAS).',
            'Developed and executed content marketing calendars, driving a 45% increase in inbound candidate and customer inquiries.',
            'Optimized email marketing sequences with automated drip campaigns, boosting open rates to 32% and click-through rates by 18%.',
            'Monitored user behavior analytics using Google Analytics 4 and Hotjar to identify drop-off funnels and lift conversion rates.',
        ],
        techSkills: ['Search Engine Optimization (SEO)', 'Google Ads & Meta Ads', 'Google Analytics 4', 'Content Strategy & Copywriting', 'Canva & Basic Design', 'Email Marketing (Mailchimp)'],
        softSkills: ['Creativity', 'Data Interpretation', 'Storytelling', 'Campaign Planning', 'Audience Empathy'],
        certifications: ['Google Ads Search Certification', 'Google Analytics Individual Qualification (GAIQ)', 'HubSpot Content Marketing'],
    },
    general: {
        summaries: {
            impactful: 'Diligent and versatile professional with a demonstrated track record of operational excellence, proactive problem-solving, and cross-functional team coordination. Committed to driving organizational goals through dedication and continuous improvement.',
            experienced: 'Established professional with broad hands-on experience managing daily operations, optimizing service delivery, and collaborating with cross-departmental stakeholders to fulfill critical deliverables.',
            fresher: 'Proactive and ambitious graduate with strong academic background, quick learning capability, and excellent interpersonal skills. Looking to contribute enthusiasm and analytical rigor to a progressive organization.',
        },
        bulletPoints: [
            'Coordinated daily operations and communications across departments, ensuring 100% adherence to project timelines and service quality.',
            'Implemented updated operational guidelines that enhanced departmental task completion speed by 20%.',
            'Handled client inquiries and correspondence professionally, maintaining high customer satisfaction ratings.',
            'Prepared detailed weekly progress reports and presentations for departmental heads and executive leadership.',
            'Proactively identified operational bottlenecks and proposed cost-effective solutions adopted company-wide.',
        ],
        techSkills: ['MS Office / Google Workspace', 'Data Entry & Management', 'Operational Reporting', 'Client Communication', 'Project Coordination'],
        softSkills: ['Adaptability', 'Time Management', 'Interpersonal Communication', 'Critical Thinking', 'Punctuality'],
        certifications: ['Project Management Fundamentals', 'Effective Business Communication'],
    },
};
function resolveSector(role) {
    const r = (role || '').toLowerCase();
    if (r.includes('dev') || r.includes('software') || r.includes('engineer') || r.includes('tech') || r.includes('programmer') || r.includes('it') || r.includes('web')) {
        return ROLE_KNOWLEDGE_BASE.software;
    }
    if (r.includes('sale') || r.includes('business dev') || r.includes('bde') || r.includes('account exec') || r.includes('telecall')) {
        return ROLE_KNOWLEDGE_BASE.sales;
    }
    if (r.includes('account') || r.includes('finance') || r.includes('tax') || r.includes('tally') || r.includes('audit') || r.includes('bank')) {
        return ROLE_KNOWLEDGE_BASE.finance;
    }
    if (r.includes('market') || r.includes('seo') || r.includes('content') || r.includes('social media') || r.includes('ad')) {
        return ROLE_KNOWLEDGE_BASE.marketing;
    }
    return ROLE_KNOWLEDGE_BASE.general;
}
// ─────────────────────────────────────────────────────────────────────────────
// 2. ENDPOINT: GENERATE AI PROFESSIONAL SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
const generateAISummary = async (req, res) => {
    try {
        const { targetRole, experienceYears, keySkills } = req.body;
        const role = targetRole || 'Professional';
        const skillsText = Array.isArray(keySkills) && keySkills.length ? keySkills.slice(0, 4).join(', ') : 'modern industry best practices';
        const expYears = Number(experienceYears) || 0;
        const expPhrase = expYears <= 1 ? 'Dynamic and motivated' : `Results-driven with ${expYears}+ years of hands-on experience`;
        const variations = [
            {
                id: 'var-1',
                title: 'Executive & Impact-Driven (High ATS Score)',
                tone: 'impactful',
                text: `${expPhrase} in ${role}. Proven track record of leveraging ${skillsText} to deliver measurable outcomes, accelerate project milestones, and elevate operational standards. Known for strong analytical aptitude and collaborative problem-solving.`,
            },
            {
                id: 'var-2',
                title: 'Technical & Achievement-Focused',
                tone: 'technical',
                text: `Dedicated ${role} specializing in ${skillsText}. Experienced in building robust solutions, streamlining workflows, and maintaining strict quality and compliance standards across cross-functional team environments.`,
            },
            {
                id: 'var-3',
                title: 'Growth & Leadership-Oriented',
                tone: 'leadership',
                text: `Forward-thinking ${role} adept at bridging strategic objectives with tactical execution. Skilled in ${skillsText}, driving stakeholder value, and continuously optimizing processes for sustainable productivity.`,
            },
        ];
        (0, response_1.sendSuccess)(res, { role, variations }, 'AI summaries generated successfully');
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message || 'Failed to generate summary', 500);
    }
};
exports.generateAISummary = generateAISummary;
// ─────────────────────────────────────────────────────────────────────────────
// 3. ENDPOINT: ENHANCE EXPERIENCE BULLET POINTS
// ─────────────────────────────────────────────────────────────────────────────
const enhanceExperience = async (req, res) => {
    try {
        const { jobTitle, company } = req.body;
        const role = jobTitle || 'Professional';
        const sector = resolveSector(role);
        const customizedBullets = sector.bulletPoints.map((bp) => {
            if (company && bp.includes('company')) {
                return bp.replace('company-wide', `across ${company}`);
            }
            return bp;
        });
        (0, response_1.sendSuccess)(res, {
            jobTitle: role,
            company: company || 'Previous Employer',
            suggestions: customizedBullets,
        }, 'Bullet points suggested successfully');
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message || 'Failed to enhance experience', 500);
    }
};
exports.enhanceExperience = enhanceExperience;
// ─────────────────────────────────────────────────────────────────────────────
// 4. ENDPOINT: SUGGEST SKILLS & CERTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
const suggestSkills = async (req, res) => {
    try {
        const { targetRole } = req.body;
        const role = targetRole || 'Professional';
        const sector = resolveSector(role);
        (0, response_1.sendSuccess)(res, {
            targetRole: role,
            technicalSkills: sector.techSkills,
            softSkills: sector.softSkills,
            recommendedCertifications: sector.certifications,
        }, 'Skills suggested successfully');
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message || 'Failed to suggest skills', 500);
    }
};
exports.suggestSkills = suggestSkills;
// ─────────────────────────────────────────────────────────────────────────────
// 5. ENDPOINT: REAL-TIME ATS AUDIT SCORE & RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────────────────────
const auditATSScore = async (req, res) => {
    try {
        const { resume } = req.body;
        if (!resume) {
            (0, response_1.sendError)(res, 'Resume payload is required for ATS audit', 400);
            return;
        }
        let score = 0;
        const strengths = [];
        const improvements = [];
        // 1. Personal & Contact Info (20 pts)
        const personal = resume.personalInfo || {};
        let contactScore = 0;
        if (personal.fullName)
            contactScore += 5;
        if (personal.email && personal.email.includes('@'))
            contactScore += 5;
        if (personal.phone && personal.phone.length >= 8)
            contactScore += 5;
        if (personal.location)
            contactScore += 5;
        score += contactScore;
        if (contactScore === 20) {
            strengths.push('Comprehensive contact details provided (Name, Phone, Email, Location).');
        }
        else {
            improvements.push('Ensure complete contact information (Phone number and City are critical for recruiters).');
        }
        // 2. Professional Summary (20 pts)
        const summary = (resume.summary || '').trim();
        const wordCount = summary ? summary.split(/\s+/).length : 0;
        if (wordCount >= 30 && wordCount <= 120) {
            score += 20;
            strengths.push(`Well-calibrated professional summary length (${wordCount} words).`);
        }
        else if (wordCount > 0) {
            score += 10;
            improvements.push(`Summary is currently ${wordCount} words. Ideal ATS length is between 40 and 100 words.`);
        }
        else {
            improvements.push('Add an impactful Professional Summary at the top to highlight key value proposition.');
        }
        // 3. Work Experience (25 pts)
        const experience = Array.isArray(resume.experience) ? resume.experience : [];
        if (experience.length > 0) {
            score += 15;
            const hasBulletPoints = experience.some((e) => e.description && e.description.length > 50);
            if (hasBulletPoints) {
                score += 10;
                strengths.push('Detailed work experience entries with descriptive responsibilities.');
            }
            else {
                improvements.push('Add action-driven bullet points with metrics to your work history.');
            }
        }
        else {
            improvements.push('Include at least one relevant work, internship, or academic project experience.');
        }
        // 4. Education History (15 pts)
        const education = Array.isArray(resume.education) ? resume.education : [];
        if (education.length > 0) {
            score += 15;
            strengths.push('Verified academic qualifications clearly cataloged.');
        }
        else {
            improvements.push('Specify your highest degree and university / college name.');
        }
        // 5. Skills Density (20 pts)
        const skills = Array.isArray(resume.skills) ? resume.skills : [];
        if (skills.length >= 6) {
            score += 20;
            strengths.push(`Strong skills portfolio (${skills.length} skills listed for keyword matching).`);
        }
        else if (skills.length > 0) {
            score += 10;
            improvements.push(`You have ${skills.length} skills listed. Aim for 6-10 targeted technical & soft skills for maximum ATS match.`);
        }
        else {
            improvements.push('Add relevant technical and soft skills to pass recruiter ATS keyword filters.');
        }
        // Grade classification
        let grade = 'C';
        if (score >= 90)
            grade = 'A+';
        else if (score >= 80)
            grade = 'A';
        else if (score >= 65)
            grade = 'B';
        else if (score >= 50)
            grade = 'C+';
        (0, response_1.sendSuccess)(res, {
            score: Math.min(100, Math.max(0, score)),
            grade,
            strengths,
            improvements,
        }, 'ATS audit completed successfully');
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message || 'Failed to calculate ATS score', 500);
    }
};
exports.auditATSScore = auditATSScore;
// ─────────────────────────────────────────────────────────────────────────────
// 6. ENDPOINT: GET & SAVE CANDIDATE RESUME DRAFT
// ─────────────────────────────────────────────────────────────────────────────
const getResumeDraft = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            (0, response_1.sendError)(res, 'User ID required', 403);
            return;
        }
        const candidate = await prisma_1.prisma.candidate.findUnique({
            where: { userId },
            include: {
                education: { orderBy: { startYear: 'desc' } },
                experience: { orderBy: { startDate: 'desc' } },
                candidateSkills: { include: { skill: true } },
                languages: true,
                certifications: true,
                user: { select: { email: true } },
            },
        });
        if (!candidate) {
            (0, response_1.sendError)(res, 'Candidate profile not found', 404);
            return;
        }
        const filePath = path_1.default.join(RESUME_DATA_DIR, `${candidate.id}.json`);
        if (!fs_1.default.existsSync(filePath)) {
            // Return candidate profile data formatted as initial draft
            const initialDraft = {
                personalInfo: {
                    fullName: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
                    email: candidate.user?.email || '',
                    phone: candidate.phone || '',
                    location: candidate.currentLocation || candidate.city || 'Guwahati, Assam',
                    targetRole: candidate.headline || candidate.currentRole || 'Software Professional',
                    linkedin: '',
                    portfolio: '',
                },
                summary: candidate.summary || '',
                experience: (candidate.experience || []).map((e) => ({
                    id: e.id,
                    title: e.title,
                    company: e.company,
                    location: e.location || '',
                    startDate: e.startDate ? String(e.startDate).slice(0, 7) : '',
                    endDate: e.isCurrent ? 'Present' : e.endDate ? String(e.endDate).slice(0, 7) : '',
                    isCurrent: Boolean(e.isCurrent),
                    description: e.description || '',
                })),
                education: (candidate.education || []).map((ed) => ({
                    id: ed.id,
                    degree: ed.degree,
                    institution: ed.institution,
                    fieldOfStudy: ed.fieldOfStudy || '',
                    startYear: ed.startYear ? String(ed.startYear) : '',
                    endYear: ed.endYear ? String(ed.endYear) : '',
                    grade: ed.grade || '',
                })),
                skills: (candidate.candidateSkills || []).map((s) => s.skill?.name || s.skill || ''),
                templateId: 'modern',
                themeColor: '#0f172a',
            };
            (0, response_1.sendSuccess)(res, initialDraft, 'Profile imported as initial resume draft');
            return;
        }
        const content = fs_1.default.readFileSync(filePath, 'utf8');
        const resume = JSON.parse(content);
        (0, response_1.sendSuccess)(res, resume, 'Resume draft retrieved');
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message || 'Failed to retrieve resume draft', 500);
    }
};
exports.getResumeDraft = getResumeDraft;
const saveResumeDraft = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            (0, response_1.sendError)(res, 'User ID required', 403);
            return;
        }
        const candidate = await prisma_1.prisma.candidate.findUnique({
            where: { userId },
        });
        if (!candidate) {
            (0, response_1.sendError)(res, 'Candidate profile not found', 404);
            return;
        }
        const { resume, syncProfile } = req.body;
        if (!resume) {
            (0, response_1.sendError)(res, 'Resume data required', 400);
            return;
        }
        const filePath = path_1.default.join(RESUME_DATA_DIR, `${candidate.id}.json`);
        fs_1.default.writeFileSync(filePath, JSON.stringify(resume, null, 2), 'utf8');
        // Optionally sync summary back to candidate profile in database
        if (syncProfile && resume.summary) {
            await prisma_1.prisma.candidate.update({
                where: { id: candidate.id },
                data: {
                    summary: resume.summary,
                    headline: resume.personalInfo?.targetRole || undefined,
                },
            });
        }
        (0, response_1.sendSuccess)(res, { updatedAt: new Date().toISOString() }, 'Resume draft saved successfully');
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message || 'Failed to save resume draft', 500);
    }
};
exports.saveResumeDraft = saveResumeDraft;
//# sourceMappingURL=aiResume.controller.js.map