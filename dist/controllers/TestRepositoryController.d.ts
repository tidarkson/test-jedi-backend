import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
export declare class TestRepositoryController {
    private testRepoService;
    constructor();
    /**
     * ========== SUITE ENDPOINTS ==========
     */
    /**
     * GET /api/v1/projects/:projectId/suites
     * Returns nested tree structure with case counts
     */
    getSuiteTree(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * POST /api/v1/projects/:projectId/suites
     * Create a new suite
     */
    createSuite(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * PUT /api/v1/projects/:projectId/suites/:id
     * Update a suite
     */
    updateSuite(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * DELETE /api/v1/projects/:projectId/suites/:id
     * Soft delete a suite
     */
    deleteSuite(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * POST /api/v1/projects/:projectId/suites/:id/clone
     * Clone suite with all cases
     */
    cloneSuite(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * POST /api/v1/projects/:projectId/suites/:id/lock
     * Toggle suite lock
     */
    toggleSuiteLock(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * POST /api/v1/projects/:projectId/suites/:id/archive
     * Archive suite
     */
    archiveSuite(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * ========== TEST CASE ENDPOINTS ==========
     */
    /**
     * GET /api/v1/projects/:projectId/cases
     * Get paginated test cases with filters
     */
    getTestCases(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * POST /api/v1/projects/:projectId/cases
     * Create test case
     */
    createTestCase(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/projects/:projectId/cases/:id
     * Get single test case
     */
    getTestCase(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * PUT /api/v1/projects/:projectId/cases/:id
     * Update test case (creates new version)
     */
    updateTestCase(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * DELETE /api/v1/projects/:projectId/cases/:id
     * Soft delete test case
     */
    deleteTestCase(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/projects/:projectId/cases/:id/history
     * Get test case version history
     */
    getCaseHistory(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * ========== BULK OPERATIONS ==========
     */
    /**
     * POST /api/v1/projects/:projectId/cases/bulk
     * Bulk create/edit/move/delete operations (max 500)
     */
    bulkOperateTestCases(req: AuthenticatedRequest, res: Response): Promise<void>;
    exportRepository(req: AuthenticatedRequest, res: Response): Promise<void>;
    importRepository(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * ========== ERROR HANDLING ==========
     */
    private handleError;
}
//# sourceMappingURL=TestRepositoryController.d.ts.map