const { Server } = require('socket.io');
const winston = require('winston');
const openaiService = require('./openaiService');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/socket.log' }),
        new winston.transports.Console()
      ]
    });
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(server) {
    try {
      this.io = new Server(server, {
        cors: {
          origin: process.env.FRONTEND_URL || "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true
      });

      this.setupEventHandlers();
      this.logger.info('Socket.IO server initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Socket.IO server:', error);
      return false;
    }
  }

  /**
   * Set up Socket.IO event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.logger.info(`User connected: ${socket.id}`);
      this.connectedUsers.set(socket.id, {
        socketId: socket.id,
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      // Handle chat messages
      socket.on('chat:message', async (data) => {
        await this.handleChatMessage(socket, data);
      });

      // Handle video upload notifications
      socket.on('video:upload', async (data) => {
        await this.handleVideoUpload(socket, data);
      });

      // Handle video analysis requests
      socket.on('video:analyze', async (data) => {
        await this.handleVideoAnalysis(socket, data);
      });

      // Handle typing indicators
      socket.on('chat:typing', (data) => {
        socket.broadcast.emit('chat:typing', {
          userId: socket.id,
          typing: data.typing
        });
      });

      // Handle user presence
      socket.on('user:presence', (data) => {
        this.updateUserPresence(socket.id, data);
        socket.broadcast.emit('user:presence', {
          userId: socket.id,
          status: data.status
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.logger.info(`User disconnected: ${socket.id}`);
        this.connectedUsers.delete(socket.id);
        socket.broadcast.emit('user:disconnected', {
          userId: socket.id
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        this.logger.error(`Socket error for ${socket.id}:`, error);
        socket.emit('error', {
          message: 'An error occurred',
          timestamp: new Date().toISOString()
        });
      });
    });

    this.logger.info('Socket.IO chat handlers initialized');
  }

  /**
   * Handle chat messages
   */
  async handleChatMessage(socket, data) {
    try {
      this.logger.info(`Processing chat message from ${socket.id}`);
      
      // Update user activity
      this.updateUserActivity(socket.id);
      
      // Emit typing indicator
      socket.emit('ai:typing', { typing: true });
      
      // Prepare messages for OpenAI
      const messages = [
        {
          role: 'system',
          content: `You are VFXB AI, an expert video editing assistant. Help users edit their videos through natural language commands. 
          
          Current context:
          - Video: ${data.videoMetadata ? data.videoMetadata.name : 'No video uploaded'}
          - Duration: ${data.videoMetadata ? data.videoMetadata.duration : 'N/A'}
          - Project: ${data.projectContext ? data.projectContext.projectName : 'Untitled Project'}
          
          Provide helpful, actionable responses for video editing tasks. Be concise but informative.`
        }
      ];
      
      // Add chat history
      if (data.chatHistory && data.chatHistory.length > 0) {
        data.chatHistory.slice(-5).forEach(msg => {
          messages.push({
            role: 'user',
            content: msg
          });
        });
      }
      
      // Add current message
      messages.push({
        role: 'user',
        content: data.message
      });
      
      // Get AI response
      const aiResponse = await openaiService.chatCompletion(messages, {
        temperature: 0.7,
        maxTokens: 500
      });
      
      // Stop typing indicator
      socket.emit('ai:typing', { typing: false });
      
      if (aiResponse.success) {
        // Send AI response
        socket.emit('ai:response', {
          message: aiResponse.data.message.content,
          timestamp: new Date().toISOString(),
          actions: this.generateActionSuggestions(data.message),
          tips: this.generateTips(data.message)
        });
        
        this.logger.info(`AI response sent to ${socket.id}`);
      } else {
        throw new Error(aiResponse.error);
      }
      
    } catch (error) {
      this.logger.error(`Chat message error for ${socket.id}:`, error);
      socket.emit('ai:typing', { typing: false });
      socket.emit('chat:error', {
        message: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle video upload notifications
   */
  async handleVideoUpload(socket, data) {
    try {
      this.logger.info(`Processing video upload notification from ${socket.id}`);
      
      // Emit upload confirmation
      socket.emit('video:upload:confirmed', {
        message: `Great! I can see you've uploaded "${data.videoName}". I'm ready to help you edit it!`,
        videoInfo: {
          name: data.videoName,
          size: data.videoSize,
          duration: data.duration,
          type: data.videoType
        },
        suggestions: [
          '🎨 Apply color grading',
          '✂️ Trim and cut clips',
          '🎵 Add background music',
          '📝 Add text and titles',
          '🔄 Add transitions'
        ],
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error(`Video upload error for ${socket.id}:`, error);
      socket.emit('video:upload:error', {
        message: 'Error processing video upload notification',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle video analysis requests
   */
  async handleVideoAnalysis(socket, data) {
    try {
      this.logger.info(`Processing video analysis request from ${socket.id}`);
      
      // Emit analysis start
      socket.emit('video:analysis:started', {
        message: 'Analyzing your video...',
        timestamp: new Date().toISOString()
      });
      
      // Simulate analysis (in real implementation, this would use actual video analysis)
      setTimeout(() => {
        socket.emit('video:analysis:complete', {
          message: `Analysis complete! Your video has great potential. Here are some suggestions based on the content:`,
          analysis: {
            duration: data.duration || 'Unknown',
            quality: 'Good',
            suggestions: [
              'Consider adding a fade-in at the beginning',
              'The lighting could be enhanced with color correction',
              'Audio levels are consistent throughout'
            ]
          },
          actions: [
            '🎨 Apply auto color correction',
            '🔊 Normalize audio levels',
            '✨ Add fade transitions'
          ],
          timestamp: new Date().toISOString()
        });
      }, 2000);
      
    } catch (error) {
      this.logger.error(`Video analysis error for ${socket.id}:`, error);
      socket.emit('video:analysis:error', {
        message: 'Error analyzing video',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Generate action suggestions based on user message
   */
  generateActionSuggestions(message) {
    const lowerMessage = message.toLowerCase();
    const suggestions = [];
    
    if (lowerMessage.includes('color') || lowerMessage.includes('grade')) {
      suggestions.push('🎨 Apply color grading');
    }
    if (lowerMessage.includes('cut') || lowerMessage.includes('trim')) {
      suggestions.push('✂️ Trim video clips');
    }
    if (lowerMessage.includes('music') || lowerMessage.includes('audio')) {
      suggestions.push('🎵 Add background music');
    }
    if (lowerMessage.includes('text') || lowerMessage.includes('title')) {
      suggestions.push('📝 Add text overlay');
    }
    if (lowerMessage.includes('transition')) {
      suggestions.push('🔄 Add transitions');
    }
    
    return suggestions.length > 0 ? suggestions : ['💡 Ask me anything about video editing!'];
  }

  /**
   * Generate tips based on user message
   */
  generateTips(message) {
    const tips = [
      'Pro tip: Use keyboard shortcuts for faster editing',
      'Try using natural language like "make this clip brighter"',
      'You can undo any changes by saying "undo last action"'
    ];
    
    return [tips[Math.floor(Math.random() * tips.length)]];
  }

  /**
   * Update user activity
   */
  updateUserActivity(socketId) {
    const user = this.connectedUsers.get(socketId);
    if (user) {
      user.lastActivity = new Date();
    }
  }

  /**
   * Update user presence
   */
  updateUserPresence(socketId, presenceData) {
    const user = this.connectedUsers.get(socketId);
    if (user) {
      user.presence = presenceData;
      user.lastActivity = new Date();
    }
  }

  /**
   * Broadcast message to all connected users
   */
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * Send message to specific user
   */
  sendToUser(socketId, event, data) {
    if (this.io) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      initialized: !!this.io,
      connectedUsers: this.connectedUsers.size,
      uptime: process.uptime()
    };
  }
}

module.exports = new SocketService();