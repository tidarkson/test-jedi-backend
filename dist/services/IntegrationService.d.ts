import { ConfigureIntegrationInput, NotificationRuleInput } from '../types/integrations';
import { IntegrationProvider } from '@prisma/client';
export declare class IntegrationService {
    private prisma;
    configureIntegration(projectId: string, input: ConfigureIntegrationInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        projectId: string;
        expiresAt: Date | null;
        settings: import("@prisma/client/runtime/library").JsonValue | null;
        isActive: boolean;
        provider: import(".prisma/client").$Enums.IntegrationProvider;
        accessToken: string | null;
        refreshToken: string | null;
    }>;
    listIntegrations(projectId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
        isActive: boolean;
        provider: import(".prisma/client").$Enums.IntegrationProvider;
    }[]>;
    deleteIntegration(projectId: string, provider: IntegrationProvider): Promise<void>;
    listWebhooks(projectId: string): Promise<({
        deliveries: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.WebhookDeliveryStatus;
            event: import(".prisma/client").$Enums.WebhookEvent;
            attempt: number;
            responseCode: number | null;
            durationMs: number | null;
        }[];
    } & {
        name: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        projectId: string;
        url: string;
        isActive: boolean;
        secret: string | null;
        events: import(".prisma/client").$Enums.WebhookEvent[];
        timeoutMs: number;
    })[]>;
    deleteWebhook(projectId: string, webhookId: string): Promise<void>;
    updateWebhook(projectId: string, webhookId: string, data: Partial<{
        url: string;
        name: string;
        secret: string;
        events: string[];
        isActive: boolean;
        timeoutMs: number;
    }>): Promise<{
        name: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        projectId: string;
        url: string;
        isActive: boolean;
        secret: string | null;
        events: import(".prisma/client").$Enums.WebhookEvent[];
        timeoutMs: number;
    }>;
    createNotificationRule(projectId: string, input: NotificationRuleInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        projectId: string;
        settings: import("@prisma/client/runtime/library").JsonValue | null;
        isActive: boolean;
        provider: import(".prisma/client").$Enums.IntegrationProvider;
        channel: string;
        enabledEvents: import(".prisma/client").$Enums.WebhookEvent[];
        failureThreshold: number | null;
    }>;
    listNotificationRules(projectId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        projectId: string;
        settings: import("@prisma/client/runtime/library").JsonValue | null;
        isActive: boolean;
        provider: import(".prisma/client").$Enums.IntegrationProvider;
        channel: string;
        enabledEvents: import(".prisma/client").$Enums.WebhookEvent[];
        failureThreshold: number | null;
    }[]>;
    updateNotificationRule(projectId: string, ruleId: string, input: Partial<NotificationRuleInput>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        projectId: string;
        settings: import("@prisma/client/runtime/library").JsonValue | null;
        isActive: boolean;
        provider: import(".prisma/client").$Enums.IntegrationProvider;
        channel: string;
        enabledEvents: import(".prisma/client").$Enums.WebhookEvent[];
        failureThreshold: number | null;
    }>;
    deleteNotificationRule(projectId: string, ruleId: string): Promise<void>;
    listRunPrLinks(projectId: string, runId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        projectId: string;
        buildNumber: string | null;
        branch: string | null;
        runId: string;
        provider: import(".prisma/client").$Enums.IntegrationProvider;
        repository: string;
        pullRequest: number;
    }[]>;
    private assertProjectExists;
}
declare const _default: IntegrationService;
export default _default;
//# sourceMappingURL=IntegrationService.d.ts.map