const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { csrfProtection } = require('../middleware/auth');
const videoProcessor = require('../services/videoProcessor');
const effectsProcessor = require('../services/effectsProcessor');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 500 * 1024 * 1024 // 500MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedFormats = (process.env.ALLOWED_VIDEO_FORMATS || 'mp4,mov,avi,mkv,webm').split(',');
    const fileExt = path.extname(file.originalname).toLowerCase().substring(1);
    
    if (allowedFormats.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file format. Allowed formats: ${allowedFormats.join(', ')}`), false);
    }
  }
});

// Rate limiting
const videoRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 video processing requests per windowMs
  message: {
    success: false,
    error: 'Too many video processing requests from this IP, please try again later.'
  }
});

// Validation middleware
const validateEffectRequest = [
  body('effectId')
    .isString()
    .notEmpty()
    .withMessage('Effect ID is required'),
  body('parameters')
    .optional()
    .isObject()
    .withMessage('Parameters must be an object'),
  body('videoPath')
    .isString()
    .notEmpty()
    .withMessage('Video path is required')
];

const validateTrimRequest = [
  body('startTime')
    .isNumeric()
    .withMessage('Start time must be a number'),
  body('duration')
    .isNumeric()
    .withMessage('Duration must be a number'),
  body('videoPath')
    .isString()
    .notEmpty()
    .withMessage('Video path is required')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors:', { errors: errors.array(), ip: req.ip });
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Apply rate limiting to all video routes
router.use(videoRateLimit);

/**
 * POST /api/v1/video/upload
 * Upload video file
 */
router.post('/upload', csrfProtection, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file uploaded'
      });
    }

    logger.info('Video uploaded:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      ip: req.ip
    });

    // Get video metadata
    const metadataResult = await videoProcessor.getVideoMetadata(req.file.path);
    
    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        metadata: metadataResult.success ? metadataResult.metadata : null
      }
    });
  } catch (error) {
    logger.error('Video upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload video'
    });
  }
});

/**
 * POST /api/v1/video/apply-effect
 * Apply effect to video
 */
router.post('/apply-effect',
  csrfProtection,
  validateEffectRequest,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { effectId, parameters, videoPath } = req.body;
      
      logger.info('Applying effect:', {
        effectId,
        parameters,
        videoPath,
        ip: req.ip
      });

      const result = await effectsProcessor.applyEffect(videoPath, effectId, parameters);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            outputPath: result.outputPath,
            effectId: result.effectId,
            parameters: result.parameters
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Apply effect error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to apply effect'
      });
    }
  }
);

/**
 * POST /api/v1/video/apply-effect-chain
 * Apply multiple effects in sequence
 */
router.post('/apply-effect-chain',
  csrfProtection,
  body('effects').isArray().withMessage('Effects must be an array'),
  body('videoPath').isString().notEmpty().withMessage('Video path is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { effects, videoPath } = req.body;
      
      logger.info('Applying effect chain:', {
        effectCount: effects.length,
        videoPath,
        ip: req.ip
      });

      const result = await effectsProcessor.applyEffectChain(videoPath, effects);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            finalOutputPath: result.finalOutputPath,
            effectsApplied: result.effectsApplied,
            results: result.results
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          partialResults: result.partialResults
        });
      }
    } catch (error) {
      logger.error('Apply effect chain error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to apply effect chain'
      });
    }
  }
);

/**
 * POST /api/v1/video/trim
 * Trim video
 */
router.post('/trim',
  csrfProtection,
  validateTrimRequest,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { videoPath, startTime, duration } = req.body;
      
      logger.info('Trimming video:', {
        videoPath,
        startTime,
        duration,
        ip: req.ip
      });

      const result = await videoProcessor.trimVideo(videoPath, startTime, duration);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            outputPath: result.outputPath
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Video trim error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trim video'
      });
    }
  }
);

/**
 * POST /api/v1/video/add-text
 * Add text overlay to video
 */
router.post('/add-text',
  csrfProtection,
  body('videoPath').isString().notEmpty().withMessage('Video path is required'),
  body('text').isString().notEmpty().withMessage('Text is required'),
  body('options').optional().isObject().withMessage('Options must be an object'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { videoPath, text, options = {} } = req.body;
      
      logger.info('Adding text overlay:', {
        videoPath,
        text,
        options,
        ip: req.ip
      });

      const result = await videoProcessor.addTextOverlay(videoPath, text, options);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            outputPath: result.outputPath
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Add text overlay error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add text overlay'
      });
    }
  }
);

/**
 * GET /api/v1/video/metadata/:filename
 * Get video metadata
 */
router.get('/metadata/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const videoPath = path.join(process.env.UPLOAD_PATH || './uploads', filename);
    
    logger.info('Getting video metadata:', { filename, ip: req.ip });

    const result = await videoProcessor.getVideoMetadata(videoPath);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.metadata
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get metadata error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get video metadata'
    });
  }
});

/**
 * GET /api/v1/video/supported-effects
 * Get list of supported effects
 */
router.get('/supported-effects', (req, res) => {
  try {
    const supportedEffects = effectsProcessor.getSupportedEffects();
    
    res.json({
      success: true,
      data: {
        effects: supportedEffects,
        count: supportedEffects.length
      }
    });
  } catch (error) {
    logger.error('Get supported effects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get supported effects'
    });
  }
});

/**
 * POST /api/v1/video/export
 * Export video with specified format and quality
 */
router.post('/export', csrfProtection, async (req, res) => {
  try {
    const { filename, format = 'mp4', quality = 'high', resolution, bitrate } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
    }
    
    const inputPath = path.join(process.env.UPLOAD_PATH || './uploads', filename);
    
    logger.info('Exporting video:', { filename, format, quality, ip: req.ip });

    const result = await videoProcessor.exportVideo(inputPath, {
      format,
      quality,
      resolution,
      bitrate
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          outputPath: result.outputPath,
          format: result.format,
          quality: result.quality,
          filename: path.basename(result.outputPath)
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Export video error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export video'
    });
  }
});

/**
 * POST /api/v1/video/merge
 * Merge multiple videos
 */
router.post('/merge', csrfProtection, async (req, res) => {
  try {
    const { filenames, outputFormat = 'mp4' } = req.body;
    
    if (!filenames || !Array.isArray(filenames) || filenames.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 filenames are required for merging'
      });
    }
    
    const inputPaths = filenames.map(filename => 
      path.join(process.env.UPLOAD_PATH || './uploads', filename)
    );
    
    logger.info('Merging videos:', { filenames, outputFormat, ip: req.ip });

    const result = await videoProcessor.mergeVideos(inputPaths, outputFormat);
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          outputPath: result.outputPath,
          filename: path.basename(result.outputPath)
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Merge videos error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to merge videos'
    });
  }
});

/**
 * POST /api/v1/video/extract-audio
 * Extract audio from video
 */
router.post('/extract-audio', csrfProtection, async (req, res) => {
  try {
    const { filename, format = 'mp3' } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
    }
    
    const inputPath = path.join(process.env.UPLOAD_PATH || './uploads', filename);
    
    logger.info('Extracting audio:', { filename, format, ip: req.ip });

    const result = await videoProcessor.extractAudio(inputPath, format);
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          outputPath: result.outputPath,
          filename: path.basename(result.outputPath)
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Extract audio error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to extract audio'
    });
  }
});

/**
 * DELETE /api/v1/video/cleanup/:filename
 * Clean up processed video file
 */
router.delete('/cleanup/:filename', csrfProtection, async (req, res) => {
  try {
    const { filename } = req.params;
    const videoPath = path.join(process.env.UPLOAD_PATH || './uploads', filename);
    
    logger.info('Cleaning up video file:', { filename, ip: req.ip });

    await videoProcessor.cleanup(videoPath);
    
    res.json({
      success: true,
      message: 'File cleaned up successfully'
    });
  } catch (error) {
    logger.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup file'
    });
  }
});

/**
 * GET /api/video/upload-url
 * Generate presigned URL for video upload
 */
router.get('/upload-url', async (req, res) => {
  try {
    const { filename, contentType } = req.query;
    
    if (!filename || !contentType) {
      return res.status(400).json({
        success: false,
        error: 'Filename and contentType are required'
      });
    }
    
    logger.info('Generating upload URL:', { filename, contentType, ip: req.ip });
    
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(filename);
    const uniqueFilename = `upload-${uniqueSuffix}${fileExt}`;
    
    // For local development, return a mock upload URL
    const uploadUrl = `${req.protocol}://${req.get('host')}/api/video/upload`;
    
    res.json({
      success: true,
      data: {
        uploadUrl,
        filename: uniqueFilename,
        method: 'POST',
        fields: {
          'Content-Type': contentType
        }
      }
    });
  } catch (error) {
    logger.error('Upload URL generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate upload URL'
    });
  }
});

/**
 * GET /api/video/processing-status/:videoId
 * Get video processing status
 */
router.get('/processing-status/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    logger.info('Checking video processing status:', { videoId, ip: req.ip });
    
    // For now, return a mock status response
    // In a real implementation, this would check the actual processing status
    const mockStatus = {
      videoId,
      status: 'completed',
      progress: 100,
      processingTime: 45.2,
      outputUrl: `${req.protocol}://${req.get('host')}/uploads/processed-${videoId}.mp4`,
      metadata: {
        duration: 120.5,
        resolution: '1920x1080',
        format: 'mp4',
        size: 15728640
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: mockStatus
    });
  } catch (error) {
    logger.error('Processing status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check processing status'
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large'
      });
    }
  }
  
  logger.error('Video route error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

module.exports = router;