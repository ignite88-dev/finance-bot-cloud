import Joi from 'joi';
import { generateId } from '../utils/id-generator.js';

const aiMemorySchema = Joi.object({
    id: Joi.string().default(() => generateId('mem')),
    timestamp: Joi.date().iso().default(() => new Date().toISOString()),
    chatId: Joi.number().required(),
    userId: Joi.number().required(),
    username: Joi.string().allow('').optional(),
    message: Joi.string().required(),
    aiResponse: Joi.object().optional(),
    intent: Joi.string().optional(),
    threadId: Joi.string().optional(),
});

export function createAIMemory(data) {
  const { value, error } = aiMemorySchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw new Error(`Invalid AI Memory data: ${error.details.map(d => d.message).join(', ')}`);
  }

  return value;
}
