import crypto from 'crypto';
import { getPrisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError, ErrorCodes } from '../types/errors';
import { RegisterWebhookInput, WEBHOOK_EVENT_FROM_NAME, WEBHOOK_EVENT_NAME_MAP, WebhookPayload } from '../types/integrations';
import { WebhookEvent } from '@prisma/client';
import httpService from './HttpService';

const MAX_WEBHOOK_ATTEMPTS = 3;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class WebhookService {
  private prisma = getPrisma();

  async registerWebhook(projectId: string, input: RegisterWebhookInput) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Project not found');
    }

    const mappedEvents = input.events
      .map((event) => WEBHOOK_EVENT_FROM_NAME[event])
      .filter((event): event is WebhookEvent => Boolean(event));

    if (mappedEvents.length === 0) {
      throw new AppError(400, ErrorCodes.VALIDATION_FAILED, 'At least one valid webhook event is required');
    }

    return this.prisma.webhook.create({
      data: {
        projectId,
        url: input.url,
        name: input.name,
        secret: input.secret,
        timeoutMs: input.timeoutMs ?? 5000,
        events: mappedEvents,
      },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });
  }

  async publishEvent(
    projectId: string,
    event: WebhookEvent,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      const hooks = await this.prisma.webhook.findMany({
        where: {
          projectId,
          isActive: true,
          events: {
            has: event,
          },
        },
      });

      if (hooks.length === 0) {
        return;
      }

      await Promise.all(
        hooks.map(async (hook) => {
          const payload: WebhookPayload = {
            event: WEBHOOK_EVENT_NAME_MAP[event],
            project: { id: projectId },
            timestamp: new Date().toISOString(),
            data,
          };

          await this.deliverWithRetry(hook.id, hook.url, hook.secret, hook.timeoutMs, event, payload);
        }),
      );
    } catch (error) {
      logger.error('Error publishing webhook event:', error);
    }
  }

  private async deliverWithRetry(
    webhookId: string,
    webhookUrl: string,
    secret: string | null,
    timeoutMs: number,
    event: WebhookEvent,
    payload: WebhookPayload,
  ): Promise<void> {
    const payloadString = JSON.stringify(payload);
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= MAX_WEBHOOK_ATTEMPTS; attempt++) {
      const started = Date.now();

      try {
        const signature = secret
          ? crypto.createHmac('sha256', secret).update(payloadString).digest('hex')
          : undefined;

        const response = await httpService.postJson(
          webhookUrl,
          payload,
          {
            ...(signature ? { 'X-TestJedi-Signature': `sha256=${signature}` } : {}),
            'X-TestJedi-Event': payload.event,
            'X-TestJedi-Attempt': `${attempt}`,
          },
          timeoutMs,
        );

        const isSuccess = response.statusCode >= 200 && response.statusCode < 300;

        await this.prisma.webhookDelivery.create({
          data: {
            webhookId,
            event,
            attempt,
            status: isSuccess ? 'SUCCESS' : 'FAILED',
            requestBody: payload as any,
            responseCode: response.statusCode,
            responseBody: response.body.substring(0, 5000),
            durationMs: Date.now() - started,
          },
        });

        await this.pruneWebhookLogs(webhookId);

        if (isSuccess) {
          return;
        }

        lastError = `Non-2xx response: ${response.statusCode}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Webhook delivery error';

        await this.prisma.webhookDelivery.create({
          data: {
            webhookId,
            event,
            attempt,
            status: 'FAILED',
            requestBody: payload as any,
            error: lastError,
            durationMs: Date.now() - started,
          },
        });

        await this.pruneWebhookLogs(webhookId);
      }

      if (attempt < MAX_WEBHOOK_ATTEMPTS) {
        const backoffMs = 1000 * (2 ** (attempt - 1));
        await sleep(backoffMs);
      }
    }

    if (lastError) {
      logger.warn(`Webhook ${webhookId} failed after retries: ${lastError}`);
    }
  }

  private async pruneWebhookLogs(webhookId: string): Promise<void> {
    const stale = await this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      skip: 100,
      select: { id: true },
    });

    if (stale.length > 0) {
      await this.prisma.webhookDelivery.deleteMany({
        where: {
          id: {
            in: stale.map((item) => item.id),
          },
        },
      });
    }
  }
}

export default new WebhookService();
