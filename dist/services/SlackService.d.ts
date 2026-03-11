import { WebhookEvent } from '@prisma/client';
interface RunSummary {
    id: string;
    title: string;
    environment: string;
    status?: string;
    totalCases?: number;
    passedCases?: number;
    failedCases?: number;
    passRate?: number;
}
export declare class SlackService {
    private prisma;
    /**
     * Dispatch a Slack notification for a given project event
     */
    notifyEvent(projectId: string, event: WebhookEvent, run: RunSummary, extra?: Record<string, unknown>): Promise<void>;
    /**
     * Check failure threshold rule and notify if exceeded
     */
    checkFailureThreshold(projectId: string, run: RunSummary): Promise<void>;
    private buildBlocks;
    private buildTeamsCard;
    private plainTextSummary;
}
declare const _default: SlackService;
export default _default;
//# sourceMappingURL=SlackService.d.ts.map