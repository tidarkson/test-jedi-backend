import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { AnalyticsService } from '../services/AnalyticsService';
import { analyticsQuerySchema } from '../validators/analytics.validator';
import { AppError, ErrorCodes } from '../types/errors';
import { logger } from '../config/logger';
import { AnalyticsFilters } from '../types/analytics';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  private parseFilters(req: AuthenticatedRequest): AnalyticsFilters {
    const { error, value } = analyticsQuerySchema.validate(req.query);

    if (error) {
      throw new AppError(
        400,
        ErrorCodes.VALIDATION_FAILED,
        error.details[0].message,
      );
    }

    return {
      dateFrom: value.dateFrom ? new Date(value.dateFrom) : undefined,
      dateTo: value.dateTo ? new Date(value.dateTo) : undefined,
      milestoneId: value.milestoneId,
    };
  }

  private async handleRequest(
    req: AuthenticatedRequest,
    res: Response,
    operation: (projectId: string, filters: AnalyticsFilters) => Promise<unknown>,
    successMessage: string,
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      const filters = this.parseFilters(req);
      const data = await operation(projectId, filters);

      res.status(200).json({
        status: 'success',
        code: 200,
        data,
        message: successMessage,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          code: error.statusCode,
          error: error.code,
          message: error.message,
        });
        return;
      }

      logger.error(`Analytics endpoint error: ${error}`);
      res.status(500).json({
        status: 'error',
        code: 500,
        error: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch analytics data',
      });
    }
  }

  async getTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    await this.handleRequest(
      req,
      res,
      (projectId, filters) => this.analyticsService.getTrends(projectId, filters),
      'Trend analytics retrieved successfully',
    );
  }

  async getFailureDistribution(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    await this.handleRequest(
      req,
      res,
      (projectId, filters) => this.analyticsService.getFailureDistribution(projectId, filters),
      'Failure distribution retrieved successfully',
    );
  }

  async getSuiteHeatmap(req: AuthenticatedRequest, res: Response): Promise<void> {
    await this.handleRequest(
      req,
      res,
      (projectId, filters) => this.analyticsService.getSuiteHeatmap(projectId, filters),
      'Suite heatmap retrieved successfully',
    );
  }

  async getAutomationCoverage(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    await this.handleRequest(
      req,
      res,
      (projectId, filters) => this.analyticsService.getAutomationCoverage(projectId, filters),
      'Automation coverage retrieved successfully',
    );
  }

  async getDefectLeakage(req: AuthenticatedRequest, res: Response): Promise<void> {
    await this.handleRequest(
      req,
      res,
      (projectId, filters) => this.analyticsService.getDefectLeakage(projectId, filters),
      'Defect leakage analytics retrieved successfully',
    );
  }

  async getFlakyTests(req: AuthenticatedRequest, res: Response): Promise<void> {
    await this.handleRequest(
      req,
      res,
      (projectId, filters) => this.analyticsService.getFlakyTests(projectId, filters),
      'Flaky tests retrieved successfully',
    );
  }

  async getWorkloadHeatmap(req: AuthenticatedRequest, res: Response): Promise<void> {
    await this.handleRequest(
      req,
      res,
      (projectId, filters) => this.analyticsService.getWorkloadHeatmap(projectId, filters),
      'Workload heatmap retrieved successfully',
    );
  }
}
