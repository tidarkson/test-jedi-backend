import { getPrisma } from '../config/database';
import { logger } from '../config/logger';
import { LinkRunPrInput } from '../types/integrations';
import httpService from './HttpService';

interface RunMetricsSummary {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  blockedCases: number;
  skippedCases: number;
  passRate: number;
}

export class GitHubService {
  private prisma = getPrisma();
  private baseUrl = 'https://api.github.com';

  /**
   * Link a run to a pull request
   */
  async linkRunToPr(
    projectId: string,
    runId: string,
    input: LinkRunPrInput,
  ) {
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
  async postRunStatus(
    runId: string,
    runStatus: string,
    token: string,
    commitSha: string,
    repository: string,
  ): Promise<void> {
    const state = this.toGithubState(runStatus);
    const description = this.toStatusDescription(runStatus);

    const response = await httpService.postJson(
      `${this.baseUrl}/repos/${repository}/statuses/${commitSha}`,
      {
        state,
        description,
        context: 'TestJedi / Test Run',
        target_url: ``,
      },
      {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'TestJedi-CI',
      },
    );

    if (response.statusCode > 201) {
      logger.warn(`GitHub status post failed for run ${runId}: ${response.statusCode} - ${response.body}`);
    }
  }

  /**
   * Post a review comment on a PR summarising the run result
   */
  async commentOnPr(
    pullRequest: number,
    repository: string,
    token: string,
    runTitle: string,
    metrics: RunMetricsSummary,
    runId: string,
  ): Promise<void> {
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

    const response = await httpService.postJson(
      `${this.baseUrl}/repos/${repository}/issues/${pullRequest}/comments`,
      { body },
      {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'TestJedi-CI',
      },
    );

    if (response.statusCode > 201) {
      logger.warn(`GitHub PR comment failed for PR ${pullRequest}: ${response.statusCode}`);
    }
  }

  /**
   * Called when a run is closed – finds any linked PRs and fires status + comment
   */
  async handleRunClosed(
    projectId: string,
    runId: string,
    runTitle: string,
    runStatus: string,
    metrics: RunMetricsSummary,
    commitSha?: string,
  ): Promise<void> {
    try {
      const links = await this.prisma.runPullRequestLink.findMany({
        where: { projectId, runId },
      });

      if (links.length === 0) return;

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

        if (!token) continue;

        if (isGitHub) {
          if (commitSha) {
            await this.postRunStatus(runId, runStatus, token, commitSha, link.repository);
          }
          await this.commentOnPr(link.pullRequest, link.repository, token, runTitle, metrics, runId);
        } else {
          await this.handleGitLabRunClosed(link.repository, link.pullRequest, token, runTitle, metrics, runId);
        }
      }
    } catch (error) {
      logger.error('Error handling run closed for GitHub/GitLab:', error);
    }
  }

  private async handleGitLabRunClosed(
    repository: string,
    mergeRequestIid: number,
    token: string,
    runTitle: string,
    metrics: RunMetricsSummary,
    runId: string,
  ): Promise<void> {
    const encodedRepo = encodeURIComponent(repository);
    const rows = [
      `Pass: ${metrics.passedCases}/${metrics.totalCases} (${metrics.passRate.toFixed(1)}%)`,
      `Failed: ${metrics.failedCases}  Blocked: ${metrics.blockedCases}  Skipped: ${metrics.skippedCases}`,
    ].join('\n');

    const body = `## TestJedi – ${runTitle}\n\n${rows}\n\n[View Run](${process.env.FRONTEND_URL || ''}/test-runs/${runId})`;

    const response = await httpService.postJson(
      `https://gitlab.com/api/v4/projects/${encodedRepo}/merge_requests/${mergeRequestIid}/notes`,
      { body },
      {
        'PRIVATE-TOKEN': token,
        Accept: 'application/json',
      },
    );

    if (response.statusCode > 201) {
      logger.warn(`GitLab MR comment failed: ${response.statusCode}`);
    }
  }

  /** Maps internal run status to GitHub commit state */
  private toGithubState(runStatus: string): 'pending' | 'success' | 'failure' | 'error' {
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

  private toStatusDescription(runStatus: string): string {
    const map: Record<string, string> = {
      IN_PROGRESS: 'Test run in progress',
      SCHEDULED: 'Test run scheduled',
      COMPLETED: 'All tests completed',
      FAILED: 'Test run failed',
      CANCELLED: 'Test run cancelled',
    };
    return map[runStatus] || runStatus;
  }

  private buildPassRateBar(rate: number): string {
    const filled = Math.round(rate / 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
  }
}

export default new GitHubService();
