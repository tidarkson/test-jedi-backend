import { AnalyticsFilters, AutomationCoverageResponse, DefectLeakagePoint, FailureDistributionPoint, FlakyTestPoint, SuiteHeatmapResponse, TrendPoint, WorkloadHeatmapResponse } from '../types/analytics';
export declare class AnalyticsService {
    private prisma;
    private readonly cacheTtlSeconds;
    private ensureProject;
    private toIsoDay;
    private startOfWeek;
    private endOfDay;
    private resolveDateRange;
    private listWeeks;
    private getCachedOrCompute;
    private buildCacheKey;
    getTrends(projectId: string, filters: AnalyticsFilters): Promise<TrendPoint[]>;
    getFailureDistribution(projectId: string, filters: AnalyticsFilters): Promise<FailureDistributionPoint[]>;
    getSuiteHeatmap(projectId: string, filters: AnalyticsFilters): Promise<SuiteHeatmapResponse>;
    getAutomationCoverage(projectId: string, filters: AnalyticsFilters): Promise<AutomationCoverageResponse>;
    getDefectLeakage(projectId: string, filters: AnalyticsFilters): Promise<DefectLeakagePoint[]>;
    getFlakyTests(projectId: string, filters: AnalyticsFilters): Promise<FlakyTestPoint[]>;
    getWorkloadHeatmap(projectId: string, filters: AnalyticsFilters): Promise<WorkloadHeatmapResponse>;
}
//# sourceMappingURL=AnalyticsService.d.ts.map