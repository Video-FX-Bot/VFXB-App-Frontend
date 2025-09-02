const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * User Schema for MongoDB
 * Comprehensive user management with authentication, preferences, and subscription tracking
 */
const UserSchema = new mongoose.Schema({
  // Basic user information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    index: true,
    validate: {
      validator: function(username) {
        return /^[a-zA-Z0-9_-]+$/.test(username);
      },
      message: 'Username can only contain letters, numbers, underscores, and hyphens'
    }
  },
  
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  
  // Authentication
  passwordHash: {
    type: String,
    required: true,
    minlength: 60 // bcrypt hash length
  },
  
  // Profile information
  avatar: {
    type: String, // URL to avatar image
    default: null
  },
  
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  
  website: {
    type: String,
    default: ''
  },
  
  location: {
    type: String,
    maxlength: 100,
    default: ''
  },
  
  company: {
    type: String,
    maxlength: 100,
    default: ''
  },
  
  skills: [{
    type: String,
    maxlength: 50
  }],
  
  // User roles and permissions
  roles: [{
    type: String,
    enum: ['user', 'admin', 'moderator', 'premium'],
    default: 'user'
  }],
  
  // User preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'dark'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      projectUpdates: { type: Boolean, default: true },
      aiSuggestions: { type: Boolean, default: true },
      collaborationInvites: { type: Boolean, default: true }
    },
    editor: {
      autoSave: { type: Boolean, default: true },
      autoSaveInterval: { type: Number, default: 30 }, // seconds
      showGrid: { type: Boolean, default: true },
      snapToGrid: { type: Boolean, default: true },
      defaultVideoQuality: {
        type: String,
        enum: ['low', 'medium', 'high', 'ultra'],
        default: 'high'
      },
      previewQuality: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      }
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private', 'friends'],
        default: 'public'
      },
      projectVisibility: {
        type: String,
        enum: ['public', 'private', 'unlisted'],
        default: 'private'
      },
      allowAnalytics: { type: Boolean, default: true }
    }
  },
  
  // Subscription and billing
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'expired'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: null
    },
    features: {
      maxProjects: { type: Number, default: 3 },
      maxStorageGB: { type: Number, default: 1 },
      aiCreditsPerMonth: { type: Number, default: 100 },
      collaborators: { type: Number, default: 1 },
      exportQuality: {
        type: String,
        enum: ['standard', 'high', 'ultra'],
        default: 'standard'
      },
      prioritySupport: { type: Boolean, default: false },
      advancedFeatures: { type: Boolean, default: false }
    },
    usage: {
      projectsUsed: { type: Number, default: 0 },
      storageUsedGB: { type: Number, default: 0 },
      aiCreditsUsed: { type: Number, default: 0 },
      collaboratorsUsed: { type: Number, default: 0 }
    }
  },
  
  // AI settings and preferences
  aiSettings: {
    preferredModel: {
      type: String,
      enum: ['gpt-3.5-turbo', 'gpt-4', 'claude-3'],
      default: 'gpt-3.5-turbo'
    },
    autoSuggestions: { type: Boolean, default: true },
    creativityLevel: {
      type: String,
      enum: ['conservative', 'balanced', 'creative'],
      default: 'balanced'
    },
    voiceCommands: { type: Boolean, default: false },
    autoTranscription: { type: Boolean, default: false }
  },
  
  // Security and verification
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  
  verificationToken: {
    type: String,
    default: null
  },
  
  resetPasswordToken: {
    type: String,
    default: null
  },
  
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  
  // Login tracking
  lastLoginAt: {
    type: Date,
    default: null
  },
  
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: {
    type: Date,
    default: null
  },
  
  // Session management
  refreshTokens: [{
    token: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    deviceInfo: {
      userAgent: String,
      ip: String,
      location: String
    }
  }],
  
  // Analytics and activity
  analytics: {
    totalProjects: { type: Number, default: 0 },
    totalEdits: { type: Number, default: 0 },
    totalExports: { type: Number, default: 0 },
    totalAIInteractions: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },
    totalSessionTime: { type: Number, default: 0 } // in seconds
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ isActive: 1, isVerified: 1 });
UserSchema.index({ 'subscription.plan': 1 });
UserSchema.index({ lastLoginAt: -1 });
UserSchema.index({ createdAt: -1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
UserSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('passwordHash')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw error;
  }
};

// Instance method to increment login attempts
UserSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
UserSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Instance method to add refresh token
UserSchema.methods.addRefreshToken = function(token, expiresAt, deviceInfo = {}) {
  this.refreshTokens.push({
    token,
    expiresAt,
    deviceInfo
  });
  
  // Keep only the last 5 refresh tokens
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  
  return this.save();
};

// Instance method to remove refresh token
UserSchema.methods.removeRefreshToken = function(token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
  return this.save();
};

// Instance method to clean expired refresh tokens
UserSchema.methods.cleanExpiredTokens = function() {
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter(rt => rt.expiresAt > now);
  return this.save();
};

// Static method to find by email or username
UserSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  });
};

// Static method to find active users
UserSchema.statics.findActive = function() {
  return this.find({ isActive: true, isVerified: true });
};

module.exports = mongoose.model('User', UserSchema);