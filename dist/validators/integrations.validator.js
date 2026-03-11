"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkRunPrSchema = exports.notificationRuleSchema = exports.configureIntegrationSchema = exports.updateWebhookSchema = exports.registerWebhookSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const VALID_EVENTS = ['run.created', 'run.closed', 'case.failed', 'plan.approved', 'defect.created'];
const VALID_PROVIDERS = ['JIRA', 'GITHUB', 'GITLAB', 'SLACK', 'TEAMS', 'CI'];
exports.registerWebhookSchema = joi_1.default.object({
    url: joi_1.default.string().uri().required(),
    name: joi_1.default.string().max(100).optional(),
    secret: joi_1.default.string().max(255).optional(),
    timeoutMs: joi_1.default.number().integer().min(1000).max(30000).optional(),
    events: joi_1.default.array().items(joi_1.default.string().valid(...VALID_EVENTS)).min(1).required(),
});
exports.updateWebhookSchema = joi_1.default.object({
    url: joi_1.default.string().uri().optional(),
    name: joi_1.default.string().max(100).optional().allow(null, ''),
    secret: joi_1.default.string().max(255).optional().allow(null, ''),
    timeoutMs: joi_1.default.number().integer().min(1000).max(30000).optional(),
    events: joi_1.default.array().items(joi_1.default.string().valid(...VALID_EVENTS)).min(1).optional(),
    isActive: joi_1.default.boolean().optional(),
}).min(1);
exports.configureIntegrationSchema = joi_1.default.object({
    provider: joi_1.default.string().valid(...VALID_PROVIDERS).required(),
    accessToken: joi_1.default.string().optional().allow(null, ''),
    refreshToken: joi_1.default.string().optional().allow(null, ''),
    expiresAt: joi_1.default.date().iso().optional().allow(null),
    settings: joi_1.default.object().unknown(true).optional(),
    isActive: joi_1.default.boolean().optional(),
});
exports.notificationRuleSchema = joi_1.default.object({
    provider: joi_1.default.string().valid('SLACK', 'TEAMS').required(),
    channel: joi_1.default.string().min(1).max(255).required(),
    enabledEvents: joi_1.default.array().items(joi_1.default.string().valid(...VALID_EVENTS)).min(1).required(),
    failureThreshold: joi_1.default.number().integer().min(0).max(100).optional().allow(null),
    settings: joi_1.default.object().unknown(true).optional(),
    isActive: joi_1.default.boolean().optional(),
});
exports.linkRunPrSchema = joi_1.default.object({
    provider: joi_1.default.string().valid('GITHUB', 'GITLAB').required(),
    repository: joi_1.default.string().min(1).required(),
    pullRequest: joi_1.default.number().integer().positive().required(),
    branch: joi_1.default.string().optional().allow(null, ''),
    buildNumber: joi_1.default.string().optional().allow(null, ''),
});
//# sourceMappingURL=integrations.validator.js.map