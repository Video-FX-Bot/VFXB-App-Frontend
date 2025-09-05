import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger.js';

// Cloudinary configuration
const configureCloudinary = () => {
  try {
    // Only configure if API keys are provided
    if (process.env.CLOUDINARY_CLOUD_NAME && 
        process.env.CLOUDINARY_API_KEY && 
        process.env.CLOUDINARY_API_SECRET) {
      
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });
      
      logger.info('Cloudinary configured successfully');
      return true;
    } else {
      logger.warn('Cloudinary credentials not provided - using local storage for demo');
      return false;
    }
  } catch (error) {
    logger.error('Failed to configure Cloudinary:', error);
    return false;
  }
};

// Initialize Cloudinary
const isCloudinaryConfigured = configureCloudinary();

// Upload file to Cloudinary
export const uploadToCloudinary = async (filePath, options = {}) => {
  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary not configured - using local storage for demo');
  }
  
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'auto',
      folder: 'vfxb',
      ...options
    });
    
    return {
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration
    };
  } catch (error) {
    logger.error('Cloudinary upload failed:', error);
    throw error;
  }
};

// Delete file from Cloudinary
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!isCloudinaryConfigured) {
    logger.warn('Cloudinary not configured - skipping delete operation');
    return { result: 'ok' };
  }
  
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    
    return result;
  } catch (error) {
    logger.error('Cloudinary delete failed:', error);
    throw error;
  }
};

// Generate transformation URL
export const getTransformationUrl = (publicId, transformations = {}) => {
  if (!isCloudinaryConfigured) {
    return null;
  }
  
  try {
    return cloudinary.url(publicId, {
      secure: true,
      ...transformations
    });
  } catch (error) {
    logger.error('Failed to generate transformation URL:', error);
    return null;
  }
};

// Get video thumbnail
export const getVideoThumbnail = (publicId, options = {}) => {
  if (!isCloudinaryConfigured) {
    return null;
  }
  
  return cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'jpg',
    transformation: [
      { width: 300, height: 200, crop: 'fill' },
      { quality: 'auto' }
    ],
    secure: true,
    ...options
  });
};

// Check if Cloudinary is available
export const isCloudinaryAvailable = () => {
  return isCloudinaryConfigured;
};

export default cloudinary;