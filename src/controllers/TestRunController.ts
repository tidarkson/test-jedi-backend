import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { TestRunService } from '../services/TestRunService';
import { AppError, ErrorCodes } from '../types/errors';
import { logger } from '../config/logger';
import {
  createRunSchema,
  updateRunSchema,
  updateRunCaseSchema,
  bulkUpdateRunCasesSchema,
  cloneRunSchema,
  caseSelectionSchema,
} from '../validators/testRun.validator';

export class TestRunController {
  private testRunService: TestRunService;

  constructor() {
    this.testRunService = new TestRunService();
  }

  /**
   * ========== RUN ENDPOINTS ==========
   */

  /**
   * POST /api/v1/projects/:projectId/runs/preview
   * Preview case selection before creation
   */
  async previewCaseSelection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { error, value } = caseSelectionSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: error.details[0].message,
        });
        return;
      }

      const preview = await this.testRunService.previewCaseSelection(
        projectId,
        value,
      );

      res.status(200).json({
        status: 'success',
        code: 200,
        data: preview,
        message: 'Case selection preview generated successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          code: error.statusCode,
          error: error.errorCode,
          message: error.message,
        });
        return;
      }

      logger.error(`Error in previewCaseSelection: ${error}`);
      res.status(500).json({
        status: 'error',
        code: 500,
        error: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to preview case selection',
      });
    }
  }

  /**
   * POST /api/v1/projects/:projectId/runs
   * Create run with case selection
   */
  async createRun(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          code: 401,
          error: ErrorCodes.UNAUTHORIZED,
          message: 'User not authenticated',
        });
        return;
      }

      const { error, value } = createRunSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: error.details[0].message,
        });
        return;
      }

      const run = await this.testRunService.createRun(
        projectId,
        userId,
        value,
      );

      res.status(201).json({
        status: 'success',
        code: 201,
        data: run,
        message: 'Run created successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          code: error.statusCode,
          error: error.errorCode,
          message: error.message,
        });
        return;
      }

      logger.error(`Error in createRun: ${error}`);
      res.status(500).json({
        status: 'error',
        code: 500,
        error: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to create run',
      });
    }
  }

  /**
   * GET /api/v1/projects/:projectId/runs
   * List runs (paginated, filtered)
   */
  async listRuns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // Build filters from query params
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.type) filters.type = req.query.type;
      if (req.query.environment) filters.environment = req.query.environment;
      if (req.query.milestoneId) filters.milestoneId = req.query.milestoneId;
      if (req.query.buildNumber) filters.buildNumber = req.query.buildNumber;

      const result = await this.testRunService.listRuns(
        projectId,
        page,
        limit,
        filters,
      );

      res.status(200).json({
        status: 'success',
        code: 200,
        data: result.data,
        pagination: result.pagination,
        message: 'Runs retrieved successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          code: error.statusCode,
          error: error.errorCode,
          message: error.message,
        });
        return;
      }

      logger.error(`Error in listRuns: ${error}`);
      res.status(500).json({
        status: 'error',
        code: 500,
        error: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to list runs',
      });
    }
  }

  /**
   * GET /api/v1/projects/:projectId/runs/:id
   * Run detail with metrics
   */
  async getRunDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, id } = req.params;

      const result = await this.testRunService.getRunDetail(projectId, id);

      res.status(200).json({
        status: 'success',
        code: 200,
        data: result,
        message: 'Run detail retrieved successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          code: error.statusCode,
          error: error.errorCode,
          message: error.message,
        });
        return;
      }

      logger.error(`Error in getRunDetail: ${error}`);
      res.status(500).json({
        status: 'error',
        code: 500,
        error: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to get run detail',
      });
    }
  }

  /**
   * PUT /api/v1/projects/:projectId/runs/:id
   * Update run metadata
   */
  async updateRun(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          code: 401,
          error: ErrorCodes.UNAUTHORIZED,
          message: 'User not authenticated',
        });
        return;
      }

      const { error, value } = updateRunSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: error.details[0].message,
        });
        return;
      }

      const run = await this.testRunService.updateRun(
        projectId,
        id,
        userId,
        value,
      );

      res.status(200).json({
        status: 'success',
        code: 200,
        data: run,
        message: 'Run updated successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          code: error.statusCode,
          error: error.errorCode,
          message: error.message,
        });
        return;
      }

      logger.error(`Error in updateRun: ${error}`);
      res.status(500).json({
        status: 'error',
        code: 500,
        error: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to update run',
      });
    }
  }

  /**
   * DELETE /api/v1/projects/:projectId/runs/:id
   * Soft delete run
   */
  async deleteRun(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          code: 401,
          error: ErrorCodes.UNAUTHORIZED,
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
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          code: error.statusCode,
          error: error.errorCode,
          message: error.message,
        });
        return;
      }

      logger.error(`Error in deleteRun: ${error}`);
      res.status(500).json({
        status: 'error',
        code: 500,
        error: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to delete run',
      });
    }
  }

  /**
   * POST /api/v1/projects/:projectId/runs/:id/close
   * Close run (requires approval role)
   */
  async closeRun(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          code: 401,
          error: ErrorCodes.UNAUTHORIZED,
          message: 'User not authenticated',
        });
        return;
      }

      const run = await this.testRunService.closeRun(
        projectId,
        id,
        userId,
        userRole || 'VIEWER',
      );

      res.status(200).json({
        status: 'success',
        code: 200,
        data: run,
        message: 'Run closed successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          code: error.statusCode,
          error: error.errorCode,
          message: error.message,
        });
        return;
      }

      logger.error(`Error in closeRun: ${error}`);
      res.status(500).json({
        status: 'error',
        code: 500,
        error: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to close run',
      });
    }
  }

  /**
   * POST /api/v1/projects/:projectId/runs/:id/clone
   * Clone run
   */
  async cloneRun(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          code: 401,
          error: ErrorCodes.UNAUTHORIZED,
          message: 'User not authenticated',
        });
        return;
      }

      const { error, value } = cloneRunSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: error.details[0].message,
        });
        return;
      }

      const result = await this.testRunService.cloneRun(
        projectId,
        id,
        userId,
        value,
      );

      res.status(201).json({
        status: 'success',
        code: 201,
        data: result,
        message: 'Run cloned successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          code: error.statusCode,
          error: error.errorCode,
          message: error.message,
        });
        return;
      }

      logger.error(`Error in cloneRun: ${error}`);
      res.status(500).json({
        status: 'error',
        code: 500,
        error: ErrorCodes.INTERNAL_SERVER_ERROR,
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
  async updateRunCaseStatus(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { runId, runCaseId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          code: 401,
          error: ErrorCodes.UNAUTHORIZED,
          message: 'User not authenticated',
        });
        return;
      }

      const { error, value } = updateRunCaseSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: error.details[0].message,
        });
        return;
      }

      const runCase = await this.testRunService.updateRunCaseStatus(
        runId,
        runCaseId,
        userId,
        value,
      );

      res.status(200).json({
        status: 'success',
        code: 200,
        data: runCase,
        message: 'Run case status updated successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          code: error.statusCode,
          error: error.errorCode,
          message: error.message,
        });
        return;
      }

      logger.error(`Error in updateRunCaseStatus: ${error}`);
      res.status(500).json({
        status: 'error',
        code: 500,
        error: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to update run case status',
      });
    }
  }

  /**
   * POST /api/v1/runs/:runId/cases/bulk-status
   * Bulk status update
   */
  async bulkUpdateCaseStatus(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { runId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          code: 401,
          error: ErrorCodes.UNAUTHORIZED,
          message: 'User not authenticated',
        });
        return;
      }

      const { error, value } = bulkUpdateRunCasesSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: error.details[0].message,
        });
        return;
      }

      const result = await this.testRunService.bulkUpdateCaseStatus(
        runId,
        userId,
        value,
      );

      res.status(200).json({
        status: 'success',
        code: 200,
        data: result,
        message: 'Bulk case status update completed',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          code: error.statusCode,
          error: error.errorCode,
          message: error.message,
        });
        return;
      }

      logger.error(`Error in bulkUpdateCaseStatus: ${error}`);
      res.status(500).json({
        status: 'error',
        code: 500,
        error: ErrorCodes.INTERNAL_SERVER_ERROR,
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
  async getRunMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { runId } = req.params;

      const metrics = await this.testRunService.calculateRunMetrics(runId);

      res.status(200).json({
        status: 'success',
        code: 200,
        data: metrics,
        message: 'Run metrics calculated successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          code: error.statusCode,
          error: error.errorCode,
          message: error.message,
        });
        return;
      }

      logger.error(`Error in getRunMetrics: ${error}`);
      res.status(500).json({
        status: 'error',
        code: 500,
        error: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to calculate run metrics',
      });
    }
  }
}
