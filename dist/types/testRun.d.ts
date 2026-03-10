import { TestRunStatus, TestRunType, RunCaseStatus, ExecutionType, StepResultStatus } from '@prisma/client';
/**
 * Test Run Response DTO
 */
export interface TestRunDTO {
    id: string;
    projectId: string;
    title: string;
    type: TestRunType;
    environment: string;
    milestoneId: string | null;
    buildNumber: string | null;
    branch: string | null;
    status: TestRunStatus;
    plannedStart: Date | null;
    dueDate: Date | null;
    defaultAssigneeId: string | null;
    riskThreshold: string;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Run Case Response DTO
 */
export interface RunCaseDTO {
    id: string;
    runId: string;
    caseId: string;
    assigneeId: string | null;
    status: RunCaseStatus;
    executionType: ExecutionType;
    startedAt: Date | null;
    completedAt: Date | null;
    testCase?: {
        id: string;
        title: string;
        estimatedTime: number | null;
    };
    assignee?: {
        id: string;
        name: string;
        email: string;
    };
    stepResults?: StepResultDTO[];
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Step Result DTO
 */
export interface StepResultDTO {
    id: string;
    runCaseId: string;
    stepId: string;
    status: StepResultStatus;
    comment: string | null;
    attachments: any | null;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Run Metrics Response
 */
export interface RunMetrics {
    totalCases: number;
    passedCases: number;
    failedCases: number;
    blockedCases: number;
    skippedCases: number;
    notRunCases: number;
    inProgressCases: number;
    passRate: number;
    failRate: number;
    completionRate: number;
    defectCount: number;
    flakyTests: string[];
    estimatedTime: number;
    actualTime: number;
    testerPerformance: TesterPerformance[];
}
/**
 * Tester Performance
 */
export interface TesterPerformance {
    testerName: string;
    testerId: string;
    casesHandled: number;
    passed: number;
    failed: number;
    blocked: number;
    passRate: number;
    averageTimePerCase: number;
}
/**
 * Case Selection Input
 */
export interface CaseSelectionInput {
    suiteIds?: string[];
    caseIds?: string[];
    queryFilters?: {
        priority?: string;
        type?: string;
        status?: string;
        automationStatus?: string;
    };
    excludeIds?: string[];
}
/**
 * Case Selection Preview Response
 */
export interface CaseSelectionPreview {
    selectedCases: string[];
    totalCount: number;
    suiteBreakdown: {
        suiteId: string;
        suiteName: string;
        caseCount: number;
    }[];
}
/**
 * Create Test Run Input
 */
export interface CreateRunInput {
    title: string;
    type: TestRunType;
    environment: string;
    plannedStart?: Date;
    dueDate?: Date;
    milestoneId?: string;
    buildNumber?: string;
    branch?: string;
    defaultAssigneeId?: string;
    caseSelection: CaseSelectionInput;
}
/**
 * Update Test Run Input
 */
export interface UpdateRunInput {
    title?: string;
    environment?: string;
    plannedStart?: Date;
    dueDate?: Date;
    milestoneId?: string;
    buildNumber?: string;
    branch?: string;
    defaultAssigneeId?: string;
}
/**
 * Update Run Case Status Input
 */
export interface UpdateRunCaseStatusInput {
    status: RunCaseStatus;
    executionType?: ExecutionType;
    assigneeId?: string;
    stepResults?: StepResultInput[];
}
/**
 * Step Result Input
 */
export interface StepResultInput {
    stepId: string;
    status: StepResultStatus;
    comment?: string;
    attachments?: any;
}
/**
 * Bulk Status Update Input
 */
export interface BulkStatusUpdateInput {
    updates: {
        runCaseId: string;
        status: RunCaseStatus;
        assigneeId?: string;
        stepResults?: StepResultInput[];
    }[];
}
/**
 * Bulk Status Update Result
 */
export interface BulkStatusUpdateResult {
    updated: number;
    failed: number;
    errors: {
        runCaseId: string;
        error: string;
    }[];
}
/**
 * Close Run Input
 */
export interface CloseRunInput {
    reason?: string;
}
/**
 * Clone Run Input
 */
export interface CloneRunInput {
    title: string;
    plannedStart?: Date;
    dueDate?: Date;
    newCaseSelection?: CaseSelectionInput;
}
/**
 * Clone Run Result
 */
export interface CloneRunResult {
    originalRunId: string;
    clonedRunId: string;
    casesCopied: number;
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
 * Run List Filters
 */
export interface RunListFilters {
    status?: TestRunStatus;
    type?: TestRunType;
    environment?: string;
    milestoneId?: string;
    buildNumber?: string;
    dateFrom?: Date;
    dateTo?: Date;
    assignedToMe?: boolean;
}
/**
 * WebSocket Message Types
 */
export interface WebSocketMetricUpdate {
    type: 'metric_update';
    runId: string;
    metrics: RunMetrics;
    timestamp: Date;
}
export interface WebSocketCaseUpdate {
    type: 'case_update';
    runId: string;
    runCaseId: string;
    status: RunCaseStatus;
    updatedAt: Date;
}
export type WebSocketMessage = WebSocketMetricUpdate | WebSocketCaseUpdate;
//# sourceMappingURL=testRun.d.ts.map