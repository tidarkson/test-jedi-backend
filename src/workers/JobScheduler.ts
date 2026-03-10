import cron from 'node-cron';
import { logger } from '../config/logger';
import { retentionPolicyWorker } from './RetentionPolicyWorker';

/**
 * JobScheduler - Manages all scheduled background jobs
 */
export class JobScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Initialize all scheduled jobs
   */
  initializeJobs() {
    try {
      // Schedule retention policy job to run every night at 2 AM
      this.scheduleRetentionPolicyJob();

      logger.info('All scheduled jobs initialized');
    } catch (error) {
      logger.error('Failed to initialize scheduled jobs:', error);
    }
  }

  /**
   * Schedule retention policy job
   * Runs nightly at 2 AM
   */
  private scheduleRetentionPolicyJob() {
    const task = cron.schedule('0 2 * * *', async () => {
      logger.info('Running scheduled retention policy job');
      await retentionPolicyWorker.applyRetentionPolicies();
    });

    this.jobs.set('retention-policy', task);
    logger.info('Retention policy job scheduled (runs daily at 2 AM)');
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs() {
    for (const [name, task] of this.jobs) {
      task.stop();
      logger.info(`Stopped scheduled job: ${name}`);
    }
    this.jobs.clear();
  }

  /**
   * Check if a job exists
   */
  hasJob(name: string): boolean {
    return this.jobs.has(name);
  }

  /**
   * Stop a specific job
   */
  stopJob(name: string): boolean {
    const task = this.jobs.get(name);
    if (task) {
      task.stop();
      this.jobs.delete(name);
      logger.info(`Stopped scheduled job: ${name}`);
      return true;
    }
    return false;
  }
}

export const jobScheduler = new JobScheduler();
