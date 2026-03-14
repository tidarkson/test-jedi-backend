import { z } from 'zod';
/**
 * Suite Validators
 */
export declare const createSuiteSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    parentSuiteId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateSuiteSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    parentSuiteId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        DRAFT: "DRAFT";
        ARCHIVED: "ARCHIVED";
        DEPRECATED: "DEPRECATED";
    }>>;
    reviewerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const createTestCaseSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    preconditions: z.ZodOptional<z.ZodString>;
    postconditions: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodEnum<{
        CRITICAL: "CRITICAL";
        HIGH: "HIGH";
        MEDIUM: "MEDIUM";
        LOW: "LOW";
    }>>;
    severity: z.ZodOptional<z.ZodEnum<{
        CRITICAL: "CRITICAL";
        BLOCKER: "BLOCKER";
        MAJOR: "MAJOR";
        MINOR: "MINOR";
        TRIVIAL: "TRIVIAL";
    }>>;
    type: z.ZodOptional<z.ZodEnum<{
        FUNCTIONAL: "FUNCTIONAL";
        REGRESSION: "REGRESSION";
        SMOKE: "SMOKE";
        INTEGRATION: "INTEGRATION";
        E2E: "E2E";
        PERFORMANCE: "PERFORMANCE";
        SECURITY: "SECURITY";
        USABILITY: "USABILITY";
    }>>;
    automationStatus: z.ZodOptional<z.ZodEnum<{
        MANUAL: "MANUAL";
        AUTOMATED: "AUTOMATED";
        PARTIALLY_AUTOMATED: "PARTIALLY_AUTOMATED";
        PENDING_AUTOMATION: "PENDING_AUTOMATION";
    }>>;
    estimatedTime: z.ZodOptional<z.ZodNumber>;
    reviewerId: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    customFields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        order: z.ZodOptional<z.ZodNumber>;
        action: z.ZodString;
        expectedResult: z.ZodString;
        testData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const updateTestCaseSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    preconditions: z.ZodOptional<z.ZodString>;
    postconditions: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodEnum<{
        CRITICAL: "CRITICAL";
        HIGH: "HIGH";
        MEDIUM: "MEDIUM";
        LOW: "LOW";
    }>>;
    severity: z.ZodOptional<z.ZodEnum<{
        CRITICAL: "CRITICAL";
        BLOCKER: "BLOCKER";
        MAJOR: "MAJOR";
        MINOR: "MINOR";
        TRIVIAL: "TRIVIAL";
    }>>;
    type: z.ZodOptional<z.ZodEnum<{
        FUNCTIONAL: "FUNCTIONAL";
        REGRESSION: "REGRESSION";
        SMOKE: "SMOKE";
        INTEGRATION: "INTEGRATION";
        E2E: "E2E";
        PERFORMANCE: "PERFORMANCE";
        SECURITY: "SECURITY";
        USABILITY: "USABILITY";
    }>>;
    automationStatus: z.ZodOptional<z.ZodEnum<{
        MANUAL: "MANUAL";
        AUTOMATED: "AUTOMATED";
        PARTIALLY_AUTOMATED: "PARTIALLY_AUTOMATED";
        PENDING_AUTOMATION: "PENDING_AUTOMATION";
    }>>;
    estimatedTime: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        DRAFT: "DRAFT";
        ARCHIVED: "ARCHIVED";
        DEPRECATED: "DEPRECATED";
    }>>;
    reviewerId: z.ZodOptional<z.ZodString>;
    approvalStatus: z.ZodOptional<z.ZodEnum<{
        PENDING: "PENDING";
        APPROVED: "APPROVED";
        REJECTED: "REJECTED";
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    customFields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        order: z.ZodOptional<z.ZodNumber>;
        action: z.ZodString;
        expectedResult: z.ZodString;
        testData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
declare const exportedCaseSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    preconditions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    postconditions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    priority: z.ZodEnum<{
        CRITICAL: "CRITICAL";
        HIGH: "HIGH";
        MEDIUM: "MEDIUM";
        LOW: "LOW";
    }>;
    severity: z.ZodEnum<{
        CRITICAL: "CRITICAL";
        BLOCKER: "BLOCKER";
        MAJOR: "MAJOR";
        MINOR: "MINOR";
        TRIVIAL: "TRIVIAL";
    }>;
    type: z.ZodEnum<{
        FUNCTIONAL: "FUNCTIONAL";
        REGRESSION: "REGRESSION";
        SMOKE: "SMOKE";
        INTEGRATION: "INTEGRATION";
        E2E: "E2E";
        PERFORMANCE: "PERFORMANCE";
        SECURITY: "SECURITY";
        USABILITY: "USABILITY";
    }>;
    automationStatus: z.ZodEnum<{
        MANUAL: "MANUAL";
        AUTOMATED: "AUTOMATED";
        PARTIALLY_AUTOMATED: "PARTIALLY_AUTOMATED";
        PENDING_AUTOMATION: "PENDING_AUTOMATION";
    }>;
    status: z.ZodEnum<{
        ACTIVE: "ACTIVE";
        DRAFT: "DRAFT";
        ARCHIVED: "ARCHIVED";
        DEPRECATED: "DEPRECATED";
    }>;
    estimatedTime: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
    customFields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
        order: z.ZodOptional<z.ZodNumber>;
        action: z.ZodString;
        expectedResult: z.ZodString;
        testData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
type ExportedSuiteSchema = {
    name: string;
    description?: string | null;
    status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'DEPRECATED';
    isLocked: boolean;
    cases: z.infer<typeof exportedCaseSchema>[];
    childSuites: ExportedSuiteSchema[];
};
export declare const repositoryImportSchema: z.ZodObject<{
    parentSuiteId: z.ZodOptional<z.ZodString>;
    repository: z.ZodObject<{
        version: z.ZodLiteral<1>;
        exportedAt: z.ZodString;
        projectId: z.ZodString;
        projectName: z.ZodString;
        rootSuites: z.ZodArray<z.ZodType<ExportedSuiteSchema, unknown, z.core.$ZodTypeInternals<ExportedSuiteSchema, unknown>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const repositoryExportQuerySchema: z.ZodObject<{
    suiteId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Pagination & Filters
 */
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const testCaseFiltersSchema: z.ZodObject<{
    suiteId: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
        CRITICAL: "CRITICAL";
        HIGH: "HIGH";
        MEDIUM: "MEDIUM";
        LOW: "LOW";
    }>, z.ZodArray<z.ZodEnum<{
        CRITICAL: "CRITICAL";
        HIGH: "HIGH";
        MEDIUM: "MEDIUM";
        LOW: "LOW";
    }>>]>>;
    severity: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
        CRITICAL: "CRITICAL";
        BLOCKER: "BLOCKER";
        MAJOR: "MAJOR";
        MINOR: "MINOR";
        TRIVIAL: "TRIVIAL";
    }>, z.ZodArray<z.ZodEnum<{
        CRITICAL: "CRITICAL";
        BLOCKER: "BLOCKER";
        MAJOR: "MAJOR";
        MINOR: "MINOR";
        TRIVIAL: "TRIVIAL";
    }>>]>>;
    type: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
        FUNCTIONAL: "FUNCTIONAL";
        REGRESSION: "REGRESSION";
        SMOKE: "SMOKE";
        INTEGRATION: "INTEGRATION";
        E2E: "E2E";
        PERFORMANCE: "PERFORMANCE";
        SECURITY: "SECURITY";
        USABILITY: "USABILITY";
    }>, z.ZodArray<z.ZodEnum<{
        FUNCTIONAL: "FUNCTIONAL";
        REGRESSION: "REGRESSION";
        SMOKE: "SMOKE";
        INTEGRATION: "INTEGRATION";
        E2E: "E2E";
        PERFORMANCE: "PERFORMANCE";
        SECURITY: "SECURITY";
        USABILITY: "USABILITY";
    }>>]>>;
    automationStatus: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
        MANUAL: "MANUAL";
        AUTOMATED: "AUTOMATED";
        PARTIALLY_AUTOMATED: "PARTIALLY_AUTOMATED";
        PENDING_AUTOMATION: "PENDING_AUTOMATION";
    }>, z.ZodArray<z.ZodEnum<{
        MANUAL: "MANUAL";
        AUTOMATED: "AUTOMATED";
        PARTIALLY_AUTOMATED: "PARTIALLY_AUTOMATED";
        PENDING_AUTOMATION: "PENDING_AUTOMATION";
    }>>]>>;
    status: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
        ACTIVE: "ACTIVE";
        DRAFT: "DRAFT";
        ARCHIVED: "ARCHIVED";
        DEPRECATED: "DEPRECATED";
    }>, z.ZodArray<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        DRAFT: "DRAFT";
        ARCHIVED: "ARCHIVED";
        DEPRECATED: "DEPRECATED";
    }>>]>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    search: z.ZodOptional<z.ZodString>;
    cursor: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const bulkOperationSchema: z.ZodObject<{
    suiteId: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        action: z.ZodEnum<{
            create: "create";
            delete: "delete";
            update: "update";
            move: "move";
        }>;
        data: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            title: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            preconditions: z.ZodOptional<z.ZodString>;
            postconditions: z.ZodOptional<z.ZodString>;
            priority: z.ZodOptional<z.ZodEnum<{
                CRITICAL: "CRITICAL";
                HIGH: "HIGH";
                MEDIUM: "MEDIUM";
                LOW: "LOW";
            }>>;
            severity: z.ZodOptional<z.ZodEnum<{
                CRITICAL: "CRITICAL";
                BLOCKER: "BLOCKER";
                MAJOR: "MAJOR";
                MINOR: "MINOR";
                TRIVIAL: "TRIVIAL";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                FUNCTIONAL: "FUNCTIONAL";
                REGRESSION: "REGRESSION";
                SMOKE: "SMOKE";
                INTEGRATION: "INTEGRATION";
                E2E: "E2E";
                PERFORMANCE: "PERFORMANCE";
                SECURITY: "SECURITY";
                USABILITY: "USABILITY";
            }>>;
            automationStatus: z.ZodOptional<z.ZodEnum<{
                MANUAL: "MANUAL";
                AUTOMATED: "AUTOMATED";
                PARTIALLY_AUTOMATED: "PARTIALLY_AUTOMATED";
                PENDING_AUTOMATION: "PENDING_AUTOMATION";
            }>>;
            estimatedTime: z.ZodOptional<z.ZodNumber>;
            reviewerId: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            customFields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
                order: z.ZodOptional<z.ZodNumber>;
                action: z.ZodString;
                expectedResult: z.ZodString;
                testData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, z.core.$strip>>>;
        }, z.core.$strip>, z.ZodObject<{
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            preconditions: z.ZodOptional<z.ZodString>;
            postconditions: z.ZodOptional<z.ZodString>;
            priority: z.ZodOptional<z.ZodEnum<{
                CRITICAL: "CRITICAL";
                HIGH: "HIGH";
                MEDIUM: "MEDIUM";
                LOW: "LOW";
            }>>;
            severity: z.ZodOptional<z.ZodEnum<{
                CRITICAL: "CRITICAL";
                BLOCKER: "BLOCKER";
                MAJOR: "MAJOR";
                MINOR: "MINOR";
                TRIVIAL: "TRIVIAL";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                FUNCTIONAL: "FUNCTIONAL";
                REGRESSION: "REGRESSION";
                SMOKE: "SMOKE";
                INTEGRATION: "INTEGRATION";
                E2E: "E2E";
                PERFORMANCE: "PERFORMANCE";
                SECURITY: "SECURITY";
                USABILITY: "USABILITY";
            }>>;
            automationStatus: z.ZodOptional<z.ZodEnum<{
                MANUAL: "MANUAL";
                AUTOMATED: "AUTOMATED";
                PARTIALLY_AUTOMATED: "PARTIALLY_AUTOMATED";
                PENDING_AUTOMATION: "PENDING_AUTOMATION";
            }>>;
            estimatedTime: z.ZodOptional<z.ZodNumber>;
            status: z.ZodOptional<z.ZodEnum<{
                ACTIVE: "ACTIVE";
                DRAFT: "DRAFT";
                ARCHIVED: "ARCHIVED";
                DEPRECATED: "DEPRECATED";
            }>>;
            reviewerId: z.ZodOptional<z.ZodString>;
            approvalStatus: z.ZodOptional<z.ZodEnum<{
                PENDING: "PENDING";
                APPROVED: "APPROVED";
                REJECTED: "REJECTED";
            }>>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            customFields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
                order: z.ZodOptional<z.ZodNumber>;
                action: z.ZodString;
                expectedResult: z.ZodString;
                testData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, z.core.$strip>>>;
        }, z.core.$strip>]>>;
        newSuiteId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
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
export {};
//# sourceMappingURL=testRepository.validator.d.ts.map