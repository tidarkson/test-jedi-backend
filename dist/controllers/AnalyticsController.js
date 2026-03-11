"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const AnalyticsService_1 = require("../services/AnalyticsService");
const analytics_validator_1 = require("../validators/analytics.validator");
const errors_1 = require("../types/errors");
const logger_1 = require("../config/logger");
class AnalyticsController {
    constructor() {
        this.analyticsService = new AnalyticsService_1.AnalyticsService();
    }
    parseFilters(req) {
        const { error, value } = analytics_validator_1.analyticsQuerySchema.validate(req.query);
        if (error) {
            throw new errors_1.AppError(400, errors_1.ErrorCodes.VALIDATION_FAILED, error.details[0].message);
        }
        return {
            dateFrom: value.dateFrom ? new Date(value.dateFrom) : undefined,
            dateTo: value.dateTo ? new Date(value.dateTo) : undefined,
            milestoneId: value.milestoneId,
        };
    }
    async handleRequest(req, res, operation, successMessage) {
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
            logger_1.logger.error(`Analytics endpoint error: ${error}`);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to fetch analytics data',
            });
        }
    }
    async getTrends(req, res) {
        await this.handleRequest(req, res, (projectId, filters) => this.analyticsService.getTrends(projectId, filters), 'Trend analytics retrieved successfully');
    }
    async getFailureDistribution(req, res) {
        await this.handleRequest(req, res, (projectId, filters) => this.analyticsService.getFailureDistribution(projectId, filters), 'Failure distribution retrieved successfully');
    }
    async getSuiteHeatmap(req, res) {
        await this.handleRequest(req, res, (projectId, filters) => this.analyticsService.getSuiteHeatmap(projectId, filters), 'Suite heatmap retrieved successfully');
    }
    async getAutomationCoverage(req, res) {
        await this.handleRequest(req, res, (projectId, filters) => this.analyticsService.getAutomationCoverage(projectId, filters), 'Automation coverage retrieved successfully');
    }
    async getDefectLeakage(req, res) {
        await this.handleRequest(req, res, (projectId, filters) => this.analyticsService.getDefectLeakage(projectId, filters), 'Defect leakage analytics retrieved successfully');
    }
    async getFlakyTests(req, res) {
        await this.handleRequest(req, res, (projectId, filters) => this.analyticsService.getFlakyTests(projectId, filters), 'Flaky tests retrieved successfully');
    }
    async getWorkloadHeatmap(req, res) {
        await this.handleRequest(req, res, (projectId, filters) => this.analyticsService.getWorkloadHeatmap(projectId, filters), 'Workload heatmap retrieved successfully');
    }
}
exports.AnalyticsController = AnalyticsController;
//# sourceMappingURL=AnalyticsController.js.map