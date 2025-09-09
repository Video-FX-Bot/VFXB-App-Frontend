/**
 * Project Management Hook with Zustand Integration
 * Optimized for performance with selective subscriptions and caching
 */
import { useCallback, useMemo } from 'react';
import { useProjectStore, useCacheStore, projectSelectors } from '../store';
import { projectService } from '../services/projectService';

export const useProjects = () => {
  // Selective subscriptions for optimal performance
  const projects = useProjectStore(projectSelectors.projects);
  const currentProject = useProjectStore(projectSelectors.currentProject);
  const recentProjects = useProjectStore(projectSelectors.recentProjects);
  const filteredProjects = useProjectStore(projectSelectors.filteredProjects);
  
  // Get actions and other state
  const {
    setProjects,
    addProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    templates,
    setTemplates,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filterBy,
    setFilterBy,
    getFilteredProjects,
  } = useProjectStore();
  
  // Cache store for API responses
  const { getCache, setCache, invalidateCache } = useCacheStore();
  
  // Load projects with caching
  const loadProjects = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'projects_list';
    
    if (!forceRefresh) {
      const cached = getCache(cacheKey);
      if (cached) {
        setProjects(cached);
        return cached;
      }
    }
    
    try {
      const projectsData = await projectService.getProjects();
      setProjects(projectsData);
      setCache(cacheKey, projectsData, 10 * 60 * 1000); // Cache for 10 minutes
      return projectsData;
    } catch (error) {
      console.error('Failed to load projects:', error);
      throw error;
    }
  }, [getCache, setCache, setProjects]);
  
  // Load templates with caching
  const loadTemplates = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'project_templates';
    
    if (!forceRefresh) {
      const cached = getCache(cacheKey);
      if (cached) {
        setTemplates(cached);
        return cached;
      }
    }
    
    try {
      const templatesData = await projectService.getTemplates();
      setTemplates(templatesData);
      setCache(cacheKey, templatesData, 30 * 60 * 1000); // Cache for 30 minutes
      return templatesData;
    } catch (error) {
      console.error('Failed to load templates:', error);
      throw error;
    }
  }, [getCache, setCache, setTemplates]);
  
  // Create new project
  const createProject = useCallback(async (projectData) => {
    try {
      const newProject = await projectService.createProject(projectData);
      addProject(newProject);
      
      // Invalidate projects cache
      invalidateCache('projects_list');
      
      return newProject;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }, [addProject, invalidateCache]);
  
  // Create project from template
  const createFromTemplate = useCallback(async (templateId, projectData) => {
    try {
      const newProject = await projectService.createFromTemplate(templateId, projectData);
      addProject(newProject);
      
      // Invalidate projects cache
      invalidateCache('projects_list');
      
      return newProject;
    } catch (error) {
      console.error('Failed to create project from template:', error);
      throw error;
    }
  }, [addProject, invalidateCache]);
  
  // Save project
  const saveProject = useCallback(async (projectId, updates) => {
    try {
      const updatedProject = await projectService.updateProject(projectId, updates);
      updateProject(projectId, updatedProject);
      
      // Invalidate related caches
      invalidateCache('projects_list');
      invalidateCache(`project_${projectId}`);
      
      return updatedProject;
    } catch (error) {
      console.error('Failed to save project:', error);
      throw error;
    }
  }, [updateProject, invalidateCache]);
  
  // Delete project
  const removeProject = useCallback(async (projectId) => {
    try {
      await projectService.deleteProject(projectId);
      deleteProject(projectId);
      
      // Invalidate related caches
      invalidateCache('projects_list');
      invalidateCache(`project_${projectId}`);
      
      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  }, [deleteProject, invalidateCache]);
  
  // Load single project with caching
  const loadProject = useCallback(async (projectId, forceRefresh = false) => {
    const cacheKey = `project_${projectId}`;
    
    if (!forceRefresh) {
      const cached = getCache(cacheKey);
      if (cached) {
        setCurrentProject(cached);
        return cached;
      }
    }
    
    try {
      const project = await projectService.getProject(projectId);
      setCurrentProject(project);
      setCache(cacheKey, project, 5 * 60 * 1000); // Cache for 5 minutes
      return project;
    } catch (error) {
      console.error('Failed to load project:', error);
      throw error;
    }
  }, [getCache, setCache, setCurrentProject]);
  
  // Duplicate project
  const duplicateProject = useCallback(async (projectId, newName) => {
    try {
      const duplicatedProject = await projectService.duplicateProject(projectId, newName);
      addProject(duplicatedProject);
      
      // Invalidate projects cache
      invalidateCache('projects_list');
      
      return duplicatedProject;
    } catch (error) {
      console.error('Failed to duplicate project:', error);
      throw error;
    }
  }, [addProject, invalidateCache]);
  
  // Export project
  const exportProject = useCallback(async (projectId, format = 'json') => {
    try {
      const exportData = await projectService.exportProject(projectId, format);
      return exportData;
    } catch (error) {
      console.error('Failed to export project:', error);
      throw error;
    }
  }, []);
  
  // Import project
  const importProject = useCallback(async (projectData) => {
    try {
      const importedProject = await projectService.importProject(projectData);
      addProject(importedProject);
      
      // Invalidate projects cache
      invalidateCache('projects_list');
      
      return importedProject;
    } catch (error) {
      console.error('Failed to import project:', error);
      throw error;
    }
  }, [addProject, invalidateCache]);
  
  // Search projects
  const searchProjects = useCallback((query) => {
    setSearchQuery(query);
  }, [setSearchQuery]);
  
  // Sort projects
  const sortProjects = useCallback((sortOption) => {
    setSortBy(sortOption);
  }, [setSortBy]);
  
  // Filter projects
  const filterProjects = useCallback((filterOption) => {
    setFilterBy(filterOption);
  }, [setFilterBy]);
  
  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSortBy('updatedAt');
    setFilterBy('all');
  }, [setSearchQuery, setSortBy, setFilterBy]);
  
  // Get project statistics
  const getProjectStats = useMemo(() => {
    const total = projects.length;
    const categories = projects.reduce((acc, project) => {
      acc[project.category] = (acc[project.category] || 0) + 1;
      return acc;
    }, {});
    
    const recentlyModified = projects.filter(project => {
      const lastModified = new Date(project.updatedAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return lastModified > weekAgo;
    }).length;
    
    return {
      total,
      categories,
      recentlyModified,
      templates: templates.length,
    };
  }, [projects, templates]);
  
  // Check if project exists
  const projectExists = useCallback((projectId) => {
    return projects.some(project => project.id === projectId);
  }, [projects]);
  
  // Get project by ID
  const getProjectById = useCallback((projectId) => {
    return projects.find(project => project.id === projectId);
  }, [projects]);
  
  // Get projects by category
  const getProjectsByCategory = useCallback((category) => {
    return projects.filter(project => project.category === category);
  }, [projects]);
  
  // Get recent projects (last 10)
  const getRecentProjects = useCallback(() => {
    return recentProjects.slice(0, 10);
  }, [recentProjects]);
  
  return {
    // State
    projects,
    currentProject,
    recentProjects,
    filteredProjects,
    templates,
    searchQuery,
    sortBy,
    filterBy,
    
    // Actions
    loadProjects,
    loadTemplates,
    createProject,
    createFromTemplate,
    saveProject,
    removeProject,
    loadProject,
    duplicateProject,
    exportProject,
    importProject,
    
    // Filtering and searching
    searchProjects,
    sortProjects,
    filterProjects,
    clearFilters,
    
    // Utilities
    getProjectStats,
    projectExists,
    getProjectById,
    getProjectsByCategory,
    getRecentProjects,
    
    // Current project actions
    setCurrentProject,
  };
};

