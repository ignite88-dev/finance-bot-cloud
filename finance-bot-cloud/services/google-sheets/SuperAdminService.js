import { SHEETS_STRUCTURE } from '../../config/sheets-structure.js';
import { formatDate } from '../../utils/helpers.js';
import { ErrorLogger } from '../monitoring/ErrorLogger.js';

export class SuperAdminService {
  constructor(sheetsService) {
    this.sheetsService = sheetsService;
    this.logger = new ErrorLogger();
    this.superAdminSheetId = process.env.GOOGLE_SHEETS_SUPER_ADMIN_ID;
  }
  
  async initializeSuperAdminSheet() {
    if (!this.superAdminSheetId) {
      // Create new Super Admin sheet
      const spreadsheet = await this.sheetsService.createSpreadsheet('Finance Bot - Super Admin');
      this.superAdminSheetId = spreadsheet.id;
      
      // Setup structure
      await this.setupSuperAdminStructure();
      
      // Save sheet ID to environment
      process.env.GOOGLE_SHEETS_SUPER_ADMIN_ID = spreadsheet.id;
      
      this.logger.info('Created Super Admin sheet:', spreadsheet);
      return spreadsheet;
    }
    
    return { id: this.superAdminSheetId };
  }
  
  async setupSuperAdminStructure() {
    const structure = SHEETS_STRUCTURE.SUPER_ADMIN;
    
    for (const [sheetKey, sheetConfig] of Object.entries(structure.sheets)) {
      // Add sheet if doesn't exist
      const sheetInfo = await this.getSheetInfo(sheetConfig.name);
      if (!sheetInfo) {
        await this.sheetsService.addSheet(this.superAdminSheetId, sheetConfig.name);
      }
      
      // Add headers
      await this.sheetsService.updateValues(
        this.superAdminSheetId,
        `${sheetConfig.name}!${sheetConfig.range.split(':')[0]}1`,
        [sheetConfig.headers]
      );
    }
  }
  
  async registerGroup(groupData) {
    const values = [
      [
        groupData.chatId,
        groupData.name,
        groupData.ownerUserId || '',
        groupData.ownerUsername || '',
        groupData.sheetId,
        groupData.sheetUrl,
        groupData.createdAt,
        new Date().toISOString(), // Last Activity
        groupData.status || 'ACTIVE',
        '0', // Wallet IDR
        '0', // Wallet USD
        '0', // Total Transactions
        '0', // Active Users
        '20', // Daily Limit
        '1000', // Monthly Limit
        'Asia/Jakarta', // Timezone
        'IDR', // Currency
        'TRUE', // Enable Chat
        'TRUE', // Require Admin Approval
        '1000000' // Big Transaction Threshold
      ]
    ];
    
    try {
      await this.sheetsService.appendValues(
        this.superAdminSheetId,
        'Groups!A:T',
        values
      );
      
      this.logger.info('Registered group to Super Admin:', {
        chatId: groupData.chatId,
        name: groupData.name,
        sheetId: groupData.sheetId
      });
      
      return true;
    } catch (error) {
      this.logger.error('Failed to register group:', error);
      throw error;
    }
  }
  
