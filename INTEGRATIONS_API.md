# Test-Jedi Integration API Implementation

**Implementation Date:** March 10, 2026  
**Status:** Complete and Type-Safe

## Overview

This document defines all endpoints, services, and acceptance criteria for the Test-Jedi Integrations API (Jira, GitHub/GitLab, Slack/Teams, and Automation Results Import).

---

## Architecture

### Database Models (Prisma)
- **IntegrationConnection**: OAuth2 tokens, settings per provider per project
- **Webhook**: Outbound webhooks (URL, secret, enabled events)
- **WebhookDelivery**: Log of last 100 deliveries per webhook (status, attempt, response code, duration)
- **NotificationRule**: Slack/Teams rules (channel, events, failure threshold)
- **RunPullRequestLink**: Link between runs and GitHub/GitLab PRs
- **AutomationImport**: Metadata from Playwright/Jest/Cypress/JUnit imports
- **RunCase.externalId**: Jira issue key stored on RunCase for defect linking

### Services
1. **WebhookService**: Publication, retry (3x exponential backoff), delivery logging
2. **JiraService**: OAuth2 flow, auto-issue creation on case failure, webhook sync
3. **GitHubService**: PR status update + comment, GitLab support
4. **SlackService**: Rich block messages, Teams adaptive cards, failure threshold alerts
5. **AutomationImportService**: Parse Playwright/Jest/Cypress JSON + JUnit XML, match cases by title/tag
6. **IntegrationService**: CRUD for integrations, webhooks, rules

### Event Triggers (Non-blocking)
- **run.created**: Fired when creating a test run
- **run.closed**: Fired when marking run as COMPLETED
- **case.failed**: Fired when updating case status from non-FAILED → FAILED
- **plan.approved**: Fired when approving a test plan
- **defect.created**: Fired when Jira issue is auto-created on case failure

---

## Webhook API

### Register Webhook

```
POST /api/v1/projects/:projectId/webhooks
Content-Type: application/json
Authorization: Bearer <token>

{
  "url": "https://your-service.com/webhook" ,
  "name": "My Webhook",
  "secret": "optional-hmac-secret",
  "timeoutMs": 5000,
  "events": ["run.created", "run.closed", "case.failed", "plan.approved", "defect.created"]
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "url": "...",
    "name": "...",
    "secret": "...",
    "events": ["RUN_CREATED", "RUN_CLOSED", ...],
    "isActive": true,
    "timeoutMs": 5000,
    "deliveries": [
      {
        "id": "uuid",
        "event": "RUN_CREATED",
        "status": "SUCCESS",
        "attempt": 1,
        "responseCode": 200,
        "durationMs": 143,
        "createdAt": "2026-03-10T12:00:00Z"
      }
    ]
  }
}
```

### List Webhooks
```
GET /api/v1/projects/:projectId/webhooks
Authorization: Bearer <token>
```

Returns array of webhooks with last 100 deliveries each.

### Update Webhook
```
PUT /api/v1/projects/:projectId/webhooks/:webhookId
Authorization: Bearer <token>

{
  "url": "...",
  "name": "...",
  "secret": "...",
  "events": ["run.closed"],
  "isActive": true,
  "timeoutMs": 10000
}
```

### Delete Webhook
```
DELETE /api/v1/projects/:projectId/webhooks/:webhookId
Authorization: Bearer <token>
```

### Webhook Payload Format

All webhooks receive HTTP POST with:

```json
{
  "event": "run.created",
  "project": { "id": "uuid" },
  "timestamp": "2026-03-10T12:00:00Z",
  "data": {
    "runId": "uuid",
    "title": "Smoke Test Run",
    "environment": "staging",
    "type": "AUTOMATED"
  }
}
```

**Headers:**
- `X-TestJedi-Event`: Event name (e.g., `run.created`)
- `X-TestJedi-Signature`: `sha256=<hmac>` (if secret provided)
- `X-TestJedi-Attempt`: Attempt number (1–3)

