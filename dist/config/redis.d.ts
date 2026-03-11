import Redis from 'ioredis';
declare let redis: Redis | null;
export declare const initializeRedis: () => Promise<Redis>;
export declare const getRedis: () => Redis;
export declare const getRedisOptional: () => Redis | null;
export { redis };
//# sourceMappingURL=redis.d.ts.map