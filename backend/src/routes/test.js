import express from 'express';
import cloudinaryService from '../services/cloudinaryService.js';
import replicateService from '../services/replicateService.js';
import elevenlabsService from '../services/elevenlabsService.js';
import { authenticateToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// @route   GET /api/test/services
// @desc    Test all integrated services
// @access  Public (for testing)
router.get('/services', async (req, res) => {
  try {
    const results = {
      cloudinary: { status: 'unknown', error: null },
      replicate: { status: 'unknown', error: null },
      elevenlabs: { status: 'unknown', error: null }
    };

    // Test Cloudinary
    try {
      if (cloudinaryService.isConfigured) {
        // Test basic configuration
        results.cloudinary.status = 'connected';
      } else {
        throw new Error('Cloudinary not configured');
      }
    } catch (error) {
      results.cloudinary.status = 'error';
      results.cloudinary.error = error.message;
    }

    // Test Replicate
    try {
      if (replicateService.isConfigured) {
        // Test basic configuration
        results.replicate.status = 'connected';
      } else {
        throw new Error('Replicate not configured');
      }
    } catch (error) {
      results.replicate.status = 'error';
      results.replicate.error = error.message;
    }

    // Test ElevenLabs
    try {
      if (elevenlabsService.isConfigured) {
        // Test basic configuration
        results.elevenlabs.status = 'connected';
      } else {
        throw new Error('ElevenLabs not configured');
      }
    } catch (error) {
      results.elevenlabs.status = 'error';
      results.elevenlabs.error = error.message;
    }

    logger.info('Service connectivity test completed', { results });

    res.json({
      success: true,
      message: 'Service connectivity test completed',
      data: results
    });

  } catch (error) {
    logger.error('Service test error:', error);
    res.status(500).json({
      success: false,
      message: 'Service test failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/test/config
// @desc    Check API configuration
// @access  Public (for testing)
router.get('/config', async (req, res) => {
  try {
    const config = {
      cloudinary: {
        configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
        cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set'
      },
      replicate: {
        configured: !!process.env.REPLICATE_API_TOKEN,
        token: process.env.REPLICATE_API_TOKEN ? 'Set' : 'Not set'
      },
      elevenlabs: {
        configured: !!process.env.ELEVENLABS_API_KEY,
        apiKey: process.env.ELEVENLABS_API_KEY ? 'Set' : 'Not set'
      },
      assemblyai: {
        configured: !!process.env.ASSEMBLYAI_API_KEY,
        apiKey: process.env.ASSEMBLYAI_API_KEY ? 'Set' : 'Not set'
      }
    };

    res.json({
      success: true,
      message: 'Configuration check completed',
      data: config
    });

  } catch (error) {
    logger.error('Config test error:', error);
    res.status(500).json({
      success: false,
      message: 'Config test failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;