import { logger } from "../utils/logger.js";
import { VideoProcessor } from "./videoProcessor.js";
import { AIService } from "./aiService.js";

/**
 * AutoEditService - Automatically analyzes and edits videos on upload
 * Applies AI-suggested edits while preserving the original for manual editing
 */
class AutoEditService {
  constructor() {
    this.videoProcessor = new VideoProcessor();
    this.aiService = new AIService();
  }

  /**
   * Analyze video and determine automatic edits
   * @param {string} videoPath - Path to the video file
   * @param {object} metadata - Video metadata
   * @returns {object} - Analysis results with recommended edits
   */
  async analyzeForAutoEdit(videoPath, metadata) {
    try {
      logger.info("🤖 Starting auto-edit analysis for video:", videoPath);

      // Get AI analysis of the video
      const analysis = await this.aiService.analyzeVideo(videoPath);

      if (!analysis.success) {
        logger.error("❌ AI analysis failed:", analysis.error);
        return {
          success: false,
          error: analysis.error,
          recommendedEdits: [],
        };
      }

      // Determine automatic edits based on analysis
      const recommendedEdits = this.determineAutoEdits(analysis, metadata);

      logger.info("✅ Auto-edit analysis complete:", {
        mood: analysis.analysis?.mood,
        pacing: analysis.analysis?.pacing,
        editCount: recommendedEdits.length,
      });

      return {
        success: true,
        analysis: analysis.analysis,
        transcription: analysis.transcription,
        recommendedEdits,
      };
    } catch (error) {
      logger.error("❌ Error in auto-edit analysis:", error);
      return {
        success: false,
        error: error.message,
        recommendedEdits: [],
      };
    }
  }

