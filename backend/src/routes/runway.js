const express = require('express');
const router = express.Router();
const runwayService = require('../services/runwayService');
const logger = require('../utils/logger');

// Middleware for checking if Runway service is enabled
const checkRunwayEnabled = (req, res, next) => {
  if (!runwayService.isEnabled) {
    return res.status(503).json({
      success: false,
      error: 'Runway service is not enabled. Please configure RUNWAY_API_KEY.'
    });
  }
  next();
};

// Get available models
router.get('/models', checkRunwayEnabled, async (req, res) => {
  try {
    const models = await runwayService.getModels();
    res.json({
      success: true,
      data: models
    });
  } catch (error) {
    logger.error('Failed to get Runway models:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate video
router.post('/generate', checkRunwayEnabled, async (req, res) => {
  try {
    const {
      model,
      prompt,
      image,
      duration,
      aspectRatio,
      motionBrush,
      seed
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required for video generation'
      });
    }

    const result = await runwayService.generateVideo({
      model,
      prompt,
      image,
      duration,
      aspectRatio,
      motionBrush,
      seed
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Video generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get generation status
router.get('/status/:taskId', checkRunwayEnabled, async (req, res) => {
  try {
    const { taskId } = req.params;
    const status = await runwayService.getGenerationStatus(taskId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get generation status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Apply video effects
router.post('/effects', checkRunwayEnabled, async (req, res) => {
  try {
    const { videoUrl, effectType, options } = req.body;

    if (!videoUrl || !effectType) {
      return res.status(400).json({
        success: false,
        error: 'Video URL and effect type are required'
      });
    }

    const result = await runwayService.applyVideoEffect(videoUrl, effectType, options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Effect application failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Upscale video
router.post('/upscale', checkRunwayEnabled, async (req, res) => {
  try {
    const { videoUrl, scaleFactor } = req.body;

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Video URL is required'
      });
    }

    const result = await runwayService.upscaleVideo(videoUrl, scaleFactor);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Video upscaling failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Remove background
router.post('/remove-background', checkRunwayEnabled, async (req, res) => {
  try {
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Video URL is required'
      });
    }

    const result = await runwayService.removeBackground(videoUrl);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Background removal failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get usage statistics
router.get('/usage', checkRunwayEnabled, async (req, res) => {
  try {
    const usage = await runwayService.getUsageStats();
    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    logger.error('Failed to get usage stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel task
router.delete('/tasks/:taskId', checkRunwayEnabled, async (req, res) => {
  try {
    const { taskId } = req.params;
    const result = await runwayService.cancelTask(taskId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to cancel task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;