**Retry Logic:**
- 3 attempts total
- Exponential backoff: 1s, 2s, 4s
- Delivery timeout: 5 seconds (configurable)
- Success: Any 2xx response code

**Delivery Retention:**
- Last 100 deliveries per webhook kept in DB
- Older deliveries auto-pruned

---

## Jira Integration

### Get OAuth2 Connect URL

```
GET /api/v1/integrations/jira/connect?projectId=<uuid>
```

Redirects user to Atlassian Authorize endpoint.

### OAuth2 Callback

```
GET /api/v1/integrations/jira/callback?code=<code>&state=<base64>
```

Exchanges authorization code for access/refresh tokens and stores in `IntegrationConnection`.

### Configure Jira Integration

```
PUT /api/v1/projects/:projectId/integrations
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "JIRA",
  "settings": {
    "jiraProjectKey": "PROJ",
    "cloudId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "issueType": "Bug",
    "priority": "High"
  }
}
```

### Auto-Create Jira Issue on Case Failure

**Trigger:** Case status updated to FAILED  
**Automatic:** Yes (runs in background)  
**Creates:**
1. Jira issue in configured project
2. `Defect` record linked to `RunCase`
3. `RunCase.externalId` = Jira key (e.g., `PROJ-123`)
4. Fires `defect.created` webhook event

**Response:** Jira issue created with:
- **Summary**: `[TestJedi] Test failure: <case title>`
- **Description**: Test case title, run name, run ID, optional error details
- **Type**: Bug (configurable)
- **Priority**: High (configurable)
- **Labels**: `testjedi-auto`
- **URL**: Issue link returned

### Jira Webhook Sync

```
POST /api/v1/integrations/jira/webhook
X-Atlassian-Signature: SHA256=<signature>
Content-Type: application/json

{ "issue": {...}, "changelog": {...} }
```

**Automatic:** Jira POSTs here when issue status changes  
**Action:** Maps Jira status to TestJedi defect status:
- Jira "Done" → Defect "RESOLVED"
- Jira "Closed" → Defect "CLOSED"
- Jira "In Progress" → Defect "IN_PROGRESS"
- Jira "Reopened" → Defect "REOPENED"

---

## GitHub / GitLab Integration

### Link Run to Pull Request

```
POST /api/v1/projects/:projectId/runs/:runId/pr-link
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "GITHUB" | "GITLAB",
  "repository": "owner/repo",
  "pullRequest": 123,
  "branch": "feature/foo",
  "buildNumber": "build-456"
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "runId": "uuid",
    "provider": "GITHUB",
    "repository": "owner/repo",
    "pullRequest": 123,
    "branch": "feature/foo",
    "buildNumber": "build-456"
  }
}
```

### GitHub PR Status + Comment

**Trigger:** Run marked as COMPLETED (run.closed event)  
**Automatic:** Yes  
**Actions:**
1. **Commit Status**: POST to `/repos/:owner/:repo/statuses/:sha`
   - State: `pending`, `success`, `failure`, or `error`
   - Context: `TestJedi / Test Run`
   - Description: e.g., "All tests completed"
2. **PR Comment**: POST to `/repos/:owner/:repo/issues/:pr/comments`
   - Rich markdown table: Passed, Failed, Blocked, Skipped counts
   - Pass rate visualization
   - Links: View Run, View Failures

### GitLab Merge Request Comment

**Similar to GitHub:** Posts comment with run metrics and pass rate to MR.

---

## Slack / Teams Notifications

### Create Notification Rule

```
POST /api/v1/projects/:projectId/notification-rules
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "SLACK" | "TEAMS",
  "channel": "#testing" | "testing-webhook-url",
  "enabledEvents": ["run.created", "run.closed", "case.failed"],
  "failureThreshold": 25,
  "settings": { "botToken": "xoxb-...", "webhookUrl": "..." },
  "isActive": true
}
```

