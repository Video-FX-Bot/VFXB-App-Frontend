const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const Project = require('../models/ProjectSchema');
const User = require('../models/UserSchema');
const { authenticateToken, optionalAuth, requireOwnership, csrfProtection } = require('../middleware/auth');
const logger = require('../utils/logger');
const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Project validation rules
const projectValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('stateJson')
    .isObject()
    .withMessage('stateJson must be a valid object')
    .custom((value) => {
      if (!value.timeline || !value.editPlan) {
        throw new Error('stateJson must contain timeline and editPlan');
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['draft', 'in_progress', 'rendering', 'completed', 'archived'])
    .withMessage('Invalid status value'),
  body('visibility')
    .optional()
    .isIn(['private', 'public', 'unlisted'])
    .withMessage('Invalid visibility value')
];

const updateValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('stateJson')
    .optional()
    .isObject()
    .withMessage('stateJson must be a valid object'),
  body('status')
    .optional()
    .isIn(['draft', 'in_progress', 'rendering', 'completed', 'archived'])
    .withMessage('Invalid status value'),
  body('version')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Version must be a positive integer')
];

/**
 * GET /api/projects
 * List user projects with pagination
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category, search, page = 1, limit = 10 } = req.query;
    
    let projects, total;
    
    // Check if using local storage mode
    if (process.env.USE_LOCAL_STORAGE === 'true') {
      const localStorageService = require('../services/localStorageService');
      let allProjects = await localStorageService.getProjects(userId);
      
      // Apply filters
      if (status) {
        allProjects = allProjects.filter(p => p.status === status);
      }
      
      if (category) {
        allProjects = allProjects.filter(p => p.category === category);
      }
      
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        allProjects = allProjects.filter(p => 
          searchRegex.test(p.title) || 
          searchRegex.test(p.description) || 
          (p.tags && p.tags.some(tag => searchRegex.test(tag)))
        );
      }
      
      // Sort by lastAccessedAt
      allProjects.sort((a, b) => 
        new Date(b.lastAccessedAt || b.updatedAt) - new Date(a.lastAccessedAt || a.updatedAt)
      );
      
      // Calculate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      
      total = allProjects.length;
      projects = allProjects.slice(skip, skip + limitNum);
      
      // Remove stateJson from list view
      projects = projects.map(({ stateJson, ...project }) => project);
    } else {
      // Build query filter for MongoDB
      const filter = {
        $or: [
          { ownerId: userId },
          { 'collaborators.userId': userId }
        ]
      };
      
      // Apply additional filters
      if (status) {
        filter.status = status;
      }
      
      if (category) {
        filter.category = category;
      }
      
      if (search) {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
          ]
        });
      }
      
      // Calculate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      
      // Execute query with pagination
      [projects, total] = await Promise.all([
        Project.find(filter)
          .select('-stateJson') // Exclude large stateJson from list view
          .sort({ lastAccessedAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Project.countDocuments(filter)
      ]);
    }
    
    // Calculate pagination info
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
    
    logger.info(`Listed ${projects.length} projects for user ${userId}`);
  } catch (error) {
    logger.error('Error listing projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list projects',
      error: error.message
    });
  }
});

/**
 * GET /api/projects/recent
 * Get recent projects for dashboard
 */
