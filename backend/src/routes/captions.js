import express from "express";
import CaptionService from "../services/captionService.js";
import { Video } from "../models/Video.js";
import { authenticateToken, logActivity } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import path from "path";
import fs from "fs/promises";

const router = express.Router();
const captionService = new CaptionService();

// @route   POST /api/video-edit/:id/generate-captions
// @desc    Generate captions from video audio
// @access  Private
router.post(
  "/:id/generate-captions",
  authenticateToken,
  logActivity("generate_captions"),
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

      logger.info(`🎤 Generating captions for video: ${video._id}`);

      // Generate captions
      const result = await captionService.generateCaptions(video.filePath);

      // Save captions to video metadata
      video.metadata.captions = result.captions;
      video.metadata.captionLanguage = result.language;
      await video.save();

      res.json({
        success: true,
        message: "Captions generated successfully",
        data: {
          captions: result.captions,
          language: result.language,
          duration: result.duration,
        },
      });
    } catch (error) {
      logger.error("Error generating captions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate captions",
        error: error.message,
      });
    }
  }
);

// @route   POST /api/video-edit/:id/apply-captions
// @desc    Apply captions to video with custom styling
// @access  Private
router.post(
  "/:id/apply-captions",
  authenticateToken,
  logActivity("apply_captions"),
  async (req, res) => {
    try {
      const { captions, style } = req.body;

      if (!captions || !Array.isArray(captions)) {
        return res.status(400).json({
          success: false,
          message: "Captions array is required",
        });
      }

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

      logger.info(`📝 Applying captions to video: ${video._id}`);

      // Apply captions with styling
      const result = await captionService.applyCaptionsToVideo(
        video.filePath,
        captions,
        style
      );

      // Move the file from temp to videos directory
      const filename = `captioned_${video._id}_${Date.now()}.mp4`;
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

      const captionedVideo = new Video({
        _id: videoId,
        title: `${video.title} (With Captions)`,
        description: video.description,
        tags: [...video.tags, "captions", "subtitles"],
        userId: video.userId,
        originalFilename: filename,
        filename: filename,
        filePath: finalPath,
        fileSize: fileSize,
        mimeType: video.mimeType,
        metadata: {
          ...video.metadata,
          hasCaptions: true,
          captionStyle: style,
        },
        parentVideoId: video._id,
        status: "ready",
      });

      await captionedVideo.save();

      res.json({
        success: true,
        message: "Captions applied successfully",
        data: {
          videoId: captionedVideo._id,
          downloadUrl: `/api/videos/${captionedVideo._id}/stream`,
          thumbnailUrl: `/api/videos/${captionedVideo._id}/thumbnail`,
        },
      });
    } catch (error) {
      logger.error("Error applying captions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to apply captions",
        error: error.message,
      });
    }
  }
);

// @route   PUT /api/video-edit/:id/edit-captions
// @desc    Edit existing captions
// @access  Private
router.put(
  "/:id/edit-captions",
  authenticateToken,
  logActivity("edit_captions"),
  async (req, res) => {
    try {
      const { edits } = req.body;

      if (!edits || !Array.isArray(edits)) {
        return res.status(400).json({
          success: false,
          message: "Edits array is required",
        });
      }

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

      if (!video.metadata.captions) {
        return res.status(400).json({
          success: false,
          message: "Video has no captions to edit",
        });
      }

      // Apply edits
      const updatedCaptions = captionService.editCaptions(
        video.metadata.captions,
        edits
      );

      video.metadata.captions = updatedCaptions;
      await video.save();

      res.json({
        success: true,
        message: "Captions updated successfully",
        data: {
          captions: updatedCaptions,
        },
      });
    } catch (error) {
      logger.error("Error editing captions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to edit captions",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/video-edit/:id/export-captions
// @desc    Export captions in various formats
// @access  Private
router.get(
  "/:id/export-captions",
  authenticateToken,
  logActivity("export_captions"),
  async (req, res) => {
    try {
      const { format = "srt" } = req.query;

      const video = await Video.findById(req.params.id);

      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      if (!video.metadata.captions) {
        return res.status(400).json({
          success: false,
          message: "Video has no captions to export",
        });
      }

      const captionText = captionService.exportCaptions(
        video.metadata.captions,
        format
      );

      const contentTypes = {
        srt: "application/x-subrip",
        vtt: "text/vtt",
        txt: "text/plain",
      };

      res.setHeader("Content-Type", contentTypes[format] || "text/plain");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${video.title}.${format}"`
      );
      res.send(captionText);
    } catch (error) {
      logger.error("Error exporting captions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export captions",
        error: error.message,
      });
    }
  }
);

export default router;