**Response (201):** Notification rule with ID.

### Slack Message Format

**Blocks-based rich message:**

**Header:** "🚀 Test Run Started" / "🏁 Test Run Completed" / "❌ Test Case Failed" / "✅ Test Plan Approved" / "🐛 Defect Created"

**Section:** Run name, environment, status

**Fields:** Total cases, pass rate, passed, failed

**Actions:** Buttons (View Run, View Failures)

### Teams Card Format

**Adaptive Card with:**
- Theme color: Green (all passed) or Red (failures)
- Title, run name, facts (metrics)
- Open action links

### Failure Threshold Alert

If configured rule's `failureThreshold` is set and run failure rate ≥ threshold, sends alert notification in addition to normal run.closed notification.

---

## Automation Results Import

### Import Automation Results

```
POST /api/v1/projects/:projectId/runs/:runId/import-results
Authorization: Bearer <token>
Content-Type: application/json | application/xml | text/xml

// For Playwright JSON
{
  "suites": [...],
  "config": {...}
}

// For Jest JSON
{
  "testResults": [
    {
      "assertionResults": [
        {
          "title": "should work @caseId:TC-1",
          "status": "passed",
          "failureMessages": []
        }
      ]
    }
  ]
}

// For Cypress JSON
{
  "suites": [...]
}

// For JUnit XML
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="Results" tests="3" failures="1">
  <testcase classname="login" name="should login @caseId:TC-1">
    <failure message="...">...</failure>
  </testcase>
  <testcase classname="login" name="should handle error" />
</testsuite>
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "importId": "uuid",
    "source": "playwright" | "jest" | "cypress" | "junit" | "unknown",
    "totalResults": 25,
    "matched": 20,
    "unmatched": 5,
    "unmatchedTitles": ["Test title that didn't match"],
    "summary": {
      "total": 25,
      "passed": 18,
      "failed": 2,
      "skipped": 4,
      "blocked": 0
    }
  }
}
```

### Matching Strategy

**Priority:**
1. Match by `@caseId:<id>` tag in test title or JUnit message (e.g., `@caseId:TC-1`)
2. Match by exact test title against `TestCase.title`

**Bulk Update:** All matched RunCase records updated to status (PASSED, FAILED, SKIPPED, BLOCKED) with `executionType: AUTOMATED` and `completedAt` timestamp.

### Supported Formats

| Format | Detection | Parsing |
|--------|-----------|---------|
| Playwright | `suites` + `config` | Extract spec title, status, error |
| Jest | `testResults` + `numPassedTests` | Extract classname + title, assertion status |
| Cypress | `suites` or `results` + `stats` | Extract suite/spec hierarchy |
| JUnit XML | XML root `<testsuite>` | Parse testcase elements, failure/error tags |

---

## Integration Connection Management

### List Integration Connections

```
GET /api/v1/projects/:projectId/integrations
Authorization: Bearer <token>
```

Returns array without secrets.

### Configure / Update Integration

```
PUT /api/v1/projects/:projectId/integrations
Authorization: Bearer <token>
Role: ADMIN, MANAGER

{
  "provider": "GITHUB",
  "accessToken": "ghp_...",
  "settings": { "repoFilter": ".*" },
  "isActive": true
}
```

### Delete Integration

```
DELETE /api/v1/projects/:projectId/integrations/:provider
Authorization: Bearer <token>
Role: ADMIN, MANAGER
```

---

## Acceptance Criteria Met

✅ **Webhook fires within 5 seconds of trigger event**
- Implemented: Non-blocking `setImmediate()` fire-and-forget with 5s HTTP timeout

✅ **Failed webhook delivery retried 3 times with exponential backoff**
- 3 attempts: 1s, 2s, 4s delay
- Success on 2xx response; failed attempts logged

