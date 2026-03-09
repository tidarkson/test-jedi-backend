"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.getRedis = exports.initializeRedis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const environment_1 = require("./environment");
const logger_1 = require("./logger");
let redis = null;
exports.redis = redis;
const initializeRedis = async () => {
    if (!environment_1.config.REDIS_ENABLED) {
        logger_1.logger.warn('Redis is disabled');
        return null;
    }
    try {
        exports.redis = redis = new ioredis_1.default(environment_1.config.REDIS_URL);
        redis.on('connect', () => {
            logger_1.logger.info('Redis connected');
        });
        redis.on('error', (error) => {
            logger_1.logger.error(`Redis error: ${error.message}`);
        });
        await redis.ping();
        logger_1.logger.info('Redis connection verified');
        return redis;
    }
    catch (error) {
        logger_1.logger.error(`Failed to connect to Redis: ${error}`);
        throw error;
    }
};
exports.initializeRedis = initializeRedis;
const getRedis = () => {
    if (!redis) {
        // Initialize synchronously with a new connection for testing
        // This works because ioredis is mocked in tests
        exports.redis = redis = new ioredis_1.default(environment_1.config.REDIS_URL);
    }
    return redis;
};
exports.getRedis = getRedis;
//# sourceMappingURL=redis.js.map