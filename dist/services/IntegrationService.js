"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationService = void 0;
const database_1 = require("../config/database");
const errors_1 = require("../types/errors");
const integrations_1 = require("../types/integrations");
class IntegrationService {
    constructor() {
        this.prisma = (0, database_1.getPrisma)();
    }
    // ─── Integration connection management ────────────────────────────────────
    async configureIntegration(projectId, input) {
        await this.assertProjectExists(projectId);
        return this.prisma.integrationConnection.upsert({
            where: { projectId_provider: { projectId, provider: input.provider } },
            create: {
                projectId,
                provider: input.provider,
                accessToken: input.accessToken,
                refreshToken: input.refreshToken,
                expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
                settings: input.settings,
                isActive: input.isActive ?? true,
            },
            update: {
                accessToken: input.accessToken,
                refreshToken: input.refreshToken,
                expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
                settings: input.settings,
                isActive: input.isActive ?? true,
            },
        });
    }
    async listIntegrations(projectId) {
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
    async deleteIntegration(projectId, provider) {
        await this.assertProjectExists(projectId);
        const conn = await this.prisma.integrationConnection.findUnique({
            where: { projectId_provider: { projectId, provider } },
        });
        if (!conn) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Integration not found');
        }
        await this.prisma.integrationConnection.delete({
            where: { projectId_provider: { projectId, provider } },
        });
    }
    // ─── Webhook management ────────────────────────────────────────────────────
    async listWebhooks(projectId) {
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
    async deleteWebhook(projectId, webhookId) {
        const hook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
        if (!hook || hook.projectId !== projectId) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Webhook not found');
        }
        await this.prisma.webhook.delete({ where: { id: webhookId } });
    }
    async updateWebhook(projectId, webhookId, data) {
        const hook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
        if (!hook || hook.projectId !== projectId) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Webhook not found');
        }
        const mappedEvents = data.events
            ?.map((e) => integrations_1.WEBHOOK_EVENT_FROM_NAME[e])
            .filter((e) => Boolean(e));
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
    async createNotificationRule(projectId, input) {
        await this.assertProjectExists(projectId);
        const mappedEvents = input.enabledEvents
            .map((e) => integrations_1.WEBHOOK_EVENT_FROM_NAME[e])
            .filter((e) => Boolean(e));
        return this.prisma.notificationRule.create({
            data: {
                projectId,
                provider: input.provider,
                channel: input.channel,
                enabledEvents: mappedEvents,
                failureThreshold: input.failureThreshold,
                settings: input.settings,
                isActive: input.isActive ?? true,
            },
        });
    }
    async listNotificationRules(projectId) {
        await this.assertProjectExists(projectId);
        return this.prisma.notificationRule.findMany({ where: { projectId } });
    }
    async updateNotificationRule(projectId, ruleId, input) {
        const rule = await this.prisma.notificationRule.findUnique({ where: { id: ruleId } });
        if (!rule || rule.projectId !== projectId) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Notification rule not found');
        }
        const mappedEvents = input.enabledEvents
            ?.map((e) => integrations_1.WEBHOOK_EVENT_FROM_NAME[e])
            .filter((e) => Boolean(e));
        return this.prisma.notificationRule.update({
            where: { id: ruleId },
            data: {
                ...(input.provider && { provider: input.provider }),
                ...(input.channel && { channel: input.channel }),
                ...(mappedEvents && { enabledEvents: mappedEvents }),
                ...(input.failureThreshold !== undefined && { failureThreshold: input.failureThreshold }),
                ...(input.settings && { settings: input.settings }),
                ...(input.isActive !== undefined && { isActive: input.isActive }),
            },
        });
    }
    async deleteNotificationRule(projectId, ruleId) {
        const rule = await this.prisma.notificationRule.findUnique({ where: { id: ruleId } });
        if (!rule || rule.projectId !== projectId) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Notification rule not found');
        }
        await this.prisma.notificationRule.delete({ where: { id: ruleId } });
    }
    // ─── PR link management ────────────────────────────────────────────────────
    async listRunPrLinks(projectId, runId) {
        return this.prisma.runPullRequestLink.findMany({
            where: { projectId, runId },
        });
    }
    // ─── Helpers ──────────────────────────────────────────────────────────────
    async assertProjectExists(projectId) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Project not found');
        }
    }
}
exports.IntegrationService = IntegrationService;
exports.default = new IntegrationService();
//# sourceMappingURL=IntegrationService.js.map