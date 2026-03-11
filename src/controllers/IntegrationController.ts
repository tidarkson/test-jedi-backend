import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { AppError, ErrorCodes } from '../types/errors';
import { logger } from '../config/logger';
import integrationService from '../services/IntegrationService';
import webhookService from '../services/WebhookService';
import jiraService from '../services/JiraService';
import githubService from '../services/GitHubService';
import automationImportService from '../services/AutomationImportService';
import {
  registerWebhookSchema,
  updateWebhookSchema,
  configureIntegrationSchema,
  notificationRuleSchema,
  linkRunPrSchema,
} from '../validators/integrations.validator';
import { IntegrationProvider } from '@prisma/client';

export class IntegrationController {

  // ------ Webhooks --------------------------------------------------------

  async registerWebhook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { error, value } = registerWebhookSchema.validate(req.body);
      if (error) {
        res.status(400).json({ status: 'error', code: 400, error: ErrorCodes.VALIDATION_FAILED, message: error.details[0].message });
        return;
      }

      const webhook = await webhookService.registerWebhook(projectId, value);
      res.status(201).json({ status: 'success', code: 201, data: webhook });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  async listWebhooks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const data = await integrationService.listWebhooks(projectId);
      res.json({ status: 'success', data });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  async updateWebhook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, webhookId } = req.params;
      const { error, value } = updateWebhookSchema.validate(req.body);
      if (error) {
        res.status(400).json({ status: 'error', code: 400, error: ErrorCodes.VALIDATION_FAILED, message: error.details[0].message });
        return;
      }
      const data = await integrationService.updateWebhook(projectId, webhookId, value);
      res.json({ status: 'success', data });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  async deleteWebhook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, webhookId } = req.params;
      await integrationService.deleteWebhook(projectId, webhookId);
      res.json({ status: 'success', message: 'Webhook deleted' });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  // ------ Integration connections -----------------------------------------

  async configureIntegration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { error, value } = configureIntegrationSchema.validate(req.body);
      if (error) {
        res.status(400).json({ status: 'error', code: 400, error: ErrorCodes.VALIDATION_FAILED, message: error.details[0].message });
        return;
      }
      const data = await integrationService.configureIntegration(projectId, value);
      res.json({ status: 'success', data });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  async listIntegrations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const data = await integrationService.listIntegrations(projectId);
      res.json({ status: 'success', data });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  async deleteIntegration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, provider } = req.params;
      await integrationService.deleteIntegration(projectId, provider as IntegrationProvider);
      res.json({ status: 'success', message: 'Integration removed' });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  // ------ Jira OAuth flow -------------------------------------------------

  async jiraConnect(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.query;
      if (!projectId || typeof projectId !== 'string') {
        res.status(400).json({ status: 'error', message: 'projectId query param is required' });
        return;
      }
      const redirectUrl = jiraService.getConnectUrl(projectId);
      res.redirect(redirectUrl);
    } catch (err) {
      this.handleError(err, res);
    }
  }

  async jiraCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        res.status(400).json({ status: 'error', message: 'Missing code or state' });
        return;
      }
      const { projectId } = JSON.parse(Buffer.from(state as string, 'base64url').toString());
      await jiraService.handleCallback(code as string, projectId as string);
      res.json({ status: 'success', message: 'Jira connected successfully' });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  async jiraWebhookSync(req: Request, res: Response): Promise<void> {
    try {
      await jiraService.syncIssueStatusWebhook(req.body as Record<string, unknown>);
      res.json({ status: 'success' });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  // ------ GitHub/GitLab PR linking ----------------------------------------

  async linkRunToPr(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, runId } = req.params;
      const { error, value } = linkRunPrSchema.validate(req.body);
      if (error) {
        res.status(400).json({ status: 'error', code: 400, error: ErrorCodes.VALIDATION_FAILED, message: error.details[0].message });
        return;
      }
      const data = await githubService.linkRunToPr(projectId, runId, value);
      res.status(201).json({ status: 'success', data });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  async listRunPrLinks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, runId } = req.params;
      const data = await integrationService.listRunPrLinks(projectId, runId);
      res.json({ status: 'success', data });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  // ------ Notification rules ----------------------------------------------

  async createNotificationRule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { error, value } = notificationRuleSchema.validate(req.body);
      if (error) {
        res.status(400).json({ status: 'error', code: 400, error: ErrorCodes.VALIDATION_FAILED, message: error.details[0].message });
        return;
      }
      const data = await integrationService.createNotificationRule(projectId, value);
      res.status(201).json({ status: 'success', data });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  async listNotificationRules(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const data = await integrationService.listNotificationRules(projectId);
      res.json({ status: 'success', data });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  async updateNotificationRule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, ruleId } = req.params;
      const { error, value } = notificationRuleSchema.validate(req.body, { allowUnknown: false });
      if (error) {
        res.status(400).json({ status: 'error', code: 400, error: ErrorCodes.VALIDATION_FAILED, message: error.details[0].message });
        return;
      }
      const data = await integrationService.updateNotificationRule(projectId, ruleId, value);
      res.json({ status: 'success', data });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  async deleteNotificationRule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, ruleId } = req.params;
      await integrationService.deleteNotificationRule(projectId, ruleId);
      res.json({ status: 'success', message: 'Notification rule deleted' });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  // ------ Automation Import -----------------------------------------------

  async importResults(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, runId } = req.params;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ status: 'error', code: 401, error: ErrorCodes.UNAUTHORIZED, message: 'Unauthenticated' });
        return;
      }

      const contentType = req.headers['content-type'] ?? 'application/json';
      const body = typeof req.body === 'string' ? req.body : req.body as Record<string, unknown>;

      const result = await automationImportService.importResults(projectId, runId, body, contentType);
      res.json({ status: 'success', data: result });
    } catch (err) {
      this.handleError(err, res);
    }
  }

  // ------ Helpers ---------------------------------------------------------

  private handleError(err: unknown, res: Response): void {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ status: 'error', code: err.statusCode, error: err.code, message: err.message });
      return;
    }
    logger.error('IntegrationController internal error:', err);
    res.status(500).json({ status: 'error', code: 500, error: ErrorCodes.INTERNAL_SERVER_ERROR, message: 'Internal server error' });
  }
}

export default new IntegrationController();
