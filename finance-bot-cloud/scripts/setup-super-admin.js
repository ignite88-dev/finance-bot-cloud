#!/usr/bin/env node
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SheetsService } from '../services/google-sheets/SheetsService.js';
import { SuperAdminService } from '../services/google-sheets/SuperAdminService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupSuperAdmin() {
  console.log('🚀 Setting up Super Admin System...\n');
  
  try {
    // Initialize Sheets Service
    const sheetsService = new SheetsService({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }
    });
    
    await sheetsService.initialize();
    console.log('✅ Google Sheets Service connected');
    
    // Initialize Super Admin Service
    const superAdminService = new SuperAdminService(sheetsService);
    
    // Create or get Super Admin sheet
    const superAdminSheet = await superAdminService.initializeSuperAdminSheet();
    
    console.log('\n📊 SUPER ADMIN SHEET CREATED:');
    console.log('──────────────────────────────');
    console.log(`Sheet ID: ${superAdminSheet.id}`);
    console.log(`URL: https://docs.google.com/spreadsheets/d/${superAdminSheet.id}`);
    console.log(`Environment Variable: GOOGLE_SHEETS_SUPER_ADMIN_ID=${superAdminSheet.id}`);
    console.log('\n📋 Sheets created:');
    console.log('• Groups - Master list of all groups');
    console.log('• Error Logs - System error tracking');
    console.log('• Audit Logs - User action auditing');
    console.log('• Performance - System performance metrics');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Add the Sheet ID to your .env file:');
    console.log(`   GOOGLE_SHEETS_SUPER_ADMIN_ID=${superAdminSheet.id}`);
    console.log('2. Configure Super Admin Telegram IDs in .env:');
    console.log('   SUPER_ADMIN_IDS=123456789,987654321');
    console.log('3. Restart the bot to apply changes');
    
    console.log('\n✅ Setup completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

setupSuperAdmin();