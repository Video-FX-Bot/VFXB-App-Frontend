import AIService from '../services/aiService.js';
import { logger } from '../utils/logger.js';
import { socketAuth, optionalSocketAuth } from '../middleware/socketAuth.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { User } from '../models/User.js';

const aiService = new AIService();

export const setupSocketHandlers = (io) => {
  // Authentication middleware for sockets (using optional auth for development)
  io.use(optionalSocketAuth);

  io.on('connection', (socket) => {
    // Handle both authenticated and anonymous users
    const userId = socket.userId || `anonymous_${socket.id}`;
    logger.info(`User connected: ${userId}`);

    // Join user to their personal room
    socket.join(`user_${userId}`);
    
    // Store userId for later use
    socket.userId = userId;

    // Handle chat messages
    socket.on('chat_message', async (data) => {
      try {
        const { message, videoId, conversationId } = data;
        
        logger.info('Received chat message:', { 
          userId: socket.userId, 
          message, 
          videoId, 
          conversationId 
        });

        // Save user message to database
        const userMessage = await ChatMessage.create({
          userId: socket.userId,
          conversationId,
          videoId,
          message,
          type: 'user',
          timestamp: new Date()
        });

        // Emit user message to client
        socket.emit('message_received', {
          id: userMessage._id,
          message,
          type: 'user',
          timestamp: userMessage.timestamp
        });

        // Show typing indicator
        socket.emit('ai_typing', { typing: true });

        // Process message with AI
        const context = {
          userId: socket.userId,
          videoId,
          conversationId,
          videoPath: data.videoPath || null
        };

        const aiResponse = await aiService.processChatMessage(message, context);

        // Save AI response to database
        const aiMessage = await ChatMessage.create({
          userId: socket.userId,
          conversationId,
          videoId,
          message: aiResponse.message,
          type: 'ai',
          intent: aiResponse.intent,
          operationResult: aiResponse.operationResult,
          timestamp: new Date()
        });

        // Hide typing indicator
        socket.emit('ai_typing', { typing: false });

        // Send AI response to client
        socket.emit('ai_response', {
          id: aiMessage._id,
          message: aiResponse.message,
          type: 'ai',
          intent: aiResponse.intent,
          operationResult: aiResponse.operationResult,
          actions: aiResponse.actions || [],
          tips: aiResponse.tips || [],
          timestamp: aiMessage.timestamp
        });

        // If there's a video operation result, emit it separately
        if (aiResponse.operationResult) {
          socket.emit('video_operation_complete', {
            operation: aiResponse.intent.action,
            result: aiResponse.operationResult,
            videoId
          });
        }

      } catch (error) {
        logger.error('Error handling chat message:', error);
        
        socket.emit('ai_typing', { typing: false });
        socket.emit('chat_error', {
          error: 'Sorry, I encountered an error processing your message. Please try again.',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle video upload events
    socket.on('video_uploaded', async (data) => {
      try {
        const { videoId, videoPath, fileName } = data;
        
        logger.info('Video uploaded:', { userId: socket.userId, videoId, fileName });

        // Emit acknowledgment
        socket.emit('video_upload_acknowledged', { videoId });

        // Start automatic video analysis
        socket.emit('ai_typing', { typing: true });
        
        const analysisResult = await aiService.analyzeVideo(videoPath);
        
        // Generate welcome message with analysis
        const welcomeMessage = await aiService.generateResponse({
          action: 'analyze',
          parameters: {},
          confidence: 1.0,
          explanation: 'Video uploaded and analyzed'
        }, { videoId, videoPath, analysis: analysisResult });

        // Save analysis message
        const analysisMessage = await ChatMessage.create({
          userId: socket.userId,
          videoId,
          message: welcomeMessage.message,
          type: 'ai',
          intent: { action: 'analyze' },
          operationResult: analysisResult,
          timestamp: new Date()
        });

        socket.emit('ai_typing', { typing: false });
        
        // Send analysis results
        socket.emit('video_analysis_complete', {
          id: analysisMessage._id,
          message: welcomeMessage.message,
          analysis: analysisResult,
          actions: welcomeMessage.actions || [],
          tips: welcomeMessage.tips || [],
          videoId,
          timestamp: analysisMessage.timestamp
        });

      } catch (error) {
        logger.error('Error handling video upload:', error);
        socket.emit('video_analysis_error', {
          error: 'Failed to analyze video',
          videoId: data.videoId
        });
      }
    });

    // Handle conversation history requests
    socket.on('get_conversation_history', async (data) => {
      try {
        const { conversationId, limit = 50 } = data;
        
        const messages = await ChatMessage.find({
          userId: socket.userId,
          conversationId
        })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

        socket.emit('conversation_history', {
          conversationId,
          messages: messages.reverse()
        });

      } catch (error) {
        logger.error('Error fetching conversation history:', error);
        socket.emit('conversation_history_error', {
          error: 'Failed to load conversation history'
        });
      }
    });

    // Handle video operation requests
    socket.on('execute_video_operation', async (data) => {
      try {
        const { operation, parameters, videoId, videoPath } = data;
        
        logger.info('Executing video operation:', { 
          userId: socket.userId, 
          operation, 
          parameters, 
          videoId 
        });

        // Emit operation started
        socket.emit('video_operation_started', {
          operation,
          videoId,
          timestamp: new Date().toISOString()
        });

        // Execute the operation
        const result = await aiService.executeVideoOperation(
          { action: operation, parameters },
          { videoId, videoPath, userId: socket.userId }
        );

        // Emit operation completed
        socket.emit('video_operation_complete', {
          operation,
          result,
          videoId,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        logger.error('Error executing video operation:', error);
        socket.emit('video_operation_error', {
          operation: data.operation,
          error: error.message,
          videoId: data.videoId
        });
      }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.userId}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });

  // Handle connection errors
  io.on('connect_error', (error) => {
    logger.error('Socket.IO connection error:', error);
  });

  logger.info('Socket.IO chat handlers initialized');
};