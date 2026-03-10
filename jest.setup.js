// Mock bcrypt to avoid native module compilation requirement
jest.mock('bcrypt', () => ({
  hash: jest.fn(async (password) => 'hashed_' + password),
  compare: jest.fn(async (password, hash) => password === hash.replace('hashed_', '')),
  genSalt: jest.fn(async () => 'salt'),
}));

// Create error classes for jwt
class TokenExpiredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

class JsonWebTokenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JsonWebTokenError';
  }
}

// Mock jsonwebtoken to provide consistent token handling
jest.mock('jsonwebtoken', () => {
  const actualJwt = jest.requireActual('jsonwebtoken');
  return {
    sign: jest.fn((payload, secret) => {
      // Return a token that contains the payload info
      return 'signed_' + Buffer.from(JSON.stringify(payload)).toString('base64');
    }),
    verify: jest.fn((token, secret) => {
      // Decode the token to extract the payload
      if (token === 'expired_token') {
        const err = new TokenExpiredError('Token expired');
        throw err;
      }
      if (token === 'invalid_token') {
        const err = new JsonWebTokenError('Invalid token');
        throw err;
      }
      // Extract payload from our simple token format
      if (token.startsWith('signed_')) {
        try {
          const payload = JSON.parse(Buffer.from(token.replace('signed_', ''), 'base64').toString());
          return payload;
        } catch (e) {
          const err = new JsonWebTokenError('Invalid token');
          throw err;
        }
      }
      // Fallback for other tokens
      return {
        userId: 'user-1',
        email: 'test@example.com',
        roles: ['OWNER'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
    }),
    decode: jest.fn((token) => {
      if (token.startsWith('signed_')) {
        try {
          return JSON.parse(Buffer.from(token.replace('signed_', ''), 'base64').toString());
        } catch (e) {
          return null;
        }
      }
      try {
        return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      } catch (e) {
        return null;
      }
    }),
    TokenExpiredError,
    JsonWebTokenError,
  };
});

// Create mock Redis client
const mockRedis = {
  get: jest.fn(async (key) => null),
  set: jest.fn(async () => 'OK'),
  setex: jest.fn(async () => 'OK'),
  del: jest.fn(async () => 1),
  incr: jest.fn(async () => 1),
  expire: jest.fn(async () => 1),
  ttl: jest.fn(async () => -1),
  lpush: jest.fn(async () => 1),
  llen: jest.fn(async () => 0),
  lrange: jest.fn(async () => []),
  rpop: jest.fn(async () => null),
  quit: jest.fn(async () => null),
  on: jest.fn(function() { return this; }),
  once: jest.fn(function() { return this; }),
  ping: jest.fn(async () => 'PONG'),
};

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn(() => mockRedis);
});

// Create in-memory store for test data
const testDataStore = {
  users: {},
  organizations: {},
  projects: {},
  suites: {},
  testCases: {},
  testSteps: {},
  auditLogs: [],
  testRuns: {},
  runCases: {},
};

// Helper function to apply Prisma filters
function applyFilters(items, where) {
  if (!where) return items;
  
  return items.filter(item => {
    // Handle nested property filters (e.g., suite.projectId)
    if (where.suite?.projectId && item.suite) {
      if (item.suite.projectId !== where.suite.projectId) return false;
    }
    if (where.suiteId && item.suiteId !== where.suiteId) return false;
    if (where.deletedAt === null && item.deletedAt !== null) return false;
    if (where.id && item.id !== where.id) return false;
    if (where.projectId && item.projectId !== where.projectId) return false;
    if (where.parentSuiteId !== undefined && item.parentSuiteId !== where.parentSuiteId) return false;
    if (where.title && item.title !== where.title) return false;
    
    // Priority filter
    if (where.priority) {
      if (Array.isArray(where.priority?.in)) {
        if (!where.priority.in.includes(item.priority)) return false;
      } else if (typeof where.priority === 'string') {
        if (item.priority !== where.priority) return false;
      }
    }
    
    // Tags filter with hasSome support
    if (where.tags && where.tags.hasSome && Array.isArray(where.tags.hasSome)) {
      if (!item.tags || !where.tags.hasSome.some(tag => item.tags.includes(tag))) return false;
    }
    
    // OR filter support
    if (where.OR && Array.isArray(where.OR)) {
      const orMatch = where.OR.some(orClause => {
        if (orClause.title?.contains) {
          return item.title && item.title.toLowerCase().includes(orClause.title.contains.toLowerCase());
        }
        return false;
      });
      if (!orMatch && Object.keys(where).some(k => k !== 'OR')) return true; // Allow if other conditions exist
    }
    
    return true;
  });
}

