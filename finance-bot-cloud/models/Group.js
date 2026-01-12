import Joi from 'joi';

const groupSchema = Joi.object({
  chatId: Joi.number().required(),
  name: Joi.string().required(),
  sheetId: Joi.string().required(),
  ownerUserId: Joi.number().optional(),
  createdAt: Joi.date().iso().default(() => new Date().toISOString()),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'BANNED').default('ACTIVE'),
});

export function createGroup(data) {
  const { value, error } = groupSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw new Error(`Invalid group data: ${error.details.map(d => d.message).join(', ')}`);
  }

  return value;
}
