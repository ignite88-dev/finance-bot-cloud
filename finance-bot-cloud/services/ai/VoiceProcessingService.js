import { SpeechClient } from '@google-cloud/speech';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import axios from 'axios';
import { ENV } from '../../config/environment.js';
import { ErrorLogger } from '../monitoring/ErrorLogger.js';

export class VoiceProcessingService {
  constructor() {
    this.logger = new ErrorLogger();
    this.primaryProvider = ENV.VOICE_PROVIDER || 'whisper';

    if (ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL && ENV.GOOGLE_PRIVATE_KEY) {
        this.googleSpeech = new SpeechClient({
            credentials: {
                client_email: ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: ENV.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }
        });
    }

    if (ENV.OPENAI_API_KEY) {
        this.openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });
    }
  }

  async processVoiceMessage(fileUrl, fileType = 'ogg', language = 'id') {
    const languageCode = language === 'id' ? 'id-ID' : 'en-US';

    try {
        if (this.primaryProvider === 'whisper' && this.openai) {
            return await this.processWithWhisper(fileUrl, fileType, language);
        } else if (this.googleSpeech) {
            return await this.processWithGoogle(fileUrl, fileType, languageCode);
        }
        throw new Error('No voice processing provider configured.');
    } catch (error) {
        this.logger.warn(`Primary voice provider (${this.primaryProvider}) failed. Trying fallback.`, { errorMessage: error.message });
        try {
            if (this.primaryProvider === 'whisper' && this.googleSpeech) {
                return await this.processWithGoogle(fileUrl, fileType, languageCode);
            } else if (this.openai) {
                return await this.processWithWhisper(fileUrl, fileType, language);
            }
            throw new Error('Fallback voice provider also failed or is not configured.');
        } catch (fallbackError) {
            this.logger.error('All voice processing providers failed.', { errorMessage: fallbackError.message });
            throw new Error('Failed to process voice message.');
        }
    }
  }

  async downloadAudio(fileUrl) {
    const response = await axios({
        method: 'get',
        url: fileUrl,
        responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
  }

  async processWithWhisper(fileUrl, fileType, language) {
    const audioBuffer = await this.downloadAudio(fileUrl);
    const audioFile = await toFile(audioBuffer, `audio.${fileType}`);

    const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: language.toUpperCase(),
    });

    return transcription.text;
  }

  async processWithGoogle(fileUrl, fileType, languageCode) {
    const audioBytes = (await this.downloadAudio(fileUrl)).toString('base64');

    const audio = {
      content: audioBytes,
    };
    const config = {
      encoding: 'OGG_OPUS',
      sampleRateHertz: 16000,
      languageCode: languageCode,
    };
    const request = {
      audio: audio,
      config: config,
    };

    const [response] = await this.googleSpeech.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    return transcription;
  }
}
