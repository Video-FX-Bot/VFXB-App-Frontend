import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { tokenService } from '../services/tokenService';
import { errorService } from '../services/errorService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        refreshTokenIfNeeded();
      }, 5 * 60 * 1000); // Check every 5 minutes
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const accessToken = tokenService.getAccessToken();
      const refreshToken = tokenService.getRefreshToken();
      
      if (!accessToken && !refreshToken) {
        setUser(null);
        return;
      }
      
      // If access token is expired but refresh token exists, try to refresh
      if (tokenService.isTokenExpired(accessToken) && refreshToken) {
        try {
          await authService.refreshToken();
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          await logout();
          return;
        }
      }
      
      // Get current user
      const response = await authService.getCurrentUser();
      if (response.success) {
        setUser(response.data);
      } else {
        throw new Error('Failed to get user data');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      errorService.logError(error, { action: 'checkAuthStatus' });
      await logout();
    } finally {
      setLoading(false);
    }
  };

  const refreshTokenIfNeeded = useCallback(async () => {
    if (isRefreshing) return;
    
    const accessToken = tokenService.getAccessToken();
    const refreshToken = tokenService.getRefreshToken();
    
    if (!refreshToken) {
      await logout();
      return;
    }
    
    // Refresh if token expires in the next 5 minutes
    if (tokenService.isTokenExpired(accessToken) || tokenService.willExpireSoon(accessToken, 5 * 60 * 1000)) {
      try {
        setIsRefreshing(true);
        await authService.refreshToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        await logout();
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [isRefreshing]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.login(email, password);
      
      if (response.success && response.data.user) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      
      throw new Error('Invalid response from server');
    } catch (error) {
      const friendlyError = errorService.createUserFriendlyError(error, 'authentication');
      setError(friendlyError.message);
      errorService.logError(error, { action: 'login', email });
      return { success: false, error: friendlyError.message };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.register(userData);
      
      if (response.success && response.data.user) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      
      throw new Error('Invalid response from server');
    } catch (error) {
      const friendlyError = errorService.createUserFriendlyError(error, 'authentication');
      setError(friendlyError.message);
      errorService.logError(error, { action: 'signup', email: userData.email });
      return { success: false, error: friendlyError.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
      errorService.logError(error, { action: 'logout' });
    } finally {
      setUser(null);
      setError(null);
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.updateProfile(profileData);
      
      if (response.success && response.data) {
        setUser(response.data);
        return { success: true, user: response.data };
      }
      
      throw new Error('Failed to update profile');
    } catch (error) {
      const friendlyError = errorService.createUserFriendlyError(error, 'profile');
      setError(friendlyError.message);
      errorService.logError(error, { action: 'updateProfile' });
      return { success: false, error: friendlyError.message };
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (passwordData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.changePassword(passwordData);
      
      if (response.success) {
        return { success: true };
      }
      
      throw new Error('Failed to change password');
    } catch (error) {
      const friendlyError = errorService.createUserFriendlyError(error, 'authentication');
      setError(friendlyError.message);
      errorService.logError(error, { action: 'changePassword' });
      return { success: false, error: friendlyError.message };
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    isRefreshing,
    login,
    signup,
    logout,
    updateProfile,
    changePassword,
    clearError,
    refreshTokenIfNeeded,
    isAuthenticated: !!user && !tokenService.isTokenExpired(tokenService.getAccessToken())
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};