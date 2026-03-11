import { AnalyticsService } from '../../../src/services/AnalyticsService';

const prismaMock = {
  project: {
    findUnique: jest.fn(),
  },
  suite: {
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

const redisMock = {
  get: jest.fn(),
  setex: jest.fn(),
};

jest.mock('../../../src/config/database', () => ({
  getPrisma: () => prismaMock,
}));

jest.mock('../../../src/config/redis', () => ({
  getRedis: () => redisMock,
}));

jest.mock('../../../src/config/environment', () => ({
  config: {
    REDIS_ENABLED: true,
  },
}));

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsService();
    prismaMock.project.findUnique.mockResolvedValue({ id: 'project-1' });
  });

  it('returns 12 weeks for trend endpoint', async () => {
    const now = new Date();
    const currentWeek = new Date(now);
    const day = currentWeek.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    currentWeek.setUTCDate(currentWeek.getUTCDate() + diff);
    currentWeek.setUTCHours(0, 0, 0, 0);

    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        week: currentWeek,
        passed: BigInt(5),
        failed: BigInt(2),
        blocked: BigInt(1),
        total: BigInt(8),
      },
    ]);
    redisMock.get.mockResolvedValueOnce(null);
    redisMock.setex.mockResolvedValueOnce('OK');

    const data = await service.getTrends('project-1', {});

    expect(data).toHaveLength(12);
    expect(data[data.length - 1].total).toBe(8);
  });

  it('identifies flaky tests with 3+ alternations', async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      { caseId: 'case-1', title: 'Case 1', status: 'PASSED', eventAt: new Date('2026-01-01') },
      { caseId: 'case-1', title: 'Case 1', status: 'FAILED', eventAt: new Date('2026-01-02') },
      { caseId: 'case-1', title: 'Case 1', status: 'PASSED', eventAt: new Date('2026-01-03') },
      { caseId: 'case-1', title: 'Case 1', status: 'FAILED', eventAt: new Date('2026-01-04') },
      { caseId: 'case-2', title: 'Case 2', status: 'PASSED', eventAt: new Date('2026-01-01') },
      { caseId: 'case-2', title: 'Case 2', status: 'PASSED', eventAt: new Date('2026-01-02') },
      { caseId: 'case-2', title: 'Case 2', status: 'FAILED', eventAt: new Date('2026-01-03') },
      { caseId: 'case-2', title: 'Case 2', status: 'FAILED', eventAt: new Date('2026-01-04') },
    ]);
    redisMock.get.mockResolvedValueOnce(null);
    redisMock.setex.mockResolvedValueOnce('OK');

    const data = await service.getFlakyTests('project-1', {});

    expect(data).toHaveLength(1);
    expect(data[0].caseId).toBe('case-1');
    expect(data[0].flakyScore).toBe(100);
  });

  it('applies Redis cache with 5-minute ttl', async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([]);
    redisMock.get.mockResolvedValueOnce(null);
    redisMock.setex.mockResolvedValueOnce('OK');

    await service.getTrends('project-1', {});

    expect(redisMock.setex).toHaveBeenCalledTimes(1);
    expect(redisMock.setex.mock.calls[0][1]).toBe(300);
  });

  it('passes date and milestone filters into SQL query bindings', async () => {
    const dateFrom = new Date('2026-01-01T00:00:00.000Z');
    const dateTo = new Date('2026-03-01T23:59:59.999Z');
    const milestoneId = 'f7b55cc7-c41f-401f-b815-6f8efac13a88';

    prismaMock.$queryRaw.mockResolvedValueOnce([]);
    redisMock.get.mockResolvedValueOnce(null);
    redisMock.setex.mockResolvedValueOnce('OK');

    await service.getFailureDistribution('project-1', {
      dateFrom,
      dateTo,
      milestoneId,
    });

    const callArgs = prismaMock.$queryRaw.mock.calls[0] as unknown[];
    const values = callArgs.slice(1) as unknown[];

    expect(values).toEqual(expect.arrayContaining([milestoneId, dateTo]));

    const boundDates = values.filter((value): value is Date => value instanceof Date);
    expect(boundDates.length).toBeGreaterThanOrEqual(2);
    expect(boundDates[0].getTime()).toBeLessThanOrEqual(dateFrom.getTime());
    expect(boundDates[1].getTime()).toBe(dateTo.getTime());
  });
});
