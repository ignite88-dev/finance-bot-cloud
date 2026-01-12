#!/usr/bin/env node
import 'dotenv/config';
import express from 'express';
import cluster from 'cluster';
import os from 'os';

import { ENV } from './config/environment.js';
import { TelegramBotWrapper } from './services/telegram/TelegramBotWrapper.js';
import { SheetsService } from './services/google-sheets/SheetsService.js';
import { GroupDataService } from './services/google-sheets/GroupDataService.js';
import { SuperAdminService } from './services/google-sheets/SuperAdminService.js';
import { AIOrchestrationService } from './services/ai/AIOrchestrationService.js';
import { MemoryManager } from './services/ai/MemoryManager.js';
import { ErrorLogger } from './services/monitoring/ErrorLogger.js';
import { PerformanceMonitor } from './services/monitoring/PerformanceMonitor.js';
import { AuditService } from './services/monitoring/AuditService.js';
import { rateLimiter } from './utils/rate-limiter.js';

const numCPUs = os.cpus().length;

if (cluster.isPrimary && ENV.NODE_ENV === 'production') {
  console.log(`🚀 Starting ${numCPUs} workers for Finance Bot`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  startBot();
}

async function startBot() {
  let logger;
  try {
    console.log(`📊 Worker ${process.pid} starting...`);

    const sheetsService = new SheetsService({
      credentials: {
        client_email: ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: ENV.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      superAdminSheetId: ENV.SUPER_ADMIN_SHEET_ID,
    });
    await sheetsService.initialize();
    console.log('✅ Google Sheets Service initialized');

    const superAdminService = new SuperAdminService(sheetsService);
    const groupDataService = new GroupDataService(sheetsService);

    logger = new ErrorLogger(superAdminService);
    const auditService = new AuditService(superAdminService, logger);
    const performanceMonitor = new PerformanceMonitor(logger);

    const aiService = new AIOrchestrationService({
      openaiApiKey: ENV.OPENAI_API_KEY,
      deepseekApiKey: ENV.DEEPSEEK_API_KEY,
    });
    const memoryManager = new MemoryManager(groupDataService);

    const botWrapper = new TelegramBotWrapper({
      token: ENV.TELEGRAM_TOKEN,
      webhook: ENV.TELEGRAM_WEBHOOK_URL,
      groupDataService,
      superAdminService,
      aiService,
      memoryManager,
      auditService,
      logger,
      performanceMonitor,
    });
    await botWrapper.initialize();
    console.log('✅ Telegram Bot initialized');

    if (ENV.TELEGRAM_WEBHOOK_URL) {
      const app = express();
      app.use(express.json());
      app.use(rateLimiter);

      app.get('/health', (req, res) => {
        res.json({
          status: 'healthy',
          worker: process.pid,
          timestamp: new Date().toISOString(),
        });
      });

      app.post(`/webhook/${ENV.TELEGRAM_TOKEN}`, (req, res) => {
        botWrapper.handleUpdate(req.body);
        res.sendStatus(200);
      });

      app.listen(ENV.PORT || 3000, () => {
        console.log(`🌐 Webhook server listening on port ${ENV.PORT || 3000}`);
      });
    }

    const shutdown = async () => {
      console.log(`🛑 Worker ${process.pid} shutting down...`);
      await botWrapper.shutdown();
      await sheetsService.cleanup();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    console.log(`✅ Worker ${process.pid} ready`);

  } catch (error) {
    console.error('Bot startup failed:', error);
    if (logger) {
        logger.error('Bot startup failed', { errorMessage: error.message, stackTrace: error.stack });
    }
    process.exit(1);
  }
}
