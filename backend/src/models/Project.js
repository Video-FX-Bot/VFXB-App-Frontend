import { v4 as uuidv4 } from 'uuid';
import { localStorageService } from '../services/localStorageService.js';
import { logger } from '../utils/logger.js';

export class Project {
  constructor(data = {}) {
    this._id = data._id || null;
    this.userId = data.userId || null;
    this.name = data.name || 'Untitled Project';
    this.description = data.description || '';
    this.videoId = data.videoId || null;
    this.videoData = data.videoData || null; // Store video metadata
    this.thumbnail = data.thumbnail || null;
    this.duration = data.duration || '0:00';
    this.status = data.status || 'draft'; // draft, editing, processing, completed
    this.chatHistory = data.chatHistory || [];
    this.tracks = data.tracks || [];
    this.currentTime = data.currentTime || 0;
    this.settings = data.settings || {
      quality: 'high',
      format: 'mp4',
      resolution: '1920x1080'
    };
    this.metadata = data.metadata || {};
    this.favorite = data.favorite || false;
    this.tags = data.tags || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.lastModified = data.lastModified || 'Just now';
    this.autoSaved = data.autoSaved || false;
    this.manualSave = data.manualSave || false;
    this.socketId = data.socketId || null;
  }

  // Validation methods
  validate() {
    const errors = [];

    if (!this.userId) {
      errors.push('User ID is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Project name is required');
    }

    if (this.name && this.name.length > 100) {
      errors.push('Project name must be less than 100 characters');
    }

    if (this.description && this.description.length > 500) {
      errors.push('Project description must be less than 500 characters');
    }

    const validStatuses = ['draft', 'editing', 'processing', 'completed'];
    if (!validStatuses.includes(this.status)) {
      errors.push('Invalid project status');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Instance methods
  async save() {
    try {
      const validation = this.validate();
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      this.updatedAt = new Date().toISOString();
      this.lastModified = 'Just now';

      if (this._id) {
        // Update existing project
        const updatedProject = await localStorageService.updateProject(this._id, this.toObject());
        Object.assign(this, updatedProject);
        logger.info(`Project updated: ${this._id}`);
      } else {
        // Create new project
        const savedProject = await localStorageService.createProject(this.toObject());
        Object.assign(this, savedProject);
        logger.info(`Project created: ${this._id}`);
      }

      return this;
    } catch (error) {
      logger.error('Error saving project:', error);
      throw error;
    }
  }

  async delete() {
    try {
      if (!this._id) {
        throw new Error('Cannot delete project without ID');
      }

      await localStorageService.deleteProject(this._id);
      logger.info(`Project deleted: ${this._id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting project:', error);
      throw error;
    }
  }

  // Convert to plain object
  toObject() {
    return {
      _id: this._id,
      userId: this.userId,
      name: this.name,
      description: this.description,
      videoId: this.videoId,
      videoData: this.videoData,
      thumbnail: this.thumbnail,
      duration: this.duration,
      status: this.status,
      chatHistory: this.chatHistory,
      tracks: this.tracks,
      currentTime: this.currentTime,
      settings: this.settings,
      metadata: this.metadata,
      favorite: this.favorite,
      tags: this.tags,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastModified: this.lastModified,
      autoSaved: this.autoSaved,
      manualSave: this.manualSave,
      socketId: this.socketId
    };
  }

  // Convert to JSON (for API responses)
  toJSON() {
    return this.toObject();
  }

  // Update project status
  updateStatus(newStatus) {
    const validStatuses = ['draft', 'editing', 'processing', 'completed'];
    if (validStatuses.includes(newStatus)) {
      this.status = newStatus;
      this.updatedAt = new Date().toISOString();
      this.lastModified = 'Just now';
    } else {
      throw new Error('Invalid status');
    }
    return this;
  }

  // Add chat message to history
  addChatMessage(message) {
    this.chatHistory.push({
      ...message,
      timestamp: message.timestamp || new Date().toISOString()
    });
    this.updatedAt = new Date().toISOString();
    this.lastModified = 'Just now';
    return this;
  }

  // Update project settings
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.updatedAt = new Date().toISOString();
    this.lastModified = 'Just now';
    return this;
  }

  // Toggle favorite status
  toggleFavorite() {
    this.favorite = !this.favorite;
    this.updatedAt = new Date().toISOString();
    this.lastModified = 'Just now';
    return this;
  }

  // Static methods for database operations
  static async create(projectData) {
    try {
      // Validate required fields
      if (!projectData.userId) {
        throw new Error('User ID is required');
      }

      if (!projectData.name) {
        throw new Error('Project name is required');
      }

      // Save to local storage
      const savedProject = await localStorageService.createProject(projectData);
      return new Project(savedProject);
    } catch (error) {
      logger.error('Error creating project:', error);
      throw error;
    }
  }

  static async findById(projectId) {
    try {
      const projectData = await localStorageService.getProject(projectId);
      return projectData ? new Project(projectData) : null;
    } catch (error) {
      logger.error('Error finding project by ID:', error);
      throw error;
    }
  }

  static async findByUserId(userId, options = {}) {
    try {
      const projects = await localStorageService.getProjectsByUserId(userId, options);
      return projects.map(project => new Project(project));
    } catch (error) {
      logger.error('Error finding projects by user ID:', error);
      throw error;
    }
  }

  static async findAll(options = {}) {
    try {
      const projects = await localStorageService.getAllProjects(options);
      return projects.map(project => new Project(project));
    } catch (error) {
      logger.error('Error finding all projects:', error);
      throw error;
    }
  }

  static async updateById(projectId, updateData) {
    try {
      updateData.updatedAt = new Date().toISOString();
      updateData.lastModified = 'Just now';
      
      const updatedProject = await localStorageService.updateProject(projectId, updateData);
      return updatedProject ? new Project(updatedProject) : null;
    } catch (error) {
      logger.error('Error updating project:', error);
      throw error;
    }
  }

  static async deleteById(projectId) {
    try {
      await localStorageService.deleteProject(projectId);
      return true;
    } catch (error) {
      logger.error('Error deleting project:', error);
      throw error;
    }
  }

  static async getRecentProjects(userId, limit = 5) {
    try {
      const projects = await localStorageService.getProjectsByUserId(userId, {
        sort: { updatedAt: -1 },
        limit
      });
      return projects.map(project => new Project(project));
    } catch (error) {
      logger.error('Error getting recent projects:', error);
      throw error;
    }
  }

  static async getFavoriteProjects(userId) {
    try {
      const projects = await localStorageService.getProjectsByUserId(userId, {
        filter: { favorite: true },
        sort: { updatedAt: -1 }
      });
      return projects.map(project => new Project(project));
    } catch (error) {
      logger.error('Error getting favorite projects:', error);
      throw error;
    }
  }

  static async searchProjects(userId, searchTerm, options = {}) {
    try {
      const projects = await localStorageService.searchProjects(userId, searchTerm, options);
      return projects.map(project => new Project(project));
    } catch (error) {
      logger.error('Error searching projects:', error);
      throw error;
    }
  }

  static async getProjectStats(userId) {
    try {
      const projects = await localStorageService.getProjectsByUserId(userId);
      
      const stats = {
        total: projects.length,
        draft: projects.filter(p => p.status === 'draft').length,
        editing: projects.filter(p => p.status === 'editing').length,
        processing: projects.filter(p => p.status === 'processing').length,
        completed: projects.filter(p => p.status === 'completed').length,
        favorites: projects.filter(p => p.favorite).length
      };

      return stats;
    } catch (error) {
      logger.error('Error getting project stats:', error);
      throw error;
    }
  }
}

export default Project;