"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApiPaths = exports.openApiSchemas = exports.openApiTags = void 0;
exports.openApiTags = [
    { name: 'Auth', description: 'Authentication and session management' },
    { name: 'Admin', description: 'Organization and project administration' },
    { name: 'Test Repository', description: 'Suite and test case management' },
    { name: 'Test Runs', description: 'Test run lifecycle and execution updates' },
    { name: 'Test Plans', description: 'Plan management, approval, baseline and versions' },
    { name: 'Integrations', description: 'Jira/GitHub/Slack/webhooks and automation import' },
    { name: 'Analytics', description: 'Project analytics and quality metrics' },
    { name: 'Exports', description: 'Export pipelines and job status' },
];
exports.openApiSchemas = {
    ErrorResponse: {
        type: 'object',
        required: ['status', 'code', 'error', 'message'],
        properties: {
            status: { type: 'string', example: 'error' },
            code: { type: 'number', example: 400 },
            error: { type: 'string', example: 'VALIDATION_FAILED' },
            message: { type: 'string', example: 'Validation failed' },
            errors: { type: 'array', items: { type: 'object' } },
        },
    },
    SuccessEnvelope: {
        type: 'object',
        required: ['status'],
        properties: {
            status: { type: 'string', example: 'success' },
            code: { type: 'number', example: 200 },
            message: { type: 'string' },
            data: { type: 'object' },
        },
    },
    UserProfile: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', example: 'ADMIN' },
            organizationId: { type: 'string', format: 'uuid' },
        },
    },
    AuthRegisterRequest: {
        type: 'object',
        required: ['email', 'name', 'password', 'organizationName'],
        properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            password: { type: 'string', minLength: 8 },
            organizationName: { type: 'string' },
        },
    },
    AuthLoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
        },
    },
    AuthChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
        },
    },
    AuthResponse: {
        type: 'object',
        properties: {
            user: { $ref: '#/components/schemas/UserProfile' },
            accessToken: { type: 'string' },
        },
    },
    SuiteDto: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            projectId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            parentSuiteId: { type: 'string', nullable: true },
            orderIndex: { type: 'number' },
            isLocked: { type: 'boolean' },
            isArchived: { type: 'boolean' },
            caseCount: { type: 'number' },
        },
    },
    SuiteCreateRequest: {
        type: 'object',
        required: ['name'],
        properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            parentSuiteId: { type: 'string', format: 'uuid', nullable: true },
        },
    },
    SuiteUpdateRequest: {
        type: 'object',
        properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            parentSuiteId: { type: 'string', format: 'uuid', nullable: true },
            isLocked: { type: 'boolean' },
            isArchived: { type: 'boolean' },
        },
    },
    TestCaseStepRequest: {
        type: 'object',
        required: ['action', 'expectedResult'],
        properties: {
            action: { type: 'string' },
            expectedResult: { type: 'string' },
            order: { type: 'number' },
        },
    },
    TestCaseDto: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            suiteId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string' },
            severity: { type: 'string' },
            type: { type: 'string' },
            automationStatus: { type: 'string' },
            status: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            steps: { type: 'array', items: { $ref: '#/components/schemas/TestCaseStepRequest' } },
        },
    },
    TestCaseCreateRequest: {
        type: 'object',
        required: ['suiteId', 'title', 'priority', 'severity', 'type'],
        properties: {
            suiteId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            preconditions: { type: 'string' },
            postconditions: { type: 'string' },
            priority: { type: 'string' },
            severity: { type: 'string' },
            type: { type: 'string' },
            automationStatus: { type: 'string' },
            estimatedTime: { type: 'number' },
            reviewerId: { type: 'string', format: 'uuid' },
            tags: { type: 'array', items: { type: 'string' } },
            customFields: { type: 'object', additionalProperties: true },
            steps: { type: 'array', items: { $ref: '#/components/schemas/TestCaseStepRequest' } },
        },
    },
    TestCaseUpdateRequest: {
        allOf: [{ $ref: '#/components/schemas/TestCaseCreateRequest' }],
    },
    BulkCaseOperationRequest: {
        type: 'object',
        required: ['items'],
        properties: {
            suiteId: { type: 'string', format: 'uuid' },
            items: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['action'],
                    properties: {
                        action: { type: 'string', enum: ['create', 'update', 'move', 'delete'] },
                        id: { type: 'string', format: 'uuid' },
                        data: { type: 'object', additionalProperties: true },
                        newSuiteId: { type: 'string', format: 'uuid' },
                    },
                },
            },
        },
    },
    RunCreateRequest: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['MANUAL', 'AUTOMATED'] },
            environment: { type: 'string' },
            planId: { type: 'string', format: 'uuid' },
            caseIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        },
    },
    RunUpdateRequest: {
        type: 'object',
        properties: {
            name: { type: 'string' },
            status: { type: 'string' },
            environment: { type: 'string' },
            assigneeId: { type: 'string', format: 'uuid' },
        },
    },
    RunCaseUpdateRequest: {
        type: 'object',
        required: ['status'],
        properties: {
            status: { type: 'string', enum: ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'NOT_RUN'] },
            comment: { type: 'string' },
            defectId: { type: 'string' },
            actualResult: { type: 'string' },
        },
    },
    RunDto: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            projectId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            status: { type: 'string' },
            type: { type: 'string' },
            environment: { type: 'string' },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
        },
    },
    PlanCreateRequest: {
        type: 'object',
        required: ['name'],
        properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            targetRelease: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
        },
    },
    PlanUpdateRequest: {
        type: 'object',
        properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            targetRelease: { type: 'string' },
        },
    },
    PlanApproveRequest: {
        type: 'object',
        properties: {
            note: { type: 'string' },
        },
    },
    PlanDto: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            projectId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            status: { type: 'string' },
            approvedBy: { type: 'string', format: 'uuid', nullable: true },
            approvedAt: { type: 'string', format: 'date-time', nullable: true },
        },
    },
    IntegrationConfigRequest: {
        type: 'object',
        required: ['provider', 'settings'],
        properties: {
            provider: { type: 'string', enum: ['JIRA', 'GITHUB', 'GITLAB', 'SLACK', 'TEAMS', 'CI'] },
            settings: { type: 'object', additionalProperties: true },
        },
    },
    WebhookRequest: {
        type: 'object',
        required: ['url', 'name', 'events'],
        properties: {
            url: { type: 'string', format: 'uri' },
            name: { type: 'string' },
            secret: { type: 'string' },
            timeoutMs: { type: 'number', minimum: 1000, maximum: 30000 },
            events: {
                type: 'array',
                items: { type: 'string', enum: ['run.created', 'run.closed', 'case.failed', 'plan.approved', 'defect.created'] },
            },
            isActive: { type: 'boolean' },
        },
    },
    NotificationRuleRequest: {
        type: 'object',
        required: ['provider', 'events'],
        properties: {
            provider: { type: 'string', enum: ['SLACK', 'TEAMS'] },
            channel: { type: 'string' },
            events: { type: 'array', items: { type: 'string' } },
            threshold: { type: 'number' },
            isActive: { type: 'boolean' },
        },
    },
    RunPrLinkRequest: {
        type: 'object',
        required: ['provider', 'repository', 'pullRequest'],
        properties: {
            provider: { type: 'string', enum: ['GITHUB', 'GITLAB'] },
            repository: { type: 'string', example: 'owner/repo' },
            pullRequest: { type: 'number' },
            branch: { type: 'string' },
            buildNumber: { type: 'string' },
        },
    },
    AutomationImportRequest: {
        type: 'object',
        additionalProperties: true,
        description: 'Flexible payload for Playwright/Jest/Cypress JSON or parsed JUnit XML',
    },
    ExportRequest: {
        type: 'object',
        required: ['format'],
        properties: {
            format: { type: 'string', enum: ['pdf', 'xlsx', 'csv', 'json', 'xml'] },
            sections: { type: 'array', items: { type: 'string' } },
            filters: { type: 'object', additionalProperties: true },
            branding: { type: 'object', additionalProperties: true },
        },
    },
    ExportResponse: {
        type: 'object',
        properties: {
            jobId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
            format: { type: 'string' },
            downloadUrl: { type: 'string', nullable: true },
            fileSize: { type: 'number', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            error: { type: 'string', nullable: true },
        },
    },
    PaginationMeta: {
        type: 'object',
        properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            hasNext: { type: 'boolean' },
        },
    },
};
const bearerSecurity = [{ bearerAuth: [] }];
const uuidParam = (name, inType = 'path') => ({
    name,
    in: inType,
    required: inType === 'path',
    schema: { type: 'string', format: 'uuid' },
});
const jsonBody = (schemaRef, required = true) => ({
    required,
    content: {
        'application/json': {
            schema: { $ref: schemaRef },
        },
    },
});
const successResponse = (schemaRef, description = 'Success') => ({
    description,
    content: {
        'application/json': {
            schema: {
                allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                        type: 'object',
                        properties: {
                            data: { $ref: schemaRef },
                        },
                    },
                ],
            },
        },
    },
});
const errorResponse = {
    description: 'Error',
    content: {
        'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
    },
};
exports.openApiPaths = {
    '/auth/register': {
        post: {
            tags: ['Auth'],
            summary: 'Register a user and organization',
            requestBody: jsonBody('#/components/schemas/AuthRegisterRequest'),
            responses: { '201': successResponse('#/components/schemas/AuthResponse', 'Registered'), '400': errorResponse },
        },
    },
    '/auth/login': {
        post: {
            tags: ['Auth'],
            summary: 'Login user',
            requestBody: jsonBody('#/components/schemas/AuthLoginRequest'),
            responses: { '200': successResponse('#/components/schemas/AuthResponse', 'Logged in'), '401': errorResponse },
        },
    },
    '/auth/refresh': {
        post: {
            tags: ['Auth'],
            summary: 'Refresh access token',
            requestBody: jsonBody('#/components/schemas/SuccessEnvelope', false),
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope'), '401': errorResponse },
        },
    },
    '/auth/logout': {
        post: {
            tags: ['Auth'],
            summary: 'Logout current user',
            security: bearerSecurity,
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope'), '401': errorResponse },
        },
    },
    '/auth/me': {
        get: {
            tags: ['Auth'],
            summary: 'Get current user profile',
            security: bearerSecurity,
            responses: { '200': successResponse('#/components/schemas/UserProfile'), '401': errorResponse },
        },
    },
    '/auth/change-password': {
        post: {
            tags: ['Auth'],
            summary: 'Change password',
            security: bearerSecurity,
            requestBody: jsonBody('#/components/schemas/AuthChangePasswordRequest'),
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope'), '400': errorResponse, '401': errorResponse },
        },
    },
    '/projects/{projectId}/suites': {
        get: {
            tags: ['Test Repository'],
            summary: 'Get suite tree',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            responses: { '200': successResponse('#/components/schemas/SuiteDto'), '401': errorResponse },
        },
        post: {
            tags: ['Test Repository'],
            summary: 'Create suite',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            requestBody: jsonBody('#/components/schemas/SuiteCreateRequest'),
            responses: { '201': successResponse('#/components/schemas/SuiteDto'), '400': errorResponse },
        },
    },
    '/projects/{projectId}/suites/{id}': {
        put: {
            tags: ['Test Repository'],
            summary: 'Update suite',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            requestBody: jsonBody('#/components/schemas/SuiteUpdateRequest'),
            responses: { '200': successResponse('#/components/schemas/SuiteDto'), '400': errorResponse },
        },
        delete: {
            tags: ['Test Repository'],
            summary: 'Delete suite',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope'), '404': errorResponse },
        },
    },
    '/projects/{projectId}/suites/{id}/clone': {
        post: {
            tags: ['Test Repository'],
            summary: 'Clone suite',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            responses: { '201': successResponse('#/components/schemas/SuiteDto'), '404': errorResponse },
        },
    },
    '/projects/{projectId}/suites/{id}/lock': {
        post: {
            tags: ['Test Repository'],
            summary: 'Toggle suite lock',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            responses: { '200': successResponse('#/components/schemas/SuiteDto'), '404': errorResponse },
        },
    },
    '/projects/{projectId}/suites/{id}/archive': {
        post: {
            tags: ['Test Repository'],
            summary: 'Archive suite',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            responses: { '200': successResponse('#/components/schemas/SuiteDto'), '404': errorResponse },
        },
    },
    '/projects/{projectId}/cases': {
        get: {
            tags: ['Test Repository'],
            summary: 'List test cases',
            security: bearerSecurity,
            parameters: [
                uuidParam('projectId'),
                { name: 'page', in: 'query', schema: { type: 'number', default: 1 } },
                { name: 'limit', in: 'query', schema: { type: 'number', default: 20 } },
                { name: 'search', in: 'query', schema: { type: 'string' } },
            ],
            responses: { '200': successResponse('#/components/schemas/TestCaseDto'), '401': errorResponse },
        },
        post: {
            tags: ['Test Repository'],
            summary: 'Create test case',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            requestBody: jsonBody('#/components/schemas/TestCaseCreateRequest'),
            responses: { '201': successResponse('#/components/schemas/TestCaseDto'), '400': errorResponse },
        },
    },
    '/projects/{projectId}/cases/{id}': {
        get: {
            tags: ['Test Repository'],
            summary: 'Get test case detail',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            responses: { '200': successResponse('#/components/schemas/TestCaseDto'), '404': errorResponse },
        },
        put: {
            tags: ['Test Repository'],
            summary: 'Update test case',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            requestBody: jsonBody('#/components/schemas/TestCaseUpdateRequest'),
            responses: { '200': successResponse('#/components/schemas/TestCaseDto'), '400': errorResponse },
        },
        delete: {
            tags: ['Test Repository'],
            summary: 'Delete test case',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope'), '404': errorResponse },
        },
    },
    '/projects/{projectId}/cases/{id}/history': {
        get: {
            tags: ['Test Repository'],
            summary: 'Get test case history',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope'), '404': errorResponse },
        },
    },
    '/projects/{projectId}/cases/bulk': {
        post: {
            tags: ['Test Repository'],
            summary: 'Bulk operations on test cases',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            requestBody: jsonBody('#/components/schemas/BulkCaseOperationRequest'),
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope'), '400': errorResponse },
        },
    },
    '/projects/{projectId}/runs/preview': {
        post: {
            tags: ['Test Runs'],
            summary: 'Preview run case selection',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            requestBody: jsonBody('#/components/schemas/SuccessEnvelope', false),
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/projects/{projectId}/runs': {
        post: {
            tags: ['Test Runs'],
            summary: 'Create run',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            requestBody: jsonBody('#/components/schemas/RunCreateRequest'),
            responses: { '201': successResponse('#/components/schemas/RunDto'), '400': errorResponse },
        },
        get: {
            tags: ['Test Runs'],
            summary: 'List runs',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            responses: { '200': successResponse('#/components/schemas/RunDto') },
        },
    },
    '/projects/{projectId}/runs/{id}': {
        get: {
            tags: ['Test Runs'],
            summary: 'Get run detail',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            responses: { '200': successResponse('#/components/schemas/RunDto'), '404': errorResponse },
        },
        put: {
            tags: ['Test Runs'],
            summary: 'Update run',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            requestBody: jsonBody('#/components/schemas/RunUpdateRequest'),
            responses: { '200': successResponse('#/components/schemas/RunDto'), '400': errorResponse },
        },
        delete: {
            tags: ['Test Runs'],
            summary: 'Delete run',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope'), '404': errorResponse },
        },
    },
    '/projects/{projectId}/runs/{id}/close': {
        post: {
            tags: ['Test Runs'],
            summary: 'Close run',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            responses: { '200': successResponse('#/components/schemas/RunDto'), '400': errorResponse },
        },
    },
    '/projects/{projectId}/runs/{id}/clone': {
        post: {
            tags: ['Test Runs'],
            summary: 'Clone run',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            responses: { '201': successResponse('#/components/schemas/RunDto'), '404': errorResponse },
        },
    },
    '/runs/{runId}/cases': {
        get: {
            tags: ['Test Runs'],
            summary: 'List run cases',
            security: bearerSecurity,
            parameters: [uuidParam('runId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/runs/{runId}/cases/{runCaseId}': {
        put: {
            tags: ['Test Runs'],
            summary: 'Update run case status',
            security: bearerSecurity,
            parameters: [uuidParam('runId'), uuidParam('runCaseId')],
            requestBody: jsonBody('#/components/schemas/RunCaseUpdateRequest'),
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope'), '400': errorResponse },
        },
    },
    '/runs/{runId}/cases/bulk-status': {
        post: {
            tags: ['Test Runs'],
            summary: 'Bulk update run case statuses',
            security: bearerSecurity,
            parameters: [uuidParam('runId')],
            requestBody: jsonBody('#/components/schemas/SuccessEnvelope', false),
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope'), '400': errorResponse },
        },
    },
    '/runs/{runId}/metrics': {
        get: {
            tags: ['Test Runs'],
            summary: 'Get run metrics',
            security: bearerSecurity,
            parameters: [uuidParam('runId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/projects/{projectId}/plans': {
        post: {
            tags: ['Test Plans'],
            summary: 'Create plan',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            requestBody: jsonBody('#/components/schemas/PlanCreateRequest'),
            responses: { '201': successResponse('#/components/schemas/PlanDto'), '400': errorResponse },
        },
        get: {
            tags: ['Test Plans'],
            summary: 'List plans',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            responses: { '200': successResponse('#/components/schemas/PlanDto') },
        },
    },
    '/projects/{projectId}/plans/{id}': {
        get: {
            tags: ['Test Plans'],
            summary: 'Get plan detail',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            responses: { '200': successResponse('#/components/schemas/PlanDto'), '404': errorResponse },
        },
        put: {
            tags: ['Test Plans'],
            summary: 'Update plan',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            requestBody: jsonBody('#/components/schemas/PlanUpdateRequest'),
            responses: { '200': successResponse('#/components/schemas/PlanDto'), '400': errorResponse },
        },
    },
    '/projects/{projectId}/plans/{id}/runs': {
        post: {
            tags: ['Test Plans'],
            summary: 'Add run to plan',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            requestBody: jsonBody('#/components/schemas/SuccessEnvelope', false),
            responses: { '200': successResponse('#/components/schemas/PlanDto') },
        },
    },
    '/projects/{projectId}/plans/{id}/runs/{runId}': {
        delete: {
            tags: ['Test Plans'],
            summary: 'Remove run from plan',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id'), uuidParam('runId')],
            responses: { '200': successResponse('#/components/schemas/PlanDto'), '404': errorResponse },
        },
    },
    '/projects/{projectId}/plans/{id}/approve': {
        post: {
            tags: ['Test Plans'],
            summary: 'Approve plan',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            requestBody: jsonBody('#/components/schemas/PlanApproveRequest', false),
            responses: { '200': successResponse('#/components/schemas/PlanDto'), '403': errorResponse },
        },
    },
    '/projects/{projectId}/plans/{id}/readiness': {
        get: {
            tags: ['Test Plans'],
            summary: 'Get release readiness',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('id')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/plans/{id}/versions': {
        get: {
            tags: ['Test Plans'],
            summary: 'List plan versions',
            security: bearerSecurity,
            parameters: [uuidParam('id')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/plans/{id}/versions/{versionId}': {
        get: {
            tags: ['Test Plans'],
            summary: 'Get version snapshot',
            security: bearerSecurity,
            parameters: [uuidParam('id'), uuidParam('versionId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/plans/{id}/baseline': {
        post: {
            tags: ['Test Plans'],
            summary: 'Set baseline',
            security: bearerSecurity,
            parameters: [uuidParam('id')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
        get: {
            tags: ['Test Plans'],
            summary: 'Get baseline comparison',
            security: bearerSecurity,
            parameters: [uuidParam('id')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/projects/{projectId}/webhooks': {
        post: {
            tags: ['Integrations'],
            summary: 'Register webhook',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            requestBody: jsonBody('#/components/schemas/WebhookRequest'),
            responses: { '201': successResponse('#/components/schemas/SuccessEnvelope'), '400': errorResponse },
        },
        get: {
            tags: ['Integrations'],
            summary: 'List webhooks',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/projects/{projectId}/webhooks/{webhookId}': {
        put: {
            tags: ['Integrations'],
            summary: 'Update webhook',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('webhookId')],
            requestBody: jsonBody('#/components/schemas/WebhookRequest'),
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
        delete: {
            tags: ['Integrations'],
            summary: 'Delete webhook',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('webhookId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/projects/{projectId}/integrations': {
        put: {
            tags: ['Integrations'],
            summary: 'Configure integration',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            requestBody: jsonBody('#/components/schemas/IntegrationConfigRequest'),
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
        get: {
            tags: ['Integrations'],
            summary: 'List integrations',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/projects/{projectId}/integrations/{provider}': {
        delete: {
            tags: ['Integrations'],
            summary: 'Delete integration',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), { name: 'provider', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/integrations/jira/connect': {
        get: {
            tags: ['Integrations'],
            summary: 'Start Jira OAuth connect flow',
            parameters: [{ name: 'projectId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }],
            responses: { '302': { description: 'Redirect to Atlassian authorization URL' }, '400': errorResponse },
        },
    },
    '/integrations/jira/callback': {
        get: {
            tags: ['Integrations'],
            summary: 'Jira OAuth callback',
            parameters: [
                { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
                { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
            ],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope'), '400': errorResponse },
        },
    },
    '/integrations/jira/webhook': {
        post: {
            tags: ['Integrations'],
            summary: 'Jira webhook callback',
            requestBody: jsonBody('#/components/schemas/AutomationImportRequest'),
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/projects/{projectId}/runs/{runId}/pr-link': {
        post: {
            tags: ['Integrations'],
            summary: 'Link run to PR',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('runId')],
            requestBody: jsonBody('#/components/schemas/RunPrLinkRequest'),
            responses: { '201': successResponse('#/components/schemas/SuccessEnvelope') },
        },
        get: {
            tags: ['Integrations'],
            summary: 'List run PR links',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('runId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/projects/{projectId}/notification-rules': {
        post: {
            tags: ['Integrations'],
            summary: 'Create notification rule',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            requestBody: jsonBody('#/components/schemas/NotificationRuleRequest'),
            responses: { '201': successResponse('#/components/schemas/SuccessEnvelope') },
        },
        get: {
            tags: ['Integrations'],
            summary: 'List notification rules',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/projects/{projectId}/notification-rules/{ruleId}': {
        put: {
            tags: ['Integrations'],
            summary: 'Update notification rule',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('ruleId')],
            requestBody: jsonBody('#/components/schemas/NotificationRuleRequest'),
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
        delete: {
            tags: ['Integrations'],
            summary: 'Delete notification rule',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('ruleId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/projects/{projectId}/runs/{runId}/import-results': {
        post: {
            tags: ['Integrations'],
            summary: 'Import automation results',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('runId')],
            requestBody: {
                required: true,
                content: {
                    'application/json': { schema: { $ref: '#/components/schemas/AutomationImportRequest' } },
                    'application/xml': { schema: { type: 'string' } },
                    'text/xml': { schema: { type: 'string' } },
                },
            },
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/projects/{projectId}/analytics/trends': {
        get: { tags: ['Analytics'], summary: 'Get trends', security: bearerSecurity, parameters: [uuidParam('projectId')], responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') } },
    },
    '/projects/{projectId}/analytics/failure-distribution': {
        get: { tags: ['Analytics'], summary: 'Get failure distribution', security: bearerSecurity, parameters: [uuidParam('projectId')], responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') } },
    },
    '/projects/{projectId}/analytics/suite-heatmap': {
        get: { tags: ['Analytics'], summary: 'Get suite heatmap', security: bearerSecurity, parameters: [uuidParam('projectId')], responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') } },
    },
    '/projects/{projectId}/analytics/automation-coverage': {
        get: { tags: ['Analytics'], summary: 'Get automation coverage', security: bearerSecurity, parameters: [uuidParam('projectId')], responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') } },
    },
    '/projects/{projectId}/analytics/defect-leakage': {
        get: { tags: ['Analytics'], summary: 'Get defect leakage', security: bearerSecurity, parameters: [uuidParam('projectId')], responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') } },
    },
    '/projects/{projectId}/analytics/flaky-tests': {
        get: { tags: ['Analytics'], summary: 'Get flaky tests', security: bearerSecurity, parameters: [uuidParam('projectId')], responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') } },
    },
    '/projects/{projectId}/analytics/workload-heatmap': {
        get: { tags: ['Analytics'], summary: 'Get workload heatmap', security: bearerSecurity, parameters: [uuidParam('projectId')], responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') } },
    },
    '/projects/{projectId}/cases/export': {
        post: {
            tags: ['Exports'],
            summary: 'Export test cases',
            security: bearerSecurity,
            parameters: [uuidParam('projectId')],
            requestBody: jsonBody('#/components/schemas/ExportRequest'),
            responses: { '200': successResponse('#/components/schemas/ExportResponse') },
        },
    },
    '/projects/{projectId}/runs/{runId}/export': {
        post: {
            tags: ['Exports'],
            summary: 'Export run results',
            security: bearerSecurity,
            parameters: [uuidParam('projectId'), uuidParam('runId')],
            requestBody: jsonBody('#/components/schemas/ExportRequest'),
            responses: { '200': successResponse('#/components/schemas/ExportResponse') },
        },
    },
    '/analytics/export': {
        post: {
            tags: ['Exports'],
            summary: 'Export analytics',
            security: bearerSecurity,
            parameters: [{ name: 'projectId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }],
            requestBody: jsonBody('#/components/schemas/ExportRequest'),
            responses: { '200': successResponse('#/components/schemas/ExportResponse') },
        },
    },
    '/exports/formats/available': {
        get: {
            tags: ['Exports'],
            summary: 'List available export formats',
            security: bearerSecurity,
            parameters: [{ name: 'entityType', in: 'query', required: false, schema: { type: 'string', enum: ['cases', 'runs', 'analytics'] } }],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/exports/schema': {
        get: {
            tags: ['Exports'],
            summary: 'Get export schema',
            security: bearerSecurity,
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/exports/{jobId}': {
        get: {
            tags: ['Exports'],
            summary: 'Get export job status',
            security: bearerSecurity,
            parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': successResponse('#/components/schemas/ExportResponse'), '404': errorResponse },
        },
    },
    '/admin/orgs/{organizationId}/users': {
        get: {
            tags: ['Admin'],
            summary: 'List organization users',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/admin/orgs/{organizationId}/users/invite': {
        post: {
            tags: ['Admin'],
            summary: 'Invite user',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId')],
            requestBody: jsonBody('#/components/schemas/SuccessEnvelope', false),
            responses: { '201': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/admin/auth/accept-invitation': {
        post: {
            tags: ['Admin'],
            summary: 'Accept invitation',
            requestBody: jsonBody('#/components/schemas/SuccessEnvelope', false),
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/admin/orgs/{organizationId}/users/{userId}/role': {
        put: {
            tags: ['Admin'],
            summary: 'Update user role',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId'), uuidParam('userId')],
            requestBody: jsonBody('#/components/schemas/SuccessEnvelope', false),
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/admin/orgs/{organizationId}/users/{userId}': {
        delete: {
            tags: ['Admin'],
            summary: 'Deactivate user',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId'), uuidParam('userId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/admin/orgs/{organizationId}/users/{userId}/activity': {
        get: {
            tags: ['Admin'],
            summary: 'Get user activity',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId'), uuidParam('userId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/admin/orgs/{organizationId}/projects': {
        post: {
            tags: ['Admin'],
            summary: 'Create project',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId')],
            requestBody: jsonBody('#/components/schemas/SuccessEnvelope', false),
            responses: { '201': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/admin/orgs/{organizationId}/projects/{projectId}': {
        put: {
            tags: ['Admin'],
            summary: 'Update project',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId'), uuidParam('projectId')],
            requestBody: jsonBody('#/components/schemas/SuccessEnvelope', false),
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/admin/orgs/{organizationId}/projects/{projectId}/archive': {
        post: {
            tags: ['Admin'],
            summary: 'Archive project',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId'), uuidParam('projectId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/admin/orgs/{organizationId}/projects/{projectId}/members': {
        get: {
            tags: ['Admin'],
            summary: 'List project members',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId'), uuidParam('projectId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
        post: {
            tags: ['Admin'],
            summary: 'Add project member',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId'), uuidParam('projectId')],
            requestBody: jsonBody('#/components/schemas/SuccessEnvelope', false),
            responses: { '201': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/admin/orgs/{organizationId}/custom-fields': {
        get: {
            tags: ['Admin'],
            summary: 'List custom fields',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
        post: {
            tags: ['Admin'],
            summary: 'Create custom field',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId')],
            requestBody: jsonBody('#/components/schemas/SuccessEnvelope', false),
            responses: { '201': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/admin/orgs/{organizationId}/custom-fields/{fieldId}': {
        put: {
            tags: ['Admin'],
            summary: 'Update custom field',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId'), uuidParam('fieldId')],
            requestBody: jsonBody('#/components/schemas/SuccessEnvelope', false),
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
        delete: {
            tags: ['Admin'],
            summary: 'Delete custom field',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId'), uuidParam('fieldId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/admin/orgs/{organizationId}/audit-logs': {
        get: {
            tags: ['Admin'],
            summary: 'Get audit logs',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/admin/orgs/{organizationId}/audit-logs/export/csv': {
        get: {
            tags: ['Admin'],
            summary: 'Export audit logs CSV',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
    '/admin/orgs/{organizationId}/retention-policies': {
        post: {
            tags: ['Admin'],
            summary: 'Set retention policy',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId')],
            requestBody: jsonBody('#/components/schemas/SuccessEnvelope', false),
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
        get: {
            tags: ['Admin'],
            summary: 'Get retention policies',
            security: bearerSecurity,
            parameters: [uuidParam('organizationId')],
            responses: { '200': successResponse('#/components/schemas/SuccessEnvelope') },
        },
    },
};
//# sourceMappingURL=openapi-contracts.js.map