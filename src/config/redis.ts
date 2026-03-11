import Redis from 'ioredis';
import { config } from './environment';
import { logger } from './logger';

let redis: Redis | null = null;

export const initializeRedis = async (): Promise<Redis> => {
  if (!config.REDIS_ENABLED) {
    logger.warn('Redis is disabled');
    return null as any;
  }

  try {
    redis = new Redis(config.REDIS_URL);

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (error: any) => {
      logger.error(`Redis error: ${error.message}`);
    });

    await redis.ping();
    logger.info('Redis connection verified');
    return redis;
  } catch (error) {
    logger.error(`Failed to connect to Redis: ${error}`);
    throw error;
  }
};

export const getRedis = (): Redis => {
  if (!redis) {
    if (!config.REDIS_ENABLED) {
      throw new Error('Redis is disabled');
    }
    // Initialize synchronously with a new connection for testing
    // This works because ioredis is mocked in tests
    redis = new Redis(config.REDIS_URL);
  }
  return redis;
};

export const getRedisOptional = (): Redis | null => {
  if (!config.REDIS_ENABLED) {
    return null;
  }

  try {
    return getRedis();
  } catch (_error) {
    return null;
  }
};

export { redis };
