"use strict";
/**
 * Export Routes
 * Defines all export-related endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const ExportController_1 = __importDefault(require("../controllers/ExportController"));
const router = express_1.default.Router();
/**
 * @openapi
 * tags:
 *   - name: Exports
 *     description: Case, run, and analytics export operations
 * /projects/{projectId}/cases/export:
 *   post:
 *     tags: [Exports]
 *     summary: Export test cases
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/runs/{runId}/export:
 *   post:
 *     tags: [Exports]
 *     summary: Export test run results
 *     security: [{ bearerAuth: [] }]
 * /analytics/export:
 *   post:
 *     tags: [Exports]
 *     summary: Export analytics
 *     security: [{ bearerAuth: [] }]
 * /exports/formats/available:
 *   get:
 *     tags: [Exports]
 *     summary: List available export formats
 *     security: [{ bearerAuth: [] }]
 * /exports/schema:
 *   get:
 *     tags: [Exports]
 *     summary: Get export schema options
 *     security: [{ bearerAuth: [] }]
 * /exports/{jobId}:
 *   get:
 *     tags: [Exports]
 *     summary: Get export job status
 *     security: [{ bearerAuth: [] }]
 */
/**
 * Export Test Cases
 * POST /api/v1/projects/:projectId/cases/export
 *
 * Request body:
 * {
 *   "format": "pdf|xlsx|csv|json|xml",
 *   "sections": ["summary", "cases", "steps"],
 *   "filters": {
 *     "status": ["ACTIVE"],
 *     "priority": ["CRITICAL", "HIGH"],
 *     "type": ["FUNCTIONAL"],
 *     "startDate": "2026-01-01T00:00:00Z",
 *     "endDate": "2026-03-10T00:00:00Z"
 *   },
 *   "branding": {
 *     "companyName": "Acme Corp",
 *     "companyLogo": "base64_or_url",
 *     "includeWatermark": true,
 *     "watermarkText": "CONFIDENTIAL",
 *     "themeColor": "#007bff",
 *     "footerText": "© 2026 Acme Corp",
 *     "showPageNumbers": true
 *   }
 * }
 */
router.post('/projects/:projectId/cases/export', auth_1.authenticate, (req, res) => ExportController_1.default.exportTestCases(req, res));
/**
 * Export Test Run Results
 * POST /api/v1/projects/:projectId/runs/:runId/export
 *
 * Request body: Same as exportTestCases
 */
router.post('/projects/:projectId/runs/:runId/export', auth_1.authenticate, (req, res) => ExportController_1.default.exportTestRunResults(req, res));
/**
 * Export Analytics Report
 * POST /api/v1/analytics/export?projectId=:projectId
 *
 * Supports: csv, json
 * Request body:
 * {
 *   "format": "csv|json",
 *   "filters": {
 *     "startDate": "2026-01-01T00:00:00Z",
 *     "endDate": "2026-03-10T00:00:00Z"
 *   }
 * }
 */
router.post('/analytics/export', auth_1.authenticate, (req, res) => ExportController_1.default.exportAnalytics(req, res));
/**
 * Get Available Export Formats
 * GET /api/v1/exports/formats/available?entityType=cases|runs|analytics
 *
 * Response:
 * {
 *   "entityType": "cases",
 *   "formats": ["pdf", "xlsx", "csv", "json", "xml"],
 *   "descriptions": { ... }
 * }
 */
router.get('/exports/formats/available', auth_1.authenticate, (req, res) => ExportController_1.default.getAvailableFormats(req, res));
/**
 * Get Export Schema/Options
 * GET /api/v1/exports/schema
 *
 * Returns JSON schema for export request configuration
 */
router.get('/exports/schema', auth_1.authenticate, (req, res) => ExportController_1.default.getExportSchema(req, res));
/**
 * Get Export Job Status
 * GET /api/v1/exports/:jobId
 *
 * Response:
 * {
 *   "jobId": "uuid",
 *   "status": "pending|processing|completed|failed",
 *   "format": "pdf",
 *   "downloadUrl": "signed_s3_url",
 *   "fileSize": 1024000,
 *   "createdAt": "2026-03-10T12:00:00Z",
 *   "completedAt": "2026-03-10T12:05:00Z",
 *   "error": null
 * }
 */
router.get('/exports/:jobId', auth_1.authenticate, (req, res) => ExportController_1.default.getExportStatus(req, res));
exports.default = router;
//# sourceMappingURL=exports.js.map