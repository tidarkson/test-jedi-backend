import { TestRunDTO, RunCaseDTO, RunMetrics, CaseSelectionInput, CaseSelectionPreview, CreateRunInput, UpdateRunInput, UpdateRunCaseStatusInput, BulkStatusUpdateInput, BulkStatusUpdateResult, CloneRunInput, CloneRunResult, PaginatedResponse, RunListFilters } from '../types/testRun';
export declare class TestRunService {
    private prisma;
    private readonly runMetricsTtlSeconds;
    private encodeCursor;
    private decodeCursor;
    private getRunMetricsCacheKey;
    private invalidateRunMetricsCache;
    private getCachedRunMetrics;
    /**
     * ========== CASE SELECTION LOGIC ==========
     */
    /**
     * Resolve all cases from selected suites (recursive)
     * Apply exclude list, deduplicate
     */
    private resolveCasesFromSelection;
    /**
     * Get all cases in a suite (recursive - includes child suites)
     */
    private getAllCasesInSuite;
    /**
     * Apply query filters to case IDs
     */
    private filterCases;
    /**
     * ========== RUN ENDPOINTS ==========
     */
    /**
     * POST /api/v1/projects/:projectId/runs
     * Create run with case selection (preview first, then create)
     */
    previewCaseSelection(projectId: string, input: CaseSelectionInput): Promise<CaseSelectionPreview>;
    /**
     * Create test run with selected cases
     */
    createRun(projectId: string, userId: string, input: CreateRunInput): Promise<TestRunDTO>;
    /**
     * GET /api/v1/projects/:projectId/runs
     * List runs (paginated, filtered)
     */
    listRuns(projectId: string, page?: number, limit?: number, filters?: RunListFilters): Promise<PaginatedResponse<TestRunDTO>>;
    /**
     * GET /api/v1/projects/:projectId/runs/:id
     * Run detail with metrics
     */
    getRunDetail(projectId: string, runId: string): Promise<{
        run: TestRunDTO;
        metrics: RunMetrics;
        cases: RunCaseDTO[];
    }>;
    /**
     * PUT /api/v1/projects/:projectId/runs/:id
     * Update run metadata
     */
    updateRun(projectId: string, runId: string, userId: string, input: UpdateRunInput): Promise<TestRunDTO>;
    /**
     * DELETE /api/v1/projects/:projectId/runs/:id
     * Soft delete run
     */
    deleteRun(projectId: string, runId: string, userId: string): Promise<void>;
    /**
     * POST /api/v1/projects/:projectId/runs/:id/close
     * Close run (requires approval role check)
     */
    closeRun(projectId: string, runId: string, userId: string, userRole: string): Promise<TestRunDTO>;
    /**
     * POST /api/v1/projects/:projectId/runs/:id/clone
     * Clone run with cases
     */
    cloneRun(projectId: string, runId: string, userId: string, input: CloneRunInput): Promise<CloneRunResult>;
    /**
     * ========== RUN CASE ENDPOINTS ==========
     */
    /**
     * GET /api/v1/runs/:runId/cases
     * List cases in run with current status
     */
    private getRunCases;
    /**
     * PUT /api/v1/runs/:runId/cases/:runCaseId
     * Update run case status + step results
     */
    updateRunCaseStatus(runId: string, runCaseId: string, userId: string, input: UpdateRunCaseStatusInput): Promise<RunCaseDTO>;
    /**
     * POST /api/v1/runs/:runId/cases/bulk-status
     * Bulk status update (must handle 200 cases in under 2 seconds)
     */
    bulkUpdateCaseStatus(runId: string, userId: string, input: BulkStatusUpdateInput): Promise<BulkStatusUpdateResult>;
    /**
     * ========== METRICS ENDPOINTS ==========
     */
    /**
     * GET /api/v1/runs/:runId/metrics
     * Live metrics aggregation
     */
    calculateRunMetrics(runId: string): Promise<RunMetrics>;
    private computeRunMetrics;
    /**
     * Helper to return empty metrics
     */
    private emptyMetrics;
    /**
     * ========== HELPERS ==========
     */
    private mapTestRunToDTO;
    private logAudit;
    /**
     * Public wrapper to list run cases
     */
    listRunCases(runId: string): Promise<RunCaseDTO[]>;
}
//# sourceMappingURL=TestRunService.d.ts.map