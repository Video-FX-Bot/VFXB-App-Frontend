import express from "express";
import VideoEnhancementService from "../services/videoEnhancementService.js";
import { Video } from "../models/Video.js";
import { authenticateToken, logActivity } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import path from "path";
import fs from "fs/promises";

const router = express.Router();
const enhancementService = new VideoEnhancementService();

// @route   POST /api/video-edit/:id/analyze-quality
// @desc    Analyze video quality and get improvement recommendations
// @access  Private
router.post(
  "/:id/analyze-quality",
  authenticateToken,
  logActivity("analyze_quality"),
  async (req, res) => {
    try {
      const video = await Video.findById(req.params.id);

      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      // Check permissions
      const videoUserId = video.userId?.toString() || video.userId;
      const requestUserId = req.user.id?.toString() || req.user.id;

      if (videoUserId !== requestUserId) {
        return res.status(403).json({
          success: false,
          message: "Permission denied",
        });
      }

      logger.info(`📊 Analyzing video quality: ${video._id}`);

      const analysis = await enhancementService.analyzeVideoQuality(
        video.filePath
      );

      res.json({
        success: true,
        message: "Video quality analyzed successfully",
        data: analysis,
      });
    } catch (error) {
      logger.error("Error analyzing video quality:", error);
      res.status(500).json({
        success: false,
        message: "Failed to analyze video quality",
        error: error.message,
      });
    }
  }
);

// @route   POST /api/video-edit/:id/enhance-quality
// @desc    Enhance video quality with custom options
// @access  Private
router.post(
  "/:id/enhance-quality",
  authenticateToken,
  logActivity("enhance_quality"),
  async (req, res) => {
    try {
      const { options = {} } = req.body;

      const video = await Video.findById(req.params.id);

      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      // Check permissions
      const videoUserId = video.userId?.toString() || video.userId;
      const requestUserId = req.user.id?.toString() || req.user.id;

      if (videoUserId !== requestUserId) {
        return res.status(403).json({
          success: false,
          message: "Permission denied",
        });
      }

      if (video.status !== "ready") {
        return res.status(400).json({
          success: false,
          message: "Video is not ready for enhancement",
        });
      }

      logger.info(`🎨 Enhancing video quality: ${video._id}`);
      logger.info(`Options:`, options);

      // Start enhancement process
      const result = await enhancementService.enhanceVideoQuality(
        video.filePath,
        options
      );

      // Move the file from temp to videos directory
      const filename = `enhanced_${video._id}_${Date.now()}.mp4`;
      const videosDir = path.join(
        process.cwd(),
        process.env.UPLOAD_PATH || "uploads",
        "videos"
      );
      const finalPath = path.join(videosDir, filename);

      await fs.copyFile(result.outputPath, finalPath);
      await fs.unlink(result.outputPath);

      // Get file size
      const stats = await fs.stat(finalPath);
      const fileSize = stats.size;

      // Create new video record
      const videoId = `video_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const enhancedVideo = new Video({
        _id: videoId,
        title: `${video.title} (Enhanced)`,
        description: video.description,
        tags: [...video.tags, "enhanced", "quality-improved"],
        userId: video.userId,
        originalFilename: filename,
        filename: filename,
        filePath: finalPath,
        fileSize: fileSize,
        mimeType: video.mimeType,
        metadata: {
          ...video.metadata,
          isEnhanced: true,
          enhancementOptions: options,
          appliedFilters: result.appliedFilters,
        },
        parentVideoId: video._id,
        status: "ready",
      });

      await enhancedVideo.save();

      res.json({
        success: true,
        message: "Video quality enhanced successfully",
        data: {
          videoId: enhancedVideo._id,
          downloadUrl: `/api/videos/${enhancedVideo._id}/stream`,
          thumbnailUrl: `/api/videos/${enhancedVideo._id}/thumbnail`,
          appliedFilters: result.appliedFilters,
        },
      });
    } catch (error) {
      logger.error("Error enhancing video quality:", error);
      res.status(500).json({
        success: false,
        message: "Failed to enhance video quality",
        error: error.message,
      });
    }
  }
);

// @route   POST /api/video-edit/:id/quick-enhance
// @desc    Quick enhance video with standard preset
// @access  Private
router.post(
  "/:id/quick-enhance",
  authenticateToken,
  logActivity("quick_enhance"),
  async (req, res) => {
    try {
      const video = await Video.findById(req.params.id);

      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      // Check permissions
      const videoUserId = video.userId?.toString() || video.userId;
      const requestUserId = req.user.id?.toString() || req.user.id;

      if (videoUserId !== requestUserId) {
        return res.status(403).json({
          success: false,
          message: "Permission denied",
        });
      }

      logger.info(`⚡ Quick enhancing video: ${video._id}`);

      // Apply quick enhancement
      const result = await enhancementService.quickEnhance(video.filePath);

      // Move the file from temp to videos directory
      const filename = `enhanced_quick_${video._id}_${Date.now()}.mp4`;
      const videosDir = path.join(
        process.cwd(),
        process.env.UPLOAD_PATH || "uploads",
        "videos"
      );
      const finalPath = path.join(videosDir, filename);

      await fs.copyFile(result.outputPath, finalPath);
      await fs.unlink(result.outputPath);

      // Get file size
      const stats = await fs.stat(finalPath);
      const fileSize = stats.size;

      // Create new video record
      const videoId = `video_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const enhancedVideo = new Video({
        _id: videoId,
        title: `${video.title} (Quick Enhanced)`,
        description: video.description,
        tags: [...video.tags, "enhanced", "quick-enhance"],
        userId: video.userId,
        originalFilename: filename,
        filename: filename,
        filePath: finalPath,
        fileSize: fileSize,
        mimeType: video.mimeType,
        metadata: {
          ...video.metadata,
          isEnhanced: true,
          enhancementType: "quick",
        },
        parentVideoId: video._id,
        status: "ready",
      });

      await enhancedVideo.save();

      res.json({
        success: true,
        message: "Video quick enhanced successfully",
        data: {
          videoId: enhancedVideo._id,
          downloadUrl: `/api/videos/${enhancedVideo._id}/stream`,
          thumbnailUrl: `/api/videos/${enhancedVideo._id}/thumbnail`,
        },
      });
    } catch (error) {
      logger.error("Error quick enhancing video:", error);
      res.status(500).json({
        success: false,
        message: "Failed to quick enhance video",
        error: error.message,
      });
    }
  }
);

