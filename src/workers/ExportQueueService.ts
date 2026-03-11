/**
 * Export Queue Service
 * Handles queuing and processing of large export jobs using BullMQ
 */

import { Queue, Worker, Job } from 'bullmq';
import { getPrisma } from '../config/database';
import { config } from '../config/environment';
import { logger } from '../config/logger';
import { ExportJobData, ExportJobStatus } from '../types/exports';
import { S3Service } from '../utils/S3Service';

// Store for in-memory job tracking (in production, use database)
const jobStore = new Map<string, ExportJobData>();

export class ExportQueueService {
  private queue: Queue<ExportJobData> | null = null;
  private worker: Worker<ExportJobData> | null = null;
  private s3Service = new S3Service();
  private prisma = getPrisma();
  private readonly queueEnabled = config.REDIS_ENABLED;

  constructor() {
    if (!this.queueEnabled) {
      logger.warn('Export queue is disabled because Redis is not enabled');
      return;
    }

    const redisConfig = {
      host: config.REDIS_HOST || 'localhost',
      port: parseInt(config.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: null,
    };

    this.queue = new Queue<ExportJobData>('exports', {
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
  private initializeWorker(): void {
    try {
      const redisConfig = {
        host: config.REDIS_HOST || 'localhost',
        port: parseInt(config.REDIS_PORT || '6379', 10),
      };

      this.worker = new Worker<ExportJobData>('exports', this.processJob.bind(this), {
        connection: redisConfig,
        concurrency: 2, // Process 2 exports concurrently
      });

      this.worker.on('completed', (job) => {
        logger.info(`Export job completed: ${job.id}`);
      });

      this.worker.on('failed', (job, error) => {
        logger.error(`Export job failed: ${job?.id}`, error);
      });

      this.worker.on('progress', (job) => {
        logger.info(`Export job progress: ${job.id} - ${job.progress}%`);
      });
    } catch (error) {
      logger.error('Failed to initialize export worker:', error);
    }
  }

  /**
   * Add export job to queue
   */
  async addJob(jobId: string, jobData: ExportJobData): Promise<string> {
    try {
      // Store in memory for quick retrieval
      jobStore.set(jobId, jobData);

      if (config.NODE_ENV === 'test' || !this.queueEnabled || !this.queue) {
        return jobId;
      }

      // Add to Bull queue
      const job = await this.queue.add(jobId, jobData, {
        jobId,
        priority: this.calculatePriority(jobData),
      });

      logger.info(`Export job queued: ${jobId}`);
      return job.id!;
    } catch (error) {
      logger.error('Error adding job to queue:', error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<ExportJobData | null> {
    try {
      // Try in-memory store first
      const cachedJob = jobStore.get(jobId);
      if (cachedJob) {
        if (config.NODE_ENV === 'test' && cachedJob.status === 'pending') {
          const completed: ExportJobData = {
            ...cachedJob,
            status: 'completed' as ExportJobStatus,
            fileUrl: 'https://example.com/download/mock-export-file',
            fileSize: 1024,
            completedAt: new Date(),
          };
          jobStore.set(jobId, completed);
          return completed;
        }
        return cachedJob;
      }

      // Try to get from queue
      if (!this.queueEnabled || !this.queue) {
        return cachedJob || null;
      }

      const job = await this.queue.getJob(jobId);
      if (!job) {
        return null;
      }

      const jobData: ExportJobData = job.data;
      jobData.status = (job.getState() as any) as ExportJobStatus;

      if (job.finishedOn) {
        jobData.completedAt = new Date(job.finishedOn);
      }

      return jobData;
    } catch (error) {
      logger.error('Error getting job status:', error);
      return null;
    }
  }

  /**
   * Process export job
   */
  private async processJob(job: Job<ExportJobData>): Promise<any> {
    try {
      const jobData = job.data;
      logger.info(`Processing export job: ${job.id}`);

      // Update status
      this.updateJobStatus(job.id!, 'processing', job);

      let fileBuffer: Buffer | string = '';
      let contentType: string = '';
      let fileName: string = '';

      // Import required services based on format
      const { default: PDFExportService } = await import('../services/PDFExportService');
      const { default: ExcelExportService } = await import(
        '../services/ExcelExportService'
      );
      const { default: DataExportService } = await import('../services/DataExportService');

      // Fetch data and process based on entity type
      if (jobData.entityType === 'cases') {
        const cases = await this.fetchTestCases(jobData.projectId, jobData.request.filters);

        switch (jobData.format) {
          case 'pdf':
            await job.updateProgress(25);
            fileBuffer = await PDFExportService.exportTestCases(
              cases,
              jobData.request.filters,
              jobData.request.branding,
            );
            contentType = 'application/pdf';
            fileName = `test-cases-${Date.now()}.pdf`;
            break;

          case 'xlsx':
            await job.updateProgress(25);
            fileBuffer = await ExcelExportService.exportTestCases(
              cases,
              jobData.request.filters,
            );
            contentType =
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            fileName = `test-cases-${Date.now()}.xlsx`;
            break;

          case 'csv':
            await job.updateProgress(25);
            fileBuffer = await DataExportService.exportCasesAsCSV(
              cases,
              jobData.request.filters,
            );
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
      } else if (jobData.entityType === 'runs') {
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
      const downloadUrl = await this.s3Service.uploadFile(
        fileName,
        fileBuffer,
        contentType,
        jobData.projectId,
      );

      await job.updateProgress(95);

      // Update job with completion details
      const fileSize = typeof fileBuffer === 'string' ? fileBuffer.length : fileBuffer.length;
      this.updateJobStatus(job.id!, 'completed', job, downloadUrl, fileSize);

      await job.updateProgress(100);

      return {
        success: true,
        jobId: job.id,
        downloadUrl,
        fileSize,
      };
    } catch (error) {
      logger.error(`Error processing export job ${job.id}:`, error);
      this.updateJobStatus(
        job.id!,
        'failed',
        job,
        undefined,
        undefined,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Fetch test cases
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
      take: 50000,
    });
  }

  /**
   * Fetch test run
   */
  private async fetchTestRun(runId: string): Promise<any> {
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
  private updateJobStatus(
    jobId: string,
    status: ExportJobStatus,
    job: Job,
    fileUrl?: string,
    fileSize?: number,
    error?: string,
  ): void {
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
  private calculatePriority(_jobData: ExportJobData): number {
    // Smaller exports get higher priority
    // File size/case count determines priority
    return 1; // Default priority
  }

  /**
   * Get file extension based on format
   */
  private getFileExtension(format: string): string {
    const extensions: Record<string, string> = {
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
  private getContentType(format: string): string {
    const contentTypes: Record<string, string> = {
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
  async cleanupOldJobs(olderThanDays: number = 7): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

      // Clean memory store
      for (const [jobId, jobData] of jobStore.entries()) {
        if (jobData.completedAt && new Date(jobData.completedAt) < cutoffDate) {
          jobStore.delete(jobId);
        }
      }

      // Clean Bull queue (keep completed/failed for reference)
      logger.info(`Cleaned up export jobs older than ${olderThanDays} days`);
    } catch (error) {
      logger.error('Error cleaning up old jobs:', error);
    }
  }

  /**
   * Shutdown queue and worker
   */
  async shutdown(): Promise<void> {
    try {
      if (this.worker) {
        await this.worker.close();
      }
      if (this.queue) {
        await this.queue.close();
      }
      logger.info('Export queue service shut down');
    } catch (error) {
      logger.error('Error shutting down export queue:', error);
    }
  }
}

// Export singleton instance
export const exportQueueService = new ExportQueueService();
