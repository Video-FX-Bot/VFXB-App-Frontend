import express from 'express';
import rateLimit from 'express-rate-limit';
import { AIService } from '../services/aiService.js';
import { VideoProcessor } from '../services/videoProcessor.js';
import { Video } from '../models/Video.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { authenticateToken, checkSubscriptionLimits, logActivity } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const aiService = new AIService();
const videoProcessor = new VideoProcessor();

// Rate limiting for AI requests
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // limit each user to 100 AI requests per hour
  message: {
    success: false,
    message: 'AI request limit exceeded. Please try again later.'
  }
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each user to 20 chat messages per minute
  message: {
    success: false,
    message: 'Chat limit exceeded. Please slow down.'
  }
});

// @route   POST /api/ai/chat
// @desc    Send a chat message to AI for video editing
// @access  Private
router.post('/chat', 
  authenticateToken,
  chatLimiter,
  checkSubscriptionLimits('ai_request'),
  logActivity('ai_chat'),
  async (req, res) => {
    try {
      const { message, conversationId, videoId, context } = req.body;
      
      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message is required'
        });
      }
      
      if (message.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Message too long. Maximum 2000 characters allowed.'
        });
      }
      
      let video = null;
      if (videoId) {
        video = await Video.findById(videoId);
        if (!video) {
          return res.status(404).json({
            success: false,
            message: 'Video not found'
          });
        }
        
        // Check access permissions
        if (!video.canAccess(req.user.id, 'editor')) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to video'
          });
        }
      }
      
      const finalConversationId = conversationId || uuidv4();
      
      // Save user message
      const userMessage = new ChatMessage({
        conversationId: finalConversationId,
        userId: req.user.id,
        videoId: videoId || null,
        type: 'user',
        content: message.trim(),
        metadata: {
          userContext: {
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            timestamp: new Date()
          }
        }
      });
      
      await userMessage.save();
      
      // Get conversation history for context
      const recentMessages = await ChatMessage.find({
        conversationId: finalConversationId,
        userId: req.user.id
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('type content aiProcessing.intent aiProcessing.parameters videoOperation');
      
      // Process message with AI
      const aiResponse = await aiService.processMessage(
        message.trim(),
        {
          userId: req.user.id,
          conversationId: finalConversationId,
          videoId: videoId || null,
          video: video ? {
            id: video._id,
            title: video.title,
            duration: video.metadata.duration,
            resolution: video.resolution,
            hasAudio: video.metadata.hasAudio,
            status: video.status
          } : null,
          recentMessages: recentMessages.reverse(),
          userContext: context || {}
        }
      );
      
      // Save AI response message
      const aiMessage = new ChatMessage({
        conversationId: finalConversationId,
        userId: req.user.id,
        videoId: videoId || null,
        type: 'ai',
        content: aiResponse.response,
        aiProcessing: {
          model: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed,
          processingTime: aiResponse.processingTime,
          confidence: aiResponse.confidence,
          intent: aiResponse.intent,
          parameters: aiResponse.parameters
        },
        videoOperation: aiResponse.videoOperation ? {
          operationType: aiResponse.videoOperation.type,
          parameters: aiResponse.videoOperation.parameters,
          status: 'pending'
        } : null
      });
      
      await aiMessage.save();
      
      // Update user usage
      await req.user.incrementUsage('ai_request', 1);
      
      // Execute video operation if requested
      let operationResult = null;
      if (aiResponse.videoOperation && video) {
        try {
          operationResult = await executeVideoOperation(
            video,
            aiResponse.videoOperation,
            aiMessage._id,
            req.user.id
          );
        } catch (operationError) {
          logger.error('Video operation failed:', operationError);
          
          // Update message with error
          aiMessage.videoOperation.status = 'failed';
          aiMessage.videoOperation.error = operationError.message;
          await aiMessage.save();
        }
      }
      
      logger.info(`AI chat processed for user ${req.user.id}, conversation ${finalConversationId}`);
      
      res.json({
        success: true,
        data: {
          conversationId: finalConversationId,
          userMessage: {
            id: userMessage._id,
            content: userMessage.content,
            timestamp: userMessage.createdAt
          },
          aiMessage: {
            id: aiMessage._id,
            content: aiMessage.content,
            intent: aiResponse.intent,
            confidence: aiResponse.confidence,
            timestamp: aiMessage.createdAt
          },
          videoOperation: aiResponse.videoOperation,
          operationResult
        }
      });
      
    } catch (error) {
      logger.error('AI chat error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process chat message',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   GET /api/ai/conversations
// @desc    Get user's conversation history
// @access  Private
router.get('/conversations', 
  authenticateToken,
  aiLimiter,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, videoId } = req.query;
      
      let query = { userId: req.user.id };
      if (videoId) {
        query.videoId = videoId;
      }
      
      // Get unique conversations
      const conversations = await ChatMessage.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$conversationId',
            lastMessage: { $last: '$content' },
            lastMessageType: { $last: '$type' },
            lastActivity: { $max: '$createdAt' },
            messageCount: { $sum: 1 },
            videoId: { $first: '$videoId' },
            hasVideoOperations: {
              $sum: {
                $cond: [{ $ne: ['$videoOperation', null] }, 1, 0]
              }
            }
          }
        },
        { $sort: { lastActivity: -1 } },
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
      ]);
      
      // Populate video information
      for (const conversation of conversations) {
        if (conversation.videoId) {
          const video = await Video.findById(conversation.videoId)
            .select('title status metadata.duration');
          conversation.video = video;
        }
      }
      
      const total = await ChatMessage.distinct('conversationId', query).then(ids => ids.length);
      
      res.json({
        success: true,
        data: {
          conversations,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
      
    } catch (error) {
      logger.error('Get conversations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversations'
      });
    }
  }
);

