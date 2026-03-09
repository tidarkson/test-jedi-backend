import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { UserRole } from '@prisma/client';
import { ProjectPermission } from '../types/auth';
/**
 * Middleware to authenticate JWT token
 */
export declare const authenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => any;
/**
 * Middleware to check if user has required roles
 */
export declare const requireRole: (...allowedRoles: UserRole[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => any;
/**
 * Middleware to check project-level permissions
 */
export declare const requireProjectPermission: (action: ProjectPermission) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>;
/**
 * Middleware to enforce two-factor authentication (optional)
 * Can be extended later for additional security
 */
export declare const require2FA: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => any;
//# sourceMappingURL=auth.d.ts.map