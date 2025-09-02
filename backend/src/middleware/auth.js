const jwt = require('jsonwebtoken');
const winston = require('winston');

// Conditionally import User model only if not using local storage
let User = null;
if (process.env.USE_LOCAL_STORAGE !== 'true') {
  User = require('../models/UserSchema');
}

// Configure logger
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

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and extracts user information from database
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access token expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid access token',
          code: 'TOKEN_INVALID'
        });
      } else {
        throw error;
      }
    }
    
    // Check token type
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type',
        code: 'TOKEN_INVALID_TYPE'
      });
    }
    
    let user;
    
    if (process.env.USE_LOCAL_STORAGE === 'true') {
      // Local storage mode
      const localStorageService = require('../services/localStorageService');
      const users = await localStorageService.getUsers();
      user = users.find(u => u._id === decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }
      
      // Update last active time
      const updatedUser = await localStorageService.updateUser(user._id, {
        'analytics.lastActiveAt': new Date().toISOString()
      });
      user = updatedUser;
    } else {
      // MongoDB mode
      user = await User.findById(decoded.userId).select('-passwordHash -refreshTokens');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }
      
      // Update last active time
      user.analytics.lastActiveAt = new Date();
      await user.save();
    }
    
    // Attach user to request object
    req.user = {
      id: user._id,
      email: user.email,
      username: user.username,
      roles: user.roles,
      subscription: user.subscription,
      preferences: user.preferences
    };
    
    logger.info('Authentication successful', {
      userId: user._id,
      email: user.email,
      path: req.path
    });
    
    next();
    
  } catch (error) {
    logger.error('Authentication middleware error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional Authentication Middleware
 * Extracts user information if token is present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      req.user = null;
      return next();
    }

    // Try to verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type === 'access') {
        let user;
        
        if (process.env.USE_LOCAL_STORAGE === 'true') {
          // Local storage mode
          const localStorageService = require('../services/localStorageService');
          const users = await localStorageService.getUsers();
          user = users.find(u => u._id === decoded.userId);
        } else {
          // MongoDB mode
          user = await User.findById(decoded.userId).select('-passwordHash -refreshTokens');
        }
        
        if (user && user.isActive) {
          req.user = {
            id: user._id,
            email: user.email,
            username: user.username,
            roles: user.roles,
            subscription: user.subscription,
            preferences: user.preferences
          };
          
          // Update last active time
          user.analytics.lastActiveAt = new Date();
          await user.save();
          
          logger.info('Optional authentication successful', {
            userId: user._id,
            path: req.path
          });
        } else {
          req.user = null;
        }
      } else {
        req.user = null;
      }
    } catch (error) {
      // Invalid or expired token - continue without user
      req.user = null;
      logger.debug('Optional authentication failed', {
        error: error.message,
        ip: req.ip,
        path: req.path
      });
    }
    
    next();
    
  } catch (error) {
    logger.error('Optional auth middleware error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    
    req.user = null;
    next();
  }
};

/**
 * Role-based Authorization Middleware
 * Checks if user has required role
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRoles = req.user.roles || [];
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    // Check if user has any of the required roles
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      logger.warn('Authorization failed: Insufficient permissions', {
        userId: req.user.id,
        userRoles,
        requiredRoles: roles,
        ip: req.ip,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    logger.info('Authorization successful', {
      userId: req.user.id,
      userRoles,
      path: req.path
    });
    
    next();
  };
};

/**
 * Subscription-based Authorization Middleware
 * Checks if user has required subscription plan
 */
const requireSubscription = (requiredPlans) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const userPlan = req.user.subscription?.plan || 'free';
    const plans = Array.isArray(requiredPlans) ? requiredPlans : [requiredPlans];
    
    // Check if user has required subscription
    if (!plans.includes(userPlan)) {
      logger.warn('Subscription access denied:', {
        userId: req.user.id,
        userPlan,
        requiredPlans: plans,
        ip: req.ip,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        message: 'Subscription upgrade required',
        code: 'SUBSCRIPTION_REQUIRED',
        data: {
          currentPlan: userPlan,
          requiredPlans: plans
        }
      });
    }
    
    // Check if subscription is active
    if (req.user.subscription?.status !== 'active' && userPlan !== 'free') {
      return res.status(403).json({
        success: false,
        message: 'Subscription is not active',
        code: 'SUBSCRIPTION_INACTIVE'
      });
    }
    
    next();
  };
};

/**
 * Rate limiting based on user subscription
 * Different limits for different subscription tiers
 */
