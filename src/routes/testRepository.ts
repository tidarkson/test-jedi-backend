import express, { Router } from 'express';
import { TestRepositoryController } from '../controllers/TestRepositoryController';
import { authenticate } from '../middleware/auth';

const router: Router = express.Router({ mergeParams: true });
const controller = new TestRepositoryController();

/**
 * ========== SUITE ENDPOINTS ==========
 */

/**
 * @route   GET /api/v1/projects/:projectId/suites
 * @desc    Get suite tree structure with case counts
 * @access  Protected
 */
router.get(
  '/suites',
  authenticate,
  (req, res) => controller.getSuiteTree(req, res),
);

/**
 * @route   POST /api/v1/projects/:projectId/suites
 * @desc    Create a new suite
 * @access  Protected
 */
router.post(
  '/suites',
  authenticate,
  (req, res) => controller.createSuite(req, res),
);

/**
 * @route   PUT /api/v1/projects/:projectId/suites/:id
 * @desc    Update suite
 * @access  Protected
 */
router.put(
  '/suites/:id',
  authenticate,
  (req, res) => controller.updateSuite(req, res),
);

/**
 * @route   DELETE /api/v1/projects/:projectId/suites/:id
 * @desc    Soft delete suite (and all its cases)
 * @access  Protected
 */
router.delete(
  '/suites/:id',
  authenticate,
  (req, res) => controller.deleteSuite(req, res),
);

/**
 * @route   POST /api/v1/projects/:projectId/suites/:id/clone
 * @desc    Clone suite with all cases
 * @access  Protected
 */
router.post(
  '/suites/:id/clone',
  authenticate,
  (req, res) => controller.cloneSuite(req, res),
);

/**
 * @route   POST /api/v1/projects/:projectId/suites/:id/lock
 * @desc    Toggle suite lock
 * @access  Protected
 */
router.post(
  '/suites/:id/lock',
  authenticate,
  (req, res) => controller.toggleSuiteLock(req, res),
);

/**
 * @route   POST /api/v1/projects/:projectId/suites/:id/archive
 * @desc    Archive suite
 * @access  Protected
 */
router.post(
  '/suites/:id/archive',
  authenticate,
  (req, res) => controller.archiveSuite(req, res),
);

/**
 * ========== TEST CASE ENDPOINTS ==========
 */

/**
 * @route   GET /api/v1/projects/:projectId/cases
 * @desc    Get paginated test cases with filters
 * @access  Protected
 * @query   page, limit, suiteId, priority, severity, type, automationStatus, status, tags, search
 */
router.get(
  '/cases',
  authenticate,
  (req, res) => controller.getTestCases(req, res),
);

/**
 * @route   POST /api/v1/projects/:projectId/cases
 * @desc    Create test case
 * @access  Protected
 * @body    suiteId, title, description, preconditions, postconditions,
 *          priority, severity, type, automationStatus, estimatedTime, reviewerId, tags, customFields, steps
 */
router.post(
  '/cases',
  authenticate,
  (req, res) => controller.createTestCase(req, res),
);

/**
 * @route   GET /api/v1/projects/:projectId/cases/:id
 * @desc    Get single test case with steps
 * @access  Protected
 */
router.get(
  '/cases/:id',
  authenticate,
  (req, res) => controller.getTestCase(req, res),
);

/**
 * @route   PUT /api/v1/projects/:projectId/cases/:id
 * @desc    Update test case (creates new version in audit log)
 * @access  Protected
 */
router.put(
  '/cases/:id',
  authenticate,
  (req, res) => controller.updateTestCase(req, res),
);

/**
 * @route   DELETE /api/v1/projects/:projectId/cases/:id
 * @desc    Soft delete test case
 * @access  Protected
 */
router.delete(
  '/cases/:id',
  authenticate,
  (req, res) => controller.deleteTestCase(req, res),
);

/**
 * @route   GET /api/v1/projects/:projectId/cases/:id/history
 * @desc    Get test case version history from audit logs
 * @access  Protected
 */
router.get(
  '/cases/:id/history',
  authenticate,
  (req, res) => controller.getCaseHistory(req, res),
);

/**
 * ========== BULK OPERATIONS ==========
 */

/**
 * @route   POST /api/v1/projects/:projectId/cases/bulk
 * @desc    Bulk create/edit/move/delete operations (max 500 items)
 * @access  Protected
 * @body    suiteId, items: [{ action, id?, data?, newSuiteId? }]
 */
router.post(
  '/cases/bulk',
  authenticate,
  (req, res) => controller.bulkOperateTestCases(req, res),
);

export default router;
