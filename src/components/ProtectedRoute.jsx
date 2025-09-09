import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { motion } from 'framer-motion';
import { errorService } from '../services/errorService';

/**
 * ProtectedRoute component that handles authentication-based route protection
 * Redirects unauthenticated users to login page while preserving intended destination
 */
const ProtectedRoute = ({ children, requireAuth = true, redirectTo = '/login' }) => {
  const { isLoggedIn: isAuthenticated, user } = useAuth();
  const loading = false; // Since we're using localStorage, no async loading needed
  const location = useLocation();

  // Show loading spinner while authentication status is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Verifying authentication...</p>
        </motion.div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Log the redirect for debugging
    errorService.logError(
      new Error(`Unauthenticated access attempt to ${location.pathname}`),
      'Route Protection'
    );

    // Redirect to login with return URL
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // If authentication is not required but user is authenticated (e.g., login/signup pages)
  if (!requireAuth && isAuthenticated) {
    // Get the intended destination from location state or default to dashboard
    const from = location.state?.from || '/dashboard';
    return <Navigate to={from} replace />;
  }

  // Render the protected content
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Higher-order component for protecting routes
 * @param {React.Component} Component - The component to protect
 * @param {Object} options - Protection options
 * @returns {React.Component} Protected component
 */
export const withAuthProtection = (Component, options = {}) => {
  return function ProtectedComponent(props) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
};

/**
 * Component for routes that should only be accessible to unauthenticated users
 * (e.g., login, signup pages)
 */
export const PublicOnlyRoute = ({ children }) => {
  return (
    <ProtectedRoute requireAuth={false}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * Component for routes that require specific user roles or permissions
 */
export const RoleProtectedRoute = ({ children, requiredRoles = [], requiredPermissions = [] }) => {
  const { user, isLoggedIn: isAuthenticated } = useAuth();

  // First check if user is authenticated
  if (!isAuthenticated) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
  }

  // Check role requirements
  if (requiredRoles.length > 0) {
    const userRoles = user?.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have the required permissions to access this page.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go Back
            </button>
          </motion.div>
        </div>
      );
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const userPermissions = user?.permissions || [];
    const hasRequiredPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasRequiredPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <h2 className="text-2xl font-bold text-destructive">Insufficient Permissions</h2>
            <p className="text-muted-foreground">
              You don't have the required permissions to access this feature.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go Back
            </button>
          </motion.div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;