import { Request, Response } from 'express';
export declare class AdminController {
    /**
     * GET /api/v1/admin/users
     * List organization users with roles
     */
    listUsers(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/v1/admin/users/invite
     * Invite user by email (send invite email)
     */
    inviteUser(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/v1/admin/auth/accept-invitation
     * Accept pending invitation
     */
    acceptInvitation(req: Request, res: Response): Promise<void>;
    /**
     * PUT /api/v1/admin/users/:userId/role
     * Update user role
     */
    updateUserRole(req: Request, res: Response): Promise<void>;
    /**
     * DELETE /api/v1/admin/users/:userId
     * Deactivate user
     */
    deactivateUser(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/v1/admin/users/:userId/activity
     * Get user activity log
     */
    getUserActivity(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/v1/admin/orgs/:organizationId/projects
     * List projects for organization
     */
    listProjects(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/v1/admin/orgs/:organizationId/projects/:projectId
     * Get a single project
     */
    getProject(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/v1/admin/projects
     * Create project
     */
    createProject(req: Request, res: Response): Promise<void>;
    /**
     * PUT /api/v1/admin/projects/:projectId
     * Update project settings
     */
    updateProject(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/v1/admin/projects/:projectId/archive
     * Archive project
     */
    archiveProject(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/v1/admin/projects/:projectId/members
     * List project members
     */
    getProjectMembers(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/v1/admin/projects/:projectId/members
     * Add member with project-level role
     */
    addProjectMember(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/v1/admin/custom-fields
     * List custom fields for organization
     */
    listCustomFields(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/v1/admin/custom-fields
     * Create custom field
     */
    createCustomField(req: Request, res: Response): Promise<void>;
    /**
     * PUT /api/v1/admin/custom-fields/:fieldId
     * Update custom field
     */
    updateCustomField(req: Request, res: Response): Promise<void>;
    /**
     * DELETE /api/v1/admin/custom-fields/:fieldId
     * Delete custom field
     */
    deleteCustomField(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/v1/admin/audit-logs
     * Paginated, filterable audit logs
     */
    getAuditLogs(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/v1/admin/audit-logs/export/csv
     * Export audit logs as CSV
     */
    exportAuditLogs(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/v1/admin/retention-policies
     * Set retention policy
     */
    setRetentionPolicy(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/v1/admin/retention-policies
     * Get retention policies
     */
    getRetentionPolicies(req: Request, res: Response): Promise<void>;
}
export declare const adminController: AdminController;
//# sourceMappingURL=AdminController.d.ts.map