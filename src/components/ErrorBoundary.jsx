import React from 'react';
import { errorService } from '../services/errorService';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    const errorId = Date.now().toString();
    
    errorService.logError(error, {
      component: this.props.name || 'Unknown',
      errorId,
      errorInfo,
      props: this.props.logProps ? this.props : undefined
    });

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });

    // Call optional retry callback
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {this.props.title || 'Something went wrong'}
                </h2>
                <p className="text-gray-600 mb-6">
                  {this.props.message || 'An unexpected error occurred. Please try again.'}
                </p>
                
                {/* Error details in development */}
                {import.meta.env.MODE === 'development' && this.state.error && (
                  <div className="mb-6 p-4 bg-red-50 rounded-md text-left">
                    <h3 className="text-sm font-medium text-red-800 mb-2">Error Details:</h3>
                    <p className="text-xs text-red-700 font-mono break-all">
                      {this.state.error.message}
                    </p>
                    {this.state.errorInfo?.componentStack && (
                      <details className="mt-2">
                        <summary className="text-xs text-red-700 cursor-pointer">Component Stack</summary>
                        <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
                
                {/* Error ID for support */}
                {this.state.errorId && (
                  <p className="text-xs text-gray-500 mb-6">
                    Error ID: {this.state.errorId}
                  </p>
                )}
                
                {/* Action buttons */}
                <div className="space-y-3">
                  <button
                    onClick={this.handleRetry}
                    className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </button>
                  
                  <button
                    onClick={this.handleGoHome}
                    className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </button>
                  
                  <button
                    onClick={this.handleReload}
                    className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload Page
                  </button>
                </div>
                
                {/* Support contact */}
                {this.props.showSupport !== false && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      If this problem persists, please contact support with the error ID above.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for functional components
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error boundary in functional components
export function useErrorHandler() {
  return (error, errorInfo) => {
    // This will be caught by the nearest error boundary
    throw error;
  };
}

// Async error boundary for handling promise rejections
export class AsyncErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    errorService.logError(error, {
      component: 'AsyncErrorBoundary',
      errorInfo,
      async: true
    });
  }

  componentDidMount() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  handlePromiseRejection = (event) => {
    errorService.logError(event.reason, {
      component: 'AsyncErrorBoundary',
      type: 'unhandled_promise_rejection'
    });
    
    // Optionally prevent default browser behavior
    if (this.props.preventDefault) {
      event.preventDefault();
    }
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">An async error occurred. Please refresh the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Error boundary for specific features
export function FeatureErrorBoundary({ children, feature, fallback }) {
  return (
    <ErrorBoundary
      name={`${feature}ErrorBoundary`}
      title={`${feature} Error`}
      message={`There was an error loading ${feature}. Please try again.`}
      fallback={fallback}
    >
      {children}
    </ErrorBoundary>
  );
}

// Network error boundary
export function NetworkErrorBoundary({ children, onNetworkError }) {
  return (
    <ErrorBoundary
      name="NetworkErrorBoundary"
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection."
      onError={(error) => {
        if (error.code === 'NETWORK_ERROR' || error.message.includes('network')) {
          onNetworkError?.(error);
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;