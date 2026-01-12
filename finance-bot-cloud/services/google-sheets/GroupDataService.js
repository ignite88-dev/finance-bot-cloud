import { SHEETS_STRUCTURE } from '../../config/sheets-structure.js';
import { formatDate, generateId } from '../../utils/helpers.js';
import { ErrorLogger } from '../monitoring/ErrorLogger.js';

export class GroupDataService {
  constructor(sheetsService) {
    this.sheetsService = sheetsService;
    this.logger = new ErrorLogger();
    this.cache = new Map();
  }
  
  async getOrCreateGroupData(chatId, groupInfo = {}) {
    const cacheKey = `group:${chatId}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      // Check if group exists in Super Admin sheet
      const superAdminService = new SuperAdminService(this.sheetsService);
      const groupRecord = await superAdminService.getGroupRecord(chatId);
      
      if (groupRecord) {
        // Group exists, load data
        const groupData = await this.loadGroupData(groupRecord.sheetId, chatId, groupInfo);
        this.cache.set(cacheKey, groupData);
        return groupData;
      } else {
        // Group doesn't exist, auto-provision
        const newGroup = await this.autoProvisionGroup(chatId, groupInfo);
        this.cache.set(cacheKey, newGroup);
        return newGroup;
      }
    } catch (error) {
      this.logger.error(`Failed to get/create group data for ${chatId}:`, error);
      throw error;
    }
  }
  
  async autoProvisionGroup(chatId, groupInfo) {
    const timestamp = new Date().toISOString();
    
    try {
      // 1. Create new spreadsheet
      const groupName = groupInfo.name || `Group ${chatId}`;
      const spreadsheet = await this.sheetsService.createSpreadsheet(
        `Finance Bot - ${groupName}`
      );
      
      // 2. Setup sheet structure
      await this.setupGroupSheetStructure(spreadsheet.id);
      
      // 3. Initialize default data
      await this.initializeGroupData(spreadsheet.id, chatId, groupInfo);
      
      // 4. Register to Super Admin sheet
      const superAdminService = new SuperAdminService(this.sheetsService);
      await superAdminService.registerGroup({
        chatId,
        name: groupName,
        ownerUserId: groupInfo.ownerUserId || '',
        ownerUsername: groupInfo.ownerUsername || '',
        sheetId: spreadsheet.id,
        sheetUrl: spreadsheet.url,
        createdAt: timestamp,
        status: 'ACTIVE'
      });
      
      // 5. Log provisioning
      this.logger.info(`Auto-provisioned group ${chatId}: ${groupName}`, {
        sheetId: spreadsheet.id,
        chatId,
        timestamp
      });
      
      return {
        chatId,
        name: groupName,
        sheetId: spreadsheet.id,
        settings: await this.getGroupSettings(spreadsheet.id),
        createdAt: timestamp
      };
    } catch (error) {
      this.logger.error(`Auto-provision failed for ${chatId}:`, error);
      throw error;
    }
  }
  
  async setupGroupSheetStructure(spreadsheetId) {
    const requests = [];
    const structure = SHEETS_STRUCTURE.GROUP;
    
    // Create or update each sheet
    for (const [sheetKey, sheetConfig] of Object.entries(structure.sheets)) {
      // Check if sheet exists
      const sheetInfo = await this.getSheetInfo(spreadsheetId, sheetConfig.name);
      
      if (!sheetInfo) {
        // Create new sheet
        const sheet = await this.sheetsService.addSheet(spreadsheetId, sheetConfig.name);
        
        // Add headers
        await this.sheetsService.updateValues(
          spreadsheetId,
          `${sheetConfig.name}!A1:${String.fromCharCode(64 + sheetConfig.headers.length)}1`,
          [sheetConfig.headers]
        );
        
        // Add default data if exists
        if (sheetConfig.defaultData) {
          await this.sheetsService.updateValues(
            spreadsheetId,
            `${sheetConfig.name}!A2:${String.fromCharCode(64 + sheetConfig.defaultData[0].length)}${sheetConfig.defaultData.length + 1}`,
            sheetConfig.defaultData
          );
        }
      } else {
        // Update existing sheet headers
        await this.sheetsService.updateValues(
          spreadsheetId,
          `${sheetConfig.name}!A1:${String.fromCharCode(64 + sheetConfig.headers.length)}1`,
          [sheetConfig.headers]
        );
      }
    }
    
    // Format sheets
    await this.formatSheets(spreadsheetId);
  }
  
  async initializeGroupData(spreadsheetId, chatId, groupInfo) {
    const timestamp = new Date().toISOString();
    
    // Update Settings
    await this.sheetsService.updateValues(
      spreadsheetId,
      'Settings!A2:D17',
      [
        ['group_name', groupInfo.name || `Group ${chatId}`, timestamp, 'system'],
        ['owner_user_id', groupInfo.ownerUserId || '', timestamp, 'system'],
        ['owner_username', groupInfo.ownerUsername || '', timestamp, 'system'],
        ['daily_limit', '20', timestamp, 'system'],
        ['monthly_limit', '1000', timestamp, 'system'],
        ['timezone', 'Asia/Jakarta', timestamp, 'system'],
        ['currency', 'IDR', timestamp, 'system'],
        ['enable_chat', 'true', timestamp, 'system'],
        ['require_admin_approval', 'true', timestamp, 'system'],
        ['big_transaction_threshold', '1000000', timestamp, 'system'],
        ['notify_on_limit', 'true', timestamp, 'system'],
        ['auto_reset_daily', 'true', timestamp, 'system'],
        ['exchange_rate', '15000', timestamp, 'system'],
        ['created_at', timestamp, timestamp, 'system'],
        ['last_reset_daily', '', timestamp, 'system'],
        ['last_reset_monthly', '', timestamp, 'system']
      ]
    );
    
    // Initialize Wallet
    await this.sheetsService.updateValues(
      spreadsheetId,
      'Wallet!A2:D3',
      [
        ['IDR', '0', timestamp, 'system'],
        ['USD', '0', timestamp, 'system']
      ]
    );
    
    // Initialize Daily Limits
    await this.sheetsService.updateValues(
      spreadsheetId,
      'Daily_Limits!A2:F2',
      [
        [
          formatDate(new Date(), 'YYYY-MM-DD'),
          '0',
          '20',
          '[]',
          timestamp,
          ''
        ]
      ]
    );
    
    // Initialize Monthly Limits
    await this.sheetsService.updateValues(
      spreadsheetId,
      'Monthly_Limits!A2:E2',
      [
        [
          formatDate(new Date(), 'YYYY-MM'),
          '0',
          '1000',
          '{}',
          timestamp
        ]
      ]
    );
  }
  
  async getGroupSettings(spreadsheetId) {
    try {
      const values = await this.sheetsService.getValues(spreadsheetId, 'Settings!A2:D100');
      
      const settings = {};
      values.forEach(row => {
        if (row && row.length >= 2) {
          const [key, value] = row;
          
          // Convert string values to appropriate types
          if (value === 'true' || value === 'false') {
            settings[key] = value === 'true';
          } else if (!isNaN(value) && value !== '') {
            settings[key] = Number(value);
          } else {
            settings[key] = value;
          }
        }
      });
      
      return settings;
    } catch (error) {
      this.logger.error(`Failed to get settings for ${spreadsheetId}:`, error);
      return {};
    }
  }
  
  async updateGroupSetting(spreadsheetId, key, value, updatedBy = 'system') {
    const timestamp = new Date().toISOString();
    
    try {
      // First, find the row for this key
      const values = await this.sheetsService.getValues(spreadsheetId, 'Settings!A:D');
      
      let rowIndex = -1;
      for (let i = 0; i < values.length; i++) {
        if (values[i] && values[i][0] === key) {
          rowIndex = i;
          break;
        }
      }
      
      if (rowIndex === -1) {
        // Key doesn't exist, append new row
        await this.sheetsService.appendValues(
          spreadsheetId,
          'Settings!A:D',
          [[key, value, timestamp, updatedBy]]
        );
      } else {
        // Update existing row (add 2 because of header and 1-index)
        await this.sheetsService.updateValues(
          spreadsheetId,
          `Settings!A${rowIndex + 2}:D${rowIndex + 2}`,
          [[key, value, timestamp, updatedBy]]
        );
      }
      
      // Invalidate cache
      this.cache.delete(`group:${await this.getChatIdFromSheet(spreadsheetId)}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to update setting ${key} for ${spreadsheetId}:`, error);
      return false;
    }
  }
  
  async addTransaction(spreadsheetId, transaction) {
    const values = [
      [
        transaction.id || generateId('txn'),
        transaction.timestamp || new Date().toISOString(),
        transaction.userId,
        transaction.username,
        transaction.type,
        transaction.amount,
        transaction.currency,
        transaction.targetCurrency || '',
        transaction.targetAmount || '',
        transaction.exchangeRate || '',
        transaction.description || '',
        transaction.category || '',
        transaction.countsToDailyLimit ? 'TRUE' : 'FALSE',
        'FALSE', // Canceled
        '', // Canceled At
        '', // Canceled By
        transaction.requiresAdminApproval ? 'TRUE' : 'FALSE',
        transaction.approvedBy || '',
        transaction.approvedAt || '',
        transaction.tags ? JSON.stringify(transaction.tags) : '',
        transaction.notes || ''
      ]
    ];
    
    try {
      await this.sheetsService.appendValues(
        spreadsheetId,
        'Transactions!A:U',
        values
      );
      
      // Update wallet if needed
      if (transaction.type === 'income' || transaction.type === 'expense' || transaction.type === 'convert') {
        await this.updateWalletBalance(spreadsheetId, transaction);
      }
      
      // Update daily/monthly limits
      if (transaction.type === 'expense' && transaction.countsToDailyLimit) {
        await this.updateDailyLimit(spreadsheetId, transaction);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to add transaction to ${spreadsheetId}:`, error);
      return false;
    }
  }
  
  async updateWalletBalance(spreadsheetId, transaction) {
    try {
      const walletValues = await this.sheetsService.getValues(spreadsheetId, 'Wallet!A:D');
      const timestamp = new Date().toISOString();
      
      for (let i = 0; i < walletValues.length; i++) {
        const row = walletValues[i];
        if (row && row[0] === transaction.currency) {
          let newBalance = parseFloat(row[1] || 0);
          
          if (transaction.type === 'income') {
            newBalance += parseFloat(transaction.amount);
          } else if (transaction.type === 'expense') {
            newBalance -= parseFloat(transaction.amount);
          } else if (transaction.type === 'convert') {
            newBalance -= parseFloat(transaction.amount);
          }
          
          await this.sheetsService.updateValues(
            spreadsheetId,
            `Wallet!B${i + 2}:D${i + 2}`,
            [[newBalance, timestamp, transaction.username]]
          );
        }
        
        // Also update target currency for convert
        if (transaction.type === 'convert' && row && row[0] === transaction.targetCurrency) {
          let targetBalance = parseFloat(row[1] || 0);
          targetBalance += parseFloat(transaction.targetAmount);
          
          await this.sheetsService.updateValues(
            spreadsheetId,
            `Wallet!B${i + 2}:D${i + 2}`,
            [[targetBalance, timestamp, transaction.username]]
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to update wallet for ${spreadsheetId}:`, error);
    }
  }
  
  async getGroupStatistics(spreadsheetId) {
    try {
      const [transactions, users, wallet] = await Promise.all([
        this.sheetsService.getValues(spreadsheetId, 'Transactions!A:U'),
        this.sheetsService.getValues(spreadsheetId, 'Users!A:L'),
        this.sheetsService.getValues(spreadsheetId, 'Wallet!A:D')
      ]);
      
      const activeTransactions = transactions.filter(
        (row, index) => index > 0 && row && row[13] !== 'TRUE'
      );
      
      const activeUsers = users.filter(
        (row, index) => index > 0 && row && row[0]
      );
      
      const walletBalance = {};
      wallet.forEach((row, index) => {
        if (index > 0 && row && row[0]) {
          walletBalance[row[0]] = parseFloat(row[1] || 0);
        }
      });
      
      return {
        totalTransactions: activeTransactions.length,
        activeUsers: activeUsers.length,
        walletBalance,
        lastTransaction: activeTransactions.length > 0 ? 
          activeTransactions[activeTransactions.length - 1][1] : null
      };
    } catch (error) {
      this.logger.error(`Failed to get statistics for ${spreadsheetId}:`, error);
      return null;
    }
  }
  
  async cleanupCache() {
    this.cache.clear();
  }
}