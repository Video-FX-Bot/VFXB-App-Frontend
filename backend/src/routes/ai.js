const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { csrfProtection } = require('../middleware/auth');
const openaiService = require('../services/openaiService');
const JSON2VideoService = require('../services/json2videoService');
const CaptionsAiService = require('../services/captionsAiService');
const aiChatService = require('../services/aiChatService');

// Initialize service instances
const json2videoService = new JSON2VideoService();
const captionsAiService = new CaptionsAiService();
const winston = require('winston');

const router = express.Router();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/ai-routes.log' })
  ]
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      // Accept audio files for voice commands
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed for voice commands'), false);
      }
    } else if (file.fieldname === 'video') {
      // Accept video files for analysis
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed for analysis'), false);
      }
    } else {
      cb(new Error('Invalid file field'), false);
    }
  }
});

// Rate limiting for AI endpoints
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: 'Too many AI requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const chatRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit chat to 10 requests per minute
  message: {
    success: false,
    error: 'Too many chat requests, please slow down.'
  }
});

// Validation middleware
const validateChatRequest = [
  body('message')
    .isString()
    .isLength({ min: 1, max: 4000 })
    .withMessage('Message must be a string between 1 and 4000 characters'),
  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be an object'),
  body('context.projectId')
    .optional()
    .isString()
    .withMessage('Project ID must be a string'),
  body('context.videoId')
    .optional()
    .isString()
    .withMessage('Video ID must be a string')
];

const validateLegacyChatRequest = [
  body('messages')
    .isArray({ min: 1 })
    .withMessage('Messages array is required and must not be empty'),
  body('messages.*.role')
    .isIn(['system', 'user', 'assistant'])
    .withMessage('Invalid message role'),
  body('messages.*.content')
    .isString()
    .isLength({ min: 1, max: 4000 })
    .withMessage('Message content must be a string between 1 and 4000 characters'),
  body('options.temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature must be between 0 and 2'),
  body('options.maxTokens')
    .optional()
    .isInt({ min: 1, max: 4000 })
    .withMessage('Max tokens must be between 1 and 4000')
];

const validateAnalysisRequest = [
  body('videoMetadata')
    .isObject()
    .withMessage('Video metadata object is required'),
  body('videoMetadata.duration')
    .isNumeric()
    .withMessage('Video duration is required'),
  body('frames')
    .optional()
    .isArray()
    .withMessage('Frames must be an array')
];

// Error handling middleware
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

// Apply rate limiting to all AI routes
router.use(aiRateLimit);

/**
 * POST /api/v1/ai/chat
 * Chat completion endpoint
 */
