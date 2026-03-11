"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubService = void 0;
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const HttpService_1 = __importDefault(require("./HttpService"));
class GitHubService {
    constructor() {
        this.prisma = (0, database_1.getPrisma)();
        this.baseUrl = 'https://api.github.com';
    }
    /**
     * Link a run to a pull request
     */
    async linkRunToPr(projectId, runId, input) {
        return this.prisma.runPullRequestLink.create({
            data: {
                projectId,
                runId,
                provider: input.provider,
                repository: input.repository,
                pullRequest: input.pullRequest,
                branch: input.branch,
                buildNumber: input.buildNumber,
            },
        });
    }
    /**
     * Post commit status for run PR while run is ongoing
     */
    async postRunStatus(runId, runStatus, token, commitSha, repository) {
        const state = this.toGithubState(runStatus);
        const description = this.toStatusDescription(runStatus);
        const response = await HttpService_1.default.postJson(`${this.baseUrl}/repos/${repository}/statuses/${commitSha}`, {
            state,
            description,
            context: 'TestJedi / Test Run',
            target_url: ``,
        }, {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'TestJedi-CI',
        });
        if (response.statusCode > 201) {
            logger_1.logger.warn(`GitHub status post failed for run ${runId}: ${response.statusCode} - ${response.body}`);
        }
    }
    /**
     * Post a review comment on a PR summarising the run result
     */
    async commentOnPr(pullRequest, repository, token, runTitle, metrics, runId) {
        const rows = [
            `| Status | Count |`,
            `|--------|-------|`,
            `| ✅ Passed | ${metrics.passedCases} |`,
            `| ❌ Failed | ${metrics.failedCases} |`,
            `| 🚫 Blocked | ${metrics.blockedCases} |`,
            `| ⏭️ Skipped | ${metrics.skippedCases} |`,
            `| **Total** | **${metrics.totalCases}** |`,
        ].join('\n');
        const bar = this.buildPassRateBar(metrics.passRate);
        const passRatePct = metrics.passRate.toFixed(1);
        const body = [
            `## 🧪 TestJedi – Run Complete: ${runTitle}`,
            ``,
            `**Pass Rate:** ${bar} ${passRatePct}%`,
            ``,
            rows,
            ``,
            `[View Run Details →](${process.env.FRONTEND_URL || ''}/test-runs/${runId})`,
        ].join('\n');
        const response = await HttpService_1.default.postJson(`${this.baseUrl}/repos/${repository}/issues/${pullRequest}/comments`, { body }, {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'TestJedi-CI',
        });
        if (response.statusCode > 201) {
            logger_1.logger.warn(`GitHub PR comment failed for PR ${pullRequest}: ${response.statusCode}`);
        }
    }
    /**
     * Called when a run is closed – finds any linked PRs and fires status + comment
     */
    async handleRunClosed(projectId, runId, runTitle, runStatus, metrics, commitSha) {
        try {
            const links = await this.prisma.runPullRequestLink.findMany({
                where: { projectId, runId },
            });
            if (links.length === 0)
                return;
            const conn = await this.prisma.integrationConnection.findUnique({
                where: { projectId_provider: { projectId, provider: 'GITHUB' } },
            });
            const gitlabConn = await this.prisma.integrationConnection.findUnique({
                where: { projectId_provider: { projectId, provider: 'GITLAB' } },
            });
            for (const link of links) {
                const isGitHub = link.provider === 'GITHUB';
                const token = isGitHub
                    ? (conn?.accessToken || '')
                    : (gitlabConn?.accessToken || '');
                if (!token)
                    continue;
                if (isGitHub) {
                    if (commitSha) {
                        await this.postRunStatus(runId, runStatus, token, commitSha, link.repository);
                    }
                    await this.commentOnPr(link.pullRequest, link.repository, token, runTitle, metrics, runId);
                }
                else {
                    await this.handleGitLabRunClosed(link.repository, link.pullRequest, token, runTitle, metrics, runId);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error handling run closed for GitHub/GitLab:', error);
        }
    }
    async handleGitLabRunClosed(repository, mergeRequestIid, token, runTitle, metrics, runId) {
        const encodedRepo = encodeURIComponent(repository);
        const rows = [
            `Pass: ${metrics.passedCases}/${metrics.totalCases} (${metrics.passRate.toFixed(1)}%)`,
            `Failed: ${metrics.failedCases}  Blocked: ${metrics.blockedCases}  Skipped: ${metrics.skippedCases}`,
        ].join('\n');
        const body = `## TestJedi – ${runTitle}\n\n${rows}\n\n[View Run](${process.env.FRONTEND_URL || ''}/test-runs/${runId})`;
        const response = await HttpService_1.default.postJson(`https://gitlab.com/api/v4/projects/${encodedRepo}/merge_requests/${mergeRequestIid}/notes`, { body }, {
            'PRIVATE-TOKEN': token,
            Accept: 'application/json',
        });
        if (response.statusCode > 201) {
            logger_1.logger.warn(`GitLab MR comment failed: ${response.statusCode}`);
        }
    }
    /** Maps internal run status to GitHub commit state */
    toGithubState(runStatus) {
        switch (runStatus) {
            case 'IN_PROGRESS':
            case 'SCHEDULED':
                return 'pending';
            case 'COMPLETED':
                return 'success';
            case 'FAILED':
            case 'CANCELLED':
                return 'failure';
            default:
                return 'error';
        }
    }
    toStatusDescription(runStatus) {
        const map = {
            IN_PROGRESS: 'Test run in progress',
            SCHEDULED: 'Test run scheduled',
            COMPLETED: 'All tests completed',
            FAILED: 'Test run failed',
            CANCELLED: 'Test run cancelled',
        };
        return map[runStatus] || runStatus;
    }
    buildPassRateBar(rate) {
        const filled = Math.round(rate / 10);
        return '█'.repeat(filled) + '░'.repeat(10 - filled);
    }
}
exports.GitHubService = GitHubService;
exports.default = new GitHubService();
//# sourceMappingURL=GitHubService.js.map