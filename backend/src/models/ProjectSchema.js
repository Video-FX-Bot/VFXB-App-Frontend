const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * Project Asset Schema
 * Represents individual assets (videos, images, audio) within a project
 */
const ProjectAssetSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  signedUrl: {
    type: String
  },
  type: {
    type: String,
    enum: ['video', 'audio', 'image', 'subtitle', 'other'],
    required: true
  },
  duration: {
    type: Number // For video/audio assets
  },
  dimensions: {
    width: Number,
    height: Number
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Project Schema
 * Enhanced schema for persistent project saving with full editor state
 */
const ProjectSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  ownerId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  thumbnailUrl: {
    type: String
  },
  
  // Core project state for AI Editor restoration
  stateJson: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(v) {
        // Validate that stateJson contains required fields
        return v && typeof v === 'object' && 
               v.hasOwnProperty('timeline') && 
               v.hasOwnProperty('editPlan');
      },
      message: 'stateJson must contain timeline and editPlan'
    }
  },
  
  // Project assets references
  assets: [ProjectAssetSchema],
  
  // Project status and metadata
  status: {
    type: String,
    enum: ['draft', 'in_progress', 'rendering', 'completed', 'archived'],
    default: 'draft',
    index: true
  },
  
  visibility: {
    type: String,
    enum: ['private', 'public', 'unlisted'],
    default: 'private'
  },
  
  category: {
    type: String,
    default: 'general'
  },
  
  tags: [{
    type: String,
    trim: true
  }],
  
  // Versioning for conflict resolution
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Collaboration and permissions
  collaborators: [{
    userId: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer'
    },
    permissions: {
      canEdit: { type: Boolean, default: false },
      canComment: { type: Boolean, default: true },
      canShare: { type: Boolean, default: false },
      canInvite: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false }
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Share links for public sharing
  shareLinks: [{
    token: {
      type: String,
      required: true,
      unique: true
    },
    role: {
      type: String,
      enum: ['viewer', 'editor'],
      default: 'viewer'
    },
    createdBy: {
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
    isActive: {
      type: Boolean,
      default: true
    },
    revokedAt: {
      type: Date
    },
    revokedBy: {
      type: String
    }
  }],
  
  // AI interactions and chat history
  aiInteractions: [{
    id: {
      type: String,
      default: uuidv4
    },
    type: {
      type: String,
      enum: ['chat', 'edit_request', 'generation', 'analysis'],
      required: true
    },
    prompt: {
      type: String,
      required: true
    },
    response: {
      type: mongoose.Schema.Types.Mixed
    },
    modelUsed: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    }
  }],
  
  // Export and render history
  exports: [{
    id: {
      type: String,
      default: uuidv4
    },
    format: {
      type: String,
      required: true
    },
    quality: {
      type: String,
      enum: ['low', 'medium', 'high', 'ultra'],
      default: 'high'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    url: {
      type: String
    },
    size: {
      type: Number
    },
    duration: {
      type: Number
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date
    }
  }],
  
  // Project analytics
  analytics: {
    views: { type: Number, default: 0 },
    edits: { type: Number, default: 0 },
    exports: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    lastViewedAt: { type: Date },
    totalEditTime: { type: Number, default: 0 } // in seconds
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  versionKey: false
});

// Indexes for performance
ProjectSchema.index({ ownerId: 1, createdAt: -1 });
ProjectSchema.index({ ownerId: 1, status: 1 });
ProjectSchema.index({ ownerId: 1, lastAccessedAt: -1 });
ProjectSchema.index({ 'collaborators.userId': 1 });
ProjectSchema.index({ tags: 1 });
ProjectSchema.index({ title: 'text', description: 'text' });

// Pre-save middleware to update version and timestamps
ProjectSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
    this.updatedAt = new Date();
  }
  next();
});

// Instance methods
ProjectSchema.methods.updateLastAccessed = function() {
  this.lastAccessedAt = new Date();
  this.analytics.views += 1;
  return this.save();
};