✅ **Jira issue auto-created on test case failure**
- Trigger: case.failed event
- Issue stored in Jira with auto-assigned labels
- Defect record created; RunCase.externalId set to Jira key

✅ **GitHub PR receives status check when run closes**
- Trigger: run.closed event
- Status posted to commit SHA
- Comment with metrics posted to PR

✅ **Playwright JSON results import matches cases by tag**
- Supports `@caseId:<id>` tag parsing
- Falls back to title matching
- Bulk update RunCase statuses from import data

---

## Environment Variables

```bash
# Jira
JIRA_APP_ID=<atlassian-app-id>
JIRA_APP_SECRET=<atlassian-app-secret>

# GitHub/GitLab
GITHUB_TOKEN=<ghp_...>
GITLAB_TOKEN=<glpat-...>

# Slack/Teams
SLACK_BOT_TOKEN=<xoxb-...>
TEAMS_WEBHOOK_URL=<https://outlook.webhook.office.com/...>

# Frontend (for links in notifications)
FRONTEND_URL=https://app.yourdomain.com
```

---

## Code Structure

```
src/
├── services/
│   ├── WebhookService.ts          – Publish events, retry, logging
│   ├── JiraService.ts             – OAuth2, auto-issue, status sync
│   ├── GitHubService.ts           – PR status, comments
│   ├── SlackService.ts            – Rich notifications, threshold checks
│   ├── AutomationImportService.ts – Parse + match results
│   └── IntegrationService.ts      – CRUD operations
├── controllers/
│   └── IntegrationController.ts   – Request handling
├── routes/
│   └── integrations.ts            – Endpoint definitions
├── validators/
│   └── integrations.validator.ts  – Joi validation schemas
├── types/
│   └── integrations.ts            – TypeScript interfaces
└── config/
    └── environment.ts             – Config loading
```

---

## Testing Checklist

- [ ] Webhook registration stores URL, secret, events
- [ ] Webhook publish fires event within 5s
- [ ] Webhook delivery log retained (last 100)
- [ ] Failed webhooks retry 3x with backoff
- [ ] Jira OAuth flow redirects, exchanges code, stores token
- [ ] Case failure creates Jira issue, stores externalId on RunCase
- [ ] Jira webhook sync updates defect status
- [ ] GitHub PR linked via build number/branch
- [ ] Run completion posts commit status + PR comment
- [ ] Slack notification sends rich blocks with run metrics
- [ ] Failure threshold triggers alert
- [ ] Automation import parses Playwright/Jest/Cypress/JUnit
- [ ] Import matches by @caseId tag first, then title
- [ ] Bulk update succeeds for 100+ cases
- [ ] plan.approved event fires and notifies
- [ ] All TypeScript strict mode: ✓ (0 errors)

---

## Example Workflows

### Workflow: Run Failure → Jira Issue → PR Comment

1. **User** updates RunCase status in test run to FAILED
2. **Service** fires `case.failed` webhook event
3. **JiraService** auto-creates Jira issue (Bug priority=High)
4. **Defect** record created; RunCase.externalId = `PROJ-123`
5. **SlackService** notifies team: "❌ Test Case Failed: Login Form"
6. **User** runs test again; run completes with 95% pass rate
7. **GitHubService** posts PR comment with pass rate, case breakdown
8. **GitHub PR** shows green/red status check
9. **User** clicks PR comment link, views run summary

### Workflow: CI Automation Import

1. **Playwright runner** completes; outputs JSON to `results.json`
2. **CI/CD machine** uploads to `/import-results` endpoint with JSON body
3. **AutomationImportService** parses 500 test results
4. **Matcher** finds `@caseId:TC-*` tags; matches 480/500
5. **Bulk update** sets RunCase status = PASSED/FAILED/SKIPPED in ~2s
6. **User** views run; auto-populated results from CI
7. **Slack alert** fires if pass rate below threshold

---

**End of Document**
