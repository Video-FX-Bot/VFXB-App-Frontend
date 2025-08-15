import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

class CloudinaryService {
  constructor() {
    this.isConfigured = false;
    this.initializeCloudinary();
  }

  initializeCloudinary() {
    try {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });
      
      this.isConfigured = true;
      logger.info('Cloudinary configured successfully');
    } catch (error) {
      logger.error('Failed to configure Cloudinary:', error);
      this.isConfigured = false;
    }
  }

  // Upload video to Cloudinary
  async uploadVideo(filePath, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      const {
        public_id,
        folder = 'vfxb/videos',
        resource_type = 'video',
        quality = 'auto',
        format = 'mp4'
      } = options;

      const uploadOptions = {
        resource_type,
        folder,
        quality,
        format,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        ...options
      };

      if (public_id) {
        uploadOptions.public_id = public_id;
      }

      logger.info('Uploading video to Cloudinary:', { filePath, options: uploadOptions });
      
      const result = await cloudinary.uploader.upload(filePath, uploadOptions);
      
      logger.info('Video uploaded successfully:', {
        public_id: result.public_id,
        url: result.secure_url,
        duration: result.duration,
        format: result.format
      });

      return {
        success: true,
        public_id: result.public_id,
        url: result.secure_url,
        secure_url: result.secure_url,
        format: result.format,
        duration: result.duration,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        created_at: result.created_at
      };
    } catch (error) {
      logger.error('Error uploading video to Cloudinary:', error);
      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  // Upload image to Cloudinary
  async uploadImage(filePath, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      const {
        public_id,
        folder = 'vfxb/images',
        resource_type = 'image',
        quality = 'auto',
        format = 'auto'
      } = options;

      const uploadOptions = {
        resource_type,
        folder,
        quality,
        format,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        ...options
      };

      if (public_id) {
        uploadOptions.public_id = public_id;
      }

      logger.info('Uploading image to Cloudinary:', { filePath, options: uploadOptions });
      
      const result = await cloudinary.uploader.upload(filePath, uploadOptions);
      
      logger.info('Image uploaded successfully:', {
        public_id: result.public_id,
        url: result.secure_url,
        format: result.format
      });

      return {
        success: true,
        public_id: result.public_id,
        url: result.secure_url,
        secure_url: result.secure_url,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        created_at: result.created_at
      };
    } catch (error) {
      logger.error('Error uploading image to Cloudinary:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  // Generate optimized video URL
  generateVideoUrl(publicId, transformations = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      const {
        quality = 'auto',
        format = 'auto',
        width,
        height,
        crop = 'scale',
        ...otherTransformations
      } = transformations;

      const urlOptions = {
        resource_type: 'video',
        quality,
        format,
        crop,
        ...otherTransformations
      };

      if (width) urlOptions.width = width;
      if (height) urlOptions.height = height;

      return cloudinary.url(publicId, urlOptions);
    } catch (error) {
      logger.error('Error generating video URL:', error);
      throw new Error(`Failed to generate video URL: ${error.message}`);
    }
  }

  // Generate optimized image URL
  generateImageUrl(publicId, transformations = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      const {
        quality = 'auto',
        format = 'auto',
        width,
        height,
        crop = 'scale',
        ...otherTransformations
      } = transformations;

      const urlOptions = {
        resource_type: 'image',
        quality,
        format,
        crop,
        ...otherTransformations
      };

      if (width) urlOptions.width = width;
      if (height) urlOptions.height = height;

      return cloudinary.url(publicId, urlOptions);
    } catch (error) {
      logger.error('Error generating image URL:', error);
      throw new Error(`Failed to generate image URL: ${error.message}`);
    }
  }

  // Delete resource from Cloudinary
  async deleteResource(publicId, resourceType = 'video') {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      logger.info('Deleting resource from Cloudinary:', { publicId, resourceType });
      
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });
      
      logger.info('Resource deleted successfully:', result);
      
      return {
        success: result.result === 'ok',
        result: result.result
      };
    } catch (error) {
      logger.error('Error deleting resource from Cloudinary:', error);
      throw new Error(`Failed to delete resource: ${error.message}`);
    }
  }

  // Get resource details
  async getResourceDetails(publicId, resourceType = 'video') {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType
      });
      
      return {
        success: true,
        public_id: result.public_id,
        url: result.secure_url,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        duration: result.duration,
        created_at: result.created_at,
        updated_at: result.updated_at
      };
    } catch (error) {
      logger.error('Error getting resource details:', error);
      throw new Error(`Failed to get resource details: ${error.message}`);
    }
  }

  // Apply video transformations
  async transformVideo(publicId, transformations) {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      const {
        width,
        height,
        crop = 'scale',
        quality = 'auto',
        format = 'mp4',
        effect,
        overlay,
        ...otherTransformations
      } = transformations;

      const transformOptions = {
        resource_type: 'video',
        crop,
        quality,
        format,
        ...otherTransformations
      };

      if (width) transformOptions.width = width;
      if (height) transformOptions.height = height;
      if (effect) transformOptions.effect = effect;
      if (overlay) transformOptions.overlay = overlay;

      const transformedUrl = cloudinary.url(publicId, transformOptions);
      
      return {
        success: true,
        url: transformedUrl,
        transformations: transformOptions
      };
    } catch (error) {
      logger.error('Error transforming video:', error);
      throw new Error(`Failed to transform video: ${error.message}`);
    }
  }

  // Check if Cloudinary is properly configured
  isReady() {
    return this.isConfigured;
  }

  // Get upload signature for client-side uploads
  generateUploadSignature(params = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      const timestamp = Math.round(new Date().getTime() / 1000);
      const paramsToSign = {
        timestamp,
        ...params
      };

      const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET
      );

      return {
        signature,
        timestamp,
        api_key: process.env.CLOUDINARY_API_KEY,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME
      };
    } catch (error) {
      logger.error('Error generating upload signature:', error);
      throw new Error(`Failed to generate upload signature: ${error.message}`);
    }
  }
}

// Create and export singleton instance
const cloudinaryService = new CloudinaryService();
export default cloudinaryService;
export { CloudinaryService };