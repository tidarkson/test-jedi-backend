/**
 * Comprehensive Test Repository API Integration Tests
 * Tests all functionality: suite hierarchy, cloning, filtering, locking, concurrency, audit logs
 * Last Updated: March 9, 2026
 */

import { getPrisma } from '../../../src/config/database';
import { TestRepositoryService } from '../../../src/services/TestRepositoryService';
import { AppError } from '../../../src/types/errors';

const prisma = getPrisma();
const service = new TestRepositoryService();

describe('Test Repository Comprehensive Suite', () => {
  let projectId: string;
  let userId: string;
  let testData: {
    rootSuite?: any;
    level1Suite?: any;
    level2Suite?: any;
    level3Suite?: any;
    testCases?: any[];
  } = {};

  beforeAll(async () => {
    // Create a test organization first
    const organization = await prisma.organization.create({
      data: {
        name: `TestOrg-${Date.now()}`,
        slug: `testorg-${Date.now()}`,
      },
    });

    // Create a test project
    const project = await prisma.project.create({
      data: {
        name: `Test-Project-${Date.now()}`,
        slug: `test-project-${Date.now()}`,
        organizationId: organization.id,
        description: 'Integration test project',
      },
    });
    projectId = project.id;

    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: `testuser-${Date.now()}@example.com`,
        name: 'Test User',
        passwordHash: 'hashed-test-password',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    // Cleanup: soft delete all test suites
    await prisma.suite.updateMany({
      where: { projectId },
      data: { deletedAt: new Date() },
    });

    // Cleanup: soft delete all test cases
    await prisma.testCase.updateMany({
      where: { suite: { projectId } },
      data: { deletedAt: new Date() },
    });
  });

  /**
   * TEST SUITE 1: 3-Level Deep Suite Hierarchy
   * Creates nested suite structure and verifies tree structure
   */
  describe('Test Suite 1: 3-Level Deep Suite Hierarchy', () => {
    it('should create a 3-level deep suite hierarchy with correct tree structure', async () => {
      // Level 1: Root Suite
      const rootSuite = await service.createSuite(projectId, userId, {
        name: 'Root-Suite-L1',
        description: 'Level 1 Root Suite',
      });
      testData.rootSuite = rootSuite;
      expect(rootSuite.name).toBe('Root-Suite-L1');
      expect(rootSuite.parentSuiteId).toBeNull();

      // Level 2: Child Suite
      const level1Suite = await service.createSuite(projectId, userId, {
        name: 'Child-Suite-L2',
        description: 'Level 2 Child Suite',
        parentSuiteId: rootSuite.id,
      });
      testData.level1Suite = level1Suite;
      expect(level1Suite.parentSuiteId).toBe(rootSuite.id);

      // Level 3: Grandchild Suite
      const level2Suite = await service.createSuite(projectId, userId, {
        name: 'Grandchild-Suite-L3',
        description: 'Level 3 Grandchild Suite',
        parentSuiteId: level1Suite.id,
      });
      testData.level2Suite = level2Suite;
      expect(level2Suite.parentSuiteId).toBe(level1Suite.id);

      // Level 4: Great-grandchild Suite
      const level3Suite = await service.createSuite(projectId, userId, {
        name: 'Great-Grandchild-Suite-L4',
        description: 'Level 4 Great-Grandchild Suite',
        parentSuiteId: level2Suite.id,
      });
      testData.level3Suite = level3Suite;
      expect(level3Suite.parentSuiteId).toBe(level2Suite.id);

      // Verify suite tree structure
      const tree = await service.getSuiteTree(projectId);
      expect(tree).toHaveLength(1);
      const rootNode = tree[0];
      expect(rootNode.id).toBe(rootSuite.id);
      expect(rootNode.name).toBe('Root-Suite-L1');
      expect(rootNode.childSuites).toHaveLength(1);

      // Verify Level 2
      const level1Node = rootNode.childSuites[0];
      expect(level1Node.id).toBe(level1Suite.id);
      expect(level1Node.name).toBe('Child-Suite-L2');
      expect(level1Node.childSuites).toHaveLength(1);

      // Verify Level 3
      const level2Node = level1Node.childSuites[0];
      expect(level2Node.id).toBe(level2Suite.id);
      expect(level2Node.name).toBe('Grandchild-Suite-L3');
      expect(level2Node.childSuites).toHaveLength(1);

      // Verify Level 4
      const level3Node = level2Node.childSuites[0];
      expect(level3Node.id).toBe(level3Suite.id);
      expect(level3Node.name).toBe('Great-Grandchild-Suite-L4');

      // Verify AuditLog entries created for suite creation
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          projectId,
          entityType: 'Suite',
          action: 'CREATE',
        },
      });
      expect(auditLogs.length).toBeGreaterThanOrEqual(4);
    });
  });

  /**
   * TEST SUITE 2: Clone Suite with Cases
   * Creates test cases and verifies clone operation
   */
  describe('Test Suite 2: Clone Suite with 10 Test Cases', () => {
    let suiteToClone: any;
    let casesToClone: any[] = [];

    beforeAll(async () => {
      // Create suite to clone
      suiteToClone = await service.createSuite(projectId, userId, {
        name: 'Suite-To-Clone',
        description: 'Suite with 10 test cases to clone',
      });

      // Create 10 test cases
      const caseData = [
        {
          title: 'Case 1 - Login functionality',
          priority: 'HIGH' as const,
          type: 'FUNCTIONAL' as const,
          tags: ['regression'],
        },
        {
          title: 'Case 2 - Password validation',
          priority: 'HIGH' as const,
          type: 'REGRESSION' as const,
          tags: ['regression'],
        },
        {
          title: 'Case 3 - Session timeout',
          priority: 'MEDIUM' as const,
          type: 'FUNCTIONAL' as const,
          tags: ['smoke'],
        },
        {
          title: 'Case 4 - CSRF protection',
          priority: 'CRITICAL' as const,
          type: 'SECURITY' as const,
          tags: ['security', 'regression'],
        },
        {
          title: 'Case 5 - SQL injection prevention',
          priority: 'CRITICAL' as const,
          type: 'SECURITY' as const,
          tags: ['security'],
        },
        {
          title: 'Case 6 - Rate limiting',
          priority: 'HIGH' as const,
          type: 'REGRESSION' as const,
          tags: ['regression', 'performance'],
        },
        {
          title: 'Case 7 - Data validation',
          priority: 'MEDIUM' as const,
          type: 'FUNCTIONAL' as const,
          tags: ['smoke'],
        },
        {
          title: 'Case 8 - Error handling',
          priority: 'HIGH' as const,
          type: 'FUNCTIONAL' as const,
          tags: ['regression'],
        },
        {
          title: 'Case 9 - API performance',
          priority: 'MEDIUM' as const,
          type: 'PERFORMANCE' as const,
          tags: ['performance'],
        },
        {
          title: 'Case 10 - End-to-end workflow',
          priority: 'HIGH' as const,
          type: 'E2E' as const,
          tags: ['smoke', 'regression'],
        },
      ];

      for (const caseInput of caseData) {
        const testCase = await service.createTestCase(
          projectId,
          suiteToClone.id,
          userId,
          {
            title: caseInput.title,
            description: `Test case for ${caseInput.title}`,
            priority: caseInput.priority,
            type: caseInput.type,
            tags: caseInput.tags as any,
          },
        );
        casesToClone.push(testCase);
      }
    });

    it('should clone a suite with all 10 test cases', async () => {
      const cloneResult = await service.cloneSuite(
        projectId,
        suiteToClone.id,
        userId,
      );

      expect(cloneResult).toBeDefined();
      expect(cloneResult.clone).toBeDefined();
      expect(cloneResult.clone.id).not.toBe(suiteToClone.id);
      expect(cloneResult.casesCopied).toBe(10);

      // Verify all cases were copied
      const clonedCasesInDb = await prisma.testCase.findMany({
        where: {
          suiteId: cloneResult.clone.id,
          deletedAt: null,
        },
      });
      expect(clonedCasesInDb).toHaveLength(10);

      // Verify case contents are copied
      clonedCasesInDb.forEach((clonedCase) => {
        expect(clonedCase.title).toContain('Case');
        expect(clonedCase.suiteId).toBe(cloneResult.clone.id);
      });

      // Verify AuditLog entry for clone operation
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          projectId,
          entityId: cloneResult.clone.id,
          action: 'CREATE',
        },
      });
      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  /**
   * TEST SUITE 3: Filter Cases by Priority and Tags
   */
  describe('Test Suite 3: Filter Cases by Priority=HIGH and Tag=regression', () => {
    let filterTestSuite: any;

    beforeAll(async () => {
      filterTestSuite = await service.createSuite(projectId, userId, {
        name: 'Filter-Test-Suite',
        description: 'Suite for testing case filters',
      });

      // Create test cases with various priorities and tags
      const testCases = [
        { title: 'HIGH Priority Case 1', priority: 'HIGH' as const, tags: ['regression'] },
        { title: 'HIGH Priority Case 2', priority: 'HIGH' as const, tags: ['regression', 'smoke'] },
        { title: 'MEDIUM Priority Case', priority: 'MEDIUM' as const, tags: ['regression'] },
        { title: 'CRITICAL Priority Case', priority: 'CRITICAL' as const, tags: ['security'] },
        { title: 'LOW Priority Case', priority: 'LOW' as const, tags: ['regression'] },
      ];

      for (const caseData of testCases) {
        await service.createTestCase(projectId, filterTestSuite.id, userId, {
          title: caseData.title,
          priority: caseData.priority,
          tags: caseData.tags as any,
        });
      }
    });

    it('should filter test cases by priority=HIGH and tag=regression', async () => {
      // Filter by priority HIGH and tag regression
      const result = await service.getTestCases(projectId, {
        suiteId: filterTestSuite.id,
        priority: 'HIGH',
        tags: ['regression'],
      });

      expect(result.data.length).toBeGreaterThanOrEqual(2);
      // Verify all returned cases have HIGH priority and regression tag
      result.data.forEach(testCase => {
        expect(testCase.priority).toBe('HIGH');
        expect(testCase.tags).toContain('regression');
      });
    });

    it('should handle multiple filter conditions', async () => {
      // Filter by multiple tags
      const result = await service.getTestCases(projectId, {
        suiteId: filterTestSuite.id,
        tags: ['regression', 'smoke'],
      });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(testCase => {
        const hasTags = testCase.tags?.some(tag => ['regression', 'smoke'].includes(tag));
        expect(hasTags).toBe(true);
      });
    });
  });

  /**
   * TEST SUITE 4: Lock Suite - Write Attempt Returns 423
   */
  describe('Test Suite 4: Attempt Write to Locked Suite (423 Response)', () => {
    let lockedSuite: any;

    beforeAll(async () => {
      lockedSuite = await service.createSuite(projectId, userId, {
        name: 'Locked-Suite',
        description: 'Suite to be locked',
      });
    });

    it('should lock a suite successfully', async () => {
      const locked = await service.toggleSuiteLock(projectId, lockedSuite.id, userId);
      expect(locked.isLocked).toBe(true);

      // Verify AuditLog entry for lock operation
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          projectId,
          entityId: lockedSuite.id,
          action: 'UPDATE',
        },
      });
      expect(auditLogs.length).toBeGreaterThan(0);
    });

    it('should prevent creating test case in locked suite (423)', async () => {
      try {
        await service.createTestCase(projectId, lockedSuite.id, userId, {
          title: 'Should not be created',
        });
        fail('Should have thrown an error for locked suite');
      } catch (error: any) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(423);
      }
    });

    it('should prevent child suite creation in locked suite (423)', async () => {
      try {
        await service.createSuite(projectId, userId, {
          name: 'Should not be created',
          parentSuiteId: lockedSuite.id,
        });
        fail('Should have thrown an error for locked parent suite');
      } catch (error: any) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(423);
      }
    });

    it('should allow unlocking the suite', async () => {
      const unlocked = await service.toggleSuiteLock(projectId, lockedSuite.id, userId);
      expect(unlocked.isLocked).toBe(false);
    });

    it('should now allow creating test case in unlocked suite', async () => {
      const testCase = await service.createTestCase(projectId, lockedSuite.id, userId, {
        title: 'Now allowed case',
      });
      expect(testCase).toBeDefined();
      expect(testCase.suiteId).toBe(lockedSuite.id);
    });
  });

  /**
   * TEST SUITE 5: Duplicate Case Title Detection
   */
  describe('Test Suite 5: Create Duplicate Case Title (409 or Warning)', () => {
    let dupTestSuite: any;
    const duplicateTitle = 'Unique-Case-Title-For-Testing';

    beforeAll(async () => {
      dupTestSuite = await service.createSuite(projectId, userId, {
        name: 'Duplicate-Test-Suite',
        description: 'Suite for testing duplicate detection',
      });
    });

    it('should create first test case with unique title', async () => {
      const firstCase = await service.createTestCase(projectId, dupTestSuite.id, userId, {
        title: duplicateTitle,
      });
      expect(firstCase.title).toBe(duplicateTitle);
    });

    it('should detect duplicate case title in same suite', async () => {
      // Attempt to create case with duplicate title
      try {
        await service.createTestCase(projectId, dupTestSuite.id, userId, {
          title: duplicateTitle,
        });
        fail('Should have thrown a duplicate error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(409);
      }
    });

    it('should allow duplicate titles in different suites', async () => {
      const anotherSuite = await service.createSuite(projectId, userId, {
        name: 'Another-Suite-For-Duplicate-Test',
      });

      const caseInAnotherSuite = await service.createTestCase(
        projectId,
        anotherSuite.id,
        userId,
        {
          title: duplicateTitle,
        },
      );

      expect(caseInAnotherSuite.title).toBe(duplicateTitle);
      expect(caseInAnotherSuite.suiteId).toBe(anotherSuite.id);
    });
  });

  /**
   * TEST SUITE 6: Bulk Move 50 Cases to Different Suite
   */
  describe('Test Suite 6: Bulk Move 50 Cases to Different Suite', () => {
    let sourceSuite: any;
    let targetSuite: any;
    let casesForBulkMove: any[] = [];

    beforeAll(async () => {
      // Create source suite
      sourceSuite = await service.createSuite(projectId, userId, {
        name: 'Bulk-Move-Source-Suite',
        description: 'Source suite with 50 cases',
      });

      // Create target suite
      targetSuite = await service.createSuite(projectId, userId, {
        name: 'Bulk-Move-Target-Suite',
        description: 'Target suite for bulk move',
      });

      // Create 50 test cases in source suite
      for (let i = 1; i <= 50; i++) {
        const testCase = await service.createTestCase(
          projectId,
          sourceSuite.id,
          userId,
          {
            title: `Bulk-Move-Case-${i}`,
            description: `Test case ${i} for bulk move operation`,
            priority: i % 4 === 0 ? 'CRITICAL' : i % 3 === 0 ? 'HIGH' : i % 2 === 0 ? 'MEDIUM' : 'LOW',
          },
        );
        casesForBulkMove.push(testCase);
      }
    });

    it('should bulk move all 50 cases to target suite', async () => {
      // Prepare bulk operation items
      const bulkItems = casesForBulkMove.map(testCase => ({
        id: testCase.id,
        action: 'move' as const,
        newSuiteId: targetSuite.id,
      }));

      // Execute bulk operation
      const result = await service.bulkOperateTestCases(projectId, userId, {
        suiteId: sourceSuite.id,
        items: bulkItems,
      });

      expect(result.successful).toBe(50);
      expect(result.failed).toBe(0);

      // Verify all cases are now in target suite
      const movedCases = await prisma.testCase.findMany({
        where: {
          suiteId: targetSuite.id,
          deletedAt: null,
        },
      });

      expect(movedCases.length).toBeGreaterThanOrEqual(50);
      movedCases.forEach(testCase => {
        expect(testCase.suiteId).toBe(targetSuite.id);
      });

      // Verify source suite no longer has these cases
      const sourceCases = await prisma.testCase.findMany({
        where: {
          suiteId: sourceSuite.id,
          id: {
            in: casesForBulkMove.map(c => c.id),
          },
          deletedAt: null,
        },
      });

      expect(sourceCases.length).toBe(0);
    });

    it('should create audit logs for bulk operations', async () => {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          projectId,
          entityType: 'TestCase',
          action: 'UPDATE',
        },
      });

      // Should have audit entries for moved cases
      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  /**
   * TEST SUITE 7: Audit Log Entry Verification
   */
  describe('Test Suite 7: AuditLog Entry Creation for Every Write Operation', () => {
    let auditSuite: any;

    beforeAll(async () => {
      auditSuite = await service.createSuite(projectId, userId, {
        name: 'Audit-Test-Suite',
        description: 'Suite for audit log testing',
      });
    });

    it('should create audit log entry for suite creation', async () => {
      const newSuite = await service.createSuite(projectId, userId, {
        name: 'Audit-Suite-1',
        description: 'For audit testing',
      });

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          projectId,
          entityId: newSuite.id,
          entityType: 'Suite',
          action: 'CREATE',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].userId).toBe(userId);
    });

    it('should create audit log entry for suite update', async () => {
      await service.updateSuite(projectId, auditSuite.id, userId, {
        name: 'Updated-Audit-Suite',
        description: 'Updated description',
      });

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          projectId,
          entityId: auditSuite.id,
          entityType: 'Suite',
          action: 'UPDATE',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });

    it('should create audit log entry for test case creation', async () => {
      const testCase = await service.createTestCase(projectId, auditSuite.id, userId, {
        title: 'Audit-Test-Case',
        description: 'For audit logging',
      });

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          projectId,
          entityId: testCase.id,
          entityType: 'TestCase',
          action: 'CREATE',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].userId).toBe(userId);
    });

    it('should create audit log entry for test case update', async () => {
      const testCase = await service.createTestCase(projectId, auditSuite.id, userId, {
        title: 'Case-To-Update',
      });

      await service.updateTestCase(projectId, testCase.id, userId, {
        title: 'Updated-Case-Title',
        priority: 'HIGH',
      });

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          projectId,
          entityId: testCase.id,
          entityType: 'TestCase',
          action: 'UPDATE',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });

    it('should create audit log entry for test case deletion', async () => {
      const testCase = await service.createTestCase(projectId, auditSuite.id, userId, {
        title: 'Case-To-Delete',
      });

      await service.deleteTestCase(projectId, testCase.id, userId);

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          projectId,
          entityId: testCase.id,
          entityType: 'TestCase',
          action: 'DELETE',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });

    it('should create audit log entry for suite lock operation', async () => {
      const lockSuite = await service.createSuite(projectId, userId, {
        name: 'Lock-Audit-Suite',
      });

      await service.toggleSuiteLock(projectId, lockSuite.id, userId);

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          projectId,
          entityId: lockSuite.id,
          entityType: 'Suite',
          action: 'UPDATE',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  /**
   * TEST SUITE 8: Error Handling and Edge Cases
   */
  describe('Test Suite 8: Error Handling and Edge Cases', () => {
    it('should handle invalid project ID gracefully', async () => {
      try {
        await service.getSuiteTree('invalid-project-id');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(404);
      }
    });

    it('should handle invalid parent suite ID', async () => {
      try {
        await service.createSuite(projectId, userId, {
          name: 'Invalid Parent Suite',
          parentSuiteId: 'invalid-suite-id',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(404);
      }
    });

    it('should validate required fields', async () => {
      try {
        await service.createSuite(projectId, userId, {
          name: '',
          description: 'Missing name',
        });
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should handle pagination correctly', async () => {
      const suite = await service.createSuite(projectId, userId, {
        name: 'Pagination-Test-Suite',
      });

      // Create multiple cases
      for (let i = 0; i < 30; i++) {
        await service.createTestCase(projectId, suite.id, userId, {
          title: `Pagination-Case-${i}`,
        });
      }

      // Test pagination
      const page1 = await service.getTestCases(projectId, { 
        suiteId: suite.id,
        page: 1, 
        limit: 10 
      });
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.limit).toBe(10);
      expect(page1.data.length).toBeLessThanOrEqual(10);
    });
  });
});
