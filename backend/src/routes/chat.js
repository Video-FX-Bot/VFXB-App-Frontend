const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, optionalAuth, csrfProtection } = require('../middleware/auth');
const aiChatService = require('../services/aiChatService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const router = express.Router();

// Custom validation function for session IDs that works with both local storage (UUID) and MongoDB (ObjectId)
const isValidSessionId = (value) => {
  if (process.env.USE_LOCAL_STORAGE === 'true') {
    // In local storage mode, accept UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  } else {
    // In MongoDB mode, accept ObjectIds
    return mongoose.Types.ObjectId.isValid(value);
  }
};

// Custom validation function for context that accepts both objects and strings
const isValidContext = (value) => {
  return typeof value === 'object' || typeof value === 'string';
};

// Conditional imports based on storage mode
let ChatSession, ChatMessage, localStorageService;
if (process.env.USE_LOCAL_STORAGE === 'true') {
  localStorageService = require('../services/localStorageService');
  // Create mock models for local storage
  ChatSession = null;
  ChatMessage = null;
} else {
  const models = require('../models/ChatSchema');
  ChatSession = models.ChatSession;
  ChatMessage = models.ChatMessage;
}

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in chat routes', {
      errors: errors.array(),
      path: req.path,
      method: req.method
    });
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Chat message validation
const messageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message content must be between 1 and 10000 characters'),
  body('role')
    .isIn(['user', 'assistant', 'system'])
    .withMessage('Role must be user, assistant, or system'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

// Chat session validation
const sessionValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('projectId')
    .optional()
    .isMongoId()
    .withMessage('Project ID must be a valid MongoDB ObjectId'),
  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be an object')
];

// GET /api/chat/sessions - Get user's chat sessions
router.get('/sessions',
  authenticateToken,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('projectId')
      .optional()
      .isMongoId()
      .withMessage('Project ID must be a valid MongoDB ObjectId')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, projectId } = req.query;
      const userId = req.user.id;

      const filter = { userId };
      if (projectId) {
        filter.projectId = projectId;
      }

      const sessions = await ChatSession.find(filter)
        .sort({ updatedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-messages') // Exclude messages for list view
        .lean();

      const total = await ChatSession.countDocuments(filter);

      logger.info('Chat sessions retrieved', {
        userId,
        projectId,
        count: sessions.length,
        total
      });

      res.json({
        success: true,
        data: {
          sessions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error retrieving chat sessions', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve chat sessions'
      });
    }
  }
);

// POST /api/chat/sessions - Create new chat session
router.post('/sessions',
  authenticateToken,
  csrfProtection,
  sessionValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, projectId, context } = req.body;
      const userId = req.user.id;

      let session;
      
      if (process.env.USE_LOCAL_STORAGE === 'true') {
        // Use local storage for chat sessions
        const sessionData = {
          sessionId: uuidv4(),
          _id: uuidv4(),
          userId,
          projectId,
          title: title || 'New Chat',
          context: context || {},
          status: 'active',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Store in local storage
        const sessions = await localStorageService.getData('chatSessions') || [];
        sessions.push(sessionData);
        await localStorageService.saveData('chatSessions', sessions);
        session = sessionData;
      } else {
        // Use MongoDB
        session = new ChatSession({
          sessionId: uuidv4(),
          userId,
          projectId,
          title: title || 'New Chat',
          context: context || {},
          status: 'active'
        });
        await session.save();
      }

      logger.info('Chat session created', {
        sessionId: session.sessionId || session._id,
        userId,
        projectId,
        title: session.title
      });

      res.status(201).json({
        success: true,
        data: { session }
      });
    } catch (error) {
      logger.error('Error creating chat session', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        message: 'Failed to create chat session'
      });
    }
  }
);

// GET /api/chat/sessions/:id - Get specific chat session with messages
router.get('/sessions/:id',
  authenticateToken,
  [
    param('id')
      .custom(isValidSessionId)
      .withMessage('Session ID must be a valid identifier')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const session = await ChatSession.findOne({
        _id: id,
        userId
      }).lean();

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found'
        });
      }

      // Update last accessed
      await ChatSession.findByIdAndUpdate(id, {
        lastAccessedAt: new Date()
      });

      logger.info('Chat session retrieved', {
        sessionId: id,
        userId,
        messageCount: session.messages?.length || 0
      });

      res.json({
        success: true,
        data: { session }
      });
    } catch (error) {
      logger.error('Error retrieving chat session', {
        error: error.message,
        stack: error.stack,
        sessionId: req.params.id,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve chat session'
      });
    }
  }
);

// POST /api/chat/sessions/:id/messages - Add message to chat session
router.post('/sessions/:id/messages',
  authenticateToken,
  csrfProtection,
  [
    param('id')
      .custom(isValidSessionId)
      .withMessage('Session ID must be a valid identifier'),
    ...messageValidation
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { content, role, metadata } = req.body;
      const userId = req.user.id;

      const session = await ChatSession.findOne({
        _id: id,
        userId
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found'
        });
      }

      const message = {
        content,
        role,
        metadata: metadata || {},
        timestamp: new Date()
      };

      await session.addMessage(message);

      logger.info('Message added to chat session', {
        sessionId: id,
        userId,
        role,
        contentLength: content.length
      });

      res.status(201).json({
        success: true,
        data: { message }
      });
    } catch (error) {
      logger.error('Error adding message to chat session', {
        error: error.message,
        stack: error.stack,
        sessionId: req.params.id,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        message: 'Failed to add message to chat session'
      });
    }
  }
);

