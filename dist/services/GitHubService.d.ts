import { LinkRunPrInput } from '../types/integrations';
interface RunMetricsSummary {
    totalCases: number;
    passedCases: number;
    failedCases: number;
    blockedCases: number;
    skippedCases: number;
    passRate: number;
}
export declare class GitHubService {
    private prisma;
    private baseUrl;
    /**
     * Link a run to a pull request
     */
    linkRunToPr(projectId: string, runId: string, input: LinkRunPrInput): Promise<{
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
    }>;
    /**
     * Post commit status for run PR while run is ongoing
     */
    postRunStatus(runId: string, runStatus: string, token: string, commitSha: string, repository: string): Promise<void>;
    /**
     * Post a review comment on a PR summarising the run result
     */
    commentOnPr(pullRequest: number, repository: string, token: string, runTitle: string, metrics: RunMetricsSummary, runId: string): Promise<void>;
    /**
     * Called when a run is closed – finds any linked PRs and fires status + comment
     */
    handleRunClosed(projectId: string, runId: string, runTitle: string, runStatus: string, metrics: RunMetricsSummary, commitSha?: string): Promise<void>;
    private handleGitLabRunClosed;
    /** Maps internal run status to GitHub commit state */
    private toGithubState;
    private toStatusDescription;
    private buildPassRateBar;
}
declare const _default: GitHubService;
export default _default;
//# sourceMappingURL=GitHubService.d.ts.map