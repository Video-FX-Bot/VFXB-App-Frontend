import express from 'express';
import { VideoProcessor } from '../services/videoProcessor.js';
import { Video } from '../models/Video.js';
import { authenticateToken, checkSubscriptionLimits, logActivity } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const videoProcessor = new VideoProcessor();

// Rate limiting for video editing operations
const editLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each user to 50 edit operations per 15 minutes
  message: {
    success: false,
    message: 'Too many edit requests. Please try again later.'
  }
});

// @route   POST /api/video-edit/:id/trim
// @desc    Trim video to specified time range
// @access  Private
router.post('/:id/trim',
  authenticateToken,
  editLimiter,
  checkSubscriptionLimits('video_edit'),
  logActivity('video_trim'),
  async (req, res) => {
    try {
      const { startTime, endTime, duration } = req.body;
      
      if (!startTime && !endTime && !duration) {
        return res.status(400).json({
          success: false,
          message: 'Start time, end time, or duration is required'
        });
      }

      const video = await Video.findById(req.params.id);
      
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      // Check edit permissions
      if (!video.canAccess(req.user.id, 'editor')) {
        return res.status(403).json({
          success: false,
          message: 'Edit permission denied'
        });
      }

      if (video.status !== 'ready') {
        return res.status(400).json({
          success: false,
          message: 'Video is not ready for editing'
        });
      }

      // Process video trimming
      const result = await videoProcessor.trimVideo(video.filePath, {
        startTime: parseFloat(startTime) || 0,
        endTime: endTime ? parseFloat(endTime) : undefined,
        duration: duration ? parseFloat(duration) : undefined
      });

      // Create new video version
      const trimmedVideo = new Video({
        title: `${video.title} (Trimmed)`,
        description: video.description,
        tags: [...video.tags, 'trimmed'],
        userId: req.user.id,
        originalFilename: `trimmed_${video.originalFilename}`,
        filename: result.outputPath.split('/').pop(),
        filePath: result.outputPath,
        fileSize: 0, // Will be calculated
        mimeType: video.mimeType,
        visibility: video.visibility,
        parentVideoId: video._id,
        editHistory: [{
          operation: 'trim',
          parameters: { startTime, endTime, duration },
          timestamp: new Date()
        }],
        status: 'processing'
      });

      await trimmedVideo.save();

      // Update user usage
      await req.user.incrementUsage('video_edit', 1);

      logger.info(`Video trimmed: ${video._id} -> ${trimmedVideo._id} by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Video trimmed successfully',
        data: {
          originalVideo: video._id,
          trimmedVideo: trimmedVideo._id,
          outputPath: result.outputPath,
          operation: result.operation,
          parameters: result.parameters
        }
      });

    } catch (error) {
      logger.error('Video trim error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trim video',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   POST /api/video-edit/:id/crop
// @desc    Crop video to specified dimensions
// @access  Private
router.post('/:id/crop',
  authenticateToken,
  editLimiter,
  checkSubscriptionLimits('video_edit'),
  logActivity('video_crop'),
  async (req, res) => {
    try {
      const { width, height, x = 0, y = 0 } = req.body;
      
      if (!width || !height) {
        return res.status(400).json({
          success: false,
          message: 'Width and height are required'
        });
      }

      const video = await Video.findById(req.params.id);
      
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      // Check edit permissions
      if (!video.canAccess(req.user.id, 'editor')) {
        return res.status(403).json({
          success: false,
          message: 'Edit permission denied'
        });
      }

      if (video.status !== 'ready') {
        return res.status(400).json({
          success: false,
          message: 'Video is not ready for editing'
        });
      }

      // Process video cropping
      const result = await videoProcessor.cropVideo(video.filePath, {
        width: parseInt(width),
        height: parseInt(height),
        x: parseInt(x),
        y: parseInt(y)
      });

      // Create new video version
      const croppedVideo = new Video({
        title: `${video.title} (Cropped)`,
        description: video.description,
        tags: [...video.tags, 'cropped'],
        userId: req.user.id,
        originalFilename: `cropped_${video.originalFilename}`,
        filename: result.outputPath.split('/').pop(),
        filePath: result.outputPath,
        fileSize: 0, // Will be calculated
        mimeType: video.mimeType,
        visibility: video.visibility,
        parentVideoId: video._id,
        editHistory: [{
          operation: 'crop',
          parameters: { width, height, x, y },
          timestamp: new Date()
        }],
        status: 'processing'
      });

      await croppedVideo.save();

      // Update user usage
      await req.user.incrementUsage('video_edit', 1);

      logger.info(`Video cropped: ${video._id} -> ${croppedVideo._id} by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Video cropped successfully',
        data: {
          originalVideo: video._id,
          croppedVideo: croppedVideo._id,
          outputPath: result.outputPath,
          operation: result.operation,
          parameters: result.parameters
        }
      });

    } catch (error) {
      logger.error('Video crop error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to crop video',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   POST /api/video-edit/:id/split
// @desc    Split video at specified time
// @access  Private
router.post('/:id/split',
  authenticateToken,
  editLimiter,
  checkSubscriptionLimits('video_edit'),
  logActivity('video_split'),
  async (req, res) => {
    try {
      const { splitTime } = req.body;
      
      if (!splitTime) {
        return res.status(400).json({
          success: false,
          message: 'Split time is required'
        });
      }

      const video = await Video.findById(req.params.id);
      
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      // Check edit permissions
      if (!video.canAccess(req.user.id, 'editor')) {
        return res.status(403).json({
          success: false,
          message: 'Edit permission denied'
        });
      }

      if (video.status !== 'ready') {
        return res.status(400).json({
          success: false,
          message: 'Video is not ready for editing'
        });
      }

      const splitTimeFloat = parseFloat(splitTime);
      
      // Create first part (0 to splitTime)
      const firstPartResult = await videoProcessor.trimVideo(video.filePath, {
        startTime: 0,
        endTime: splitTimeFloat
      });

      // Create second part (splitTime to end)
      const secondPartResult = await videoProcessor.trimVideo(video.filePath, {
        startTime: splitTimeFloat
      });

      // Create first video part
      const firstVideo = new Video({
        title: `${video.title} (Part 1)`,
        description: video.description,
        tags: [...video.tags, 'split', 'part1'],
        userId: req.user.id,
        originalFilename: `part1_${video.originalFilename}`,
        filename: firstPartResult.outputPath.split('/').pop(),
        filePath: firstPartResult.outputPath,
        fileSize: 0,
        mimeType: video.mimeType,
        visibility: video.visibility,
        parentVideoId: video._id,
        editHistory: [{
          operation: 'split',
          parameters: { splitTime, part: 1 },
          timestamp: new Date()
        }],
        status: 'processing'
      });

      // Create second video part
      const secondVideo = new Video({
        title: `${video.title} (Part 2)`,
        description: video.description,
        tags: [...video.tags, 'split', 'part2'],
        userId: req.user.id,
        originalFilename: `part2_${video.originalFilename}`,
        filename: secondPartResult.outputPath.split('/').pop(),
        filePath: secondPartResult.outputPath,
        fileSize: 0,
        mimeType: video.mimeType,
        visibility: video.visibility,
        parentVideoId: video._id,
        editHistory: [{
          operation: 'split',
          parameters: { splitTime, part: 2 },
          timestamp: new Date()
        }],
        status: 'processing'
      });

      await firstVideo.save();
      await secondVideo.save();

      // Update user usage
      await req.user.incrementUsage('video_edit', 2);

      logger.info(`Video split: ${video._id} -> ${firstVideo._id}, ${secondVideo._id} by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Video split successfully',
        data: {
          originalVideo: video._id,
          firstPart: {
            id: firstVideo._id,
            outputPath: firstPartResult.outputPath
          },
          secondPart: {
            id: secondVideo._id,
            outputPath: secondPartResult.outputPath
          },
          splitTime: splitTimeFloat
        }
      });

    } catch (error) {
      logger.error('Video split error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to split video',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   POST /api/video-edit/:id/apply-effect
// @desc    Apply visual effect to video
// @access  Private
router.post('/:id/apply-effect',
  authenticateToken,
  editLimiter,
  checkSubscriptionLimits('video_edit'),
  logActivity('video_effect'),
  async (req, res) => {
    try {
      const { effectType, parameters = {} } = req.body;
      
      if (!effectType) {
        return res.status(400).json({
          success: false,
          message: 'Effect type is required'
        });
      }

      const video = await Video.findById(req.params.id);
      
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      // Check edit permissions
      if (!video.canAccess(req.user.id, 'editor')) {
        return res.status(403).json({
          success: false,
          message: 'Edit permission denied'
        });
      }

      if (video.status !== 'ready') {
        return res.status(400).json({
          success: false,
          message: 'Video is not ready for editing'
        });
      }

      let result;
      
      // Apply different effects based on type
      switch (effectType) {
        case 'transition':
          result = await videoProcessor.addTransition(video.filePath, parameters);
          break;
        case 'background':
          result = await videoProcessor.processBackground(video.filePath, parameters);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Unsupported effect type'
          });
      }

      // Create new video with effect applied
      const effectVideo = new Video({
        title: `${video.title} (${effectType})`,
        description: video.description,
        tags: [...video.tags, effectType, 'effect'],
        userId: req.user.id,
        originalFilename: `${effectType}_${video.originalFilename}`,
        filename: result.outputPath.split('/').pop(),
        filePath: result.outputPath,
        fileSize: 0,
        mimeType: video.mimeType,
        visibility: video.visibility,
        parentVideoId: video._id,
        editHistory: [{
          operation: 'apply_effect',
          parameters: { effectType, ...parameters },
          timestamp: new Date()
        }],
        status: 'processing'
      });

      await effectVideo.save();

      // Update user usage
      await req.user.incrementUsage('video_edit', 1);

      logger.info(`Effect applied: ${effectType} to ${video._id} -> ${effectVideo._id} by user ${req.user.id}`);

      res.json({
        success: true,
        message: `${effectType} effect applied successfully`,
        data: {
          originalVideo: video._id,
          effectVideo: effectVideo._id,
          outputPath: result.outputPath,
          operation: result.operation,
          parameters: result.parameters
        }
      });

    } catch (error) {
      logger.error('Video effect error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply effect',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   POST /api/video-edit/merge
// @desc    Merge multiple videos into one
// @access  Private
router.post('/merge',
  authenticateToken,
  editLimiter,
  checkSubscriptionLimits('video_edit'),
  logActivity('video_merge'),
  async (req, res) => {
    try {
      const { videoIds, title = 'Merged Video' } = req.body;
      
      if (!videoIds || !Array.isArray(videoIds) || videoIds.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least 2 video IDs are required for merging'
        });
      }

      // Fetch all videos
      const videos = await Promise.all(
        videoIds.map(id => Video.findById(id))
      );

      // Check if all videos exist and user has access
      for (const video of videos) {
        if (!video) {
          return res.status(404).json({
            success: false,
            message: 'One or more videos not found'
          });
        }

        if (!video.canAccess(req.user.id, 'editor')) {
          return res.status(403).json({
            success: false,
            message: 'Edit permission denied for one or more videos'
          });
        }

        if (video.status !== 'ready') {
          return res.status(400).json({
            success: false,
            message: 'One or more videos are not ready for editing'
          });
        }
      }

      // Merge videos using video processor
      const videoPaths = videos.map(v => v.filePath);
      const result = await videoProcessor.mergeVideos(videoPaths, { title });

      // Create merged video record
      const mergedVideo = new Video({
        title: title,
        description: `Merged from ${videos.length} videos`,
        tags: ['merged', ...videos.flatMap(v => v.tags)],
        userId: req.user.id,
        originalFilename: `merged_${Date.now()}.mp4`,
        filename: result.outputPath.split('/').pop(),
        filePath: result.outputPath,
        fileSize: 0,
        mimeType: 'video/mp4',
        visibility: 'private',
        editHistory: [{
          operation: 'merge',
          parameters: { videoIds, sourceVideos: videos.map(v => v._id) },
          timestamp: new Date()
        }],
        status: 'processing'
      });

      await mergedVideo.save();

      // Update user usage
      await req.user.incrementUsage('video_edit', videoIds.length);

      logger.info(`Videos merged: [${videoIds.join(', ')}] -> ${mergedVideo._id} by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Videos merged successfully',
        data: {
          sourceVideos: videoIds,
          mergedVideo: mergedVideo._id,
          outputPath: result.outputPath,
          operation: result.operation
        }
      });

    } catch (error) {
      logger.error('Video merge error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to merge videos',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;