// Hook for managing project collaboration
export const useProjectCollaboration = (projectId) => {
  const { getCache, setCache, invalidateCache } = useCacheStore();
  
  // Load collaborators
  const loadCollaborators = useCallback(async (forceRefresh = false) => {
    if (!projectId) return [];
    
    const cacheKey = `project_${projectId}_collaborators`;
    
    if (!forceRefresh) {
      const cached = getCache(cacheKey);
      if (cached) return cached;
    }
    
    try {
      const collaborators = await projectService.getCollaborators(projectId);
      setCache(cacheKey, collaborators, 5 * 60 * 1000);
      return collaborators;
    } catch (error) {
      console.error('Failed to load collaborators:', error);
      throw error;
    }
  }, [projectId, getCache, setCache]);
  
  // Add collaborator
  const addCollaborator = useCallback(async (email, role = 'viewer') => {
    if (!projectId) throw new Error('No project ID provided');
    
    try {
      const collaborator = await projectService.addCollaborator(projectId, email, role);
      invalidateCache(`project_${projectId}_collaborators`);
      return collaborator;
    } catch (error) {
      console.error('Failed to add collaborator:', error);
      throw error;
    }
  }, [projectId, invalidateCache]);
  
  // Remove collaborator
  const removeCollaborator = useCallback(async (collaboratorId) => {
    if (!projectId) throw new Error('No project ID provided');
    
    try {
      await projectService.removeCollaborator(projectId, collaboratorId);
      invalidateCache(`project_${projectId}_collaborators`);
      return true;
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
      throw error;
    }
  }, [projectId, invalidateCache]);
  
  // Update collaborator role
  const updateCollaboratorRole = useCallback(async (collaboratorId, newRole) => {
    if (!projectId) throw new Error('No project ID provided');
    
    try {
      const updatedCollaborator = await projectService.updateCollaboratorRole(
        projectId,
        collaboratorId,
        newRole
      );
      invalidateCache(`project_${projectId}_collaborators`);
      return updatedCollaborator;
    } catch (error) {
      console.error('Failed to update collaborator role:', error);
      throw error;
    }
  }, [projectId, invalidateCache]);
  
  return {
    loadCollaborators,
    addCollaborator,
    removeCollaborator,
    updateCollaboratorRole,
  };
};

