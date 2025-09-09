// API Service for backend communication
class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
    this.token = null;
  }
  
  setAuthToken(token) {
    this.token = token;
  }
  
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    return headers;
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    };
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return response;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }
  
  // Auth endpoints
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }
  
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }
  
  async logout() {
    return this.request('/auth/logout', {
      method: 'POST'
    });
  }
  
  async refreshToken() {
    return this.request('/auth/refresh', {
      method: 'POST'
    });
  }
  
  async getCurrentUser() {
    return this.request('/auth/me');
  }
  
  // Video endpoints
  async uploadVideo(file, onProgress) {
    const formData = new FormData();
    formData.append('video', file);
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress?.(progress);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });
      
      xhr.open('POST', `${this.baseURL}/videos/upload`);
      
      if (this.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      }
      
      xhr.send(formData);
    });
  }
  
  async getVideos() {
    return this.request('/videos');
  }
  
  async getVideo(videoId) {
    return this.request(`/videos/${videoId}`);
  }
  
  async deleteVideo(videoId) {
    return this.request(`/videos/${videoId}`, {
      method: 'DELETE'
    });
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