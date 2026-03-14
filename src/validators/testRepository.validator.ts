import { z } from 'zod';

/**
 * Suite Validators
 */
export const createSuiteSchema = z.object({
  name: z
    .string()
    .min(1, 'Suite name is required')
    .max(255, 'Suite name must be less than 255 characters'),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  parentSuiteId: z
    .string()
    .uuid('Invalid parent suite ID')
    .optional(),
});

export const updateSuiteSchema = z.object({
  name: z
    .string()
    .min(1, 'Suite name is required')
    .max(255, 'Suite name must be less than 255 characters')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  parentSuiteId: z
    .string()
    .uuid('Invalid parent suite ID')
    .optional(),
  status: z
    .enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'DEPRECATED'])
    .optional(),
  reviewerId: z
    .string()
    .uuid('Invalid reviewer ID')
    .nullable()
    .optional(),
});

/**
 * Test Case Validators
 */
const testStepSchema = z.object({
  order: z.number().int().positive().optional(),
  action: z
    .string()
    .min(1, 'Action is required')
    .max(2000, 'Action description too long'),
  expectedResult: z
    .string()
    .min(1, 'Expected result is required')
    .max(2000, 'Expected result too long'),
  testData: z.record(z.string(), z.any()).optional(),
});

export const createTestCaseSchema = z.object({
  title: z
    .string()
    .min(1, 'Test case title is required')
    .max(500, 'Title must be less than 500 characters'),
  description: z
    .string()
    .max(3000, 'Description must be less than 3000 characters')
    .optional(),
  preconditions: z
    .string()
    .max(2000, 'Preconditions must be less than 2000 characters')
    .optional(),
  postconditions: z
    .string()
    .max(2000, 'Postconditions must be less than 2000 characters')
    .optional(),
  priority: z
    .enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
    .optional(),
  severity: z
    .enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'])
    .optional(),
  type: z
    .enum([
      'FUNCTIONAL',
      'REGRESSION',
      'SMOKE',
      'INTEGRATION',
      'E2E',
      'PERFORMANCE',
      'SECURITY',
      'USABILITY',
    ])
    .optional(),
  automationStatus: z
    .enum([
      'MANUAL',
      'AUTOMATED',
      'PARTIALLY_AUTOMATED',
      'PENDING_AUTOMATION',
    ])
    .optional(),
  estimatedTime: z
    .number()
    .int()
    .positive()
    .optional(),
  reviewerId: z
    .string()
    .uuid('Invalid reviewer ID')
    .optional(),
  tags: z.array(z.string().min(1, 'Tag is required')).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  steps: z.array(testStepSchema).optional(),
});

export const updateTestCaseSchema = z.object({
  title: z
    .string()
    .min(1, 'Test case title is required')
    .max(500, 'Title must be less than 500 characters')
    .optional(),
  description: z
    .string()
    .max(3000, 'Description must be less than 3000 characters')
    .optional(),
  preconditions: z
    .string()
    .max(2000, 'Preconditions must be less than 2000 characters')
    .optional(),
  postconditions: z
    .string()
    .max(2000, 'Postconditions must be less than 2000 characters')
    .optional(),
  priority: z
    .enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
    .optional(),
  severity: z
    .enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'])
    .optional(),
  type: z
    .enum([
      'FUNCTIONAL',
      'REGRESSION',
      'SMOKE',
      'INTEGRATION',
      'E2E',
      'PERFORMANCE',
      'SECURITY',
      'USABILITY',
    ])
    .optional(),
  automationStatus: z
    .enum([
      'MANUAL',
      'AUTOMATED',
      'PARTIALLY_AUTOMATED',
      'PENDING_AUTOMATION',
    ])
    .optional(),
  estimatedTime: z
    .number()
    .int()
    .positive()
    .optional(),
  status: z
    .enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'DEPRECATED'])
    .optional(),
  reviewerId: z
    .string()
    .uuid('Invalid reviewer ID')
    .optional(),
  approvalStatus: z
    .enum(['PENDING', 'APPROVED', 'REJECTED'])
    .optional(),
  tags: z.array(z.string().min(1, 'Tag is required')).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  steps: z.array(testStepSchema).optional(),
});

const exportedCaseSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(3000).nullable().optional(),
  preconditions: z.string().max(2000).nullable().optional(),
  postconditions: z.string().max(2000).nullable().optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  severity: z.enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL']),
  type: z.enum([
    'FUNCTIONAL',
    'REGRESSION',
    'SMOKE',
    'INTEGRATION',
    'E2E',
    'PERFORMANCE',
    'SECURITY',
    'USABILITY',
  ]),
  automationStatus: z.enum([
    'MANUAL',
    'AUTOMATED',
    'PARTIALLY_AUTOMATED',
    'PENDING_AUTOMATION',
  ]),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'DEPRECATED']),
  estimatedTime: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string().min(1)).default([]),
  customFields: z.record(z.string(), z.any()).optional(),
  steps: z.array(testStepSchema).default([]),
});

type ExportedSuiteSchema = {
  name: string;
  description?: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'DEPRECATED';
  isLocked: boolean;
  cases: z.infer<typeof exportedCaseSchema>[];
  childSuites: ExportedSuiteSchema[];
};

const exportedSuiteSchema: z.ZodType<ExportedSuiteSchema> = z.lazy(() => z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'DEPRECATED']),
  isLocked: z.boolean(),
  cases: z.array(exportedCaseSchema).default([]),
  childSuites: z.array(exportedSuiteSchema).default([]),
}));

export const repositoryImportSchema = z.object({
  parentSuiteId: z.string().uuid('Invalid parent suite ID').optional(),
  repository: z.object({
    version: z.literal(1),
    exportedAt: z.string().datetime(),
    projectId: z.string().uuid('Invalid source project ID'),
    projectName: z.string().min(1),
    rootSuites: z.array(exportedSuiteSchema),
  }),
});

export const repositoryExportQuerySchema = z.object({
  suiteId: z.string().uuid('Invalid suite ID').optional(),
});

/**
 * Pagination & Filters
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
});

export const testCaseFiltersSchema = z.object({
  suiteId: z.string().uuid().optional(),
  priority: z
    .union([
      z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
      z.array(z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])),
    ])
    .optional(),
  severity: z
    .union([
      z.enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL']),
      z.array(z.enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'])),
    ])
    .optional(),
  type: z
    .union([
      z.enum([
        'FUNCTIONAL',
        'REGRESSION',
        'SMOKE',
        'INTEGRATION',
        'E2E',
        'PERFORMANCE',
        'SECURITY',
        'USABILITY',
      ]),
      z.array(
        z.enum([
          'FUNCTIONAL',
          'REGRESSION',
          'SMOKE',
          'INTEGRATION',
          'E2E',
          'PERFORMANCE',
          'SECURITY',
          'USABILITY',
        ]),
      ),
    ])
    .optional(),
  automationStatus: z
    .union([
      z.enum([
        'MANUAL',
        'AUTOMATED',
        'PARTIALLY_AUTOMATED',
        'PENDING_AUTOMATION',
      ]),
      z.array(
        z.enum([
          'MANUAL',
          'AUTOMATED',
          'PARTIALLY_AUTOMATED',
          'PENDING_AUTOMATION',
        ]),
      ),
    ])
    .optional(),
  status: z
    .union([
      z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'DEPRECATED']),
      z.array(z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'DEPRECATED'])),
    ])
    .optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

/**
 * Bulk Operations
 */
const bulkItemSchema = z.object({
  id: z.string().uuid().optional(),
  action: z.enum(['create', 'update', 'delete', 'move']),
  data: z.union([createTestCaseSchema, updateTestCaseSchema]).optional(),
  newSuiteId: z.string().uuid().optional(),
});

export const bulkOperationSchema = z.object({
  suiteId: z.string().uuid(),
  items: z
    .array(bulkItemSchema)
    .min(1, 'At least one operation required')
    .max(500, 'Maximum 500 operations allowed'),
});

/**
 * Export types
 */
export type CreateSuiteInput = z.infer<typeof createSuiteSchema>;
export type UpdateSuiteInput = z.infer<typeof updateSuiteSchema>;
export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;
export type UpdateTestCaseInput = z.infer<typeof updateTestCaseSchema>;
export type TestCaseFilters = z.infer<typeof testCaseFiltersSchema>;
export type BulkOperationInput = z.infer<typeof bulkOperationSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type RepositoryImportInput = z.infer<typeof repositoryImportSchema>;
export type RepositoryExportQueryInput = z.infer<typeof repositoryExportQuerySchema>;
