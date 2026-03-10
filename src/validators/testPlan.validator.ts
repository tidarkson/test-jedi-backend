import Joi from 'joi';

/**
 * Create Test Plan Validation Schema
 */
export const createPlanSchema = Joi.object({
  title: Joi.string().required().min(1).max(255),
  description: Joi.string().optional().max(2000),
  milestoneId: Joi.string().uuid().optional(),
}).unknown(false);

/**
 * Update Test Plan Validation Schema
 */
export const updatePlanSchema = Joi.object({
  title: Joi.string().optional().min(1).max(255),
  description: Joi.string().optional().max(2000),
  status: Joi.string()
    .optional()
    .valid('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'),
  milestoneId: Joi.string().uuid().optional().allow(null),
}).unknown(false);

/**
 * Add Run to Plan Validation Schema
 */
export const addRunToPlanSchema = Joi.object({
  runId: Joi.string().uuid().required(),
}).unknown(false);

/**
 * Approve Plan Validation Schema
 */
export const approvePlanSchema = Joi.object({
  approvedById: Joi.string().uuid().required(),
}).unknown(false);

/**
 * Query Filters for Plan List
 */
export const planListFiltersSchema = Joi.object({
  status: Joi.string().valid('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED').optional(),
  milestoneId: Joi.string().uuid().optional(),
  isApproved: Joi.boolean().optional(),
  search: Joi.string().optional().max(100),
  page: Joi.number().optional().min(1),
  limit: Joi.number().optional().min(1).max(100),
}).unknown(true); // Allow other query params

// Export types if needed
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
