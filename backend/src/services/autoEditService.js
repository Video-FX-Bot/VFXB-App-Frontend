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

    // 1. Color grading based on mood
    const colorGrading = this.getMoodBasedColorGrading(videoAnalysis.mood);
    if (colorGrading) {
      edits.push(colorGrading);
    }

    // 2. Brightness/Contrast adjustments based on content type
    const exposure = this.getContentTypeExposure(videoAnalysis.content_type);
    if (exposure) {
      edits.push(exposure);
    }

    // 3. Stabilization if video seems shaky (based on pacing)
    if (videoAnalysis.pacing === "fast" && metadata.fps > 30) {
      edits.push({
        type: "stabilization",
        parameters: {
          shakiness: 5,
          smoothing: 10,
        },
        reason: "Fast-paced content benefits from stabilization",
      });
    }

    // 4. Audio enhancements if transcription succeeded
    if (analysis.transcription && metadata.hasAudio) {
      edits.push({
        type: "audio-enhancement",
        parameters: {
          normalize: true,
          denoise: true,
        },
        reason: "Improve audio clarity based on speech detection",
      });
    }

    logger.info("📋 Determined auto-edits:", {
      editCount: edits.length,
      types: edits.map((e) => e.type),
    });

    return edits;
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
   * @returns {object} - Result with edited video
   */
  async applyAutoEdits(video, edits, userId) {
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

      // Convert edits to effects format
      const effects = edits.map((edit) => ({
        effect: edit.type,
        parameters: edit.parameters,
      }));

      // Apply effects using videoProcessor
      const result = await this.videoProcessor.applyMultipleEffects(
        video.filePath,
        effects,
        {
          userId,
          videoId: video._id,
        }
      );

      if (!result.success) {
        logger.error("❌ Failed to apply auto-edits:", result.error);
        return {
          success: false,
          error: result.error,
          video: video,
        };
      }

      logger.info("✅ Auto-edits applied successfully:", {
        outputPath: result.outputPath,
        edits: edits.map((e) => e.type),
      });

      return {
        success: true,
        message: "Automatic edits applied",
        outputPath: result.outputPath,
        appliedEdits: edits,
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
