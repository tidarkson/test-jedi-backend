"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planListFiltersSchema = exports.approvePlanSchema = exports.addRunToPlanSchema = exports.updatePlanSchema = exports.createPlanSchema = void 0;
const joi_1 = __importDefault(require("joi"));
/**
 * Create Test Plan Validation Schema
 */
exports.createPlanSchema = joi_1.default.object({
    title: joi_1.default.string().required().min(1).max(255),
    description: joi_1.default.string().optional().max(2000),
    milestoneId: joi_1.default.string().uuid().optional(),
}).unknown(false);
/**
 * Update Test Plan Validation Schema
 */
exports.updatePlanSchema = joi_1.default.object({
    title: joi_1.default.string().optional().min(1).max(255),
    description: joi_1.default.string().optional().max(2000),
    status: joi_1.default.string()
        .optional()
        .valid('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'),
    milestoneId: joi_1.default.string().uuid().optional().allow(null),
}).unknown(false);
/**
 * Add Run to Plan Validation Schema
 */
exports.addRunToPlanSchema = joi_1.default.object({
    runId: joi_1.default.string().uuid().required(),
}).unknown(false);
/**
 * Approve Plan Validation Schema
 */
exports.approvePlanSchema = joi_1.default.object({
    approvedById: joi_1.default.string().uuid().required(),
}).unknown(false);
/**
 * Query Filters for Plan List
 */
exports.planListFiltersSchema = joi_1.default.object({
    status: joi_1.default.string().valid('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED').optional(),
    milestoneId: joi_1.default.string().uuid().optional(),
    isApproved: joi_1.default.boolean().optional(),
    search: joi_1.default.string().optional().max(100),
    page: joi_1.default.number().optional().min(1),
    limit: joi_1.default.number().optional().min(1).max(100),
}).unknown(true); // Allow other query params
//# sourceMappingURL=testPlan.validator.js.map