router.post('/chat', async (req, res) => {
    try {
      const { message, context, messages, options = {} } = req.body;
      
      // Determine if this is the new format (message + context) or legacy format (messages array)
      const isNewFormat = message && typeof message === 'string';
      const isLegacyFormat = messages && Array.isArray(messages);
      
      if (!isNewFormat && !isLegacyFormat) {
        return res.status(400).json({
          success: false,
          error: 'Either "message" (string) or "messages" (array) is required'
        });
      }
      
      logger.info('Chat request received', {
        format: isNewFormat ? 'new' : 'legacy',
        messageLength: isNewFormat ? message.length : messages.length,
        hasContext: isNewFormat ? !!context : false,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      let result;
      
      if (isNewFormat) {
        // Use AI Chat Service for new format with video editing capabilities
        result = await aiChatService.processChatMessage(message, context || {});
        
        if (result.success) {
          res.json({
            success: true,
            data: {
              reply: result.data.reply,
              actions: result.data.actions,
              suggestions: result.data.suggestions
            }
          });
        } else {
          res.status(500).json({
            success: false,
            error: result.error
          });
        }
      } else {
        // Use legacy OpenAI service for backward compatibility
        result = await openaiService.chatCompletion(messages, options);
        
        if (result.success) {
          res.json({
            success: true,
            data: {
              message: result.data.message.content,
              role: result.data.message.role,
              usage: result.data.usage,
              model: result.data.model
            }
          });
        } else {
          res.status(500).json({
            success: false,
            error: result.error
          });
        }
      }
    } catch (error) {
      logger.error('Chat endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/v1/ai/analyze
 * Video analysis endpoint
 */
router.post('/analyze',
  csrfProtection,
  validateAnalysisRequest,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { videoMetadata, frames = [] } = req.body;
      
      logger.info('Video analysis request received', {
        duration: videoMetadata.duration,
        frameCount: frames.length,
        ip: req.ip
      });

      const result = await openaiService.analyzeVideo(videoMetadata, frames);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            analysis: result.analysis,
            recommendations: result.recommendations,
            metadata: result.metadata
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Video analysis endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/v1/ai/voice
 * Voice command processing endpoint
 */
router.post('/voice',
  csrfProtection,
  upload.single('audio'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Audio file is required'
        });
      }

      logger.info('Voice command request received', {
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        ip: req.ip
      });

      const result = await openaiService.processVoiceCommand(req.file);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            transcription: result.transcription,
            intent: result.intent,
            parameters: result.parameters,
            confidence: result.confidence
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Voice command endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/v1/ai/suggestions
 * Generate editing suggestions
 */
router.post('/suggestions',
  csrfProtection,
  body('projectData').isObject().withMessage('Project data is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectData } = req.body;
      
      logger.info('Editing suggestions request received', {
        projectId: projectData.id,
        ip: req.ip
      });

      const result = await openaiService.generateEditingSuggestions(projectData);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            suggestions: result.suggestions,
            timestamp: result.timestamp
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Editing suggestions endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/v1/ai/health
 * AI service health check
 */
router.get('/health', async (req, res) => {
  try {
    const health = await openaiService.getHealthStatus();
    
    if (health.status === 'healthy') {
      res.json({
        success: true,
        data: health
      });
    } else {
      res.status(503).json({
        success: false,
        data: health
      });
    }
  } catch (error) {
    logger.error('AI health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

/**
 * GET /api/v1/ai/status/:jobId
 * Get processing job status (for async operations)
 */
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // This would typically check a job queue or database
    // For now, return a mock response
    res.json({
      success: true,
      data: {
        jobId,
        status: 'completed',
        progress: 100,
        result: 'Job completed successfully',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Job status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check job status'
    });
  }
});

/**
 * POST /api/v1/ai/json2video/create
 * Create video from text or JSON using JSON2Video API
 */
router.post('/json2video/create',
  csrfProtection,
  [
    body('text').optional().isString().isLength({ min: 1, max: 2000 })
      .withMessage('Text must be between 1 and 2000 characters'),
    body('json').optional().isObject()
      .withMessage('JSON must be a valid object'),
    body('templateId').optional().isString()
      .withMessage('Template ID must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { text, json, templateId } = req.body;
      
      logger.info('JSON2Video create request', {
        hasText: !!text,
        hasJson: !!json,
        templateId,
        ip: req.ip
      });

      let result;
      if (text) {
        const config = {
          text,
          template: templateId || 'default'
        };
        result = await json2videoService.createVideoFromText(config);
      } else if (json) {
        result = await json2videoService.createVideoFromJSON(json);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Either text or json is required'
        });
      }
      
      res.json({
        success: true,
        data: {
          videoId: result.id,
          status: 'processing',
          message: 'Video creation started successfully'
        }
      });
    } catch (error) {
      logger.error('JSON2Video create error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create video'
      });
    }
  }
);

/**
 * GET /api/v1/ai/json2video/status/:videoId
 * Check video creation status
 */
router.get('/json2video/status/:videoId',
  async (req, res) => {
    try {
      const { videoId } = req.params;
      
      const result = await json2videoService.getVideoStatus(videoId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('JSON2Video status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check video status'
      });
    }
  }
);

/**
 * GET /api/v1/ai/json2video/download/:videoId
 * Download completed video
 */
router.get('/json2video/download/:videoId',
  async (req, res) => {
    try {
      const { videoId } = req.params;
      
      const videoStream = await json2videoService.downloadVideo(videoId);
      
      // Set appropriate headers for video download
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="video-${videoId}.mp4"`);
      
      // Pipe the video stream to response
      videoStream.pipe(res);
    } catch (error) {
      logger.error('JSON2Video download error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download video'
      });
    }
  }
);

/**
 * POST /api/v1/ai/captions/transcribe
 * Transcribe video using Captions.ai
 */
router.post('/captions/transcribe',
  upload.single('video'),
  csrfProtection,
  [
    body('videoUrl').optional().isURL()
      .withMessage('Video URL must be valid'),
    body('language').optional().isString()
      .withMessage('Language must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { videoUrl, language } = req.body;
      const videoFile = req.file;
      
      logger.info('Captions.ai transcribe request', {
        hasFile: !!videoFile,
        hasUrl: !!videoUrl,
        language,
        ip: req.ip
      });

      let result;
      if (videoFile) {
        result = await captionsAiService.uploadVideo(videoFile.buffer, {
          language,
          filename: videoFile.originalname
        });
      } else if (videoUrl) {
        result = await captionsAiService.transcribeFromURL(videoUrl, { language });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Either video file or video URL is required'
        });
      }
      
      res.json({
        success: true,
        data: {
          jobId: result.id,
          status: 'processing',
          message: 'Transcription started successfully'
        }
      });
    } catch (error) {
      logger.error('Captions.ai transcribe error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start transcription'
      });
    }
  }
);

/**
 * GET /api/v1/ai/captions/status/:jobId
 * Check transcription status
 */
router.get('/captions/status/:jobId',
  async (req, res) => {
    try {
      const { jobId } = req.params;
      
      const result = await captionsAiService.getJobStatus(jobId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Captions.ai status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check transcription status'
      });
    }
  }
);

/**
 * GET /api/v1/ai/captions/result/:jobId
 * Get transcription result
 */
router.get('/captions/result/:jobId',
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const { format } = req.query;
      
      const result = await captionsAiService.getJobResult(jobId, format);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Captions.ai result error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transcription result'
      });
    }
  }
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 25MB.'
      });
    }
  }
  
  logger.error('AI route error:', error);
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});

module.exports = router;