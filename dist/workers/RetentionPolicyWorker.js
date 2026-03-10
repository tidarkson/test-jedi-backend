"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retentionPolicyWorker = exports.RetentionPolicyWorker = void 0;
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const date_fns_1 = require("date-fns");
class RetentionPolicyWorker {
    constructor() {
        this.prisma = (0, database_1.getPrisma)();
    }
    /**
     * Run retention policies - archive/delete items based on retention rules
     * This should be called by a cron job nightly
     */
    async applyRetentionPolicies() {
        try {
            logger_1.logger.info('Starting retention policy worker...');
            const policies = await this.prisma.retentionPolicy.findMany({
                where: { isActive: true },
            });
            for (const policy of policies) {
                try {
                    await this.applyPolicy(policy);
                }
                catch (error) {
                    logger_1.logger.error(`Error applying retention policy ${policy.id}:`, error);
                    // Continue with next policy
                }
            }
            logger_1.logger.info('Retention policy worker completed');
        }
        catch (error) {
            logger_1.logger.error('Error in retention policy worker:', error);
        }
    }
    /**
     * Apply a single retention policy
     */
    async applyPolicy(policy) {
        const cutoffDate = (0, date_fns_1.subDays)(new Date(), policy.retentionDays);
        logger_1.logger.info(`Applying policy ${policy.id}: ${policy.name} (cutoff: ${cutoffDate})`);
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
                logger_1.logger.warn(`Unknown entity type in policy: ${policy.entityType}`);
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
    async applyTestRunPolicy(policy, cutoffDate) {
        const where = {
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
        logger_1.logger.info(`Found ${affectedRuns.length} test runs matching retention policy ${policy.id}`);
        if (policy.actionType === 'ARCHIVE') {
            // Archive runs (soft delete)
            await this.prisma.testRun.updateMany({
                where,
                data: {
                    deletedAt: new Date(),
                },
            });
            logger_1.logger.info(`Archived ${affectedRuns.length} test runs`);
        }
        else if (policy.actionType === 'DELETE') {
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
            logger_1.logger.info(`Deleted ${deleted.count} test runs`);
        }
    }
    /**
     * Apply retention policy to test cases
     */
    async applyTestCasePolicy(policy, cutoffDate) {
        const where = {
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
            logger_1.logger.info(`Archived ${updated.count} test cases`);
        }
        else if (policy.actionType === 'DELETE') {
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
            logger_1.logger.info(`Deleted ${deleted.count} test cases`);
        }
    }
    /**
     * Apply retention policy to defects
     */
    async applyDefectPolicy(policy, cutoffDate) {
        const where = {
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
            logger_1.logger.warn('Defect archiving not fully implemented - would need schema update');
        }
        else if (policy.actionType === 'DELETE') {
            const deleted = await this.prisma.defect.deleteMany({ where });
            logger_1.logger.info(`Deleted ${deleted.count} defects`);
        }
    }
}
exports.RetentionPolicyWorker = RetentionPolicyWorker;
exports.retentionPolicyWorker = new RetentionPolicyWorker();
//# sourceMappingURL=RetentionPolicyWorker.js.map