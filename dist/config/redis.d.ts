import Redis from 'ioredis';
declare let redis: Redis | null;
export declare const initializeRedis: () => Promise<Redis>;
export declare const getRedis: () => Redis;
export { redis };
//# sourceMappingURL=redis.d.ts.map