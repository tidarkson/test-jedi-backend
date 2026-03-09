import { getPrisma } from '../config/database';
import { AppError, ErrorCodes } from '../types/errors';
import { logger } from '../config/logger';
import {
  TestRunDTO,
  RunCaseDTO,
  RunMetrics,
  CaseSelectionInput,
  CaseSelectionPreview,
  CreateRunInput,
  UpdateRunInput,
  UpdateRunCaseStatusInput,
  BulkStatusUpdateInput,
  BulkStatusUpdateResult,
  CloneRunInput,
  CloneRunResult,
  PaginatedResponse,
  RunListFilters,
  TesterPerformance,
} from '../types/testRun';
import {
  TestRun,
  RunCase,
  TestCase,
  AuditAction,
  RunCaseStatus,
} from '@prisma/client';

export class TestRunService {
  private prisma = getPrisma();

  /**
   * ========== CASE SELECTION LOGIC ==========
   */

  /**
   * Resolve all cases from selected suites (recursive)
   * Apply exclude list, deduplicate
   */
  private async resolveCasesFromSelection(
    input: CaseSelectionInput,
  ): Promise<string[]> {
    const caseIds = new Set<string>();

    try {
      // Add explicitly selected case IDs
      if (input.caseIds && input.caseIds.length > 0) {
        input.caseIds.forEach(id => caseIds.add(id));
      }

      // Resolve cases from suites (including nested suites)
      if (input.suiteIds && input.suiteIds.length > 0) {
        for (const suiteId of input.suiteIds) {
          const suiteCases = await this.getAllCasesInSuite(suiteId);
          suiteCases.forEach(caseId => caseIds.add(caseId));
        }
      }

      // Apply query filters
      if (input.queryFilters) {
        const filteredCases = await this.filterCases(
          Array.from(caseIds),
          input.queryFilters,
        );
        const filteredSet = new Set(filteredCases);
        caseIds.forEach(id => {
          if (!filteredSet.has(id)) {
            caseIds.delete(id);
          }
        });
      }

      // Apply exclude list
      if (input.excludeIds && input.excludeIds.length > 0) {
        input.excludeIds.forEach(id => caseIds.delete(id));
      }

      return Array.from(caseIds);
    } catch (error) {
      logger.error(`Error resolving cases from selection: ${error}`);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to resolve cases from selection',
      );
    }
  }

  /**
   * Get all cases in a suite (recursive - includes child suites)
   */
  private async getAllCasesInSuite(suiteId: string): Promise<string[]> {
    const caseIds: string[] = [];

    // Get cases directly in this suite
    const directCases = await this.prisma.testCase.findMany({
      where: {
        suiteId,
        deletedAt: null,
      },
      select: { id: true },
    });

    directCases.forEach(tc => caseIds.push(tc.id));

    // Get child suites recursively
    const childSuites = await this.prisma.suite.findMany({
      where: {
        parentSuiteId: suiteId,
        deletedAt: null,
      },
      select: { id: true },
    });

    for (const childSuite of childSuites) {
      const childCases = await this.getAllCasesInSuite(childSuite.id);
      childCases.forEach(id => caseIds.push(id));
    }

    return caseIds;
  }

  /**
   * Apply query filters to case IDs
   */
  private async filterCases(
    caseIds: string[],
    filters: Record<string, any>,
  ): Promise<string[]> {
    if (caseIds.length === 0) return [];

    const where: any = {
      id: { in: caseIds },
      deletedAt: null,
    };

    if (filters.priority) where.priority = filters.priority;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.automationStatus) where.automationStatus = filters.automationStatus;

    const filtered = await this.prisma.testCase.findMany({
      where,
      select: { id: true },
    });

    return filtered.map(tc => tc.id);
  }

  /**
   * ========== RUN ENDPOINTS ==========
   */

  /**
   * POST /api/v1/projects/:projectId/runs
   * Create run with case selection (preview first, then create)
   */
  async previewCaseSelection(
    projectId: string,
    input: CaseSelectionInput,
  ): Promise<CaseSelectionPreview> {
    try {
      // Verify project exists
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Project not found');
      }

      // Resolve cases
      const selectedCaseIds = await this.resolveCasesFromSelection(input);

      // Build suite breakdown
      const suiteMap = new Map<string, { name: string; count: number }>();

      for (const caseId of selectedCaseIds) {
        const testCase = await this.prisma.testCase.findUnique({
          where: { id: caseId },
          include: { suite: true },
        });

        if (testCase) {
          const key = testCase.suite.id;
          if (!suiteMap.has(key)) {
            suiteMap.set(key, { name: testCase.suite.name, count: 0 });
          }
          const entry = suiteMap.get(key)!;
          entry.count++;
        }
      }

      const suiteBreakdown = Array.from(suiteMap.entries()).map(
        ([suiteId, data]) => ({
          suiteId,
          suiteName: data.name,
          caseCount: data.count,
        }),
      );

      return {
        selectedCases: selectedCaseIds,
        totalCount: selectedCaseIds.length,
        suiteBreakdown,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error previewing case selection: ${error}`);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to preview case selection',
      );
    }
  }

  /**
   * Create test run with selected cases
   */
  async createRun(
    projectId: string,
    userId: string,
    input: CreateRunInput,
  ): Promise<TestRunDTO> {
    try {
      // Verify project exists
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Project not found');
      }

      // Resolve cases
      const selectedCaseIds = await this.resolveCasesFromSelection(
        input.caseSelection,
      );

      if (selectedCaseIds.length === 0) {
        throw new AppError(
          400,
          ErrorCodes.VALIDATION_FAILED,
          'No cases selected for this run',
        );
      }

      // Create test run
      const testRun = await this.prisma.testRun.create({
        data: {
          projectId,
          title: input.title,
          type: input.type,
          environment: input.environment,
          plannedStart: input.plannedStart,
          dueDate: input.dueDate,
          milestoneId: input.milestoneId,
          buildNumber: input.buildNumber,
          branch: input.branch,
          defaultAssigneeId: input.defaultAssigneeId,
          riskThreshold: 'HIGH',
        },
      });

      // Create run cases (bulk insert)
      const runCases = selectedCaseIds.map(caseId => ({
        runId: testRun.id,
        caseId,
        assigneeId: input.defaultAssigneeId || null,
      }));

      await this.prisma.runCase.createMany({
        data: runCases,
      });

      // Log audit
      await this.logAudit(projectId, userId, 'TestRun', testRun.id, AuditAction.CREATE);

      return this.mapTestRunToDTO(testRun);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error creating run: ${error}`);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to create run',
      );
    }
  }

  /**
   * GET /api/v1/projects/:projectId/runs
   * List runs (paginated, filtered)
   */
  async listRuns(
    projectId: string,
    page: number = 1,
    limit: number = 20,
    filters?: RunListFilters,
  ): Promise<PaginatedResponse<TestRunDTO>> {
    try {
      // Verify project exists
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Project not found');
      }

      // Build where clause
      const where: any = {
        projectId,
        deletedAt: null,
      };

      if (filters?.status) where.status = filters.status;
      if (filters?.type) where.type = filters.type;
      if (filters?.environment) where.environment = filters.environment;
      if (filters?.milestoneId) where.milestoneId = filters.milestoneId;
      if (filters?.buildNumber) where.buildNumber = filters.buildNumber;

      if (filters?.dateFrom || filters?.dateTo) {
        where.plannedStart = {};
        if (filters.dateFrom) where.plannedStart.gte = filters.dateFrom;
        if (filters.dateTo) where.plannedStart.lte = filters.dateTo;
      }

      // Count total
      const total = await this.prisma.testRun.count({ where });

      // Fetch paginated
      const runs = await this.prisma.testRun.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        data: runs.map(run => this.mapTestRunToDTO(run)),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error listing runs: ${error}`);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to list runs',
      );
    }
  }

  /**
   * GET /api/v1/projects/:projectId/runs/:id
   * Run detail with metrics
   */
  async getRunDetail(projectId: string, runId: string): Promise<{
    run: TestRunDTO;
    metrics: RunMetrics;
    cases: RunCaseDTO[];
  }> {
    try {
      const run = await this.prisma.testRun.findUnique({
        where: { id: runId },
      });

      if (!run || run.projectId !== projectId || run.deletedAt !== null) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Run not found');
      }

      const cases = await this.getRunCases(runId);
      const metrics = await this.calculateRunMetrics(runId);

      return {
        run: this.mapTestRunToDTO(run),
        metrics,
        cases,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error getting run detail: ${error}`);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to get run detail',
      );
    }
  }

  /**
   * PUT /api/v1/projects/:projectId/runs/:id
   * Update run metadata
   */
  async updateRun(
    projectId: string,
    runId: string,
    userId: string,
    input: UpdateRunInput,
  ): Promise<TestRunDTO> {
    try {
      const run = await this.prisma.testRun.findUnique({
        where: { id: runId },
      });

      if (!run || run.projectId !== projectId || run.deletedAt !== null) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Run not found');
      }

      const updated = await this.prisma.testRun.update({
        where: { id: runId },
        data: {
          title: input.title ?? run.title,
          environment: input.environment ?? run.environment,
          plannedStart: input.plannedStart ?? run.plannedStart,
          dueDate: input.dueDate ?? run.dueDate,
          milestoneId: input.milestoneId ?? run.milestoneId,
          buildNumber: input.buildNumber ?? run.buildNumber,
          branch: input.branch ?? run.branch,
          defaultAssigneeId: input.defaultAssigneeId ?? run.defaultAssigneeId,
        },
      });

      // Log audit
      await this.logAudit(projectId, userId, 'TestRun', runId, AuditAction.UPDATE);

      return this.mapTestRunToDTO(updated);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error updating run: ${error}`);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to update run',
      );
    }
  }

  /**
   * DELETE /api/v1/projects/:projectId/runs/:id
   * Soft delete run
   */
  async deleteRun(
    projectId: string,
    runId: string,
    userId: string,
  ): Promise<void> {
    try {
      const run = await this.prisma.testRun.findUnique({
        where: { id: runId },
      });

      if (!run || run.projectId !== projectId || run.deletedAt !== null) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Run not found');
      }

      await this.prisma.testRun.update({
        where: { id: runId },
        data: { deletedAt: new Date() },
      });

      // Log audit
      await this.logAudit(projectId, userId, 'TestRun', runId, AuditAction.DELETE);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error deleting run: ${error}`);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to delete run',
      );
    }
  }

  /**
   * POST /api/v1/projects/:projectId/runs/:id/close
   * Close run (requires approval role check)
   */
  async closeRun(
    projectId: string,
    runId: string,
    userId: string,
    userRole: string,
  ): Promise<TestRunDTO> {
    try {
      // Check if user has approval role (ADMIN, MANAGER, QA_LEAD)
      const allowedRoles = ['ADMIN', 'MANAGER', 'QA_LEAD'];
      if (!allowedRoles.includes(userRole)) {
        throw new AppError(
          403,
          ErrorCodes.FORBIDDEN,
          'Insufficient permissions to close run',
        );
      }

      const run = await this.prisma.testRun.findUnique({
        where: { id: runId },
      });

      if (!run || run.projectId !== projectId || run.deletedAt !== null) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Run not found');
      }

      const closed = await this.prisma.testRun.update({
        where: { id: runId },
        data: { status: 'COMPLETED' },
      });

      // Log audit
      await this.logAudit(projectId, userId, 'TestRun', runId, AuditAction.UPDATE);

      return this.mapTestRunToDTO(closed);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error closing run: ${error}`);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to close run',
      );
    }
  }

  /**
   * POST /api/v1/projects/:projectId/runs/:id/clone
   * Clone run with cases
   */
  async cloneRun(
    projectId: string,
    runId: string,
    userId: string,
    input: CloneRunInput,
  ): Promise<CloneRunResult> {
    try {
      const original = await this.prisma.testRun.findUnique({
        where: { id: runId },
        include: { runCases: true },
      });

      if (!original || original.projectId !== projectId || original.deletedAt !== null) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Run not found');
      }

      // Determine which cases to copy
      let caseIds: string[];
      if (input.newCaseSelection) {
        caseIds = await this.resolveCasesFromSelection(input.newCaseSelection);
      } else {
        caseIds = original.runCases.map(rc => rc.caseId);
      }

      // Create new run
      const cloned = await this.prisma.testRun.create({
        data: {
          projectId,
          title: input.title,
          type: original.type,
          environment: original.environment,
          plannedStart: input.plannedStart,
          dueDate: input.dueDate,
          milestoneId: original.milestoneId,
          buildNumber: original.buildNumber,
          branch: original.branch,
          defaultAssigneeId: original.defaultAssigneeId,
          riskThreshold: original.riskThreshold,
        },
      });

      // Create run cases
      const runCases = caseIds.map(caseId => ({
        runId: cloned.id,
        caseId,
        assigneeId: original.defaultAssigneeId || null,
      }));

      await this.prisma.runCase.createMany({
        data: runCases,
      });

      // Log audit
      await this.logAudit(projectId, userId, 'TestRun', cloned.id, AuditAction.CREATE);

      return {
        originalRunId: runId,
        clonedRunId: cloned.id,
        casesCopied: caseIds.length,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error cloning run: ${error}`);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to clone run',
      );
    }
  }

  /**
   * ========== RUN CASE ENDPOINTS ==========
   */

  /**
   * GET /api/v1/runs/:runId/cases
   * List cases in run with current status
   */
  private async getRunCases(runId: string): Promise<RunCaseDTO[]> {
    const runCases = await this.prisma.runCase.findMany({
      where: { runId },
      include: {
        testCase: {
          select: {
            id: true,
            title: true,
            estimatedTime: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        stepResults: {
          select: {
            id: true,
            runCaseId: true,
            stepId: true,
            status: true,
            comment: true,
            attachments: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return runCases.map(rc => ({
      id: rc.id,
      runId: rc.runId,
      caseId: rc.caseId,
      assigneeId: rc.assigneeId,
      status: rc.status,
      executionType: rc.executionType,
      startedAt: rc.startedAt,
      completedAt: rc.completedAt,
      testCase: rc.testCase,
      assignee: rc.assignee || undefined,
      stepResults: rc.stepResults,
      createdAt: rc.createdAt,
      updatedAt: rc.updatedAt,
    }));
  }

  /**
   * PUT /api/v1/runs/:runId/cases/:runCaseId
   * Update run case status + step results
   */
  async updateRunCaseStatus(
    runId: string,
    runCaseId: string,
    userId: string,
    input: UpdateRunCaseStatusInput,
  ): Promise<RunCaseDTO> {
    try {
      const runCase = await this.prisma.runCase.findUnique({
        where: { id: runCaseId },
      });

      if (!runCase || runCase.runId !== runId) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Run case not found');
      }

      // Update run case status
      const updated = await this.prisma.runCase.update({
        where: { id: runCaseId },
        data: {
          status: input.status,
          executionType: input.executionType ?? runCase.executionType,
          assigneeId: input.assigneeId ?? runCase.assigneeId,
          startedAt: ['IN_PROGRESS'].includes(input.status) ? new Date() : runCase.startedAt,
          completedAt: ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'].includes(input.status)
            ? new Date()
            : null,
        },
        include: {
          testCase: {
            select: {
              id: true,
              title: true,
              estimatedTime: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update step results if provided
      if (input.stepResults && input.stepResults.length > 0) {
        for (const stepResult of input.stepResults) {
          await this.prisma.stepResult.upsert({
            where: {
              runCaseId_stepId: {
                runCaseId,
                stepId: stepResult.stepId,
              },
            },
            update: {
              status: stepResult.status,
              comment: stepResult.comment ?? undefined,
              attachments: stepResult.attachments ?? undefined,
            },
            create: {
              runCaseId,
              stepId: stepResult.stepId,
              status: stepResult.status,
              comment: stepResult.comment ?? null,
              attachments: stepResult.attachments ?? null,
            },
          });
        }
      }

      // Log audit
      const run = await this.prisma.testRun.findUnique({
        where: { id: runId },
      });
      if (run) {
        await this.logAudit(run.projectId, userId, 'RunCase', runCaseId, AuditAction.UPDATE);
      }

      // Fetch full updated case
      const fullUpdated = await this.prisma.runCase.findUnique({
        where: { id: runCaseId },
        include: {
          testCase: {
            select: {
              id: true,
              title: true,
              estimatedTime: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          stepResults: {
            select: {
              id: true,
              runCaseId: true,
              stepId: true,
              status: true,
              comment: true,
              attachments: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      return {
        id: fullUpdated!.id,
        runId: fullUpdated!.runId,
        caseId: fullUpdated!.caseId,
        assigneeId: fullUpdated!.assigneeId,
        status: fullUpdated!.status,
        executionType: fullUpdated!.executionType,
        startedAt: fullUpdated!.startedAt,
        completedAt: fullUpdated!.completedAt,
        testCase: fullUpdated!.testCase,
        assignee: fullUpdated!.assignee || undefined,
        stepResults: fullUpdated!.stepResults,
        createdAt: fullUpdated!.createdAt,
        updatedAt: fullUpdated!.updatedAt,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error updating run case status: ${error}`);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to update run case status',
      );
    }
  }

  /**
   * POST /api/v1/runs/:runId/cases/bulk-status
   * Bulk status update (must handle 200 cases in under 2 seconds)
   */
  async bulkUpdateCaseStatus(
    runId: string,
    userId: string,
    input: BulkStatusUpdateInput,
  ): Promise<BulkStatusUpdateResult> {
    const errors: { runCaseId: string; error: string }[] = [];
    let updated = 0;

    try {
      // Verify run exists
      const run = await this.prisma.testRun.findUnique({
        where: { id: runId },
      });

      if (!run) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Run not found');
      }

      // Process updates in parallel batches for performance
      const batchSize = 50;
      for (let i = 0; i < input.updates.length; i += batchSize) {
        const batch = input.updates.slice(i, i + batchSize);

        const updatePromises = batch.map(async update => {
          try {
            const runCase = await this.prisma.runCase.findUnique({
              where: { id: update.runCaseId },
            });

            if (!runCase || runCase.runId !== runId) {
              throw new Error('Run case not found');
            }

            // Update run case
            await this.prisma.runCase.update({
              where: { id: update.runCaseId },
              data: {
                status: update.status,
                assigneeId: update.assigneeId ?? runCase.assigneeId,
                startedAt: ['IN_PROGRESS'].includes(update.status) ? new Date() : runCase.startedAt,
                completedAt: ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'].includes(update.status)
                  ? new Date()
                  : null,
              },
            });

            // Update step results if provided
            if (update.stepResults && update.stepResults.length > 0) {
              for (const stepResult of update.stepResults) {
                await this.prisma.stepResult.upsert({
                  where: {
                    runCaseId_stepId: {
                      runCaseId: update.runCaseId,
                      stepId: stepResult.stepId,
                    },
                  },
                  update: {
                    status: stepResult.status,
                    comment: stepResult.comment ?? undefined,
                    attachments: stepResult.attachments ?? undefined,
                  },
                  create: {
                    runCaseId: update.runCaseId,
                    stepId: stepResult.stepId,
                    status: stepResult.status,
                    comment: stepResult.comment ?? null,
                    attachments: stepResult.attachments ?? null,
                  },
                });
              }
            }

            updated++;
          } catch (error) {
            errors.push({
              runCaseId: update.runCaseId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        });

        await Promise.all(updatePromises);
      }

      // Log audit only if all successful
      if (errors.length === 0) {
        await this.logAudit(run.projectId, userId, 'TestRun', runId, AuditAction.UPDATE);
      }

      return {
        updated,
        failed: errors.length,
        errors,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error bulk updating case statuses: ${error}`);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to bulk update case statuses',
      );
    }
  }

  /**
   * ========== METRICS ENDPOINTS ==========
   */

  /**
   * GET /api/v1/runs/:runId/metrics
   * Live metrics aggregation
   */
  async calculateRunMetrics(runId: string): Promise<RunMetrics> {
    try {
      const runCases = await this.prisma.runCase.findMany({
        where: { runId },
        include: {
          testCase: {
            select: { estimatedTime: true },
          },
          assignee: {
            select: { id: true, name: true },
          },
        },
      });

      if (runCases.length === 0) {
        return this.emptyMetrics();
      }

      // Count statuses
      const statusCounts = {
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        notRun: 0,
        inProgress: 0,
      };

      const testerStats = new Map<string, any>();
      let estimatedTime = 0;
      let actualTime = 0;
      const failedThenPassedCases = new Set<string>();
      const failedCases = new Map<string, boolean>();

      for (const rc of runCases) {
        // Count status
        switch (rc.status) {
          case 'PASSED':
            statusCounts.passed++;
            if (failedCases.has(rc.caseId)) {
              failedThenPassedCases.add(rc.caseId);
            }
            break;
          case 'FAILED':
            statusCounts.failed++;
            failedCases.set(rc.caseId, true);
            break;
          case 'BLOCKED':
            statusCounts.blocked++;
            break;
          case 'SKIPPED':
            statusCounts.skipped++;
            break;
          case 'IN_PROGRESS':
            statusCounts.inProgress++;
            break;
          default:
            statusCounts.notRun++;
        }

        // Calculate time
        if (rc.testCase?.estimatedTime) {
          estimatedTime += rc.testCase.estimatedTime;
        }
        if (rc.startedAt && rc.completedAt) {
          actualTime += (rc.completedAt.getTime() - rc.startedAt.getTime()) / 60000;
        }

        // Tester performance
        if (rc.assignee) {
          const testerId = rc.assignee.id;
          const testerName = rc.assignee.name;
          if (!testerStats.has(testerId)) {
            testerStats.set(testerId, {
              testerId,
              testerName,
              casesHandled: 0,
              passed: 0,
              failed: 0,
              blocked: 0,
              totalTime: 0,
            });
          }
          const stats = testerStats.get(testerId);
          if (['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'].includes(rc.status)) {
            stats.casesHandled++;
            if (rc.status === 'PASSED') stats.passed++;
            if (rc.status === 'FAILED') stats.failed++;
            if (rc.status === 'BLOCKED') stats.blocked++;
            if (rc.startedAt && rc.completedAt) {
              stats.totalTime += rc.completedAt.getTime() - rc.startedAt.getTime();
            }
          }
        }
      }

      // Count defects
      const defectCount = await this.prisma.defect.count({
        where: {
          runCase: {
            runId,
          },
        },
      });

      // Build tester performance array
      const testerPerformance: TesterPerformance[] = Array.from(testerStats.values()).map(
        (stats: any) => ({
          testerId: stats.testerId,
          testerName: stats.testerName,
          casesHandled: stats.casesHandled,
          passed: stats.passed,
          failed: stats.failed,
          blocked: stats.blocked,
          passRate: stats.casesHandled > 0 ? (stats.passed / stats.casesHandled) * 100 : 0,
          averageTimePerCase:
            stats.casesHandled > 0 ? stats.totalTime / stats.casesHandled / 60000 : 0,
        }),
      );

      const completedCases =
        statusCounts.passed +
        statusCounts.failed +
        statusCounts.blocked +
        statusCounts.skipped;
      const completionRate = (completedCases / runCases.length) * 100;
      const passRate =
        statusCounts.passed + statusCounts.blocked > 0
          ? ((statusCounts.passed + statusCounts.blocked) /
              (statusCounts.passed + statusCounts.failed + statusCounts.blocked)) *
            100
          : 0;
      const failRate = 100 - passRate;

      return {
        totalCases: runCases.length,
        passedCases: statusCounts.passed,
        failedCases: statusCounts.failed,
        blockedCases: statusCounts.blocked,
        skippedCases: statusCounts.skipped,
        notRunCases: statusCounts.notRun,
        inProgressCases: statusCounts.inProgress,
        passRate: Math.round(passRate * 100) / 100,
        failRate: Math.round(failRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        defectCount,
        flakyTests: Array.from(failedThenPassedCases),
        estimatedTime,
        actualTime: Math.round(actualTime),
        testerPerformance,
      };
    } catch (error) {
      logger.error(`Error calculating run metrics: ${error}`);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to calculate run metrics',
      );
    }
  }

  /**
   * Helper to return empty metrics
   */
  private emptyMetrics(): RunMetrics {
    return {
      totalCases: 0,
      passedCases: 0,
      failedCases: 0,
      blockedCases: 0,
      skippedCases: 0,
      notRunCases: 0,
      inProgressCases: 0,
      passRate: 0,
      failRate: 0,
      completionRate: 0,
      defectCount: 0,
      flakyTests: [],
      estimatedTime: 0,
      actualTime: 0,
      testerPerformance: [],
    };
  }

  /**
   * ========== HELPERS ==========
   */

  private mapTestRunToDTO(run: TestRun): TestRunDTO {
    return {
      id: run.id,
      projectId: run.projectId,
      title: run.title,
      type: run.type,
      environment: run.environment,
      milestoneId: run.milestoneId,
      buildNumber: run.buildNumber,
      branch: run.branch,
      status: run.status,
      plannedStart: run.plannedStart,
      dueDate: run.dueDate,
      defaultAssigneeId: run.defaultAssigneeId,
      riskThreshold: run.riskThreshold,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    };
  }

  private async logAudit(
    projectId: string,
    userId: string,
    entityType: string,
    entityId: string,
    action: AuditAction,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          projectId,
          userId,
          entityType,
          entityId,
          action,
        },
      });
    } catch (error) {
      logger.warn(`Failed to log audit: ${error}`);
    }
  }
}
