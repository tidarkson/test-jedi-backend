"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AdminController_1 = require("../controllers/AdminController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Organization administration and governance
 * /admin/orgs/{organizationId}/users:
 *   get:
 *     tags: [Admin]
 *     summary: List organization users
 *     security: [{ bearerAuth: [] }]
 * /admin/orgs/{organizationId}/users/invite:
 *   post:
 *     tags: [Admin]
 *     summary: Invite organization user
 *     security: [{ bearerAuth: [] }]
 * /admin/auth/accept-invitation:
 *   post:
 *     tags: [Admin]
 *     summary: Accept invitation
 * /admin/orgs/{organizationId}/users/{userId}/role:
 *   put:
 *     tags: [Admin]
 *     summary: Update user role
 *     security: [{ bearerAuth: [] }]
 * /admin/orgs/{organizationId}/users/{userId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Deactivate user
 *     security: [{ bearerAuth: [] }]
 * /admin/orgs/{organizationId}/users/{userId}/activity:
 *   get:
 *     tags: [Admin]
 *     summary: Get user activity
 *     security: [{ bearerAuth: [] }]
 * /admin/orgs/{organizationId}/projects:
 *   post:
 *     tags: [Admin]
 *     summary: Create project
 *     security: [{ bearerAuth: [] }]
 * /admin/orgs/{organizationId}/projects/{projectId}:
 *   put:
 *     tags: [Admin]
 *     summary: Update project
 *     security: [{ bearerAuth: [] }]
 * /admin/orgs/{organizationId}/projects/{projectId}/archive:
 *   post:
 *     tags: [Admin]
 *     summary: Archive project
 *     security: [{ bearerAuth: [] }]
 * /admin/orgs/{organizationId}/projects/{projectId}/members:
 *   get:
 *     tags: [Admin]
 *     summary: List project members
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     tags: [Admin]
 *     summary: Add project member
 *     security: [{ bearerAuth: [] }]
 * /admin/orgs/{organizationId}/custom-fields:
 *   get:
 *     tags: [Admin]
 *     summary: List custom fields
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     tags: [Admin]
 *     summary: Create custom field
 *     security: [{ bearerAuth: [] }]
 * /admin/orgs/{organizationId}/custom-fields/{fieldId}:
 *   put:
 *     tags: [Admin]
 *     summary: Update custom field
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     tags: [Admin]
 *     summary: Delete custom field
 *     security: [{ bearerAuth: [] }]
 * /admin/orgs/{organizationId}/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: List audit logs
 *     security: [{ bearerAuth: [] }]
 * /admin/orgs/{organizationId}/audit-logs/export/csv:
 *   get:
 *     tags: [Admin]
 *     summary: Export audit logs
 *     security: [{ bearerAuth: [] }]
 * /admin/orgs/{organizationId}/retention-policies:
 *   post:
 *     tags: [Admin]
 *     summary: Set retention policy
 *     security: [{ bearerAuth: [] }]
 *   get:
 *     tags: [Admin]
 *     summary: List retention policies
 *     security: [{ bearerAuth: [] }]
 */
// All admin routes require authentication
router.use(auth_1.authenticate);
// Helper middleware to require org admin/owner role
const requireAdminRole = async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const userId = req.user.userId || req.user.id;
        const prisma = require('../config/database').getPrisma();
        const membership = await prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId,
                },
            },
        });
        if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'OWNER')) {
            res.status(403).json({
                status: 'error',
                code: 403,
                error: 'FORBIDDEN',
                message: 'Admin or Owner role required',
            });
            return;
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
/* ========================================
   USER MANAGEMENT
   ======================================== */
// GET /api/v1/admin/orgs/:organizationId/users
router.get('/orgs/:organizationId/users', requireAdminRole, (req, res, next) => AdminController_1.adminController.listUsers(req, res).catch(next));
// POST /api/v1/admin/orgs/:organizationId/users/invite
router.post('/orgs/:organizationId/users/invite', requireAdminRole, (req, res, next) => AdminController_1.adminController.inviteUser(req, res).catch(next));
// POST /api/v1/admin/auth/accept-invitation
router.post('/auth/accept-invitation', (req, res, next) => AdminController_1.adminController.acceptInvitation(req, res).catch(next));
// PUT /api/v1/admin/orgs/:organizationId/users/:userId/role
router.put('/orgs/:organizationId/users/:userId/role', requireAdminRole, (req, res, next) => AdminController_1.adminController.updateUserRole(req, res).catch(next));
// DELETE /api/v1/admin/orgs/:organizationId/users/:userId
router.delete('/orgs/:organizationId/users/:userId', requireAdminRole, (req, res, next) => AdminController_1.adminController.deactivateUser(req, res).catch(next));
// GET /api/v1/admin/orgs/:organizationId/users/:userId/activity
router.get('/orgs/:organizationId/users/:userId/activity', requireAdminRole, (req, res, next) => AdminController_1.adminController.getUserActivity(req, res).catch(next));
/* ========================================
   PROJECT MANAGEMENT
   ======================================== */
// GET /api/v1/admin/orgs/:organizationId/projects
router.get('/orgs/:organizationId/projects', requireAdminRole, (req, res, next) => AdminController_1.adminController.listProjects(req, res).catch(next));
// GET /api/v1/admin/orgs/:organizationId/projects/:projectId
router.get('/orgs/:organizationId/projects/:projectId', requireAdminRole, (req, res, next) => AdminController_1.adminController.getProject(req, res).catch(next));
// POST /api/v1/admin/orgs/:organizationId/projects
router.post('/orgs/:organizationId/projects', requireAdminRole, (req, res, next) => AdminController_1.adminController.createProject(req, res).catch(next));
// PUT /api/v1/admin/orgs/:organizationId/projects/:projectId
router.put('/orgs/:organizationId/projects/:projectId', requireAdminRole, (req, res, next) => AdminController_1.adminController.updateProject(req, res).catch(next));
// POST /api/v1/admin/orgs/:organizationId/projects/:projectId/archive
router.post('/orgs/:organizationId/projects/:projectId/archive', requireAdminRole, (req, res, next) => AdminController_1.adminController.archiveProject(req, res).catch(next));
// GET /api/v1/admin/orgs/:organizationId/projects/:projectId/members
router.get('/orgs/:organizationId/projects/:projectId/members', requireAdminRole, (req, res, next) => AdminController_1.adminController.getProjectMembers(req, res).catch(next));
// POST /api/v1/admin/orgs/:organizationId/projects/:projectId/members
router.post('/orgs/:organizationId/projects/:projectId/members', requireAdminRole, (req, res, next) => AdminController_1.adminController.addProjectMember(req, res).catch(next));
/* ========================================
   CUSTOM FIELDS
   ======================================== */
// GET /api/v1/admin/orgs/:organizationId/custom-fields
router.get('/orgs/:organizationId/custom-fields', requireAdminRole, (req, res, next) => AdminController_1.adminController.listCustomFields(req, res).catch(next));
// POST /api/v1/admin/orgs/:organizationId/custom-fields
router.post('/orgs/:organizationId/custom-fields', requireAdminRole, (req, res, next) => AdminController_1.adminController.createCustomField(req, res).catch(next));
// PUT /api/v1/admin/orgs/:organizationId/custom-fields/:fieldId
router.put('/orgs/:organizationId/custom-fields/:fieldId', requireAdminRole, (req, res, next) => AdminController_1.adminController.updateCustomField(req, res).catch(next));
// DELETE /api/v1/admin/orgs/:organizationId/custom-fields/:fieldId
router.delete('/orgs/:organizationId/custom-fields/:fieldId', requireAdminRole, (req, res, next) => AdminController_1.adminController.deleteCustomField(req, res).catch(next));
/* ========================================
   AUDIT LOGS
   ======================================== */
// GET /api/v1/admin/orgs/:organizationId/audit-logs
router.get('/orgs/:organizationId/audit-logs', requireAdminRole, (req, res, next) => AdminController_1.adminController.getAuditLogs(req, res).catch(next));
// GET /api/v1/admin/orgs/:organizationId/audit-logs/export/csv
router.get('/orgs/:organizationId/audit-logs/export/csv', requireAdminRole, (req, res, next) => AdminController_1.adminController.exportAuditLogs(req, res).catch(next));
/* ========================================
   DATA RETENTION
   ======================================== */
// POST /api/v1/admin/orgs/:organizationId/retention-policies
router.post('/orgs/:organizationId/retention-policies', requireAdminRole, (req, res, next) => AdminController_1.adminController.setRetentionPolicy(req, res).catch(next));
// GET /api/v1/admin/orgs/:organizationId/retention-policies
router.get('/orgs/:organizationId/retention-policies', requireAdminRole, (req, res, next) => AdminController_1.adminController.getRetentionPolicies(req, res).catch(next));
exports.default = router;
//# sourceMappingURL=admin.js.map