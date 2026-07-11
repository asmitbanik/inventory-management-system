import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const result = await prisma.$queryRaw`SELECT 1 as ok`;
  console.log('OK', result);
} catch (e) {
  console.error('FAIL', e instanceof Error ? e.message : e);
} finally {
  await prisma.$disconnect();
}
