export class KeyboardManager {

  /**
   * @param {'super_admin' | 'admin' | 'user'} userRole
   * @returns {import('node-telegram-bot-api').ReplyKeyboardMarkup}
   */
  getMainKeyboard(userRole) {
    const buttons = [
      [{ text: '📊 Laporan' }, { text: '📈 Statistik' }],
      [{ text: '⚙️ Pengaturan' }],
    ];

    if (userRole === 'admin' || userRole === 'super_admin') {
      buttons.push([{ text: '🛠️ Panel Admin' }]);
    }

    return {
      keyboard: buttons,
      resize_keyboard: true,
      one_time_keyboard: false,
    };
  }

  /**
   * @returns {import('node-telegram-bot-api').InlineKeyboardMarkup}
   */
  getSettingsKeyboard() {
    return {
      inline_keyboard: [
        [{ text: 'Ubah Batas Harian', callback_data: 'settings:daily_limit' }],
        [{ text: 'Ubah Mata Uang', callback_data: 'settings:currency' }],
        [{ text: 'Kembali', callback_data: 'main_menu' }],
      ],
    };
  }

  /**
   * @param {string} action
   * @param {string} actionId
   * @returns {import('node-telegram-bot-api').InlineKeyboardMarkup}
   */
  getConfirmationKeyboard(action, actionId) {
    return {
      inline_keyboard: [
        [
          { text: '✅ Konfirmasi', callback_data: `confirm:${action}:${actionId}` },
          { text: '❌ Batal', callback_data: `cancel:${actionId}` },
        ],
      ],
    };
  }

  /**
   * @returns {import('node-telegram-bot-api').InlineKeyboardMarkup}
   */
  getAdminKeyboard() {
    return {
      inline_keyboard: [
        [{ text: 'Broadcast Pesan', callback_data: 'admin:broadcast' }],
        [{ text: 'Lihat Log Error', callback_data: 'admin:view_errors' }],
      ],
    };
  }
}
