/**
 * CSV, JSON, and XML Export Service
 * Handles flat and nested format exports
 */
import { ExportFilters } from '../types/exports';
export declare class DataExportService {
    /**
     * Generate CSV from test cases
     * Includes UTF-8 BOM for Excel compatibility
     */
    exportCasesAsCSV(cases: any[], _filters?: ExportFilters): Promise<string>;
    /**
     * Generate CSV from test run results
     */
    exportRunResultsAsCSV(results: any[]): Promise<string>;
    /**
     * Generate CSV from analytics data
     */
    exportAnalyticsAsCSV(analyticsData: any): Promise<string>;
    /**
     * Generate JSON from test cases - nested structure with steps
     */
    exportCasesAsJSON(cases: any[]): Promise<string>;
    /**
     * Generate JSON from test run results
     */
    exportRunResultsAsJSON(run: any, results: any[]): Promise<string>;
    /**
     * Generate XML from test cases
     */
    exportCasesAsXML(cases: any[]): Promise<string>;
    /**
     * Generate XML from test run results
     */
    exportRunResultsAsXML(run: any, results: any[]): Promise<string>;
    /**
     * Escape special characters in CSV fields
     */
    private escapeCSVField;
    /**
     * Build XML from object structure
     */
    private buildXML;
    /**
     * Escape XML special characters
     */
    private escapeXML;
}
declare const _default: DataExportService;
export default _default;
//# sourceMappingURL=DataExportService.d.ts.map