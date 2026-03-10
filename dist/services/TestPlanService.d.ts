import { TestPlanDTO, TestPlanDetailDTO, PlanMetrics, ReleaseReadinessDetail, TestPlanVersionDTO, TestPlanBaselineDTO, BaselineComparison, CreateTestPlanInput, UpdateTestPlanInput, AddRunToPlanInput, PaginatedPlanResponse, PlanListFilters } from '../types/testPlan';
export declare class TestPlanService {
    private prisma;
    /**
     * ========== PLAN MANAGEMENT ==========
     */
    /**
     * Create a new test plan
     */
    createPlan(projectId: string, userId: string, input: CreateTestPlanInput): Promise<TestPlanDTO>;
    /**
     * List plans for a project (paginated, with metrics)
     */
    listPlans(projectId: string, page?: number, limit?: number, filters?: PlanListFilters): Promise<PaginatedPlanResponse>;
    /**
     * Get plan detail with linked runs and metrics
     */
    getPlanDetail(planId: string): Promise<TestPlanDetailDTO>;
    /**
     * Update plan
     */
    updatePlan(planId: string, userId: string, input: UpdateTestPlanInput): Promise<TestPlanDTO>;
    /**
     * ========== RUN MANAGEMENT ==========
     */
    /**
     * Add run to plan
     */
    addRunToPlan(planId: string, input: AddRunToPlanInput): Promise<void>;
    /**
     * Remove run from plan
     */
    removeRunFromPlan(planId: string, runId: string): Promise<void>;
    /**
     * ========== APPROVAL ==========
     */
    /**
     * Approve plan
     */
    approvePlan(planId: string, userId: string): Promise<TestPlanDTO>;
    /**
     * ========== METRICS & READINESS ==========
     */
    /**
     * Calculate aggregated metrics for plan
     */
    calculatePlanMetrics(planId: string): Promise<PlanMetrics>;
    /**
     * Get release readiness calculation
     */
    getReleaseReadiness(planId: string): Promise<ReleaseReadinessDetail>;
    /**
     * ========== VERSIONING ==========
     */
    /**
     * Create a version snapshot
     */
    private createVersion;
    /**
     * List all versions of a plan
     */
    listVersions(planId: string): Promise<TestPlanVersionDTO[]>;
    /**
     * Get specific version
     */
    getVersion(planId: string, versionId: string): Promise<TestPlanVersionDTO>;
    /**
     * ========== BASELINE ==========
     */
    /**
     * Set current state as baseline
     */
    setBaseline(planId: string): Promise<TestPlanBaselineDTO>;
    /**
     * Get baseline comparison
     */
    getBaselineComparison(planId: string): Promise<BaselineComparison>;
    /**
     * ========== HELPER METHODS ==========
     */
    /**
     * Calculate metrics for a single run
     */
    private calculateRunMetrics;
    /**
     * Calculate readiness score based on weighted formula
     */
    private calculateReadinessScore;
    /**
     * Create audit log
     */
    private createAuditLog;
    /**
     * Mapping helpers
     */
    private mapToPlanDTO;
    private mapToVersionDTO;
    private mapToBaselineDTO;
}
//# sourceMappingURL=TestPlanService.d.ts.map