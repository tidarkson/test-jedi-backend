"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = exports.AppError = void 0;
class AppError extends Error {
    constructor(statusCode, code, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'AppError';
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
exports.ErrorCodes = {
    // Auth errors
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
    INVALID_TOKEN: 'INVALID_TOKEN',
    MISSING_TOKEN: 'MISSING_TOKEN',
    EXPIRED_TOKEN: 'EXPIRED_TOKEN',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    // Validation errors
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_REQUEST: 'INVALID_REQUEST',
    INVALID_INPUT: 'INVALID_INPUT',
    EXPIRED: 'EXPIRED',
    // Resource errors
    NOT_FOUND: 'NOT_FOUND',
    LOCKED_RESOURCE: 'LOCKED_RESOURCE',
    DUPLICATE_CASE: 'DUPLICATE_CASE',
    // Server errors
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
};
//# sourceMappingURL=errors.js.map