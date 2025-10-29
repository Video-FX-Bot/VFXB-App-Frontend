import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger.js";

class VideoEnhancementService {
  constructor() {
    this.tempDir = process.env.TEMP_DIR || "./uploads/temp";
  }

  /**
   * Enhance video quality with AI upscaling and various improvements
   * @param {string} videoPath - Path to input video
   * @param {Object} options - Enhancement options
   * @returns {Promise<Object>} - Result with output path
   */
  async enhanceVideoQuality(videoPath, options = {}) {
    try {
      logger.info(`🎨 Enhancing video quality: ${videoPath}`);

      const enhancementOptions = {
        upscale: options.upscale || false, // Whether to upscale resolution
        targetResolution: options.targetResolution || "1080p", // 720p, 1080p, 4k
        denoise: options.denoise !== false, // Remove video noise
        sharpen: options.sharpen !== false, // Sharpen video
        deinterlace: options.deinterlace || false, // Remove interlacing
        stabilize: options.stabilize || false, // Video stabilization
        colorCorrection: options.colorCorrection !== false, // Auto color correction
        brightnessBoost: options.brightnessBoost || 0, // -1.0 to 1.0
        contrastBoost: options.contrastBoost || 0, // -1.0 to 1.0
        saturationBoost: options.saturationBoost || 0, // -1.0 to 1.0
        bitrate: options.bitrate || "5M", // Target bitrate
        fps: options.fps || null, // Target FPS (null = keep original)
      };

      const outputPath = path.join(this.tempDir, `enhanced_${uuidv4()}.mp4`);

      return await this.applyEnhancements(
        videoPath,
        outputPath,
        enhancementOptions
      );
    } catch (error) {
      logger.error("Error enhancing video quality:", error);
      throw error;
    }
  }

