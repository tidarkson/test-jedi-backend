/**
 * Excel Export Service
 * Generates XLSX files with multiple worksheets, conditional formatting, and data validation
 */
export declare class ExcelExportService {
    /**
     * Generate Excel file with test cases
     */
    exportTestCases(cases: any[], _filters?: any): Promise<Buffer>;
    /**
     * Generate Excel file with test run results
     */
    exportTestRunResults(run: any, _cases: any[], results: any[]): Promise<Buffer>;
    /**
     * Add summary worksheet for cases
     */
    private addSummarySheet;
    /**
     * Add cases worksheet
     */
    private addCasesSheet;
    /**
     * Add steps worksheet
     */
    private addStepsSheet;
    /**
     * Add run summary worksheet
     */
    private addRunSummarySheet;
    /**
     * Add cases with results worksheet
     */
    private addRunCasesSheet;
    /**
     * Add detailed results worksheet
     */
    private addResultsSheet;
    /**
     * Add steps and results worksheet (combined)
     */
    private addStepsResultsSheet;
    /**
     * Format header row with blue background and white text
     */
    private formatHeaderRow;
}
declare const _default: ExcelExportService;
export default _default;
//# sourceMappingURL=ExcelExportService.d.ts.map