// Hook for project version management
export const useProjectVersions = (projectId) => {
  const { getCache, setCache, invalidateCache } = useCacheStore();
  
  // Load versions
  const loadVersions = useCallback(async (forceRefresh = false) => {
    if (!projectId) return [];
    
    const cacheKey = `project_${projectId}_versions`;
    
    if (!forceRefresh) {
      const cached = getCache(cacheKey);
      if (cached) return cached;
    }
    
    try {
      const versions = await projectService.getVersions(projectId);
      setCache(cacheKey, versions, 5 * 60 * 1000);
      return versions;
    } catch (error) {
      console.error('Failed to load versions:', error);
      throw error;
    }
  }, [projectId, getCache, setCache]);
  
  // Create version
  const createVersion = useCallback(async (versionData) => {
    if (!projectId) throw new Error('No project ID provided');
    
    try {
      const version = await projectService.createVersion(projectId, versionData);
      invalidateCache(`project_${projectId}_versions`);
      return version;
    } catch (error) {
      console.error('Failed to create version:', error);
      throw error;
    }
  }, [projectId, invalidateCache]);
  
  // Restore version
  const restoreVersion = useCallback(async (versionId) => {
    if (!projectId) throw new Error('No project ID provided');
    
    try {
      const restoredProject = await projectService.restoreVersion(projectId, versionId);
      invalidateCache(`project_${projectId}`);
      invalidateCache(`project_${projectId}_versions`);
      return restoredProject;
    } catch (error) {
      console.error('Failed to restore version:', error);
      throw error;
    }
  }, [projectId, invalidateCache]);
  
  return {
    loadVersions,
    createVersion,
    restoreVersion,
  };
};