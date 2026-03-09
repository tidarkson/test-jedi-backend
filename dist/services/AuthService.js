"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const environment_1 = require("../config/environment");
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
const errors_1 = require("../types/errors");
class AuthService {
    constructor() {
        this.prisma = (0, database_1.getPrisma)();
        this.redis = (0, redis_1.getRedis)();
    }
    /**
     * Register a new user and create their organization
     */
    async register(email, name, password, organizationName) {
        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new errors_1.AppError(409, errors_1.ErrorCodes.USER_ALREADY_EXISTS, 'User with this email already exists');
        }
        // Hash password
        const passwordHash = await bcrypt_1.default.hash(password, environment_1.config.BCRYPT_ROUNDS);
        // Create organization first
        const organization = await this.prisma.organization.create({
            data: {
                name: organizationName,
                slug: organizationName
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, ''),
                plan: 'FREE',
            },
        });
        // Create user as OWNER of the new organization
        const user = await this.prisma.user.create({
            data: {
                email,
                name,
                passwordHash,
                role: 'OWNER',
                organizationMembers: {
                    create: {
                        organizationId: organization.id,
                        role: 'OWNER',
                    },
                },
            },
            include: {
                organizationMembers: true,
            },
        });
        // Generate tokens
        const accessToken = this.generateAccessToken(user);
        const refreshToken = await this.generateRefreshToken(user.id);
        logger_1.logger.info(`User registered: ${user.id} (${email})`);
        return {
            user: this.formatAuthUser(user),
            accessToken,
            refreshToken,
        };
    }
    /**
     * Login user with email and password
     */
    async login(email, password) {
        // Find user
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                organizationMembers: true,
                projectMembers: true,
            },
        });
        if (!user) {
            throw new errors_1.AppError(401, errors_1.ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password');
        }
        // Verify password
        const isPasswordValid = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new errors_1.AppError(401, errors_1.ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password');
        }
        // Update last login
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        // Generate tokens
        const accessToken = this.generateAccessToken(user);
        const refreshToken = await this.generateRefreshToken(user.id);
        logger_1.logger.info(`User logged in: ${user.id} (${email})`);
        return {
            user: this.formatAuthUser(user, user.organizationMembers[0]?.organizationId),
            accessToken,
            refreshToken,
        };
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken) {
        try {
            // Verify refresh token
            const payload = jsonwebtoken_1.default.verify(refreshToken, environment_1.config.JWT_SECRET);
            // Check token revocation
            const isRevoked = await this.redis.get(`revoked:${payload.userId}:${payload.tokenVersion}`);
            if (isRevoked) {
                throw new errors_1.AppError(401, errors_1.ErrorCodes.EXPIRED_TOKEN, 'Refresh token has been revoked');
            }
            // Get user
            const user = await this.prisma.user.findUnique({
                where: { id: payload.userId },
                include: {
                    organizationMembers: true,
                    projectMembers: true,
                },
            });
            if (!user) {
                throw new errors_1.AppError(401, errors_1.ErrorCodes.USER_NOT_FOUND, 'User not found');
            }
            // Generate new access token
            const newAccessToken = this.generateAccessToken(user);
            logger_1.logger.info(`Access token refreshed for user: ${user.id}`);
            return newAccessToken;
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                throw error;
            }
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new errors_1.AppError(401, errors_1.ErrorCodes.EXPIRED_TOKEN, 'Refresh token has expired');
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new errors_1.AppError(401, errors_1.ErrorCodes.INVALID_TOKEN, 'Invalid refresh token');
            }
            throw error;
        }
    }
    /**
     * Logout user by revoking refresh token
     */
    async logout(userId, tokenVersion) {
        // Revoke refresh token in Redis
        const ttl = 7 * 24 * 60 * 60; // 7 days in seconds
        await this.redis.setex(`revoked:${userId}:${tokenVersion}`, ttl, 'revoked');
        logger_1.logger.info(`User logged out: ${userId}`);
    }
    /**
     * Verify and decode JWT token
     */
    verifyAccessToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, environment_1.config.JWT_SECRET);
            return payload;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new errors_1.AppError(401, errors_1.ErrorCodes.EXPIRED_TOKEN, 'Access token has expired');
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new errors_1.AppError(401, errors_1.ErrorCodes.INVALID_TOKEN, 'Invalid access token');
            }
            throw new errors_1.AppError(401, errors_1.ErrorCodes.INVALID_TOKEN, 'Token verification failed');
        }
    }
    /**
     * Get user profile
     */
    async getUserProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                organizationMembers: true,
            },
        });
        if (!user) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.USER_NOT_FOUND, 'User not found');
        }
        return this.formatAuthUser(user, user.organizationMembers[0]?.organizationId);
    }
    /**
     * Change user password
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.USER_NOT_FOUND, 'User not found');
        }
        // Verify current password
        const isPasswordValid = await bcrypt_1.default.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            throw new errors_1.AppError(401, errors_1.ErrorCodes.INVALID_CREDENTIALS, 'Current password is incorrect');
        }
        // Hash new password
        const newPasswordHash = await bcrypt_1.default.hash(newPassword, environment_1.config.BCRYPT_ROUNDS);
        // Update password
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash },
        });
        logger_1.logger.info(`Password changed for user: ${userId}`);
    }
    /**
     * Check project-level permissions for RBAC
     */
    async checkProjectPermission(userId, projectId, action) {
        // Get user's role in project
        const projectMember = await this.prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId,
                },
            },
        });
        if (!projectMember) {
            return false;
        }
        return this.hasPermission(projectMember.role, action);
    }
    /**
     * Helper method to check if role has permission
     */
    hasPermission(role, action) {
        const permissions = {
            OWNER: [
                'read',
                'create',
                'edit',
                'delete',
                'assign',
                'approve',
                'close',
                'manage_users',
            ],
            ADMIN: [
                'read',
                'create',
                'edit',
                'delete',
                'assign',
                'approve',
                'close',
                'manage_users',
            ],
            MANAGER: ['read', 'create', 'edit', 'assign', 'approve', 'close'],
            QA_LEAD: ['read', 'create', 'edit', 'assign', 'approve', 'close'],
            QA_ENGINEER: ['read', 'create', 'edit'],
            DEVELOPER: ['read'],
            TESTER: ['read'],
            VIEWER: ['read'],
        };
        return permissions[role]?.includes(action) || false;
    }
    /**
     * Generate JWT access token
     */
    generateAccessToken(user) {
        const roles = [
            user.role,
            ...(user.organizationMembers?.map((om) => om.role) || []),
        ];
        const payload = {
            userId: user.id,
            email: user.email,
            roles: [...new Set(roles)],
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + this.parseExpiryTime(environment_1.config.JWT_EXPIRY),
        };
        return jsonwebtoken_1.default.sign(payload, environment_1.config.JWT_SECRET);
    }
    /**
     * Generate refresh token and store in Redis
     */
    async generateRefreshToken(userId) {
        const tokenVersion = 1;
        const expirySeconds = this.parseExpiryTime(environment_1.config.REFRESH_TOKEN_EXPIRY);
        const payload = {
            userId,
            tokenVersion,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + expirySeconds,
        };
        const token = jsonwebtoken_1.default.sign(payload, environment_1.config.JWT_SECRET);
        // Note: In production, you might want to store token metadata in Redis
        // for better token revocation management
        return token;
    }
    /**
     * Parse expiry time string (e.g., "15m", "7d") to seconds
     */
    parseExpiryTime(expiryString) {
        const match = expiryString.match(/^(\d+)([mhdwy])$/);
        if (!match) {
            throw new Error(`Invalid expiry format: ${expiryString}`);
        }
        const [, value, unit] = match;
        const num = parseInt(value, 10);
        const unitMap = {
            m: 60,
            h: 60 * 60,
            d: 24 * 60 * 60,
            w: 7 * 24 * 60 * 60,
            y: 365 * 24 * 60 * 60,
        };
        return num * (unitMap[unit] || 1);
    }
    /**
     * Format user for response
     */
    formatAuthUser(user, organizationId) {
        const roles = [
            user.role,
            ...(user.organizationMembers?.map((om) => om.role) || []),
        ];
        return {
            userId: user.id,
            email: user.email,
            name: user.name,
            roles: [...new Set(roles)],
            organizationId,
        };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=AuthService.js.map