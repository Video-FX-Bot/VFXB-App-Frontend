import winston from 'winston';
import path from 'path';
import { promises as fs } from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
try {
  await fs.mkdir(logsDir, { recursive: true });
} catch (error) {
  console.error('Failed to create logs directory:', error);
}

// Performance metrics tracking
const performanceMetrics = {
  videoProcessingTimes: [],
  apiResponseTimes: [],
  errorCounts: { total: 0, byType: {} },
  memoryUsage: []
};

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create transports array
const transports = [];

// Console transport for development
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: winston.format.simple(),
      level: 'info'
    })
  );
}

// File transports
transports.push(
  // Error logs
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // Combined logs
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // Access logs
  new winston.transports.File({
    filename: path.join(logsDir, 'access.log'),
    level: 'info',
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'vfxb-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports,
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: logFormat
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: logFormat
    })
  ],
  
  exitOnError: false
});

// Performance monitoring methods
const performanceLogger = {
  // Track video processing time
  trackVideoProcessing: (operation, duration, metadata = {}) => {
    const metric = {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    performanceMetrics.videoProcessingTimes.push(metric);
    logger.info('Video processing completed', metric);
  },
  
  // Track API response time
  trackApiResponse: (endpoint, method, duration, statusCode) => {
    const metric = {
      endpoint,
      method,
      duration,
      statusCode,
      timestamp: new Date().toISOString()
    };
    performanceMetrics.apiResponseTimes.push(metric);
    logger.info('API response tracked', metric);
  },
  
  // Track memory usage
  trackMemoryUsage: () => {
    const memUsage = process.memoryUsage();
    const metric = {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      timestamp: new Date().toISOString()
    };
    performanceMetrics.memoryUsage.push(metric);
    logger.info('Memory usage tracked', metric);
  },
  
  // Track errors
  trackError: (error, context = {}) => {
    performanceMetrics.errorCounts.total++;
    const errorType = error.name || 'UnknownError';
    performanceMetrics.errorCounts.byType[errorType] = 
      (performanceMetrics.errorCounts.byType[errorType] || 0) + 1;
    
    logger.error('Error tracked', {
      error: error.message,
      stack: error.stack,
      type: errorType,
      context,
      timestamp: new Date().toISOString()
    });
  },
  
  // Get performance summary
  getPerformanceSummary: () => {
    return {
      videoProcessing: {
        count: performanceMetrics.videoProcessingTimes.length,
        averageDuration: performanceMetrics.videoProcessingTimes.length > 0 ?
          performanceMetrics.videoProcessingTimes.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.videoProcessingTimes.length : 0
      },
      apiResponses: {
        count: performanceMetrics.apiResponseTimes.length,
        averageDuration: performanceMetrics.apiResponseTimes.length > 0 ?
          performanceMetrics.apiResponseTimes.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.apiResponseTimes.length : 0
      },
      errors: performanceMetrics.errorCounts,
      memoryUsage: performanceMetrics.memoryUsage.slice(-10) // Last 10 readings
    };
  }
};

// Periodic memory monitoring
setInterval(() => {
  performanceLogger.trackMemoryUsage();
}, 5 * 60 * 1000); // Every 5 minutes

// Add request logging middleware
logger.requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
  });
  
  next();
};

// Add security logging
logger.security = {
  loginAttempt: (email, ip, success, reason = null) => {
    logger.info('Login Attempt', {
      email,
      ip,
      success,
      reason,
      timestamp: new Date().toISOString(),
      type: 'security'
    });
  },
  
  passwordReset: (email, ip) => {
    logger.info('Password Reset Request', {
      email,
      ip,
      timestamp: new Date().toISOString(),
      type: 'security'
    });
  },
  
  accountLocked: (email, ip, attempts) => {
    logger.warn('Account Locked', {
      email,
      ip,
      attempts,
      timestamp: new Date().toISOString(),
      type: 'security'
    });
  },
  
  suspiciousActivity: (userId, activity, ip, details = {}) => {
    logger.warn('Suspicious Activity', {
      userId,
      activity,
      ip,
      details,
      timestamp: new Date().toISOString(),
      type: 'security'
    });
  },
  
  apiKeyUsage: (keyId, endpoint, ip, success) => {
    logger.info('API Key Usage', {
      keyId,
      endpoint,
      ip,
      success,
      timestamp: new Date().toISOString(),
      type: 'security'
    });
  }
};

// Add performance logging
logger.performance = {
  videoProcessing: (videoId, operation, duration, success, error = null) => {
    logger.info('Video Processing', {
      videoId,
      operation,
      duration: `${duration}ms`,
      success,
      error,
      timestamp: new Date().toISOString(),
      type: 'performance'
    });
  },
  
  aiRequest: (userId, model, tokens, duration, success, error = null) => {
    logger.info('AI Request', {
      userId,
      model,
      tokens,
      duration: `${duration}ms`,
      success,
      error,
      timestamp: new Date().toISOString(),
      type: 'performance'
    });
  },
  
  databaseQuery: (collection, operation, duration, recordCount = null) => {
    if (duration > 1000) { // Log slow queries (>1s)
      logger.warn('Slow Database Query', {
        collection,
        operation,
        duration: `${duration}ms`,
        recordCount,
        timestamp: new Date().toISOString(),
        type: 'performance'
      });
    }
  }
};

// Add business logic logging
logger.business = {
  userRegistration: (userId, email, plan) => {
    logger.info('User Registration', {
      userId,
      email,
      plan,
      timestamp: new Date().toISOString(),
      type: 'business'
    });
  },
  
  subscriptionChange: (userId, oldPlan, newPlan, reason) => {
    logger.info('Subscription Change', {
      userId,
      oldPlan,
      newPlan,
      reason,
      timestamp: new Date().toISOString(),
      type: 'business'
    });
  },
  
  videoUpload: (userId, videoId, fileSize, duration) => {
    logger.info('Video Upload', {
      userId,
      videoId,
      fileSize,
      duration,
      timestamp: new Date().toISOString(),
      type: 'business'
    });
  },
  
  aiInteraction: (userId, conversationId, intent, success) => {
    logger.info('AI Interaction', {
      userId,
      conversationId,
      intent,
      success,
      timestamp: new Date().toISOString(),
      type: 'business'
    });
  }
};

// Add error context helper
logger.errorWithContext = (error, context = {}) => {
  logger.error('Error with Context', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    context,
    timestamp: new Date().toISOString()
  });
};

// Add structured logging for different environments
if (process.env.NODE_ENV === 'production') {
  // In production, we might want to send logs to external services
  // like CloudWatch, Datadog, or ELK stack
  
  // Example: Add CloudWatch transport
  // const CloudWatchTransport = require('winston-cloudwatch');
  // logger.add(new CloudWatchTransport({
  //   logGroupName: 'vfxb-backend',
  //   logStreamName: 'application-logs',
  //   awsRegion: process.env.AWS_REGION
  // }));
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Give logger time to write before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Close logger transports
  logger.end();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Close logger transports
  logger.end();
});

export { logger, performanceLogger };