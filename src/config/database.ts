import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

let prisma: PrismaClient | null = null;

export const initializePrisma = (): PrismaClient => {
  if (prisma) {
    return prisma;
  }

  prisma = new PrismaClient({
    log: ['warn', 'error'],
  });

  // Use process.on for beforeExit in library engine (Prisma 5.0.0+)
  process.on('beforeExit', async () => {
    if (prisma) {
      logger.info('Prisma disconnecting');
      await prisma.$disconnect();
    }
  });

  logger.info('Prisma client initialized');
  return prisma;
};

export const getPrisma = (): PrismaClient => {
  if (!prisma) {
    return initializePrisma();
  }
  return prisma;
};

export { prisma };
