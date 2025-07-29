import React from 'react';
import { motion } from 'framer-motion';

const Loading = ({
  size = 'md',
  variant = 'spinner',
  text,
  className = ''
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };
  
  const Spinner = () => (
    <div className={`${sizes[size]} ${className}`}>
      <svg className="animate-spin w-full h-full" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
  
  const Dots = () => (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-primary-600 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  );
  
  const Pulse = () => (
    <motion.div
      className={`bg-primary-600 rounded-full ${sizes[size]} ${className}`}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.7, 1, 0.7]
      }}
      transition={{
        duration: 1,
        repeat: Infinity
      }}
    />
  );
  
  const renderVariant = () => {
    switch (variant) {
      case 'dots':
        return <Dots />;
      case 'pulse':
        return <Pulse />;
      default:
        return <Spinner />;
    }
  };
  
  if (text) {
    return (
      <div className="flex flex-col items-center space-y-3">
        {renderVariant()}
        <p className="text-sm text-gray-600">{text}</p>
      </div>
    );
  }
  
  return renderVariant();
};

// Full page loading overlay
export const LoadingOverlay = ({ isLoading, text = 'Loading...' }) => {
  if (!isLoading) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50"
    >
      <Loading size="lg" text={text} />
    </motion.div>
  );
};

export default Loading;