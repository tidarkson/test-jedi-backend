# Test-Jedi Backend - Implementation Guide

## Overview

This guide explains how to build the Test-Jedi backend.

---

## 1. Tech Stack

### Core Technologies (Same as BlackPot)
- **Runtime**: Node.js with TypeScript 5.9.3
- **Web Framework**: Express.js 5.2.1
- **Database**: PostgreSQL with Prisma ORM 5.22.0
- **Session Management**: express-session with Redis store (connect-redis 7.1.0)
- **Caching**: Redis (ioredis 5.9.2)
- **Job Queue**: BullMQ 5.5.6 (for async tasks)
- **Validation**: Zod 4.3.6
- **Authentication**: JWT with jsonwebtoken 9.0.3
- **Logging**: Winston 3.19.0
- **Error Tracking**: Sentry 7-10
- **Real-time**: Socket.io 4.8.3 (for test execution updates)
- **Utilities**: date-fns 4.1.0, Decimal.js 10.6.0
- **Testing**: Jest 29.7.0 with ts-jest

### Development Tools
- **TypeScript**: 5.9.3
- **Linting**: ESLint with TypeScript parser
- **Formatting**: Prettier
- **Process Manager**: Nodemon for development
- **Build**: TypeScript Compiler (tsc)

---

## 2. Project Structure

```
test-jedi-backend/
├── backend/
│   ├── src/
│   │   ├── index.ts                 # Express app initialization
│   │   ├── config/
│   │   │   ├── environment.ts       # Environment variables
│   │   │   ├── logger.ts            # Winston logger setup
│   │   │   ├── redis.ts             # Redis client initialization
│   │   │   ├── sentry.ts            # Sentry error tracking setup
│   │   │   ├── session.config.ts    # Express-session Redis store
│   │   │   └── database.ts          # Prisma client initialization
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT authentication middleware
│   │   │   ├── errorHandler.ts      # Global error handler
│   │   │   ├── requestLogger.ts     # Request logging
│   │   │   ├── rateLimiter.ts       # Rate limiting (general + auth-specific)
│   │   │   ├── validation.ts        # Zod validation middleware
│   │   │   ├── tenantIsolation.ts   # Multi-tenant data isolation
│   │   │   ├── cache.middleware.ts  # Redis caching
│   │   │   ├── sentry.middleware.ts # Sentry context capture
│   │   │   └── session.middleware.ts# Session validation
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.ts              # /api/auth/* endpoints
│   │   │   ├── projects.ts          # /api/projects/* endpoints
│   │   │   ├── test-repository.ts   # /api/test-repository/* (suites, cases)
│   │   │   ├── test-runs.ts         # /api/test-runs/* endpoints
│   │   │   ├── execution.ts         # /api/execution/* endpoints
│   │   │   ├── test-plans.ts        # /api/test-plans/* endpoints
│   │   │   ├── analytics.ts         # /api/analytics/* endpoints
│   │   │   ├── defects.ts           # /api/defects/* endpoints
│   │   │   ├── custom-fields.ts     # /api/custom-fields/* endpoints
│   │   │   ├── admin.ts             # /api/admin/* endpoints
│   │   │   ├── integrations.ts      # /api/integrations/* endpoints
│   │   │   └── team.ts              # /api/team/* endpoints
│   │   │
│   │   ├── controllers/
│   │   │   ├── AuthController.ts
│   │   │   ├── ProjectController.ts
│   │   │   ├── TestRepositoryController.ts
│   │   │   ├── TestRunController.ts
│   │   │   ├── ExecutionController.ts
│   │   │   ├── TestPlanController.ts
│   │   │   ├── AnalyticsController.ts
│   │   │   ├── DefectController.ts
│   │   │   ├── CustomFieldController.ts
│   │   │   ├── AdminController.ts
│   │   │   ├── IntegrationController.ts
│   │   │   ├── TeamController.ts
│   │   │   └── HealthCheckController.ts
│   │   │
│   │   ├── services/
│   │   │   ├── AuthService.ts
│   │   │   ├── UserService.ts
│   │   │   ├── ProjectService.ts
│   │   │   ├── TestRepositoryService.ts (suite + case management)
│   │   │   ├── TestRunService.ts
│   │   │   ├── ExecutionService.ts
│   │   │   ├── TestPlanService.ts
│   │   │   ├── AnalyticsService.ts
│   │   │   ├── DefectService.ts
│   │   │   ├── CustomFieldService.ts
│   │   │   ├── IntegrationService.ts
│   │   │   ├── TeamService.ts
│   │   │   ├── EmailService.ts         # For notifications
│   │   │   ├── SessionService.ts
│   │   │   ├── PasswordResetService.ts
│   │   │   └── AuditService.ts         # Audit logging
│   │   │
│   │   ├── validators/
│   │   │   ├── auth.validator.ts
│   │   │   ├── project.validator.ts
│   │   │   ├── test-repository.validator.ts
│   │   │   ├── test-run.validator.ts
│   │   │   ├── execution.validator.ts
│   │   │   ├── test-plan.validator.ts
│   │   │   ├── defect.validator.ts
│   │   │   ├── custom-field.validator.ts
│   │   │   └── integration.validator.ts
│   │   │
│   │   ├── models/
│   │   │   └── types and interfaces (generated from Prisma)
│   │   │
│   │   ├── queues/
│   │   │   ├── test-execution.queue.ts      # For async test execution tracking
│   │   │   ├── notification.queue.ts        # For Slack/Teams notifications
│   │   │   ├── analytics.queue.ts           # For async analytics calculation
│   │   │   ├── integration.queue.ts         # For Jira sync, etc.
│   │   │   └── email.queue.ts               # For bulk email notifications
│   │   │
│   │   ├── utils/
│   │   │   ├── redisClient.ts
│   │   │   ├── cacheKeyGenerator.ts
│   │   │   ├── sentryErrorHandler.ts
│   │   │   ├── RoleBasedAccessFilter.ts     # RBAC filtering
│   │   │   └── DateRangeHelper.ts           # For analytics date ranges
│   │   │
│   │   └── types/
│   │       ├── auth.ts
│   │       ├── express.ts              # Express Request extensions
│   │       └── index.ts                # Global type definitions
│   │
│   ├── tests/                         # Jest test files
│   │   ├── unit/
│   │   ├── integration/
│   │   └── jest.setup.ts
│   │
│   └── dist/                          # Compiled JavaScript output
│
├── database/
│   ├── prisma/
│   │   ├── schema.prisma              # Prisma database schema
│   │   └── migrations/                # Auto-generated migrations
│   │
│   ├── seeds/
│   │   └── seed.ts                    # Database seeding for development
│   │
│   └── sql/
│       ├── views.sql                  # Custom SQL views (analytics)
│       └── functions.sql              # Custom SQL functions
│
├── .env                               # Environment variables (not committed)
├── .env.example                       # Template for environment variables
├── .eslintrc.js                       # ESLint configuration
├── .prettierrc                        # Prettier formatting
├── jest.config.js                     # Jest testing configuration
├── nodemon.json                       # Nodemon watch configuration
├── tsconfig.json                      # TypeScript configuration
├── package.json
├── IMPLEMENTATION_GUIDE.md             # This file
└── BACKEND_CONTEXT.md                 # Requirements & specifications
```

