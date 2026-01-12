import TelegramBot from 'node-telegram-bot-api';
import { MessageHandler } from './MessageHandler.js';
import { CommandHandler } from './CommandHandler.js';
import { VoiceHandler } from './VoiceHandler.js';
import { KeyboardManager } from './KeyboardManager.js';

export class TelegramBotWrapper {
  constructor(config) {
    this.config = config;
    this.bot = null;
    this.logger = config.logger;
    this.performanceMonitor = config.performanceMonitor;

    this.messageHandler = new MessageHandler(config);
    this.commandHandler = new CommandHandler(config);
    this.voiceHandler = new VoiceHandler({ ...config, messageHandler: this.messageHandler });
    this.keyboardManager = new KeyboardManager();

    this.isInitialized = false;
  }

  async initialize() {
    // ... (rest of the file is correct)
  }

  // ... (rest of the file is correct)
}