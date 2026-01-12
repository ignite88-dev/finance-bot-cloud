export const BOT_NAME = 'AI Finance Bot';
export const DEFAULT_LANGUAGE = 'id';
export const SUPPORTED_LANGUAGES = ['id', 'en'];

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
  CONVERT: 'convert',
};

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer',
};

export const CACHE_KEYS = {
  GROUP_DATA: (chatId) => `group:${chatId}`,
  GROUP_SETTINGS: (sheetId) => `settings:${sheetId}`,
  USER_DATA: (sheetId, userId) => `user:${sheetId}:${userId}`,
  CONVERSATION_MEMORY: (chatId, userId, threadId) => `memory:${chatId}:${userId}:${threadId || 'default'}`,
};

export const CACHE_TTL = {
  GROUP_DATA: 300, // 5 minutes
  GROUP_SETTINGS: 3600, // 1 hour
  USER_DATA: 600, // 10 minutes
  CONVERSATION_MEMORY: 300, // 5 minutes
};

export const COMMANDS = {
  ADMIN: ['config', 'setlimit', 'addadmin', 'removeadmin', 'kick', 'ban', 'stats'],
  SUPER_ADMIN: ['super_whitelist', 'super_broadcast', 'super_stats', 'super_maintenance'],
};

export const AI_MODELS = {
  OPENAI: 'openai',
  DEEPSEEK: 'deepseek',
};

export const PROMPT_TEMPLATES = {
  TRANSACTION_ANALYSIS: `
    Analyze the following message and extract transaction details.
    Message: "{message}"
    Context: {context}
    Respond in JSON format with fields: {
      "intent": "create_transaction",
      "entities": {
        "amount": <number>,
        "currency": <string>,
        "type": <'income'|'expense'>,
        "description": <string>,
        "category": <string>
      },
      "confidence": <number_between_0_and_1>,
      "reply": "<string_for_user>"
    }
  `,
};
