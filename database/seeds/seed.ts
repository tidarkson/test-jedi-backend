import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create an organization
    const org = await prisma.organization.create({
      data: {
        name: 'Acme Corporation',
        slug: 'acme-corp',
        plan: 'PROFESSIONAL',
        settings: {
          timezone: 'UTC',
          theme: 'light',
          features: ['custom_fields', 'integrations', 'analytics'],
        },
      },
    });
    console.log('✓ Created organization:', org.id);

    // Create users (organization members)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@acme.com',
        name: 'Admin User',
        role: 'ADMIN',
        organizationMembers: {
          create: {
            organizationId: org.id,
            role: 'ADMIN',
          },
        },
      },
    });
    console.log('✓ Created admin user:', admin.id);

    const manager = await prisma.user.create({
      data: {
        email: 'manager@acme.com',
        name: 'Manager User',
        role: 'MANAGER',
        organizationMembers: {
          create: {
            organizationId: org.id,
            role: 'MANAGER',
          },
        },
      },
    });
    console.log('✓ Created manager user:', manager.id);

    const tester = await prisma.user.create({
      data: {
        email: 'tester@acme.com',
        name: 'Tester User',
        role: 'TESTER',
        organizationMembers: {
          create: {
            organizationId: org.id,
            role: 'TESTER',
          },
        },
      },
    });
    console.log('✓ Created tester user:', tester.id);

    // Create a project
    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: 'Mobile Banking App',
        slug: 'mobile-banking',
        description: 'Test suite for mobile banking application',
        settings: {
          defaultTestType: 'FUNCTIONAL',
          riskThreshold: 'HIGH',
          autoCreateDefects: true,
        },
        members: {
          create: [
            { userId: admin.id, role: 'ADMIN' },
            { userId: manager.id, role: 'MANAGER' },
            { userId: tester.id, role: 'TESTER' },
          ],
        },
      },
    });
    console.log('✓ Created project:', project.id);

    // Create milestone
    const milestone = await prisma.milestone.create({
      data: {
        projectId: project.id,
        name: 'Release v2.0',
        dueDate: new Date('2026-06-30'),
        status: 'IN_PROGRESS',
      },
    });
    console.log('✓ Created milestone:', milestone.id);

    // Create suite
    const suite = await prisma.suite.create({
      data: {
        projectId: project.id,
        name: 'Authentication Module',
        description: 'Tests for user login and authentication',
        ownerId: manager.id,
        reviewerId: admin.id,
        status: 'ACTIVE',
      },
    });
    console.log('✓ Created suite:', suite.id);

    // Create test cases
    const testCase1 = await prisma.testCase.create({
      data: {
        suiteId: suite.id,
        title: 'User Login with Valid Credentials',
        description: 'Verify user can login with correct email and password',
        preconditions: 'User account must exist in the system',
        postconditions: 'User is logged in and redirected to dashboard',
        priority: 'CRITICAL',
        severity: 'BLOCKER',
        type: 'FUNCTIONAL',
        automationStatus: 'AUTOMATED',
        riskLevel: 'HIGH',
        estimatedTime: 15,
        authorId: tester.id,
        reviewerId: manager.id,
        approvalStatus: 'APPROVED',
        tags: ['smoke', 'regression'],
        customFields: {
          automation_framework: 'Playwright',
          test_environment: 'staging',
        },
      },
    });
    console.log('✓ Created test case 1:', testCase1.id);

    const testCase2 = await prisma.testCase.create({
      data: {
        suiteId: suite.id,
        title: 'User Login with Invalid Credentials',
        description: 'Verify user cannot login with incorrect password',
        preconditions: 'User account must exist in the system',
        postconditions: 'Error message displayed, user remains on login page',
        priority: 'HIGH',
        severity: 'MAJOR',
        type: 'FUNCTIONAL',
        automationStatus: 'AUTOMATED',
        riskLevel: 'MEDIUM',
        estimatedTime: 10,
        authorId: tester.id,
        reviewerId: manager.id,
        approvalStatus: 'APPROVED',
        customFields: {
          automation_framework: 'Playwright',
        },
      },
    });
    console.log('✓ Created test case 2:', testCase2.id);

    // Create test steps
    await prisma.testStep.create({
      data: {
        testCaseId: testCase1.id,
        order: 1,
        action: 'Navigate to login page',
        expectedResult: 'Login form is displayed',
        testData: { url: 'https://app.example.com/login' },
      },
    });

    await prisma.testStep.create({
      data: {
        testCaseId: testCase1.id,
        order: 2,
        action: 'Enter valid email and password',
        expectedResult: 'Credentials are entered correctly',
        testData: {
          email: 'testuser@example.com',
          password: 'secure_password_123',
        },
      },
    });

    await prisma.testStep.create({
      data: {
        testCaseId: testCase1.id,
        order: 3,
        action: 'Click login button',
        expectedResult: 'User is authenticated and dashboard loads',
      },
    });
    console.log('✓ Created test steps for test case 1');

    // Create test run
    const testRun = await prisma.testRun.create({
      data: {
        projectId: project.id,
        title: 'Sprint 10 Regression Testing',
        type: 'AUTOMATED',
        environment: 'staging',
        status: 'COMPLETED',
        buildNumber: 'v2.0-build-45',
        branch: 'release/v2.0',
        plannedStart: new Date('2026-03-03'),
        dueDate: new Date('2026-03-05'),
        defaultAssigneeId: tester.id,
        riskThreshold: 'HIGH',
        milestoneId: milestone.id,
      },
    });
    console.log('✓ Created test run:', testRun.id);

    // Create run cases
    const runCase1 = await prisma.runCase.create({
      data: {
        runId: testRun.id,
        caseId: testCase1.id,
        assigneeId: tester.id,
        status: 'PASSED',
        executionType: 'AUTOMATED',
        startedAt: new Date('2026-03-03T10:00:00Z'),
        completedAt: new Date('2026-03-03T10:15:00Z'),
      },
    });
    console.log('✓ Created run case 1:', runCase1.id);

    const runCase2 = await prisma.runCase.create({
      data: {
        runId: testRun.id,
        caseId: testCase2.id,
        assigneeId: tester.id,
        status: 'FAILED',
        executionType: 'AUTOMATED',
        startedAt: new Date('2026-03-03T10:15:00Z'),
        completedAt: new Date('2026-03-03T10:20:00Z'),
      },
    });
    console.log('✓ Created run case 2:', runCase2.id);

    // Create step results
    await prisma.stepResult.create({
      data: {
        runCaseId: runCase1.id,
        stepId: (await prisma.testStep.findFirst({ where: { testCaseId: testCase1.id, order: 1 } }))!.id,
        status: 'PASSED',
      },
    });

    await prisma.stepResult.create({
      data: {
        runCaseId: runCase2.id,
        stepId: (await prisma.testStep.findFirst({ where: { testCaseId: testCase2.id } }))!.id,
        status: 'FAILED',
        comment: 'Error message not displayed as expected',
        attachments: [
          {
            type: 'screenshot',
            url: 's3://test-results/screenshot_001.png',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });
    console.log('✓ Created step results');

    // Create defect from failed run case
    const defect = await prisma.defect.create({
      data: {
        runCaseId: runCase2.id,
        title: 'Invalid credentials error message not shown',
        externalId: 'JIRA-1234',
        url: 'https://jira.example.com/browse/JIRA-1234',
        status: 'OPEN',
      },
    });
    console.log('✓ Created defect:', defect.id);

    // Create test plan
    const testPlan = await prisma.testPlan.create({
      data: {
        projectId: project.id,
        title: 'Mobile Banking v2.0 Test Plan',
        version: '1.0',
        status: 'ACTIVE',
        milestoneId: milestone.id,
      },
    });
    console.log('✓ Created test plan:', testPlan.id);

    // Create tags
    await prisma.tag.create({
      data: {
        projectId: project.id,
        name: 'smoke',
        color: '#FF6B6B',
      },
    });

    await prisma.tag.create({
      data: {
        projectId: project.id,
        name: 'regression',
        color: '#4ECDC4',
      },
    });

    await prisma.tag.create({
      data: {
        projectId: project.id,
        name: 'critical',
        color: '#FFE66D',
      },
    });
    console.log('✓ Created tags');

    // Create audit logs
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        userId: admin.id,
        entityType: 'TestRun',
        entityId: testRun.id,
        action: 'CREATE',
        diff: { created: true, status: 'COMPLETED' },
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        userId: tester.id,
        entityType: 'Defect',
        entityId: defect.id,
        action: 'CREATE',
        diff: { title: defect.title, status: 'OPEN' },
      },
    });
    console.log('✓ Created audit logs');

    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
