import { Request, Response } from 'express';
import { adminService } from '../services/AdminService';
import { logger } from '../config/logger';
import { AppError, ErrorCodes } from '../types/errors';

export class AdminController {
  /* ========================================
     USER MANAGEMENT
     ======================================== */

  /**
   * GET /api/v1/admin/users
   * List organization users with roles
   */
  async listUsers(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await adminService.listOrganizationUsers(organizationId, page, limit);

      res.json({
        status: 'success',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error listing users:', error);
      throw error;
    }
  }

  /**
   * POST /api/v1/admin/users/invite
   * Invite user by email (send invite email)
   */
  async inviteUser(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const userId = (req as any).user.id; // from auth middleware
      const { email, role } = req.body;

      if (!email) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Email is required');
      }

      const result = await adminService.inviteUser(organizationId, userId, email, role);

      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error inviting user:', error);
      throw error;
    }
  }

  /**
   * POST /api/v1/admin/auth/accept-invitation
   * Accept pending invitation
   */
  async acceptInvitation(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { token } = req.body;

      if (!token) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invitation token is required');
      }

      const result = await adminService.acceptInvitation(token, userId);

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * PUT /api/v1/admin/users/:userId/role
   * Update user role
   */
  async updateUserRole(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const userId = req.params.userId;
      const requestingUserId = (req as any).user.id;
      const { role } = req.body;

      if (!role) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Role is required');
      }

      const result = await adminService.updateUserRole(organizationId, userId, role, requestingUserId);

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error updating user role:', error);
      throw error;
    }
  }

  /**
   * DELETE /api/v1/admin/users/:userId
   * Deactivate user
   */
  async deactivateUser(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const userId = req.params.userId;
      const requestingUserId = (req as any).user.id;

      const result = await adminService.deactivateUser(organizationId, userId, requestingUserId);

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error deactivating user:', error);
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/users/:userId/activity
   * Get user activity log
   */
  async getUserActivity(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const userId = req.params.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await adminService.getUserActivityLog(organizationId, userId, page, limit);

      res.json({
        status: 'success',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error getting user activity:', error);
      throw error;
    }
  }

  /* ========================================
     PROJECT MANAGEMENT
     ======================================== */

  /**
   * GET /api/v1/admin/orgs/:organizationId/projects
   * List projects for organization
   */
  async listProjects(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const result = await adminService.listOrganizationProjects(organizationId);

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error listing projects:', error);
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/orgs/:organizationId/projects/:projectId
   * Get a single project
   */
  async getProject(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const projectId = req.params.projectId;
      const result = await adminService.getOrganizationProject(organizationId, projectId);

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error getting project:', error);
      throw error;
    }
  }

  /**
   * POST /api/v1/admin/projects
   * Create project
   */
  async createProject(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const userId = (req as any).user.id;
      const { name, description, settings } = req.body;

      if (!name) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Project name is required');
      }

      const result = await adminService.createProject(organizationId, userId, {
        name,
        description,
        settings,
      });

      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * PUT /api/v1/admin/projects/:projectId
   * Update project settings
   */
  async updateProject(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const projectId = req.params.projectId;
      const userId = (req as any).user.id;
      const updates = req.body;

      const result = await adminService.updateProjectSettings(organizationId, projectId, userId, updates);

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error updating project:', error);
      throw error;
    }
  }

  /**
   * POST /api/v1/admin/projects/:projectId/archive
   * Archive project
   */
  async archiveProject(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const projectId = req.params.projectId;
      const userId = (req as any).user.id;

      const result = await adminService.archiveProject(organizationId, projectId, userId);

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error archiving project:', error);
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/projects/:projectId/members
   * List project members
   */
  async getProjectMembers(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const projectId = req.params.projectId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await adminService.getProjectMembers(organizationId, projectId, page, limit);

      res.json({
        status: 'success',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error getting project members:', error);
      throw error;
    }
  }

  /**
   * POST /api/v1/admin/projects/:projectId/members
   * Add member with project-level role
   */
  async addProjectMember(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const projectId = req.params.projectId;
      const userId = (req as any).user.id;
      const { userId: memberUserId, role } = req.body;

      if (!memberUserId) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'User ID is required');
      }

      const result = await adminService.addProjectMember(
        organizationId,
        projectId,
        userId,
        memberUserId,
        role,
      );

      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error adding project member:', error);
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
  async listCustomFields(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;

      const result = await adminService.listCustomFields(organizationId);

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error listing custom fields:', error);
      throw error;
    }
  }

  /**
   * POST /api/v1/admin/custom-fields
   * Create custom field
   */
  async createCustomField(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const userId = (req as any).user.id;
      const { name, description, fieldType, isRequired, isGlobal, options, displayOrder } = req.body;

      if (!name || !fieldType) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Name and fieldType are required');
      }

      const result = await adminService.createCustomField(organizationId, userId, {
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
    } catch (error) {
      logger.error('Error creating custom field:', error);
      throw error;
    }
  }

  /**
   * PUT /api/v1/admin/custom-fields/:fieldId
   * Update custom field
   */
  async updateCustomField(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const fieldId = req.params.fieldId;
      const userId = (req as any).user.id;
      const updates = req.body;

      const result = await adminService.updateCustomField(organizationId, fieldId, userId, updates);

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error updating custom field:', error);
      throw error;
    }
  }

  /**
   * DELETE /api/v1/admin/custom-fields/:fieldId
   * Delete custom field
   */
  async deleteCustomField(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const fieldId = req.params.fieldId;
      const userId = (req as any).user.id;

      const result = await adminService.deleteCustomField(organizationId, fieldId, userId);

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error deleting custom field:', error);
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
  async getAuditLogs(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const filters = {
        userId: req.query.userId as string,
        entityType: req.query.entityType as string,
        entityId: req.query.entityId as string,
        action: req.query.action as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      };

      const result = await adminService.getAuditLogs(organizationId, filters, page, limit);

      res.json({
        status: 'success',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/audit-logs/export/csv
   * Export audit logs as CSV
   */
  async exportAuditLogs(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;

      const filters = {
        userId: req.query.userId as string,
        entityType: req.query.entityType as string,
        entityId: req.query.entityId as string,
        action: req.query.action as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      };

      const csv = await adminService.exportAuditLogsAsCSV(organizationId, filters);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
      res.send(csv);
    } catch (error) {
      logger.error('Error exporting audit logs:', error);
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
  async setRetentionPolicy(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;
      const userId = (req as any).user.id;
      const { name, description, entityType, actionType, retentionDays, filterCriteria, isActive } = req.body;

      if (!name || !entityType || !actionType || retentionDays === undefined) {
        throw new AppError(
          400,
          ErrorCodes.VALIDATION_ERROR,
          'name, entityType, actionType, and retentionDays are required',
        );
      }

      const result = await adminService.setRetentionPolicy(organizationId, userId, {
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
    } catch (error) {
      logger.error('Error setting retention policy:', error);
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/retention-policies
   * Get retention policies
   */
  async getRetentionPolicies(req: Request, res: Response) {
    try {
      const organizationId = req.params.organizationId;

      const result = await adminService.getRetentionPolicies(organizationId);

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error getting retention policies:', error);
      throw error;
    }
  }
}

export const adminController = new AdminController();
