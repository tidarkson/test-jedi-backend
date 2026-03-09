import { UserRole } from '@prisma/client';
export interface JWTPayload {
    userId: string;
    email: string;
    roles: UserRole[];
    organizationId?: string;
    projectId?: string;
    iat: number;
    exp: number;
}
export interface RefreshTokenPayload {
    userId: string;
    tokenVersion: number;
    iat: number;
    exp: number;
}
export interface AuthUser {
    userId: string;
    email: string;
    name: string;
    roles: UserRole[];
    organizationId?: string;
    projectId?: string;
}
export interface PermissionCheck {
    action: string;
    resource: string;
    granted: boolean;
    reason?: string;
}
export type ProjectPermission = 'read' | 'create' | 'edit' | 'delete' | 'assign' | 'approve' | 'close' | 'manage_users';
//# sourceMappingURL=auth.d.ts.map