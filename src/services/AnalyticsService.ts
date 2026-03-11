import { getPrisma } from '../config/database';
import { getRedis } from '../config/redis';
import { config } from '../config/environment';
import { logger } from '../config/logger';
import { AppError, ErrorCodes } from '../types/errors';
import {
  AnalyticsFilters,
  AutomationCoverageResponse,
  DefectLeakagePoint,
  FailureDistributionPoint,
  FlakyTestPoint,
  SuiteHeatmapResponse,
  TrendPoint,
  WorkloadHeatmapResponse,
} from '../types/analytics';

type WeekAggregateRow = {
  week: Date;
  passed: bigint;
  failed: bigint;
  blocked: bigint;
  total: bigint;
};

type FailureDistributionRow = {
  suiteId: string;
  suiteName: string;
  failures: bigint;
};

type SuiteHeatmapRow = {
  suiteId: string;
  suiteName: string;
  week: Date;
  failed: bigint;
  total: bigint;
};

type AutomationCountsRow = {
  automated: bigint;
  manual: bigint;
  untested: bigint;
  total: bigint;
};

type AutomationTrendRow = {
  week: Date;
  automatedCases: bigint;
  totalCases: bigint;
};

type DefectLeakageRow = {
  week: Date;
  foundInProd: bigint;
  foundInTesting: bigint;
};

type FlakyRunRow = {
  caseId: string;
  title: string;
  status: string;
  eventAt: Date;
};

type WorkloadRow = {
  testerId: string;
  testerName: string;
  day: Date;
  assignedCases: bigint;
};

export class AnalyticsService {
  private prisma = getPrisma();
  private readonly cacheTtlSeconds = 300;

