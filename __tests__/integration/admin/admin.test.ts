import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { getPrisma } from '../../../src/config/database';
import app from '../../../src/index';

/**
 * Admin & User Management API Tests
 * Verifies acceptance criteria for Admin features
 */

let prisma: any;
let authToken: string;
let organizationId: string;
let userId: string;
let invitedEmail: string;

beforeAll(async () => {
  prisma = getPrisma();

  // Setup: Create test organization and user
  const orgName = `Test Org ${Date.now()}`;
  const org = await prisma.organization.create({
    data: {
      name: orgName,
      slug: orgName.toLowerCase().replace(/\s+/g, '-'),
    },
  });
  organizationId = org.id;

  // Create test user with ADMIN role in org
  const user = await prisma.user.create({
    data: {
      email: `admin-${Date.now()}@test.com`,
      name: 'Admin User',
      passwordHash: 'hashed-password',
      role: 'OWNER',
      organizationMembers: {
        create: {
          organizationId,
          role: 'OWNER',
        },
      },
    },
  });
  userId = user.id;
  invitedEmail = `invited-${Date.now()}@test.com`;

  // Generate JWT token for the user
  const jwt = require('jsonwebtoken');
  authToken = jwt.sign(
    { userId, email: user.email, roles: ['OWNER'], organizationId },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  // Cleanup database
  if (prisma) {
    await prisma.$disconnect();
  }
});

describe('Admin & User Management APIs', () => {
  describe('Acceptance Criteria Tests', () => {
    /**
     * AC1: Invite user sends email and creates pending invitation
     */
    describe('AC1: User Invitation with Email', () => {
      test('should create pending invitation and trigger email', async () => {
        const inviteResponse = await request(app)
          .post(`/api/v1/admin/orgs/${organizationId}/users/invite`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            email: invitedEmail,
            role: 'QA_ENGINEER',
          });

        expect(inviteResponse.status).toBe(201);
        expect(inviteResponse.body.status).toBe('success');
        expect(inviteResponse.body.data).toHaveProperty('id');
        expect(inviteResponse.body.data).toHaveProperty('email', invitedEmail);
        expect(inviteResponse.body.data).toHaveProperty('role', 'QA_ENGINEER');
        expect(inviteResponse.body.data).toHaveProperty('status', 'PENDING');
        expect(inviteResponse.body.data).toHaveProperty('emailSent');

        // Verify pending invitation exists in database
        const invitation = await prisma.pendingInvitation.findUnique({
          where: {
            organizationId_email: {
              organizationId,
              email: invitedEmail,
            },
          },
        });

        expect(invitation).toBeTruthy();
        expect(invitation.status).toBe('PENDING');
        expect(invitation.token).toBeTruthy();
      });

      test('should not allow non-admin to invite users', async () => {
        // Create non-admin user
        const nonAdminUser = await prisma.user.create({
          data: {
            email: `viewer-${Date.now()}@test.com`,
            name: 'Viewer User',
            passwordHash: 'hashed-password',
            role: 'VIEWER',
            organizationMembers: {
              create: {
                organizationId,
                role: 'VIEWER',
              },
            },
          },
        });

        const jwt = require('jsonwebtoken');
        const nonAdminToken = jwt.sign(
          { id: nonAdminUser.id, email: nonAdminUser.email, role: 'VIEWER' },
          process.env.JWT_SECRET || 'dev-secret',
          { expiresIn: '1h' }
        );

        const inviteResponse = await request(app)
          .post(`/api/v1/admin/orgs/${organizationId}/users/invite`)
          .set('Authorization', `Bearer ${nonAdminToken}`)
          .send({
            email: `another-${Date.now()}@test.com`,
            role: 'QA_ENGINEER',
          });

        expect(inviteResponse.status).toBe(403);
      });
    });

    /**
     * AC2: Role update restricted to ADMIN and OWNER roles
     */
    describe('AC2: Role Update Authorization', () => {
      test('should allow OWNER to update user role', async () => {
        // Create target user
        const targetUser = await prisma.user.create({
          data: {
            email: `target-${Date.now()}@test.com`,
            name: 'Target User',
            passwordHash: 'hashed-password',
          },
        });

        await prisma.organizationMember.create({
          data: {
            organizationId,
            userId: targetUser.id,
            role: 'QA_ENGINEER',
          },
        });

        const roleUpdateResponse = await request(app)
          .put(`/api/v1/admin/orgs/${organizationId}/users/${targetUser.id}/role`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            role: 'MANAGER',
          });

        expect(roleUpdateResponse.status).toBe(200);
        expect(roleUpdateResponse.body.data.role).toBe('MANAGER');

        // Verify in database
        const updatedMember = await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId,
              userId: targetUser.id,
            },
          },
        });

        expect(updatedMember.role).toBe('MANAGER');
      });

      test('should not allow non-admin to update roles', async () => {
        const nonAdminUser = await prisma.user.create({
          data: {
            email: `viewer2-${Date.now()}@test.com`,
            name: 'Viewer User 2',
            passwordHash: 'hashed-password',
            role: 'VIEWER',
            organizationMembers: {
              create: {
                organizationId,
                role: 'VIEWER',
              },
            },
          },
        });

        const jwt = require('jsonwebtoken');
        const nonAdminToken = jwt.sign(
          { id: nonAdminUser.id, email: nonAdminUser.email, role: 'VIEWER' },
          process.env.JWT_SECRET || 'dev-secret',
          { expiresIn: '1h' }
        );

        const targetUser = await prisma.user.create({
          data: {
            email: `target2-${Date.now()}@test.com`,
            name: 'Target User 2',
            passwordHash: 'hashed-password',
          },
        });

        await prisma.organizationMember.create({
          data: {
            organizationId,
            userId: targetUser.id,
            role: 'QA_ENGINEER',
          },
        });

        const roleUpdateResponse = await request(app)
          .put(`/api/v1/admin/orgs/${organizationId}/users/${targetUser.id}/role`)
          .set('Authorization', `Bearer ${nonAdminToken}`)
          .send({
            role: 'QA_LEAD',
          });

        expect(roleUpdateResponse.status).toBe(403);
      });
    });

    /**
     * AC3: Audit log records all create/update/delete actions
     */
    describe('AC3: Audit Logging', () => {
      test('should create audit log when creating custom field', async () => {
        const fieldResponse = await request(app)
          .post(`/api/v1/admin/orgs/${organizationId}/custom-fields`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Priority Level ${Date.now()}`,
            fieldType: 'SELECT',
            options: [
              { label: 'P1', value: 'p1' },
              { label: 'P2', value: 'p2' },
            ],
          });

        expect(fieldResponse.status).toBe(201);
        const fieldId = fieldResponse.body.data.id;

        // Check audit log was created
        const auditLog = await prisma.auditLog.findFirst({
          where: {
            organizationId,
            entityType: 'CustomField',
            entityId: fieldId,
            action: 'CREATE',
          },
        });

        expect(auditLog).toBeTruthy();
        expect(auditLog.diff).toHaveProperty('name');
        expect(auditLog.diff).toHaveProperty('fieldType');
      });

      test('should retrieve audit logs with filters', async () => {
        const response = await request(app)
          .get(`/api/v1/admin/orgs/${organizationId}/audit-logs`)
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            entityType: 'CustomField',
            action: 'CREATE',
          });

        expect(response.status).toBe(200);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('limit');
        expect(response.body.pagination).toHaveProperty('total');
      });

      test('should export audit logs as CSV', async () => {
        const response = await request(app)
          .get(`/api/v1/admin/orgs/${organizationId}/audit-logs/export/csv`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.text).toContain('Timestamp');
        expect(response.text).toContain('User Email');
        expect(response.text).toContain('Action');
      });
    });

    /**
     * AC4: Audit log is immutable (cannot be modified or deleted)
     */
    describe('AC4: Audit Log Immutability (DB Trigger)', () => {
      test('should prevent direct update of audit logs', async () => {
        // Get an audit log
        let auditLog = await prisma.auditLog.findFirst({
          where: { organizationId },
        });

        if (!auditLog) {
          // Create one by doing an action
          await request(app)
            .post(`/api/v1/admin/orgs/${organizationId}/custom-fields`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: `Field ${Date.now()}`,
              fieldType: 'TEXT',
            });

          auditLog = await prisma.auditLog.findFirst({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
          });
        }

        expect(auditLog).toBeTruthy();

        // Try to update via raw query (simulating database access)
        try {
          await prisma.$executeRawUnsafe(
            'UPDATE "AuditLog" SET "action" = $1 WHERE "id" = $2',
            'DELETED',
            auditLog!.id
          );
          // If we got here, trigger didn't work
          throw new Error('Audit log was updated - trigger not working');
        } catch (error: any) {
          // Expected - trigger should prevent this
          expect(error.message).toContain('immutable');
        }
      });

      test('should prevent direct delete of audit logs', async () => {
        let auditLog = await prisma.auditLog.findFirst({
          where: { organizationId },
        });

        if (!auditLog) {
          // Create one
          await request(app)
            .post(`/api/v1/admin/orgs/${organizationId}/custom-fields`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: `Field ${Date.now()}`,
              fieldType: 'TEXT',
            });

          auditLog = await prisma.auditLog.findFirst({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
          });
        }

        expect(auditLog).toBeTruthy();

        // Try to delete via raw query
        try {
          await prisma.$executeRawUnsafe(
            'DELETE FROM "AuditLog" WHERE "id" = $1',
            auditLog!.id
          );
          throw new Error('Audit log was deleted - trigger not working');
        } catch (error: any) {
          // Expected
          expect(error.message).toContain('immutable');
        }
      });
    });

    /**
     * AC5: Retention policy cron archives runs past retention date
     */
    describe('AC5: Retention Policy Background Job', () => {
      test('should create retention policy', async () => {
        const policyResponse = await request(app)
          .post(`/api/v1/admin/orgs/${organizationId}/retention-policies`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Archive Old Test Runs',
            description: 'Archive test runs older than 90 days',
            entityType: 'TestRun',
            actionType: 'ARCHIVE',
            retentionDays: 90,
            filterCriteria: {
              status: 'COMPLETED',
            },
          });

        expect(policyResponse.status).toBe(201);
        expect(policyResponse.body.data).toHaveProperty('id');
        expect(policyResponse.body.data).toHaveProperty('name');
        expect(policyResponse.body.data).toHaveProperty('entityType', 'TestRun');
        expect(policyResponse.body.data).toHaveProperty('retentionDays', 90);
        expect(policyResponse.body.data).toHaveProperty('isActive', true);
      });

      test('should retrieve retention policies', async () => {
        const response = await request(app)
          .get(`/api/v1/admin/orgs/${organizationId}/retention-policies`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toBeInstanceOf(Array);
      });

      test('should have scheduled retention job', () => {
        const { jobScheduler } = require('../../../src/workers/JobScheduler');
        expect(jobScheduler.hasJob('retention-policy')).toBe(true);
      });
    });
  });

  describe('User Management Endpoints', () => {
    test('GET /api/v1/admin/users should list users', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/orgs/${organizationId}/users`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    test('DELETE /api/v1/admin/users/:id should deactivate user', async () => {
      const targetUser = await prisma.user.create({
        data: {
          email: `delete-${Date.now()}@test.com`,
          name: 'Delete User',
          passwordHash: 'hashed-password',
        },
      });

      await prisma.organizationMember.create({
        data: {
          organizationId,
          userId: targetUser.id,
          role: 'QA_ENGINEER',
        },
      });

      const response = await request(app)
        .delete(`/api/v1/admin/orgs/${organizationId}/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // User should not be in org anymore
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: targetUser.id,
          },
        },
      });

      expect(membership).toBeNull();
    });

    test('GET /api/v1/admin/users/:id/activity should get user activity log', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/orgs/${organizationId}/users/${userId}/activity`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('Project Management Endpoints', () => {
    test('GET /api/v1/admin/orgs/:organizationId/projects should list projects', async () => {
      const projectName = `Project ${Date.now()}`;

      const createResponse = await request(app)
        .post(`/api/v1/admin/orgs/${organizationId}/projects`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: projectName,
          description: 'Integration test project',
        });

      expect(createResponse.status).toBe(201);

      const listResponse = await request(app)
        .get(`/api/v1/admin/orgs/${organizationId}/projects`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.status).toBe('success');
      expect(Array.isArray(listResponse.body.data)).toBe(true);
      expect(listResponse.body.data.some((p: any) => p.name === projectName)).toBe(true);
    });

    test('GET /api/v1/admin/orgs/:organizationId/projects/:projectId should return one project', async () => {
      const projectName = `Single Project ${Date.now()}`;

      const createResponse = await request(app)
        .post(`/api/v1/admin/orgs/${organizationId}/projects`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: projectName,
          description: 'Single project fetch test',
        });

      expect(createResponse.status).toBe(201);
      const projectId = createResponse.body.data.id;

      const getResponse = await request(app)
        .get(`/api/v1/admin/orgs/${organizationId}/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.status).toBe('success');
      expect(getResponse.body.data.id).toBe(projectId);
      expect(getResponse.body.data.name).toBe(projectName);
    });
  });

  describe('Project Management Endpoints', () => {
    let projectId: string;

    test('POST /api/v1/admin/projects should create project', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/orgs/${organizationId}/projects`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Test Project ${Date.now()}`,
          description: 'Test project for admin API',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBeTruthy();
      projectId = response.body.data.id;
    });

    test('PUT /api/v1/admin/projects/:id should update project', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/orgs/${organizationId}/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
    });

    test('GET /api/v1/admin/projects/:id/members should list project members', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/orgs/${organizationId}/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('POST /api/v1/admin/projects/:id/members should add project member', async () => {
      const newMember = await prisma.user.create({
        data: {
          email: `member-${Date.now()}@test.com`,
          name: 'New Member',
          passwordHash: 'hashed-password',
        },
      });

      await prisma.organizationMember.create({
        data: {
          organizationId,
          userId: newMember.id,
          role: 'QA_ENGINEER',
        },
      });

      const response = await request(app)
        .post(`/api/v1/admin/orgs/${organizationId}/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: newMember.id,
          role: 'QA_ENGINEER',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.id).toBe(newMember.id);
    });

    test('POST /api/v1/admin/projects/:id/archive should archive project', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/orgs/${organizationId}/projects/${projectId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Custom Fields Endpoints', () => {
    let fieldId: string;

    test('GET /api/v1/admin/custom-fields should list fields', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/orgs/${organizationId}/custom-fields`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('POST /api/v1/admin/custom-fields should create field', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/orgs/${organizationId}/custom-fields`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Environment ${Date.now()}`,
          fieldType: 'SELECT',
          options: [
            { label: 'Dev', value: 'dev' },
            { label: 'Staging', value: 'staging' },
          ],
        });

      expect(response.status).toBe(201);
      fieldId = response.body.data.id;
    });

    test('PUT /api/v1/admin/custom-fields/:id should update field', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/orgs/${organizationId}/custom-fields/${fieldId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Test environment',
        });

      expect(response.status).toBe(200);
    });

    test('DELETE /api/v1/admin/custom-fields/:id should delete field', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/orgs/${organizationId}/custom-fields/${fieldId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });
});
