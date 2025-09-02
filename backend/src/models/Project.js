const { v4: uuidv4 } = require('uuid');

/**
 * Project Model
 * Represents a video editing project in the VFXB application
 */
class Project {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.title = data.title;
    this.description = data.description || '';
    this.ownerId = data.ownerId;
    this.collaborators = data.collaborators || [];
    this.status = data.status || 'draft'; // draft, in_progress, completed, archived
    this.visibility = data.visibility || 'private'; // private, public, unlisted
    this.category = data.category || 'general';
    this.tags = data.tags || [];
    this.thumbnail = data.thumbnail;
    this.settings = data.settings || this.getDefaultSettings();
    this.timeline = data.timeline || this.getDefaultTimeline();
    this.assets = data.assets || this.getDefaultAssets();
    this.exports = data.exports || [];
    this.aiInteractions = data.aiInteractions || [];
    this.versions = data.versions || [];
    this.metadata = data.metadata || this.getDefaultMetadata();
    this.analytics = data.analytics || this.getDefaultAnalytics();
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.lastAccessedAt = data.lastAccessedAt || new Date();
  }

  /**
   * Get default project settings
   */
  getDefaultSettings() {
    return {
      video: {
        resolution: '1920x1080',
        frameRate: 30,
        aspectRatio: '16:9',
        duration: 0,
        format: 'mp4'
      },
      audio: {
        sampleRate: 48000,
        channels: 2,
        bitrate: 320
      },
      export: {
        quality: 'high',
        format: 'mp4',
        codec: 'h264',
        bitrate: 'auto'
      },
      ai: {
        autoSuggestions: true,
        sceneDetection: true,
        autoSubtitles: false,
        smartCrop: false,
        colorCorrection: false
      },
      collaboration: {
        allowComments: true,
        allowEditing: false,
        requireApproval: true,
        notifyChanges: true
      }
    };
  }

  /**
   * Get default timeline structure
   */
  getDefaultTimeline() {
    return {
      tracks: [
        {
          id: uuidv4(),
          type: 'video',
          name: 'Video Track 1',
          clips: [],
          locked: false,
          muted: false,
          visible: true
        },
        {
          id: uuidv4(),
          type: 'audio',
          name: 'Audio Track 1',
          clips: [],
          locked: false,
          muted: false,
          visible: true
        }
      ],
      playhead: 0,
      zoom: 1,
      markers: [],
      selections: []
    };
  }

  /**
   * Get default assets structure
   */
  getDefaultAssets() {
    return {
      media: [],
      audio: [],
      images: [],
      effects: [],
      transitions: [],
      titles: [],
      graphics: []
    };
  }

  /**
   * Get default metadata
   */
  getDefaultMetadata() {
    return {
      fileSize: 0,
      totalDuration: 0,
      clipCount: 0,
      effectCount: 0,
      transitionCount: 0,
      audioTrackCount: 1,
      videoTrackCount: 1,
      lastExportDate: null,
      lastBackupDate: null,
      version: '1.0.0'
    };
  }

  /**
   * Get default analytics
   */
  getDefaultAnalytics() {
    return {
      views: 0,
      likes: 0,
      shares: 0,
      comments: 0,
      editingTime: 0, // in minutes
      aiInteractions: 0,
      collaboratorActions: 0,
      exportCount: 0,
      lastViewedAt: null
    };
  }

  /**
   * Update project data
   */
  update(data) {
    const allowedFields = [
      'title', 'description', 'status', 'visibility', 'category', 'tags',
      'thumbnail', 'settings', 'timeline', 'assets'
    ];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        if (typeof data[field] === 'object' && data[field] !== null && !Array.isArray(data[field])) {
          this[field] = { ...this[field], ...data[field] };
        } else {
          this[field] = data[field];
        }
      }
    });

    this.updatedAt = new Date();
    this.updateMetadata();
  }

  /**
   * Update metadata based on current project state
   */
  updateMetadata() {
    let totalClips = 0;
    let totalDuration = 0;
    let effectCount = 0;
    let transitionCount = 0;

    this.timeline.tracks.forEach(track => {
      totalClips += track.clips.length;
      track.clips.forEach(clip => {
        totalDuration += clip.duration || 0;
        effectCount += (clip.effects || []).length;
        transitionCount += (clip.transitions || []).length;
      });
    });

    this.metadata = {
      ...this.metadata,
      totalDuration,
      clipCount: totalClips,
      effectCount,
      transitionCount,
      audioTrackCount: this.timeline.tracks.filter(t => t.type === 'audio').length,
      videoTrackCount: this.timeline.tracks.filter(t => t.type === 'video').length
    };
  }

  /**
   * Add collaborator to project
   */
  addCollaborator(userId, role = 'viewer', permissions = {}) {
    const existingCollaborator = this.collaborators.find(c => c.userId === userId);
    
    if (existingCollaborator) {
      existingCollaborator.role = role;
      existingCollaborator.permissions = { ...existingCollaborator.permissions, ...permissions };
      existingCollaborator.updatedAt = new Date();
    } else {
      this.collaborators.push({
        userId,
        role, // viewer, editor, admin
        permissions: {
          canEdit: role === 'editor' || role === 'admin',
          canComment: true,
          canExport: role === 'admin',
          canInvite: role === 'admin',
          canDelete: role === 'admin',
          ...permissions
        },
        addedAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    this.updatedAt = new Date();
  }

  /**
   * Remove collaborator from project
   */
  removeCollaborator(userId) {
    this.collaborators = this.collaborators.filter(c => c.userId !== userId);
    this.updatedAt = new Date();
  }

  /**
   * Check if user has permission
   */
  hasPermission(userId, permission) {
    if (this.ownerId === userId) {
      return true; // Owner has all permissions
    }

    const collaborator = this.collaborators.find(c => c.userId === userId);
    if (!collaborator) {
      return false;
    }

    return collaborator.permissions[permission] || false;
  }

  /**
   * Add AI interaction
   */
  addAIInteraction(interaction) {
    this.aiInteractions.push({
      id: uuidv4(),
      type: interaction.type, // chat, analysis, suggestion, voice_command
      input: interaction.input,
      output: interaction.output,
      model: interaction.model,
      confidence: interaction.confidence,
      applied: interaction.applied || false,
      timestamp: new Date(),
      userId: interaction.userId
    });
    
    this.analytics.aiInteractions++;
    this.updatedAt = new Date();
  }

  /**
   * Add version snapshot
   */
  createVersion(description = '', userId) {
    const version = {
      id: uuidv4(),
      version: `${this.versions.length + 1}.0.0`,
      description,
      snapshot: {
        timeline: JSON.parse(JSON.stringify(this.timeline)),
        settings: JSON.parse(JSON.stringify(this.settings)),
        assets: JSON.parse(JSON.stringify(this.assets))
      },
      createdBy: userId,
      createdAt: new Date()
    };
    
    this.versions.push(version);
    this.updatedAt = new Date();
    
    return version;
  }

  /**
   * Restore from version
   */
  restoreVersion(versionId, userId) {
    const version = this.versions.find(v => v.id === versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    // Create backup of current state before restoring
    this.createVersion(`Backup before restoring to ${version.version}`, userId);

    // Restore the version
    this.timeline = JSON.parse(JSON.stringify(version.snapshot.timeline));
    this.settings = JSON.parse(JSON.stringify(version.snapshot.settings));
    this.assets = JSON.parse(JSON.stringify(version.snapshot.assets));
    
    this.updatedAt = new Date();
    this.updateMetadata();
  }

  /**
   * Add export record
   */
  addExport(exportData) {
    const exportRecord = {
      id: uuidv4(),
      format: exportData.format,
      quality: exportData.quality,
      resolution: exportData.resolution,
      fileSize: exportData.fileSize,
      duration: exportData.duration,
      url: exportData.url,
      status: exportData.status || 'completed',
      createdBy: exportData.userId,
      createdAt: new Date()
    };
    
    this.exports.push(exportRecord);
    this.analytics.exportCount++;
    this.metadata.lastExportDate = new Date();
    this.updatedAt = new Date();
    
    return exportRecord;
  }

  /**
   * Update analytics
   */
  updateAnalytics(type, value = 1) {
    if (this.analytics[type] !== undefined) {
      this.analytics[type] += value;
    }
    
    if (type === 'views') {
      this.analytics.lastViewedAt = new Date();
    }
    
    this.updatedAt = new Date();
  }

  /**
   * Update last accessed timestamp
   */
  updateLastAccessed() {
    this.lastAccessedAt = new Date();
  }

  /**
   * Check if project is accessible by user
   */
  isAccessibleBy(userId) {
    if (this.visibility === 'public') {
      return true;
    }
    
    if (this.ownerId === userId) {
      return true;
    }
    
    return this.collaborators.some(c => c.userId === userId);
  }

  /**
   * Get project size in bytes
   */
  calculateSize() {
    let totalSize = 0;
    
    Object.values(this.assets).forEach(assetArray => {
      if (Array.isArray(assetArray)) {
        assetArray.forEach(asset => {
          totalSize += asset.fileSize || 0;
        });
      }
    });
    
    return totalSize;
  }

  /**
   * Convert to JSON (exclude sensitive data)
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      ownerId: this.ownerId,
      collaborators: this.collaborators,
      status: this.status,
      visibility: this.visibility,
      category: this.category,
      tags: this.tags,
      thumbnail: this.thumbnail,
      settings: this.settings,
      timeline: this.timeline,
      assets: this.assets,
      exports: this.exports,
      metadata: this.metadata,
      analytics: this.analytics,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastAccessedAt: this.lastAccessedAt
    };
  }

  /**
   * Convert to public JSON (for public projects)
   */
  toPublicJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      ownerId: this.ownerId,
      status: this.status,
      category: this.category,
      tags: this.tags,
      thumbnail: this.thumbnail,
      metadata: {
        totalDuration: this.metadata.totalDuration,
        clipCount: this.metadata.clipCount,
        version: this.metadata.version
      },
      analytics: {
        views: this.analytics.views,
        likes: this.analytics.likes,
        shares: this.analytics.shares,
        comments: this.analytics.comments
      },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Validate project data
   */
  static validate(data) {
    const errors = [];

    if (!data.title || data.title.length < 1 || data.title.length > 100) {
      errors.push('Title must be between 1 and 100 characters');
    }

    if (data.description && data.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }

    if (!data.ownerId) {
      errors.push('Owner ID is required');
    }

    if (data.status && !['draft', 'in_progress', 'completed', 'archived'].includes(data.status)) {
      errors.push('Invalid status');
    }

    if (data.visibility && !['private', 'public', 'unlisted'].includes(data.visibility)) {
      errors.push('Invalid visibility');
    }

    return errors;
  }
}

module.exports = Project;