import { ErrorLogger } from './ErrorLogger.js';

let instance = null;

export class PerformanceMonitor {
  constructor() {
    if (instance) return instance;
    this.logger = new ErrorLogger();
    this.metrics = new Map();
    instance = this;
  }

  start(label) {
    this.metrics.set(label, { startTime: process.hrtime() });
  }

  end(label) {
    const metric = this.metrics.get(label);
    if (metric && metric.startTime) {
      const diff = process.hrtime(metric.startTime);
      const responseTime = (diff[0] * 1e9 + diff[1]) / 1e6; // in milliseconds
      this.logger.info(`Performance [${label}]`, { responseTimeMs: responseTime });
      this.metrics.delete(label);
      // TODO: Log this to Super Admin sheet
    }
  }

  record(label, value) {
     this.logger.info(`Metric [${label}]`, { value });
     // TODO: Log this to Super Admin sheet
  }
}
