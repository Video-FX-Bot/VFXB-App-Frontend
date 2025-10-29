import express from "express";
import fs from "fs";
import path from "path";
import VideoClassificationService from "../services/videoClassificationService.js";
import { VideoProcessor } from "../services/videoProcessor.js";
import { TranscriptionService } from "../services/transcriptionService.js";
import { authenticateToken } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import Video from "../models/Video.js";

const router = express.Router();
const classificationService = new VideoClassificationService();
const videoProcessor = new VideoProcessor();
const transcriptionService = new TranscriptionService();

/**
 * @route   POST /api/classification/classify/:videoId
 * @desc    Classify a video and get editing recommendations
 * @access  Private
 */
router.post("/classify/:videoId", authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { includeFrameAnalysis } = req.body;

    // Get video from database
    const video = await Video.findById(videoId);
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    const videoPath = video.filePath;

    // Get video metadata
    const metadata = await videoProcessor.getVideoMetadata(videoPath);

    // Get transcription if audio exists
    let transcription = null;
    if (metadata.hasAudio) {
      try {
        const transcriptionResult = await transcriptionService.transcribeVideo(
          videoPath
        );
        transcription = transcriptionResult.text;
      } catch (error) {
        logger.warn("Could not transcribe video:", error.message);
      }
    }

    // Extract frame for vision analysis (optional)
    let frameBase64 = null;
    if (includeFrameAnalysis) {
      try {
        frameBase64 = await videoProcessor.extractFrameAsBase64(videoPath, 5); // Extract at 5 seconds
      } catch (error) {
        logger.warn("Could not extract frame:", error.message);
      }
    }

    // Classify the video
    const classification = await classificationService.classifyVideo(
      videoPath,
      metadata,
      transcription,
      frameBase64
    );

    // Store classification ID in video metadata for feedback tracking
    video.classificationId = classification.timestamp;
    await video.save();

    res.json({
      success: true,
      data: {
        classification,
        metadata,
        videoId: video.id,
      },
    });
  } catch (error) {
    logger.error("Error classifying video:", error);
    res.status(500).json({
      success: false,
      message: "Failed to classify video",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/classification/feedback
 * @desc    Submit feedback on classification accuracy
 * @access  Private
 */
router.post("/feedback", authenticateToken, async (req, res) => {
  try {
    const {
      classificationId,
      wasAccurate,
      correctType,
      userSatisfaction,
      comments,
      editsMade,
    } = req.body;

    if (!classificationId) {
      return res.status(400).json({
        success: false,
        message: "Classification ID is required",
      });
    }

    const feedback = {
      wasAccurate: wasAccurate === true,
      correctType,
      userSatisfaction: userSatisfaction || 3,
      comments: comments || "",
      editsMade: editsMade || [],
    };

    const success = await classificationService.recordFeedback(
      classificationId,
      feedback
    );

    if (success) {
      res.json({
        success: true,
        message: "Feedback recorded successfully",
        data: {
          classificationId,
          contributionMessage: "Thank you! Your feedback helps improve our AI.",
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to record feedback",
      });
    }
  } catch (error) {
    logger.error("Error recording feedback:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record feedback",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/classification/metrics
 * @desc    Get model performance metrics
 * @access  Private (Admin only in production)
 */
router.get("/metrics", authenticateToken, async (req, res) => {
  try {
    const metrics = classificationService.getMetrics();
    const recommendations =
      classificationService.getImprovementRecommendations();

    res.json({
      success: true,
      data: {
        metrics,
        recommendations,
        readyForFineTuning: metrics.feedbackCount >= 50,
      },
    });
  } catch (error) {
    logger.error("Error getting metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get metrics",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/classification/prepare-training
 * @desc    Prepare fine-tuning dataset
 * @access  Private (Admin only)
 */
router.post("/prepare-training", authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check in production

    const result = await classificationService.prepareFineTuningDataset();

    res.json({
      success: true,
      data: result,
      instructions: {
        step1: "Download the generated JSONL file",
        step2: "Upload to OpenAI: https://platform.openai.com/finetune",
        step3: "Create a fine-tuning job with the dataset",
        step4: "Update OPENAI_MODEL env variable with new model ID",
        documentation: "https://platform.openai.com/docs/guides/fine-tuning",
      },
    });
  } catch (error) {
    logger.error("Error preparing training dataset:", error);
    res.status(500).json({
      success: false,
      message: "Failed to prepare training dataset",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/classification/download-training-data
 * @desc    Download fine-tuning dataset
 * @access  Private (Admin only)
 */
router.get("/download-training-data", authenticateToken, async (req, res) => {
  try {
    const datasetPath = path.join(
      classificationService.trainingDataPath,
      "fine_tuning_dataset.jsonl"
    );

    if (!fs.existsSync(datasetPath)) {
      return res.status(404).json({
        success: false,
        message:
          "Training dataset not prepared yet. Call /prepare-training first.",
      });
    }

    res.download(datasetPath, "fine_tuning_dataset.jsonl");
  } catch (error) {
    logger.error("Error downloading training data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download training data",
      error: error.message,
    });
  }
});

export default router;
