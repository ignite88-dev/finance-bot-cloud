import { google } from 'googleapis';
import { ErrorLogger } from '../services/monitoring/ErrorLogger.js';
import { ENV } from './environment.js';

const logger = new ErrorLogger();

let authClient = null;

async function initializeGoogleAuth() {
  if (authClient) {
    return authClient;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: ENV.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/cloud-platform',
      ],
    });

    authClient = await auth.getClient();
    logger.info('Google Authentication successful.');
    return authClient;
  } catch (error) {
    logger.error('Google Authentication failed:', error);
    throw new Error('Could not authenticate with Google. Please check your credentials.');
  }
}

export async function getGoogleAuth() {
  if (!authClient) {
    return await initializeGoogleAuth();
  }
  return authClient;
}