  async updateGroupActivity(chatId, activityData = {}) {
    try {
      // Find group row
      const groups = await this.sheetsService.getValues(this.superAdminSheetId, 'Groups!A:T');
      
      for (let i = 0; i < groups.length; i++) {
        const row = groups[i];
        if (row && row[0] === chatId.toString()) {
          // Update last activity
          await this.sheetsService.updateValues(
            this.superAdminSheetId,
            `Groups!H${i + 1}`,
            [[new Date().toISOString()]]
          );
          
          // Update statistics if provided
          if (activityData.walletIDR) {
            await this.sheetsService.updateValues(
              this.superAdminSheetId,
              `Groups!I${i + 1}`,
              [[activityData.walletIDR]]
            );
          }
          
          if (activityData.walletUSD) {
            await this.sheetsService.updateValues(
              this.superAdminSheetId,
              `Groups!J${i + 1}`,
              [[activityData.walletUSD]]
            );
          }
          
          if (activityData.totalTransactions) {
            await this.sheetsService.updateValues(
              this.superAdminSheetId,
              `Groups!K${i + 1}`,
              [[activityData.totalTransactions]]
            );
          }
          
          if (activityData.activeUsers) {
            await this.sheetsService.updateValues(
              this.superAdminSheetId,
              `Groups!L${i + 1}`,
              [[activityData.activeUsers]]
            );
          }
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Failed to update group activity for ${chatId}:`, error);
      return false;
    }
  }
  
  async getGroupRecord(chatId) {
    try {
      const groups = await this.sheetsService.getValues(this.superAdminSheetId, 'Groups!A:T');
      
      for (let i = 1; i < groups.length; i++) { // Skip header
        const row = groups[i];
        if (row && row[0] === chatId.toString()) {
          return {
            chatId: row[0],
            name: row[1],
            ownerUserId: row[2],
            ownerUsername: row[3],
            sheetId: row[4],
            sheetUrl: row[5],
            createdAt: row[6],
            lastActivity: row[7],
            status: row[8],
            walletIDR: parseFloat(row[9] || 0),
            walletUSD: parseFloat(row[10] || 0),
            totalTransactions: parseInt(row[11] || 0),
            activeUsers: parseInt(row[12] || 0),
            dailyLimit: parseFloat(row[13] || 20),
            monthlyLimit: parseFloat(row[14] || 1000),
            timezone: row[15] || 'Asia/Jakarta',
            currency: row[16] || 'IDR',
            enableChat: row[17] === 'TRUE',
            requireAdminApproval: row[18] === 'TRUE',
            bigTransactionThreshold: parseFloat(row[19] || 1000000)
          };
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to get group record for ${chatId}:`, error);
      return null;
    }
  }
  
  async getAllGroups(filter = {}) {
    try {
      const groups = await this.sheetsService.getValues(this.superAdminSheetId, 'Groups!A:T');
      const result = [];
      
      for (let i = 1; i < groups.length; i++) {
        const row = groups[i];
        if (row && row[0]) {
          const group = {
            chatId: row[0],
            name: row[1],
            ownerUserId: row[2],
            ownerUsername: row[3],
            sheetId: row[4],
            sheetUrl: row[5],
            createdAt: row[6],
            lastActivity: row[7],
            status: row[8],
            walletIDR: parseFloat(row[9] || 0),
            walletUSD: parseFloat(row[10] || 0),
            totalTransactions: parseInt(row[11] || 0),
            activeUsers: parseInt(row[12] || 0),
            dailyLimit: parseFloat(row[13] || 20),
            monthlyLimit: parseFloat(row[14] || 1000),
            timezone: row[15] || 'Asia/Jakarta',
            currency: row[16] || 'IDR',
            enableChat: row[17] === 'TRUE',
            requireAdminApproval: row[18] === 'TRUE',
            bigTransactionThreshold: parseFloat(row[19] || 1000000)
          };
          
          // Apply filters
          let include = true;
          
          if (filter.status && group.status !== filter.status) {
            include = false;
          }
          
          if (filter.activeOnly && group.status !== 'ACTIVE') {
            include = false;
          }
          
          if (filter.minUsers && group.activeUsers < filter.minUsers) {
            include = false;
          }
          
          if (include) {
            result.push(group);
          }
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error('Failed to get all groups:', error);
      return [];
    }
  }
  
  async logError(errorData) {
    const values = [
      [
        new Date().toISOString(),
        errorData.chatId || '',
        errorData.groupName || '',
        errorData.errorType || 'UNKNOWN',
        errorData.errorMessage || '',
        errorData.stackTrace || '',
        errorData.userId || '',
        errorData.username || '',
        errorData.action || '',
        'FALSE', // Resolved
        '' // Resolution Notes
      ]
    ];
    
    try {
      await this.sheetsService.appendValues(
        this.superAdminSheetId,
        'Error Logs!A:K',
        values
      );
      
      return true;
    } catch (error) {
      this.logger.error('Failed to log error:', error);
      return false;
    }
  }
  
  async logAudit(auditData) {
    const values = [
      [
        new Date().toISOString(),
        auditData.chatId || '',
        auditData.groupName || '',
        auditData.userId || '',
        auditData.username || '',
        auditData.action || '',
        auditData.entityType || '',
        auditData.entityId || '',
        auditData.oldValue || '',
        auditData.newValue || '',
        auditData.ipAddress || '',
        auditData.userAgent || ''
      ]
    ];
    
    try {
      await this.sheetsService.appendValues(
        this.superAdminSheetId,
        'Audit Logs!A:L',
        values
      );
      
      return true;
    } catch (error) {
      this.logger.error('Failed to log audit:', error);
      return false;
    }
  }
  
  async getSystemStatistics() {
    try {
      const groups = await this.getAllGroups();
      const errors = await this.sheetsService.getValues(this.superAdminSheetId, 'Error Logs!A:K');
      const audits = await this.sheetsService.getValues(this.superAdminSheetId, 'Audit Logs!A:L');
      
      const activeGroups = groups.filter(g => g.status === 'ACTIVE').length;
      const inactiveGroups = groups.length - activeGroups;
      
      const totalUsers = groups.reduce((sum, group) => sum + (group.activeUsers || 0), 0);
      const totalTransactions = groups.reduce((sum, group) => sum + (group.totalTransactions || 0), 0);
      
      const unresolvedErrors = errors.filter((row, index) => 
        index > 0 && row && row[9] === 'FALSE'
      ).length;
      
      return {
        totalGroups: groups.length,
        activeGroups,
        inactiveGroups,
        totalUsers,
        totalTransactions,
        totalErrors: errors.length - 1, // Subtract header
        unresolvedErrors,
        totalAudits: audits.length - 1,
        lastAudit: audits.length > 1 ? audits[audits.length - 1][0] : null
      };
    } catch (error) {
      this.logger.error('Failed to get system statistics:', error);
      return null;
    }
  }
}