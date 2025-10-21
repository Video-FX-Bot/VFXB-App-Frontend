import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger.js";
import cloudinary from "../config/cloudinary.js";

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

export class VideoProcessor {
  constructor() {
    this.outputDir = process.env.UPLOAD_PATH || "./uploads";
    this.tempDir = path.join(this.outputDir, "temp");
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error("Error creating directories:", error);
    }
  }

  // Safely parse frame rate from string fraction (e.g., "30/1" -> 30)
  parseFrameRate(frameRateString) {
    try {
      if (!frameRateString || typeof frameRateString !== "string") {
        return 0;
      }

      // Handle fraction format (e.g., "30/1", "25000/1001")
      if (frameRateString.includes("/")) {
        const [numerator, denominator] = frameRateString.split("/");
        const num = parseFloat(numerator);
        const den = parseFloat(denominator);

        if (isNaN(num) || isNaN(den) || den === 0) {
          return 0;
        }

        return Math.round((num / den) * 100) / 100; // Round to 2 decimal places
      }

      // Handle direct number format
      const fps = parseFloat(frameRateString);
      return isNaN(fps) ? 0 : Math.round(fps * 100) / 100;
    } catch (error) {
      logger.error("Error parsing frame rate:", error);
      return 0;
    }
  }

  // Get video metadata
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          logger.error("Error getting video metadata:", err);
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(
          (stream) => stream.codec_type === "video"
        );
        const audioStream = metadata.streams.find(
          (stream) => stream.codec_type === "audio"
        );

        resolve({
          duration: metadata.format.duration,
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          format: metadata.format.format_name,
          hasVideo: !!videoStream,
          hasAudio: !!audioStream,
          video: videoStream
            ? {
                width: videoStream.width,
                height: videoStream.height,
                fps: this.parseFrameRate(videoStream.r_frame_rate),
                codec: videoStream.codec_name,
              }
            : null,
          audio: audioStream
            ? {
                codec: audioStream.codec_name,
                sampleRate: audioStream.sample_rate,
                channels: audioStream.channels,
              }
            : null,
        });
      });
    });
  }

  // Trim video
  async trimVideo(videoPath, parameters) {
    try {
      const { startTime = 0, endTime, duration } = parameters;
      const outputPath = path.join(this.tempDir, `trimmed_${uuidv4()}.mp4`);

      return new Promise((resolve, reject) => {
        let command = ffmpeg(videoPath)
          .seekInput(startTime)
          .output(outputPath)
          .videoCodec("libx264")
          .audioCodec("aac");

        if (endTime) {
          command = command.duration(endTime - startTime);
        } else if (duration) {
          command = command.duration(duration);
        }

        command
          .on("end", () => {
            logger.info("Video trimming completed:", outputPath);
            resolve({
              success: true,
              outputPath,
              operation: "trim",
              parameters: { startTime, endTime, duration },
            });
          })
          .on("error", (err) => {
            logger.error("Error trimming video:", err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error("Error in trimVideo:", error);
      throw error;
    }
  }

  // Crop video
  async cropVideo(videoPath, parameters) {
    try {
      const { width, height, x = 0, y = 0 } = parameters;
      const outputPath = path.join(this.tempDir, `cropped_${uuidv4()}.mp4`);

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .videoFilter(`crop=${width}:${height}:${x}:${y}`)
          .output(outputPath)
          .videoCodec("libx264")
          .audioCodec("aac")
          .on("end", () => {
            logger.info("Video cropping completed:", outputPath);
            resolve({
              success: true,
              outputPath,
              operation: "crop",
              parameters: { width, height, x, y },
            });
          })
          .on("error", (err) => {
            logger.error("Error cropping video:", err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error("Error in cropVideo:", error);
      throw error;
    }
  }

  // Apply visual filters
  async applyFilter(videoPath, parameters) {
    try {
      const { filterType } = parameters;
      const outputPath = path.join(this.tempDir, `filtered_${uuidv4()}.mp4`);

      let videoFilter;

      switch (filterType) {
        case "vintage":
          videoFilter = "curves=vintage";
          break;
        case "black_white":
          videoFilter = "hue=s=0";
          break;
        case "sepia":
          videoFilter =
            "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131";
          break;
        case "blur":
          videoFilter = "boxblur=2:1";
          break;
        case "sharpen":
          videoFilter = "unsharp=5:5:1.0:5:5:0.0";
          break;
        default:
          throw new Error(`Unsupported filter type: ${filterType}`);
      }

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .videoFilter(videoFilter)
          .output(outputPath)
          .videoCodec("libx264")
          .audioCodec("aac")
          .on("end", () => {
            logger.info("Filter applied successfully:", outputPath);
            resolve({
              success: true,
              outputPath,
              operation: "filter",
              parameters: { filterType },
            });
          })
          .on("error", (err) => {
            logger.error("Error applying filter:", err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error("Error in applyFilter:", error);
      throw error;
    }
  }

  // Adjust color properties
  async adjustColor(videoPath, parameters) {
    try {
      const { brightness = 0, contrast = 1, saturation = 1 } = parameters;
      const outputPath = path.join(
        this.tempDir,
        `color_adjusted_${uuidv4()}.mp4`
      );

      const videoFilter = `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`;

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .videoFilter(videoFilter)
          .output(outputPath)
          .videoCodec("libx264")
          .audioCodec("aac")
          .on("end", () => {
            logger.info("Color adjustment completed:", outputPath);
            resolve({
              success: true,
              outputPath,
              operation: "color",
              parameters: { brightness, contrast, saturation },
            });
          })
          .on("error", (err) => {
            logger.error("Error adjusting color:", err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error("Error in adjustColor:", error);
      throw error;
    }
  }

  // Enhance audio
  async enhanceAudio(videoPath, parameters) {
    try {
      const { volume = 1, noiseReduction = false } = parameters;
      const outputPath = path.join(
        this.tempDir,
        `audio_enhanced_${uuidv4()}.mp4`
      );

      let audioFilter = `volume=${volume}`;

      if (noiseReduction) {
        audioFilter += ",highpass=f=200,lowpass=f=3000";
      }

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .audioFilter(audioFilter)
          .output(outputPath)
          .videoCodec("libx264")
          .audioCodec("aac")
          .on("end", () => {
            logger.info("Audio enhancement completed:", outputPath);
            resolve({
              success: true,
              outputPath,
              operation: "audio",
              parameters: { volume, noiseReduction },
            });
          })
          .on("error", (err) => {
            logger.error("Error enhancing audio:", err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error("Error in enhanceAudio:", error);
      throw error;
    }
  }

  // Add text overlay
  async addText(videoPath, parameters) {
    try {
      const {
        text,
        x = 10,
        y = 10,
        fontSize = 24,
        color = "white",
        startTime = 0,
        duration = 5,
      } = parameters;

      const outputPath = path.join(
        this.tempDir,
        `text_overlay_${uuidv4()}.mp4`
      );

      const textFilter = `drawtext=text='${text}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${color}:enable='between(t,${startTime},${
        startTime + duration
      })'`;

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .videoFilter(textFilter)
          .output(outputPath)
          .videoCodec("libx264")
          .audioCodec("aac")
          .on("end", () => {
            logger.info("Text overlay added:", outputPath);
            resolve({
              success: true,
              outputPath,
              operation: "text",
              parameters: { text, x, y, fontSize, color, startTime, duration },
            });
          })
          .on("error", (err) => {
            logger.error("Error adding text overlay:", err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error("Error in addText:", error);
      throw error;
    }
  }

  // Add transition (fade in/out)
  async addTransition(videoPath, parameters) {
    try {
      const { type = "fade", duration = 1, position = "start" } = parameters;
      const outputPath = path.join(this.tempDir, `transition_${uuidv4()}.mp4`);

      let videoFilter;

      if (type === "fade") {
        if (position === "start") {
          videoFilter = `fade=t=in:st=0:d=${duration}`;
        } else {
          // For fade out, we need to know video duration
          const metadata = await this.getVideoMetadata(videoPath);
          const fadeStart = metadata.duration - duration;
          videoFilter = `fade=t=out:st=${fadeStart}:d=${duration}`;
        }
      }

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .videoFilter(videoFilter)
          .output(outputPath)
          .videoCodec("libx264")
          .audioCodec("aac")
          .on("end", () => {
            logger.info("Transition added:", outputPath);
            resolve({
              success: true,
              outputPath,
              operation: "transition",
              parameters: { type, duration, position },
            });
          })
          .on("error", (err) => {
            logger.error("Error adding transition:", err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error("Error in addTransition:", error);
      throw error;
    }
  }

  // Export video in different formats
  async exportVideo(videoPath, parameters) {
    try {
      const { format = "mp4", quality = "high", resolution } = parameters;
      const outputPath = path.join(
        this.outputDir,
        `exported_${uuidv4()}.${format}`
      );

      let command = ffmpeg(videoPath).output(outputPath);

      // Set quality
      switch (quality) {
        case "high":
          command = command.videoBitrate("5000k").audioBitrate("192k");
          break;
        case "medium":
          command = command.videoBitrate("2500k").audioBitrate("128k");
          break;
        case "low":
          command = command.videoBitrate("1000k").audioBitrate("96k");
          break;
      }

      // Set resolution if specified
      if (resolution) {
        command = command.size(resolution);
      }

      // Set codec based on format
      switch (format) {
        case "mp4":
          command = command.videoCodec("libx264").audioCodec("aac");
          break;
        case "webm":
          command = command.videoCodec("libvpx-vp9").audioCodec("libvorbis");
          break;
        case "mov":
          command = command.videoCodec("libx264").audioCodec("aac");
          break;
      }

      return new Promise((resolve, reject) => {
        command
          .on("end", () => {
            logger.info("Video export completed:", outputPath);
            resolve({
              success: true,
              outputPath,
              downloadUrl: `/uploads/${path.basename(outputPath)}`,
              operation: "export",
              parameters: { format, quality, resolution },
            });
          })
          .on("error", (err) => {
            logger.error("Error exporting video:", err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error("Error in exportVideo:", error);
      throw error;
    }
  }

  // Process video background (remove or replace)
  async processBackground(videoPath, parameters) {
    try {
      const {
        action = "remove",
        backgroundImage,
        color = "#00FF00",
        backgroundColor = "#000000",
        similarity = 0.1,
        blend = 0.2,
        backgroundType = "solid", // 'solid', 'image', 'blur', 'gradient'
        gradientColors = ["#000000", "#333333"],
        blurRadius = 10,
      } = parameters;

      const outputPath = path.join(this.tempDir, `background_${uuidv4()}.mp4`);

      // Get video metadata to determine dimensions
      const metadata = await this.getVideoMetadata(videoPath);
      const width = metadata.video?.width || 1920;
      const height = metadata.video?.height || 1080;

      return new Promise((resolve, reject) => {
        let command = ffmpeg(videoPath);
        let complexFilter = [];
        let mapOutput = "[ckout]";

        if (action === "remove") {
          // Remove background using chromakey
          complexFilter.push(
            `[0:v]chromakey=${color}:${similarity}:${blend}[ckout]`
          );
        } else if (action === "replace") {
          // Create background based on type
          if (backgroundType === "image" && backgroundImage) {
            command = command.input(backgroundImage);
            complexFilter.push(
              `[1:v]scale=${width}:${height}[bg]`,
              `[0:v]chromakey=${color}:${similarity}:${blend}[ckout]`,
              "[bg][ckout]overlay[out]"
            );
            mapOutput = "[out]";
          } else if (backgroundType === "gradient") {
            const [color1, color2] = gradientColors;
            complexFilter.push(
              `color=${color1}:size=${width}x${height}[c1]`,
              `color=${color2}:size=${width}x${height}[c2]`,
              "[c1][c2]blend=all_mode=overlay[bg]",
              `[0:v]chromakey=${color}:${similarity}:${blend}[ckout]`,
              "[bg][ckout]overlay[out]"
            );
            mapOutput = "[out]";
          } else if (backgroundType === "blur") {
            // Use blurred version of original video as background
            complexFilter.push(
              `[0:v]split[main][bg]`,
              `[bg]gblur=sigma=${blurRadius}[blurred]`,
              `[main]chromakey=${color}:${similarity}:${blend}[ckout]`,
              "[blurred][ckout]overlay[out]"
            );
            mapOutput = "[out]";
          } else {
            // Solid color background
            complexFilter.push(
              `color=${backgroundColor}:size=${width}x${height}[bg]`,
              `[0:v]chromakey=${color}:${similarity}:${blend}[ckout]`,
              "[bg][ckout]overlay[out]"
            );
            mapOutput = "[out]";
          }
        }

        command
          .complexFilter(complexFilter)
          .map(mapOutput)
          .videoCodec("libx264")
          .audioCodec("copy")
          .outputOptions(["-preset", "medium", "-crf", "23"])
          .output(outputPath)
          .on("progress", (progress) => {
            logger.info(
              `Background processing progress: ${Math.round(
                progress.percent || 0
              )}%`
            );
          })
          .on("end", async () => {
            logger.info("Background processing completed:", outputPath);

            // Upload to cloudinary if configured
            let downloadUrl = null;
            if (cloudinary && process.env.CLOUDINARY_CLOUD_NAME) {
              try {
                const uploadResult = await cloudinary.uploader.upload(
                  outputPath,
                  {
                    resource_type: "video",
                    folder: "vfxb/processed",
                  }
                );
                downloadUrl = uploadResult.secure_url;
              } catch (uploadError) {
                logger.warn("Failed to upload to cloudinary:", uploadError);
              }
            }

            resolve({
              success: true,
              outputPath,
              downloadUrl,
              operation: "background",
              parameters: {
                action,
                backgroundType,
                backgroundImage,
                backgroundColor,
                color,
                similarity,
                blend,
              },
              metadata: {
                originalDimensions: { width, height },
                processingTime: Date.now(),
              },
            });
          })
          .on("error", (err) => {
            logger.error("Error processing background:", err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error("Error in processBackground:", error);
      throw error;
    }
  }

  // Clean up temporary files
  async cleanupTempFiles(olderThanHours = 24) {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const cutoff = olderThanHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > cutoff) {
          await fs.unlink(filePath);
          logger.info("Cleaned up temp file:", filePath);
        }
      }
    } catch (error) {
      logger.error("Error cleaning up temp files:", error);
    }
  }

  // Apply video effects
  async applyEffect(videoPath, effect, parameters) {
    try {
      const outputPath = path.join(this.tempDir, `effect_${uuidv4()}.mp4`);
      const metadata = await this.getVideoMetadata(videoPath);

      return new Promise((resolve, reject) => {
        let command = ffmpeg(videoPath);
        let complexFilter = [];

        // Apply the effect based on its type
        // Effect can be either a string or an object with .id property
        const effectId = typeof effect === "string" ? effect : effect.id;

        switch (effectId) {
          case "brightness":
            // Using exposure filter for brightness (more natural, photographic adjustment)
            // and eq for contrast
            // UI slider goes from -100 to +100

            logger.info(`Raw parameters received:`, parameters);

            const brightnessRaw = parameters.brightness || 0;
            const contrastRaw = parameters.contrast || 0;

            // Scale to appropriate ranges - subtle adjustments
            // Exposure: divide by 100 for subtle effect (-100 -> -1.0, 100 -> 1.0 stops)
            // Contrast: convert -100 to +100 range to 0.7 to 1.3 multiplier (1.0 = normal)
            // INVERTED: User expects +100 to brighten, but FFmpeg contrast works inversely
            // So we negate the input: user's +100 -> -100 -> 0.7, user's -100 -> +100 -> 1.3
            const exposure = brightnessRaw / 100;
            const contrast = 1.0 + -contrastRaw / 333.33; // Inverted: +100 -> 0.7, 0 -> 1.0, -100 -> 1.3

            logger.info(
              `Brightness effect - Raw: brightness=${brightnessRaw}, contrast=${contrastRaw}`
            );
            logger.info(
              `Brightness effect - Scaled: exposure=${exposure}, contrast=${contrast} (contrast inverted)`
            );

            // Build filter chain
            let filters = [];
            if (brightnessRaw !== 0) {
              filters.push(`exposure=${exposure}`);
            }
            if (contrastRaw !== 0) {
              filters.push(`eq=contrast=${contrast}`);
            }

            // If no adjustments, apply neutral filter
            if (filters.length === 0) {
              filters.push("null");
            }

            const filterString = filters.join(",");
            logger.info(`Applying FFmpeg filter: ${filterString}`);

            command.videoFilters(filterString);
            break;

          case "gaussian-blur":
            // Gaussian blur using gblur filter
            // radius parameter: 0-50, default 5
            const blurRadius = parameters.radius || 5;
            logger.info(`Applying Gaussian blur with radius: ${blurRadius}`);

            // gblur sigma parameter: higher = more blur
            // Convert radius to sigma (radius/2 is a good approximation)
            const sigma = blurRadius / 2;
            command.videoFilters(`gblur=sigma=${sigma}`);
            break;

          case "motion-blur":
            // Motion blur using directional blur
            // angle parameter: 0-360, default 0 (horizontal)
            // strength parameter: 0-100, default 10
            const angle = parameters.angle || 0;
            const strength = parameters.strength || 10;

            logger.info(
              `Applying Motion blur - angle: ${angle}, strength: ${strength}`
            );

            // Convert angle to radians and calculate direction
            const angleRad = (angle * Math.PI) / 180;
            const dx = Math.cos(angleRad) * strength;
            const dy = Math.sin(angleRad) * strength;

            // Use directional blur (avgblur) or multiple box blurs
            // For simplicity, use box blur with intensity based on strength
            const blurAmount = Math.max(1, Math.floor(strength / 5));
            command.videoFilters(`boxblur=${blurAmount}:1`);
            break;

          // Add more effects here as needed
          case "color-correction":
            const temperature = (parameters.temperature || 0) / 100;
            const tint = (parameters.tint || 0) / 100;
            const saturation = (parameters.saturation || 0) / 100 + 1;

            if (temperature !== 0) {
              command.videoFilters(
                `colortemperature=temperature=${3000 + temperature * 4000}`
              );
            }
            if (tint !== 0) {
              command.videoFilters(`colorbalance=gm=${tint}:bm=${-tint}`);
            }
            if (saturation !== 1) {
              command.videoFilters(`eq=saturation=${saturation}`);
            }
            break;

          case "lut-filter":
            // Apply cinematic color grading using curves and color adjustments
            const lutType = parameters.lut || "Cinematic";
            const intensity = (parameters.intensity || 100) / 100;

            logger.info(
              `Applying LUT filter: ${lutType} with intensity ${intensity}`
            );

            let lutFilter = "";
            switch (lutType) {
              case "Cinematic":
                // Teal shadows, orange highlights, crushed blacks, S-curve contrast
                lutFilter = `eq=contrast=1.2:brightness=-0.05:saturation=1.15,colorbalance=rs=0.15:gs=0.05:bs=-0.15:rm=0.05:gm=-0.02:bm=0.1:rh=0.2:gh=0.08:bh=-0.2`;
                break;
              case "Warm":
                // Orange/golden tone, lifted shadows
                lutFilter = `eq=contrast=1.1:brightness=0.05:saturation=1.2,colorbalance=rs=0.2:gs=0.1:bs=-0.1:rm=0.15:gm=0.05:bm=-0.05:rh=0.2:gh=0.1:bh=-0.1`;
                break;
              case "Cool":
                // Blue/teal tone, crisp look
                lutFilter = `eq=contrast=1.15:saturation=1.15,colorbalance=rs=-0.15:gs=-0.05:bs=0.2:rm=-0.1:bm=0.15:rh=-0.05:gh=0.05:bh=0.15`;
                break;
              case "Vintage":
                // Faded, slightly desaturated, warm shadows
                lutFilter = `curves=vintage,eq=contrast=0.9:brightness=0.05:saturation=0.8,colorbalance=rs=0.15:gs=0.1:bs=-0.05`;
                break;
              case "Dramatic":
                // High contrast, crushed blacks, saturated colors
                lutFilter = `curves=strong_contrast,eq=contrast=1.3:brightness=-0.05:saturation=1.3,colorbalance=rs=0.05:bs=0.05`;
                break;
              default:
                lutFilter = "null"; // No effect
            }

            // Apply intensity by blending with original
            if (intensity < 1 && intensity > 0) {
              // Use blend filter to mix original with LUT
              command.videoFilters(
                `split[original][lut];[lut]${lutFilter}[lutted];[original][lutted]blend=all_expr='A*${
                  1 - intensity
                }+B*${intensity}'`
              );
            } else if (intensity >= 1) {
              command.videoFilters(lutFilter);
            }
            // If intensity is 0, no filter applied (already handled by filter check)
            break;

          case "cross-dissolve":
            // Cross dissolve - fade in/out effect
            const crossDuration = parseFloat(parameters.duration) || 1;
            const fadeStart = Math.max(0, metadata.duration - crossDuration);

            logger.info(
              `Applying cross dissolve: duration ${crossDuration}s, fadeStart ${fadeStart}s`
            );

            // Apply both fade in and fade out
            command.videoFilters(
              `fade=t=in:st=0:d=${crossDuration},fade=t=out:st=${fadeStart}:d=${crossDuration}`
            );
            break;

          case "zoom-transition":
            // Zoom transition - animated zoom effect
            const zoomType = parameters.zoomType || "Zoom In";
            const centerX = parseFloat(parameters.centerX) || 50;
            const centerY = parseFloat(parameters.centerY) || 50;
            const zoomDuration = parseFloat(parameters.duration) || 1;

            logger.info(
              `Applying zoom transition: ${zoomType}, center (${centerX}%, ${centerY}%), duration ${zoomDuration}s`
            );

            // Calculate zoom parameters
            const fps = metadata.video.fps || 30;
            const totalFrames = Math.floor(metadata.duration * fps);
            const zoomFrames = Math.floor(zoomDuration * fps);

            // Create zoom expression based on type
            let zoomExpr;
            if (zoomType === "Zoom Out") {
              // Start zoomed in (1.5x) and zoom out to normal (1x)
              zoomExpr = `'if(lte(on,${zoomFrames}),1.5-(on/${zoomFrames})*0.5,1)'`;
            } else if (zoomType === "Zoom In-Out") {
              // Zoom in then out over the duration
              const halfFrames = Math.floor(zoomFrames / 2);
              zoomExpr = `'if(lte(on,${halfFrames}),1+(on/${halfFrames})*0.5,if(lte(on,${zoomFrames}),1.5-((on-${halfFrames})/${halfFrames})*0.5,1))'`;
            } else {
              // Zoom In: Start at 1x and zoom to 1.5x
              zoomExpr = `'if(lte(on,${zoomFrames}),1+(on/${zoomFrames})*0.5,1.5)'`;
            }

            command.videoFilters(
              `zoompan=z=${zoomExpr}:d=${totalFrames}:s=${metadata.video.width}x${metadata.video.height}:fps=${fps}`
            );
            break;

          default:
            reject(new Error(`Unsupported effect: ${effectId}`));
            return;
        }

        command
          .videoCodec("libx264")
          .audioCodec("aac") // Use AAC for better browser compatibility
          .audioBitrate("192k") // Higher quality audio
          .outputOptions([
            "-preset",
            "slow", // Better quality (slower encoding)
            "-crf",
            "18", // Higher quality (lower = better, 18 is visually lossless)
            "-pix_fmt",
            "yuv420p", // Ensure compatibility
            "-movflags",
            "+faststart", // Enable streaming
            "-profile:v",
            "high", // H.264 High profile for better quality
            "-level",
            "4.0", // Compatible level
          ])
          .output(outputPath)
          .on("progress", (progress) => {
            logger.info(
              `Effect processing progress: ${Math.round(
                progress.percent || 0
              )}%`
            );
          })
          .on("end", async () => {
            logger.info("Effect processing completed:", outputPath);

            // Upload to cloudinary if configured
            let downloadUrl = null;
            if (cloudinary && process.env.CLOUDINARY_CLOUD_NAME) {
              try {
                const uploadResult = await cloudinary.uploader.upload(
                  outputPath,
                  {
                    resource_type: "video",
                    folder: "vfxb/processed",
                  }
                );
                downloadUrl = uploadResult.secure_url;
              } catch (uploadError) {
                logger.warn("Failed to upload to cloudinary:", uploadError);
              }
            }

            resolve({
              success: true,
              outputPath,
              downloadUrl,
              operation: "effect",
              effect: effect.id,
              parameters,
              metadata: {
                processingTime: Date.now(),
              },
            });
          })
          .on("error", (err) => {
            logger.error("Error processing effect:", err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error("Error in applyEffect:", error);
      throw error;
    }
  }

  /**
   * Apply multiple effects to a video in a single FFmpeg command
   * This allows stacking effects like blur + brightness + contrast
   */
  async applyMultipleEffects(videoPath, effects) {
    try {
      const outputPath = path.join(
        this.tempDir,
        `multi_effect_${uuidv4()}.mp4`
      );
      const metadata = await this.getVideoMetadata(videoPath);

      logger.info(`Applying ${effects.length} effects:`, effects);

      return new Promise((resolve, reject) => {
        let command = ffmpeg(videoPath);
        let filters = [];

        // Build filter chain for all effects
        for (const { effect, parameters } of effects) {
          const effectId = typeof effect === "string" ? effect : effect.id;

          switch (effectId) {
            case "brightness": {
              const brightnessRaw = parameters.brightness || 0;
              const contrastRaw = parameters.contrast || 0;
              const exposure = brightnessRaw / 100;
              const contrast = 1.0 + -contrastRaw / 333.33;

              if (brightnessRaw !== 0) {
                filters.push(`exposure=${exposure}`);
              }
              if (contrastRaw !== 0) {
                filters.push(`eq=contrast=${contrast}`);
              }
              break;
            }

            case "gaussian-blur": {
              const blurRadius = parameters.radius || 5;
              const sigma = blurRadius / 2;
              filters.push(`gblur=sigma=${sigma}`);
              break;
            }

            case "motion-blur": {
              const strength = parameters.strength || 10;
              const blurAmount = Math.max(1, Math.floor(strength / 5));
              filters.push(`boxblur=${blurAmount}:1`);
              break;
            }

            case "color-correction": {
              const temperature = (parameters.temperature || 0) / 100;
              const tint = (parameters.tint || 0) / 100;
              const saturation = (parameters.saturation || 0) / 100 + 1;

              if (temperature !== 0) {
                filters.push(
                  `colortemperature=temperature=${3000 + temperature * 4000}`
                );
              }
              if (tint !== 0) {
                filters.push(`colorbalance=gm=${tint}:bm=${-tint}`);
              }
              if (saturation !== 1) {
                filters.push(`eq=saturation=${saturation}`);
              }
              break;
            }

            case "lut-filter": {
              const lutType = parameters.lut || "Cinematic";
              const intensity = (parameters.intensity || 100) / 100;

              let lutFilter = "";
              switch (lutType) {
                case "Cinematic":
                  lutFilter = `eq=contrast=1.2:brightness=-0.05:saturation=1.15,colorbalance=rs=0.15:gs=0.05:bs=-0.15:rm=0.05:gm=-0.02:bm=0.1:rh=0.2:gh=0.08:bh=-0.2`;
                  break;
                case "Warm":
                  lutFilter = `eq=contrast=1.1:brightness=0.05:saturation=1.2,colorbalance=rs=0.2:gs=0.1:bs=-0.1:rm=0.15:gm=0.05:bm=-0.05:rh=0.2:gh=0.1:bh=-0.1`;
                  break;
                case "Cool":
                  lutFilter = `eq=contrast=1.15:saturation=1.15,colorbalance=rs=-0.15:gs=-0.05:bs=0.2:rm=-0.1:bm=0.15:rh=-0.05:gh=0.05:bh=0.15`;
                  break;
                case "Vintage":
                  lutFilter = `curves=vintage,eq=contrast=0.9:brightness=0.05:saturation=0.8,colorbalance=rs=0.15:gs=0.1:bs=-0.05`;
                  break;
                case "Dramatic":
                  lutFilter = `curves=strong_contrast,eq=contrast=1.3:brightness=-0.05:saturation=1.3,colorbalance=rs=0.05:bs=0.05`;
                  break;
                default:
                  lutFilter = "null";
              }

              // For multi-effect, we'll apply at full intensity in the chain
              // Individual intensity blending is complex in filter chains
              if (lutFilter !== "null") {
                // Split the comma-separated filters and add them individually
                lutFilter.split(",").forEach((f) => filters.push(f));
              }
              break;
            }

            case "cross-dissolve": {
              const crossDuration = parseFloat(parameters.duration) || 1;
              const fadeStart = Math.max(0, metadata.duration - crossDuration);
              filters.push(`fade=t=in:st=0:d=${crossDuration}`);
              filters.push(`fade=t=out:st=${fadeStart}:d=${crossDuration}`);
              break;
            }

            case "zoom-transition": {
              const zoomType = parameters.zoomType || "Zoom In";
              const zoomDuration = parseFloat(parameters.duration) || 1;

              // Calculate zoom parameters for animated zoom
              const fps = metadata.video.fps || 30;
              const totalFrames = Math.floor(metadata.duration * fps);
              const zoomFrames = Math.floor(zoomDuration * fps);

              // Create zoom expression based on type
              let zoomExpr;
              if (zoomType === "Zoom Out") {
                zoomExpr = `'if(lte(on,${zoomFrames}),1.5-(on/${zoomFrames})*0.5,1)'`;
              } else if (zoomType === "Zoom In-Out") {
                const halfFrames = Math.floor(zoomFrames / 2);
                zoomExpr = `'if(lte(on,${halfFrames}),1+(on/${halfFrames})*0.5,if(lte(on,${zoomFrames}),1.5-((on-${halfFrames})/${halfFrames})*0.5,1))'`;
              } else {
                zoomExpr = `'if(lte(on,${zoomFrames}),1+(on/${zoomFrames})*0.5,1.5)'`;
              }

              filters.push(
                `zoompan=z=${zoomExpr}:d=${totalFrames}:s=${metadata.video.width}x${metadata.video.height}:fps=${fps}`
              );
              break;
            }

            default:
              logger.warn(`Unsupported effect in multi-effect: ${effectId}`);
          }
        }

        // If no filters, apply null filter
        if (filters.length === 0) {
          filters.push("null");
        }

        // Join filters with commas to create filter chain
        const filterString = filters.join(",");
        logger.info(`Applying combined FFmpeg filter: ${filterString}`);

        command
          .videoFilters(filterString)
          .videoCodec("libx264")
          .audioCodec("aac")
          .audioBitrate("192k")
          .outputOptions([
            "-preset",
            "slow",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-profile:v",
            "high",
            "-level",
            "4.0",
          ])
          .output(outputPath)
          .on("progress", (progress) => {
            logger.info(
              `Multi-effect processing progress: ${Math.round(
                progress.percent || 0
              )}%`
            );
          })
          .on("end", () => {
            logger.info("Multi-effect processing completed:", outputPath);
            resolve({
              success: true,
              outputPath,
              operation: "multi-effect",
              effects: effects,
              metadata: {
                processingTime: Date.now(),
              },
            });
          })
          .on("error", (err) => {
            logger.error("Error processing multi-effect:", err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error("Error in applyMultipleEffects:", error);
      throw error;
    }
  }
}
