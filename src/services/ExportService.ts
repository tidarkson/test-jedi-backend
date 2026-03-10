/**
 * Main Export Service
 * Orchestrates all export formats and handles queuing for large exports
 */

import { getPrisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError, ErrorCodes } from '../types/errors';
import {
  ExportRequest,
  ExportResponse,
  ExportJobData,
  PDFExecutiveSummary,
  PDFChart,
} from '../types/exports';
import PDFExportService from './PDFExportService';
import ExcelExportService from './ExcelExportService';
import DataExportService from './DataExportService';
import { S3Service } from '../utils/S3Service';
import { ExportQueueService } from '../workers/ExportQueueService';
import { v4 as uuidv4 } from 'uuid';

const LARGE_EXPORT_THRESHOLD = 500; // Queue jobs for exports with >500 cases

export class ExportService {
  private prisma = getPrisma();
  private s3Service = new S3Service();
  private queueService = new ExportQueueService();

  /**
   * Export test cases
   */
  async exportTestCases(
    projectId: string,
    userId: string,
    request: ExportRequest,
  ): Promise<ExportResponse> {
    try {
      // Verify project exists
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Project not found');
      }

      // Get test cases with filters
      const cases = await this.fetchTestCases(projectId, request.filters);

      // Check if should queue
      if (cases.length > LARGE_EXPORT_THRESHOLD) {
        return this.queueExportJob('cases', projectId, userId, request, cases.length);
      }

      // Otherwise process immediately
      return this.processTestCasesExport(cases, request, projectId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error exporting test cases:', error);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to export test cases',
      );
    }
  }

  /**
   * Export test run results
   */
  async exportTestRunResults(
    projectId: string,
    runId: string,
    userId: string,
    request: ExportRequest,
  ): Promise<ExportResponse> {
    try {
      // Verify run exists
      const run = await this.prisma.testRun.findUnique({
        where: { id: runId },
        include: {
          project: true,
          runCases: {
            include: {
              testCase: {
                include: { steps: true, author: true },
              },
              assignee: true,
              stepResults: true,
            },
          },
        },
      });

      if (!run || run.projectId !== projectId) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Test run not found');
      }

      // Check if should queue
      if (run.runCases.length > LARGE_EXPORT_THRESHOLD) {
        return this.queueExportJob('runs', projectId, userId, request, run.runCases.length, runId);
      }

      // Process immediately
      return this.processTestRunExport(run, request, projectId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error exporting test run:', error);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to export test run',
      );
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    projectId: string,
    _userId: string,
    request: ExportRequest,
  ): Promise<ExportResponse> {
    try {
      // Verify project exists
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Project not found');
      }

      // Get analytics data
      const analyticsData = await this.buildAnalyticsData(projectId, request);

      // Process export
      return this.processAnalyticsExport(analyticsData, request, projectId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error exporting analytics:', error);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to export analytics',
      );
    }
  }

  /**
   * Get export job status
   */
  async getExportStatus(jobId: string): Promise<ExportResponse> {
    try {
      const job = await this.queueService.getJobStatus(jobId);

      if (!job) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Export job not found');
      }

      return {
        jobId: job.jobId,
        status: job.status,
        format: job.format,
        downloadUrl: job.fileUrl,
        fileSize: job.fileSize,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        error: job.error,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting export status:', error);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to get export status',
      );
    }
  }

  /**
   * Process test cases export
   */
  private async processTestCasesExport(
    cases: any[],
    request: ExportRequest,
    projectId: string,
  ): Promise<ExportResponse> {
    const format = request.format;
    let fileBuffer: Buffer | string;
    let contentType: string;
    let fileName: string;

    try {
      switch (format) {
        case 'pdf':
          fileBuffer = await PDFExportService.exportTestCases(
            cases,
            request.filters,
            request.branding,
          );
          contentType = 'application/pdf';
          fileName = `test-cases-${Date.now()}.pdf`;
          break;

        case 'xlsx':
          fileBuffer = await ExcelExportService.exportTestCases(cases, request.filters);
          contentType =
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileName = `test-cases-${Date.now()}.xlsx`;
          break;

        case 'csv':
          fileBuffer = await DataExportService.exportCasesAsCSV(cases, request.filters);
          contentType = 'text/csv;charset=utf-8';
          fileName = `test-cases-${Date.now()}.csv`;
          break;

        case 'json':
          fileBuffer = await DataExportService.exportCasesAsJSON(cases);
          contentType = 'application/json';
          fileName = `test-cases-${Date.now()}.json`;
          break;

        case 'xml':
          fileBuffer = await DataExportService.exportCasesAsXML(cases);
          contentType = 'application/xml';
          fileName = `test-cases-${Date.now()}.xml`;
          break;

        default:
          throw new AppError(400, ErrorCodes.INVALID_INPUT, 'Unsupported format');
      }

      // Upload to S3
      const s3Url = await this.s3Service.uploadFile(
        fileName,
        fileBuffer,
        contentType,
        projectId,
      );

      const fileSize = typeof fileBuffer === 'string' ? Buffer.byteLength(fileBuffer, 'utf8') : fileBuffer.length;
      return {
        jobId: uuidv4(),
        status: 'completed',
        format,
        downloadUrl: s3Url,
        fileSize,
        createdAt: new Date(),
        completedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error processing test cases export:', error);
      throw error;
    }
  }

  /**
   * Process test run export
   */
  private async processTestRunExport(
    run: any,
    request: ExportRequest,
    projectId: string,
  ): Promise<ExportResponse> {
    const format = request.format;
    let fileBuffer: Buffer | string;
    let contentType: string;
    let fileName: string;

    try {
      // Prepare data
      const results = this.formatRunResults(run);
      const cases = run.runCases.map((rc: any) => rc.testCase);

      switch (format) {
        case 'pdf': {
          const summary = this.buildExecutiveSummary(run, results);
          const charts: PDFChart[] = request.sections?.includes('charts')
            ? await this.buildCharts(run, results)
            : [];

          fileBuffer = await PDFExportService.exportTestRunResults(
            run,
            cases,
            results,
            summary,
            charts,
            request.branding,
          );
          contentType = 'application/pdf';
          fileName = `test-run-${run.id.substring(0, 8)}-${Date.now()}.pdf`;
          break;
        }

        case 'xlsx':
          fileBuffer = await ExcelExportService.exportTestRunResults(run, cases, results);
          contentType =
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileName = `test-run-${run.id.substring(0, 8)}-${Date.now()}.xlsx`;
          break;

        case 'csv':
          fileBuffer = await DataExportService.exportRunResultsAsCSV(results);
          contentType = 'text/csv;charset=utf-8';
          fileName = `test-run-${run.id.substring(0, 8)}-${Date.now()}.csv`;
          break;

        case 'json':
          fileBuffer = await DataExportService.exportRunResultsAsJSON(run, results);
          contentType = 'application/json';
          fileName = `test-run-${run.id.substring(0, 8)}-${Date.now()}.json`;
          break;

        case 'xml':
          fileBuffer = await DataExportService.exportRunResultsAsXML(run, results);
          contentType = 'application/xml';
          fileName = `test-run-${run.id.substring(0, 8)}-${Date.now()}.xml`;
          break;

        default:
          throw new AppError(400, ErrorCodes.INVALID_INPUT, 'Unsupported format');
      }

      // Upload to S3
      const s3Url = await this.s3Service.uploadFile(
        fileName,
        fileBuffer,
        contentType,
        projectId,
      );

      const fileSize = typeof fileBuffer === 'string' ? Buffer.byteLength(fileBuffer, 'utf8') : fileBuffer.length;
      return {
        jobId: uuidv4(),
        status: 'completed',
        format,
        downloadUrl: s3Url,
        fileSize,
        createdAt: new Date(),
        completedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error processing test run export:', error);
      throw error;
    }
  }

  /**
   * Process analytics export
   */
  private async processAnalyticsExport(
    analyticsData: any,
    request: ExportRequest,
    projectId: string,
  ): Promise<ExportResponse> {
    const format = request.format;
    let fileBuffer: Buffer | string = '';
    let contentType: string = '';
    let fileName: string = '';

    try {
      switch (format) {
        case 'csv':
          fileBuffer = await DataExportService.exportAnalyticsAsCSV(analyticsData);
          contentType = 'text/csv;charset=utf-8';
          fileName = `analytics-${Date.now()}.csv`;
          break;

        case 'json':
          fileBuffer = JSON.stringify(analyticsData, null, 2);
          contentType = 'application/json';
          fileName = `analytics-${Date.now()}.json`;
          break;

        case 'pdf':
        case 'xlsx':
        default:
          throw new AppError(400, ErrorCodes.INVALID_INPUT, 'Format not supported for analytics');
      }

      // Upload to S3
      const s3Url = await this.s3Service.uploadFile(
        fileName,
        fileBuffer,
        contentType,
        projectId,
      );

      const fileSizeValue = typeof fileBuffer === 'string' ? Buffer.byteLength(fileBuffer as string, 'utf8') : (fileBuffer as Buffer).length;
      return {
        jobId: uuidv4(),
        status: 'completed',
        format,
        downloadUrl: s3Url,
        fileSize: fileSizeValue,
        createdAt: new Date(),
        completedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error processing analytics export:', error);
      throw error;
    }
  }

  /**
   * Queue export job for large exports
   */
  private async queueExportJob(
    entityType: 'cases' | 'runs' | 'analytics',
    projectId: string,
    userId: string,
    request: ExportRequest,
    _caseCount: number,
    entityId?: string,
  ): Promise<ExportResponse> {
    const jobId = uuidv4();

    const jobData: ExportJobData = {
      jobId,
      format: request.format,
      entityType,
      entityId: entityId || projectId,
      userId,
      projectId,
      request,
      createdAt: new Date(),
      status: 'pending',
    };

    await this.queueService.addJob(jobId, jobData);

    return {
      jobId,
      status: 'pending',
      format: request.format,
      createdAt: new Date(),
    };
  }

  /**
   * Fetch test cases with filters
   */
  private async fetchTestCases(projectId: string, filters?: any): Promise<any[]> {
    return this.prisma.testCase.findMany({
      where: {
        suite: { projectId },
        deletedAt: null,
        ...(filters?.status && { status: { in: filters.status } }),
        ...(filters?.priority && { priority: { in: filters.priority } }),
        ...(filters?.type && { type: { in: filters.type } }),
      },
      include: {
        steps: true,
        author: true,
        reviewer: true,
      },
      take: 10000, // Limit for safety
    });
  }

  /**
   * Format run results
   */
  private formatRunResults(run: any): any[] {
    return run.runCases.map((runCase: any) => ({
      caseId: runCase.caseId,
      caseTitle: runCase.testCase.title,
      status: runCase.status,
      assigneeName: runCase.assignee?.name,
      comment: runCase.testCase.description,
      duration: this.calculateDuration(runCase.startedAt, runCase.completedAt),
      startedAt: runCase.startedAt,
      completedAt: runCase.completedAt,
      stepResults: runCase.stepResults.map((sr: any) => ({
        stepNumber: sr.step?.order,
        action: sr.step?.action,
        expectedResult: sr.step?.expectedResult,
        status: sr.status,
        comment: sr.comment,
      })),
      defects: runCase.defects || [],
    }));
  }

  /**
   * Build executive summary
   */
  private buildExecutiveSummary(run: any, results: any[]): PDFExecutiveSummary {
    const passed = results.filter((r) => r.status === 'PASSED').length;
    const failed = results.filter((r) => r.status === 'FAILED').length;
    const blocked = results.filter((r) => r.status === 'BLOCKED').length;
    const skipped = results.filter((r) => r.status === 'SKIPPED').length;

    return {
      projectName: run.project?.name || 'Unknown',
      reportDate: new Date(),
      dateRange: {
        start: run.createdAt || new Date(),
        end: run.updatedAt || new Date(),
      },
      totalCases: results.length,
      passedCases: passed,
      failedCases: failed,
      blockedCases: blocked,
      skippedCases: skipped,
      passRate: results.length > 0 ? (passed / results.length) * 100 : 0,
      environment: run.environment || 'N/A',
    };
  }

  /**
   * Build charts (placeholder - integrate with charting library)
   */
  private async buildCharts(_run: any, results: any[]): Promise<PDFChart[]> {
    // This is a placeholder. In production, use a charting library like Plotly or Chart.js
    // with headless browser to generate PNG images

    const passFailData: any = {
      'PASSED': results.filter((r) => r.status === 'PASSED').length,
      'FAILED': results.filter((r) => r.status === 'FAILED').length,
      'BLOCKED': results.filter((r) => r.status === 'BLOCKED').length,
      'SKIPPED': results.filter((r) => r.status === 'SKIPPED').length,
    };

    return [
      {
        type: 'pie',
        title: 'Test Execution Status Distribution',
        data: passFailData,
      },
    ];
  }

  /**
   * Build analytics data
   */
  private async buildAnalyticsData(projectId: string, request: ExportRequest): Promise<any> {
    const runs = await this.prisma.testRun.findMany({
      where: { projectId },
      include: { runCases: true },
      orderBy: { createdAt: 'desc' },
      take: 30, // Last 30 runs for trend
    });

    const trendData = runs.reverse().map((run) => {
      const total = run.runCases.length;
      const passed = run.runCases.filter((rc) => rc.status === 'PASSED').length;

      return {
        date: run.createdAt,
        passRate: total > 0 ? (passed / total) * 100 : 0,
        executedCases: total,
        defectsFound: 0, // Calculate from actual defects if needed
      };
    });

    return {
      reportPeriod: {
        start: request.filters?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: request.filters?.endDate || new Date(),
      },
      projectMetrics: {
        totalCases: await this.prisma.testCase.count({ where: { suite: { projectId } } }),
        totalRuns: runs.length,
        totalDefects: 0,
        automationRate: 0,
        avgPassRate: 0,
      },
      trendData,
      topFailingCases: [],
      topDefectCategories: [],
    };
  }

  /**
   * Calculate duration in minutes
   */
  private calculateDuration(start?: Date, end?: Date): number | undefined {
    if (!start || !end) return undefined;
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  }
}

export default new ExportService();
