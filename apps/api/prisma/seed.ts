import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  const passwordHash = await bcrypt.hash('promptops123', SALT_ROUNDS);

  await prisma.user.upsert({
    where: { email: 'test@promptops.dev' },
    update: {},
    create: {
      email: 'test@promptops.dev',
      passwordHash,
      name: 'Test User',
    },
  });

  console.log('Seed complete: test@promptops.dev / promptops123');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
