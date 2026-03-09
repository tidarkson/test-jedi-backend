import express, { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/auth';

const router: Router = express.Router();
const authController = new AuthController();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user and create organization
 * @access  Public
 */
router.post(
  '/register',
  (req, res) => authController.register(req, res),
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user and return access + refresh tokens
 * @access  Public
 */
router.post(
  '/login',
  (req, res) => authController.login(req, res),
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post(
  '/refresh',
  (req, res) => authController.refresh(req, res),
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and revoke refresh token
 * @access  Protected
 */
router.post(
  '/logout',
  authenticate,
  (req, res) => authController.logout(req, res),
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Protected
 */
router.get(
  '/me',
  authenticate,
  (req, res) => authController.getProfile(req, res),
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Protected
 */
router.post(
  '/change-password',
  authenticate,
  (req, res) => authController.changePassword(req, res),
);

export default router;
