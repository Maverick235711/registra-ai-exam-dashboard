import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | undefined;

export const getPrismaClient = (): PrismaClient => {
  if (prisma) return prisma;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL must be configured before connecting to Neon PostgreSQL.');
  const adapter = new PrismaNeon({ connectionString });
  prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  return prisma;
};

export const disconnectPrisma = async (): Promise<void> => {
  if (prisma) await prisma.$disconnect();
};
