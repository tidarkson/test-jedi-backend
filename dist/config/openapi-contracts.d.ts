export declare const openApiTags: readonly [{
    readonly name: "Auth";
    readonly description: "Authentication and session management";
}, {
    readonly name: "Admin";
    readonly description: "Organization and project administration";
}, {
    readonly name: "Test Repository";
    readonly description: "Suite and test case management";
}, {
    readonly name: "Test Runs";
    readonly description: "Test run lifecycle and execution updates";
}, {
    readonly name: "Test Plans";
    readonly description: "Plan management, approval, baseline and versions";
}, {
    readonly name: "Integrations";
    readonly description: "Jira/GitHub/Slack/webhooks and automation import";
}, {
    readonly name: "Analytics";
    readonly description: "Project analytics and quality metrics";
}, {
    readonly name: "Exports";
    readonly description: "Export pipelines and job status";
}];
export declare const openApiSchemas: {
    readonly ErrorResponse: {
        readonly type: "object";
        readonly required: readonly ["status", "code", "error", "message"];
        readonly properties: {
            readonly status: {
                readonly type: "string";
                readonly example: "error";
            };
            readonly code: {
                readonly type: "number";
                readonly example: 400;
            };
            readonly error: {
                readonly type: "string";
                readonly example: "VALIDATION_FAILED";
            };
            readonly message: {
                readonly type: "string";
                readonly example: "Validation failed";
            };
            readonly errors: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                };
            };
        };
    };
    readonly SuccessEnvelope: {
        readonly type: "object";
        readonly required: readonly ["status"];
        readonly properties: {
            readonly status: {
                readonly type: "string";
                readonly example: "success";
            };
            readonly code: {
                readonly type: "number";
                readonly example: 200;
            };
            readonly message: {
                readonly type: "string";
            };
            readonly data: {
                readonly type: "object";
            };
        };
    };
    readonly UserProfile: {
        readonly type: "object";
        readonly properties: {
            readonly id: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly email: {
                readonly type: "string";
                readonly format: "email";
            };
            readonly name: {
                readonly type: "string";
            };
            readonly role: {
                readonly type: "string";
                readonly example: "ADMIN";
            };
            readonly organizationId: {
                readonly type: "string";
                readonly format: "uuid";
            };
        };
    };
    readonly AuthRegisterRequest: {
        readonly type: "object";
        readonly required: readonly ["email", "name", "password", "organizationName"];
        readonly properties: {
            readonly email: {
                readonly type: "string";
                readonly format: "email";
            };
            readonly name: {
                readonly type: "string";
            };
            readonly password: {
                readonly type: "string";
                readonly minLength: 8;
            };
            readonly organizationName: {
                readonly type: "string";
            };
        };
    };
    readonly AuthLoginRequest: {
        readonly type: "object";
        readonly required: readonly ["email", "password"];
        readonly properties: {
            readonly email: {
                readonly type: "string";
                readonly format: "email";
            };
            readonly password: {
                readonly type: "string";
            };
        };
    };
    readonly AuthChangePasswordRequest: {
        readonly type: "object";
        readonly required: readonly ["currentPassword", "newPassword"];
        readonly properties: {
            readonly currentPassword: {
                readonly type: "string";
            };
            readonly newPassword: {
                readonly type: "string";
                readonly minLength: 8;
            };
        };
    };
    readonly AuthResponse: {
        readonly type: "object";
        readonly properties: {
            readonly user: {
                readonly $ref: "#/components/schemas/UserProfile";
            };
            readonly accessToken: {
                readonly type: "string";
            };
        };
    };
    readonly SuiteDto: {
        readonly type: "object";
        readonly properties: {
            readonly id: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly projectId: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly name: {
                readonly type: "string";
            };
            readonly description: {
                readonly type: "string";
            };
            readonly parentSuiteId: {
                readonly type: "string";
                readonly nullable: true;
            };
            readonly orderIndex: {
                readonly type: "number";
            };
            readonly isLocked: {
                readonly type: "boolean";
            };
            readonly isArchived: {
                readonly type: "boolean";
            };
            readonly caseCount: {
                readonly type: "number";
            };
        };
    };
    readonly SuiteCreateRequest: {
        readonly type: "object";
        readonly required: readonly ["name"];
        readonly properties: {
            readonly name: {
                readonly type: "string";
            };
            readonly description: {
                readonly type: "string";
            };
            readonly parentSuiteId: {
                readonly type: "string";
                readonly format: "uuid";
                readonly nullable: true;
            };
        };
    };
    readonly SuiteUpdateRequest: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
            };
            readonly description: {
                readonly type: "string";
            };
            readonly parentSuiteId: {
                readonly type: "string";
                readonly format: "uuid";
                readonly nullable: true;
            };
            readonly isLocked: {
                readonly type: "boolean";
            };
            readonly isArchived: {
                readonly type: "boolean";
            };
        };
    };
    readonly TestCaseStepRequest: {
        readonly type: "object";
        readonly required: readonly ["action", "expectedResult"];
        readonly properties: {
            readonly action: {
                readonly type: "string";
            };
            readonly expectedResult: {
                readonly type: "string";
            };
            readonly order: {
                readonly type: "number";
            };
        };
    };
    readonly TestCaseDto: {
        readonly type: "object";
        readonly properties: {
            readonly id: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly suiteId: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly title: {
                readonly type: "string";
            };
            readonly description: {
                readonly type: "string";
            };
            readonly priority: {
                readonly type: "string";
            };
            readonly severity: {
                readonly type: "string";
            };
            readonly type: {
                readonly type: "string";
            };
            readonly automationStatus: {
                readonly type: "string";
            };
            readonly status: {
                readonly type: "string";
            };
            readonly tags: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
            };
            readonly steps: {
                readonly type: "array";
                readonly items: {
                    readonly $ref: "#/components/schemas/TestCaseStepRequest";
                };
            };
        };
    };
    readonly TestCaseCreateRequest: {
        readonly type: "object";
        readonly required: readonly ["suiteId", "title", "priority", "severity", "type"];
        readonly properties: {
            readonly suiteId: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly title: {
                readonly type: "string";
            };
            readonly description: {
                readonly type: "string";
            };
            readonly preconditions: {
                readonly type: "string";
            };
            readonly postconditions: {
                readonly type: "string";
            };
            readonly priority: {
                readonly type: "string";
            };
            readonly severity: {
                readonly type: "string";
            };
            readonly type: {
                readonly type: "string";
            };
            readonly automationStatus: {
                readonly type: "string";
            };
            readonly estimatedTime: {
                readonly type: "number";
            };
            readonly reviewerId: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly tags: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
            };
            readonly customFields: {
                readonly type: "object";
                readonly additionalProperties: true;
            };
            readonly steps: {
                readonly type: "array";
                readonly items: {
                    readonly $ref: "#/components/schemas/TestCaseStepRequest";
                };
            };
        };
    };
    readonly TestCaseUpdateRequest: {
        readonly allOf: readonly [{
            readonly $ref: "#/components/schemas/TestCaseCreateRequest";
        }];
    };
    readonly BulkCaseOperationRequest: {
        readonly type: "object";
        readonly required: readonly ["items"];
        readonly properties: {
            readonly suiteId: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly items: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly required: readonly ["action"];
                    readonly properties: {
                        readonly action: {
                            readonly type: "string";
                            readonly enum: readonly ["create", "update", "move", "delete"];
                        };
                        readonly id: {
                            readonly type: "string";
                            readonly format: "uuid";
                        };
                        readonly data: {
                            readonly type: "object";
                            readonly additionalProperties: true;
                        };
                        readonly newSuiteId: {
                            readonly type: "string";
                            readonly format: "uuid";
                        };
                    };
                };
            };
        };
    };
    readonly RunCreateRequest: {
        readonly type: "object";
        readonly required: readonly ["name", "type"];
        readonly properties: {
            readonly name: {
                readonly type: "string";
            };
            readonly type: {
                readonly type: "string";
                readonly enum: readonly ["MANUAL", "AUTOMATED"];
            };
            readonly environment: {
                readonly type: "string";
            };
            readonly planId: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly caseIds: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                    readonly format: "uuid";
                };
            };
        };
    };
    readonly RunUpdateRequest: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
            };
            readonly status: {
                readonly type: "string";
            };
            readonly environment: {
                readonly type: "string";
            };
            readonly assigneeId: {
                readonly type: "string";
                readonly format: "uuid";
            };
        };
    };
    readonly RunCaseUpdateRequest: {
        readonly type: "object";
        readonly required: readonly ["status"];
        readonly properties: {
            readonly status: {
                readonly type: "string";
                readonly enum: readonly ["PASSED", "FAILED", "BLOCKED", "SKIPPED", "NOT_RUN"];
            };
            readonly comment: {
                readonly type: "string";
            };
            readonly defectId: {
                readonly type: "string";
            };
            readonly actualResult: {
                readonly type: "string";
            };
        };
    };
    readonly RunDto: {
        readonly type: "object";
        readonly properties: {
            readonly id: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly projectId: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly name: {
                readonly type: "string";
            };
            readonly status: {
                readonly type: "string";
            };
            readonly type: {
                readonly type: "string";
            };
            readonly environment: {
                readonly type: "string";
            };
            readonly startedAt: {
                readonly type: "string";
                readonly format: "date-time";
            };
            readonly completedAt: {
                readonly type: "string";
                readonly format: "date-time";
                readonly nullable: true;
            };
        };
    };
    readonly PlanCreateRequest: {
        readonly type: "object";
        readonly required: readonly ["name"];
        readonly properties: {
            readonly name: {
                readonly type: "string";
            };
            readonly description: {
                readonly type: "string";
            };
            readonly targetRelease: {
                readonly type: "string";
            };
            readonly startDate: {
                readonly type: "string";
                readonly format: "date-time";
            };
            readonly endDate: {
                readonly type: "string";
                readonly format: "date-time";
            };
        };
    };
    readonly PlanUpdateRequest: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
            };
            readonly description: {
                readonly type: "string";
            };
            readonly status: {
                readonly type: "string";
            };
            readonly targetRelease: {
                readonly type: "string";
            };
        };
    };
    readonly PlanApproveRequest: {
        readonly type: "object";
        readonly properties: {
            readonly note: {
                readonly type: "string";
            };
        };
    };
    readonly PlanDto: {
        readonly type: "object";
        readonly properties: {
            readonly id: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly projectId: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly name: {
                readonly type: "string";
            };
            readonly status: {
                readonly type: "string";
            };
            readonly approvedBy: {
                readonly type: "string";
                readonly format: "uuid";
                readonly nullable: true;
            };
            readonly approvedAt: {
                readonly type: "string";
                readonly format: "date-time";
                readonly nullable: true;
            };
        };
    };
    readonly IntegrationConfigRequest: {
        readonly type: "object";
        readonly required: readonly ["provider", "settings"];
        readonly properties: {
            readonly provider: {
                readonly type: "string";
                readonly enum: readonly ["JIRA", "GITHUB", "GITLAB", "SLACK", "TEAMS", "CI"];
            };
            readonly settings: {
                readonly type: "object";
                readonly additionalProperties: true;
            };
        };
    };
    readonly WebhookRequest: {
        readonly type: "object";
        readonly required: readonly ["url", "name", "events"];
        readonly properties: {
            readonly url: {
                readonly type: "string";
                readonly format: "uri";
            };
            readonly name: {
                readonly type: "string";
            };
            readonly secret: {
                readonly type: "string";
            };
            readonly timeoutMs: {
                readonly type: "number";
                readonly minimum: 1000;
                readonly maximum: 30000;
            };
            readonly events: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                    readonly enum: readonly ["run.created", "run.closed", "case.failed", "plan.approved", "defect.created"];
                };
            };
            readonly isActive: {
                readonly type: "boolean";
            };
        };
    };
    readonly NotificationRuleRequest: {
        readonly type: "object";
        readonly required: readonly ["provider", "events"];
        readonly properties: {
            readonly provider: {
                readonly type: "string";
                readonly enum: readonly ["SLACK", "TEAMS"];
            };
            readonly channel: {
                readonly type: "string";
            };
            readonly events: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
            };
            readonly threshold: {
                readonly type: "number";
            };
            readonly isActive: {
                readonly type: "boolean";
            };
        };
    };
    readonly RunPrLinkRequest: {
        readonly type: "object";
        readonly required: readonly ["provider", "repository", "pullRequest"];
        readonly properties: {
            readonly provider: {
                readonly type: "string";
                readonly enum: readonly ["GITHUB", "GITLAB"];
            };
            readonly repository: {
                readonly type: "string";
                readonly example: "owner/repo";
            };
            readonly pullRequest: {
                readonly type: "number";
            };
            readonly branch: {
                readonly type: "string";
            };
            readonly buildNumber: {
                readonly type: "string";
            };
        };
    };
    readonly AutomationImportRequest: {
        readonly type: "object";
        readonly additionalProperties: true;
        readonly description: "Flexible payload for Playwright/Jest/Cypress JSON or parsed JUnit XML";
    };
    readonly ExportRequest: {
        readonly type: "object";
        readonly required: readonly ["format"];
        readonly properties: {
            readonly format: {
                readonly type: "string";
                readonly enum: readonly ["pdf", "xlsx", "csv", "json", "xml"];
            };
            readonly sections: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
            };
            readonly filters: {
                readonly type: "object";
                readonly additionalProperties: true;
            };
            readonly branding: {
                readonly type: "object";
                readonly additionalProperties: true;
            };
        };
    };
    readonly ExportResponse: {
        readonly type: "object";
        readonly properties: {
            readonly jobId: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly status: {
                readonly type: "string";
                readonly enum: readonly ["pending", "processing", "completed", "failed"];
            };
            readonly format: {
                readonly type: "string";
            };
            readonly downloadUrl: {
                readonly type: "string";
                readonly nullable: true;
            };
            readonly fileSize: {
                readonly type: "number";
                readonly nullable: true;
            };
            readonly createdAt: {
                readonly type: "string";
                readonly format: "date-time";
            };
            readonly completedAt: {
                readonly type: "string";
                readonly format: "date-time";
                readonly nullable: true;
            };
            readonly error: {
                readonly type: "string";
                readonly nullable: true;
            };
        };
    };
    readonly PaginationMeta: {
        readonly type: "object";
        readonly properties: {
            readonly page: {
                readonly type: "number";
            };
            readonly limit: {
                readonly type: "number";
            };
            readonly total: {
                readonly type: "number";
            };
            readonly hasNext: {
                readonly type: "boolean";
            };
        };
    };
};
export declare const openApiPaths: Record<string, any>;
//# sourceMappingURL=openapi-contracts.d.ts.map