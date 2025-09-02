const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/security.log' })
  ]
});

/**
 * Enhanced Helmet Configuration
 * Comprehensive security headers
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.openai.com'],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Disable for file uploads
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

/**
 * CORS Configuration
 * Configure Cross-Origin Resource Sharing
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:4000',
      'http://localhost:4001',
      'https://vfxb-app.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin, ip: origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-CSRF-Token',
    'X-Client-Version'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  maxAge: 86400 // 24 hours
};

/**
 * General Rate Limiting
 * Protect against brute force attacks
 */
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Strict Rate Limiting for Authentication
 * Protect login/signup endpoints
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Input Sanitization Middleware
 * Clean and validate input data
 */
const sanitizeInput = (req, res, next) => {
  // Recursively sanitize object properties
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Basic XSS prevention
        sanitized[key] = value
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim();
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  };
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

/**
 * Request Logging Middleware
 * Log all incoming requests for security monitoring
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    timestamp: new Date().toISOString()
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
};

/**
 * Security Headers Middleware
 * Add additional security headers
 */
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Server information hiding
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * File Upload Security
 * Validate and secure file uploads
 */
const fileUploadSecurity = (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }
  
  const validateFile = (file) => {
    // Check file size (25MB limit)
    if (file.size > 25 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 25MB.');
    }
    
    // Check file type
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/wav',
      'audio/mp3',
      'audio/mp4',
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} not allowed.`);
    }
    
    // Check for malicious file names
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      throw new Error('Invalid file name.');
    }
  };
  
  try {
    if (req.file) {
      validateFile(req.file);
    }
    
    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach(validateFile);
      } else {
        Object.values(req.files).forEach(fileArray => {
          if (Array.isArray(fileArray)) {
            fileArray.forEach(validateFile);
          } else {
            validateFile(fileArray);
          }
        });
      }
    }
    
    logger.info('File upload security check passed', {
      fileCount: req.files ? (Array.isArray(req.files) ? req.files.length : Object.keys(req.files).length) : (req.file ? 1 : 0),
      ip: req.ip
    });
    
    next();
  } catch (error) {
    logger.warn('File upload security check failed', {
      error: error.message,
      ip: req.ip
    });
    
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * API Version Middleware
 * Ensure API version compatibility
 */
const apiVersioning = (req, res, next) => {
  const clientVersion = req.headers['x-client-version'];
  const supportedVersions = ['1.0', '1.1'];
  
  if (clientVersion && !supportedVersions.includes(clientVersion)) {
    logger.warn('Unsupported client version', {
      clientVersion,
      supportedVersions,
      ip: req.ip
    });
    
    return res.status(400).json({
      success: false,
      error: 'Unsupported client version',
      supportedVersions
    });
  }
  
  next();
};

module.exports = {
  helmetConfig,
  corsOptions,
  generalRateLimit,
  authRateLimit,
  sanitizeInput,
  requestLogger,
  securityHeaders,
  fileUploadSecurity,
  apiVersioning
};