"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const TestRepositoryController_1 = require("../controllers/TestRepositoryController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router({ mergeParams: true });
const controller = new TestRepositoryController_1.TestRepositoryController();
/**
 * @openapi
 * tags:
 *   - name: Test Repository
 *     description: Test suites and test cases management
 * /projects/{projectId}/suites:
 *   get:
 *     tags: [Test Repository]
 *     summary: Get suite tree
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     tags: [Test Repository]
 *     summary: Create suite
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/suites/{id}:
 *   put:
 *     tags: [Test Repository]
 *     summary: Update suite
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     tags: [Test Repository]
 *     summary: Delete suite
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/suites/{id}/clone:
 *   post:
 *     tags: [Test Repository]
 *     summary: Clone suite
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/suites/{id}/lock:
 *   post:
 *     tags: [Test Repository]
 *     summary: Toggle suite lock
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/suites/{id}/archive:
 *   post:
 *     tags: [Test Repository]
 *     summary: Archive suite
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/cases:
 *   get:
 *     tags: [Test Repository]
 *     summary: List test cases
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     tags: [Test Repository]
 *     summary: Create test case
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/cases/{id}:
 *   get:
 *     tags: [Test Repository]
 *     summary: Get test case details
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     tags: [Test Repository]
 *     summary: Update test case
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     tags: [Test Repository]
 *     summary: Delete test case
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/cases/{id}/history:
 *   get:
 *     tags: [Test Repository]
 *     summary: Get test case history
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/cases/bulk:
 *   post:
 *     tags: [Test Repository]
 *     summary: Bulk operate on test cases
 *     security: [{ bearerAuth: [] }]
 */
/**
 * ========== SUITE ENDPOINTS ==========
 */
/**
 * @route   GET /api/v1/projects/:projectId/suites
 * @desc    Get suite tree structure with case counts
 * @access  Protected
 */
router.get('/suites', auth_1.authenticate, (req, res) => controller.getSuiteTree(req, res));
/**
 * @route   POST /api/v1/projects/:projectId/suites
 * @desc    Create a new suite
 * @access  Protected
 */
router.post('/suites', auth_1.authenticate, (req, res) => controller.createSuite(req, res));
/**
 * @route   PUT /api/v1/projects/:projectId/suites/:id
 * @desc    Update suite
 * @access  Protected
 */
router.put('/suites/:id', auth_1.authenticate, (req, res) => controller.updateSuite(req, res));
/**
 * @route   DELETE /api/v1/projects/:projectId/suites/:id
 * @desc    Soft delete suite (and all its cases)
 * @access  Protected
 */
router.delete('/suites/:id', auth_1.authenticate, (req, res) => controller.deleteSuite(req, res));
/**
 * @route   POST /api/v1/projects/:projectId/suites/:id/clone
 * @desc    Clone suite with all cases
 * @access  Protected
 */
router.post('/suites/:id/clone', auth_1.authenticate, (req, res) => controller.cloneSuite(req, res));
/**
 * @route   POST /api/v1/projects/:projectId/suites/:id/lock
 * @desc    Toggle suite lock
 * @access  Protected
 */
router.post('/suites/:id/lock', auth_1.authenticate, (req, res) => controller.toggleSuiteLock(req, res));
/**
 * @route   POST /api/v1/projects/:projectId/suites/:id/archive
 * @desc    Archive suite
 * @access  Protected
 */
router.post('/suites/:id/archive', auth_1.authenticate, (req, res) => controller.archiveSuite(req, res));
/**
 * ========== TEST CASE ENDPOINTS ==========
 */
/**
 * @route   GET /api/v1/projects/:projectId/cases
 * @desc    Get paginated test cases with filters
 * @access  Protected
 * @query   page, limit, suiteId, priority, severity, type, automationStatus, status, tags, search
 */
router.get('/cases', auth_1.authenticate, (req, res) => controller.getTestCases(req, res));
/**
 * @route   POST /api/v1/projects/:projectId/cases
 * @desc    Create test case
 * @access  Protected
 * @body    suiteId, title, description, preconditions, postconditions,
 *          priority, severity, type, automationStatus, estimatedTime, reviewerId, tags, customFields, steps
 */
router.post('/cases', auth_1.authenticate, (req, res) => controller.createTestCase(req, res));
/**
 * @route   GET /api/v1/projects/:projectId/cases/:id
 * @desc    Get single test case with steps
 * @access  Protected
 */
router.get('/cases/:id', auth_1.authenticate, (req, res) => controller.getTestCase(req, res));
/**
 * @route   PUT /api/v1/projects/:projectId/cases/:id
 * @desc    Update test case (creates new version in audit log)
 * @access  Protected
 */
router.put('/cases/:id', auth_1.authenticate, (req, res) => controller.updateTestCase(req, res));
/**
 * @route   DELETE /api/v1/projects/:projectId/cases/:id
 * @desc    Soft delete test case
 * @access  Protected
 */
router.delete('/cases/:id', auth_1.authenticate, (req, res) => controller.deleteTestCase(req, res));
/**
 * @route   GET /api/v1/projects/:projectId/cases/:id/history
 * @desc    Get test case version history from audit logs
 * @access  Protected
 */
router.get('/cases/:id/history', auth_1.authenticate, (req, res) => controller.getCaseHistory(req, res));
/**
 * ========== BULK OPERATIONS ==========
 */
/**
 * @route   POST /api/v1/projects/:projectId/cases/bulk
 * @desc    Bulk create/edit/move/delete operations (max 500 items)
 * @access  Protected
 * @body    suiteId, items: [{ action, id?, data?, newSuiteId? }]
 */
router.post('/cases/bulk', auth_1.authenticate, (req, res) => controller.bulkOperateTestCases(req, res));
exports.default = router;
//# sourceMappingURL=testRepository.js.map