// Runway ML API Service
const axios = require('axios');
const logger = require('../utils/logger');

class RunwayService {
  constructor() {
    this.apiKey = process.env.RUNWAY_API_KEY;
    this.baseURL = 'https://api.runwayml.com/v1';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    this.isEnabled = !!this.apiKey;
    
    if (!this.isEnabled) {
      logger.warn('Runway API key not provided - service disabled');
    }
  }

  /**
   * Check if Runway service is available
   */
  async getHealthStatus() {
    if (!this.isEnabled) {
      return { status: 'disabled', message: 'API key not configured' };
    }

    try {
      // Test API connectivity
      await this.client.get('/models');
      return { status: 'healthy', message: 'Runway API is accessible' };
    } catch (error) {
      logger.error('Runway health check failed:', error.message);
      return { 
        status: 'error', 
        message: 'Runway API is not accessible',
        error: error.message 
      };
    }
  }

  /**
   * Get available Runway models
   */
  async getModels() {
    if (!this.isEnabled) {
      throw new Error('Runway service is not enabled');
    }

    try {
      const response = await this.client.get('/models');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch Runway models:', error.message);
      throw new Error(`Failed to fetch models: ${error.message}`);
    }
  }

  /**
   * Generate video using Runway ML
   */
  async generateVideo(options = {}) {
    if (!this.isEnabled) {
      throw new Error('Runway service is not enabled');
    }

    const {
      model = 'gen2',
      prompt,
      image,
      duration = 4,
      aspectRatio = '16:9',
      motionBrush,
      seed
    } = options;

    try {
      const payload = {
        model,
        prompt,
        duration,
        aspect_ratio: aspectRatio
      };

      if (image) {
        payload.image = image;
      }

      if (motionBrush) {
        payload.motion_brush = motionBrush;
      }

      if (seed) {
        payload.seed = seed;
      }

      logger.info('Generating video with Runway:', { model, prompt, duration });
      
      const response = await this.client.post('/generate', payload);
      
      return {
        taskId: response.data.id,
        status: response.data.status,
        model,
        prompt,
        duration,
        aspectRatio
      };
    } catch (error) {
      logger.error('Video generation failed:', error.message);
      throw new Error(`Video generation failed: ${error.message}`);
    }
  }

  /**
   * Check generation status
   */
  async getGenerationStatus(taskId) {
    if (!this.isEnabled) {
      throw new Error('Runway service is not enabled');
    }

    try {
      const response = await this.client.get(`/tasks/${taskId}`);
      return {
        taskId,
        status: response.data.status,
        progress: response.data.progress || 0,
        videoUrl: response.data.output?.[0]?.url,
        error: response.data.error,
        createdAt: response.data.createdAt,
        completedAt: response.data.completedAt
      };
    } catch (error) {
      logger.error('Failed to get generation status:', error.message);
      throw new Error(`Failed to get status: ${error.message}`);
    }
  }

  /**
   * Apply video effects using Runway
   */
  async applyVideoEffect(videoUrl, effectType, options = {}) {
    if (!this.isEnabled) {
      throw new Error('Runway service is not enabled');
    }

    try {
      const payload = {
        input_video: videoUrl,
        effect: effectType,
        ...options
      };

      logger.info('Applying video effect:', { effectType, videoUrl });
      
      const response = await this.client.post('/effects', payload);
      
      return {
        taskId: response.data.id,
        status: response.data.status,
        effect: effectType,
        inputVideo: videoUrl
      };
    } catch (error) {
      logger.error('Effect application failed:', error.message);
      throw new Error(`Effect application failed: ${error.message}`);
    }
  }

  /**
   * Upscale video using Runway
   */
  async upscaleVideo(videoUrl, scaleFactor = 2) {
    if (!this.isEnabled) {
      throw new Error('Runway service is not enabled');
    }

    try {
      const payload = {
        input_video: videoUrl,
        scale_factor: scaleFactor
      };

      logger.info('Upscaling video:', { videoUrl, scaleFactor });
      
      const response = await this.client.post('/upscale', payload);
      
      return {
        taskId: response.data.id,
        status: response.data.status,
        scaleFactor,
        inputVideo: videoUrl
      };
    } catch (error) {
      logger.error('Video upscaling failed:', error.message);
      throw new Error(`Video upscaling failed: ${error.message}`);
    }
  }

  /**
   * Remove background from video
   */
  async removeBackground(videoUrl) {
    if (!this.isEnabled) {
      throw new Error('Runway service is not enabled');
    }

    try {
      const payload = {
        input_video: videoUrl,
        model: 'background-removal'
      };

      logger.info('Removing background from video:', { videoUrl });
      
      const response = await this.client.post('/background-removal', payload);
      
      return {
        taskId: response.data.id,
        status: response.data.status,
        inputVideo: videoUrl
      };
    } catch (error) {
      logger.error('Background removal failed:', error.message);
      throw new Error(`Background removal failed: ${error.message}`);
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats() {
    if (!this.isEnabled) {
      throw new Error('Runway service is not enabled');
    }

    try {
      const response = await this.client.get('/usage');
      return response.data;
    } catch (error) {
      logger.error('Failed to get usage stats:', error.message);
      throw new Error(`Failed to get usage stats: ${error.message}`);
    }
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId) {
    if (!this.isEnabled) {
      throw new Error('Runway service is not enabled');
    }

    try {
      const response = await this.client.delete(`/tasks/${taskId}`);
      return {
        taskId,
        cancelled: true,
        status: response.data.status
      };
    } catch (error) {
      logger.error('Failed to cancel task:', error.message);
      throw new Error(`Failed to cancel task: ${error.message}`);
    }
  }
}

module.exports = new RunwayService();