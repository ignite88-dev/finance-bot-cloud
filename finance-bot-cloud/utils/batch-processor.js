import { ErrorLogger } from '../services/monitoring/ErrorLogger.js';

const BATCH_SIZE = 500; // Google Sheets API limit for batch updates
const BATCH_INTERVAL = 1500; // Time in ms to wait before sending a batch

export class BatchProcessor {
    constructor(sheetsService, spreadsheetId) {
        this.sheetsService = sheetsService;
        this.spreadsheetId = spreadsheetId;
        this.queue = [];
        this.isProcessing = false;
        this.logger = new ErrorLogger();
    }

    addToQueue(request) {
        this.queue.push(request);
        if (!this.isProcessing) {
            this.startProcessing();
        }
    }

    startProcessing() {
        this.isProcessing = true;
        setTimeout(async () => {
            await this.processQueue();
            this.isProcessing = false;
            if (this.queue.length > 0) {
                this.startProcessing();
            }
        }, BATCH_INTERVAL);
    }

    async processQueue() {
        if (this.queue.length === 0) return;

        const batch = this.queue.splice(0, BATCH_SIZE);

        try {
            this.logger.info(`Processing batch of ${batch.length} requests.`);
            await this.sheetsService.batchUpdate(this.spreadsheetId, batch);
        } catch (error) {
            this.logger.error('Batch processing failed:', {
                errorMessage: error.message,
                spreadsheetId: this.spreadsheetId,
                batchSize: batch.length,
            });
            // Optional: Add failed requests back to the queue for retry
        }
    }
}
