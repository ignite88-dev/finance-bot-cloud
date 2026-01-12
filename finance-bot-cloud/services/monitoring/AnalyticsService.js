import { ErrorLogger } from './ErrorLogger.js';

export class AnalyticsService {
    constructor(sheetsService) {
        this.sheetsService = sheetsService;
        this.logger = new ErrorLogger();
    }

    trackEvent(eventName, userId, eventData = {}) {
        this.logger.info(`Analytics Event: ${eventName}`, {
            userId,
            ...eventData
        });
        // This could be extended to log to a dedicated analytics sheet or external service.
    }
}
