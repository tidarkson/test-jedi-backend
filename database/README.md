# Database Setup Guide

This directory contains the Prisma schema and database configuration for Test-Jedi Backend.

## Directory Structure

```
database/
├── prisma/
│   ├── schema.prisma        # Core database schema (14 entities + supporting models)
│   └── migrations/          # Auto-generated migration files
├── seeds/
│   └── seed.ts              # Development data seeding script
└── sql/
    ├── views.sql            # Custom SQL views (for analytics)
    └── functions.sql        # Custom SQL functions (optional)
```

## Quick Start

### 1. Install Dependencies

```bash
cd test-jedi-backend
npm install
```

### 2. Configure Database URL

Create a `.env` file in the root directory with your PostgreSQL connection string:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/test_jedi_dev"
```

**Example for local PostgreSQL:**
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/test_jedi_dev"
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Create and Apply Initial Migration

```bash
# Create migration
npx prisma migrate dev --name "init_core_schema"

# Or push schema directly (development only)
npx prisma db push
```

### 5. Seed Development Data (Optional)

```bash
npx prisma db seed
```

This will:
- Create a sample organization (Acme Corporation)
- Create user accounts (admin, manager, tester)
- Create a sample project with suites and test cases
- Create test runs with execution data
- Create defects from failed tests
- Create audit logs

### 6. Open Database GUI (Optional)

```bash
npx prisma studio
```

Opens Prisma Studio at `http://localhost:5555` - visual database explorer.

---

## Schema Overview

### 14 Core Entities

#### 1. **User**
- User accounts with roles (ADMIN, MANAGER, TESTER, VIEWER)
- Associated with organizations and projects
- Creates and reviews test content

#### 2. **Organization**
- Top-level tenant entity
- Contains projects, teams, and settings
- Supports 3 subscription plans (FREE, PROFESSIONAL, ENTERPRISE)

#### 3. **Project**
- Organization's test projects
- Contains suites, test runs, and plans
- Flexible settings via JSONB

#### 4. **Suite**
- Hierarchical organization of test cases
- Supports parent-child nesting
- Ownership and review workflows

#### 5. **TestCase**
- Individual test cases with rich metadata
- Supports multiple priority and severity levels
- Tracks automation status and approval workflow
- Custom fields and tagging support

#### 6. **TestStep**
- Sequential steps within a test case
- Expected results and test data
- Linked to step execution results

#### 7. **TestRun**
- Test execution cycles (scheduled, in-progress, completed)
- Multiple execution types (manual, automated, hybrid)
- Tracks build numbers, branches, and environments

#### 8. **RunCase**
- Assignment of test cases to test runs
- Tracks execution status and type
- Links to step results and defects

#### 9. **StepResult**
- Execution results for individual steps
- Supports attachments (screenshots, logs)
- Detailed comments and status tracking

#### 10. **Defect**
- Issues found during test execution
- Tracks status and external issue links
- Integrates with Jira, Azure DevOps, GitHub

#### 11. **TestPlan**
- Planning documents for test execution
- Version tracking and lifecycle management
- Linked to milestones

#### 12. **Milestone**
- Project timeline markers
- Status tracking (planned, in-progress, completed)
- Used as deadline for test runs and plans

#### 13. **AuditLog**
- Comprehensive action tracking
- User activity history
- Change tracking via JSONB diff field

#### 14. **Tag**
- Project-level categorization
- Custom colors for visual organization
- Used for filtering and reporting

### Supporting Models

- **OrganizationMember** - Multi-tenant membership with role-based access
- **ProjectMember** - Project team membership and roles

---

## Key Features

### ✅ Multi-Tenancy
- Organization-level isolation
- All data flows through organization hierarchy
- Ensures secure data separation

### ✅ Soft Deletes
Applied to Suite, TestCase, and TestRun with `deletedAt` field:
```prisma
where: { deletedAt: null }
```

### ✅ Cascade Rules
- DELETE operations cascade appropriately
- Maintains referential integrity
- Protects data consistency

### ✅ JSONB Fields
Flexible data structures for:
- `customFields` in TestCase
- `settings` in Organization/Project
- `testData` in TestStep
- `attachments` in StepResult
- `diff` in AuditLog

