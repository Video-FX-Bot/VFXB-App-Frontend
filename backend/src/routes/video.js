import express from "express";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import fsSync from "fs";
import { v4 as uuidv4 } from "uuid";
import rateLimit from "express-rate-limit";
import { Video } from "../models/Video.js";
import { VideoProcessor } from "../services/videoProcessor.js";
import { readUsers } from "../services/fileStore.js";
import { TranscriptionService } from "../services/transcriptionService.js";
import { CloudinaryService } from "../services/cloudinaryService.js";
import { ReplicateService } from "../services/replicateService.js";
import { ElevenLabsService } from "../services/elevenlabsService.js";
import {
  authenticateToken,
  checkSubscriptionLimits,
  logActivity,
} from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import cloudinary from "../config/cloudinary.js";

// Utility functions for formatting and paths
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Helper to ensure absolute paths
const resolveUploadPath = (filename) => {
  const basePath = process.env.UPLOAD_PATH || "./uploads";
  const relativePath = path.join(basePath, "videos", filename);
  return path.resolve(process.cwd(), relativePath);
};

const formatDuration = (seconds) => {
  if (!seconds) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
};

const router = express.Router();
const videoProcessor = new VideoProcessor();
const transcriptionService = new TranscriptionService();
const cloudinaryService = new CloudinaryService();
const replicateService = new ReplicateService();
const elevenlabsService = new ElevenLabsService();

// Rate limiting
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // limit each user to 100 uploads per hour (increased from 10)
  message: {
    success: false,
    message: "Upload limit exceeded. Please try again later.",
  },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each user to 100 requests per 15 minutes
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(
      process.env.UPLOAD_PATH || "./uploads",
      "videos"
    );
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${Date.now()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/x-flv",
    "video/3gpp",
    "video/x-ms-wmv",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only video files are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB max file size
    files: 1,
  },
});

