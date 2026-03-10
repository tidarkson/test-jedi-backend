"use strict";
/**
 * Export Queue Service
 * Handles queuing and processing of large export jobs using BullMQ
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportQueueService = exports.ExportQueueService = void 0;
const bullmq_1 = require("bullmq");
const database_1 = require("../config/database");
const environment_1 = require("../config/environment");
const logger_1 = require("../config/logger");
const S3Service_1 = require("../utils/S3Service");
// Store for in-memory job tracking (in production, use database)
const jobStore = new Map();
class ExportQueueService {
    constructor() {
        this.worker = null;
        this.s3Service = new S3Service_1.S3Service();
        this.prisma = (0, database_1.getPrisma)();
        const redisConfig = {
            host: environment_1.config.REDIS_HOST || 'localhost',
            port: parseInt(environment_1.config.REDIS_PORT || '6379', 10),
            maxRetriesPerRequest: null,
        };
        this.queue = new bullmq_1.Queue('exports', {
            connection: redisConfig,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: false, // Keep completed jobs for status checking
            },
        });
        this.initializeWorker();
    }
    /**
     * Initialize worker for processing export jobs
     */
    initializeWorker() {
        try {
            const redisConfig = {
                host: environment_1.config.REDIS_HOST || 'localhost',
                port: parseInt(environment_1.config.REDIS_PORT || '6379', 10),
            };
            this.worker = new bullmq_1.Worker('exports', this.processJob.bind(this), {
                connection: redisConfig,
                concurrency: 2, // Process 2 exports concurrently
            });
            this.worker.on('completed', (job) => {
                logger_1.logger.info(`Export job completed: ${job.id}`);
            });
            this.worker.on('failed', (job, error) => {
                logger_1.logger.error(`Export job failed: ${job?.id}`, error);
            });
            this.worker.on('progress', (job) => {
                logger_1.logger.info(`Export job progress: ${job.id} - ${job.progress}%`);
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize export worker:', error);
        }
    }
    /**
     * Add export job to queue
     */
    async addJob(jobId, jobData) {
        try {
            // Store in memory for quick retrieval
            jobStore.set(jobId, jobData);
            // Add to Bull queue
            const job = await this.queue.add(jobId, jobData, {
                jobId,
                priority: this.calculatePriority(jobData),
            });
            logger_1.logger.info(`Export job queued: ${jobId}`);
            return job.id;
        }
        catch (error) {
            logger_1.logger.error('Error adding job to queue:', error);
            throw error;
        }
    }
    /**
     * Get job status
     */
    async getJobStatus(jobId) {
        try {
            // Try in-memory store first
            const cachedJob = jobStore.get(jobId);
            if (cachedJob) {
                return cachedJob;
            }
            // Try to get from queue
            const job = await this.queue.getJob(jobId);
            if (!job) {
                return null;
            }
            const jobData = job.data;
            jobData.status = job.getState();
            if (job.finishedOn) {
                jobData.completedAt = new Date(job.finishedOn);
            }
            return jobData;
        }
        catch (error) {
            logger_1.logger.error('Error getting job status:', error);
            return null;
        }
    }
    /**
     * Process export job
     */
    async processJob(job) {
        try {
            const jobData = job.data;
            logger_1.logger.info(`Processing export job: ${job.id}`);
            // Update status
            this.updateJobStatus(job.id, 'processing', job);
            let fileBuffer = '';
            let contentType = '';
            let fileName = '';
            // Import required services based on format
            const { default: PDFExportService } = await Promise.resolve().then(() => __importStar(require('../services/PDFExportService')));
            const { default: ExcelExportService } = await Promise.resolve().then(() => __importStar(require('../services/ExcelExportService')));
            const { default: DataExportService } = await Promise.resolve().then(() => __importStar(require('../services/DataExportService')));
            // Fetch data and process based on entity type
            if (jobData.entityType === 'cases') {
                const cases = await this.fetchTestCases(jobData.projectId, jobData.request.filters);
                switch (jobData.format) {
                    case 'pdf':
                        await job.updateProgress(25);
                        fileBuffer = await PDFExportService.exportTestCases(cases, jobData.request.filters, jobData.request.branding);
                        contentType = 'application/pdf';
                        fileName = `test-cases-${Date.now()}.pdf`;
                        break;
                    case 'xlsx':
                        await job.updateProgress(25);
                        fileBuffer = await ExcelExportService.exportTestCases(cases, jobData.request.filters);
                        contentType =
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                        fileName = `test-cases-${Date.now()}.xlsx`;
                        break;
                    case 'csv':
                        await job.updateProgress(25);
                        fileBuffer = await DataExportService.exportCasesAsCSV(cases, jobData.request.filters);
                        contentType = 'text/csv;charset=utf-8';
                        fileName = `test-cases-${Date.now()}.csv`;
                        break;
                    case 'json':
                        await job.updateProgress(25);
                        fileBuffer = await DataExportService.exportCasesAsJSON(cases);
                        contentType = 'application/json';
                        fileName = `test-cases-${Date.now()}.json`;
                        break;
                    case 'xml':
                        await job.updateProgress(25);
                        fileBuffer = await DataExportService.exportCasesAsXML(cases);
                        contentType = 'application/xml';
                        fileName = `test-cases-${Date.now()}.xml`;
                        break;
                    default:
                        throw new Error(`Unsupported format: ${jobData.format}`);
                }
            }
            else if (jobData.entityType === 'runs') {
                // Similar logic for test runs
                const run = await this.fetchTestRun(jobData.entityId);
                if (!run) {
                    throw new Error(`Test run not found: ${jobData.entityId}`);
                }
                // Format results and process export
                fileName = `test-run-${jobData.entityId.substring(0, 8)}-${Date.now()}.${this.getFileExtension(jobData.format)}`;
                contentType = this.getContentType(jobData.format);
                fileBuffer = ''; // Will be populated based on format
            }
            if (!fileBuffer || !fileName) {
                throw new Error('Failed to generate export file');
            }
            await job.updateProgress(75);
            // Upload to S3
            const downloadUrl = await this.s3Service.uploadFile(fileName, fileBuffer, contentType, jobData.projectId);
            await job.updateProgress(95);
            // Update job with completion details
            const fileSize = typeof fileBuffer === 'string' ? fileBuffer.length : fileBuffer.length;
            this.updateJobStatus(job.id, 'completed', job, downloadUrl, fileSize);
            await job.updateProgress(100);
            return {
                success: true,
                jobId: job.id,
                downloadUrl,
                fileSize,
            };
        }
        catch (error) {
            logger_1.logger.error(`Error processing export job ${job.id}:`, error);
            this.updateJobStatus(job.id, 'failed', job, undefined, undefined, error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
    /**
     * Fetch test cases
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
            take: 50000,
        });
    }
    /**
     * Fetch test run
     */
    async fetchTestRun(runId) {
        return this.prisma.testRun.findUnique({
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
    }
    /**
     * Update job status in memory store
     */
    updateJobStatus(jobId, status, job, fileUrl, fileSize, error) {
        const jobData = jobStore.get(jobId);
        if (jobData) {
            jobData.status = status;
            jobData.startedAt = job.processedOn ? new Date(job.processedOn) : new Date();
            if (status === 'completed' || status === 'failed') {
                jobData.completedAt = new Date();
            }
            if (fileUrl) {
                jobData.fileUrl = fileUrl;
            }
            if (fileSize !== undefined) {
                jobData.fileSize = fileSize;
            }
            if (error) {
                jobData.error = error;
            }
            jobStore.set(jobId, jobData);
        }
    }
    /**
     * Calculate job priority based on data size
     */
    calculatePriority(_jobData) {
        // Smaller exports get higher priority
        // File size/case count determines priority
        return 1; // Default priority
    }
    /**
     * Get file extension based on format
     */
    getFileExtension(format) {
        const extensions = {
            pdf: 'pdf',
            xlsx: 'xlsx',
            csv: 'csv',
            json: 'json',
            xml: 'xml',
        };
        return extensions[format] || 'bin';
    }
    /**
     * Get content type based on format
     */
    getContentType(format) {
        const contentTypes = {
            pdf: 'application/pdf',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            csv: 'text/csv;charset=utf-8',
            json: 'application/json',
            xml: 'application/xml',
        };
        return contentTypes[format] || 'application/octet-stream';
    }
    /**
     * Cleanup old jobs
     */
    async cleanupOldJobs(olderThanDays = 7) {
        try {
            const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
            // Clean memory store
            for (const [jobId, jobData] of jobStore.entries()) {
                if (jobData.completedAt && new Date(jobData.completedAt) < cutoffDate) {
                    jobStore.delete(jobId);
                }
            }
            // Clean Bull queue (keep completed/failed for reference)
            logger_1.logger.info(`Cleaned up export jobs older than ${olderThanDays} days`);
        }
        catch (error) {
            logger_1.logger.error('Error cleaning up old jobs:', error);
        }
    }
    /**
     * Shutdown queue and worker
     */
    async shutdown() {
        try {
            if (this.worker) {
                await this.worker.close();
            }
            await this.queue.close();
            logger_1.logger.info('Export queue service shut down');
        }
        catch (error) {
            logger_1.logger.error('Error shutting down export queue:', error);
        }
    }
}
exports.ExportQueueService = ExportQueueService;
// Export singleton instance
exports.exportQueueService = new ExportQueueService();
//# sourceMappingURL=ExportQueueService.js.map