---

## 3. Key Architectural Patterns

### 3.1 Layered Architecture

The codebase follows a clear separation of concerns:

```
Request → Route → Controller → Service → Database
                ↓
            Middleware (Auth, Validation, Error Handling)
```

**Pattern**: Each endpoint lives in a route file, delegates to a controller, which calls service(s), which interact with Prisma.

### 3.2 Controller Pattern

Controllers handle HTTP concerns (request/response). They should be thin and delegate business logic to services.

```typescript
// backend/src/controllers/TestRunController.ts
import { Request, Response } from 'express';
import { TestRunService } from '../services/TestRunService';

const testRunService = new TestRunService();

export class TestRunController {
  static async createTestRun(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { name, description, environment, buildNumber } = req.body;
      const userId = req.user!.userId;
      const tenantId = req.user!.tenantId;

      const testRun = await testRunService.createTestRun(
        projectId,
        tenantId,
        { name, description, environment, buildNumber },
        userId
      );

      return res.status(201).json({
        status: 'success',
        code: 201,
        data: testRun,
        message: 'Test run created successfully',
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        error: 'CREATE_FAILED',
        message: error.message,
      });
    }
  }

  static async getTestRun(req: Request, res: Response) {
    try {
      const { projectId, runId } = req.params;
      const tenantId = req.user!.tenantId;

      const testRun = await testRunService.getTestRun(runId, projectId, tenantId);

      return res.status(200).json({
        status: 'success',
        code: 200,
        data: testRun,
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          status: 'error',
          code: 404,
          error: 'NOT_FOUND',
          message: error.message,
        });
      }
      throw error;
    }
  }

  // Additional methods...
}
```

