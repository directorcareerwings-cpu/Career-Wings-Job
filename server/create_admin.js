const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createOrUpdateAdmin() {
  const email = (process.argv[2] || 'admin@careerwings.in').trim().toLowerCase();
  const password = process.argv[3] || 'Admin@123456';

  console.log(`Setting up Admin account for: ${email}...`);

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
    },
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
    },
  });

  console.log('========================================');
  console.log('✅ ADMIN ACCOUNT READY:');
  console.log(`   Email / ID: ${user.email}`);
  console.log(`   Password:   ${password}`);
  console.log(`   Role:       ${user.role}`);
  console.log(`   Active:     ${user.isActive}`);
  console.log(`   Verified:   ${user.isVerified}`);
  console.log('========================================');
}

createOrUpdateAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Failed to create admin:', err);
    process.exit(1);
  });
