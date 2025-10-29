import { logger } from "../utils/logger.js";
import { TranscriptionService } from "./transcriptionService.js";
import { VideoProcessor } from "./videoProcessor.js";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { promises as fs } from "fs";

class CaptionService {
  constructor() {
    this.transcriptionService = new TranscriptionService();
    this.videoProcessor = new VideoProcessor();
  }

  /**
   * Generate captions from video audio
   * @param {string} videoPath - Path to video file
   * @returns {Promise<Object>} - Caption data with timestamps
   */
  async generateCaptions(videoPath) {
    try {
      logger.info(`🎤 Generating captions for video: ${videoPath}`);

      // Use transcription service to get audio text with timestamps
      const transcription = await this.transcriptionService.transcribeVideo(
        videoPath
      );

      if (!transcription || !transcription.segments) {
        throw new Error("Failed to transcribe video audio");
      }

      logger.info(
        `Raw transcription segments:`,
        JSON.stringify(transcription.segments?.slice(0, 2), null, 2)
      );

      // Format captions with timestamps
      const captions = transcription.segments
        .filter((segment) => segment && segment.text) // Filter out empty/undefined segments
        .map((segment, index) => ({
          id: index,
          startTime: segment.start,
          endTime: segment.end,
          text: segment.text.trim(),
          words: segment.words || [], // Word-level timestamps if available
        }));

      logger.info(`✅ Generated ${captions.length} caption segments`);

      return {
        success: true,
        captions,
        language: transcription.language || "en",
        duration: transcription.duration,
      };
    } catch (error) {
      logger.error("Error generating captions:", error);
      throw error;
    }
  }

  /**
   * Apply captions to video with custom styling
   * @param {string} videoPath - Path to input video
   * @param {Array} captions - Caption segments with timestamps
   * @param {Object} style - Caption styling options
   * @returns {Promise<Object>} - Result with output path
   */
  async applyCaptionsToVideo(videoPath, captions, style = {}) {
    try {
      logger.info(`📝 Applying captions to video: ${videoPath}`);

      // Default styling
      const captionStyle = {
        fontFamily: style.fontFamily || "Arial",
        fontSize: style.fontSize || 24,
        fontColor: style.fontColor || "white",
        backgroundColor: style.backgroundColor || "black@0.5",
        outlineColor: style.outlineColor || "black",
        outlineWidth: style.outlineWidth || 2,
        position: style.position || "bottom", // top, center, bottom
        alignment: style.alignment || "center", // left, center, right
        marginBottom: style.marginBottom || 50,
        marginTop: style.marginTop || 50,
        maxWidth: style.maxWidth || 80, // percentage of video width
        uppercase: style.uppercase || false,
        bold: style.bold || false,
        italic: style.italic || false,
      };

      // Generate SRT subtitle file
      const srtPath = await this.generateSRT(captions, videoPath);

      // Apply subtitles with FFmpeg using the subtitle filter
      const outputPath = path.join(
        this.videoProcessor.tempDir,
        `captioned_${uuidv4()}.mp4`
      );

      const result = await this.videoProcessor.applySubtitles(
        videoPath,
        srtPath,
        outputPath,
        captionStyle
      );

      // Return just the output path string
      return result.outputPath || outputPath;
    } catch (error) {
      logger.error("Error applying captions to video:", error);
      throw error;
    }
  }

  /**
   * Generate SRT subtitle file from captions
   * @param {Array} captions - Caption segments
   * @param {string} videoPath - Original video path (for naming)
   * @returns {Promise<string>} - Path to SRT file
   */
  async generateSRT(captions, videoPath) {
    const srtPath = path.join(
      this.videoProcessor.tempDir,
      `${path.basename(videoPath, path.extname(videoPath))}_${uuidv4()}.srt`
    );

    // Format timestamps for SRT (HH:MM:SS,mmm)
    const formatSRTTime = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
    };

    // Generate SRT content
    const srtContent = captions
      .map((caption, index) => {
        return [
          index + 1,
          `${formatSRTTime(caption.startTime)} --> ${formatSRTTime(
            caption.endTime
          )}`,
          caption.text,
          "", // Empty line between entries
        ].join("\n");
      })
      .join("\n");

    await fs.writeFile(srtPath, srtContent, "utf-8");
    logger.info(`✅ Generated SRT file: ${srtPath}`);

    return srtPath;
  }

  /**
   * Edit existing captions
   * @param {Array} captions - Original captions
   * @param {Object} edits - Caption edits to apply
   * @returns {Array} - Updated captions
   */
  editCaptions(captions, edits) {
    const updatedCaptions = [...captions];

    edits.forEach((edit) => {
      const caption = updatedCaptions.find((c) => c.id === edit.id);
      if (caption) {
        if (edit.text !== undefined) caption.text = edit.text;
        if (edit.startTime !== undefined) caption.startTime = edit.startTime;
        if (edit.endTime !== undefined) caption.endTime = edit.endTime;
      }
    });

    return updatedCaptions;
  }

  /**
   * Export captions to various formats
   * @param {Array} captions - Caption segments
   * @param {string} format - Export format (srt, vtt, txt)
   * @returns {string} - Formatted caption text
   */
  exportCaptions(captions, format = "srt") {
    switch (format.toLowerCase()) {
      case "srt":
        return this.toSRT(captions);
      case "vtt":
        return this.toVTT(captions);
      case "txt":
        return this.toPlainText(captions);
      default:
        throw new Error(`Unsupported caption format: ${format}`);
    }
  }

  toSRT(captions) {
    const formatTime = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
    };

    return captions
      .map((caption, index) => {
        return [
          index + 1,
          `${formatTime(caption.startTime)} --> ${formatTime(caption.endTime)}`,
          caption.text,
          "",
        ].join("\n");
      })
      .join("\n");
  }

  toVTT(captions) {
    const formatTime = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = (seconds % 60).toFixed(3);
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(secs).padStart(6, "0")}`;
    };

    return (
      "WEBVTT\n\n" +
      captions
        .map((caption) => {
          return [
            `${formatTime(caption.startTime)} --> ${formatTime(
              caption.endTime
            )}`,
            caption.text,
            "",
          ].join("\n");
        })
        .join("\n")
    );
  }

  toPlainText(captions) {
    return captions.map((caption) => caption.text).join("\n");
  }
}

export default CaptionService;
