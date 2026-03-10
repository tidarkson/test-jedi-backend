"use strict";
/**
 * Main Export Service
 * Orchestrates all export formats and handles queuing for large exports
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const errors_1 = require("../types/errors");
const PDFExportService_1 = __importDefault(require("./PDFExportService"));
const ExcelExportService_1 = __importDefault(require("./ExcelExportService"));
const DataExportService_1 = __importDefault(require("./DataExportService"));
const S3Service_1 = require("../utils/S3Service");
const ExportQueueService_1 = require("../workers/ExportQueueService");
const uuid_1 = require("uuid");
const LARGE_EXPORT_THRESHOLD = 500; // Queue jobs for exports with >500 cases
class ExportService {
    constructor() {
        this.prisma = (0, database_1.getPrisma)();
        this.s3Service = new S3Service_1.S3Service();
        this.queueService = new ExportQueueService_1.ExportQueueService();
    }
    /**
     * Export test cases
     */
    async exportTestCases(projectId, userId, request) {
        try {
            // Verify project exists
            const project = await this.prisma.project.findUnique({
                where: { id: projectId },
            });
            if (!project) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Project not found');
            }
            // Get test cases with filters
            const cases = await this.fetchTestCases(projectId, request.filters);
            // Check if should queue
            if (cases.length > LARGE_EXPORT_THRESHOLD) {
                return this.queueExportJob('cases', projectId, userId, request, cases.length);
            }
            // Otherwise process immediately
            return this.processTestCasesExport(cases, request, projectId);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error('Error exporting test cases:', error);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to export test cases');
        }
    }
    /**
     * Export test run results
     */
    async exportTestRunResults(projectId, runId, userId, request) {
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
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Test run not found');
            }
            // Check if should queue
            if (run.runCases.length > LARGE_EXPORT_THRESHOLD) {
                return this.queueExportJob('runs', projectId, userId, request, run.runCases.length, runId);
            }
            // Process immediately
            return this.processTestRunExport(run, request, projectId);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error('Error exporting test run:', error);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to export test run');
        }
    }
    /**
     * Export analytics data
     */
    async exportAnalytics(projectId, _userId, request) {
        try {
            // Verify project exists
            const project = await this.prisma.project.findUnique({
                where: { id: projectId },
            });
            if (!project) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Project not found');
            }
            // Get analytics data
            const analyticsData = await this.buildAnalyticsData(projectId, request);
            // Process export
            return this.processAnalyticsExport(analyticsData, request, projectId);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error('Error exporting analytics:', error);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to export analytics');
        }
    }
    /**
     * Get export job status
     */
    async getExportStatus(jobId) {
        try {
            const job = await this.queueService.getJobStatus(jobId);
            if (!job) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Export job not found');
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
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error('Error getting export status:', error);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to get export status');
        }
    }
    /**
     * Process test cases export
     */
    async processTestCasesExport(cases, request, projectId) {
        const format = request.format;
        let fileBuffer;
        let contentType;
        let fileName;
        try {
            switch (format) {
                case 'pdf':
                    fileBuffer = await PDFExportService_1.default.exportTestCases(cases, request.filters, request.branding);
                    contentType = 'application/pdf';
                    fileName = `test-cases-${Date.now()}.pdf`;
                    break;
                case 'xlsx':
                    fileBuffer = await ExcelExportService_1.default.exportTestCases(cases, request.filters);
                    contentType =
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    fileName = `test-cases-${Date.now()}.xlsx`;
                    break;
                case 'csv':
                    fileBuffer = await DataExportService_1.default.exportCasesAsCSV(cases, request.filters);
                    contentType = 'text/csv;charset=utf-8';
                    fileName = `test-cases-${Date.now()}.csv`;
                    break;
                case 'json':
                    fileBuffer = await DataExportService_1.default.exportCasesAsJSON(cases);
                    contentType = 'application/json';
                    fileName = `test-cases-${Date.now()}.json`;
                    break;
                case 'xml':
                    fileBuffer = await DataExportService_1.default.exportCasesAsXML(cases);
                    contentType = 'application/xml';
                    fileName = `test-cases-${Date.now()}.xml`;
                    break;
                default:
                    throw new errors_1.AppError(400, errors_1.ErrorCodes.INVALID_INPUT, 'Unsupported format');
            }
            // Upload to S3
            const s3Url = await this.s3Service.uploadFile(fileName, fileBuffer, contentType, projectId);
            const fileSize = typeof fileBuffer === 'string' ? Buffer.byteLength(fileBuffer, 'utf8') : fileBuffer.length;
            return {
                jobId: (0, uuid_1.v4)(),
                status: 'completed',
                format,
                downloadUrl: s3Url,
                fileSize,
                createdAt: new Date(),
                completedAt: new Date(),
            };
        }
        catch (error) {
            logger_1.logger.error('Error processing test cases export:', error);
            throw error;
        }
    }
    /**
     * Process test run export
     */
    async processTestRunExport(run, request, projectId) {
        const format = request.format;
        let fileBuffer;
        let contentType;
        let fileName;
        try {
            // Prepare data
            const results = this.formatRunResults(run);
            const cases = run.runCases.map((rc) => rc.testCase);
            switch (format) {
                case 'pdf': {
                    const summary = this.buildExecutiveSummary(run, results);
                    const charts = request.sections?.includes('charts')
                        ? await this.buildCharts(run, results)
                        : [];
                    fileBuffer = await PDFExportService_1.default.exportTestRunResults(run, cases, results, summary, charts, request.branding);
                    contentType = 'application/pdf';
                    fileName = `test-run-${run.id.substring(0, 8)}-${Date.now()}.pdf`;
                    break;
                }
                case 'xlsx':
                    fileBuffer = await ExcelExportService_1.default.exportTestRunResults(run, cases, results);
                    contentType =
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    fileName = `test-run-${run.id.substring(0, 8)}-${Date.now()}.xlsx`;
                    break;
                case 'csv':
                    fileBuffer = await DataExportService_1.default.exportRunResultsAsCSV(results);
                    contentType = 'text/csv;charset=utf-8';
                    fileName = `test-run-${run.id.substring(0, 8)}-${Date.now()}.csv`;
                    break;
                case 'json':
                    fileBuffer = await DataExportService_1.default.exportRunResultsAsJSON(run, results);
                    contentType = 'application/json';
                    fileName = `test-run-${run.id.substring(0, 8)}-${Date.now()}.json`;
                    break;
                case 'xml':
                    fileBuffer = await DataExportService_1.default.exportRunResultsAsXML(run, results);
                    contentType = 'application/xml';
                    fileName = `test-run-${run.id.substring(0, 8)}-${Date.now()}.xml`;
                    break;
                default:
                    throw new errors_1.AppError(400, errors_1.ErrorCodes.INVALID_INPUT, 'Unsupported format');
            }
            // Upload to S3
            const s3Url = await this.s3Service.uploadFile(fileName, fileBuffer, contentType, projectId);
            const fileSize = typeof fileBuffer === 'string' ? Buffer.byteLength(fileBuffer, 'utf8') : fileBuffer.length;
            return {
                jobId: (0, uuid_1.v4)(),
                status: 'completed',
                format,
                downloadUrl: s3Url,
                fileSize,
                createdAt: new Date(),
                completedAt: new Date(),
            };
        }
        catch (error) {
            logger_1.logger.error('Error processing test run export:', error);
            throw error;
        }
    }
    /**
     * Process analytics export
     */
    async processAnalyticsExport(analyticsData, request, projectId) {
        const format = request.format;
        let fileBuffer = '';
        let contentType = '';
        let fileName = '';
        try {
            switch (format) {
                case 'csv':
                    fileBuffer = await DataExportService_1.default.exportAnalyticsAsCSV(analyticsData);
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
                    throw new errors_1.AppError(400, errors_1.ErrorCodes.INVALID_INPUT, 'Format not supported for analytics');
            }
            // Upload to S3
            const s3Url = await this.s3Service.uploadFile(fileName, fileBuffer, contentType, projectId);
            const fileSizeValue = typeof fileBuffer === 'string' ? Buffer.byteLength(fileBuffer, 'utf8') : fileBuffer.length;
            return {
                jobId: (0, uuid_1.v4)(),
                status: 'completed',
                format,
                downloadUrl: s3Url,
                fileSize: fileSizeValue,
                createdAt: new Date(),
                completedAt: new Date(),
            };
        }
        catch (error) {
            logger_1.logger.error('Error processing analytics export:', error);
            throw error;
        }
    }
    /**
     * Queue export job for large exports
     */
    async queueExportJob(entityType, projectId, userId, request, _caseCount, entityId) {
        const jobId = (0, uuid_1.v4)();
        const jobData = {
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
    async fetchTestCases(projectId, filters) {
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
    formatRunResults(run) {
        return run.runCases.map((runCase) => ({
            caseId: runCase.caseId,
            caseTitle: runCase.testCase.title,
            status: runCase.status,
            assigneeName: runCase.assignee?.name,
            comment: runCase.testCase.description,
            duration: this.calculateDuration(runCase.startedAt, runCase.completedAt),
            startedAt: runCase.startedAt,
            completedAt: runCase.completedAt,
            stepResults: runCase.stepResults.map((sr) => ({
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
    buildExecutiveSummary(run, results) {
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
    async buildCharts(_run, results) {
        // This is a placeholder. In production, use a charting library like Plotly or Chart.js
        // with headless browser to generate PNG images
        const passFailData = {
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
    async buildAnalyticsData(projectId, request) {
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
    calculateDuration(start, end) {
        if (!start || !end)
            return undefined;
        return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    }
}
exports.ExportService = ExportService;
exports.default = new ExportService();
//# sourceMappingURL=ExportService.js.map