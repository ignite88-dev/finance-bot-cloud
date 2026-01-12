import { ErrorLogger } from '../monitoring/ErrorLogger.js';
import { createTransaction } from '../../models/Transaction.js';

export class IntentParser {
  constructor() {
      this.logger = new ErrorLogger();
  }

  parse(aiResponse) {
    try {
        // Attempt to parse the response if it's a string
        let data = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;

        if (!data.intent) {
            return { intent: 'unknown', reply: data.reply || "Maaf, saya tidak mengerti maksud Anda." };
        }

        switch(data.intent) {
            case 'create_transaction':
                return this.parseCreateTransaction(data);

            // ... other intents

            default:
                return {
                    intent: data.intent,
                    entities: data.entities || {},
                    reply: data.reply,
                    confidence: data.confidence || 0,
                };
        }

    } catch (error) {
        this.logger.warn('Failed to parse AI response JSON', { aiResponse, errorMessage: error.message });
        // If parsing fails, treat the whole response as a simple reply.
        return { intent: 'unknown', reply: aiResponse };
    }
  }

  parseCreateTransaction(data) {
    try {
      const transactionData = createTransaction(data.entities);
      return {
          intent: 'create_transaction',
          entities: transactionData,
          reply: data.reply,
          confidence: data.confidence,
      };
    } catch (error) {
        // This can happen if the AI returns incomplete data for the transaction
        this.logger.warn('AI returned incomplete transaction data.', { data, errorMessage: error.message });
        return {
            intent: 'clarification_needed',
            reply: `Sepertinya ada informasi yang kurang untuk transaksi. ${error.message}. Bisa tolong perjelas?`,
            originalData: data,
        };
    }
  }
}
