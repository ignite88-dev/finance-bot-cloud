import { ErrorLogger } from '../monitoring/ErrorLogger.js';
import { VoiceProcessingService } from '../ai/VoiceProcessingService.js';
import { ENV } from '../../config/environment.js';

export class VoiceHandler {
    constructor(config) {
        this.config = config;
        this.logger = new ErrorLogger();
        this.voiceService = new VoiceProcessingService();
        this.messageHandler = config.messageHandler;
    }

    async handle(message, bot) {
        const { chat, from, voice } = message;

        try {
            await bot.sendChatAction(chat.id, 'typing');

            const file = await bot.getFile(voice.file_id);
            const fileUrl = `https://api.telegram.org/file/bot${ENV.TELEGRAM_TOKEN}/${file.file_path}`;

            // TODO: Get language from group settings
            const language = 'id';

            const transcribedText = await this.voiceService.processVoiceMessage(fileUrl, 'ogg', language);

            if (transcribedText && transcribedText.trim().length > 0) {
                const textMessage = {
                    ...message,
                    text: transcribedText,
                };

                await bot.sendMessage(chat.id, `🗣️ Anda berkata: "_${transcribedText}_"`, { parse_mode: 'Markdown' });
                await this.messageHandler.handle(textMessage, bot);

            } else {
                await bot.sendMessage(chat.id, '⚠️ Maaf, saya tidak bisa memahami audio Anda atau audio kosong.');
            }

        } catch (error) {
            this.logger.error('VoiceHandler error:', {
                errorMessage: error.message,
                stackTrace: error.stack,
                chatId: chat.id,
                userId: from.id,
            });
            await bot.sendMessage(chat.id, '❌ Terjadi kesalahan saat memproses pesan suara.');
        }
    }
}
