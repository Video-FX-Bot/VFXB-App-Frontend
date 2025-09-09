import { localStorageService } from '../services/localStorageService.js';

class ChatMessage {
  constructor(messageData) {
    this._id = messageData._id;
    this.conversationId = messageData.conversationId;
    this.userId = messageData.userId;
    this.message = messageData.message;
    this.type = messageData.type;
    this.aiProcessing = messageData.aiProcessing || {
      model: 'gpt-4-turbo-preview',
      tokens: {
        prompt: 0,
        completion: 0,
        total: 0
      },
      processingTime: 0,
      confidence: null,
      intent: 'unknown',
      parameters: {}
    };
    this.videoOperation = messageData.videoOperation || {
      videoId: null,
      operation: null,
      parameters: {},
      status: 'pending',
      progress: 0,
      result: {
        success: false,
        outputPath: null,
        downloadUrl: null,
        metadata: {},
        error: null
      },
      startedAt: null,
      completedAt: null,
      processingTime: null
    };
    this.metadata = messageData.metadata || {
      userAgent: null,
      ip: null,
      platform: null,
      replyTo: null,
      threadId: null,
      attachments: [],
      formatting: {
        bold: [],
        italic: [],
        code: [],
        links: []
      },
      reactions: []
    };
    this.status = messageData.status || 'sent';
    this.isVisible = messageData.isVisible !== undefined ? messageData.isVisible : true;
    this.isEdited = messageData.isEdited || false;
    this.editedAt = messageData.editedAt;
    this.originalMessage = messageData.originalMessage;
    this.flagged = messageData.flagged || false;
    this.flagReason = messageData.flagReason;
    this.moderatedBy = messageData.moderatedBy;
    this.moderatedAt = messageData.moderatedAt;
    this.analytics = messageData.analytics || {
      readBy: [],
      helpful: 0,
      notHelpful: 0,
      feedback: []
    };
    this.learningData = messageData.learningData || {
      userSatisfaction: null,
      followUpQuestions: [],
      correctionProvided: false,
      correctionText: null,
      improvementSuggestions: []
    };
    this.createdAt = messageData.createdAt || new Date().toISOString();
    this.updatedAt = messageData.updatedAt || new Date().toISOString();
  }

  // Static methods for database operations
  static async create(messageData) {
    try {
      // Validate required fields
      if (!messageData.conversationId || !messageData.userId || !messageData.message || !messageData.type) {
        throw new Error('ConversationId, userId, message, and type are required');
      }

      // Validate message type
      const validTypes = ['user', 'ai', 'system', 'command', 'result', 'error', 'notification'];
      if (!validTypes.includes(messageData.type)) {
        throw new Error('Invalid message type');
      }

      // Validate message length
      if (messageData.message.length > 5000) {
        throw new Error('Message cannot exceed 5000 characters');
      }

      // Save to local storage
      const savedMessage = await localStorageService.createChatMessage(messageData);
      return new ChatMessage(savedMessage);
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const messageData = await localStorageService.findChatMessageById(id);
      return messageData ? new ChatMessage(messageData) : null;
    } catch (error) {
      throw error;
    }
  }

  static async findByConversation(conversationId, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        type,
        includeHidden = false
      } = options;

      const allMessages = await localStorageService.findChatMessagesByConversation(conversationId);
      
      let filteredMessages = allMessages;
      
      // Apply filters
      if (type) {
        filteredMessages = filteredMessages.filter(msg => msg.type === type);
      }
      if (!includeHidden) {
        filteredMessages = filteredMessages.filter(msg => msg.isVisible !== false);
      }

      // Sort by creation date
      filteredMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

