import Replicate from 'replicate';
import { logger } from '../utils/logger.js';

class ReplicateService {
  constructor() {
    this.replicate = null;
    this.isConfigured = false;
    this.initializeReplicate();
  }

  initializeReplicate() {
    try {
      if (!process.env.REPLICATE_API_TOKEN) {
        logger.warn('Replicate API token not provided - AI video processing will be unavailable');
        return;
      }

      this.replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      });
      
      this.isConfigured = true;
      logger.info('Replicate service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Replicate service:', error);
      this.isConfigured = false;
    }
  }

  // Video upscaling using Real-ESRGAN
  async upscaleVideo(videoUrl, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Replicate service not configured');
      }

      const {
        scale = 2,
        face_enhance = false,
        model = 'realesr-general-x4v3'
      } = options;

      logger.info('Starting video upscaling:', { videoUrl, scale, model });

      const output = await this.replicate.run(
        "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
        {
          input: {
            image: videoUrl,
            scale,
            face_enhance,
            model
          }
        }
      );

      logger.info('Video upscaling completed:', { output });

      return {
        success: true,
        output_url: output,
        scale,
        model
      };
    } catch (error) {
      logger.error('Error upscaling video:', error);
      throw new Error(`Failed to upscale video: ${error.message}`);
    }
  }

  // Video style transfer
  async styleTransfer(videoUrl, styleUrl, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Replicate service not configured');
      }

      const {
        strength = 0.8,
        preserve_original_colors = false
      } = options;

      logger.info('Starting video style transfer:', { videoUrl, styleUrl, strength });

      const output = await this.replicate.run(
        "replicate/video-style-transfer:7af9dd7fb3c0b5b8c7ab9b0d1c5c5b5c7ab9b0d1c5c5b5c7ab9b0d1c5c5b5c",
        {
          input: {
            video: videoUrl,
            style_image: styleUrl,
            strength,
            preserve_original_colors
          }
        }
      );

      logger.info('Video style transfer completed:', { output });

      return {
        success: true,
        output_url: output,
        style_url: styleUrl,
        strength
      };
    } catch (error) {
      logger.error('Error applying style transfer:', error);
      throw new Error(`Failed to apply style transfer: ${error.message}`);
    }
  }

  // Video colorization
  async colorizeVideo(videoUrl, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Replicate service not configured');
      }

      logger.info('Starting video colorization:', { videoUrl });

      const output = await this.replicate.run(
        "cjwbw/video-colorization:4b8d701b0d2b4c8d9e1f2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8",
        {
          input: {
            video: videoUrl,
            ...options
          }
        }
      );

      logger.info('Video colorization completed:', { output });

      return {
        success: true,
        output_url: output
      };
    } catch (error) {
      logger.error('Error colorizing video:', error);
      throw new Error(`Failed to colorize video: ${error.message}`);
    }
  }

  // Video background removal
  async removeBackground(videoUrl, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Replicate service not configured');
      }

      logger.info('Starting background removal:', { videoUrl });

      const output = await this.replicate.run(
        "arielreplicate/robust_video_matting:7af9dd7fb3c0b5b8c7ab9b0d1c5c5b5c7ab9b0d1c5c5b5c7ab9b0d1c5c5b5c",
        {
          input: {
            video: videoUrl,
            ...options
          }
        }
      );

      logger.info('Background removal completed:', { output });

      return {
        success: true,
        output_url: output
      };
    } catch (error) {
      logger.error('Error removing background:', error);
      throw new Error(`Failed to remove background: ${error.message}`);
    }
  }

  // Video interpolation (frame rate increase)
  async interpolateFrames(videoUrl, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Replicate service not configured');
      }

      const {
        target_fps = 60,
        interpolation_factor = 2
      } = options;

      logger.info('Starting frame interpolation:', { videoUrl, target_fps });

      const output = await this.replicate.run(
        "damo-vilab/video-frame-interpolation:7af9dd7fb3c0b5b8c7ab9b0d1c5c5b5c7ab9b0d1c5c5b5c7ab9b0d1c5c5b5c",
        {
          input: {
            video: videoUrl,
            target_fps,
            interpolation_factor,
            ...options
          }
        }
      );

      logger.info('Frame interpolation completed:', { output });

      return {
        success: true,
        output_url: output,
        target_fps,
        interpolation_factor
      };
    } catch (error) {
      logger.error('Error interpolating frames:', error);
      throw new Error(`Failed to interpolate frames: ${error.message}`);
    }
  }

  // Video stabilization
  async stabilizeVideo(videoUrl, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Replicate service not configured');
      }

      const {
        smoothness = 0.5,
        crop_black_borders = true
      } = options;

      logger.info('Starting video stabilization:', { videoUrl, smoothness });

      const output = await this.replicate.run(
        "stability-ai/video-stabilization:7af9dd7fb3c0b5b8c7ab9b0d1c5c5b5c7ab9b0d1c5c5b5c7ab9b0d1c5c5b5c",
        {
          input: {
            video: videoUrl,
            smoothness,
            crop_black_borders,
            ...options
          }
        }
      );

      logger.info('Video stabilization completed:', { output });

      return {
        success: true,
        output_url: output,
        smoothness
      };
    } catch (error) {
      logger.error('Error stabilizing video:', error);
      throw new Error(`Failed to stabilize video: ${error.message}`);
    }
  }

  // Generate video from text prompt
  async generateVideoFromText(prompt, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Replicate service not configured');
      }

      const {
        duration = 3,
        fps = 24,
        width = 512,
        height = 512,
        guidance_scale = 7.5,
        num_inference_steps = 50
      } = options;

      logger.info('Starting text-to-video generation:', { prompt, duration, fps });

      const output = await this.replicate.run(
        "anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
        {
          input: {
            prompt,
            duration,
            fps,
            width,
            height,
            guidance_scale,
            num_inference_steps,
            ...options
          }
        }
      );

      logger.info('Text-to-video generation completed:', { output });

      return {
        success: true,
        output_url: output,
        prompt,
        duration,
        fps
      };
    } catch (error) {
      logger.error('Error generating video from text:', error);
      throw new Error(`Failed to generate video from text: ${error.message}`);
    }
  }

  // Get prediction status
  async getPredictionStatus(predictionId) {
    try {
      if (!this.isConfigured) {
        throw new Error('Replicate service not configured');
      }

      const prediction = await this.replicate.predictions.get(predictionId);
      
      return {
        id: prediction.id,
        status: prediction.status,
        output: prediction.output,
        error: prediction.error,
        logs: prediction.logs,
        created_at: prediction.created_at,
        completed_at: prediction.completed_at
      };
    } catch (error) {
      logger.error('Error getting prediction status:', error);
      throw new Error(`Failed to get prediction status: ${error.message}`);
    }
  }

  // Cancel prediction
  async cancelPrediction(predictionId) {
    try {
      if (!this.isConfigured) {
        throw new Error('Replicate service not configured');
      }

      const prediction = await this.replicate.predictions.cancel(predictionId);
      
      return {
        success: true,
        id: prediction.id,
        status: prediction.status
      };
    } catch (error) {
      logger.error('Error canceling prediction:', error);
      throw new Error(`Failed to cancel prediction: ${error.message}`);
    }
  }

  // Check if service is ready
  isReady() {
    return this.isConfigured;
  }

  // Get available models
  async getAvailableModels() {
    try {
      if (!this.isConfigured) {
        throw new Error('Replicate service not configured');
      }

      // Return a curated list of video processing models
      return {
        upscaling: [
          {
            name: 'Real-ESRGAN',
            id: 'nightmareai/real-esrgan',
            description: 'High-quality video upscaling'
          }
        ],
        style_transfer: [
          {
            name: 'Video Style Transfer',
            id: 'replicate/video-style-transfer',
            description: 'Apply artistic styles to videos'
          }
        ],
        generation: [
          {
            name: 'Zeroscope V2 XL',
            id: 'anotherjesse/zeroscope-v2-xl',
            description: 'Generate videos from text prompts'
          }
        ],
        enhancement: [
          {
            name: 'Video Stabilization',
            id: 'stability-ai/video-stabilization',
            description: 'Stabilize shaky videos'
          },
          {
            name: 'Frame Interpolation',
            id: 'damo-vilab/video-frame-interpolation',
            description: 'Increase video frame rate'
          }
        ]
      };
    } catch (error) {
      logger.error('Error getting available models:', error);
      throw new Error(`Failed to get available models: ${error.message}`);
    }
  }
}

// Create and export singleton instance
const replicateService = new ReplicateService();

// Reinitialize after environment variables are loaded
setTimeout(() => {
  replicateService.initializeReplicate();
}, 100);

export default replicateService;
export { ReplicateService };