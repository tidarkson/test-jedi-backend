"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobScheduler = exports.JobScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = require("../config/logger");
const RetentionPolicyWorker_1 = require("./RetentionPolicyWorker");
/**
 * JobScheduler - Manages all scheduled background jobs
 */
class JobScheduler {
    constructor() {
        this.jobs = new Map();
    }
    /**
     * Initialize all scheduled jobs
     */
    initializeJobs() {
        try {
            // Schedule retention policy job to run every night at 2 AM
            this.scheduleRetentionPolicyJob();
            logger_1.logger.info('All scheduled jobs initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize scheduled jobs:', error);
        }
    }
    /**
     * Schedule retention policy job
     * Runs nightly at 2 AM
     */
    scheduleRetentionPolicyJob() {
        const task = node_cron_1.default.schedule('0 2 * * *', async () => {
            logger_1.logger.info('Running scheduled retention policy job');
            await RetentionPolicyWorker_1.retentionPolicyWorker.applyRetentionPolicies();
        });
        this.jobs.set('retention-policy', task);
        logger_1.logger.info('Retention policy job scheduled (runs daily at 2 AM)');
    }
    /**
     * Stop all scheduled jobs
     */
    stopAllJobs() {
        for (const [name, task] of this.jobs) {
            task.stop();
            logger_1.logger.info(`Stopped scheduled job: ${name}`);
        }
        this.jobs.clear();
    }
    /**
     * Check if a job exists
     */
    hasJob(name) {
        return this.jobs.has(name);
    }
    /**
     * Stop a specific job
     */
    stopJob(name) {
        const task = this.jobs.get(name);
        if (task) {
            task.stop();
            this.jobs.delete(name);
            logger_1.logger.info(`Stopped scheduled job: ${name}`);
            return true;
        }
        return false;
    }
}
exports.JobScheduler = JobScheduler;
exports.jobScheduler = new JobScheduler();
//# sourceMappingURL=JobScheduler.js.map