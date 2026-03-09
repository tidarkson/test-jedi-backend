import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
export declare class AuthController {
    private authService;
    constructor();
    /**
     * POST /api/v1/auth/register
     * Register a new user and create organization
     */
    register(req: any, res: Response): Promise<void>;
    /**
     * POST /api/v1/auth/login
     * Login user and return tokens
     */
    login(req: any, res: Response): Promise<void>;
    /**
     * POST /api/v1/auth/refresh
     * Refresh access token
     */
    refresh(req: any, res: Response): Promise<void>;
    /**
     * POST /api/v1/auth/logout
     * Logout user and revoke refresh token
     */
    logout(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/auth/me
     * Get current user profile
     */
    getProfile(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * POST /api/v1/auth/change-password
     * Change user password
     */
    changePassword(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=AuthController.d.ts.map