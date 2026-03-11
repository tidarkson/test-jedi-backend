import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
export declare class AnalyticsController {
    private analyticsService;
    constructor();
    private parseFilters;
    private handleRequest;
    getTrends(req: AuthenticatedRequest, res: Response): Promise<void>;
    getFailureDistribution(req: AuthenticatedRequest, res: Response): Promise<void>;
    getSuiteHeatmap(req: AuthenticatedRequest, res: Response): Promise<void>;
    getAutomationCoverage(req: AuthenticatedRequest, res: Response): Promise<void>;
    getDefectLeakage(req: AuthenticatedRequest, res: Response): Promise<void>;
    getFlakyTests(req: AuthenticatedRequest, res: Response): Promise<void>;
    getWorkloadHeatmap(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=AnalyticsController.d.ts.map