const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const apps = await prisma.application.findMany({
    include: {
      candidate: true,
      job: true
    }
  });
  console.log("Total applications:", apps.length);
  for (const app of apps) {
    console.log({
      id: app.id,
      jobId: app.jobId,
      jobTitle: app.job?.title,
      status: app.status,
      candidate: app.candidate ? `${app.candidate.firstName} ${app.candidate.lastName}` : null,
      phone: app.candidate?.phone
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