// @route   GET /api/ai/conversations/:id/messages
// @desc    Get messages from a specific conversation
// @access  Private
router.get('/conversations/:id/messages', 
  authenticateToken,
  aiLimiter,
  async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const conversationId = req.params.id;
      
      const messages = await ChatMessage.find({
        conversationId,
        userId: req.user.id
      })
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('videoId', 'title status metadata.duration');
      
      const total = await ChatMessage.countDocuments({
        conversationId,
        userId: req.user.id
      });
      
      res.json({
        success: true,
        data: {
          messages,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
      
    } catch (error) {
      logger.error('Get conversation messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversation messages'
      });
    }
  }
);

// @route   POST /api/ai/analyze-video
// @desc    Analyze video content with AI
// @access  Private
router.post('/analyze-video', 
  authenticateToken,
  aiLimiter,
  checkSubscriptionLimits('ai_request'),
  async (req, res) => {
    try {
      const { videoId, analysisType = 'full' } = req.body;
      
      if (!videoId) {
        return res.status(400).json({
          success: false,
          message: 'Video ID is required'
        });
      }
      
      const video = await Video.findById(videoId);
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }
      
      // Check access permissions
      if (!video.canAccess(req.user.id, 'viewer')) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      if (video.status !== 'ready') {
        return res.status(400).json({
          success: false,
          message: 'Video is not ready for analysis'
        });
      }
      
      // Perform AI analysis
      const analysis = await aiService.analyzeVideo(video.filePath, {
        type: analysisType,
        includeTranscription: !video.transcription?.text,
        includeVisualAnalysis: true,
        includeAudioAnalysis: video.metadata.hasAudio
      });
      
      // Update video with analysis results
      if (!video.aiAnalysis) {
        video.aiAnalysis = {};
      }
      
      video.aiAnalysis.content = analysis.content;
      video.aiAnalysis.visual = analysis.visual;
      video.aiAnalysis.audio = analysis.audio;
      video.aiAnalysis.lastAnalyzed = new Date();
      
      await video.save();
      
      // Update user usage
      await req.user.incrementUsage('ai_request', 1);
      
      logger.info(`Video analyzed: ${videoId} by user ${req.user.id}`);
      
      res.json({
        success: true,
        message: 'Video analysis completed',
        data: {
          analysis: video.aiAnalysis
        }
      });
      
    } catch (error) {
      logger.error('Video analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze video',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   POST /api/ai/suggest-edits
// @desc    Get AI suggestions for video editing
// @access  Private
router.post('/suggest-edits', 
  authenticateToken,
  aiLimiter,
  checkSubscriptionLimits('ai_request'),
  async (req, res) => {
    try {
      const { videoId, goal, style, duration } = req.body;
      
      if (!videoId) {
        return res.status(400).json({
          success: false,
          message: 'Video ID is required'
        });
      }
      
      const video = await Video.findById(videoId);
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }
      
      // Check access permissions
      if (!video.canAccess(req.user.id, 'editor')) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      // Generate edit suggestions
      const suggestions = await aiService.generateEditSuggestions(video, {
        goal: goal || 'improve',
        style: style || 'auto',
        targetDuration: duration,
        userPreferences: req.user.preferences || {}
      });
      
      // Update user usage
      await req.user.incrementUsage('ai_request', 1);
      
      logger.info(`Edit suggestions generated for video ${videoId} by user ${req.user.id}`);
      
      res.json({
        success: true,
        data: {
          suggestions
        }
      });
      
    } catch (error) {
      logger.error('Edit suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate edit suggestions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   GET /api/ai/operation-status/:messageId
// @desc    Get status of a video operation
// @access  Private
router.get('/operation-status/:messageId', 
  authenticateToken,
  aiLimiter,
  async (req, res) => {
    try {
      const message = await ChatMessage.findById(req.params.messageId)
        .populate('videoId', 'title status');
      
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }
      
      if (message.userId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      res.json({
        success: true,
        data: {
          operation: message.videoOperation,
          video: message.videoId
        }
      });
      
    } catch (error) {
      logger.error('Get operation status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get operation status'
      });
    }
  }
);

// Helper function to execute video operations
async function executeVideoOperation(video, operation, messageId, userId) {
  try {
    // Update operation status to processing
    await ChatMessage.findByIdAndUpdate(messageId, {
      'videoOperation.status': 'processing',
      'videoOperation.startedAt': new Date()
    });
    
    let result;
    
    switch (operation.type) {
      case 'trim':
        result = await videoProcessor.trimVideo(
          video.filePath,
          operation.parameters.startTime,
          operation.parameters.endTime || operation.parameters.duration
        );
        break;
        
      case 'crop':
        result = await videoProcessor.cropVideo(
          video.filePath,
          operation.parameters.x,
          operation.parameters.y,
          operation.parameters.width,
          operation.parameters.height
        );
        break;
        
      case 'filter':
        result = await videoProcessor.applyFilter(
          video.filePath,
          operation.parameters.filterType,
          operation.parameters.intensity
        );
        break;
        
      case 'color_adjust':
        result = await videoProcessor.adjustColor(
          video.filePath,
          operation.parameters
        );
        break;
        
      case 'audio_enhance':
        result = await videoProcessor.enhanceAudio(
          video.filePath,
          operation.parameters
        );
        break;
        
      case 'add_text':
        result = await videoProcessor.addText(
          video.filePath,
          operation.parameters.text,
          operation.parameters
        );
        break;
        
      case 'add_transition':
        result = await videoProcessor.addTransition(
          video.filePath,
          operation.parameters.type,
          operation.parameters.duration
        );
        break;
        
      default:
        throw new Error(`Unsupported operation type: ${operation.type}`);
    }
    
    // Create new version of the video
    const newVersion = {
      id: uuidv4(),
      filePath: result.outputPath,
      operation: operation.type,
      parameters: operation.parameters,
      createdAt: new Date(),
      createdBy: userId
    };
    
    video.versions.push(newVersion);
    video.editHistory.push({
      operation: operation.type,
      parameters: operation.parameters,
      timestamp: new Date(),
      userId: userId,
      versionId: newVersion.id
    });
    
    await video.save();
    
    // Update operation status to completed
    await ChatMessage.findByIdAndUpdate(messageId, {
      'videoOperation.status': 'completed',
      'videoOperation.completedAt': new Date(),
      'videoOperation.result': {
        versionId: newVersion.id,
        outputPath: result.outputPath,
        metadata: result.metadata
      }
    });
    
    logger.info(`Video operation completed: ${operation.type} for video ${video._id}`);
    
    return {
      status: 'completed',
      versionId: newVersion.id,
      metadata: result.metadata
    };
    
  } catch (error) {
    // Update operation status to failed
    await ChatMessage.findByIdAndUpdate(messageId, {
      'videoOperation.status': 'failed',
      'videoOperation.completedAt': new Date(),
      'videoOperation.error': error.message
    });
    
    throw error;
  }
}

export default router;