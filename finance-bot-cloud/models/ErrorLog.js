import Joi from 'joi';

const errorLogSchema = Joi.object({
  timestamp: Joi.date().iso().default(() => new Date().toISOString()),
  level: Joi.string().valid('error', 'warn', 'info', 'debug').required(),
  message: Joi.string().required(),
  errorMessage: Joi.string().optional(),
  stackTrace: Joi.string().optional(),
  chatId: Joi.number().optional(),
  userId: Joi.number().optional(),
  action: Joi.string().optional(),
  resolved: Joi.boolean().default(false),
});

export function createErrorLog(data) {
  const { value, error } = errorLogSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw new Error(`Invalid Error Log data: ${error.details.map(d => d.message).join(', ')}`);
  }

  return value;
}
