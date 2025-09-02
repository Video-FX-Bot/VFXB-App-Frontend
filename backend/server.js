console.log('Server.js starting...');
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
console.log('Dependencies loaded...');

// Import middleware
console.log('Loading middleware...');
const { 
  helmetConfig, 
  corsOptions, 
  generalRateLimit, 
  sanitizeInput, 
  requestLogger, 
  securityHeaders,
  fileUploadSecurity,
  apiVersioning
} = require('./src/middleware/security');
const { authenticateToken, optionalAuth, csrfProtection, generateCSRFToken } = require('./src/middleware/auth');
console.log('Middleware loaded...');

// Import routes
console.log('Loading routes...');
const authRoutes = require('./src/routes/auth');
const usersRoutes = require('./src/routes/users');
const aiRoutes = require('./src/routes/ai');
const projectRoutes = require('./src/routes/projects');
const assetRoutes = require('./src/routes/assets');
const videoRoutes = require('./src/routes/video');

const chatRoutes = require('./src/routes/chat');
console.log('Routes loaded...');

// Import services
console.log('Loading services...');
const openaiService = require('./src/services/openaiService');
const socketService = require('./src/services/socketService');
const JSON2VideoService = require('./src/services/json2videoService');
const CaptionsAiService = require('./src/services/captionsAiService');

const database = require('./src/config/database');
console.log('Services loaded...');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Security middleware (order matters)
app.use(helmetConfig);
app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(generalRateLimit);
app.use(requestLogger);
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(sanitizeInput);
app.use(fileUploadSecurity);
app.use(apiVersioning);

// Project data is now managed in the projects routes

// Initialize services
async function initializeServices() {
  try {
    console.log('Starting service initialization...');
    logger.info('Initializing services...');
    
    // Initialize database connection
    console.log('Connecting to database...');
    await database.connect();
    console.log('Database connected, initializing...');
    await database.initialize();
    console.log('Database initialization complete');
    logger.info('Database initialized successfully');
    
    // Initialize OpenAI service
    console.log('Initializing OpenAI service...');
    await openaiService.initialize();
    console.log('OpenAI service initialization complete');
    logger.info('OpenAI service initialized successfully');
    
    // Initialize JSON2Video service
    console.log('Initializing JSON2Video service...');
    const json2videoService = new JSON2VideoService();
    await json2videoService.initialize();
    console.log('JSON2Video service initialization complete');
    logger.info('JSON2Video service initialized successfully');
    
    // Initialize Captions.ai service
    console.log('Initializing Captions.ai service...');
    const captionsAiService = new CaptionsAiService();
    await captionsAiService.initialize();
    console.log('Captions.ai service initialization complete');
    logger.info('Captions.ai service initialized successfully');
    
    // Initialize Socket.IO service
    console.log('Initializing Socket.IO service...');
    const socketInitialized = socketService.initialize(server);
    if (socketInitialized) {
      console.log('Socket.IO service initialization complete');
      logger.info('Socket.IO service initialized successfully');
    } else {
      throw new Error('Failed to initialize Socket.IO service');
    }
    

    
    // Create logs directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs', { recursive: true });
    }
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Import Runway service
const runwayService = require('./src/services/runwayService');

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const aiHealth = await openaiService.getHealthStatus();
    const runwayHealth = await runwayService.getHealthStatus();
    
    // Get AI services health status
    const json2videoService = new JSON2VideoService();
    const captionsAiService = new CaptionsAiService();
    const json2videoHealth = await json2videoService.getHealthStatus();
    const captionsAiHealth = await captionsAiService.getHealthStatus();
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: database.getStatus(),
        ai: aiHealth,
        runway: runwayHealth,
        json2video: json2videoHealth,
        captionsAi: captionsAiHealth
      },
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Service health check failed'
    });
  }
});

// CSRF Token endpoint
app.get('/api/csrf-token', (req, res) => {
  try {
    const csrfToken = generateCSRFToken();
    res.json({ 
      success: true,
      csrfToken,
      expiresIn: 3600 // 1 hour in seconds
    });
  } catch (error) {
    logger.error('Error generating CSRF token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate CSRF token'
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/runway', require('./src/routes/runway'));

app.use('/api/chat', chatRoutes);

// Project endpoints are now handled by /src/routes/projects.js

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access'
    });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large'
    });
  }
  
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.stack : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found:', req.originalUrl);
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await database.disconnect();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    server.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT}`);
      logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🤖 AI API available at http://localhost:${PORT}/api/v1/ai`);

      logger.info(`🔌 Socket.IO available at http://localhost:${PORT}/socket.io/`);
      logger.info(`👥 Connected users: ${socketService.getConnectedUsersCount()}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;