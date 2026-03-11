import Joi from 'joi';

const VALID_EVENTS = ['run.created', 'run.closed', 'case.failed', 'plan.approved', 'defect.created'];
const VALID_PROVIDERS = ['JIRA', 'GITHUB', 'GITLAB', 'SLACK', 'TEAMS', 'CI'];

export const registerWebhookSchema = Joi.object({
  url: Joi.string().uri().required(),
  name: Joi.string().max(100).optional(),
  secret: Joi.string().max(255).optional(),
  timeoutMs: Joi.number().integer().min(1000).max(30000).optional(),
  events: Joi.array().items(Joi.string().valid(...VALID_EVENTS)).min(1).required(),
});

export const updateWebhookSchema = Joi.object({
  url: Joi.string().uri().optional(),
  name: Joi.string().max(100).optional().allow(null, ''),
  secret: Joi.string().max(255).optional().allow(null, ''),
  timeoutMs: Joi.number().integer().min(1000).max(30000).optional(),
  events: Joi.array().items(Joi.string().valid(...VALID_EVENTS)).min(1).optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

export const configureIntegrationSchema = Joi.object({
  provider: Joi.string().valid(...VALID_PROVIDERS).required(),
  accessToken: Joi.string().optional().allow(null, ''),
  refreshToken: Joi.string().optional().allow(null, ''),
  expiresAt: Joi.date().iso().optional().allow(null),
  settings: Joi.object().unknown(true).optional(),
  isActive: Joi.boolean().optional(),
});

export const notificationRuleSchema = Joi.object({
  provider: Joi.string().valid('SLACK', 'TEAMS').required(),
  channel: Joi.string().min(1).max(255).required(),
  enabledEvents: Joi.array().items(Joi.string().valid(...VALID_EVENTS)).min(1).required(),
  failureThreshold: Joi.number().integer().min(0).max(100).optional().allow(null),
  settings: Joi.object().unknown(true).optional(),
  isActive: Joi.boolean().optional(),
});

export const linkRunPrSchema = Joi.object({
  provider: Joi.string().valid('GITHUB', 'GITLAB').required(),
  repository: Joi.string().min(1).required(),
  pullRequest: Joi.number().integer().positive().required(),
  branch: Joi.string().optional().allow(null, ''),
  buildNumber: Joi.string().optional().allow(null, ''),
});
