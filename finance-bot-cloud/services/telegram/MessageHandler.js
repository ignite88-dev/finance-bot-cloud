import { GroupDataService } from '../google-sheets/GroupDataService.js';
import { AIOrchestrationService } from '../ai/AIOrchestrationService.js';
import { MemoryManager } from '../ai/MemoryManager.js';
import { ErrorLogger } from '../monitoring/ErrorLogger.js';
import { AuditService } from '../monitoring/AuditService.js';
import { KeyboardManager } from './KeyboardManager.js';
import { validateMessage } from '../../utils/validators.js';
import { userRateLimiter } from '../../utils/rate-limiter.js';
import { generateId } from '../../utils/id-generator.js';

export class MessageHandler {
  constructor(config) {
    this.config = config;
    this.groupDataService = config.groupDataService;
    this.aiService = config.aiService;
    this.memoryManager = config.memoryManager;
    this.logger = new ErrorLogger();
    this.auditService = new AuditService();
    this.keyboardManager = new KeyboardManager();
    this.pendingConfirmations = new Map();
  }

  async handle(message, bot) {
    try {
      if (!validateMessage(message)) return;

      const rateLimitResult = userRateLimiter.check(message.from.id);
      if (!rateLimitResult.allowed) {
        await bot.sendMessage(message.chat.id, `⚠️ Terlalu banyak requests. Tunggu ${rateLimitResult.waitTime} detik lagi.`);
        return;
      }

      if (message.text) {
        await this.handleText(message, bot);
      }
      // Handle other message types like voice, photo, etc. later
    } catch (error) {
      this.logger.error('MessageHandler error:', {
        errorMessage: error.message,
        stackTrace: error.stack,
        chatId: message.chat.id,
        userId: message.from.id,
      });
      await bot.sendMessage(message.chat.id, '❌ Terjadi kesalahan internal. Tim kami sudah diberitahu.');
    }
  }

  async handleText(message, bot) {
    const { text, chat, from } = message;
    const chatId = chat.id;
    const userId = from.id;

    // TODO: Handle button commands from main keyboard
    if (text === '📊 Laporan' || text === '📈 Statistik') {
       // ...
    }

    // Process with AI for natural language understanding
    const groupData = await this.groupDataService.getOrCreateGroupData(chatId);
    const memory = await this.memoryManager.getConversationMemory(chatId, userId);

    const aiResult = await this.aiService.processMessage(text, {
      memory,
      groupSettings: groupData.settings,
      userRole: 'user', // TODO: get actual user role
    });

    await this.memoryManager.addToMemory({
        chatId,
        userId,
        username: from.username,
        message: text,
        aiResponse: aiResult,
        timestamp: new Date().toISOString(),
    });

    if (aiResult.intent === 'create_transaction' && aiResult.entities.amount) {
      this.requestTransactionConfirmation(message, aiResult, bot);
    } else {
      await bot.sendMessage(chatId, aiResult.reply, this.keyboardManager.getMainKeyboard('user'));
    }
  }

  async requestTransactionConfirmation(message, aiResult, bot) {
    const { chat, from } = message;
    const confirmationId = generateId('confirm');
    const transactionDetails = aiResult.entities;

    this.pendingConfirmations.set(confirmationId, {
      userId: from.id,
      action: 'create_transaction',
      data: transactionDetails,
    });

    // Auto-cleanup confirmation after 5 minutes
    setTimeout(() => this.pendingConfirmations.delete(confirmationId), 300000);

    const confirmationText = `
      Mohon konfirmasi transaksi berikut:
      - **Jenis:** ${transactionDetails.type}
      - **Jumlah:** ${transactionDetails.amount} ${transactionDetails.currency}
      - **Deskripsi:** ${transactionDetails.description}
    `;

    await bot.sendMessage(chat.id, confirmationText, {
      parse_mode: 'Markdown',
      reply_markup: this.keyboardManager.getConfirmationKeyboard('transaction', confirmationId),
    });
  }

  async executeConfirmedAction(confirmation) {
      if (confirmation.action === 'create_transaction') {
          // logic to add transaction to sheet
          return { success: true, message: "Transaksi berhasil dicatat." };
      }
      return { success: false, message: "Aksi tidak diketahui." };
  }
}
