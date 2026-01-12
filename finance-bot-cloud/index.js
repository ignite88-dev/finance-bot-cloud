#!/usr/bin/env node
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cluster from 'cluster';
import os from 'os';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import configurations
import { ENV } from './config/environment.js';
import { SHEETS_STRUCTURE } from './config/sheets-structure.js';

// Import services
import { TelegramBotWrapper } from './services/telegram/TelegramBotWrapper.js';
import { SheetsService } from './services/google-sheets/SheetsService.js';
import { GroupDataService } from './services/google-sheets/GroupDataService.js';
import { SuperAdminService } from './services/google-sheets/SuperAdminService.js';
import { AIOrchestrationService } from './services/ai/AIOrchestrationService.js';
import { MemoryManager } from './services/ai/MemoryManager.js';
import { ErrorLogger } from './services/monitoring/ErrorLogger.js';
import { PerformanceMonitor } from './services/monitoring/PerformanceMonitor.js';
import { AuditService } from './services/monitoring/AuditService.js';

// Import utils
import { rateLimiter } from './utils/rate-limiter.js';
import { formatCurrency, formatDate } from './utils/formatters.js';
import { validateTelegramUpdate } from './utils/validators.js';

// Cluster mode for production
if (cluster.isPrimary && ENV.NODE_ENV === 'production') {
  const numCPUs = os.cpus().length;
  console.log(`🚀 Starting ${numCPUs} workers for Finance Bot`);
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
  
} else {
  // Worker process
  async function startBot() {
    const logger = new ErrorLogger();
    const performanceMonitor = new PerformanceMonitor();
    const auditService = new AuditService();
    
    try {
      console.log(`📊 Worker ${process.pid} starting...`);
      
      // Initialize Google Sheets Service
      const sheetsService = new SheetsService({
        credentials: {
          client_email: ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: ENV.GOOGLE_PRIVATE_KEY,
        },
        superAdminSheetId: ENV.SUPER_ADMIN_SHEET_ID,
      });
      
      await sheetsService.initialize();
      console.log('✅ Google Sheets Service initialized');
      
      // Initialize Group Data Service
      const groupDataService = new GroupDataService(sheetsService);
      
      // Initialize Super Admin Service
      const superAdminService = new SuperAdminService(sheetsService);
      
      // Initialize AI Service
      const aiService = new AIOrchestrationService({
        openaiApiKey: ENV.OPENAI_API_KEY,
        deepseekApiKey: ENV.DEEPSEEK_API_KEY,
        model: ENV.AI_MODEL,
        maxTokens: ENV.AI_MAX_TOKENS,
        temperature: ENV.AI_TEMPERATURE,
      });
      
      // Initialize Memory Manager
      const memoryManager = new MemoryManager(groupDataService);
      
      // Initialize Telegram Bot
      const botWrapper = new TelegramBotWrapper({
        token: ENV.TELEGRAM_TOKEN,
        webhook: ENV.TELEGRAM_WEBHOOK_URL,
        groupDataService,
        superAdminService,
        aiService,
        memoryManager,
        auditService,
      });
      
      await botWrapper.initialize();
      console.log('✅ Telegram Bot initialized');
      
      // Start health check endpoint if webhook mode
      if (ENV.TELEGRAM_WEBHOOK_URL) {
        import('express').then((express) => {
          const app = express.default();
          
          app.use(express.json());
          app.use(rateLimiter);
          
          // Health check endpoint
          app.get('/health', (req, res) => {
            res.json({
              status: 'healthy',
              worker: process.pid,
              timestamp: new Date().toISOString(),
              memory: process.memoryUsage(),
              uptime: process.uptime(),
            });
          });
          
          // Webhook endpoint
          app.post(`/webhook/${ENV.TELEGRAM_TOKEN}`, async (req, res) => {
            try {
              const update = req.body;
              await botWrapper.handleUpdate(update);
              res.sendStatus(200);
            } catch (error) {
              logger.error('Webhook error:', error);
              res.sendStatus(500);
            }
          });
          
          // Metrics endpoint
          app.get('/metrics', async (req, res) => {
            const metrics = await performanceMonitor.getMetrics();
            res.json(metrics);
          });
          
          app.listen(ENV.PORT || 3000, () => {
            console.log(`🌐 Health endpoint listening on port ${ENV.PORT || 3000}`);
          });
        });
      }
      
      // Graceful shutdown
      process.on('SIGTERM', async () => {
        console.log(`🛑 Worker ${process.pid} received SIGTERM`);
        await botWrapper.shutdown();
        await sheetsService.cleanup();
        process.exit(0);
      });
      
      process.on('SIGINT', async () => {
        console.log(`🛑 Worker ${process.pid} received SIGINT`);
        await botWrapper.shutdown();
        await sheetsService.cleanup();
        process.exit(0);
      });
      
      console.log(`✅ Worker ${process.pid} ready`);
      
    } catch (error) {
      logger.error('Bot startup failed:', error);
      process.exit(1);
    }
  }
  
  startBot();
}