"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminService = exports.AdminService = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const mailer_1 = require("../utils/mailer");
const environment_1 = require("../config/environment");
const errors_1 = require("../types/errors");
const date_fns_1 = require("date-fns");
class AdminService {
    constructor() {
        this.prisma = (0, database_1.getPrisma)();
    }
    /* ========================================
       USER MANAGEMENT
       ======================================== */
    /**
     * Get all users in an organization with their roles
     */
    async listOrganizationUsers(organizationId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            this.prisma.organizationMember.findMany({
                where: { organizationId },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            avatarUrl: true,
                            lastLoginAt: true,
                            createdAt: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.organizationMember.count({ where: { organizationId } }),
        ]);
        return {
            data: users.map(m => ({
                id: m.user.id,
                email: m.user.email,
                name: m.user.name,
                role: m.role,
                avatarUrl: m.user.avatarUrl,
                lastLoginAt: m.user.lastLoginAt,
                joinedAt: m.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Invite user to organization by email
     */
    async inviteUser(organizationId, inviterUserId, email, role = 'ADMIN') {
        // Verify organization exists
        const org = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            include: {
                members: {
                    where: { userId: inviterUserId },
                },
            },
        });
        if (!org) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Organization not found');
        }
        // Verify inviter is ADMIN or OWNER
        const inviterMembership = org.members[0];
        if (!inviterMembership || (inviterMembership.role !== 'ADMIN' && inviterMembership.role !== 'OWNER')) {
            throw new errors_1.AppError(403, errors_1.ErrorCodes.FORBIDDEN, 'Only ADMIN or OWNER can invite users');
        }
        // Check if user exists in system
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            const isMember = await this.prisma.organizationMember.findUnique({
                where: {
                    organizationId_userId: {
                        organizationId,
                        userId: existingUser.id,
                    },
                },
            });
            if (isMember) {
                throw new errors_1.AppError(409, errors_1.ErrorCodes.USER_ALREADY_EXISTS, 'User already member of organization');
            }
        }
        // Check if invitation already pending
        const existingInvitation = await this.prisma.pendingInvitation.findUnique({
            where: {
                organizationId_email: {
                    organizationId,
                    email,
                },
            },
        });
        if (existingInvitation && existingInvitation.status === 'PENDING') {
            throw new errors_1.AppError(409, errors_1.ErrorCodes.USER_ALREADY_EXISTS, 'Invitation already pending for this email');
        }
        // Create invitation with token
        const token = (0, uuid_1.v4)();
        const expiresAt = (0, date_fns_1.addDays)(new Date(), 7);
        const invitation = await this.prisma.pendingInvitation.create({
            data: {
                organizationId,
                email,
                inviterUserId,
                role,
                token,
                expiresAt,
                status: 'PENDING',
            },
            include: {
                organization: true,
                inviter: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        // Send invitation email
        const inviteLink = `${environment_1.config.FRONTEND_URL}/auth/accept-invitation?token=${token}`;
        const emailSent = await mailer_1.emailService.sendInvitationEmail(email, invitation.organization.name, invitation.inviter.name, inviteLink);
        logger_1.logger.info(`Invitation created for ${email} to org ${organizationId}. Email sent: ${emailSent}`);
        return {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
            emailSent,
        };
    }
    /**
     * Accept pending invitation and add user to organization
     */
    async acceptInvitation(token, userId) {
        const invitation = await this.prisma.pendingInvitation.findUnique({
            where: { token },
        });
        if (!invitation) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Invitation not found');
        }
        // Check if expired
        if ((0, date_fns_1.isPast)(invitation.expiresAt)) {
            throw new errors_1.AppError(410, errors_1.ErrorCodes.EXPIRED, 'Invitation has expired');
        }
        if (invitation.status !== 'PENDING') {
            throw new errors_1.AppError(400, errors_1.ErrorCodes.INVALID_REQUEST, `Invitation already ${invitation.status.toLowerCase()}`);
        }
        // Verify email matches
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user || user.email !== invitation.email) {
            throw new errors_1.AppError(400, errors_1.ErrorCodes.INVALID_REQUEST, 'Email does not match invitation');
        }
        // Add user to organization
        await this.prisma.organizationMember.create({
            data: {
                organizationId: invitation.organizationId,
                userId,
                role: invitation.role,
            },
        });
        // Mark invitation as accepted
        await this.prisma.pendingInvitation.update({
            where: { id: invitation.id },
            data: { status: 'ACCEPTED' },
        });
        // Create audit log
        await this.createAuditLog(invitation.organizationId, userId, 'User', userId, 'CREATE', { role: invitation.role });
        logger_1.logger.info(`User ${userId} accepted invitation to org ${invitation.organizationId}`);
        return { id: invitation.id, status: 'ACCEPTED' };
    }
    /**
     * Update user role in organization
     */
    async updateUserRole(organizationId, userId, newRole, requestingUserId) {
        // Verify requesting user is ADMIN or OWNER
        const requestingMembership = await this.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId: requestingUserId,
                },
            },
        });
        if (!requestingMembership || (requestingMembership.role !== 'ADMIN' && requestingMembership.role !== 'OWNER')) {
            throw new errors_1.AppError(403, errors_1.ErrorCodes.FORBIDDEN, 'Only ADMIN or OWNER can update roles');
        }
        // Get existing role
        const membership = await this.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId,
                },
            },
            include: {
                user: true,
            },
        });
        if (!membership) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'User not found in organization');
        }
        const oldRole = membership.role;
        // Update role
        const updated = await this.prisma.organizationMember.update({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId,
                },
            },
            data: { role: newRole },
            include: { user: true },
        });
        // Send notification email
        await mailer_1.emailService.sendRoleUpdateEmail(updated.user.email, (await this.prisma.organization.findUnique({ where: { id: organizationId } }))?.name || '', newRole);
        // Create audit log
        await this.createAuditLog(organizationId, requestingUserId, 'User', userId, 'UPDATE', { oldRole, newRole });
        logger_1.logger.info(`User ${userId} role updated from ${oldRole} to ${newRole} in org ${organizationId}`);
        return {
            id: userId,
            email: updated.user.email,
            name: updated.user.name,
            role: updated.role,
        };
    }
    /**
     * Deactivate user (soft delete from organization)
     */
    async deactivateUser(organizationId, userId, requestingUserId) {
        // Verify requesting user is ADMIN or OWNER
        const requestingMembership = await this.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId: requestingUserId,
                },
            },
        });
        if (!requestingMembership || (requestingMembership.role !== 'ADMIN' && requestingMembership.role !== 'OWNER')) {
            throw new errors_1.AppError(403, errors_1.ErrorCodes.FORBIDDEN, 'Only ADMIN or OWNER can deactivate users');
        }
        // Can't deactivate yourself
        if (userId === requestingUserId) {
            throw new errors_1.AppError(400, errors_1.ErrorCodes.INVALID_REQUEST, 'Cannot deactivate your own account');
        }
        const membership = await this.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId,
                },
            },
            include: { user: true },
        });
        if (!membership) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'User not found in organization');
        }
        // Delete organization membership (deactivate)
        await this.prisma.organizationMember.delete({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId,
                },
            },
        });
        // Send deactivation email
        await mailer_1.emailService.sendDeactivationEmail(membership.user.email, (await this.prisma.organization.findUnique({ where: { id: organizationId } }))?.name || '');
        // Create audit log
        await this.createAuditLog(organizationId, requestingUserId, 'User', userId, 'DELETE', { email: membership.user.email });
        logger_1.logger.info(`User ${userId} deactivated from org ${organizationId}`);
        return { id: userId, status: 'DEACTIVATED' };
    }
    /**
     * Get user activity log
     */
    async getUserActivityLog(organizationId, userId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where: {
                    organizationId,
                    userId,
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.auditLog.count({
                where: {
                    organizationId,
                    userId,
                },
            }),
        ]);
        return {
            data: logs.map(log => ({
                id: log.id,
                action: log.action,
                entityType: log.entityType,
                entityId: log.entityId,
                diff: log.diff,
                createdAt: log.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    /* ========================================
       PROJECT MANAGEMENT
       ======================================== */
    /**
     * List projects in an organization
     */
    async listOrganizationProjects(organizationId) {
        const projects = await this.prisma.project.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });
        return projects.map((project) => ({
            id: project.id,
            name: project.name,
            slug: project.slug,
            description: project.description,
            settings: project.settings,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        }));
    }
    /**
     * Get a single project in an organization
     */
    async getOrganizationProject(organizationId, projectId) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project || project.organizationId !== organizationId) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Project not found');
        }
        return {
            id: project.id,
            name: project.name,
            slug: project.slug,
            description: project.description,
            settings: project.settings,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
    }
    /**
     * Create new project
     */
    async createProject(organizationId, userId, data) {
        const slug = data.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        const project = await this.prisma.project.create({
            data: {
                organizationId,
                name: data.name,
                slug,
                description: data.description,
                settings: data.settings || {},
            },
        });
        // Add creator as project member with ADMIN role
        await this.prisma.projectMember.create({
            data: {
                projectId: project.id,
                userId,
                role: 'ADMIN',
            },
        });
        // Create audit log
        await this.createAuditLog(organizationId, userId, 'Project', project.id, 'CREATE', { name: project.name });
        logger_1.logger.info(`Project created: ${project.id} in org ${organizationId}`);
        return {
            id: project.id,
            name: project.name,
            slug: project.slug,
            description: project.description,
        };
    }
    /**
     * Update project settings
     */
    async updateProjectSettings(organizationId, projectId, userId, updates) {
        // Verify access
        await this.verifyProjectAccess(organizationId, projectId, userId, ['ADMIN', 'OWNER']);
        const oldProject = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        const updated = await this.prisma.project.update({
            where: { id: projectId },
            data: updates,
        });
        // Create audit log
        await this.createAuditLog(organizationId, userId, 'Project', projectId, 'UPDATE', { before: oldProject, after: updated });
        return {
            id: updated.id,
            name: updated.name,
            slug: updated.slug,
            description: updated.description,
        };
    }
    /**
     * Archive project
     */
    async archiveProject(organizationId, projectId, userId) {
        // Verify access
        await this.verifyProjectAccess(organizationId, projectId, userId, ['ADMIN', 'OWNER']);
        await this.prisma.project.update({
            where: { id: projectId },
            data: {
                settings: {
                    archived: true,
                    archivedAt: new Date().toISOString(),
                },
            },
        });
        // Create audit log
        await this.createAuditLog(organizationId, userId, 'Project', projectId, 'UPDATE', { archived: true });
        logger_1.logger.info(`Project ${projectId} archived`);
        return { id: projectId, archived: true };
    }
    /**
     * Get project members
     */
    async getProjectMembers(organizationId, projectId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const [members, total] = await Promise.all([
            this.prisma.projectMember.findMany({
                where: { projectId },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            avatarUrl: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.projectMember.count({ where: { projectId } }),
        ]);
        // Verify org access
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project || project.organizationId !== organizationId) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Project not found');
        }
        return {
            data: members.map(m => ({
                id: m.user.id,
                email: m.user.email,
                name: m.user.name,
                role: m.role,
                avatarUrl: m.user.avatarUrl,
                joinedAt: m.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Add member to project with role
     */
    async addProjectMember(organizationId, projectId, userId, memberUserId, role = 'QA_ENGINEER') {
        // Verify access
        await this.verifyProjectAccess(organizationId, projectId, userId, ['ADMIN', 'OWNER']);
        // Verify user exists in organization
        const orgMember = await this.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId: memberUserId,
                },
            },
        });
        if (!orgMember) {
            throw new errors_1.AppError(400, errors_1.ErrorCodes.INVALID_REQUEST, 'User is not a member of this organization');
        }
        // Check if already a member
        const existing = await this.prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId: memberUserId,
                },
            },
        });
        if (existing) {
            throw new errors_1.AppError(409, errors_1.ErrorCodes.USER_ALREADY_EXISTS, 'User already member of project');
        }
        const member = await this.prisma.projectMember.create({
            data: {
                projectId,
                userId: memberUserId,
                role,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });
        // Create audit log
        await this.createAuditLog(organizationId, userId, 'ProjectMember', member.id, 'CREATE', { userId: memberUserId, role });
        return {
            id: member.user.id,
            email: member.user.email,
            name: member.user.name,
            role: member.role,
        };
    }
    /* ========================================
       CUSTOM FIELDS
       ======================================== */
    /**
     * List custom fields for organization
     */
    async listCustomFields(organizationId) {
        const fields = await this.prisma.customField.findMany({
            where: { organizationId },
            orderBy: { displayOrder: 'asc' },
        });
        return fields.map(f => ({
            id: f.id,
            name: f.name,
            description: f.description,
            fieldType: f.fieldType,
            isRequired: f.isRequired,
            isGlobal: f.isGlobal,
            options: f.options,
            displayOrder: f.displayOrder,
        }));
    }
    /**
     * Create custom field
     */
    async createCustomField(organizationId, userId, data) {
        // Verify user is ADMIN
        const member = await this.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId,
                },
            },
        });
        if (!member || (member.role !== 'ADMIN' && member.role !== 'OWNER')) {
            throw new errors_1.AppError(403, errors_1.ErrorCodes.FORBIDDEN, 'Only ADMIN or OWNER can create custom fields');
        }
        // Check for duplicate name
        const existing = await this.prisma.customField.findFirst({
            where: {
                organizationId,
                name: data.name,
            },
        });
        if (existing) {
            throw new errors_1.AppError(409, errors_1.ErrorCodes.USER_ALREADY_EXISTS, 'Custom field with this name already exists');
        }
        const field = await this.prisma.customField.create({
            data: {
                organizationId,
                name: data.name,
                description: data.description,
                fieldType: data.fieldType,
                isRequired: data.isRequired ?? false,
                isGlobal: data.isGlobal ?? true,
                options: data.options ? data.options : undefined,
                displayOrder: data.displayOrder ?? 0,
            },
        });
        // Create audit log
        await this.createAuditLog(organizationId, userId, 'CustomField', field.id, 'CREATE', { name: field.name, fieldType: field.fieldType });
        return {
            id: field.id,
            name: field.name,
            fieldType: field.fieldType,
            isRequired: field.isRequired,
        };
    }
    /**
     * Update custom field
     */
    async updateCustomField(organizationId, fieldId, userId, updates) {
        // Verify user is ADMIN
        const member = await this.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId,
                },
            },
        });
        if (!member || (member.role !== 'ADMIN' && member.role !== 'OWNER')) {
            throw new errors_1.AppError(403, errors_1.ErrorCodes.FORBIDDEN, 'Only ADMIN or OWNER can update custom fields');
        }
        const field = await this.prisma.customField.findUnique({
            where: { id: fieldId },
        });
        if (!field || field.organizationId !== organizationId) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Custom field not found');
        }
        const updated = await this.prisma.customField.update({
            where: { id: fieldId },
            data: updates,
        });
        // Create audit log
        await this.createAuditLog(organizationId, userId, 'CustomField', fieldId, 'UPDATE', updates);
        return {
            id: updated.id,
            name: updated.name,
            fieldType: updated.fieldType,
        };
    }
    /**
     * Delete custom field
     */
    async deleteCustomField(organizationId, fieldId, userId) {
        // Verify user is ADMIN
        const member = await this.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId,
                },
            },
        });
        if (!member || (member.role !== 'ADMIN' && member.role !== 'OWNER')) {
            throw new errors_1.AppError(403, errors_1.ErrorCodes.FORBIDDEN, 'Only ADMIN or OWNER can delete custom fields');
        }
        const field = await this.prisma.customField.findUnique({
            where: { id: fieldId },
        });
        if (!field || field.organizationId !== organizationId) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Custom field not found');
        }
        // Delete field values first
        await this.prisma.customFieldValue.deleteMany({
            where: { fieldId },
        });
        // Delete field
        await this.prisma.customField.delete({
            where: { id: fieldId },
        });
        // Create audit log
        await this.createAuditLog(organizationId, userId, 'CustomField', fieldId, 'DELETE', { name: field.name });
        logger_1.logger.info(`Custom field ${fieldId} deleted`);
        return { id: fieldId, deleted: true };
    }
    /* ========================================
       AUDIT LOGS
       ======================================== */
    /**
     * Get paginated, filterable audit logs
     */
    async getAuditLogs(organizationId, filters, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const where = { organizationId };
        if (filters?.userId)
            where.userId = filters.userId;
        if (filters?.entityType)
            where.entityType = filters.entityType;
        if (filters?.entityId)
            where.entityId = filters.entityId;
        if (filters?.action)
            where.action = filters.action;
        if (filters?.dateFrom || filters?.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom)
                where.createdAt.gte = filters.dateFrom;
            if (filters.dateTo)
                where.createdAt.lte = filters.dateTo;
        }
        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return {
            data: logs.map(log => ({
                id: log.id,
                action: log.action,
                entityType: log.entityType,
                entityId: log.entityId,
                user: log.user,
                diff: log.diff,
                createdAt: log.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Export audit logs as CSV
     */
    async exportAuditLogsAsCSV(organizationId, filters) {
        const where = { organizationId };
        if (filters?.userId)
            where.userId = filters.userId;
        if (filters?.entityType)
            where.entityType = filters.entityType;
        if (filters?.entityId)
            where.entityId = filters.entityId;
        if (filters?.action)
            where.action = filters.action;
        if (filters?.dateFrom || filters?.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom)
                where.createdAt.gte = filters.dateFrom;
            if (filters.dateTo)
                where.createdAt.lte = filters.dateTo;
        }
        const logs = await this.prisma.auditLog.findMany({
            where,
            include: {
                user: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        // Build CSV
        const headers = ['Timestamp', 'User Email', 'User Name', 'Action', 'Entity Type', 'Entity ID', 'Changes'];
        const rows = logs.map(log => [
            log.createdAt.toISOString(),
            log.user.email,
            log.user.name,
            log.action,
            log.entityType,
            log.entityId,
            log.diff ? JSON.stringify(log.diff) : '',
        ]);
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        return csv;
    }
    /* ========================================
       DATA RETENTION
       ======================================== */
    /**
     * Set retention policy
     */
    async setRetentionPolicy(organizationId, userId, data) {
        // Verify user is ADMIN
        const member = await this.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId,
                },
            },
        });
        if (!member || (member.role !== 'ADMIN' && member.role !== 'OWNER')) {
            throw new errors_1.AppError(403, errors_1.ErrorCodes.FORBIDDEN, 'Only ADMIN or OWNER can set retention policies');
        }
        const policy = await this.prisma.retentionPolicy.create({
            data: {
                organizationId,
                name: data.name,
                description: data.description,
                entityType: data.entityType,
                actionType: data.actionType,
                retentionDays: data.retentionDays,
                filterCriteria: data.filterCriteria ? data.filterCriteria : undefined,
                isActive: data.isActive ?? true,
            },
        });
        // Create audit log
        await this.createAuditLog(organizationId, userId, 'RetentionPolicy', policy.id, 'CREATE', {
            name: policy.name,
            entityType: policy.entityType,
            retentionDays: policy.retentionDays,
        });
        logger_1.logger.info(`Retention policy created: ${policy.id}`);
        return {
            id: policy.id,
            name: policy.name,
            entityType: policy.entityType,
            retentionDays: policy.retentionDays,
            isActive: policy.isActive,
        };
    }
    /**
     * Get retention policies for organization
     */
    async getRetentionPolicies(organizationId) {
        const policies = await this.prisma.retentionPolicy.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });
        return policies.map(p => ({
            id: p.id,
            name: p.name,
            entityType: p.entityType,
            actionType: p.actionType,
            retentionDays: p.retentionDays,
            isActive: p.isActive,
            lastRunAt: p.lastRunAt,
        }));
    }
    /* ========================================
       INTERNAL UTILITIES
       ======================================== */
    /**
     * Create audit log entry (immutable)
     */
    async createAuditLog(organizationId, userId, entityType, entityId, action, diff) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    organizationId,
                    userId,
                    entityType,
                    entityId,
                    action: action,
                    diff: diff || null,
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to create audit log:', error);
            // Don't throw - audit logs are important but not critical
        }
    }
    /**
     * Verify user has access to project
     */
    async verifyProjectAccess(organizationId, projectId, userId, allowedRoles) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project || project.organizationId !== organizationId) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Project not found');
        }
        const membership = await this.prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId,
                },
            },
        });
        if (!membership || !allowedRoles.includes(String(membership.role))) {
            throw new errors_1.AppError(403, errors_1.ErrorCodes.FORBIDDEN, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
        }
    }
}
exports.AdminService = AdminService;
exports.adminService = new AdminService();
//# sourceMappingURL=AdminService.js.map