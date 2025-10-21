import express from "express";
import path from "path";
import fs from "fs/promises";
import { VideoProcessor } from "../services/videoProcessor.js";
import { Video } from "../models/Video.js";
import {
  authenticateToken,
  checkSubscriptionLimits,
  logActivity,
} from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import rateLimit from "express-rate-limit";

const router = express.Router();
const videoProcessor = new VideoProcessor();

// Rate limiting for effect operations
const effectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each user to 50 effect operations per 15 minutes
  message: {
    success: false,
    message: "Too many effect requests. Please try again later.",
  },
});

// @route   POST /api/video-edit/:id/effect
// @desc    Apply an effect to the video
// @access  Private
router.post(
  "/:id/effect",
  authenticateToken,
  effectLimiter,
  checkSubscriptionLimits("video_edit"),
  logActivity("video_effect"),
  async (req, res) => {
    try {
      logger.info("=== Effect Request Received ===");
      logger.info("Video ID:", req.params.id);
      logger.info("Request body:", req.body);
      logger.info("User:", req.user?.id);
      logger.info("==============================");

      const { effect, parameters } = req.body;

      if (!effect || !parameters) {
        return res.status(400).json({
          success: false,
          message: "Effect and parameters are required",
        });
      }

      const video = await Video.findById(req.params.id);

      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      logger.info("=== Video Details ===");
      logger.info("Video ID:", video._id);
      logger.info("Parent Video ID:", video.parentVideoId);
      logger.info("Applied Effects:", video.appliedEffects);
      logger.info("====================");

      // Check edit permissions - user must own the video or have access
      const videoUserId = video.userId?.toString() || video.userId;
      const requestUserId = req.user.id?.toString() || req.user.id;

      if (videoUserId !== requestUserId) {
        return res.status(403).json({
          success: false,
          message: "Edit permission denied - you don't own this video",
        });
      }

      if (video.status !== "ready") {
        return res.status(400).json({
          success: false,
          message: "Video is not ready for editing",
        });
      }

      // Always apply effects to the original video, not processed versions
      // But accumulate effects to apply them all together
      let sourceVideo = video;
      let originalVideoId = video._id;
      let accumulatedEffects = [];

      if (video.parentVideoId) {
        // This is a processed video, get the original
        logger.info(
          `Video ${video._id} is a processed version, finding original: ${video.parentVideoId}`
        );
        sourceVideo = await Video.findById(video.parentVideoId);

        if (!sourceVideo) {
          logger.warn(
            `Parent video ${video.parentVideoId} not found, using current video`
          );
          sourceVideo = video;
          accumulatedEffects = video.appliedEffects || [];
        } else {
          originalVideoId = sourceVideo._id;
          logger.info(`Using original video ${originalVideoId} as source`);

          // Get effects from the ORIGINAL video, not the current processed one
          accumulatedEffects = sourceVideo.appliedEffects || [];
          logger.info(
            `Found ${accumulatedEffects.length} existing effects from original:`,
            accumulatedEffects
          );
        }
      } else {
        // This is the original video, check if it has effects applied
        logger.info(`Video ${video._id} is the original video`);
        accumulatedEffects = video.appliedEffects || [];
        logger.info(
          `Found ${accumulatedEffects.length} existing effects:`,
          accumulatedEffects
        );
      }

      // Check if effect parameters are at neutral/default values
      // If so, return the original video instead of processing
      const brightnessVal = parseFloat(parameters.brightness) || 0;
      const contrastVal = parseFloat(parameters.contrast) || 0;

      logger.info(
        `Parameter check - brightness: ${brightnessVal}, contrast: ${contrastVal}`
      );

      const isNeutralEffect =
        effect === "brightness" && brightnessVal === 0 && contrastVal === 0;

      if (isNeutralEffect) {
        logger.info(
          `Effect parameters are neutral (brightness=${brightnessVal}, contrast=${contrastVal}), returning original video ${originalVideoId}`
        );

        return res.json({
          success: true,
          message: "No effect applied - parameters at default values",
          data: {
            originalVideo: originalVideoId,
            effectVideo: originalVideoId,
            downloadUrl: `/api/videos/${originalVideoId}/stream`,
            thumbnailUrl: `/api/videos/${originalVideoId}/thumbnail`,
            isOriginal: true,
          },
        });
      }

      // Add new effect to accumulated effects
      // Remove any existing effect of the same type (replace, not stack same effect)
      // For LUT filters, replace any existing LUT filter regardless of preset
      logger.info(
        `Before filtering - accumulated effects:`,
        accumulatedEffects
      );
      logger.info(`New effect to add: ${effect}`, parameters);

      if (effect === "lut-filter") {
        logger.info(`Removing existing lut-filter effects...`);
        const beforeCount = accumulatedEffects.length;
        accumulatedEffects = accumulatedEffects.filter(
          (e) => e.effect !== "lut-filter"
        );
        logger.info(
          `Removed ${
            beforeCount - accumulatedEffects.length
          } lut-filter effect(s)`
        );
      } else {
        accumulatedEffects = accumulatedEffects.filter(
          (e) => e.effect !== effect
        );
      }
      accumulatedEffects.push({ effect, parameters });

      logger.info(
        `After adding new effect - Total effects to apply: ${accumulatedEffects.length}`
      );
      logger.info(
        `Final effects array:`,
        JSON.stringify(accumulatedEffects, null, 2)
      );

      // Process video with ALL accumulated effects
      logger.info(
        `Processing ${accumulatedEffects.length} effect(s) on video ${originalVideoId}`
      );

      const result = await videoProcessor.applyMultipleEffects(
        sourceVideo.filePath,
        accumulatedEffects
      );

      logger.info(`Effect processing completed, output: ${result.outputPath}`);

      // Extract filename from path (works on both Windows and Unix)
      const filename = path.basename(result.outputPath);
      logger.info(`Extracted filename: ${filename}`);

      // Move the processed video from temp to videos folder
      const videosDir = path.join(
        process.cwd(),
        process.env.UPLOAD_PATH || "uploads",
        "videos"
      );
      const finalPath = path.join(videosDir, filename);

      logger.info(`Moving video from ${result.outputPath} to ${finalPath}`);

      try {
        await fs.copyFile(result.outputPath, finalPath);
        await fs.unlink(result.outputPath); // Delete the temp file
        logger.info(`Video moved successfully to ${finalPath}`);
      } catch (error) {
        logger.error(`Error moving video file: ${error.message}`);
        // Continue anyway, use the temp path
      }

      // Get file size
      let fileSize = 0;
      try {
        const stats = await fs.stat(finalPath);
        fileSize = stats.size;
      } catch (error) {
        logger.warn(`Could not get file size: ${error.message}`);
      }

      // Get video metadata for the processed file
      let processedMetadata;
      try {
        processedMetadata = await videoProcessor.getVideoMetadata(finalPath);
        logger.info(`Processed video metadata:`, processedMetadata);
      } catch (error) {
        logger.warn(`Could not get processed video metadata: ${error.message}`);
        // Use source video metadata as fallback
        processedMetadata = sourceVideo.metadata;
      }

      // Create new video version
      const processedVideo = new Video({
        title: `${sourceVideo.title} (${accumulatedEffects
          .map((e) => e.effect)
          .join(", ")})`,
        description: sourceVideo.description,
        tags: [
          ...sourceVideo.tags,
          "effect",
          ...accumulatedEffects.map((e) => e.effect),
        ],
        userId: req.user.id,
        originalFilename: `effect_${sourceVideo.originalFilename}`,
        filename: filename,
        filePath: finalPath,
        fileSize: fileSize,
        mimeType: sourceVideo.mimeType,
        visibility: sourceVideo.visibility,
        parentVideoId: originalVideoId,
        appliedEffects: accumulatedEffects, // Store all applied effects
        editHistory: [
          {
            operation: "effect",
            effect: effect,
            parameters: parameters,
            timestamp: new Date(),
          },
        ],
        status: "ready", // Video is already processed
        metadata: {
          duration:
            processedMetadata?.duration || sourceVideo.metadata?.duration || 0,
          width:
            processedMetadata?.video?.width || sourceVideo.metadata?.width || 0,
          height:
            processedMetadata?.video?.height ||
            sourceVideo.metadata?.height ||
            0,
          fps: processedMetadata?.video?.fps || sourceVideo.metadata?.fps || 30,
          bitrate:
            processedMetadata?.bitrate || sourceVideo.metadata?.bitrate || 0,
          codec:
            processedMetadata?.video?.codec ||
            sourceVideo.metadata?.codec ||
            "h264",
          format:
            processedMetadata?.format || sourceVideo.metadata?.format || "mp4",
          hasAudio: processedMetadata?.hasAudio !== false,
          audioCodec:
            processedMetadata?.audio?.codec || sourceVideo.metadata?.audioCodec,
          audioChannels:
            processedMetadata?.audio?.channels ||
            sourceVideo.metadata?.audioChannels ||
            2,
          audioSampleRate:
            processedMetadata?.audio?.sampleRate ||
            sourceVideo.metadata?.audioSampleRate ||
            48000,
          fileSize: fileSize,
        },
      });

      await processedVideo.save();

      // Update user usage (optional - implement later if needed)
      // await req.user.incrementUsage("video_edit", 1);

      logger.info(
        `Video effect applied: original ${originalVideoId} -> ${processedVideo._id} by user ${req.user.id}`
      );

      res.json({
        success: true,
        message: "Effect applied successfully",
        data: {
          originalVideo: originalVideoId,
          effectVideo: processedVideo._id,
          downloadUrl: `/api/videos/${processedVideo._id}/stream`,
          thumbnailUrl: `/api/videos/${processedVideo._id}/thumbnail`,
        },
      });
    } catch (error) {
      logger.error("Error applying effect:", error);
      logger.error("Error stack:", error.stack);
      logger.error("Error details:", {
        message: error.message,
        code: error.code,
        stderr: error.stderr,
      });
      res.status(500).json({
        success: false,
        message: "Failed to apply effect to video",
        error: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

export default router;
