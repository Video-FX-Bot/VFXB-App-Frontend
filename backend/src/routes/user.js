import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { Video } from '../models/Video.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { authenticateToken, requireAdmin, logActivity } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { sendEmail } from '../utils/email.js';
import { validateInput } from '../utils/validation.js';

const router = express.Router();

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each user to 100 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  }
});

const updateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each user to 10 profile updates per hour
  message: {
    success: false,
    message: 'Update limit exceeded. Please try again later.'
  }
});

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', 
  authenticateToken,
  generalLimiter,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id)
        .select('-password -resetPasswordToken -resetPasswordExpires -twoFactorSecret')
        .lean();
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Get user statistics
      const stats = await getUserStats(req.user.id);
      
      res.json({
        success: true,
        data: {
          user: {
            ...user,
            stats
          }
        }
      });
      
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile'
      });
    }
  }
);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', 
  authenticateToken,
  updateLimiter,
  logActivity('profile_update'),
  async (req, res) => {
    try {
      const {
        username,
        email,
        firstName,
        lastName,
        bio,
        avatar,
        timezone,
        language,
        notifications
      } = req.body;
      
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Validate inputs
      if (username !== undefined) {
        const validation = validateInput(username, 'username');
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: validation.message
          });
        }
        
        // Check if username is already taken
        const existingUser = await User.findOne({ 
          username: username.toLowerCase(),
          _id: { $ne: req.user.id }
        });
        
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Username is already taken'
          });
        }
        
        user.username = username.toLowerCase();
      }
      
      if (email !== undefined) {
        const validation = validateInput(email, 'email');
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: validation.message
          });
        }
        
        // Check if email is already taken
        const existingUser = await User.findOne({ 
          email: email.toLowerCase(),
          _id: { $ne: req.user.id }
        });
        
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email is already registered'
          });
        }
        
        // If email changed, mark as unverified
        if (user.email !== email.toLowerCase()) {
          user.email = email.toLowerCase();
          user.isEmailVerified = false;
          user.emailVerificationToken = user.generateVerificationToken();
          
          // Send verification email
          try {
            await sendEmail({
              to: user.email,
              subject: 'Verify Your New Email Address',
              template: 'email-verification',
              data: {
                username: user.username,
                verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${user.emailVerificationToken}`
              }
            });
          } catch (emailError) {
            logger.error('Failed to send verification email:', emailError);
          }
        }
      }
      
      // Update other fields
      if (firstName !== undefined) user.profile.firstName = firstName.trim();
      if (lastName !== undefined) user.profile.lastName = lastName.trim();
      if (bio !== undefined) user.profile.bio = bio.trim();
      if (avatar !== undefined) user.profile.avatar = avatar;
      if (timezone !== undefined) user.preferences.timezone = timezone;
      if (language !== undefined) user.preferences.language = language;
      
      if (notifications !== undefined) {
        user.preferences.notifications = {
          ...user.preferences.notifications,
          ...notifications
        };
      }
      
      user.updatedAt = new Date();
      await user.save();
      
      logger.info(`Profile updated for user ${req.user.id}`);
      
      // Return updated user (without sensitive fields)
      const updatedUser = await User.findById(req.user.id)
        .select('-password -resetPasswordToken -resetPasswordExpires -twoFactorSecret')
        .lean();
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser
        }
      });
      
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }
);

// @route   PUT /api/users/password
// @desc    Change user password
// @access  Private
router.put('/password', 
  authenticateToken,
  updateLimiter,
  logActivity('password_change'),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }
      
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      // Validate new password
      const validation = validateInput(newPassword, 'password');
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: validation.message
        });
      }
      
      // Check if new password is different from current
      const isSamePassword = await user.comparePassword(newPassword);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'New password must be different from current password'
        });
      }
      
      // Update password
      user.password = newPassword;
      user.passwordChangedAt = new Date();
      await user.save();
      
      logger.info(`Password changed for user ${req.user.id}`);
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
      
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  }
);

// @route   GET /api/users/usage
// @desc    Get user usage statistics
// @access  Private
router.get('/usage', 
  authenticateToken,
  generalLimiter,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id)
        .select('usage subscription limits')
        .lean();
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Calculate usage percentages
      const usageWithPercentages = {
        videos: {
          used: user.usage.videos,
          limit: user.limits.maxVideos,
          percentage: user.limits.maxVideos === -1 ? 0 : 
            Math.round((user.usage.videos / user.limits.maxVideos) * 100)
        },
        storage: {
          used: user.usage.storage,
          limit: user.limits.maxStorage,
          percentage: user.limits.maxStorage === -1 ? 0 : 
            Math.round((user.usage.storage / user.limits.maxStorage) * 100)
        },
        aiRequests: {
          used: user.usage.aiRequests,
          limit: user.limits.maxAIRequests,
          percentage: user.limits.maxAIRequests === -1 ? 0 : 
            Math.round((user.usage.aiRequests / user.limits.maxAIRequests) * 100)
        },
        exports: {
          used: user.usage.exports,
          limit: user.limits.maxExports,
          percentage: user.limits.maxExports === -1 ? 0 : 
            Math.round((user.usage.exports / user.limits.maxExports) * 100)
        }
      };
      
      res.json({
        success: true,
        data: {
          usage: usageWithPercentages,
          subscription: user.subscription,
          resetDate: user.usage.resetDate
        }
      });
      
    } catch (error) {
      logger.error('Get usage error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch usage statistics'
      });
    }
  }
);

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', 
  authenticateToken,
  generalLimiter,
  async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Get recent videos
      const recentVideos = await Video.find({
        userId,
        isDeleted: false
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status metadata.duration createdAt thumbnails')
      .lean();
      
      // Get recent chat conversations
      const recentChats = await ChatMessage.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: '$conversationId',
            lastMessage: { $last: '$content' },
            lastActivity: { $max: '$createdAt' },
            messageCount: { $sum: 1 },
            videoId: { $first: '$videoId' }
          }
        },
        { $sort: { lastActivity: -1 } },
        { $limit: 5 }
      ]);
      
      // Get user statistics
      const stats = await getUserStats(userId);
      
      // Get usage information
      const user = await User.findById(userId)
        .select('usage limits subscription')
        .lean();
      
      res.json({
        success: true,
        data: {
          recentVideos,
          recentChats,
          stats,
          usage: user.usage,
          limits: user.limits,
          subscription: user.subscription
        }
      });
      
    } catch (error) {
      logger.error('Get dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data'
      });
    }
  }
);

// @route   POST /api/users/subscription
// @desc    Update user subscription
// @access  Private
router.post('/subscription', 
  authenticateToken,
  updateLimiter,
  logActivity('subscription_update'),
  async (req, res) => {
    try {
      const { plan, paymentMethod, billingCycle = 'monthly' } = req.body;
      
      if (!plan) {
        return res.status(400).json({
          success: false,
          message: 'Subscription plan is required'
        });
      }
      
      const validPlans = ['free', 'basic', 'pro', 'enterprise'];
      if (!validPlans.includes(plan)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subscription plan'
        });
      }
      
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Update subscription
      user.subscription = {
        plan,
        status: 'active',
        startDate: new Date(),
        endDate: plan === 'free' ? null : new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
        billingCycle: plan === 'free' ? null : billingCycle,
        paymentMethod: plan === 'free' ? null : paymentMethod,
        autoRenew: plan !== 'free'
      };
      
      // Update limits based on plan
      user.limits = getSubscriptionLimits(plan);
      
      await user.save();
      
      logger.info(`Subscription updated to ${plan} for user ${req.user.id}`);
      
      res.json({
        success: true,
        message: 'Subscription updated successfully',
        data: {
          subscription: user.subscription,
          limits: user.limits
        }
      });
      
    } catch (error) {
      logger.error('Update subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update subscription'
      });
    }
  }
);

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', 
  authenticateToken,
  updateLimiter,
  logActivity('account_deletion'),
  async (req, res) => {
    try {
      const { password, confirmation } = req.body;
      
      if (!password || confirmation !== 'DELETE') {
        return res.status(400).json({
          success: false,
          message: 'Password and confirmation ("DELETE") are required'
        });
      }
      
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Password is incorrect'
        });
      }
      
      // Mark user as deleted (soft delete)
      user.isDeleted = true;
      user.deletedAt = new Date();
      user.email = `deleted_${Date.now()}_${user.email}`;
      user.username = `deleted_${Date.now()}_${user.username}`;
      
      await user.save();
      
      // Mark user's videos as deleted
      await Video.updateMany(
        { userId: req.user.id },
        { 
          isDeleted: true,
          deletedAt: new Date()
        }
      );
      
      logger.info(`Account deleted for user ${req.user.id}`);
      
      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
      
    } catch (error) {
      logger.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete account'
      });
    }
  }
);

// @route   GET /api/users/admin/users
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get('/admin/users', 
  authenticateToken,
  requireAdmin,
  generalLimiter,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        plan,
        sort = '-createdAt'
      } = req.query;
      
      let query = { isDeleted: false };
      
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { 'profile.firstName': { $regex: search, $options: 'i' } },
          { 'profile.lastName': { $regex: search, $options: 'i' } }
        ];
      }
      
      if (status) query.status = status;
      if (plan) query['subscription.plan'] = plan;
      
      const users = await User.find(query)
        .select('-password -resetPasswordToken -resetPasswordExpires -twoFactorSecret')
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();
      
      const total = await User.countDocuments(query);
      
      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
      
    } catch (error) {
      logger.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }
  }
);

// Helper function to get user statistics
async function getUserStats(userId) {
  try {
    const [videoStats, chatStats] = await Promise.all([
      Video.aggregate([
        { $match: { userId: userId, isDeleted: false } },
        {
          $group: {
            _id: null,
            totalVideos: { $sum: 1 },
            totalDuration: { $sum: '$metadata.duration' },
            totalSize: { $sum: '$fileSize' },
            totalViews: { $sum: '$analytics.views' }
          }
        }
      ]),
      ChatMessage.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            totalConversations: { $addToSet: '$conversationId' },
            totalVideoOperations: {
              $sum: {
                $cond: [{ $ne: ['$videoOperation', null] }, 1, 0]
              }
            }
          }
        }
      ])
    ]);
    
    const videoData = videoStats[0] || {
      totalVideos: 0,
      totalDuration: 0,
      totalSize: 0,
      totalViews: 0
    };
    
    const chatData = chatStats[0] || {
      totalMessages: 0,
      totalConversations: [],
      totalVideoOperations: 0
    };
    
    return {
      videos: {
        total: videoData.totalVideos,
        totalDuration: videoData.totalDuration,
        totalSize: videoData.totalSize,
        totalViews: videoData.totalViews
      },
      chat: {
        totalMessages: chatData.totalMessages,
        totalConversations: chatData.totalConversations.length,
        totalVideoOperations: chatData.totalVideoOperations
      }
    };
    
  } catch (error) {
    logger.error('Get user stats error:', error);
    return {
      videos: { total: 0, totalDuration: 0, totalSize: 0, totalViews: 0 },
      chat: { totalMessages: 0, totalConversations: 0, totalVideoOperations: 0 }
    };
  }
}

// Helper function to get subscription limits
function getSubscriptionLimits(plan) {
  const limits = {
    free: {
      maxVideos: 5,
      maxStorage: 1024 * 1024 * 1024, // 1GB
      maxVideoSize: 100 * 1024 * 1024, // 100MB
      maxVideoDuration: 300, // 5 minutes
      maxAIRequests: 10,
      maxExports: 5,
      maxCollaborators: 0,
      features: ['basic_editing', 'ai_chat']
    },
    basic: {
      maxVideos: 50,
      maxStorage: 10 * 1024 * 1024 * 1024, // 10GB
      maxVideoSize: 500 * 1024 * 1024, // 500MB
      maxVideoDuration: 1800, // 30 minutes
      maxAIRequests: 100,
      maxExports: 50,
      maxCollaborators: 2,
      features: ['basic_editing', 'ai_chat', 'advanced_filters', 'transcription']
    },
    pro: {
      maxVideos: 200,
      maxStorage: 50 * 1024 * 1024 * 1024, // 50GB
      maxVideoSize: 2 * 1024 * 1024 * 1024, // 2GB
      maxVideoDuration: 7200, // 2 hours
      maxAIRequests: 500,
      maxExports: 200,
      maxCollaborators: 10,
      features: ['all_editing', 'ai_chat', 'advanced_filters', 'transcription', 'ai_analysis', 'collaboration']
    },
    enterprise: {
      maxVideos: -1, // unlimited
      maxStorage: -1, // unlimited
      maxVideoSize: -1, // unlimited
      maxVideoDuration: -1, // unlimited
      maxAIRequests: -1, // unlimited
      maxExports: -1, // unlimited
      maxCollaborators: -1, // unlimited
      features: ['all_editing', 'ai_chat', 'advanced_filters', 'transcription', 'ai_analysis', 'collaboration', 'api_access', 'priority_support']
    }
  };
  
  return limits[plan] || limits.free;
}

export default router;