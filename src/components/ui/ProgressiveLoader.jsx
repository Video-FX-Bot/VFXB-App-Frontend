import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Progressive loader component with multiple states
 * @param {Object} props
 * @param {boolean} props.isLoading - Whether the component is loading
 * @param {string} props.loadingText - Text to show while loading
 * @param {string} props.successText - Text to show on success
 * @param {string} props.errorText - Text to show on error
 * @param {boolean} props.hasError - Whether there's an error
 * @param {boolean} props.isSuccess - Whether loading was successful
 * @param {React.ReactNode} props.children - Content to show when loaded
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.minLoadingTime - Minimum time to show loading (ms)
 * @param {boolean} props.showProgress - Whether to show progress indicator
 * @param {number} props.progress - Progress percentage (0-100)
 */
export const ProgressiveLoader = ({
  isLoading = false,
  loadingText = 'Loading...',
  successText = 'Loaded successfully',
  errorText = 'Failed to load',
  hasError = false,
  isSuccess = false,
  children,
  className,
  minLoadingTime = 500,
  showProgress = false,
  progress = 0,
  onRetry,
  ...props
}) => {
  const [showContent, setShowContent] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState(null);

  useEffect(() => {
    if (isLoading) {
      setLoadingStartTime(Date.now());
      setShowContent(false);
    } else if (!isLoading && !hasError) {
      const elapsed = loadingStartTime ? Date.now() - loadingStartTime : 0;
      const remainingTime = Math.max(0, minLoadingTime - elapsed);
      
      setTimeout(() => {
        setShowContent(true);
      }, remainingTime);
    }
  }, [isLoading, hasError, minLoadingTime, loadingStartTime]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  if (hasError) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center",
          className
        )}
        {...props}
      >
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-destructive font-medium mb-2">{errorText}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
          >
            Try Again
          </button>
        )}
      </motion.div>
    );
  }

  if (isLoading || !showContent) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center",
          className
        )}
        {...props}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="mb-4"
        >
          <Loader2 className="w-8 h-8 text-primary" />
        </motion.div>
        
        <p className="text-muted-foreground font-medium mb-4">{loadingText}</p>
        
        {showProgress && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <motion.div
                className="bg-primary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  if (isSuccess) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center",
          className
        )}
        {...props}
      >
        <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
        <p className="text-green-600 font-medium">{successText}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * Simple loading spinner component
 */
export const LoadingSpinner = ({ size = 'md', className, ...props }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={cn("inline-block", className)}
      {...props}
    >
      <Loader2 className={cn(sizeClasses[size], "text-primary")} />
    </motion.div>
  );
};

/**
 * Loading overlay component
 */
export const LoadingOverlay = ({ 
  isVisible, 
  text = 'Loading...', 
  className,
  backdrop = true,
  ...props 
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center",
            backdrop && "bg-background/80 backdrop-blur-sm",
            className
          )}
          {...props}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex flex-col items-center space-y-4 p-6 bg-card border rounded-lg shadow-lg"
          >
            <LoadingSpinner size="lg" />
            <p className="text-muted-foreground font-medium">{text}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProgressiveLoader;