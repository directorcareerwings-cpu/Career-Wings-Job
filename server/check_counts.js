const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const jobs = await p.job.findMany({
    include: {
      _count: { select: { applications: true } }
    }
  });

  console.log('--- JOBS APPLICATION COUNTS ---');
  for (const j of jobs) {
    console.log(`Job: "${j.title}" (${j.id}) -> DB column applicationCount: ${j.applicationCount}, Real applications in Application table: ${j._count.applications}`);
  }
}

run().finally(() => p.$disconnect());
