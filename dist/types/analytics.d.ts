export interface AnalyticsFilters {
    dateFrom?: Date;
    dateTo?: Date;
    milestoneId?: string;
}
export interface TrendPoint {
    week: string;
    passed: number;
    failed: number;
    blocked: number;
    total: number;
}
export interface FailureDistributionPoint {
    suiteId: string;
    suiteName: string;
    failures: number;
    percentage: number;
}
export interface SuiteHeatmapCell {
    suiteId: string;
    suiteName: string;
    week: string;
    failed: number;
    total: number;
    failureRate: number;
}
export interface SuiteHeatmapResponse {
    weeks: string[];
    suites: Array<{
        suiteId: string;
        suiteName: string;
    }>;
    grid: SuiteHeatmapCell[];
}
export interface AutomationCoverageResponse {
    counts: {
        automated: number;
        manual: number;
        untested: number;
        total: number;
    };
    weeklyTrend: Array<{
        week: string;
        automatedCases: number;
        totalCases: number;
        coveragePercent: number;
    }>;
}
export interface DefectLeakagePoint {
    week: string;
    foundInProd: number;
    foundInTesting: number;
    total: number;
}
export interface FlakyTestPoint {
    caseId: string;
    title: string;
    flakyScore: number;
    lastRunResults: string[];
}
export interface WorkloadHeatmapCell {
    testerId: string;
    testerName: string;
    day: string;
    assignedCases: number;
}
export interface WorkloadHeatmapResponse {
    days: string[];
    testers: Array<{
        testerId: string;
        testerName: string;
    }>;
    grid: WorkloadHeatmapCell[];
}
//# sourceMappingURL=analytics.d.ts.map