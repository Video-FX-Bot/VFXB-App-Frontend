import OpenAI from "openai";
import { logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Video Classification Service with Fine-tuning Support
 *
 * This service provides:
 * 1. Video type detection using GPT-4 Vision API
 * 2. Training data collection for model improvement
 * 3. Fine-tuning support for custom models
 * 4. Feedback loop for continuous learning
 */
class VideoClassificationService {
  constructor() {
    this.openai = null;
    this.trainingDataPath = path.join(__dirname, "../../data/training");
    this.feedbackDataPath = path.join(__dirname, "../../data/feedback");
    this.modelMetricsPath = path.join(__dirname, "../../data/metrics");

    // Ensure directories exist
    this.ensureDirectories();

    // Load existing training data and metrics
    this.trainingData = this.loadTrainingData();
    this.metrics = this.loadMetrics();
  }

  getOpenAI() {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.openai;
  }

  ensureDirectories() {
    [
      this.trainingDataPath,
      this.feedbackDataPath,
      this.modelMetricsPath,
    ].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Analyze video frames and metadata to determine video type
   * Uses GPT-4 Vision for visual analysis
   */
  async classifyVideo(
    videoPath,
    metadata,
    transcription = null,
    frameBase64 = null
  ) {
    try {
      logger.info("Classifying video:", videoPath);

      // Extract key features
      const features = this.extractVideoFeatures(metadata, transcription);

      // Use GPT-4 Vision if frame provided
      let visualAnalysis = null;
      if (frameBase64) {
        visualAnalysis = await this.analyzeFrameWithVision(frameBase64);
      }

      // Combine analyses for final classification
      const classification = await this.getVideoClassification(
        features,
        visualAnalysis,
        transcription
      );

      // Store for training
      this.storeClassificationData(
        videoPath,
        classification,
        features,
        transcription
      );

      return classification;
    } catch (error) {
      logger.error("Error classifying video:", error);
      return this.getFallbackClassification();
    }
  }

  /**
   * Use GPT-4 Vision to analyze video frame
   */
  async analyzeFrameWithVision(frameBase64) {
    try {
      const response = await this.getOpenAI().chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this video frame and determine:
                1. Video type (vlog, tutorial, gaming, presentation, product demo, music video, interview, documentary, sports, cooking, etc.)
                2. Visual style (professional, casual, cinematic, raw, animated, etc.)
                3. Setting (indoor/outdoor, studio, office, home, nature, etc.)
                4. Subject matter
                5. Lighting quality (professional, natural, low-light, etc.)
                6. Camera movement (static, handheld, smooth, etc.)
                
                Respond in JSON format.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${frameBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      logger.error("Error analyzing frame with Vision API:", error);
      return null;
    }
  }

  /**
   * Extract features from video metadata and transcription
   */
  extractVideoFeatures(metadata, transcription) {
    const features = {
      duration: metadata.duration,
      resolution: `${metadata.width}x${metadata.height}`,
      fps: metadata.fps,
      hasAudio: metadata.hasAudio,
      audioChannels: metadata.audioChannels,
      videoBitrate: metadata.videoBitrate,
      audioBitrate: metadata.audioBitrate,
      aspectRatio: metadata.aspectRatio,

      // Derived features
      isVertical: metadata.width < metadata.height,
      isHorizontal: metadata.width > metadata.height,
      isSquare: Math.abs(metadata.width - metadata.height) < 50,
      isShortForm: metadata.duration < 60, // Less than 1 minute
      isLongForm: metadata.duration > 600, // More than 10 minutes
      isHighQuality: metadata.height >= 1080,
      is4K: metadata.height >= 2160,

      // Transcription features
      hasTranscription: !!transcription,
      transcriptionLength: transcription ? transcription.length : 0,
      wordCount: transcription ? transcription.split(/\s+/).length : 0,
    };

    return features;
  }

  /**
   * Get comprehensive video classification
   */
  async getVideoClassification(features, visualAnalysis, transcription) {
    try {
      const prompt = `Analyze this video and classify it with high accuracy:

Features:
${JSON.stringify(features, null, 2)}

${
  visualAnalysis
    ? `Visual Analysis:\n${JSON.stringify(visualAnalysis, null, 2)}`
    : ""
}

${transcription ? `Transcription:\n${transcription.substring(0, 500)}...` : ""}

Provide a detailed classification in JSON format:
{
  "primary_type": "vlog|tutorial|gaming|presentation|product_demo|music_video|interview|documentary|sports|cooking|travel|comedy|review|unboxing|fitness|education|news|animation",
  "secondary_types": ["additional types"],
  "confidence": 0.0-1.0,
  "style": "professional|casual|cinematic|raw|animated",
  "format": "short_form|long_form|vertical|horizontal|square",
  "pacing": "fast|medium|slow",
  "editing_style": "quick_cuts|slow_transitions|static|dynamic",
  "target_audience": "general|professional|youth|family|niche",
  "content_characteristics": {
    "has_talking_head": boolean,
    "has_screen_recording": boolean,
    "has_b_roll": boolean,
    "has_text_overlays": boolean,
    "has_music": boolean,
    "is_scripted": boolean
  },
  "recommended_effects": ["effect names"],
  "recommended_style": {
    "color_grading": "warm|cool|cinematic|vintage|dramatic|natural",
    "transitions": "quick|smooth|creative|minimal",
    "audio_treatment": "enhance|normalize|denoise|add_music"
  }
}`;

      const response = await this.getOpenAI().chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an expert video analyst specializing in content classification and editing recommendations.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent classifications
        max_tokens: 1000,
      });

      const classification = JSON.parse(response.choices[0].message.content);

      // Add timestamp and version
      classification.timestamp = new Date().toISOString();
      classification.classifier_version = "1.0";

      return classification;
    } catch (error) {
      logger.error("Error getting video classification:", error);
      return this.getFallbackClassification();
    }
  }

  /**
   * Store classification data for future training
   */
  storeClassificationData(videoPath, classification, features, transcription) {
    try {
      const dataPoint = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        videoPath: path.basename(videoPath),
        timestamp: new Date().toISOString(),
        classification,
        features,
        transcription: transcription ? transcription.substring(0, 200) : null,
      };

      const filePath = path.join(
        this.trainingDataPath,
        `classification_${dataPoint.id}.json`
      );

      fs.writeFileSync(filePath, JSON.stringify(dataPoint, null, 2));
      logger.info(`Stored training data: ${filePath}`);
    } catch (error) {
      logger.error("Error storing classification data:", error);
    }
  }

  /**
   * Record user feedback on classification accuracy
   * This is crucial for improving the model
   */
  async recordFeedback(classificationId, userFeedback) {
    try {
      const feedback = {
        classificationId,
        timestamp: new Date().toISOString(),
        wasAccurate: userFeedback.wasAccurate,
        correctType: userFeedback.correctType,
        userSatisfaction: userFeedback.userSatisfaction, // 1-5 rating
        comments: userFeedback.comments,
        editsMade: userFeedback.editsMade, // What effects user actually applied
      };

      const filePath = path.join(
        this.feedbackDataPath,
        `feedback_${classificationId}.json`
      );

      fs.writeFileSync(filePath, JSON.stringify(feedback, null, 2));

      // Update metrics
      this.updateMetrics(feedback);

      logger.info(`Recorded feedback for classification: ${classificationId}`);
      return true;
    } catch (error) {
      logger.error("Error recording feedback:", error);
      return false;
    }
  }

  /**
   * Update model performance metrics
   */
  updateMetrics(feedback) {
    try {
      this.metrics.totalClassifications =
        (this.metrics.totalClassifications || 0) + 1;
      this.metrics.accurateClassifications =
        (this.metrics.accurateClassifications || 0) +
        (feedback.wasAccurate ? 1 : 0);
      this.metrics.accuracy =
        this.metrics.accurateClassifications /
        this.metrics.totalClassifications;

      // Track by video type
      if (!this.metrics.byType) this.metrics.byType = {};
      const type = feedback.correctType;
      if (!this.metrics.byType[type]) {
        this.metrics.byType[type] = { total: 0, accurate: 0 };
      }
      this.metrics.byType[type].total++;
      if (feedback.wasAccurate) {
        this.metrics.byType[type].accurate++;
      }

      // Track user satisfaction
      if (!this.metrics.satisfaction) this.metrics.satisfaction = [];
      this.metrics.satisfaction.push(feedback.userSatisfaction);
      this.metrics.averageSatisfaction =
        this.metrics.satisfaction.reduce((a, b) => a + b, 0) /
        this.metrics.satisfaction.length;

      this.metrics.lastUpdated = new Date().toISOString();

      // Save metrics
      this.saveMetrics();
    } catch (error) {
      logger.error("Error updating metrics:", error);
    }
  }

  /**
   * Prepare training dataset for fine-tuning
   */
  async prepareFineTuningDataset() {
    try {
      const trainingFiles = fs
        .readdirSync(this.trainingDataPath)
        .filter((f) => f.startsWith("classification_"));

      const feedbackFiles = fs
        .readdirSync(this.feedbackDataPath)
        .filter((f) => f.startsWith("feedback_"));

      const dataset = [];

      // Load all training data with feedback
      for (const file of trainingFiles) {
        const data = JSON.parse(
          fs.readFileSync(path.join(this.trainingDataPath, file), "utf8")
        );

        // Check if there's feedback for this classification
        const feedbackFile = `feedback_${data.id}.json`;
        let feedback = null;

        if (feedbackFiles.includes(feedbackFile)) {
          feedback = JSON.parse(
            fs.readFileSync(
              path.join(this.feedbackDataPath, feedbackFile),
              "utf8"
            )
          );
        }

        // Only include data with feedback for training
        if (feedback) {
          dataset.push({
            messages: [
              {
                role: "system",
                content: "You are an expert video classifier.",
              },
              {
                role: "user",
                content: `Classify this video:\n${JSON.stringify(
                  data.features
                )}`,
              },
              {
                role: "assistant",
                content: JSON.stringify({
                  primary_type: feedback.correctType,
                  confidence: feedback.wasAccurate ? 0.9 : 0.5,
                }),
              },
            ],
          });
        }
      }

      // Save dataset in JSONL format for OpenAI fine-tuning
      const outputPath = path.join(
        this.trainingDataPath,
        "fine_tuning_dataset.jsonl"
      );
      const jsonlContent = dataset.map((d) => JSON.stringify(d)).join("\n");
      fs.writeFileSync(outputPath, jsonlContent);

      logger.info(
        `Prepared fine-tuning dataset with ${dataset.length} examples`
      );
      logger.info(`Dataset saved to: ${outputPath}`);

      return {
        datasetPath: outputPath,
        exampleCount: dataset.length,
        message:
          "Dataset ready for fine-tuning. Upload to OpenAI to create a custom model.",
      };
    } catch (error) {
      logger.error("Error preparing fine-tuning dataset:", error);
      throw error;
    }
  }

  /**
   * Get current model performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      trainingDataCount: fs
        .readdirSync(this.trainingDataPath)
        .filter((f) => f.startsWith("classification_")).length,
      feedbackCount: fs
        .readdirSync(this.feedbackDataPath)
        .filter((f) => f.startsWith("feedback_")).length,
    };
  }

  /**
   * Get recommendations for improving classification accuracy
   */
  getImprovementRecommendations() {
    const metrics = this.getMetrics();
    const recommendations = [];

    if (metrics.accuracy < 0.7) {
      recommendations.push({
        priority: "high",
        recommendation: "Low accuracy detected. Collect more feedback data.",
        action: "Encourage users to rate classification accuracy",
      });
    }

    if (metrics.feedbackCount < 50) {
      recommendations.push({
        priority: "medium",
        recommendation: "Insufficient training data for fine-tuning.",
        action: `Collect ${50 - metrics.feedbackCount} more feedback samples`,
      });
    }

    if (metrics.feedbackCount >= 50 && metrics.accuracy < 0.85) {
      recommendations.push({
        priority: "high",
        recommendation: "Ready for fine-tuning with existing data.",
        action: "Create custom fine-tuned model using collected feedback",
      });
    }

    // Check for specific type weaknesses
    if (metrics.byType) {
      Object.entries(metrics.byType).forEach(([type, stats]) => {
        const typeAccuracy = stats.accurate / stats.total;
        if (typeAccuracy < 0.6 && stats.total >= 5) {
          recommendations.push({
            priority: "medium",
            recommendation: `Low accuracy for ${type} videos (${Math.round(
              typeAccuracy * 100
            )}%)`,
            action: `Collect more training examples for ${type} content`,
          });
        }
      });
    }

    return recommendations;
  }

  getFallbackClassification() {
    return {
      primary_type: "general",
      secondary_types: [],
      confidence: 0.5,
      style: "casual",
      format: "horizontal",
      pacing: "medium",
      editing_style: "static",
      target_audience: "general",
      content_characteristics: {
        has_talking_head: false,
        has_screen_recording: false,
        has_b_roll: false,
        has_text_overlays: false,
        has_music: false,
        is_scripted: false,
      },
      recommended_effects: ["lut-filter", "audio-enhancement"],
      recommended_style: {
        color_grading: "natural",
        transitions: "minimal",
        audio_treatment: "normalize",
      },
    };
  }

  loadTrainingData() {
    try {
      const files = fs
        .readdirSync(this.trainingDataPath)
        .filter((f) => f.startsWith("classification_"));
      return files.map((f) =>
        JSON.parse(fs.readFileSync(path.join(this.trainingDataPath, f), "utf8"))
      );
    } catch (error) {
      return [];
    }
  }

  loadMetrics() {
    try {
      const metricsFile = path.join(this.modelMetricsPath, "metrics.json");
      if (fs.existsSync(metricsFile)) {
        return JSON.parse(fs.readFileSync(metricsFile, "utf8"));
      }
    } catch (error) {
      logger.error("Error loading metrics:", error);
    }
    return {
      totalClassifications: 0,
      accurateClassifications: 0,
      accuracy: 0,
      satisfaction: [],
      averageSatisfaction: 0,
      byType: {},
    };
  }

  saveMetrics() {
    try {
      const metricsFile = path.join(this.modelMetricsPath, "metrics.json");
      fs.writeFileSync(metricsFile, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      logger.error("Error saving metrics:", error);
    }
  }
}

export default VideoClassificationService;
