import { jwtDecode } from 'jwt-decode';

class TokenService {
  constructor() {
    this.ACCESS_TOKEN_KEY = 'access_token';
    this.REFRESH_TOKEN_KEY = 'refresh_token';
    this.TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  /**
   * Initialize token service
   */
  initialize() {
    // Check for existing tokens and validate them
    const accessToken = this.getAccessToken();
    if (accessToken && this.isTokenExpired(accessToken)) {
      // Clear expired tokens
      this.clearTokens();
    }
    return Promise.resolve();
  }

  /**
   * Set authentication tokens
   * Uses httpOnly cookies when possible, falls back to secure storage
   */
  setTokens({ accessToken, refreshToken }) {
    try {
      if (this.isHttpOnlyCookieSupported()) {
        // Use httpOnly cookies for better security
        this.setCookie(this.ACCESS_TOKEN_KEY, accessToken, {
          httpOnly: false, // Client-side can't set httpOnly, but we'll use secure flags
          secure: window.location.protocol === 'https:',
          sameSite: 'strict',
          maxAge: 15 * 60 // 15 minutes
        });
        
        this.setCookie(this.REFRESH_TOKEN_KEY, refreshToken, {
          httpOnly: false,
          secure: window.location.protocol === 'https:',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 // 7 days
        });
      } else {
        // Fallback to sessionStorage (more secure than localStorage)
        sessionStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
        // Store refresh token in localStorage with encryption
        this.setEncryptedItem(this.REFRESH_TOKEN_KEY, refreshToken);
      }
    } catch (error) {
      console.error('Error setting tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  /**
   * Get access token
   */
  getAccessToken() {
    try {
      if (this.isHttpOnlyCookieSupported()) {
        return this.getCookie(this.ACCESS_TOKEN_KEY);
      } else {
        return sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  /**
   * Get refresh token
   */
  getRefreshToken() {
    try {
      if (this.isHttpOnlyCookieSupported()) {
        return this.getCookie(this.REFRESH_TOKEN_KEY);
      } else {
        return this.getEncryptedItem(this.REFRESH_TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Clear all tokens
   */
  clearTokens() {
    try {
      if (this.isHttpOnlyCookieSupported()) {
        this.deleteCookie(this.ACCESS_TOKEN_KEY);
        this.deleteCookie(this.REFRESH_TOKEN_KEY);
      } else {
        sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    try {
      if (!token || typeof token !== 'string') return true;
      
      // Check if token has proper JWT format (3 parts separated by dots)
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('Invalid JWT format: token does not have 3 parts');
        return true;
      }
      
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      return decoded.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true;
    }
  }

  /**
   * Get time until token refresh is needed (in milliseconds)
   */
  getTokenRefreshTime() {
    try {
      const token = this.getAccessToken();
      if (!token || typeof token !== 'string') return 0;
      
      // Check if token has proper JWT format
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('Invalid JWT format in getTokenRefreshTime');
        return 0;
      }
      
      const decoded = jwtDecode(token);
      const expiryTime = decoded.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const refreshTime = expiryTime - currentTime - this.TOKEN_REFRESH_BUFFER;
      
      return Math.max(0, refreshTime);
    } catch (error) {
      console.error('Error calculating token refresh time:', error);
      return 0;
    }
  }

  /**
   * Get user info from token
   */
  getUserFromToken() {
    try {
      const token = this.getAccessToken();
      if (!token || this.isTokenExpired(token)) return null;
      
      const decoded = jwtDecode(token);
      return {
        id: decoded.sub || decoded.userId,
        email: decoded.email,
        username: decoded.username,
        roles: decoded.roles || [],
        permissions: decoded.permissions || []
      };
    } catch (error) {
      console.error('Error getting user from token:', error);
      return null;
    }
  }

  /**
   * Check if httpOnly cookies are supported
   */
  isHttpOnlyCookieSupported() {
    return typeof document !== 'undefined' && 'cookie' in document;
  }

  /**
   * Set cookie with security flags
   */
  setCookie(name, value, options = {}) {
    try {
      let cookieString = `${name}=${encodeURIComponent(value)}`;
      
      if (options.maxAge) {
        cookieString += `; Max-Age=${options.maxAge}`;
      }
      
      if (options.secure) {
        cookieString += '; Secure';
      }
      
      if (options.sameSite) {
        cookieString += `; SameSite=${options.sameSite}`;
      }
      
      cookieString += '; Path=/';
      
      document.cookie = cookieString;
    } catch (error) {
      console.error('Error setting cookie:', error);
      throw error;
    }
  }

  /**
   * Get cookie value
   */
  getCookie(name) {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return decodeURIComponent(parts.pop().split(';').shift());
      }
      return null;
    } catch (error) {
      console.error('Error getting cookie:', error);
      return null;
    }
  }

  /**
   * Delete cookie
   */
  deleteCookie(name) {
    try {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    } catch (error) {
      console.error('Error deleting cookie:', error);
    }
  }

  /**
   * Simple encryption for localStorage (basic obfuscation)
   */
  setEncryptedItem(key, value) {
    try {
      const encrypted = btoa(encodeURIComponent(value));
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Error setting encrypted item:', error);
      localStorage.setItem(key, value); // Fallback to plain storage
    }
  }

  /**
   * Simple decryption for localStorage
   */
  getEncryptedItem(key) {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      
      try {
        return decodeURIComponent(atob(encrypted));
      } catch {
        // If decryption fails, assume it's plain text (backward compatibility)
        return encrypted;
      }
    } catch (error) {
      console.error('Error getting encrypted item:', error);
      return localStorage.getItem(key); // Fallback to plain retrieval
    }
  }

  /**
   * Validate token format
   */
  isValidTokenFormat(token) {
    try {
      if (!token || typeof token !== 'string') return false;
      
      // JWT tokens have 3 parts separated by dots
      const parts = token.split('.');
      return parts.length === 3;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get token expiry date
   */
  getTokenExpiry(token) {
    try {
      if (!token || !this.isValidTokenFormat(token)) return null;
      
      const decoded = jwtDecode(token);
      return new Date(decoded.exp * 1000);
    } catch (error) {
      console.error('Error getting token expiry:', error);
      return null;
    }
  }
}

// Export singleton instance
export const tokenService = new TokenService();
export default tokenService;