/**
 * Export Controller
 * Handles export endpoint requests
 */
import { Request, Response } from 'express';
export declare class ExportController {
    /**
     * Export test cases
     * POST /api/v1/projects/:projectId/cases/export
     */
    exportTestCases(req: Request, res: Response): Promise<void>;
    /**
     * Export test run results
     * POST /api/v1/runs/:runId/export
     */
    exportTestRunResults(req: Request, res: Response): Promise<void>;
    /**
     * Export analytics
     * POST /api/v1/analytics/export
     */
    exportAnalytics(req: Request, res: Response): Promise<void>;
    /**
     * Get export job status
     * GET /api/v1/exports/:jobId
     */
    getExportStatus(req: Request, res: Response): Promise<void>;
    /**
     * Get available export formats
     * GET /api/v1/exports/formats/available
     */
    getAvailableFormats(req: Request, res: Response): Promise<void>;
    /**
     * Get export options/configuration schema
     * GET /api/v1/exports/schema
     */
    getExportSchema(_req: Request, res: Response): Promise<void>;
    /**
     * Error handler
     */
    private handleError;
}
declare const _default: ExportController;
export default _default;
//# sourceMappingURL=ExportController.d.ts.map