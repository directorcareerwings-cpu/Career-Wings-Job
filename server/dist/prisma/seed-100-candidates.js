"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
// Realistic datasets to generate 100 unique, rich candidate profiles
const FIRST_NAMES_MALE = [
    'Rahul', 'Bikash', 'Manash', 'Rohit', 'Abhinash', 'Parthiv', 'Gaurav', 'Debajit', 'Nilutpal',
    'Arindam', 'Hrishikesh', 'Rituraj', 'Pranjal', 'Nabajyoti', 'Bishal', 'Kalyan', 'Deepjyoti',
    'Kaushik', 'Jayanta', 'Surajit', 'Subham', 'Anupam', 'Bhaskar', 'Chandan', 'Diganta',
    'Hemanta', 'Jitu', 'Kishore', 'Madhurjya', 'Nayan', 'Pranab', 'Rupjyoti', 'Sanjib',
    'Tarun', 'Utpal', 'Vivek', 'Dipankar', 'Amit', 'Siddharth', 'Rohan', 'Vikas', 'Pankaj',
    'Rajesh', 'Suresh', 'Manish', 'Alok', 'Deepak', 'Sanjay', 'Arun', 'Karan'
];
const FIRST_NAMES_FEMALE = [
    'Priya', 'Jumoni', 'Rima', 'Ankita', 'Dimpi', 'Ananya', 'Sneha', 'Puja', 'Pallabi',
    'Sunita', 'Trishna', 'Moushumi', 'Bornali', 'Bandana', 'Gitashree', 'Rashmi', 'Swagata',
    'Tanvi', 'Sangeeta', 'Priyanka', 'Kakali', 'Moonmoon', 'Nibedita', 'Pompi', 'Runjun',
    'Ruprekha', 'Simi', 'Twinkle', 'Urmila', 'Barsha', 'Dipika', 'Gayatri', 'Himashree',
    'Jonali', 'Kasturi', 'Lipi', 'Madhusmita', 'Nandita', 'Parismita', 'Ritu', 'Shikha',
    'Tulika', 'Upasana', 'Varsha', 'Anindita', 'Devika', 'Ipsita', 'Kavita', 'Neelam', 'Pooja'
];
const LAST_NAMES = [
    'Barman', 'Kashyap', 'Sharma', 'Kalita', 'Bordoloi', 'Gogoi', 'Deka', 'Saikia', 'Roy',
    'Das', 'Goswami', 'Dutta', 'Hazarika', 'Bora', 'Devi', 'Baruah', 'Chetri', 'Nath',
    'Lahkar', 'Medhi', 'Sarma', 'Phukan', 'Konwar', 'Bhuyan', 'Paul', 'Rekha', 'Sen',
    'Bhattacharya', 'Agarwal', 'Rajbongshi', 'Choudhury', 'Mazumdar', 'Talukdar', 'Kakati',
    'Pathak', 'Baishya', 'Barman', 'Sarkar', 'Dey', 'Ghosh', 'Bhowmick', 'Mukherjee',
    'Banerjee', 'Chakraborty', 'Debnath', 'Basumatary', 'Boro', 'Swargiary', 'Brahma', 'Rabha'
];
const ROLE_PROFILES = [
    {
        title: 'Full Stack Web Developer',
        headlineSuffix: 'React.js, Node.js, TypeScript & Cloud Solutions',
        skills: ['React.js', 'Node.js', 'TypeScript', 'Tailwind CSS', 'PostgreSQL', 'REST API', 'Git'],
        educationLevels: [
            { level: 'B.Tech / Bachelor Degree', degree: 'B.Tech in Computer Science', field: 'Computer Science' },
            { level: 'Bachelor of Computer Applications', degree: 'BCA', field: 'Information Technology' },
            { level: 'Master of Computer Applications', degree: 'MCA', field: 'Computer Applications' }
        ],
        expRange: [1, 5],
        summaryTemplate: 'Passionate Full Stack Web Developer experienced in building fast, scalable web apps with React and Node.js. Adept at responsive UI design and RESTful architecture.',
        salaryRange: [30000, 70000]
    },
    {
        title: 'Customer Support Executive & Telecaller',
        headlineSuffix: 'Inbound & Outbound Calling, CRM & Client Retention',
        skills: ['Telecalling', 'Customer Support', 'CRM Data Entry', 'Assamese & English Fluency', 'Client Communication'],
        educationLevels: [
            { level: '12th / Higher Secondary', degree: '12th Higher Secondary', field: 'Arts / Commerce' },
            { level: 'Graduate / Bachelor Degree', degree: 'B.A General', field: 'Humanities' },
            { level: 'Graduate / Diploma', degree: 'Diploma in Office Management', field: 'Commercial Practice' }
        ],
        expRange: [0.5, 3],
        summaryTemplate: 'Energetic customer support professional with exceptional communication skills in English, Assamese, and Hindi. Proven record of high call satisfaction and prompt resolution.',
        salaryRange: [15000, 26000]
    },
    {
        title: 'Senior Accountant & GST Specialist',
        headlineSuffix: 'Tally Prime, GST Compliance, TDS & Balance Sheet Finalization',
        skills: ['Tally Prime', 'GST Filing', 'TDS Returns', 'MS Excel', 'Bank Reconciliation', 'Auditing'],
        educationLevels: [
            { level: 'Graduate / Bachelor Degree', degree: 'B.Com Accountancy Honours', field: 'Commerce' },
            { level: 'Master Degree', degree: 'M.Com Finance', field: 'Accounting & Finance' }
        ],
        expRange: [2, 8],
        summaryTemplate: 'Detail-oriented accountant with in-depth knowledge of Tally Prime, GSTR-1, GSTR-3B, and TDS returns. Experienced in corporate accounting across trading and logistics firms.',
        salaryRange: [25000, 50000]
    },
    {
        title: 'Civil Site Supervisor & Field Engineer',
        headlineSuffix: 'Quality Inspection, Blueprint Execution & Contractor Supervision',
        skills: ['Site Supervision', 'AutoCAD', 'Material Estimation', 'Quality Control', 'Labour Management'],
        educationLevels: [
            { level: 'Diploma / Polytechnic', degree: 'Diploma in Civil Engineering', field: 'Civil Engineering' },
            { level: 'B.Tech / Bachelor Degree', degree: 'B.Tech in Civil Engineering', field: 'Civil & Infrastructure' }
        ],
        expRange: [1, 6],
        summaryTemplate: 'Site Supervisor with hands-on experience in residential and commercial structural construction. Dedicated to site safety standards, accurate surveying, and on-time execution.',
        salaryRange: [22000, 45000]
    },
    {
        title: 'Digital Marketing & Social Media Executive',
        headlineSuffix: 'SEO, Google Ads, Meta Campaigns & Lead Generation',
        skills: ['SEO', 'Meta Ads', 'Google Ads', 'Content Strategy', 'Canva', 'Analytics', 'Email Marketing'],
        educationLevels: [
            { level: 'Graduate / Bachelor Degree', degree: 'BBA Marketing', field: 'Business Administration' },
            { level: 'Graduate / Bachelor Degree', degree: 'B.A Mass Communication', field: 'Media & Journalism' }
        ],
        expRange: [1, 4],
        summaryTemplate: 'Creative digital marketer specializing in search engine optimization and high-converting paid social campaigns. Proven ability to scale online brand presence and generate leads.',
        salaryRange: [20000, 42000]
    },
    {
        title: 'HR Executive & Talent Acquisition',
        headlineSuffix: 'Recruitment, Onboarding, Payroll & Employee Engagement',
        skills: ['Talent Sourcing', 'Interview Scheduling', 'HR Policies', 'Payroll Processing', 'Employee Relations'],
        educationLevels: [
            { level: 'Master / MBA', degree: 'MBA in Human Resources', field: 'HR Management' },
            { level: 'Graduate / Bachelor Degree', degree: 'BBA', field: 'Management Studies' }
        ],
        expRange: [1, 5],
        summaryTemplate: 'Dynamic HR professional skilled in full life-cycle recruiting, candidate screening, campus drives, and labor statutory compliances across Northeast enterprises.',
        salaryRange: [24000, 45000]
    },
    {
        title: 'Data Entry Operator & Back Office Assistant',
        headlineSuffix: 'Fast Typing, MS Excel, MIS Reporting & Record Keeping',
        skills: ['Data Entry', 'Advanced Excel', 'MIS Reporting', 'Fast Typing 45+ WPM', 'Documentation'],
        educationLevels: [
            { level: '12th / Higher Secondary', degree: '12th Higher Secondary', field: 'Commerce' },
            { level: 'Graduate / Bachelor Degree', degree: 'B.Sc / B.A', field: 'General' }
        ],
        expRange: [0.5, 3],
        summaryTemplate: 'Accurate and meticulous data entry specialist with 45+ WPM typing speed and expertise in MS Excel formulas, VLOOKUP, pivot tables, and CRM record entry.',
        salaryRange: [14000, 24000]
    },
    {
        title: 'Hotel Front Office & Guest Relations Executive',
        headlineSuffix: 'Guest Check-in, Reservation Systems & Hospitality Management',
        skills: ['Front Office Operations', 'Guest Relations', 'PMS Software', 'Customer Service', 'Billing & Concierge'],
        educationLevels: [
            { level: 'Bachelor Degree', degree: 'BHM (Hotel Management)', field: 'Hospitality Management' },
            { level: 'Diploma', degree: 'Diploma in Food & Beverage / Front Desk', field: 'Tourism & Hospitality' }
        ],
        expRange: [1, 5],
        summaryTemplate: 'Customer-focused hospitality professional experienced with 4-star & boutique hotel front desk operations, guest welcoming, and reservation management.',
        salaryRange: [18000, 35000]
    },
    {
        title: 'Graphic Designer & Visual Content Creator',
        headlineSuffix: 'Photoshop, Illustrator, Premiere Pro & Brand Identity',
        skills: ['Adobe Photoshop', 'Illustrator', 'Figma', 'Premiere Pro', 'Social Media Creatives', 'Typography'],
        educationLevels: [
            { level: 'Graduate / Bachelor Degree', degree: 'B.Sc in Multimedia & Animation', field: 'Digital Arts' },
            { level: 'Diploma', degree: 'Diploma in Graphic Designing', field: 'Visual Communication' }
        ],
        expRange: [1, 4],
        summaryTemplate: 'Versatile graphic designer passionate about visual storytelling, brand collateral creation, and video editing for corporate and agency marketing teams.',
        salaryRange: [22000, 40000]
    },
    {
        title: 'B2B Sales Executive & Business Development',
        headlineSuffix: 'Lead Generation, Client Pitching & Revenue Growth',
        skills: ['B2B Sales', 'Client Acquisition', 'Negotiation', 'Channel Distribution', 'Market Research'],
        educationLevels: [
            { level: 'Graduate / Bachelor Degree', degree: 'B.Com / BBA', field: 'Commerce / Management' },
            { level: 'Master Degree', degree: 'MBA Marketing', field: 'Sales & Marketing' }
        ],
        expRange: [1, 6],
        summaryTemplate: 'Result-oriented sales executive with experience in FMCG, telecom, and corporate product distribution. Proven track record of consistently exceeding monthly revenue quotas.',
        salaryRange: [22000, 48000]
    }
];
const LOCATIONS = [
    { city: 'Guwahati', state: 'Assam', district: 'Kamrup Metropolitan' },
    { city: 'Jorhat', state: 'Assam', district: 'Jorhat' },
    { city: 'Dibrugarh', state: 'Assam', district: 'Dibrugarh' },
    { city: 'Silchar', state: 'Assam', district: 'Cachar' },
    { city: 'Tezpur', state: 'Assam', district: 'Sonitpur' },
    { city: 'Nagaon', state: 'Assam', district: 'Nagaon' },
    { city: 'Tinsukia', state: 'Assam', district: 'Tinsukia' },
    { city: 'Bongaigaon', state: 'Assam', district: 'Bongaigaon' },
    { city: 'Shillong', state: 'Meghalaya', district: 'East Khasi Hills' },
    { city: 'Dimapur', state: 'Nagaland', district: 'Dimapur' },
    { city: 'Itanagar', state: 'Arunachal Pradesh', district: 'Papum Pare' },
    { city: 'Agartala', state: 'Tripura', district: 'West Tripura' },
    { city: 'Kolkata', state: 'West Bengal', district: 'Kolkata' },
    { city: 'Delhi', state: 'Delhi NCR', district: 'South Delhi' },
    { city: 'Bangalore', state: 'Karnataka', district: 'Bengaluru Urban' }
];
const INSTITUTIONS = [
    'Gauhati University',
    'Cotton University',
    'Assam Engineering College (AEC)',
    'Jorhat Engineering College (JEC)',
    'Dibrugarh University',
    'Tezpur Central University',
    'Royal Global University',
    'Assam Down Town University',
    'Don Bosco University',
    'B. Borooah College, Guwahati',
    'Handique Girls College',
    'K.C. Das Commerce College',
    'Arya Vidyapeeth College',
    'NIT Silchar',
    'NEHU Shillong',
    'National Institute of Electronics & IT (NIELIT)'
];
const COMPANIES = [
    'TCS (Tata Consultancy Services)',
    'Wipro Technologies',
    'Career Wings Digital',
    'Airtel Northeast Telecom',
    'Reliance Jio Infocomm',
    'HDFC Bank Retail Ops',
    'ICICI Bank Financial Services',
    'Bandhan Bank',
    'Amul (GCMMF) Regional Office',
    'Dabur India Distribution',
    'Radisson Blu Hotel Guwahati',
    'Vivanta by Taj Guwahati',
    'Apollo Excelcare Hospital',
    'Topcem Cement Infra Ltd',
    'Star Cement Northeast',
    'Blue Dart Express Logistics',
    'TechAhead Solutions',
    'Brahmaputra Infrastructure Ltd',
    'Assam Valley Enterprises',
    'Freelance Consultant'
];
async function seed100Candidates() {
    if (process.env.NODE_ENV === 'production' && !process.env.FORCE_PRODUCTION_SEED) {
        console.error('⛔ [CRITICAL SAFETY GUARD] Seeding is DISABLED in PRODUCTION environment to protect live data!');
        process.exit(0);
    }
    console.log('🚀 Starting generation of 100 demo job seeker profiles...');
    const defaultPasswordHash = await bcryptjs_1.default.hash('Candidate@123', 10);
    // Ensure core skills exist in DB
    const allSkillNames = Array.from(new Set(ROLE_PROFILES.flatMap((r) => r.skills)));
    const skillMap = new Map();
    for (const skillName of allSkillNames) {
        const slug = skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        let skill = await prisma.skill.findFirst({ where: { name: skillName } });
        if (!skill) {
            skill = await prisma.skill.findUnique({ where: { slug } });
        }
        if (!skill) {
            skill = await prisma.skill.create({
                data: { name: skillName, slug: `${slug}-${Date.now() % 10000}`, isPopular: true },
            }).catch(async () => {
                return prisma.skill.findFirst({ where: { name: skillName } });
            });
        }
        if (skill) {
            skillMap.set(skillName, skill.id);
        }
    }
    console.log(`✔ Verified ${skillMap.size} skills in database.`);
    let createdCount = 0;
    for (let i = 1; i <= 100; i++) {
        const isMale = i % 2 !== 0;
        const firstName = isMale
            ? FIRST_NAMES_MALE[(i - 1) % FIRST_NAMES_MALE.length]
            : FIRST_NAMES_FEMALE[(i - 1) % FIRST_NAMES_FEMALE.length];
        const lastName = LAST_NAMES[(i * 3 + 7) % LAST_NAMES.length];
        const roleProfile = ROLE_PROFILES[(i - 1) % ROLE_PROFILES.length];
        const loc = LOCATIONS[(i * 2 + 5) % LOCATIONS.length];
        const institution = INSTITUTIONS[(i * 3) % INSTITUTIONS.length];
        const company = COMPANIES[(i * 4) % COMPANIES.length];
        const eduChoice = roleProfile.educationLevels[i % roleProfile.educationLevels.length];
        // Phone generation with realistic Indian prefixes (98541, 98640, 94350, 91012, 97060, etc.)
        const prefixes = ['98541', '98640', '94350', '91012', '97060', '88762', '70021', '99540', '86381', '78960'];
        const prefix = prefixes[i % prefixes.length];
        const suffixNum = String(10000 + ((i * 389) % 89999)).padStart(5, '0');
        const realPhone = `+91 ${prefix} ${suffixNum}`;
        // Experience calculation
        const [minExp, maxExp] = roleProfile.expRange;
        const totalExp = Number((minExp + ((i * 0.7) % (maxExp - minExp + 0.1))).toFixed(1));
        // Salary calculation
        const [minSal, maxSal] = roleProfile.salaryRange;
        const expectedSalaryMin = minSal + (i % 5) * 2000;
        const expectedSalaryMax = Math.round(expectedSalaryMin * 1.35);
        const email = `seeker.${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@careerwings.in`;
        const headline = `${roleProfile.title} • ${totalExp} yr${totalExp === 1 ? '' : 's'} Exp • ${loc.city}`;
        const resumeFileName = `${firstName}_${lastName}_Resume.pdf`;
        const resumeFile = `/uploads/resumes/verified_resume_${i}.pdf`;
        // Upsert User
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                role: 'CANDIDATE',
                isActive: true,
                isVerified: true,
            },
            create: {
                email,
                passwordHash: defaultPasswordHash,
                role: 'CANDIDATE',
                isActive: true,
                isVerified: true,
                createdAt: new Date(Date.now() - (100 - i) * 86400000 * 2), // staggered dates
            },
        });
        // Upsert Candidate
        const candidate = await prisma.candidate.upsert({
            where: { userId: user.id },
            update: {
                firstName,
                lastName,
                phone: realPhone,
                gender: isMale ? 'Male' : 'Female',
                headline,
                summary: `${roleProfile.summaryTemplate} Currently based in ${loc.city}, ${loc.state}. Open for immediate opportunities.`,
                currentLocation: `${loc.city}, ${loc.state}`,
                city: loc.city,
                state: loc.state,
                educationLevel: eduChoice.level,
                highestDegree: eduChoice.degree,
                college: institution,
                totalExperience: totalExp,
                currentRole: roleProfile.title,
                currentCompany: company,
                expectedSalaryMin,
                expectedSalaryMax,
                noticePeriod: i % 3 === 0 ? 'IMMEDIATE' : i % 3 === 1 ? '15_DAYS' : '30_DAYS',
                availabilityStatus: 'ACTIVELY_LOOKING',
                profileCompletion: 85 + (i % 15),
                resumeVisibility: 'PUBLIC',
                profileVisibility: 'PUBLIC',
                resumeFile,
                resumeFileName,
                resumeUpdatedAt: new Date(),
            },
            create: {
                userId: user.id,
                firstName,
                lastName,
                phone: realPhone,
                gender: isMale ? 'Male' : 'Female',
                headline,
                summary: `${roleProfile.summaryTemplate} Currently based in ${loc.city}, ${loc.state}. Open for immediate opportunities.`,
                currentLocation: `${loc.city}, ${loc.state}`,
                city: loc.city,
                state: loc.state,
                educationLevel: eduChoice.level,
                highestDegree: eduChoice.degree,
                college: institution,
                totalExperience: totalExp,
                currentRole: roleProfile.title,
                currentCompany: company,
                expectedSalaryMin,
                expectedSalaryMax,
                noticePeriod: i % 3 === 0 ? 'IMMEDIATE' : i % 3 === 1 ? '15_DAYS' : '30_DAYS',
                availabilityStatus: 'ACTIVELY_LOOKING',
                profileCompletion: 85 + (i % 15),
                resumeVisibility: 'PUBLIC',
                profileVisibility: 'PUBLIC',
                resumeFile,
                resumeFileName,
                resumeUpdatedAt: new Date(),
            },
        });
        // Attach Education
        const startYear = 2024 - Math.round(totalExp) - 3;
        const endYear = startYear + 3;
        await prisma.education.deleteMany({ where: { candidateId: candidate.id } });
        await prisma.education.create({
            data: {
                candidateId: candidate.id,
                institution,
                degree: eduChoice.degree,
                fieldOfStudy: eduChoice.field,
                startYear,
                endYear,
                grade: i % 2 === 0 ? 'First Class with Distinction' : 'First Class',
            },
        });
        // Attach Experience (if experience > 0)
        if (totalExp > 0) {
            await prisma.experience.deleteMany({ where: { candidateId: candidate.id } });
            await prisma.experience.create({
                data: {
                    candidateId: candidate.id,
                    company,
                    title: roleProfile.title,
                    location: `${loc.city}, ${loc.state}`,
                    startDate: `${2024 - Math.ceil(totalExp)}-04-01`,
                    isCurrent: true,
                    description: `Key contributor handling ${roleProfile.skills.slice(0, 3).join(', ')}. Achieved significant milestones and delivered consistent results.`,
                },
            });
        }
        // Attach Candidate Skills
        await prisma.candidateSkill.deleteMany({ where: { candidateId: candidate.id } });
        for (const skName of roleProfile.skills) {
            const skillId = skillMap.get(skName);
            if (skillId) {
                await prisma.candidateSkill.create({
                    data: {
                        candidateId: candidate.id,
                        skillId,
                        proficiency: i % 3 === 0 ? 'EXPERT' : 'INTERMEDIATE',
                    },
                }).catch(() => null);
            }
        }
        createdCount++;
        if (createdCount % 20 === 0) {
            console.log(`✔ Seeded ${createdCount} / 100 job seeker profiles...`);
        }
    }
    console.log(`🎉 Successfully inserted all ${createdCount} verified demo job seeker profiles!`);
}
seed100Candidates()
    .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-100-candidates.js.map