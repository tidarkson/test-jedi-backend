"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AuthController_1 = require("../controllers/AuthController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const authController = new AuthController_1.AuthController();
/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication and user identity
 */
/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name, password, organizationName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *               organizationName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user and create organization
 * @access  Public
 */
router.post('/register', (req, res) => authController.register(req, res));
/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * @route   POST /api/v1/auth/login
 * @desc    Login user and return access + refresh tokens
 * @access  Public
 */
router.post('/login', (req, res) => authController.login(req, res));
/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', (req, res) => authController.refresh(req, res));
/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and revoke refresh token
 * @access  Protected
 */
router.post('/logout', auth_1.authenticate, (req, res) => authController.logout(req, res));
/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Protected
 */
router.get('/me', auth_1.authenticate, (req, res) => authController.getProfile(req, res));
/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Protected
 */
router.post('/change-password', auth_1.authenticate, (req, res) => authController.changePassword(req, res));
exports.default = router;
//# sourceMappingURL=auth.js.map