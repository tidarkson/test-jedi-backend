"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationImportService = void 0;
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const errors_1 = require("../types/errors");
const TAG_PATTERN = /@caseId:([A-Za-z0-9_-]+)/g;
/**
 * Parse Playwright JSON (standard reporter output)
 */
function parsePlaywright(raw) {
    const results = [];
    const suites = raw['suites'] || [];
    function extractSpecs(suiteArr) {
        for (const suite of suiteArr) {
            if (suite.suites)
                extractSpecs(suite.suites);
            for (const spec of (suite.specs ?? [])) {
                const tags = [];
                const tagMatches = String(spec.title ?? '').matchAll(TAG_PATTERN);
                for (const m of tagMatches)
                    tags.push(m[1]);
                const ok = (spec.tests ?? [])[0]?.results?.[0]?.status === 'passed';
                const err = (spec.tests ?? [])[0]?.results?.[0]?.error?.message;
                results.push({
                    title: spec.title ?? '',
                    status: ok ? 'PASSED' : 'FAILED',
                    tags,
                    error: err,
                });
            }
        }
    }
    extractSpecs(suites);
    const parsed = summarise(results);
    return { source: 'playwright', results, summary: parsed };
}
/**
 * Parse Jest JSON (`--json` output)
 */
function parseJest(raw) {
    const results = [];
    const testResults = raw['testResults'] || [];
    for (const testFile of testResults) {
        for (const assertion of (testFile['assertionResults'] ?? [])) {
            const tags = [];
            const titleFull = [...(assertion['ancestorTitles'] ?? []), assertion['title']].join(' > ');
            const tagMatches = titleFull.matchAll(TAG_PATTERN);
            for (const m of tagMatches)
                tags.push(m[1]);
            results.push({
                title: titleFull,
                status: assertion['status'] === 'passed' ? 'PASSED' : 'FAILED',
                tags,
                error: (assertion['failureMessages'] ?? []).join('\n') || undefined,
            });
        }
    }
    return { source: 'jest', results, summary: summarise(results) };
}
/**
 * Parse Cypress JSON (Mocha-based cypress run --reporter json)
 */
function parseCypress(raw) {
    const results = [];
    const suites = raw['suites'] ?? raw['results'] ?? [];
    function extractTests(node) {
        for (const test of (node['tests'] ?? [])) {
            const tags = [];
            const titleFull = String([...(node['title'] ? [node['title']] : []), test['title']].join(' > ') ?? '');
            const tagMatches = titleFull.matchAll(TAG_PATTERN);
            for (const m of tagMatches)
                tags.push(m[1]);
            results.push({
                title: titleFull,
                status: test['pass'] ? 'PASSED' : test['pending'] ? 'SKIPPED' : 'FAILED',
                tags,
                error: test['err']?.['message'],
            });
        }
        for (const suite of (node['suites'] ?? [])) {
            extractTests(suite);
        }
    }
    if (Array.isArray(suites)) {
        for (const suite of suites)
            extractTests(suite);
    }
    return { source: 'cypress', results, summary: summarise(results) };
}
/**
 * Parse JUnit XML string
 */
