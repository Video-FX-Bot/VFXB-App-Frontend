const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    model: String,
    tokens: Number,
    cost: Number,
    processingTime: Number,
    confidence: Number
  }
});

const chatSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: false,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
    default: 'New Chat'
  },
  messages: [chatMessageSchema],
  context: {
    type: {
      type: String,
      enum: ['general', 'project', 'video_editing', 'ai_assistance'],
      default: 'general'
    },
    projectData: {
      timeline: mongoose.Schema.Types.Mixed,
      assets: [String],
      currentScene: String
    },
    userPreferences: {
      language: String,
      aiModel: String,
      responseStyle: String
    }
  },
  analytics: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    userSatisfaction: {
      rating: Number,
      feedback: String
    }
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
chatSessionSchema.index({ userId: 1, createdAt: -1 });
chatSessionSchema.index({ projectId: 1, createdAt: -1 });
chatSessionSchema.index({ sessionId: 1 });
chatSessionSchema.index({ status: 1, isActive: 1 });
chatSessionSchema.index({ lastMessageAt: -1 });

// Virtual for message count
chatSessionSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Pre-save middleware
chatSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update analytics
  this.analytics.totalMessages = this.messages.length;
  
  if (this.messages.length > 0) {
    this.lastMessageAt = this.messages[this.messages.length - 1].timestamp;
    
    // Calculate total tokens and cost
    this.analytics.totalTokens = this.messages.reduce((total, msg) => {
      return total + (msg.metadata?.tokens || 0);
    }, 0);
    
    this.analytics.totalCost = this.messages.reduce((total, msg) => {
      return total + (msg.metadata?.cost || 0);
    }, 0);
    
    // Calculate average response time
    const responseTimes = this.messages
      .filter(msg => msg.metadata?.processingTime)
      .map(msg => msg.metadata.processingTime);
    
    if (responseTimes.length > 0) {
      this.analytics.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }
  }
  
  next();
});

// Instance methods
chatSessionSchema.methods.addMessage = function(role, content, metadata = {}) {
  const message = {
    role,
    content,
    timestamp: new Date(),
    metadata
  };
  
  this.messages.push(message);
  return message;
};

chatSessionSchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages.slice(-limit);
};

chatSessionSchema.methods.getMessagesInRange = function(startDate, endDate) {
  return this.messages.filter(msg => {
    return msg.timestamp >= startDate && msg.timestamp <= endDate;
  });
};

chatSessionSchema.methods.updateContext = function(contextData) {
  this.context = { ...this.context, ...contextData };
  return this.context;
};

chatSessionSchema.methods.archive = function() {
  this.status = 'archived';
  this.isActive = false;
  return this.save();
};

chatSessionSchema.methods.restore = function() {
  this.status = 'active';
  this.isActive = true;
  return this.save();
};

chatSessionSchema.methods.softDelete = function() {
  this.status = 'deleted';
  this.isActive = false;
  return this.save();
};

// Static methods
chatSessionSchema.statics.findByUserId = function(userId, options = {}) {
  const { limit = 20, status = 'active', includeArchived = false } = options;
  
  const query = { userId };
  
  if (!includeArchived) {
    query.status = status;
  }
  
  return this.find(query)
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .populate('projectId', 'title description')
    .select('-messages'); // Exclude messages for list view
};

chatSessionSchema.statics.findByProjectId = function(projectId, options = {}) {
  const { limit = 10, status = 'active' } = options;
  
  return this.find({ projectId, status })
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .populate('userId', 'username email')
    .select('-messages');
};

chatSessionSchema.statics.getSessionWithMessages = function(sessionId, userId) {
  return this.findOne({ 
    sessionId, 
    userId, 
    status: { $ne: 'deleted' } 
  })
  .populate('projectId', 'title description')
  .populate('userId', 'username email preferences');
};

chatSessionSchema.statics.getUserChatStats = function(userId, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate },
        status: 'active'
      }
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalMessages: { $sum: '$analytics.totalMessages' },
        totalTokens: { $sum: '$analytics.totalTokens' },
        totalCost: { $sum: '$analytics.totalCost' },
        avgResponseTime: { $avg: '$analytics.averageResponseTime' }
      }
    }
  ]);
};

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = { ChatSession, ChatMessage };