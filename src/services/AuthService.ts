import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User, UserRole } from '@prisma/client';
import { config } from '../config/environment';
import { getPrisma } from '../config/database';
import { getRedis } from '../config/redis';
import { logger } from '../config/logger';
import { AppError, ErrorCodes } from '../types/errors';
import {
  JWTPayload,
  RefreshTokenPayload,
  AuthUser,
  ProjectPermission,
} from '../types/auth';

export class AuthService {
  private prisma = getPrisma();
  private redis = getRedis();

  /**
   * Register a new user and create their organization
   */
  async register(
    email: string,
    name: string,
    password: string,
    organizationName: string,
  ): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(
        409,
        ErrorCodes.USER_ALREADY_EXISTS,
        'User with this email already exists',
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

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

    logger.info(`User registered: ${user.id} (${email})`);

    return {
      user: this.formatAuthUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user with email and password
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organizationMembers: true,
        projectMembers: true,
      },
    });

    if (!user) {
      throw new AppError(
        401,
        ErrorCodes.INVALID_CREDENTIALS,
        'Invalid email or password',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError(
        401,
        ErrorCodes.INVALID_CREDENTIALS,
        'Invalid email or password',
      );
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    logger.info(`User logged in: ${user.id} (${email})`);

    return {
      user: this.formatAuthUser(user, user.organizationMembers[0]?.organizationId),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      // Verify refresh token
      const payload = jwt.verify(
        refreshToken,
        config.JWT_SECRET,
      ) as RefreshTokenPayload;

      // Check token revocation
      const isRevoked = await this.redis.get(
        `revoked:${payload.userId}:${payload.tokenVersion}`,
      );

      if (isRevoked) {
        throw new AppError(
          401,
          ErrorCodes.EXPIRED_TOKEN,
          'Refresh token has been revoked',
        );
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
        throw new AppError(
          401,
          ErrorCodes.USER_NOT_FOUND,
          'User not found',
        );
      }

      // Generate new access token
      const newAccessToken = this.generateAccessToken(user);

      logger.info(`Access token refreshed for user: ${user.id}`);

      return newAccessToken;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(
          401,
          ErrorCodes.EXPIRED_TOKEN,
          'Refresh token has expired',
        );
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError(
          401,
          ErrorCodes.INVALID_TOKEN,
          'Invalid refresh token',
        );
      }
      throw error;
    }
  }

  /**
   * Logout user by revoking refresh token
   */
  async logout(userId: string, tokenVersion: number): Promise<void> {
    // Revoke refresh token in Redis
    const ttl = 7 * 24 * 60 * 60; // 7 days in seconds
    await this.redis.setex(
      `revoked:${userId}:${tokenVersion}`,
      ttl,
      'revoked',
    );

    logger.info(`User logged out: ${userId}`);
  }

  /**
   * Verify and decode JWT token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(
          401,
          ErrorCodes.EXPIRED_TOKEN,
          'Access token has expired',
        );
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError(
          401,
          ErrorCodes.INVALID_TOKEN,
          'Invalid access token',
        );
      }
      throw new AppError(
        401,
        ErrorCodes.INVALID_TOKEN,
        'Token verification failed',
      );
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizationMembers: true,
      },
    });

    if (!user) {
      throw new AppError(
        404,
        ErrorCodes.USER_NOT_FOUND,
        'User not found',
      );
    }

    return this.formatAuthUser(user, user.organizationMembers[0]?.organizationId);
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(
        404,
        ErrorCodes.USER_NOT_FOUND,
        'User not found',
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new AppError(
        401,
        ErrorCodes.INVALID_CREDENTIALS,
        'Current password is incorrect',
      );
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    logger.info(`Password changed for user: ${userId}`);
  }

  /**
   * Check project-level permissions for RBAC
   */
  async checkProjectPermission(
    userId: string,
    projectId: string,
    action: ProjectPermission,
  ): Promise<boolean> {
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
  private hasPermission(role: UserRole, action: ProjectPermission): boolean {
    const permissions: Record<UserRole, ProjectPermission[]> = {
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
  private generateAccessToken(user: User & any): string {
    const roles = [
      user.role,
      ...(user.organizationMembers?.map((om: any) => om.role) || []),
    ];

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      roles: [...new Set(roles)],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiryTime(config.JWT_EXPIRY),
    };

    return jwt.sign(payload, config.JWT_SECRET);
  }

  /**
   * Generate refresh token and store in Redis
   */
  private async generateRefreshToken(userId: string): Promise<string> {
    const tokenVersion = 1;
    const expirySeconds = this.parseExpiryTime(config.REFRESH_TOKEN_EXPIRY);

    const payload: RefreshTokenPayload = {
      userId,
      tokenVersion,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expirySeconds,
    };

    const token = jwt.sign(payload, config.JWT_SECRET);

    // Note: In production, you might want to store token metadata in Redis
    // for better token revocation management

    return token;
  }

  /**
   * Parse expiry time string (e.g., "15m", "7d") to seconds
   */
  private parseExpiryTime(expiryString: string): number {
    const match = expiryString.match(/^(\d+)([mhdwy])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiryString}`);
    }

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    const unitMap: Record<string, number> = {
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
  private formatAuthUser(user: User & any, organizationId?: string): AuthUser {
    const roles = [
      user.role,
      ...(user.organizationMembers?.map((om: any) => om.role) || []),
    ];

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      roles: [...new Set(roles)] as UserRole[],
      organizationId,
    };
  }
}
