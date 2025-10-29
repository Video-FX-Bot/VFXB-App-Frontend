import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { promises as fs } from "fs";
import fsSync from "fs";
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

  // Generate video thumbnail
  async generateThumbnail(videoPath, videoId) {
    try {
      const thumbnailDir = path.join(this.outputDir, "thumbnails");
      await fs.mkdir(thumbnailDir, { recursive: true });

      const thumbnailPath = path.join(thumbnailDir, `${videoId}.jpg`);

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            timestamps: ["10%"], // Take screenshot at 10% of video duration
            filename: `${videoId}.jpg`,
            folder: thumbnailDir,
            size: "320x180", // 16:9 aspect ratio thumbnail
          })
          .on("end", () => {
            logger.info(`Thumbnail generated: ${thumbnailPath}`);
            resolve({
              success: true,
              thumbnailPath,
              url: `/uploads/thumbnails/${videoId}.jpg`,
            });
          })
          .on("error", (err) => {
            logger.error("Error generating thumbnail:", err);
            reject(err);
          });
      });
    } catch (error) {
      logger.error("Error in generateThumbnail:", error);
      throw error;
    }
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
      // 🔍 Debug: Log the input video path
      logger.info(`🎬 Adding transition to video:`, {
        inputVideoPath: videoPath,
        parameters,
      });

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

  // Apply subtitles to video with custom styling
  async applySubtitles(videoPath, srtPath, outputPath, style = {}) {
    try {
      logger.info(`📝 Applying subtitles to video: ${videoPath}`);

      // Build subtitle style string for FFmpeg
      const fontsize = style.fontSize || 24;
      const fontcolor = style.fontColor || "white";
      const bordercolor = style.outlineColor || "black";
      const borderw = style.outlineWidth || 2;
      const fontname = style.fontFamily || "Arial";
      const bold = style.bold ? 1 : 0;
      const italic = style.italic ? 1 : 0;

      // Position calculation
      let marginV = 50;
      if (style.position === "top") {
        marginV = style.marginTop || 50;
      } else if (style.position === "bottom") {
        marginV = style.marginBottom || 50;
      }

      // Alignment: 1=left, 2=center, 3=right
      const alignment =
        style.alignment === "left" ? 1 : style.alignment === "right" ? 3 : 2;

      // Build force_style string
      const forceStyle = [
        `FontName=${fontname}`,
        `FontSize=${fontsize}`,
        `PrimaryColour=&H${this.colorToHex(fontcolor)}`,
        `OutlineColour=&H${this.colorToHex(bordercolor)}`,
        `BorderStyle=1`,
        `Outline=${borderw}`,
        `Bold=${bold}`,
        `Italic=${italic}`,
        `Alignment=${alignment}`,
        `MarginV=${marginV}`,
      ].join(",");

      // Escape SRT path for FFmpeg (Windows paths need forward slashes and escaped colons)
      const escapedSrtPath = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .outputOptions([
            `-vf`,
            `subtitles=${escapedSrtPath}:force_style='${forceStyle}'`,
          ])
          .videoCodec("libx264")
          .audioCodec("copy")
          .outputOptions(["-preset", "medium", "-crf", "23"])
          .output(outputPath)
          .on("end", () => {
            logger.info("✅ Subtitles applied successfully:", outputPath);
            resolve({
              success: true,
              outputPath,
              operation: "apply-subtitles",
            });
          })
          .on("error", (err) => {
            logger.error("❌ Error applying subtitles:", err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error("Error in applySubtitles:", error);
      throw error;
    }
  }

  // Convert color name to FFmpeg hex format
  colorToHex(color) {
    const colors = {
      white: "FFFFFF",
      black: "000000",
      red: "0000FF",
      green: "00FF00",
      blue: "FF0000",
      yellow: "00FFFF",
      cyan: "FFFF00",
      magenta: "FF00FF",
    };

    // If it's a hex color already, remove # and return
    if (color.startsWith("#")) {
      return color.slice(1).toUpperCase();
    }

    return colors[color.toLowerCase()] || "FFFFFF";
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

            case "enhance-quality": {
              // Video quality enhancement with denoising, sharpening, and optional upscaling
              const denoise = parameters.denoise !== false; // default true
              const sharpen = parameters.sharpen !== false; // default true
              const upscale = parameters.upscale || false;
              const targetResolution = parameters.targetResolution;
              const enhanceContrast = parameters.enhanceContrast !== false; // default true
              const enhanceColors = parameters.enhanceColors !== false; // default true

              // Apply stronger denoise filter (hqdn3d - high quality denoise 3D)
              // Increased strength for more visible results
              if (denoise) {
                // luma_spatial:chroma_spatial:luma_tmp:chroma_tmp
                // Stronger settings: 6:4:9:6 instead of 4:3:6:4.5
                filters.push(`hqdn3d=6:4:9:6`);
              }

              // Apply more aggressive unsharp mask for noticeable sharpening
              if (sharpen) {
                // unsharp=luma_msize_x:luma_msize_y:luma_amount:chroma_msize_x:chroma_msize_y:chroma_amount
                // Increased amount from 1.0 to 1.5 for more visible sharpening
                filters.push(`unsharp=5:5:1.5:5:5:0.5`);
              }

              // Enhance contrast for more punch
              if (enhanceContrast) {
                // Subtle contrast boost: 1.15 = 15% increase
                filters.push(`eq=contrast=1.15:brightness=0.02`);
              }

              // Enhance color saturation slightly
              if (enhanceColors) {
                // Subtle saturation boost: 1.2 = 20% increase
                filters.push(`eq=saturation=1.2`);
              }

              // Optional upscaling
              if (upscale) {
                const currentWidth = metadata.video.width || 1920;
                const currentHeight = metadata.video.height || 1080;

                let targetWidth, targetHeight;

                if (targetResolution === "4k") {
                  targetWidth = 3840;
                  targetHeight = 2160;
                } else if (targetResolution === "1080p") {
                  targetWidth = 1920;
                  targetHeight = 1080;
                } else if (targetResolution === "720p") {
                  targetWidth = 1280;
                  targetHeight = 720;
                } else {
                  // Default 2x upscale
                  targetWidth = currentWidth * 2;
                  targetHeight = currentHeight * 2;
                }

                // Use lanczos for high-quality upscaling
                filters.push(
                  `scale=${targetWidth}:${targetHeight}:flags=lanczos`
                );
                logger.info(
                  `Upscaling from ${currentWidth}x${currentHeight} to ${targetWidth}x${targetHeight}`
                );
              }

              logger.info(
                `Quality enhancement filters applied: denoise=${denoise}, sharpen=${sharpen}, contrast=${enhanceContrast}, colors=${enhanceColors}, upscale=${upscale}`
              );
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
              const lutType =
                parameters.lut || parameters.preset || "Cinematic";
              const intensityRaw = parameters.intensity || 100;

              // Use linear scaling - simple and predictable
              // User expects 50% = half strength, not 25% strength
              const intensity = intensityRaw / 100;

              logger.info(
                `LUT Filter in multi-effect: ${lutType}, intensity: ${intensityRaw}%`
              );

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

              // Apply intensity by scaling the filter parameters
              if (lutFilter !== "null" && intensity > 0) {
                if (intensity < 1) {
                  // For multi-effect chains with intensity < 100%, we need to use a more complex approach
                  // We'll use split and blend to mix original with filtered
                  // This needs to be handled specially in the filter chain

                  // Calculate adjusted parameters based on intensity
                  // This is a simplified approach that adjusts each filter in the chain
                  const adjustedFilter = lutFilter
                    .split(",")
                    .map((f) => {
                      // For eq filter, scale the parameters
                      if (f.startsWith("eq=")) {
                        const params = f.substring(3).split(":");
                        const adjusted = params
                          .map((p) => {
                            const [key, val] = p.split("=");
                            const numVal = parseFloat(val);
                            if (!isNaN(numVal) && key !== "saturation") {
                              // Scale values towards 0 based on intensity
                              return `${key}=${(numVal * intensity).toFixed(
                                4
                              )}`;
                            } else if (key === "saturation") {
                              // Saturation: scale from 1.0 towards target based on intensity
                              const adjusted = 1 + (numVal - 1) * intensity;
                              return `${key}=${adjusted.toFixed(4)}`;
                            } else if (key === "contrast") {
                              // Contrast: scale from 1.0 towards target based on intensity
                              const adjusted = 1 + (numVal - 1) * intensity;
                              return `${key}=${adjusted.toFixed(4)}`;
                            }
                            return p;
                          })
                          .join(":");
                        return `eq=${adjusted}`;
                      }
                      // For colorbalance, scale all parameters
                      else if (f.startsWith("colorbalance=")) {
                        const params = f.substring(13).split(":");
                        const adjusted = params
                          .map((p) => {
                            const [key, val] = p.split("=");
                            const numVal = parseFloat(val);
                            if (!isNaN(numVal)) {
                              return `${key}=${(numVal * intensity).toFixed(
                                4
                              )}`;
                            }
                            return p;
                          })
                          .join(":");
                        return `colorbalance=${adjusted}`;
                      }
                      // Keep other filters as-is (like curves)
                      return f;
                    })
                    .join(",");

                  logger.info(
                    `Adjusted LUT filter for intensity ${intensityRaw}%: ${adjustedFilter}`
                  );
                  adjustedFilter.split(",").forEach((f) => filters.push(f));
                } else {
                  // Full intensity - apply as-is
                  lutFilter.split(",").forEach((f) => filters.push(f));
                }
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

            case "snow": {
              // Snow particle effect - subtle white specks
              const density = (parameters.density || 50) / 100; // 0-1
              const size = Math.max(1, Math.min(10, parameters.size || 3));

              // Simple approach: light noise with high contrast to create white specks
              const noiseAmount = Math.floor(density * 50);

              filters.push(
                // Add animated white noise
                `noise=alls=${noiseAmount}:allf=t+u`,
                // Boost contrast to make noise look like white dots
                `eq=contrast=3:brightness=0.2`,
                // Slight blur for softer snowflakes
                `boxblur=${Math.max(1, Math.floor(size / 2))}:1`
              );
              break;
            }

            case "fire": {
              // Fire particle effect - warm glow
              const intensity = (parameters.intensity || 70) / 100;

              // Simple warm color overlay
              filters.push(
                // Warm orange/red color shift
                `colorbalance=rs=${intensity * 0.4}:gs=${intensity * 0.2}:bs=-${
                  intensity * 0.3
                }`,
                // Boost saturation and add brightness
                `eq=saturation=${1 + intensity * 0.8}:brightness=${
                  intensity * 0.15
                }`,
                // Add slight blur for glow
                `boxblur=2:1`
              );
              break;
            }

            case "sparkles": {
              // Sparkles effect - twinkling bright points
              const count = Math.max(10, Math.min(200, parameters.count || 50));
              const size = Math.max(1, Math.min(20, parameters.size || 5));

              const sparkleIntensity = count / 200;
              const noiseAmount = Math.floor(sparkleIntensity * 60);

              filters.push(
                // Create bright random points
                `noise=alls=${noiseAmount}:allf=t+u`,
                // High contrast to create distinct sparkles
                `eq=contrast=3.5:brightness=0.3`,
                // Blur for glow effect
                `boxblur=${Math.max(1, Math.floor(size / 2))}:1`
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

  /**
   * Extract a frame from video as base64 for AI vision analysis
   */
  async extractFrameAsBase64(videoPath, timeInSeconds = 5) {
    try {
      const framePath = path.join(this.tempDir, `frame_${uuidv4()}.jpg`);

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .seekInput(timeInSeconds)
          .frames(1)
          .output(framePath)
          .outputOptions([
            "-q:v",
            "2", // High quality JPEG
          ])
          .on("end", () => {
            // Read the frame and convert to base64
            const frameBuffer = fsSync.readFileSync(framePath);
            const base64Frame = frameBuffer.toString("base64");

            // Clean up temp file
            try {
              fsSync.unlinkSync(framePath);
            } catch (e) {
              logger.warn("Could not delete temp frame:", e.message);
            }

            resolve(base64Frame);
          })
          .on("error", (err) => {
            logger.error("Error extracting frame:", err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error("Error in extractFrameAsBase64:", error);
      throw error;
    }
  }
}
