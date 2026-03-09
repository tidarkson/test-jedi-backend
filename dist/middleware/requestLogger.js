"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const logger_1 = require("../config/logger");
/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    // Log request
    logger_1.logger.info(`[${req.method}] ${req.path} - IP: ${req.ip} - User-Agent: ${req.get('user-agent')}`);
    // Override res.json to log response
    const originalJson = res.json;
    res.json = function (data) {
        const duration = Date.now() - startTime;
        logger_1.logger.info(`[${req.method}] ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`);
        return originalJson.call(this, data);
    };
    next();
};
exports.requestLogger = requestLogger;
//# sourceMappingURL=requestLogger.js.map