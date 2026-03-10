/**
 * PDF Export Utility
 * Uses Puppeteer to generate PDFs from HTML templates
 */
import { PDFExecutiveSummary, PDFChart, BrandingConfig } from '../types/exports';
export declare class PDFExportService {
    private browser;
    /**
     * Initialize browser instance (lazy load)
     */
    private initBrowser;
    /**
     * Cleanup browser on shutdown
     */
    closeBrowser(): Promise<void>;
    /**
     * Generate PDF from test cases data
     */
    exportTestCases(cases: any[], _filters: any, branding?: BrandingConfig): Promise<Buffer>;
    /**
     * Generate PDF from test run results
     */
    exportTestRunResults(run: any, _cases: any[], results: any[], executiveSummary: PDFExecutiveSummary, charts?: PDFChart[], branding?: BrandingConfig): Promise<Buffer>;
    /**
     * Build HTML for test cases
     */
    private buildCasesHTML;
    /**
     * Build HTML for test run results with executive summary and charts
     */
    private buildResultsHTML;
    /**
     * Build executive summary section
     */
    private buildExecutiveSummaryHTML;
    /**
     * Build charts section with embedded images
     */
    private buildChartsHTML;
    /**
     * Build page header with logo and branding
     */
    private buildHeaderHTML;
    /**
     * Build page footer
     */
    private buildFooterHTML;
    /**
     * Base CSS styles for PDF
     */
    private getBaseStyles;
    /**
     * Get PDF options based on branding
     */
    private getPDFOptions;
}
declare const _default: PDFExportService;
export default _default;
//# sourceMappingURL=PDFExportService.d.ts.map