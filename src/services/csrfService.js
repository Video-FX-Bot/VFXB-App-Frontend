class CSRFService {
  constructor() {
    this.tokenKey = 'csrf_token';
    this.headerName = 'X-CSRF-Token';
    this.cookieName = 'csrf_token';
    this.metaName = 'csrf-token';
    this.token = null;
    this.initialized = false;
  }

  /**
   * Initialize CSRF protection
   */
  async initialize() {
    try {
      if (this.initialized) {
        return this.token;
      }

      // Try to get token from various sources
      this.token = this.getTokenFromMeta() || 
                   this.getTokenFromCookie() || 
                   await this.fetchTokenFromServer();

      if (this.token) {
        this.initialized = true;
        // Store token for future use
        this.storeToken(this.token);
      }

      return this.token;
    } catch (error) {
      console.error('CSRF initialization failed:', error);
      return null;
    }
  }

  /**
   * Alias for initialize method
   */
  async initializeCSRF() {
    return await this.initialize();
  }

  /**
   * Get CSRF token from meta tag
   */
  getTokenFromMeta() {
    try {
      const metaTag = document.querySelector(`meta[name="${this.metaName}"]`);
      return metaTag ? metaTag.getAttribute('content') : null;
    } catch (error) {
      console.error('Error getting CSRF token from meta:', error);
      return null;
    }
  }

  /**
   * Get CSRF token from cookie
   */
  getTokenFromCookie() {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${this.cookieName}=`);
      if (parts.length === 2) {
        return parts.pop().split(';').shift();
      }
      return null;
    } catch (error) {
      console.error('Error getting CSRF token from cookie:', error);
      return null;
    }
  }

  /**
   * Fetch CSRF token from server
   */
  async fetchTokenFromServer() {
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${baseURL}/csrf-token`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.token || data.csrfToken;
      } else {
        console.warn('Failed to fetch CSRF token from server:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching CSRF token from server:', error);
      return null;
    }
  }

  /**
   * Store CSRF token
   */
  storeToken(token) {
    try {
      // Store in sessionStorage for persistence
      sessionStorage.setItem(this.tokenKey, token);
      
      // Update meta tag if it exists
      const metaTag = document.querySelector(`meta[name="${this.metaName}"]`);
      if (metaTag) {
        metaTag.setAttribute('content', token);
      } else {
        // Create meta tag if it doesn't exist
        const newMetaTag = document.createElement('meta');
        newMetaTag.name = this.metaName;
        newMetaTag.content = token;
        document.head.appendChild(newMetaTag);
      }
    } catch (error) {
      console.error('Error storing CSRF token:', error);
    }
  }

  /**
   * Get current CSRF token
   */
  getToken() {
    if (this.token) {
      return this.token;
    }

    // Try to get from storage
    try {
      const storedToken = sessionStorage.getItem(this.tokenKey);
      if (storedToken) {
        this.token = storedToken;
        return storedToken;
      }
    } catch (error) {
      console.error('Error getting stored CSRF token:', error);
    }

    // Fallback to meta or cookie
    return this.getTokenFromMeta() || this.getTokenFromCookie();
  }

  /**
   * Get CSRF headers for requests
   */
  getHeaders() {
    const token = this.getToken();
    if (!token) {
      console.warn('No CSRF token available');
      return {};
    }

    return {
      [this.headerName]: token
    };
  }

  /**
   * Validate CSRF token format
   */
  isValidToken(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Basic validation - token should be a reasonable length and contain valid characters
    const tokenRegex = /^[a-zA-Z0-9+/=_-]{16,}$/;
    return tokenRegex.test(token);
  }

  /**
   * Refresh CSRF token
   */
  async refreshToken() {
    try {
      this.token = null;
      this.initialized = false;
      
      // Clear stored token
      try {
        sessionStorage.removeItem(this.tokenKey);
      } catch (error) {
        console.error('Error clearing stored CSRF token:', error);
      }

      // Fetch new token
      const newToken = await this.initialize();
      return newToken;
    } catch (error) {
      console.error('Error refreshing CSRF token:', error);
      return null;
    }
  }

  /**
   * Clear CSRF token
   */
  clearToken() {
    try {
      this.token = null;
      this.initialized = false;
      
      // Clear from storage
      sessionStorage.removeItem(this.tokenKey);
      
      // Clear meta tag
      const metaTag = document.querySelector(`meta[name="${this.metaName}"]`);
      if (metaTag) {
        metaTag.remove();
      }
    } catch (error) {
      console.error('Error clearing CSRF token:', error);
    }
  }

  /**
   * Add CSRF protection to form
   */
  protectForm(form) {
    try {
      if (!form || !(form instanceof HTMLFormElement)) {
        console.error('Invalid form element provided');
        return false;
      }

      const token = this.getToken();
      if (!token) {
        console.warn('No CSRF token available for form protection');
        return false;
      }

      // Remove existing CSRF input if any
      const existingInput = form.querySelector('input[name="_token"]');
      if (existingInput) {
        existingInput.remove();
      }

      // Add CSRF token as hidden input
      const csrfInput = document.createElement('input');
      csrfInput.type = 'hidden';
      csrfInput.name = '_token';
      csrfInput.value = token;
      form.appendChild(csrfInput);

      return true;
    } catch (error) {
      console.error('Error protecting form with CSRF:', error);
      return false;
    }
  }

  /**
   * Verify CSRF token in response
   */
  verifyResponse(response) {
    try {
      // Check if response indicates CSRF token mismatch
      if (response.status === 419 || response.status === 403) {
        const errorMessage = response.statusText || '';
        if (errorMessage.toLowerCase().includes('csrf') || 
            errorMessage.toLowerCase().includes('token mismatch')) {
          console.warn('CSRF token mismatch detected');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error verifying CSRF response:', error);
      return true; // Default to true to avoid blocking legitimate requests
    }
  }

  /**
   * Handle CSRF token mismatch
   */
  async handleTokenMismatch() {
    try {
      console.log('Handling CSRF token mismatch...');
      
      // Refresh token
      const newToken = await this.refreshToken();
      
      if (newToken) {
        console.log('CSRF token refreshed successfully');
        return true;
      } else {
        console.error('Failed to refresh CSRF token');
        return false;
      }
    } catch (error) {
      console.error('Error handling CSRF token mismatch:', error);
      return false;
    }
  }

  /**
   * Check if request needs CSRF protection
   */
  needsCSRFProtection(method, url) {
    // CSRF protection is needed for state-changing requests
    const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    
    if (!protectedMethods.includes(method.toUpperCase())) {
      return false;
    }

    // Skip CSRF for external URLs
    try {
      const requestUrl = new URL(url, window.location.origin);
      return requestUrl.origin === window.location.origin;
    } catch (error) {
      // If URL parsing fails, assume it's a relative URL and needs protection
      return true;
    }
  }

  /**
   * Generate a simple CSRF token (for development/fallback)
   */
  generateToken() {
    try {
      // Generate a random token
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return btoa(String.fromCharCode.apply(null, array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    } catch (error) {
      console.error('Error generating CSRF token:', error);
      // Fallback to timestamp-based token
      return btoa(Date.now().toString() + Math.random().toString())
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    }
  }
}

// Export singleton instance
export const csrfService = new CSRFService();
export default csrfService;