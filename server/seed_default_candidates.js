const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const candidatesData = [
  {
    id: 'cand-01',
    firstName: 'Bikash',
    lastName: 'Kalita',
    headline: 'Hotel Front Office Manager • Active Job Seeker - 2 yrs',
    currentLocation: 'Guwahati, Assam',
    educationLevel: 'Graduate / Diploma',
    highestDegree: 'B.A',
    totalExperience: 2,
    gender: 'MALE',
    resumeFile: '/uploads/resumes/bikash_kalita.pdf',
    resumeFileName: 'Bikash_Kalita_Resume.pdf',
    email: 'bikash.kalita@example.com',
    phone: '+91 98640 12890',
    skills: ['Front Office Operations', 'Guest Relations', 'Hotel Management', 'Vendor Coordination'],
  },
  {
    id: 'cand-02',
    firstName: 'Priya',
    lastName: 'Sharma',
    headline: 'Senior Frontend Engineer • Active Job Seeker',
    currentLocation: 'Guwahati, Assam',
    educationLevel: 'Graduate / Diploma',
    highestDegree: 'B.A',
    totalExperience: 2,
    gender: 'FEMALE',
    resumeFile: '/uploads/resumes/priya_sharma.pdf',
    resumeFileName: 'Priya_Sharma_Resume.pdf',
    email: 'priya.sharma@example.com',
    phone: '+91 98765 43210',
    skills: ['Professional Communications', 'Job Search Readiness', 'Industry Domain', 'React.js', 'TypeScript', 'Tailwind CSS'],
  },
  {
    id: 'cand-03',
    firstName: 'Rima',
    lastName: 'Bordoloi',
    headline: 'Any • Guwahati, Assam, India - 3 yrs',
    currentLocation: 'Guwahati, Assam, India',
    educationLevel: 'Graduate / Diploma',
    highestDegree: 'B.B.A',
    totalExperience: 3,
    gender: 'FEMALE',
    resumeFile: '/uploads/resumes/rima_bordoloi.pdf',
    resumeFileName: 'Rima_Bordoloi_Resume.pdf',
    email: 'rima.bordoloi@gmail.com',
    phone: '+91 94350 78219',
    skills: ['Business Administration', 'Executive Assistance', 'Operations Support', 'Client Communication'],
  },
  {
    id: 'cand-04',
    firstName: 'Ankita',
    lastName: 'Gogoi',
    headline: 'Accounts & Tally Specialist • Active Job Seeker - 2 yrs',
    currentLocation: 'Jorhat, Assam',
    educationLevel: 'Graduate / Diploma',
    highestDegree: 'B.A',
    totalExperience: 2,
    gender: 'FEMALE',
    resumeFile: '/uploads/resumes/ankita_gogoi.pdf',
    resumeFileName: 'Ankita_Gogoi_Resume.pdf',
    email: 'ankita.gogoi@example.com',
    phone: '+91 91012 34567',
    skills: ['Tally Prime', 'GST Filing', 'Accounts Reconciliation', 'MS Excel'],
  },
  {
    id: 'cand-05',
    firstName: 'Rahul',
    lastName: 'Das',
    headline: 'Data Entry & Office Operations • Active Job Seeker - 2 yrs',
    currentLocation: 'Guwahati, Assam',
    educationLevel: 'Graduate / Diploma',
    highestDegree: 'B.A',
    totalExperience: 2,
    gender: 'MALE',
    resumeFile: '/uploads/resumes/rahul_das.pdf',
    resumeFileName: 'Rahul_Das_Resume.pdf',
    email: 'rahul.das@example.com',
    phone: '+91 98540 88214',
    skills: ['Data Entry', 'MS Office', 'Back Office Support', 'Record Management'],
  },
  {
    id: 'cand-06',
    firstName: 'Alhazul',
    lastName: 'Haque',
    headline: 'Job Seeker • Guwahati, Assam, India - 2 yrs',
    currentLocation: 'Guwahati, Assam, India',
    educationLevel: 'Graduate',
    highestDegree: 'Graduate',
    totalExperience: 2,
    gender: 'MALE',
    resumeFile: '/uploads/resumes/alhazul_haque.pdf',
    resumeFileName: 'Alhazul_Haque_Resume.pdf',
    email: 'alhazul.haque@gmail.com',
    phone: '+91 88761 99234',
    skills: ['Logistics Support', 'Sales Coordination', 'Client Handling'],
  },
  {
    id: 'cand-07',
    firstName: 'Nilav Jyoti',
    lastName: 'Deka',
    headline: 'Civil Site Engineer & Construction Supervisor - 3.5 yrs',
    currentLocation: 'Kamrup Metropolitan, Assam',
    educationLevel: 'Graduate / Bachelor Degree',
    highestDegree: 'B.Tech / B.E',
    totalExperience: 3.5,
    gender: 'MALE',
    resumeFile: '/uploads/resumes/nilav_deka.pdf',
    resumeFileName: 'Nilav_Deka_Resume.pdf',
    email: 'nilav.deka@example.com',
    phone: '+91 99540 33219',
    skills: ['AutoCAD Civil', 'Site Supervision', 'Quality Estimation', 'Billing & BOQ'],
  },
  {
    id: 'cand-08',
    firstName: 'Mousumi',
    lastName: 'Bora',
    headline: 'HR Executive & Talent Sourcing Specialist - 4 yrs',
    currentLocation: 'Dibrugarh, Assam',
    educationLevel: 'Post Graduate / Master Degree',
    highestDegree: 'MBA',
    totalExperience: 4,
    gender: 'FEMALE',
    resumeFile: '/uploads/resumes/mousumi_bora.pdf',
    resumeFileName: 'Mousumi_Bora_Resume.pdf',
    email: 'mousumi.bora@example.com',
    phone: '+91 97060 44112',
    skills: ['Talent Acquisition', 'Payroll Management', 'Employee Onboarding', 'Statutory Compliance'],
  },
  {
    id: 'cand-09',
    firstName: 'Debajit',
    lastName: 'Saikia',
    headline: 'Pharmacist & Clinical Healthcare Assistant - 1.5 yrs',
    currentLocation: 'Nagaon, Assam',
    educationLevel: 'Diploma / Bachelor Degree',
    highestDegree: 'B.Pharm',
    totalExperience: 1.5,
    gender: 'MALE',
    resumeFile: '/uploads/resumes/debajit_saikia.pdf',
    resumeFileName: 'Debajit_Saikia_Resume.pdf',
    email: 'debajit.saikia@example.com',
    phone: '+91 98642 77103',
    skills: ['Inventory Management', 'Prescription Dispensing', 'Medical Terminology'],
  },
  {
    id: 'cand-10',
    firstName: 'Pallabi',
    lastName: 'Chetia',
    headline: 'Graphic Designer & Digital Media Specialist - 2.5 yrs',
    currentLocation: 'Guwahati, Assam',
    educationLevel: 'Graduate / Diploma',
    highestDegree: 'BCA',
    totalExperience: 2.5,
    gender: 'FEMALE',
    resumeFile: '/uploads/resumes/pallabi_chetia.pdf',
    resumeFileName: 'Pallabi_Chetia_Resume.pdf',
    email: 'pallabi.chetia@example.com',
    phone: '+91 94355 12099',
    skills: ['Adobe Photoshop', 'Illustrator', 'Canva Pro', 'Social Media Creatives'],
  },
  {
    id: 'cand-11',
    firstName: 'Manash',
    lastName: 'Pratim Baruah',
    headline: 'Field Sales Officer & Distributor Relationship Mgr - 3 yrs',
    currentLocation: 'Tinsukia, Assam',
    educationLevel: 'Graduate / Bachelor Degree',
    highestDegree: 'B.Com',
    totalExperience: 3,
    gender: 'MALE',
    resumeFile: '/uploads/resumes/manash_baruah.pdf',
    resumeFileName: 'Manash_Baruah_Resume.pdf',
    email: 'manash.baruah@example.com',
    phone: '+91 91011 88921',
    skills: ['FMCG Sales', 'Channel Distribution', 'B2B Client Pitching', 'Payment Collection'],
  },
  {
    id: 'cand-12',
    firstName: 'Jumoni',
    lastName: 'Kashyap',
    headline: 'Customer Support Representative & Telecaller - 1 yr',
    currentLocation: 'Guwahati, Assam',
    educationLevel: '12th / Higher Secondary',
    highestDegree: 'Higher Secondary',
    totalExperience: 1,
    gender: 'FEMALE',
    resumeFile: '/uploads/resumes/jumoni_kashyap.pdf',
    resumeFileName: 'Jumoni_Kashyap_Resume.pdf',
    email: 'jumoni.kashyap@example.com',
    phone: '+91 98541 22340',
    skills: ['Assamese & English Fluency', 'Telecalling', 'CRM Data Entry', 'Inbound Support'],
  },
];

