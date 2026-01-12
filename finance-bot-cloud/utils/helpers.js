import crypto from 'crypto';
import moment from 'moment-timezone';

export function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}

export function hashString(str) {
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
}

export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  return moment(date).tz('Asia/Jakarta').format(format);
}

export function parseDate(dateStr) {
  return moment.tz(dateStr, 'Asia/Jakarta').toDate();
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retry(fn, retries = 3, delayMs = 1000) {
  return async function(...args) {
    let lastError;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        if (i < retries - 1) {
          await delay(delayMs * Math.pow(2, i)); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  };
}

export function formatCurrency(amount, currency = 'IDR') {
  if (currency === 'IDR') {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  } else if (currency === 'USD') {
    return `$${amount.toFixed(2)}`;
  }
  return amount.toString();
}

export function parseAmount(text) {
  // Parse amount from text like "5 juta", "75rb", "1000", "$50"
  const lowerText = text.toLowerCase();
  
  let multiplier = 1;
  if (lowerText.includes('juta') || lowerText.includes('m')) {
    multiplier = 1000000;
  } else if (lowerText.includes('rb') || lowerText.includes('k')) {
    multiplier = 1000;
  }
  
  const numberMatch = text.match(/(\d+(?:\.\d+)?)/);
  if (!numberMatch) return null;
  
  const number = parseFloat(numberMatch[1]);
  return number * multiplier;
}

export function isValidCurrency(currency) {
  return ['IDR', 'USD'].includes(currency.toUpperCase());
}

export function calculateExchange(amount, fromCurrency, toCurrency, rate) {
  if (fromCurrency === toCurrency) return amount;
  
  if (fromCurrency === 'USD' && toCurrency === 'IDR') {
    return amount * rate;
  } else if (fromCurrency === 'IDR' && toCurrency === 'USD') {
    return amount / rate;
  }
  
  throw new Error(`Unsupported currency pair: ${fromCurrency} to ${toCurrency}`);
}

export function sanitizeText(text) {
  if (!text) return '';
  
  // Remove potentially dangerous characters
  return text
    .replace(/[<>]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .substring(0, 1000);
}

export function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function getPercentage(value, total) {
  if (total === 0) return 0;
  return (value / total) * 100;
}

export function getProgressBar(percentage, length = 20) {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}
