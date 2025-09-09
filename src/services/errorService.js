class ErrorService {
  constructor() {
    this.errorMessages = {
      // Network errors
      'NETWORK_ERROR': 'Network connection failed. Please check your internet connection.',
      'TIMEOUT_ERROR': 'Request timed out. Please try again.',
      'SERVER_ERROR': 'Server error occurred. Please try again later.',
      
      // Authentication errors
      'INVALID_CREDENTIALS': 'Invalid email or password. Please try again.',
      'TOKEN_EXPIRED': 'Your session has expired. Please log in again.',
      'UNAUTHORIZED': 'You are not authorized to perform this action.',
      'FORBIDDEN': 'Access denied. You do not have permission to access this resource.',
      
      // Validation errors
      'VALIDATION_ERROR': 'Please check your input and try again.',
      'REQUIRED_FIELD': 'This field is required.',
      'INVALID_EMAIL': 'Please enter a valid email address.',
      'INVALID_PASSWORD': 'Password must be at least 8 characters long.',
      'PASSWORD_MISMATCH': 'Passwords do not match.',
      
      // File upload errors
      'FILE_TOO_LARGE': 'File size is too large. Please choose a smaller file.',
      'INVALID_FILE_TYPE': 'Invalid file type. Please choose a supported file format.',
      'UPLOAD_FAILED': 'File upload failed. Please try again.',
      
      // Generic errors
      'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again.',
      'MAINTENANCE': 'The service is temporarily unavailable for maintenance.',
      'RATE_LIMITED': 'Too many requests. Please wait a moment and try again.'
    };
    
    this.errorLog = [];
    this.maxLogSize = 100;
  }

  /**
   * Initialize global error handling
   */
  initializeGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(event.reason, 'Unhandled Promise Rejection');
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      this.logError(event.error, 'Global Error');
    });
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    try {
      // Handle different error types
      if (typeof error === 'string') {
        return this.errorMessages[error] || error;
      }
      
      if (error?.response) {
        // HTTP response error
        const status = error.response.status;
        const data = error.response.data;
        
        if (data?.message) {
          return data.message;
        }
        
        switch (status) {
          case 400:
            return this.errorMessages.VALIDATION_ERROR;
          case 401:
            return this.errorMessages.UNAUTHORIZED;
          case 403:
            return this.errorMessages.FORBIDDEN;
          case 404:
            return 'The requested resource was not found.';
          case 429:
            return this.errorMessages.RATE_LIMITED;
          case 500:
          case 502:
          case 503:
          case 504:
            return this.errorMessages.SERVER_ERROR;
          default:
            return this.errorMessages.UNKNOWN_ERROR;
        }
      }
      
      if (error?.code) {
        switch (error.code) {
          case 'NETWORK_ERROR':
          case 'ERR_NETWORK':
            return this.errorMessages.NETWORK_ERROR;
          case 'TIMEOUT':
          case 'ECONNABORTED':
            return this.errorMessages.TIMEOUT_ERROR;
          default:
            return this.errorMessages.UNKNOWN_ERROR;
        }
      }
      
      if (error?.message) {
        return error.message;
      }
      
      return this.errorMessages.UNKNOWN_ERROR;
    } catch (e) {
      console.error('Error in getErrorMessage:', e);
      return this.errorMessages.UNKNOWN_ERROR;
    }
  }

  /**
   * Log error for debugging
   */
  logError(error, context = '') {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: error,
      context: context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.errorLog.push(errorEntry);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
    
    // Log to console in development
    if (import.meta.env.MODE === 'development') {
      console.error('Error logged:', errorEntry);
    }
  }

  /**
   * Get error log
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Handle API errors
   */
  handleApiError(error) {
    this.logError(error, 'API Error');
    return this.getErrorMessage(error);
  }

  /**
   * Handle validation errors
   */
  handleValidationError(errors) {
    if (Array.isArray(errors)) {
      return errors.map(error => this.getErrorMessage(error)).join(', ');
    }
    return this.getErrorMessage(errors);
  }

  /**
   * Show error notification
   */
  showError(error, context = '') {
    const message = this.getErrorMessage(error);
    this.logError(error, context);
    
    // You can integrate with a toast notification library here
    console.error('Error:', message);
    
    return message;
  }

  /**
   * Check if error is network related
   */
  isNetworkError(error) {
    return error?.code === 'NETWORK_ERROR' || 
           error?.code === 'ERR_NETWORK' ||
           error?.message?.includes('Network Error') ||
           !navigator.onLine;
  }

  /**
   * Check if error is authentication related
   */
  isAuthError(error) {
    return error?.response?.status === 401 ||
           error?.code === 'TOKEN_EXPIRED' ||
           error?.message?.includes('unauthorized');
  }

  /**
   * Retry logic for failed requests
   */
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        
        // Don't retry auth errors
        if (this.isAuthError(error)) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
}

// Create and export singleton instance
const errorService = new ErrorService();
export { errorService };
export default errorService;