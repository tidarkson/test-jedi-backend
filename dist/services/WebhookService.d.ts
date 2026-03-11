import { RegisterWebhookInput } from '../types/integrations';
import { WebhookEvent } from '@prisma/client';
export declare class WebhookService {
    private prisma;
    registerWebhook(projectId: string, input: RegisterWebhookInput): Promise<{
        deliveries: {
            error: string | null;
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.WebhookDeliveryStatus;
            webhookId: string;
            event: import(".prisma/client").$Enums.WebhookEvent;
            attempt: number;
            requestBody: import("@prisma/client/runtime/library").JsonValue;
            responseCode: number | null;
            responseBody: string | null;
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
    }>;
    publishEvent(projectId: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void>;
    private deliverWithRetry;
    private pruneWebhookLogs;
}
declare const _default: WebhookService;
export default _default;
//# sourceMappingURL=WebhookService.d.ts.map