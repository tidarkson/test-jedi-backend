/**
 * CSV, JSON, and XML Export Service
 * Handles flat and nested format exports
 */

import { logger } from '../config/logger';
import { ExportFilters } from '../types/exports';

export class DataExportService {
  /**
   * Generate CSV from test cases
   * Includes UTF-8 BOM for Excel compatibility
   */
  async exportCasesAsCSV(cases: any[], _filters?: ExportFilters): Promise<string> {
    try {
      const headers = [
        'ID',
        'Title',
        'Description',
        'Priority',
        'Type',
        'Severity',
        'Automation Status',
        'Status',
        'Author',
        'Created Date',
        'Steps Count',
      ];

      const rows = cases.map((testCase) => [
        testCase.id.substring(0, 8),
        this.escapeCSVField(testCase.title),
        this.escapeCSVField(testCase.description || ''),
        testCase.priority || '',
        testCase.type || '',
        testCase.severity || '',
        testCase.automationStatus || '',
        testCase.status || '',
        testCase.author?.name || '',
        testCase.createdAt ? new Date(testCase.createdAt).toLocaleDateString() : '',
        testCase.steps ? testCase.steps.length : 0,
      ]);

      // Build CSV content
      const csv = [
        headers.join(','),
        ...rows.map((row: string[]) => row.join(',')),
      ].join('\n');

      // Add UTF-8 BOM for Excel compatibility
      return '\uFEFF' + csv;
    } catch (error) {
      logger.error('Error generating CSV export:', error);
      throw error;
    }
  }