function parseJUnit(xmlString) {
    const results = [];
    // Minimal XML parse without a library – sufficient for JUnit format
    const suiteRegex = /<testsuite[^>]*>([\s\S]*?)<\/testsuite>/g;
    const caseRegex = /<testcase\s([^>]*)>([\s\S]*?)<\/testcase>|<testcase\s([^>]*)\/>/g;
    const getAttr = (attrs, key) => {
        const r = new RegExp(`${key}="([^"]*)"`);
        return r.exec(attrs)?.[1] ?? '';
    };
    let suiteMatch;
    while ((suiteMatch = suiteRegex.exec(xmlString)) !== null) {
        const suiteContent = suiteMatch[1];
        let caseMatch;
        caseRegex.lastIndex = 0;
        while ((caseMatch = caseRegex.exec(suiteContent)) !== null) {
            const attrsStr = caseMatch[1] ?? caseMatch[3] ?? '';
            const innerContent = caseMatch[2] ?? '';
            const classname = getAttr(attrsStr, 'classname');
            const name = getAttr(attrsStr, 'name');
            const title = classname ? `${classname}.${name}` : name;
            const tags = [];
            const tagMatches = title.matchAll(TAG_PATTERN);
            for (const m of tagMatches)
                tags.push(m[1]);
            // Also check inner content for @caseId
            const innerTagMatches = innerContent.matchAll(TAG_PATTERN);
            for (const m of innerTagMatches)
                tags.push(m[1]);
            const isFailure = /<failure/.test(innerContent);
            const isSkipped = /<skipped/.test(innerContent);
            const isError = /<error/.test(innerContent);
            const errorMsg = /message="([^"]*)"/.exec(innerContent)?.[1];
            let status = 'PASSED';
            if (isFailure || isError)
                status = 'FAILED';
            else if (isSkipped)
                status = 'SKIPPED';
            results.push({ title, status, tags, error: errorMsg });
        }
    }
    return { source: 'junit', results, summary: summarise(results) };
}
function summarise(results) {
    return {
        total: results.length,
        passed: results.filter((r) => r.status === 'PASSED').length,
        failed: results.filter((r) => r.status === 'FAILED').length,
        skipped: results.filter((r) => r.status === 'SKIPPED').length,
        blocked: results.filter((r) => r.status === 'BLOCKED').length,
    };
}
function detectSource(raw) {
    if (raw['suites'] && raw['config'])
        return 'playwright';
    if (raw['testResults'] && raw['numPassedTests'] !== undefined)
        return 'jest';
    if (raw['stats'] && (raw['suites'] || raw['results']))
        return 'cypress';
    return 'unknown';
}
const STATUS_MAP = {
    PASSED: 'PASSED',
    FAILED: 'FAILED',
    SKIPPED: 'SKIPPED',
    BLOCKED: 'BLOCKED',
};
class AutomationImportService {
    constructor() {
        this.prisma = (0, database_1.getPrisma)();
    }
    /**
     * Accept JSON or JUnit XML, parse, match to RunCase by title or @caseId tag, bulk-update statuses
     */
    async importResults(projectId, runId, rawBody, contentType = 'application/json') {
        // Verify run
        const run = await this.prisma.testRun.findUnique({
            where: { id: runId },
            include: {
                runCases: {
                    include: {
                        testCase: { select: { id: true, title: true, tags: true, externalId: true } },
                    },
                },
            },
        });
        if (!run || run.projectId !== projectId) {
            throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Test run not found');
        }
        // Parse
        let parsed;
        if (typeof rawBody === 'string' && (contentType.includes('xml') || rawBody.trimStart().startsWith('<'))) {
            parsed = parseJUnit(rawBody);
        }
        else {
            const obj = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
            const source = detectSource(obj);
            if (source === 'playwright')
                parsed = parsePlaywright(obj);
            else if (source === 'jest')
                parsed = parseJest(obj);
            else if (source === 'cypress')
                parsed = parseCypress(obj);
            else {
                // Attempt generic {results:[{title,status,...}]} format
                if (Array.isArray(obj['results'])) {
                    parsed = {
                        source: 'unknown',
                        results: obj['results'],
                        summary: summarise(obj['results']),
                    };
                }
                else {
                    throw new errors_1.AppError(400, errors_1.ErrorCodes.INVALID_INPUT, 'Unrecognised automation result format');
                }
            }
        }
        // Build lookup tables for matching
        const caseByTitle = new Map();
        const caseByTag = new Map();
        for (const rc of run.runCases) {
            const titleLower = rc.testCase.title.toLowerCase().trim();
            caseByTitle.set(titleLower, { runCaseId: rc.id, caseId: rc.caseId });
            if (rc.testCase.externalId) {
                caseByTag.set(rc.testCase.externalId.toLowerCase(), { runCaseId: rc.id, caseId: rc.caseId });
            }
            const tagJson = rc.testCase.tags;
            if (tagJson) {
                const tagArr = Array.isArray(tagJson) ? tagJson : (typeof tagJson === 'string' ? JSON.parse(tagJson) : []);
                for (const t of tagArr) {
                    caseByTag.set(String(t).toLowerCase(), { runCaseId: rc.id, caseId: rc.caseId });
                }
            }
        }
        let matched = 0;
        const unmatched = [];
        const updates = [];
        for (const result of parsed.results) {
            let found;
            // 1. Match by @caseId tag
            for (const tag of (result.tags ?? [])) {
                found = caseByTag.get(tag.toLowerCase());
                if (found)
                    break;
            }
            // 2. Match by title
            if (!found) {
                found = caseByTitle.get(result.title.toLowerCase().trim());
            }
            if (found) {
                matched++;
                const rcStatus = STATUS_MAP[result.status] ?? 'NOT_RUN';
                updates.push({ runCaseId: found.runCaseId, status: rcStatus });
            }
            else {
                unmatched.push(result.title);
                logger_1.logger.warn(`AutoImport: no match for "${result.title}"`);
            }
        }
        // Bulk update
        for (const u of updates) {
            await this.prisma.runCase.update({
                where: { id: u.runCaseId },
                data: {
                    status: u.status,
                    executionType: 'AUTOMATED',
                    completedAt: ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'].includes(u.status) ? new Date() : undefined,
                },
            });
        }
        // Record import metadata
        const importRecord = await this.prisma.automationImport.create({
            data: {
                projectId,
                runId,
                source: parsed.source,
                matchedBy: 'title|tag',
                totalResults: parsed.results.length,
                matchedCases: matched,
                unmatched: unmatched.length > 0 ? unmatched : undefined,
                rawPayload: typeof rawBody === 'string' ? undefined : rawBody,
            },
        });
        return {
            importId: importRecord.id,
            source: parsed.source,
            totalResults: parsed.results.length,
            matched,
            unmatched: unmatched.length,
            unmatchedTitles: unmatched,
            summary: parsed.summary,
        };
    }
}
exports.AutomationImportService = AutomationImportService;
exports.default = new AutomationImportService();
//# sourceMappingURL=AutomationImportService.js.map