import Joi from 'joi';

export const analyticsQuerySchema = Joi.object({
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  milestoneId: Joi.string().uuid().optional(),
}).custom((value, helpers) => {
  if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'date range validation').messages({
  'any.invalid': 'dateFrom must be before or equal to dateTo',
});
