const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

class VideoProcessor {
  constructor() {
    this.outputDir = process.env.UPLOAD_PATH || './uploads';
    this.tempDir = path.join(this.outputDir, 'temp');
    // Don't call async function in constructor
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create directories:', error);
    }
  }

  /**
   * Apply brightness and contrast effect
   */
  async applyBrightnessContrast(inputPath, brightness = 0, contrast = 0) {
    await this.ensureDirectories();
    const outputPath = this.generateOutputPath(inputPath, 'brightness_contrast');
    
    return new Promise((resolve, reject) => {
      const brightnessValue = 1 + (brightness / 100);
      const contrastValue = 1 + (contrast / 100);
      
      ffmpeg(inputPath)
        .videoFilters(`eq=brightness=${brightness/100}:contrast=${contrastValue}`)
        .output(outputPath)
        .on('end', () => {
          logger.info(`Brightness/Contrast applied: ${outputPath}`);
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          logger.error('Brightness/Contrast error:', err);
          reject({ success: false, error: err.message });
        })
        .run();
    });
  }

  /**
   * Apply Gaussian blur effect
   */
  async applyGaussianBlur(inputPath, radius = 5) {
    const outputPath = this.generateOutputPath(inputPath, 'blur');
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters(`gblur=sigma=${radius}`)
        .output(outputPath)
        .on('end', () => {
          logger.info(`Gaussian blur applied: ${outputPath}`);
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          logger.error('Gaussian blur error:', err);
          reject({ success: false, error: err.message });
        })
        .run();
    });
  }

  /**
   * Apply color correction
   */
  async applyColorCorrection(inputPath, { temperature = 0, tint = 0, saturation = 0, vibrance = 0 }) {
    const outputPath = this.generateOutputPath(inputPath, 'color_correction');
    
    return new Promise((resolve, reject) => {
      // Convert temperature to color balance
      const tempFilter = temperature !== 0 ? `colorbalance=rs=${temperature/100}:gs=0:bs=${-temperature/100}` : '';
      const satFilter = saturation !== 0 ? `eq=saturation=${1 + saturation/100}` : '';
      
      let filters = [tempFilter, satFilter].filter(f => f).join(',');
      if (!filters) filters = 'null'; // No-op filter if no changes
      
      ffmpeg(inputPath)
        .videoFilters(filters)
        .output(outputPath)
        .on('end', () => {
          logger.info(`Color correction applied: ${outputPath}`);
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          logger.error('Color correction error:', err);
          reject({ success: false, error: err.message });
        })
        .run();
    });
  }

  /**
   * Apply motion blur effect
   */
  async applyMotionBlur(inputPath, angle = 0, distance = 10) {
    const outputPath = this.generateOutputPath(inputPath, 'motion_blur');
    
    return new Promise((resolve, reject) => {
      // Convert angle to x,y components
      const radians = (angle * Math.PI) / 180;
      const x = Math.cos(radians) * distance;
      const y = Math.sin(radians) * distance;
      
      ffmpeg(inputPath)
        .videoFilters(`mblur=radius=${distance}`)
        .output(outputPath)
        .on('end', () => {
          logger.info(`Motion blur applied: ${outputPath}`);
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          logger.error('Motion blur error:', err);
          reject({ success: false, error: err.message });
        })
        .run();
    });
  }

  /**
   * Trim video
   */
  async trimVideo(inputPath, startTime, duration) {
    const outputPath = this.generateOutputPath(inputPath, 'trimmed');
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .output(outputPath)
        .on('end', () => {
          logger.info(`Video trimmed: ${outputPath}`);
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          logger.error('Video trim error:', err);
          reject({ success: false, error: err.message });
        })
        .run();
    });
  }

  /**
   * Add text overlay
   */
  async addTextOverlay(inputPath, text, { x = 10, y = 10, fontSize = 24, color = 'white', duration = null }) {
    const outputPath = this.generateOutputPath(inputPath, 'text_overlay');
    
    return new Promise((resolve, reject) => {
      let textFilter = `drawtext=text='${text}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${color}`;
      
      if (duration) {
        textFilter += `:enable='between(t,0,${duration})'`;
      }
      
      ffmpeg(inputPath)
        .videoFilters(textFilter)
        .output(outputPath)
        .on('end', () => {
          logger.info(`Text overlay added: ${outputPath}`);
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          logger.error('Text overlay error:', err);
          reject({ success: false, error: err.message });
        })
        .run();
    });
  }

  /**
   * Apply audio effects
   */
  async applyAudioEffect(inputPath, effectType, parameters = {}) {
    const outputPath = this.generateOutputPath(inputPath, `audio_${effectType}`);
    
    return new Promise((resolve, reject) => {
      let audioFilter = '';
      
      switch (effectType) {
        case 'reverb':
          const { roomSize = 50, damping = 50, wetLevel = 30 } = parameters;
          audioFilter = `aecho=0.8:0.9:${roomSize}:${wetLevel/100}`;
          break;
        case 'echo':
          const { delay = 0.5, decay = 0.6 } = parameters;
          audioFilter = `aecho=${decay}:${decay}:${delay * 1000}:${decay}`;
          break;
        case 'normalize':
          audioFilter = 'loudnorm';
          break;
        default:
          return reject({ success: false, error: 'Unknown audio effect' });
      }
      
      ffmpeg(inputPath)
        .audioFilters(audioFilter)
        .output(outputPath)
        .on('end', () => {
          logger.info(`Audio effect ${effectType} applied: ${outputPath}`);
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          logger.error(`Audio effect ${effectType} error:`, err);
          reject({ success: false, error: err.message });
        })
        .run();
    });
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          logger.error('Metadata extraction error:', err);
          reject({ success: false, error: err.message });
        } else {
          resolve({ success: true, metadata });
        }
      });
    });
  }

  /**
   * Generate unique output path
   */
  generateOutputPath(inputPath, suffix) {
    const ext = path.extname(inputPath);
    const basename = path.basename(inputPath, ext);
    const uniqueId = uuidv4().substring(0, 8);
    return path.join(this.outputDir, `${basename}_${suffix}_${uniqueId}${ext}`);
  }

  /**
   * Export video with specified format and quality
   */
  async exportVideo(inputPath, { format = 'mp4', quality = 'high', resolution = null, bitrate = null }) {
    await this.ensureDirectories();
    const outputPath = this.generateOutputPath(inputPath, `export_${quality}`);
    
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);
      
      // Set format-specific options
      switch (format.toLowerCase()) {
        case 'mp4':
          command = command.format('mp4').videoCodec('libx264').audioCodec('aac');
          break;
        case 'webm':
          command = command.format('webm').videoCodec('libvpx-vp9').audioCodec('libvorbis');
          break;
        case 'mov':
          command = command.format('mov').videoCodec('libx264').audioCodec('aac');
          break;
        case 'avi':
          command = command.format('avi').videoCodec('libx264').audioCodec('mp3');
          break;
        default:
          command = command.format('mp4').videoCodec('libx264').audioCodec('aac');
      }
      
      // Set quality presets
      switch (quality.toLowerCase()) {
        case 'low':
          command = command.videoBitrate('500k').audioBitrate('64k');
          if (!resolution) command = command.size('640x360');
          break;
        case 'medium':
          command = command.videoBitrate('1500k').audioBitrate('128k');
          if (!resolution) command = command.size('1280x720');
          break;
        case 'high':
          command = command.videoBitrate('3000k').audioBitrate('192k');
          if (!resolution) command = command.size('1920x1080');
          break;
        case 'ultra':
          command = command.videoBitrate('8000k').audioBitrate('320k');
          if (!resolution) command = command.size('3840x2160');
          break;
      }
      
      // Override with custom settings if provided
      if (resolution) command = command.size(resolution);
      if (bitrate) command = command.videoBitrate(bitrate);
      
      command
        .output(outputPath)
        .on('progress', (progress) => {
          logger.info(`Export progress: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          logger.info(`Video exported: ${outputPath}`);
          resolve({ success: true, outputPath, format, quality });
        })
        .on('error', (err) => {
          logger.error('Video export error:', err);
          reject({ success: false, error: err.message });
        })
        .run();
    });
  }

  /**
   * Merge multiple videos
   */
  async mergeVideos(inputPaths, outputFormat = 'mp4') {
    await this.ensureDirectories();
    const outputPath = this.generateOutputPath('merged', `merged_${outputFormat}`);
    
    return new Promise((resolve, reject) => {
      let command = ffmpeg();
      
      // Add all input files
      inputPaths.forEach(path => {
        command = command.input(path);
      });
      
      command
        .on('progress', (progress) => {
          logger.info(`Merge progress: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          logger.info(`Videos merged: ${outputPath}`);
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          logger.error('Video merge error:', err);
          reject({ success: false, error: err.message });
        })
        .mergeToFile(outputPath);
    });
  }

  /**
   * Extract audio from video
   */
  async extractAudio(inputPath, format = 'mp3') {
    await this.ensureDirectories();
    const outputPath = this.generateOutputPath(inputPath, `audio_${format}`);
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .noVideo()
        .audioCodec(format === 'mp3' ? 'libmp3lame' : 'aac')
        .format(format)
        .output(outputPath)
        .on('end', () => {
          logger.info(`Audio extracted: ${outputPath}`);
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          logger.error('Audio extraction error:', err);
          reject({ success: false, error: err.message });
        })
        .run();
    });
  }

  /**
   * Clean up temporary files
   */
  async cleanup(filePath) {
    try {
      await fs.unlink(filePath);
      logger.info(`Cleaned up file: ${filePath}`);
    } catch (error) {
      logger.warn(`Failed to cleanup file ${filePath}:`, error.message);
    }
  }
}

module.exports = new VideoProcessor();