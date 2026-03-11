"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRunController = void 0;
const TestRunService_1 = require("../services/TestRunService");
const errors_1 = require("../types/errors");
const logger_1 = require("../config/logger");
const testRun_validator_1 = require("../validators/testRun.validator");
class TestRunController {
    constructor() {
        this.testRunService = new TestRunService_1.TestRunService();
    }
    /**
     * ========== RUN ENDPOINTS ==========
     */
    /**
     * POST /api/v1/projects/:projectId/runs/preview
     * Preview case selection before creation
     */
    async previewCaseSelection(req, res) {
        try {
            const { projectId } = req.params;
            const { error, value } = testRun_validator_1.caseSelectionSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: errors_1.ErrorCodes.VALIDATION_FAILED,
                    message: error.details[0].message,
                });
                return;
            }
            const preview = await this.testRunService.previewCaseSelection(projectId, value);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: preview,
                message: 'Case selection preview generated successfully',
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
            logger_1.logger.error(`Error in previewCaseSelection: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to preview case selection',
            });
        }
    }
    /**
     * POST /api/v1/projects/:projectId/runs
     * Create run with case selection
     */
    async createRun(req, res) {
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
            const { error, value } = testRun_validator_1.createRunSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: errors_1.ErrorCodes.VALIDATION_FAILED,
                    message: error.details[0].message,
                });
                return;
            }
            const run = await this.testRunService.createRun(projectId, userId, value);
            res.status(201).json({
                status: 'success',
                code: 201,
                data: run,
                message: 'Run created successfully',
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
            logger_1.logger.error(`Error in createRun: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to create run',
            });
        }
    }
    /**
     * GET /api/v1/projects/:projectId/runs
     * List runs (paginated, filtered)
     */
    async listRuns(req, res) {
        try {
            const { projectId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            // Build filters from query params
            const filters = {};
            if (req.query.status)
                filters.status = req.query.status;
            if (req.query.type)
                filters.type = req.query.type;
            if (req.query.environment)
                filters.environment = req.query.environment;
            if (req.query.milestoneId)
                filters.milestoneId = req.query.milestoneId;
            if (req.query.buildNumber)
                filters.buildNumber = req.query.buildNumber;
            if (req.query.cursor)
                filters.cursor = req.query.cursor;
            const result = await this.testRunService.listRuns(projectId, page, limit, filters);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: result.data,
                pagination: result.pagination,
                message: 'Runs retrieved successfully',
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
            logger_1.logger.error(`Error in listRuns: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to list runs',
            });
        }
    }
    /**
     * GET /api/v1/projects/:projectId/runs/:id
     * Run detail with metrics
     */
    async getRunDetail(req, res) {
        try {
            const { projectId, id } = req.params;
            const result = await this.testRunService.getRunDetail(projectId, id);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: result,
                message: 'Run detail retrieved successfully',
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
            logger_1.logger.error(`Error in getRunDetail: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to get run detail',
            });
        }
    }
    /**
     * GET /api/v1/runs/:runId/cases
     * List cases in run with current status
     */
    async listRunCases(req, res) {
        try {
            const { runId } = req.params;
            const cases = await this.testRunService.listRunCases(runId);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: cases,
                message: 'Run cases retrieved successfully',
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
            logger_1.logger.error(`Error in listRunCases: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to list run cases',
            });
        }
    }
    /**
     * PUT /api/v1/projects/:projectId/runs/:id
     * Update run metadata
     */
    async updateRun(req, res) {
        try {
            const { projectId, id } = req.params;
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
            const { error, value } = testRun_validator_1.updateRunSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: errors_1.ErrorCodes.VALIDATION_FAILED,
                    message: error.details[0].message,
                });
                return;
            }
            const run = await this.testRunService.updateRun(projectId, id, userId, value);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: run,
                message: 'Run updated successfully',
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
            logger_1.logger.error(`Error in updateRun: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to update run',
            });
        }
    }
    /**
     * DELETE /api/v1/projects/:projectId/runs/:id
     * Soft delete run
     */
    async deleteRun(req, res) {
        try {
            const { projectId, id } = req.params;
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
            await this.testRunService.deleteRun(projectId, id, userId);
            res.status(200).json({
                status: 'success',
                code: 200,
                message: 'Run deleted successfully',
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
            logger_1.logger.error(`Error in deleteRun: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to delete run',
            });
        }
    }
    /**
     * POST /api/v1/projects/:projectId/runs/:id/close
     * Close run (requires approval role)
     */
    async closeRun(req, res) {
        try {
            const { projectId, id } = req.params;
            const userId = req.user?.userId;
            const userRole = req.user?.roles[0];
            if (!userId) {
                res.status(401).json({
                    status: 'error',
                    code: 401,
                    error: errors_1.ErrorCodes.UNAUTHORIZED,
                    message: 'User not authenticated',
                });
                return;
            }
            const run = await this.testRunService.closeRun(projectId, id, userId, userRole || 'VIEWER');
            res.status(200).json({
                status: 'success',
                code: 200,
                data: run,
                message: 'Run closed successfully',
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
            logger_1.logger.error(`Error in closeRun: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to close run',
            });
        }
    }
    /**
     * POST /api/v1/projects/:projectId/runs/:id/clone
     * Clone run
     */
    async cloneRun(req, res) {
        try {
            const { projectId, id } = req.params;
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
            const { error, value } = testRun_validator_1.cloneRunSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: errors_1.ErrorCodes.VALIDATION_FAILED,
                    message: error.details[0].message,
                });
                return;
            }
            const result = await this.testRunService.cloneRun(projectId, id, userId, value);
            res.status(201).json({
                status: 'success',
                code: 201,
                data: result,
                message: 'Run cloned successfully',
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
            logger_1.logger.error(`Error in cloneRun: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to clone run',
            });
        }
    }
    /**
     * ========== RUN CASE ENDPOINTS ==========
     */
    /**
     * PUT /api/v1/runs/:runId/cases/:runCaseId
     * Update run case status + step results
     */
    async updateRunCaseStatus(req, res) {
        try {
            const { runId, runCaseId } = req.params;
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
            const { error, value } = testRun_validator_1.updateRunCaseSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: errors_1.ErrorCodes.VALIDATION_FAILED,
                    message: error.details[0].message,
                });
                return;
            }
            const runCase = await this.testRunService.updateRunCaseStatus(runId, runCaseId, userId, value);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: runCase,
                message: 'Run case status updated successfully',
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
            logger_1.logger.error(`Error in updateRunCaseStatus: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to update run case status',
            });
        }
    }
    /**
     * POST /api/v1/runs/:runId/cases/bulk-status
     * Bulk status update
     */
    async bulkUpdateCaseStatus(req, res) {
        try {
            const { runId } = req.params;
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
            const { error, value } = testRun_validator_1.bulkUpdateRunCasesSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: errors_1.ErrorCodes.VALIDATION_FAILED,
                    message: error.details[0].message,
                });
                return;
            }
            const result = await this.testRunService.bulkUpdateCaseStatus(runId, userId, value);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: result,
                message: 'Bulk case status update completed',
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
            logger_1.logger.error(`Error in bulkUpdateCaseStatus: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to bulk update case statuses',
            });
        }
    }
    /**
     * ========== METRICS ENDPOINTS ==========
     */
    /**
     * GET /api/v1/runs/:runId/metrics
     * Live metrics aggregation
     */
    async getRunMetrics(req, res) {
        try {
            const { runId } = req.params;
            const metrics = await this.testRunService.calculateRunMetrics(runId);
            res.status(200).json({
                status: 'success',
                code: 200,
                data: metrics,
                message: 'Run metrics calculated successfully',
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
            logger_1.logger.error(`Error in getRunMetrics: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to calculate run metrics',
            });
        }
    }
}
exports.TestRunController = TestRunController;
//# sourceMappingURL=TestRunController.js.map