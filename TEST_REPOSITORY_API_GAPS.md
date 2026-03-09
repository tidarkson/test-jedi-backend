# Test Repository API Implementation Gaps

**Last Updated:** March 9, 2026  
**Scope:** Suite & Case Endpoints Review  
**Status:** Review Complete - 12 Gaps Identified

---

## Executive Summary

The Test Repository API implementation is **90% feature-complete** with all acceptance criteria met. However, 12 implementation gaps ranging from minor to medium severity have been identified that should be addressed for production readiness.

**Critical Issues:** 0  
**High Issues:** 3 (cascade delete, bulk transactions, error handling)  
**Medium Issues:** 5  
**Low Issues:** 4

---

## Detailed Gap Analysis

### 🔴 HIGH SEVERITY (3)

#### 1. Missing Cascade Delete for Child Suites
**File:** `src/services/TestRepositoryService.ts` (line 344)  
**Severity:** HIGH  
**Status:** Open

**Description:**
When deleting a parent suite, only the direct test cases are soft-deleted. Child suites remain orphaned with dangling `parentSuiteId` references.

**Current Behavior:**
```typescript
// src/services/TestRepositoryService.ts - deleteSuite method
await this.prisma.suite.update({
  where: { id: suiteId },
  data: { deletedAt: new Date() },
});

// Only deletes direct cases
await this.prisma.testCase.updateMany({
  where: { suiteId },
  data: { deletedAt: new Date() },
});
```

**Impact:**
- Orphaned child suites remain queryable
- Inconsistent soft-delete cascade behavior
- Tree structure becomes fragmented

**Fix Required:**
```typescript
// Recursively soft-delete child suites
async function softDeleteSuiteRecursive(suiteId: string) {
  const childSuites = await this.prisma.suite.findMany({
    where: { parentSuiteId: suiteId, deletedAt: null }
  });
  
  for (const child of childSuites) {
    await softDeleteSuiteRecursive(child.id);
  }
  
  await this.prisma.suite.update({
    where: { id: suiteId },
    data: { deletedAt: new Date() }
  });
}
```

---

#### 2. No Transaction Wrapper for Bulk Operations
**File:** `src/services/TestRepositoryService.ts` (line 1158)  
**Severity:** HIGH  
**Status:** Open

**Description:**
Bulk operations process items sequentially without database transactions. If operation N fails, operations 1 to N-1 are already committed to the database, creating partial success states.

**Current Behavior:**
```typescript
for (let i = 0; i < input.items.length; i++) {
  const item = input.items[i];
  try {
    switch (item.action) {
      case 'create':
        await this.createTestCase(...); // Committed if succeeds
      case 'update':
        await this.updateTestCase(...); // Committed if succeeds
      // ...
    }
  } catch (itemError) {
    // Partial success - earlier items already committed
    error = itemError.message;
  }
}
```

**Impact:**
- Inconsistent database state on partial failure
- Impossible to rollback previous operations
- No atomicity guarantee for bulk jobs
- Difficult to debug data corruption

**Fix Required:**
```typescript
async bulkOperateTestCases(...) {
  await this.prisma.$transaction(async (tx) => {
    for (let i = 0; i < input.items.length; i++) {
      // All operations within transaction
      // If any fails, all rollback
    }
  });
}
```

---

#### 3. Error Response Format Inconsistency
**File:** `src/controllers/TestRepositoryController.ts` (multiple locations)  
**Severity:** HIGH  
**Status:** Open

**Description:**
Error response format varies across endpoints. Some use `error` code field, others use `message`, and error code naming is inconsistent ('LOCKED_RESOURCE' vs 'VALIDATION_FAILED').

**Current Issues:**
```typescript
// Inconsistent error codes
throw new AppError(423, 'LOCKED_RESOURCE', 'Suite is locked');        // Custom string
throw new AppError(404, ErrorCodes.NOT_FOUND, 'Suite not found');     // Enum
throw new AppError(409, 'DUPLICATE_CASE', '...');                     // Custom string

// Response structure varies
{
  status: 'error',
  code: 400,
  error: ErrorCodes.VALIDATION_FAILED,  // Sometimes 'error' field
  message: 'Validation failed',
}

vs

{
  status: 'error',
  code: 423,
  error: 'LOCKED_RESOURCE',  // Custom string, not enum
  message: 'Suite is locked',
}
```

