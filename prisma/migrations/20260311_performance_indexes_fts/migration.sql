-- Performance Optimization Migration
-- Generated: 2026-03-11
-- NFR targets: ≤2s suite tree (1000 cases), ≤3s run load (2000 cases),
--              ≤1s search (100k cases), 500 concurrent testers

-- =============================================================
-- 1. COMPOSITE INDEXES
-- =============================================================

-- Suite: (projectId, status) for active suite listings
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Suite_projectId_status_idx"
    ON "Suite" ("projectId", "status")
    WHERE "deletedAt" IS NULL;

-- Suite: (projectId, parentSuiteId, deletedAt) for CTE anchors
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Suite_projectId_parentSuiteId_deletedAt_idx"
    ON "Suite" ("projectId", "parentSuiteId", "deletedAt");

-- TestCase: (suiteId, deletedAt) for per-suite lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TestCase_suiteId_deletedAt_idx"
    ON "TestCase" ("suiteId", "deletedAt");

-- TestRun: (projectId, status) for run list queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TestRun_projectId_status_idx"
    ON "TestRun" ("projectId", "status")
    WHERE "deletedAt" IS NULL;

-- RunCase: (runId, status) for run metrics computation
CREATE INDEX CONCURRENTLY IF NOT EXISTS "RunCase_runId_status_idx"
    ON "RunCase" ("runId", "status");

-- =============================================================
-- 2. FULL-TEXT SEARCH ON TestCase (title + description)
-- =============================================================

-- Add tsvector column (nullable for soft-deleted rows)
ALTER TABLE "TestCase"
    ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- Populate with combined index weight: title (A), description (B)
UPDATE "TestCase"
SET "searchVector" =
    setweight(to_tsvector('english', COALESCE("title", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE("description", '')), 'B')
WHERE "deletedAt" IS NULL;

-- GIN index for fast text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TestCase_searchVector_gin_idx"
    ON "TestCase" USING GIN ("searchVector")
    WHERE "deletedAt" IS NULL;

-- Trigger: keep searchVector updated on INSERT / UPDATE
CREATE OR REPLACE FUNCTION update_testcase_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW."searchVector" :=
        setweight(to_tsvector('english', COALESCE(NEW."title", '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW."description", '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS testcase_search_vector_update ON "TestCase";
CREATE TRIGGER testcase_search_vector_update
    BEFORE INSERT OR UPDATE OF "title", "description"
    ON "TestCase"
    FOR EACH ROW
EXECUTE FUNCTION update_testcase_search_vector();

-- =============================================================
-- 3. CURSOR PAGINATION SUPPORT INDEXES
-- =============================================================

-- TestCase: (createdAt DESC, id DESC) for cursor-based pagination
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TestCase_createdAt_id_cursor_idx"
    ON "TestCase" ("createdAt" DESC, "id" DESC)
    WHERE "deletedAt" IS NULL;

-- TestRun: (createdAt DESC, id DESC) for cursor-based pagination
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TestRun_createdAt_id_cursor_idx"
    ON "TestRun" ("createdAt" DESC, "id" DESC)
    WHERE "deletedAt" IS NULL;
