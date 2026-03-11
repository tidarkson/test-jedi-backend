"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JiraService = void 0;
const database_1 = require("../config/database");
const environment_1 = require("../config/environment");
const logger_1 = require("../config/logger");
const errors_1 = require("../types/errors");
const HttpService_1 = __importDefault(require("./HttpService"));
const WebhookService_1 = __importDefault(require("./WebhookService"));
class JiraService {
    constructor() {
        this.prisma = (0, database_1.getPrisma)();
    }
    /**
     * Begin OAuth2 redirect URL for Jira Atlassian connection
     */
    getConnectUrl(projectId) {
        const state = Buffer.from(JSON.stringify({ projectId })).toString('base64url');
        const params = new URLSearchParams({
            audience: 'api.atlassian.com',
            client_id: environment_1.config.JIRA_APP_ID || '',
            scope: 'read:jira-user read:jira-work write:jira-work offline_access',
            redirect_uri: `${environment_1.config.FRONTEND_URL}/api/v1/integrations/jira/callback`,
            state,
            response_type: 'code',
            prompt: 'consent',
        });
        return `https://auth.atlassian.com/authorize?${params.toString()}`;
    }
    /**
     * Exchange authorization code for tokens and store the connection
     */
    async handleCallback(code, projectId) {
        const tokenRes = await HttpService_1.default.postJson('https://auth.atlassian.com/oauth/token', {
            grant_type: 'authorization_code',
            client_id: environment_1.config.JIRA_APP_ID,
            client_secret: process.env.JIRA_APP_SECRET,
            code,
            redirect_uri: `${environment_1.config.FRONTEND_URL}/api/v1/integrations/jira/callback`,
        });
        if (tokenRes.statusCode !== 200) {
            throw new errors_1.AppError(502, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to exchange Jira authorization code');
        }
        const tokens = JSON.parse(tokenRes.body);
        await this.prisma.integrationConnection.upsert({
            where: { projectId_provider: { projectId, provider: 'JIRA' } },
            create: {
                projectId,
                provider: 'JIRA',
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
                isActive: true,
            },
            update: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
                isActive: true,
            },
        });
    }
    /**
     * Auto-create a Jira issue when a test case fails - stores externalId on RunCase
     */
    async createIssueForFailedCase(projectId, runCaseId, caseTitle, runTitle, runId, errorDetail) {
        try {
            const conn = await this.prisma.integrationConnection.findUnique({
                where: { projectId_provider: { projectId, provider: 'JIRA' } },
            });
            if (!conn || !conn.isActive || !conn.accessToken) {
                return null;
            }
            const settings = (conn.settings || {});
            const jiraProjectKey = settings['jiraProjectKey'];
            const cloudId = settings['cloudId'];
            if (!jiraProjectKey || !cloudId) {
                logger_1.logger.warn(`Jira not fully configured for project ${projectId} - missing jiraProjectKey/cloudId`);
                return null;
            }
            const accessToken = await this.getValidToken(projectId, conn);
            const fields = {
                project: { key: jiraProjectKey },
                summary: `[TestJedi] Test failure: ${caseTitle}`,
                issuetype: { name: settings['issueType'] || 'Bug' },
                priority: { name: settings['priority'] || 'High' },
                labels: ['testjedi-auto'],
                description: {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [{
                                    type: 'text',
                                    text: `Test Case: ${caseTitle}\nRun: ${runTitle} (${runId})${errorDetail ? `\n\nDetails:\n${errorDetail}` : ''}`,
                                }],
                        },
                    ],
                },
            };
            const response = await HttpService_1.default.postJson(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`, { fields }, {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
            });
            if (response.statusCode !== 201) {
                logger_1.logger.error(`Jira issue creation failed (${response.statusCode}): ${response.body}`);
                return null;
            }
            const issue = JSON.parse(response.body);
            issue.url = `https://jira.atlassian.net/browse/${issue.key}`;
            // Store externalId on RunCase and create Defect record
            await this.prisma.runCase.update({
                where: { id: runCaseId },
                data: { externalId: issue.key },
            });
            await this.prisma.defect.create({
                data: {
                    runCaseId,
                    externalId: issue.key,
                    title: `[Jira] ${fields.summary}`,
                    url: issue.url,
                    status: 'OPEN',
                },
            });
            // Fire defect.created event
            setImmediate(async () => {
                try {
                    await WebhookService_1.default.publishEvent(projectId, 'DEFECT_CREATED', {
                        runCaseId,
                        jiraKey: issue.key,
                        jiraUrl: issue.url,
                        caseTitle,
                    });
                }
                catch (e) {
                    logger_1.logger.warn(`defect.created event failed: ${e}`);
                }
            });
            logger_1.logger.info(`Jira issue created: ${issue.key} for runCase ${runCaseId}`);
            return issue;
        }
        catch (error) {
            logger_1.logger.error('Error creating Jira issue:', error);
            return null;
        }
    }
    /**
     * Handle Jira webhook - sync status changes back to defect
     */
    async syncIssueStatusWebhook(payload) {
        try {
            const issue = payload['issue'];
            const issueKey = issue?.['key'] || '';
            const statusName = issue?.['fields']?.['status']?.['name'] || '';
            if (!issueKey || !statusName)
                return;
            const defectStatusMap = {
                Done: 'RESOLVED',
                Resolved: 'RESOLVED',
                Closed: 'CLOSED',
                'In Progress': 'IN_PROGRESS',
                Reopened: 'REOPENED',
            };
            const newStatus = defectStatusMap[statusName];
            if (!newStatus)
                return;
            await this.prisma.defect.updateMany({
                where: { externalId: issueKey },
                data: { status: newStatus },
            });
            logger_1.logger.info(`Synced Jira issue ${issueKey} status → ${newStatus}`);
        }
        catch (error) {
            logger_1.logger.error('Error syncing Jira issue status:', error);
        }
    }
    async getValidToken(projectId, conn) {
        if (!conn.expiresAt || conn.expiresAt > new Date()) {
            return conn.accessToken;
        }
        // Refresh the token
        const res = await HttpService_1.default.postJson('https://auth.atlassian.com/oauth/token', {
            grant_type: 'refresh_token',
            client_id: environment_1.config.JIRA_APP_ID,
            client_secret: process.env.JIRA_APP_SECRET,
            refresh_token: conn.refreshToken,
        });
        if (res.statusCode !== 200) {
            throw new errors_1.AppError(502, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to refresh Jira token');
        }
        const tokens = JSON.parse(res.body);
        await this.prisma.integrationConnection.update({
            where: { projectId_provider: { projectId, provider: 'JIRA' } },
            data: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
            },
        });
        return tokens.access_token;
    }
}
exports.JiraService = JiraService;
exports.default = new JiraService();
//# sourceMappingURL=JiraService.js.map