/**
 * JobScheduler - Manages all scheduled background jobs
 */
export declare class JobScheduler {
    private jobs;
    /**
     * Initialize all scheduled jobs
     */
    initializeJobs(): void;
    /**
     * Schedule retention policy job
     * Runs nightly at 2 AM
     */
    private scheduleRetentionPolicyJob;
    /**
     * Stop all scheduled jobs
     */
    stopAllJobs(): void;
    /**
     * Check if a job exists
     */
    hasJob(name: string): boolean;
    /**
     * Stop a specific job
     */
    stopJob(name: string): boolean;
}
export declare const jobScheduler: JobScheduler;
//# sourceMappingURL=JobScheduler.d.ts.map