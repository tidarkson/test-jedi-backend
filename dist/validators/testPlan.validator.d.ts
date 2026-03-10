import Joi from 'joi';
/**
 * Create Test Plan Validation Schema
 */
export declare const createPlanSchema: Joi.ObjectSchema<any>;
/**
 * Update Test Plan Validation Schema
 */
export declare const updatePlanSchema: Joi.ObjectSchema<any>;
/**
 * Add Run to Plan Validation Schema
 */
export declare const addRunToPlanSchema: Joi.ObjectSchema<any>;
/**
 * Approve Plan Validation Schema
 */
export declare const approvePlanSchema: Joi.ObjectSchema<any>;
/**
 * Query Filters for Plan List
 */
export declare const planListFiltersSchema: Joi.ObjectSchema<any>;
export type CreatePlanInput = {
    title: string;
    description?: string;
    milestoneId?: string;
};
export type UpdatePlanInput = {
    title?: string;
    description?: string;
    status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
    milestoneId?: string | null;
};
export type AddRunToPlanInput = {
    runId: string;
};
export type ApprovePlanInput = {
    approvedById: string;
};
//# sourceMappingURL=testPlan.validator.d.ts.map