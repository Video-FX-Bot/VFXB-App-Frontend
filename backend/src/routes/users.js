const express = require('express');
const { body, param, validationResult } = require('express-validator');
const User = require('../models/UserSchema');
const { authenticateToken, requireRole, requireSubscription, csrfProtection } = require('../middleware/auth');
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

/**
 * GET /api/users/profile
 * Get current user profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-passwordHash -refreshTokens -loginAttempts -lockedUntil');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put('/profile', 
  authenticateToken,
  csrfProtection,
  [
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
    body('username').optional().trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
    body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
    body('website').optional().isURL().withMessage('Invalid website URL'),
    body('location').optional().trim().isLength({ max: 100 }).withMessage('Location must be less than 100 characters'),
    body('company').optional().trim().isLength({ max: 100 }).withMessage('Company must be less than 100 characters'),
    body('skills').optional().isArray().withMessage('Skills must be an array'),
    body('skills.*').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Each skill must be 1-50 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const updateData = req.body;
      
      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updateData.email;
      delete updateData.passwordHash;
      delete updateData.role;
      delete updateData.subscription;
      delete updateData.refreshTokens;
      
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          ...updateData,
          updatedAt: new Date()
        },
        { 
          new: true,
          runValidators: true,
          select: '-passwordHash -refreshTokens -loginAttempts -lockedUntil'
        }
      );
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully'
      });
      
      logger.info(`User profile updated: ${userId}`);
    } catch (error) {
      logger.error('Error updating user profile:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Username already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/users/preferences
 * Update user preferences
 */
router.put('/preferences',
  authenticateToken,
  csrfProtection,
  [
    body('theme').optional().isIn(['light', 'dark', 'system']).withMessage('Invalid theme'),
    body('language').optional().isIn(['en', 'es', 'fr', 'de', 'zh']).withMessage('Invalid language'),
    body('timezone').optional().isString().withMessage('Invalid timezone'),
    body('notifications').optional().isObject().withMessage('Notifications must be an object'),
    body('editor').optional().isObject().withMessage('Editor preferences must be an object'),
    body('privacy').optional().isObject().withMessage('Privacy settings must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { theme, language, timezone, notifications, editor, privacy } = req.body;
      
      const updateData = {};
      if (theme) updateData['preferences.theme'] = theme;
      if (language) updateData['preferences.language'] = language;
      if (timezone) updateData['preferences.timezone'] = timezone;
      if (notifications) updateData['preferences.notifications'] = notifications;
      if (editor) updateData['preferences.editor'] = editor;
      if (privacy) updateData['preferences.privacy'] = privacy;
      
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        },
        { 
          new: true,
          select: 'preferences'
        }
      );
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: user.preferences,
        message: 'Preferences updated successfully'
      });
      
      logger.info(`User preferences updated: ${userId}`);
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update preferences',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/users
 * List users (admin only)
 */
router.get('/',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, search, role, status } = req.query;
      
      // Build query filter
      const filter = {};
      
      if (search) {
        filter.$or = [
          { email: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (role) {
        filter.role = role;
      }
      
      if (status === 'active') {
        filter.isActive = true;
      } else if (status === 'inactive') {
        filter.isActive = false;
      }
      
      // Calculate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      
      // Execute query with pagination
      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-passwordHash -refreshTokens -loginAttempts')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        User.countDocuments(filter)
      ]);
      
      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
      
      logger.info(`Listed ${users.length} users for admin ${req.user.id}`);
    } catch (error) {
      logger.error('Error listing users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list users',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/users/:id/role
 * Update user role (admin only)
 */
router.put('/:id/role',
  authenticateToken,
  requireRole('admin'),
  csrfProtection,
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('role').isIn(['user', 'admin', 'moderator']).withMessage('Invalid role')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      // Prevent self-role modification
      if (id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify your own role'
        });
      }
      
      const user = await User.findByIdAndUpdate(
        id,
        { 
          role,
          updatedAt: new Date()
        },
        { 
          new: true,
          select: '-passwordHash -refreshTokens -loginAttempts -lockedUntil'
        }
      );
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: user,
        message: `User role updated to ${role}`
      });
      
      logger.info(`User ${id} role updated to ${role} by admin ${req.user.id}`);
    } catch (error) {
      logger.error('Error updating user role:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user role',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/users/:id/status
 * Update user status (admin only)
 */
router.put('/:id/status',
  authenticateToken,
  requireRole('admin'),
  csrfProtection,
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('isActive').isBoolean().withMessage('Status must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      // Prevent self-status modification
      if (id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify your own status'
        });
      }
      
      const user = await User.findByIdAndUpdate(
        id,
        { 
          isActive,
          updatedAt: new Date()
        },
        { 
          new: true,
          select: '-passwordHash -refreshTokens -loginAttempts -lockedUntil'
        }
      );
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: user,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
      });
      
      logger.info(`User ${id} ${isActive ? 'activated' : 'deactivated'} by admin ${req.user.id}`);
    } catch (error) {
      logger.error('Error updating user status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  csrfProtection,
  [
    param('id').isMongoId().withMessage('Invalid user ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent self-deletion
      if (id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }
      
      const user = await User.findByIdAndDelete(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
      
      logger.info(`User ${id} deleted by admin ${req.user.id}`);
    } catch (error) {
      logger.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message
      });
    }
  }
);

module.exports = router;