  /**
   * Apply video enhancements using FFmpeg filters
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output video path
   * @param {Object} options - Enhancement options
   * @returns {Promise<Object>} - Result object
   */
  async applyEnhancements(inputPath, outputPath, options) {
    return new Promise((resolve, reject) => {
      const filters = [];

      // Deinterlace filter (if needed)
      if (options.deinterlace) {
        filters.push("yadif=mode=0:parity=-1:deint=0");
      }

      // Denoise filter (reduce video noise)
      if (options.denoise) {
        filters.push("hqdn3d=4:3:6:4.5");
      }

      // Video stabilization (deshake)
      if (options.stabilize) {
        filters.push("deshake");
      }

      // Sharpen filter
      if (options.sharpen) {
        filters.push("unsharp=5:5:1.0:5:5:0.0");
      }

      // Color correction and adjustments
      const eqFilters = [];
      if (options.brightnessBoost !== 0) {
        eqFilters.push(`brightness=${options.brightnessBoost}`);
      }
      if (options.contrastBoost !== 0) {
        eqFilters.push(`contrast=${1 + options.contrastBoost}`);
      }
      if (options.saturationBoost !== 0) {
        eqFilters.push(`saturation=${1 + options.saturationBoost}`);
      }
      if (eqFilters.length > 0) {
        filters.push(`eq=${eqFilters.join(":")}`);
      }

      // Auto color correction
      if (options.colorCorrection) {
        filters.push("eq=gamma=1.1:contrast=1.1");
      }

      // Upscaling (if requested)
      if (options.upscale) {
        const resolutions = {
          "720p": "1280:720",
          "1080p": "1920:1080",
          "1440p": "2560:1440",
          "4k": "3840:2160",
        };
        const targetSize =
          resolutions[options.targetResolution] || resolutions["1080p"];
        filters.push(`scale=${targetSize}:flags=lanczos`);
      }

      logger.info(`📋 Applying ${filters.length} enhancement filters`);
      logger.info(`   Filters: ${filters.join(", ")}`);

      const command = ffmpeg(inputPath);

      // Apply video filters
      if (filters.length > 0) {
        command.videoFilters(filters.join(","));
      }

      // Set video codec and quality
      command
        .videoCodec("libx264")
        .videoBitrate(options.bitrate)
        .outputOptions([
          "-preset",
          "slow", // Slower encoding = better quality
          "-crf",
          "18", // Constant Rate Factor (lower = better quality, 18 is visually lossless)
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          "-profile:v",
          "high",
          "-level",
          "4.1",
        ]);

      // Set FPS if specified
      if (options.fps) {
        command.fps(options.fps);
      }

      // Audio codec
      command.audioCodec("aac").audioBitrate("256k").audioChannels(2);

      // Progress tracking
      command
        .on("progress", (progress) => {
          logger.info(
            `Enhancement progress: ${Math.round(progress.percent || 0)}%`
          );
        })
        .on("end", () => {
          logger.info("✅ Video enhancement completed:", outputPath);
          resolve({
            success: true,
            outputPath,
            operation: "video-enhancement",
            appliedFilters: filters,
            metadata: {
              processingTime: Date.now(),
            },
          });
        })
        .on("error", (err) => {
          logger.error("❌ Error enhancing video:", err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Analyze video quality and suggest improvements
   * @param {string} videoPath - Path to video file
   * @returns {Promise<Object>} - Quality analysis and recommendations
   */
  async analyzeVideoQuality(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          logger.error("Error analyzing video:", err);
          return reject(err);
        }

        const videoStream = metadata.streams.find(
          (s) => s.codec_type === "video"
        );
        const audioStream = metadata.streams.find(
          (s) => s.codec_type === "audio"
        );

        if (!videoStream) {
          return reject(new Error("No video stream found"));
        }

        const analysis = {
          currentQuality: {
            resolution: `${videoStream.width}x${videoStream.height}`,
            fps: eval(videoStream.r_frame_rate),
            bitrate: videoStream.bit_rate
              ? parseInt(videoStream.bit_rate)
              : null,
            codec: videoStream.codec_name,
            pixelFormat: videoStream.pix_fmt,
            duration: parseFloat(metadata.format.duration),
          },
          recommendations: [],
        };

        // Analyze and recommend improvements
        const width = videoStream.width;
        const height = videoStream.height;

        // Resolution recommendations
        if (width < 1280 || height < 720) {
          analysis.recommendations.push({
            type: "upscale",
            priority: "high",
            message:
              "Video resolution is below 720p. Consider upscaling to improve quality.",
            suggestion: {
              upscale: true,
              targetResolution: "1080p",
            },
          });
        }

        // Bitrate recommendations
        const currentBitrate = videoStream.bit_rate
          ? parseInt(videoStream.bit_rate)
          : 0;
        const recommendedBitrate = width * height * 0.1; // Rough estimate

        if (currentBitrate < recommendedBitrate) {
          analysis.recommendations.push({
            type: "bitrate",
            priority: "medium",
            message:
              "Video bitrate is low. Increasing bitrate will improve quality.",
            suggestion: {
              bitrate: "5M",
            },
          });
        }

        // Interlacing check
        if (
          videoStream.field_order &&
          videoStream.field_order !== "progressive"
        ) {
          analysis.recommendations.push({
            type: "deinterlace",
            priority: "high",
            message:
              "Video appears to be interlaced. Deinterlacing recommended.",
            suggestion: {
              deinterlace: true,
            },
          });
        }

        // General enhancements
        analysis.recommendations.push({
          type: "general",
          priority: "low",
          message: "Apply noise reduction and sharpening for cleaner video.",
          suggestion: {
            denoise: true,
            sharpen: true,
            colorCorrection: true,
          },
        });

        logger.info("✅ Video quality analysis completed");
        resolve(analysis);
      });
    });
  }

  /**
   * Quick enhance - Apply standard enhancement preset
   * @param {string} videoPath - Path to video file
   * @returns {Promise<Object>} - Result with output path
   */
  async quickEnhance(videoPath) {
    return this.enhanceVideoQuality(videoPath, {
      denoise: true,
      sharpen: true,
      colorCorrection: true,
      bitrate: "5M",
    });
  }

  /**
   * Professional enhance - Apply high-quality enhancement
   * @param {string} videoPath - Path to video file
   * @returns {Promise<Object>} - Result with output path
   */
  async professionalEnhance(videoPath) {
    return this.enhanceVideoQuality(videoPath, {
      upscale: true,
      targetResolution: "1080p",
      denoise: true,
      sharpen: true,
      stabilize: true,
      colorCorrection: true,
      bitrate: "8M",
    });
  }
}

export default VideoEnhancementService;
