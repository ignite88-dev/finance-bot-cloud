import { google } from 'googleapis';
import { promisify } from 'util';
import { setTimeout } from 'timers/promises';
import { ErrorLogger } from '../monitoring/ErrorLogger.js';
import { CacheService } from './CacheService.js';

export class SheetsService {
  constructor(config) {
    this.config = config;
    this.auth = null;
    this.sheets = null;
    this.drive = null;
    this.cache = new CacheService();
    this.logger = new ErrorLogger();
    this.rateLimit = {
      maxRequests: 60,
      interval: 60000,
      requests: [],
      queue: []
    };
  }
  
  async initialize() {
    try {
      // Authenticate with Google
      const auth = new google.auth.GoogleAuth({
        credentials: this.config.credentials,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive'
        ]
      });
      
      this.auth = await auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      
      this.logger.info('Google Sheets Service initialized');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Sheets Service:', error);
      throw error;
    }
  }
  
  async createSpreadsheet(title) {
    try {
      const response = await this.sheets.spreadsheets.create({
        resource: {
          properties: {
            title,
            locale: 'id_ID',
            timeZone: 'Asia/Jakarta',
            autoRecalc: 'ON_CHANGE'
          }
        }
      });
      
      const spreadsheetId = response.data.spreadsheetId;
      this.logger.info(`Created spreadsheet: ${spreadsheetId} - ${title}`);
      
      return {
        id: spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        title
      };
    } catch (error) {
      this.logger.error(`Failed to create spreadsheet ${title}:`, error);
      throw error;
    }
  }
  
  async batchUpdate(spreadsheetId, requests) {
    await this.checkRateLimit();
    
    try {
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests
        }
      });
      
      this.recordRequest();
      return response.data;
    } catch (error) {
      this.logger.error(`Batch update failed for ${spreadsheetId}:`, error);
      
      // Retry logic
      if (error.code === 429 || error.code === 503) {
        await setTimeout(2000);
        return this.batchUpdate(spreadsheetId, requests);
      }
      
      throw error;
    }
  }
  
  async getValues(spreadsheetId, range) {
    const cacheKey = `${spreadsheetId}:${range}`;
    const cached = await this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    await this.checkRateLimit();
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });
      
      this.recordRequest();
      const values = response.data.values || [];
      
      // Cache for 5 minutes
      await this.cache.set(cacheKey, values, 300);
      
      return values;
    } catch (error) {
      this.logger.error(`Failed to get values ${spreadsheetId}:${range}:`, error);
      throw error;
    }
  }
  
  async updateValues(spreadsheetId, range, values, valueInputOption = 'USER_ENTERED') {
    await this.checkRateLimit();
    
    try {
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption,
        resource: { values }
      });
      
      this.recordRequest();
      
      // Invalidate cache
      const cacheKey = `${spreadsheetId}:${range}`;
      await this.cache.del(cacheKey);
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update values ${spreadsheetId}:${range}:`, error);
      throw error;
    }
  }
  
  async appendValues(spreadsheetId, range, values, valueInputOption = 'USER_ENTERED') {
    await this.checkRateLimit();
    
    try {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption,
        insertDataOption: 'INSERT_ROWS',
        resource: { values }
      });
      
      this.recordRequest();
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to append values ${spreadsheetId}:${range}:`, error);
      throw error;
    }
  }
  
  async addSheet(spreadsheetId, title) {
    try {
      const request = {
        addSheet: {
          properties: {
            title,
            gridProperties: {
              rowCount: 1000,
              columnCount: 20,
              frozenRowCount: 1
            }
          }
        }
      };
      
      const response = await this.batchUpdate(spreadsheetId, [request]);
      return response.replies[0].addSheet.properties;
    } catch (error) {
      this.logger.error(`Failed to add sheet ${title} to ${spreadsheetId}:`, error);
      throw error;
    }
  }
  
  async getSheetInfo(spreadsheetId) {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false
      });
      
      return {
        title: response.data.properties.title,
        sheets: response.data.sheets.map(sheet => ({
          id: sheet.properties.sheetId,
          title: sheet.properties.title,
          rowCount: sheet.properties.gridProperties?.rowCount,
          columnCount: sheet.properties.gridProperties?.columnCount
        })),
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
      };
    } catch (error) {
      this.logger.error(`Failed to get sheet info for ${spreadsheetId}:`, error);
      throw error;
    }
  }
  
  async checkRateLimit() {
    const now = Date.now();
    const windowStart = now - this.rateLimit.interval;
    
    // Clean old requests
    this.rateLimit.requests = this.rateLimit.requests.filter(
      timestamp => timestamp > windowStart
    );
    
    // Check if we're at the limit
    if (this.rateLimit.requests.length >= this.rateLimit.maxRequests) {
      const oldestRequest = this.rateLimit.requests[0];
      const waitTime = this.rateLimit.interval - (now - oldestRequest);
      
      if (waitTime > 0) {
        await setTimeout(waitTime);
        return this.checkRateLimit();
      }
    }
  }
  
  recordRequest() {
    this.rateLimit.requests.push(Date.now());
  }
  
  async cleanup() {
    await this.cache.cleanup();
    this.logger.info('Sheets Service cleanup completed');
  }
}