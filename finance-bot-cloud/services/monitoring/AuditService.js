let instance = null;

export class AuditService {
    constructor(superAdminService, logger) {
        if (instance) return instance;
        this.superAdminService = superAdminService;
        this.logger = logger;
        this.queue = [];

        if (!superAdminService) {
          console.error('AuditService initialized without SuperAdminService. Audits will not be logged to sheet.');
        } else {
            this.processQueue();
        }
        instance = this;
    }

    log(userId, action, details = {}) {
        const auditEntry = {
            timestamp: new Date().toISOString(),
            userId,
            action,
            ...details,
        };

        if (!this.superAdminService) {
            this.queue.push(auditEntry);
        } else {
            this.logToSheet(auditEntry);
        }
    }

    async logToSheet(auditEntry) {
        try {
            await this.superAdminService.logAudit(auditEntry);
        } catch (error) {
            this.logger.error('Failed to log audit to sheet:', { errorMessage: error.message });
        }
    }

    async processQueue() {
        while(this.queue.length > 0) {
            const auditEntry = this.queue.shift();
            await this.logToSheet(auditEntry);
        }
    }
}
