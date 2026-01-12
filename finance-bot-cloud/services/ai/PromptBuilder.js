import { PROMPT_TEMPLATES } from '../../config/constants.js';

export class PromptBuilder {
  constructor() {}

  build(templateName, data) {
    let prompt = PROMPT_TEMPLATES[templateName];
    if (!prompt) {
      throw new Error(`Prompt template not found: ${templateName}`);
    }

    // Replace placeholders like {message} and {context}
    for (const [key, value] of Object.entries(data)) {
        const placeholder = new RegExp(`{${key}}`, 'g');
        const replacement = typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
        prompt = prompt.replace(placeholder, replacement);
    }

    return prompt;
  }

  buildContext(groupData, memory, user) {
    // Build a comprehensive context object for the AI
    const context = {
        timestamp: new Date().toISOString(),
        group: {
            name: groupData.settings.group_name,
            currency: groupData.settings.currency,
            dailyLimit: groupData.settings.daily_limit,
            monthlyLimit: groupData.settings.monthly_limit,
        },
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
        },
        wallet: groupData.wallet,
        recentTransactions: groupData.transactions.slice(-5), // Last 5 transactions
        conversationHistory: memory.messages,
    };
    return context;
  }
}