// POST /api/chat/ai-message - Process AI-powered chat message
router.post('/ai-message',
  authenticateToken,
  csrfProtection,
  [
    body('message')
      .trim()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Message must be between 1 and 10000 characters'),
    body('sessionId')
      .optional()
      .custom(isValidSessionId)
      .withMessage('Session ID must be a valid identifier'),
    body('context')
      .optional()
      .custom(isValidContext)
      .withMessage('Context must be an object or string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { message, sessionId, context = {} } = req.body;
      const userId = req.user.id;

      logger.info('AI chat message received', {
        userId,
        sessionId,
        messageLength: message.length,
        hasContext: Object.keys(context).length > 0
      });

      // Add user context
      const enrichedContext = {
        ...context,
        userId,
        sessionId
      };

      // Process message with AI chat service
      const aiResponse = await aiChatService.processChatMessage(message, enrichedContext);

      if (!aiResponse.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to process AI chat message',
          error: aiResponse.error
        });
      }

      // If sessionId provided, save messages to session
      if (sessionId) {
        try {
          const session = await ChatSession.findOne({
            _id: sessionId,
            userId
          });

          if (session) {
            // Add user message
            await session.addMessage({
              content: message,
              role: 'user',
              metadata: { aiProcessed: true },
              timestamp: new Date()
            });

            // Add AI response
            await session.addMessage({
              content: aiResponse.data.reply,
              role: 'assistant',
              metadata: {
                actions: aiResponse.data.actions,
                suggestions: aiResponse.data.suggestions,
                aiGenerated: true
              },
              timestamp: new Date()
            });

            logger.info('Messages saved to chat session', {
              sessionId,
              userId,
              actionsCount: aiResponse.data.actions.length
            });
          }
        } catch (sessionError) {
          logger.warn('Failed to save messages to session', {
            error: sessionError.message,
            sessionId,
            userId
          });
          // Continue without failing the request
        }
      }

      res.json({
        success: true,
        data: {
          reply: aiResponse.data.reply,
          actions: aiResponse.data.actions,
          suggestions: aiResponse.data.suggestions,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error processing AI chat message', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        message: 'Failed to process AI chat message'
      });
    }
  }
);

// POST /api/chat/check-operation-status - Check status of video operations
router.post('/check-operation-status',
  authenticateToken,
  csrfProtection,
  [
    body('operationType')
      .isIn(['video_creation', 'transcription'])
      .withMessage('Operation type must be video_creation or transcription'),
    body('operationId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Operation ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { operationType, operationId } = req.body;
      const userId = req.user.id;

      logger.info('Checking operation status', {
        userId,
        operationType,
        operationId
      });

      const statusResult = await aiChatService.checkOperationStatus(operationType, operationId);

      if (statusResult.success) {
        res.json({
          success: true,
          data: statusResult.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to check operation status',
          error: statusResult.error
        });
      }
    } catch (error) {
      logger.error('Error checking operation status', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        message: 'Failed to check operation status'
      });
    }
  }
);

// PUT /api/chat/sessions/:id - Update chat session
router.put('/sessions/:id',
  authenticateToken,
  csrfProtection,
  [
    param('id')
      .custom(isValidSessionId)
      .withMessage('Session ID must be a valid identifier'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('context')
      .optional()
      .isObject()
      .withMessage('Context must be an object'),
    body('status')
      .optional()
      .isIn(['active', 'archived', 'deleted'])
      .withMessage('Status must be active, archived, or deleted')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, context, status } = req.body;
      const userId = req.user.id;

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (context !== undefined) updateData.context = context;
      if (status !== undefined) updateData.status = status;

      const session = await ChatSession.findOneAndUpdate(
        { _id: id, userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found'
        });
      }

      logger.info('Chat session updated', {
        sessionId: id,
        userId,
        updates: Object.keys(updateData)
      });

      res.json({
        success: true,
        data: { session }
      });
    } catch (error) {
      logger.error('Error updating chat session', {
        error: error.message,
        stack: error.stack,
        sessionId: req.params.id,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        message: 'Failed to update chat session'
      });
    }
  }
);

// DELETE /api/chat/sessions/:id - Delete chat session
router.delete('/sessions/:id',
  authenticateToken,
  csrfProtection,
  [
    param('id')
      .custom(isValidSessionId)
      .withMessage('Session ID must be a valid identifier')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const session = await ChatSession.findOneAndDelete({
        _id: id,
        userId
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found'
        });
      }

      logger.info('Chat session deleted', {
        sessionId: id,
        userId,
        messageCount: session.messages?.length || 0
      });

      res.json({
        success: true,
        message: 'Chat session deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting chat session', {
        error: error.message,
        stack: error.stack,
        sessionId: req.params.id,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        message: 'Failed to delete chat session'
      });
    }
  }
);

// GET /api/chat/analytics - Get chat analytics for user
router.get('/analytics',
  authenticateToken,
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('projectId')
      .optional()
      .isMongoId()
      .withMessage('Project ID must be a valid MongoDB ObjectId')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { startDate, endDate, projectId } = req.query;
      const userId = req.user.id;

      const filter = { userId };
      if (projectId) filter.projectId = projectId;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const analytics = await ChatSession.getAnalytics(filter);

      logger.info('Chat analytics retrieved', {
        userId,
        projectId,
        dateRange: { startDate, endDate }
      });

      res.json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      logger.error('Error retrieving chat analytics', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve chat analytics'
      });
    }
  }
);

module.exports = router;