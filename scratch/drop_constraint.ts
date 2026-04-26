import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Attempting to drop unique constraint on batch_id...');
    // Try common naming patterns for the unique constraint
    await prisma.$executeRawUnsafe(`ALTER TABLE "quality_checks" DROP CONSTRAINT IF EXISTS "quality_checks_batch_id_key"`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "quality_checks_batch_id_key"`);
    console.log('Successfully dropped batch_id constraint/index.');
  } catch (error) {
    console.error('Failed to drop constraint:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
