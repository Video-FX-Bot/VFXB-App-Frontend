// Enhanced Error Handling Utilities
import { toast } from 'react-hot-toast';

// Error types for better categorization
export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTH_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  SERVER: 'SERVER_ERROR',
  CLIENT: 'CLIENT_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  FILE_UPLOAD: 'FILE_UPLOAD_ERROR',
  VIDEO_PROCESSING: 'VIDEO_PROCESSING_ERROR',
  AI_SERVICE: 'AI_SERVICE_ERROR'
};

// Error severity levels
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Enhanced error class
export class AppError extends Error {
  constructor(message, type = ErrorTypes.CLIENT, severity = ErrorSeverity.MEDIUM, details = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    this.url = typeof window !== 'undefined' ? window.location.href : 'Unknown';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      details: this.details,
      timestamp: this.timestamp,
      userAgent: this.userAgent,
      url: this.url,
      stack: this.stack
    };
  }
}

// Error handler class
export class ErrorHandler {
  constructor() {
    this.errorQueue = [];
    this.maxQueueSize = 50;
    this.retryAttempts = new Map();
    this.maxRetries = 3;
  }

  // Handle different types of errors
  handle(error, context = {}) {
    const appError = this.normalizeError(error, context);
    
    // Add to error queue
    this.addToQueue(appError);
    
    // Log error
    this.logError(appError);
    
    // Show user notification
    this.showUserNotification(appError);
    
    // Report to monitoring service
    this.reportError(appError);
    
    return appError;
  }

  // Normalize different error types to AppError
  normalizeError(error, context) {
    if (error instanceof AppError) {
      return error;
    }

    let type = ErrorTypes.CLIENT;
    let severity = ErrorSeverity.MEDIUM;
    let message = error.message || 'An unexpected error occurred';

    // Categorize based on error properties
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      type = ErrorTypes.NETWORK;
      severity = ErrorSeverity.HIGH;
    } else if (error.status === 401) {
      type = ErrorTypes.AUTHENTICATION;
      severity = ErrorSeverity.HIGH;
    } else if (error.status === 403) {
      type = ErrorTypes.AUTHORIZATION;
      severity = ErrorSeverity.MEDIUM;
    } else if (error.status === 404) {
      type = ErrorTypes.NOT_FOUND;
      severity = ErrorSeverity.LOW;
    } else if (error.status >= 500) {
      type = ErrorTypes.SERVER;
      severity = ErrorSeverity.HIGH;
    } else if (error.status === 429) {
      type = ErrorTypes.RATE_LIMIT;
      severity = ErrorSeverity.MEDIUM;
    } else if (error.name === 'TimeoutError') {
      type = ErrorTypes.TIMEOUT;
      severity = ErrorSeverity.MEDIUM;
    }

