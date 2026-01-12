import { SHEETS_STRUCTURE } from '../../config/sheets-structure.js';
import { SuperAdminService } from './SuperAdminService.js';
import { createGroup } from '../../models/Group.js';
import { createTransaction } from '../../models/Transaction.js';
import { ErrorLogger } from '../monitoring/ErrorLogger.js';

export class GroupDataService {
  constructor(sheetsService) {
    this.sheetsService = sheetsService;
    this.superAdminService = new SuperAdminService(sheetsService);
    this.logger = new ErrorLogger();
    this.cache = new Map(); // Simple in-memory cache
  }

  async getOrCreateGroupData(chatId, groupInfo = {}) {
    const cacheKey = `group:${chatId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const groupRecord = await this.superAdminService.getGroupRecord(chatId);

      if (groupRecord) {
        const groupData = { ...groupRecord, settings: await this.getGroupSettings(groupRecord.sheetId) };
        this.cache.set(cacheKey, groupData);
        return groupData;
      } else {
        return await this.provisionNewGroup(chatId, groupInfo);
      }
    } catch (error) {
      this.logger.error(`Failed to get/create group data for ${chatId}:`, { errorMessage: error.message, stackTrace: error.stack });
      throw error;
    }
  }

  async provisionNewGroup(chatId, groupInfo) {
    // ... (provisioning logic remains the same)
  }

  async setupSheetStructure(spreadsheetId, sheetMetadata) {
    // ... (setup logic remains the same)
  }

  async initializeSettings(spreadsheetId, sheetMetadata, chatId, groupInfo) {
    // ... (initialization logic remains the same)
  }

  async getGroupSettings(spreadsheetId) {
    // ... (settings logic remains the same)
  }

  async updateGroupSetting(chatId, key, value, updatedBy) {
    // ... (update setting logic remains the same)
  }

  async getUser(chatId, userId) {
    const groupData = await this.getOrCreateGroupData(chatId);
    if (!groupData) return null;

    const spreadsheetId = groupData.sheetId;
    const cacheKey = `user:${spreadsheetId}:${userId}`;

    if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
    }

    try {
        const users = await this.sheetsService.getValues(spreadsheetId, 'Users!A2:L');
        if (!users) return null;

        const userRow = users.find(row => row && row[0] === String(userId));
        if (!userRow) return null;

        const user = {
            id: parseInt(userRow[0], 10),
            username: userRow[1],
            firstName: userRow[2],
            lastName: userRow[3],
            role: userRow[4],
            joinedAt: userRow[5],
            lastActive: userRow[6],
            totalTransactions: parseInt(userRow[7] || '0', 10),
            totalAmountIDR: parseFloat(userRow[8] || '0'),
            totalAmountUSD: parseFloat(userRow[9] || '0'),
            isAdmin: userRow[10] === 'TRUE',
            permissions: userRow[11] ? JSON.parse(userRow[11]) : [],
        };

        this.cache.set(cacheKey, user, 600); // Cache for 10 minutes
        return user;
    } catch (error) {
        this.logger.error(`Failed to get user ${userId} from group ${chatId}`, { errorMessage: error.message });
        return null;
    }
  }

  async addTransaction(chatId, transactionData) {
    const groupData = await this.getOrCreateGroupData(chatId);
    const transaction = createTransaction(transactionData);

    const values = [
        Object.values(SHEETS_STRUCTURE.GROUP.sheets.TRANSACTIONS.headers)
            .map(header => transaction[header] ?? '')
    ];

    await this.sheetsService.appendValues(groupData.sheetId, 'Transactions!A:U', values);
    return true;
  }
}
