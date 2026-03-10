"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminController = exports.AdminController = void 0;
const AdminService_1 = require("../services/AdminService");
const logger_1 = require("../config/logger");
const errors_1 = require("../types/errors");
class AdminController {
    /* ========================================
       USER MANAGEMENT
       ======================================== */
    /**
     * GET /api/v1/admin/users
     * List organization users with roles
     */
    async listUsers(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const result = await AdminService_1.adminService.listOrganizationUsers(organizationId, page, limit);
            res.json({
                status: 'success',
                data: result.data,
                pagination: result.pagination,
            });
        }
        catch (error) {
            logger_1.logger.error('Error listing users:', error);
            throw error;
        }
    }
    /**
     * POST /api/v1/admin/users/invite
     * Invite user by email (send invite email)
     */
    async inviteUser(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const userId = req.user.id; // from auth middleware
            const { email, role } = req.body;
            if (!email) {
                throw new errors_1.AppError(400, errors_1.ErrorCodes.VALIDATION_ERROR, 'Email is required');
            }
            const result = await AdminService_1.adminService.inviteUser(organizationId, userId, email, role);
            res.status(201).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Error inviting user:', error);
            throw error;
        }
    }
    /**
     * POST /api/v1/admin/auth/accept-invitation
     * Accept pending invitation
     */
    async acceptInvitation(req, res) {
        try {
            const userId = req.user.id;
            const { token } = req.body;
            if (!token) {
                throw new errors_1.AppError(400, errors_1.ErrorCodes.VALIDATION_ERROR, 'Invitation token is required');
            }
            const result = await AdminService_1.adminService.acceptInvitation(token, userId);
            res.json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Error accepting invitation:', error);
            throw error;
        }
    }
    /**
     * PUT /api/v1/admin/users/:userId/role
     * Update user role
     */
    async updateUserRole(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const userId = req.params.userId;
            const requestingUserId = req.user.id;
            const { role } = req.body;
            if (!role) {
                throw new errors_1.AppError(400, errors_1.ErrorCodes.VALIDATION_ERROR, 'Role is required');
            }
            const result = await AdminService_1.adminService.updateUserRole(organizationId, userId, role, requestingUserId);
            res.json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating user role:', error);
            throw error;
        }
    }
    /**
     * DELETE /api/v1/admin/users/:userId
     * Deactivate user
     */
    async deactivateUser(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const userId = req.params.userId;
            const requestingUserId = req.user.id;
            const result = await AdminService_1.adminService.deactivateUser(organizationId, userId, requestingUserId);
            res.json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Error deactivating user:', error);
            throw error;
        }
    }
    /**
     * GET /api/v1/admin/users/:userId/activity
     * Get user activity log
     */
    async getUserActivity(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const userId = req.params.userId;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const result = await AdminService_1.adminService.getUserActivityLog(organizationId, userId, page, limit);
            res.json({
                status: 'success',
                data: result.data,
                pagination: result.pagination,
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting user activity:', error);
            throw error;
        }
    }
    /* ========================================
       PROJECT MANAGEMENT
       ======================================== */
    /**
     * POST /api/v1/admin/projects
     * Create project
     */
    async createProject(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const userId = req.user.id;
            const { name, description, settings } = req.body;
            if (!name) {
                throw new errors_1.AppError(400, errors_1.ErrorCodes.VALIDATION_ERROR, 'Project name is required');
            }
            const result = await AdminService_1.adminService.createProject(organizationId, userId, {
                name,
                description,
                settings,
            });
            res.status(201).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Error creating project:', error);
            throw error;
        }
    }
    /**
     * PUT /api/v1/admin/projects/:projectId
     * Update project settings
     */
    async updateProject(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const projectId = req.params.projectId;
            const userId = req.user.id;
            const updates = req.body;
            const result = await AdminService_1.adminService.updateProjectSettings(organizationId, projectId, userId, updates);
            res.json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating project:', error);
            throw error;
        }
    }
    /**
     * POST /api/v1/admin/projects/:projectId/archive
     * Archive project
     */
    async archiveProject(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const projectId = req.params.projectId;
            const userId = req.user.id;
            const result = await AdminService_1.adminService.archiveProject(organizationId, projectId, userId);
            res.json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Error archiving project:', error);
            throw error;
        }
    }
    /**
     * GET /api/v1/admin/projects/:projectId/members
     * List project members
     */
    async getProjectMembers(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const projectId = req.params.projectId;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const result = await AdminService_1.adminService.getProjectMembers(organizationId, projectId, page, limit);
            res.json({
                status: 'success',
                data: result.data,
                pagination: result.pagination,
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting project members:', error);
            throw error;
        }
    }
    /**
     * POST /api/v1/admin/projects/:projectId/members
     * Add member with project-level role
     */
    async addProjectMember(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const projectId = req.params.projectId;
            const userId = req.user.id;
            const { userId: memberUserId, role } = req.body;
            if (!memberUserId) {
                throw new errors_1.AppError(400, errors_1.ErrorCodes.VALIDATION_ERROR, 'User ID is required');
            }
            const result = await AdminService_1.adminService.addProjectMember(organizationId, projectId, userId, memberUserId, role);
            res.status(201).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Error adding project member:', error);
            throw error;
        }
    }
    /* ========================================
       CUSTOM FIELDS
       ======================================== */
    /**
     * GET /api/v1/admin/custom-fields
     * List custom fields for organization
     */
    async listCustomFields(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const result = await AdminService_1.adminService.listCustomFields(organizationId);
            res.json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Error listing custom fields:', error);
            throw error;
        }
    }
    /**
     * POST /api/v1/admin/custom-fields
     * Create custom field
     */
    async createCustomField(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const userId = req.user.id;
            const { name, description, fieldType, isRequired, isGlobal, options, displayOrder } = req.body;
            if (!name || !fieldType) {
                throw new errors_1.AppError(400, errors_1.ErrorCodes.VALIDATION_ERROR, 'Name and fieldType are required');
            }
            const result = await AdminService_1.adminService.createCustomField(organizationId, userId, {
                name,
                description,
                fieldType,
                isRequired,
                isGlobal,
                options,
                displayOrder,
            });
            res.status(201).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Error creating custom field:', error);
            throw error;
        }
    }
    /**
     * PUT /api/v1/admin/custom-fields/:fieldId
     * Update custom field
     */
    async updateCustomField(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const fieldId = req.params.fieldId;
            const userId = req.user.id;
            const updates = req.body;
            const result = await AdminService_1.adminService.updateCustomField(organizationId, fieldId, userId, updates);
            res.json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating custom field:', error);
            throw error;
        }
    }
    /**
     * DELETE /api/v1/admin/custom-fields/:fieldId
     * Delete custom field
     */
    async deleteCustomField(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const fieldId = req.params.fieldId;
            const userId = req.user.id;
            const result = await AdminService_1.adminService.deleteCustomField(organizationId, fieldId, userId);
            res.json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Error deleting custom field:', error);
            throw error;
        }
    }
    /* ========================================
       AUDIT LOGS
       ======================================== */
    /**
     * GET /api/v1/admin/audit-logs
     * Paginated, filterable audit logs
     */
    async getAuditLogs(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const filters = {
                userId: req.query.userId,
                entityType: req.query.entityType,
                entityId: req.query.entityId,
                action: req.query.action,
                dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
            };
            const result = await AdminService_1.adminService.getAuditLogs(organizationId, filters, page, limit);
            res.json({
                status: 'success',
                data: result.data,
                pagination: result.pagination,
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting audit logs:', error);
            throw error;
        }
    }
    /**
     * GET /api/v1/admin/audit-logs/export/csv
     * Export audit logs as CSV
     */
    async exportAuditLogs(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const filters = {
                userId: req.query.userId,
                entityType: req.query.entityType,
                entityId: req.query.entityId,
                action: req.query.action,
                dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
            };
            const csv = await AdminService_1.adminService.exportAuditLogsAsCSV(organizationId, filters);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
            res.send(csv);
        }
        catch (error) {
            logger_1.logger.error('Error exporting audit logs:', error);
            throw error;
        }
    }
    /* ========================================
       DATA RETENTION
       ======================================== */
    /**
     * POST /api/v1/admin/retention-policies
     * Set retention policy
     */
    async setRetentionPolicy(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const userId = req.user.id;
            const { name, description, entityType, actionType, retentionDays, filterCriteria, isActive } = req.body;
            if (!name || !entityType || !actionType || retentionDays === undefined) {
                throw new errors_1.AppError(400, errors_1.ErrorCodes.VALIDATION_ERROR, 'name, entityType, actionType, and retentionDays are required');
            }
            const result = await AdminService_1.adminService.setRetentionPolicy(organizationId, userId, {
                name,
                description,
                entityType,
                actionType,
                retentionDays,
                filterCriteria,
                isActive,
            });
            res.status(201).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Error setting retention policy:', error);
            throw error;
        }
    }
    /**
     * GET /api/v1/admin/retention-policies
     * Get retention policies
     */
    async getRetentionPolicies(req, res) {
        try {
            const organizationId = req.params.organizationId;
            const result = await AdminService_1.adminService.getRetentionPolicies(organizationId);
            res.json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting retention policies:', error);
            throw error;
        }
    }
}
exports.AdminController = AdminController;
exports.adminController = new AdminController();
//# sourceMappingURL=AdminController.js.map