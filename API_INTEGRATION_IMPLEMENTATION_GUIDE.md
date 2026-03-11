# API Integration Implementation Guide

**Date:** March 11, 2026  
**Scope:** Frontend (`test-jedi-software`) + Backend (`test-jedi-backend`) integration execution plan

---

## 0) Prerequisites and Baseline

Before integration work starts, ensure these are true:

- Backend runs successfully (`npm run dev`) and migrations are applied.
- Swagger docs are reachable (`/api/docs` and `/api/docs.json`).
- Frontend and backend run on different local ports.
- A test user and at least one project exist in DB.

### Recommended local ports

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

Set backend `.env`:

```env
PORT=3001
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
API_VERSION=v1
```

---

## 1) Freeze API Contracts First

Goal: lock request/response DTOs and error envelope so frontend integration is deterministic.

### 1.1 Route groups to freeze

Freeze the following groups in this order:

1. `auth`
2. `projects/test-repository`
3. `runs`
4. `plans`
5. `integrations`

### 1.2 DTO freeze checklist per endpoint

For each endpoint, define and approve:

- Path params and query params
- Request body schema
- Success response schema
- Error response schema
- Auth requirements (public/bearer/role)
- Pagination format
- Sort/filter conventions

### 1.3 Standard error envelope

Adopt one canonical shape across all route groups:

```json
{
  "status": "error",
  "code": 400,
  "error": "VALIDATION_FAILED",
  "message": "Validation failed",
  "errors": []
}
```

Rules:

- `status`, `code`, `error`, `message` always present.
- `errors` is optional and used only for field-level validation issues.
- `error` values must come from a shared enum/code registry.

### 1.4 Contract approval artifact

Create one approved contract matrix (spreadsheet or markdown table) with these columns:

- Route
- Request DTO
- Success DTO
- Error Codes
- Auth
- Owner
- Status (`Draft | Approved | Implemented`)

Do not start frontend API replacement for a route group until group status is `Approved`.

---

## 2) Create a Single Frontend API Layer

Goal: centralize all HTTP concerns to avoid duplicated logic and drift.

### 2.1 Suggested structure (frontend)

Create:

- `lib/api/client.ts` (base client)
- `lib/api/auth.ts`
- `lib/api/repository.ts`
- `lib/api/runs.ts`
- `lib/api/plans.ts`
- `lib/api/integrations.ts`
- `lib/api/types/*.ts` (DTOs)
- `lib/api/errors.ts`

### 2.2 Base client requirements

Base client must provide:

- API base URL from env (`NEXT_PUBLIC_API_BASE_URL`)
- JSON serialization/deserialization
- Bearer token injection
- Unified error mapping to frontend `ApiError`
- Refresh-token flow (on `401` token expiry)
- Request timeout + retry policy (idempotent requests only)

### 2.3 Refresh/retry strategy

Recommended strategy:

1. On `401` for protected endpoints, call refresh endpoint once.
2. If refresh succeeds, replay original request once.
3. If refresh fails, clear session and redirect to login.
4. Retry only safe/idempotent requests (`GET`, optionally `PUT` if designed idempotent).

### 2.4 Typed responses

For every API function:

- Type request input and response output.
- Never return `any`.
- Use discriminated unions for expected failure modes where useful.

---

## 3) Replace Mock Initialization Page by Page

Goal: controlled migration from store mocks to real API calls.

## Phase order (strict)

### Phase A: Auth flows

Implement first:

- Login
- Register (if needed in app)
- `GET /auth/me`
- Logout
- Token refresh handling

Exit criteria:

- User can log in/out from UI.
- Session persists and refreshes correctly.
- Role-based UI guards use backend user data.

### Phase B: Project/Test Repository

Replace mock suite/case data with backend endpoints.

Exit criteria:

- Repository listing loads from backend.
- CRUD actions persist in DB.
- Errors surfaced with canonical error envelope handling.

### Phase C: Runs + Plans

Integrate run creation/execution views and plan management.

Exit criteria:

- Run lifecycle works end-to-end.
- Plan creation/approval and readiness endpoints are wired.

### Phase D: Integrations

Connect webhooks/Jira/GitHub/Slack/automation import UI.

Exit criteria:

- Integration settings persist.
- Event-driven flows (e.g., case failed -> integration side effects) are verifiable.

---

## 4) Add Contract Checks to Prevent Drift

Goal: detect backend/frontend API mismatch early.

### 4.1 Backend source of truth

- Maintain OpenAPI spec at `/api/docs.json`.
- Ensure route annotations are updated whenever request/response changes.

### 4.2 Frontend contract consumption (choose one)

Option A (preferred): generate types/client from OpenAPI.

- Generate DTO and endpoint typings on CI and local pre-merge.

Option B: strict manual TS interfaces.

- Maintain shared `lib/api/types` mapped to OpenAPI docs with review checklist.

### 4.3 CI checks

Add checks:

- Backend: OpenAPI generation succeeds.
- Frontend: typed build succeeds with current contracts.
- Contract diff check: fail PR if API changed without doc/spec update.

---

## 5) Environment Parity and Phased E2E Smoke Flows

Goal: remove environment-only bugs before release.

### 5.1 Environment matrix

Define env files and values:

- `.env.local` (developer)
- `.env.staging`
- `.env.production`

At minimum configure:

- API base URL
- CORS origins
- Auth cookie policy
- Feature flags
- External integration credentials

### 5.2 CORS parity

For backend, set exact allowed origins by env. Avoid wildcard in protected APIs.

### 5.3 Smoke flows by phase

Run smoke tests per completed phase:

- Auth smoke: login, refresh, me, logout
- Repository smoke: list/create/update/delete suite/case
- Runs/Plans smoke: create run, update case status, close run, approve plan
- Integrations smoke: configure webhook, trigger event, verify delivery log

Only advance to next phase when previous smoke passes.

---

## 6) Definition of Done (DoD)

Integration is complete when:

- No UI path in scoped modules depends on mock store initialization.
- All integrated pages consume the unified API client.
- OpenAPI docs reflect actual runtime behavior.
- Env parity validated in local + staging.
- Phase smoke flows pass consistently.

---

## 7) Suggested 2-Week Execution Plan (Example)

### Week 1

- Day 1-2: Freeze contracts (Auth + Repository)
- Day 3: Implement API client + auth plumbing
- Day 4-5: Replace repository mocks and validate

### Week 2

- Day 1-2: Runs + Plans integration
- Day 3-4: Integrations module wiring
- Day 5: Environment parity + full smoke + fixes

---

## 8) Risk Controls

- Do not integrate endpoints with unapproved DTO contracts.
- Do not bypass central API client from components.
- Do not merge API-shape changes without OpenAPI update.
- Keep feature flags for partially integrated modules.
