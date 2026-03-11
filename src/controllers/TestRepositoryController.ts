import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { TestRepositoryService } from '../services/TestRepositoryService';
import { AppError, ErrorCodes } from '../types/errors';
import { logger } from '../config/logger';
import {
  createSuiteSchema,
  updateSuiteSchema,
  createTestCaseSchema,
  updateTestCaseSchema,
  testCaseFiltersSchema,
  bulkOperationSchema,
} from '../validators/testRepository.validator';

export class TestRepositoryController {
  private testRepoService: TestRepositoryService;

  constructor() {
    this.testRepoService = new TestRepositoryService();
  }

  /**
   * ========== SUITE ENDPOINTS ==========
   */

  /**
   * GET /api/v1/projects/:projectId/suites
   * Returns nested tree structure with case counts
   */
  async getSuiteTree(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Project ID is required',
        });
        return;
      }

      const tree = await this.testRepoService.getSuiteTree(projectId);

      res.status(200).json({
        status: 'success',
        code: 200,
        data: tree,
        message: 'Suite tree retrieved successfully',
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/v1/projects/:projectId/suites
   * Create a new suite
   */
  async createSuite(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user?.userId;

      if (!projectId || !userId) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Missing required parameters',
        });
        return;
      }

      const validation = createSuiteSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Validation failed',
          errors: validation.error.issues,
        });
        return;
      }

      const suite = await this.testRepoService.createSuite(
        projectId,
        userId,
        validation.data,
      );

      res.status(201).json({
        status: 'success',
        code: 201,
        data: suite,
        message: 'Suite created successfully',
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * PUT /api/v1/projects/:projectId/suites/:id
   * Update a suite
   */
  async updateSuite(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, id } = req.params;
      const userId = req.user?.userId;

      if (!projectId || !id || !userId) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Missing required parameters',
        });
        return;
      }

      const validation = updateSuiteSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Validation failed',
          errors: validation.error.issues,
        });
        return;
      }

      const suite = await this.testRepoService.updateSuite(
        projectId,
        id,
        userId,
        validation.data,
      );

      res.status(200).json({
        status: 'success',
        code: 200,
        data: suite,
        message: 'Suite updated successfully',
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * DELETE /api/v1/projects/:projectId/suites/:id
   * Soft delete a suite
   */
  async deleteSuite(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, id } = req.params;
      const userId = req.user?.userId;

      if (!projectId || !id || !userId) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Missing required parameters',
        });
        return;
      }

      await this.testRepoService.deleteSuite(projectId, id, userId);

      res.status(200).json({
        status: 'success',
        code: 200,
        message: 'Suite deleted successfully',
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/v1/projects/:projectId/suites/:id/clone
   * Clone suite with all cases
   */
  async cloneSuite(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, id } = req.params;
      const userId = req.user?.userId;

      if (!projectId || !id || !userId) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Missing required parameters',
        });
        return;
      }

      const result = await this.testRepoService.cloneSuite(
        projectId,
        id,
        userId,
      );

      res.status(201).json({
        status: 'success',
        code: 201,
        data: result,
        message: 'Suite cloned successfully',
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/v1/projects/:projectId/suites/:id/lock
   * Toggle suite lock
   */
  async toggleSuiteLock(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { projectId, id } = req.params;
      const userId = req.user?.userId;

      if (!projectId || !id || !userId) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Missing required parameters',
        });
        return;
      }

      const suite = await this.testRepoService.toggleSuiteLock(
        projectId,
        id,
        userId,
      );

      res.status(200).json({
        status: 'success',
        code: 200,
        data: suite,
        message: `Suite ${suite.isLocked ? 'locked' : 'unlocked'} successfully`,
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/v1/projects/:projectId/suites/:id/archive
   * Archive suite
   */
  async archiveSuite(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, id } = req.params;
      const userId = req.user?.userId;

      if (!projectId || !id || !userId) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Missing required parameters',
        });
        return;
      }

      const suite = await this.testRepoService.archiveSuite(
        projectId,
        id,
        userId,
      );

      res.status(200).json({
        status: 'success',
        code: 200,
        data: suite,
        message: 'Suite archived successfully',
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * ========== TEST CASE ENDPOINTS ==========
   */

  /**
   * GET /api/v1/projects/:projectId/cases
   * Get paginated test cases with filters
   */
  async getTestCases(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Project ID is required',
        });
        return;
      }

      // Parse and validate filters
      const filtersData = {
        ...req.query,
        cursor: req.query.cursor as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        // Parse arrays from query params
        priority: req.query.priority
          ? Array.isArray(req.query.priority)
            ? req.query.priority
            : [req.query.priority]
          : undefined,
        severity: req.query.severity
          ? Array.isArray(req.query.severity)
            ? req.query.severity
            : [req.query.severity]
          : undefined,
        type: req.query.type
          ? Array.isArray(req.query.type)
            ? req.query.type
            : [req.query.type]
          : undefined,
        automationStatus: req.query.automationStatus
          ? Array.isArray(req.query.automationStatus)
            ? req.query.automationStatus
            : [req.query.automationStatus]
          : undefined,
        status: req.query.status
          ? Array.isArray(req.query.status)
            ? req.query.status
            : [req.query.status]
          : undefined,
        tags: req.query.tags
          ? Array.isArray(req.query.tags)
            ? req.query.tags
            : [req.query.tags]
          : undefined,
      };

      const validation = testCaseFiltersSchema.safeParse(filtersData);

      if (!validation.success) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Invalid filter parameters',
          errors: validation.error.issues,
        });
        return;
      }

      const result = await this.testRepoService.getTestCases(
        projectId,
        validation.data,
      );

      res.status(200).json({
        status: 'success',
        code: 200,
        data: result.data,
        pagination: result.pagination,
        message: 'Test cases retrieved successfully',
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/v1/projects/:projectId/cases
   * Create test case
   */
  async createTestCase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const suiteId = req.body?.suiteId;
      const userId = req.user?.userId;

      if (!projectId || !suiteId || !userId) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Missing required parameters',
        });
        return;
      }

      const validation = createTestCaseSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Validation failed',
          errors: validation.error.issues,
        });
        return;
      }

      const testCase = await this.testRepoService.createTestCase(
        projectId,
        suiteId,
        userId,
        validation.data,
      );

      res.status(201).json({
        status: 'success',
        code: 201,
        data: testCase,
        message: 'Test case created successfully',
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/v1/projects/:projectId/cases/:id
   * Get single test case
   */
  async getTestCase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, id } = req.params;

      if (!projectId || !id) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Missing required parameters',
        });
        return;
      }

      const testCase = await this.testRepoService.getTestCase(projectId, id);

      res.status(200).json({
        status: 'success',
        code: 200,
        data: testCase,
        message: 'Test case retrieved successfully',
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * PUT /api/v1/projects/:projectId/cases/:id
   * Update test case (creates new version)
   */
  async updateTestCase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, id } = req.params;
      const userId = req.user?.userId;

      if (!projectId || !id || !userId) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Missing required parameters',
        });
        return;
      }

      const validation = updateTestCaseSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Validation failed',
          errors: validation.error.issues,
        });
        return;
      }

      const testCase = await this.testRepoService.updateTestCase(
        projectId,
        id,
        userId,
        validation.data,
      );

      res.status(200).json({
        status: 'success',
        code: 200,
        data: testCase,
        message: 'Test case updated successfully',
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * DELETE /api/v1/projects/:projectId/cases/:id
   * Soft delete test case
   */
  async deleteTestCase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, id } = req.params;
      const userId = req.user?.userId;

      if (!projectId || !id || !userId) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Missing required parameters',
        });
        return;
      }

      await this.testRepoService.deleteTestCase(projectId, id, userId);

      res.status(200).json({
        status: 'success',
        code: 200,
        message: 'Test case deleted successfully',
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/v1/projects/:projectId/cases/:id/history
   * Get test case version history
   */
  async getCaseHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, id } = req.params;

      if (!projectId || !id) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Missing required parameters',
        });
        return;
      }

      const history = await this.testRepoService.getCaseHistory(
        projectId,
        id,
      );

      res.status(200).json({
        status: 'success',
        code: 200,
        data: history,
        message: 'Case history retrieved successfully',
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * ========== BULK OPERATIONS ==========
   */

  /**
   * POST /api/v1/projects/:projectId/cases/bulk
   * Bulk create/edit/move/delete operations (max 500)
   */
  async bulkOperateTestCases(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user?.userId;

      if (!projectId || !userId) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Missing required parameters',
        });
        return;
      }

      const validation = bulkOperationSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          status: 'error',
          code: 400,
          error: ErrorCodes.VALIDATION_FAILED,
          message: 'Validation failed',
          errors: validation.error.issues,
        });
        return;
      }

      const result = await this.testRepoService.bulkOperateTestCases(
        projectId,
        userId,
        validation.data,
      );

      res.status(200).json({
        status: 'success',
        code: 200,
        data: result,
        message: `Bulk operations completed: ${result.successful} successful, ${result.failed} failed`,
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * ========== ERROR HANDLING ==========
   */

  private handleError(error: any, res: Response): void {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        status: 'error',
        code: error.statusCode,
        error: error.code,
        message: error.message,
        details: error.details,
      });
      return;
    }

    logger.error(`Unhandled error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      code: 500,
      error: ErrorCodes.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
    });
  }
}