const subscriptionRateLimit = (limits) => {
  const userRequests = new Map();
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const userId = req.user.id;
    const userPlan = req.user.subscription?.plan || 'free';
    const limit = limits[userPlan] || limits.free || 10;
    
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    
    if (!userRequests.has(userId)) {
      userRequests.set(userId, { count: 0, resetTime: now + windowMs });
    }
    
    const userLimit = userRequests.get(userId);
    
    // Reset if window has passed
    if (now > userLimit.resetTime) {
      userLimit.count = 0;
      userLimit.resetTime = now + windowMs;
    }
    
    // Check if limit exceeded
    if (userLimit.count >= limit) {
      const resetIn = Math.ceil((userLimit.resetTime - now) / 1000);
      
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded for your subscription plan',
        code: 'RATE_LIMIT_EXCEEDED',
        data: {
          limit,
          resetIn,
          currentPlan: userPlan
        }
      });
    }
    
    // Increment counter
    userLimit.count++;
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': limit,
      'X-RateLimit-Remaining': Math.max(0, limit - userLimit.count),
      'X-RateLimit-Reset': Math.ceil(userLimit.resetTime / 1000)
    });
    
    next();
  };
};

/**
 * API Key Authentication Middleware
 * For service-to-service communication
 */
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required'
    });
  }

  // In production, this should check against a database of valid API keys
  const validApiKeys = process.env.VALID_API_KEYS ? process.env.VALID_API_KEYS.split(',') : [];
  
  if (!validApiKeys.includes(apiKey)) {
    logger.warn('API key authentication failed', {
      ip: req.ip,
      path: req.path
    });
    
    return res.status(403).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  logger.info('API key authentication successful', {
    ip: req.ip,
    path: req.path
  });
  
  next();
};

/**
 * Resource Ownership Middleware
 * Ensures user can only access resources they own
 */
const requireOwnership = (resourceIdParam, resourceModel, ownerField = 'ownerId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }
      
      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID required',
          code: 'RESOURCE_ID_REQUIRED'
        });
      }
      
      // Dynamically require the model
      const Model = require(`../models/${resourceModel}`);
      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }
      
      // Check ownership
      const ownerId = resource[ownerField];
      if (ownerId.toString() !== req.user.id.toString()) {
        // Check if user has admin role as fallback
        if (!req.user.roles.includes('admin')) {
          return res.status(403).json({
            success: false,
            message: 'Access denied - you do not own this resource',
            code: 'OWNERSHIP_REQUIRED'
          });
        }
      }
      
      // Attach resource to request for use in route handler
      req.resource = resource;
      
      logger.info('Ownership check passed', {
        userId: req.user.id,
        resourceId,
        resourceType: resourceModel,
        path: req.path
      });
      
      next();
      
    } catch (error) {
      logger.error('Ownership middleware error:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        resourceId: req.params[resourceIdParam],
        ip: req.ip
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error during ownership check',
        code: 'OWNERSHIP_CHECK_ERROR'
      });
    }
  };
};

/**
 * Generate JWT Token
 * Utility function to create JWT tokens
 */
const generateToken = (payload, options = {}) => {
  const defaultOptions = {
    expiresIn: '24h',
    issuer: 'vfxb-app',
    audience: 'vfxb-users'
  };

  const tokenOptions = { ...defaultOptions, ...options };
  
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', tokenOptions);
};

/**
 * Generate Refresh Token
 * Utility function to create refresh tokens
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    {
      expiresIn: '7d',
      issuer: 'vfxb-app',
      audience: 'vfxb-users'
    }
  );
};

/**
 * Verify Refresh Token
 * Utility function to verify refresh tokens
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key');
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

/**
 * CSRF Protection Middleware
 * Basic CSRF protection for state-changing operations
 */
// In-memory store for CSRF tokens (in production, use Redis)
const csrfTokenStore = new Map();
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of csrfTokenStore.entries()) {
    if (now > data.expiresAt) {
      csrfTokenStore.delete(token);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  
  if (!csrfToken) {
    logger.warn('CSRF protection: No token provided', {
      ip: req.ip,
      method: req.method,
      path: req.path
    });
    
    return res.status(403).json({
      success: false,
      error: 'CSRF token required',
      code: 'CSRF_TOKEN_REQUIRED'
    });
  }

  // Check if token exists and is valid
  const tokenData = csrfTokenStore.get(csrfToken);
  if (!tokenData || Date.now() > tokenData.expiresAt) {
    logger.warn('CSRF protection: Invalid or expired token', {
      ip: req.ip,
      method: req.method,
      path: req.path,
      hasToken: !!csrfToken,
      tokenExists: !!tokenData,
      expired: tokenData ? Date.now() > tokenData.expiresAt : false
    });
    
    return res.status(419).json({
      success: false,
      error: 'CSRF token invalid or expired',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  // Token is valid, remove it (single use)
  csrfTokenStore.delete(csrfToken);
  
  logger.debug('CSRF protection: Token validated', {
    ip: req.ip,
    method: req.method,
    path: req.path
  });

  next();
};

// Helper function to generate and store CSRF token
const generateCSRFToken = () => {
  const { v4: uuidv4 } = require('uuid');
  const token = uuidv4();
  const expiresAt = Date.now() + CSRF_TOKEN_EXPIRY;
  
  csrfTokenStore.set(token, {
    createdAt: Date.now(),
    expiresAt
  });
  
  return token;
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireSubscription,
  subscriptionRateLimit,
  authenticateApiKey,
  requireOwnership,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  csrfProtection,
  generateCSRFToken
};