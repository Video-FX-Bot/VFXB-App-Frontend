const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const Asset = require('../models/AssetSchema');
const Project = require('../models/ProjectSchema');
const { authenticateToken, csrfProtection } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');
const winston = require('winston');

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'assets');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'video': ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'],
    'audio': ['audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/flac'],
    'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    'document': ['application/pdf', 'text/plain', 'application/json']
  };
  
  const allAllowedTypes = Object.values(allowedTypes).flat();
  
  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
    files: 10 // Maximum 10 files per request
  }
});

// Helper function to determine asset type from mime type
const getAssetType = (mimeType) => {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('json')) return 'document';
  return 'other';
};

/**
 * POST /api/assets/upload
 * Upload assets for a project
 */
router.post('/upload',
  authenticateToken,
  csrfProtection,
  upload.array('files', 10),
  body('projectId').isMongoId().withMessage('Invalid project ID'),
  body('category').optional().isIn(['source', 'preview', 'thumbnail', 'export', 'temp']).withMessage('Invalid category'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId, category = 'source' } = req.body;
      const userId = req.user.id;
      const files = req.files;
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }
      
      // Verify project exists and user has access
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      if (!project.canEdit(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied'
        });
      }
      
      // Create asset records
      const assets = [];
      
      for (const file of files) {
        const asset = new Asset({
          projectId,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          assetType: getAssetType(file.mimetype),
          category,
          storageProvider: 'local',
          storagePath: file.path,
          uploadedBy: userId,
          processingStatus: 'pending'
        });
        
        await asset.save();
        assets.push(asset);
      }
      
      res.status(201).json({
        success: true,
        data: assets,
        message: `${assets.length} asset(s) uploaded successfully`
      });
      
      logger.info(`${assets.length} assets uploaded for project ${projectId} by user ${userId}`);
      
      // TODO: Trigger background processing for video/audio files
      
    } catch (error) {
      logger.error('Error uploading assets:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload assets',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/assets/project/:projectId
 * Get all assets for a project
 */
router.get('/project/:projectId',
  authenticateToken,
  param('projectId').isMongoId().withMessage('Invalid project ID'),
  query('assetType').optional().isIn(['video', 'audio', 'image', 'document', 'other']).withMessage('Invalid asset type'),
  query('category').optional().isIn(['source', 'preview', 'thumbnail', 'export', 'temp']).withMessage('Invalid category'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { assetType, category, limit } = req.query;
      const userId = req.user.id;
      
      // Verify project exists and user has access
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      if (!project.hasAccess(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      // Get assets
      const assets = await Asset.findByProject(projectId, {
        assetType,
        category,
        limit: parseInt(limit) || 50
      });
      
      res.json({
        success: true,
        data: assets
      });
      
    } catch (error) {
      logger.error('Error fetching project assets:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch assets',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/assets/:id/download
 * Download or stream an asset
 */
router.get('/:id/download',
  authenticateToken,
  param('id').isMongoId().withMessage('Invalid asset ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const asset = await Asset.findById(id).populate('projectId');
      if (!asset) {
        return res.status(404).json({
          success: false,
          message: 'Asset not found'
        });
      }
      
      // Check project access
      if (!asset.projectId.hasAccess(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      // Check if file exists
      try {
        await fs.access(asset.storagePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'File not found on storage'
        });
      }
      
      // Set appropriate headers
      res.setHeader('Content-Type', asset.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${asset.originalName}"`);
      
      // Stream the file
      const fileStream = require('fs').createReadStream(asset.storagePath);
      fileStream.pipe(res);
      
      logger.info(`Asset ${id} downloaded by user ${userId}`);
      
    } catch (error) {
      logger.error('Error downloading asset:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download asset',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/assets/:id
 * Delete an asset
 */
router.delete('/:id',
  authenticateToken,
  csrfProtection,
  param('id').isMongoId().withMessage('Invalid asset ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const asset = await Asset.findById(id).populate('projectId');
      if (!asset) {
        return res.status(404).json({
          success: false,
          message: 'Asset not found'
        });
      }
      
      // Check if user can edit the project
      if (!asset.projectId.canEdit(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied'
        });
      }
      
      // Delete file from storage
      try {
        await fs.unlink(asset.storagePath);
      } catch (error) {
        logger.warn(`Failed to delete file from storage: ${asset.storagePath}`, error);
      }
      
      // Delete asset record
      await Asset.findByIdAndDelete(id);
      
      res.json({
        success: true,
        message: 'Asset deleted successfully'
      });
      
      logger.info(`Asset ${id} deleted by user ${userId}`);
      
    } catch (error) {
      logger.error('Error deleting asset:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete asset',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/assets/project/:projectId/usage
 * Get storage usage statistics for a project
 */
router.get('/project/:projectId/usage',
  authenticateToken,
  param('projectId').isMongoId().withMessage('Invalid project ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      
      // Verify project exists and user has access
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      if (!project.hasAccess(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      // Get usage statistics
      const usage = await Asset.getProjectStorageUsage(projectId);
      
      const totalUsage = usage.reduce((total, item) => {
        return {
          totalSize: total.totalSize + item.totalSize,
          totalCount: total.totalCount + item.count
        };
      }, { totalSize: 0, totalCount: 0 });
      
      res.json({
        success: true,
        data: {
          byType: usage,
          total: totalUsage
        }
      });
      
    } catch (error) {
      logger.error('Error fetching storage usage:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch storage usage',
        error: error.message
      });
    }
  }
);

module.exports = router;