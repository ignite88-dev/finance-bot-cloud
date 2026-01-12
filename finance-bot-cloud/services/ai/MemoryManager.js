import { GroupDataService } from '../google-sheets/GroupDataService.js';
import { generateId, hashString } from '../../utils/helpers.js';
import { ErrorLogger } from '../monitoring/ErrorLogger.js';

export class MemoryManager {
  constructor(groupDataService) {
    this.groupDataService = groupDataService;
    this.logger = new ErrorLogger();
    this.cache = new Map();
  }
  
  async getConversationMemory(chatId, userId, threadId = null) {
    const cacheKey = `memory:${chatId}:${userId}:${threadId || 'default'}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      // Get group data to access sheet ID
      const groupData = await this.groupDataService.getOrCreateGroupData(chatId);
      
      if (!groupData || !groupData.sheetId) {
        return this.createEmptyMemory();
      }
      
      // Load memory from sheet
      const memory = await this.loadMemoryFromSheet(
        groupData.sheetId,
        chatId,
        userId,
        threadId
      );
      
      // Cache for 5 minutes
      this.cache.set(cacheKey, memory);
      setTimeout(() => {
        this.cache.delete(cacheKey);
      }, 300000);
      
      return memory;
      
    } catch (error) {
      this.logger.error(`Failed to get memory for ${chatId}:${userId}:`, error);
      return this.createEmptyMemory();
    }
  }
  
  async loadMemoryFromSheet(sheetId, chatId, userId, threadId = null) {
    try {
      const values = await this.groupDataService.sheetsService.getValues(
        sheetId,
        'AI_Memory!A:O'
      );
      
      let filtered = values;
      
      // Filter by thread if specified
      if (threadId) {
        filtered = values.filter(row => row && row[9] === threadId);
      }
      
      // Filter by user and recency
      filtered = filtered
        .filter(row => row && row[2] === userId.toString())
        .sort((a, b) => new Date(b[1]) - new Date(a[1]))
        .slice(0, 10); // Last 10 messages
      
      return {
        messages: filtered.map(row => ({
          id: row[0],
          timestamp: row[1],
          userId: row[2],
          username: row[3],
          message: row[4],
          aiResponse: row[5],
          intent: row[6],
          entities: row[7] ? JSON.parse(row[7]) : {},
          contextHash: row[8],
          threadId: row[9],
          messageType: row[10],
          tokensUsed: parseInt(row[11] || 0),
          model: row[12],
          sentiment: row[13],
          confidence: parseFloat(row[14] || 0)
        })),
        summary: this.generateSummary(filtered),
        contextHash: this.generateContextHash(filtered)
      };
      
    } catch (error) {
      this.logger.error(`Failed to load memory from sheet ${sheetId}:`, error);
      return this.createEmptyMemory();
    }
  }
  
  async addToMemory(memoryData) {
    try {
      const groupData = await this.groupDataService.getOrCreateGroupData(memoryData.chatId);
      
      if (!groupData || !groupData.sheetId) {
        return false;
      }
      
      const values = [
        [
          generateId('mem'),
          memoryData.timestamp,
          memoryData.userId,
          memoryData.username || '',
          memoryData.message,
          JSON.stringify(memoryData.aiResponse || {}),
          memoryData.aiResponse?.intent || '',
          JSON.stringify(memoryData.aiResponse?.entities || {}),
          this.generateContextHash([memoryData]),
          memoryData.threadId || 'default',
          memoryData.isVoice ? 'voice' : 'text',
          memoryData.tokensUsed || 0,
          memoryData.model || '',
          memoryData.sentiment || 'neutral',
          memoryData.confidence || 0
        ]
      ];
      
      await this.groupDataService.sheetsService.appendValues(
        groupData.sheetId,
        'AI_Memory!A:O',
        values
      );
      
      // Invalidate cache
      const cacheKey = `memory:${memoryData.chatId}:${memoryData.userId}:${memoryData.threadId || 'default'}`;
      this.cache.delete(cacheKey);
      
      return true;
      
    } catch (error) {
      this.logger.error('Failed to add to memory:', error);
      return false;
    }
  }
  
  async getThreadMemory(chatId, threadId) {
    try {
      const groupData = await this.groupDataService.getOrCreateGroupData(chatId);
      
      if (!groupData || !groupData.sheetId) {
        return [];
      }
      
      const values = await this.groupDataService.sheetsService.getValues(
        groupData.sheetId,
        'AI_Memory!A:O'
      );
      
      return values
        .filter(row => row && row[9] === threadId)
        .sort((a, b) => new Date(a[1]) - new Date(b[1]))
        .map(row => ({
          id: row[0],
          timestamp: row[1],
          userId: row[2],
          username: row[3],
          message: row[4],
          aiResponse: row[5] ? JSON.parse(row[5]) : {},
          intent: row[6]
        }));
      
    } catch (error) {
      this.logger.error(`Failed to get thread memory ${threadId}:`, error);
      return [];
    }
  }
  
  async clearMemory(chatId, userId = null, threadId = null) {
    try {
      const groupData = await this.groupDataService.getOrCreateGroupData(chatId);
      
      if (!groupData || !groupData.sheetId) {
        return false;
      }
      
      // This is a simplified implementation
      // In production, you would need to implement proper filtering and deletion
      
      // For now, just clear the cache
      if (userId && threadId) {
        const cacheKey = `memory:${chatId}:${userId}:${threadId}`;
        this.cache.delete(cacheKey);
      } else if (userId) {
        // Clear all memories for this user
        for (const key of this.cache.keys()) {
          if (key.includes(`:${userId}:`)) {
            this.cache.delete(key);
          }
        }
      } else {
        // Clear all memories for this chat
        for (const key of this.cache.keys()) {
          if (key.startsWith(`memory:${chatId}:`)) {
            this.cache.delete(key);
          }
        }
      }
      
      return true;
      
    } catch (error) {
      this.logger.error('Failed to clear memory:', error);
      return false;
    }
  }
  
  generateSummary(messages) {
    if (!messages || messages.length === 0) {
      return 'No conversation history';
    }
    
    const lastMessage = messages[0];
    const intent = lastMessage[6] || 'unknown';
    
    return `Last intent: ${intent}, ${messages.length} messages in memory`;
  }
  
  generateContextHash(messages) {
    if (!messages || messages.length === 0) {
      return hashString('empty');
    }
    
    const recentTexts = messages
      .slice(0, 3)
      .map(msg => msg[4] || '')
      .join('|');
    
    return hashString(recentTexts);
  }
  
  createEmptyMemory() {
    return {
      messages: [],
      summary: 'No conversation history',
      contextHash: hashString('empty')
    };
  }
}