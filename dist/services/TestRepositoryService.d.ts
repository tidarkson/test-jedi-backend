import { SuiteDTO, SuiteTreeNode, TestCaseDTO, CloneResult, CreateSuiteInput, UpdateSuiteInput, CreateTestCaseInput, UpdateTestCaseInput, TestCaseFilters, PaginatedResponse, BulkOperationInput, BulkOperationResult, ImportRepositoryInput, ImportRepositoryResult, RepositoryExportPayload } from '../types/testRepository';
export declare class TestRepositoryService {
    private prisma;
    private readonly suiteTreeTtlSeconds;
    /**
     * ========== SUITE OPERATIONS ==========
     */
    /**
     * GET /api/v1/projects/:projectId/suites — tree structure
     */
    getSuiteTree(projectId: string): Promise<SuiteTreeNode[]>;
    /**
     * POST /api/v1/projects/:projectId/suites — create suite
     */
    createSuite(projectId: string, userId: string, input: CreateSuiteInput): Promise<SuiteDTO>;
    /**
     * PUT /api/v1/projects/:projectId/suites/:id — update suite
     */
    updateSuite(projectId: string, suiteId: string, userId: string, input: UpdateSuiteInput): Promise<SuiteDTO>;
    /**
     * DELETE /api/v1/projects/:projectId/suites/:id — soft delete
     */
    deleteSuite(projectId: string, suiteId: string, userId: string): Promise<void>;
    /**
     * POST /api/v1/projects/:projectId/suites/:id/clone — clone with all cases
     */
    cloneSuite(projectId: string, suiteId: string, userId: string): Promise<CloneResult>;
    /**
     * POST /api/v1/projects/:projectId/suites/:id/lock — toggle lock
     */
    toggleSuiteLock(projectId: string, suiteId: string, userId: string): Promise<SuiteDTO>;
    /**
     * POST /api/v1/projects/:projectId/suites/:id/archive — archive suite
     */
    archiveSuite(projectId: string, suiteId: string, userId: string): Promise<SuiteDTO>;
    /**
     * ========== TEST CASE OPERATIONS ==========
     */
    /**
     * GET /api/v1/projects/:projectId/cases — paginated list with filters
     */
    getTestCases(projectId: string, filters: TestCaseFilters): Promise<PaginatedResponse<TestCaseDTO>>;
    /**
     * POST /api/v1/projects/:projectId/cases — create case
     */
    createTestCase(projectId: string, suiteId: string, userId: string, input: CreateTestCaseInput): Promise<TestCaseDTO>;
    /**
     * GET /api/v1/projects/:projectId/cases/:id — single case with steps
     */
    getTestCase(projectId: string, caseId: string): Promise<TestCaseDTO>;
    /**
     * PUT /api/v1/projects/:projectId/cases/:id — update case (creates new version)
     */
    updateTestCase(projectId: string, caseId: string, userId: string, input: UpdateTestCaseInput): Promise<TestCaseDTO>;
    /**
     * DELETE /api/v1/projects/:projectId/cases/:id — soft delete
     */
    deleteTestCase(projectId: string, caseId: string, userId: string): Promise<void>;
    /**
     * GET /api/v1/projects/:projectId/cases/:id/history — version history
     */
    getCaseHistory(projectId: string, caseId: string): Promise<any[]>;
    /**
     * ========== BULK OPERATIONS ==========
     */
    /**
     * POST /api/v1/projects/:projectId/cases/bulk — bulk operations (up to 500)
     */
    bulkOperateTestCases(projectId: string, userId: string, input: BulkOperationInput): Promise<BulkOperationResult>;
    exportRepository(projectId: string, suiteId?: string): Promise<RepositoryExportPayload>;
    importRepository(projectId: string, userId: string, input: ImportRepositoryInput): Promise<ImportRepositoryResult>;
    /**
     * ========== HELPER METHODS ==========
     */
    private importSuiteTree;
    private encodeCursor;
    private decodeCursor;
    private findSearchCandidateCaseIds;
    private getSuiteTreeCacheKey;
    private invalidateSuiteTreeCache;
    /**
     * Detect duplicate test case title in suite
     */
    private detectDuplicate;
    /**
     * Format suite to DTO
     */
    private formatSuiteDTO;
    /**
     * Format test case to DTO
     */
    private formatTestCaseDTO;
    /**
     * Create audit log entry
     */
    private createAuditLog;
}
//# sourceMappingURL=TestRepositoryService.d.ts.map