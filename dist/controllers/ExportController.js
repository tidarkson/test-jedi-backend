"use strict";
/**
 * Export Controller
 * Handles export endpoint requests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportController = void 0;
const ExportService_1 = __importDefault(require("../services/ExportService"));
const logger_1 = require("../config/logger");
const errors_1 = require("../types/errors");
class ExportController {
    /**
     * Export test cases
     * POST /api/v1/projects/:projectId/cases/export
     */
    async exportTestCases(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    status: 'error',
                    code: 401,
                    error: 'UNAUTHORIZED',
                    message: 'User authentication required',
                });
                return;
            }
            const request = {
                format: req.body.format,
                sections: req.body.sections,
                filters: req.body.filters,
                branding: req.body.branding,
            };
            // Validate format
            const validFormats = ['pdf', 'xlsx', 'csv', 'json', 'xml'];
            if (!validFormats.includes(request.format)) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: 'INVALID_INPUT',
                    message: 'Invalid export format. Supported: pdf, xlsx, csv, json, xml',
                });
                return;
            }
            logger_1.logger.info(`Exporting test cases - Project: ${projectId}, Format: ${request.format}, User: ${userId}`);
            const response = await ExportService_1.default.exportTestCases(projectId, userId, request);
            res.status(200).json({
                status: 'success',
                data: response,
            });
        }
        catch (error) {
            this.handleError(error, res);
        }
    }
    /**
     * Export test run results
     * POST /api/v1/runs/:runId/export
     */
    async exportTestRunResults(req, res) {
        try {
            const { projectId, runId } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    status: 'error',
                    code: 401,
                    error: 'UNAUTHORIZED',
                    message: 'User authentication required',
                });
                return;
            }
            const request = {
                format: req.body.format,
                sections: req.body.sections,
                filters: req.body.filters,
                branding: req.body.branding,
            };
            // Validate format
            const validFormats = ['pdf', 'xlsx', 'csv', 'json', 'xml'];
            if (!validFormats.includes(request.format)) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: 'INVALID_INPUT',
                    message: 'Invalid export format. Supported: pdf, xlsx, csv, json, xml',
                });
                return;
            }
            logger_1.logger.info(`Exporting test run - Run: ${runId}, Format: ${request.format}, User: ${userId}`);
            const response = await ExportService_1.default.exportTestRunResults(projectId, runId, userId, request);
            res.status(200).json({
                status: 'success',
                data: response,
            });
        }
        catch (error) {
            this.handleError(error, res);
        }
    }
    /**
     * Export analytics
     * POST /api/v1/analytics/export
     */
    async exportAnalytics(req, res) {
        try {
            const projectId = req.query.projectId;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    status: 'error',
                    code: 401,
                    error: 'UNAUTHORIZED',
                    message: 'User authentication required',
                });
                return;
            }
            if (!projectId) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: 'INVALID_INPUT',
                    message: 'projectId query parameter is required',
                });
                return;
            }
            const request = {
                format: req.body.format,
                sections: req.body.sections,
                filters: req.body.filters,
                branding: req.body.branding,
            };
            // Analytics supports limited formats
            const validFormats = ['csv', 'json'];
            if (!validFormats.includes(request.format)) {
                res.status(400).json({
                    status: 'error',
                    code: 400,
                    error: 'INVALID_INPUT',
                    message: 'Analytics export supports: csv, json',
                });
                return;
            }
            logger_1.logger.info(`Exporting analytics - Project: ${projectId}, Format: ${request.format}, User: ${userId}`);
            const response = await ExportService_1.default.exportAnalytics(projectId, userId, request);
            res.status(200).json({
                status: 'success',
                data: response,
            });
        }
        catch (error) {
            this.handleError(error, res);
        }
    }
    /**
     * Get export job status
     * GET /api/v1/exports/:jobId
     */
    async getExportStatus(req, res) {
        try {
            const { jobId } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    status: 'error',
                    code: 401,
                    error: 'UNAUTHORIZED',
                    message: 'User authentication required',
                });
                return;
            }
            logger_1.logger.info(`Getting export status - Job: ${jobId}, User: ${userId}`);
            const response = await ExportService_1.default.getExportStatus(jobId);
            res.status(200).json({
                status: 'success',
                data: response,
            });
        }
        catch (error) {
            this.handleError(error, res);
        }
    }
    /**
     * Get available export formats
     * GET /api/v1/exports/formats/available
     */
    async getAvailableFormats(req, res) {
        try {
            const entityType = req.query.entityType;
            const allFormats = {
                cases: ['pdf', 'xlsx', 'csv', 'json', 'xml'],
                runs: ['pdf', 'xlsx', 'csv', 'json', 'xml'],
                analytics: ['csv', 'json'],
            };
            const formats = allFormats[entityType] || allFormats.cases;
            res.status(200).json({
                status: 'success',
                data: {
                    entityType,
                    formats,
                    descriptions: {
                        pdf: 'PDF with executive summary, charts, and detailed steps',
                        xlsx: 'Excel with multiple worksheets and conditional formatting',
                        csv: 'CSV format with UTF-8 BOM for Excel compatibility',
                        json: 'JSON format with full nested structure',
                        xml: 'XML format with structured hierarchy',
                    },
                },
            });
        }
        catch (error) {
            this.handleError(error, res);
        }
    }
    /**
     * Get export options/configuration schema
     * GET /api/v1/exports/schema
     */
    async getExportSchema(_req, res) {
        try {
            const schema = {
                format: {
                    type: 'string',
                    enum: ['pdf', 'xlsx', 'csv', 'json', 'xml'],
                    required: true,
                    description: 'Export file format',
                },
                sections: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Sections to include (e.g., ["summary", "charts", "cases", "results"])',
                    example: ['summary', 'charts', 'detailed'],
                },
                filters: {
                    type: 'object',
                    description: 'Filter criteria for export',
                    properties: {
                        status: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Filter by status (ACTIVE, DRAFT, ARCHIVED)',
                        },
                        priority: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Filter by priority (CRITICAL, HIGH, MEDIUM, LOW)',
                        },
                        type: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Filter by type (FUNCTIONAL, REGRESSION, SMOKE, etc)',
                        },
                        startDate: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Filter start date',
                        },
                        endDate: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Filter end date',
                        },
                        tags: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Filter by tags',
                        },
                        assignee: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Filter by assignee',
                        },
                    },
                },
                branding: {
                    type: 'object',
                    description: 'Branding configuration (PDF only)',
                    properties: {
                        companyName: { type: 'string' },
                        companyLogo: { type: 'string', description: 'Base64 or URL' },
                        includeWatermark: { type: 'boolean' },
                        watermarkText: { type: 'string' },
                        themeColor: { type: 'string', description: 'HEX color' },
                        footerText: { type: 'string' },
                        showPageNumbers: { type: 'boolean' },
                    },
                },
            };
            res.status(200).json({
                status: 'success',
                data: schema,
            });
        }
        catch (error) {
            this.handleError(error, res);
        }
    }
    /**
     * Error handler
     */
    handleError(error, res) {
        if (error instanceof errors_1.AppError) {
            logger_1.logger.warn(`Export error: ${error.message}`);
            res.status(error.statusCode).json({
                status: 'error',
                code: error.statusCode,
                error: error.code,
                message: error.message,
            });
        }
        else {
            logger_1.logger.error('Unexpected error in export endpoint:', error);
            res.status(500).json({
                status: 'error',
                code: 500,
                error: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred',
            });
        }
    }
}
exports.ExportController = ExportController;
exports.default = new ExportController();
//# sourceMappingURL=ExportController.js.map