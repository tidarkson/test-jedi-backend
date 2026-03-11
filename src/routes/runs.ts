import express from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { TestRunController } from '../controllers/TestRunController';

const router: Router = express.Router();
const controller = new TestRunController();

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
router.post(
  '/projects/:projectId/runs/preview',
  authenticate,
  (req, res) => controller.previewCaseSelection(req, res),
);

router.post(
  '/projects/:projectId/runs',
  authenticate,
  (req, res) => controller.createRun(req, res),
);

router.get(
  '/projects/:projectId/runs',
  authenticate,
  (req, res) => controller.listRuns(req, res),
);

router.get(
  '/projects/:projectId/runs/:id',
  authenticate,
  (req, res) => controller.getRunDetail(req, res),
);

router.put(
  '/projects/:projectId/runs/:id',
  authenticate,
  (req, res) => controller.updateRun(req, res),
);

router.delete(
  '/projects/:projectId/runs/:id',
  authenticate,
  (req, res) => controller.deleteRun(req, res),
);

router.post(
  '/projects/:projectId/runs/:id/close',
  authenticate,
  (req, res) => controller.closeRun(req, res),
);

router.post(
  '/projects/:projectId/runs/:id/clone',
  authenticate,
  (req, res) => controller.cloneRun(req, res),
);

// Run-case endpoints
router.get(
  '/runs/:runId/cases',
  authenticate,
  (req, res) => controller.listRunCases(req, res),
);

router.put(
  '/runs/:runId/cases/:runCaseId',
  authenticate,
  (req, res) => controller.updateRunCaseStatus(req, res),
);

router.post(
  '/runs/:runId/cases/bulk-status',
  authenticate,
  (req, res) => controller.bulkUpdateCaseStatus(req, res),
);

router.get(
  '/runs/:runId/metrics',
  authenticate,
  (req, res) => controller.getRunMetrics(req, res),
);

export default router;
