import { USER_ROLES, COMMANDS } from '../../config/constants.js';
import { ENV } from '../../config/environment.js';
import { AuditService } from '../monitoring/AuditService.js';
import { ErrorLogger } from '../monitoring/ErrorLogger.js';
import { validateUser } from '../../utils/validators.js';
import { SuperAdminService } from '../google-sheets/SuperAdminService.js';
import { GroupDataService } from '../google-sheets/GroupDataService.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

export class CommandHandler {
  constructor(config) {
    this.config = config;
    this.groupDataService = config.groupDataService;
    this.superAdminService = config.superAdminService;
    this.auditService = new AuditService();
    this.logger = new ErrorLogger();
  }

  async handle(message, match, bot) {
    const [command, ...args] = match[1].split(' ');
    const { chat, from } = message;
    const chatId = chat.id;
    const userId = from.id;

    try {
      const userRole = await this.getUserRole(message, userId);

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

  async getUserRole(message, userId) {
    const chatId = message.chat.id;
    if (ENV.SUPER_ADMIN_IDS.includes(userId)) {
      return USER_ROLES.SUPER_ADMIN;
    }
    if (message.chat.type === 'private') {
        return USER_ROLES.USER;
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
    const chatId = message.chat.id;
    switch(command) {
        case 'super_broadcast': {
            const messageText = args.join(' ');
            if (!messageText) {
                return bot.sendMessage(chatId, '✍️ Mohon berikan pesan untuk broadcast.\nContoh: /super_broadcast Halo semua!');
            }
            const allGroups = await this.superAdminService.getAllGroups({ status: 'ACTIVE' });
            let successCount = 0;
            for (const group of allGroups) {
              try {
                await bot.sendMessage(group.chatId, `📣 **Pesan dari Admin:**\n\n${messageText}`, { parse_mode: 'Markdown' });
                successCount++;
              } catch (error) {
                this.logger.warn(`Failed to broadcast to group ${group.chatId}:`, { errorMessage: error.message });
              }
            }
            return bot.sendMessage(chatId, `✅ Pesan berhasil dikirim ke ${successCount} dari ${allGroups.length} grup aktif.`);
        }
        case 'super_stats': {
            const stats = await this.superAdminService.getSystemStatistics();
            if (!stats) {
                return bot.sendMessage(chatId, '❌ Gagal mengambil statistik sistem.');
            }
            const statsText = `
📊 **Statistik Sistem** 📊
- **Total Grup:** ${stats.totalGroups}
- **Grup Aktif:** ${stats.activeGroups}
- **Total Pengguna:** ${stats.totalUsers}
- **Total Transaksi:** ${stats.totalTransactions}
- **Total Error Tercatat:** ${stats.totalErrors}
- **Error Belum Terselesaikan:** ${stats.unresolvedErrors}
- **Audit Terakhir:** ${formatDate(stats.lastAudit)}
            `;
            return bot.sendMessage(chatId, statsText, { parse_mode: 'Markdown' });
        }
    }
  }

  async handleUserCommand(command, args, message, bot) {
    const chatId = message.chat.id;
    switch(command) {
        case 'start':
            return bot.sendMessage(chatId, 'Selamat datang di AI Finance Bot! Kirim pesan dalam bahasa natural untuk mencatat transaksi, atau gunakan /help untuk melihat daftar perintah.');
        case 'help':
            const helpText = `
🤖 **Bantuan AI Finance Bot** 🤖

Anda bisa berinteraksi dengan saya menggunakan bahasa natural, contoh:
- "Pengeluaran 50rb untuk makan siang"
- "Pemasukan 2 juta dari proyek freelance"
- "Sisa saldo berapa?"

Atau gunakan perintah berikut:
/start - Memulai bot
/help - Menampilkan pesan ini

Jika Anda adalah **Admin**, Anda juga bisa menggunakan:
/config - Melihat konfigurasi grup
/setlimit <daily|monthly> <jumlah> - Mengatur batas transaksi
            `;
            return bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
        default:
            return bot.sendMessage(chatId, `⚠️ Perintah tidak dikenal: /${command}. Gunakan /help untuk melihat daftar perintah.`);
    }
  }
}
