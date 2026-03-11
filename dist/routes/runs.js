"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const TestRunController_1 = require("../controllers/TestRunController");
const router = express_1.default.Router();
const controller = new TestRunController_1.TestRunController();
/**
 * @openapi
 * tags:
 *   - name: Test Runs
 *     description: Test run lifecycle and execution updates
 * /projects/{projectId}/runs/preview:
 *   post:
 *     tags: [Test Runs]
 *     summary: Preview selected cases for a run
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/runs:
 *   post:
 *     tags: [Test Runs]
 *     summary: Create run
 *     security: [{ bearerAuth: [] }]
 *   get:
 *     tags: [Test Runs]
 *     summary: List runs
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/runs/{id}:
 *   get:
 *     tags: [Test Runs]
 *     summary: Get run details
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     tags: [Test Runs]
 *     summary: Update run
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     tags: [Test Runs]
 *     summary: Delete run
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/runs/{id}/close:
 *   post:
 *     tags: [Test Runs]
 *     summary: Close run
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/runs/{id}/clone:
 *   post:
 *     tags: [Test Runs]
 *     summary: Clone run
 *     security: [{ bearerAuth: [] }]
 * /runs/{runId}/cases:
 *   get:
 *     tags: [Test Runs]
 *     summary: List run cases
 *     security: [{ bearerAuth: [] }]
 * /runs/{runId}/cases/{runCaseId}:
 *   put:
 *     tags: [Test Runs]
 *     summary: Update run case status
 *     security: [{ bearerAuth: [] }]
 * /runs/{runId}/cases/bulk-status:
 *   post:
 *     tags: [Test Runs]
 *     summary: Bulk update run case statuses
 *     security: [{ bearerAuth: [] }]
 * /runs/{runId}/metrics:
 *   get:
 *     tags: [Test Runs]
 *     summary: Get run metrics
 *     security: [{ bearerAuth: [] }]
 */
// Project-scoped run endpoints
router.post('/projects/:projectId/runs/preview', auth_1.authenticate, (req, res) => controller.previewCaseSelection(req, res));
router.post('/projects/:projectId/runs', auth_1.authenticate, (req, res) => controller.createRun(req, res));
router.get('/projects/:projectId/runs', auth_1.authenticate, (req, res) => controller.listRuns(req, res));
router.get('/projects/:projectId/runs/:id', auth_1.authenticate, (req, res) => controller.getRunDetail(req, res));
router.put('/projects/:projectId/runs/:id', auth_1.authenticate, (req, res) => controller.updateRun(req, res));
router.delete('/projects/:projectId/runs/:id', auth_1.authenticate, (req, res) => controller.deleteRun(req, res));
router.post('/projects/:projectId/runs/:id/close', auth_1.authenticate, (req, res) => controller.closeRun(req, res));
router.post('/projects/:projectId/runs/:id/clone', auth_1.authenticate, (req, res) => controller.cloneRun(req, res));
// Run-case endpoints
router.get('/runs/:runId/cases', auth_1.authenticate, (req, res) => controller.listRunCases(req, res));
router.put('/runs/:runId/cases/:runCaseId', auth_1.authenticate, (req, res) => controller.updateRunCaseStatus(req, res));
router.post('/runs/:runId/cases/bulk-status', auth_1.authenticate, (req, res) => controller.bulkUpdateCaseStatus(req, res));
router.get('/runs/:runId/metrics', auth_1.authenticate, (req, res) => controller.getRunMetrics(req, res));
exports.default = router;
//# sourceMappingURL=runs.js.map