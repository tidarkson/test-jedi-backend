"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const TestPlanController_1 = require("../controllers/TestPlanController");
const router = express_1.default.Router();
const controller = new TestPlanController_1.TestPlanController();
/**
 * ========== PLAN ENDPOINTS ==========
 */
// POST /api/v1/projects/:projectId/plans
// Create a new test plan
router.post('/projects/:projectId/plans', auth_1.authenticate, (req, res) => controller.createPlan(req, res));
// GET /api/v1/projects/:projectId/plans
// List plans (paginated, with aggregated metrics)
router.get('/projects/:projectId/plans', auth_1.authenticate, (req, res) => controller.listPlans(req, res));
// GET /api/v1/projects/:projectId/plans/:id
// Get plan detail with all linked runs and metrics
router.get('/projects/:projectId/plans/:id', auth_1.authenticate, (req, res) => controller.getPlanDetail(req, res));
// PUT /api/v1/projects/:projectId/plans/:id
// Update plan
router.put('/projects/:projectId/plans/:id', auth_1.authenticate, (req, res) => controller.updatePlan(req, res));
/**
 * ========== RUN MANAGEMENT ENDPOINTS ==========
 */
// POST /api/v1/projects/:projectId/plans/:id/runs
// Add run to plan
router.post('/projects/:projectId/plans/:id/runs', auth_1.authenticate, (req, res) => controller.addRunToPlan(req, res));
// DELETE /api/v1/projects/:projectId/plans/:id/runs/:runId
// Remove run from plan
router.delete('/projects/:projectId/plans/:id/runs/:runId', auth_1.authenticate, (req, res) => controller.removeRunFromPlan(req, res));
/**
 * ========== APPROVAL ENDPOINT ==========
 */
// POST /api/v1/projects/:projectId/plans/:id/approve
// Approve plan (requires ADMIN, QA_LEAD, MANAGER roles)
router.post('/projects/:projectId/plans/:id/approve', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'QA_LEAD', 'MANAGER'), (req, res) => controller.approvePlan(req, res));
/**
 * ========== READINESS ENDPOINT ==========
 */
// GET /api/v1/projects/:projectId/plans/:id/readiness
// Get release readiness calculation
router.get('/projects/:projectId/plans/:id/readiness', auth_1.authenticate, (req, res) => controller.getReleaseReadiness(req, res));
/**
 * ========== VERSIONING ENDPOINTS ==========
 */
// GET /api/v1/plans/:id/versions
// List all versions of a plan
router.get('/plans/:id/versions', auth_1.authenticate, (req, res) => controller.listVersions(req, res));
// GET /api/v1/plans/:id/versions/:versionId
// Get specific version snapshot
router.get('/plans/:id/versions/:versionId', auth_1.authenticate, (req, res) => controller.getVersion(req, res));
/**
 * ========== BASELINE ENDPOINTS ==========
 */
// POST /api/v1/plans/:id/baseline
// Set current state as baseline
router.post('/plans/:id/baseline', auth_1.authenticate, (req, res) => controller.setBaseline(req, res));
// GET /api/v1/plans/:id/baseline
// Get baseline comparison
router.get('/plans/:id/baseline', auth_1.authenticate, (req, res) => controller.getBaselineComparison(req, res));
exports.default = router;
//# sourceMappingURL=plans.js.map