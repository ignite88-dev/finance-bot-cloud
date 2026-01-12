import Joi from 'joi';

const messageSchema = Joi.object({
  message_id: Joi.number().required(),
  date: Joi.number().required(),
  chat: Joi.object({
    id: Joi.number().required(),
    type: Joi.string().valid('group', 'supergroup', 'private').required(),
  }).required(),
  from: Joi.object({
    id: Joi.number().required(),
    is_bot: Joi.boolean().required(),
  }).required(),
}).unknown(true);

const userSchema = Joi.object({
    id: Joi.number().required(),
    isAdmin: Joi.boolean().optional(),
}).unknown(true);


export function validateMessage(message) {
  const { error } = messageSchema.validate(message);
  if (error) {
    console.warn('Invalid message structure:', error.details);
    return false;
  }
  return true;
}

export function validateUser(user) {
    if (!user) return false;
    const { error } = userSchema.validate(user);
    if (error) {
        console.warn('Invalid user structure:', error.details);
        return false;
    }
    return true;
}
