// Mock bcrypt to avoid native module compilation requirement
jest.mock('bcrypt', () => ({
  hash: jest.fn(async (password) => 'hashed_' + password),
  compare: jest.fn(async (password, hash) => password === hash.replace('hashed_', '')),
  genSalt: jest.fn(async () => 'salt'),
}));

jest.mock('bcryptjs', () => ({
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

jest.mock('bullmq', () => {
  const jobs = new Map();

  class Queue {
    constructor() {}

    async add(name, data, options = {}) {
      const id = options.jobId || name;
      const job = {
        id,
        name,
        data,
        progress: 0,
        finishedOn: null,
        async updateProgress(value) {
          this.progress = value;
        },
        async getState() {
          return data.status || 'pending';
        },
      };
      jobs.set(id, job);
      return job;
    }

    async getJob(id) {
      return jobs.get(id) || null;
    }
  }

  class Worker {
    constructor() {
      this.handlers = {};
    }

    on(event, handler) {
      this.handlers[event] = handler;
      return this;
    }
  }

  return { Queue, Worker };
});

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn(async () => ({})),
  })),
  PutObjectCommand: jest.fn((input) => input),
  GetObjectCommand: jest.fn((input) => input),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(async () => 'https://example.com/download/mock-export-file'),
}));

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
  defects: {},
  projectMembers: {},
  testPlans: {},
  testPlanRuns: {},
  testPlanVersions: {},
  testPlanBaselines: {},
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
    if (where.id) {
      if (Array.isArray(where.id?.in)) {
        if (!where.id.in.includes(item.id)) return false;
      } else if (item.id !== where.id) {
        return false;
      }
    }
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
      findUnique: jest.fn(async ({ where, include }) => {
        let user = null;
        if (where.email) {
          user = testDataStore.users[`email_${where.email}`] || null;
        } else {
          user = testDataStore.users[where.id] || null;
        }

        if (!user) return null;

        const result = { ...user };

        if (include?.organizationMembers) {
          result.organizationMembers = Object.values(testDataStore.organizationMembers || {}).filter(
            m => m.userId === user.id,
          );
        }

        if (include?.projectMembers) {
          result.projectMembers = Object.values(testDataStore.projectMembers || {}).filter(
            m => m.userId === user.id,
          );
        }

        return result;
      }),
      create: jest.fn(async ({ data, include }) => {
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
          const result = { ...user };
          if (include?.organizationMembers) {
            result.organizationMembers = Object.values(testDataStore.organizationMembers || {}).filter(
              m => m.userId === user.id,
            );
          }
          if (include?.projectMembers) {
            result.projectMembers = Object.values(testDataStore.projectMembers || {}).filter(
              m => m.userId === user.id,
            );
          }

          return result;
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
      findUnique: jest.fn(async ({ where, include }) => {
        const org = testDataStore.organizations[where.id] || null;
        if (!org) return null;

        const result = { ...org };
        if (include?.members) {
          result.members = Object.values(testDataStore.organizationMembers || {}).filter(m => {
            if (m.organizationId !== org.id) return false;
            if (include.members.where?.userId && m.userId !== include.members.where.userId) return false;
            return true;
          });
        }

        return result;
      }),
      findMany: jest.fn(async ({ where }) => {
        return Object.values(testDataStore.organizations).filter(org => {
          if (where?.name?.contains) return org.name.includes(where.name.contains);
          return true;
        });
      }),
      delete: jest.fn(async ({ where }) => {
        const org = testDataStore.organizations[where.id] || null;
        if (org) delete testDataStore.organizations[where.id];
        return org;
      }),
    },
    project: {
      findUnique: jest.fn(async ({ where, include }) => {
        const project = testDataStore.projects[where.id] || null;
        if (!project) return null;

        const result = { ...project };
        if (include?.projectMembers) {
          result.projectMembers = Object.values(testDataStore.projectMembers || {}).filter(
            pm => pm.projectId === project.id,
          );
        }
        return result;
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
        return Object.values(testDataStore.projects).filter(p => {
          if (!where) return true;
          if (where.organizationId && p.organizationId !== where.organizationId) return false;
          if (where.name?.contains && !p.name.includes(where.name.contains)) return false;
          return true;
        });
      }),
      update: jest.fn(async ({ where, data }) => {
        const project = testDataStore.projects[where.id] || null;
        if (project) {
          Object.assign(project, data, { updatedAt: new Date() });
        }
        return project;
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

        if (where?.project?.name?.contains) {
          results = results.filter(s => {
            const project = testDataStore.projects[s.projectId];
            return project?.name?.includes(where.project.name.contains);
          });
        }
        
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
      delete: jest.fn(async ({ where }) => {
        const suite = testDataStore.suites[where.id] || null;
        if (suite) delete testDataStore.suites[where.id];
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
      createMany: jest.fn(async ({ data }) => {
        const created = data.map(item => {
          const testCase = {
            id: require('crypto').randomUUID(),
            title: item.title,
            description: item.description || '',
            preconditions: item.preconditions || '',
            postconditions: item.postconditions || '',
            priority: item.priority || 'MEDIUM',
            severity: item.severity || 'MEDIUM',
            type: item.type || 'FUNCTIONAL',
            riskLevel: item.riskLevel,
            automationStatus: item.automationStatus,
            estimatedTime: item.estimatedTime,
            tags: item.tags || [],
            customFields: item.customFields,
            suiteId: item.suiteId,
            createdBy: item.authorId || item.createdBy,
            authorId: item.authorId || item.createdBy,
            status: item.status || 'DRAFT',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          };
          testDataStore.testCases[testCase.id] = testCase;
          return testCase;
        });
        return { count: created.length };
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
        if (include && include.project) {
          result.project = testDataStore.projects?.[run.projectId] || null;
        }
        if (include && include.runCases) {
          result.runCases = Object.values(testDataStore.runCases || {})
            .filter(rc => rc.runId === run.id)
            .map(rc => {
              const mapped = { ...rc };
              const runCasesInclude = include.runCases.include || {};
              if (runCasesInclude.testCase) {
                mapped.testCase = {
                  ...(testDataStore.testCases?.[rc.caseId] || null),
                };
                if (mapped.testCase && runCasesInclude.testCase.include?.steps) {
                  mapped.testCase.steps = Object.values(testDataStore.testSteps || {}).filter(
                    s => s.testCaseId === rc.caseId,
                  );
                }
                if (mapped.testCase && runCasesInclude.testCase.include?.author) {
                  mapped.testCase.author = testDataStore.users?.[mapped.testCase.authorId] || null;
                }
              }
              if (runCasesInclude.assignee) {
                mapped.assignee = rc.assigneeId ? testDataStore.users?.[rc.assigneeId] || null : null;
              }
              if (runCasesInclude.stepResults) {
                mapped.stepResults = [];
              }
              if (runCasesInclude.defects) {
                mapped.defects = Object.values(testDataStore.defects || {}).filter(d => d.runCaseId === rc.id);
              }
              return mapped;
            });
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
          type: data.type || 'MANUAL',
          environment: data.environment || 'test',
          plannedStart: data.plannedStart || null,
          dueDate: data.dueDate || null,
          milestoneId: data.milestoneId || null,
          buildNumber: data.buildNumber || null,
          branch: data.branch || null,
          defaultAssigneeId: data.defaultAssigneeId || null,
          riskThreshold: data.riskThreshold || 'MEDIUM',
          status: data.status || 'IN_PROGRESS',
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
      deleteMany: jest.fn(async ({ where }) => {
        const runs = Object.values(testDataStore.testRuns || {}).filter(r => {
          if (where?.projectId && r.projectId !== where.projectId) return false;
          return true;
        });
        runs.forEach(run => {
          delete testDataStore.testRuns[run.id];
        });
        return { count: runs.length };
      }),
    },
    runCase: {
      findUnique: jest.fn(async ({ where }) => {
        return testDataStore.runCases?.[where.id] || null;
      }),
      findFirst: jest.fn(async ({ where }) => {
        const cases = Object.values(testDataStore.runCases || {});
        return cases.find(rc => {
          if (where?.runId && rc.runId !== where.runId) return false;
          if (where?.caseId && rc.caseId !== where.caseId) return false;
          if (where?.status && rc.status !== where.status) return false;
          return true;
        }) || null;
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
      findMany: jest.fn(async ({ where, include, skip, take }) => {
        let filtered = testDataStore.auditLogs.filter(log => {
          if (where?.organizationId && log.organizationId !== where.organizationId) return false;
          if (where?.userId && log.userId !== where.userId) return false;
          if (where?.projectId && log.projectId !== where.projectId) return false;
          if (where?.entityId && log.entityId !== where.entityId) return false;
          if (where?.entityType && log.entityType !== where.entityType) return false;
          if (where?.action && log.action !== where.action) return false;
          return true;
        });
        if (skip) filtered = filtered.slice(skip);
        if (take) filtered = filtered.slice(0, take);
        return filtered.map(log => ({
          ...log,
          user: include?.user ? testDataStore.users?.[log.userId] || null : undefined,
        }));
      }),
      count: jest.fn(async ({ where }) => {
        return testDataStore.auditLogs.filter(log => {
          if (where?.organizationId && log.organizationId !== where.organizationId) return false;
          if (where?.userId && log.userId !== where.userId) return false;
          if (where?.projectId && log.projectId !== where.projectId) return false;
          if (where?.entityId && log.entityId !== where.entityId) return false;
          if (where?.entityType && log.entityType !== where.entityType) return false;
          if (where?.action && log.action !== where.action) return false;
          return true;
        }).length;
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
      create: jest.fn(async ({ data }) => {
        const defect = {
          id: require('crypto').randomUUID(),
          runCaseId: data.runCaseId,
          title: data.title,
          status: data.status || 'OPEN',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        testDataStore.defects[defect.id] = defect;
        return defect;
      }),
      count: jest.fn(async ({ where }) => {
        return Object.values(testDataStore.defects || {}).filter(defect => {
          if (where?.status && defect.status !== where.status) return false;
          if (where?.runCaseId && defect.runCaseId !== where.runCaseId) return false;
          return true;
        }).length;
      }),
    },
    organizationMember: {
      findUnique: jest.fn(async ({ where, include }) => {
        if (where?.organizationId_userId) {
          const key = `${where.organizationId_userId.organizationId}_${where.organizationId_userId.userId}`;
          const member = testDataStore.organizationMembers?.[key] || null;
          if (!member) return null;
          return {
            ...member,
            user: include?.user ? testDataStore.users?.[member.userId] || null : undefined,
          };
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
      create: jest.fn(async ({ data, include }) => {
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
        return {
          ...member,
          user: include?.user ? testDataStore.users?.[data.userId] || null : undefined,
        };
      }),
      update: jest.fn(async ({ where, data, include }) => {
        if (where?.organizationId_userId) {
          const key = `${where.organizationId_userId.organizationId}_${where.organizationId_userId.userId}`;
          const member = testDataStore.organizationMembers?.[key];
          if (member) {
            Object.assign(member, data, { updatedAt: new Date() });
          }
          return member
            ? {
                ...member,
                user: include?.user ? testDataStore.users?.[member.userId] || null : undefined,
              }
            : null;
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
      create: jest.fn(async ({ data, include }) => {
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
        return {
          ...invitation,
          organization: include?.organization ? testDataStore.organizations?.[data.organizationId] || null : undefined,
          inviter: include?.inviter ? { name: testDataStore.users?.[data.inviterUserId]?.name || '' } : undefined,
        };
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
        if (where?.id && !invitation) {
          invitation = Object.values(testDataStore.pendingInvitations || {}).find(inv => inv.id === where.id) || null;
          if (invitation) Object.assign(invitation, data);
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
      deleteMany: jest.fn(async () => ({ count: 0 })),
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
      findUnique: jest.fn(async ({ where }) => {
        if (where?.projectId_userId) {
          const key = `${where.projectId_userId.projectId}_${where.projectId_userId.userId}`;
          return testDataStore.projectMembers?.[key] || null;
        }
        return null;
      }),
      findMany: jest.fn(async ({ where, include }) => {
        let members = Object.values(testDataStore.projectMembers || {});
        if (where?.projectId) {
          members = members.filter(member => member.projectId === where.projectId);
        }
        return members.map(member => ({
          ...member,
          user: include?.user ? testDataStore.users?.[member.userId] || null : undefined,
        }));
      }),
      create: jest.fn(async ({ data, include }) => {
        const member = {
          id: require('crypto').randomUUID(),
          projectId: data.projectId,
          userId: data.userId,
          role: data.role || 'MEMBER',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const key = `${data.projectId}_${data.userId}`;
        testDataStore.projectMembers[key] = member;
        return {
          ...member,
          user: include?.user ? testDataStore.users?.[data.userId] || null : undefined,
        };
      }),
      count: jest.fn(async ({ where }) => {
        return Object.values(testDataStore.projectMembers || {}).filter(member => {
          if (where?.projectId && member.projectId !== where.projectId) return false;
          return true;
        }).length;
      }),
    },
    testPlan: {
      create: jest.fn(async ({ data }) => {
        const plan = {
          id: require('crypto').randomUUID(),
          projectId: data.projectId,
          title: data.title,
          description: data.description || null,
          status: data.status || 'DRAFT',
          isApproved: data.isApproved || false,
          approvedById: data.approvedById || null,
          approvedAt: data.approvedAt || null,
          milestoneId: data.milestoneId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        testDataStore.testPlans[plan.id] = plan;
        return plan;
      }),
      findUnique: jest.fn(async ({ where, include }) => {
        const plan = testDataStore.testPlans?.[where.id] || null;
        if (!plan) return null;

        const result = { ...plan };
        if (include?.milestone) result.milestone = null;
        if (include?.approvedBy) result.approvedBy = plan.approvedById ? testDataStore.users?.[plan.approvedById] || null : null;
        if (include?.planRuns) {
          const planRuns = Object.values(testDataStore.testPlanRuns || {}).filter(pr => pr.planId === plan.id);
          result.planRuns = planRuns.map(pr => {
            const mapped = { ...pr };
            if (include.planRuns === true) return mapped;
            if (include.planRuns.include?.run) {
              const run = testDataStore.testRuns?.[pr.runId] || null;
              mapped.run = run ? { ...run } : null;
              if (mapped.run && include.planRuns.include.run.include?.runCases) {
                mapped.run.runCases = Object.values(testDataStore.runCases || {})
                  .filter(rc => rc.runId === pr.runId)
                  .map(rc => ({
                    ...rc,
                    defects: include.planRuns.include.run.include.runCases.include?.defects
                      ? Object.values(testDataStore.defects || {}).filter(d => d.runCaseId === rc.id)
                      : undefined,
                  }));
              }
            }
            return mapped;
          });
        }
        return result;
      }),
      findMany: jest.fn(async ({ where, skip, take }) => {
        let plans = Object.values(testDataStore.testPlans || {}).filter(plan => {
          if (where?.projectId && plan.projectId !== where.projectId) return false;
          if (where?.status && plan.status !== where.status) return false;
          if (where?.milestoneId && plan.milestoneId !== where.milestoneId) return false;
          if (where?.isApproved !== undefined && plan.isApproved !== where.isApproved) return false;
          return true;
        });
        if (skip !== undefined) plans = plans.slice(skip);
        if (take !== undefined) plans = plans.slice(0, take);
        return plans;
      }),
      update: jest.fn(async ({ where, data }) => {
        const plan = testDataStore.testPlans?.[where.id] || null;
        if (plan) Object.assign(plan, data, { updatedAt: new Date() });
        return plan;
      }),
      count: jest.fn(async ({ where }) => {
        return Object.values(testDataStore.testPlans || {}).filter(plan => {
          if (where?.projectId && plan.projectId !== where.projectId) return false;
          return true;
        }).length;
      }),
    },
    testPlanRun: {
      findUnique: jest.fn(async ({ where }) => {
        if (where?.planId_runId) {
          const key = `${where.planId_runId.planId}_${where.planId_runId.runId}`;
          return testDataStore.testPlanRuns?.[key] || null;
        }
        return null;
      }),
      create: jest.fn(async ({ data }) => {
        const planRun = {
          id: require('crypto').randomUUID(),
          planId: data.planId,
          runId: data.runId,
          createdAt: new Date(),
        };
        const key = `${data.planId}_${data.runId}`;
        testDataStore.testPlanRuns[key] = planRun;
        return planRun;
      }),
      delete: jest.fn(async ({ where }) => {
        if (where?.planId_runId) {
          const key = `${where.planId_runId.planId}_${where.planId_runId.runId}`;
          const planRun = testDataStore.testPlanRuns?.[key] || null;
          if (planRun) delete testDataStore.testPlanRuns[key];
          return planRun;
        }
        return null;
      }),
    },
    testPlanVersion: {
      findFirst: jest.fn(async ({ where, orderBy }) => {
        let versions = Object.values(testDataStore.testPlanVersions || {}).filter(v => v.planId === where.planId);
        if (orderBy?.versionNum === 'desc') {
          versions = versions.sort((a, b) => b.versionNum - a.versionNum);
        }
        return versions[0] || null;
      }),
      create: jest.fn(async ({ data }) => {
        const version = {
          id: require('crypto').randomUUID(),
          planId: data.planId,
          versionNum: data.versionNum,
          snapshot: data.snapshot,
          isBaseline: false,
          createdAt: new Date(),
        };
        testDataStore.testPlanVersions[version.id] = version;
        return version;
      }),
      findMany: jest.fn(async ({ where, orderBy }) => {
        let versions = Object.values(testDataStore.testPlanVersions || {}).filter(v => v.planId === where.planId);
        if (orderBy?.versionNum === 'desc') versions = versions.sort((a, b) => b.versionNum - a.versionNum);
        return versions;
      }),
      findUnique: jest.fn(async ({ where }) => testDataStore.testPlanVersions?.[where.id] || null),
      update: jest.fn(async ({ where, data }) => {
        const version = testDataStore.testPlanVersions?.[where.id] || null;
        if (version) Object.assign(version, data);
        return version;
      }),
    },
    testPlanBaseline: {
      deleteMany: jest.fn(async ({ where }) => {
        const baselines = Object.entries(testDataStore.testPlanBaselines || {}).filter(([, baseline]) => baseline.planId === where.planId);
        baselines.forEach(([key]) => delete testDataStore.testPlanBaselines[key]);
        return { count: baselines.length };
      }),
      create: jest.fn(async ({ data }) => {
        const baseline = {
          id: require('crypto').randomUUID(),
          planId: data.planId,
          versionId: data.versionId,
          snapshot: data.snapshot,
          createdAt: new Date(),
        };
        testDataStore.testPlanBaselines[data.planId] = baseline;
        return baseline;
      }),
      findUnique: jest.fn(async ({ where }) => {
        if (where?.planId) return testDataStore.testPlanBaselines?.[where.planId] || null;
        return null;
      }),
    },
    $executeRawUnsafe: jest.fn(async (query) => {
      if (typeof query === 'string' && query.includes('AuditLog')) {
        throw new Error('Audit log is immutable');
      }
      return 0;
    }),
    $queryRaw: jest.fn(async (...args) => {
      const firstArg = args[0];
      const queryText = Array.isArray(firstArg?.raw)
        ? firstArg.raw.join(' ')
        : Array.isArray(firstArg)
          ? firstArg.join(' ')
          : String(firstArg || '');

      if (queryText.includes('WITH RECURSIVE suite_tree')) {
        return Object.values(testDataStore.suites || {})
          .filter(suite => suite.deletedAt === null)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map(suite => ({
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
            caseCount: BigInt(
              Object.values(testDataStore.testCases || {}).filter(
                testCase => testCase.suiteId === suite.id && testCase.deletedAt === null,
              ).length,
            ),
          }));
      }

      return [];
    }),
    $transaction: jest.fn(async (operations) => {
      if (typeof operations === 'function') {
        return operations(mockPrismaClient);
      }
      return Promise.all(operations);
    }),
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
      TestPlanStatus: {
        DRAFT: 'DRAFT',
        ACTIVE: 'ACTIVE',
        COMPLETED: 'COMPLETED',
        ARCHIVED: 'ARCHIVED',
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
    TestPlanStatus: {
      DRAFT: 'DRAFT',
      ACTIVE: 'ACTIVE',
      COMPLETED: 'COMPLETED',
      ARCHIVED: 'ARCHIVED',
    },
  };
});
