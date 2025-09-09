import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import utilities
import { logger } from './utils/logger.js';
import { sendEmail } from './utils/email.js';

// Import middleware
import { authenticateToken, socketAuth, optionalAuth } from './middleware/auth.js';

// Import routes
import authRoutes from './routes/auth.js';
import videoRoutes from './routes/video.js';
import videoEditRoutes from './routes/videoEdit.js';
import aiRoutes from './routes/ai.js';
import userRoutes from './routes/user.js';
import projectRoutes from './routes/project.js';

// Import models
import User from './models/User.js';
import Video from './models/Video.js';
import ChatMessage from './models/ChatMessage.js';

// Import services
import AIService from './services/aiService.js';
import { VideoProcessor } from './services/videoProcessor.js';
import { TranscriptionService } from './services/transcriptionService.js';

// Load environment variables
dotenv.config();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // Limit each IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and static files
    return req.path === '/health' || req.path.startsWith('/static/');
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:"],
      mediaSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false // Needed for video processing
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}));

// Compression middleware
app.use(compression({
  filter: (req, res) => {
    // Don't compress video files
    if (req.headers['content-type']?.includes('video/')) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024 // Only compress files larger than 1KB
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply global rate limiting
app.use(globalLimiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logHTTPRequest({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id
    });
  });
  
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check AI service
    const aiService = new AIService();
    const aiStatus = await aiService.healthCheck?.() || { status: 'unknown' };
    
    // Check video processor
    const videoProcessor = new VideoProcessor();
    const videoStatus = await videoProcessor.healthCheck?.() || { status: 'unknown' };
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: dbStatus,
        ai: aiStatus.status,
        videoProcessor: videoStatus.status
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(200).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/video-edit', videoEditRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Socket.IO authentication middleware
io.use(socketAuth);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('User connected via WebSocket:', {
    userId: socket.user?.id,
    socketId: socket.id
  });
  
  // Join user to their personal room
  if (socket.user) {
    socket.join(`user_${socket.user.id}`);
  }
  
  // Handle video processing status updates
  socket.on('subscribe_video_processing', (videoId) => {
    if (socket.user) {
      socket.join(`video_${videoId}`);
      logger.info('User subscribed to video processing updates:', {
        userId: socket.user.id,
        videoId
      });
    }
  });
  
  // Handle AI chat messages
  socket.on('ai_chat_message', async (data) => {
    try {
      const { message, conversationId, videoId } = data;
      
      if (!socket.user) {
        socket.emit('ai_chat_error', { error: 'Authentication required' });
        return;
      }
      
      // Validate input
      if (!message || message.trim().length === 0) {
        socket.emit('ai_chat_error', { error: 'Message is required' });
        return;
      }
      
      if (message.length > 2000) {
        socket.emit('ai_chat_error', { error: 'Message too long' });
        return;
      }
      
      // Process message with AI service
      const aiService = new AIService();
      const context = {
        userId: socket.user.id,
        videoId,
        conversationId
      };
      
      const response = await aiService.processChatMessage(message, context);
      
      // Save messages to database
      const userMessage = new ChatMessage({
        conversationId,
        userId: socket.user.id,
        content: message,
        type: 'user',
        videoId
      });
      
      const aiMessage = new ChatMessage({
        conversationId,
        userId: socket.user.id,
        content: response.message,
        type: 'ai',
        videoId,
        aiProcessing: {
          model: response.model || 'gpt-4-turbo-preview',
          processingTime: response.processingTime || 0,
          confidence: response.confidence || 0.8,
          intent: response.intent
        }
      });
      
      await Promise.all([userMessage.save(), aiMessage.save()]);
      
      // Emit response to user
      socket.emit('ai_chat_response', {
        userMessage: userMessage.toObject(),
        aiMessage: aiMessage.toObject(),
        operationResult: response.operationResult
      });
      
      // Log AI interaction
      logger.logAIInteraction({
        userId: socket.user.id,
        conversationId,
        messageLength: message.length,
        responseLength: response.message.length,
        intent: response.intent?.action,
        success: true
      });
      
    } catch (error) {
      logger.error('AI chat error:', {
        userId: socket.user?.id,
        error: error.message,
        data
      });
      
      socket.emit('ai_chat_error', {
        error: 'Failed to process message. Please try again.'
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    logger.info('User disconnected from WebSocket:', {
      userId: socket.user?.id,
      socketId: socket.id,
      reason
    });
  });
  
  // Handle errors
  socket.on('error', (error) => {
    logger.error('Socket error:', {
      userId: socket.user?.id,
      socketId: socket.id,
      error: error.message
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip
  });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: isDevelopment ? err.errors : undefined
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format'
    });
  }
  
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Resource already exists'
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    stack: isDevelopment ? err.stack : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vfxb_app';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0
    });
    
    logger.info('Connected to MongoDB:', {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.name
    });
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
    
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close Socket.IO
  io.close(() => {
    logger.info('Socket.IO server closed');
  });
  
  // Close database connection
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
  }
  
  // Exit process
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Start server
    server.listen(PORT, () => {
      logger.info('Server started successfully:', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform
      });
      
      // Log available routes in development
      if (process.env.NODE_ENV === 'development') {
        logger.info('Available routes:');
        logger.info('  POST /api/auth/register');
        logger.info('  POST /api/auth/login');
        logger.info('  POST /api/videos/upload');
        logger.info('  GET  /api/videos');
        logger.info('  POST /api/ai/chat');
        logger.info('  GET  /api/users/profile');
        logger.info('  GET  /health');
      }
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Export app for testing
export { app, server, io };

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;