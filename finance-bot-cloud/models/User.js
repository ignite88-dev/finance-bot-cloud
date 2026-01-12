import Joi from 'joi';
import { USER_ROLES } from '../config/constants.js';

const userSchema = Joi.object({
  id: Joi.number().required(),
  username: Joi.string().allow('').optional(),
  firstName: Joi.string().required(),
  lastName: Joi.string().allow('').optional(),
  role: Joi.string().valid(...Object.values(USER_ROLES)).default(USER_ROLES.USER),
  joinedAt: Joi.date().iso().default(() => new Date().toISOString()),
  isAdmin: Joi.boolean().default(false),
});

export function createUser(data) {
  const { value, error } = userSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw new Error(`Invalid user data: ${error.details.map(d => d.message).join(', ')}`);
  }

  return value;
}
