import { getPrisma } from '../config/database';
import { logger } from '../config/logger';
import { subDays } from 'date-fns';

export class RetentionPolicyWorker {
  private prisma = getPrisma();

  /**
   * Run retention policies - archive/delete items based on retention rules
   * This should be called by a cron job nightly
   */
  async applyRetentionPolicies() {
    try {
      logger.info('Starting retention policy worker...');

      const policies = await this.prisma.retentionPolicy.findMany({
        where: { isActive: true },
      });

      for (const policy of policies) {
        try {
          await this.applyPolicy(policy);
        } catch (error) {
          logger.error(`Error applying retention policy ${policy.id}:`, error);
          // Continue with next policy
        }
      }

      logger.info('Retention policy worker completed');
    } catch (error) {
      logger.error('Error in retention policy worker:', error);
    }
  }

  /**
   * Apply a single retention policy
   */
  private async applyPolicy(policy: any) {
    const cutoffDate = subDays(new Date(), policy.retentionDays);

    logger.info(`Applying policy ${policy.id}: ${policy.name} (cutoff: ${cutoffDate})`);

    switch (policy.entityType) {
      case 'TestRun':
        await this.applyTestRunPolicy(policy, cutoffDate);
        break;
      case 'TestCase':
        await this.applyTestCasePolicy(policy, cutoffDate);
        break;
      case 'Defect':
        await this.applyDefectPolicy(policy, cutoffDate);
        break;
      default:
        logger.warn(`Unknown entity type in policy: ${policy.entityType}`);
    }

    // Update lastRunAt
    await this.prisma.retentionPolicy.update({
      where: { id: policy.id },
      data: { lastRunAt: new Date() },
    });
  }

  /**
   * Apply retention policy to test runs
   */
  private async applyTestRunPolicy(policy: any, cutoffDate: Date) {
    const where: any = {
      organizationId: policy.organizationId,
      createdAt: { lte: cutoffDate },
    };

    // Apply filter criteria if specified
    if (policy.filterCriteria) {
      if (policy.filterCriteria.status) {
        where.status = policy.filterCriteria.status;
      }
    }

    const affectedRuns = await this.prisma.testRun.findMany({
      where,
      select: { id: true },
    });

    logger.info(`Found ${affectedRuns.length} test runs matching retention policy ${policy.id}`);

    if (policy.actionType === 'ARCHIVE') {
      // Archive runs (soft delete)
      await this.prisma.testRun.updateMany({
        where,
        data: {
          deletedAt: new Date(),
        },
      });

      logger.info(`Archived ${affectedRuns.length} test runs`);
    } else if (policy.actionType === 'DELETE') {
      // Hard delete related data first (due to constraints)
      for (const run of affectedRuns) {
        // Delete step results
        await this.prisma.stepResult.deleteMany({
          where: {
            runCase: {
              runId: run.id,
            },
          },
        });

        // Delete defects
        await this.prisma.defect.deleteMany({
          where: {
            runCase: {
              runId: run.id,
            },
          },
        });

        // Delete run cases
        await this.prisma.runCase.deleteMany({
          where: { runId: run.id },
        });

        // Delete test plan runs
        await this.prisma.testPlanRun.deleteMany({
          where: { runId: run.id },
        });
      }

      // Delete the runs
      const deleted = await this.prisma.testRun.deleteMany({ where });

      logger.info(`Deleted ${deleted.count} test runs`);
    }
  }

  /**
   * Apply retention policy to test cases
   */
  private async applyTestCasePolicy(policy: any, cutoffDate: Date) {
    const where: any = {
      suite: {
        project: {
          organizationId: policy.organizationId,
        },
      },
      createdAt: { lte: cutoffDate },
    };

    // Apply filter criteria if specified
    if (policy.filterCriteria) {
      if (policy.filterCriteria.status) {
        where.status = policy.filterCriteria.status;
      }
    }

    if (policy.actionType === 'ARCHIVE') {
      const updated = await this.prisma.testCase.updateMany({
        where,
        data: { deletedAt: new Date() },
      });

      logger.info(`Archived ${updated.count} test cases`);
    } else if (policy.actionType === 'DELETE') {
      // Get test cases to delete
      const testCasesToDelete = await this.prisma.testCase.findMany({
        where,
        select: { id: true },
      });

      for (const tc of testCasesToDelete) {
        // Delete related custom field values
        await this.prisma.customFieldValue.deleteMany({
          where: {
            entityId: tc.id,
            entityType: 'TestCase',
          },
        });

        // Delete steps
        await this.prisma.testStep.deleteMany({
          where: { testCaseId: tc.id },
        });
      }

      // Delete run cases first
      await this.prisma.runCase.deleteMany({
        where: {
          testCase: {
            id: { in: testCasesToDelete.map(tc => tc.id) },
          },
        },
      });

      // Then delete test cases
      const deleted = await this.prisma.testCase.deleteMany({ where });

      logger.info(`Deleted ${deleted.count} test cases`);
    }
  }

  /**
   * Apply retention policy to defects
   */
  private async applyDefectPolicy(policy: any, cutoffDate: Date) {
    const where: any = {
      runCase: {
        run: {
          project: {
            organizationId: policy.organizationId,
          },
        },
      },
      createdAt: { lte: cutoffDate },
    };

    // Apply filter criteria if specified
    if (policy.filterCriteria) {
      if (policy.filterCriteria.status) {
        where.status = policy.filterCriteria.status;
      }
    }

    if (policy.actionType === 'ARCHIVE') {
      // For defects, we can just set a flag in metadata
      // Since there's no deletedAt column, we'll do a soft delete via a status field
      // This would require schema update - for now we'll just log
      logger.warn('Defect archiving not fully implemented - would need schema update');
    } else if (policy.actionType === 'DELETE') {
      const deleted = await this.prisma.defect.deleteMany({ where });
      logger.info(`Deleted ${deleted.count} defects`);
    }
  }
}

export const retentionPolicyWorker = new RetentionPolicyWorker();
