import moment from 'moment-timezone';
import { ENV } from '../config/environment.js';

export function formatCurrency(amount, currency = 'IDR') {
    try {
        return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: currency === 'IDR' ? 0 : 2,
        }).format(amount);
    } catch (error) {
        // Fallback for invalid currency codes
        return `${currency} ${amount}`;
    }
}

export function formatDate(date, format = 'DD MMM YYYY, HH:mm') {
    return moment(date).tz(ENV.TIMEZONE || 'Asia/Jakarta').format(format);
}

export function formatTransaction(transaction) {
    return `
- **ID:** ${transaction.id}
- **Tanggal:** ${formatDate(transaction.timestamp)}
- **Jenis:** ${transaction.type}
- **Jumlah:** ${formatCurrency(transaction.amount, transaction.currency)}
- **Deskripsi:** ${transaction.description}
    `;
}