router.get('/recent', optionalAuth, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const userId = req.user?.id || 'user-1';
    
    let projects;
    
    // Check if using local storage mode
    if (process.env.USE_LOCAL_STORAGE === 'true') {
      const localStorageService = require('../services/localStorageService');
      projects = await localStorageService.getRecentProjects(userId, limit);
      
      // If no projects exist, create some mock data
      if (projects.length === 0) {
        const mockProjects = [
          {
            _id: 'mock-1',
            title: 'Summer Vacation Highlights',
            description: 'Family vacation memories from our trip to the mountains',
            status: 'completed',
            visibility: 'private',
            ownerId: userId,
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            updatedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            lastAccessedAt: new Date(Date.now() - 7200000).toISOString()
          },
          {
            _id: 'mock-2',
            title: 'Product Demo Video',
            description: 'Demonstration of our latest product features',
            status: 'draft',
            visibility: 'private',
            ownerId: userId,
            createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            updatedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            lastAccessedAt: new Date(Date.now() - 86400000).toISOString()
          },
          {
            _id: 'mock-3',
            title: 'Wedding Highlights',
            description: 'Beautiful moments from Sarah and John\'s wedding',
            status: 'completed',
            visibility: 'public',
            ownerId: userId,
            createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
            updatedAt: new Date(Date.now() - 259200000).toISOString(),
            lastAccessedAt: new Date(Date.now() - 259200000).toISOString()
          }
        ];
        
        // Save mock projects to local storage
        for (const project of mockProjects) {
          await localStorageService.createProject(project);
        }
        
        projects = mockProjects.slice(0, parseInt(limit));
      }
    } else {
      // Use MongoDB
      projects = await Project.find({
        $or: [
          { ownerId: userId },
          { visibility: 'public' }
        ]
      })
      .sort({ lastAccessedAt: -1 })
      .limit(parseInt(limit))
      .select('title description status visibility createdAt updatedAt lastAccessedAt ownerId');
    }

    res.json({
      success: true,
      data: projects,
      total: projects.length
    });
  } catch (error) {
    logger.error('Error fetching recent projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent projects'
    });
  }
});

/**
 * GET /api/projects/:id
 * Get specific project with full details
 */
router.get('/:id', 
  authenticateToken,
  param('id').isMongoId().withMessage('Invalid project ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const project = await Project.findById(id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check if user has access to this project
      if (!project.hasAccess(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      // Update last accessed time
      project.lastAccessedAt = new Date();
      await project.save();
      
      res.json({
        success: true,
        data: project
      });
      
      logger.info(`Project ${id} accessed by user ${userId}`);
    } catch (error) {
      logger.error('Error fetching project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch project',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', 
  authenticateToken,
  csrfProtection,
  projectValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { title, description, stateJson, category, tags, settings, visibility } = req.body;
      
      // Create new project
      const project = new Project({
        title: title.trim(),
        description: description?.trim() || '',
        ownerId: userId,
        stateJson,
        category: category || 'general',
        tags: tags || [],
        settings: settings || {},
        visibility: visibility || 'private',
        status: 'draft'
      });
      
      // Save to database
      await project.save();
      
      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully'
      });
      
      logger.info(`Project ${project._id} created by user ${userId}`);
    } catch (error) {
      logger.error('Error creating project:', error);
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'A project with this title already exists',
          error: 'Duplicate project title'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create project',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/projects/:id
 * Update an existing project
 */
router.put('/:id', 
  authenticateToken,
  csrfProtection,
  param('id').isMongoId().withMessage('Invalid project ID'),
  updateValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;
      
      const project = await Project.findById(id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check if user has permission to update
      if (!project.hasAccess(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied'
        });
      }
      
      // Handle version conflict detection
      if (updateData.version && updateData.version !== project.version) {
        return res.status(409).json({
          success: false,
          message: 'Version conflict detected. Please refresh and try again.',
          currentVersion: project.version,
          providedVersion: updateData.version
        });
      }
      
      // Update allowed fields
      const allowedFields = ['title', 'description', 'stateJson', 'category', 'tags', 'settings', 'status', 'thumbnailUrl', 'visibility'];
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          project[field] = updateData[field];
        }
      }
      
      // Increment version and update timestamp
      project.version += 1;
      project.updatedAt = new Date();
      
      // Save to database
      await project.save();
      
      res.json({
        success: true,
        data: project,
        message: 'Project updated successfully'
      });
      
      logger.info(`Project ${id} updated by user ${userId} to version ${project.version}`);
    } catch (error) {
      logger.error('Error updating project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update project',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/:id', 
  authenticateToken,
  csrfProtection,
  param('id').isMongoId().withMessage('Invalid project ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const project = await Project.findById(id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check if user has permission to delete (only owner)
      if (project.ownerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the project owner can delete this project'
        });
      }
      
      // Delete project from database
      await Project.findByIdAndDelete(id);
      
      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
      
      logger.info(`Project ${id} deleted by user ${userId}`);
    } catch (error) {
      logger.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete project',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/projects/:id/duplicate
 * Duplicate an existing project
 */
router.post('/:id/duplicate', 
  authenticateToken,
  csrfProtection,
  param('id').isMongoId().withMessage('Invalid project ID'),
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { title } = req.body;
      
      const originalProject = await Project.findById(id);
      
      if (!originalProject) {
        return res.status(404).json({
          success: false,
          message: 'Original project not found'
        });
      }
      
      // Check if user has access to the original project
      if (!originalProject.hasAccess(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to original project'
        });
      }
      
      // Create duplicate project
      const duplicateProject = new Project({
        title: title || `${originalProject.title} (Copy)`,
        description: originalProject.description,
        ownerId: userId,
        stateJson: originalProject.stateJson,
        category: originalProject.category,
        tags: originalProject.tags,
        settings: originalProject.settings,
        visibility: 'private', // Reset to private
        status: 'draft' // Reset status
      });
      
      await duplicateProject.save();
      
      res.status(201).json({
        success: true,
        data: duplicateProject,
        message: 'Project duplicated successfully'
      });
      
      logger.info(`Project ${id} duplicated as ${duplicateProject._id} by user ${userId}`);
    } catch (error) {
      logger.error('Error duplicating project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to duplicate project',
        error: error.message
      });
    }
  }
);



