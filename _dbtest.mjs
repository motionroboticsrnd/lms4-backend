import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  await prisma.$connect();
  const result = await prisma.$queryRaw`SELECT 1 as ok`;
  console.log('DB connected OK:', result);
} catch (e) {
  console.error('DB ERROR:', e.message);
} finally {
  await prisma.$disconnect();
}
