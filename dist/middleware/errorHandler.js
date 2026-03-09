"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors_1 = require("../types/errors");
const logger_1 = require("../config/logger");
/**
 * Global error handler middleware
 * Must be registered last in the middleware chain
 */
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof errors_1.AppError) {
        res.status(err.statusCode).json({
            status: 'error',
            code: err.statusCode,
            error: err.code,
            message: err.message,
            details: err.details,
            timestamp: new Date().toISOString(),
        });
        return;
    }
    // Handle validation errors
    if (err.name === 'ValidationError') {
        res.status(400).json({
            status: 'error',
            code: 400,
            error: errors_1.ErrorCodes.VALIDATION_FAILED,
            message: 'Validation failed',
            details: err.details,
            timestamp: new Date().toISOString(),
        });
        return;
    }
    // Handle unexpected errors
    logger_1.logger.error('Unexpected error:', err);
    res.status(500).json({
        status: 'error',
        code: 500,
        error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map