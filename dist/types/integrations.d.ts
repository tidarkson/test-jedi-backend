import { IntegrationProvider, WebhookEvent } from '@prisma/client';
export declare const WEBHOOK_EVENT_NAME_MAP: Record<WebhookEvent, string>;
export declare const WEBHOOK_EVENT_FROM_NAME: Record<string, WebhookEvent>;
export interface WebhookPayload {
    event: string;
    project: {
        id: string;
    };
    timestamp: string;
    data: Record<string, unknown>;
}
export interface RegisterWebhookInput {
    url: string;
    name?: string;
    secret?: string;
    timeoutMs?: number;
    events: string[];
}
export interface ConfigureIntegrationInput {
    provider: IntegrationProvider;
    settings?: Record<string, unknown>;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string;
    isActive?: boolean;
}
export interface LinkRunPrInput {
    provider: IntegrationProvider;
    repository: string;
    pullRequest: number;
    branch?: string;
    buildNumber?: string;
}
export interface NotificationRuleInput {
    provider: IntegrationProvider;
    channel: string;
    enabledEvents: string[];
    failureThreshold?: number;
    settings?: Record<string, unknown>;
    isActive?: boolean;
}
export interface ImportResultCase {
    title: string;
    status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'BLOCKED';
    tags?: string[];
    error?: string;
}
export interface ImportResultSummary {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    blocked: number;
}
export interface ParsedImportResults {
    source: 'playwright' | 'jest' | 'cypress' | 'junit' | 'unknown';
    results: ImportResultCase[];
    summary: ImportResultSummary;
}
//# sourceMappingURL=integrations.d.ts.map