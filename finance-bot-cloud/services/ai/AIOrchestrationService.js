import TelegramBot from 'node-telegram-bot-api';
import { MessageHandler } from './MessageHandler.js';
import { CommandHandler } from './CommandHandler.js';
import { VoiceHandler } from './VoiceHandler.js';
import { KeyboardManager } from './KeyboardManager.js';
import { ErrorLogger } from '../monitoring/ErrorLogger.js';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor.js';

export class TelegramBotWrapper {
  constructor(config) {
    this.config = config;
    this.bot = null;
    this.logger = new ErrorLogger();
    this.performanceMonitor = new PerformanceMonitor();
    
    // Initialize handlers
    this.messageHandler = new MessageHandler(config);
    this.commandHandler = new CommandHandler(config);
    this.voiceHandler = new VoiceHandler(config);
    this.keyboardManager = new KeyboardManager();
    
    this.isInitialized = false;
  }
  
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Initialize bot
      if (this.config.webhook) {
        // Webhook mode for production
        this.bot = new TelegramBot(this.config.token);
        
        await this.bot.setWebHook(`${this.config.webhook}/${this.config.token}`);
        this.logger.info('Webhook set:', `${this.config.webhook}/${this.config.token}`);
      } else {
        // Polling mode for development
        this.bot = new TelegramBot(this.config.token, { polling: true });
        this.logger.info('Bot initialized with polling');
      }
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.logger.info('Telegram Bot Wrapper initialized');
      
    } catch (error) {
      this.logger.error('Failed to initialize Telegram Bot:', error);
      throw error;
    }
  }
  
  setupEventListeners() {
    // Message handler
    this.bot.on('message', async (msg) => {
      const startTime = Date.now();
      
      try {
        await this.messageHandler.handle(msg, this.bot);
      } catch (error) {
        this.logger.error('Message handler error:', error);
      } finally {
        const processingTime = Date.now() - startTime;
        this.performanceMonitor.record('message_processing', processingTime);
      }
    });
    
    // Command handler
    this.bot.onText(/\/(.+)/, async (msg, match) => {
      const startTime = Date.now();
      
      try {
        await this.commandHandler.handle(msg, match, this.bot);
      } catch (error) {
        this.logger.error('Command handler error:', error);
      } finally {
        const processingTime = Date.now() - startTime;
        this.performanceMonitor.record('command_processing', processingTime);
      }
    });
    
    // Voice message handler
    this.bot.on('voice', async (msg) => {
      const startTime = Date.now();
      
      try {
        await this.voiceHandler.handle(msg, this.bot);
      } catch (error) {
        this.logger.error('Voice handler error:', error);
      } finally {
        const processingTime = Date.now() - startTime;
        this.performanceMonitor.record('voice_processing', processingTime);
      }
    });
    
    // Callback query handler (for inline keyboards)
    this.bot.on('callback_query', async (callbackQuery) => {
      const startTime = Date.now();
      
      try {
        await this.handleCallbackQuery(callbackQuery);
      } catch (error) {
        this.logger.error('Callback query error:', error);
      } finally {
        const processingTime = Date.now() - startTime;
        this.performanceMonitor.record('callback_processing', processingTime);
      }
    });
    
    // Error handler
    this.bot.on('polling_error', (error) => {
      this.logger.error('Polling error:', error);
    });
    
    this.bot.on('webhook_error', (error) => {
      this.logger.error('Webhook error:', error);
    });
  }
  
  async handleCallbackQuery(callbackQuery) {
    await this.bot.answerCallbackQuery(callbackQuery.id);
    
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    
    try {
      // Parse callback data
      const [action, ...params] = data.split(':');
      
      switch (action) {
        case 'confirm':
          await this.handleConfirmation(callbackQuery, params);
          break;
          
        case 'superadmin':
          await this.handleSuperAdminCallback(callbackQuery, params);
          break;
          
        case 'admin':
          await this.handleAdminCallback(callbackQuery, params);
          break;
          
        case 'transaction':
          await this.handleTransactionCallback(callbackQuery, params);
          break;
          
        default:
          this.logger.warn('Unknown callback action:', action);
      }
    } catch (error) {
      this.logger.error('Callback query processing error:', error);
      await this.bot.sendMessage(
        chatId,
        '❌ Terjadi error saat memproses aksi. Coba lagi nanti.'
      );
    }
  }
  
  async handleConfirmation(callbackQuery, params) {
    const [confirmId, action] = params;
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    
    // Get pending confirmation
    const pending = this.messageHandler.pendingConfirmations.get(confirmId);
    
    if (!pending) {
      await this.bot.sendMessage(chatId, '❌ Konfirmasi sudah kadaluarsa.');
      return;
    }
    
    if (pending.userId !== userId) {
      await this.bot.sendMessage(chatId, '❌ Ini bukan konfirmasi untuk Anda.');
      return;
    }
    
    if (action === 'cancel') {
      await this.bot.editMessageText('❌ Transaksi dibatalkan.', {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id
      });
      return;
    }
    
    // Process the confirmed action
    const result = await this.messageHandler.executeConfirmedAction(pending);
    
    let response = result.message;
    if (result.success) {
      response = `✅ ${response}`;
    }
    
    await this.bot.editMessageText(response, {
      chat_id: chatId,
      message_id: callbackQuery.message.message_id,
      parse_mode: 'Markdown',
      reply_markup: this.keyboardManager.getGroupKeyboard(chatId, userId).reply_markup
    });
    
    // Cleanup
    this.messageHandler.pendingConfirmations.delete(confirmId);
  }
  
  async handleUpdate(update) {
    // For webhook mode, process update directly
    if (this.config.webhook) {
      this.bot.processUpdate(update);
    }
  }
  
  async shutdown() {
    if (this.bot) {
      if (this.config.webhook) {
        await this.bot.deleteWebHook();
      }
      
      this.bot.stopPolling();
      this.logger.info('Telegram Bot shutdown complete');
    }
  }
  
  getBot() {
    return this.bot;
  }
}
