"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneRunSchema = exports.bulkUpdateRunCasesSchema = exports.updateRunCaseSchema = exports.updateRunSchema = exports.createRunSchema = exports.caseSelectionSchema = void 0;
const joi_1 = __importDefault(require("joi"));
/**
 * Case Selection Schema
 */
exports.caseSelectionSchema = joi_1.default.object({
    suiteIds: joi_1.default.array().items(joi_1.default.string().uuid()).optional(),
    caseIds: joi_1.default.array().items(joi_1.default.string().uuid()).optional(),
    queryFilters: joi_1.default.object({
        priority: joi_1.default.string().optional(),
        type: joi_1.default.string().optional(),
        status: joi_1.default.string().optional(),
        automationStatus: joi_1.default.string().optional(),
    }).optional(),
    excludeIds: joi_1.default.array().items(joi_1.default.string().uuid()).optional(),
}).min(1).messages({
    'object.min': 'At least one selection criteria (suiteIds, caseIds, or queryFilters) is required',
});
/**
 * Create Run Schema
 */
exports.createRunSchema = joi_1.default.object({
    title: joi_1.default.string().required().min(1).max(255),
    type: joi_1.default.string().valid('MANUAL', 'AUTOMATED', 'HYBRID').required(),
    environment: joi_1.default.string().required().min(1).max(100),
    plannedStart: joi_1.default.date().iso().optional(),
    dueDate: joi_1.default.date().iso().optional(),
    milestoneId: joi_1.default.string().uuid().optional(),
    buildNumber: joi_1.default.string().optional().max(100),
    branch: joi_1.default.string().optional().max(100),
    defaultAssigneeId: joi_1.default.string().uuid().optional(),
    caseSelection: exports.caseSelectionSchema.required(),
});
/**
 * Update Run Schema
 */
exports.updateRunSchema = joi_1.default.object({
    title: joi_1.default.string().optional().min(1).max(255),
    environment: joi_1.default.string().optional().min(1).max(100),
    plannedStart: joi_1.default.date().iso().optional(),
    dueDate: joi_1.default.date().iso().optional(),
    milestoneId: joi_1.default.string().uuid().optional().allow(null),
    buildNumber: joi_1.default.string().optional().max(100).allow(null),
    branch: joi_1.default.string().optional().max(100).allow(null),
    defaultAssigneeId: joi_1.default.string().uuid().optional().allow(null),
}).min(1);
/**
 * Step Result Schema
 */
const stepResultSchema = joi_1.default.object({
    stepId: joi_1.default.string().uuid().required(),
    status: joi_1.default.string()
        .valid('PASSED', 'FAILED', 'SKIPPED', 'BLOCKED', 'INCOMPLETE')
        .required(),
    comment: joi_1.default.string().optional().max(1000),
    attachments: joi_1.default.any().optional(),
});
/**
 * Update Run Case Status Schema
 */
exports.updateRunCaseSchema = joi_1.default.object({
    status: joi_1.default.string()
        .valid('IDLE', 'IN_PROGRESS', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'NOT_RUN')
        .required(),
    executionType: joi_1.default.string()
        .valid('MANUAL', 'AUTOMATED', 'EXPLORATORY')
        .optional(),
    assigneeId: joi_1.default.string().uuid().optional().allow(null),
    stepResults: joi_1.default.array().items(stepResultSchema).optional(),
});
/**
 * Bulk Update Run Cases Schema
 */
exports.bulkUpdateRunCasesSchema = joi_1.default.object({
    updates: joi_1.default.array()
        .items(joi_1.default.object({
        runCaseId: joi_1.default.string().uuid().required(),
        status: joi_1.default.string()
            .valid('IDLE', 'IN_PROGRESS', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'NOT_RUN')
            .required(),
        assigneeId: joi_1.default.string().uuid().optional().allow(null),
        stepResults: joi_1.default.array().items(stepResultSchema).optional(),
    }))
        .min(1)
        .max(200)
        .required(),
});
/**
 * Clone Run Schema
 */
exports.cloneRunSchema = joi_1.default.object({
    title: joi_1.default.string().required().min(1).max(255),
    plannedStart: joi_1.default.date().iso().optional(),
    dueDate: joi_1.default.date().iso().optional(),
    newCaseSelection: exports.caseSelectionSchema.optional(),
});
//# sourceMappingURL=testRun.validator.js.map