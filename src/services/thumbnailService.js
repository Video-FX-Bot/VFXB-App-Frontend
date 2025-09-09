/**
 * Thumbnail Service
 * Handles video thumbnail generation and management
 */

class ThumbnailService {
  constructor() {
    this.canvas = null;
    this.video = null;
  }

  /**
   * Generate thumbnail from video file
   * @param {File} videoFile - The video file to generate thumbnail from
   * @param {number} timeOffset - Time in seconds to capture thumbnail (default: 1)
   * @returns {Promise<string>} - Base64 encoded thumbnail image
   */
  async generateThumbnail(videoFile, timeOffset = 1) {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        
        video.onloadedmetadata = () => {
          // Set canvas dimensions to maintain aspect ratio
          const aspectRatio = video.videoWidth / video.videoHeight;
          const maxWidth = 400;
          const maxHeight = 300;
          
          let width, height;
          if (aspectRatio > maxWidth / maxHeight) {
            width = maxWidth;
            height = maxWidth / aspectRatio;
          } else {
            height = maxHeight;
            width = maxHeight * aspectRatio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Seek to the specified time
          video.currentTime = Math.min(timeOffset, video.duration - 0.1);
        };
        
        video.onseeked = () => {
          try {
            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert to base64
            const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
            
            // Cleanup
            video.remove();
            
            resolve(thumbnail);
          } catch (error) {
            reject(new Error('Failed to generate thumbnail: ' + error.message));
          }
        };
        
        video.onerror = () => {
          reject(new Error('Failed to load video for thumbnail generation'));
        };
        
        // Create object URL and set as video source
        const videoUrl = URL.createObjectURL(videoFile);
        video.src = videoUrl;
        
        // Cleanup object URL after use
        video.onloadstart = () => {
          URL.revokeObjectURL(videoUrl);
        };
        
      } catch (error) {
        reject(new Error('Thumbnail generation failed: ' + error.message));
      }
    });
  }

  /**
   * Generate multiple thumbnails at different time intervals
   * @param {File} videoFile - The video file
   * @param {number} count - Number of thumbnails to generate (default: 4)
   * @returns {Promise<Array<{time: number, thumbnail: string}>>}
   */
  async generateMultipleThumbnails(videoFile, count = 4) {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        
        video.onloadedmetadata = async () => {
          try {
            const duration = video.duration;
            const interval = duration / (count + 1);
            const thumbnails = [];
            
            for (let i = 1; i <= count; i++) {
              const timeOffset = interval * i;
              const thumbnail = await this.generateThumbnailAtTime(video, timeOffset);
              thumbnails.push({
                time: timeOffset,
                thumbnail: thumbnail,
                timeFormatted: this.formatTime(timeOffset)
              });
            }
            
            video.remove();
            resolve(thumbnails);
          } catch (error) {
            reject(error);
          }
        };
        
        video.onerror = () => {
          reject(new Error('Failed to load video for thumbnail generation'));
        };
        
        const videoUrl = URL.createObjectURL(videoFile);
        video.src = videoUrl;
        
        video.onloadstart = () => {
          URL.revokeObjectURL(videoUrl);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate thumbnail at specific time from video element
   * @param {HTMLVideoElement} video - Video element
   * @param {number} time - Time in seconds
   * @returns {Promise<string>} - Base64 encoded thumbnail
   */
  generateThumbnailAtTime(video, time) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions
      const aspectRatio = video.videoWidth / video.videoHeight;
      const maxWidth = 400;
      const maxHeight = 300;
      
      let width, height;
      if (aspectRatio > maxWidth / maxHeight) {
        width = maxWidth;
        height = maxWidth / aspectRatio;
      } else {
        height = maxHeight;
        width = maxHeight * aspectRatio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const seekHandler = () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
          video.removeEventListener('seeked', seekHandler);
          resolve(thumbnail);
        } catch (error) {
          reject(error);
        }
      };
      
      video.addEventListener('seeked', seekHandler);
      video.currentTime = Math.min(time, video.duration - 0.1);
    });
  }

  /**
   * Format time in seconds to MM:SS format
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time string
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Compress image to reduce file size
   * @param {string} base64Image - Base64 encoded image
   * @param {number} quality - Compression quality (0-1)
   * @returns {Promise<string>} - Compressed base64 image
   */
  async compressImage(base64Image, quality = 0.7) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const compressedImage = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedImage);
      };
      
      img.src = base64Image;
    });
  }

  /**
   * Save thumbnail to localStorage with project association
   * @param {string} projectId - Project identifier
   * @param {string} thumbnail - Base64 encoded thumbnail
   */
  saveThumbnail(projectId, thumbnail) {
    try {
      const thumbnails = this.getAllThumbnails();
      thumbnails[projectId] = thumbnail;
      localStorage.setItem('project_thumbnails', JSON.stringify(thumbnails));
    } catch (error) {
      console.error('Failed to save thumbnail:', error);
    }
  }

  /**
   * Get thumbnail for a specific project
   * @param {string} projectId - Project identifier
   * @returns {string|null} - Base64 encoded thumbnail or null
   */
  getThumbnail(projectId) {
    try {
      const thumbnails = this.getAllThumbnails();
      return thumbnails[projectId] || null;
    } catch (error) {
      console.error('Failed to get thumbnail:', error);
      return null;
    }
  }

  /**
   * Get all stored thumbnails
   * @returns {Object} - Object with projectId as keys and thumbnails as values
   */
  getAllThumbnails() {
    try {
      const stored = localStorage.getItem('project_thumbnails');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to get thumbnails:', error);
      return {};
    }
  }

  /**
   * Delete thumbnail for a specific project
   * @param {string} projectId - Project identifier
   */
  deleteThumbnail(projectId) {
    try {
      const thumbnails = this.getAllThumbnails();
      delete thumbnails[projectId];
      localStorage.setItem('project_thumbnails', JSON.stringify(thumbnails));
    } catch (error) {
      console.error('Failed to delete thumbnail:', error);
    }
  }

  /**
   * Clear all thumbnails
   */
  clearAllThumbnails() {
    try {
      localStorage.removeItem('project_thumbnails');
    } catch (error) {
      console.error('Failed to clear thumbnails:', error);
    }
  }
}

// Export singleton instance
const thumbnailService = new ThumbnailService();
export default thumbnailService;