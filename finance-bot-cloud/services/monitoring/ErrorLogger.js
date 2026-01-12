let instance = null;

export class ErrorLogger {
  constructor(superAdminService) {
    if (instance) {
      return instance;
    }

    this.superAdminService = superAdminService;
    this.queue = [];

    if (!superAdminService) {
      console.error('ErrorLogger initialized without SuperAdminService. Logging to console only.');
    } else {
        this.processQueue();
    }
    instance = this;
  }

  log(level, message, data = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...data,
    };

    console.log(JSON.stringify(logEntry, null, 2));

    if (this.superAdminService && (level === 'error' || level === 'warn')) {
        this.logToSheet(logEntry);
    }
  }

  error(message, error) {
      this.log('error', message, {
          errorMessage: error.message,
          stackTrace: error.stack,
          ...(error.data || {}),
      });
  }

  warn(message, data) {
      this.log('warn', message, data);
  }

  info(message, data) {
      this.log('info', message, data);
  }

  debug(message, data) {
      this.log('debug', message, data);
  }

  async logToSheet(logEntry) {
    if (!this.superAdminService) {
        this.queue.push(logEntry);
        return;
    }

    try {
        await this.superAdminService.logError({
            errorType: logEntry.level,
            errorMessage: logEntry.message,
            stackTrace: logEntry.stackTrace || '',
            ...logEntry,
        });
    } catch (error) {
        console.error('Failed to log error to sheet:', error);
    }
  }

  async processQueue() {
      while(this.queue.length > 0) {
          const logEntry = this.queue.shift();
          await this.logToSheet(logEntry);
      }
  }
}