### 3.3 Service Pattern

Services contain business logic and call Prisma. They should be independent of HTTP.

```typescript
// backend/src/services/TestRunService.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TestRunService {
  /**
   * Create a new test run
   * Enforces tenant isolation
   */
  async createTestRun(
    projectId: string,
    tenantId: string,
    data: {
      name: string;
      description?: string;
      environment: string;
      buildNumber?: string;
    },
    createdByUserId: string
  ) {
    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: { id: projectId, org: { id: tenantId } },
    });

    if (!project) {
      throw new Error('Project not found or does not belong to organization');
    }

    // Create test run
    const testRun = await prisma.testRun.create({
      data: {
        projectId,
        name: data.name,
        description: data.description,
        environment: data.environment,
        buildNumber: data.buildNumber,
        status: 'scheduled',
        createdById: createdByUserId,
      },
    });

    // Create associated statistics record
    await prisma.testRunStatistics.create({
      data: {
        testRunId: testRun.id,
        totalCount: 0,
        passedCount: 0,
        failedCount: 0,
        passRate: 0,
        riskScore: 'low',
      },
    });

    return testRun;
  }

  /**
   * Get test run with all related data
   */
  async getTestRun(runId: string, projectId: string, tenantId: string) {
    const testRun = await prisma.testRun.findFirst({
      where: {
        id: runId,
        projectId,
        project: { orgId: tenantId },
      },
      include: {
        statistics: true,
        cases: { include: { testCase: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!testRun) {
      throw new Error('Test run not found');
    }

    return testRun;
  }

  /**
   * Update test run status
   */
  async updateTestRunStatus(
    runId: string,
    projectId: string,
    tenantId: string,
    status: string,
    userId: string
  ) {
    // Verify ownership
    const testRun = await this.getTestRun(runId, projectId, tenantId);

    const updated = await prisma.testRun.update({
      where: { id: runId },
      data: {
        status,
        startedAt: status === 'in_progress' ? new Date() : undefined,
        completedAt: status === 'completed' ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        orgId: tenantId,
        userId,
        action: 'update',
        entityType: 'test_run',
        entityId: runId,
        entityName: testRun.name,
        changesAfter: { status },
        timestamp: new Date(),
      },
    });

    return updated;
  }

  // Additional methods...
}
```

### 3.4 Multi-Tenant Data Isolation Pattern

Every data fetch should verify tenant ownership:

```typescript
// Pattern used throughout services
const data = await prisma.model.findFirst({
  where: {
    id: resourceId,
    // AND condition to verify tenant owns this resource
    project: { orgId: tenantId }, // Through relationships
    // OR direct field (if available)
    tenantId: tenantId,
  },
});
```

### 3.5 Validation Pattern (Zod)

Use Zod validators in every route handler:

```typescript
// backend/src/validators/test-run.validator.ts
import { z } from 'zod';

export const createTestRunSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(255),
  description: z.string().optional(),
  environment: z.string().min(2, 'Environment is required'),
  buildNumber: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateTestRunSchema = createTestRunSchema.partial();

// In route handler:
router.post('/test-runs', authenticate, async (req, res) => {
  const validation = createTestRunSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      status: 'error',
      code: 400,
      error: 'VALIDATION_FAILED',
      message: 'Invalid request body',
      errors: validation.error.errors,
    });
  }

  // Continue with validated data
  const result = await testRunService.createTestRun(...);
});
```

### 3.6 Error Handling Pattern

Use the `AppError` class for structured error handling:

```typescript
// backend/src/middleware/errorHandler.ts
export class AppError extends Error {
  constructor(
    public code: number,
    public error: string,
    message: string,
    public details?: any
  ) {
    super(message);
  }
}

// Usage in services:
throw new AppError(
  401,
  'INVALID_CREDENTIALS',
  'Email or password is incorrect'
);

// Global error handler middleware catches and formats response
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.code).json({
      status: 'error',
      code: err.code,
      error: err.error,
      message: err.message,
      details: err.details,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle unexpected errors
  logger.error('Unexpected error:', err);
  return res.status(500).json({
    status: 'error',
    code: 500,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  });
};

// Register at the end of middleware chain
app.use(errorHandler);
```

