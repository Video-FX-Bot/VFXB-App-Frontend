/**
 * Video Thumbnail Generation Utility
 * Generates thumbnails from video files using HTML5 Canvas API
 */

/**
 * Generate a thumbnail from a video file
 * @param {File|string} videoSource - Video file or URL
 * @param {number} timeOffset - Time in seconds to capture thumbnail (default: 1)
 * @param {number} width - Thumbnail width (default: 160)
 * @param {number} height - Thumbnail height (default: 90)
 * @returns {Promise<string>} - Data URL of the generated thumbnail
 */
export const generateVideoThumbnail = async (videoSource, timeOffset = 1, width = 160, height = 90) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;
    
    // Configure video element
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    // Handle video load and seek
    const handleLoadedData = () => {
      // Ensure we don't seek beyond video duration
      const seekTime = Math.min(timeOffset, video.duration - 0.1);
      video.currentTime = seekTime;
    };
    
    const handleSeeked = () => {
      try {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, width, height);
        
        // Convert canvas to data URL
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Clean up
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('seeked', handleSeeked);
        video.removeEventListener('error', handleError);
        
        if (typeof videoSource !== 'string') {
          URL.revokeObjectURL(video.src);
        }
        
        resolve(thumbnailDataUrl);
      } catch (error) {
        reject(new Error(`Failed to generate thumbnail: ${error.message}`));
      }
    };
    
    const handleError = (error) => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      
      if (typeof videoSource !== 'string') {
        URL.revokeObjectURL(video.src);
      }
      
      reject(new Error(`Video loading failed: ${error.message || 'Unknown error'}`));
    };
    
    // Add event listeners
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);
    
    // Set video source
    if (typeof videoSource === 'string') {
      video.src = videoSource;
    } else if (videoSource instanceof File) {
      video.src = URL.createObjectURL(videoSource);
    } else {
      reject(new Error('Invalid video source. Must be a File object or URL string.'));
      return;
    }
    
    // Start loading
    video.load();
    
    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Thumbnail generation timed out'));
    }, 10000);
  });
};

/**
 * Generate multiple thumbnails from a video at different time intervals
 * @param {File|string} videoSource - Video file or URL
 * @param {number} count - Number of thumbnails to generate (default: 5)
 * @param {number} width - Thumbnail width (default: 160)
 * @param {number} height - Thumbnail height (default: 90)
 * @returns {Promise<string[]>} - Array of thumbnail data URLs
 */
export const generateVideoThumbnails = async (videoSource, count = 5, width = 160, height = 90) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    const handleLoadedMetadata = async () => {
      try {
        const thumbnails = [];
        const duration = video.duration;
        
        for (let i = 0; i < count; i++) {
          const timeOffset = (duration / (count + 1)) * (i + 1);
          const thumbnail = await generateSingleThumbnail(video, timeOffset, width, height);
          thumbnails.push(thumbnail);
        }
        
        // Clean up
        if (typeof videoSource !== 'string') {
          URL.revokeObjectURL(video.src);
        }
        
        resolve(thumbnails);
      } catch (error) {
        reject(error);
      }
    };
    
    const handleError = (error) => {
      if (typeof videoSource !== 'string') {
        URL.revokeObjectURL(video.src);
      }
      reject(new Error(`Video loading failed: ${error.message || 'Unknown error'}`));
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);
    
    // Set video source
    if (typeof videoSource === 'string') {
      video.src = videoSource;
    } else if (videoSource instanceof File) {
      video.src = URL.createObjectURL(videoSource);
    } else {
      reject(new Error('Invalid video source. Must be a File object or URL string.'));
      return;
    }
    
    video.load();
  });
};

/**
 * Helper function to generate a single thumbnail from a video element
 * @param {HTMLVideoElement} video - Video element
 * @param {number} timeOffset - Time in seconds
 * @param {number} width - Thumbnail width
 * @param {number} height - Thumbnail height
 * @returns {Promise<string>} - Thumbnail data URL
 */
const generateSingleThumbnail = (video, timeOffset, width, height) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = width;
    canvas.height = height;
    
    const handleSeeked = () => {
      try {
        ctx.drawImage(video, 0, 0, width, height);
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        video.removeEventListener('seeked', handleSeeked);
        resolve(thumbnailDataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    video.addEventListener('seeked', handleSeeked);
    video.currentTime = timeOffset;
  });
};

/**
 * Check if video thumbnail generation is supported
 * @returns {boolean} - True if supported
 */
export const isVideoThumbnailSupported = () => {
  try {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    return !!(video && canvas && canvas.getContext && canvas.getContext('2d'));
  } catch (error) {
    return false;
  }
};

/**
 * Get video metadata (duration, dimensions)
 * @param {File|string} videoSource - Video file or URL
 * @returns {Promise<object>} - Video metadata
 */
export const getVideoMetadata = (videoSource) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    const handleLoadedMetadata = () => {
      const metadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        aspectRatio: video.videoWidth / video.videoHeight
      };
      
      // Clean up
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
      
      if (typeof videoSource !== 'string') {
        URL.revokeObjectURL(video.src);
      }
      
      resolve(metadata);
    };
    
    const handleError = (error) => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
      
      if (typeof videoSource !== 'string') {
        URL.revokeObjectURL(video.src);
      }
      
      reject(new Error(`Failed to get video metadata: ${error.message || 'Unknown error'}`));
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);
    
    // Set video source
    if (typeof videoSource === 'string') {
      video.src = videoSource;
    } else if (videoSource instanceof File) {
      video.src = URL.createObjectURL(videoSource);
    } else {
      reject(new Error('Invalid video source. Must be a File object or URL string.'));
      return;
    }
    
    video.load();
    
    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Video metadata loading timed out'));
    }, 10000);
  });
};

export default {
  generateVideoThumbnail,
  generateVideoThumbnails,
  isVideoThumbnailSupported,
  getVideoMetadata
};