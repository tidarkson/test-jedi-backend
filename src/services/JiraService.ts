import { getPrisma } from '../config/database';
import { config } from '../config/environment';
import { logger } from '../config/logger';
import { AppError, ErrorCodes } from '../types/errors';
import httpService from './HttpService';
import webhookService from './WebhookService';

interface JiraIssueFields {
  project: { key: string };
  summary: string;
  description?: { type: string; version: number; content: unknown[] };
  issuetype: { name: string };
  priority?: { name: string };
  labels?: string[];
  [key: string]: unknown;
}

interface JiraIssueResult {
  id: string;
  key: string;
  self: string;
  url: string;
}

export class JiraService {
  private prisma = getPrisma();

  /**
   * Begin OAuth2 redirect URL for Jira Atlassian connection
   */
  getConnectUrl(projectId: string): string {
    const state = Buffer.from(JSON.stringify({ projectId })).toString('base64url');
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: config.JIRA_APP_ID || '',
      scope: 'read:jira-user read:jira-work write:jira-work offline_access',
      redirect_uri: `${config.FRONTEND_URL}/api/v1/integrations/jira/callback`,
      state,
      response_type: 'code',
      prompt: 'consent',
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens and store the connection
   */
  async handleCallback(code: string, projectId: string): Promise<void> {
    const tokenRes = await httpService.postJson(
      'https://auth.atlassian.com/oauth/token',
      {
        grant_type: 'authorization_code',
        client_id: config.JIRA_APP_ID,
        client_secret: process.env.JIRA_APP_SECRET,
        code,
        redirect_uri: `${config.FRONTEND_URL}/api/v1/integrations/jira/callback`,
      },
    );

    if (tokenRes.statusCode !== 200) {
      throw new AppError(502, ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to exchange Jira authorization code');
    }

    const tokens = JSON.parse(tokenRes.body) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

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
  async createIssueForFailedCase(
    projectId: string,
    runCaseId: string,
    caseTitle: string,
    runTitle: string,
    runId: string,
    errorDetail?: string,
  ): Promise<JiraIssueResult | null> {
    try {
      const conn = await this.prisma.integrationConnection.findUnique({
        where: { projectId_provider: { projectId, provider: 'JIRA' } },
      });

      if (!conn || !conn.isActive || !conn.accessToken) {
        return null;
      }

      const settings = (conn.settings || {}) as Record<string, string>;
      const jiraProjectKey = settings['jiraProjectKey'];
      const cloudId = settings['cloudId'];

      if (!jiraProjectKey || !cloudId) {
        logger.warn(`Jira not fully configured for project ${projectId} - missing jiraProjectKey/cloudId`);
        return null;
      }

      const accessToken = await this.getValidToken(projectId, conn);

      const fields: JiraIssueFields = {
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

      const response = await httpService.postJson(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`,
        { fields },
        {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      );

      if (response.statusCode !== 201) {
        logger.error(`Jira issue creation failed (${response.statusCode}): ${response.body}`);
        return null;
      }

      const issue = JSON.parse(response.body) as JiraIssueResult;
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
          await webhookService.publishEvent(projectId, 'DEFECT_CREATED', {
            runCaseId,
            jiraKey: issue.key,
            jiraUrl: issue.url,
            caseTitle,
          });
        } catch (e) {
          logger.warn(`defect.created event failed: ${e}`);
        }
      });

      logger.info(`Jira issue created: ${issue.key} for runCase ${runCaseId}`);
      return issue;
    } catch (error) {
      logger.error('Error creating Jira issue:', error);
      return null;
    }
  }

  /**
   * Handle Jira webhook - sync status changes back to defect
   */
  async syncIssueStatusWebhook(payload: Record<string, unknown>): Promise<void> {
    try {
      const issue = payload['issue'] as Record<string, unknown> | undefined;
      const issueKey = (issue?.['key'] as string) || '';
      const statusName = ((issue?.['fields'] as any)?.['status']?.['name'] as string | undefined) || '';

      if (!issueKey || !statusName) return;

      const defectStatusMap: Record<string, string> = {
        Done: 'RESOLVED',
        Resolved: 'RESOLVED',
        Closed: 'CLOSED',
        'In Progress': 'IN_PROGRESS',
        Reopened: 'REOPENED',
      };

      const newStatus = defectStatusMap[statusName];
      if (!newStatus) return;

      await this.prisma.defect.updateMany({
        where: { externalId: issueKey },
        data: { status: newStatus as any },
      });

      logger.info(`Synced Jira issue ${issueKey} status → ${newStatus}`);
    } catch (error) {
      logger.error('Error syncing Jira issue status:', error);
    }
  }

  private async getValidToken(projectId: string, conn: { accessToken: string | null; refreshToken: string | null; expiresAt: Date | null }): Promise<string> {
    if (!conn.expiresAt || conn.expiresAt > new Date()) {
      return conn.accessToken!;
    }

    // Refresh the token
    const res = await httpService.postJson(
      'https://auth.atlassian.com/oauth/token',
      {
        grant_type: 'refresh_token',
        client_id: config.JIRA_APP_ID,
        client_secret: process.env.JIRA_APP_SECRET,
        refresh_token: conn.refreshToken,
      },
    );

    if (res.statusCode !== 200) {
      throw new AppError(502, ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to refresh Jira token');
    }

    const tokens = JSON.parse(res.body) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

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

export default new JiraService();
