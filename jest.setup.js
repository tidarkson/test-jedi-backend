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
  organizationMembers: {},
  pendingInvitations: {},
  customFields: {},
  retentionPolicies: {},
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
        
        // Handle nested organizationMembers creation
        if (data.organizationMembers?.create) {
          const orgMembership = data.organizationMembers.create;
          if (!testDataStore.organizationMembers) testDataStore.organizationMembers = {};
          const key = `${orgMembership.organizationId}_${user.id}`;
          testDataStore.organizationMembers[key] = {
            id: require('crypto').randomUUID(),
            organizationId: orgMembership.organizationId,
            userId: user.id,
            role: orgMembership.role || 'MEMBER',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        
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
      findFirst: jest.fn(async ({ where }) => {
        return testDataStore.auditLogs.find(log => {
          if (where?.organizationId && log.organizationId !== where.organizationId) return false;
          if (where?.projectId && log.projectId !== where.projectId) return false;
          if (where?.entityId && log.entityId !== where.entityId) return false;
          if (where?.entityType && log.entityType !== where.entityType) return false;
          if (where?.action && log.action !== where.action) return false;
          return true;
        }) || null;
      }),
      findMany: jest.fn(async ({ where, skip, take }) => {
        let filtered = testDataStore.auditLogs.filter(log => {
          if (where?.organizationId && log.organizationId !== where.organizationId) return false;
          if (where?.projectId && log.projectId !== where.projectId) return false;
          if (where?.entityId && log.entityId !== where.entityId) return false;
          if (where?.entityType && log.entityType !== where.entityType) return false;
          if (where?.action && log.action !== where.action) return false;
          return true;
        });
        if (skip) filtered = filtered.slice(skip);
        if (take) filtered = filtered.slice(0, take);
        return filtered;
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
      findUnique: jest.fn(async ({ where }) => {
        if (where?.organizationId_userId) {
          const key = `${where.organizationId_userId.organizationId}_${where.organizationId_userId.userId}`;
          return testDataStore.organizationMembers?.[key] || null;
        }
        return null;
      }),
      findMany: jest.fn(async ({ where, include }) => {
        if (where?.organizationId) {
          const members = Object.values(testDataStore.organizationMembers || {}).filter(
            m => m.organizationId === where.organizationId
          );
          return members.map(m => ({
            ...m,
            user: include?.user ? (testDataStore.users[m.userId] || null) : undefined,
          }));
        }
        return [];
      }),
      create: jest.fn(async ({ data }) => {
        if (!testDataStore.organizationMembers) testDataStore.organizationMembers = {};
        const member = {
          id: require('crypto').randomUUID(),
          organizationId: data.organizationId,
          userId: data.userId,
          role: data.role || 'MEMBER',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const key = `${data.organizationId}_${data.userId}`;
        testDataStore.organizationMembers[key] = member;
        return member;
      }),
      update: jest.fn(async ({ where, data }) => {
        if (where?.organizationId_userId) {
          const key = `${where.organizationId_userId.organizationId}_${where.organizationId_userId.userId}`;
          const member = testDataStore.organizationMembers?.[key];
          if (member) {
            Object.assign(member, data, { updatedAt: new Date() });
          }
          return member;
        }
        return null;
      }),
      delete: jest.fn(async ({ where }) => {
        if (where?.organizationId_userId) {
          const key = `${where.organizationId_userId.organizationId}_${where.organizationId_userId.userId}`;
          const member = testDataStore.organizationMembers?.[key];
          if (member) {
            delete testDataStore.organizationMembers[key];
          }
          return member;
        }
        return null;
      }),
      count: jest.fn(async ({ where }) => {
        if (where?.organizationId) {
          return Object.values(testDataStore.organizationMembers || {}).filter(
            m => m.organizationId === where.organizationId
          ).length;
        }
        return 0;
      }),
    },
    pendingInvitation: {
      findUnique: jest.fn(async ({ where }) => {
        if (where?.organizationId_email) {
          const key = `${where.organizationId_email.organizationId}_${where.organizationId_email.email}`;
          return testDataStore.pendingInvitations?.[key] || null;
        }
        if (where?.token) {
          const invs = Object.values(testDataStore.pendingInvitations || {});
          return invs.find(inv => inv.token === where.token) || null;
        }
        return null;
      }),
      findMany: jest.fn(async ({ where }) => {
        if (where?.organizationId) {
          return Object.values(testDataStore.pendingInvitations || {}).filter(
            inv => inv.organizationId === where.organizationId
          );
        }
        return [];
      }),
      create: jest.fn(async ({ data }) => {
        if (!testDataStore.pendingInvitations) testDataStore.pendingInvitations = {};
        const invitation = {
          id: require('crypto').randomUUID(),
          organizationId: data.organizationId,
          email: data.email,
          inviterUserId: data.inviterUserId,
          role: data.role || 'QA_ENGINEER',
          token: data.token || require('crypto').randomUUID(),
          expiresAt: data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'PENDING',
          sentAt: new Date(),
        };
        const key = `${data.organizationId}_${data.email}`;
        testDataStore.pendingInvitations[key] = invitation;
        return invitation;
      }),
      update: jest.fn(async ({ where, data }) => {
        let invitation = null;
        if (where?.organizationId_email) {
          const key = `${where.organizationId_email.organizationId}_${where.organizationId_email.email}`;
          invitation = testDataStore.pendingInvitations?.[key];
          if (invitation) {
            Object.assign(invitation, data);
          }
        }
        return invitation;
      }),
    },
    customField: {
      findUnique: jest.fn(async ({ where }) => {
        return testDataStore.customFields?.[where.id] || null;
      }),
      findFirst: jest.fn(async ({ where }) => {
        if (!testDataStore.customFields) return null;
        const fields = Object.values(testDataStore.customFields);
        return fields.find(f => {
          if (where?.organizationId && f.organizationId !== where.organizationId) return false;
          if (where?.name && f.name !== where.name) return false;
          return true;
        }) || null;
      }),
      findMany: jest.fn(async ({ where }) => {
        if (!testDataStore.customFields) return [];
        return Object.values(testDataStore.customFields).filter(f => {
          if (where?.organizationId && f.organizationId !== where.organizationId) return false;
          return true;
        });
      }),
      create: jest.fn(async ({ data }) => {
        if (!testDataStore.customFields) testDataStore.customFields = {};
        const field = {
          id: require('crypto').randomUUID(),
          organizationId: data.organizationId,
          name: data.name,
          description: data.description || '',
          fieldType: data.fieldType,
          isRequired: data.isRequired || false,
          isGlobal: data.isGlobal !== false,
          options: data.options,
          displayOrder: data.displayOrder || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        testDataStore.customFields[field.id] = field;
        return field;
      }),
      update: jest.fn(async ({ where, data }) => {
        const field = testDataStore.customFields?.[where.id];
        if (field) {
          Object.assign(field, data, { updatedAt: new Date() });
        }
        return field;
      }),
      delete: jest.fn(async ({ where }) => {
        const field = testDataStore.customFields?.[where.id];
        if (field) {
          delete testDataStore.customFields[where.id];
        }
        return field;
      }),
    },
    customFieldValue: {
      create: jest.fn(async ({ data }) => {
        return {
          id: require('crypto').randomUUID(),
          ...data,
          updatedAt: new Date(),
        };
      }),
    },
    retentionPolicy: {
      findUnique: jest.fn(async ({ where }) => {
        return testDataStore.retentionPolicies?.[where.id] || null;
      }),
      findMany: jest.fn(async ({ where }) => {
        if (!testDataStore.retentionPolicies) return [];
        return Object.values(testDataStore.retentionPolicies).filter(p => {
          if (where?.organizationId && p.organizationId !== where.organizationId) return false;
          if (where?.isActive !== undefined && p.isActive !== where.isActive) return false;
          return true;
        });
      }),
      create: jest.fn(async ({ data }) => {
        if (!testDataStore.retentionPolicies) testDataStore.retentionPolicies = {};
        const policy = {
          id: require('crypto').randomUUID(),
          organizationId: data.organizationId,
          name: data.name,
          description: data.description || '',
          entityType: data.entityType,
          actionType: data.actionType,
          retentionDays: data.retentionDays,
          filterCriteria: data.filterCriteria,
          isActive: data.isActive !== false,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastRunAt: null,
        };
        testDataStore.retentionPolicies[policy.id] = policy;
        return policy;
      }),
      update: jest.fn(async ({ where, data }) => {
        const policy = testDataStore.retentionPolicies?.[where.id];
        if (policy) {
          Object.assign(policy, data, { updatedAt: new Date() });
        }
        return policy;
      }),
    },
    projectMember: {
      findUnique: jest.fn(async ({ where }) => null),
      create: jest.fn(async ({ data }) => {
        const member = {
          id: require('crypto').randomUUID(),
          projectId: data.projectId,
          userId: data.userId,
          role: data.role || 'MEMBER',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return member;
      }),
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
