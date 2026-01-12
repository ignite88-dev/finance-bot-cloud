import OpenAI from 'openai';
import axios from 'axios';
import { MemoryManager } from './MemoryManager.js';
import { PromptBuilder } from './PromptBuilder.js';
import { IntentParser } from './IntentParser.js';
import { ErrorLogger } from '../monitoring/ErrorLogger.js';

export class AIOrchestrationService {
  constructor(config) {
    this.config = config;
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.logger = new ErrorLogger();
    this.promptBuilder = new PromptBuilder();
    this.intentParser = new IntentParser();
    this.memoryManager = null;
  }
  
  setMemoryManager(memoryManager) {
    this.memoryManager = memoryManager;
  }
  
  async processMessage(message, context) {
    const startTime = Date.now();
    
    try {
      // 1. Get or create conversation memory
      const memory = await this.memoryManager.getConversationMemory(
        context.chatId,
        context.userId,
        context.threadId
      );
      
      // 2. Build AI prompt with context
      const prompt = await this.promptBuilder.build(message, {
        ...context,
        memory,
        timestamp: new Date().toISOString()
      });
      
      // 3. Call AI API
      const aiResponse = await this.callAI(prompt);
      
      // 4. Parse intent and entities
      const parsed = this.intentParser.parse(aiResponse);
      
      // 5. Update memory
      await this.memoryManager.addToMemory({
        chatId: context.chatId,
        userId: context.userId,
        threadId: context.threadId,
        message,
        aiResponse: parsed,
        timestamp: new Date().toISOString()
      });
      
      // 6. Log performance
      const processingTime = Date.now() - startTime;
      this.logPerformance({
        ...context,
        messageLength: message.length,
        processingTime,
        tokensUsed: aiResponse.usage?.total_tokens || 0
      });
      
      return {
        success: true,
        data: parsed,
        metadata: {
          processingTime,
          tokensUsed: aiResponse.usage?.total_tokens || 0,
          model: aiResponse.model
        }
      };
      
    } catch (error) {
      this.logger.error('AI processing failed:', error);
      
      return {
        success: false,
        error: error.message,
        fallback: this.getFallbackResponse(message, context)
      };
    }
  }
  
  async callAI(prompt) {
    // Try primary provider (OpenAI)
    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: prompt.system
          },
          {
            role: 'user',
            content: prompt.user
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: "json_object" }
      });
      
      return response;
    } catch (error) {
      this.logger.warn('OpenAI failed, trying DeepSeek:', error.message);
      
      // Fallback to DeepSeek
      try {
        const response = await axios.post(
          'https://api.deepseek.com/chat/completions',
          {
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: prompt.system
              },
              {
                role: 'user',
                content: prompt.user
              }
            ],
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
            response_format: { type: "json_object" }
          },
          {
            headers: {
              'Authorization': `Bearer ${this.config.deepseekApiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );
        
        return response.data;
      } catch (deepseekError) {
        throw new Error(`All AI providers failed: ${deepseekError.message}`);
      }
    }
  }
  
  async processVoice(voiceData, context) {
    try {
      // 1. Convert voice to text
      const text = await this.transcribeVoice(voiceData);
      
      // 2. Process as text message
      return await this.processMessage(text, {
        ...context,
        isVoice: true,
        originalVoice: voiceData
      });
      
    } catch (error) {
      this.logger.error('Voice processing failed:', error);
      return {
        success: false,
        error: error.message,
        fallback: "Maaf, saya tidak bisa memproses pesan suara saat ini."
      };
    }
  }
  
  async transcribeVoice(voiceData) {
    // Implementation depends on voice service (Google Speech, Whisper, etc.)
    // This is a placeholder - implement based on your chosen service
    
    // Example with Google Speech-to-Text
    if (voiceData.googleSpeechApiKey) {
      // Implement Google Speech API call
    }
    
    // Fallback to Whisper (OpenAI)
    try {
      const response = await this.openai.audio.transcriptions.create({
        file: voiceData.file,
        model: "whisper-1",
        language: "id"
      });
      
      return response.text;
    } catch (error) {
      throw new Error(`Voice transcription failed: ${error.message}`);
    }
  }
  
  getFallbackResponse(message, context) {
    // Simple rule-based fallback
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('saldo') || lowerMessage.includes('balance')) {
      return {
        type: "info",
        action: "balance",
        message: "Untuk melihat saldo, gunakan tombol '💰 Saldo' atau ketik 'cek saldo'"
      };
    }
    
    if (lowerMessage.includes('transaksi') || lowerMessage.includes('history')) {
      return {
        type: "info",
        action: "history",
        message: "Untuk melihat transaksi, gunakan tombol '📊 Harian' atau '📅 Bulanan'"
      };
    }
    
    if (lowerMessage.includes('bantuan') || lowerMessage.includes('help')) {
      return {
        type: "info",
        action: "help",
        message: "Gunakan tombol di keyboard atau ketik perintah seperti:\n• 'gajian 5 juta'\n• 'makan 75rb'\n• 'rate 16000'\n• 'salah tadi' untuk membatalkan"
      };
    }
    
    return {
      type: "chat",
      action: "chat_response",
      message: "Maaf, saya tidak mengerti. Coba gunakan tombol di bawah atau ketik 'bantuan' untuk panduan.",
      chat_response: "Saya agak bingung nih. Coba gunakan tombol yang tersedia atau ketik 'bantuan' ya!"
    };
  }
  
  logPerformance(metrics) {
    // Log to monitoring service
    this.logger.info('AI Performance:', metrics);
  }
}