// Mock Prisma client with comprehensive models for test repository
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.email) {
          return testDataStore.users[`email_${where.email}`] || null;
        }
        return testDataStore.users[where.id] || null;
      }),
      create: jest.fn(async ({ data }) => {
        const user = {
          id: require('crypto').randomUUID(),
          email: data.email,
          name: data.name,
          passwordHash: data.passwordHash,
          role: data.role || 'OWNER',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
        };
        testDataStore.users[user.id] = user;
        testDataStore.users[`email_${data.email}`] = user;
        return user;
      }),
      update: jest.fn(async ({ where, data }) => {
        const user = testDataStore.users[where.id];
        if (user) {
          Object.assign(user, data, { updatedAt: new Date() });
        }
        return user;
      }),
      findMany: jest.fn(async () => Object.values(testDataStore.users).filter(v => v.email)),
    },
    organization: {
      create: jest.fn(async ({ data }) => {
        const org = {
          id: require('crypto').randomUUID(),
          name: data.name,
          slug: data.slug,
          plan: data.plan || 'FREE',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        testDataStore.organizations[org.id] = org;
        return org;
      }),
      findUnique: jest.fn(async ({ where }) => {
        return testDataStore.organizations[where.id] || null;
      }),
    },
    project: {
      findUnique: jest.fn(async ({ where }) => {
        return testDataStore.projects[where.id] || null;
      }),
      create: jest.fn(async ({ data }) => {
        const project = {
          id: require('crypto').randomUUID(),
          name: data.name,
          slug: data.slug,
          description: data.description || '',
          organizationId: data.organizationId,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
          deletedAt: null,
        };
        testDataStore.projects[project.id] = project;
        return project;
      }),
      findMany: jest.fn(async ({ where }) => {
        return Object.values(testDataStore.projects).filter(p => !where || (where.organizationId ? p.organizationId === where.organizationId : true));
      }),
      delete: jest.fn(async ({ where }) => {
        const project = testDataStore.projects[where.id];
        if (project) {
          delete testDataStore.projects[where.id];
        }
        return project;
      }),
    },
    suite: {
      findUnique: jest.fn(async ({ where }) => {
        return testDataStore.suites[where.id] || null;
      }),
      findFirst: jest.fn(async ({ where, include }) => {
        const suites = Object.values(testDataStore.suites);
        let result = null;
        
        for (const suite of suites) {
          let matches = true;
          if (where.id && suite.id !== where.id) matches = false;
          if (where.projectId && where.projectId !== suite.projectId) {
            // Allow nested property matching
            if (typeof where.projectId === 'string' && suite.projectId !== where.projectId) matches = false;
          }
          if (where.parentSuiteId !== undefined && suite.parentSuiteId !== where.parentSuiteId) matches = false;
          if (where.deletedAt === null && suite.deletedAt !== null) matches = false;
          if (where.name && suite.name !== where.name) matches = false;
          
          if (matches) {
            result = { ...suite };
            break;
          }
        }
        
        if (!result) return null;
        
        // Apply includes
        if (include && include.testCases) {
          const cases = Object.values(testDataStore.testCases).filter(tc => 
            tc.suiteId === result.id && (!include.testCases.where || 
            (include.testCases.where.deletedAt === null ? tc.deletedAt === null : true))
          );
          
          if (include.testCases.include && include.testCases.include.steps) {
            result.testCases = cases.map(tc => ({
              ...tc,
              steps: Object.values(testDataStore.testSteps).filter(s => s.testCaseId === tc.id),
            }));
          } else {
            result.testCases = cases;
          }
        }
        
        if (include && include.childSuites) {
          result.childSuites = Object.values(testDataStore.suites).filter(cs => 
            cs.parentSuiteId === result.id && cs.deletedAt === null
          );
        }
        
        return result;
      }),
      create: jest.fn(async ({ data }) => {
        const suite = {
          id: require('crypto').randomUUID(),
          name: data.name,
          description: data.description || '',
          projectId: data.projectId,
          parentSuiteId: data.parentSuiteId || null,
          isLocked: false,
          ownerId: data.ownerId,
          reviewerId: data.reviewerId || null,
          status: data.status || 'DRAFT',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
        testDataStore.suites[suite.id] = suite;
        return suite;
      }),
      findMany: jest.fn(async ({ where, include }) => {
        let results = applyFilters(Object.values(testDataStore.suites), where);
        
        if (include && include.childSuites) {
          results = results.map(s => {
            const result = { ...s };
            // Apply childSuites filter with nested where conditions
            let childSuites = Object.values(testDataStore.suites).filter(cs => 
              cs.parentSuiteId === s.id
            );
            
            // Apply nested where filters if provided
            if (include.childSuites.where) {
              childSuites = applyFilters(childSuites, include.childSuites.where);
            }
            
            result.childSuites = childSuites;
            return result;
          });
        }
        
        return results;
      }),
      update: jest.fn(async ({ where, data }) => {
        const suite = testDataStore.suites[where.id];
        if (suite) {
          Object.assign(suite, data, { updatedAt: new Date() });
        }
        return suite;
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        const matching = applyFilters(Object.values(testDataStore.suites), where);
        matching.forEach(s => {
          Object.assign(testDataStore.suites[s.id], data, { updatedAt: new Date() });
        });
        return { count: matching.length };
      }),
      count: jest.fn(async ({ where }) => {
        return applyFilters(Object.values(testDataStore.suites), where).length;
      }),
    },
    testCase: {
      findUnique: jest.fn(async ({ where, include }) => {
        const testCase = testDataStore.testCases[where.id] || null;
        if (!testCase) return null;
        
        const result = { ...testCase };
        if (include && include.suite) {
          result.suite = testDataStore.suites[testCase.suiteId] || null;
        }
        if (include && include.steps) {
          result.steps = Object.values(testDataStore.testSteps || {})
            .filter(s => s.testCaseId === testCase.id)
            .sort((a, b) => a.order - b.order);
        }
        return result;
      }),
      findFirst: jest.fn(async ({ where, include }) => {
        const cases = Object.values(testDataStore.testCases);
        let result = null;
        
        for (const testCase of cases) {
          let matches = true;
          
          // Handle deletion filter
          if (where.deletedAt === null && testCase.deletedAt !== null) matches = false;
          
          // Handle nested suite filters
          if (where.suite?.projectId) {
            const suite = testDataStore.suites[testCase.suiteId];
            if (!suite || suite.projectId !== where.suite.projectId) matches = false;
          }
          
          // Direct filters
          if (where.id && testCase.id !== where.id) matches = false;
          if (where.suiteId && testCase.suiteId !== where.suiteId) matches = false;
          
          // Handle title filter with equals and mode
          if (where.title) {
            let titleMatches = false;
            if (typeof where.title === 'string') {
              titleMatches = testCase.title === where.title;
            } else if (where.title.equals) {
              const titleToMatch = where.title.equals;
              if (where.title.mode === 'insensitive') {
                titleMatches = testCase.title.toLowerCase() === titleToMatch.toLowerCase();
              } else {
                titleMatches = testCase.title === titleToMatch;
              }
            }
            if (!titleMatches) matches = false;
          }
          
          if (matches) {
            result = { ...testCase };
            break;
          }
        }
        
        if (!result) return null;
        
        // Apply includes
        if (include) {
          if (include.suite) {
            result.suite = testDataStore.suites[result.suiteId] || null;
          }
          
          if (include.steps) {
            const steps = Object.values(testDataStore.testSteps)
              .filter(s => s.testCaseId === result.id)
              .sort((a, b) => a.order - b.order);
            result.steps = steps;
          }
        }
        
        return result;
      }),
      create: jest.fn(async ({ data }) => {
        const testCase = {
          id: require('crypto').randomUUID(),
          title: data.title,
          description: data.description || '',
          preconditions: data.preconditions || '',
          postconditions: data.postconditions || '',
          priority: data.priority || 'MEDIUM',
          severity: data.severity || 'MEDIUM',
          type: data.type || 'FUNCTIONAL',
          riskLevel: data.riskLevel,
          automationStatus: data.automationStatus,
          estimatedTime: data.estimatedTime,
          tags: data.tags || [],
          customFields: data.customFields,
          suiteId: data.suiteId,
          createdBy: data.authorId || data.createdBy,
          status: data.status || 'DRAFT',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
        testDataStore.testCases[testCase.id] = testCase;
        return testCase;
      }),
      findMany: jest.fn(async ({ where, include, skip, take, orderBy }) => {
        let results = applyFilters(Object.values(testDataStore.testCases), where);
        
        if (include) {
          results = results.map(tc => {
            const result = { ...tc };
            if (include.suite) {
              result.suite = testDataStore.suites[tc.suiteId] || null;
            }
            if (include.steps) {
              const steps = Object.values(testDataStore.testSteps)
                .filter(s => s.testCaseId === tc.id)
                .sort((a, b) => a.order - b.order);
              result.steps = steps;
            }
            return result;
          });
        }
        
        if (skip !== undefined) {
          results = results.slice(skip);
        }
        if (take !== undefined) {
          results = results.slice(0, take);
        }
        
        return results;
      }),
      update: jest.fn(async ({ where, data, include }) => {
        const testCase = testDataStore.testCases[where.id];
        if (testCase) {
          Object.assign(testCase, data, { updatedAt: new Date() });
        }
        
        let result = testCase ? { ...testCase } : null;
        if (result && include) {
          if (include.steps) {
            result.steps = Object.values(testDataStore.testSteps)
              .filter(s => s.testCaseId === result.id)
              .sort((a, b) => a.order - b.order);
          }
        }
        
        return result;
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        const matching = applyFilters(Object.values(testDataStore.testCases), where);
        matching.forEach(tc => {
          Object.assign(testDataStore.testCases[tc.id], data, { updatedAt: new Date() });
        });
        return { count: matching.length };
      }),
      count: jest.fn(async ({ where }) => {
        return applyFilters(Object.values(testDataStore.testCases), where).length;
      }),
      deleteMany: jest.fn(async ({ where }) => {
        // For testing, we soft-delete by marking as deleted
        const matching = applyFilters(Object.values(testDataStore.testCases), where);
        matching.forEach(tc => {
          testDataStore.testCases[tc.id].deletedAt = new Date();
        });
        return { count: matching.length };
      }),
    },
    testStep: {
      findMany: jest.fn(async ({ where }) => {
        return Object.values(testDataStore.testSteps).filter(s => 
          !where || s.testCaseId === where.testCaseId
        );
      }),
      create: jest.fn(async ({ data }) => {
        const step = {
          id: require('crypto').randomUUID(),
          testCaseId: data.testCaseId,
          order: data.order || 0,
          action: data.action || '',
          expectedResult: data.expectedResult || '',
          testData: data.testData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        testDataStore.testSteps[step.id] = step;
        return step;
      }),
      deleteMany: jest.fn(async ({ where }) => {
        const matching = Object.keys(testDataStore.testSteps).filter(id => {
          const step = testDataStore.testSteps[id];
          return where.testCaseId ? step.testCaseId === where.testCaseId : true;
        });
        
        matching.forEach(id => {
          delete testDataStore.testSteps[id];
        });
        
        return { count: matching.length };
      }),
    },
    auditLog: {
      create: jest.fn(async ({ data }) => {
        const log = {
          id: require('crypto').randomUUID(),
          ...data,
          createdAt: new Date(),
        };
        testDataStore.auditLogs.push(log);
        return log;
      }),
      findMany: jest.fn(async ({ where }) => {
        return testDataStore.auditLogs.filter(log => {
          if (where.projectId && log.projectId !== where.projectId) return false;
          if (where.entityId && log.entityId !== where.entityId) return false;
          if (where.entityType && log.entityType !== where.entityType) return false;
          if (where.action && log.action !== where.action) return false;
          return true;
        });
      }),
    },
    testRun: {
      findUnique: jest.fn(async ({ where, include }) => {
        const run = testDataStore.testRuns?.[where.id] || null;
        if (!run) return null;
        
        const result = { ...run };
        if (include && include.runCases) {
          result.runCases = Object.values(testDataStore.runCases || {}).filter(rc => rc.runId === run.id);
        }
        if (include && include.cases) {
          result.cases = Object.values(testDataStore.runCases || {}).filter(rc => rc.runId === run.id);
        }
        return result;
      }),
      findFirst: jest.fn(async ({ where, include }) => {
        const runs = Object.values(testDataStore.testRuns || {});
        const run = runs.find(r => {
          if (where?.id && r.id !== where.id) return false;
          if (where?.projectId && r.projectId !== where.projectId) return false;
          if (where?.deletedAt === null && r.deletedAt !== null) return false;
          return true;
        });
        
        if (!run) return null;
        const result = { ...run };
        if (include && include.runCases) {
          result.runCases = Object.values(testDataStore.runCases || {}).filter(rc => rc.runId === run.id);
        }
        if (include && include.cases) {
          result.cases = Object.values(testDataStore.runCases || {}).filter(rc => rc.runId === run.id);
        }
        return result;
      }),
      create: jest.fn(async ({ data, include }) => {
        const run = {
          id: require('crypto').randomUUID(),
          projectId: data.projectId,
          title: data.title,
          type: data.type,
          environment: data.environment,
          plannedStart: data.plannedStart || null,
          dueDate: data.dueDate || null,
          milestoneId: data.milestoneId || null,
          buildNumber: data.buildNumber || null,
          branch: data.branch || null,
          defaultAssigneeId: data.defaultAssigneeId || null,
          riskThreshold: data.riskThreshold || 'MEDIUM',
          status: 'IN_PROGRESS',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
        
        testDataStore.testRuns = testDataStore.testRuns || {};
        testDataStore.testRuns[run.id] = run;
        
        const result = { ...run };
        if (include && include.cases) {
          result.cases = [];
        }
        return result;
      }),
      findMany: jest.fn(async ({ where, skip, take, orderBy, include }) => {
        const runs = Object.values(testDataStore.testRuns || {});
        let filtered = runs.filter(r => {
          if (where?.projectId && r.projectId !== where.projectId) return false;
          if (where?.deletedAt === null && r.deletedAt !== null) return false;
          if (where?.status && r.status !== where.status) return false;
          return true;
        });
        
        if (skip) filtered = filtered.slice(skip);
        if (take) filtered = filtered.slice(0, take);
        
        if (include) {
          filtered = filtered.map(r => {
            const result = { ...r };
            if (include.cases) {
              result.cases = Object.values(testDataStore.runCases || {}).filter(rc => rc.runId === r.id);
            }
            return result;
          });
        }
        
        return filtered;
      }),
      update: jest.fn(async ({ where, data, include }) => {
        const run = testDataStore.testRuns?.[where.id];
        if (!run) return null;
        Object.assign(run, data, { updatedAt: new Date() });
        
        const result = { ...run };
        if (include && include.cases) {
          result.cases = Object.values(testDataStore.runCases || {}).filter(rc => rc.runId === run.id);
        }
        return result;
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        const runs = Object.values(testDataStore.testRuns || {});
        let filtered = runs.filter(r => {
          if (where?.projectId && r.projectId !== where.projectId) return false;
          if (where?.deletedAt === null && r.deletedAt !== null) return false;
          return true;
        });
        
        filtered.forEach(r => {
          Object.assign(r, data, { updatedAt: new Date() });
        });
        
        return { count: filtered.length };
      }),
      count: jest.fn(async ({ where }) => {
        const runs = Object.values(testDataStore.testRuns || {});
        return runs.filter(r => {
          if (where?.projectId && r.projectId !== where.projectId) return false;
          if (where?.deletedAt === null && r.deletedAt !== null) return false;
          return true;
        }).length;
      }),
    },
    runCase: {
      findUnique: jest.fn(async ({ where }) => {
        return testDataStore.runCases?.[where.id] || null;
      }),
      findMany: jest.fn(async ({ where, include, skip, take }) => {
        const cases = Object.values(testDataStore.runCases || {});
        let filtered = cases.filter(rc => {
          if (where?.runId && rc.runId !== where.runId) return false;
          if (where?.deletedAt === null && rc.deletedAt !== null) return false;
          return true;
        });
        
        if (skip) filtered = filtered.slice(skip);
        if (take) filtered = filtered.slice(0, take);
        
        if (include && include.testCase) {
          filtered = filtered.map(rc => ({
            ...rc,
            testCase: testDataStore.testCases?.[rc.caseId] || null,
          }));
        }
        
        return filtered;
      }),
      create: jest.fn(async ({ data, include }) => {
        const runCase = {
          id: require('crypto').randomUUID(),
          runId: data.runId,
          caseId: data.caseId,
          assigneeId: data.assigneeId || null,
          status: data.status || 'IDLE',
          executionType: data.executionType || 'MANUAL',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
        
        testDataStore.runCases = testDataStore.runCases || {};
        testDataStore.runCases[runCase.id] = runCase;
        
        const result = { ...runCase };
        if (include && include.testCase) {
          result.testCase = testDataStore.testCases?.[runCase.caseId] || null;
        }
        return result;
      }),
      createMany: jest.fn(async ({ data, skipDuplicates }) => {
        testDataStore.runCases = testDataStore.runCases || {};
        const created = data.map(d => {
          const runCase = {
            id: require('crypto').randomUUID(),
            runId: d.runId,
            caseId: d.caseId,
            assigneeId: d.assigneeId || null,
            status: d.status || 'IDLE',
            executionType: d.executionType || 'MANUAL',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          };
          testDataStore.runCases[runCase.id] = runCase;
          return runCase;
        });
        return { count: created.length };
      }),
      update: jest.fn(async ({ where, data, include }) => {
        const runCase = testDataStore.runCases?.[where.id];
        if (!runCase) return null;
        
        // Track previous status for flaky test detection
        if (data.status && data.status !== runCase.status) {
          if (runCase.status === 'FAILED' && data.status === 'PASSED') {
            // Mark as flaky
            runCase.wasFailedThenPassed = true;
          }
          runCase.previousStatus = runCase.status;
        }
        
        Object.assign(runCase, data, { updatedAt: new Date() });
        
        const result = { ...runCase };
        if (include && include.testCase) {
          result.testCase = testDataStore.testCases?.[runCase.caseId] || null;
        }
        return result;
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        const cases = Object.values(testDataStore.runCases || {});
        let filtered = cases.filter(rc => {
          if (where?.runId && rc.runId !== where.runId) return false;
          if (where?.caseId && rc.caseId !== where.caseId) return false;
          return true;
        });
        
        filtered.forEach(rc => {
          Object.assign(rc, data, { updatedAt: new Date() });
        });
        
        return { count: filtered.length };
      }),
      count: jest.fn(async ({ where }) => {
        const cases = Object.values(testDataStore.runCases || {});
        return cases.filter(rc => {
          if (where?.runId && rc.runId !== where.runId) return false;
          return true;
        }).length;
      }),
    },
    auditLog: {
      create: jest.fn(async ({ data }) => {
        const log = {
          id: require('crypto').randomUUID(),
          ...data,
          createdAt: new Date(),
        };
        testDataStore.auditLogs.push(log);
        return log;
      }),
      findMany: jest.fn(async ({ where }) => {
        return testDataStore.auditLogs.filter(log => {
          if (where?.projectId && log.projectId !== where.projectId) return false;
          if (where?.entityId && log.entityId !== where.entityId) return false;
          if (where?.entityType && log.entityType !== where.entityType) return false;
          if (where?.action && log.action !== where.action) return false;
          return true;
        });
      }),
    },
    stepResult: {
      findFirst: jest.fn(async ({ where }) => {
        return null;
      }),
      create: jest.fn(async ({ data }) => {
        return {
          id: require('crypto').randomUUID(),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),
      update: jest.fn(async ({ where, data }) => {
        return {
          id: where.id,
          ...data,
          updatedAt: new Date(),
        };
      }),
    },
    defect: {
      count: jest.fn(async ({ where }) => {
        return 0;
      }),
    },
    organizationMember: {
      findUnique: jest.fn(async ({ where }) => null),
    },
    projectMember: {
      findUnique: jest.fn(async ({ where }) => null),
    },
    $connect: jest.fn(async () => {}),
    $disconnect: jest.fn(async () => {}),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    Prisma: {
      AuditAction: {
        CREATE: 'CREATE',
        UPDATE: 'UPDATE',
        DELETE: 'DELETE',
        RESTORE: 'RESTORE',
        EXECUTE: 'EXECUTE',
        ASSIGN: 'ASSIGN',
        COMMENT: 'COMMENT',
      },
    },
    AuditAction: {
      CREATE: 'CREATE',
      UPDATE: 'UPDATE',
      DELETE: 'DELETE',
      RESTORE: 'RESTORE',
      EXECUTE: 'EXECUTE',
      ASSIGN: 'ASSIGN',
      COMMENT: 'COMMENT',
    },
  };
});
