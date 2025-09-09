import { localStorageService } from '../services/localStorageService.js';

class Video {
  constructor(videoData) {
    this._id = videoData._id;
    this.title = videoData.title;
    this.description = videoData.description;
    this.tags = videoData.tags || [];
    this.userId = videoData.userId;
    this.originalFilename = videoData.originalFilename;
    this.filename = videoData.filename;
    this.filePath = videoData.filePath;
    this.fileSize = videoData.fileSize;
    this.mimeType = videoData.mimeType;
    this.duration = videoData.duration;
    this.resolution = videoData.resolution || { width: 0, height: 0 };
    this.frameRate = videoData.frameRate;
    this.bitrate = videoData.bitrate;
    this.codec = videoData.codec;
    this.status = videoData.status || 'uploaded';
    this.processingStatus = videoData.processingStatus || 'pending';
    this.thumbnailPath = videoData.thumbnailPath;
    this.previewPath = videoData.previewPath;
    this.metadata = videoData.metadata || {
      format: null,
      streams: [],
      chapters: [],
      subtitles: []
    };
    this.analytics = videoData.analytics || {
      views: 0,
      likes: 0,
      shares: 0,
      comments: 0,
      watchTime: 0,
      completionRate: 0
    };
    this.privacy = videoData.privacy || {
      visibility: 'private',
      allowDownload: false,
      allowComments: true,
      allowEmbedding: false
    };
    this.processing = videoData.processing || {
      jobs: [],
      currentJob: null,
      progress: 0,
      logs: [],
      errors: []
    };
    this.exports = videoData.exports || [];
    
    // Cloud storage fields
    this.cloudUrl = videoData.cloudUrl || null;
    this.cloudPublicId = videoData.cloudPublicId || null;
    
    // AI enhancement fields
    this.aiEnhancements = videoData.aiEnhancements || [];
    
    // Voiceover fields
    this.voiceovers = videoData.voiceovers || [];
    
    this.createdAt = videoData.createdAt || new Date().toISOString();
    this.updatedAt = videoData.updatedAt || new Date().toISOString();
  }

  // Static methods for database operations
  static async create(videoData) {
    try {
      // Validate required fields
      if (!videoData.title || !videoData.userId || !videoData.filename) {
        throw new Error('Title, userId, and filename are required');
      }

      // Save to local storage
      const savedVideo = await localStorageService.createVideo(videoData);
      return new Video(savedVideo);
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const videoData = await localStorageService.findVideoById(id);
      return videoData ? new Video(videoData) : null;
    } catch (error) {
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const videosData = await localStorageService.findVideosByUserId(userId);
      return videosData.map(videoData => new Video(videoData));
    } catch (error) {
      throw error;
    }
  }