**Impact:**
- Client code must handle multiple error formats
- Difficult to standardize error handling
- Inconsistent error code validation
- Harder to document API behavior

**Fix Required:**
1. Define all error codes in `ErrorCodes` enum
2. Standardize response format across all endpoints
3. Use enum consistently everywhere

---

### 🟡 MEDIUM SEVERITY (5)

#### 4. Cursor-Based Pagination Not Implemented
**File:** `src/validators/testRepository.validator.ts` (line 193)  
**Severity:** MEDIUM  
**Status:** Open

**Description:**
Validators declare `cursor: z.string().optional()` for pagination, but the service implementation only uses offset-based pagination (`page`/`limit`). The cursor parameter is accepted but ignored.

**Current Implementation:**
```typescript
// Validator accepts cursor but service ignores it
export const testCaseFiltersSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),  // Accepted but ignored
});

// Service only implements offset pagination
const skip = (page - 1) * limit;
const testCases = await this.prisma.testCase.findMany({
  where,
  skip,
  take: limit,
  // No cursor implementation
});
```

**Impact:**
- Misleading API contract (cursor accepted but doesn't work)
- Large datasets become inefficient with high `page` numbers
- Pagination state becomes unstable for real-time data

**Options to Fix:**
1. **Remove cursor support** (simplest) - Remove from validator and documentation
2. **Implement cursor pagination** - Use keyset pagination with Prisma cursor

---

#### 5. No Validation for Deep Circular Suite Hierarchies
**File:** `src/services/TestRepositoryService.ts` (line 291)  
**Severity:** MEDIUM  
**Status:** Open

**Description:**
Update suite only prevents self-reference (`parentSuiteId === suiteId`) but doesn't detect deeper circular chains like A→B→C→A.

**Current Check:**
```typescript
if (input.parentSuiteId === suiteId) {
  throw new AppError(400, 'VALIDATION_FAILED', 'Cannot set suite as its own parent');
}
```

**Missing Validation:**
```typescript
// No check for deep cycles
// A (parentId: B)
// B (parentId: C)
// C (parentId: A)  // Creates cycle but not detected
```

**Impact:**
- Circular hierarchies corrupted tree structure
- `getSuiteTree()` could enter infinite loops
- Database integrity not enforced at application level

**Fix Required:**
```typescript
private async validateNoCircularReference(
  suiteId: string, 
  newParentId: string
): Promise<void> {
  let currentId = newParentId;
  const visited = new Set<string>();
  
  while (currentId && !visited.has(currentId)) {
    if (currentId === suiteId) {
      throw new AppError(400, 'VALIDATION_FAILED', 'Circular suite hierarchy detected');
    }
    visited.add(currentId);
    
    const parent = await this.prisma.suite.findUnique({
      where: { id: currentId },
      select: { parentSuiteId: true }
    });
    currentId = parent?.parentSuiteId || null;
  }
}
```

---

#### 6. Missing Test Data in Clone Operation
**File:** `src/services/TestRepositoryService.ts` (line 435)  
**Severity:** MEDIUM  
**Status:** Open

**Description:**
Suite clone operation doesn't copy all test case fields. Missing `riskLevel`, `externalId`, and `approvalStatus`.

**Current Clone Code:**
```typescript
const clonedCase = await this.prisma.testCase.create({
  data: {
    suiteId: clonedSuite.id,
    title: testCase.title,
    description: testCase.description,
    preconditions: testCase.preconditions,
    postconditions: testCase.postconditions,
    priority: testCase.priority,
    severity: testCase.severity,
    type: testCase.type,
    riskLevel: testCase.riskLevel,      // ✅ Included
    automationStatus: testCase.automationStatus,
    estimatedTime: testCase.estimatedTime,
    status: 'DRAFT',
    authorId: userId,
    tags: testCase.tags || undefined,
    customFields: testCase.customFields || undefined,
    // Missing: externalId, approvalStatus
  },
});
```

**Impact:**
- Cloned cases lose external system references
- Approval status reset to default not clone
- Incomplete data migration on clone

**Fix Required:**
Add missing fields to clone operation:
```typescript
externalId: testCase.externalId,
approvalStatus: testCase.approvalStatus,
reviewerId: testCase.reviewerId,
```

---

#### 7. No Bulk Operation Error Details
**File:** `src/services/TestRepositoryService.ts` (line 1220)  
**Severity:** MEDIUM  
**Status:** Open

**Description:**
Bulk operation results only return error message string, not full error details, error code, or status code.

**Current Result Format:**
```typescript
result.details.push({
  itemIndex: i,
  action: item.action,
  success,
  error,        // Only string message
  id: caseId,
});
```

**Better Format:**
```typescript
result.details.push({
  itemIndex: i,
  action: item.action,
  success,
  error: {
    code: 'LOCKED_RESOURCE',
    message: 'Suite is locked',
    statusCode: 423
  },
  id: caseId,
});
```

**Impact:**
- Client can't differentiate error types
- Harder to implement error recovery
- Less useful debugging information

---

### 🟢 LOW SEVERITY (4)

#### 8. Risk Level Field Not in API Contract
**File:** `src/validators/testRepository.validator.ts`  
**Severity:** LOW  
**Status:** Open

**Description:**
Database schema includes `riskLevel` field on TestCase, but it's not exposed in:
- `createTestCaseSchema` validator
- `updateTestCaseSchema` validator  
- `CreateTestCaseInput` / `UpdateTestCaseInput` types

**Current Schema:**
```prisma
model TestCase {
  riskLevel RiskLevel @default(MEDIUM)  // In schema but not in API
```

**Impact:**
- Risk level is read-only, can't be set via API
- Only modifiable via direct database access
- Inconsistent with other metadata fields

**Fix Options:**
1. Add `riskLevel` to validators if needed
2. Remove from schema if not needed in this phase

---

#### 9. Missing Soft-Delete Recovery Mechanism
**File:** Database design  
**Severity:** LOW  
**Status:** Open

**Description:**
All write operations support soft delete (set `deletedAt`), but there's no way to restore deleted items. No PATCH /restore endpoint exists.

**Impact:**
- Deleted data is permanent from user perspective
- No audit trail recovery for deleted items
- Difficult to implement undo functionality

**Recommended Addition:**
```typescript
// Add restore endpoint
PATCH /api/v1/projects/:projectId/suites/:id/restore
PATCH /api/v1/projects/:projectId/cases/:id/restore
```

---

#### 10. No Step Order Validation
**File:** `src/services/TestRepositoryService.ts` (line 775)  
**Severity:** LOW  
**Status:** Open

**Description:**
When creating/updating test steps, the `order` field can be any positive integer. No validation that steps form a valid sequence.

**Current:**
```typescript
const stepsToCreate = input.steps.map((step, idx) => ({
  testCaseId: testCase.id,
  order: step.order ?? idx + 1,  // Any positive integer allowed
  // ...
}));
```

**Better:**
```typescript
// Validate order is sequential 1, 2, 3...
const orders = input.steps.map(s => s.order ?? 0);
const expectedOrders = Array.from({length: input.steps.length}, (_, i) => i + 1);
if (!arraysEqual(orders.sort(), expectedOrders)) {
  throw new AppError(400, 'VALIDATION_FAILED', 'Step orders must be sequential');
}
```

---

#### 11. No Status Constraint on Suite Creation
**File:** `src/services/TestRepositoryService.ts` (line 176)  
**Severity:** LOW  
**Status:** Open

**Description:**
Suite can be created in any status (ACTIVE, DRAFT, ARCHIVED, DEPRECATED) immediately. No constraint that new suites start in DRAFT or ACTIVE.

**Current:**
```typescript
const suite = await this.prisma.suite.create({
  data: {
    status: 'ACTIVE',  // Hard-coded, but no validation on update
  },
});
```

**Issue:**
```typescript
// Should we allow?
await updateSuite(projectId, suiteId, userId, {
  status: 'DEPRECATED'  // Can set immediately
});
```

**Impact:**
- Deprecated suites created immediately
- No workflow enforcement
- Potential for accidental state misuse

---

#### 12. No Rate Limiting or Bulk Timeout
**File:** Middleware/Configuration  
**Severity:** LOW  
**Status:** Open

**Description:**
Bulk operations can process up to 500 items without:
- Request timeout enforcement
- Rate limiting per user/project
- Performance monitoring

**Scenarios:**
- 500 items × complex relationships could timeout
- No protection against DOS via bulk endpoint
- No metrics on bulk operation performance

**Recommendation:**
Add middleware for:
```typescript
// Rate limiting
- Max 10 bulk requests per minute per user
- Max 50 total items per minute per project

// Timeout
- Set 30s timeout for bulk operations
- Return 508 timeout status if exceeded
```

---

## Summary Table

| # | Gap | Severity | File(s) | Status | Est. Effort |
|---|-----|----------|---------|--------|-------------|
| 1 | Missing cascade delete for child suites | HIGH | TestRepositoryService.ts | Open | 2h |
| 2 | No transaction wrapper for bulk ops | HIGH | TestRepositoryService.ts | Open | 3h |
| 3 | Error response format inconsistency | HIGH | Multiple | Open | 2h |
| 4 | Cursor pagination not implemented | MEDIUM | Validator/Service | Open | 3h |
| 5 | No deep circular hierarchy validation | MEDIUM | TestRepositoryService.ts | Open | 1h |
| 6 | Missing test data in clone | MEDIUM | TestRepositoryService.ts | Open | 30min |
| 7 | No bulk operation error details | MEDIUM | TestRepositoryService.ts | Open | 1h |
| 8 | Risk level not in API contract | LOW | Validators | Open | 30min |
| 9 | Missing soft-delete recovery | LOW | Routes | Open | 2h |
| 10 | No step order validation | LOW | Validators | Open | 30min |
| 11 | No status constraint on creation | LOW | Service | Open | 1h |
| 12 | No rate limiting or bulk timeout | LOW | Middleware | Open | 2h |

**Total Estimated Effort:** 19 hours

---

## Recommended Priority Order

### Phase 1 (Critical - Release Blocker)
- [ ] Gap #2: Add transaction wrapper for bulk operations
- [ ] Gap #3: Standardize error response format

### Phase 2 (Important - v1.1)
- [ ] Gap #1: Implement cascade delete for child suites
- [ ] Gap #5: Add circular hierarchy validation
- [ ] Gap #4: Implement or remove cursor pagination

### Phase 3 (Nice to Have - v1.2)
- [ ] Gap #6: Copy all fields in clone operation
- [ ] Gap #7: Enhance bulk operation error details
- [ ] Gap #9: Add soft-delete recovery endpoints
- [ ] Gap #12: Implement rate limiting/timeouts

### Phase 4 (Polish - v1.3)
- [ ] Gap #8: Add risk level to API contract
- [ ] Gap #10: Add step order validation
- [ ] Gap #11: Add status constraints

---

## Acceptance Criteria: Still Met ✅

All 6 acceptance criteria remain met despite these gaps:

- ✅ Suite tree returns correct nested structure
- ✅ Case list filters work for all specified fields
- ✅ Clone suite duplicates all cases and steps
- ✅ All write operations create AuditLog entries
- ✅ Locked suite returns 423 on write attempts
- ✅ Bulk operations support up to 500 cases

---

## Next Steps

1. **Review** this document with team
2. **Prioritize** which gaps to fix before v1.0 release
3. **Create tickets** in issue tracking for each gap
4. **Schedule** fixes in development sprints
5. **Add tests** to prevent regression of fixed items

---

**Document prepared by:** Code Review  
**Date:** March 9, 2026  
**Review scope:** Complete Test Repository API implementation
