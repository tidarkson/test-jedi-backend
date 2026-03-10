import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
export declare class TestPlanController {
    private testPlanService;
    constructor();
    /**
     * ========== PLAN ENDPOINTS ==========
     */
    /**
     * POST /api/v1/projects/:projectId/plans
     * Create a new test plan
     */
    createPlan(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/projects/:projectId/plans
     * List plans (paginated, with aggregated metrics)
     */
    listPlans(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/projects/:projectId/plans/:id
     * Get plan detail with all linked runs and metrics
     */
    getPlanDetail(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * PUT /api/v1/projects/:projectId/plans/:id
     * Update plan
     */
    updatePlan(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * ========== RUN MANAGEMENT ENDPOINTS ==========
     */
    /**
     * POST /api/v1/projects/:projectId/plans/:id/runs
     * Add run to plan
     */
    addRunToPlan(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * DELETE /api/v1/projects/:projectId/plans/:id/runs/:runId
     * Remove run from plan
     */
    removeRunFromPlan(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * ========== APPROVAL ENDPOINT ==========
     */
    /**
     * POST /api/v1/projects/:projectId/plans/:id/approve
     * Approve plan
     */
    approvePlan(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * ========== READINESS ENDPOINT ==========
     */
    /**
     * GET /api/v1/projects/:projectId/plans/:id/readiness
     * Get release readiness calculation
     */
    getReleaseReadiness(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * ========== VERSIONING ENDPOINTS ==========
     */
    /**
     * GET /api/v1/plans/:id/versions
     * List all versions of a plan
     */
    listVersions(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/plans/:id/versions/:versionId
     * Get specific version snapshot
     */
    getVersion(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * ========== BASELINE ENDPOINTS ==========
     */
    /**
     * POST /api/v1/plans/:id/baseline
     * Set current state as baseline
     */
    setBaseline(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/plans/:id/baseline
     * Get baseline comparison
     */
    getBaselineComparison(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=TestPlanController.d.ts.map