import 'dotenv/config';
import Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  // Telegram
  TELEGRAM_TOKEN: Joi.string().required(),
  TELEGRAM_WEBHOOK_URL: Joi.string().uri().optional(),
  SUPER_ADMIN_IDS: Joi.string().required(),

  // Google
  GOOGLE_SERVICE_ACCOUNT_EMAIL: Joi.string().email().required(),
  GOOGLE_PRIVATE_KEY: Joi.string().required(),
  SUPER_ADMIN_SHEET_ID: Joi.string().required(),

  // AI
  AI_PROVIDER: Joi.string().valid('openai', 'deepseek', 'both').default('openai'),
  OPENAI_API_KEY: Joi.string().when('AI_PROVIDER', { is: Joi.string().valid('openai', 'both'), then: Joi.required() }),
  DEEPSEEK_API_KEY: Joi.string().when('AI_PROVIDER', { is: Joi.string().valid('deepseek', 'both'), then: Joi.required() }),
  AI_MODEL: Joi.string().default('gpt-3.5-turbo'),
  AI_MAX_TOKENS: Joi.number().default(150),
  AI_TEMPERATURE: Joi.number().min(0).max(1).default(0.7),

  // Redis
  REDIS_URL: Joi.string().uri().default('redis://localhost:6379'),
  REDIS_PASSWORD: Joi.string().optional(),

  // Voice Processing
  VOICE_PROVIDER: Joi.string().valid('google', 'whisper').default('whisper'),

  // General
  TIMEZONE: Joi.string().default('Asia/Jakarta'),

}).unknown();

const { value: envVars, error } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

export const ENV = {
  ...envVars,
  SUPER_ADMIN_IDS: envVars.SUPER_ADMIN_IDS.split(',').map(id => parseInt(id.trim(), 10)),
};
