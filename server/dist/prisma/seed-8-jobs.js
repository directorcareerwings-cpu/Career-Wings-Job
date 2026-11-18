"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function addMoreJobs() {
    if (process.env.NODE_ENV === 'production' && !process.env.FORCE_PRODUCTION_SEED) {
        console.error('⛔ [CRITICAL SAFETY GUARD] Seeding is DISABLED in PRODUCTION environment to protect live data!');
        process.exit(0);
    }
    console.log('Seeding 5 more jobs to reach 8+ published vacancies...');
    const employer = await prisma.employer.findFirst();
    if (!employer) {
        console.error('No employer found');
        return;
    }
    const itCat = await prisma.category.findUnique({ where: { slug: 'it-software' } });
    const healthCat = await prisma.category.findUnique({ where: { slug: 'healthcare-hospital' } });
    const salesCat = await prisma.category.findUnique({ where: { slug: 'sales-marketing' } });
    const financeCat = await prisma.category.findUnique({ where: { slug: 'banking-finance' } });
    const civilCat = await prisma.category.findUnique({ where: { slug: 'civil-construction' } });
    const ghyLoc = await prisma.location.findUnique({ where: { slug: 'guwahati-assam' } });
    const shlLoc = await prisma.location.findUnique({ where: { slug: 'shillong-meghalaya' } });
    const dibLoc = await prisma.location.findUnique({ where: { slug: 'dibrugarh-assam' } });
    const healthCompany = await prisma.company.findUnique({ where: { slug: 'kamakhya-health-city' } });
    const itCompany = await prisma.company.findUnique({ where: { slug: 'pragjyotish-infotech' } });
    const infraCompany = await prisma.company.findUnique({ where: { slug: 'brahmaputra-infra' } });
    const cwCompany = await prisma.company.findUnique({ where: { slug: 'career-wings-placement' } });
    const newJobs = [
        {
            title: 'Medical Officer / Resident Physician',
            slug: 'medical-officer-resident-physician-guwahati',
            description: 'Super speciality tertiary care hospital in Guwahati is looking for a dedicated Medical Officer for ICU and general patient management.',
            responsibilities: '• Emergency patient care and clinical ward management.\n• Coordinate with consultant doctors and diagnostic teams.\n• Maintain patient admission and medical records.',
            requirements: '• MBBS degree from a recognized medical council.\n• Valid medical registration certificate.\n• 1+ years clinical or hospital experience.',
            categoryId: healthCat?.id,
            locationId: ghyLoc?.id,
            companyId: healthCompany?.id || cwCompany?.id,
            employerId: employer.id,
            salaryMin: 55000,
            salaryMax: 85000,
            salaryPeriod: 'MONTHLY',
            workMode: 'ON_SITE',
            jobType: 'FULL_TIME',
            experienceMin: 1,
            experienceMax: 4,
            vacancies: 2,
            status: 'PUBLISHED',
            isFeatured: true,
            publishedAt: new Date(),
        },
        {
            title: 'Area Sales & Distribution Manager - FMCG',
            slug: 'area-sales-manager-fmcg-dibrugarh',
            description: 'Lead FMCG retail network expansion and channel sales across Upper Assam. Drive distributor engagement and volume targets.',
            responsibilities: '• Manage distributor network across Dibrugarh & Tinsukia.\n• Supervise field sales representatives.\n• Oversee product availability and promotional campaigns.',
            requirements: '• Graduate / MBA in Marketing.\n• 2-5 years experience in FMCG sales or distribution.',
            categoryId: salesCat?.id,
            locationId: dibLoc?.id || ghyLoc?.id,
            companyId: cwCompany?.id,
            employerId: employer.id,
            salaryMin: 35000,
            salaryMax: 50000,
            salaryPeriod: 'MONTHLY',
            workMode: 'ON_SITE',
            jobType: 'FULL_TIME',
            experienceMin: 2,
            experienceMax: 5,
            vacancies: 2,
            status: 'PUBLISHED',
            isFeatured: true,
            publishedAt: new Date(),
        },
        {
            title: 'Chartered Accountant / Financial Analyst',
            slug: 'chartered-accountant-financial-analyst-shillong',
            description: 'Senior financial advisory and corporate audit role handling taxation, balance sheets, and compliance for regional corporate clients in Shillong.',
            responsibilities: '• Finalization of accounts, statutory audits, and tax compliance.\n• MIS reporting and cash-flow management.\n• Financial risk analysis and business advisory.',
            requirements: '• CA Inter / CA Final / M.Com.\n• In-depth knowledge of Indian GAAP, GST, and Income Tax.\n• 2+ years relevant accounting experience.',
            categoryId: financeCat?.id,
            locationId: shlLoc?.id || ghyLoc?.id,
            companyId: cwCompany?.id,
            employerId: employer.id,
            salaryMin: 40000,
            salaryMax: 65000,
            salaryPeriod: 'MONTHLY',
            workMode: 'HYBRID',
            jobType: 'FULL_TIME',
            experienceMin: 2,
            experienceMax: 6,
            vacancies: 1,
            status: 'PUBLISHED',
            isFeatured: true,
            publishedAt: new Date(),
        },
        {
            title: 'Senior Full-Stack Node & Cloud Architect',
            slug: 'senior-full-stack-cloud-architect-guwahati',
            description: 'Lead software engineering and backend cloud architecture for enterprise web applications built on TypeScript, Node.js, and PostgreSQL.',
            responsibilities: '• Architect high-throughput REST APIs and microservices.\n• Guide junior developers and review code pull requests.\n• Manage AWS/cloud deployments and Docker containers.',
            requirements: '• 4+ years software development experience with Node.js & React.\n• Strong database design skills (PostgreSQL / Prisma).\n• Good understanding of cloud infrastructure.',
            categoryId: itCat?.id,
            locationId: ghyLoc?.id,
            companyId: itCompany?.id || cwCompany?.id,
            employerId: employer.id,
            salaryMin: 60000,
            salaryMax: 95000,
            salaryPeriod: 'MONTHLY',
            workMode: 'HYBRID',
            jobType: 'FULL_TIME',
            experienceMin: 4,
            experienceMax: 8,
            vacancies: 2,
            status: 'PUBLISHED',
            isFeatured: true,
            publishedAt: new Date(),
        },
        {
            title: 'Civil Project Engineer - Highways & Bridges',
            slug: 'civil-project-engineer-highways-guwahati',
            description: 'Supervise highway infrastructure projects and bridge construction in Assam. Handle site planning, billing, and contractor management.',
            responsibilities: '• Project planning, billing, and progress monitoring.\n• Coordinate with govt departments and engineering consultants.\n• Quality control testing of materials and structural works.',
            requirements: '• B.Tech / BE in Civil Engineering.\n• 3-7 years experience in highway or infrastructure construction.',
            categoryId: civilCat?.id,
            locationId: ghyLoc?.id,
            companyId: infraCompany?.id || cwCompany?.id,
            employerId: employer.id,
            salaryMin: 45000,
            salaryMax: 70000,
            salaryPeriod: 'MONTHLY',
            workMode: 'ON_SITE',
            jobType: 'FULL_TIME',
            experienceMin: 3,
            experienceMax: 7,
            vacancies: 2,
            status: 'PUBLISHED',
            isFeatured: true,
            publishedAt: new Date(),
        },
    ];
    for (const j of newJobs) {
        await prisma.job.upsert({
            where: { slug: j.slug },
            update: j,
            create: j,
        });
        console.log(`✔ Created job: ${j.title}`);
    }
    const count = await prisma.job.count({ where: { status: 'PUBLISHED', deletedAt: null } });
    console.log(`Total published jobs in database: ${count}`);
}
addMoreJobs()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-8-jobs.js.map