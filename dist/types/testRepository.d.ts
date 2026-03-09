import { TestCasePriority, TestCaseSeverity, TestCaseType, AutomationStatus, SuiteStatus } from '@prisma/client';
/**
 * Suite Response DTO
 */
export interface SuiteDTO {
    id: string;
    projectId: string;
    parentSuiteId: string | null;
    name: string;
    description: string | null;
    ownerId: string;
    reviewerId: string | null;
    status: SuiteStatus;
    isLocked: boolean;
    createdAt: Date;
    updatedAt: Date;
    caseCount?: number;
}
/**
 * Suite Tree Node (nested structure)
 */
export interface SuiteTreeNode extends SuiteDTO {
    childSuites: SuiteTreeNode[];
    caseCount: number;
}
/**
 * Test Case Response DTO
 */
export interface TestCaseDTO {
    id: string;
    suiteId: string;
    externalId: string | null;
    title: string;
    description: string | null;
    preconditions: string | null;
    postconditions: string | null;
    priority: TestCasePriority;
    severity: TestCaseSeverity;
    type: TestCaseType;
    automationStatus: AutomationStatus;
    estimatedTime: number | null;
    status: SuiteStatus;
    authorId: string;
    reviewerId: string | null;
    approvalStatus: string;
    customFields?: Record<string, any>;
    tags?: string[];
    createdAt: Date;
    updatedAt: Date;
    steps?: TestStepDTO[];
}
/**
 * Test Step Response DTO
 */
export interface TestStepDTO {
    id: string;
    testCaseId: string;
    order: number;
    action: string;
    expectedResult: string;
    testData?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}
/**
 * Suite Create/Update Input
 */
export interface CreateSuiteInput {
    name: string;
    description?: string;
    parentSuiteId?: string;
}
export interface UpdateSuiteInput {
    name?: string;
    description?: string;
    parentSuiteId?: string;
    status?: SuiteStatus;
    reviewerId?: string | null;
}
/**
 * Test Case Create/Update Input
 */
export interface CreateTestCaseInput {
    title: string;
    description?: string;
    preconditions?: string;
    postconditions?: string;
    priority?: TestCasePriority;
    severity?: TestCaseSeverity;
    type?: TestCaseType;
    automationStatus?: AutomationStatus;
    estimatedTime?: number;
    reviewerId?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    steps?: CreateTestStepInput[];
}
export interface UpdateTestCaseInput {
    title?: string;
    description?: string;
    preconditions?: string;
    postconditions?: string;
    priority?: TestCasePriority;
    severity?: TestCaseSeverity;
    type?: TestCaseType;
    automationStatus?: AutomationStatus;
    estimatedTime?: number;
    status?: SuiteStatus;
    reviewerId?: string;
    approvalStatus?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    steps?: CreateTestStepInput[];
}
/**
 * Test Step Create Input
 */
export interface CreateTestStepInput {
    order?: number;
    action: string;
    expectedResult: string;
    testData?: Record<string, any>;
}
/**
 * Bulk Operation Input
 */
export interface BulkOperationItem {
    id?: string;
    action: 'create' | 'update' | 'delete' | 'move';
    data?: CreateTestCaseInput | UpdateTestCaseInput;
    newSuiteId?: string;
}
export interface BulkOperationInput {
    suiteId: string;
    items: BulkOperationItem[];
}
/**
 * Bulk Operation Result
 */
export interface BulkOperationResult {
    successful: number;
    failed: number;
    details: Array<{
        itemIndex: number;
        action: string;
        success: boolean;
        error?: string;
        id?: string;
    }>;
}
/**
 * Test Case List Filters
 */
export interface TestCaseFilters {
    suiteId?: string;
    priority?: TestCasePriority | TestCasePriority[];
    severity?: TestCaseSeverity | TestCaseSeverity[];
    type?: TestCaseType | TestCaseType[];
    automationStatus?: AutomationStatus | AutomationStatus[];
    status?: SuiteStatus | SuiteStatus[];
    tags?: string[];
    search?: string;
    page?: number;
    limit?: number;
}
/**
 * Test Case Version History Entry
 */
export interface TestCaseVersionEntry {
    version: number;
    changedAt: Date;
    changedBy?: string;
    changes: Record<string, any>;
}
/**
 * Duplicate Detection Result
 */
export interface DuplicateDetectionResult {
    isDuplicate: boolean;
    duplicateId?: string;
    duplicateTitle?: string;
}
/**
 * Clone Suite Result
 */
export interface CloneResult {
    original: SuiteDTO;
    clone: SuiteDTO;
    casesCopied: number;
}
//# sourceMappingURL=testRepository.d.ts.map