"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const AuthService_1 = require("../services/AuthService");
const errors_1 = require("../types/errors");
const auth_validator_1 = require("../validators/auth.validator");
const logger_1 = require("../config/logger");
const environment_1 = require("../config/environment");
class AuthController {
    constructor() {
        this.authService = new AuthService_1.AuthService();
    }
    /**
     * POST /api/v1/auth/register
     * Register a new user and create organization
     */
    async register(req, res) {
        try {
            const validation = auth_validator_1.registerSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: errors_1.ErrorCodes.VALIDATION_FAILED,
                    message: 'Validation failed',
                    errors: validation.error.issues,
                });
                return;
            }
            const { email, name, password, organizationName } = validation.data;
            const { user, accessToken, refreshToken } = await this.authService.register(email, name, password, organizationName);
            // Set refresh token as httpOnly cookie
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: environment_1.config.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
            });
            res.status(201).json({
                status: 'success',
                code: 201,
                data: {
                    user,
                    accessToken,
                },
                message: 'User registered successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                    details: error.details,
                });
                return;
            }
            logger_1.logger.error(`Register error: ${error.message}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
            });
        }
    }
    /**
     * POST /api/v1/auth/login
     * Login user and return tokens
     */
    async login(req, res) {
        try {
            const validation = auth_validator_1.loginSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: errors_1.ErrorCodes.VALIDATION_FAILED,
                    message: 'Validation failed',
                    errors: validation.error.issues,
                });
                return;
            }
            const { email, password } = validation.data;
            const { user, accessToken, refreshToken } = await this.authService.login(email, password);
            // Set refresh token as httpOnly cookie
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: environment_1.config.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
            });
            res.status(200).json({
                status: 'success',
                code: 200,
                data: {
                    user,
                    accessToken,
                },
                message: 'Logged in successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Login error: ${error.message}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
            });
        }
    }
    /**
     * POST /api/v1/auth/refresh
     * Refresh access token
     */
    async refresh(req, res) {
        try {
            // Get refreshToken from cookie, body, or Cookie header
            const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken || (() => {
                const header = (req.headers && req.headers.cookie) || '';
                logger_1.logger.info(`DEBUG refresh header: ${header}`);
                if (!header)
                    return undefined;
                const parts = header.split(';').map((p) => p.trim());
                const kv = parts.find((p) => p.startsWith('refreshToken='));
                if (!kv)
                    return undefined;
                // cookie values may be URL encoded when sent in the Cookie header
                const raw = kv.slice('refreshToken='.length);
                try {
                    return decodeURIComponent(raw);
                }
                catch {
                    return raw;
                }
            })();
            if (!refreshToken) {
                res.status(401).json({
                    status: 'error',
                    code: 401,
                    error: errors_1.ErrorCodes.MISSING_TOKEN,
                    message: 'Refresh token is required',
                });
                return;
            }
            const newAccessToken = await this.authService.refreshAccessToken(refreshToken);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: {
                    accessToken: newAccessToken,
                },
                message: 'Access token refreshed',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Refresh error: ${error.message}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
            });
        }
    }
    /**
     * POST /api/v1/auth/logout
     * Logout user and revoke refresh token
     */
    async logout(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    status: 'error',
                    code: 401,
                    error: errors_1.ErrorCodes.UNAUTHORIZED,
                    message: 'Unauthorized',
                });
                return;
            }
            // Revoke refresh token (you might get tokenVersion from body)
            const tokenVersion = req.body?.tokenVersion || 1;
            await this.authService.logout(req.user.userId, tokenVersion);
            // Clear refresh token cookie
            res.clearCookie('refreshToken');
            res.status(200).json({
                status: 'success',
                code: 200,
                message: 'Logged out successfully',
            });
        }
        catch (error) {
            logger_1.logger.error(`Logout error: ${error.message}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
            });
        }
    }
    /**
     * GET /api/v1/auth/me
     * Get current user profile
     */
    async getProfile(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    status: 'error',
                    code: 401,
                    error: errors_1.ErrorCodes.UNAUTHORIZED,
                    message: 'Unauthorized',
                });
                return;
            }
            const userProfile = await this.authService.getUserProfile(req.user.userId);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: userProfile,
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Get profile error: ${error.message}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
            });
        }
    }
    /**
     * POST /api/v1/auth/change-password
     * Change user password
     */
    async changePassword(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    status: 'error',
                    code: 401,
                    error: errors_1.ErrorCodes.UNAUTHORIZED,
                    message: 'Unauthorized',
                });
                return;
            }
            const validation = auth_validator_1.changePasswordSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: errors_1.ErrorCodes.VALIDATION_FAILED,
                    message: 'Validation failed',
                    errors: validation.error.issues,
                });
                return;
            }
            const { currentPassword, newPassword } = validation.data;
            await this.authService.changePassword(req.user.userId, currentPassword, newPassword);
            res.status(200).json({
                status: 'success',
                code: 200,
                message: 'Password changed successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Change password error: ${error.message}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
            });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map