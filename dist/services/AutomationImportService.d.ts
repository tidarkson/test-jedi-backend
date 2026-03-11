export declare class AutomationImportService {
    private prisma;
    /**
     * Accept JSON or JUnit XML, parse, match to RunCase by title or @caseId tag, bulk-update statuses
     */
    importResults(projectId: string, runId: string, rawBody: string | Record<string, unknown>, contentType?: string): Promise<{
        importId: string;
        source: "unknown" | "playwright" | "jest" | "cypress" | "junit";
        totalResults: number;
        matched: number;
        unmatched: number;
        unmatchedTitles: string[];
        summary: import("../types/integrations").ImportResultSummary;
    }>;
}
declare const _default: AutomationImportService;
export default _default;
//# sourceMappingURL=AutomationImportService.d.ts.map