import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
export declare class TestRunController {
    private testRunService;
    constructor();
    /**
     * ========== RUN ENDPOINTS ==========
     */
    /**
     * POST /api/v1/projects/:projectId/runs/preview
     * Preview case selection before creation
     */
    previewCaseSelection(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * POST /api/v1/projects/:projectId/runs
     * Create run with case selection
     */
    createRun(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/projects/:projectId/runs
     * List runs (paginated, filtered)
     */
    listRuns(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/projects/:projectId/runs/:id
     * Run detail with metrics
     */
    getRunDetail(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/runs/:runId/cases
     * List cases in run with current status
     */
    listRunCases(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * PUT /api/v1/projects/:projectId/runs/:id
     * Update run metadata
     */
    updateRun(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * DELETE /api/v1/projects/:projectId/runs/:id
     * Soft delete run
     */
    deleteRun(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * POST /api/v1/projects/:projectId/runs/:id/close
     * Close run (requires approval role)
     */
    closeRun(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * POST /api/v1/projects/:projectId/runs/:id/clone
     * Clone run
     */
    cloneRun(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * ========== RUN CASE ENDPOINTS ==========
     */
    /**
     * PUT /api/v1/runs/:runId/cases/:runCaseId
     * Update run case status + step results
     */
    updateRunCaseStatus(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * POST /api/v1/runs/:runId/cases/bulk-status
     * Bulk status update
     */
    bulkUpdateCaseStatus(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * ========== METRICS ENDPOINTS ==========
     */
    /**
     * GET /api/v1/runs/:runId/metrics
     * Live metrics aggregation
     */
    getRunMetrics(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=TestRunController.d.ts.map