import { getPrisma } from '../config/database';
import { AppError, ErrorCodes } from '../types/errors';
import { ConfigureIntegrationInput, NotificationRuleInput, WEBHOOK_EVENT_FROM_NAME } from '../types/integrations';
import { IntegrationProvider, WebhookEvent } from '@prisma/client';

export class IntegrationService {
  private prisma = getPrisma();

  // ─── Integration connection management ────────────────────────────────────

  async configureIntegration(projectId: string, input: ConfigureIntegrationInput) {
    await this.assertProjectExists(projectId);

    return this.prisma.integrationConnection.upsert({
      where: { projectId_provider: { projectId, provider: input.provider } },
      create: {
        projectId,
        provider: input.provider,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        settings: input.settings as any,
        isActive: input.isActive ?? true,
      },
      update: {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        settings: input.settings as any,
        isActive: input.isActive ?? true,
      },
    });
  }

  async listIntegrations(projectId: string) {
    await this.assertProjectExists(projectId);
    return this.prisma.integrationConnection.findMany({
      where: { projectId },
      select: {
        id: true,
        provider: true,
        isActive: true,
        expiresAt: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteIntegration(projectId: string, provider: IntegrationProvider) {
    await this.assertProjectExists(projectId);
    const conn = await this.prisma.integrationConnection.findUnique({
      where: { projectId_provider: { projectId, provider } },
    });
    if (!conn) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Integration not found');
    }
    await this.prisma.integrationConnection.delete({
      where: { projectId_provider: { projectId, provider } },
    });
  }

  // ─── Webhook management ────────────────────────────────────────────────────

  async listWebhooks(projectId: string) {
    await this.assertProjectExists(projectId);
    return this.prisma.webhook.findMany({
      where: { projectId },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            event: true,
            status: true,
            attempt: true,
            responseCode: true,
            durationMs: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async deleteWebhook(projectId: string, webhookId: string) {
    const hook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!hook || hook.projectId !== projectId) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Webhook not found');
    }
    await this.prisma.webhook.delete({ where: { id: webhookId } });
  }

  async updateWebhook(projectId: string, webhookId: string, data: Partial<{
    url: string;
    name: string;
    secret: string;
    events: string[];
    isActive: boolean;
    timeoutMs: number;
  }>) {
    const hook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!hook || hook.projectId !== projectId) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Webhook not found');
    }

    const mappedEvents = data.events
      ?.map((e) => WEBHOOK_EVENT_FROM_NAME[e])
      .filter((e): e is WebhookEvent => Boolean(e));

    return this.prisma.webhook.update({
      where: { id: webhookId },
      data: {
        ...(data.url && { url: data.url }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.secret !== undefined && { secret: data.secret }),
        ...(mappedEvents && { events: mappedEvents }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.timeoutMs !== undefined && { timeoutMs: data.timeoutMs }),
      },
    });
  }

  // ─── Notification rule management ─────────────────────────────────────────

  async createNotificationRule(projectId: string, input: NotificationRuleInput) {
    await this.assertProjectExists(projectId);

    const mappedEvents = input.enabledEvents
      .map((e) => WEBHOOK_EVENT_FROM_NAME[e])
      .filter((e): e is WebhookEvent => Boolean(e));

    return this.prisma.notificationRule.create({
      data: {
        projectId,
        provider: input.provider,
        channel: input.channel,
        enabledEvents: mappedEvents,
        failureThreshold: input.failureThreshold,
        settings: input.settings as any,
        isActive: input.isActive ?? true,
      },
    });
  }

  async listNotificationRules(projectId: string) {
    await this.assertProjectExists(projectId);
    return this.prisma.notificationRule.findMany({ where: { projectId } });
  }

  async updateNotificationRule(
    projectId: string,
    ruleId: string,
    input: Partial<NotificationRuleInput>,
  ) {
    const rule = await this.prisma.notificationRule.findUnique({ where: { id: ruleId } });
    if (!rule || rule.projectId !== projectId) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Notification rule not found');
    }

    const mappedEvents = input.enabledEvents
      ?.map((e) => WEBHOOK_EVENT_FROM_NAME[e])
      .filter((e): e is WebhookEvent => Boolean(e));

    return this.prisma.notificationRule.update({
      where: { id: ruleId },
      data: {
        ...(input.provider && { provider: input.provider }),
        ...(input.channel && { channel: input.channel }),
        ...(mappedEvents && { enabledEvents: mappedEvents }),
        ...(input.failureThreshold !== undefined && { failureThreshold: input.failureThreshold }),
        ...(input.settings && { settings: input.settings as any }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
  }

  async deleteNotificationRule(projectId: string, ruleId: string) {
    const rule = await this.prisma.notificationRule.findUnique({ where: { id: ruleId } });
    if (!rule || rule.projectId !== projectId) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Notification rule not found');
    }
    await this.prisma.notificationRule.delete({ where: { id: ruleId } });
  }

  // ─── PR link management ────────────────────────────────────────────────────

  async listRunPrLinks(projectId: string, runId: string) {
    return this.prisma.runPullRequestLink.findMany({
      where: { projectId, runId },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async assertProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Project not found');
    }
  }
}

export default new IntegrationService();