      return {
        messages: paginatedMessages.map(messageData => new ChatMessage(messageData)),
        totalCount: filteredMessages.length,
        totalPages: Math.ceil(filteredMessages.length / limit),
        currentPage: page,
        hasNextPage: endIndex < filteredMessages.length,
        hasPrevPage: page > 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async findByUser(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        type,
        conversationId
      } = options;

      const allMessages = await localStorageService.findChatMessagesByUserId(userId);
      
      let filteredMessages = allMessages.filter(msg => msg.isVisible !== false);
      
      // Apply filters
      if (type) {
        filteredMessages = filteredMessages.filter(msg => msg.type === type);
      }
      if (conversationId) {
        filteredMessages = filteredMessages.filter(msg => msg.conversationId === conversationId);
      }

      // Sort by creation date (newest first)
      filteredMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

      return {
        messages: paginatedMessages.map(messageData => new ChatMessage(messageData)),
        totalCount: filteredMessages.length,
        totalPages: Math.ceil(filteredMessages.length / limit),
        currentPage: page,
        hasNextPage: endIndex < filteredMessages.length,
        hasPrevPage: page > 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async findPendingOperations() {
    try {
      const allMessages = await localStorageService.getAllChatMessages();
      
      const pendingMessages = allMessages.filter(msg => 
        msg.videoOperation && 
        ['pending', 'processing'].includes(msg.videoOperation.status) &&
        ['command', 'ai'].includes(msg.type)
      );

      return pendingMessages.map(messageData => new ChatMessage(messageData));
    } catch (error) {
      throw error;
    }
  }

  static async deleteById(id) {
    try {
      return await localStorageService.deleteChatMessage(id);
    } catch (error) {
      throw error;
    }
  }

  // Instance methods
  async save() {
    try {
      this.updatedAt = new Date().toISOString();
      
      // Handle edit tracking
      if (this.isModified && this.isModified('message') && this._id) {
        this.isEdited = true;
        this.editedAt = new Date().toISOString();
        if (!this.originalMessage) {
          this.originalMessage = this.message;
        }
      }
      
      // Update video operation timestamps
      if (this.videoOperation) {
        if (this.videoOperation.status === 'processing' && !this.videoOperation.startedAt) {
          this.videoOperation.startedAt = new Date().toISOString();
        }
        if ((this.videoOperation.status === 'completed' || this.videoOperation.status === 'failed') && !this.videoOperation.completedAt) {
          this.videoOperation.completedAt = new Date().toISOString();
          if (this.videoOperation.startedAt) {
            this.videoOperation.processingTime = new Date(this.videoOperation.completedAt) - new Date(this.videoOperation.startedAt);
          }
        }
      }
      
      let savedMessage;
      if (this._id) {
        // Update existing message
        savedMessage = await localStorageService.updateChatMessage(this._id, this.toObject());
      } else {
        // Create new message
        savedMessage = await localStorageService.createChatMessage(this.toObject());
        this._id = savedMessage._id;
      }
      
      return new ChatMessage(savedMessage);
    } catch (error) {
      throw error;
    }
  }

  async delete() {
    try {
      return await localStorageService.deleteChatMessage(this._id);
    } catch (error) {
      throw error;
    }
  }

  // Utility methods
  markAsRead(userId) {
    const existingRead = this.analytics.readBy.find(
      read => read.userId === userId
    );
    
    if (!existingRead) {
      this.analytics.readBy.push({
        userId,
        readAt: new Date().toISOString()
      });
    }
    
    return this.save();
  }

  addReaction(userId, emoji) {
    // Remove existing reaction from this user
    this.metadata.reactions = this.metadata.reactions.filter(
      reaction => reaction.userId !== userId
    );
    
    // Add new reaction
    this.metadata.reactions.push({
      userId,
      emoji,
      timestamp: new Date().toISOString()
    });
    
    return this.save();
  }

  removeReaction(userId) {
    this.metadata.reactions = this.metadata.reactions.filter(
      reaction => reaction.userId !== userId
    );
    
    return this.save();
  }

  addFeedback(userId, type, comment = '') {
    this.analytics.feedback.push({
      userId,
      type,
      comment,
      timestamp: new Date().toISOString()
    });
    
    // Update counters
    if (type === 'helpful') {
      this.analytics.helpful += 1;
    } else if (type === 'not_helpful') {
      this.analytics.notHelpful += 1;
    }
    
    return this.save();
  }

  updateOperationStatus(status, progress = null, result = null) {
    if (!this.videoOperation) {
      this.videoOperation = {
        videoId: null,
        operation: null,
        parameters: {},
        status: 'pending',
        progress: 0,
        result: {
          success: false,
          outputPath: null,
          downloadUrl: null,
          metadata: {},
          error: null
        },
        startedAt: null,
        completedAt: null,
        processingTime: null
      };
    }
    
    this.videoOperation.status = status;
    
    if (progress !== null) {
      this.videoOperation.progress = progress;
    }
    
    if (result) {
      this.videoOperation.result = { ...this.videoOperation.result, ...result };
    }
    
    return this.save();
  }

  flag(reason, moderatorId) {
    this.flagged = true;
    this.flagReason = reason;
    this.moderatedBy = moderatorId;
    this.moderatedAt = new Date().toISOString();
    
    return this.save();
  }

  unflag(moderatorId) {
    this.flagged = false;
    this.flagReason = null;
    this.moderatedBy = moderatorId;
    this.moderatedAt = new Date().toISOString();
    
    return this.save();
  }

  // Virtual properties
  get age() {
    return Date.now() - new Date(this.createdAt).getTime();
  }

  get timeAgo() {
    const now = new Date();
    const diff = now - new Date(this.createdAt);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  get operationDuration() {
    if (this.videoOperation && this.videoOperation.startedAt && this.videoOperation.completedAt) {
      return new Date(this.videoOperation.completedAt) - new Date(this.videoOperation.startedAt);
    }
    return null;
  }

  // Validation methods
  isValidType() {
    const validTypes = ['user', 'ai', 'system', 'command', 'result', 'error', 'notification'];
    return validTypes.includes(this.type);
  }

  isValidStatus() {
    const validStatuses = ['sent', 'delivered', 'read', 'failed'];
    return validStatuses.includes(this.status);
  }

  isValidOperationStatus() {
    if (!this.videoOperation || !this.videoOperation.status) return true;
    const validStatuses = ['pending', 'processing', 'completed', 'failed'];
    return validStatuses.includes(this.videoOperation.status);
  }

  // Utility methods
  hasAttachments() {
    return this.metadata.attachments && this.metadata.attachments.length > 0;
  }

  hasReactions() {
    return this.metadata.reactions && this.metadata.reactions.length > 0;
  }

  isFromUser() {
    return this.type === 'user';
  }

  isFromAI() {
    return this.type === 'ai';
  }

  isCommand() {
    return this.type === 'command';
  }

  isProcessing() {
    return this.videoOperation && this.videoOperation.status === 'processing';
  }

  isCompleted() {
    return this.videoOperation && this.videoOperation.status === 'completed';
  }

  hasFailed() {
    return this.videoOperation && this.videoOperation.status === 'failed';
  }

  getReactionCount(emoji) {
    return this.metadata.reactions.filter(reaction => reaction.emoji === emoji).length;
  }

  getUserReaction(userId) {
    return this.metadata.reactions.find(reaction => reaction.userId === userId);
  }

  isReadBy(userId) {
    return this.analytics.readBy.some(read => read.userId === userId);
  }

  getReadTimestamp(userId) {
    const read = this.analytics.readBy.find(read => read.userId === userId);
    return read ? read.readAt : null;
  }

  // Data conversion methods
  toObject() {
    return {
      _id: this._id,
      conversationId: this.conversationId,
      userId: this.userId,
      message: this.message,
      type: this.type,
      aiProcessing: this.aiProcessing,
      videoOperation: this.videoOperation,
      metadata: this.metadata,
      status: this.status,
      isVisible: this.isVisible,
      isEdited: this.isEdited,
      editedAt: this.editedAt,
      originalMessage: this.originalMessage,
      flagged: this.flagged,
      flagReason: this.flagReason,
      moderatedBy: this.moderatedBy,
      moderatedAt: this.moderatedAt,
      analytics: this.analytics,
      learningData: this.learningData,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  toJSON() {
    return this.toObject();
  }

  getPublicData() {
    return {
      _id: this._id,
      conversationId: this.conversationId,
      message: this.message,
      type: this.type,
      status: this.status,
      isEdited: this.isEdited,
      editedAt: this.editedAt,
      metadata: {
        attachments: this.metadata.attachments,
        formatting: this.metadata.formatting,
        reactions: this.metadata.reactions
      },
      videoOperation: this.videoOperation ? {
        operation: this.videoOperation.operation,
        status: this.videoOperation.status,
        progress: this.videoOperation.progress
      } : null,
      analytics: {
        helpful: this.analytics.helpful,
        notHelpful: this.analytics.notHelpful
      },
      createdAt: this.createdAt,
      timeAgo: this.timeAgo
    };
  }

  // Helper method to track modifications (for edit detection)
  isModified(field) {
    // Simple implementation - in a real scenario, you might want more sophisticated tracking
    return this._modifiedFields && this._modifiedFields.includes(field);
  }

  markModified(field) {
    if (!this._modifiedFields) {
      this._modifiedFields = [];
    }
    if (!this._modifiedFields.includes(field)) {
      this._modifiedFields.push(field);
    }
  }
}

export default ChatMessage;
export { ChatMessage };