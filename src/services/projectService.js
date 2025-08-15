import { authService } from './authService';
import { generateVideoThumbnail, isVideoThumbnailSupported } from '../utils/videoThumbnailGenerator';

class ProjectService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  }

  // Get authentication headers
  getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Handle API response
  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  // Create a new project
  async createProject(projectData) {
    try {
      const response = await fetch(`${this.baseURL}/projects`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(projectData)
      });
      
      const result = await this.handleResponse(response);
      return result.data;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  // Get all projects for the current user
  async getProjects(options = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.page) queryParams.append('page', options.page);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.sort) queryParams.append('sort', options.sort);
      if (options.order) queryParams.append('order', options.order);
      if (options.filter) queryParams.append('filter', JSON.stringify(options.filter));
      
      const response = await fetch(`${this.baseURL}/projects?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      const result = await this.handleResponse(response);
      return result.data;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  // Get recent projects
  async getRecentProjects(limit = 5) {
    try {
      const response = await fetch(`${this.baseURL}/projects/recent?limit=${limit}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      const result = await this.handleResponse(response);
      return result.data;
    } catch (error) {
      console.error('Error fetching recent projects:', error);
      throw error;
    }
  }

  // Get favorite projects
  async getFavoriteProjects() {
    try {
      const response = await fetch(`${this.baseURL}/projects/favorites`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      const result = await this.handleResponse(response);
      return result.data;
    } catch (error) {
      console.error('Error fetching favorite projects:', error);
      throw error;
    }
  }

  // Get a specific project by ID
  async getProject(projectId) {
    try {
      const response = await fetch(`${this.baseURL}/projects/${projectId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      const result = await this.handleResponse(response);
      return result.data;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  }

  // Update a project
  async updateProject(projectId, updateData) {
    try {
      const response = await fetch(`${this.baseURL}/projects/${projectId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateData)
      });
      
      const result = await this.handleResponse(response);
      return result.data;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // Delete a project
  async deleteProject(projectId) {
    try {
      const response = await fetch(`${this.baseURL}/projects/${projectId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      const result = await this.handleResponse(response);
      return result;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  // Toggle project favorite status
  async toggleFavorite(projectId) {
    try {
      const response = await fetch(`${this.baseURL}/projects/${projectId}/favorite`, {
        method: 'PATCH',
        headers: this.getAuthHeaders()
      });
      
      const result = await this.handleResponse(response);
      return result.data;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  }

  // Update project status
  async updateProjectStatus(projectId, status) {
    try {
      const response = await fetch(`${this.baseURL}/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      
      const result = await this.handleResponse(response);
      return result.data;
    } catch (error) {
      console.error('Error updating project status:', error);
      throw error;
    }
  }

  // Duplicate a project
  async duplicateProject(projectId) {
    try {
      const response = await fetch(`${this.baseURL}/projects/${projectId}/duplicate`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      
      const result = await this.handleResponse(response);
      return result.data;
    } catch (error) {
      console.error('Error duplicating project:', error);
      throw error;
    }
  }

  // Search projects
  async searchProjects(searchTerm, options = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', searchTerm);
      
      if (options.sort) queryParams.append('sort', options.sort);
      if (options.order) queryParams.append('order', options.order);
      
      const response = await fetch(`${this.baseURL}/projects/search?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      const result = await this.handleResponse(response);
      return result.data;
    } catch (error) {
      console.error('Error searching projects:', error);
      throw error;
    }
  }

  // Save project with fallback to localStorage
  async saveProject(projectData, fallbackToLocalStorage = true) {
    try {
      // Generate thumbnail if video data is available and no thumbnail exists
      let projectWithThumbnail = { ...projectData };
      
      if (!projectData.thumbnail && projectData.videoData && isVideoThumbnailSupported()) {
        try {
          const videoUrl = projectData.videoData.url || projectData.videoData.src;
          if (videoUrl) {
            console.log('Generating thumbnail for project:', projectData.name);
            const thumbnail = await generateVideoThumbnail(videoUrl, 1, 160, 90);
            projectWithThumbnail.thumbnail = thumbnail;
          }
        } catch (thumbnailError) {
          console.warn('Failed to generate thumbnail:', thumbnailError);
          // Continue without thumbnail
        }
      }
      
      // Try to save to backend first
      if (projectWithThumbnail._id || projectWithThumbnail.id) {
        // Update existing project
        const projectId = projectWithThumbnail._id || projectWithThumbnail.id;
        return await this.updateProject(projectId, projectWithThumbnail);
      } else {
        // Create new project
        return await this.createProject(projectWithThumbnail);
      }
    } catch (error) {
      console.error('Backend save failed:', error);
      
      if (fallbackToLocalStorage) {
        console.log('Falling back to localStorage save');
        return this.saveToLocalStorage(projectData);
      }
      
      throw error;
    }
  }

  // Fallback localStorage save method
  saveToLocalStorage(projectData) {
    try {
      const existingProjects = JSON.parse(localStorage.getItem('vfxb_projects') || '[]');
      
      // Generate ID if not present
      if (!projectData.id && !projectData._id) {
        projectData.id = Date.now();
      }
      
      // Check if project already exists
      const existingProjectIndex = existingProjects.findIndex(p => 
        (p.id === projectData.id || p._id === projectData._id) ||
        (p.video?.name === projectData.video?.name && p.video?.size === projectData.video?.size)
      );
      
      let updatedProjects;
      if (existingProjectIndex !== -1) {
        // Update existing project
        existingProjects[existingProjectIndex] = {
          ...existingProjects[existingProjectIndex],
          ...projectData,
          updatedAt: new Date().toISOString(),
          lastModified: 'Just now'
        };
        updatedProjects = existingProjects;
      } else {
        // Add new project
        const newProject = {
          ...projectData,
          createdAt: projectData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastModified: 'Just now'
        };
        updatedProjects = [newProject, ...existingProjects];
      }
      
      // Save to localStorage
      localStorage.setItem('vfxb_projects', JSON.stringify(updatedProjects));
      
      // Update recent projects
      const recentProjects = updatedProjects.slice(0, 3);
      localStorage.setItem('vfxb_recent_projects', JSON.stringify(recentProjects));
      
      return projectData;
    } catch (error) {
      console.error('localStorage save failed:', error);
      throw error;
    }
  }

  // Load projects with fallback to localStorage
  async loadProjects(fallbackToLocalStorage = true) {
    try {
      // Try to load from backend first
      return await this.getProjects();
    } catch (error) {
      console.error('Backend load failed:', error);
      
      if (fallbackToLocalStorage) {
        console.log('Falling back to localStorage load');
        return this.loadFromLocalStorage();
      }
      
      throw error;
    }
  }

  // Fallback localStorage load method
  loadFromLocalStorage() {
    try {
      const projects = JSON.parse(localStorage.getItem('vfxb_projects') || '[]');
      return projects;
    } catch (error) {
      console.error('localStorage load failed:', error);
      return [];
    }
  }

  // Load recent projects with fallback to localStorage
  async loadRecentProjects(fallbackToLocalStorage = true) {
    try {
      // Try to load from backend first
      return await this.getRecentProjects();
    } catch (error) {
      console.error('Backend recent projects load failed:', error);
      
      if (fallbackToLocalStorage) {
        console.log('Falling back to localStorage for recent projects');
        return this.loadRecentFromLocalStorage();
      }
      
      throw error;
    }
  }

  // Fallback localStorage recent projects load method
  loadRecentFromLocalStorage() {
    try {
      const recentProjects = JSON.parse(localStorage.getItem('vfxb_recent_projects') || '[]');
      return recentProjects;
    } catch (error) {
      console.error('localStorage recent projects load failed:', error);
      return [];
    }
  }
}

// Create singleton instance
const projectService = new ProjectService();

export { projectService };
export default projectService;