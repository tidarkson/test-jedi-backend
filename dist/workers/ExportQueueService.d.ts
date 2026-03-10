/**
 * Export Queue Service
 * Handles queuing and processing of large export jobs using BullMQ
 */
import { ExportJobData } from '../types/exports';
export declare class ExportQueueService {
    private queue;
    private worker;
    private s3Service;
    private prisma;
    constructor();
    /**
     * Initialize worker for processing export jobs
     */
    private initializeWorker;
    /**
     * Add export job to queue
     */
    addJob(jobId: string, jobData: ExportJobData): Promise<string>;
    /**
     * Get job status
     */
    getJobStatus(jobId: string): Promise<ExportJobData | null>;
    /**
     * Process export job
     */
    private processJob;
    /**
     * Fetch test cases
     */
    private fetchTestCases;
    /**
     * Fetch test run
     */
    private fetchTestRun;
    /**
     * Update job status in memory store
     */
    private updateJobStatus;
    /**
     * Calculate job priority based on data size
     */
    private calculatePriority;
    /**
     * Get file extension based on format
     */
    private getFileExtension;
    /**
     * Get content type based on format
     */
    private getContentType;
    /**
     * Cleanup old jobs
     */
    cleanupOldJobs(olderThanDays?: number): Promise<void>;
    /**
     * Shutdown queue and worker
     */
    shutdown(): Promise<void>;
}
export declare const exportQueueService: ExportQueueService;
//# sourceMappingURL=ExportQueueService.d.ts.map