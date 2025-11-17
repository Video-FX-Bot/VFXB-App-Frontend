import AIService from "../services/aiService.js";
import { logger } from "../utils/logger.js";
import { socketAuth, optionalSocketAuth } from "../middleware/socketAuth.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { User } from "../models/User.js";

const aiService = new AIService();

export const setupSocketHandlers = (io) => {
  // Authentication middleware for sockets (using optional auth for development)
  io.use(optionalSocketAuth);

  io.on("connection", (socket) => {
    // Handle both authenticated and anonymous users
    const userId = socket.userId || `anonymous_${socket.id}`;
    const roomName = `user_${userId}`;

    logger.info(`🔌 User connected: ${userId}`);
    logger.info(`📍 Socket ID: ${socket.id}`);
    logger.info(`🏠 Joining room: ${roomName}`);

    // Join user to their personal room
    socket.join(roomName);

    // Verify room was joined
    const rooms = Array.from(socket.rooms);
    logger.info(`✅ Socket now in rooms: ${rooms.join(", ")}`);

    // Store userId for later use
    socket.userId = userId;

    // Handle chat messages
    socket.on("chat_message", async (data) => {
      try {
        let { message, videoId, conversationId } = data;

        // Generate conversationId if not provided
        if (!conversationId) {
          const { v4: uuidv4 } = await import("uuid");
          conversationId = `conv_${Date.now()}_${uuidv4()}`;
          logger.info(`🆕 Generated new conversationId: ${conversationId}`);
        }

        logger.info("📨 Received chat message:", {
          userId: socket.userId,
          message,
          videoId,
          conversationId,
          videoPath: data.videoPath, // 🔍 Log the videoPath being received
          lastAppliedEffect: data.lastAppliedEffect,
          appliedEffects: data.appliedEffects,
        });

        // Save user message to database
        const userMessage = await ChatMessage.create({
          userId: socket.userId,
          conversationId,
          videoId,
          message,
          type: "user",
          timestamp: new Date(),
        });

        // Emit user message to client (include conversationId for future messages)
        socket.emit("message_received", {
          id: userMessage._id,
          message,
          type: "user",
          timestamp: userMessage.timestamp,
          conversationId, // Send back to client so they can use it
        });

        // Show typing indicator
        socket.emit("ai_typing", { typing: true });

        // Process message with AI
        const context = {
          userId: socket.userId,
          videoId,
          conversationId,
          videoPath: data.videoPath || null,
          lastAppliedEffect: data.lastAppliedEffect || null,
          appliedEffects: data.appliedEffects || [],
          socket: socket, // Pass socket for progress updates
        };

        const aiResponse = await aiService.processChatMessage(message, context);

        // Save AI response to database
        const aiMessage = await ChatMessage.create({
          userId: socket.userId,
          conversationId,
          videoId,
          message: aiResponse.message,
          type: "ai",
          intent: aiResponse.intent,
          operationResult: aiResponse.operationResult,
          timestamp: new Date(),
        });

        // Hide typing indicator
        socket.emit("ai_typing", { typing: false });

        // Send AI response to client
        socket.emit("ai_response", {
          id: aiMessage._id,
          message: aiResponse.message,
          type: "ai",
          intent: aiResponse.intent,
          operationResult: aiResponse.operationResult,
          conversationId, // Include conversationId for context
          actions: aiResponse.actions || [],
          tips: aiResponse.tips || [],
          timestamp: aiMessage.timestamp,
        });

        // If there's a video operation result, emit it separately
        if (aiResponse.operationResult) {
          socket.emit("video_operation_complete", {
            operation: aiResponse.intent.action,
            result: aiResponse.operationResult,
            videoId,
          });
        }
      } catch (error) {
        logger.error("Error handling chat message:", error);

        socket.emit("ai_typing", { typing: false });
        socket.emit("chat_error", {
          error:
            "Sorry, I encountered an error processing your message. Please try again.",
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Handle video upload events
    socket.on("video_uploaded", async (data) => {
      try {
        const { videoId, videoPath, fileName } = data;

        logger.info("Video uploaded:", {
          userId: socket.userId,
          videoId,
          fileName,
        });

        // Emit acknowledgment
        socket.emit("video_upload_acknowledged", { videoId });

        // Send simple welcome message (skip automatic analysis to avoid errors)
        socket.emit("ai_response", {
          id: `welcome_${Date.now()}`,
          message: `Great! I've loaded your video "${fileName}". What would you like to do with it? Try saying "make it brighter" or "increase contrast".`,
          type: "ai",
          intent: { action: "chat" },
          actions: [
            {
              label: "Brighten More",
              command: "increase brightness by 50",
              type: "primary",
            },
            {
              label: "Increase Contrast",
              command: "increase contrast by 40",
              type: "secondary",
            },
            {
              label: "Reset",
              command: "reset brightness and contrast",
              type: "secondary",
            },
          ],
          tips: [
            'Try natural commands like "make it brighter" or "more contrast"',
            'You can specify amounts like "brighten by 50"',
          ],
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error("Error handling video upload:", error);
        socket.emit("video_analysis_error", {
          error: "Failed to analyze video",
          videoId: data.videoId,
        });
      }
    });

    // Handle conversation history requests
    socket.on("get_conversation_history", async (data) => {
      try {
        const { conversationId, limit = 50 } = data;

        const messages = await ChatMessage.find({
          userId: socket.userId,
          conversationId,
        })
          .sort({ timestamp: -1 })
          .limit(limit)
          .lean();

        socket.emit("conversation_history", {
          conversationId,
          messages: messages.reverse(),
        });
      } catch (error) {
        logger.error("Error fetching conversation history:", error);
        socket.emit("conversation_history_error", {
          error: "Failed to load conversation history",
        });
      }
    });

    // Handle video operation requests
    socket.on("execute_video_operation", async (data) => {
      try {
        const { operation, parameters, videoId, videoPath } = data;

        logger.info("Executing video operation:", {
          userId: socket.userId,
          operation,
          parameters,
          videoId,
        });

        // Emit operation started
        socket.emit("video_operation_started", {
          operation,
          videoId,
          timestamp: new Date().toISOString(),
        });

        // Execute the operation
        const result = await aiService.executeVideoOperation(
          { action: operation, parameters },
          { videoId, videoPath, userId: socket.userId }
        );

        // Emit operation completed
        socket.emit("video_operation_complete", {
          operation,
          result,
          videoId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error("Error executing video operation:", error);
        socket.emit("video_operation_error", {
          operation: data.operation,
          error: error.message,
          videoId: data.videoId,
        });
      }
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
      logger.info(`User disconnected: ${socket.userId}`);
    });

    // Handle errors
    socket.on("error", (error) => {
      logger.error("Socket error:", error);
    });
  });

  // Handle connection errors
  io.on("connect_error", (error) => {
    logger.error("Socket.IO connection error:", error);
  });

  logger.info("Socket.IO chat handlers initialized");
};
