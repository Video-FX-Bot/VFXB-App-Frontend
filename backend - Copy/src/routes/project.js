import express from 'express';
import Project from '../models/Project.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// GET /api/projects - Get all projects for authenticated user
router.get('/', auth.authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'updatedAt', order = 'desc', filter } = req.query;
    
    const options = {
      sort: { [sort]: order === 'desc' ? -1 : 1 },
      limit: parseInt(limit)
    };
    
    if (filter) {
      options.filter = JSON.parse(filter);
    }
    
    const projects = await Project.findByUserId(req.user.id, options);
    
    res.json({
      success: true,
      data: projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: projects.length
      }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message
    });
  }
});

// GET /api/projects/recent - Get recent projects for authenticated user
router.get('/recent', auth.authenticateToken, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const options = {
      sort: { updatedAt: -1 },
      limit: parseInt(limit)
    };
    
    const projects = await Project.findByUserId(req.user.id, options);
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Error fetching recent projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent projects',
      error: error.message
    });
  }
});

// GET /api/projects/favorites - Get favorite projects for authenticated user
router.get('/favorites', auth.authenticateToken, async (req, res) => {
  try {
    const options = {
      filter: { isFavorite: true },
      sort: { updatedAt: -1 }
    };
    
    const projects = await Project.findByUserId(req.user.id, options);
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Error fetching favorite projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorite projects',
      error: error.message
    });
  }
});

// GET /api/projects/search - Search projects
router.get('/search', auth.authenticateToken, async (req, res) => {
  try {
    const { q: searchTerm, sort = 'updatedAt', order = 'desc' } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }
    
    const options = {
      sort: { [sort]: order === 'desc' ? -1 : 1 }
    };
    
    const projects = await Project.search(req.user.id, searchTerm, options);
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Error searching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search projects',
      error: error.message
    });
  }
});

// GET /api/projects/:id - Get specific project
router.get('/:id', auth.authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check if user owns the project
    if (project.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project',
      error: error.message
    });
  }
});

// POST /api/projects - Create new project
router.post('/', auth.authenticateToken, async (req, res) => {
  try {
    const projectData = {
      ...req.body,
      userId: req.user.id
    };
    
    const project = await Project.create(projectData);
    
    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error.message
    });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', auth.authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check if user owns the project
    if (project.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const updatedProject = await Project.updateById(req.params.id, req.body);
    
    res.json({
      success: true,
      data: updatedProject,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: error.message
    });
  }
});

// PATCH /api/projects/:id/favorite - Toggle project favorite status
router.patch('/:id/favorite', auth.authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check if user owns the project
    if (project.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const updatedProject = await project.toggleFavorite();
    
    res.json({
      success: true,
      data: updatedProject,
      message: `Project ${updatedProject.isFavorite ? 'added to' : 'removed from'} favorites`
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle favorite',
      error: error.message
    });
  }
});

// PATCH /api/projects/:id/status - Update project status
router.patch('/:id/status', auth.authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check if user owns the project
    if (project.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const updatedProject = await project.updateStatus(status);
    
    res.json({
      success: true,
      data: updatedProject,
      message: 'Project status updated successfully'
    });
  } catch (error) {
    console.error('Error updating project status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project status',
      error: error.message
    });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', auth.authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check if user owns the project
    if (project.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await Project.deleteById(req.params.id);
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project',
      error: error.message
    });
  }
});

// POST /api/projects/:id/duplicate - Duplicate project
router.post('/:id/duplicate', auth.authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check if user owns the project
    if (project.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Create duplicate project data
    const duplicateData = {
      ...project.toObject(),
      name: `${project.name} (Copy)`,
      userId: req.user.id
    };
    
    // Remove the original ID and timestamps
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    
    const duplicatedProject = await Project.create(duplicateData);
    
    res.status(201).json({
      success: true,
      data: duplicatedProject,
      message: 'Project duplicated successfully'
    });
  } catch (error) {
    console.error('Error duplicating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate project',
      error: error.message
    });
  }
});

export default router;