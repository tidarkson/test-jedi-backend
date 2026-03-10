"use strict";
/**
 * PDF Export Utility
 * Uses Puppeteer to generate PDFs from HTML templates
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFExportService = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const logger_1 = require("../config/logger");
class PDFExportService {
    constructor() {
        this.browser = null;
    }
    /**
     * Initialize browser instance (lazy load)
     */
    async initBrowser() {
        if (!this.browser) {
            try {
                this.browser = await puppeteer_1.default.launch({
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                    ],
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to launch Puppeteer:', error);
                throw error;
            }
        }
        return this.browser;
    }
    /**
     * Cleanup browser on shutdown
     */
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
    /**
     * Generate PDF from test cases data
     */
    async exportTestCases(cases, _filters, branding = {}) {
        try {
            const browser = await this.initBrowser();
            const page = await browser.newPage();
            // Build HTML template
            const html = this.buildCasesHTML(cases, _filters, branding);
            await page.setContent(html, { waitUntil: 'networkidle0' });
            // Generate PDF
            const pdfBuffer = await page.pdf(this.getPDFOptions(branding));
            await page.close();
            return pdfBuffer;
        }
        catch (error) {
            logger_1.logger.error('Error generating test cases PDF:', error);
            throw error;
        }
    }
    /**
     * Generate PDF from test run results
     */
    async exportTestRunResults(run, _cases, results, executiveSummary, charts = [], branding = {}) {
        try {
            const browser = await this.initBrowser();
            const page = await browser.newPage();
            // Build HTML template with charts
            const html = this.buildResultsHTML(run, _cases, results, executiveSummary, charts, branding);
            await page.setContent(html, { waitUntil: 'networkidle0' });
            // Generate PDF
            const pdfBuffer = await page.pdf(this.getPDFOptions(branding));
            await page.close();
            return pdfBuffer;
        }
        catch (error) {
            logger_1.logger.error('Error generating test run PDF:', error);
            throw error;
        }
    }
    /**
     * Build HTML for test cases
     */
    buildCasesHTML(cases, _filters, branding) {
        const headerHTML = this.buildHeaderHTML(branding);
        const footerHTML = this.buildFooterHTML(branding);
        const casesTableHTML = cases
            .map((testCase, idx) => `
      <div class="page-break">
        <h2 class="case-title">Test Case ${idx + 1}: ${testCase.title}</h2>
        <table class="case-table">
          <tr>
            <td><strong>ID:</strong></td>
            <td>${testCase.id}</td>
          </tr>
          <tr>
            <td><strong>Priority:</strong></td>
            <td>${testCase.priority || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>Type:</strong></td>
            <td>${testCase.type || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>Status:</strong></td>
            <td>${testCase.status || 'N/A'}</td>
          </tr>
        </table>
        
        <h3>Description</h3>
        <p>${testCase.description || 'N/A'}</p>
        
        <h3>Preconditions</h3>
        <p>${testCase.preconditions || 'N/A'}</p>
        
        <h3>Test Steps</h3>
        ${testCase.steps && testCase.steps.length > 0
            ? `
          <table class="steps-table">
            <thead>
              <tr>
                <th>Step</th>
                <th>Action</th>
                <th>Expected Result</th>
              </tr>
            </thead>
            <tbody>
              ${testCase.steps
                .map((step, stepIdx) => `
                <tr>
                  <td>${stepIdx + 1}</td>
                  <td>${step.action}</td>
                  <td>${step.expectedResult}</td>
                </tr>
              `)
                .join('')}
            </tbody>
          </table>
        `
            : '<p>No steps defined</p>'}
      </div>
    `)
            .join('');
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Test Cases Export</title>
          <style>
            ${this.getBaseStyles(branding)}
          </style>
        </head>
        <body>
          ${headerHTML}
          <div class="content">
            ${casesTableHTML}
          </div>
          ${footerHTML}
        </body>
      </html>
    `;
    }
    /**
     * Build HTML for test run results with executive summary and charts
     */
    buildResultsHTML(run, _cases, results, summary, charts, branding) {
        const headerHTML = this.buildHeaderHTML(branding);
        const footerHTML = this.buildFooterHTML(branding);
        const summaryHTML = this.buildExecutiveSummaryHTML(summary, branding);
        const chartsHTML = this.buildChartsHTML(charts);
        const resultsTableHTML = results
            .map((result) => `
      <tr class="result-row result-${result.status.toLowerCase()}">
        <td>${result.caseId}</td>
        <td>${result.caseTitle}</td>
        <td>${result.status}</td>
        <td>${result.assignee || 'N/A'}</td>
        <td>${result.comment || 'N/A'}</td>
      </tr>
    `)
            .join('');
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Test Run Report - ${run.title}</title>
          <style>
            ${this.getBaseStyles(branding)}
          </style>
        </head>
        <body>
          ${headerHTML}
          <div class="content">
            <h1 class="report-title">Test Run Report</h1>
            <p class="report-subtitle">${run.title}</p>
            
            ${summaryHTML}
            
            <div class="page-break"></div>
            
            <h2>Performance Charts</h2>
            ${chartsHTML}
            
            <div class="page-break"></div>
            
            <h2>Test Results</h2>
            <table class="results-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Case Title</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                ${resultsTableHTML}
              </tbody>
            </table>
          </div>
          ${footerHTML}
        </body>
      </html>
    `;
    }
    /**
     * Build executive summary section
     */
    buildExecutiveSummaryHTML(summary, _branding) {
        return `
      <div class="executive-summary">
        <h2>Executive Summary</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <label>Project</label>
            <value>${summary.projectName}</value>
          </div>
          <div class="summary-item">
            <label>Report Date</label>
            <value>${summary.reportDate.toLocaleDateString()}</value>
          </div>
          <div class="summary-item">
            <label>Environment</label>
            <value>${summary.environment}</value>
          </div>
          <div class="summary-item">
            <label>Total Cases</label>
            <value>${summary.totalCases}</value>
          </div>
          <div class="summary-item">
            <label>Passed</label>
            <value class="status-passed">${summary.passedCases}</value>
          </div>
          <div class="summary-item">
            <label>Failed</label>
            <value class="status-failed">${summary.failedCases}</value>
          </div>
          <div class="summary-item">
            <label>Blocked</label>
            <value class="status-blocked">${summary.blockedCases}</value>
          </div>
          <div class="summary-item">
            <label>Skipped</label>
            <value class="status-skipped">${summary.skippedCases}</value>
          </div>
          <div class="summary-item">
            <label>Pass Rate</label>
            <value>${summary.passRate.toFixed(2)}%</value>
          </div>
        </div>
      </div>
    `;
    }
    /**
     * Build charts section with embedded images
     */
    buildChartsHTML(_charts) {
        if (!_charts || _charts.length === 0) {
            return '<p>No charts available</p>';
        }
        return _charts
            .map((chart) => `
      <div class="chart-container">
        <h3>${chart.title}</h3>
        ${chart.imageData
            ? `<img src="data:image/png;base64,${chart.imageData}" alt="${chart.title}" class="chart-image" />`
            : '<p>Chart data unavailable</p>'}
      </div>
    `)
            .join('');
    }
    /**
     * Build page header with logo and branding
     */
    buildHeaderHTML(branding) {
        return `
      <div class="header">
        ${branding.companyLogo
            ? `<img src="${branding.companyLogo}" alt="Company Logo" class="logo" />`
            : ''}
        <h1 class="company-name">${branding.companyName || 'Test Report'}</h1>
        ${branding.includeWatermark ? `<div class="watermark">${branding.watermarkText || 'CONFIDENTIAL'}</div>` : ''}
      </div>
    `;
    }
    /**
     * Build page footer
     */
    buildFooterHTML(branding) {
        return `
      <div class="footer">
        <p>${branding.footerText || '© ' + new Date().getFullYear() + ' All Rights Reserved'}</p>
        ${branding.showPageNumbers ? '<span class="page-number"></span>' : ''}
      </div>
    `;
    }
    /**
     * Base CSS styles for PDF
     */
    getBaseStyles(branding) {
        const themeColor = branding.themeColor || '#007bff';
        return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #333;
        line-height: 1.6;
        font-size: 11pt;
      }
      
      .header {
        border-bottom: 3px solid ${themeColor};
        padding: 20px 0;
        margin-bottom: 30px;
        position: relative;
      }
      
      .logo {
        max-height: 50px;
        margin-bottom: 10px;
      }
      
      .company-name {
        font-size: 24pt;
        color: ${themeColor};
        margin-bottom: 5px;
      }
      
      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 80pt;
        color: rgba(200, 200, 200, 0.3);
        z-index: -1;
        pointer-events: none;
      }
      
      .footer {
        border-top: 1px solid #ccc;
        padding: 10px 0;
        margin-top: 30px;
        font-size: 10pt;
        color: #666;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .content {
        margin: 20px 0;
      }
      
      h1 {
        font-size: 20pt;
        color: ${themeColor};
        margin: 20px 0 10px 0;
      }
      
      h2 {
        font-size: 16pt;
        color: ${themeColor};
        margin: 15px 0 10px 0;
        border-bottom: 2px solid ${themeColor};
        padding-bottom: 5px;
      }
      
      h3 {
        font-size: 12pt;
        color: #555;
        margin: 10px 0 8px 0;
      }
      
      .report-title {
        text-align: center;
        font-size: 28pt;
        margin: 20px 0;
      }
      
      .report-subtitle {
        text-align: center;
        font-size: 14pt;
        color: #666;
        margin-bottom: 20px;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
      }
      
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      
      th {
        background-color: ${themeColor};
        color: white;
        font-weight: bold;
      }
      
      tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      
      .case-table td:first-child {
        font-weight: bold;
        width: 150px;
      }
      
      .steps-table {
        margin: 10px 0;
      }
      
      .results-table {
        font-size: 10pt;
      }
      
      .result-passed {
        background-color: #d4edda;
      }
      
      .result-failed {
        background-color: #f8d7da;
      }
      
      .result-blocked {
        background-color: #fff3cd;
      }
      
      .result-skipped {
        background-color: #e2e3e5;
      }
      
      .status-passed {
        color: #155724;
        font-weight: bold;
      }
      
      .status-failed {
        color: #721c24;
        font-weight: bold;
      }
      
      .status-blocked {
        color: #856404;
        font-weight: bold;
      }
      
      .status-skipped {
        color: #383d41;
        font-weight: bold;
      }
      
      .executive-summary {
        background-color: #f8f9fa;
        border: 2px solid ${themeColor};
        padding: 15px;
        margin: 20px 0;
        border-radius: 5px;
      }
      
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
        margin-top: 15px;
      }
      
      .summary-item {
        display: flex;
        flex-direction: column;
      }
      
      .summary-item label {
        font-weight: bold;
        color: #555;
        font-size: 10pt;
        margin-bottom: 3px;
      }
      
      .summary-item value {
        font-size: 14pt;
        color: ${themeColor};
        font-weight: bold;
      }
      
      .chart-container {
        margin: 20px 0;
        text-align: center;
      }
      
      .chart-image {
        max-width: 100%;
        height: auto;
        max-height: 300px;
      }
      
      .page-break {
        page-break-after: always;
        margin-bottom: 40px;
      }
      
      .case-title {
        color: ${themeColor};
        font-size: 14pt;
        margin: 15px 0 10px 0;
      }
      
      p {
        margin: 8px 0;
      }
      
      @page {
        size: A4;
        margin: 15mm;
        @bottom-right {
          content: "Page " counter(page) " of " counter(pages);
        }
      }
    `;
    }
    /**
     * Get PDF options based on branding
     */
    getPDFOptions(branding) {
        return {
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: branding.showPageNumbers !== false,
            headerTemplate: '<div></div>',
            footerTemplate: branding.showPageNumbers
                ? '<div style="width: 100%; text-align: right; font-size: 10px; padding-right: 20px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
                : '<div></div>',
            margin: {
                top: '15mm',
                right: '15mm',
                bottom: '15mm',
                left: '15mm',
            },
        };
    }
}
exports.PDFExportService = PDFExportService;
exports.default = new PDFExportService();
//# sourceMappingURL=PDFExportService.js.map