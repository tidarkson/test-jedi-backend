-- EXPLAIN ANALYZE Query Tuning Reference
-- Run against your real database to verify index usage and execution plans.
-- All queries should show "Index Scan" or "Bitmap Index Scan", never "Seq Scan"
-- on large tables.

-- =============================================================
-- 1. Suite Tree Recursive CTE  (target: <2s for 1000 cases)
-- =============================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
WITH RECURSIVE suite_tree AS (
  SELECT s."id", s."projectId", s."parentSuiteId", s."name",
         s."description", s."ownerId", s."reviewerId",
         s."status", s."isLocked", s."createdAt", s."updatedAt"
  FROM "Suite" s
  WHERE s."projectId" = 'REPLACE_WITH_PROJECT_ID'
    AND s."deletedAt" IS NULL
    AND s."parentSuiteId" IS NULL
  UNION ALL
  SELECT c."id", c."projectId", c."parentSuiteId", c."name",
         c."description", c."ownerId", c."reviewerId",
         c."status", c."isLocked", c."createdAt", c."updatedAt"
  FROM "Suite" c
  INNER JOIN suite_tree st ON c."parentSuiteId" = st."id"
  WHERE c."deletedAt" IS NULL
),
case_counts AS (
  SELECT tc."suiteId", COUNT(*)::bigint AS "caseCount"
  FROM "TestCase" tc
  WHERE tc."deletedAt" IS NULL
  GROUP BY tc."suiteId"
)
SELECT st.*, COALESCE(cc."caseCount", 0)::bigint AS "caseCount"
FROM suite_tree st
LEFT JOIN case_counts cc ON cc."suiteId" = st."id"
ORDER BY st."createdAt" ASC;

-- Expected plan nodes:
--   -> Index Scan using Suite_projectId_parentSuiteId_deletedAt_idx
--   -> Index Scan using TestCase_suiteId_deletedAt_idx

-- =============================================================
-- 2. Full-Text Search on TestCase  (target: <1s for 100,000 cases)
-- =============================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT tc."id"
FROM "TestCase" tc
JOIN "Suite" s ON s."id" = tc."suiteId"
WHERE s."projectId" = 'REPLACE_WITH_PROJECT_ID'
  AND s."deletedAt" IS NULL
  AND tc."deletedAt" IS NULL
  AND tc."searchVector" @@ plainto_tsquery('english', 'login authentication timeout')
ORDER BY tc."createdAt" DESC, tc."id" DESC
LIMIT 100;

-- Expected plan nodes:
--   -> Bitmap Index Scan using TestCase_searchVector_gin_idx
--   -> Index Scan using Suite_projectId_status_idx or project index

-- =============================================================
-- 3. Run Case List by Status  (target: <3s for 2000-case run)
-- =============================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT rc."id", rc."runId", rc."caseId", rc."status",
       rc."assigneeId", rc."startedAt", rc."completedAt"
FROM "RunCase" rc
WHERE rc."runId" = 'REPLACE_WITH_RUN_ID'
ORDER BY rc."createdAt" DESC
LIMIT 50;

-- Expected plan nodes:
--   -> Index Scan using RunCase_runId_status_idx or RunCase_runId_idx

-- =============================================================
-- 4. Analytics Trend Query  (ensure projectId index used)
-- =============================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  DATE_TRUNC('week', COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt"))::date AS week,
  SUM(CASE WHEN rc."status" = 'PASSED' THEN 1 ELSE 0 END)::bigint  AS passed,
  SUM(CASE WHEN rc."status" = 'FAILED' THEN 1 ELSE 0 END)::bigint  AS failed,
  COUNT(*)::bigint AS total
FROM "RunCase" rc
JOIN "TestRun" tr ON tr."id" = rc."runId"
WHERE tr."projectId" = 'REPLACE_WITH_PROJECT_ID'
  AND tr."deletedAt" IS NULL
  AND COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt") >= NOW() - INTERVAL '90 days'
  AND COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt") <= NOW()
GROUP BY 1
ORDER BY 1 ASC;

-- =============================================================
-- 5. Permission Check (ProjectMember lookup)
-- =============================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT pm."role"
FROM "ProjectMember" pm
WHERE pm."projectId" = 'REPLACE_WITH_PROJECT_ID'
  AND pm."userId"    = 'REPLACE_WITH_USER_ID';

-- Expected plan: Index Scan using ProjectMember_projectId_userId_key (unique)

-- =============================================================
-- 6. Run List Cursor Pagination  (target: <100ms per page)
-- =============================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT tr."id", tr."title", tr."status", tr."createdAt"
FROM "TestRun" tr
WHERE tr."projectId" = 'REPLACE_WITH_PROJECT_ID'
  AND tr."deletedAt" IS NULL
  AND (
    tr."createdAt" < '2026-03-01T00:00:00.000Z'::timestamptz
    OR (tr."createdAt" = '2026-03-01T00:00:00.000Z'::timestamptz AND tr."id" < 'REPLACE_WITH_CURSOR_ID')
  )
ORDER BY tr."createdAt" DESC, tr."id" DESC
LIMIT 21;

-- Expected plan: Index Scan using TestRun_createdAt_id_cursor_idx
