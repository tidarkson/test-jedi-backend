"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.require2FA = exports.requireProjectPermission = exports.requireRole = exports.authenticate = void 0;
const errors_1 = require("../types/errors");
const AuthService_1 = require("../services/AuthService");
const logger_1 = require("../config/logger");
const authService = new AuthService_1.AuthService();
/**
 * Middleware to authenticate JWT token
 */
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({
                status: 'error',
                code: 401,
                error: errors_1.ErrorCodes.MISSING_TOKEN,
                message: 'No authentication token provided',
            });
        }
        const token = authHeader.slice(7);
        try {
            const payload = authService.verifyAccessToken(token);
            req.user = {
                userId: payload.userId,
                email: payload.email,
                name: '',
                roles: payload.roles,
                organizationId: payload.organizationId,
                projectId: payload.projectId,
            };
            req.token = token;
            next();
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
            }
            throw error;
        }
    }
    catch (error) {
        logger_1.logger.error(`Authentication error: ${error.message}`);
        return res.status(500).json({
            status: 'error',
            code: 500,
            error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
            message: 'Authentication failed',
        });
    }
};
exports.authenticate = authenticate;
/**
 * Middleware to check if user has required roles
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                code: 401,
                error: errors_1.ErrorCodes.UNAUTHORIZED,
                message: 'Unauthorized',
            });
        }
        const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
        if (!hasRole) {
            return res.status(403).json({
                status: 'error',
                code: 403,
                error: errors_1.ErrorCodes.FORBIDDEN,
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Middleware to check project-level permissions
 */
const requireProjectPermission = (action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    status: 'error',
                    code: 401,
                    error: errors_1.ErrorCodes.UNAUTHORIZED,
                    message: 'Unauthorized',
                });
            }
            const projectId = req.params.projectId || req.body.projectId;
            if (!projectId) {
                return res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: errors_1.ErrorCodes.VALIDATION_FAILED,
                    message: 'Project ID is required',
                });
            }
            // Check if user has permission for this project
            const hasPermission = await authService.checkProjectPermission(req.user.userId, projectId, action);
            if (!hasPermission) {
                return res.status(403).json({
                    status: 'error',
                    code: 403,
                    error: errors_1.ErrorCodes.FORBIDDEN,
                    message: `You don't have permission to ${action} in this project`,
                });
            }
            next();
        }
        catch (error) {
            logger_1.logger.error(`Permission check error: ${error.message}`);
            return res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Permission check failed',
            });
        }
    };
};
exports.requireProjectPermission = requireProjectPermission;
/**
 * Middleware to enforce two-factor authentication (optional)
 * Can be extended later for additional security
 */
const require2FA = (_req, _res, next) => {
    // To be implemented if 2FA is needed
    next();
};
exports.require2FA = require2FA;
//# sourceMappingURL=auth.js.map