  static async findByUserIdWithPagination(userId, page = 1, limit = 10) {
    try {
      const allVideos = await localStorageService.findVideosByUserId(userId);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const videos = allVideos
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(startIndex, endIndex)
        .map(videoData => new Video(videoData));
      
      return {
        videos,
        totalCount: allVideos.length,
        totalPages: Math.ceil(allVideos.length / limit),
        currentPage: page,
        hasNextPage: endIndex < allVideos.length,
        hasPrevPage: page > 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async deleteById(id) {
    try {
      return await localStorageService.deleteVideo(id);
    } catch (error) {
      throw error;
    }
  }

  // Instance methods
  async save() {
    try {
      this.updatedAt = new Date().toISOString();
      
      // If no _id exists, this is a new video - create it
      if (!this._id) {
        const newVideo = await localStorageService.createVideo(this.toObject());
        // Update this instance with the new ID
        this._id = newVideo._id;
        this.createdAt = newVideo.createdAt;
        return new Video(newVideo);
      } else {
        // Existing video - update it
        const updatedVideo = await localStorageService.updateVideo(this._id, this.toObject());
        return new Video(updatedVideo);
      }
    } catch (error) {
      throw error;
    }
  }

  async delete() {
    try {
      return await localStorageService.deleteVideo(this._id);
    } catch (error) {
      throw error;
    }
  }

  // Processing methods
  addProcessingJob(jobData) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: jobData.type,
      status: 'queued',
      progress: 0,
      parameters: jobData.parameters || {},
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null
    };
    
    this.processing.jobs.push(job);
    return job;
  }

  updateProcessingJob(jobId, updates) {
    const jobIndex = this.processing.jobs.findIndex(job => job.id === jobId);
    if (jobIndex !== -1) {
      this.processing.jobs[jobIndex] = {
        ...this.processing.jobs[jobIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Update current job if it's the one being updated
      if (this.processing.currentJob === jobId) {
        this.processing.progress = updates.progress || this.processing.progress;
      }
      
      return this.processing.jobs[jobIndex];
    }
    return null;
  }

  setCurrentJob(jobId) {
    this.processing.currentJob = jobId;
    this.processingStatus = 'processing';
  }

  completeProcessing() {
    this.processing.currentJob = null;
    this.processing.progress = 100;
    this.processingStatus = 'completed';
    this.status = 'ready';
  }

  failProcessing(error) {
    this.processing.currentJob = null;
    this.processing.errors.push({
      message: error.message || error,
      timestamp: new Date().toISOString()
    });
    this.processingStatus = 'failed';
    this.status = 'error';
  }

  // Export methods
  addExport(exportData) {
    const exportRecord = {
      id: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      format: exportData.format,
      quality: exportData.quality,
      resolution: exportData.resolution,
      status: 'queued',
      progress: 0,
      filePath: null,
      fileSize: null,
      downloadUrl: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      error: null
    };
    
    this.exports.push(exportRecord);
    return exportRecord;
  }

  updateExport(exportId, updates) {
    const exportIndex = this.exports.findIndex(exp => exp.id === exportId);
    if (exportIndex !== -1) {
      this.exports[exportIndex] = {
        ...this.exports[exportIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return this.exports[exportIndex];
    }
    return null;
  }

  getActiveExports() {
    return this.exports.filter(exp => 
      exp.status === 'queued' || 
      exp.status === 'processing' || 
      (exp.status === 'completed' && new Date(exp.expiresAt) > new Date())
    );
  }

  // Analytics methods
  incrementViews() {
    this.analytics.views += 1;
    return this.save();
  }

  incrementLikes() {
    this.analytics.likes += 1;
    return this.save();
  }

  incrementShares() {
    this.analytics.shares += 1;
    return this.save();
  }

  addWatchTime(seconds) {
    this.analytics.watchTime += seconds;
    return this.save();
  }

  updateCompletionRate(rate) {
    this.analytics.completionRate = rate;
    return this.save();
  }

  // Utility methods
  getFileExtension() {
    return this.originalFilename.split('.').pop().toLowerCase();
  }

  getFormattedFileSize() {
    const bytes = this.fileSize;
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFormattedDuration() {
    if (!this.duration) return '00:00';
    
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    const seconds = Math.floor(this.duration % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  isProcessing() {
    return this.processingStatus === 'processing';
  }

  isReady() {
    return this.status === 'ready' && this.processingStatus === 'completed';
  }

  hasError() {
    return this.status === 'error' || this.processingStatus === 'failed';
  }

  canBeDeleted() {
    return !this.isProcessing();
  }

  toObject() {
    return {
      _id: this._id,
      title: this.title,
      description: this.description,
      tags: this.tags,
      userId: this.userId,
      originalFilename: this.originalFilename,
      filename: this.filename,
      filePath: this.filePath,
      fileSize: this.fileSize,
      mimeType: this.mimeType,
      duration: this.duration,
      resolution: this.resolution,
      frameRate: this.frameRate,
      bitrate: this.bitrate,
      codec: this.codec,
      status: this.status,
      processingStatus: this.processingStatus,
      thumbnailPath: this.thumbnailPath,
      previewPath: this.previewPath,
      metadata: this.metadata,
      analytics: this.analytics,
      privacy: this.privacy,
      processing: this.processing,
      exports: this.exports,
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
      title: this.title,
      description: this.description,
      tags: this.tags,
      duration: this.duration,
      resolution: this.resolution,
      thumbnailPath: this.thumbnailPath,
      analytics: {
        views: this.analytics.views,
        likes: this.analytics.likes
      },
      createdAt: this.createdAt
    };
  }
}

export default Video;
export { Video };