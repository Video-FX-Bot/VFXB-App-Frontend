import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

// Socket authentication middleware
export const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      logger.warn(`Socket connection rejected: No token provided from ${socket.handshake.address}`);
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      logger.warn(`Socket connection rejected: User not found for token from ${socket.handshake.address}`);
      return next(new Error('User not found'));
    }

    if (!user.isActive) {
      logger.warn(`Socket connection rejected: Inactive user ${user.id} from ${socket.handshake.address}`);
      return next(new Error('Account is deactivated'));
    }

    // Attach user to socket
    socket.user = user;
    socket.userId = user.id;
    
    logger.info(`Socket authenticated for user: ${user.username} (${user.id})`);
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }
    
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    
    return next(new Error('Authentication failed'));
  }
};

// Optional socket authentication (doesn't fail if no token)
export const optionalSocketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        socket.user = user;
        socket.userId = user.id;
        logger.info(`Socket optionally authenticated for user: ${user.username} (${user.id})`);
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    logger.warn('Optional socket auth failed:', error.message);
    next();
  }
};

// Check if socket user has required role
export const requireSocketRole = (roles) => {
  return (socket, next) => {
    if (!socket.user) {
      return next(new Error('Authentication required'));
    }

    const userRoles = Array.isArray(socket.user.role) ? socket.user.role : [socket.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    const hasRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      logger.warn(`Socket access denied: User ${socket.user.id} lacks required role(s): ${requiredRoles.join(', ')}`);
      return next(new Error('Insufficient permissions'));
    }
    
    next();
  };
};

// Rate limiting for socket events
const socketRateLimits = new Map();

export const socketRateLimit = (maxEvents = 10, windowMs = 60000) => {
  return (socket, next) => {
    const key = socket.userId || socket.handshake.address;
    const now = Date.now();
    
    if (!socketRateLimits.has(key)) {
      socketRateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const limit = socketRateLimits.get(key);
    
    if (now > limit.resetTime) {
      // Reset the limit
      socketRateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (limit.count >= maxEvents) {
      logger.warn(`Socket rate limit exceeded for ${key}`);
      return next(new Error('Rate limit exceeded'));
    }
    
    limit.count++;
    next();
  };
};

// Clean up old rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, limit] of socketRateLimits.entries()) {
    if (now > limit.resetTime) {
      socketRateLimits.delete(key);
    }
  }
}, 300000); // Clean up every 5 minutes

// Socket connection logger
export const socketLogger = (socket, next) => {
  const userInfo = socket.user ? `${socket.user.username} (${socket.user.id})` : 'Anonymous';
  const address = socket.handshake.address;
  const userAgent = socket.handshake.headers['user-agent'];
  
  logger.info(`Socket connected: ${userInfo} from ${address}`, {
    socketId: socket.id,
    userAgent,
    timestamp: new Date().toISOString()
  });
  
  socket.on('disconnect', (reason) => {
    logger.info(`Socket disconnected: ${userInfo} (${socket.id}) - Reason: ${reason}`);
  });
  
  next();
};