/**
 * POST /api/projects/:id/share
 * Share project with users or generate share link
 */
router.post('/:id/share', 
  authenticateToken,
  csrfProtection,
  param('id').isMongoId().withMessage('Invalid project ID'),
  body('shareType').isIn(['user', 'link']).withMessage('shareType must be "user" or "link"'),
  body('role').optional().isIn(['viewer', 'editor']).withMessage('role must be "viewer" or "editor"'),
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('expiresAt').optional().isISO8601().withMessage('Invalid expiration date'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { shareType, role = 'viewer', email, expiresAt } = req.body;
      
      const project = await Project.findById(id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check if user is owner or has admin permissions
      if (project.ownerId !== userId && !project.hasPermission(userId, 'canInvite')) {
        return res.status(403).json({
          success: false,
          message: 'Only project owner or admins can share projects'
        });
      }
      
      if (shareType === 'user' && email) {
        // Add user as collaborator
        // Note: In a real app, you'd look up the user by email
        const collaboratorId = `user-${Date.now()}`; // Placeholder
        
        project.addCollaborator(collaboratorId, role);
        await project.save();
        
        res.json({
          success: true,
          message: `Project shared with ${email} as ${role}`,
          data: {
            collaborator: {
              email,
              role,
              addedAt: new Date()
            }
          }
        });
      } else if (shareType === 'link') {
        // Generate shareable link
        const shareToken = uuidv4();
        const shareLink = {
          token: shareToken,
          role,
          createdBy: userId,
          createdAt: new Date(),
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
          isActive: true
        };
        
        project.shareLinks = project.shareLinks || [];
        project.shareLinks.push(shareLink);
        await project.save();
        
        res.json({
          success: true,
          message: 'Share link generated successfully',
          data: {
            shareUrl: `${process.env.FRONTEND_URL}/shared/${shareToken}`,
            token: shareToken,
            role,
            expiresAt: shareLink.expiresAt
          }
        });
      }
      
      logger.info(`Project ${id} shared by user ${userId}`);
    } catch (error) {
      logger.error('Error sharing project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to share project',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/projects/shared/:token
 * Access project via share link
 */
router.get('/shared/:token', 
  optionalAuth,
  param('token').isUUID().withMessage('Invalid share token'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token } = req.params;
      
      const project = await Project.findOne({
        'shareLinks.token': token,
        'shareLinks.isActive': true,
        'shareLinks.expiresAt': { $gt: new Date() }
      });
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Share link not found or expired'
        });
      }
      
      const shareLink = project.shareLinks.find(link => link.token === token);
      
      // Return project data based on share permissions
      const projectData = {
        ...project.toObject(),
        sharePermissions: {
          role: shareLink.role,
          canEdit: shareLink.role === 'editor',
          canComment: true,
          canExport: shareLink.role === 'editor'
        }
      };
      
      // Remove sensitive data for shared access
      delete projectData.shareLinks;
      if (shareLink.role === 'viewer') {
        delete projectData.stateJson; // Viewers get read-only access
      }
      
      res.json({
        success: true,
        data: projectData
      });
      
      logger.info(`Project ${project._id} accessed via share link ${token}`);
    } catch (error) {
      logger.error('Error accessing shared project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to access shared project',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/projects/:id/collaborators/:collaboratorId
 * Update collaborator permissions
 */
router.put('/:id/collaborators/:collaboratorId', 
  authenticateToken,
  csrfProtection,
  param('id').isMongoId().withMessage('Invalid project ID'),
  param('collaboratorId').notEmpty().withMessage('Collaborator ID is required'),
  body('role').isIn(['viewer', 'editor', 'admin']).withMessage('Invalid role'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id, collaboratorId } = req.params;
      const userId = req.user.id;
      const { role } = req.body;
      
      const project = await Project.findById(id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions
      if (project.ownerId !== userId && !project.hasPermission(userId, 'canInvite')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update collaborator'
        });
      }
      
      // Update collaborator role
      project.addCollaborator(collaboratorId, role);
      await project.save();
      
      res.json({
        success: true,
        message: 'Collaborator permissions updated successfully'
      });
      
      logger.info(`Collaborator ${collaboratorId} role updated to ${role} in project ${id}`);
    } catch (error) {
      logger.error('Error updating collaborator:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update collaborator',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/projects/:id/collaborators/:collaboratorId
 * Remove collaborator from project
 */
router.delete('/:id/collaborators/:collaboratorId', 
  authenticateToken,
  csrfProtection,
  param('id').isMongoId().withMessage('Invalid project ID'),
  param('collaboratorId').notEmpty().withMessage('Collaborator ID is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id, collaboratorId } = req.params;
      const userId = req.user.id;
      
      const project = await Project.findById(id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions (owner, admin, or self-removal)
      if (project.ownerId !== userId && 
          !project.hasPermission(userId, 'canInvite') && 
          collaboratorId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to remove collaborator'
        });
      }
      
      // Remove collaborator
      project.collaborators = project.collaborators.filter(
        collab => collab.userId !== collaboratorId
      );
      project.updatedAt = new Date();
      await project.save();
      
      res.json({
        success: true,
        message: 'Collaborator removed successfully'
      });
      
      logger.info(`Collaborator ${collaboratorId} removed from project ${id}`);
    } catch (error) {
      logger.error('Error removing collaborator:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove collaborator',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/projects/:id/share-links/:token
 * Revoke share link
 */
router.delete('/:id/share-links/:token', 
  authenticateToken,
  csrfProtection,
  param('id').isMongoId().withMessage('Invalid project ID'),
  param('token').isUUID().withMessage('Invalid share token'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id, token } = req.params;
      const userId = req.user.id;
      
      const project = await Project.findById(id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions
      if (project.ownerId !== userId && !project.hasPermission(userId, 'canInvite')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to revoke share link'
        });
      }
      
      // Deactivate share link
      const shareLink = project.shareLinks?.find(link => link.token === token);
      if (shareLink) {
        shareLink.isActive = false;
        shareLink.revokedAt = new Date();
        shareLink.revokedBy = userId;
        await project.save();
        
        res.json({
          success: true,
          message: 'Share link revoked successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Share link not found'
        });
      }
      
      logger.info(`Share link ${token} revoked for project ${id}`);
    } catch (error) {
      logger.error('Error revoking share link:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to revoke share link',
        error: error.message
      });
    }
  }
);

module.exports = router;