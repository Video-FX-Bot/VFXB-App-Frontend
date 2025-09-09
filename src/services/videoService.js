// Video Service - Handles video processing, editing, and management
import apiService from './apiService';
import { errorService } from './errorService';

class VideoService {
  constructor() {
    this.baseUrl = '/api/videos';
    this.supportedFormats = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
    this.maxFileSize = 500 * 1024 * 1024; // 500MB
  }

  /**
   * Upload a video file
   */
  async uploadVideo(file, onProgress = null) {
    try {
      if (!this.validateVideoFile(file)) {
        throw new Error('Invalid video file format or size');
      }

      const formData = new FormData();
      formData.append('video', file);

      const response = await apiService.upload(`${this.baseUrl}/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        }
      });

      return response.data;
    } catch (error) {
      errorService.logError(error, { context: 'videoService.uploadVideo' });
      throw error;
    }
  }

  /**
   * Get video details
   */
  async getVideo(videoId) {
    try {
      const response = await apiService.get(`${this.baseUrl}/${videoId}`);
      return response.data;
    } catch (error) {
      errorService.logError(error, { context: 'videoService.getVideo', videoId });
      throw error;
    }
  }

  /**
   * Get all videos for a user
   */
  async getVideos(params = {}) {
    try {
      const response = await apiService.get(this.baseUrl, { params });
      return response.data;
    } catch (error) {
      errorService.logError(error, { context: 'videoService.getVideos' });
      throw error;
    }
  }

  /**
   * Delete a video
   */
  async deleteVideo(videoId) {
    try {
      const response = await apiService.delete(`${this.baseUrl}/${videoId}`);
      return response.data;
    } catch (error) {
      errorService.logError(error, { context: 'videoService.deleteVideo', videoId });
      throw error;
    }
  }

  /**
   * Generate video thumbnails
   */
  async generateThumbnails(videoId, options = {}) {
    try {
      const response = await apiService.post(`${this.baseUrl}/${videoId}/thumbnails`, options);
      return response.data;
    } catch (error) {
      errorService.logError(error, { context: 'videoService.generateThumbnails', videoId });
      throw error;
    }
  }

  /**
   * Export video with applied effects
   */
  async exportVideo(videoId, exportOptions = {}) {
    try {
      const response = await apiService.post(`${this.baseUrl}/${videoId}/export`, exportOptions);
      return response.data;
    } catch (error) {
      errorService.logError(error, { context: 'videoService.exportVideo', videoId });
      throw error;
    }
  }

  /**
   * Apply single effect to video
   */
  async applyEffect(videoPath, effectId, parameters = {}) {
    try {
      const response = await apiService.post('/api/video/apply-effect', {
        videoPath,
        effectId,
        parameters
      });
      return response.data;
    } catch (error) {
      errorService.logError(error, { context: 'videoService.applyEffect', effectId });
      throw error;
    }
  }

  /**
   * Apply multiple effects in sequence
   */
  async applyEffectChain(videoPath, effects) {
    try {
      const response = await apiService.post('/api/video/apply-effect-chain', {
        videoPath,
        effects
      });
      return response.data;
    } catch (error) {
      errorService.logError(error, { context: 'videoService.applyEffectChain', effects });
      throw error;
    }
  }

  /**
   * Get supported effects
   */
  async getSupportedEffects() {
    try {
      const response = await apiService.get('/api/video/supported-effects');
      return response.data;
    } catch (error) {
      errorService.logError(error, { context: 'videoService.getSupportedEffects' });
      throw error;
    }
  }

  /**
   * Export video with specified format and quality
   */
  async exportVideoWithOptions(filename, options = {}) {
    try {
      const { format = 'mp4', quality = 'high', resolution, bitrate } = options;
      
      const response = await fetch(`${this.baseUrl}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          format,
          quality,
          resolution,
          bitrate
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to export video');
      }
    } catch (error) {
      console.error('Error exporting video:', error);
      errorService.logError(error, { context: 'videoService.exportVideoWithOptions', filename, options });
      throw error;
    }
  }

  /**
   * Merge multiple videos
   */
  async mergeVideos(filenames, outputFormat = 'mp4') {
    try {
      const response = await fetch(`${this.baseUrl}/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filenames,
          outputFormat
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to merge videos');
      }
    } catch (error) {
      console.error('Error merging videos:', error);
      errorService.logError(error, { context: 'videoService.mergeVideos', filenames, outputFormat });
      throw error;
    }
  }

  /**
   * Extract audio from video
   */
  async extractAudio(filename, format = 'mp3') {
    try {
      const response = await fetch(`${this.baseUrl}/extract-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          format
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to extract audio');
      }
    } catch (error) {
      console.error('Error extracting audio:', error);
      errorService.logError(error, { context: 'videoService.extractAudio', filename, format });
      throw error;
    }
  }

  /**
   * Get video metadata
   */
  async getVideoMetadataByFilename(filename) {
    try {
      const response = await fetch(`${this.baseUrl}/metadata/${filename}`);
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to get video metadata');
      }
    } catch (error) {
      console.error('Error getting video metadata:', error);
      errorService.logError(error, { context: 'videoService.getVideoMetadataByFilename', filename });
      throw error;
    }
  }

  /**
   * Get video processing status
   */
  async getProcessingStatus(videoId) {
    try {
      const response = await apiService.get(`${this.baseUrl}/${videoId}/status`);
      return response.data;
    } catch (error) {
      errorService.logError(error, { context: 'videoService.getProcessingStatus', videoId });
      throw error;
    }
  }

  /**
   * Trim video
   */
  async trimVideo(videoId, startTime, endTime) {
    try {
      const response = await apiService.post(`${this.baseUrl}/${videoId}/trim`, {
        startTime,
        endTime
      });
      return response.data;
    } catch (error) {
      errorService.logError(error, { context: 'videoService.trimVideo', videoId });
      throw error;
    }
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(videoId) {
    try {
      const response = await apiService.get(`${this.baseUrl}/${videoId}/metadata`);
      return response.data;
    } catch (error) {
      errorService.logError(error, { context: 'videoService.getVideoMetadata', videoId });
      throw error;
    }
  }

  /**
   * Validate video file
   */
  validateVideoFile(file) {
    if (!file) return false;
    
    // Check file size
    if (file.size > this.maxFileSize) {
      return false;
    }

    // Check file format
    const fileExtension = file.name.split('.').pop().toLowerCase();
    return this.supportedFormats.includes(fileExtension);
  }

  /**
   * Get supported video formats
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  /**
   * Get max file size
   */
  getMaxFileSize() {
    return this.maxFileSize;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Convert duration to readable format
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// Create and export singleton instance
export const videoService = new VideoService();
export default videoService;