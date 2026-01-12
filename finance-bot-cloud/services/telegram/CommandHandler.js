import { USER_ROLES, COMMANDS } from '../../config/constants.js';
import { ENV } from '../../config/environment.js';
import { AuditService } from '../monitoring/AuditService.js';
import { ErrorLogger } from '../monitoring/ErrorLogger.js';
import { validateUser } from '../../utils/validators.js';
import { SuperAdminService } from '../google-sheets/SuperAdminService.js';
import { GroupDataService } from '../google-sheets/GroupDataService.js';
import { formatCurrency } from '../../utils/formatters.js';

export class CommandHandler {
  constructor(config) {
    this.config = config;
    this.groupDataService = config.groupDataService || new GroupDataService(config.sheetsService);
    this.superAdminService = config.superAdminService || new SuperAdminService(config.sheetsService);
    this.auditService = new AuditService();
    this.logger = new ErrorLogger();
  }

  async handle(message, match, bot) {
    const [command, ...args] = match[1].split(' ');
    const { chat, from } = message;
    const chatId = chat.id;
    const userId = from.id;

    try {
      const userRole = await this.getUserRole(chatId, userId);

      const isSuperAdminCommand = COMMANDS.SUPER_ADMIN.includes(command);
      const isAdminCommand = COMMANDS.ADMIN.includes(command);

      if (isSuperAdminCommand) {
        if (userRole !== USER_ROLES.SUPER_ADMIN) {
          return bot.sendMessage(chatId, '⛔ Perintah ini hanya untuk Super Admin.');
        }
        await this.handleSuperAdminCommand(command, args, message, bot);
      } else if (isAdminCommand) {
        if (userRole !== USER_ROLES.SUPER_ADMIN && userRole !== USER_ROLES.ADMIN) {
          return bot.sendMessage(chatId, '⛔ Perintah ini hanya untuk Admin.');
        }
        await this.handleAdminCommand(command, args, message, bot);
      } else {
        await this.handleUserCommand(command, args, message, bot);
      }

      this.auditService.log(userId, `executed command: /${command}`, { chatId, args });

    } catch (error) {
      this.logger.error(`Command /${command} failed:`, {
          errorMessage: error.message,
          stackTrace: error.stack,
          chatId,
          userId,
      });
      bot.sendMessage(chatId, `❌ Gagal mengeksekusi perintah /${command}.`);
    }
  }

  async getUserRole(chatId, userId) {
    if (ENV.SUPER_ADMIN_IDS.includes(userId)) {
      return USER_ROLES.SUPER_ADMIN;
    }
    const user = await this.groupDataService.getUser(chatId, userId);
    if (validateUser(user) && user.isAdmin) {
      return USER_ROLES.ADMIN;
    }
    return USER_ROLES.USER;
  }

  async handleAdminCommand(command, args, message, bot) {
     const chatId = message.chat.id;
     const username = message.from.username || message.from.first_name;

     switch(command) {
        case 'config': {
            const groupData = await this.groupDataService.getOrCreateGroupData(chatId);
            const settings = groupData.settings;
            const configText = `
⚙️ **Konfigurasi Grup Saat Ini** ⚙️
- **Nama Grup:** ${settings.group_name}
- **Mata Uang Utama:** ${settings.currency}
- **Batas Harian:** ${formatCurrency(parseFloat(settings.daily_limit), 'USD')}
- **Batas Bulanan:** ${formatCurrency(parseFloat(settings.monthly_limit), 'USD')}
- **Timezone:** ${settings.timezone}
            `;
            return bot.sendMessage(chatId, configText, { parse_mode: 'Markdown' });
        }
        case 'setlimit': {
            const [type, value] = args;
            if (!type || !value || isNaN(parseFloat(value))) {
                return bot.sendMessage(chatId, 'Penggunaan: /setlimit <daily|monthly> <jumlah>');
            }

            const key = `${type}_limit`;
            if (key !== 'daily_limit' && key !== 'monthly_limit') {
                return bot.sendMessage(chatId, 'Tipe limit tidak valid. Gunakan "daily" atau "monthly".');
            }

            await this.groupDataService.updateGroupSetting(chatId, key, value, username);
            return bot.sendMessage(chatId, `✅ Batas ${type} berhasil diubah menjadi ${formatCurrency(parseFloat(value), 'USD')}.`);
        }
     }
  }

  async handleSuperAdminCommand(command, args, message, bot) {
    // ... (Super Admin command logic remains the same)
  }

  async handleUserCommand(command, args, message, bot) {
    // ... (User command logic remains the same)
  }
}
