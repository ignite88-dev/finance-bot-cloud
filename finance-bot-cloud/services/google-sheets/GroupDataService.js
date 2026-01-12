import { SHEETS_STRUCTURE } from '../../config/sheets-structure.js';
import { ErrorLogger } from '../monitoring/ErrorLogger.js';
import { SuperAdminService } from './SuperAdminService.js';
import { Group } from '../../models/Group.js';

export class GroupDataService {
  constructor(sheetsService) {
    this.sheetsService = sheetsService;
    this.superAdminService = new SuperAdminService(sheetsService);
    this.logger = new ErrorLogger();
    this.cache = new Map(); // Simple in-memory cache for group data
  }

  async getOrCreateGroupData(chatId, groupInfo = {}) {
    const cacheKey = `group:${chatId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const groupRecord = await this.superAdminService.getGroupRecord(chatId);

      if (groupRecord) {
        // Group exists, load its data
        const groupData = { ...groupRecord, settings: await this.getGroupSettings(groupRecord.sheetId) };
        this.cache.set(cacheKey, groupData);
        return groupData;
      } else {
        // Group doesn't exist, provision a new one
        return await this.provisionNewGroup(chatId, groupInfo);
      }
    } catch (error) {
      this.logger.error(`Failed to get/create group data for ${chatId}:`, error);
      throw error;
    }
  }

  async provisionNewGroup(chatId, groupInfo) {
    const groupName = groupInfo.name || `Group ${chatId}`;
    this.logger.info(`Starting provisioning for new group: ${groupName} (${chatId})`);

    try {
      const spreadsheet = await this.sheetsService.createSpreadsheet(
        `Finance Bot - ${groupName}`,
        SHEETS_STRUCTURE.CREATION_CONFIG
      );
      this.logger.info(`Spreadsheet created: ${spreadsheet.id}`, { chatId });

      const sheetMetadata = await this.sheetsService.getSheetInfo(spreadsheet.id);

      await this.setupSheetStructure(spreadsheet.id, sheetMetadata);
      this.logger.info(`Sheet structure configured for ${spreadsheet.id}`, { chatId });

      await this.initializeSettings(spreadsheet.id, sheetMetadata, chatId, groupInfo);
      this.logger.info(`Initial settings populated for ${spreadsheet.id}`, { chatId });

      const groupData = createGroup({
        chatId: chatId,
        name: groupName,
        sheetId: spreadsheet.id,
        ownerUserId: groupInfo.ownerUserId,
      });

      await this.superAdminService.registerGroup({
          ...groupData,
          sheetUrl: spreadsheet.url,
      });
      this.logger.info(`Group ${groupName} registered in Super Admin sheet.`, { chatId });

      const finalGroupData = { ...groupData, sheetUrl: spreadsheet.url, settings: await this.getGroupSettings(spreadsheet.id) };
      this.cache.set(`group:${chatId}`, finalGroupData);
      return finalGroupData;

    } catch (error) {
      this.logger.error(`Sheet provisioning failed for group ${chatId}:`, error);
      throw new Error(`Failed to provision sheet for group ${chatId}.`);
    }
  }

  async setupSheetStructure(spreadsheetId, sheetMetadata) {
      const requests = [];
      const structure = SHEETS_STRUCTURE.GROUP.sheets;
      const sheetTitleToId = Object.fromEntries(sheetMetadata.sheets.map(s => [s.title, s.sheetId]));

      for (const config of Object.values(structure)) {
          const sheetId = sheetTitleToId[config.name];
          if (sheetId === undefined) continue;

          // Add headers
          requests.push({
              updateCells: {
                  rows: [{ values: config.headers.map(header => ({ userEnteredValue: { stringValue: header } })) }],
                  fields: 'userEnteredValue',
                  start: { sheetId, rowIndex: 0, columnIndex: 0 },
              }
          });

          // Add default data
          if (config.defaultData) {
              requests.push({
                  updateCells: {
                      rows: config.defaultData.map(row => ({ values: row.map(cell => ({ userEnteredValue: { stringValue: String(cell) } })) })),
                      fields: 'userEnteredValue',
                      start: { sheetId, rowIndex: 1, columnIndex: 0 },
                  }
              });
          }
      }

      if(requests.length > 0) {
        await this.sheetsService.batchUpdate(spreadsheetId, requests);
      }
  }

  async initializeSettings(spreadsheetId, sheetMetadata, chatId, groupInfo) {
      const settingsSheetId = sheetMetadata.sheets.find(s => s.title === 'Settings')?.sheetId;
      if (settingsSheetId === undefined) return;

      const timestamp = new Date().toISOString();
      const settingsToUpdate = {
          group_name: groupInfo.name || `Group ${chatId}`,
          owner_user_id: groupInfo.ownerUserId || '',
          owner_username: groupInfo.ownerUsername || '',
          created_at: timestamp,
      };

      const settingsRange = SHEETS_STRUCTURE.GROUP.sheets.SETTINGS.defaultData;
      const requests = [];

      for(let i = 0; i < settingsRange.length; i++) {
          const key = settingsRange[i][0];
          if (settingsToUpdate[key]) {
              requests.push({
                  updateCells: {
                      rows: [{
                          values: [
                              { userEnteredValue: { stringValue: settingsToUpdate[key] } }, // Column B
                              { userEnteredValue: { stringValue: timestamp } },          // Column C
                              { userEnteredValue: { stringValue: 'system' } },           // Column D
                          ]
                      }],
                      fields: 'userEnteredValue',
                      start: { sheetId: settingsSheetId, rowIndex: i + 1, columnIndex: 1 },
                  }
              });
          }
      }

      if(requests.length > 0) {
        await this.sheetsService.batchUpdate(spreadsheetId, requests);
      }
  }

  async getGroupSettings(spreadsheetId) {
    const cacheKey = `settings:${spreadsheetId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    const values = await this.sheetsService.getValues(spreadsheetId, 'Settings!A2:B');
    const settings = Object.fromEntries(values.map(([key, value]) => [key, value]));
    this.cache.set(cacheKey, settings, 3600); // Cache for 1 hour
    return settings;
  }

  async updateGroupSetting(chatId, key, value, updatedBy) {
    const groupData = await this.getOrCreateGroupData(chatId);
    const spreadsheetId = groupData.sheetId;
    const timestamp = new Date().toISOString();

    const allSettings = await this.sheetsService.getValues(spreadsheetId, 'Settings!A2:A');
    const rowIndex = allSettings.findIndex(row => row[0] === key);

    if (rowIndex === -1) {
      throw new Error(`Setting key "${key}" not found.`);
    }

    const sheetRowIndex = rowIndex + 2; // +1 for 1-based index, +1 for header
    await this.sheetsService.updateValues(spreadsheetId, `Settings!B${sheetRowIndex}:D${sheetRowIndex}`, [
      [value, timestamp, updatedBy]
    ]);

    // Invalidate cache
    this.cache.delete(`group:${chatId}`);
    this.cache.delete(`settings:${spreadsheetId}`);

    return true;
  }

  // ... other methods like addTransaction, getUser, etc.
}
