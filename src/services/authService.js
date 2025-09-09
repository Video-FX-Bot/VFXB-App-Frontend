import { tokenService } from './tokenService';
import { errorService } from './errorService';
import apiService from './apiService';

class AuthService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    this.endpoints = {
      login: '/auth/login',
      register: '/auth/register',
      logout: '/auth/logout',
      refresh: '/auth/refresh',
      validate: '/auth/validate',
      profile: '/auth/profile'
    };
  }

  /**
   * Login user with credentials
   */
  async login(credentials) {
    try {
      // Validate input
      const emailErrors = errorService.validateInput(credentials.email, {
        required: true,
        email: true
      });
      
      const passwordErrors = errorService.validateInput(credentials.password, {
        required: true,
        minLength: 6
      });
      
      if (emailErrors.length > 0 || passwordErrors.length > 0) {
        throw new Error([...emailErrors, ...passwordErrors].join(' '));
      }

      // Sanitize input
      const sanitizedCredentials = {
        email: errorService.sanitizeInput(credentials.email.trim().toLowerCase()),
        password: credentials.password // Don't sanitize password as it may contain special chars
      };

      const response = await apiService.post(this.endpoints.login, sanitizedCredentials);
      
      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;
        
        // Store tokens securely
        tokenService.setTokens({ accessToken, refreshToken });
        
        return {
          success: true,
          user,
          accessToken,
          refreshToken
        };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      errorService.logError(error, { action: 'login', email: credentials.email });
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(userData) {
    try {
      // Validate input
      const emailErrors = errorService.validateInput(userData.email, {
        required: true,
        email: true
      });
      
      const passwordErrors = errorService.validateInput(userData.password, {
        required: true,
        password: true,
        passwordStrong: true
      });
      
      const nameErrors = errorService.validateInput(userData.name, {
        required: true,
        minLength: 2,
        maxLength: 50
      });
      
      if (emailErrors.length > 0 || passwordErrors.length > 0 || nameErrors.length > 0) {
        throw new Error([...emailErrors, ...passwordErrors, ...nameErrors].join(' '));
      }
      
      // Check password confirmation
      if (userData.password !== userData.confirmPassword) {
        throw new Error(errorService.errorMessages.PASSWORD_MISMATCH);
      }

      // Sanitize input
      const sanitizedData = {
        name: errorService.sanitizeInput(userData.name.trim()),
        email: errorService.sanitizeInput(userData.email.trim().toLowerCase()),
        password: userData.password
      };

      const response = await apiService.post(this.endpoints.register, sanitizedData);
      
      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;
        
        // Store tokens securely
        tokenService.setTokens({ accessToken, refreshToken });
        
        return {
          success: true,
          user,
          accessToken,
          refreshToken
        };
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      errorService.logError(error, { action: 'register', email: userData.email });
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      const refreshToken = tokenService.getRefreshToken();
      
      if (refreshToken) {
        // Notify server about logout
        try {
          await apiService.post(this.endpoints.logout, { refreshToken });
        } catch (error) {
          // Log but don't throw - logout should always succeed locally
          console.warn('Server logout failed:', error);
        }
      }
      
      // Clear tokens locally
      tokenService.clearTokens();
      
      return { success: true };
    } catch (error) {
      errorService.logError(error, { action: 'logout' });
      // Always clear tokens even if server request fails
      tokenService.clearTokens();
      return { success: true };
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new Error('No refresh token provided');
      }

      const response = await apiService.post(this.endpoints.refresh, {
        refreshToken
      });
      
      if (response.success && response.data) {
        const { user, accessToken, refreshToken: newRefreshToken } = response.data;
        
        return {
          success: true,
          user,
          accessToken,
          refreshToken: newRefreshToken
        };
      } else {
        throw new Error(response.message || 'Token refresh failed');
      }
    } catch (error) {
      errorService.logError(error, { action: 'refresh_token' });
      throw error;
    }
  }

  /**
   * Validate current token with server
   */
  async validateToken() {
    try {
      const token = tokenService.getAccessToken();
      
      if (!token || tokenService.isTokenExpired(token)) {
        return null;
      }

      const response = await apiService.get(this.endpoints.validate);
      
      if (response.success && response.data) {
        return response.data.user;
      } else {
        return null;
      }
    } catch (error) {
      errorService.logError(error, { action: 'validate_token' });
      return null;
    }
  }

  /**
   * Get current user profile
   */
  async getProfile() {
    try {
      const response = await apiService.get(this.endpoints.profile);
      
      if (response.success && response.data) {
        return response.data.user;
      } else {
        throw new Error(response.message || 'Failed to get profile');
      }
    } catch (error) {
      errorService.logError(error, { action: 'get_profile' });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData) {
    try {
      // Validate input
      const nameErrors = errorService.validateInput(profileData.name, {
        required: true,
        minLength: 2,
        maxLength: 50
      });
      
      if (nameErrors.length > 0) {
        throw new Error(nameErrors.join(' '));
      }

      // Sanitize input
      const sanitizedData = {
        name: errorService.sanitizeInput(profileData.name.trim()),
        bio: profileData.bio ? errorService.sanitizeInput(profileData.bio.trim()) : undefined
      };

      const response = await apiService.put(this.endpoints.profile, sanitizedData);
      
      if (response.success && response.data) {
        return response.data.user;
      } else {
        throw new Error(response.message || 'Profile update failed');
      }
    } catch (error) {
      errorService.logError(error, { action: 'update_profile' });
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(passwordData) {
    try {
      // Validate input
      const currentPasswordErrors = errorService.validateInput(passwordData.currentPassword, {
        required: true
      });
      
      const newPasswordErrors = errorService.validateInput(passwordData.newPassword, {
        required: true,
        password: true,
        passwordStrong: true
      });
      
      if (currentPasswordErrors.length > 0 || newPasswordErrors.length > 0) {
        throw new Error([...currentPasswordErrors, ...newPasswordErrors].join(' '));
      }
      
      // Check password confirmation
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error(errorService.errorMessages.PASSWORD_MISMATCH);
      }

      const response = await apiService.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (response.success) {
        return { success: true };
      } else {
        throw new Error(response.message || 'Password change failed');
      }
    } catch (error) {
      errorService.logError(error, { action: 'change_password' });
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = tokenService.getAccessToken();
    return token && !tokenService.isTokenExpired(token);
  }

  /**
   * Get current user from token
   */
  getCurrentUser() {
    return tokenService.getUserFromToken();
  }

  /**
   * Get user ID
   */
  getUserId() {
    const user = this.getCurrentUser();
    return user?.id;
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    tokenService.setTokens({ accessToken: token });
  }

  /**
   * Get current token
   */
  getToken() {
    return tokenService.getAccessToken();
  }

  /**
   * Set current user
   */
  setCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  /**
   * Initialize demo user for development
   */
  initializeDemoUser() {
    if (import.meta.env.MODE === 'development' && !this.isAuthenticated()) {
      const demoUser = {
        id: 'demo-user-default',
        username: 'demo-user',
        email: 'demo@example.com',
        firstName: 'Demo',
        lastName: 'User'
      };
      
      const demoToken = 'demo-token-default';
      
      this.setToken(demoToken);
      this.setCurrentUser(demoUser);
      
      console.log('Demo user initialized for development');
    }
  }
}

// Create singleton instance
const authService = new AuthService();

// Initialize demo user for development
if (import.meta.env.DEV) {
  authService.initializeDemoUser();
}

export { authService };
export default authService;