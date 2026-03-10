/**
 * Main Export Service
 * Orchestrates all export formats and handles queuing for large exports
 */
import { ExportRequest, ExportResponse } from '../types/exports';
export declare class ExportService {
    private prisma;
    private s3Service;
    private queueService;
    /**
     * Export test cases
     */
    exportTestCases(projectId: string, userId: string, request: ExportRequest): Promise<ExportResponse>;
    /**
     * Export test run results
     */
    exportTestRunResults(projectId: string, runId: string, userId: string, request: ExportRequest): Promise<ExportResponse>;
    /**
     * Export analytics data
     */
    exportAnalytics(projectId: string, _userId: string, request: ExportRequest): Promise<ExportResponse>;
    /**
     * Get export job status
     */
    getExportStatus(jobId: string): Promise<ExportResponse>;
    /**
     * Process test cases export
     */
    private processTestCasesExport;
    /**
     * Process test run export
     */
    private processTestRunExport;
    /**
     * Process analytics export
     */
    private processAnalyticsExport;
    /**
     * Queue export job for large exports
     */
    private queueExportJob;
    /**
     * Fetch test cases with filters
     */
    private fetchTestCases;
    /**
     * Format run results
     */
    private formatRunResults;
    /**
     * Build executive summary
     */
    private buildExecutiveSummary;
    /**
     * Build charts (placeholder - integrate with charting library)
     */
    private buildCharts;
    /**
     * Build analytics data
     */
    private buildAnalyticsData;
    /**
     * Calculate duration in minutes
     */
    private calculateDuration;
}
declare const _default: ExportService;
export default _default;
//# sourceMappingURL=ExportService.d.ts.map