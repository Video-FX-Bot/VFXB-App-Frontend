const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const crypto = require('crypto');
const { csrfProtection, generateCSRFToken } = require('../middleware/auth');

// Conditionally import User model only if not using local storage
let User = null;
if (process.env.USE_LOCAL_STORAGE !== 'true') {
  User = require('../models/UserSchema');
}

const router = express.Router();

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/auth.log' })
  ]
});

// Rate limiting for authentication endpoints (relaxed for testing)
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 1 * 60 // 1 minute in seconds
  },
  standardHeaders: true,
  legacyHeaders: false
});

// More restrictive rate limiting for login (relaxed for testing)
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 login attempts per windowMs
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: 1 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation middleware
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters')
];

const validateLogin = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email or username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Helper function to generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh', tokenId: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Helper function to get device info
const getDeviceInfo = (req) => {
  return {
    userAgent: req.get('User-Agent') || 'Unknown',
    ip: req.ip || req.connection.remoteAddress || 'Unknown',
    location: req.get('CF-IPCountry') || 'Unknown' // Cloudflare country header
  };
};

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', authLimiter, csrfProtection, validateRegistration, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { email, username, password, firstName, lastName } = req.body;
    
    // Check if using local storage mode
    if (process.env.USE_LOCAL_STORAGE === 'true') {
      const localStorageService = require('../services/localStorageService');
      const bcrypt = require('bcryptjs');
      
      // Check if user already exists
      const users = await localStorageService.getUsers();
      const existingUser = users.find(u => u.email === email || u.username === username);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email or username already exists'
        });
      }
      
      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Create new user
      const userData = {
        email,
        username,
        firstName,
        lastName,
        passwordHash,
        verificationToken: crypto.randomBytes(32).toString('hex'),
        isVerified: false,
        isActive: true,
        roles: ['user'],
        loginAttempts: 0,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const user = await localStorageService.createUser(userData);
      
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user._id);
      
      logger.info('User registered successfully (local storage)', {
        userId: user._id,
        email: user.email,
        username: user.username,
        ip: req.ip
      });
      
      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName} ${user.lastName}`,
            avatar: null,
            roles: user.roles,
            isVerified: user.isVerified
          },
          accessToken
        }
      });
    }
    
    // MongoDB mode
    // Check if user already exists
    const existingUser = await User.findByEmailOrUsername(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }
    
    // Create new user
    const user = new User({
      email,
      username,
      firstName,
      lastName,
      passwordHash: password, // Will be hashed by pre-save middleware
      verificationToken: crypto.randomBytes(32).toString('hex')
    });
    
    await user.save();
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);
    
    // Add refresh token to user
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await user.addRefreshToken(refreshToken, refreshExpiry, getDeviceInfo(req));
    
    logger.info('User registered successfully', {
      userId: user._id,
      email: user.email,
      username: user.username,
      ip: req.ip
    });
    
    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          avatar: user.avatar,
          roles: user.roles,
          isVerified: user.isVerified,
          subscription: user.subscription,
          preferences: user.preferences
        },
        accessToken
      }
    });
    
  } catch (error) {
    logger.error('Registration error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginLimiter, csrfProtection, validateLogin, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { identifier, password } = req.body;
    
    // Check if using local storage mode
    if (process.env.USE_LOCAL_STORAGE === 'true') {
      const localStorageService = require('../services/localStorageService');
      const bcrypt = require('bcryptjs');
      
      // Find user by email or username
      const users = await localStorageService.getUsers();
      const user = users.find(u => u.email === identifier || u.username === identifier);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      // Check if account is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated'
        });
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        logger.warn('Failed login attempt (local storage)', {
          userId: user._id,
          email: user.email,
          ip: req.ip
        });
        
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      // Update last login
      const updatedUser = await localStorageService.updateUser(user._id, {
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Generate new tokens
      const { accessToken, refreshToken } = generateTokens(user._id);
      
      logger.info('User logged in successfully (local storage)', {
        userId: user._id,
        email: user.email,
        ip: req.ip
      });
      
      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName} ${user.lastName}`,
            avatar: null,
            roles: user.roles,
            isVerified: user.isVerified
          },
          accessToken
        }
      });
    }
    
    // MongoDB mode
    // Find user by email or username
    const user = await User.findByEmailOrUsername(identifier);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts'
      });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      
      logger.warn('Failed login attempt', {
        userId: user._id,
        email: user.email,
        ip: req.ip,
        attempts: user.loginAttempts + 1
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }
    
    // Update last login
    user.lastLoginAt = new Date();
    user.analytics.lastActiveAt = new Date();
    await user.save();
    
    // Clean expired refresh tokens
    await user.cleanExpiredTokens();
    
    // Generate new tokens
    const { accessToken, refreshToken } = generateTokens(user._id);
    
    // Add refresh token to user
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await user.addRefreshToken(refreshToken, refreshExpiry, getDeviceInfo(req));
    
    logger.info('User logged in successfully', {
      userId: user._id,
      email: user.email,
      ip: req.ip
    });
    
    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          avatar: user.avatar,
          roles: user.roles,
          isVerified: user.isVerified,
          subscription: user.subscription,
          preferences: user.preferences,
          lastLoginAt: user.lastLoginAt
        },
        accessToken
      }
    });
    
  } catch (error) {
    logger.error('Login error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires refresh token)
 */
router.post('/refresh', csrfProtection, async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided'
      });
    }
    
    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    // Find user and check if refresh token exists
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }
    
    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens.some(rt => rt.token === refreshToken);
    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
      });
    }
    
    // Generate new access token
    const { accessToken } = generateTokens(user._id);
    
    // Update last active time
    user.analytics.lastActiveAt = new Date();
    await user.save();
    
    logger.info('Token refreshed successfully', {
      userId: user._id,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken
      }
    });
    
  } catch (error) {
    logger.error('Token refresh error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during token refresh'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', csrfProtection, async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (refreshToken) {
      // Decode token to get user ID
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (user) {
          // Remove the specific refresh token
          await user.removeRefreshToken(refreshToken);
          
          logger.info('User logged out successfully', {
            userId: user._id,
            ip: req.ip
          });
        }
      } catch (error) {
        // Token might be invalid, but we still want to clear the cookie
        logger.warn('Invalid refresh token during logout', {
          error: error.message,
          ip: req.ip
        });
      }
    }
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
    
  } catch (error) {
    logger.error('Logout error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout'
    });
  }
});

/**
 * @route   GET /api/auth/csrf-token
 * @desc    Get CSRF token
 * @access  Public
 */
router.get('/csrf-token', (req, res) => {
  try {
    const csrfToken = generateCSRFToken();
    res.json({
      success: true,
      csrfToken
    });
  } catch (error) {
    logger.error('CSRF token generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate CSRF token'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', async (req, res) => {
  try {
    // This route will be protected by auth middleware
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const user = await User.findById(userId).select('-passwordHash -refreshTokens');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          avatar: user.avatar,
          bio: user.bio,
          website: user.website,
          location: user.location,
          company: user.company,
          skills: user.skills,
          roles: user.roles,
          isVerified: user.isVerified,
          subscription: user.subscription,
          preferences: user.preferences,
          aiSettings: user.aiSettings,
          analytics: user.analytics,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt
        }
      }
    });
    
  } catch (error) {
    logger.error('Get profile error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;