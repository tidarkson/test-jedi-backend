"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkOperationSchema = exports.testCaseFiltersSchema = exports.paginationSchema = exports.updateTestCaseSchema = exports.createTestCaseSchema = exports.updateSuiteSchema = exports.createSuiteSchema = void 0;
const zod_1 = require("zod");
/**
 * Suite Validators
 */
exports.createSuiteSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, 'Suite name is required')
        .max(255, 'Suite name must be less than 255 characters'),
    description: zod_1.z
        .string()
        .max(2000, 'Description must be less than 2000 characters')
        .optional(),
    parentSuiteId: zod_1.z
        .string()
        .uuid('Invalid parent suite ID')
        .optional(),
});
exports.updateSuiteSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, 'Suite name is required')
        .max(255, 'Suite name must be less than 255 characters')
        .optional(),
    description: zod_1.z
        .string()
        .max(2000, 'Description must be less than 2000 characters')
        .optional(),
    parentSuiteId: zod_1.z
        .string()
        .uuid('Invalid parent suite ID')
        .optional(),
    status: zod_1.z
        .enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'DEPRECATED'])
        .optional(),
    reviewerId: zod_1.z
        .string()
        .uuid('Invalid reviewer ID')
        .nullable()
        .optional(),
});
/**
 * Test Case Validators
 */
const testStepSchema = zod_1.z.object({
    order: zod_1.z.number().int().positive().optional(),
    action: zod_1.z
        .string()
        .min(1, 'Action is required')
        .max(2000, 'Action description too long'),
    expectedResult: zod_1.z
        .string()
        .min(1, 'Expected result is required')
        .max(2000, 'Expected result too long'),
    testData: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
exports.createTestCaseSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(1, 'Test case title is required')
        .max(500, 'Title must be less than 500 characters'),
    description: zod_1.z
        .string()
        .max(3000, 'Description must be less than 3000 characters')
        .optional(),
    preconditions: zod_1.z
        .string()
        .max(2000, 'Preconditions must be less than 2000 characters')
        .optional(),
    postconditions: zod_1.z
        .string()
        .max(2000, 'Postconditions must be less than 2000 characters')
        .optional(),
    priority: zod_1.z
        .enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
        .optional(),
    severity: zod_1.z
        .enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'])
        .optional(),
    type: zod_1.z
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
    automationStatus: zod_1.z
        .enum([
        'MANUAL',
        'AUTOMATED',
        'PARTIALLY_AUTOMATED',
        'PENDING_AUTOMATION',
    ])
        .optional(),
    estimatedTime: zod_1.z
        .number()
        .int()
        .positive()
        .optional(),
    reviewerId: zod_1.z
        .string()
        .uuid('Invalid reviewer ID')
        .optional(),
    tags: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    customFields: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    steps: zod_1.z.array(testStepSchema).optional(),
});
exports.updateTestCaseSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(1, 'Test case title is required')
        .max(500, 'Title must be less than 500 characters')
        .optional(),
    description: zod_1.z
        .string()
        .max(3000, 'Description must be less than 3000 characters')
        .optional(),
    preconditions: zod_1.z
        .string()
        .max(2000, 'Preconditions must be less than 2000 characters')
        .optional(),
    postconditions: zod_1.z
        .string()
        .max(2000, 'Postconditions must be less than 2000 characters')
        .optional(),
    priority: zod_1.z
        .enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
        .optional(),
    severity: zod_1.z
        .enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'])
        .optional(),
    type: zod_1.z
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
    automationStatus: zod_1.z
        .enum([
        'MANUAL',
        'AUTOMATED',
        'PARTIALLY_AUTOMATED',
        'PENDING_AUTOMATION',
    ])
        .optional(),
    estimatedTime: zod_1.z
        .number()
        .int()
        .positive()
        .optional(),
    status: zod_1.z
        .enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'DEPRECATED'])
        .optional(),
    reviewerId: zod_1.z
        .string()
        .uuid('Invalid reviewer ID')
        .optional(),
    approvalStatus: zod_1.z
        .enum(['PENDING', 'APPROVED', 'REJECTED'])
        .optional(),
    tags: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    customFields: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    steps: zod_1.z.array(testStepSchema).optional(),
});
/**
 * Pagination & Filters
 */
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.number().int().positive().default(1),
    limit: zod_1.z.number().int().positive().max(100).default(20),
    cursor: zod_1.z.string().optional(),
});
exports.testCaseFiltersSchema = zod_1.z.object({
    suiteId: zod_1.z.string().uuid().optional(),
    priority: zod_1.z
        .union([
        zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        zod_1.z.array(zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])),
    ])
        .optional(),
    severity: zod_1.z
        .union([
        zod_1.z.enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL']),
        zod_1.z.array(zod_1.z.enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'])),
    ])
        .optional(),
    type: zod_1.z
        .union([
        zod_1.z.enum([
            'FUNCTIONAL',
            'REGRESSION',
            'SMOKE',
            'INTEGRATION',
            'E2E',
            'PERFORMANCE',
            'SECURITY',
            'USABILITY',
        ]),
        zod_1.z.array(zod_1.z.enum([
            'FUNCTIONAL',
            'REGRESSION',
            'SMOKE',
            'INTEGRATION',
            'E2E',
            'PERFORMANCE',
            'SECURITY',
            'USABILITY',
        ])),
    ])
        .optional(),
    automationStatus: zod_1.z
        .union([
        zod_1.z.enum([
            'MANUAL',
            'AUTOMATED',
            'PARTIALLY_AUTOMATED',
            'PENDING_AUTOMATION',
        ]),
        zod_1.z.array(zod_1.z.enum([
            'MANUAL',
            'AUTOMATED',
            'PARTIALLY_AUTOMATED',
            'PENDING_AUTOMATION',
        ])),
    ])
        .optional(),
    status: zod_1.z
        .union([
        zod_1.z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'DEPRECATED']),
        zod_1.z.array(zod_1.z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'DEPRECATED'])),
    ])
        .optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    search: zod_1.z.string().optional(),
    cursor: zod_1.z.string().optional(),
    page: zod_1.z.number().int().positive().default(1),
    limit: zod_1.z.number().int().positive().max(100).default(20),
});
/**
 * Bulk Operations
 */
const bulkItemSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    action: zod_1.z.enum(['create', 'update', 'delete', 'move']),
    data: zod_1.z.union([exports.createTestCaseSchema, exports.updateTestCaseSchema]).optional(),
    newSuiteId: zod_1.z.string().uuid().optional(),
});
exports.bulkOperationSchema = zod_1.z.object({
    suiteId: zod_1.z.string().uuid(),
    items: zod_1.z
        .array(bulkItemSchema)
        .min(1, 'At least one operation required')
        .max(500, 'Maximum 500 operations allowed'),
});
//# sourceMappingURL=testRepository.validator.js.map