const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Local Storage Service
 * Handles file-based storage when USE_LOCAL_STORAGE=true
 */
class LocalStorageService {
  constructor() {
    this.dataPath = process.env.DATA_PATH || './data';
    this.projectsFile = path.join(this.dataPath, 'projects.json');
    this.usersFile = path.join(this.dataPath, 'users.json');
    this.init();
  }

  async init() {
    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataPath, { recursive: true });
      
      // Initialize files if they don't exist
      await this.ensureFileExists(this.projectsFile, []);
      await this.ensureFileExists(this.usersFile, []);
    } catch (error) {
      console.error('Failed to initialize local storage:', error);
    }
  }

  async ensureFileExists(filePath, defaultData) {
    try {
      await fs.access(filePath);
    } catch (error) {
      // File doesn't exist, create it
      await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
    }
  }

  async readFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error);
      return [];
    }
  }

  async writeFile(filePath, data) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Failed to write file ${filePath}:`, error);
      return false;
    }
  }

  // Project methods
  async getProjects(userId = null) {
    const projects = await this.readFile(this.projectsFile);
    if (userId) {
      return projects.filter(p => p.ownerId === userId || p.visibility === 'public');
    }
    return projects;
  }

  async getRecentProjects(userId = null, limit = 5) {
    const projects = await this.getProjects(userId);
    return projects
      .sort((a, b) => new Date(b.lastAccessedAt || b.updatedAt) - new Date(a.lastAccessedAt || a.updatedAt))
      .slice(0, parseInt(limit));
  }

  async getProject(projectId) {
    const projects = await this.readFile(this.projectsFile);
    return projects.find(p => p._id === projectId || p.id === projectId);
  }

  async createProject(projectData) {
    const projects = await this.readFile(this.projectsFile);
    
    const newProject = {
      _id: uuidv4(),
      ...projectData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString()
    };
    
    projects.unshift(newProject);
    await this.writeFile(this.projectsFile, projects);
    
    return newProject;
  }

  async updateProject(projectId, updateData) {
    const projects = await this.readFile(this.projectsFile);
    const projectIndex = projects.findIndex(p => p._id === projectId || p.id === projectId);
    
    if (projectIndex === -1) {
      throw new Error('Project not found');
    }
    
    projects[projectIndex] = {
      ...projects[projectIndex],
      ...updateData,
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString()
    };
    
    await this.writeFile(this.projectsFile, projects);
    return projects[projectIndex];
  }

  async deleteProject(projectId) {
    const projects = await this.readFile(this.projectsFile);
    const filteredProjects = projects.filter(p => p._id !== projectId && p.id !== projectId);
    
    if (filteredProjects.length === projects.length) {
      throw new Error('Project not found');
    }
    
    await this.writeFile(this.projectsFile, filteredProjects);
    return true;
  }

  // User methods
  async getUsers() {
    return await this.readFile(this.usersFile);
  }

  async getUser(userId) {
    const users = await this.readFile(this.usersFile);
    return users.find(u => u._id === userId || u.id === userId);
  }

  async createUser(userData) {
    const users = await this.readFile(this.usersFile);
    
    const newUser = {
      _id: uuidv4(),
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    users.push(newUser);
    await this.writeFile(this.usersFile, users);
    
    return newUser;
  }

  async updateUser(userId, updateData) {
    const users = await this.readFile(this.usersFile);
    const userIndex = users.findIndex(u => u._id === userId || u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    users[userIndex] = {
      ...users[userIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await this.writeFile(this.usersFile, users);
    return users[userIndex];
  }

  async deleteUser(userId) {
    const users = await this.readFile(this.usersFile);
    const filteredUsers = users.filter(u => u._id !== userId && u.id !== userId);
    
    if (filteredUsers.length === users.length) {
      throw new Error('User not found');
    }
    
    await this.writeFile(this.usersFile, filteredUsers);
    return true;
  }

  // Generic data methods
  async getData(key) {
    const filePath = path.join(this.dataPath, `${key}.json`);
    try {
      // Ensure file exists first
      await this.ensureFileExists(filePath, []);
      const data = await this.readFile(filePath);
      return data;
    } catch (error) {
      console.error(`Failed to get data for key ${key}:`, error);
      return [];
    }
  }

  async saveData(key, data) {
    const filePath = path.join(this.dataPath, `${key}.json`);
    try {
      await this.writeFile(filePath, data);
      return true;
    } catch (error) {
      console.error(`Failed to save data for key ${key}:`, error);
      return false;
    }
  }

  // Utility methods
  async clearAllData() {
    await this.writeFile(this.projectsFile, []);
    await this.writeFile(this.usersFile, []);
    return true;
  }

  async getStats() {
    const projects = await this.readFile(this.projectsFile);
    const users = await this.readFile(this.usersFile);
    
    return {
      totalProjects: projects.length,
      totalUsers: users.length,
      lastUpdated: new Date().toISOString()
    };
  }
}

// Create singleton instance
const localStorageService = new LocalStorageService();

module.exports = localStorageService;