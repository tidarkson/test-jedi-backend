import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const isProduction = process.env.NODE_ENV === 'production';

// Connection pool size: production 20 max (sufficient for 500 concurrents via PgBouncer),
// development 5 max to stay lean.
const connectionLimit = isProduction ? 20 : 5;

// Prisma datasource connection_limit mirrors PgBouncer pool size
// The DATABASE_URL can also embed ?connection_limit=20&pool_timeout=10 parameters
const datasourceUrl = (() => {
  const url = process.env.DATABASE_URL || '';
  if (!url.includes('connection_limit=') && url) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}connection_limit=${connectionLimit}&pool_timeout=10`;
  }

  return url;
})();

let prisma: PrismaClient | null = null;

export const initializePrisma = (): PrismaClient => {
  if (prisma) {
    return prisma;
  }

  prisma = new PrismaClient({
    log: isProduction ? ['warn', 'error'] : ['warn', 'error'],
    datasources: {
      db: {
        url: datasourceUrl,
      },
    },
  });

  // Use process.on for beforeExit in library engine (Prisma 5.0.0+)
  process.on('beforeExit', async () => {
    if (prisma) {
      logger.info('Prisma disconnecting');
      await prisma.$disconnect();
    }
  });

  logger.info(
    `Prisma client initialized (pool max=${connectionLimit}, env=${process.env.NODE_ENV || 'development'})`,
  );
  return prisma;
};

export const getPrisma = (): PrismaClient => {
  if (!prisma) {
    return initializePrisma();
  }
  return prisma;
};

export { prisma };
