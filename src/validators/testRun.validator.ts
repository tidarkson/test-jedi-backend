import Joi from 'joi';

/**
 * Case Selection Schema
 */
export const caseSelectionSchema = Joi.object({
  suiteIds: Joi.array().items(Joi.string().uuid()).optional(),
  caseIds: Joi.array().items(Joi.string().uuid()).optional(),
  queryFilters: Joi.object({
    priority: Joi.string().optional(),
    type: Joi.string().optional(),
    status: Joi.string().optional(),
    automationStatus: Joi.string().optional(),
  }).optional(),
  excludeIds: Joi.array().items(Joi.string().uuid()).optional(),
}).min(1).messages({
  'object.min': 'At least one selection criteria (suiteIds, caseIds, or queryFilters) is required',
});

/**
 * Create Run Schema
 */
export const createRunSchema = Joi.object({
  title: Joi.string().required().min(1).max(255),
  type: Joi.string().valid('MANUAL', 'AUTOMATED', 'HYBRID').required(),
  environment: Joi.string().required().min(1).max(100),
  plannedStart: Joi.date().iso().optional(),
  dueDate: Joi.date().iso().optional(),
  milestoneId: Joi.string().uuid().optional(),
  buildNumber: Joi.string().optional().max(100),
  branch: Joi.string().optional().max(100),
  defaultAssigneeId: Joi.string().uuid().optional(),
  caseSelection: caseSelectionSchema.required(),
});

/**
 * Update Run Schema
 */
export const updateRunSchema = Joi.object({
  title: Joi.string().optional().min(1).max(255),
  environment: Joi.string().optional().min(1).max(100),
  plannedStart: Joi.date().iso().optional(),
  dueDate: Joi.date().iso().optional(),
  milestoneId: Joi.string().uuid().optional().allow(null),
  buildNumber: Joi.string().optional().max(100).allow(null),
  branch: Joi.string().optional().max(100).allow(null),
  defaultAssigneeId: Joi.string().uuid().optional().allow(null),
}).min(1);

/**
 * Step Result Schema
 */
const stepResultSchema = Joi.object({
  stepId: Joi.string().uuid().required(),
  status: Joi.string()
    .valid('PASSED', 'FAILED', 'SKIPPED', 'BLOCKED', 'INCOMPLETE')
    .required(),
  comment: Joi.string().optional().max(1000),
  attachments: Joi.any().optional(),
});

/**
 * Update Run Case Status Schema
 */
export const updateRunCaseSchema = Joi.object({
  status: Joi.string()
    .valid('IDLE', 'IN_PROGRESS', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'NOT_RUN')
    .required(),
  executionType: Joi.string()
    .valid('MANUAL', 'AUTOMATED', 'EXPLORATORY')
    .optional(),
  assigneeId: Joi.string().uuid().optional().allow(null),
  stepResults: Joi.array().items(stepResultSchema).optional(),
});

/**
 * Bulk Update Run Cases Schema
 */
export const bulkUpdateRunCasesSchema = Joi.object({
  updates: Joi.array()
    .items(
      Joi.object({
        runCaseId: Joi.string().uuid().required(),
        status: Joi.string()
          .valid('IDLE', 'IN_PROGRESS', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'NOT_RUN')
          .required(),
        assigneeId: Joi.string().uuid().optional().allow(null),
        stepResults: Joi.array().items(stepResultSchema).optional(),
      }),
    )
    .min(1)
    .max(200)
    .required(),
});

/**
 * Clone Run Schema
 */
export const cloneRunSchema = Joi.object({
  title: Joi.string().required().min(1).max(255),
  plannedStart: Joi.date().iso().optional(),
  dueDate: Joi.date().iso().optional(),
  newCaseSelection: caseSelectionSchema.optional(),
});
