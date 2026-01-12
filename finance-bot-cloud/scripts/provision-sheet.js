import 'dotenv/config';
import readline from 'readline';
import { SheetsService } from '../services/google-sheets/SheetsService.js';
import { GroupDataService } from '../services/google-sheets/GroupDataService.js';
import { ENV } from '../config/environment.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function manualProvision() {
  console.log('🚀 Manual Sheet Provisioning Tool 🚀');

  const chatIdStr = await askQuestion('Enter the Telegram Chat ID: ');
  const groupName = await askQuestion('Enter the Group Name: ');
  const ownerIdStr = await askQuestion('Enter the Owner User ID: ');

  const chatId = parseInt(chatIdStr, 10);
  const ownerUserId = ownerIdStr ? parseInt(ownerIdStr, 10) : undefined;

  if (isNaN(chatId) || !groupName) {
      console.error('❌ Chat ID (must be a number) and Group Name are required.');
      rl.close();
      return;
  }

  try {
    const sheetsService = new SheetsService({
      credentials: {
        client_email: ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: ENV.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      superAdminSheetId: ENV.SUPER_ADMIN_SHEET_ID,
    });
    await sheetsService.initialize();

    const groupDataService = new GroupDataService(sheetsService);

    console.log(`Provisioning sheet for group "${groupName}" with Chat ID ${chatId}...`);

    const groupInfo = {
        name: groupName,
        ownerUserId: ownerUserId,
    };

    const result = await groupDataService.provisionNewGroup(chatId, groupInfo);

    console.log('\n✅ Provisioning Successful!');
    console.log(`Sheet URL: ${result.sheetUrl}`);

  } catch (error) {
    console.error('\n❌ Provisioning Failed:', error.message);
    console.error(error.stack);
  } finally {
    rl.close();
  }
}

manualProvision();
