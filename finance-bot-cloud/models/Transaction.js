import Joi from 'joi';
import { generateId } from '../utils/id-generator.js';
import { TRANSACTION_TYPES } from '../config/constants.js';

const transactionSchema = Joi.object({
  id: Joi.string().default(() => generateId('txn')),
  timestamp: Joi.date().iso().default(() => new Date().toISOString()),
  userId: Joi.string().required(),
  username: Joi.string().allow('').optional(),
  type: Joi.string().valid(...Object.values(TRANSACTION_TYPES)).required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).uppercase().required(),
  description: Joi.string().required(),
  category: Joi.string().optional(),
});

export function createTransaction(data) {
  const { value, error } = transactionSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw new Error(`Invalid transaction data: ${error.details.map(d => d.message).join(', ')}`);
  }

  return value;
}
