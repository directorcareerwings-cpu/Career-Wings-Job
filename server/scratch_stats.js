const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function m() {
  const users = await p.user.findMany({
    where: { role: 'EMPLOYER' },
    include: { employer: { include: { jobs: true } } }
  });
  for (const u of users) {
    console.log('User:', u.email, 'Employer ID:', u.employer?.id, 'Company:', u.employer?.companyName, 'Jobs:', u.employer?.jobs?.length);
    if (u.employer?.id) {
      const totalApps = await p.application.count({ where: { job: { employerId: u.employer.id } } });
      console.log('  -> Total applications for this employer:', totalApps);
    }
  }
  const totalCandidates = await p.candidate.count();
  console.log('Total candidates in DB:', totalCandidates);

  const jobs = await p.job.findMany({ select: { id: true, title: true, employerId: true } });
  console.log('Total jobs:', jobs.length);
  for (const j of jobs) {
    const c = await p.application.count({ where: { jobId: j.id } });
    console.log(`Job ${j.title} (${j.id}): ${c} apps`);
  }
}

m().finally(() => p.$disconnect());
