"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const AnalyticsController_1 = require("../controllers/AnalyticsController");
const router = express_1.default.Router();
const controller = new AnalyticsController_1.AnalyticsController();
/**
 * @openapi
 * tags:
 *   - name: Analytics
 *     description: Dashboards and trend analytics
 * /projects/{projectId}/analytics/trends:
 *   get:
 *     tags: [Analytics]
 *     summary: Get trend analytics
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/analytics/failure-distribution:
 *   get:
 *     tags: [Analytics]
 *     summary: Get failure distribution
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/analytics/suite-heatmap:
 *   get:
 *     tags: [Analytics]
 *     summary: Get suite heatmap
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/analytics/automation-coverage:
 *   get:
 *     tags: [Analytics]
 *     summary: Get automation coverage
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/analytics/defect-leakage:
 *   get:
 *     tags: [Analytics]
 *     summary: Get defect leakage
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/analytics/flaky-tests:
 *   get:
 *     tags: [Analytics]
 *     summary: Get flaky tests
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/analytics/workload-heatmap:
 *   get:
 *     tags: [Analytics]
 *     summary: Get workload heatmap
 *     security: [{ bearerAuth: [] }]
 */
router.get('/projects/:projectId/analytics/trends', auth_1.authenticate, (req, res) => controller.getTrends(req, res));
router.get('/projects/:projectId/analytics/failure-distribution', auth_1.authenticate, (req, res) => controller.getFailureDistribution(req, res));
router.get('/projects/:projectId/analytics/suite-heatmap', auth_1.authenticate, (req, res) => controller.getSuiteHeatmap(req, res));
router.get('/projects/:projectId/analytics/automation-coverage', auth_1.authenticate, (req, res) => controller.getAutomationCoverage(req, res));
router.get('/projects/:projectId/analytics/defect-leakage', auth_1.authenticate, (req, res) => controller.getDefectLeakage(req, res));
router.get('/projects/:projectId/analytics/flaky-tests', auth_1.authenticate, (req, res) => controller.getFlakyTests(req, res));
router.get('/projects/:projectId/analytics/workload-heatmap', auth_1.authenticate, (req, res) => controller.getWorkloadHeatmap(req, res));
exports.default = router;
//# sourceMappingURL=analytics.js.map