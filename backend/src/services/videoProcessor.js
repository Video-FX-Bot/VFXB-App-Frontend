import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import cloudinary from '../config/cloudinary.js';

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

export class VideoProcessor {
  constructor() {
    this.outputDir = process.env.UPLOAD_PATH || './uploads';
    this.tempDir = path.join(this.outputDir, 'temp');
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Error creating directories:', error);
    }
  }

  // Safely parse frame rate from string fraction (e.g., "30/1" -> 30)
  parseFrameRate(frameRateString) {
    try {
      if (!frameRateString || typeof frameRateString !== 'string') {
        return 0;
      }
      
      // Handle fraction format (e.g., "30/1", "25000/1001")
      if (frameRateString.includes('/')) {
        const [numerator, denominator] = frameRateString.split('/');
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
      logger.error('Error parsing frame rate:', error);
      return 0;
    }
  }

  // Get video metadata
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          logger.error('Error getting video metadata:', err);
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

        resolve({
          duration: metadata.format.duration,
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          format: metadata.format.format_name,
          hasVideo: !!videoStream,
          hasAudio: !!audioStream,
          video: videoStream ? {
            width: videoStream.width,
            height: videoStream.height,
            fps: this.parseFrameRate(videoStream.r_frame_rate),
            codec: videoStream.codec_name
          } : null,
          audio: audioStream ? {
            codec: audioStream.codec_name,
            sampleRate: audioStream.sample_rate,
            channels: audioStream.channels
          } : null
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
          .videoCodec('libx264')
          .audioCodec('aac');

        if (endTime) {
          command = command.duration(endTime - startTime);
        } else if (duration) {
          command = command.duration(duration);
        }

        command
          .on('end', () => {
            logger.info('Video trimming completed:', outputPath);
            resolve({
              success: true,
              outputPath,
              operation: 'trim',
              parameters: { startTime, endTime, duration }
            });
          })
          .on('error', (err) => {
            logger.error('Error trimming video:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in trimVideo:', error);
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
          .videoCodec('libx264')
          .audioCodec('aac')
          .on('end', () => {
            logger.info('Video cropping completed:', outputPath);
            resolve({
              success: true,
              outputPath,
              operation: 'crop',
              parameters: { width, height, x, y }
            });
          })
          .on('error', (err) => {
            logger.error('Error cropping video:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in cropVideo:', error);
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
        case 'vintage':
          videoFilter = 'curves=vintage';
          break;
        case 'black_white':
          videoFilter = 'hue=s=0';
          break;
        case 'sepia':
          videoFilter = 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131';
          break;
        case 'blur':
          videoFilter = 'boxblur=2:1';
          break;
        case 'sharpen':
          videoFilter = 'unsharp=5:5:1.0:5:5:0.0';
          break;
        default:
          throw new Error(`Unsupported filter type: ${filterType}`);
      }

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .videoFilter(videoFilter)
          .output(outputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .on('end', () => {
            logger.info('Filter applied successfully:', outputPath);
            resolve({
              success: true,
              outputPath,
              operation: 'filter',
              parameters: { filterType }
            });
          })
          .on('error', (err) => {
            logger.error('Error applying filter:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in applyFilter:', error);
      throw error;
    }
  }

  // Adjust color properties
  async adjustColor(videoPath, parameters) {
    try {
      const { brightness = 0, contrast = 1, saturation = 1 } = parameters;
      const outputPath = path.join(this.tempDir, `color_adjusted_${uuidv4()}.mp4`);
      
      const videoFilter = `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`;

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .videoFilter(videoFilter)
          .output(outputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .on('end', () => {
            logger.info('Color adjustment completed:', outputPath);
            resolve({
              success: true,
              outputPath,
              operation: 'color',
              parameters: { brightness, contrast, saturation }
            });
          })
          .on('error', (err) => {
            logger.error('Error adjusting color:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in adjustColor:', error);
      throw error;
    }
  }

  // Enhance audio
  async enhanceAudio(videoPath, parameters) {
    try {
      const { volume = 1, noiseReduction = false } = parameters;
      const outputPath = path.join(this.tempDir, `audio_enhanced_${uuidv4()}.mp4`);
      
      let audioFilter = `volume=${volume}`;
      
      if (noiseReduction) {
        audioFilter += ',highpass=f=200,lowpass=f=3000';
      }

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .audioFilter(audioFilter)
          .output(outputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .on('end', () => {
            logger.info('Audio enhancement completed:', outputPath);
            resolve({
              success: true,
              outputPath,
              operation: 'audio',
              parameters: { volume, noiseReduction }
            });
          })
          .on('error', (err) => {
            logger.error('Error enhancing audio:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in enhanceAudio:', error);
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
        color = 'white',
        startTime = 0,
        duration = 5
      } = parameters;
      
      const outputPath = path.join(this.tempDir, `text_overlay_${uuidv4()}.mp4`);
      
      const textFilter = `drawtext=text='${text}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${color}:enable='between(t,${startTime},${startTime + duration})'`;

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .videoFilter(textFilter)
          .output(outputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .on('end', () => {
            logger.info('Text overlay added:', outputPath);
            resolve({
              success: true,
              outputPath,
              operation: 'text',
              parameters: { text, x, y, fontSize, color, startTime, duration }
            });
          })
          .on('error', (err) => {
            logger.error('Error adding text overlay:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in addText:', error);
      throw error;
    }
  }

  // Add transition (fade in/out)
  async addTransition(videoPath, parameters) {
    try {
      const { type = 'fade', duration = 1, position = 'start' } = parameters;
      const outputPath = path.join(this.tempDir, `transition_${uuidv4()}.mp4`);
      
      let videoFilter;
      
      if (type === 'fade') {
        if (position === 'start') {
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
          .videoCodec('libx264')
          .audioCodec('aac')
          .on('end', () => {
            logger.info('Transition added:', outputPath);
            resolve({
              success: true,
              outputPath,
              operation: 'transition',
              parameters: { type, duration, position }
            });
          })
          .on('error', (err) => {
            logger.error('Error adding transition:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in addTransition:', error);
      throw error;
    }
  }

  // Export video in different formats
  async exportVideo(videoPath, parameters) {
    try {
      const { format = 'mp4', quality = 'high', resolution } = parameters;
      const outputPath = path.join(this.outputDir, `exported_${uuidv4()}.${format}`);
      
      let command = ffmpeg(videoPath).output(outputPath);
      
      // Set quality
      switch (quality) {
        case 'high':
          command = command.videoBitrate('5000k').audioBitrate('192k');
          break;
        case 'medium':
          command = command.videoBitrate('2500k').audioBitrate('128k');
          break;
        case 'low':
          command = command.videoBitrate('1000k').audioBitrate('96k');
          break;
      }
      
      // Set resolution if specified
      if (resolution) {
        command = command.size(resolution);
      }
      
      // Set codec based on format
      switch (format) {
        case 'mp4':
          command = command.videoCodec('libx264').audioCodec('aac');
          break;
        case 'webm':
          command = command.videoCodec('libvpx-vp9').audioCodec('libvorbis');
          break;
        case 'mov':
          command = command.videoCodec('libx264').audioCodec('aac');
          break;
      }

      return new Promise((resolve, reject) => {
        command
          .on('end', () => {
            logger.info('Video export completed:', outputPath);
            resolve({
              success: true,
              outputPath,
              downloadUrl: `/uploads/${path.basename(outputPath)}`,
              operation: 'export',
              parameters: { format, quality, resolution }
            });
          })
          .on('error', (err) => {
            logger.error('Error exporting video:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in exportVideo:', error);
      throw error;
    }
  }

  // Process video background (remove or replace)
  async processBackground(videoPath, parameters) {
    try {
      const { 
        action = 'remove', 
        backgroundImage, 
        color = '#00FF00',
        backgroundColor = '#000000',
        similarity = 0.1,
        blend = 0.2,
        backgroundType = 'solid', // 'solid', 'image', 'blur', 'gradient'
        gradientColors = ['#000000', '#333333'],
        blurRadius = 10
      } = parameters;
      
      const outputPath = path.join(this.tempDir, `background_${uuidv4()}.mp4`);
      
      // Get video metadata to determine dimensions
      const metadata = await this.getVideoMetadata(videoPath);
      const width = metadata.video?.width || 1920;
      const height = metadata.video?.height || 1080;

      return new Promise((resolve, reject) => {
        let command = ffmpeg(videoPath);
        let complexFilter = [];
        let mapOutput = '[ckout]';

        if (action === 'remove') {
          // Remove background using chromakey
          complexFilter.push(`[0:v]chromakey=${color}:${similarity}:${blend}[ckout]`);
        } else if (action === 'replace') {
          // Create background based on type
          if (backgroundType === 'image' && backgroundImage) {
            command = command.input(backgroundImage);
            complexFilter.push(
              `[1:v]scale=${width}:${height}[bg]`,
              `[0:v]chromakey=${color}:${similarity}:${blend}[ckout]`,
              '[bg][ckout]overlay[out]'
            );
            mapOutput = '[out]';
          } else if (backgroundType === 'gradient') {
            const [color1, color2] = gradientColors;
            complexFilter.push(
              `color=${color1}:size=${width}x${height}[c1]`,
              `color=${color2}:size=${width}x${height}[c2]`,
              '[c1][c2]blend=all_mode=overlay[bg]',
              `[0:v]chromakey=${color}:${similarity}:${blend}[ckout]`,
              '[bg][ckout]overlay[out]'
            );
            mapOutput = '[out]';
          } else if (backgroundType === 'blur') {
            // Use blurred version of original video as background
            complexFilter.push(
              `[0:v]split[main][bg]`,
              `[bg]gblur=sigma=${blurRadius}[blurred]`,
              `[main]chromakey=${color}:${similarity}:${blend}[ckout]`,
              '[blurred][ckout]overlay[out]'
            );
            mapOutput = '[out]';
          } else {
            // Solid color background
            complexFilter.push(
              `color=${backgroundColor}:size=${width}x${height}[bg]`,
              `[0:v]chromakey=${color}:${similarity}:${blend}[ckout]`,
              '[bg][ckout]overlay[out]'
            );
            mapOutput = '[out]';
          }
        }

        command
          .complexFilter(complexFilter)
          .map(mapOutput)
          .videoCodec('libx264')
          .audioCodec('copy')
          .outputOptions([
            '-preset', 'medium',
            '-crf', '23'
          ])
          .output(outputPath)
          .on('progress', (progress) => {
            logger.info(`Background processing progress: ${Math.round(progress.percent || 0)}%`);
          })
          .on('end', async () => {
            logger.info('Background processing completed:', outputPath);
            
            // Upload to cloudinary if configured
            let downloadUrl = null;
            if (cloudinary && process.env.CLOUDINARY_CLOUD_NAME) {
              try {
                const uploadResult = await cloudinary.uploader.upload(outputPath, {
                  resource_type: 'video',
                  folder: 'vfxb/processed'
                });
                downloadUrl = uploadResult.secure_url;
              } catch (uploadError) {
                logger.warn('Failed to upload to cloudinary:', uploadError);
              }
            }
            
            resolve({
              success: true,
              outputPath,
              downloadUrl,
              operation: 'background',
              parameters: { 
                action, 
                backgroundType, 
                backgroundImage, 
                backgroundColor,
                color, 
                similarity, 
                blend 
              },
              metadata: {
                originalDimensions: { width, height },
                processingTime: Date.now()
              }
            });
          })
          .on('error', (err) => {
            logger.error('Error processing background:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in processBackground:', error);
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
          logger.info('Cleaned up temp file:', filePath);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up temp files:', error);
    }
  }
}