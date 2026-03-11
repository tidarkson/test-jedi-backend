import express, { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { AnalyticsController } from '../controllers/AnalyticsController';

const router: Router = express.Router();
const controller = new AnalyticsController();

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

router.get(
  '/projects/:projectId/analytics/trends',
  authenticate,
  (req, res) => controller.getTrends(req, res),
);

router.get(
  '/projects/:projectId/analytics/failure-distribution',
  authenticate,
  (req, res) => controller.getFailureDistribution(req, res),
);

router.get(
  '/projects/:projectId/analytics/suite-heatmap',
  authenticate,
  (req, res) => controller.getSuiteHeatmap(req, res),
);

router.get(
  '/projects/:projectId/analytics/automation-coverage',
  authenticate,
  (req, res) => controller.getAutomationCoverage(req, res),
);

router.get(
  '/projects/:projectId/analytics/defect-leakage',
  authenticate,
  (req, res) => controller.getDefectLeakage(req, res),
);

router.get(
  '/projects/:projectId/analytics/flaky-tests',
  authenticate,
  (req, res) => controller.getFlakyTests(req, res),
);

router.get(
  '/projects/:projectId/analytics/workload-heatmap',
  authenticate,
  (req, res) => controller.getWorkloadHeatmap(req, res),
);

export default router;
