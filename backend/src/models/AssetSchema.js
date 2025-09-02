const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  // Asset identification
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  
  // Asset metadata
  filename: {
    type: String,
    required: true,
    trim: true
  },
  
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  
  mimeType: {
    type: String,
    required: true
  },
  
  size: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Asset type and category
  assetType: {
    type: String,
    enum: ['video', 'audio', 'image', 'document', 'other'],
    required: true,
    index: true
  },
  
  category: {
    type: String,
    enum: ['source', 'preview', 'thumbnail', 'export', 'temp'],
    default: 'source',
    index: true
  },
  
  // Storage information
  storageProvider: {
    type: String,
    enum: ['local', 's3', 'cloudinary', 'azure'],
    default: 'local'
  },
  
  storagePath: {
    type: String,
    required: true
  },
  
  publicUrl: {
    type: String
  },
  
  // Video-specific metadata
  videoMetadata: {
    duration: Number, // in seconds
    width: Number,
    height: Number,
    frameRate: Number,
    bitrate: Number,
    codec: String,
    format: String
  },
  
  // Audio-specific metadata
  audioMetadata: {
    duration: Number, // in seconds
    sampleRate: Number,
    channels: Number,
    bitrate: Number,
    codec: String
  },
  
  // Image-specific metadata
  imageMetadata: {
    width: Number,
    height: Number,
    format: String,
    colorSpace: String
  },
  
  // Processing status
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  
  processingError: {
    type: String
  },
  
  // Access control
  uploadedBy: {
    type: String,
    required: true,
    index: true
  },
  
  isPublic: {
    type: Boolean,
    default: false
  },
  
  // Lifecycle management
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
assetSchema.index({ projectId: 1, assetType: 1 });
assetSchema.index({ projectId: 1, category: 1 });
assetSchema.index({ uploadedBy: 1, createdAt: -1 });
assetSchema.index({ processingStatus: 1, createdAt: 1 });

// Virtual for file extension
assetSchema.virtual('extension').get(function() {
  return this.filename.split('.').pop().toLowerCase();
});

// Virtual for human-readable file size
assetSchema.virtual('humanSize').get(function() {
  const bytes = this.size;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Instance methods
assetSchema.methods.generateSignedUrl = function(expiresIn = 3600) {
  // Implementation depends on storage provider
  // This is a placeholder for signed URL generation
  if (this.storageProvider === 'local') {
    return `/api/assets/${this._id}/download`;
  }
  // For cloud providers, implement signed URL logic
  return this.publicUrl;
};

assetSchema.methods.updateProcessingStatus = function(status, error = null) {
  this.processingStatus = status;
  if (error) {
    this.processingError = error;
  }
  this.updatedAt = new Date();
  return this.save();
};

assetSchema.methods.setMetadata = function(metadata) {
  switch (this.assetType) {
    case 'video':
      this.videoMetadata = { ...this.videoMetadata, ...metadata };
      break;
    case 'audio':
      this.audioMetadata = { ...this.audioMetadata, ...metadata };
      break;
    case 'image':
      this.imageMetadata = { ...this.imageMetadata, ...metadata };
      break;
  }
  this.updatedAt = new Date();
  return this.save();
};

// Static methods
assetSchema.statics.findByProject = function(projectId, options = {}) {
  const query = { projectId };
  
  if (options.assetType) {
    query.assetType = options.assetType;
  }
  
  if (options.category) {
    query.category = options.category;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

assetSchema.statics.getProjectStorageUsage = function(projectId) {
  return this.aggregate([
    { $match: { projectId: mongoose.Types.ObjectId(projectId) } },
    {
      $group: {
        _id: '$assetType',
        totalSize: { $sum: '$size' },
        count: { $sum: 1 }
      }
    }
  ]);
};

assetSchema.statics.cleanupExpiredAssets = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Pre-save middleware
assetSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-remove middleware to cleanup files
assetSchema.pre('remove', function(next) {
  // TODO: Implement file cleanup logic based on storage provider
  next();
});

module.exports = mongoose.model('Asset', assetSchema);