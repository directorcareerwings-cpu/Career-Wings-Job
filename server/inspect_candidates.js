const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function inspect() {
  const cands = await p.candidate.findMany({
    include: {
      user: true,
      applications: {
        include: { job: true }
      }
    }
  });

  console.log('Candidates in DB:', cands.length);
  for (const c of cands) {
    console.log('--- Candidate ---');
    console.log({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      gender: c.gender,
      dob: c.dateOfBirth,
      phone: c.phone,
      email: c.user?.email,
      totalExperience: c.totalExperience,
      expectedSalaryMin: c.expectedSalaryMin,
      expectedSalaryMax: c.expectedSalaryMax,
      currentLocation: c.currentLocation,
      highestDegree: c.highestDegree,
      educationLevel: c.educationLevel,
      resumeFileName: c.resumeFileName,
      appsCount: c.applications.length
    });
  }
}

inspect().finally(() => p.$disconnect());
