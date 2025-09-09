import { tokenService } from './tokenService';
import { errorService } from './errorService';
import { csrfService } from './csrfService';

// API Service for secure backend communication
class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    this.timeout = 30000; // 30 seconds
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    this.requestQueue = [];
    this.isRefreshing = false;
    
    // Initialize CSRF protection
    this.initializeCSRF();
  }
  
  /**
   * Initialize CSRF protection
   */
  async initializeCSRF() {
    try {
      await csrfService.initialize();
    } catch (error) {
      console.warn('CSRF initialization failed:', error);
    }
  }
  
  /**
   * Get authentication headers
   */
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Add JWT token
    const token = tokenService.getAccessToken();
    if (token && !tokenService.isTokenExpired(token)) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CSRF headers
    const csrfHeaders = csrfService.getHeaders();
    Object.assign(headers, csrfHeaders);
    
    return headers;
  }
  
  /**
   * Create request configuration
   */
  createRequestConfig(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    
    const config = {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'same-origin',
      ...options
    };
    
    // Add CSRF protection for state-changing requests
    if (csrfService.needsCSRFProtection(config.method, url)) {
      const csrfHeaders = csrfService.getHeaders();
      config.headers = { ...config.headers, ...csrfHeaders };
    }
    
    return { url, config };
  }
  
  /**
   * Handle request timeout
   */
  createTimeoutPromise(timeout) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);
    });
  }
  
  /**
   * Retry request with exponential backoff
   */
  async retryRequest(url, config, attempt = 1) {
    try {
      const response = await fetch(url, config);
      return response;
    } catch (error) {
      if (attempt < this.retryAttempts && errorService.isRetryableError(error)) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest(url, config, attempt + 1);
      }
      throw error;
    }
  }
  
  /**
   * Handle token refresh
   */
  async handleTokenRefresh() {
    if (this.isRefreshing) {
      // Wait for ongoing refresh
      return new Promise((resolve) => {
        this.requestQueue.push(resolve);
      });
    }
    
    this.isRefreshing = true;
    
    try {
      const refreshToken = tokenService.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfService.getHeaders()
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        const data = await response.json();
        tokenService.setTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken
        });
        
        // Resolve queued requests
        this.requestQueue.forEach(resolve => resolve());
        this.requestQueue = [];
        
        return true;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      // Clear tokens and redirect to login
      tokenService.clearTokens();
      
      // Reject queued requests
      this.requestQueue.forEach(resolve => resolve());
      this.requestQueue = [];
      
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }
  
  /**
   * Main request method with security features
   */
  async request(endpoint, options = {}) {
    const { url, config } = this.createRequestConfig(endpoint, options);
    
    try {
      // Create timeout promise
      const timeoutPromise = this.createTimeoutPromise(this.timeout);
      
      // Make request with retry logic
      const response = await Promise.race([
        this.retryRequest(url, config),
        timeoutPromise
      ]);
      
      // Handle authentication errors
      if (response.status === 401) {
        try {
          await this.handleTokenRefresh();
          // Retry original request with new token
          const newConfig = this.createRequestConfig(endpoint, options);
          const retryResponse = await fetch(newConfig.url, newConfig.config);
          return this.handleResponse(retryResponse);
        } catch (refreshError) {
          // Redirect to login or handle auth failure
          window.location.href = '/login';
          throw new Error('Authentication failed');
        }
      }
      
      // Handle CSRF errors
      if (response.status === 419 || response.status === 403) {
        if (!csrfService.verifyResponse(response)) {
          try {
            await csrfService.handleTokenMismatch();
            // Retry original request with new CSRF token
            const newConfig = this.createRequestConfig(endpoint, options);
            const retryResponse = await fetch(newConfig.url, newConfig.config);
            return this.handleResponse(retryResponse);
          } catch (csrfError) {
            throw new Error('CSRF protection failed');
          }
        }
      }
      
      return this.handleResponse(response);
    } catch (error) {
      errorService.logError(error, {
        endpoint,
        method: config.method,
        url
      });
      throw error;
    }
  }
  
  /**
   * Handle response processing
   */
  async handleResponse(response) {
    try {
      if (!response.ok) {
        let errorData = {};
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          try {
            errorData = await response.json();
          } catch (parseError) {
            console.warn('Failed to parse error response:', parseError);
          }
        }
        
        const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = { status: response.status, data: errorData };
        throw error;
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return {
          success: true,
          data,
          status: response.status
        };
      }
      
      return {
        success: true,
        data: response,
        status: response.status
      };
    } catch (error) {
      if (error.status) {
        throw error; // Re-throw HTTP errors
      }
      
      // Handle parsing errors
      const parseError = new Error('Failed to process response');
      parseError.originalError = error;
      throw parseError;
    }
  }
  
  /**
   * Authentication endpoints with enhanced security
   */
  async login(email, password) {
    try {
      // Validate and sanitize input
      const credentials = { email, password };
      const sanitizedCredentials = errorService.sanitizeInput(credentials);
      
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(sanitizedCredentials)
      });
      
      if (response.success && response.data.tokens) {
        // Store tokens securely
        tokenService.setTokens(response.data.tokens);
        
        // Update CSRF token if provided
        if (response.data.csrfToken) {
          csrfService.storeToken(response.data.csrfToken);
        }
      }
      
      return response;
    } catch (error) {
      errorService.logError(error, { action: 'login' });
      throw errorService.createUserFriendlyError(error, 'authentication');
    }
  }
  
  async register(userData) {
    try {
      // Validate and sanitize input
      const sanitizedData = errorService.sanitizeInput(userData);
      
      // Validate required fields
      if (!sanitizedData.email || !sanitizedData.password) {
        throw new Error('Email and password are required');
      }
      
      if (!errorService.validateEmail(sanitizedData.email)) {
        throw new Error('Please enter a valid email address');
      }
      
      if (!errorService.validatePassword(sanitizedData.password)) {
        throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
      }
      
      const response = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(sanitizedData)
      });
      
      if (response.success && response.data.tokens) {
        // Store tokens securely
        tokenService.setTokens(response.data.tokens);
        
        // Update CSRF token if provided
        if (response.data.csrfToken) {
          csrfService.storeToken(response.data.csrfToken);
        }
      }
      
      return response;
    } catch (error) {
      errorService.logError(error, { action: 'register' });
      throw errorService.createUserFriendlyError(error, 'authentication');
    }
  }
  
  async logout() {
    try {
      const refreshToken = tokenService.getRefreshToken();
      
      // Call logout endpoint if refresh token exists
      if (refreshToken) {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });
      }
      
      // Clear all tokens and CSRF
      tokenService.clearTokens();
      csrfService.clearToken();
      
      return { success: true };
    } catch (error) {
      // Even if logout fails, clear local tokens
      tokenService.clearTokens();
      csrfService.clearToken();
      
      errorService.logError(error, { action: 'logout' });
      // Don't throw error for logout - always succeed locally
      return { success: true };
    }
  }
  
  async refreshToken() {
    try {
      const refreshToken = tokenService.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await this.request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });
      
      if (response.success && response.data.tokens) {
        tokenService.setTokens(response.data.tokens);
        
        // Update CSRF token if provided
        if (response.data.csrfToken) {
          csrfService.storeToken(response.data.csrfToken);
        }
      }
      
      return response;
    } catch (error) {
      // Clear tokens on refresh failure
      tokenService.clearTokens();
      errorService.logError(error, { action: 'refreshToken' });
      throw errorService.createUserFriendlyError(error, 'authentication');
    }
  }
  
  async getCurrentUser() {
    try {
      const response = await this.request('/auth/me');
      return response;
    } catch (error) {
      errorService.logError(error, { action: 'getCurrentUser' });
      throw errorService.createUserFriendlyError(error, 'authentication');
    }
  }
  
  async updateProfile(profileData) {
    try {
      const sanitizedData = errorService.sanitizeInput(profileData);
      
      const response = await this.request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(sanitizedData)
      });
      
      return response;
    } catch (error) {
      errorService.logError(error, { action: 'updateProfile' });
      throw errorService.createUserFriendlyError(error, 'profile');
    }
  }
  
  async changePassword(passwordData) {
    try {
      const sanitizedData = errorService.sanitizeInput(passwordData);
      
      // Validate new password
      if (!errorService.validatePassword(sanitizedData.newPassword)) {
        throw new Error('New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
      }
      
      const response = await this.request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(sanitizedData)
      });
      
      return response;
    } catch (error) {
      errorService.logError(error, { action: 'changePassword' });
      throw errorService.createUserFriendlyError(error, 'authentication');
    }
  }
  
  // Video endpoints
  /**
   * Video upload with enhanced security and progress tracking
   */
  async uploadVideo(file, onProgress, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Validate file
        if (!file) {
          reject(new Error('No file provided'));
          return;
        }
        
        // Validate file type
        const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
        if (!allowedTypes.includes(file.type)) {
          reject(errorService.createUserFriendlyError(
            new Error('Invalid file type'),
            'fileUpload'
          ));
          return;
        }
        
        // Validate file size (100MB limit)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
          reject(errorService.createUserFriendlyError(
            new Error('File size exceeds 100MB limit'),
            'fileUpload'
          ));
          return;
        }
        
        const formData = new FormData();
        formData.append('video', file);
        
        // Add metadata if provided
        if (options.metadata) {
          const sanitizedMetadata = errorService.sanitizeInput(options.metadata);
          formData.append('metadata', JSON.stringify(sanitizedMetadata));
        }
        
        const xhr = new XMLHttpRequest();
        
        // Progress tracking
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress(Math.round(percentComplete));
          }
        });
        
        // Success handler
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve({
                success: true,
                data: response,
                status: xhr.status
              });
            } catch (error) {
              const parseError = new Error('Invalid response format');
              errorService.logError(parseError, { action: 'uploadVideo', file: file.name });
              reject(errorService.createUserFriendlyError(parseError, 'fileUpload'));
            }
          } else {
            let errorMessage = `Upload failed: ${xhr.status} ${xhr.statusText}`;
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMessage = errorResponse.message || errorMessage;
            } catch (e) {
              // Use default error message
            }
            
            const error = new Error(errorMessage);
            error.status = xhr.status;
            errorService.logError(error, { action: 'uploadVideo', file: file.name });
            reject(errorService.createUserFriendlyError(error, 'fileUpload'));
          }
        });
        
        // Error handlers
        xhr.addEventListener('error', () => {
          const error = new Error('Network error during upload');
          errorService.logError(error, { action: 'uploadVideo', file: file.name });
          reject(errorService.createUserFriendlyError(error, 'network'));
        });
        
        xhr.addEventListener('abort', () => {
          const error = new Error('Upload was aborted');
          errorService.logError(error, { action: 'uploadVideo', file: file.name });
          reject(errorService.createUserFriendlyError(error, 'fileUpload'));
        });
        
        // Timeout handler
        xhr.addEventListener('timeout', () => {
          const error = new Error('Upload timeout');
          errorService.logError(error, { action: 'uploadVideo', file: file.name });
          reject(errorService.createUserFriendlyError(error, 'network'));
        });
        
        // Configure request
        xhr.open('POST', `${this.baseURL}/videos/upload`);
        xhr.timeout = 300000; // 5 minutes timeout
        
        // Set authentication header
        const token = tokenService.getAccessToken();
        if (token && !tokenService.isTokenExpired(token)) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        
        // Set CSRF headers
        const csrfHeaders = csrfService.getHeaders();
        Object.keys(csrfHeaders).forEach(key => {
          xhr.setRequestHeader(key, csrfHeaders[key]);
        });
        
        // Start upload
        xhr.send(formData);
        
      } catch (error) {
        errorService.logError(error, { action: 'uploadVideo', file: file?.name });
        reject(errorService.createUserFriendlyError(error, 'fileUpload'));
      }
    });
  }
  
  /**
   * Get user videos with pagination
   */
  async getVideos(page = 1, limit = 10) {
    try {
      const response = await this.request(`/videos?page=${page}&limit=${limit}`);
      return response;
    } catch (error) {
      errorService.logError(error, { action: 'getVideos' });
      throw errorService.createUserFriendlyError(error, 'generic');
    }
  }
  
  /**
   * Get specific video details
   */
  async getVideo(videoId) {
    try {
      if (!videoId) {
        throw new Error('Video ID is required');
      }
      
      const response = await this.request(`/videos/${videoId}`);
      return response;
    } catch (error) {
      errorService.logError(error, { action: 'getVideo', videoId });
      throw errorService.createUserFriendlyError(error, 'generic');
    }
  }
  
  /**
   * Delete video with confirmation
   */
  async deleteVideo(videoId) {
    try {
      if (!videoId) {
        throw new Error('Video ID is required');
      }
      
      const response = await this.request(`/videos/${videoId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      errorService.logError(error, { action: 'deleteVideo', videoId });
      throw errorService.createUserFriendlyError(error, 'generic');
    }
  }
  
  /**
   * Get video processing status
   */
  async getVideoStatus(videoId) {
    try {
      if (!videoId) {
        throw new Error('Video ID is required');
      }
      
      const response = await this.request(`/videos/${videoId}/status`);
      return response;
    } catch (error) {
      errorService.logError(error, { action: 'getVideoStatus', videoId });
      throw errorService.createUserFriendlyError(error, 'generic');
    }
  }
  
  async updateVideoMetadata(videoId, metadata) {
    return this.request(`/videos/${videoId}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(metadata)
    });
  }
  
  // Video processing endpoints
  async processVideo(videoId, operations) {
    return this.request(`/videos/${videoId}/process`, {
      method: 'POST',
      body: JSON.stringify({ operations })
    });
  }
  
  async getProcessingStatus(jobId) {
    return this.request(`/processing/${jobId}/status`);
  }
  
  async cancelProcessing(jobId) {
    return this.request(`/processing/${jobId}/cancel`, {
      method: 'POST'
    });
  }
  
  // Export endpoints
  async exportVideo(videoId, format, quality) {
    return this.request(`/videos/${videoId}/export`, {
      method: 'POST',
      body: JSON.stringify({ format, quality })
    });
  }
  
  async getExportStatus(exportId) {
    return this.request(`/exports/${exportId}/status`);
  }
  
  async downloadExport(exportId) {
    const response = await this.request(`/exports/${exportId}/download`);
    return response; // This should be a blob response
  }
  
  // AI Chat endpoints
  async sendChatMessage(message, context = {}) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context })
    });
  }
  
  async getChatHistory(conversationId) {
    return this.request(`/ai/conversations/${conversationId}`);
  }
  
  async createConversation(title) {
    return this.request('/ai/conversations', {
      method: 'POST',
      body: JSON.stringify({ title })
    });
  }
  
  async deleteConversation(conversationId) {
    return this.request(`/ai/conversations/${conversationId}`, {
      method: 'DELETE'
    });
  }
  
  // Analytics endpoints
  async trackEvent(event, properties = {}) {
    return this.request('/analytics/events', {
      method: 'POST',
      body: JSON.stringify({ event, properties, timestamp: new Date().toISOString() })
    });
  }
  
  async getUserAnalytics() {
    return this.request('/analytics/user');
  }
  
  // Settings endpoints
  async getUserSettings() {
    return this.request('/settings');
  }
  
  async updateUserSettings(settings) {
    return this.request('/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  }
  
  // Subscription endpoints
  async getSubscription() {
    return this.request('/subscription');
  }
  
  async updateSubscription(planId) {
    return this.request('/subscription', {
      method: 'POST',
      body: JSON.stringify({ planId })
    });
  }
  
  async cancelSubscription() {
    return this.request('/subscription/cancel', {
      method: 'POST'
    });
  }
  
  // Utility methods
  async healthCheck() {
    return this.request('/health');
  }
  
  async getApiVersion() {
    return this.request('/version');
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;

// Export class for testing
export { ApiService };