ProjectSchema.methods.addCollaborator = function(userId, role = 'viewer', permissions = {}) {
  const existingIndex = this.collaborators.findIndex(c => c.userId === userId);
  
  const defaultPermissions = {
    canEdit: role === 'editor' || role === 'owner',
    canComment: true,
    canShare: role === 'owner',
    canDelete: role === 'owner'
  };
  
  const collaborator = {
    userId,
    role,
    permissions: { ...defaultPermissions, ...permissions },
    addedAt: new Date()
  };
  
  if (existingIndex >= 0) {
    this.collaborators[existingIndex] = collaborator;
  } else {
    this.collaborators.push(collaborator);
  }
  
  return this.save();
};

ProjectSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(c => c.userId !== userId);
  return this.save();
};

ProjectSchema.methods.hasPermission = function(userId, permission) {
  if (this.ownerId === userId) return true;
  
  const collaborator = this.collaborators.find(c => c.userId === userId);
  if (!collaborator) return false;
  
  return collaborator.permissions[permission] || false;
};

ProjectSchema.methods.canAccess = function(userId) {
  if (this.ownerId === userId) return true;
  if (this.visibility === 'public') return true;
  
  return this.collaborators.some(c => c.userId === userId);
};

ProjectSchema.methods.addAIInteraction = function(interaction) {
  this.aiInteractions.push({
    ...interaction,
    timestamp: new Date()
  });
  this.analytics.edits += 1;
  return this.save();
};

ProjectSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  
  // Remove sensitive information
  delete obj.stateJson;
  delete obj.aiInteractions;
  delete obj.collaborators;
  
  return {
    id: obj.id,
    title: obj.title,
    description: obj.description,
    thumbnailUrl: obj.thumbnailUrl,
    status: obj.status,
    category: obj.category,
    tags: obj.tags,
    ownerId: obj.ownerId,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    analytics: {
      views: obj.analytics.views,
      exports: obj.analytics.exports
    }
  };
};

// Instance methods
ProjectSchema.methods.hasPermission = function(userId, permission) {
  // Owner has all permissions
  if (this.ownerId === userId) {
    return true;
  }
  
  // Check collaborator permissions
  const collaborator = this.collaborators.find(collab => collab.userId === userId);
  if (!collaborator) {
    return false;
  }
  
  // Admin role has most permissions
  if (collaborator.role === 'admin') {
    return ['canEdit', 'canComment', 'canShare', 'canInvite'].includes(permission);
  }
  
  // Editor role permissions
  if (collaborator.role === 'editor') {
    return ['canEdit', 'canComment'].includes(permission);
  }
  
  // Check specific permission
  return collaborator.permissions[permission] || false;
};

ProjectSchema.methods.addCollaborator = function(userId, role = 'viewer') {
  // Remove existing collaborator if exists
  this.collaborators = this.collaborators.filter(collab => collab.userId !== userId);
  
  // Set permissions based on role
  const permissions = {
    canEdit: role === 'editor' || role === 'admin',
    canComment: true,
    canShare: role === 'admin',
    canInvite: role === 'admin',
    canDelete: false
  };
  
  // Add new collaborator
  this.collaborators.push({
    userId,
    role,
    permissions,
    addedAt: new Date()
  });
  
  this.updatedAt = new Date();
};

// Static methods
ProjectSchema.statics.findByOwner = function(ownerId, options = {}) {
  const { page = 1, limit = 10, status, search } = options;
  const skip = (page - 1) * limit;
  
  let query = { ownerId };
  
  if (status) {
    query.status = status;
  }
  
  if (search) {
    query.$text = { $search: search };
  }
  
  return this.find(query)
    .sort({ lastAccessedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-stateJson -aiInteractions'); // Exclude heavy fields for listing
};

ProjectSchema.statics.findAccessibleByUser = function(userId, options = {}) {
  const { page = 1, limit = 10, status, search } = options;
  const skip = (page - 1) * limit;
  
  let query = {
    $or: [
      { ownerId: userId },
      { 'collaborators.userId': userId },
      { visibility: 'public' }
    ]
  };
  
  if (status) {
    query.status = status;
  }
  
  if (search) {
    query.$text = { $search: search };
  }
  
  return this.find(query)
    .sort({ lastAccessedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-stateJson -aiInteractions');
};

module.exports = mongoose.model('Project', ProjectSchema);