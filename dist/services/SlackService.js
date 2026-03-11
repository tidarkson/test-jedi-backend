"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackService = void 0;
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const HttpService_1 = __importDefault(require("./HttpService"));
class SlackService {
    constructor() {
        this.prisma = (0, database_1.getPrisma)();
    }
    /**
     * Dispatch a Slack notification for a given project event
     */
    async notifyEvent(projectId, event, run, extra) {
        try {
            const rules = await this.prisma.notificationRule.findMany({
                where: {
                    projectId,
                    isActive: true,
                    enabledEvents: { has: event },
                    provider: { in: ['SLACK', 'TEAMS'] },
                },
            });
            if (rules.length === 0)
                return;
            await Promise.all(rules.map(async (rule) => {
                const blocks = this.buildBlocks(event, run, extra);
                const payload = rule.provider === 'SLACK'
                    ? { blocks, text: this.plainTextSummary(event, run) }
                    : this.buildTeamsCard(event, run, extra);
                const conn = await this.prisma.integrationConnection.findUnique({
                    where: { projectId_provider: { projectId, provider: rule.provider } },
                });
                let webhookUrl = null;
                if (conn?.settings) {
                    webhookUrl = conn.settings['webhookUrl'] ?? null;
                }
                if (!webhookUrl) {
                    // Fall back to globally configured Slack bot token + channel in the rule
                    const token = (conn?.accessToken) || rule.settings?.['botToken'] || null;
                    if (!token) {
                        logger_1.logger.warn(`No Slack/Teams webhook URL or token for project ${projectId}`);
                        return;
                    }
                    const response = await HttpService_1.default.postJson('https://slack.com/api/chat.postMessage', {
                        channel: rule.channel,
                        blocks,
                        text: this.plainTextSummary(event, run),
                    }, {
                        Authorization: `Bearer ${token}`,
                    });
                    if (response.statusCode !== 200) {
                        logger_1.logger.warn(`Slack notification failed (${response.statusCode}): ${response.body}`);
                    }
                    return;
                }
                // Incoming Webhook URL delivery
                const response = await HttpService_1.default.postJson(webhookUrl, payload);
                if (response.statusCode !== 200 && response.statusCode !== 202) {
                    logger_1.logger.warn(`${rule.provider} notification failed (${response.statusCode})`);
                }
            }));
        }
        catch (error) {
            logger_1.logger.error('Error sending Slack/Teams notification:', error);
        }
    }
    /**
     * Check failure threshold rule and notify if exceeded
     */
    async checkFailureThreshold(projectId, run) {
        if (run.passRate === undefined || run.totalCases === undefined)
            return;
        const failureRate = 100 - run.passRate;
        const rules = await this.prisma.notificationRule.findMany({
            where: {
                projectId,
                isActive: true,
                failureThreshold: { not: null },
            },
        });
        for (const rule of rules) {
            if (rule.failureThreshold !== null && failureRate >= rule.failureThreshold) {
                await this.notifyEvent(projectId, 'RUN_CLOSED', run, {
                    alert: `Failure rate ${failureRate.toFixed(1)}% exceeded threshold of ${rule.failureThreshold}%`,
                });
            }
        }
    }
    buildBlocks(event, run, extra) {
        const eventLabel = {
            RUN_CREATED: '🚀 Test Run Started',
            RUN_CLOSED: '🏁 Test Run Completed',
            CASE_FAILED: '❌ Test Case Failed',
            PLAN_APPROVED: '✅ Test Plan Approved',
            DEFECT_CREATED: '🐛 Defect Created',
        };
        const headerText = eventLabel[event] || event;
        const frontendUrl = process.env.FRONTEND_URL || '';
        const blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: headerText, emoji: true },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Run:* ${run.title}\n*Environment:* ${run.environment}`,
                },
            },
        ];
        if (run.totalCases !== undefined) {
            const passed = run.passedCases ?? 0;
            const failed = run.failedCases ?? 0;
            const total = run.totalCases;
            const rate = run.passRate?.toFixed(1) ?? '0';
            blocks.push({
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Total:* ${total}` },
                    { type: 'mrkdwn', text: `*Pass Rate:* ${rate}%` },
                    { type: 'mrkdwn', text: `*Passed:* ${passed}` },
                    { type: 'mrkdwn', text: `*Failed:* ${failed}` },
                ],
            });
        }
        if (extra?.['alert']) {
            blocks.push({
                type: 'section',
                text: { type: 'mrkdwn', text: `⚠️ *Alert:* ${extra['alert']}` },
            });
        }
        blocks.push({
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: { type: 'plain_text', text: 'View Run', emoji: true },
                    url: `${frontendUrl}/test-runs/${run.id}`,
                    action_id: 'view_run',
                },
                ...(run.failedCases && run.failedCases > 0
                    ? [{
                            type: 'button',
                            text: { type: 'plain_text', text: 'View Failures', emoji: true },
                            url: `${frontendUrl}/test-runs/${run.id}?filter=FAILED`,
                            action_id: 'view_failures',
                            style: 'danger',
                        }]
                    : []),
            ],
        });
        return blocks;
    }
    buildTeamsCard(event, run, extra) {
        const frontendUrl = process.env.FRONTEND_URL || '';
        const facts = [
            { name: 'Run', value: run.title },
            { name: 'Environment', value: run.environment },
        ];
        if (run.totalCases !== undefined) {
            facts.push({ name: 'Total', value: `${run.totalCases}` }, { name: 'Pass Rate', value: `${run.passRate?.toFixed(1) ?? 0}%` }, { name: 'Passed', value: `${run.passedCases ?? 0}` }, { name: 'Failed', value: `${run.failedCases ?? 0}` });
        }
        if (extra?.['alert']) {
            facts.push({ name: 'Alert', value: String(extra['alert']) });
        }
        return {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: run.failedCases && run.failedCases > 0 ? 'FF0000' : '28a745',
            summary: `TestJedi – ${event}`,
            sections: [{
                    activityTitle: `TestJedi – ${event.replace('_', ' ')}`,
                    activityText: run.title,
                    facts,
                }],
            potentialAction: [
                {
                    '@type': 'OpenUri',
                    name: 'View Run',
                    targets: [{ os: 'default', uri: `${frontendUrl}/test-runs/${run.id}` }],
                },
            ],
        };
    }
    plainTextSummary(event, run) {
        return `${event.replace('_', ' ')}: ${run.title} [${run.environment}]`;
    }
}
exports.SlackService = SlackService;
exports.default = new SlackService();
//# sourceMappingURL=SlackService.js.map