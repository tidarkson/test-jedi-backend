"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestPlanService = void 0;
const database_1 = require("../config/database");
const errors_1 = require("../types/errors");
const logger_1 = require("../config/logger");
const client_1 = require("@prisma/client");
const WebhookService_1 = __importDefault(require("./WebhookService"));
const SlackService_1 = __importDefault(require("./SlackService"));
class TestPlanService {
    constructor() {
        this.prisma = (0, database_1.getPrisma)();
    }
    /**
     * ========== PLAN MANAGEMENT ==========
     */
    /**
     * Create a new test plan
     */
    async createPlan(projectId, userId, input) {
        try {
            // Verify project exists
            const project = await this.prisma.project.findUnique({
                where: { id: projectId },
            });
            if (!project) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Project not found');
            }
            // Create plan
            const plan = await this.prisma.testPlan.create({
                data: {
                    projectId,
                    title: input.title,
                    description: input.description || null,
                    status: client_1.TestPlanStatus.DRAFT,
                    isApproved: false,
                    milestoneId: input.milestoneId || null,
                },
            });
            // Create initial version 1.0
            await this.createVersion(plan.id);
            // Audit log
            await this.createAuditLog(projectId, userId, 'TestPlan', plan.id, client_1.AuditAction.CREATE, null, {
                title: plan.title,
                status: plan.status,
            });
            return this.mapToPlanDTO(plan);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error creating plan: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create plan');
        }
    }
    /**
     * List plans for a project (paginated, with metrics)
     */
    async listPlans(projectId, page = 1, limit = 20, filters) {
        try {
            // Build filter
            const where = { projectId };
            if (filters?.status)
                where.status = filters.status;
            if (filters?.milestoneId)
                where.milestoneId = filters.milestoneId;
            if (filters?.isApproved !== undefined)
                where.isApproved = filters.isApproved;
            if (filters?.search) {
                where.OR = [
                    { title: { contains: filters.search, mode: 'insensitive' } },
                    { description: { contains: filters.search, mode: 'insensitive' } },
                ];
            }
            // Get total count
            const total = await this.prisma.testPlan.count({ where });
            // Get plans
            const plans = await this.prisma.testPlan.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            });
            // Enrich with metrics
            const enriched = await Promise.all(plans.map(async (plan) => {
                const metrics = await this.calculatePlanMetrics(plan.id);
                return {
                    ...this.mapToPlanDTO(plan),
                    metrics,
                };
            }));
            return {
                data: enriched,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_1.logger.error(`Error listing plans: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to list plans');
        }
    }
    /**
     * Get plan detail with linked runs and metrics
     */
    async getPlanDetail(planId) {
        try {
            const plan = await this.prisma.testPlan.findUnique({
                where: { id: planId },
                include: {
                    milestone: true,
                    approvedBy: true,
                    planRuns: {
                        include: {
                            run: true,
                        },
                    },
                },
            });
            if (!plan) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Test plan not found');
            }
            // Calculate metrics
            const metrics = await this.calculatePlanMetrics(plan.id);
            // Map linked runs
            const linkedRuns = await Promise.all(plan.planRuns.map(async (pr) => {
                const runMetrics = await this.calculateRunMetrics(pr.run.id);
                return {
                    id: pr.id,
                    runId: pr.run.id,
                    title: pr.run.title,
                    status: pr.run.status,
                    metrics: {
                        totalCases: runMetrics.totalCases,
                        passedCases: runMetrics.passedCases,
                        failedCases: runMetrics.failedCases,
                        passRate: runMetrics.passRate,
                        completionRate: runMetrics.completionRate,
                    },
                };
            }));
            return {
                ...this.mapToPlanDTO(plan),
                milestone: plan.milestone
                    ? {
                        id: plan.milestone.id,
                        name: plan.milestone.name,
                        dueDate: plan.milestone.dueDate,
                    }
                    : null,
                approvedBy: plan.approvedBy
                    ? {
                        id: plan.approvedBy.id,
                        name: plan.approvedBy.name,
                        email: plan.approvedBy.email,
                    }
                    : null,
                linkedRuns,
                metrics,
            };
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error getting plan detail: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to get plan detail');
        }
    }
    /**
     * Update plan
     */
    async updatePlan(planId, userId, input) {
        try {
            const plan = await this.prisma.testPlan.findUnique({
                where: { id: planId },
            });
            if (!plan) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Test plan not found');
            }
            // Update plan
            const updated = await this.prisma.testPlan.update({
                where: { id: planId },
                data: {
                    ...(input.title && { title: input.title }),
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.status && { status: input.status }),
                    ...(input.milestoneId !== undefined && { milestoneId: input.milestoneId }),
                },
            });
            // Create new version on meaningful changes
            if (input.title || input.description || input.status) {
                await this.createVersion(planId);
            }
            // Audit log
            await this.createAuditLog(plan.projectId, userId, 'TestPlan', planId, client_1.AuditAction.UPDATE, plan, updated);
            return this.mapToPlanDTO(updated);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error updating plan: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to update plan');
        }
    }
    /**
     * ========== RUN MANAGEMENT ==========
     */
    /**
     * Add run to plan
     */
    async addRunToPlan(planId, input) {
        try {
            const plan = await this.prisma.testPlan.findUnique({
                where: { id: planId },
            });
            if (!plan) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Test plan not found');
            }
            // Verify run exists and belongs to same project
            const run = await this.prisma.testRun.findUnique({
                where: { id: input.runId },
            });
            if (!run || run.projectId !== plan.projectId) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Test run not found or belongs to different project');
            }
            // Check if already linked
            const existing = await this.prisma.testPlanRun.findUnique({
                where: {
                    planId_runId: {
                        planId,
                        runId: input.runId,
                    },
                },
            });
            if (existing) {
                throw new errors_1.AppError(400, errors_1.ErrorCodes.VALIDATION_FAILED, 'Run is already linked to this plan');
            }
            // Create link
            await this.prisma.testPlanRun.create({
                data: {
                    planId,
                    runId: input.runId,
                },
            });
            // Create new version
            await this.createVersion(planId);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error adding run to plan: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to add run to plan');
        }
    }
    /**
     * Remove run from plan
     */
    async removeRunFromPlan(planId, runId) {
        try {
            const plan = await this.prisma.testPlan.findUnique({
                where: { id: planId },
            });
            if (!plan) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Test plan not found');
            }
            await this.prisma.testPlanRun.delete({
                where: {
                    planId_runId: {
                        planId,
                        runId,
                    },
                },
            });
            // Create new version
            await this.createVersion(planId);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error removing run from plan: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to remove run from plan');
        }
    }
    /**
     * ========== APPROVAL ==========
     */
    /**
     * Approve plan
     */
    async approvePlan(planId, userId) {
        try {
            const plan = await this.prisma.testPlan.findUnique({
                where: { id: planId },
            });
            if (!plan) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Test plan not found');
            }
            const approved = await this.prisma.testPlan.update({
                where: { id: planId },
                data: {
                    isApproved: true,
                    approvedById: userId,
                    approvedAt: new Date(),
                    status: client_1.TestPlanStatus.ACTIVE,
                },
            });
            // Audit log
            await this.createAuditLog(plan.projectId, userId, 'TestPlan', planId, client_1.AuditAction.UPDATE, plan, approved);
            // Fire integration events (non-blocking)
            const approvedDto = this.mapToPlanDTO(approved);
            setImmediate(async () => {
                try {
                    await WebhookService_1.default.publishEvent(plan.projectId, 'PLAN_APPROVED', {
                        planId,
                        title: approved.title,
                        approvedById: userId,
                    });
                    await SlackService_1.default.notifyEvent(plan.projectId, 'PLAN_APPROVED', { id: planId, title: approved.title, environment: 'N/A' });
                }
                catch (e) {
                    logger_1.logger.warn(`Integration events failed for plan.approved ${planId}: ${e}`);
                }
            });
            return approvedDto;
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error approving plan: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to approve plan');
        }
    }
    /**
     * ========== METRICS & READINESS ==========
     */
    /**
     * Calculate aggregated metrics for plan
     */
    async calculatePlanMetrics(planId) {
        try {
            const plan = await this.prisma.testPlan.findUnique({
                where: { id: planId },
                include: {
                    planRuns: {
                        include: {
                            run: {
                                include: {
                                    runCases: {
                                        include: {
                                            defects: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
            if (!plan) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Test plan not found');
            }
            // Aggregate metrics from all linked runs
            let totalCases = 0;
            let passedCases = 0;
            let failedCases = 0;
            let blockedCases = 0;
            let skippedCases = 0;
            let notRunCases = 0;
            let inProgressCases = 0;
            let totalExecutionTime = 0;
            let totalDefects = 0;
            for (const planRun of plan.planRuns) {
                for (const runCase of planRun.run.runCases) {
                    totalCases++;
                    // Count by status
                    switch (runCase.status) {
                        case 'PASSED':
                            passedCases++;
                            break;
                        case 'FAILED':
                            failedCases++;
                            break;
                        case 'BLOCKED':
                            blockedCases++;
                            break;
                        case 'SKIPPED':
                            skippedCases++;
                            break;
                        case 'NOT_RUN':
                            notRunCases++;
                            break;
                        case 'IN_PROGRESS':
                            inProgressCases++;
                            break;
                    }
                    // Count defects
                    totalDefects += runCase.defects.filter((d) => d.status === 'OPEN').length;
                }
            }
            // Calculate percentages
            const passRate = totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 0;
            const completionRate = totalCases > 0 ? Math.round(((totalCases - notRunCases - inProgressCases) / totalCases) * 100) : 0;
            return {
                totalCases,
                passedCases,
                failedCases,
                blockedCases,
                skippedCases,
                notRunCases,
                inProgressCases,
                passRate,
                completionRate,
                openDefectCount: totalDefects,
                releaseReadinessScore: this.calculateReadinessScore({
                    passRate,
                    completionRate,
                    openDefectCount: totalDefects,
                    totalCases,
                }),
                linkedRunCount: plan.planRuns.length,
                averageCaseExecutionTime: totalCases > 0 ? Math.round(totalExecutionTime / totalCases) : 0,
            };
        }
        catch (error) {
            logger_1.logger.error(`Error calculating plan metrics: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to calculate plan metrics');
        }
    }
    /**
     * Get release readiness calculation
     */
    async getReleaseReadiness(planId) {
        try {
            const metrics = await this.calculatePlanMetrics(planId);
            // Component scores (0-100)
            const passRateScore = metrics.passRate;
            const completionScore = metrics.completionRate;
            const defectScore = Math.max(0, 100 - Math.min(metrics.openDefectCount * 6, 100));
            const coverageScore = metrics.linkedRunCount > 0 ? 100 : 50; // Full score if runs linked
            // Weights
            const weights = {
                passRate: 0.4,
                completion: 0.3,
                defects: 0.2,
                coverage: 0.1,
            };
            // Calculate weighted score
            const score = Math.round(passRateScore * weights.passRate +
                completionScore * weights.completion +
                defectScore * weights.defects +
                coverageScore * weights.coverage);
            // Generate recommendation and risks
            const risks = [];
            let recommendation = 'ready';
            if (score < 70) {
                recommendation = 'not-ready';
                if (metrics.passRate < 85)
                    risks.push('Pass rate below 85%');
                if (metrics.completionRate < 80)
                    risks.push('Completion rate below 80%');
                if (metrics.openDefectCount > 10)
                    risks.push('High number of open defects');
            }
            else if (score < 85) {
                recommendation = 'ready-with-risks';
                if (metrics.passRate < 90)
                    risks.push('Pass rate below 90%');
                if (metrics.openDefectCount > 5)
                    risks.push('Moderate number of open defects');
            }
            else if (metrics.openDefectCount > 0) {
                recommendation = 'ready-with-risks';
                risks.push('Open defect count requires review before release');
            }
            return {
                score,
                components: {
                    passRateScore,
                    completionScore,
                    defectScore,
                    coverageScore,
                },
                weights,
                recommendation,
                risks,
            };
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error calculating release readiness: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to calculate release readiness');
        }
    }
    /**
     * ========== VERSIONING ==========
     */
    /**
     * Create a version snapshot
     */
    async createVersion(planId) {
        try {
            // Get the plan detail
            const plan = await this.prisma.testPlan.findUnique({
                where: { id: planId },
                include: {
                    planRuns: true,
                },
            });
            if (!plan) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Test plan not found');
            }
            // Get next version number
            const latestVersion = await this.prisma.testPlanVersion.findFirst({
                where: { planId },
                orderBy: { versionNum: 'desc' },
            });
            const versionNum = (latestVersion?.versionNum ?? 0) + 1;
            // Calculate current metrics
            const metrics = await this.calculatePlanMetrics(planId);
            // Create snapshot
            const snapshot = {
                title: plan.title,
                description: plan.description,
                status: plan.status,
                linkedRunIds: plan.planRuns.map((pr) => pr.runId),
                metrics,
                timestamp: new Date().toISOString(),
            };
            // Save version
            const version = await this.prisma.testPlanVersion.create({
                data: {
                    planId,
                    versionNum,
                    snapshot: snapshot,
                },
            });
            return this.mapToVersionDTO(version);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error creating version: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create version');
        }
    }
    /**
     * List all versions of a plan
     */
    async listVersions(planId) {
        try {
            const versions = await this.prisma.testPlanVersion.findMany({
                where: { planId },
                orderBy: { versionNum: 'desc' },
            });
            return versions.map((v) => this.mapToVersionDTO(v));
        }
        catch (error) {
            logger_1.logger.error(`Error listing versions: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to list versions');
        }
    }
    /**
     * Get specific version
     */
    async getVersion(planId, versionId) {
        try {
            const version = await this.prisma.testPlanVersion.findUnique({
                where: { id: versionId },
            });
            if (!version || version.planId !== planId) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Version not found');
            }
            return this.mapToVersionDTO(version);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error getting version: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to get version');
        }
    }
    /**
     * ========== BASELINE ==========
     */
    /**
     * Set current state as baseline
     */
    async setBaseline(planId) {
        try {
            const plan = await this.prisma.testPlan.findUnique({
                where: { id: planId },
            });
            if (!plan) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Test plan not found');
            }
            // Get latest version
            const latestVersion = await this.prisma.testPlanVersion.findFirst({
                where: { planId },
                orderBy: { versionNum: 'desc' },
            });
            if (!latestVersion) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'No version found for plan');
            }
            // Delete existing baseline
            await this.prisma.testPlanBaseline.deleteMany({
                where: { planId },
            });
            // Create new baseline
            const baseline = await this.prisma.testPlanBaseline.create({
                data: {
                    planId,
                    versionId: latestVersion.id,
                    snapshot: latestVersion.snapshot,
                },
            });
            // Mark version as baseline
            await this.prisma.testPlanVersion.update({
                where: { id: latestVersion.id },
                data: { isBaseline: true },
            });
            return this.mapToBaselineDTO(baseline);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error setting baseline: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to set baseline');
        }
    }
    /**
     * Get baseline comparison
     */
    async getBaselineComparison(planId) {
        try {
            // Get baseline
            const baseline = await this.prisma.testPlanBaseline.findUnique({
                where: { planId },
            });
            if (!baseline) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'No baseline set for this plan');
            }
            // Get current metrics
            const metrics = await this.calculatePlanMetrics(planId);
            const plan = await this.prisma.testPlan.findUnique({
                where: { id: planId },
                include: {
                    planRuns: true,
                },
            });
            if (!plan) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Test plan not found');
            }
            // Create current snapshot
            const currentSnapshot = {
                title: plan.title,
                description: plan.description,
                status: plan.status,
                linkedRunIds: plan.planRuns.map((pr) => pr.runId),
                metrics,
                timestamp: new Date().toISOString(),
            };
            // Calculate deltas
            const baselineMetrics = baseline.snapshot.metrics;
            return {
                baseline: baseline.snapshot,
                current: currentSnapshot,
                deltas: {
                    passRateDelta: currentSnapshot.metrics.passRate - baselineMetrics.passRate,
                    completionDelta: currentSnapshot.metrics.completionRate - baselineMetrics.completionRate,
                    defectCountDelta: currentSnapshot.metrics.openDefectCount - baselineMetrics.openDefectCount,
                    caseCountDelta: currentSnapshot.metrics.totalCases - baselineMetrics.totalCases,
                    metricsChanged: currentSnapshot.metrics.passRate !== baselineMetrics.passRate ||
                        currentSnapshot.metrics.completionRate !== baselineMetrics.completionRate ||
                        currentSnapshot.metrics.openDefectCount !== baselineMetrics.openDefectCount,
                },
            };
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error getting baseline comparison: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to get baseline comparison');
        }
    }
    /**
     * ========== HELPER METHODS ==========
     */
    /**
     * Calculate metrics for a single run
     */
    async calculateRunMetrics(runId) {
        const runCases = await this.prisma.runCase.findMany({
            where: { runId },
        });
        let passed = 0;
        let failed = 0;
        let notRun = 0;
        let inProgress = 0;
        for (const rc of runCases) {
            if (rc.status === 'PASSED')
                passed++;
            else if (rc.status === 'FAILED')
                failed++;
            else if (rc.status === 'NOT_RUN')
                notRun++;
            else if (rc.status === 'IN_PROGRESS')
                inProgress++;
        }
        const totalCases = runCases.length;
        const completedCases = totalCases - notRun - inProgress;
        return {
            totalCases,
            passedCases: passed,
            failedCases: failed,
            passRate: totalCases > 0 ? Math.round((passed / totalCases) * 100) : 0,
            completionRate: totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 0,
        };
    }
    /**
     * Calculate readiness score based on weighted formula
     */
    calculateReadinessScore(params) {
        const { passRate, completionRate, openDefectCount, totalCases } = params;
        // Weight: 40% pass rate, 30% completion, 20% defects, 10% coverage
        const defectScore = Math.max(0, 100 - Math.min(openDefectCount * 6, 100));
        const coverageScore = totalCases > 0 ? 100 : 50;
        return Math.round(passRate * 0.4 + completionRate * 0.3 + defectScore * 0.2 + coverageScore * 0.1);
    }
    /**
     * Create audit log
     */
    async createAuditLog(projectId, userId, entityType, entityId, action, oldData, newData) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    projectId,
                    userId,
                    entityType,
                    entityId,
                    action,
                    diff: {
                        before: oldData,
                        after: newData,
                    },
                },
            });
        }
        catch (error) {
            logger_1.logger.warn(`Failed to create audit log: ${error}`);
        }
    }
    /**
     * Mapping helpers
     */
    mapToPlanDTO(plan) {
        return {
            id: plan.id,
            projectId: plan.projectId,
            title: plan.title,
            description: plan.description,
            status: plan.status,
            isApproved: plan.isApproved,
            approvedById: plan.approvedById,
            approvedAt: plan.approvedAt,
            milestoneId: plan.milestoneId,
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt,
        };
    }
    mapToVersionDTO(version) {
        return {
            id: version.id,
            planId: version.planId,
            versionNum: version.versionNum,
            snapshot: version.snapshot,
            isBaseline: version.isBaseline,
            createdAt: version.createdAt,
        };
    }
    mapToBaselineDTO(baseline) {
        return {
            id: baseline.id,
            planId: baseline.planId,
            versionId: baseline.versionId,
            snapshot: baseline.snapshot,
            createdAt: baseline.createdAt,
        };
    }
}
exports.TestPlanService = TestPlanService;
//# sourceMappingURL=TestPlanService.js.map