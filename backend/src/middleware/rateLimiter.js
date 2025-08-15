import { RateLimiterMemory } from 'rate-limiter-flexible';
import { logger } from '../utils/logger.js';

// General rate limiter for all requests
const generalLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'development' ? 1000 : 100), // Number of requests
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || (process.env.NODE_ENV === 'development' ? 60 : 900), // Per minute in dev, 15 minutes in prod
});

// Strict rate limiter for auth endpoints
const authLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 5, // 5 attempts
  duration: 900, // Per 15 minutes
  blockDuration: 900, // Block for 15 minutes
});

// API rate limiter for authenticated requests
const apiLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.user?.id || req.ip,
  points: 1000, // 1000 requests
  duration: 3600, // Per hour
});

// File upload rate limiter
const uploadLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.user?.id || req.ip,
  points: 10, // 10 uploads
  duration: 3600, // Per hour
});

// AI processing rate limiter
const aiLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.user?.id || req.ip,
  points: 50, // 50 AI requests
  duration: 3600, // Per hour
});

// General rate limiting middleware
export const rateLimiter = async (req, res, next) => {
  try {
    // Skip rate limiting for localhost in development
    if (process.env.NODE_ENV === 'development' && 
        (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1')) {
      return next();
    }
    
    await generalLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      retryAfter: secs
    });
  }
};

// Auth rate limiting middleware
export const authRateLimiter = async (req, res, next) => {
  try {
    await authLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later',
      retryAfter: secs
    });
  }
};

// API rate limiting middleware
export const apiRateLimiter = async (req, res, next) => {
  try {
    await apiLimiter.consume(req.user?.id || req.ip);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    
    logger.warn(`API rate limit exceeded for user: ${req.user?.id || req.ip}`);
    
    res.status(429).json({
      success: false,
      message: 'API rate limit exceeded, please try again later',
      retryAfter: secs
    });
  }
};

// Upload rate limiting middleware
export const uploadRateLimiter = async (req, res, next) => {
  try {
    await uploadLimiter.consume(req.user?.id || req.ip);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    
    logger.warn(`Upload rate limit exceeded for user: ${req.user?.id || req.ip}`);
    
    res.status(429).json({
      success: false,
      message: 'Upload rate limit exceeded, please try again later',
      retryAfter: secs
    });
  }
};

// AI processing rate limiting middleware
export const aiRateLimiter = async (req, res, next) => {
  try {
    await aiLimiter.consume(req.user?.id || req.ip);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    
    logger.warn(`AI rate limit exceeded for user: ${req.user?.id || req.ip}`);
    
    res.status(429).json({
      success: false,
      message: 'AI processing rate limit exceeded, please try again later',
      retryAfter: secs
    });
  }
};

// Reset rate limits for a specific key (admin function)
export const resetRateLimit = async (key, limiterType = 'general') => {
  try {
    let limiter;
    switch (limiterType) {
      case 'auth':
        limiter = authLimiter;
        break;
      case 'api':
        limiter = apiLimiter;
        break;
      case 'upload':
        limiter = uploadLimiter;
        break;
      case 'ai':
        limiter = aiLimiter;
        break;
      default:
        limiter = generalLimiter;
    }
    
    await limiter.delete(key);
    logger.info(`Rate limit reset for key: ${key}, type: ${limiterType}`);
    return true;
  } catch (error) {
    logger.error('Error resetting rate limit:', error);
    return false;
  }
};

// Get rate limit info for a key
export const getRateLimitInfo = async (key, limiterType = 'general') => {
  try {
    let limiter;
    switch (limiterType) {
      case 'auth':
        limiter = authLimiter;
        break;
      case 'api':
        limiter = apiLimiter;
        break;
      case 'upload':
        limiter = uploadLimiter;
        break;
      case 'ai':
        limiter = aiLimiter;
        break;
      default:
        limiter = generalLimiter;
    }
    
    const res = await limiter.get(key);
    return {
      remainingPoints: res ? res.remainingPoints : limiter.points,
      msBeforeNext: res ? res.msBeforeNext : 0,
      totalHits: res ? res.totalHits : 0
    };
  } catch (error) {
    logger.error('Error getting rate limit info:', error);
    return null;
  }
};