  /**
   * Generate CSV from test run results
   */
  async exportRunResultsAsCSV(results: any[]): Promise<string> {
    try {
      const headers = [
        'Case ID',
        'Case Title',
        'Status',
        'Assignee',
        'Comment',
        'Started At',
        'Completed At',
        'Duration (Minutes)',
      ];

      const rows = results.map((result) => [
        result.caseId.substring(0, 8),
        this.escapeCSVField(result.caseTitle),
        result.status || '',
        result.assigneeName || '',
        this.escapeCSVField(result.comment || ''),
        result.startedAt ? new Date(result.startedAt).toLocaleString() : '',
        result.completedAt ? new Date(result.completedAt).toLocaleString() : '',
        result.duration || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row: string[]) => row.join(',')),
      ].join('\n');

      // Add UTF-8 BOM
      return '\uFEFF' + csv;
    } catch (error) {
      logger.error('Error generating run results CSV:', error);
      throw error;
    }
  }

  /**
   * Generate CSV from analytics data
   */
  async exportAnalyticsAsCSV(analyticsData: any): Promise<string> {
    try {
      const headers = [
        'Date',
        'Pass Rate (%)',
        'Executed Cases',
        'Defects Found',
        'Passed',
        'Failed',
        'Blocked',
      ];

      const rows = (analyticsData.trendData || []).map((trend: any) => [
        new Date(trend.date).toLocaleDateString(),
        trend.passRate.toFixed(2),
        trend.executedCases,
        trend.defectsFound,
        Math.round((trend.passRate / 100) * trend.executedCases),
        Math.round(((100 - trend.passRate) / 100) * trend.executedCases),
        trend.blockedCases || 0,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row: number[]) => row.join(',')),
      ].join('\n');

      return '\uFEFF' + csv;
    } catch (error) {
      logger.error('Error generating analytics CSV:', error);
      throw error;
    }
  }

  /**
   * Generate JSON from test cases - nested structure with steps
   */
  async exportCasesAsJSON(cases: any[]): Promise<string> {
    try {
      const data = cases.map((testCase) => ({
        id: testCase.id,
        title: testCase.title,
        description: testCase.description,
        preconditions: testCase.preconditions,
        postconditions: testCase.postconditions,
        priority: testCase.priority,
        severity: testCase.severity,
        type: testCase.type,
        riskLevel: testCase.riskLevel,
        automationStatus: testCase.automationStatus,
        estimatedTime: testCase.estimatedTime,
        status: testCase.status,
        author: testCase.author ? { id: testCase.author.id, name: testCase.author.name } : null,
        reviewer: testCase.reviewer ? { id: testCase.reviewer.id, name: testCase.reviewer.name } : null,
        tags: testCase.tags,
        customFields: testCase.customFields,
        steps: testCase.steps
          ? testCase.steps.map((step: any) => ({
              order: step.order,
              action: step.action,
              expectedResult: step.expectedResult,
              testData: step.testData,
            }))
          : [],
        createdAt: testCase.createdAt,
        updatedAt: testCase.updatedAt,
      }));

      return JSON.stringify(data, null, 2);
    } catch (error) {
      logger.error('Error generating JSON export:', error);
      throw error;
    }
  }

  /**
   * Generate JSON from test run results
   */
  async exportRunResultsAsJSON(run: any, results: any[]): Promise<string> {
    try {
      const data = {
        runMetadata: {
          id: run.id,
          title: run.title,
          type: run.type,
          environment: run.environment,
          status: run.status,
          createdAt: run.createdAt,
          updatedAt: run.updatedAt,
        },
        summary: {
          totalCases: results.length,
          passed: results.filter((r) => r.status === 'PASSED').length,
          failed: results.filter((r) => r.status === 'FAILED').length,
          blocked: results.filter((r) => r.status === 'BLOCKED').length,
          skipped: results.filter((r) => r.status === 'SKIPPED').length,
        },
        results: results.map((result) => ({
          caseId: result.caseId,
          caseTitle: result.caseTitle,
          status: result.status,
          assignee: result.assigneeName,
          comment: result.comment,
          duration: result.duration,
          startedAt: result.startedAt,
          completedAt: result.completedAt,
          stepResults: result.stepResults
            ? result.stepResults.map((sr: any) => ({
                stepNumber: sr.stepNumber,
                action: sr.action,
                expectedResult: sr.expectedResult,
                status: sr.status,
                comment: sr.comment,
              }))
            : [],
          defects: result.defects || [],
        })),
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      logger.error('Error generating run results JSON:', error);
      throw error;
    }
  }

  /**
   * Generate XML from test cases
   */
  async exportCasesAsXML(cases: any[]): Promise<string> {
    try {
      const xml = this.buildXML('testcases', {
        _attrs: {
          count: cases.length,
          exportDate: new Date().toISOString(),
        },
        testcase: cases.map((testCase) => ({
          _attrs: { id: testCase.id },
          title: testCase.title,
          description: testCase.description || '',
          priority: testCase.priority || '',
          type: testCase.type || '',
          severity: testCase.severity || '',
          automationStatus: testCase.automationStatus || '',
          status: testCase.status || '',
          author: testCase.author?.name || '',
          preconditions: testCase.preconditions || '',
          postconditions: testCase.postconditions || '',
          steps:
            testCase.steps && testCase.steps.length > 0
              ? {
                  step: testCase.steps.map((step: any) => ({
                    _attrs: { order: step.order },
                    action: step.action,
                    expectedResult: step.expectedResult,
                    testData: step.testData ? JSON.stringify(step.testData) : '',
                  })),
                }
              : '',
          createdAt: testCase.createdAt,
          updatedAt: testCase.updatedAt,
        })),
      });

      return '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
    } catch (error) {
      logger.error('Error generating XML export:', error);
      throw error;
    }
  }

  /**
   * Generate XML from test run results
   */
  async exportRunResultsAsXML(run: any, results: any[]): Promise<string> {
    try {
      const xml = this.buildXML('testrun', {
        _attrs: {
          id: run.id,
          exportDate: new Date().toISOString(),
        },
        metadata: {
          title: run.title,
          type: run.type,
          environment: run.environment,
          status: run.status,
          createdAt: run.createdAt,
        },
        summary: {
          totalCases: results.length,
          passed: results.filter((r) => r.status === 'PASSED').length,
          failed: results.filter((r) => r.status === 'FAILED').length,
          blocked: results.filter((r) => r.status === 'BLOCKED').length,
        },
        results: {
          result: results.map((result) => ({
            _attrs: { id: result.caseId },
            caseTitle: result.caseTitle,
            status: result.status,
            assignee: result.assigneeName || '',
            comment: result.comment || '',
            duration: result.duration || '',
            stepResults:
              result.stepResults && result.stepResults.length > 0
                ? {
                    step: result.stepResults.map((sr: any) => ({
                      _attrs: { number: sr.stepNumber },
                      action: sr.action,
                      expectedResult: sr.expectedResult,
                      status: sr.status,
                      comment: sr.comment || '',
                    })),
                  }
                : '',
            defects:
              result.defects && result.defects.length > 0
                ? {
                    defect: result.defects.map((defect: any) => ({
                      title: defect.title,
                      status: defect.status,
                      url: defect.url,
                    })),
                  }
                : '',
          })),
        },
      });

      return '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
    } catch (error) {
      logger.error('Error generating run results XML:', error);
      throw error;
    }
  }

  /**
   * Escape special characters in CSV fields
   */
  private escapeCSVField(field: string): string {
    if (!field) return '';

    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return '"' + field.replace(/"/g, '""') + '"';
    }
    return field;
  }

  /**
   * Build XML from object structure
   */
  private buildXML(rootTag: string, obj: any, indent: string = ''): string {
    if (typeof obj !== 'object' || obj === null) {
      return '';
    }

    let xml = `${indent}<${rootTag}`;

    // Add attributes
    if (obj._attrs) {
      Object.entries(obj._attrs).forEach(([key, value]) => {
        xml += ` ${key}="${this.escapeXML(String(value))}"`;
      });
    }

    // Filter out _attrs from children
    const children = Object.entries(obj)
      .filter(([key]) => key !== '_attrs')
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, any>);

    const childrenCount = Object.keys(children).length;

    if (childrenCount === 0) {
      xml += ' />\n';
      return xml;
    }

    xml += '>\n';
    const newIndent = indent + '  ';

    Object.entries(children).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'object' && item !== null) {
            xml += this.buildXML(key, item, newIndent);
          } else {
            xml += `${newIndent}<${key}>${this.escapeXML(String(item))}</${key}>\n`;
          }
        });
      } else if (typeof value === 'object' && value !== null && !value._attrs) {
        xml += this.buildXML(key, value, newIndent);
      } else if (value) {
        xml += `${newIndent}<${key}>${this.escapeXML(String(value))}</${key}>\n`;
      }
    });

    xml += `${indent}</${rootTag}>\n`;
    return xml;
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default new DataExportService();
