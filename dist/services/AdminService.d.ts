import { UserRole } from '@prisma/client';
export declare class AdminService {
    private prisma;
    /**
     * Get all users in an organization with their roles
     */
    listOrganizationUsers(organizationId: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
            avatarUrl: string | null;
            lastLoginAt: Date | null;
            joinedAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    /**
     * Invite user to organization by email
     */
    inviteUser(organizationId: string, inviterUserId: string, email: string, role?: UserRole): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        status: string;
        expiresAt: Date;
        emailSent: boolean;
    }>;
    /**
     * Accept pending invitation and add user to organization
     */
    acceptInvitation(token: string, userId: string): Promise<{
        id: string;
        status: string;
    }>;
    /**
     * Update user role in organization
     */
    updateUserRole(organizationId: string, userId: string, newRole: UserRole, requestingUserId: string): Promise<{
        id: string;
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    /**
     * Deactivate user (soft delete from organization)
     */
    deactivateUser(organizationId: string, userId: string, requestingUserId: string): Promise<{
        id: string;
        status: string;
    }>;
    /**
     * Get user activity log
     */
    getUserActivityLog(organizationId: string, userId: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            action: import(".prisma/client").$Enums.AuditAction;
            entityType: string;
            entityId: string;
            diff: import("@prisma/client/runtime/library").JsonValue;
            createdAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    /**
     * List projects in an organization
     */
    listOrganizationProjects(organizationId: string): Promise<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    /**
     * Get a single project in an organization
     */
    getOrganizationProject(organizationId: string, projectId: string): Promise<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Create new project
     */
    createProject(organizationId: string, userId: string, data: {
        name: string;
        description?: string;
        settings?: Record<string, any>;
    }): Promise<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
    }>;
    /**
     * Update project settings
     */
    updateProjectSettings(organizationId: string, projectId: string, userId: string, updates: Record<string, any>): Promise<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
    }>;
    /**
     * Archive project
     */
    archiveProject(organizationId: string, projectId: string, userId: string): Promise<{
        id: string;
        archived: boolean;
    }>;
    /**
     * Get project members
     */
    getProjectMembers(organizationId: string, projectId: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
            avatarUrl: string | null;
            joinedAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    /**
     * Add member to project with role
     */
    addProjectMember(organizationId: string, projectId: string, userId: string, memberUserId: string, role?: UserRole): Promise<{
        id: string;
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    /**
     * List custom fields for organization
     */
    listCustomFields(organizationId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        fieldType: string;
        isRequired: boolean;
        isGlobal: boolean;
        options: import("@prisma/client/runtime/library").JsonValue;
        displayOrder: number;
    }[]>;
    /**
     * Create custom field
     */
    createCustomField(organizationId: string, userId: string, data: {
        name: string;
        description?: string;
        fieldType: string;
        isRequired?: boolean;
        isGlobal?: boolean;
        options?: any[];
        displayOrder?: number;
    }): Promise<{
        id: string;
        name: string;
        fieldType: string;
        isRequired: boolean;
    }>;
    /**
     * Update custom field
     */
    updateCustomField(organizationId: string, fieldId: string, userId: string, updates: Record<string, any>): Promise<{
        id: string;
        name: string;
        fieldType: string;
    }>;
    /**
     * Delete custom field
     */
    deleteCustomField(organizationId: string, fieldId: string, userId: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    /**
     * Get paginated, filterable audit logs
     */
    getAuditLogs(organizationId: string, filters?: {
        userId?: string;
        entityType?: string;
        entityId?: string;
        action?: string;
        dateFrom?: Date;
        dateTo?: Date;
    }, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            action: import(".prisma/client").$Enums.AuditAction;
            entityType: string;
            entityId: string;
            user: {
                name: string;
                id: string;
                email: string;
            };
            diff: import("@prisma/client/runtime/library").JsonValue;
            createdAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    /**
     * Export audit logs as CSV
     */
    exportAuditLogsAsCSV(organizationId: string, filters?: {
        userId?: string;
        entityType?: string;
        entityId?: string;
        action?: string;
        dateFrom?: Date;
        dateTo?: Date;
    }): Promise<string>;
    /**
     * Set retention policy
     */
    setRetentionPolicy(organizationId: string, userId: string, data: {
        name: string;
        description?: string;
        entityType: string;
        actionType: string;
        retentionDays: number;
        filterCriteria?: Record<string, any>;
        isActive?: boolean;
    }): Promise<{
        id: string;
        name: string;
        entityType: string;
        retentionDays: number;
        isActive: boolean;
    }>;
    /**
     * Get retention policies for organization
     */
    getRetentionPolicies(organizationId: string): Promise<{
        id: string;
        name: string;
        entityType: string;
        actionType: string;
        retentionDays: number;
        isActive: boolean;
        lastRunAt: Date | null;
    }[]>;
    /**
     * Create audit log entry (immutable)
     */
    private createAuditLog;
    /**
     * Verify user has access to project
     */
    private verifyProjectAccess;
}
export declare const adminService: AdminService;
//# sourceMappingURL=AdminService.d.ts.map