import { TestPlanStatus } from '@prisma/client';

/**
 * Test Plan DTO
 */
export interface TestPlanDTO {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TestPlanStatus;
  isApproved: boolean;
  approvedById: string | null;
  approvedAt: Date | null;
  milestoneId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Test Plan Detail DTO (includes linked runs and metrics)
 */
export interface TestPlanDetailDTO extends TestPlanDTO {
  milestone?: {
    id: string;
    name: string;
    dueDate: Date;
  } | null;
  approvedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  linkedRuns: TestPlanRunDTO[];
  metrics: PlanMetrics;
}

/**
 * Test Plan Run DTO
 */
export interface TestPlanRunDTO {
  id: string;
  runId: string;
  title: string;
  status: string;
  metrics: {
    totalCases: number;
    passedCases: number;
    failedCases: number;
    passRate: number;
    completionRate: number;
  };
}

/**
 * Plan Aggregated Metrics
 */
export interface PlanMetrics {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  blockedCases: number;
  skippedCases: number;
  notRunCases: number;
  inProgressCases: number;
  passRate: number; // 0-100
  completionRate: number; // 0-100
  openDefectCount: number;
  releaseReadinessScore: number; // 0-100
  linkedRunCount: number;
  averageCaseExecutionTime: number; // Minutes
}

/**
 * Release Readiness Calculation Details
 */
export interface ReleaseReadinessDetail {
  score: number; // 0-100
  components: {
    passRateScore: number; // 0-100
    completionScore: number; // 0-100
    defectScore: number; // 0-100
    coverageScore: number; // 0-100
  };
  weights: {
    passRate: number;
    completion: number;
    defects: number;
    coverage: number;
  };
  recommendation: 'ready' | 'ready-with-risks' | 'not-ready';
  risks: string[];
}

/**
 * Test Plan Version DTO
 */
export interface TestPlanVersionDTO {
  id: string;
  planId: string;
  versionNum: number;
  snapshot: TestPlanSnapshot;
  isBaseline: boolean;
  createdAt: Date;
}

/**
 * Full Plan State Snapshot
 */
export interface TestPlanSnapshot {
  title: string;
  description: string | null;
  status: TestPlanStatus;
  linkedRunIds: string[];
  metrics: PlanMetrics;
  timestamp: string;
}

/**
 * Test Plan Baseline DTO
 */
export interface TestPlanBaselineDTO {
  id: string;
  planId: string;
  versionId: string;
  snapshot: TestPlanSnapshot;
  createdAt: Date;
}

/**
 * Baseline Comparison
 */
export interface BaselineComparison {
  baseline: TestPlanSnapshot;
  current: TestPlanSnapshot;
  deltas: {
    passRateDelta: number;
    completionDelta: number;
    defectCountDelta: number;
    caseCountDelta: number;
    metricsChanged: boolean;
  };
}

/**
 * Create Test Plan Input
 */
export interface CreateTestPlanInput {
  title: string;
  description?: string;
  milestoneId?: string;
}

/**
 * Update Test Plan Input
 */
export interface UpdateTestPlanInput {
  title?: string;
  description?: string;
  status?: TestPlanStatus;
  milestoneId?: string | null;
}

/**
 * Add Run to Plan Input
 */
export interface AddRunToPlanInput {
  runId: string;
}

/**
 * Approve Plan Input
 */
export interface ApprovePlanInput {
  approvedById: string;
}

/**
 * Plan Version Response
 */
export interface CreateVersionResponse {
  version: TestPlanVersionDTO;
  message: string;
}

/**
 * Paginated Plan Response
 */
export interface PaginatedPlanResponse {
  data: (TestPlanDTO & { metrics: PlanMetrics })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Plan List Filters
 */
export interface PlanListFilters {
  status?: TestPlanStatus;
  milestoneId?: string;
  isApproved?: boolean;
  search?: string; // Search in title and description
}