// @route   POST /api/videos/upload
// @desc    Upload a video file
// @access  Private
router.post(
  "/upload",
  authenticateToken,
  uploadLimiter,
  checkSubscriptionLimits("video_upload"),
  logActivity("video_upload"),
  upload.single("video"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No video file provided",
        });
      }

      const { title, description, tags, visibility = "private" } = req.body;

      // Validate required fields
      if (!title || title.trim().length === 0) {
        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          success: false,
          message: "Video title is required",
        });
      }

      // Check file size against user limits
      const userLimits = req.userLimits;
      if (
        userLimits.maxVideoSize !== -1 &&
        req.file.size > userLimits.maxVideoSize
      ) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(413).json({
          success: false,
          message: `File size exceeds limit of ${Math.round(
            userLimits.maxVideoSize / (1024 * 1024)
          )}MB`,
        });
      }

      // Get video metadata
      const metadata = await videoProcessor.getVideoMetadata(req.file.path);

      // Check duration limits
      if (
        userLimits.maxVideoDuration !== -1 &&
        metadata.duration > userLimits.maxVideoDuration
      ) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(413).json({
          success: false,
          message: `Video duration exceeds limit of ${Math.round(
            userLimits.maxVideoDuration / 60
          )} minutes`,
        });
      }

      // Create video record
      const video = new Video({
        title: title.trim(),
        description: description?.trim(),
        tags: tags
          ? tags
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0)
          : [],
        userId: req.user.id,
        originalFilename: req.file.originalname,
        filename: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        visibility,
        metadata: {
          duration: metadata.duration || 0,
          width: metadata.video?.width || 0,
          height: metadata.video?.height || 0,
          fps: metadata.video?.fps || 30,
          bitrate: metadata.bitrate || 0,
          codec: metadata.video?.codec || "unknown",
          format: metadata.format || "mp4",
          hasAudio: metadata.hasAudio || false,
          audioCodec: metadata.audio?.codec || null,
          audioChannels: metadata.audio?.channels || 0,
          audioSampleRate: metadata.audio?.sampleRate || 0,
          fileSize: req.file.size,
        },
        status: "ready",
        filePath: req.file.path,
      });

      await video.save();

      // Generate video URL
      const videoUrl = `/api/videos/${video._id}/stream`;
      video.url = videoUrl;
      await video.save();

      // Update user usage (file storage compatible version)
      const users = await readUsers();
      const userIndex = users.findIndex((u) => u.id === req.user.id);

      if (userIndex !== -1) {
        users[userIndex].usage = users[userIndex].usage || {};
        users[userIndex].usage.video = (users[userIndex].usage.video || 0) + 1;
        users[userIndex].usage.storage =
          (users[userIndex].usage.storage || 0) + req.file.size;
        await fs.writeFile(
          path.join(process.env.DATA_PATH || "./data", "users.json"),
          JSON.stringify(users, null, 2)
        );
      }

      // Start background processing
      processVideoInBackground(video._id);

      logger.info(`Video uploaded: ${video._id} by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: "Video uploaded successfully",
        data: {
          video: {
            id: video._id,
            title: video.title,
            description: video.description,
            tags: video.tags,
            filename: video.filename,
            fileSize: video.fileSize,
            fileSizeFormatted: formatFileSize(video.fileSize),
            duration: video.metadata.duration,
            durationFormatted: formatDuration(video.metadata.duration),
            width: video.metadata.video?.width || 0,
            height: video.metadata.video?.height || 0,
            fps: video.metadata.video?.fps || 30,
            resolution: `${video.metadata.video?.width || 0}x${
              video.metadata.video?.height || 0
            }`,
            status: video.status,
            visibility: video.visibility,
            createdAt: video.createdAt,
            url: `${process.env.API_BASE_URL || ""}/api/videos/${
              video._id
            }/stream`,
            streamUrl: `${process.env.API_BASE_URL || ""}/api/videos/${
              video._id
            }/stream`,
            thumbnailUrl: `${process.env.API_BASE_URL || ""}/api/videos/${
              video._id
            }/thumbnail`,
          },
        },
      });
    } catch (error) {
      logger.error("Video upload error:", error);

      // Clean up uploaded file on error
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          message: "File size too large",
        });
      }

      res.status(500).json({
        success: false,
        message: "Video upload failed",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Background video processing function
async function processVideoInBackground(videoId) {
  try {
    const video = await Video.findById(videoId);
    if (!video) return;

    // Generate thumbnails
    // This would typically involve FFmpeg to extract frames
    // For now, we'll simulate the process

    // Update status to ready
    video.status = "ready";
    video.processingProgress = 100;
    await video.save();

    logger.info(`Video processing completed: ${videoId}`);
  } catch (error) {
    logger.error(`Video processing failed for ${videoId}:`, error);

    // Update video status to failed
    await Video.findByIdAndUpdate(videoId, {
      status: "failed",
      processingError: error.message,
    });
  }
}

// @route   GET /api/videos
// @desc    Get user's videos
// @access  Private
router.get("/", authenticateToken, generalLimiter, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      visibility,
      search,
      sort = "-createdAt",
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
    };

    if (status) options.status = status;
    if (visibility) options.visibility = visibility;

    let query = {
      userId: req.user.id,
      isDeleted: false,
    };

    if (status) query.status = status;
    if (visibility) query.visibility = visibility;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const videos = await Video.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select("-filePath -editHistory")
      .populate("userId", "username avatar");

    const total = await Video.countDocuments(query);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error("Get videos error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
    });
  }
});

// @route   GET /api/videos/:id
// @desc    Get video by ID
// @access  Private
router.get("/:id", authenticateToken, generalLimiter, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate("userId", "username avatar")
      .populate("collaborators.userId", "username avatar");

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Check access permissions
    if (!video.canAccess(req.user.id, "viewer")) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Add view if not the owner
    if (video.userId._id.toString() !== req.user.id) {
      await video.addView(req.user.id, 0, req.ip, req.get("User-Agent"));
    }

    res.json({
      success: true,
      data: { video },
    });
  } catch (error) {
    logger.error("Get video error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch video",
    });
  }
});

// @route   PUT /api/videos/:id
// @desc    Update video metadata
// @access  Private
router.put("/:id", authenticateToken, generalLimiter, async (req, res) => {
  try {
    const { title, description, tags, visibility } = req.body;

    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Check edit permissions
    if (!video.canAccess(req.user.id, "editor")) {
      return res.status(403).json({
        success: false,
        message: "Edit permission denied",
      });
    }

    // Update fields
    if (title !== undefined) video.title = title.trim();
    if (description !== undefined) video.description = description?.trim();
    if (tags !== undefined) {
      video.tags = Array.isArray(tags)
        ? tags
        : tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);
    }
    if (visibility !== undefined) video.visibility = visibility;

    await video.save();

    logger.info(`Video updated: ${video._id} by user ${req.user.id}`);

    res.json({
      success: true,
      message: "Video updated successfully",
      data: { video },
    });
  } catch (error) {
    logger.error("Update video error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update video",
    });
  }
});

// @route   DELETE /api/videos/:id
// @desc    Delete video
// @access  Private
router.delete("/:id", authenticateToken, generalLimiter, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Check delete permissions (only owner or admin)
    if (
      video.userId.toString() !== req.user.id &&
      !req.user.role.includes("admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "Delete permission denied",
      });
    }

    // Soft delete
    video.isDeleted = true;
    video.deletedAt = new Date();
    await video.save();

    // Clean up files in background
    cleanupVideoFiles(video);

    logger.info(`Video deleted: ${video._id} by user ${req.user.id}`);

    res.json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    logger.error("Delete video error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete video",
    });
  }
});

// @route   POST /api/videos/:id/transcribe
// @desc    Transcribe video audio
// @access  Private
router.post(
  "/:id/transcribe",
  authenticateToken,
  checkSubscriptionLimits("ai_request"),
  generalLimiter,
  async (req, res) => {
    try {
      const { provider = "auto", language = "auto" } = req.body;

      const video = await Video.findById(req.params.id);

      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      // Check access permissions
      if (!video.canAccess(req.user.id, "editor")) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      if (video.status !== "ready") {
        return res.status(400).json({
          success: false,
          message: "Video is not ready for transcription",
        });
      }

      // Start transcription
      const transcriptionResult = await transcriptionService.transcribeVideo(
        video.filePath,
        { provider, language }
      );

      // Update video with transcription
      video.transcription = {
        text: transcriptionResult.text,
        language: transcriptionResult.language,
        confidence: transcriptionResult.confidence,
        provider: transcriptionResult.provider,
        segments: transcriptionResult.segments || [],
        words: transcriptionResult.words || [],
        createdAt: new Date(),
      };

      await video.save();

      // Update user usage
      await req.user.incrementUsage("ai_request", 1);

      logger.info(`Video transcribed: ${video._id} by user ${req.user.id}`);

      res.json({
        success: true,
        message: "Video transcribed successfully",
        data: {
          transcription: video.transcription,
        },
      });
    } catch (error) {
      logger.error("Video transcription error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to transcribe video",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/videos/:id/download
// @desc    Download video file
// @access  Private
router.get(
  "/:id/download",
  authenticateToken,
  generalLimiter,
  async (req, res) => {
    try {
      const video = await Video.findById(req.params.id);

      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      // Check download permissions
      if (
        !video.canAccess(req.user.id, "viewer") ||
        (video.visibility === "private" &&
          !video.allowDownload &&
          video.userId.toString() !== req.user.id)
      ) {
        return res.status(403).json({
          success: false,
          message: "Download not allowed",
        });
      }

      // Check if file exists
      try {
        await fs.access(video.filePath);
      } catch {
        return res.status(404).json({
          success: false,
          message: "Video file not found",
        });
      }

      // Update download count
      video.analytics.downloads += 1;
      await video.save();

      // Set headers for download
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${video.originalFilename}"`
      );
      res.setHeader("Content-Type", video.mimeType);

      // Stream file
      const fileStream = require("fs").createReadStream(video.filePath);
      fileStream.pipe(res);

      logger.info(`Video downloaded: ${video._id} by user ${req.user.id}`);
    } catch (error) {
      logger.error("Video download error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to download video",
      });
    }
  }
);