### 3.7 Authentication Pattern

Uses JWT tokens stored in Authorization header:

```typescript
// backend/src/middleware/auth.ts
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      code: 401,
      error: 'MISSING_TOKEN',
      message: 'No authentication token provided',
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = authService.verifyToken(token);
    req.user = payload; // Add user to request
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      code: 401,
      error: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    });
  }
};

// Protect route:
router.get('/test-runs/:runId', authenticate, TestRunController.getTestRun);
```

---

## 4. Database & ORM (Prisma)

### 4.1 Prisma Schema Structure

```prisma
// database/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ===============================
// CORE MULTI-TENANCY
// ===============================

model Organization {
  id    String @id @default(uuid())
  name  String
  slug  String @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users                  User[]
  projects               Project[]
  orgMembers             OrgMember[]
  invitations            Invitation[]
  auditLogs              AuditLog[]
}

model User {
  id    String @id @default(uuid())
  email String @unique
  name  String
  passwordHash String
  
  orgId String
  org   Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  orgMembers ProjectMember[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ===============================
// PROJECT LEVEL
// ===============================

model Project {
  id    String @id @default(uuid())
  name  String
  key   String
  orgId String

  org   Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  suites     TestSuite[]
  cases      TestCase[]
  runs       TestRun[]
  plans      TestPlan[]
  customFields CustomField[]
  integrations Integration[]
  auditLogs  AuditLog[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([orgId, key])
}

// ===============================
// TEST REPOSITORY
// ===============================

model TestSuite {
  id    String @id @default(uuid())
  projectId String
  name  String
  parentId String?
  
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parent    TestSuite? @relation("SuiteHierarchy", fields: [parentId], references: [id])
  children  TestSuite[] @relation("SuiteHierarchy")
  cases     TestCase[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model TestCase {
  id    String @id @default(uuid())
  suiteId String
  projectId String
  title String
  description String?
  priority String // critical, high, medium, low
  type  String // functional, regression, smoke, integration, e2e, performance
  
  suite TestSuite @relation(fields: [suiteId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  steps TestStep[]
  history TestCaseHistory[]
  comments TestCaseComment[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([suiteId])
  @@index([projectId])
}

// ... Continue with all models from BACKEND_CONTEXT.md
```

### 4.2 Running Migrations

```bash
# Create migration
npm run db:migrate

# Deploy migrations (production)
npm run db:migrate:prod

# Reset database (development only!)
npm run db:reset

# Open Prisma Studio (GUI for database)
npm run db:studio
```

---

## 5. Caching & Redis Strategy

### 5.1 Cache Key Generator

```typescript
// backend/src/utils/cacheKeyGenerator.ts
export class CacheKeyGenerator {
  static testRun(runId: string) {
    return `test_run:${runId}`;
  }

  static testRunStats(runId: string) {
    return `test_run:${runId}:stats`;
  }

  static project(projectId: string) {
    return `project:${projectId}`;
  }

  static testSuite(suiteId: string) {
    return `suite:${suiteId}`;
  }

  static testCase(caseId: string) {
    return `case:${caseId}`;
  }

  static analyticsData(projectId: string, period: string) {
    return `analytics:${projectId}:${period}`;
  }
}
```

### 5.2 Cache Middleware

```typescript
// backend/src/middleware/cache.middleware.ts
export const cacheGet = (key: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (error) {
      console.error('Cache error:', error);
    }
    next();
  };
};

// Usage in route:
router.get(
  '/test-runs/:runId',
  authenticate,
  cacheGet(CacheKeyGenerator.testRun(req.params.runId)),
  TestRunController.getTestRun
);
```

### 5.3 Cache Invalidation Pattern

Whenever data changes, invalidate the cache:

```typescript
// In service when updating test run:
await prisma.testRun.update({ ... });
await redis.del(CacheKeyGenerator.testRun(runId));
await redis.del(CacheKeyGenerator.testRunStats(runId));
```

---

## 6. Job Queues (BullMQ)

### 6.1 Queue Setup

