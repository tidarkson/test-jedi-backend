"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const errors_1 = require("../types/errors");
const integrations_1 = require("../types/integrations");
const HttpService_1 = __importDefault(require("./HttpService"));
const MAX_WEBHOOK_ATTEMPTS = 3;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class WebhookService {
    constructor() {
        this.prisma = (0, database_1.getPrisma)();
    }
    async registerWebhook(projectId, input) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Project not found');
        }
        const mappedEvents = input.events
            .map((event) => integrations_1.WEBHOOK_EVENT_FROM_NAME[event])
            .filter((event) => Boolean(event));
        if (mappedEvents.length === 0) {
            throw new errors_1.AppError(400, errors_1.ErrorCodes.VALIDATION_FAILED, 'At least one valid webhook event is required');
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
    async publishEvent(projectId, event, data) {
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
            await Promise.all(hooks.map(async (hook) => {
                const payload = {
                    event: integrations_1.WEBHOOK_EVENT_NAME_MAP[event],
                    project: { id: projectId },
                    timestamp: new Date().toISOString(),
                    data,
                };
                await this.deliverWithRetry(hook.id, hook.url, hook.secret, hook.timeoutMs, event, payload);
            }));
        }
        catch (error) {
            logger_1.logger.error('Error publishing webhook event:', error);
        }
    }
    async deliverWithRetry(webhookId, webhookUrl, secret, timeoutMs, event, payload) {
        const payloadString = JSON.stringify(payload);
        let lastError;
        for (let attempt = 1; attempt <= MAX_WEBHOOK_ATTEMPTS; attempt++) {
            const started = Date.now();
            try {
                const signature = secret
                    ? crypto_1.default.createHmac('sha256', secret).update(payloadString).digest('hex')
                    : undefined;
                const response = await HttpService_1.default.postJson(webhookUrl, payload, {
                    ...(signature ? { 'X-TestJedi-Signature': `sha256=${signature}` } : {}),
                    'X-TestJedi-Event': payload.event,
                    'X-TestJedi-Attempt': `${attempt}`,
                }, timeoutMs);
                const isSuccess = response.statusCode >= 200 && response.statusCode < 300;
                await this.prisma.webhookDelivery.create({
                    data: {
                        webhookId,
                        event,
                        attempt,
                        status: isSuccess ? 'SUCCESS' : 'FAILED',
                        requestBody: payload,
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
            }
            catch (error) {
                lastError = error instanceof Error ? error.message : 'Webhook delivery error';
                await this.prisma.webhookDelivery.create({
                    data: {
                        webhookId,
                        event,
                        attempt,
                        status: 'FAILED',
                        requestBody: payload,
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
            logger_1.logger.warn(`Webhook ${webhookId} failed after retries: ${lastError}`);
        }
    }
    async pruneWebhookLogs(webhookId) {
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
exports.WebhookService = WebhookService;
exports.default = new WebhookService();
//# sourceMappingURL=WebhookService.js.map