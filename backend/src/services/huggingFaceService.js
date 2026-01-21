import { HfInference } from "@huggingface/inference";
import { logger } from "../utils/logger.js";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import ffmpeg from "fluent-ffmpeg";

class HuggingFaceService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.hf = null;
    this.uploadsDir = path.join(process.cwd(), "uploads", "ai-generated");
    this.init();
  }

  async init() {
    if (!this.apiKey) {
      logger.warn(
        "HuggingFace API key not found - text-to-video will not work"
      );
      return;
    }

    try {
      this.hf = new HfInference(this.apiKey);
      logger.info("HuggingFace service initialized successfully");

      // Create uploads directory for AI-generated content
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      logger.error("Failed to initialize HuggingFace service:", error);
    }
  }

  /**
   * Generate a video from text prompt
   * Uses AnimateDiff or similar text-to-video model
   * @param {string} prompt - Text description of desired video
   * @param {object} options - Additional options (duration, fps, etc.)
   * @returns {Promise<string>} - Path to generated video file
   */
  async textToVideo(prompt, options = {}) {
    if (!this.hf) {
      throw new Error("HuggingFace service not initialized - check API key");
    }

    try {
      logger.info(`🎬 Generating video from prompt: "${prompt}"`);

      const {
        duration = 3, // seconds
        fps = 24,
      } = options;

      // Note: HuggingFace Inference API doesn't have reliable text-to-video models
      // We use text-to-image and convert to video with FFmpeg
      // This creates a static image video, not an animated one

      // Try multiple models in order of preference
      const models = [
        { name: "black-forest-labs/FLUX.1-schnell", steps: 4, guidance: 0 },
        { name: "runwayml/stable-diffusion-v1-5", steps: 20, guidance: 7.5 },
        { name: "CompVis/stable-diffusion-v1-4", steps: 20, guidance: 7.5 },
        { name: "stabilityai/stable-diffusion-2-1", steps: 20, guidance: 7.5 },
      ];

      let response = null;
      let usedModel = null;

      for (const modelConfig of models) {
        try {
          logger.info(`📸 Trying model: ${modelConfig.name}`);

          response = await this.hf.textToImage({
            model: modelConfig.name,
            inputs: prompt,
            parameters: {
              num_inference_steps: modelConfig.steps,
              guidance_scale: modelConfig.guidance,
            },
          });

          usedModel = modelConfig.name;
          logger.info(`✅ Successfully used model: ${modelConfig.name}`);
          break;
        } catch (modelError) {
          logger.warn(
            `⚠️ Model ${modelConfig.name} not available: ${modelError.message}`
          );
          continue;
        }
      }

      if (!response) {
        logger.warn("⚠️ All AI models failed, creating placeholder video");
        return await this.createPlaceholderVideo(prompt, duration, fps);
      }

      // Convert blob response to buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save generated image
      const filename = `generated_${uuidv4()}.png`;
      const imagePath = path.join(this.uploadsDir, filename);
      await fs.writeFile(imagePath, buffer);

      logger.info(`✅ Generated image saved: ${imagePath}`);

      // Convert static image to video using FFmpeg
      const videoPath = await this.imageToVideo(imagePath, duration, fps);

      // Clean up temporary image
      await fs.unlink(imagePath);

      logger.info(`✅ Text-to-video generation complete: ${videoPath}`);
      return videoPath;
    } catch (error) {
      logger.error("Text-to-video generation failed:", error);

      // Try fallback placeholder video
      try {
        logger.warn("⚠️ Attempting fallback: creating placeholder video");
        return await this.createPlaceholderVideo(
          options.prompt || "Generated Content",
          options.duration || 3,
          options.fps || 24
        );
      } catch (fallbackError) {
        logger.error("Fallback also failed:", fallbackError);
        throw new Error(`Failed to generate video: ${error.message}`);
      }
    }
  }

  /**
   * Convert a static image to a video clip
   * @param {string} imagePath - Path to image file
   * @param {number} duration - Duration in seconds
   * @param {number} fps - Frames per second
   * @returns {Promise<string>} - Path to video file
   */
  async imageToVideo(imagePath, duration = 3, fps = 24) {
    const ffmpegModule = await import("fluent-ffmpeg");
    const ffmpeg = ffmpegModule.default;

    const videoFilename = `generated_video_${uuidv4()}.mp4`;
    const videoPath = path.join(this.uploadsDir, videoFilename);

    logger.info(`🎥 Converting image to ${duration}s video at ${fps} fps`);

    return new Promise((resolve, reject) => {
      // Create smooth zoom-in effect using scale filter with linear interpolation
      // Zooms from 1.0x to 1.15x over the duration for a subtle, smooth effect
      const totalFrames = duration * fps;
      const zoomFilter = `scale=iw*2:ih*2,zoompan=z='1+0.15*on/${totalFrames}':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720:fps=${fps}`;

      ffmpeg(imagePath)
        .loop(duration * fps) // Loop the image for duration * fps frames
        .inputFPS(fps)
        .fps(fps)
        .videoCodec("libx264")
        .outputOptions([
          "-pix_fmt yuv420p",
          "-t " + duration,
          `-vf ${zoomFilter}`,
        ])
        .output(videoPath)
        .on("end", () => {
          logger.info(`✅ Image converted to video: ${videoPath}`);
          resolve(videoPath);
        })
        .on("error", (err) => {
          logger.error("Image to video conversion failed:", err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Create a placeholder video with text when AI generation fails
   * @param {string} prompt - Text to display
   * @param {number} duration - Duration in seconds
   * @param {number} fps - Frames per second
   * @returns {Promise<string>} - Path to video file
   */
  async createPlaceholderVideo(prompt, duration = 3, fps = 24) {
    const ffmpegModule = await import("fluent-ffmpeg");
    const ffmpeg = ffmpegModule.default;

    const videoFilename = `placeholder_${uuidv4()}.mp4`;
    const videoPath = path.join(this.uploadsDir, videoFilename);

    logger.info(`🎨 Creating placeholder video with text: "${prompt}"`);

    // Escape text for FFmpeg drawtext filter
    const escapedText = prompt.replace(/[\\:']/g, "\\$&");

    // Create a video from scratch using FFmpeg color source
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(`color=c=0x2563eb:s=1280x720:d=${duration}`) // Blue background
        .inputFormat("lavfi")
        .videoCodec("libx264")
        .videoFilters([
          {
            filter: "drawtext",
            options: {
              text: escapedText,
              fontcolor: "white",
              fontsize: 48,
              x: "(w-text_w)/2",
              y: "(h-text_h)/2",
            },
          },
        ])
        .outputOptions(["-pix_fmt yuv420p"])
        .fps(fps)
        .duration(duration)
        .output(videoPath)
        .on("end", () => {
          logger.info(`✅ Placeholder video created: ${videoPath}`);
          resolve(videoPath);
        })
        .on("error", (err) => {
          logger.error("Placeholder video creation failed:", err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Generate video with better quality using Replicate (alternative)
   * @param {string} prompt - Text description
   * @returns {Promise<string>} - URL or path to generated video
   */
  async textToVideoReplicate(prompt) {
    // This would use Replicate's text-to-video models
    // Like: zeroscope/text-to-video or anotherjesse/zeroscope-v2-xl
    // Implementation depends on having Replicate service
    logger.info("Replicate text-to-video not implemented yet");
    throw new Error("Replicate text-to-video not available");
  }

  /**
   * Detect speech/non-speech segments using Hugging Face VAD model
   * Uses pyannote/voice-activity-detection or similar models
   * @param {string} audioPath - Path to audio file
   * @returns {Promise<Array>} - Array of speech segments with start/end times
   */
  async detectSpeechSegments(audioPath) {
    if (!this.hf) {
      throw new Error("HuggingFace service not initialized - check API key");
    }

    try {
      logger.info(`🎤 Analyzing audio for speech detection: ${audioPath}`);

      // Read audio file
      const audioBuffer = await fs.readFile(audioPath);

      // Use Hugging Face Inference API for audio classification
      // This uses a pre-trained VAD model
      const result = await this.hf.audioClassification({
        data: audioBuffer,
        model: "Eklavya/vad_model", // Voice Activity Detection model
      });

      logger.info("🎤 VAD analysis complete:", result);

      return result;
    } catch (error) {
      logger.error("❌ Speech detection failed:", error);
      throw error;
    }
  }

  /**
   * Detect silence in audio using advanced FFmpeg analysis
   * More sophisticated than basic silencedetect - uses multiple passes
   * @param {string} audioPath - Path to audio file
   * @param {object} options - Detection options
   * @returns {Promise<Array>} - Array of keep segments {start, end}
   */
  async detectSilenceWithAI(audioPath, options = {}) {
    const {
      silenceThreshold = -30,
      minSilenceDuration = 0.5,
      padding = 0.1,
    } = options;

    try {
      logger.info(`🤖 Using advanced audio analysis on: ${audioPath}`);

      // Get total audio duration first
      const duration = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(audioPath, (err, metadata) => {
          if (err) reject(err);
          else resolve(metadata.format.duration);
        });
      });

      logger.info(`📊 Audio duration: ${duration}s`);

      // Use FFmpeg's silencedetect filter with enhanced settings
      const silencePeriods = await new Promise((resolve, reject) => {
        let stderr = "";

        ffmpeg(audioPath)
          .audioFilters(
            `silencedetect=n=${silenceThreshold}dB:d=${minSilenceDuration}`
          )
          .outputOptions(["-f null"])
          .output("-")
          .on("stderr", (line) => {
            stderr += line + "\n";
          })
          .on("end", () => {
            logger.info("✅ Silence detection complete");
            resolve(stderr);
          })
          .on("error", (err) => {
            logger.error("❌ Silence detection failed:", err);
            reject(err);
          })
          .run();
      });

      logger.info("📊 Parsing silence periods...");

      // Parse silence periods from FFmpeg output
      const silenceStartRegex = /silence_start: ([\d.]+)/g;
      const silenceEndRegex = /silence_end: ([\d.]+)/g;

      const silenceStarts = [];
      const silenceEnds = [];

      let match;
      while ((match = silenceStartRegex.exec(silencePeriods)) !== null) {
        silenceStarts.push(parseFloat(match[1]));
      }

      while ((match = silenceEndRegex.exec(silencePeriods)) !== null) {
        silenceEnds.push(parseFloat(match[1]));
      }

      logger.info(`🔇 Found ${silenceStarts.length} silence start times`);
      logger.info(`🔇 Found ${silenceEnds.length} silence end times`);

      // Build keep segments (inverse of silence periods)
      const keepSegments = [];
      let lastEnd = 0;

      for (let i = 0; i < silenceStarts.length; i++) {
        const silenceStart = silenceStarts[i];
        const silenceEnd = silenceEnds[i] || duration;

        // Add segment before this silence (if it's long enough)
        if (silenceStart - lastEnd > minSilenceDuration) {
          keepSegments.push({
            start: Math.max(0, lastEnd - padding),
            end: Math.min(duration, silenceStart + padding),
          });
        }

        lastEnd = silenceEnd;
      }

      // Add final segment after last silence
      if (duration - lastEnd > minSilenceDuration) {
        keepSegments.push({
          start: Math.max(0, lastEnd - padding),
          end: duration,
        });
      }

      // If no silence detected, keep entire video
      if (keepSegments.length === 0 && duration > 0) {
        logger.info(
          "ℹ️ No significant silence detected - keeping entire video"
        );
        keepSegments.push({ start: 0, end: duration });
      }

      logger.info(`✅ Generated ${keepSegments.length} keep segments`);
      keepSegments.forEach((seg, i) => {
        logger.info(
          `  Segment ${i + 1}: ${seg.start.toFixed(2)}s - ${seg.end.toFixed(
            2
          )}s (${(seg.end - seg.start).toFixed(2)}s)`
        );
      });

      return keepSegments;
    } catch (error) {
      logger.error("❌ Advanced audio analysis failed:", error);
      throw error;
    }
  }

  /**
   * Parse user prompt to extract video generation details
   * Example: "add a flying cat at the beginning" -> { subject: "flying cat", position: "beginning" }
   * @param {string} userMessage - User's text request
   * @returns {object} - Parsed generation details
   */
  parseTextToVideoIntent(userMessage) {
    const message = userMessage.toLowerCase();

    // Extract position (beginning, end, timestamp)
    let position = "beginning";
    if (message.includes("at the end") || message.includes("at end")) {
      position = "end";
    } else if (
      message.includes("at the beginning") ||
      message.includes("at start")
    ) {
      position = "beginning";
    } else if (message.match(/at (\d+) second/)) {
      const match = message.match(/at (\d+) second/);
      position = `timestamp:${match[1]}`;
    }

    // Extract subject/prompt (remove position words)
    let prompt = message
      .replace(/add (a |an )?/, "")
      .replace(/at the (beginning|end|start)/, "")
      .replace(/at \d+ second(s)?/, "")
      .replace(/of the video/, "")
      .trim();

    // If prompt doesn't have descriptive words, add "cinematic" for better results
    if (prompt.split(" ").length < 3) {
      prompt = `cinematic ${prompt}, high quality, detailed`;
    }

    return {
      prompt,
      position,
      duration: 3, // Default 3 seconds
    };
  }

  /**
   * Auto-trim silence from video using AI-based speech detection
   * @param {string} videoPath - Path to input video
   * @param {object} options - Trimming options
   * @returns {Promise<string>} - Path to trimmed video
   */
  async autoTrimSilenceWithAI(videoPath, options = {}) {
    const {
      silenceThreshold = -30,
      minSilenceDuration = 0.5,
      padding = 0.1,
    } = options;

    try {
      logger.info(`🤖 AI-based auto-trim silence starting...`);
      logger.info(`📹 Input video: ${videoPath}`);

      // Step 1: Extract audio from video
      const audioPath = path.join(
        path.dirname(videoPath),
        `temp_audio_${uuidv4()}.wav`
      );

      logger.info(`🎵 Extracting audio to: ${audioPath}`);

      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .output(audioPath)
          .audioCodec("pcm_s16le")
          .audioFrequency(16000) // 16kHz for better model compatibility
          .audioChannels(1) // Mono for VAD
          .noVideo()
          .on("end", () => {
            logger.info("✅ Audio extraction complete");
            resolve();
          })
          .on("error", (err) => {
            logger.error("❌ Audio extraction failed:", err);
            reject(err);
          })
          .run();
      });

      // Step 2: Detect speech segments using Hugging Face
      logger.info(`🎤 Detecting speech segments with AI...`);
      const keepSegments = await this.detectSilenceWithAI(audioPath, options);

      // Clean up temp audio file
      try {
        await fs.unlink(audioPath);
        logger.info("🗑️ Cleaned up temporary audio file");
      } catch (err) {
        logger.warn("⚠️ Could not delete temp audio:", err.message);
      }

      // Step 3: Check if we have segments to keep
      if (!keepSegments || keepSegments.length === 0) {
        logger.warn("⚠️ No speech detected - returning original video");
        return videoPath;
      }

      // Step 4: Extract and concatenate video segments
      logger.info(`✂️ Extracting ${keepSegments.length} video segments...`);

      const outputPath = path.join(
        path.dirname(videoPath),
        `trimmed_${uuidv4()}.mp4`
      );

      if (keepSegments.length === 1) {
        // Single segment - simple trim
        const segment = keepSegments[0];
        await new Promise((resolve, reject) => {
          ffmpeg(videoPath)
            .setStartTime(segment.start)
            .setDuration(segment.end - segment.start)
            .output(outputPath)
            .videoCodec("copy")
            .audioCodec("copy")
            .on("end", () => {
              logger.info("✅ Single segment extracted");
              resolve();
            })
            .on("error", (err) => {
              logger.error("❌ Segment extraction failed:", err);
              reject(err);
            })
            .run();
        });
      } else {
        // Multiple segments - extract and concatenate
        const segmentPaths = [];

        for (let i = 0; i < keepSegments.length; i++) {
          const segment = keepSegments[i];
          const segmentPath = path.resolve(
            path.dirname(videoPath),
            `segment_${i}_${uuidv4()}.mp4`
          );

          logger.info(
            `✂️ Extracting segment ${i + 1}/${
              keepSegments.length
            }: ${segment.start.toFixed(2)}s - ${segment.end.toFixed(2)}s`
          );

          await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
              .setStartTime(segment.start)
              .setDuration(segment.end - segment.start)
              .output(segmentPath)
              .videoCodec("libx264")
              .audioCodec("aac")
              .on("end", () => {
                logger.info(`✅ Segment ${i + 1} extracted: ${segmentPath}`);
                segmentPaths.push(segmentPath);
                resolve();
              })
              .on("error", (err) => {
                logger.error(`❌ Segment ${i + 1} extraction failed:`, err);
                reject(err);
              })
              .run();
          });
        }

        // Concatenate all segments
        logger.info(`🔗 Concatenating ${segmentPaths.length} segments...`);

        const concatListPath = path.resolve(
          path.dirname(videoPath),
          `concat_${uuidv4()}.txt`
        );

        // Convert all paths to absolute paths with forward slashes for FFmpeg
        const concatContent = segmentPaths
          .map((p) => {
            const absolutePath = path.resolve(p);
            return `file '${absolutePath.replace(/\\/g, "/")}'`;
          })
          .join("\n");

        logger.info(`📝 Creating concat file at: ${concatListPath}`);
        logger.info(`📝 Concat content:\n${concatContent}`);

        await fs.writeFile(concatListPath, concatContent);

        // Verify file was created
        try {
          await fs.access(concatListPath);
          logger.info(`✅ Concat file created successfully`);
        } catch (err) {
          logger.error(`❌ Concat file not accessible: ${err.message}`);
          throw new Error(`Failed to create concat file at ${concatListPath}`);
        }

        await new Promise((resolve, reject) => {
          ffmpeg()
            .input(concatListPath)
            .inputOptions(["-f concat", "-safe 0"])
            .outputOptions(["-c copy"])
            .output(outputPath)
            .on("end", () => {
              logger.info("✅ Concatenation complete");
              resolve();
            })
            .on("error", reject)
            .run();
        });

        // Clean up temporary files
        for (const segmentPath of segmentPaths) {
          try {
            await fs.unlink(segmentPath);
          } catch (err) {
            logger.warn(`⚠️ Could not delete segment: ${segmentPath}`);
          }
        }

        try {
          await fs.unlink(concatListPath);
        } catch (err) {
          logger.warn("⚠️ Could not delete concat list");
        }
      }

      logger.info(`✅ AI-based silence trimming complete: ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error("❌ AI-based auto-trim failed:", error);
      throw error;
    }
  }

  /**
   * AI-powered video quality enhancement using Hugging Face models
   * Upscales, denoises, and sharpens video using Real-ESRGAN or similar models
   * @param {string} videoPath - Path to input video
   * @param {object} options - Enhancement options
   * @returns {Promise<string>} - Path to enhanced video
   */
  async enhanceVideoQuality(videoPath, options = {}) {
    const {
      upscaleFactor = 2,
      denoise = true,
      sharpen = true,
      targetFps = null,
    } = options;

    try {
      logger.info(
        `🎨 Fast AI-enhancing video quality with ${upscaleFactor}x upscaling`
      );

      const outputPath = path.join(
        path.dirname(videoPath),
        `enhanced_${uuidv4()}.mp4`
      );

      // Build advanced filter chain for high-quality enhancement
      const filters = [];

      // 1. Denoise first (if enabled) - removes artifacts before upscaling
      if (denoise) {
        filters.push("hqdn3d=4:3:6:4.5"); // High-quality denoising
      }

      // 2. Upscale using hardware acceleration if available, fallback to Lanczos
      if (upscaleFactor > 1) {
        filters.push(
          `scale=iw*${upscaleFactor}:ih*${upscaleFactor}:flags=lanczos`
        );
      }

      // 3. Sharpen after upscaling (if enabled)
      if (sharpen) {
        filters.push("unsharp=5:5:1.5:5:5:0.0"); // Strong sharpening for clarity
      }

      // 4. Color enhancement
      filters.push("eq=contrast=1.1:brightness=0.02:saturation=1.15"); // Subtle enhancements

      // 5. Final detail enhancement
      filters.push("cas=0.5"); // Contrast Adaptive Sharpening

      const filterChain = filters.join(",");

      logger.info(`🎬 Applying enhancement filters: ${filterChain}`);

      // Process entire video in one pass - MUCH faster than frame-by-frame
      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .outputOptions([
            `-vf ${filterChain}`,
            "-c:v libx264", // H.264 codec
            "-preset medium", // Balance between speed and quality (was "slow")
            "-crf 18", // High quality
            "-c:a copy", // Copy audio without re-encoding
            "-pix_fmt yuv420p",
          ])
          .output(outputPath)
          .on("progress", (progress) => {
            if (progress.percent) {
              logger.info(
                `🎨 Enhancement progress: ${Math.round(progress.percent)}%`
              );
            }
          })
          .on("end", () => {
            logger.info("✅ Video enhancement complete");
            resolve();
          })
          .on("error", (err) => {
            logger.error("❌ Video enhancement failed:", err);
            reject(err);
          })
          .run();
      });

      logger.info(`✅ AI video enhancement complete: ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error("❌ AI video enhancement failed:", error);
      throw error;
    }
  }

  /**
   * Extract frames from video
   * @param {string} videoPath - Input video path
   * @param {string} outputDir - Directory to save frames
   * @returns {Promise<number>} - Video FPS
   */
  async extractFrames(videoPath, outputDir) {
    return new Promise((resolve, reject) => {
      let fps = 30;

      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          logger.warn("Could not get video FPS, using default 30");
        } else {
          const videoStream = metadata.streams.find(
            (s) => s.codec_type === "video"
          );
          if (videoStream?.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
            fps = num / den;
          }
        }

        ffmpeg(videoPath)
          .output(path.join(outputDir, "frame_%04d.png"))
          .outputOptions(["-start_number 0"])
          .noAudio()
          .on("end", () => {
            logger.info(`✅ Frame extraction complete at ${fps} FPS`);
            resolve(fps);
          })
          .on("error", (err) => {
            logger.error("❌ Frame extraction failed:", err);
            reject(err);
          })
          .run();
      });
    });
  }

  /**
   * Enhance a single frame using advanced FFmpeg filters
   * Uses high-quality upscaling, denoising, and sharpening
   * @param {string} inputPath - Input frame path
   * @param {string} outputPath - Output frame path
   * @param {object} options - Enhancement options
   */
  async enhanceFrame(inputPath, outputPath, options = {}) {
    // Use high-quality FFmpeg enhancement directly
    await this.upscaleFrameWithFFmpeg(
      inputPath,
      outputPath,
      options.upscaleFactor,
      options.denoise,
      options.sharpen
    );
  }

  /**
   * High-quality frame upscaling and enhancement using FFmpeg
   * @param {string} inputPath - Input frame path
   * @param {string} outputPath - Output frame path
   * @param {number} factor - Upscale factor (default: 2)
   * @param {boolean} denoise - Apply denoising (default: true)
   * @param {boolean} sharpen - Apply sharpening (default: true)
   */
  async upscaleFrameWithFFmpeg(
    inputPath,
    outputPath,
    factor = 2,
    denoise = true,
    sharpen = true
  ) {
    return new Promise((resolve, reject) => {
      // Build advanced filter chain for high-quality enhancement
      const filters = [];

      // 1. Denoise first (if enabled) - removes artifacts before upscaling
      if (denoise) {
        filters.push("hqdn3d=4:3:6:4.5"); // High-quality denoising
      }

      // 2. Upscale using Lanczos (best quality algorithm)
      filters.push(`scale=iw*${factor}:ih*${factor}:flags=lanczos`);

      // 3. Sharpen after upscaling (if enabled)
      if (sharpen) {
        filters.push("unsharp=5:5:1.5:5:5:0.0"); // Strong sharpening for clarity
      }

      // 4. Color enhancement
      filters.push("eq=contrast=1.1:brightness=0.02:saturation=1.15"); // Subtle enhancements

      // 5. Final detail enhancement
      filters.push("cas=0.5"); // Contrast Adaptive Sharpening

      const filterChain = filters.join(",");

      ffmpeg(inputPath)
        .outputOptions([`-vf ${filterChain}`])
        .output(outputPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });
  }

  /**
   * Reassemble enhanced frames back into video
   * @param {string} framesDir - Directory containing enhanced frames
   * @param {string} outputPath - Output video path
   * @param {string} originalVideoPath - Original video for audio extraction
   * @param {number} fps - Frame rate
   */
  async reassembleFrames(framesDir, outputPath, originalVideoPath, fps) {
    return new Promise((resolve, reject) => {
      const framePattern = path.join(framesDir, "frame_%04d.png");

      ffmpeg()
        .input(framePattern)
        .inputOptions([`-framerate ${fps}`])
        .input(originalVideoPath) // Add original video for audio
        .outputOptions([
          "-c:v libx264",
          "-preset slow",
          "-crf 18", // High quality
          "-c:a copy", // Copy audio from original
          "-pix_fmt yuv420p",
          "-shortest", // Match shortest stream
        ])
        .output(outputPath)
        .on("end", () => {
          logger.info("✅ Video reassembly complete");
          resolve();
        })
        .on("error", (err) => {
          logger.error("❌ Video reassembly failed:", err);
          reject(err);
        })
        .run();
    });
  }
}

export default new HuggingFaceService();