  /**
   * Determine which automatic edits to apply based on AI analysis
   * @param {object} analysis - AI analysis results
   * @param {object} metadata - Video metadata
   * @returns {array} - Array of edit operations to apply
   */
  determineAutoEdits(analysis, metadata) {
    const edits = [];
    const videoAnalysis = analysis.analysis || {};
    const transcription = analysis.transcription;
    const hasSpeech =
      transcription && transcription.text && transcription.text.length > 0;

    logger.info("🤖 Analyzing video for smart auto-edits:", {
      hasSpeech,
      hasAudio: metadata.hasAudio,
      contentType: videoAnalysis.content_type,
      mood: videoAnalysis.mood,
      duration: metadata.duration,
    });

    // PRIORITY 1: Speech-related edits (if video contains talking/speech)
    if (hasSpeech && metadata.hasAudio) {
      logger.info("🗣️ Speech detected - applying speech-optimized edits");

      // 1a. Auto-trim silence for speech content (makes talking videos more engaging)
      edits.push({
        type: "auto-trim-silence",
        parameters: {
          silenceThreshold: -40, // More aggressive - catches quieter pauses
          minSilenceDuration: 0.3, // Remove pauses longer than 0.3s (catches natural speech pauses)
          padding: 0.08, // Minimal padding to keep natural flow
        },
        reason:
          "Remove dead air and speech pauses to make content more engaging and fast-paced",
        priority: "high",
      });

      // 1b. Generate subtitles for speech content
      edits.push({
        type: "auto-subtitles",
        parameters: {
          transcription: transcription,
          style: this.getSubtitleStyleForContent(videoAnalysis.content_type),
        },
        reason: "Add subtitles for accessibility and engagement",
        priority: "high",
      });

      // 1c. Audio enhancement specifically for speech clarity
      edits.push({
        type: "audio-enhancement",
        parameters: {
          normalize: true,
          denoise: true,
          compressor: true, // Add compression for consistent volume
          highpass: 80, // Remove low rumble below speech range
        },
        reason: "Optimize audio for clear speech intelligibility",
        priority: "high",
      });
    } else if (metadata.hasAudio && !hasSpeech) {
      // Music/ambient audio without speech
      logger.info(
        "🎵 No speech detected - applying music/ambient optimizations"
      );

      edits.push({
        type: "audio-enhancement",
        parameters: {
          normalize: true,
          denoise: false, // Don't denoise music too aggressively
          bassBoost: 5, // Slight bass enhancement for music
        },
        reason: "Enhance audio quality while preserving music character",
        priority: "medium",
      });
    }

    // PRIORITY 2: Content-type specific enhancements
    const contentType = videoAnalysis.content_type?.toLowerCase() || "";

    if (
      contentType.includes("tutorial") ||
      contentType.includes("educational")
    ) {
      logger.info("📚 Tutorial/educational content detected");

      // Tutorials need clarity
      edits.push({
        type: "brightness",
        parameters: {
          brightness: 10,
          contrast: 15,
          sharpness: 10, // Extra sharpness for screen recordings
        },
        reason: "Tutorials benefit from clear, bright, sharp visuals",
        priority: "medium",
      });

      // Add zoom for emphasis if it's screen content
      if (contentType.includes("screen") || contentType.includes("demo")) {
        edits.push({
          type: "auto-zoom",
          parameters: {
            detectFocus: true,
            zoomLevel: 1.2,
          },
          reason: "Zoom on important areas for screen recordings",
          priority: "low",
        });
      }
    } else if (
      contentType.includes("vlog") ||
      contentType.includes("talking")
    ) {
      logger.info("🎥 Vlog/talking head content detected");

      // Natural look for vlogs
      edits.push({
        type: "brightness",
        parameters: {
          brightness: 5,
          contrast: 8,
          saturation: 5, // Slightly boost saturation for vibrant look
        },
        reason: "Vlogs look natural with subtle enhancements",
        priority: "medium",
      });
    } else if (
      contentType.includes("cinematic") ||
      contentType.includes("film")
    ) {
      logger.info("🎬 Cinematic content detected");

      // Cinematic look
      edits.push({
        type: "brightness",
        parameters: {
          brightness: -3,
          contrast: 20,
        },
        reason: "Cinematic content benefits from higher contrast",
        priority: "medium",
      });
    }

    // PRIORITY 3: Color grading based on mood
    const colorGrading = this.getMoodBasedColorGrading(videoAnalysis.mood);
    if (colorGrading) {
      colorGrading.priority = "low";
      edits.push(colorGrading);
    }

    // PRIORITY 4: Technical improvements
    // Stabilization for shaky footage
    if (
      videoAnalysis.pacing === "fast" ||
      videoAnalysis.camera_work === "handheld"
    ) {
      edits.push({
        type: "stabilization",
        parameters: {
          shakiness: 5,
          smoothing: 10,
        },
        reason: "Stabilize shaky footage for smoother viewing",
        priority: "medium",
      });
    }

    // Sort edits by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    edits.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      return aPriority - bPriority;
    });

    logger.info("📋 Determined smart auto-edits:", {
      editCount: edits.length,
      types: edits.map((e) => e.type),
      priorities: edits.map((e) => e.priority),
    });

    return edits;
  }

  /**
   * Get subtitle style based on content type
   * @param {string} contentType - Type of content
   * @returns {object} - Subtitle style parameters
   */
  getSubtitleStyleForContent(contentType) {
    const type = (contentType || "").toLowerCase();

    if (type.includes("tutorial") || type.includes("educational")) {
      return {
        fontSize: 24,
        fontFamily: "Arial",
        fontColor: "white",
        backgroundColor: "black",
        backgroundOpacity: 0.7,
        position: "bottom",
        maxCharsPerLine: 50,
      };
    } else if (type.includes("social") || type.includes("short")) {
      return {
        fontSize: 28,
        fontFamily: "Impact",
        fontColor: "yellow",
        stroke: "black",
        strokeWidth: 2,
        position: "center",
        maxCharsPerLine: 30,
      };
    }

    // Default style
    return {
      fontSize: 22,
      fontFamily: "Arial",
      fontColor: "white",
      backgroundColor: "black",
      backgroundOpacity: 0.6,
      position: "bottom",
      maxCharsPerLine: 45,
    };
  }

  /**
   * Get color grading preset based on detected mood
   * @param {string} mood - Detected mood from AI analysis
   * @returns {object|null} - Color grading edit or null
   */
  getMoodBasedColorGrading(mood) {
    if (!mood) return null;

    const moodToPreset = {
      happy: {
        type: "lut-filter",
        parameters: {
          preset: "Warm",
          intensity: 60,
        },
        reason: "Warm tones enhance happy, positive content",
      },
      energetic: {
        type: "lut-filter",
        parameters: {
          preset: "Dramatic",
          intensity: 70,
        },
        reason: "Dramatic colors boost energetic content",
      },
      sad: {
        type: "lut-filter",
        parameters: {
          preset: "Cool",
          intensity: 50,
        },
        reason: "Cool tones complement melancholic mood",
      },
      calm: {
        type: "lut-filter",
        parameters: {
          preset: "Cinematic",
          intensity: 50,
        },
        reason: "Cinematic look enhances calm, thoughtful content",
      },
      nostalgic: {
        type: "lut-filter",
        parameters: {
          preset: "Vintage",
          intensity: 65,
        },
        reason: "Vintage filter adds nostalgic atmosphere",
      },
    };

    const moodKey = mood.toLowerCase();
    if (moodToPreset[moodKey]) {
      logger.info(
        `🎨 Selected ${moodToPreset[moodKey].parameters.preset} filter for ${mood} mood`
      );
      return moodToPreset[moodKey];
    }

    // Default to subtle cinematic look
    return {
      type: "lut-filter",
      parameters: {
        preset: "Cinematic",
        intensity: 40,
      },
      reason: "Default cinematic enhancement",
    };
  }

  /**
   * Get exposure adjustments based on content type
   * @param {string} contentType - Type of content
   * @returns {object|null} - Brightness/contrast edit or null
   */
  getContentTypeExposure(contentType) {
    if (!contentType) return null;

    const contentAdjustments = {
      tutorial: {
        type: "brightness",
        parameters: {
          brightness: 10,
          contrast: 15,
        },
        reason: "Tutorials benefit from clear, bright visuals",
      },
      presentation: {
        type: "brightness",
        parameters: {
          brightness: 15,
          contrast: 20,
        },
        reason: "Presentations need high clarity and contrast",
      },
      vlog: {
        type: "brightness",
        parameters: {
          brightness: 5,
          contrast: 10,
        },
        reason: "Vlogs look natural with subtle enhancements",
      },
      cinematic: {
        type: "brightness",
        parameters: {
          brightness: -5,
          contrast: 25,
        },
        reason: "Cinematic content benefits from higher contrast",
      },
    };

    const typeKey = contentType.toLowerCase();
    if (contentAdjustments[typeKey]) {
      logger.info(`💡 Applying ${typeKey} exposure adjustments`);
      return contentAdjustments[typeKey];
    }

    return null;
  }

  /**
   * Apply automatic edits to a video
   * @param {object} video - Video model instance
   * @param {array} edits - Array of edit operations
   * @param {string} userId - User ID
   * @param {object} socket - Socket for progress updates
   * @returns {object} - Result with edited video
   */
  async applyAutoEdits(video, edits, userId, socket = null) {
    try {
      logger.info("🎬 Applying auto-edits:", {
        videoId: video._id,
        editCount: edits.length,
      });

      if (!edits || edits.length === 0) {
        logger.info("⏭️ No auto-edits to apply");
        return {
          success: true,
          message: "No automatic edits needed",
          video: video,
        };
      }

      let currentVideoPath = video.filePath;
      const appliedEdits = [];

      // Apply edits sequentially (some need special handling)
      for (let i = 0; i < edits.length; i++) {
        const edit = edits[i];
        logger.info(`🔄 Applying edit ${i + 1}/${edits.length}: ${edit.type}`);

        try {
          // Route special operations through AIService
          if (edit.type === "auto-trim-silence") {
            logger.info("✂️ Applying auto-trim-silence via AIService");
            const result = await this.aiService.autoTrimSilence(
              currentVideoPath,
              video._id,
              edit.parameters,
              socket
            );

            if (result.success && result.outputPath) {
              currentVideoPath = result.outputPath;
              appliedEdits.push(edit);
              logger.info("✅ Auto-trim-silence applied successfully");
            } else {
              logger.warn(
                "⚠️ Auto-trim-silence failed, continuing with other edits"
              );
            }
          } else if (edit.type === "auto-subtitles") {
            logger.info("📝 Applying auto-subtitles via AIService");

            // Generate subtitles using the transcription
            const result = await this.aiService.generateSubtitles(
              currentVideoPath,
              video._id,
              edit.parameters,
              socket
            );

            if (result.success && result.outputPath) {
              currentVideoPath = result.outputPath;
              appliedEdits.push(edit);
              logger.info("✅ Auto-subtitles applied successfully");
            } else {
              logger.warn(
                "⚠️ Auto-subtitles failed, continuing with other edits"
              );
            }
          } else {
            // Standard video effects - apply through videoProcessor
            logger.info(`🎨 Applying ${edit.type} via videoProcessor`);

            const result = await this.videoProcessor.applyEffect(
              currentVideoPath,
              edit.type,
              edit.parameters,
              {
                userId,
                videoId: video._id,
              }
            );

            if (result.success && result.outputPath) {
              currentVideoPath = result.outputPath;
              appliedEdits.push(edit);
              logger.info(`✅ ${edit.type} applied successfully`);
            } else {
              logger.warn(
                `⚠️ ${edit.type} failed, continuing with other edits`
              );
            }
          }
        } catch (editError) {
          logger.error(`❌ Error applying ${edit.type}:`, editError);
          // Continue with other edits even if one fails
        }
      }

      // Update video in database with new path and applied effects
      if (currentVideoPath !== video.filePath) {
        const { Video } = await import("../models/Video.js");
        const videoDoc = await Video.findById(video._id);

        if (videoDoc) {
          // Get metadata for updated video
          const metadata = await this.videoProcessor.getVideoMetadata(
            currentVideoPath
          );

          // Preserve existing effects and add new ones
          const existingEffects = videoDoc.appliedEffects || [];
          const newEffects = appliedEdits.map((edit) => ({
            effect: edit.type,
            parameters: edit.parameters,
            timestamp: new Date().toISOString(),
          }));

          videoDoc.filePath = currentVideoPath;
          videoDoc.duration = metadata.duration;
          videoDoc.fileSize = metadata.format?.size || videoDoc.fileSize;
          videoDoc.appliedEffects = [...existingEffects, ...newEffects];
          await videoDoc.save();

          logger.info("✅ Video database record updated with auto-edits");
        }
      }

      logger.info("✅ All auto-edits applied successfully:", {
        outputPath: currentVideoPath,
        appliedCount: appliedEdits.length,
        edits: appliedEdits.map((e) => e.type),
      });

      return {
        success: true,
        message: "Automatic edits applied",
        outputPath: currentVideoPath,
        appliedEdits: appliedEdits,
        video: video,
      };
    } catch (error) {
      logger.error("❌ Error applying auto-edits:", error);
      return {
        success: false,
        error: error.message,
        video: video,
      };
    }
  }

  /**
   * Generate user-friendly summary of auto-edits
   * @param {array} edits - Array of applied edits
   * @param {object} analysis - AI analysis results
   * @returns {string} - Human-readable summary
   */
  generateEditSummary(edits, analysis) {
    if (!edits || edits.length === 0) {
      return "No automatic edits were applied to your video.";
    }

    const editDescriptions = edits.map((edit) => {
      switch (edit.type) {
        case "lut-filter":
          return `Applied ${edit.parameters.preset} color grading (${edit.parameters.intensity}% intensity)`;
        case "brightness":
          return `Adjusted brightness ${
            edit.parameters.brightness > 0 ? "+" : ""
          }${edit.parameters.brightness} and contrast ${
            edit.parameters.contrast > 0 ? "+" : ""
          }${edit.parameters.contrast}`;
        case "stabilization":
          return "Added video stabilization for smoother playback";
        case "audio-enhancement":
          return "Enhanced audio with noise reduction and normalization";
        default:
          return `Applied ${edit.type} enhancement`;
      }
    });

    const mood = analysis?.mood ? ` Detected mood: ${analysis.mood}.` : "";
    const contentType = analysis?.content_type
      ? ` Content type: ${analysis.content_type}.`
      : "";

    return `AI Auto-Edit Summary:\n${mood}${contentType}\n\nApplied ${
      edits.length
    } enhancement(s):\n${editDescriptions
      .map((d, i) => `${i + 1}. ${d}`)
      .join("\n")}`;
  }
}

export { AutoEditService };
