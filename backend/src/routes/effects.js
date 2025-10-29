import express from "express";
import path from "path";
import fs from "fs/promises";
import { VideoProcessor } from "../services/videoProcessor.js";
import CaptionService from "../services/captionService.js";
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
const captionService = new CaptionService();

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

      // ⭐ Special handling for caption effect
      if (effect === "caption") {
        logger.info("🎤 Processing caption effect using CaptionService");

        try {
          // Generate captions from audio
          const captionResult = await captionService.generateCaptions(
            video.filePath
          );
          logger.info(
            `Generated ${captionResult.captions.length} caption segments`
          );

          // Apply captions with default or custom styling
          // Merge user-provided style with defaults
          const defaultStyle = {
            fontFamily: "Arial",
            fontSize: 18,
            fontColor: "white",
            outlineColor: "black",
            outlineWidth: 2,
            bold: false,
            italic: false,
            position: "bottom",
            alignment: "center",
            marginBottom: 60,
          };

          const style = { ...defaultStyle, ...(parameters.style || {}) };

          logger.info(`Applying caption style:`, style);

          const outputPath = await captionService.applyCaptionsToVideo(
            video.filePath,
            captionResult.captions,
            style
          );

          logger.info(`Captions applied successfully: ${outputPath}`);

          // Generate a unique filename for the captioned video
          const videoId = `video_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
          const filename = `${videoId}.mp4`;

          // Move to final location
          const videosDir = path.join(
            process.cwd(),
            process.env.UPLOAD_PATH || "uploads",
            "videos"
          );
          const finalPath = path.join(videosDir, filename);

          await fs.copyFile(outputPath, finalPath);
          await fs.unlink(outputPath);

          // Get file size
          const stats = await fs.stat(finalPath);
          const fileSize = stats.size;

          // Get video metadata
          const processedMetadata = await videoProcessor.getVideoMetadata(
            finalPath
          );

          // Track original video for lineage
          let trackingOriginalId = video._id;
          if (video.parentVideoId) {
            const parentVideo = await Video.findById(video.parentVideoId);
            if (parentVideo) {
              trackingOriginalId = parentVideo._id;
            }
          }

          // Accumulate effects
          const accumulatedEffects = [
            ...(video.appliedEffects || []),
            { effect: "caption", parameters },
          ];

          // Create new video version
          const processedVideo = new Video({
            _id: videoId,
            title: `${video.title} (with captions)`,
            description: video.description,
            tags: [...video.tags, "effect", "caption"],
            userId: req.user.id,
            originalFilename: `caption_${video.originalFilename}`,
            filename: filename,
            filePath: finalPath,
            fileSize: fileSize,
            mimeType: video.mimeType,
            visibility: video.visibility,
            parentVideoId: trackingOriginalId,
            appliedEffects: accumulatedEffects,
            editHistory: [
              ...(video.editHistory || []),
              {
                action: "caption",
                parameters,
                appliedAt: new Date(),
                appliedBy: req.user.id,
              },
            ],
            metadata: processedMetadata,
            duration: processedMetadata.duration,
            status: "ready",
          });

          await processedVideo.save();

          logger.info(`✅ Caption video saved: ${processedVideo._id}`);

          return res.json({
            success: true,
            message: `Captions generated and applied (${captionResult.captions.length} segments)`,
            data: {
              originalVideo: video._id,
              effectVideo: processedVideo._id,
              downloadUrl: `/api/videos/${processedVideo._id}/stream`,
              thumbnailUrl: `/api/videos/${processedVideo._id}/thumbnail`,
              captionCount: captionResult.captions.length,
            },
          });
        } catch (error) {
          logger.error(`Caption processing error: ${error.message}`);
          return res.status(500).json({
            success: false,
            message: `Caption generation failed: ${error.message}`,
          });
        }
      }

      // 🔧 FIX: Use the CURRENT video (enhanced) as source, not the original
      // This preserves AI enhancements when adding manual effects
      let sourceVideo = video;
      let originalVideoId = video._id;
      let accumulatedEffects = [];

      logger.info(`🔍 Checking video parentVideoId: ${video.parentVideoId}`);
      logger.info(`🔍 Video _id: ${video._id}`);

      // Find the true original video for tracking purposes
      let trackingOriginalId = video._id;
      if (video.parentVideoId) {
        const parentVideo = await Video.findById(video.parentVideoId);
        if (parentVideo) {
          trackingOriginalId = parentVideo._id;
          logger.info(
            `Video ${video._id} is a processed version, original is: ${trackingOriginalId}`
          );
        }
      }

      // ✅ IMPORTANT: Use the CURRENT video's effects, not the original
      // This ensures AI enhancements are preserved when adding manual effects
      accumulatedEffects = video.appliedEffects || [];

      // 🎬 Caption handling: If video has captions, we need to preserve them
      // Strategy: Go back to parent (pre-caption), apply new effect, then re-apply captions
      const existingCaptionEffect = accumulatedEffects.find(
        (e) => e.effect === "caption"
      );
      const effectsWithoutCaptions = accumulatedEffects.filter(
        (e) => e.effect !== "caption"
      );

      let shouldReapplyCaptions = false;
      let captionStyle = null;

      if (existingCaptionEffect && video.parentVideoId) {
        // Video has captions - we'll apply effect to parent, then re-add captions
        const parentVideo = await Video.findById(video.parentVideoId);
        if (parentVideo) {
          logger.info(
            `📹 Video has captions - will apply effect to parent then re-add captions`
          );
          sourceVideo = parentVideo;
          accumulatedEffects = effectsWithoutCaptions;
          shouldReapplyCaptions = true;
          captionStyle = existingCaptionEffect.parameters?.style || {};
        } else {
          logger.warn(`⚠️ Parent video not found, using current video`);
          accumulatedEffects = video.appliedEffects || [];
          sourceVideo = video;
        }
      } else {
        // No captions, use current video
        accumulatedEffects = video.appliedEffects || [];
        sourceVideo = video;
      }

      logger.info(
        `📋 Using video ${sourceVideo._id} with ${accumulatedEffects.length} existing effects:`
      );
      logger.info(`   ${JSON.stringify(accumulatedEffects, null, 2)}`);
      logger.info(`   Should reapply captions: ${shouldReapplyCaptions}`);
      originalVideoId = trackingOriginalId; // Track the original for lineage

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
        logger.info(`🔍 Removing existing lut-filter effects...`);
        const beforeCount = accumulatedEffects.length;
        logger.info(`   Before filter: ${JSON.stringify(accumulatedEffects)}`);
        accumulatedEffects = accumulatedEffects.filter((e) => {
          const keep = e.effect !== "lut-filter";
          logger.info(
            `   Checking effect "${e.effect}": ${keep ? "KEEP" : "REMOVE"}`
          );
          return keep;
        });
        logger.info(`   After filter: ${JSON.stringify(accumulatedEffects)}`);
        logger.info(
          `   Removed ${
            beforeCount - accumulatedEffects.length
          } lut-filter effect(s)`
        );
      } else {
        logger.info(`🔍 Removing existing "${effect}" effects...`);
        const beforeCount = accumulatedEffects.length;
        accumulatedEffects = accumulatedEffects.filter(
          (e) => e.effect !== effect
        );
        logger.info(
          `   Removed ${
            beforeCount - accumulatedEffects.length
          } "${effect}" effect(s)`
        );
      }

      logger.info(`➕ Adding new effect: ${effect}`, parameters);

      // 🔧 FIX: Determine which effects to apply based on source video
      // If we're using the parent video (to avoid captions), we need to re-apply ALL effects
      // If we're using the current video, only apply the new effect
      const usingParentVideo = sourceVideo._id !== video._id;
      const effectsToApply = usingParentVideo
        ? [...accumulatedEffects, { effect, parameters }] // Re-apply all effects + new one when going back to parent
        : video.parentVideoId
        ? [{ effect, parameters }] // Only apply the new effect to the already-processed video
        : [...accumulatedEffects, { effect, parameters }]; // Apply all effects to original video

      // Update accumulated effects for tracking (but don't double-apply)
      accumulatedEffects.push({ effect, parameters });

      logger.info(
        `After adding new effect - Total effects tracked: ${accumulatedEffects.length}`
      );
      logger.info(
        `Using ${usingParentVideo ? "parent" : "current"} video as source`
      );
      logger.info(
        `Effects to actually apply: ${effectsToApply.length}`,
        JSON.stringify(effectsToApply, null, 2)
      );

      // Process video with the appropriate effects
      logger.info(
        `Processing ${effectsToApply.length} effect(s) on video ${sourceVideo._id}`
      );
      logger.info(`🎬 Source video file path: ${sourceVideo.filePath}`);
      logger.info(`🎬 Source video ID: ${sourceVideo._id}`);
      logger.info(`🎬 Original video ID for tracking: ${originalVideoId}`);
      logger.info(
        `🎬 Effects to apply to source:`,
        JSON.stringify(effectsToApply, null, 2)
      );

      const result = await videoProcessor.applyMultipleEffects(
        sourceVideo.filePath,
        effectsToApply
      );

      logger.info(`Effect processing completed, output: ${result.outputPath}`);

      // Generate a unique filename for the processed video
      const videoId = `video_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const fileExtension = path.extname(result.outputPath) || ".mp4";
      const filename = `${videoId}${fileExtension}`;
      logger.info(`Generated filename for processed video: ${filename}`);

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

      // Create new video version with matching ID
      logger.info(
        `🆕 Creating processed video with parentVideoId: ${originalVideoId}`
      );
      logger.info(`🆕 sourceVideo._id: ${sourceVideo._id}`);
      logger.info(`🆕 originalVideoId: ${originalVideoId}`);

      const processedVideo = new Video({
        _id: videoId, // Use the same ID we used for the filename
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

      logger.info(`✅ Processed video saved with _id: ${processedVideo._id}`);
      logger.info(
        `✅ Processed video parentVideoId: ${processedVideo.parentVideoId}`
      );

      // 🎬 Re-apply captions if they existed
      let finalVideoId = processedVideo._id;
      let finalVideoPath = processedVideo.filePath;

      if (shouldReapplyCaptions) {
        logger.info(`🎤 Re-applying captions to preserve them after effect`);

        try {
          // Generate captions from the original audio
          const captionResult = await captionService.generateCaptions(
            processedVideo.filePath
          );

          // Apply captions with the original style
          const defaultStyle = {
            fontFamily: "Arial",
            fontSize: 18,
            fontColor: "white",
            outlineColor: "black",
            outlineWidth: 2,
            bold: false,
            italic: false,
            position: "bottom",
            alignment: "center",
            marginBottom: 60,
          };

          const style = { ...defaultStyle, ...(captionStyle || {}) };

          const captionedPath = await captionService.applyCaptionsToVideo(
            processedVideo.filePath,
            captionResult.captions,
            style
          );

          // Create a new video with captions
          const captionedVideoId = `video_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
          const captionedFilename = `${captionedVideoId}.mp4`;
          const captionedFinalPath = path.join(
            process.cwd(),
            process.env.UPLOAD_PATH || "uploads",
            "videos",
            captionedFilename
          );

          await fs.copyFile(captionedPath, captionedFinalPath);
          await fs.unlink(captionedPath);

          const captionedStats = await fs.stat(captionedFinalPath);
          const captionedMetadata = await videoProcessor.getVideoMetadata(
            captionedFinalPath
          );

          const captionedVideo = new Video({
            _id: captionedVideoId,
            title: `${processedVideo.title} (with captions)`,
            description: processedVideo.description,
            tags: [...processedVideo.tags, "caption"],
            userId: req.user.id,
            originalFilename: `caption_${processedVideo.originalFilename}`,
            filename: captionedFilename,
            filePath: captionedFinalPath,
            fileSize: captionedStats.size,
            mimeType: processedVideo.mimeType,
            visibility: processedVideo.visibility,
            parentVideoId: processedVideo._id,
            appliedEffects: [
              ...accumulatedEffects,
              { effect: "caption", parameters: { style } },
            ],
            editHistory: [
              ...processedVideo.editHistory,
              {
                action: "caption",
                parameters: { style },
                appliedAt: new Date(),
                appliedBy: req.user.id,
              },
            ],
            metadata: captionedMetadata,
            duration: captionedMetadata.duration,
            status: "ready",
          });

          await captionedVideo.save();

          finalVideoId = captionedVideo._id;
          finalVideoPath = captionedVideo.filePath;

          logger.info(
            `✅ Captions re-applied successfully: ${captionedVideo._id}`
          );
        } catch (captionError) {
          logger.error(`❌ Failed to re-apply captions:`, captionError);
          // Continue without captions rather than failing
        }
      }

      // Verify by reading it back
      const verifyProcessed = await Video.findById(finalVideoId);
      logger.info(
        `🔍 VERIFY processed video parentVideoId:`,
        verifyProcessed?.parentVideoId
      );

      // Update the original video's appliedEffects to track cumulative effects
      // This ensures that when we apply another effect, we know what effects are already applied
      logger.info(
        `💾 BEFORE save - sourceVideo ${sourceVideo._id} appliedEffects:`,
        JSON.stringify(sourceVideo.appliedEffects, null, 2)
      );
      sourceVideo.appliedEffects = accumulatedEffects;
      logger.info(
        `💾 AFTER assignment - sourceVideo ${sourceVideo._id} appliedEffects:`,
        JSON.stringify(sourceVideo.appliedEffects, null, 2)
      );
      await sourceVideo.save();
      logger.info(`✅ SAVED - sourceVideo ${sourceVideo._id} to database`);

      // Verify the save worked by reading it back
      const verifyVideo = await Video.findById(sourceVideo._id);
      logger.info(
        `🔍 VERIFY - Re-read video ${verifyVideo._id} appliedEffects:`,
        JSON.stringify(verifyVideo.appliedEffects, null, 2)
      );

      logger.info(
        `Updated original video ${originalVideoId} appliedEffects:`,
        accumulatedEffects
      );

      // Update user usage (optional - implement later if needed)
      // await req.user.incrementUsage("video_edit", 1);

      logger.info(
        `Video effect applied: original ${originalVideoId} -> ${finalVideoId} by user ${req.user.id}`
      );

      // Fetch the complete processed video object to return to frontend
      const processedVideoData = await Video.findById(finalVideoId);

      res.json({
        success: true,
        message: "Effect applied successfully",
        data: {
          originalVideo: originalVideoId,
          effectVideo: finalVideoId,
          video: processedVideoData, // Include full video object
          downloadUrl: `/api/videos/${finalVideoId}/stream`,
          thumbnailUrl: `/api/videos/${finalVideoId}/thumbnail`,
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
