import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.candidate.groupBy({
    by: ['resumeVisibility'],
    _count: { id: true },
  });
  console.log('Visibility groups:', groups);

  const total = await prisma.candidate.count();
  console.log('Total candidates count in DB:', total);

  const sample = await prisma.candidate.findMany({
    take: 5,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      resumeVisibility: true,
      deletedAt: true,
      updatedAt: true,
    },
  });
  console.log('Sample candidates:', sample);

  // Test searchCandidates logic directly
  const where: any = {
    deletedAt: null,
    resumeVisibility: { in: ['PUBLIC', 'EMPLOYERS_ONLY'] },
  };
  const countWithWhere = await prisma.candidate.count({ where });
  console.log('Count matching where clause:', countWithWhere);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
