"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationController = void 0;
const errors_1 = require("../types/errors");
const logger_1 = require("../config/logger");
const IntegrationService_1 = __importDefault(require("../services/IntegrationService"));
const WebhookService_1 = __importDefault(require("../services/WebhookService"));
const JiraService_1 = __importDefault(require("../services/JiraService"));
const GitHubService_1 = __importDefault(require("../services/GitHubService"));
const AutomationImportService_1 = __importDefault(require("../services/AutomationImportService"));
const integrations_validator_1 = require("../validators/integrations.validator");
class IntegrationController {
    // ------ Webhooks --------------------------------------------------------
    async registerWebhook(req, res) {
        try {
            const { projectId } = req.params;
            const { error, value } = integrations_validator_1.registerWebhookSchema.validate(req.body);
            if (error) {
                res.status(400).json({ status: 'error', code: 400, error: errors_1.ErrorCodes.VALIDATION_FAILED, message: error.details[0].message });
                return;
            }
            const webhook = await WebhookService_1.default.registerWebhook(projectId, value);
            res.status(201).json({ status: 'success', code: 201, data: webhook });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    async listWebhooks(req, res) {
        try {
            const { projectId } = req.params;
            const data = await IntegrationService_1.default.listWebhooks(projectId);
            res.json({ status: 'success', data });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    async updateWebhook(req, res) {
        try {
            const { projectId, webhookId } = req.params;
            const { error, value } = integrations_validator_1.updateWebhookSchema.validate(req.body);
            if (error) {
                res.status(400).json({ status: 'error', code: 400, error: errors_1.ErrorCodes.VALIDATION_FAILED, message: error.details[0].message });
                return;
            }
            const data = await IntegrationService_1.default.updateWebhook(projectId, webhookId, value);
            res.json({ status: 'success', data });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    async deleteWebhook(req, res) {
        try {
            const { projectId, webhookId } = req.params;
            await IntegrationService_1.default.deleteWebhook(projectId, webhookId);
            res.json({ status: 'success', message: 'Webhook deleted' });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    // ------ Integration connections -----------------------------------------
    async configureIntegration(req, res) {
        try {
            const { projectId } = req.params;
            const { error, value } = integrations_validator_1.configureIntegrationSchema.validate(req.body);
            if (error) {
                res.status(400).json({ status: 'error', code: 400, error: errors_1.ErrorCodes.VALIDATION_FAILED, message: error.details[0].message });
                return;
            }
            const data = await IntegrationService_1.default.configureIntegration(projectId, value);
            res.json({ status: 'success', data });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    async listIntegrations(req, res) {
        try {
            const { projectId } = req.params;
            const data = await IntegrationService_1.default.listIntegrations(projectId);
            res.json({ status: 'success', data });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    async deleteIntegration(req, res) {
        try {
            const { projectId, provider } = req.params;
            await IntegrationService_1.default.deleteIntegration(projectId, provider);
            res.json({ status: 'success', message: 'Integration removed' });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    // ------ Jira OAuth flow -------------------------------------------------
    async jiraConnect(req, res) {
        try {
            const { projectId } = req.query;
            if (!projectId || typeof projectId !== 'string') {
                res.status(400).json({ status: 'error', message: 'projectId query param is required' });
                return;
            }
            const redirectUrl = JiraService_1.default.getConnectUrl(projectId);
            res.redirect(redirectUrl);
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    async jiraCallback(req, res) {
        try {
            const { code, state } = req.query;
            if (!code || !state) {
                res.status(400).json({ status: 'error', message: 'Missing code or state' });
                return;
            }
            const { projectId } = JSON.parse(Buffer.from(state, 'base64url').toString());
            await JiraService_1.default.handleCallback(code, projectId);
            res.json({ status: 'success', message: 'Jira connected successfully' });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    async jiraWebhookSync(req, res) {
        try {
            await JiraService_1.default.syncIssueStatusWebhook(req.body);
            res.json({ status: 'success' });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    // ------ GitHub/GitLab PR linking ----------------------------------------
    async linkRunToPr(req, res) {
        try {
            const { projectId, runId } = req.params;
            const { error, value } = integrations_validator_1.linkRunPrSchema.validate(req.body);
            if (error) {
                res.status(400).json({ status: 'error', code: 400, error: errors_1.ErrorCodes.VALIDATION_FAILED, message: error.details[0].message });
                return;
            }
            const data = await GitHubService_1.default.linkRunToPr(projectId, runId, value);
            res.status(201).json({ status: 'success', data });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    async listRunPrLinks(req, res) {
        try {
            const { projectId, runId } = req.params;
            const data = await IntegrationService_1.default.listRunPrLinks(projectId, runId);
            res.json({ status: 'success', data });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    // ------ Notification rules ----------------------------------------------
    async createNotificationRule(req, res) {
        try {
            const { projectId } = req.params;
            const { error, value } = integrations_validator_1.notificationRuleSchema.validate(req.body);
            if (error) {
                res.status(400).json({ status: 'error', code: 400, error: errors_1.ErrorCodes.VALIDATION_FAILED, message: error.details[0].message });
                return;
            }
            const data = await IntegrationService_1.default.createNotificationRule(projectId, value);
            res.status(201).json({ status: 'success', data });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    async listNotificationRules(req, res) {
        try {
            const { projectId } = req.params;
            const data = await IntegrationService_1.default.listNotificationRules(projectId);
            res.json({ status: 'success', data });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    async updateNotificationRule(req, res) {
        try {
            const { projectId, ruleId } = req.params;
            const { error, value } = integrations_validator_1.notificationRuleSchema.validate(req.body, { allowUnknown: false });
            if (error) {
                res.status(400).json({ status: 'error', code: 400, error: errors_1.ErrorCodes.VALIDATION_FAILED, message: error.details[0].message });
                return;
            }
            const data = await IntegrationService_1.default.updateNotificationRule(projectId, ruleId, value);
            res.json({ status: 'success', data });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    async deleteNotificationRule(req, res) {
        try {
            const { projectId, ruleId } = req.params;
            await IntegrationService_1.default.deleteNotificationRule(projectId, ruleId);
            res.json({ status: 'success', message: 'Notification rule deleted' });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    // ------ Automation Import -----------------------------------------------
    async importResults(req, res) {
        try {
            const { projectId, runId } = req.params;
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ status: 'error', code: 401, error: errors_1.ErrorCodes.UNAUTHORIZED, message: 'Unauthenticated' });
                return;
            }
            const contentType = req.headers['content-type'] ?? 'application/json';
            const body = typeof req.body === 'string' ? req.body : req.body;
            const result = await AutomationImportService_1.default.importResults(projectId, runId, body, contentType);
            res.json({ status: 'success', data: result });
        }
        catch (err) {
            this.handleError(err, res);
        }
    }
    // ------ Helpers ---------------------------------------------------------
    handleError(err, res) {
        if (err instanceof errors_1.AppError) {
            res.status(err.statusCode).json({ status: 'error', code: err.statusCode, error: err.code, message: err.message });
            return;
        }
        logger_1.logger.error('IntegrationController internal error:', err);
        res.status(500).json({ status: 'error', code: 500, error: errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, message: 'Internal server error' });
    }
}
exports.IntegrationController = IntegrationController;
exports.default = new IntegrationController();
//# sourceMappingURL=IntegrationController.js.map