### ✅ Comprehensive Indexes
All foreign keys and frequently queried fields indexed:
- Status fields (priority, severity, automation status)
- Foreign keys (suiteId, runId, projectId)
- Soft delete fields (deletedAt)
- Audit fields (userId, action, createdAt)

### ✅ 17 Enums
Type safety for all status/type fields:
- UserRole, OrganizationPlan
- SuiteStatus, TestCaseType, TestCasePriority
- TestRunStatus, RunCaseStatus, StepResultStatus
- DefectStatus, TestPlanStatus, MilestoneStatus
- AuditAction, and more

---

## Common Commands

```bash
# Generate Prisma Client
npx prisma generate

# Create a new migration
npx prisma migrate dev --name "your_migration_name"

# Apply migrations
npx prisma migrate deploy

# Reset database (development only!)
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# Push schema directly (no migration file)
npx prisma db push

# Seed development data
npx prisma db seed

# Open Prisma Studio
npx prisma studio

# Format schema
npx prisma format
```

---

## Environment Variables

### Required
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

### Optional (for seeding)
```bash
NODE_ENV=development
```

---

## Writing Queries with Prisma

### Create Organization with Members
```typescript
const org = await prisma.organization.create({
  data: {
    name: 'Company Name',
    slug: 'company-slug',
    plan: 'PROFESSIONAL',
    settings: {
      timezone: 'UTC',
      features: ['custom_fields'],
    },
    members: {
      create: {
        userId: userId,
        role: 'ADMIN',
      },
    },
  },
});
```

### Query with Tenant Isolation
```typescript
// Verify project belongs to organization
const project = await prisma.project.findFirst({
  where: {
    id: projectId,
    organizationId: orgId,
  },
  include: {
    suites: {
      where: { deletedAt: null },
    },
  },
});
```

### Create Run Case with Results
```typescript
const runCase = await prisma.runCase.create({
  data: {
    runId,
    caseId,
    status: 'IN_PROGRESS',
    stepResults: {
      create: [
        {
          stepId: step1.id,
          status: 'PASSED',
        },
      ],
    },
  },
});
```

### Query with Soft Deletes
```typescript
// Get only active test cases
const cases = await prisma.testCase.findMany({
  where: {
    suiteId,
    deletedAt: null,
  },
  orderBy: {
    createdAt: 'desc',
  },
});
```

---

## Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Test connection
psql postgresql://user:password@localhost:5432/test_jedi_dev
```

### Prisma Client Not Generated
```bash
npx prisma generate
npm install @prisma/client
```

### Migration Conflicts
```bash
# See migration status
npx prisma migrate status

# Resolve failed migration
npx prisma migrate resolve --rolled-back 20240305120000_init

# Reset (development only)
npx prisma migrate reset
```

### Type Errors
```bash
# Regenerate types
npx tsc --noEmit
npx prisma generate
```

---

## Migration Best Practices

1. **Always create named migrations:**
   ```bash
   npx prisma migrate dev --name "add_custom_field_to_testcase"
   ```

2. **Review migration SQL before deploying:**
   ```bash
   cat database/prisma/migrations/[timestamp]_[name]/migration.sql
   ```

3. **Test migrations locally first:**
   ```bash
   npx prisma migrate deploy --preview-feature
   ```

4. **Keep migrations clean:**
   - One logical change per migration
   - Descriptive names
   - Document complex changes in comments

---

## Backup & Recovery

### Backup Database
```bash
pg_dump postgresql://user:password@host:port/database > backup.sql
```

### Restore Database
```bash
psql postgresql://user:password@host:port/database < backup.sql
```

### Seed After Restore
```bash
npx prisma db seed
```

---

## Production Checklist

- [ ] DATABASE_URL configured in production environment
- [ ] Migrations applied: `npx prisma migrate deploy`
- [ ] Indexes created successfully
- [ ] Backup strategy in place
- [ ] Read replicas configured (if needed)
- [ ] Monitoring/alerting set up
- [ ] Connection pooling configured (PgBouncer/pgpool)
- [ ] Regular backups scheduled

---

## References

- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)

---

## Support

For issues or questions:
1. Check [Prisma Community](https://www.prisma.io/community)
2. Review [Prisma Troubleshooting Guide](https://www.prisma.io/docs/reference/api-reference/error-reference)
3. Check database logs: `SELECT * FROM pg_stat_statements`
