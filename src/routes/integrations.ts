import express, { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import integrationController from '../controllers/IntegrationController';

const router: Router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Integrations
 *     description: Webhooks, Jira, SCM, notifications, and result imports
 * /projects/{projectId}/webhooks:
 *   post:
 *     tags: [Integrations]
 *     summary: Register webhook
 *     security: [{ bearerAuth: [] }]
 *   get:
 *     tags: [Integrations]
 *     summary: List webhooks
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/webhooks/{webhookId}:
 *   put:
 *     tags: [Integrations]
 *     summary: Update webhook
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     tags: [Integrations]
 *     summary: Delete webhook
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/integrations:
 *   put:
 *     tags: [Integrations]
 *     summary: Configure integration
 *     security: [{ bearerAuth: [] }]
 *   get:
 *     tags: [Integrations]
 *     summary: List integrations
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/integrations/{provider}:
 *   delete:
 *     tags: [Integrations]
 *     summary: Delete integration
 *     security: [{ bearerAuth: [] }]
 * /integrations/jira/connect:
 *   get:
 *     tags: [Integrations]
 *     summary: Start Jira OAuth connect flow
 * /integrations/jira/callback:
 *   get:
 *     tags: [Integrations]
 *     summary: Jira OAuth callback
 * /integrations/jira/webhook:
 *   post:
 *     tags: [Integrations]
 *     summary: Jira webhook sync
 * /projects/{projectId}/runs/{runId}/pr-link:
 *   post:
 *     tags: [Integrations]
 *     summary: Link run to pull request
 *     security: [{ bearerAuth: [] }]
 *   get:
 *     tags: [Integrations]
 *     summary: List run pull-request links
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/notification-rules:
 *   post:
 *     tags: [Integrations]
 *     summary: Create notification rule
 *     security: [{ bearerAuth: [] }]
 *   get:
 *     tags: [Integrations]
 *     summary: List notification rules
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/notification-rules/{ruleId}:
 *   put:
 *     tags: [Integrations]
 *     summary: Update notification rule
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     tags: [Integrations]
 *     summary: Delete notification rule
 *     security: [{ bearerAuth: [] }]
 * /projects/{projectId}/runs/{runId}/import-results:
 *   post:
 *     tags: [Integrations]
 *     summary: Import automation test results
 *     security: [{ bearerAuth: [] }]
 */

// ─── Webhook endpoints ─────────────────────────────────────────────────────

/**
 * POST /api/v1/projects/:projectId/webhooks
 * Register a new outbound webhook
 */
router.post(
  '/projects/:projectId/webhooks',
  authenticate,
  (req, res) => integrationController.registerWebhook(req, res),
);

/**
 * GET /api/v1/projects/:projectId/webhooks
 * List webhooks + last 100 deliveries each
 */
router.get(
  '/projects/:projectId/webhooks',
  authenticate,
  (req, res) => integrationController.listWebhooks(req, res),
);

/**
 * PUT /api/v1/projects/:projectId/webhooks/:webhookId
 * Update webhook config
 */
router.put(
  '/projects/:projectId/webhooks/:webhookId',
  authenticate,
  (req, res) => integrationController.updateWebhook(req, res),
);

/**
 * DELETE /api/v1/projects/:projectId/webhooks/:webhookId
 */
router.delete(
  '/projects/:projectId/webhooks/:webhookId',
  authenticate,
  (req, res) => integrationController.deleteWebhook(req, res),
);

// ─── Generic integration connections ──────────────────────────────────────

/**
 * PUT /api/v1/projects/:projectId/integrations
 * Connect/update any integration (GitHub token, Slack webhook URL, etc.)
 */
router.put(
  '/projects/:projectId/integrations',
  authenticate,
  requireRole('ADMIN', 'MANAGER'),
  (req, res) => integrationController.configureIntegration(req, res),
);

/**
 * GET /api/v1/projects/:projectId/integrations
 * List active integration connections (no secrets returned)
 */
router.get(
  '/projects/:projectId/integrations',
  authenticate,
  (req, res) => integrationController.listIntegrations(req, res),
);

/**
 * DELETE /api/v1/projects/:projectId/integrations/:provider
 */
router.delete(
  '/projects/:projectId/integrations/:provider',
  authenticate,
  requireRole('ADMIN', 'MANAGER'),
  (req, res) => integrationController.deleteIntegration(req, res),
);

// ─── Jira integration ──────────────────────────────────────────────────────

/**
 * GET /api/v1/integrations/jira/connect?projectId=...
 * Start Jira OAuth2 flow – redirects to Atlassian
 */
router.get(
  '/integrations/jira/connect',
  (req: Request, res: Response) => integrationController.jiraConnect(req, res),
);

/**
 * GET /api/v1/integrations/jira/callback
 * OAuth2 callback – exchanges code for tokens
 */
router.get(
  '/integrations/jira/callback',
  (req: Request, res: Response) => integrationController.jiraCallback(req, res),
);

/**
 * POST /api/v1/integrations/jira/webhook
 * Jira event push → sync issue status back to defect
 * (No auth required – Jira pushes here; validate payload externally if needed)
 */
router.post(
  '/integrations/jira/webhook',
  (req: Request, res: Response) => integrationController.jiraWebhookSync(req, res),
);

// ─── GitHub/GitLab PR links ────────────────────────────────────────────────

/**
 * POST /api/v1/projects/:projectId/runs/:runId/pr-link
 * Link a run to a GitHub/GitLab PR
 */
router.post(
  '/projects/:projectId/runs/:runId/pr-link',
  authenticate,
  (req, res) => integrationController.linkRunToPr(req, res),
);

/**
 * GET /api/v1/projects/:projectId/runs/:runId/pr-link
 */
router.get(
  '/projects/:projectId/runs/:runId/pr-link',
  authenticate,
  (req, res) => integrationController.listRunPrLinks(req, res),
);

// ─── Notification rules ────────────────────────────────────────────────────

/**
 * POST /api/v1/projects/:projectId/notification-rules
 */
router.post(
  '/projects/:projectId/notification-rules',
  authenticate,
  requireRole('ADMIN', 'MANAGER', 'QA_LEAD'),
  (req, res) => integrationController.createNotificationRule(req, res),
);

/**
 * GET /api/v1/projects/:projectId/notification-rules
 */
router.get(
  '/projects/:projectId/notification-rules',
  authenticate,
  (req, res) => integrationController.listNotificationRules(req, res),
);

/**
 * PUT /api/v1/projects/:projectId/notification-rules/:ruleId
 */
router.put(
  '/projects/:projectId/notification-rules/:ruleId',
  authenticate,
  requireRole('ADMIN', 'MANAGER', 'QA_LEAD'),
  (req, res) => integrationController.updateNotificationRule(req, res),
);

/**
 * DELETE /api/v1/projects/:projectId/notification-rules/:ruleId
 */
router.delete(
  '/projects/:projectId/notification-rules/:ruleId',
  authenticate,
  requireRole('ADMIN', 'MANAGER', 'QA_LEAD'),
  (req, res) => integrationController.deleteNotificationRule(req, res),
);

// ─── Automation Import ─────────────────────────────────────────────────────

/**
 * POST /api/v1/projects/:projectId/runs/:runId/import-results
 * Accept Playwright/Jest/Cypress JSON or JUnit XML
 * Content-Type: application/json  (Playwright, Jest, Cypress)
 *             application/xml | text/xml  (JUnit)
 */
router.post(
  '/projects/:projectId/runs/:runId/import-results',
  authenticate,
  (req, res) => integrationController.importResults(req, res),
);

export default router;
