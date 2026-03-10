import express from 'express';
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { TestPlanController } from '../controllers/TestPlanController';

const router: Router = express.Router();
const controller = new TestPlanController();

/**
 * ========== PLAN ENDPOINTS ==========
 */

// POST /api/v1/projects/:projectId/plans
// Create a new test plan
router.post(
  '/projects/:projectId/plans',
  authenticate,
  (req, res) => controller.createPlan(req, res),
);

// GET /api/v1/projects/:projectId/plans
// List plans (paginated, with aggregated metrics)
router.get(
  '/projects/:projectId/plans',
  authenticate,
  (req, res) => controller.listPlans(req, res),
);

// GET /api/v1/projects/:projectId/plans/:id
// Get plan detail with all linked runs and metrics
router.get(
  '/projects/:projectId/plans/:id',
  authenticate,
  (req, res) => controller.getPlanDetail(req, res),
);

// PUT /api/v1/projects/:projectId/plans/:id
// Update plan
router.put(
  '/projects/:projectId/plans/:id',
  authenticate,
  (req, res) => controller.updatePlan(req, res),
);

/**
 * ========== RUN MANAGEMENT ENDPOINTS ==========
 */

// POST /api/v1/projects/:projectId/plans/:id/runs
// Add run to plan
router.post(
  '/projects/:projectId/plans/:id/runs',
  authenticate,
  (req, res) => controller.addRunToPlan(req, res),
);

// DELETE /api/v1/projects/:projectId/plans/:id/runs/:runId
// Remove run from plan
router.delete(
  '/projects/:projectId/plans/:id/runs/:runId',
  authenticate,
  (req, res) => controller.removeRunFromPlan(req, res),
);

/**
 * ========== APPROVAL ENDPOINT ==========
 */

// POST /api/v1/projects/:projectId/plans/:id/approve
// Approve plan (requires ADMIN, QA_LEAD, MANAGER roles)
router.post(
  '/projects/:projectId/plans/:id/approve',
  authenticate,
  requireRole('ADMIN', 'QA_LEAD', 'MANAGER'),
  (req, res) => controller.approvePlan(req, res),
);

/**
 * ========== READINESS ENDPOINT ==========
 */

// GET /api/v1/projects/:projectId/plans/:id/readiness
// Get release readiness calculation
router.get(
  '/projects/:projectId/plans/:id/readiness',
  authenticate,
  (req, res) => controller.getReleaseReadiness(req, res),
);

/**
 * ========== VERSIONING ENDPOINTS ==========
 */

// GET /api/v1/plans/:id/versions
// List all versions of a plan
router.get(
  '/plans/:id/versions',
  authenticate,
  (req, res) => controller.listVersions(req, res),
);

// GET /api/v1/plans/:id/versions/:versionId
// Get specific version snapshot
router.get(
  '/plans/:id/versions/:versionId',
  authenticate,
  (req, res) => controller.getVersion(req, res),
);

/**
 * ========== BASELINE ENDPOINTS ==========
 */

// POST /api/v1/plans/:id/baseline
// Set current state as baseline
router.post(
  '/plans/:id/baseline',
  authenticate,
  (req, res) => controller.setBaseline(req, res),
);

// GET /api/v1/plans/:id/baseline
// Get baseline comparison
router.get(
  '/plans/:id/baseline',
  authenticate,
  (req, res) => controller.getBaselineComparison(req, res),
);

export default router;
