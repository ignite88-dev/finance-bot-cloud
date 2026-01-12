import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const rateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate_limit:'
  }),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export class UserRateLimiter {
  constructor() {
    this.userLimits = new Map();
    this.windowMs = 60000; // 1 minute
    this.maxRequests = 30; // 30 requests per minute per user
  }
  
  check(userId) {
    const now = Date.now();
    const userData = this.userLimits.get(userId) || { requests: [], firstRequest: now };
    
    // Clean old requests
    const windowStart = now - this.windowMs;
    userData.requests = userData.requests.filter(time => time > windowStart);
    
    // Check limit
    if (userData.requests.length >= this.maxRequests) {
      const oldestRequest = userData.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      return {
        allowed: false,
        waitTime: Math.ceil(waitTime / 1000)
      };
    }
    
    // Add new request
    userData.requests.push(now);
    this.userLimits.set(userId, userData);
    
    return { allowed: true };
  }
  
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [userId, userData] of this.userLimits.entries()) {
      userData.requests = userData.requests.filter(time => time > windowStart);
      
      if (userData.requests.length === 0 && now - userData.firstRequest > this.windowMs) {
        this.userLimits.delete(userId);
      }
    }
  }
}

export const userRateLimiter = new UserRateLimiter();

// Cleanup every minute
setInterval(() => {
  userRateLimiter.cleanup();
}, 60000);