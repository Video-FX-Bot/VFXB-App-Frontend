const axios = require('axios');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/json2video.log' })
  ]
});

class JSON2VideoService {
  constructor() {
    this.apiKey = process.env.JSON2VIDEO_API_KEY;
    this.baseURL = 'https://api.json2video.com/v2';
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
    
    // Debug: Log API key status
    console.log('JSON2Video API Key loaded:', this.apiKey ? 'YES' : 'NO');
    if (this.apiKey) {
      console.log('API Key length:', this.apiKey.length);
      console.log('API Key first 10 chars:', this.apiKey.substring(0, 10));
    }
  }

  /**
   * Initialize the service and validate API key
   */
  async initialize() {
    try {
      if (!this.apiKey) {
        logger.warn('JSON2VIDEO_API_KEY not set - JSON2Video features will be disabled');
        return false;
      }
      
      // Test the API key with a simple request
      const response = await this.makeRequest('GET', '/templates');
      logger.info('JSON2Video service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize JSON2Video service:', error.message);
      return false;
    }
  }

  /**
   * Make HTTP request to JSON2Video API with retry logic
   */
  async makeRequest(method, endpoint, data = null, retryCount = 0) {
    try {
      // Debug: Log request details
      console.log('Making JSON2Video API request:', {
        method,
        endpoint,
        apiKey: this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'MISSING',
        hasApiKey: !!this.apiKey
      });
      
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      };
      
      console.log('Request headers:', config.headers);

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        logger.warn(`JSON2Video API request failed, retrying (${retryCount + 1}/${this.maxRetries})...`);
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.makeRequest(method, endpoint, data, retryCount + 1);
      }
      
      logger.error('JSON2Video API request failed:', {
        endpoint,
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw error;
    }
  }

  /**
   * Check if error should trigger a retry
   */
  shouldRetry(error) {
    const status = error.response?.status;
    return status >= 500 || status === 429 || !status;
  }

  /**
   * Delay utility for retries
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get available templates
   */
  async getTemplates() {
    try {
      const templates = await this.makeRequest('GET', '/templates');
      logger.info('Retrieved JSON2Video templates successfully');
      return templates;
    } catch (error) {
      logger.error('Failed to get templates:', error.message);
      throw new Error('Failed to retrieve video templates');
    }
  }

  /**
   * Create video from text/script
   */
  async createVideoFromText(config) {
    try {
      const {
        text,
        voiceSettings = {},
        style = {},
        duration = 5,
        resolution = 'full-hd'
      } = config;

      // JSON2Video API format based on documentation
      const videoConfig = {
        comment: 'VFXB API Generated Video',
        resolution: resolution,
        scenes: [
          {
            duration: duration,
            elements: [
              {
                type: 'text',
                text: text,
                duration: duration,
                start: 0,
                'font-family': style.fontFamily || 'Arial',
                'font-size': style.fontSize || 48,
                color: style.textColor || '#ffffff',
                'background-color': style.backgroundColor || '#000000'
              }
            ]
          }
        ]
      };

      const result = await this.makeRequest('POST', '/movies', videoConfig);
      logger.info('Video creation job started:', result.project);
      return result;
    } catch (error) {
      logger.error('Failed to create video from text:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      throw new Error(`Failed to create video from text: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create video from JSON configuration
   */
  async createVideoFromJSON(jsonConfig) {
    try {
      const result = await this.makeRequest('POST', '/movies', jsonConfig);
      logger.info('Video creation job started from JSON:', result.id);
      return result;
    } catch (error) {
      logger.error('Failed to create video from JSON:', error.message);
      throw new Error('Failed to create video from JSON configuration');
    }
  }

  /**
   * Get video generation status
   */
  async getVideoStatus(projectId) {
    try {
      const status = await this.makeRequest('GET', `/movies?project=${projectId}`);
      return status;
    } catch (error) {
      logger.error('Failed to get video status:', error.message);
      throw new Error('Failed to retrieve video generation status');
    }
  }

  /**
   * Download completed video
   */
  async downloadVideo(jobId) {
    try {
      const status = await this.getVideoStatus(jobId);
      
      if (status.status !== 'done') {
        throw new Error(`Video not ready. Current status: ${status.status}`);
      }

      if (!status.url) {
        throw new Error('Video URL not available');
      }

      // Download the video file
      const response = await axios({
        method: 'GET',
        url: status.url,
        responseType: 'stream'
      });

      logger.info('Video downloaded successfully:', jobId);
      return response.data;
    } catch (error) {
      logger.error('Failed to download video:', error.message);
      throw new Error('Failed to download video');
    }
  }

  /**
   * Wait for video completion with polling
   */
  async waitForCompletion(jobId, maxWaitTime = 300000) { // 5 minutes max
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.getVideoStatus(jobId);
        
        if (status.status === 'done') {
          logger.info('Video generation completed:', jobId);
          return status;
        }
        
        if (status.status === 'error' || status.status === 'failed') {
          throw new Error(`Video generation failed: ${status.error || 'Unknown error'}`);
        }
        
        logger.info(`Video generation in progress: ${status.status} (${status.progress || 0}%)`);
        await this.delay(pollInterval);
      } catch (error) {
        if (error.message.includes('Video generation failed')) {
          throw error;
        }
        logger.warn('Error checking video status, retrying...', error.message);
        await this.delay(pollInterval);
      }
    }
    
    throw new Error('Video generation timeout');
  }

  /**
   * Create video with automatic completion waiting
   */
  async createVideoAndWait(config) {
    try {
      const job = await this.createVideoFromText(config);
      const completedJob = await this.waitForCompletion(job.id);
      return completedJob;
    } catch (error) {
      logger.error('Failed to create and wait for video:', error.message);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    try {
      await this.makeRequest('GET', '/templates');
      return {
        status: 'healthy',
        service: 'json2video',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'json2video',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = JSON2VideoService;