// Helper function to clean up video files
async function cleanupVideoFiles(video) {
  try {
    // Delete main video file
    if (video.filePath) {
      await fs.unlink(video.filePath).catch(() => {});
    }

    // Delete thumbnails
    for (const thumbnail of video.thumbnails || []) {
      if (thumbnail.url && thumbnail.url.startsWith("/uploads/")) {
        const thumbnailPath = path.join(
          process.cwd(),
          "uploads",
          thumbnail.url.replace("/uploads/", "")
        );
        await fs.unlink(thumbnailPath).catch(() => {});
      }
    }

    // Delete versions
    for (const version of video.versions || []) {
      if (version.filePath) {
        await fs.unlink(version.filePath).catch(() => {});
      }
    }

    // Delete exports
    for (const exportFile of video.exports || []) {
      if (exportFile.filePath) {
        await fs.unlink(exportFile.filePath).catch(() => {});
      }
    }

    logger.info(`Cleaned up files for video: ${video._id}`);
  } catch (error) {
    logger.error(`Failed to cleanup files for video ${video._id}:`, error);
  }
}

// @route   POST /api/videos/:id/upload-to-cloud
// @desc    Upload video to Cloudinary
// @access  Private
router.post(
  "/:id/upload-to-cloud",
  authenticateToken,
  generalLimiter,
  checkSubscriptionLimits("cloud_upload"),
  logActivity("cloud_upload"),
  async (req, res) => {
    try {
      const video = await Video.findOne({
        _id: req.params.id,
        userId: req.user.id,
      });

      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      if (video.status !== "ready") {
        return res.status(400).json({
          success: false,
          message: "Video is not ready for cloud upload",
        });
      }

      // Upload to Cloudinary
      const cloudinaryResult = await cloudinaryService.uploadVideo(
        video.filePath,
        {
          public_id: `video_${video._id}`,
          folder: `users/${req.user.id}/videos`,
          resource_type: "video",
        }
      );

      // Update video with cloud URL
      video.cloudUrl = cloudinaryResult.secure_url;
      video.cloudPublicId = cloudinaryResult.public_id;
      await video.save();

      logger.info(
        `Video uploaded to cloud: ${video._id} by user ${req.user.id}`
      );

      res.json({
        success: true,
        message: "Video uploaded to cloud successfully",
        data: {
          cloudUrl: video.cloudUrl,
          publicId: video.cloudPublicId,
        },
      });
    } catch (error) {
      logger.error("Cloud upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload video to cloud",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/videos/:id/ai-enhance
// @desc    Enhance video using AI (upscaling, stabilization, etc.)
// @access  Private
router.post(
  "/:id/ai-enhance",
  authenticateToken,
  generalLimiter,
  checkSubscriptionLimits("ai_enhance"),
  logActivity("ai_enhance"),
  async (req, res) => {
    try {
      const { enhancementType, options = {} } = req.body;

      const video = await Video.findOne({
        _id: req.params.id,
        userId: req.user.id,
      });

      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      if (!video.cloudUrl) {
        return res.status(400).json({
          success: false,
          message: "Video must be uploaded to cloud first",
        });
      }

      let prediction;

      switch (enhancementType) {
        case "upscale":
          prediction = await replicateService.upscaleVideo(
            video.cloudUrl,
            options
          );
          break;
        case "stabilize":
          prediction = await replicateService.stabilizeVideo(
            video.cloudUrl,
            options
          );
          break;
        case "interpolate":
          prediction = await replicateService.interpolateFrames(
            video.cloudUrl,
            options
          );
          break;
        case "colorize":
          prediction = await replicateService.colorizeVideo(
            video.cloudUrl,
            options
          );
          break;
        case "remove_background":
          prediction = await replicateService.removeBackground(
            video.cloudUrl,
            options
          );
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid enhancement type",
          });
      }

      // Store prediction info
      video.aiEnhancements = video.aiEnhancements || [];
      video.aiEnhancements.push({
        type: enhancementType,
        predictionId: prediction.id,
        status: "processing",
        options,
        createdAt: new Date(),
      });
      await video.save();

      logger.info(
        `AI enhancement started: ${enhancementType} for video ${video._id}`
      );

      res.json({
        success: true,
        message: "AI enhancement started",
        data: {
          predictionId: prediction.id,
          enhancementType,
          status: "processing",
        },
      });
    } catch (error) {
      logger.error("AI enhancement error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to start AI enhancement",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/videos/:id/ai-enhance/:predictionId/status
// @desc    Check AI enhancement status
// @access  Private
router.get(
  "/:id/ai-enhance/:predictionId/status",
  authenticateToken,
  generalLimiter,
  async (req, res) => {
    try {
      const video = await Video.findOne({
        _id: req.params.id,
        userId: req.user.id,
      });

      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      const enhancement = video.aiEnhancements?.find(
        (e) => e.predictionId === req.params.predictionId
      );

      if (!enhancement) {
        return res.status(404).json({
          success: false,
          message: "Enhancement not found",
        });
      }

      // Get status from Replicate
      const prediction = await replicateService.getPredictionStatus(
        req.params.predictionId
      );

      // Update enhancement status
      enhancement.status = prediction.status;
      if (prediction.output) {
        enhancement.outputUrl = prediction.output;
      }
      if (prediction.error) {
        enhancement.error = prediction.error;
      }
      await video.save();

      res.json({
        success: true,
        data: {
          predictionId: req.params.predictionId,
          status: prediction.status,
          output: prediction.output,
          error: prediction.error,
        },
      });
    } catch (error) {
      logger.error("Enhancement status check error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check enhancement status",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/videos/:id/generate-voiceover
// @desc    Generate AI voiceover for video
// @access  Private
router.post(
  "/:id/generate-voiceover",
  authenticateToken,
  generalLimiter,
  checkSubscriptionLimits("ai_voiceover"),
  logActivity("ai_voiceover"),
  async (req, res) => {
    try {
      const { text, voiceId, voiceSettings = {} } = req.body;

      const video = await Video.findOne({
        _id: req.params.id,
        userId: req.user.id,
      });

      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Text is required for voiceover generation",
        });
      }

      // Generate voiceover
      const audioBuffer = await elevenlabsService.textToSpeech(
        text,
        voiceId,
        voiceSettings
      );

      // Upload audio to Cloudinary
      const audioResult = await cloudinaryService.uploadAudio(audioBuffer, {
        public_id: `voiceover_${video._id}_${Date.now()}`,
        folder: `users/${req.user.id}/audio`,
        resource_type: "video",
      });

      // Store voiceover info
      video.voiceovers = video.voiceovers || [];
      video.voiceovers.push({
        text,
        voiceId,
        voiceSettings,
        audioUrl: audioResult.secure_url,
        audioPublicId: audioResult.public_id,
        createdAt: new Date(),
      });
      await video.save();

      logger.info(`Voiceover generated for video ${video._id}`);

      res.json({
        success: true,
        message: "Voiceover generated successfully",
        data: {
          audioUrl: audioResult.secure_url,
          publicId: audioResult.public_id,
        },
      });
    } catch (error) {
      logger.error("Voiceover generation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate voiceover",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/videos/ai/voices
// @desc    Get available AI voices
// @access  Private
router.get(
  "/ai/voices",
  authenticateToken,
  generalLimiter,
  async (req, res) => {
    try {
      const voices = await elevenlabsService.getVoices();

      res.json({
        success: true,
        data: { voices },
      });
    } catch (error) {
      logger.error("Get voices error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch available voices",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/videos/:id/stream
// @desc    Stream a video file
// @access  Private
router.get("/:id/stream", authenticateToken, async (req, res) => {
  try {
    const requestedId = req.params.id;
    logger.info(`Looking for video with ID: ${requestedId}`);

    // Find video in MongoDB
    const video = await Video.findById(requestedId);

    if (!video) {
      logger.error(`Video not found with ID: ${requestedId}`);
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    logger.info(`Found video: ${video._id}, filename: ${video.filename}`);

    // Check if user has access to this video
    const videoUserId = video.userId?.toString() || video.userId;
    const requestUserId = req.user.id?.toString() || req.user.id;

    if (
      video.privacy?.visibility === "private" &&
      videoUserId !== requestUserId
    ) {
      logger.error(
        `Access denied for video ${req.params.id} by user ${req.user.id}`
      );
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Get absolute path and ensure it exists
    let videoPath;
    try {
      videoPath = resolveUploadPath(video.filename);
      logger.info(`Attempting to stream video from: ${videoPath}`);
    } catch (error) {
      logger.error(`Error resolving video path: ${error.message}`);
      return res
        .status(500)
        .json({ success: false, message: "Error accessing video file" });
    }

    // Ensure the directory exists
    const videoDir = path.dirname(videoPath);
    try {
      await fs.access(videoDir);
    } catch (error) {
      logger.error(`Video directory not found: ${videoDir}`);
      return res
        .status(500)
        .json({ success: false, message: "Video storage configuration error" });
    }

    // Check if file exists and get stats
    let stat;
    try {
      stat = await fs.stat(videoPath);
    } catch (error) {
      logger.error(
        `Error accessing video file at ${videoPath}: ${error.message}`
      );
      return res
        .status(404)
        .json({ success: false, message: "Video file not found" });
    }

    const fileSize = stat.size;
    const range = req.headers.range;

    let stream;
    try {
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;

        // Validate range
        if (start >= fileSize || end >= fileSize || start > end) {
          res.setHeader("Content-Range", `bytes */${fileSize}`);
          return res.status(416).json({
            success: false,
            message: "Requested range not satisfiable",
          });
        }

        stream = fsSync.createReadStream(videoPath, { start, end });

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": video.mimeType || "video/mp4",
          "Cache-Control": "max-age=3600, public",
          Connection: "keep-alive",
        });
      } else {
        stream = fsSync.createReadStream(videoPath);
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": video.mimeType || "video/mp4",
          "Accept-Ranges": "bytes",
          "Cache-Control": "max-age=3600, public",
          Connection: "keep-alive",
        });
      }
    } catch (error) {
      logger.error(`Error creating stream: ${error.message}`);
      return res
        .status(500)
        .json({ success: false, message: "Error streaming video" });
    }

    // Set up stream error handling
    stream.on("error", (error) => {
      logger.error(`Stream error for video ${req.params.id}: ${error.message}`);
      stream.destroy();
      if (!res.headersSent) {
        res
          .status(500)
          .json({ success: false, message: "Error streaming video" });
      }
    });

    // Set up stream end handling
    stream.on("end", () => {
      logger.info(`Finished streaming video ${req.params.id}`);
    });

    // Cleanup on request close
    req.on("close", () => {
      logger.info(`Request closed for video ${req.params.id}`);
      if (stream) {
        stream.destroy();
      }
    });

    stream.pipe(res);
  } catch (error) {
    logger.error(`Video streaming error: ${error.message}`);
    logger.error(`Error stack: ${error.stack}`);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Error streaming video",
        error: error.message,
      });
    }
  }
});

export default router;
