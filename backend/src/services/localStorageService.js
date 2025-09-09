import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class LocalStorageService {
  constructor() {
    this.dataPath = process.env.DATA_PATH || './data';
    this.collections = {
      users: 'users.json',
      videos: 'videos.json',
      chatMessages: 'chatMessages.json',
      sessions: 'sessions.json',
      projects: 'projects.json'
    };
    this.init();
  }

  async init() {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataPath, { recursive: true });
      
      // Initialize collection files if they don't exist
      for (const [collection, filename] of Object.entries(this.collections)) {
        const filePath = path.join(this.dataPath, filename);
        try {
          await fs.access(filePath);
        } catch (error) {
          // File doesn't exist, create it with empty array
          await fs.writeFile(filePath, JSON.stringify([]), 'utf8');
          console.log(`✅ Created ${collection} collection file`);
        }
      }
      console.log('✅ Local storage initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize local storage:', error);
      throw error;
    }
  }

  async readCollection(collectionName) {
    try {
      const filename = this.collections[collectionName];
      if (!filename) {
        throw new Error(`Collection '${collectionName}' not found`);
      }
      
      const filePath = path.join(this.dataPath, filename);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading collection ${collectionName}:`, error);
      return [];
    }
  }

  async writeCollection(collectionName, data) {
    try {
      const filename = this.collections[collectionName];
      if (!filename) {
        throw new Error(`Collection '${collectionName}' not found`);
      }
      
      const filePath = path.join(this.dataPath, filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`Error writing collection ${collectionName}:`, error);
      throw error;
    }
  }

  // User operations
  async createUser(userData) {
    try {
      const users = await this.readCollection('users');
      const newUser = {
        _id: uuidv4(),
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      users.push(newUser);
      await this.writeCollection('users', users);
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async findUserByEmail(email) {
    try {
      const users = await this.readCollection('users');
      return users.find(user => user.email === email) || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  async findUserById(id) {
    try {
      const users = await this.readCollection('users');
      return users.find(user => user._id === id) || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  }

  async updateUser(id, updateData) {
    try {
      const users = await this.readCollection('users');
      const userIndex = users.findIndex(user => user._id === id);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      users[userIndex] = {
        ...users[userIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      await this.writeCollection('users', users);
      return users[userIndex];
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Video operations
  async createVideo(videoData) {
    try {
      const videos = await this.readCollection('videos');
      const newVideo = {
        _id: uuidv4(),
        ...videoData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      videos.push(newVideo);
      await this.writeCollection('videos', videos);
      return newVideo;
    } catch (error) {
      console.error('Error creating video:', error);
      throw error;
    }
  }

  async findVideosByUserId(userId) {
    try {
      const videos = await this.readCollection('videos');
      return videos.filter(video => video.userId === userId);
    } catch (error) {
      console.error('Error finding videos by user ID:', error);
      return [];
    }
  }

  async findVideoById(id) {
    try {
      const videos = await this.readCollection('videos');
      return videos.find(video => video._id === id) || null;
    } catch (error) {
      console.error('Error finding video by ID:', error);
      return null;
    }
  }

  async updateVideo(id, updateData) {
    try {
      const videos = await this.readCollection('videos');
      const videoIndex = videos.findIndex(video => video._id === id);
      
      if (videoIndex === -1) {
        throw new Error('Video not found');
      }
      
      videos[videoIndex] = {
        ...videos[videoIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      await this.writeCollection('videos', videos);
      return videos[videoIndex];
    } catch (error) {
      console.error('Error updating video:', error);
      throw error;
    }
  }

  async deleteVideo(id) {
    try {
      const videos = await this.readCollection('videos');
      const filteredVideos = videos.filter(video => video._id !== id);
      
      if (videos.length === filteredVideos.length) {
        throw new Error('Video not found');
      }
      
      await this.writeCollection('videos', filteredVideos);
      return true;
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }

  // Chat message operations
  async createChatMessage(messageData) {
    try {
      const messages = await this.readCollection('chatMessages');
      const newMessage = {
        _id: uuidv4(),
        ...messageData,
        createdAt: new Date().toISOString()
      };
      
      messages.push(newMessage);
      await this.writeCollection('chatMessages', messages);
      return newMessage;
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw error;
    }
  }

  async findChatMessagesByUserId(userId, limit = 50) {
    try {
      const messages = await this.readCollection('chatMessages');
      return messages
        .filter(message => message.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    } catch (error) {
      console.error('Error finding chat messages:', error);
      return [];
    }
  }

  // Session operations (for JWT refresh tokens)
  async createSession(sessionData) {
    try {
      const sessions = await this.readCollection('sessions');
      const newSession = {
        _id: uuidv4(),
        ...sessionData,
        createdAt: new Date().toISOString()
      };
      
      sessions.push(newSession);
      await this.writeCollection('sessions', sessions);
      return newSession;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  async findSessionByToken(token) {
    try {
      const sessions = await this.readCollection('sessions');
      return sessions.find(session => session.refreshToken === token) || null;
    } catch (error) {
      console.error('Error finding session:', error);
      return null;
    }
  }

  async deleteSession(token) {
    try {
      const sessions = await this.readCollection('sessions');
      const filteredSessions = sessions.filter(session => session.refreshToken !== token);
      await this.writeCollection('sessions', filteredSessions);
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  // Cleanup old sessions
  async cleanupExpiredSessions() {
    try {
      const sessions = await this.readCollection('sessions');
      const now = new Date();
      const validSessions = sessions.filter(session => {
        const expiresAt = new Date(session.expiresAt);
        return expiresAt > now;
      });
      
      if (validSessions.length !== sessions.length) {
        await this.writeCollection('sessions', validSessions);
        console.log(`🧹 Cleaned up ${sessions.length - validSessions.length} expired sessions`);
      }
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
    }
  }

  // Project operations
  async createProject(projectData) {
    try {
      const projects = await this.readCollection('projects');
      const newProject = {
        _id: uuidv4(),
        ...projectData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      projects.push(newProject);
      await this.writeCollection('projects', projects);
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async getProject(projectId) {
    try {
      const projects = await this.readCollection('projects');
      return projects.find(project => project._id === projectId) || null;
    } catch (error) {
      console.error('Error getting project:', error);
      return null;
    }
  }

  async getProjectsByUserId(userId, options = {}) {
    try {
      const projects = await this.readCollection('projects');
      let userProjects = projects.filter(project => project.userId === userId);
      
      // Apply filters
      if (options.filter) {
        Object.keys(options.filter).forEach(key => {
          userProjects = userProjects.filter(project => project[key] === options.filter[key]);
        });
      }
      
      // Apply sorting
      if (options.sort) {
        const sortKey = Object.keys(options.sort)[0];
        const sortOrder = options.sort[sortKey];
        userProjects.sort((a, b) => {
          if (sortOrder === -1) {
            return new Date(b[sortKey]) - new Date(a[sortKey]);
          } else {
            return new Date(a[sortKey]) - new Date(b[sortKey]);
          }
        });
      }
      
      // Apply limit
      if (options.limit) {
        userProjects = userProjects.slice(0, options.limit);
      }
      
      return userProjects;
    } catch (error) {
      console.error('Error getting projects by user ID:', error);
      return [];
    }
  }

  async getAllProjects(options = {}) {
    try {
      let projects = await this.readCollection('projects');
      
      // Apply sorting
      if (options.sort) {
        const sortKey = Object.keys(options.sort)[0];
        const sortOrder = options.sort[sortKey];
        projects.sort((a, b) => {
          if (sortOrder === -1) {
            return new Date(b[sortKey]) - new Date(a[sortKey]);
          } else {
            return new Date(a[sortKey]) - new Date(b[sortKey]);
          }
        });
      }
      
      // Apply limit
      if (options.limit) {
        projects = projects.slice(0, options.limit);
      }
      
      return projects;
    } catch (error) {
      console.error('Error getting all projects:', error);
      return [];
    }
  }

  async updateProject(projectId, updateData) {
    try {
      const projects = await this.readCollection('projects');
      const projectIndex = projects.findIndex(project => project._id === projectId);
      
      if (projectIndex === -1) {
        throw new Error('Project not found');
      }
      
      projects[projectIndex] = {
        ...projects[projectIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      await this.writeCollection('projects', projects);
      return projects[projectIndex];
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async deleteProject(projectId) {
    try {
      const projects = await this.readCollection('projects');
      const filteredProjects = projects.filter(project => project._id !== projectId);
      
      if (projects.length === filteredProjects.length) {
        throw new Error('Project not found');
      }
      
      await this.writeCollection('projects', filteredProjects);
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  async searchProjects(userId, searchTerm, options = {}) {
    try {
      const projects = await this.readCollection('projects');
      const userProjects = projects.filter(project => project.userId === userId);
      
      const searchResults = userProjects.filter(project => {
        const searchLower = searchTerm.toLowerCase();
        return (
          project.name.toLowerCase().includes(searchLower) ||
          (project.description && project.description.toLowerCase().includes(searchLower)) ||
          (project.tags && project.tags.some(tag => tag.toLowerCase().includes(searchLower)))
        );
      });
      
      // Apply sorting
      if (options.sort) {
        const sortKey = Object.keys(options.sort)[0];
        const sortOrder = options.sort[sortKey];
        searchResults.sort((a, b) => {
          if (sortOrder === -1) {
            return new Date(b[sortKey]) - new Date(a[sortKey]);
          } else {
            return new Date(a[sortKey]) - new Date(b[sortKey]);
          }
        });
      }
      
      return searchResults;
    } catch (error) {
      console.error('Error searching projects:', error);
      return [];
    }
  }
}

// Create singleton instance
const localStorageService = new LocalStorageService();

export default localStorageService;
export { localStorageService };