    return new AppError(message, type, severity, {
      originalError: error,
      context,
      status: error.status,
      code: error.code
    });
  }

  // Add error to queue with size limit
  addToQueue(error) {
    this.errorQueue.push(error);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift(); // Remove oldest error
    }
  }

  // Log error based on severity
  logError(error) {
    const logData = {
      ...error.toJSON(),
      component: error.details.context?.component,
      action: error.details.context?.action
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨 CRITICAL ERROR:', logData);
        break;
      case ErrorSeverity.HIGH:
        console.error('❌ HIGH SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️ MEDIUM SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.LOW:
        console.info('ℹ️ LOW SEVERITY ERROR:', logData);
        break;
      default:
        console.log('📝 ERROR:', logData);
    }
  }

  // Show appropriate user notification
  showUserNotification(error) {
    const userMessage = this.getUserFriendlyMessage(error);
    
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        toast.error(userMessage, {
          duration: 6000,
          position: 'top-right'
        });
        break;
      case ErrorSeverity.MEDIUM:
        toast.error(userMessage, {
          duration: 4000,
          position: 'top-right'
        });
        break;
      case ErrorSeverity.LOW:
        toast(userMessage, {
          duration: 3000,
          position: 'bottom-right'
        });
        break;
    }
  }

  // Get user-friendly error messages
  getUserFriendlyMessage(error) {
    const messageMap = {
      [ErrorTypes.NETWORK]: 'Network connection issue. Please check your internet connection.',
      [ErrorTypes.AUTHENTICATION]: 'Please log in to continue.',
      [ErrorTypes.AUTHORIZATION]: 'You don\'t have permission to perform this action.',
      [ErrorTypes.NOT_FOUND]: 'The requested resource was not found.',
      [ErrorTypes.SERVER]: 'Server error. Please try again later.',
      [ErrorTypes.TIMEOUT]: 'Request timed out. Please try again.',
      [ErrorTypes.RATE_LIMIT]: 'Too many requests. Please wait a moment before trying again.',
      [ErrorTypes.FILE_UPLOAD]: 'File upload failed. Please check the file and try again.',
      [ErrorTypes.VIDEO_PROCESSING]: 'Video processing failed. Please try with a different file.',
      [ErrorTypes.AI_SERVICE]: 'AI service is temporarily unavailable. Please try again later.',
      [ErrorTypes.VALIDATION]: 'Please check your input and try again.'
    };

    return messageMap[error.type] || error.message || 'An unexpected error occurred.';
  }

  // Report error to monitoring service
  reportError(error) {
    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production' && error.severity !== ErrorSeverity.LOW) {
      // TODO: Integrate with Sentry, LogRocket, or other monitoring service
      this.sendToMonitoringService(error);
    }
  }

  // Send error to external monitoring service
  async sendToMonitoringService(error) {
    try {
      // Example implementation - replace with actual service
      const payload = {
        ...error.toJSON(),
        environment: process.env.NODE_ENV,
        version: process.env.REACT_APP_VERSION || '1.0.0'
      };

      // In a real implementation, you would send this to your monitoring service
      console.log('Sending error to monitoring service:', payload);
      
      // Example: await fetch('/api/errors', { method: 'POST', body: JSON.stringify(payload) });
    } catch (reportingError) {
      console.error('Failed to report error to monitoring service:', reportingError);
    }
  }

  // Retry mechanism for failed operations
  async retry(operation, context = {}, maxRetries = this.maxRetries) {
    const operationId = context.operationId || `${Date.now()}-${Math.random()}`;
    let attempts = this.retryAttempts.get(operationId) || 0;

    try {
      const result = await operation();
      this.retryAttempts.delete(operationId); // Clear on success
      return result;
    } catch (error) {
      attempts++;
      this.retryAttempts.set(operationId, attempts);

      if (attempts >= maxRetries) {
        this.retryAttempts.delete(operationId);
        throw this.handle(error, { ...context, attempts, maxRetries });
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));

      return this.retry(operation, { ...context, operationId }, maxRetries);
    }
  }

  // Get error statistics
  getErrorStats() {
    const stats = {
      total: this.errorQueue.length,
      bySeverity: {},
      byType: {},
      recent: this.errorQueue.slice(-10)
    };

    this.errorQueue.forEach(error => {
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
    });

    return stats;
  }

  // Clear error queue
  clearErrors() {
    this.errorQueue = [];
    this.retryAttempts.clear();
  }
}

// Global error handler instance
export const globalErrorHandler = new ErrorHandler();

// Convenience functions
export const handleError = (error, context) => globalErrorHandler.handle(error, context);
export const retryOperation = (operation, context, maxRetries) => 
  globalErrorHandler.retry(operation, context, maxRetries);
export const getErrorStats = () => globalErrorHandler.getErrorStats();
export const clearErrors = () => globalErrorHandler.clearErrors();

// React hook for error handling
export const useErrorHandler = () => {
  const handleError = (error, context = {}) => {
    return globalErrorHandler.handle(error, context);
  };

  const retry = (operation, context = {}, maxRetries) => {
    return globalErrorHandler.retry(operation, context, maxRetries);
  };

  const stats = globalErrorHandler.getErrorStats();

  return {
    handleError,
    retry,
    stats,
    clearErrors
  };
};

// Global error event listeners
if (typeof window !== 'undefined') {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    globalErrorHandler.handle(event.reason, {
      component: 'Global',
      action: 'unhandledrejection'
    });
  });

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    globalErrorHandler.handle(event.error, {
      component: 'Global',
      action: 'error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
}