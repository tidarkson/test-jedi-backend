import { JWTPayload, AuthUser, ProjectPermission } from '../types/auth';
export declare class AuthService {
    private prisma;
    private redis;
    /**
     * Register a new user and create their organization
     */
    register(email: string, name: string, password: string, organizationName: string): Promise<{
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * Login user with email and password
     */
    login(email: string, password: string): Promise<{
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * Refresh access token using refresh token
     */
    refreshAccessToken(refreshToken: string): Promise<string>;
    /**
     * Logout user by revoking refresh token
     */
    logout(userId: string, tokenVersion: number): Promise<void>;
    /**
     * Verify and decode JWT token
     */
    verifyAccessToken(token: string): JWTPayload;
    /**
     * Get user profile
     */
    getUserProfile(userId: string): Promise<AuthUser>;
    /**
     * Change user password
     */
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    /**
     * Check project-level permissions for RBAC
     */
    checkProjectPermission(userId: string, projectId: string, action: ProjectPermission): Promise<boolean>;
    /**
     * Helper method to check if role has permission
     */
    private hasPermission;
    /**
     * Generate JWT access token
     */
    private generateAccessToken;
    /**
     * Generate refresh token and store in Redis
     */
    private generateRefreshToken;
    /**
     * Parse expiry time string (e.g., "15m", "7d") to seconds
     */
    private parseExpiryTime;
    /**
     * Format user for response
     */
    private formatAuthUser;
}
//# sourceMappingURL=AuthService.d.ts.map