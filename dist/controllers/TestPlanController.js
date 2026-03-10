"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestPlanController = void 0;
const TestPlanService_1 = require("../services/TestPlanService");
const errors_1 = require("../types/errors");
const logger_1 = require("../config/logger");
const testPlan_validator_1 = require("../validators/testPlan.validator");
class TestPlanController {
    constructor() {
        this.testPlanService = new TestPlanService_1.TestPlanService();
    }
    /**
     * ========== PLAN ENDPOINTS ==========
     */
    /**
     * POST /api/v1/projects/:projectId/plans
     * Create a new test plan
     */
    async createPlan(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    status: 'error',
                    code: 401,
                    error: errors_1.ErrorCodes.UNAUTHORIZED,
                    message: 'User not authenticated',
                });
                return;
            }
            const { error, value } = testPlan_validator_1.createPlanSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: errors_1.ErrorCodes.VALIDATION_FAILED,
                    message: error.details[0].message,
                });
                return;
            }
            const plan = await this.testPlanService.createPlan(projectId, userId, value);
            res.status(201).json({
                status: 'success',
                code: 201,
                data: plan,
                message: 'Test plan created successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Error in createPlan: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to create test plan',
            });
        }
    }
    /**
     * GET /api/v1/projects/:projectId/plans
     * List plans (paginated, with aggregated metrics)
     */
    async listPlans(req, res) {
        try {
            const { projectId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            // Validate pagination
            if (page < 1 || limit < 1 || limit > 100) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: errors_1.ErrorCodes.VALIDATION_FAILED,
                    message: 'Invalid pagination parameters',
                });
                return;
            }
            // Build filters
            const filters = {};
            if (req.query.status)
                filters.status = req.query.status;
            if (req.query.milestoneId)
                filters.milestoneId = req.query.milestoneId;
            if (req.query.isApproved !== undefined)
                filters.isApproved = req.query.isApproved === 'true';
            if (req.query.search)
                filters.search = req.query.search;
            const result = await this.testPlanService.listPlans(projectId, page, limit, filters);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: result.data,
                pagination: result.pagination,
                message: 'Plans retrieved successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Error in listPlans: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to list plans',
            });
        }
    }
    /**
     * GET /api/v1/projects/:projectId/plans/:id
     * Get plan detail with all linked runs and metrics
     */
    async getPlanDetail(req, res) {
        try {
            const { id } = req.params;
            const plan = await this.testPlanService.getPlanDetail(id);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: plan,
                message: 'Plan detail retrieved successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Error in getPlanDetail: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to get plan detail',
            });
        }
    }
    /**
     * PUT /api/v1/projects/:projectId/plans/:id
     * Update plan
     */
    async updatePlan(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    status: 'error',
                    code: 401,
                    error: errors_1.ErrorCodes.UNAUTHORIZED,
                    message: 'User not authenticated',
                });
                return;
            }
            const { error, value } = testPlan_validator_1.updatePlanSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: errors_1.ErrorCodes.VALIDATION_FAILED,
                    message: error.details[0].message,
                });
                return;
            }
            const plan = await this.testPlanService.updatePlan(id, userId, value);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: plan,
                message: 'Plan updated successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Error in updatePlan: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to update plan',
            });
        }
    }
    /**
     * ========== RUN MANAGEMENT ENDPOINTS ==========
     */
    /**
     * POST /api/v1/projects/:projectId/plans/:id/runs
     * Add run to plan
     */
    async addRunToPlan(req, res) {
        try {
            const { id } = req.params;
            const { error, value } = testPlan_validator_1.addRunToPlanSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: errors_1.ErrorCodes.VALIDATION_FAILED,
                    message: error.details[0].message,
                });
                return;
            }
            await this.testPlanService.addRunToPlan(id, value);
            res.status(201).json({
                status: 'success',
                code: 201,
                message: 'Run added to plan successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Error in addRunToPlan: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to add run to plan',
            });
        }
    }
    /**
     * DELETE /api/v1/projects/:projectId/plans/:id/runs/:runId
     * Remove run from plan
     */
    async removeRunFromPlan(req, res) {
        try {
            const { id, runId } = req.params;
            await this.testPlanService.removeRunFromPlan(id, runId);
            res.status(200).json({
                status: 'success',
                code: 200,
                message: 'Run removed from plan successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Error in removeRunFromPlan: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to remove run from plan',
            });
        }
    }
    /**
     * ========== APPROVAL ENDPOINT ==========
     */
    /**
     * POST /api/v1/projects/:projectId/plans/:id/approve
     * Approve plan
     */
    async approvePlan(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    status: 'error',
                    code: 401,
                    error: errors_1.ErrorCodes.UNAUTHORIZED,
                    message: 'User not authenticated',
                });
                return;
            }
            const plan = await this.testPlanService.approvePlan(id, userId);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: plan,
                message: 'Plan approved successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Error in approvePlan: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to approve plan',
            });
        }
    }
    /**
     * ========== READINESS ENDPOINT ==========
     */
    /**
     * GET /api/v1/projects/:projectId/plans/:id/readiness
     * Get release readiness calculation
     */
    async getReleaseReadiness(req, res) {
        try {
            const { id } = req.params;
            const readiness = await this.testPlanService.getReleaseReadiness(id);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: readiness,
                message: 'Release readiness calculated successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Error in getReleaseReadiness: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to get release readiness',
            });
        }
    }
    /**
     * ========== VERSIONING ENDPOINTS ==========
     */
    /**
     * GET /api/v1/plans/:id/versions
     * List all versions of a plan
     */
    async listVersions(req, res) {
        try {
            const { id } = req.params;
            const versions = await this.testPlanService.listVersions(id);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: versions,
                message: 'Plan versions retrieved successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Error in listVersions: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to list versions',
            });
        }
    }
    /**
     * GET /api/v1/plans/:id/versions/:versionId
     * Get specific version snapshot
     */
    async getVersion(req, res) {
        try {
            const { id, versionId } = req.params;
            const version = await this.testPlanService.getVersion(id, versionId);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: version,
                message: 'Plan version retrieved successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Error in getVersion: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to get version',
            });
        }
    }
    /**
     * ========== BASELINE ENDPOINTS ==========
     */
    /**
     * POST /api/v1/plans/:id/baseline
     * Set current state as baseline
     */
    async setBaseline(req, res) {
        try {
            const { id } = req.params;
            const baseline = await this.testPlanService.setBaseline(id);
            res.status(201).json({
                status: 'success',
                code: 201,
                data: baseline,
                message: 'Baseline set successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Error in setBaseline: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to set baseline',
            });
        }
    }
    /**
     * GET /api/v1/plans/:id/baseline
     * Get baseline comparison
     */
    async getBaselineComparison(req, res) {
        try {
            const { id } = req.params;
            const comparison = await this.testPlanService.getBaselineComparison(id);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: comparison,
                message: 'Baseline comparison retrieved successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    code: error.statusCode,
                    error: error.code,
                    message: error.message,
                });
                return;
            }
            logger_1.logger.error(`Error in getBaselineComparison: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to get baseline comparison',
            });
        }
    }
}
exports.TestPlanController = TestPlanController;
//# sourceMappingURL=TestPlanController.js.map