  private async ensureProject(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Project not found');
    }
  }

  private toIsoDay(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private startOfWeek(date: Date): Date {
    const next = new Date(date);
    const day = next.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    next.setUTCDate(next.getUTCDate() + diff);
    next.setUTCHours(0, 0, 0, 0);
    return next;
  }

  private endOfDay(date: Date): Date {
    const next = new Date(date);
    next.setUTCHours(23, 59, 59, 999);
    return next;
  }

  private resolveDateRange(
    filters: AnalyticsFilters,
    defaultWeeks: number = 12,
  ): { dateFrom: Date; dateTo: Date } {
    if (filters.dateFrom && filters.dateTo) {
      return {
        dateFrom: this.startOfWeek(filters.dateFrom),
        dateTo: this.endOfDay(filters.dateTo),
      };
    }

    if (filters.dateFrom && !filters.dateTo) {
      return {
        dateFrom: this.startOfWeek(filters.dateFrom),
        dateTo: this.endOfDay(new Date()),
      };
    }

    if (!filters.dateFrom && filters.dateTo) {
      const end = this.endOfDay(filters.dateTo);
      const start = this.startOfWeek(new Date(end));
      start.setUTCDate(start.getUTCDate() - (defaultWeeks - 1) * 7);
      return {
        dateFrom: start,
        dateTo: end,
      };
    }

    const end = this.endOfDay(new Date());
    const start = this.startOfWeek(new Date(end));
    start.setUTCDate(start.getUTCDate() - (defaultWeeks - 1) * 7);

    return {
      dateFrom: start,
      dateTo: end,
    };
  }

  private listWeeks(dateFrom: Date, dateTo: Date): string[] {
    const weeks: string[] = [];
    const cursor = this.startOfWeek(dateFrom);
    const upperBound = this.startOfWeek(dateTo);

    while (cursor <= upperBound) {
      weeks.push(this.toIsoDay(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }

    return weeks;
  }

  private async getCachedOrCompute<T>(
    cacheKey: string,
    compute: () => Promise<T>,
  ): Promise<T> {
    if (!config.REDIS_ENABLED) {
      return compute();
    }

    let redisClient;
    try {
      redisClient = getRedis();
    } catch (error) {
      logger.warn(`Redis client unavailable for analytics cache key ${cacheKey}: ${error}`);
      return compute();
    }

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      logger.warn(`Redis read failed for analytics cache key ${cacheKey}: ${error}`);
    }

    const data = await compute();

    try {
      await redisClient.setex(cacheKey, this.cacheTtlSeconds, JSON.stringify(data));
    } catch (error) {
      logger.warn(`Redis write failed for analytics cache key ${cacheKey}: ${error}`);
    }

    return data;
  }

  private buildCacheKey(
    endpoint: string,
    projectId: string,
    filters: AnalyticsFilters,
    dateFrom: Date,
    dateTo: Date,
  ): string {
    return [
      'analytics',
      endpoint,
      projectId,
      dateFrom.toISOString(),
      dateTo.toISOString(),
      filters.milestoneId || 'all',
    ].join(':');
  }

  async getTrends(projectId: string, filters: AnalyticsFilters): Promise<TrendPoint[]> {
    await this.ensureProject(projectId);

    const { dateFrom, dateTo } = this.resolveDateRange(filters, 12);
    const weeks = this.listWeeks(dateFrom, dateTo);
    const cacheKey = this.buildCacheKey('trends', projectId, filters, dateFrom, dateTo);

    return this.getCachedOrCompute(cacheKey, async () => {
      const rows = await this.prisma.$queryRaw<WeekAggregateRow[]>`
        SELECT
          DATE_TRUNC('week', COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt"))::date AS week,
          SUM(CASE WHEN rc."status" = 'PASSED' THEN 1 ELSE 0 END)::bigint AS passed,
          SUM(CASE WHEN rc."status" = 'FAILED' THEN 1 ELSE 0 END)::bigint AS failed,
          SUM(CASE WHEN rc."status" = 'BLOCKED' THEN 1 ELSE 0 END)::bigint AS blocked,
          COUNT(*)::bigint AS total
        FROM "RunCase" rc
        JOIN "TestRun" tr ON tr."id" = rc."runId"
        WHERE tr."projectId" = ${projectId}
          AND tr."deletedAt" IS NULL
          AND (${filters.milestoneId || null}::uuid IS NULL OR tr."milestoneId" = ${filters.milestoneId || null})
          AND COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt") >= ${dateFrom}
          AND COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt") <= ${dateTo}
        GROUP BY 1
        ORDER BY 1 ASC
      `;

      const map = new Map<string, WeekAggregateRow>();
      rows.forEach((row) => map.set(this.toIsoDay(new Date(row.week)), row));

      return weeks.map((week) => {
        const row = map.get(week);
        return {
          week,
          passed: Number(row?.passed || 0n),
          failed: Number(row?.failed || 0n),
          blocked: Number(row?.blocked || 0n),
          total: Number(row?.total || 0n),
        };
      });
    });
  }

  async getFailureDistribution(
    projectId: string,
    filters: AnalyticsFilters,
  ): Promise<FailureDistributionPoint[]> {
    await this.ensureProject(projectId);

    const { dateFrom, dateTo } = this.resolveDateRange(filters);
    const cacheKey = this.buildCacheKey('failure-distribution', projectId, filters, dateFrom, dateTo);

    return this.getCachedOrCompute(cacheKey, async () => {
      const rows = await this.prisma.$queryRaw<FailureDistributionRow[]>`
        SELECT
          tc."suiteId" AS "suiteId",
          s."name" AS "suiteName",
          COUNT(*)::bigint AS failures
        FROM "RunCase" rc
        JOIN "TestRun" tr ON tr."id" = rc."runId"
        JOIN "TestCase" tc ON tc."id" = rc."caseId"
        JOIN "Suite" s ON s."id" = tc."suiteId"
        WHERE tr."projectId" = ${projectId}
          AND tr."deletedAt" IS NULL
          AND tc."deletedAt" IS NULL
          AND s."deletedAt" IS NULL
          AND rc."status" = 'FAILED'
          AND (${filters.milestoneId || null}::uuid IS NULL OR tr."milestoneId" = ${filters.milestoneId || null})
          AND COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt") >= ${dateFrom}
          AND COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt") <= ${dateTo}
        GROUP BY tc."suiteId", s."name"
        ORDER BY failures DESC
      `;

      const totalFailures = rows.reduce((sum, row) => sum + Number(row.failures), 0);

      return rows.map((row) => ({
        suiteId: row.suiteId,
        suiteName: row.suiteName,
        failures: Number(row.failures),
        percentage: totalFailures > 0
          ? Number(((Number(row.failures) / totalFailures) * 100).toFixed(2))
          : 0,
      }));
    });
  }

  async getSuiteHeatmap(
    projectId: string,
    filters: AnalyticsFilters,
  ): Promise<SuiteHeatmapResponse> {
    await this.ensureProject(projectId);

    const { dateFrom, dateTo } = this.resolveDateRange(filters);
    const weeks = this.listWeeks(dateFrom, dateTo);
    const cacheKey = this.buildCacheKey('suite-heatmap', projectId, filters, dateFrom, dateTo);

    return this.getCachedOrCompute(cacheKey, async () => {
      const [suiteRows, heatmapRows] = await Promise.all([
        this.prisma.suite.findMany({
          where: {
            projectId,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            name: 'asc',
          },
        }),
        this.prisma.$queryRaw<SuiteHeatmapRow[]>`
          SELECT
            tc."suiteId" AS "suiteId",
            s."name" AS "suiteName",
            DATE_TRUNC('week', COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt"))::date AS week,
            SUM(CASE WHEN rc."status" = 'FAILED' THEN 1 ELSE 0 END)::bigint AS failed,
            COUNT(*)::bigint AS total
          FROM "RunCase" rc
          JOIN "TestRun" tr ON tr."id" = rc."runId"
          JOIN "TestCase" tc ON tc."id" = rc."caseId"
          JOIN "Suite" s ON s."id" = tc."suiteId"
          WHERE tr."projectId" = ${projectId}
            AND tr."deletedAt" IS NULL
            AND tc."deletedAt" IS NULL
            AND s."deletedAt" IS NULL
            AND (${filters.milestoneId || null}::uuid IS NULL OR tr."milestoneId" = ${filters.milestoneId || null})
            AND COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt") >= ${dateFrom}
            AND COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt") <= ${dateTo}
          GROUP BY tc."suiteId", s."name", week
          ORDER BY s."name" ASC, week ASC
        `,
      ]);

      const suites = suiteRows.map((suite) => ({
        suiteId: suite.id,
        suiteName: suite.name,
      }));

      const rowMap = new Map<string, SuiteHeatmapRow>();
      heatmapRows.forEach((row) => {
        rowMap.set(`${row.suiteId}:${this.toIsoDay(new Date(row.week))}`, row);
      });

      const grid = suites.flatMap((suite) =>
        weeks.map((week) => {
          const hit = rowMap.get(`${suite.suiteId}:${week}`);
          const failed = Number(hit?.failed || 0n);
          const total = Number(hit?.total || 0n);
          return {
            suiteId: suite.suiteId,
            suiteName: suite.suiteName,
            week,
            failed,
            total,
            failureRate: total > 0 ? Number(((failed / total) * 100).toFixed(2)) : 0,
          };
        }),
      );

      return {
        weeks,
        suites,
        grid,
      };
    });
  }

  async getAutomationCoverage(
    projectId: string,
    filters: AnalyticsFilters,
  ): Promise<AutomationCoverageResponse> {
    await this.ensureProject(projectId);

    const { dateFrom, dateTo } = this.resolveDateRange(filters);
    const weeks = this.listWeeks(dateFrom, dateTo);
    const cacheKey = this.buildCacheKey('automation-coverage', projectId, filters, dateFrom, dateTo);

    return this.getCachedOrCompute(cacheKey, async () => {
      const [countRows, trendRows] = await Promise.all([
        this.prisma.$queryRaw<AutomationCountsRow[]>`
          SELECT
            SUM(CASE WHEN tc."automationStatus" IN ('AUTOMATED', 'PARTIALLY_AUTOMATED') THEN 1 ELSE 0 END)::bigint AS automated,
            SUM(CASE WHEN tc."automationStatus" = 'MANUAL' THEN 1 ELSE 0 END)::bigint AS manual,
            SUM(
              CASE WHEN tc."id" NOT IN (
                SELECT DISTINCT rc."caseId"
                FROM "RunCase" rc
                JOIN "TestRun" tr2 ON tr2."id" = rc."runId"
                WHERE tr2."projectId" = ${projectId}
                  AND tr2."deletedAt" IS NULL
                  AND (${filters.milestoneId || null}::uuid IS NULL OR tr2."milestoneId" = ${filters.milestoneId || null})
                  AND COALESCE(rc."completedAt", rc."updatedAt", tr2."createdAt") >= ${dateFrom}
                  AND COALESCE(rc."completedAt", rc."updatedAt", tr2."createdAt") <= ${dateTo}
              ) THEN 1 ELSE 0 END
            )::bigint AS untested,
            COUNT(*)::bigint AS total
          FROM "TestCase" tc
          JOIN "Suite" s ON s."id" = tc."suiteId"
          WHERE s."projectId" = ${projectId}
            AND tc."deletedAt" IS NULL
            AND s."deletedAt" IS NULL
        `,
        this.prisma.$queryRaw<AutomationTrendRow[]>`
          SELECT
            DATE_TRUNC('week', COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt"))::date AS week,
            COUNT(DISTINCT CASE WHEN tc."automationStatus" IN ('AUTOMATED', 'PARTIALLY_AUTOMATED') THEN rc."caseId" END)::bigint AS "automatedCases",
            COUNT(DISTINCT rc."caseId")::bigint AS "totalCases"
          FROM "RunCase" rc
          JOIN "TestRun" tr ON tr."id" = rc."runId"
          JOIN "TestCase" tc ON tc."id" = rc."caseId"
          WHERE tr."projectId" = ${projectId}
            AND tr."deletedAt" IS NULL
            AND tc."deletedAt" IS NULL
            AND (${filters.milestoneId || null}::uuid IS NULL OR tr."milestoneId" = ${filters.milestoneId || null})
            AND COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt") >= ${dateFrom}
            AND COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt") <= ${dateTo}
          GROUP BY 1
          ORDER BY 1 ASC
        `,
      ]);

      const countRow = countRows[0] || { automated: 0n, manual: 0n, untested: 0n, total: 0n };
      const trendMap = new Map<string, AutomationTrendRow>();
      trendRows.forEach((row) => trendMap.set(this.toIsoDay(new Date(row.week)), row));

      return {
        counts: {
          automated: Number(countRow.automated),
          manual: Number(countRow.manual),
          untested: Number(countRow.untested),
          total: Number(countRow.total),
        },
        weeklyTrend: weeks.map((week) => {
          const row = trendMap.get(week);
          const totalCases = Number(row?.totalCases || 0n);
          const automatedCases = Number(row?.automatedCases || 0n);
          return {
            week,
            automatedCases,
            totalCases,
            coveragePercent: totalCases > 0
              ? Number(((automatedCases / totalCases) * 100).toFixed(2))
              : 0,
          };
        }),
      };
    });
  }

  async getDefectLeakage(
    projectId: string,
    filters: AnalyticsFilters,
  ): Promise<DefectLeakagePoint[]> {
    await this.ensureProject(projectId);

    const { dateFrom, dateTo } = this.resolveDateRange(filters);
    const weeks = this.listWeeks(dateFrom, dateTo);
    const cacheKey = this.buildCacheKey('defect-leakage', projectId, filters, dateFrom, dateTo);

    return this.getCachedOrCompute(cacheKey, async () => {
      const rows = await this.prisma.$queryRaw<DefectLeakageRow[]>`
        SELECT
          DATE_TRUNC('week', d."createdAt")::date AS week,
          SUM(CASE WHEN LOWER(tr."environment") LIKE '%prod%' THEN 1 ELSE 0 END)::bigint AS "foundInProd",
          SUM(CASE WHEN LOWER(tr."environment") NOT LIKE '%prod%' THEN 1 ELSE 0 END)::bigint AS "foundInTesting"
        FROM "Defect" d
        JOIN "RunCase" rc ON rc."id" = d."runCaseId"
        JOIN "TestRun" tr ON tr."id" = rc."runId"
        WHERE tr."projectId" = ${projectId}
          AND tr."deletedAt" IS NULL
          AND (${filters.milestoneId || null}::uuid IS NULL OR tr."milestoneId" = ${filters.milestoneId || null})
          AND d."createdAt" >= ${dateFrom}
          AND d."createdAt" <= ${dateTo}
        GROUP BY 1
        ORDER BY 1 ASC
      `;

      const map = new Map<string, DefectLeakageRow>();
      rows.forEach((row) => map.set(this.toIsoDay(new Date(row.week)), row));

      return weeks.map((week) => {
        const row = map.get(week);
        const foundInProd = Number(row?.foundInProd || 0n);
        const foundInTesting = Number(row?.foundInTesting || 0n);

        return {
          week,
          foundInProd,
          foundInTesting,
          total: foundInProd + foundInTesting,
        };
      });
    });
  }

  async getFlakyTests(
    projectId: string,
    filters: AnalyticsFilters,
  ): Promise<FlakyTestPoint[]> {
    await this.ensureProject(projectId);

    const { dateFrom, dateTo } = this.resolveDateRange(filters);
    const cacheKey = this.buildCacheKey('flaky-tests', projectId, filters, dateFrom, dateTo);

    return this.getCachedOrCompute(cacheKey, async () => {
      const rows = await this.prisma.$queryRaw<FlakyRunRow[]>`
        SELECT
          rc."caseId" AS "caseId",
          tc."title" AS "title",
          rc."status" AS "status",
          COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt") AS "eventAt"
        FROM "RunCase" rc
        JOIN "TestRun" tr ON tr."id" = rc."runId"
        JOIN "TestCase" tc ON tc."id" = rc."caseId"
        WHERE tr."projectId" = ${projectId}
          AND tr."deletedAt" IS NULL
          AND tc."deletedAt" IS NULL
          AND rc."status" IN ('PASSED', 'FAILED')
          AND (${filters.milestoneId || null}::uuid IS NULL OR tr."milestoneId" = ${filters.milestoneId || null})
          AND COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt") >= ${dateFrom}
          AND COALESCE(rc."completedAt", rc."updatedAt", tr."createdAt") <= ${dateTo}
        ORDER BY rc."caseId" ASC, "eventAt" ASC
      `;

      const grouped = new Map<string, { title: string; results: string[] }>();

      rows.forEach((row) => {
        if (!grouped.has(row.caseId)) {
          grouped.set(row.caseId, {
            title: row.title,
            results: [],
          });
        }

        grouped.get(row.caseId)?.results.push(row.status);
      });

      const flaky: FlakyTestPoint[] = [];

      grouped.forEach((item, caseId) => {
        if (item.results.length < 4) {
          return;
        }

        let alternations = 0;
        for (let i = 1; i < item.results.length; i++) {
          if (item.results[i] !== item.results[i - 1]) {
            alternations++;
          }
        }

        if (alternations >= 3) {
          const flakyScore = Number(((alternations / (item.results.length - 1)) * 100).toFixed(2));
          flaky.push({
            caseId,
            title: item.title,
            flakyScore,
            lastRunResults: item.results.slice(-10),
          });
        }
      });

      return flaky.sort((a, b) => b.flakyScore - a.flakyScore);
    });
  }

  async getWorkloadHeatmap(
    projectId: string,
    filters: AnalyticsFilters,
  ): Promise<WorkloadHeatmapResponse> {
    await this.ensureProject(projectId);

    const { dateFrom, dateTo } = this.resolveDateRange(filters);
    const cacheKey = this.buildCacheKey('workload-heatmap', projectId, filters, dateFrom, dateTo);

    return this.getCachedOrCompute(cacheKey, async () => {
      const rows = await this.prisma.$queryRaw<WorkloadRow[]>`
        SELECT
          u."id" AS "testerId",
          u."name" AS "testerName",
          DATE_TRUNC('day', COALESCE(rc."completedAt", rc."startedAt", rc."updatedAt", tr."createdAt"))::date AS day,
          COUNT(*)::bigint AS "assignedCases"
        FROM "RunCase" rc
        JOIN "TestRun" tr ON tr."id" = rc."runId"
        JOIN "User" u ON u."id" = rc."assigneeId"
        WHERE tr."projectId" = ${projectId}
          AND tr."deletedAt" IS NULL
          AND rc."assigneeId" IS NOT NULL
          AND (${filters.milestoneId || null}::uuid IS NULL OR tr."milestoneId" = ${filters.milestoneId || null})
          AND COALESCE(rc."completedAt", rc."startedAt", rc."updatedAt", tr."createdAt") >= ${dateFrom}
          AND COALESCE(rc."completedAt", rc."startedAt", rc."updatedAt", tr."createdAt") <= ${dateTo}
        GROUP BY u."id", u."name", day
        ORDER BY u."name" ASC, day ASC
      `;

      const daySet = new Set<string>();
      const testerMap = new Map<string, { testerId: string; testerName: string }>();

      rows.forEach((row) => {
        daySet.add(this.toIsoDay(new Date(row.day)));
        testerMap.set(row.testerId, {
          testerId: row.testerId,
          testerName: row.testerName,
        });
      });

      return {
        days: Array.from(daySet).sort((a, b) => a.localeCompare(b)),
        testers: Array.from(testerMap.values()).sort((a, b) => a.testerName.localeCompare(b.testerName)),
        grid: rows.map((row) => ({
          testerId: row.testerId,
          testerName: row.testerName,
          day: this.toIsoDay(new Date(row.day)),
          assignedCases: Number(row.assignedCases),
        })),
      };
    });
  }
}
