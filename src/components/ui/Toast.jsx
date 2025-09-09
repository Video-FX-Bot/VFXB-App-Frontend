import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

// Toast context
const ToastContext = createContext();

// Toast types
export const ToastTypes = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Toast positions
export const ToastPositions = {
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right',
  TOP_CENTER: 'top-center',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_CENTER: 'bottom-center'
};

// Individual toast component
const Toast = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case ToastTypes.SUCCESS:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case ToastTypes.ERROR:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case ToastTypes.WARNING:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case ToastTypes.INFO:
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case ToastTypes.SUCCESS:
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case ToastTypes.ERROR:
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case ToastTypes.WARNING:
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case ToastTypes.INFO:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  const getTextColor = () => {
    switch (toast.type) {
      case ToastTypes.SUCCESS:
        return 'text-green-800 dark:text-green-200';
      case ToastTypes.ERROR:
        return 'text-red-800 dark:text-red-200';
      case ToastTypes.WARNING:
        return 'text-yellow-800 dark:text-yellow-200';
      case ToastTypes.INFO:
        return 'text-blue-800 dark:text-blue-200';
      default:
        return 'text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`
        relative flex items-start p-4 mb-3 rounded-lg border shadow-lg backdrop-blur-sm
        ${getBackgroundColor()}
        max-w-sm w-full
      `}
    >
      <div className="flex-shrink-0 mr-3">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className={`text-sm font-semibold ${getTextColor()} mb-1`}>
            {toast.title}
          </h4>
        )}
        <p className={`text-sm ${getTextColor()}`}>
          {toast.message}
        </p>
        {toast.action && (
          <div className="mt-2">
            <button
              onClick={toast.action.onClick}
              className={`text-xs font-medium underline hover:no-underline ${getTextColor()}`}
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>
      
      <button
        onClick={() => onRemove(toast.id)}
        className={`flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${getTextColor()}`}
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

// Toast container component
const ToastContainer = ({ toasts, position, onRemove }) => {
  const getPositionClasses = () => {
    switch (position) {
      case ToastPositions.TOP_LEFT:
        return 'top-4 left-4';
      case ToastPositions.TOP_RIGHT:
        return 'top-4 right-4';
      case ToastPositions.TOP_CENTER:
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case ToastPositions.BOTTOM_LEFT:
        return 'bottom-4 left-4';
      case ToastPositions.BOTTOM_RIGHT:
        return 'bottom-4 right-4';
      case ToastPositions.BOTTOM_CENTER:
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <div className={`fixed z-50 ${getPositionClasses()}`}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Toast provider component
export const ToastProvider = ({ 
  children, 
  position = ToastPositions.TOP_RIGHT,
  maxToasts = 5,
  defaultDuration = 5000
}) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: ToastTypes.INFO,
      duration: defaultDuration,
      ...toast
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      return updated.slice(0, maxToasts); // Limit number of toasts
    });

    // Auto remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, [defaultDuration, maxToasts]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const updateToast = useCallback((id, updates) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  // Convenience methods
  const success = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: ToastTypes.SUCCESS });
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: ToastTypes.ERROR });
  }, [addToast]);

  const warning = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: ToastTypes.WARNING });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: ToastTypes.INFO });
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    updateToast,
    success,
    error,
    warning,
    info
  };

  // Set global reference for toast functions
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.toastProvider = {
        success,
        error,
        warning,
        info,
        addToast,
        removeToast,
        removeAllToasts
      };
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.toastProvider = null;
      }
    };
  }, [success, error, warning, info, addToast, removeToast, removeAllToasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer
        toasts={toasts}
        position={position}
        onRemove={removeToast}
      />
    </ToastContext.Provider>
  );
};

// Hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Simple toast object for compatibility with react-hot-toast
export const toast = {
  success: (message, options = {}) => {
    if (typeof window !== 'undefined' && window.toastProvider) {
      return window.toastProvider.success(message, options);
    }
    console.log('✅ Success:', message);
  },
  error: (message, options = {}) => {
    if (typeof window !== 'undefined' && window.toastProvider) {
      return window.toastProvider.error(message, options);
    }
    console.error('❌ Error:', message);
  },
  warning: (message, options = {}) => {
    if (typeof window !== 'undefined' && window.toastProvider) {
      return window.toastProvider.warning(message, options);
    }
    console.warn('⚠️ Warning:', message);
  },
  info: (message, options = {}) => {
    if (typeof window !== 'undefined' && window.toastProvider) {
      return window.toastProvider.info(message, options);
    }
    console.info('ℹ️ Info:', message);
  },
  // Default method for backward compatibility
  default: (message, options = {}) => {
    if (typeof window !== 'undefined' && window.toastProvider) {
      return window.toastProvider.info(message, options);
    }
    console.log('📝 Toast:', message);
  }
};

// Make toast callable as a function
toast.call = toast.default;
toast.apply = toast.default;

export default toast;