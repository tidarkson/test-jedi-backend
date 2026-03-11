"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRepositoryService = void 0;
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const errors_1 = require("../types/errors");
const logger_1 = require("../config/logger");
const client_1 = require("@prisma/client");
class TestRepositoryService {
    constructor() {
        this.prisma = (0, database_1.getPrisma)();
        this.suiteTreeTtlSeconds = 30;
    }
    /**
     * ========== SUITE OPERATIONS ==========
     */
    /**
     * GET /api/v1/projects/:projectId/suites — tree structure
     */
    async getSuiteTree(projectId) {
        try {
            const cacheKey = this.getSuiteTreeCacheKey(projectId);
            const redis = (0, redis_1.getRedisOptional)();
            if (redis) {
                try {
                    const cached = await redis.get(cacheKey);
                    if (cached) {
                        return JSON.parse(cached);
                    }
                }
                catch (error) {
                    logger_1.logger.warn(`Suite tree cache read failed for ${cacheKey}: ${error}`);
                }
            }
            // Verify project exists
            const project = await this.prisma.project.findUnique({
                where: { id: projectId },
            });
            if (!project) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Project not found');
            }
            const rows = await this.prisma.$queryRaw `
        WITH RECURSIVE suite_tree AS (
          SELECT
            s."id",
            s."projectId",
            s."parentSuiteId",
            s."name",
            s."description",
            s."ownerId",
            s."reviewerId",
            s."status",
            s."isLocked",
            s."createdAt",
            s."updatedAt"
          FROM "Suite" s
          WHERE s."projectId" = ${projectId}
            AND s."deletedAt" IS NULL
            AND s."parentSuiteId" IS NULL
          UNION ALL
          SELECT
            c."id",
            c."projectId",
            c."parentSuiteId",
            c."name",
            c."description",
            c."ownerId",
            c."reviewerId",
            c."status",
            c."isLocked",
            c."createdAt",
            c."updatedAt"
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
        SELECT
          st."id",
          st."projectId",
          st."parentSuiteId",
          st."name",
          st."description",
          st."ownerId",
          st."reviewerId",
          st."status",
          st."isLocked",
          st."createdAt",
          st."updatedAt",
          COALESCE(cc."caseCount", 0)::bigint AS "caseCount"
        FROM suite_tree st
        LEFT JOIN case_counts cc ON cc."suiteId" = st."id"
        ORDER BY st."createdAt" ASC
      `;
            const nodeMap = new Map();
            rows.forEach((row) => {
                nodeMap.set(row.id, {
                    id: row.id,
                    projectId: row.projectId,
                    parentSuiteId: row.parentSuiteId,
                    name: row.name,
                    description: row.description,
                    ownerId: row.ownerId,
                    reviewerId: row.reviewerId,
                    status: row.status,
                    isLocked: row.isLocked,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt,
                    caseCount: Number(row.caseCount),
                    childSuites: [],
                });
            });
            const tree = [];
            nodeMap.forEach((node) => {
                if (node.parentSuiteId && nodeMap.has(node.parentSuiteId)) {
                    nodeMap.get(node.parentSuiteId).childSuites.push(node);
                }
                else {
                    tree.push(node);
                }
            });
            if (redis) {
                try {
                    await redis.setex(cacheKey, this.suiteTreeTtlSeconds, JSON.stringify(tree));
                }
                catch (error) {
                    logger_1.logger.warn(`Suite tree cache write failed for ${cacheKey}: ${error}`);
                }
            }
            return tree;
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error getting suite tree: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch suite tree');
        }
    }
    /**
     * POST /api/v1/projects/:projectId/suites — create suite
     */
    async createSuite(projectId, userId, input) {
        try {
            // Verify project exists
            const project = await this.prisma.project.findUnique({
                where: { id: projectId },
            });
            if (!project) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Project not found');
            }
            // Verify parent suite exists if provided
            if (input.parentSuiteId) {
                const parentSuite = await this.prisma.suite.findFirst({
                    where: {
                        id: input.parentSuiteId,
                        projectId,
                        deletedAt: null,
                    },
                });
                if (!parentSuite) {
                    throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Parent suite not found');
                }
                // Check if parent is locked
                if (parentSuite.isLocked) {
                    throw new errors_1.AppError(423, 'LOCKED_RESOURCE', 'Parent suite is locked');
                }
            }
            // Create suite
            const suite = await this.prisma.suite.create({
                data: {
                    projectId,
                    name: input.name,
                    description: input.description,
                    parentSuiteId: input.parentSuiteId,
                    ownerId: userId,
                    status: 'ACTIVE',
                },
            });
            // Create audit log
            await this.createAuditLog(projectId, userId, 'Suite', suite.id, 'CREATE', JSON.stringify(suite));
            logger_1.logger.info(`Suite created: ${suite.id} (Project: ${projectId})`);
            await this.invalidateSuiteTreeCache(projectId);
            return this.formatSuiteDTO(suite);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error creating suite: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create suite');
        }
    }
    /**
     * PUT /api/v1/projects/:projectId/suites/:id — update suite
     */
    async updateSuite(projectId, suiteId, userId, input) {
        try {
            // Get suite
            const suite = await this.prisma.suite.findFirst({
                where: {
                    id: suiteId,
                    projectId,
                    deletedAt: null,
                },
            });
            if (!suite) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Suite not found');
            }
            // Check if suite is locked
            if (suite.isLocked) {
                throw new errors_1.AppError(423, 'LOCKED_RESOURCE', 'Suite is locked');
            }
            // Store old state for audit
            const oldData = JSON.stringify(suite);
            // Verify parent suite if updating
            if (input.parentSuiteId) {
                const parentSuite = await this.prisma.suite.findFirst({
                    where: {
                        id: input.parentSuiteId,
                        projectId,
                        deletedAt: null,
                    },
                });
                if (!parentSuite) {
                    throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Parent suite not found');
                }
                // Prevent circular reference
                if (input.parentSuiteId === suiteId) {
                    throw new errors_1.AppError(400, 'VALIDATION_FAILED', 'Cannot set suite as its own parent');
                }
            }
            // Update suite
            const updated = await this.prisma.suite.update({
                where: { id: suiteId },
                data: {
                    name: input.name,
                    description: input.description,
                    parentSuiteId: input.parentSuiteId ?? undefined,
                    status: input.status,
                    reviewerId: input.reviewerId ?? undefined,
                },
            });
            // Create audit log
            await this.createAuditLog(projectId, userId, 'Suite', suiteId, 'UPDATE', JSON.stringify({
                before: JSON.parse(oldData),
                after: updated,
            }));
            logger_1.logger.info(`Suite updated: ${suiteId}`);
            await this.invalidateSuiteTreeCache(projectId);
            return this.formatSuiteDTO(updated);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error updating suite: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to update suite');
        }
    }
    /**
     * DELETE /api/v1/projects/:projectId/suites/:id — soft delete
     */
    async deleteSuite(projectId, suiteId, userId) {
        try {
            const suite = await this.prisma.suite.findFirst({
                where: {
                    id: suiteId,
                    projectId,
                    deletedAt: null,
                },
            });
            if (!suite) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Suite not found');
            }
            // Check if suite is locked
            if (suite.isLocked) {
                throw new errors_1.AppError(423, 'LOCKED_RESOURCE', 'Suite is locked');
            }
            // Soft delete suite and all its test cases
            await this.prisma.suite.update({
                where: { id: suiteId },
                data: { deletedAt: new Date() },
            });
            // Soft delete all cases in this suite
            await this.prisma.testCase.updateMany({
                where: { suiteId },
                data: { deletedAt: new Date() },
            });
            // Create audit log
            await this.createAuditLog(projectId, userId, 'Suite', suiteId, 'DELETE', JSON.stringify(suite));
            logger_1.logger.info(`Suite soft deleted: ${suiteId}`);
            await this.invalidateSuiteTreeCache(projectId);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error deleting suite: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to delete suite');
        }
    }
    /**
     * POST /api/v1/projects/:projectId/suites/:id/clone — clone with all cases
     */
    async cloneSuite(projectId, suiteId, userId) {
        try {
            const suite = await this.prisma.suite.findFirst({
                where: {
                    id: suiteId,
                    projectId,
                    deletedAt: null,
                },
                include: {
                    testCases: {
                        where: { deletedAt: null },
                        include: {
                            steps: true,
                        },
                    },
                },
            });
            if (!suite) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Suite not found');
            }
            // Create cloned suite
            const clonedSuite = await this.prisma.suite.create({
                data: {
                    projectId,
                    name: `${suite.name} (Clone)`,
                    description: suite.description,
                    ownerId: userId,
                    status: 'DRAFT',
                },
            });
            // Clone all test cases and steps
            let casesCopied = 0;
            for (const testCase of suite.testCases) {
                const clonedCase = await this.prisma.testCase.create({
                    data: {
                        suiteId: clonedSuite.id,
                        title: testCase.title,
                        description: testCase.description,
                        preconditions: testCase.preconditions,
                        postconditions: testCase.postconditions,
                        priority: testCase.priority,
                        severity: testCase.severity,
                        type: testCase.type,
                        riskLevel: testCase.riskLevel,
                        automationStatus: testCase.automationStatus,
                        estimatedTime: testCase.estimatedTime,
                        status: 'DRAFT',
                        authorId: userId,
                        tags: testCase.tags || undefined,
                        customFields: testCase.customFields || undefined,
                    },
                });
                // Clone steps
                for (const step of testCase.steps) {
                    await this.prisma.testStep.create({
                        data: {
                            testCaseId: clonedCase.id,
                            order: step.order,
                            action: step.action,
                            expectedResult: step.expectedResult,
                            testData: step.testData || undefined,
                        },
                    });
                }
                casesCopied++;
            }
            // Create audit log
            await this.createAuditLog(projectId, userId, 'Suite', clonedSuite.id, 'CREATE', JSON.stringify({
                action: 'CLONE',
                sourceId: suiteId,
                casesCopied,
            }));
            logger_1.logger.info(`Suite cloned: ${suiteId} -> ${clonedSuite.id} (${casesCopied} cases)`);
            return {
                original: this.formatSuiteDTO(suite),
                clone: this.formatSuiteDTO(clonedSuite),
                casesCopied,
            };
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error cloning suite: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to clone suite');
        }
    }
    /**
     * POST /api/v1/projects/:projectId/suites/:id/lock — toggle lock
     */
    async toggleSuiteLock(projectId, suiteId, userId) {
        try {
            const suite = await this.prisma.suite.findFirst({
                where: {
                    id: suiteId,
                    projectId,
                    deletedAt: null,
                },
            });
            if (!suite) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Suite not found');
            }
            const updated = await this.prisma.suite.update({
                where: { id: suiteId },
                data: { isLocked: !suite.isLocked },
            });
            // Create audit log
            const logAction = suite.isLocked ? 'UNLOCK' : 'LOCK';
            await this.createAuditLog(projectId, userId, 'Suite', suiteId, 'UPDATE', JSON.stringify({ isLocked: updated.isLocked, action: logAction }));
            logger_1.logger.info(`Suite ${logAction}ed: ${suiteId}`);
            await this.invalidateSuiteTreeCache(projectId);
            return this.formatSuiteDTO(updated);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error toggling suite lock: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to toggle suite lock');
        }
    }
    /**
     * POST /api/v1/projects/:projectId/suites/:id/archive — archive suite
     */
    async archiveSuite(projectId, suiteId, userId) {
        try {
            const suite = await this.prisma.suite.findFirst({
                where: {
                    id: suiteId,
                    projectId,
                    deletedAt: null,
                },
            });
            if (!suite) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Suite not found');
            }
            if (suite.isLocked) {
                throw new errors_1.AppError(423, 'LOCKED_RESOURCE', 'Suite is locked');
            }
            const updated = await this.prisma.suite.update({
                where: { id: suiteId },
                data: { status: 'ARCHIVED' },
            });
            // Create audit log
            await this.createAuditLog(projectId, userId, 'Suite', suiteId, 'UPDATE', JSON.stringify({ status: 'ARCHIVED' }));
            logger_1.logger.info(`Suite archived: ${suiteId}`);
            await this.invalidateSuiteTreeCache(projectId);
            return this.formatSuiteDTO(updated);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error archiving suite: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to archive suite');
        }
    }
    /**
     * ========== TEST CASE OPERATIONS ==========
     */
    /**
     * GET /api/v1/projects/:projectId/cases — paginated list with filters
     */
    async getTestCases(projectId, filters) {
        try {
            const cursorData = this.decodeCursor(filters.cursor);
            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const skip = cursorData ? 0 : (page - 1) * limit;
            // Build filter conditions
            const where = {
                deletedAt: null,
                suite: {
                    projectId,
                },
            };
            // Suite filter
            if (filters.suiteId) {
                where.suiteId = filters.suiteId;
            }
            // Priority filter
            if (filters.priority) {
                where.priority = Array.isArray(filters.priority)
                    ? { in: filters.priority }
                    : filters.priority;
            }
            // Severity filter
            if (filters.severity) {
                where.severity = Array.isArray(filters.severity)
                    ? { in: filters.severity }
                    : filters.severity;
            }
            // Type filter
            if (filters.type) {
                where.type = Array.isArray(filters.type)
                    ? { in: filters.type }
                    : filters.type;
            }
            // Automation status filter
            if (filters.automationStatus) {
                where.automationStatus = Array.isArray(filters.automationStatus)
                    ? { in: filters.automationStatus }
                    : filters.automationStatus;
            }
            // Status filter
            if (filters.status) {
                where.status = Array.isArray(filters.status)
                    ? { in: filters.status }
                    : filters.status;
            }
            // Tags filter
            if (filters.tags && filters.tags.length > 0) {
                where.tags = {
                    hasSome: filters.tags,
                };
            }
            if (cursorData) {
                where.OR = [
                    {
                        createdAt: {
                            lt: cursorData.createdAt,
                        },
                    },
                    {
                        createdAt: cursorData.createdAt,
                        id: {
                            lt: cursorData.id,
                        },
                    },
                ];
            }
            if (filters.search?.trim()) {
                const searchIds = await this.findSearchCandidateCaseIds(projectId, filters.search, Math.min(limit * 5, 500), cursorData);
                if (searchIds.length === 0) {
                    return {
                        data: [],
                        pagination: {
                            page,
                            limit,
                            total: 0,
                            totalPages: 0,
                            hasMore: false,
                        },
                    };
                }
                where.id = { in: searchIds };
            }
            const total = cursorData
                ? 0
                : await this.prisma.testCase.count({ where });
            const testCases = await this.prisma.testCase.findMany({
                where,
                skip,
                take: limit + 1,
                include: {
                    steps: {
                        orderBy: { order: 'asc' },
                    },
                },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            });
            const hasMore = testCases.length > limit;
            const trimmed = hasMore ? testCases.slice(0, limit) : testCases;
            const data = trimmed.map(tc => this.formatTestCaseDTO(tc));
            const nextCursor = hasMore ? this.encodeCursor(trimmed[trimmed.length - 1]) : undefined;
            const totalPages = Math.ceil(total / limit);
            return {
                data,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: cursorData ? 0 : totalPages,
                    hasMore: cursorData ? hasMore : page < totalPages || hasMore,
                    nextCursor,
                },
            };
        }
        catch (error) {
            logger_1.logger.error(`Error getting test cases: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch test cases');
        }
    }
    /**
     * POST /api/v1/projects/:projectId/cases — create case
     */
    async createTestCase(projectId, suiteId, userId, input) {
        try {
            // Verify suite exists and is not locked
            const suite = await this.prisma.suite.findFirst({
                where: {
                    id: suiteId,
                    projectId,
                    deletedAt: null,
                },
            });
            if (!suite) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Suite not found');
            }
            if (suite.isLocked) {
                throw new errors_1.AppError(423, 'LOCKED_RESOURCE', 'Suite is locked');
            }
            // Check for duplicates
            const duplicate = await this.detectDuplicate(suiteId, input.title);
            if (duplicate.isDuplicate) {
                throw new errors_1.AppError(409, 'DUPLICATE_CASE', `Test case with title "${input.title}" already exists in this suite`, { duplicateId: duplicate.duplicateId });
            }
            // Create test case
            const testCase = await this.prisma.testCase.create({
                data: {
                    suiteId,
                    title: input.title,
                    description: input.description,
                    preconditions: input.preconditions,
                    postconditions: input.postconditions,
                    priority: input.priority || 'MEDIUM',
                    severity: input.severity || 'MAJOR',
                    type: input.type || 'FUNCTIONAL',
                    automationStatus: input.automationStatus || 'MANUAL',
                    estimatedTime: input.estimatedTime,
                    status: 'ACTIVE',
                    authorId: userId,
                    reviewerId: input.reviewerId || undefined,
                    tags: input.tags || undefined,
                    customFields: input.customFields || undefined,
                },
            });
            // Create steps if provided
            let steps = [];
            if (input.steps && input.steps.length > 0) {
                const stepsToCreate = input.steps.map((step, idx) => ({
                    testCaseId: testCase.id,
                    order: step.order ?? idx + 1,
                    action: step.action,
                    expectedResult: step.expectedResult,
                    testData: step.testData,
                }));
                // Batch create steps
                for (const step of stepsToCreate) {
                    const created = await this.prisma.testStep.create({
                        data: step,
                    });
                    steps.push(created);
                }
            }
            // Create audit log
            await this.createAuditLog(projectId, userId, 'TestCase', testCase.id, 'CREATE', JSON.stringify(testCase));
            logger_1.logger.info(`Test case created: ${testCase.id} (Suite: ${suiteId})`);
            await this.invalidateSuiteTreeCache(projectId);
            return this.formatTestCaseDTO({ ...testCase, steps });
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error creating test case: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create test case');
        }
    }
    /**
     * GET /api/v1/projects/:projectId/cases/:id — single case with steps
     */
    async getTestCase(projectId, caseId) {
        try {
            const testCase = await this.prisma.testCase.findFirst({
                where: {
                    id: caseId,
                    deletedAt: null,
                    suite: {
                        projectId,
                    },
                },
                include: {
                    steps: {
                        orderBy: { order: 'asc' },
                    },
                },
            });
            if (!testCase) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Test case not found');
            }
            return this.formatTestCaseDTO(testCase);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error getting test case: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch test case');
        }
    }
    /**
     * PUT /api/v1/projects/:projectId/cases/:id — update case (creates new version)
     */
    async updateTestCase(projectId, caseId, userId, input) {
        try {
            const testCase = await this.prisma.testCase.findFirst({
                where: {
                    id: caseId,
                    deletedAt: null,
                    suite: {
                        projectId,
                    },
                },
                include: {
                    suite: true,
                    steps: {
                        orderBy: { order: 'asc' },
                    },
                },
            });
            if (!testCase) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Test case not found');
            }
            // Check if suite is locked
            if (testCase.suite.isLocked) {
                throw new errors_1.AppError(423, 'LOCKED_RESOURCE', 'Suite is locked');
            }
            // Store old state
            const oldData = JSON.stringify(testCase);
            // Update test case
            const updated = await this.prisma.testCase.update({
                where: { id: caseId },
                data: {
                    title: input.title,
                    description: input.description,
                    preconditions: input.preconditions,
                    postconditions: input.postconditions,
                    priority: input.priority,
                    severity: input.severity,
                    type: input.type,
                    automationStatus: input.automationStatus,
                    estimatedTime: input.estimatedTime,
                    status: input.status,
                    reviewerId: input.reviewerId ?? undefined,
                    approvalStatus: input.approvalStatus,
                    tags: input.tags || undefined,
                    customFields: input.customFields || undefined,
                },
                include: {
                    steps: {
                        orderBy: { order: 'asc' },
                    },
                },
            });
            // Handle steps update if provided
            if (input.steps) {
                // Delete existing steps
                await this.prisma.testStep.deleteMany({
                    where: { testCaseId: caseId },
                });
                // Create new steps
                const stepsToCreate = input.steps.map((step, idx) => ({
                    testCaseId: caseId,
                    order: step.order ?? idx + 1,
                    action: step.action,
                    expectedResult: step.expectedResult,
                    testData: step.testData,
                }));
                for (const step of stepsToCreate) {
                    const created = await this.prisma.testStep.create({
                        data: {
                            ...step,
                            testData: step.testData || undefined,
                        },
                    });
                    // Update in memory
                    const idx = updated.steps.findIndex(s => s.order === step.order);
                    if (idx >= 0) {
                        updated.steps[idx] = created;
                    }
                    else {
                        updated.steps.push(created);
                    }
                }
                // Sort steps by order
                updated.steps.sort((a, b) => a.order - b.order);
            }
            // Create audit log
            await this.createAuditLog(projectId, userId, 'TestCase', caseId, 'UPDATE', JSON.stringify({
                before: JSON.parse(oldData),
                after: updated,
            }));
            logger_1.logger.info(`Test case updated: ${caseId}`);
            await this.invalidateSuiteTreeCache(projectId);
            return this.formatTestCaseDTO(updated);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error updating test case: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to update test case');
        }
    }
    /**
     * DELETE /api/v1/projects/:projectId/cases/:id — soft delete
     */
    async deleteTestCase(projectId, caseId, userId) {
        try {
            const testCase = await this.prisma.testCase.findFirst({
                where: {
                    id: caseId,
                    deletedAt: null,
                    suite: {
                        projectId,
                    },
                },
                include: {
                    suite: true,
                },
            });
            if (!testCase) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Test case not found');
            }
            if (testCase.suite.isLocked) {
                throw new errors_1.AppError(423, 'LOCKED_RESOURCE', 'Suite is locked');
            }
            await this.prisma.testCase.update({
                where: { id: caseId },
                data: { deletedAt: new Date() },
            });
            // Create audit log
            await this.createAuditLog(projectId, userId, 'TestCase', caseId, 'DELETE', JSON.stringify(testCase));
            logger_1.logger.info(`Test case soft deleted: ${caseId}`);
            await this.invalidateSuiteTreeCache(projectId);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error deleting test case: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to delete test case');
        }
    }
    /**
     * GET /api/v1/projects/:projectId/cases/:id/history — version history
     */
    async getCaseHistory(projectId, caseId) {
        try {
            // Get all audit logs related to this case
            const auditLogs = await this.prisma.auditLog.findMany({
                where: {
                    projectId,
                    entityType: 'TestCase',
                    entityId: caseId,
                },
                orderBy: { createdAt: 'asc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            return auditLogs.map(log => ({
                changedAt: log.createdAt,
                changedBy: log.user.name,
                action: log.action,
                changes: log.diff,
            }));
        }
        catch (error) {
            logger_1.logger.error(`Error getting case history: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch case history');
        }
    }
    /**
     * ========== BULK OPERATIONS ==========
     */
    /**
     * POST /api/v1/projects/:projectId/cases/bulk — bulk operations (up to 500)
     */
    async bulkOperateTestCases(projectId, userId, input) {
        const result = {
            successful: 0,
            failed: 0,
            details: [],
        };
        try {
            // Verify suite exists and is not locked
            const suite = await this.prisma.suite.findFirst({
                where: {
                    id: input.suiteId,
                    projectId,
                    deletedAt: null,
                },
            });
            if (!suite) {
                throw new errors_1.AppError(404, errors_1.ErrorCodes.NOT_FOUND, 'Suite not found');
            }
            if (suite.isLocked) {
                throw new errors_1.AppError(423, 'LOCKED_RESOURCE', 'Suite is locked');
            }
            // Process each operation
            for (let i = 0; i < input.items.length; i++) {
                const item = input.items[i];
                let success = false;
                let error = undefined;
                let caseId = undefined;
                try {
                    switch (item.action) {
                        case 'create':
                            if (!item.data)
                                throw new Error('Data required for create');
                            const created = await this.createTestCase(projectId, input.suiteId, userId, item.data);
                            caseId = created.id;
                            success = true;
                            break;
                        case 'update':
                            if (!item.id)
                                throw new Error('ID required for update');
                            if (!item.data)
                                throw new Error('Data required for update');
                            const updated = await this.updateTestCase(projectId, item.id, userId, item.data);
                            caseId = updated.id;
                            success = true;
                            break;
                        case 'delete':
                            if (!item.id)
                                throw new Error('ID required for delete');
                            await this.deleteTestCase(projectId, item.id, userId);
                            caseId = item.id;
                            success = true;
                            break;
                        case 'move':
                            if (!item.id)
                                throw new Error('ID required for move');
                            if (!item.newSuiteId)
                                throw new Error('newSuiteId required for move');
                            // Verify new suite exists
                            const newSuite = await this.prisma.suite.findFirst({
                                where: {
                                    id: item.newSuiteId,
                                    projectId,
                                    deletedAt: null,
                                },
                            });
                            if (!newSuite)
                                throw new Error('New suite not found');
                            if (newSuite.isLocked)
                                throw new Error('New suite is locked');
                            await this.prisma.testCase.update({
                                where: { id: item.id },
                                data: { suiteId: item.newSuiteId },
                            });
                            await this.createAuditLog(projectId, userId, 'TestCase', item.id, 'UPDATE', JSON.stringify({
                                action: 'MOVE',
                                fromSuite: input.suiteId,
                                toSuite: item.newSuiteId,
                            }));
                            caseId = item.id;
                            success = true;
                            break;
                    }
                }
                catch (itemError) {
                    error = itemError.message || String(itemError);
                }
                result.details.push({
                    itemIndex: i,
                    action: item.action,
                    success,
                    error,
                    id: caseId,
                });
                if (success) {
                    result.successful++;
                }
                else {
                    result.failed++;
                }
            }
            logger_1.logger.info(`Bulk operations completed: ${result.successful} successful, ${result.failed} failed`);
            if (result.successful > 0) {
                await this.invalidateSuiteTreeCache(projectId);
            }
            return result;
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            logger_1.logger.error(`Error in bulk operations: ${error}`);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Bulk operations failed');
        }
    }
    /**
     * ========== HELPER METHODS ==========
     */
    encodeCursor(entity) {
        return Buffer.from(JSON.stringify({
            id: entity.id,
            createdAt: entity.createdAt.toISOString(),
        })).toString('base64url');
    }
    decodeCursor(cursor) {
        if (!cursor) {
            return null;
        }
        try {
            const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
            if (!decoded?.id || !decoded?.createdAt) {
                return null;
            }
            return {
                id: String(decoded.id),
                createdAt: new Date(String(decoded.createdAt)),
            };
        }
        catch (_error) {
            return null;
        }
    }
    async findSearchCandidateCaseIds(projectId, search, take, cursorData) {
        const cursorSql = cursorData
            ? client_1.Prisma.sql `
        AND (
          tc."createdAt" < ${cursorData.createdAt}
          OR (tc."createdAt" = ${cursorData.createdAt} AND tc."id" < ${cursorData.id})
        )
      `
            : client_1.Prisma.empty;
        const rows = await this.prisma.$queryRaw `
      SELECT tc."id"
      FROM "TestCase" tc
      JOIN "Suite" s ON s."id" = tc."suiteId"
      WHERE s."projectId" = ${projectId}
        AND s."deletedAt" IS NULL
        AND tc."deletedAt" IS NULL
        AND tc."searchVector" @@ plainto_tsquery('english', ${search})
        ${cursorSql}
      ORDER BY tc."createdAt" DESC, tc."id" DESC
      LIMIT ${take}
    `;
        return rows.map((row) => row.id);
    }
    getSuiteTreeCacheKey(projectId) {
        return `suite:tree:${projectId}`;
    }
    async invalidateSuiteTreeCache(projectId) {
        const redis = (0, redis_1.getRedisOptional)();
        if (!redis) {
            return;
        }
        const key = this.getSuiteTreeCacheKey(projectId);
        try {
            await redis.del(key);
        }
        catch (error) {
            logger_1.logger.warn(`Suite tree cache invalidation failed for ${key}: ${error}`);
        }
    }
    /**
     * Detect duplicate test case title in suite
     */
    async detectDuplicate(suiteId, title) {
        const existing = await this.prisma.testCase.findFirst({
            where: {
                suiteId,
                title: {
                    equals: title,
                    mode: 'insensitive',
                },
                deletedAt: null,
            },
        });
        if (existing) {
            return {
                isDuplicate: true,
                duplicateId: existing.id,
                duplicateTitle: existing.title,
            };
        }
        return { isDuplicate: false };
    }
    /**
     * Format suite to DTO
     */
    formatSuiteDTO(suite) {
        return {
            id: suite.id,
            projectId: suite.projectId,
            parentSuiteId: suite.parentSuiteId,
            name: suite.name,
            description: suite.description,
            ownerId: suite.ownerId,
            reviewerId: suite.reviewerId,
            status: suite.status,
            isLocked: suite.isLocked,
            createdAt: suite.createdAt,
            updatedAt: suite.updatedAt,
        };
    }
    /**
     * Format test case to DTO
     */
    formatTestCaseDTO(testCase) {
        return {
            id: testCase.id,
            suiteId: testCase.suiteId,
            externalId: testCase.externalId,
            title: testCase.title,
            description: testCase.description,
            preconditions: testCase.preconditions,
            postconditions: testCase.postconditions,
            priority: testCase.priority,
            severity: testCase.severity,
            type: testCase.type,
            automationStatus: testCase.automationStatus,
            estimatedTime: testCase.estimatedTime,
            status: testCase.status,
            authorId: testCase.authorId,
            reviewerId: testCase.reviewerId,
            approvalStatus: testCase.approvalStatus,
            tags: testCase.tags,
            customFields: testCase.customFields,
            createdAt: testCase.createdAt,
            updatedAt: testCase.updatedAt,
            steps: testCase.steps?.map(step => ({
                id: step.id,
                testCaseId: step.testCaseId,
                order: step.order,
                action: step.action,
                expectedResult: step.expectedResult,
                testData: step.testData,
                createdAt: step.createdAt,
                updatedAt: step.updatedAt,
            })),
        };
    }
    /**
     * Create audit log entry
     */
    async createAuditLog(projectId, userId, entityType, entityId, action, diff) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    projectId,
                    userId,
                    entityType,
                    entityId,
                    action,
                    diff: JSON.parse(diff),
                },
            });
        }
        catch (error) {
            logger_1.logger.warn(`Failed to create audit log: ${error}`);
            // Don't throw, logging failures shouldn't block main operations
        }
    }
}
exports.TestRepositoryService = TestRepositoryService;
//# sourceMappingURL=TestRepositoryService.js.map