// @route   POST /api/video-edit/:id/professional-enhance
// @desc    Professional enhance video with high-quality preset
// @access  Private
router.post(
  "/:id/professional-enhance",
  authenticateToken,
  logActivity("professional_enhance"),
  async (req, res) => {
    try {
      const video = await Video.findById(req.params.id);

      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      // Check permissions
      const videoUserId = video.userId?.toString() || video.userId;
      const requestUserId = req.user.id?.toString() || req.user.id;

      if (videoUserId !== requestUserId) {
        return res.status(403).json({
          success: false,
          message: "Permission denied",
        });
      }

      logger.info(`💎 Professional enhancing video: ${video._id}`);

      // Apply professional enhancement
      const result = await enhancementService.professionalEnhance(
        video.filePath
      );

      // Move the file from temp to videos directory
      const filename = `enhanced_pro_${video._id}_${Date.now()}.mp4`;
      const videosDir = path.join(
        process.cwd(),
        process.env.UPLOAD_PATH || "uploads",
        "videos"
      );
      const finalPath = path.join(videosDir, filename);

      await fs.copyFile(result.outputPath, finalPath);
      await fs.unlink(result.outputPath);

      // Get file size
      const stats = await fs.stat(finalPath);
      const fileSize = stats.size;

      // Create new video record
      const videoId = `video_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const enhancedVideo = new Video({
        _id: videoId,
        title: `${video.title} (Professional Enhanced)`,
        description: video.description,
        tags: [...video.tags, "enhanced", "professional", "upscaled"],
        userId: video.userId,
        originalFilename: filename,
        filename: filename,
        filePath: finalPath,
        fileSize: fileSize,
        mimeType: video.mimeType,
        metadata: {
          ...video.metadata,
          isEnhanced: true,
          enhancementType: "professional",
        },
        parentVideoId: video._id,
        status: "ready",
      });

      await enhancedVideo.save();

      res.json({
        success: true,
        message: "Video professionally enhanced successfully",
        data: {
          videoId: enhancedVideo._id,
          downloadUrl: `/api/videos/${enhancedVideo._id}/stream`,
          thumbnailUrl: `/api/videos/${enhancedVideo._id}/thumbnail`,
        },
      });
    } catch (error) {
      logger.error("Error professional enhancing video:", error);
      res.status(500).json({
        success: false,
        message: "Failed to professionally enhance video",
        error: error.message,
      });
    }
  }
);

export default router;