async function seed() {
  console.log('Seeding 12 verified candidates into SQLite DB...');
  const passwordHash = await bcrypt.hash('Candidate@123', 10);

  for (const c of candidatesData) {
    // 1. Ensure user
    let user = await prisma.user.findUnique({ where: { email: c.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: c.email,
          passwordHash,
          role: 'CANDIDATE',
          isActive: true,
          isVerified: true,
        },
      });
    }

    // 2. Ensure candidate
    let candidate = await prisma.candidate.findFirst({
      where: { OR: [{ id: c.id }, { userId: user.id }] },
    });

    if (!candidate) {
      candidate = await prisma.candidate.create({
        data: {
          id: c.id,
          userId: user.id,
          firstName: c.firstName,
          lastName: c.lastName,
          headline: c.headline,
          currentLocation: c.currentLocation,
          educationLevel: c.educationLevel,
          highestDegree: c.highestDegree,
          totalExperience: c.totalExperience,
          gender: c.gender,
          phone: c.phone,
          resumeFile: c.resumeFile,
          resumeFileName: c.resumeFileName,
          resumeVisibility: 'PUBLIC',
          profileVisibility: 'PUBLIC',
        },
      });
    }

    // 3. Ensure skills
    for (const skillName of c.skills) {
      let skill = await prisma.skill.findFirst({ where: { name: skillName } });
      if (!skill) {
        skill = await prisma.skill.create({
          data: {
            name: skillName,
            slug: skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          },
        }).catch(() => null);
      }
      if (skill) {
        await prisma.candidateSkill.upsert({
          where: {
            candidateId_skillId: {
              candidateId: candidate.id,
              skillId: skill.id,
            },
          },
          update: {},
          create: {
            candidateId: candidate.id,
            skillId: skill.id,
          },
        }).catch(() => null);
      }
    }
  }

  const count = await prisma.candidate.count();
  console.log(`Seeding complete! Total candidates in DB: ${count}`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
