import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { AppError, ErrorCodes } from '../types/errors';
import { AuthService } from '../services/AuthService';
import { UserRole } from '@prisma/client';
import { ProjectPermission } from '../types/auth';
import { logger } from '../config/logger';

const authService = new AuthService();

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): any => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        error: ErrorCodes.MISSING_TOKEN,
        message: 'No authentication token provided',
      });
    }

    const token = authHeader.slice(7);

    try {
      const payload = authService.verifyAccessToken(token);
      const normalizedUserId = (payload as any).userId || (payload as any).id;
      const normalizedRoles = Array.isArray((payload as any).roles)
        ? (payload as any).roles
        : (payload as any).role
          ? [(payload as any).role]
          : [];

      (req as any).user = {
        userId: normalizedUserId,
        id: normalizedUserId,
        email: payload.email,
        name: '',
        roles: normalizedRoles,
        organizationId: (payload as any).organizationId,
        projectId: (payload as any).projectId,
      };
      req.token = token;
      next();
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          code: error.statusCode,
          error: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  } catch (error: any) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      code: 500,
      error: ErrorCodes.INTERNAL_SERVER_ERROR,
      message: 'Authentication failed',
    });
  }
};

/**
 * Middleware to check if user has required roles
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        error: ErrorCodes.UNAUTHORIZED,
        message: 'Unauthorized',
      });
    }

    const hasRole = req.user.roles.some((role) =>
      allowedRoles.includes(role as UserRole),
    );

    if (!hasRole) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        error: ErrorCodes.FORBIDDEN,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Middleware to check project-level permissions
 */
export const requireProjectPermission = (action: ProjectPermission) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          code: 401,
          error: ErrorCodes.UNAUTHORIZED,
          message: 'Unauthorized',
        });
      }

      const projectId = req.params.projectId || req.body.projectId;

      if (!projectId) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Project ID is required',
        });
      }

      // Check if user has permission for this project
      const hasPermission = await authService.checkProjectPermission(
        req.user.userId,
        projectId,
        action,
      );

      if (!hasPermission) {
        return res.status(403).json({
          status: 'error',
          code: 403,
          error: ErrorCodes.FORBIDDEN,
          message: `You don't have permission to ${action} in this project`,
        });
      }

      next();
    } catch (error: any) {
      logger.error(`Permission check error: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        code: 500,
        error: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Permission check failed',
      });
    }
  };
};

/**
 * Middleware to enforce two-factor authentication (optional)
 * Can be extended later for additional security
 */
export const require2FA = (
  _req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): any => {
  // To be implemented if 2FA is needed
  next();
};
