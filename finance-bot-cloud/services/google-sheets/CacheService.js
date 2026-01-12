import Redis from 'ioredis';
import { ENV } from '../../config/environment.js';
import { ErrorLogger } from '../monitoring/ErrorLogger.js';

let instance = null;

export class CacheService {
  constructor() {
    if (instance) {
      return instance;
    }

    this.logger = new ErrorLogger();
    try {
      this.redis = new Redis(ENV.REDIS_URL, {
        password: ENV.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      this.redis.on('connect', () => this.logger.info('Redis connected'));
      this.redis.on('ready', () => this.logger.info('Redis ready'));
      this.redis.on('error', (err) => this.logger.error('Redis error:', err));

      instance = this;
    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
      this.redis = null;
    }
  }

  async get(key) {
    if (!this.redis) return null;
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Failed to get from cache (key: ${key}):`, error);
      return null;
    }
  }

  async set(key, value, ttl) {
    if (!this.redis) return false;
    try {
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await this.redis.set(key, stringValue, 'EX', ttl);
      } else {
        await this.redis.set(key, stringValue);
      }
      return true;
    } catch (error) {
      this.logger.error(`Failed to set to cache (key: ${key}):`, error);
      return false;
    }
  }

  async del(key) {
    if (!this.redis) return false;
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete from cache (key: ${key}):`, error);
      return false;
    }
  }

  async mget(keys) {
    if (!this.redis) return null;
    try {
      const data = await this.redis.mget(keys);
      return data.map(item => item ? JSON.parse(item) : null);
    } catch (error) {
      this.logger.error(`Failed to mget from cache (keys: ${keys.join(',')}):`, error);
      return null;
    }
  }

  async mset(pairs, ttl) {
    if (!this.redis) return false;
    try {
      const pipeline = this.redis.pipeline();
      for (const [key, value] of pairs) {
        const stringValue = JSON.stringify(value);
        if (ttl) {
          pipeline.set(key, stringValue, 'EX', ttl);
        } else {
          pipeline.set(key, stringValue);
        }
      }
      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.error('Failed to mset to cache:', error);
      return false;
    }
  }

  async cleanup() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.info('Redis connection closed.');
    }
  }
}
