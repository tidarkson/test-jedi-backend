/**
 * Excel Export Service
 * Generates XLSX files with multiple worksheets, conditional formatting, and data validation
 */

import ExcelJS from 'exceljs';
import { logger } from '../config/logger';

export class ExcelExportService {
  /**
   * Generate Excel file with test cases
   */
  async exportTestCases(cases: any[], _filters?: any): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();

      // Summary worksheet
      this.addSummarySheet(workbook, cases);

      // Cases worksheet
      this.addCasesSheet(workbook, cases);

      // Steps worksheet
      this.addStepsSheet(workbook, cases);

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer as any as Buffer;
    } catch (error) {
      logger.error('Error generating Excel export:', error);
      throw error;
    }
  }

  /**
   * Generate Excel file with test run results
   */
  async exportTestRunResults(
    run: any,
    _cases: any[],
    results: any[],
  ): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();

      // Summary worksheet
      this.addRunSummarySheet(workbook, run, results);

      // Cases worksheet
      this.addRunCasesSheet(workbook, results);

      // Results worksheet
      this.addResultsSheet(workbook, results);

      // Steps & Results worksheet
      this.addStepsResultsSheet(workbook, results);

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer as any as Buffer;
    } catch (error) {
      logger.error('Error generating test run Excel export:', error);
      throw error;
    }
  }

  /**
   * Add summary worksheet for cases
   */
  private addSummarySheet(workbook: ExcelJS.Workbook, cases: any[]): void {
    const worksheet = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 1 }] });

    // Set column widths
    worksheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 15 },
    ];

    // Add summary data
    const summaryData = [
      { metric: 'Total Test Cases', value: cases.length },
      {
        metric: 'By Priority',
        value: '',
      },
      {
        metric: '  - Critical',
        value: cases.filter((c) => c.priority === 'CRITICAL').length,
      },
      {
        metric: '  - High',
        value: cases.filter((c) => c.priority === 'HIGH').length,
      },
      {
        metric: '  - Medium',
        value: cases.filter((c) => c.priority === 'MEDIUM').length,
      },
      {
        metric: '  - Low',
        value: cases.filter((c) => c.priority === 'LOW').length,
      },
      { metric: 'By Type', value: '' },
      {
        metric: '  - Functional',
        value: cases.filter((c) => c.type === 'FUNCTIONAL').length,
      },
      {
        metric: '  - Regression',
        value: cases.filter((c) => c.type === 'REGRESSION').length,
      },
      {
        metric: '  - Smoke',
        value: cases.filter((c) => c.type === 'SMOKE').length,
      },
      {
        metric: 'Status',
        value: '',
      },
      {
        metric: '  - Active',
        value: cases.filter((c) => c.status === 'ACTIVE').length,
      },
      {
        metric: '  - Draft',
        value: cases.filter((c) => c.status === 'DRAFT').length,
      },
      {
        metric: 'Automation Status',
        value: '',
      },
      {
        metric: '  - Automated',
        value: cases.filter((c) => c.automationStatus === 'AUTOMATED').length,
      },
      {
        metric: '  - Manual',
        value: cases.filter((c) => c.automationStatus === 'MANUAL').length,
      },
    ];

    worksheet.addRows(summaryData);

    // Format header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF007bff' },
    };

    // Format value column with conditional styling
    worksheet.getColumn('value').numFmt = '@';
  }

  /**
   * Add cases worksheet
   */
  private addCasesSheet(workbook: ExcelJS.Workbook, cases: any[]): void {
    const worksheet = workbook.addWorksheet('Cases', { views: [{ state: 'frozen', ySplit: 1 }] });

    worksheet.columns = [
      { header: 'Case ID', key: 'id', width: 12 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Automation', key: 'automationStatus', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Author', key: 'authorName', width: 15 },
      { header: 'Created', key: 'createdAt', width: 12 },
    ];

    const rows = cases.map((c) => ({
      id: c.id.substring(0, 8),
      title: c.title,
      description: c.description || '',
      priority: c.priority || '',
      type: c.type || '',
      severity: c.severity || '',
      automationStatus: c.automationStatus || '',
      status: c.status || '',
      authorName: c.author?.name || '',
      createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
    }));

    worksheet.addRows(rows);

    // Format header
    this.formatHeaderRow(worksheet);

    // Conditional formatting for priority column
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const priorityCell = row.getCell('priority');
      switch (priorityCell.value) {
        case 'CRITICAL':
          priorityCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF6B6B' }, // Red
          };
          priorityCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          break;
        case 'HIGH':
          priorityCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFA726' }, // Orange
          };
          break;
        case 'MEDIUM':
          priorityCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFEB3B' }, // Yellow
          };
          break;
        case 'LOW':
          priorityCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFB3E5FC' }, // Light Blue
          };
          break;
      }
    });

    // Add data validation for status column
    const dataRange = `D2:D${cases.length + 1}`;
    (worksheet as any).dataValidations.add({
      type: 'list',
      formula1: '"CRITICAL, HIGH, MEDIUM, LOW"',
      sqref: dataRange,
      showErrorMessage: true,
      errorTitle: 'Invalid Priority',
      error: 'Please select from: CRITICAL, HIGH, MEDIUM, LOW',
    });

    // Auto-fit columns
    worksheet.columns.forEach((col) => {
      let maxLength = 0;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 0;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });
      col.width = Math.min(maxLength + 2, 50);
    });
  }

  /**
   * Add steps worksheet
   */
  private addStepsSheet(workbook: ExcelJS.Workbook, cases: any[]): void {
    const worksheet = workbook.addWorksheet('Steps', { views: [{ state: 'frozen', ySplit: 1 }] });

    worksheet.columns = [
      { header: 'Case ID', key: 'caseId', width: 12 },
      { header: 'Case Title', key: 'caseTitle', width: 25 },
      { header: 'Step #', key: 'stepNumber', width: 8 },
      { header: 'Action', key: 'action', width: 40 },
      { header: 'Expected Result', key: 'expectedResult', width: 40 },
      { header: 'Test Data', key: 'testData', width: 20 },
    ];

    const rows: any[] = [];

    cases.forEach((testCase) => {
      if (testCase.steps && testCase.steps.length > 0) {
        testCase.steps.forEach((step: any) => {
          rows.push({
            caseId: testCase.id.substring(0, 8),
            caseTitle: testCase.title,
            stepNumber: step.order,
            action: step.action,
            expectedResult: step.expectedResult,
            testData: step.testData ? JSON.stringify(step.testData) : '',
          });
        });
      }
    });

    worksheet.addRows(rows);
    this.formatHeaderRow(worksheet);

    // Auto-fit columns
    worksheet.columns.forEach((col) => {
      col.width = Math.min((col.width || 15) + 2, 50);
    });
  }

  /**
   * Add run summary worksheet
   */
  private addRunSummarySheet(
    workbook: ExcelJS.Workbook,
    run: any,
    results: any[],
  ): void {
    const worksheet = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 1 }] });

    worksheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 15 },
    ];

    const passed = results.filter((r) => r.status === 'PASSED').length;
    const failed = results.filter((r) => r.status === 'FAILED').length;
    const blocked = results.filter((r) => r.status === 'BLOCKED').length;
    const totalRun = results.length;
    const passRate = totalRun > 0 ? ((passed / totalRun) * 100).toFixed(2) : '0.00';

    const summaryData = [
      { metric: 'Run Title', value: run.title },
      { metric: 'Run ID', value: run.id.substring(0, 8) },
      { metric: 'Environment', value: run.environment || 'N/A' },
      { metric: 'Run Type', value: run.type || 'N/A' },
      { metric: 'Status', value: run.status || 'N/A' },
      { metric: '', value: '' },
      { metric: 'Total Cases Executed', value: totalRun },
      { metric: 'Passed', value: passed },
      { metric: 'Failed', value: failed },
      { metric: 'Blocked', value: blocked },
      { metric: 'Skipped', value: totalRun - passed - failed - blocked },
      { metric: 'Pass Rate', value: `${passRate}%` },
      { metric: 'Created At', value: run.createdAt ? new Date(run.createdAt).toLocaleString() : '' },
      { metric: 'Updated At', value: run.updatedAt ? new Date(run.updatedAt).toLocaleString() : '' },
    ];

    worksheet.addRows(summaryData);

    // Format header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF007bff' },
    };

    // Highlight pass rate with color
    const passRateRow = worksheet.getRow(12);
    passRateRow.getCell('value').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: parseFloat(passRate) >= 80 ? 'FFD4EDDA' : 'FFF8D7DA' }, // Green if >80%, red otherwise
    };
  }

  /**
   * Add cases with results worksheet
   */
  private addRunCasesSheet(workbook: ExcelJS.Workbook, results: any[]): void {
    const worksheet = workbook.addWorksheet('Cases', { views: [{ state: 'frozen', ySplit: 1 }] });

    worksheet.columns = [
      { header: 'Case ID', key: 'caseId', width: 12 },
      { header: 'Case Title', key: 'caseTitle', width: 30 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Assignee', key: 'assignee', width: 15 },
      { header: 'Duration (min)', key: 'duration', width: 12 },
      { header: 'Started At', key: 'startedAt', width: 15 },
      { header: 'Completed At', key: 'completedAt', width: 15 },
    ];

    const rows = results.map((r) => ({
      caseId: r.caseId.substring(0, 8),
      caseTitle: r.caseTitle,
      status: r.status,
      assignee: r.assigneeName || 'N/A',
      duration: r.duration || '',
      startedAt: r.startedAt ? new Date(r.startedAt).toLocaleString() : '',
      completedAt: r.completedAt ? new Date(r.completedAt).toLocaleString() : '',
    }));

    worksheet.addRows(rows);

    // Format header
    this.formatHeaderRow(worksheet);

    // Conditional formatting for status
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const statusCell = row.getCell('status');
      switch (statusCell.value) {
        case 'PASSED':
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD4EDDA' }, // Green
          };
          statusCell.font = { color: { argb: 'FF155724' } };
          break;
        case 'FAILED':
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8D7DA' }, // Red
          };
          statusCell.font = { color: { argb: 'FF721c24' } };
          break;
        case 'BLOCKED':
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFEEBA' }, // Yellow
          };
          break;
        case 'SKIPPED':
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE2E3E5' }, // Gray
          };
          break;
      }
    });
  }

  /**
   * Add detailed results worksheet
   */
  private addResultsSheet(workbook: ExcelJS.Workbook, results: any[]): void {
    const worksheet = workbook.addWorksheet('Results', { views: [{ state: 'frozen', ySplit: 1 }] });

    worksheet.columns = [
      { header: 'Case ID', key: 'caseId', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Comment', key: 'comment', width: 40 },
      { header: 'Defects', key: 'defects', width: 20 },
    ];

    const rows = results.map((r) => ({
      caseId: r.caseId.substring(0, 8),
      status: r.status,
      comment: r.comment || '',
      defects: r.defects ? r.defects.join(', ') : '',
    }));

    worksheet.addRows(rows);
    this.formatHeaderRow(worksheet);
  }

  /**
   * Add steps and results worksheet (combined)
   */
  private addStepsResultsSheet(workbook: ExcelJS.Workbook, results: any[]): void {
    const worksheet = workbook.addWorksheet('Step Results', { views: [{ state: 'frozen', ySplit: 1 }] });

    worksheet.columns = [
      { header: 'Case ID', key: 'caseId', width: 12 },
      { header: 'Step #', key: 'stepNumber', width: 8 },
      { header: 'Step Action', key: 'action', width: 30 },
      { header: 'Expected Result', key: 'expectedResult', width: 30 },
      { header: 'Actual Result', key: 'actualResult', width: 30 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    const rows: any[] = [];

    results.forEach((result) => {
      if (result.stepResults && result.stepResults.length > 0) {
        result.stepResults.forEach((stepResult: any) => {
          rows.push({
            caseId: result.caseId.substring(0, 8),
            stepNumber: stepResult.stepNumber,
            action: stepResult.action,
            expectedResult: stepResult.expectedResult,
            actualResult: stepResult.comment || '',
            status: stepResult.status,
          });
        });
      }
    });

    worksheet.addRows(rows);

    // Format header
    this.formatHeaderRow(worksheet);

    // Conditional formatting for step status
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const statusCell = row.getCell('status');
      switch (statusCell.value) {
        case 'PASSED':
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD4EDDA' },
          };
          break;
        case 'FAILED':
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8D7DA' },
          };
          break;
      }
    });
  }

  /**
   * Format header row with blue background and white text
   */
  private formatHeaderRow(worksheet: ExcelJS.Worksheet): void {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF007bff' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
}

export default new ExcelExportService();
