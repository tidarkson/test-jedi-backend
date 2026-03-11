interface JiraIssueResult {
    id: string;
    key: string;
    self: string;
    url: string;
}
export declare class JiraService {
    private prisma;
    /**
     * Begin OAuth2 redirect URL for Jira Atlassian connection
     */
    getConnectUrl(projectId: string): string;
    /**
     * Exchange authorization code for tokens and store the connection
     */
    handleCallback(code: string, projectId: string): Promise<void>;
    /**
     * Auto-create a Jira issue when a test case fails - stores externalId on RunCase
     */
    createIssueForFailedCase(projectId: string, runCaseId: string, caseTitle: string, runTitle: string, runId: string, errorDetail?: string): Promise<JiraIssueResult | null>;
    /**
     * Handle Jira webhook - sync status changes back to defect
     */
    syncIssueStatusWebhook(payload: Record<string, unknown>): Promise<void>;
    private getValidToken;
}
declare const _default: JiraService;
export default _default;
//# sourceMappingURL=JiraService.d.ts.map