# API Integration Blockers Priority Guide

**Date:** March 11, 2026  
**Purpose:** Immediate blocker resolution plan from highest to lowest priority

---

## Priority 1 (High): Frontend is still mock-driven

### Why this blocks progress

Most frontend pages/stores are initialized with mock data, so backend integration cannot be validated end-to-end.

### Evidence examples

- `test-jedi-software/app/test-repository/page.tsx` initializes from `mockSuites`/`mockCases`.
- `test-jedi-software/lib/store/admin-store.ts` uses `mock-admin-data`.
- `test-jedi-software/lib/store/integration-store.ts` uses `mock-integration-data`.

### Resolution steps

1. Introduce unified frontend API layer (`lib/api/*`).
2. Start with Auth and session hydration.
3. Replace mock initialization in one module at a time (Repository -> Runs/Plans -> Integrations -> Admin).
4. Keep temporary feature flags for incomplete modules.

### Completion criteria

- No mock imports in integrated pages/stores for the completed module.
- UI operations persist and reload from backend successfully.

---

## Priority 2 (High): Port and local environment collision

### Why this blocks progress

Backend `.env` currently uses `PORT=3000`, which conflicts with Next.js frontend default port `3000` when running both apps locally.

### Resolution steps

1. Set backend `PORT=3001` in backend `.env`.
2. Set frontend `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1`.
3. Set backend `CORS_ORIGIN=http://localhost:3000`.
4. Restart both services and verify:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:3001/api/v1/...`
   - Swagger: `http://localhost:3001/api/docs`

### Completion criteria

- Both apps run simultaneously with no port binding conflict.
- Browser requests from frontend to backend succeed (no CORS/connection errors).

---

## Priority 3 (High): Error contract inconsistency in backend endpoints

### Why this blocks progress

Inconsistent error code/shape forces frontend to implement route-specific error handling and slows integration.

### Resolution steps

1. Standardize error envelope globally in middleware/controller helpers.
2. Enforce single error code registry (`enum`/constants).
3. Refactor route groups to use the same error helper.
4. Document canonical errors in OpenAPI.

### Completion criteria

- All API errors follow one shape.
- Frontend can use a single error parser.

---

## Priority 4 (Medium): OpenAPI coverage is partial

### Why this blocks progress

Swagger exists, but incomplete annotations mean frontend type generation/contract validation cannot fully protect against drift.

### Resolution steps

1. Add OpenAPI docs for all route groups (auth, repository, runs, plans, integrations, admin, analytics, exports).
2. Document request/response DTOs and security requirements.
3. Add CI check that fails when routes change without OpenAPI updates.

### Completion criteria

- `/api/docs.json` includes all production endpoints.
- Frontend type generation (or strict interface verification) passes.

---

## Priority 5 (Medium): Pending migrations/config in some environments

### Why this blocks progress

Integrations and related features depend on schema changes and provider credentials; missing migrations/config causes runtime failures.

### Resolution steps

1. Apply migrations on local/staging.
2. Verify required env vars for integrations.
3. Run health checks and sample integration calls.

### Completion criteria

- Migration status clean.
- Integration endpoints work without schema/env errors.

---

## Priority 6 (Medium): Known repository service gaps

### Why this may hinder phase progression

Known issues in repository logic (e.g., transaction atomicity/cascade behavior) can cause inconsistent data while frontend relies on those flows.

### Resolution steps

1. Fix high-severity repository gaps first.
2. Add tests for delete cascade, bulk operation rollback, and error response consistency.
3. Re-verify repository integration flows.

### Completion criteria

- High-severity repository gaps are closed.
- Integration smoke tests for repository are stable.

---

## Recommended Execution Order (One-by-One)

1. Remove mock-dependency path by path (start with Auth).  
2. Fix local port/CORS/env parity and validate browser connectivity.  
3. Standardize backend error envelope and codes.  
4. Complete OpenAPI annotations + contract checks.  
5. Ensure migrations/config are applied across active envs.  
6. Close remaining medium repository service gaps.

---

## Fast Verification Checklist

- [ ] Frontend login works against backend
- [ ] `GET /auth/me` hydrates UI state
- [ ] Test repository list renders from real API
- [ ] Swagger docs load in browser
- [ ] No CORS errors in browser console
- [ ] No module still blocked by missing migration/config