```typescript
// backend/src/queues/test-execution.queue.ts
import Queue from 'bullmq';
import { redis } from '../config/redis';

export const testExecutionQueue = new Queue('test-execution', {
  connection: redis,
});

// Define job handler
testExecutionQueue.process(async (job) => {
  const { runId, caseId, testerId } = job.data;
  
  // Update execution statistics
  // Trigger real-time WebSocket update
  // Calculate pass rate changes
  // Check for failure thresholds
  
  return { success: true };
});

// Listen for job events
testExecutionQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

testExecutionQueue.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});
```

### 6.2 Adding Jobs to Queue

```typescript
// In ExecutionService
async recordStepCompletion(stepId: string, result: string, status: string) {
  // Update database
  await prisma.executionStep.update({ ... });

  // Queue job for async processing
  await testExecutionQueue.add('update-metrics', {
    runId,
    caseId,
    stepStatus: status,
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });

  return updatedStep;
}
```

---

## 7. Real-Time Updates (Socket.io)

### 7.1 Socket.io Setup

```typescript
// backend/src/index.ts
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: config.CORS_ORIGIN },
});

// Authentication for WebSocket
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const payload = authService.verifyToken(token);
    socket.data.user = payload;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.data.user.userId} connected`);

  // Join room for test run updates
  socket.on('subscribe-test-run', (runId) => {
    socket.join(`test-run:${runId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

httpServer.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});
```

### 7.2 Broadcasting Updates

```typescript
// When test case execution completes:
io.to(`test-run:${runId}`).emit('case-completed', {
  caseId,
  status: 'passed',
  actualTime: 30,
});

// Update real-time metrics
io.to(`test-run:${runId}`).emit('stats-updated', {
  passRate: 85.7,
  completionRate: 92.3,
  passedCount: 42,
});
```

---

## 8. Environment Configuration

### 8.1 .env.example

```bash
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/test_jedi_dev

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Redis
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info

# Sentry
SENTRY_DSN=https://your-sentry-dsn@sentry.io/123456
SENTRY_ENVIRONMENT=development

# Email
EMAIL_PROVIDER=TEST  # or GMAIL, SENDGRID
GMAIL_USER=
GMAIL_PASSWORD=
EMAIL_FROM=noreply@test-jedi.com
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Integrations
JIRA_APP_ID=
GITHUB_APP_ID=
SLACK_BOT_TOKEN=

# Session
SESSION_SECRET=change-this-secret
```

---

## 9. Middleware Chain (Order Matters!)

```typescript
// In backend/src/index.ts
const app = express();

// 1. Initialize Sentry (MUST be first)
initSentry();

// 2. Sentry request handler
app.use(sentryRequestMiddleware);

// 3. Global rate limiting
app.use('/api/', apiLimiter);

// 4. Security (helmet, CORS)
app.use(helmet());
app.use(cors(corsOptions));

// 5. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 6. Session management (MUST be after body parsing)
app.use(session(sessionConfig));

// 7. Request logging
app.use(requestLogger);

// 8. Sentry context capture
app.use(sentryContextMiddleware);

// 9. Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', authenticate, projectRoutes);
app.use('/api/test-runs', authenticate, testRunRoutes);
// ... more routes

// 10. 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    code: 404,
    error: 'NOT_FOUND',
    message: 'Endpoint not found',
  });
});

// 11. Error handler (MUST be last)
app.use(errorHandler);

// 12. Sentry error handler (after custom error handler)
app.use(sentryErrorMiddleware);
```

---

## 10. Testing Strategy

### 10.1 Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/backend'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/backend/jest.setup.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
};
```

### 10.2 Test Structure

```typescript
// backend/tests/unit/services/TestRunService.test.ts
import { TestRunService } from '../../../src/services/TestRunService';
import { prismaMock } from '../../mocks/prisma.mock';

jest.mock('@prisma/client');

describe('TestRunService', () => {
  let service: TestRunService;

  beforeEach(() => {
    service = new TestRunService();
  });

  describe('createTestRun', () => {
    it('should create a test run with initial statistics', async () => {
      const mockRun = {
        id: 'test-run-1',
        name: 'Sprint 23 Testing',
        projectId: 'project-1',
        status: 'scheduled',
      };

      prismaMock.testRun.create.mockResolvedValue(mockRun as any);
      prismaMock.testRunStatistics.create.mockResolvedValue({} as any);

      const result = await service.createTestRun(
        'project-1',
        'tenant-1',
        { name: 'Sprint 23 Testing' },
        'user-1'
      );

      expect(result.id).toBe('test-run-1');
      expect(prismaMock.testRunStatistics.create).toHaveBeenCalled();
    });

    it('should throw error if project not found', async () => {
      prismaMock.project.findFirst.mockResolvedValue(null);

      await expect(
        service.createTestRun('invalid-project', 'tenant-1', {}, 'user-1')
      ).rejects.toThrow('Project not found');
    });
  });
});
```

---

## 11. Implementation Step-by-Step

### Phase 1: Foundation
1. **Setup Project Structure**
   ```bash
   npm install
   npm run build
   npm run dev
   ```

2. **Configure Database**
   - Set DATABASE_URL in .env
   - Create Prisma schema (copy pattern from database.md)
   - Run migrations: `npm run db:migrate`

3. **Implement Auth**
   - Create AuthService, AuthController
   - Implement JWT token generation/verification
   - Set up auth middleware
   - Create /api/auth/register and /api/auth/login

4. **Setup Multi-Tenancy**
   - Implement tenantIsolation middleware
   - Add tenant context to all queries
   - Verify data isolation

### Phase 2: Core Features
5. **Test Repository**
   - Create TestRepositoryService (suites + cases)
   - Implement CRUD for suites and cases
   - Add bulk import from CSV

6. **Test Runs**
   - Create TestRunService
   - Implement test run lifecycle (scheduled → in_progress → completed)
   - Add case assignment

7. **Test Execution**
   - Create ExecutionService
   - Implement step result recording
   - Add attachment upload
   - Real-time metrics updates

### Phase 3: Analytics & Advanced Features
8. **Analytics**
   - Create AnalyticsService
   - Implement aggregation queries
   - Cache analytics data
   - Queue job for nightly calculations

9. **Integrations**
   - Create IntegrationService
   - Implement Jira integration
   - Add GitHub/GitLab webhook handling
   - Slack notifications

10. **Admin & Settings**
    - Custom fields management
    - Audit logging
    - Data retention rules

---

## 12. Common Commands

```bash
# Development
npm run dev              # Start with auto-reload
npm run dev:no-watch   # Start without nodemon

# Database
npm run db:migrate     # Create/apply migrations
npm run db:seed        # Seed development data
npm run db:studio      # Open GUI for database

# Building & Running
npm run build          # Compile TypeScript
npm run start          # Run compiled code

# Testing
npm test               # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report

# Code Quality
npm run lint           # Check code style
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier

# Background Jobs
npm run workers        # Start job worker
npm run workers:dev    # Worker with auto-reload
```

---

## 13. Debugging & Troubleshooting

### Enable Debug Logging
```typescript
// Set in .env
LOG_LEVEL=debug

// Use in code
logger.debug('Debug message', { context });
```

### Common Issues

**Redis Connection Failed**
- Check Redis is running: `redis-cli ping`
- Verify REDIS_URL in .env

**Prisma Client Not Generated**
```bash
npx prisma generate
npm install
```

**TypeScript Compilation Errors**
```bash
npx tsc --noEmit  # Check without building
```

**Migration Conflicts**
```bash
npx prisma migrate resolve --rolled-back <migration_name>
```

---

## 14. Production Deployment

### Pre-Deployment Checklist
- [ ] All environment variables set (use .env.production)
- [ ] Database migrations applied
- [ ] Redis configured and tested
- [ ] Sentry DSN configured
- [ ] CORS_ORIGIN set correctly
- [ ] Rate limiting configured appropriately
- [ ] Email service configured

### Build & Deploy
```bash
npm run build
NODE_ENV=production npm start
```

### Monitoring
- Check logs: Winston logs to file and console
- Monitor errors: Sentry error tracking
- Track performance: Database query logging via Prisma

---

## 15. Next Steps

1. Review BlackPot Backend code for reference implementations
2. Clone project structure to test-jedi-backend
3. Implement models based on BACKEND_CONTEXT.md database schema
4. Start with authentication (foundational for everything)
5. Build test repository management
6. Implement test runs and execution
7. Add real-time updates with Socket.io
8. Implement analytics and advanced features

---

This implementation guide provides a complete blueprint for building the Test-Jedi backend using proven patterns from BlackPot Backend. Follow the structure, adapt the code examples to Test-Jedi's domain, and maintain consistency with the multi-tenant, service-oriented architecture.
