# 🚀 VFXB Backend Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [API Endpoints](#api-endpoints)
6. [Services](#services)
7. [Database Models](#database-models)
8. [Middleware](#middleware)
9. [Socket.IO Integration](#socketio-integration)
10. [File Upload & Processing](#file-upload--processing)
11. [Error Handling](#error-handling)
12. [Security](#security)
13. [Performance & Optimization](#performance--optimization)
14. [Testing](#testing)
15. [Deployment](#deployment)
16. [Monitoring & Logging](#monitoring--logging)
17. [Troubleshooting](#troubleshooting)

## 🌟 Overview

The VFXB backend is a robust Node.js application built with Express.js, providing comprehensive video processing capabilities, AI integration, and real-time communication. It serves as the core engine powering the VFXB video editing platform.

### Key Features
- **Video Processing**: FFmpeg-powered video manipulation
- **AI Integration**: OpenAI, Replicate, and ElevenLabs services
- **Real-time Communication**: Socket.IO for live updates
- **File Management**: Secure upload and storage system
- **RESTful API**: Comprehensive REST endpoints
- **Scalable Architecture**: Modular and maintainable codebase

## 🏗️ Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│
│  │   Express   │ │  Socket.IO  │ │    File Storage     ││
│  │   Server    │ │   Server    │ │     System          ││
│  └─────────────┘ └─────────────┘ └─────────────────────┘│
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│
│  │    API      │ │  Services   │ │     Middleware      ││
│  │   Routes    │ │   Layer     │ │      Layer          ││
│  └─────────────┘ └─────────────┘ └─────────────────────┘│
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│
│  │   Video     │ │     AI      │ │     External        ││
│  │ Processing  │ │  Services   │ │     APIs            ││
│  │  (FFmpeg)   │ │             │ │                     ││
│  └─────────────┘ └─────────────┘ └─────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Request Flow
```
Client Request → Middleware → Route Handler → Service Layer → External APIs/FFmpeg
      ↑                                                              ↓
      └── Response ← Error Handler ← Business Logic ← Data Processing ←┘
```

## 🛠️ Technology Stack

### Core Technologies
- **Node.js**: JavaScript runtime environment
- **Express.js**: Fast, unopinionated web framework
- **Socket.IO**: Real-time bidirectional communication
- **FFmpeg**: Video and audio processing
- **Multer**: File upload middleware

### External Services
- **OpenAI GPT-4**: Conversational AI and content analysis
- **Replicate**: AI model hosting and inference
- **ElevenLabs**: High-quality voice synthesis
- **FFmpeg-static**: Static FFmpeg binaries

### Development Tools
- **Nodemon**: Development server with auto-restart
- **Winston**: Comprehensive logging
- **Helmet**: Security middleware
- **CORS**: Cross-origin resource sharing
- **Joi**: Data validation

## 📁 Project Structure

```
backend/
├── 📁 src/
│   ├── 📁 routes/                # API route handlers
│   │   ├── 📄 index.js           # Main router
│   │   ├── 📄 health.js          # Health check endpoints
│   │   ├── 📄 video.js           # Video processing routes
│   │   ├── 📄 ai.js              # AI service routes
│   │   ├── 📄 upload.js          # File upload routes
│   │   └── 📄 projects.js        # Project management routes
│   ├── 📁 services/              # Business logic services
│   │   ├── 📄 videoProcessor.js  # Video processing service
│   │   ├── 📄 aiService.js       # OpenAI integration
│   │   ├── 📄 replicateService.js# Replicate AI service
│   │   ├── 📄 elevenLabsService.js# ElevenLabs voice service
│   │   ├── 📄 fileService.js     # File management service
│   │   └── 📄 projectService.js  # Project management service
│   ├── 📁 models/                # Data models
│   │   ├── 📄 Project.js         # Project model
│   │   ├── 📄 Video.js           # Video model
│   │   └── 📄 User.js            # User model
│   ├── 📁 middleware/            # Express middleware
│   │   ├── 📄 auth.js            # Authentication middleware
│   │   ├── 📄 validation.js      # Request validation
│   │   ├── 📄 errorHandler.js    # Error handling middleware
│   │   ├── 📄 rateLimiter.js     # Rate limiting
│   │   └── 📄 upload.js          # File upload middleware
│   ├── 📁 utils/                 # Utility functions
│   │   ├── 📄 logger.js          # Winston logger configuration
│   │   ├── 📄 constants.js       # Application constants
│   │   ├── 📄 helpers.js         # Helper functions
│   │   └── 📄 validators.js      # Data validation schemas
│   ├── 📁 sockets/               # Socket.IO handlers
│   │   ├── 📄 index.js           # Socket server setup
│   │   ├── 📄 videoEvents.js     # Video processing events
│   │   └── 📄 chatEvents.js      # Chat/AI events
│   └── 📄 app.js                 # Express app configuration
├── 📁 uploads/                   # File storage directory
│   ├── 📁 videos/                # Uploaded videos
│   ├── 📁 audio/                 # Audio files
│   ├── 📁 images/                # Image assets
│   └── 📁 temp/                  # Temporary processing files
├── 📁 docs/                      # API documentation
│   ├── 📄 API.md                 # API endpoint documentation
│   └── 📄 DEPLOYMENT.md          # Deployment guide
├── 📁 tests/                     # Test files
│   ├── 📁 unit/                  # Unit tests
│   ├── 📁 integration/           # Integration tests
│   └── 📁 fixtures/              # Test data
├── 📄 server.js                  # Server entry point
├── 📄 package.json               # Dependencies and scripts
├── 📄 .env.example               # Environment variables template
└── 📄 README.md                  # Backend documentation
```

## 🔌 API Endpoints

### Health Check
```http
GET /api/health
```
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "version": "1.0.0",
  "services": {
    "ffmpeg": "available",
    "openai": "connected",
    "replicate": "connected"
  }
}
```

### Video Processing

#### Upload Video
```http
POST /api/video/upload
Content-Type: multipart/form-data

Body: FormData with 'video' field
```
**Response:**
```json
{
  "success": true,
  "videoId": "uuid-string",
  "filename": "video.mp4",
  "size": 15728640,
  "duration": 120.5,
  "metadata": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "codec": "h264"
  }
}
```

#### Trim Video
```http
POST /api/video/trim
Content-Type: application/json

{
  "videoId": "uuid-string",
  "startTime": 10.5,
  "endTime": 60.0
}
```

#### Crop Video
```http
POST /api/video/crop
Content-Type: application/json

{
  "videoId": "uuid-string",
  "width": 1280,
  "height": 720,
  "x": 320,
  "y": 180
}
```

#### Apply Filter
```http
POST /api/video/apply-filter
Content-Type: application/json

{
  "videoId": "uuid-string",
  "filterType": "vintage",
  "intensity": 0.8
}
```

#### Add Text Overlay
```http
POST /api/video/add-text
Content-Type: application/json

{
  "videoId": "uuid-string",
  "text": "Hello World",
  "position": { "x": 100, "y": 100 },
  "style": {
    "fontSize": 24,
    "color": "white",
    "fontFamily": "Arial"
  },
  "duration": { "start": 5, "end": 15 }
}
```

#### Export Video
```http
POST /api/video/export
Content-Type: application/json

{
  "videoId": "uuid-string",
  "format": "mp4",
  "quality": "high",
  "resolution": "1080p"
}
```

### AI Services

#### Chat with AI
```http
POST /api/ai/chat
Content-Type: application/json

{
  "message": "Enhance the audio quality of my video",
  "context": {
    "videoId": "uuid-string",
    "currentTime": 30.5
  }
}
```

#### Upscale Video
```http
POST /api/ai/upscale
Content-Type: application/json

{
  "videoId": "uuid-string",
  "scaleFactor": 2
}
```

#### Style Transfer
```http
POST /api/ai/style-transfer
Content-Type: application/json

{
  "videoId": "uuid-string",
  "styleType": "cartoon",
  "intensity": 0.7
}
```

#### Generate Voice
```http
POST /api/ai/voice-generation
Content-Type: application/json

{
  "text": "This is a sample narration",
  "voice": "professional_male",
  "speed": 1.0
}
```

### Project Management

#### Get Projects
```http
GET /api/projects
```

#### Create Project
```http
POST /api/projects
Content-Type: application/json

{
  "name": "My Video Project",
  "description": "A sample video editing project"
}
```

#### Get Project
```http
GET /api/projects/:id
```

#### Update Project
```http
PUT /api/projects/:id
Content-Type: application/json

{
  "name": "Updated Project Name",
  "timeline": [...]
}
```

#### Delete Project
```http
DELETE /api/projects/:id
```

## 🔧 Services

### Video Processor Service

```javascript
// services/videoProcessor.js
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

class VideoProcessor {
  constructor() {
    ffmpeg.setFfmpegPath(ffmpegStatic);
  }
  
  async trimVideo(inputPath, outputPath, startTime, endTime) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(endTime - startTime)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }
  
  async cropVideo(inputPath, outputPath, width, height, x, y) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters(`crop=${width}:${height}:${x}:${y}`)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }
  
  async applyFilter(inputPath, outputPath, filterType, intensity = 1.0) {
    const filters = {
      vintage: `curves=vintage,colorbalance=rs=${intensity}`,
      blackwhite: `colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3`,
      sepia: `colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131`,
      blur: `boxblur=${intensity * 5}:1`,
      sharpen: `unsharp=5:5:${intensity}:5:5:0.0`
    };
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters(filters[filterType])
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }
  
  async addText(inputPath, outputPath, text, position, style, duration) {
    const textFilter = `drawtext=text='${text}':x=${position.x}:y=${position.y}:fontsize=${style.fontSize}:fontcolor=${style.color}:enable='between(t,${duration.start},${duration.end})'`;
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters(textFilter)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }
  
  async getVideoMetadata(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
  }
}

module.exports = new VideoProcessor();
```

### AI Service

```javascript
// services/aiService.js
const OpenAI = require('openai');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  
  async processMessage(message, context = {}) {
    try {
      const systemPrompt = `You are a professional video editing assistant. 
        Help users edit their videos using natural language commands.
        Current context: ${JSON.stringify(context)}`;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      return {
        response: response.choices[0].message.content,
        actions: this.extractActions(response.choices[0].message.content)
      };
    } catch (error) {
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }
  
  extractActions(response) {
    // Parse AI response to extract actionable commands
    const actions = [];
    
    if (response.includes('trim') || response.includes('cut')) {
      actions.push({ type: 'trim', parameters: {} });
    }
    
    if (response.includes('filter') || response.includes('effect')) {
      actions.push({ type: 'apply_filter', parameters: {} });
    }
    
    return actions;
  }
}

module.exports = new AIService();
```

### Replicate Service

```javascript
// services/replicateService.js
const Replicate = require('replicate');

class ReplicateService {
  constructor() {
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });
  }
  
  async upscaleVideo(videoPath, scaleFactor = 2) {
    try {
      const output = await this.replicate.run(
        "tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3",
        {
          input: {
            img: videoPath,
            version: "v1.4",
            scale: scaleFactor
          }
        }
      );
      
      return output;
    } catch (error) {
      throw new Error(`Video upscaling failed: ${error.message}`);
    }
  }
  
  async styleTransfer(videoPath, styleType) {
    try {
      const output = await this.replicate.run(
        "riffusion/riffusion:8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05",
        {
          input: {
            video: videoPath,
            style: styleType
          }
        }
      );
      
      return output;
    } catch (error) {
      throw new Error(`Style transfer failed: ${error.message}`);
    }
  }
}

module.exports = new ReplicateService();
```

### ElevenLabs Service

```javascript
// services/elevenLabsService.js
const axios = require('axios');

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseURL = 'https://api.elevenlabs.io/v1';
  }
  
  async textToSpeech(text, voiceId = 'default', options = {}) {
    try {
      const response = await axios.post(
        `${this.baseURL}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: options.model || 'eleven_monolingual_v1',
          voice_settings: {
            stability: options.stability || 0.5,
            similarity_boost: options.similarity_boost || 0.5
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer'
        }
      );
      
      return response.data;
    } catch (error) {
      throw new Error(`Text-to-speech failed: ${error.message}`);
    }
  }
  
  async getVoices() {
    try {
      const response = await axios.get(`${this.baseURL}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      
      return response.data.voices;
    } catch (error) {
      throw new Error(`Failed to fetch voices: ${error.message}`);
    }
  }
}

module.exports = new ElevenLabsService();
```

## 🗄️ Database Models

### Project Model

```javascript
// models/Project.js
const { v4: uuidv4 } = require('uuid');

class Project {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.description = data.description || '';
    this.timeline = data.timeline || [];
    this.settings = data.settings || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
  
  static validate(data) {
    const errors = [];
    
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Project name is required');
    }
    
    if (data.name && data.name.length > 100) {
      errors.push('Project name must be less than 100 characters');
    }
    
    return errors;
  }
  
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      timeline: this.timeline,
      settings: this.settings,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Project;
```

### Video Model

```javascript
// models/Video.js
const { v4: uuidv4 } = require('uuid');

class Video {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.filename = data.filename;
    this.originalName = data.originalName;
    this.path = data.path;
    this.size = data.size;
    this.duration = data.duration;
    this.metadata = data.metadata || {};
    this.status = data.status || 'uploaded';
    this.createdAt = data.createdAt || new Date();
  }
  
  static validate(data) {
    const errors = [];
    
    if (!data.filename) {
      errors.push('Filename is required');
    }
    
    if (!data.path) {
      errors.push('File path is required');
    }
    
    return errors;
  }
  
  toJSON() {
    return {
      id: this.id,
      filename: this.filename,
      originalName: this.originalName,
      size: this.size,
      duration: this.duration,
      metadata: this.metadata,
      status: this.status,
      createdAt: this.createdAt
    };
  }
}

module.exports = Video;
```

## 🛡️ Middleware

### Authentication Middleware

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
```

### Validation Middleware

```javascript
// middleware/validation.js
const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }
    
    next();
  };
};

// Validation schemas
const schemas = {
  trimVideo: Joi.object({
    videoId: Joi.string().uuid().required(),
    startTime: Joi.number().min(0).required(),
    endTime: Joi.number().min(0).required()
  }),
  
  cropVideo: Joi.object({
    videoId: Joi.string().uuid().required(),
    width: Joi.number().integer().min(1).required(),
    height: Joi.number().integer().min(1).required(),
    x: Joi.number().integer().min(0).required(),
    y: Joi.number().integer().min(0).required()
  }),
  
  createProject: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional()
  })
};

module.exports = { validateRequest, schemas };
```

### Error Handler Middleware

```javascript
// middleware/errorHandler.js
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  // Default error
  let error = {
    status: 500,
    message: 'Internal server error'
  };
  
  // Validation errors
  if (err.name === 'ValidationError') {
    error.status = 400;
    error.message = 'Validation failed';
    error.details = err.details;
  }
  
  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.status = 413;
    error.message = 'File too large';
  }
  
  // FFmpeg errors
  if (err.message.includes('ffmpeg')) {
    error.status = 422;
    error.message = 'Video processing failed';
  }
  
  // AI service errors
  if (err.message.includes('OpenAI') || err.message.includes('Replicate')) {
    error.status = 503;
    error.message = 'AI service unavailable';
  }
  
  res.status(error.status).json({
    error: error.message,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
```

### Rate Limiter Middleware

```javascript
// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiting for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 AI requests per minute
  message: {
    error: 'Too many AI requests, please try again later.'
  }
});

// Upload rate limiting
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 uploads per minute
  message: {
    error: 'Too many upload requests, please try again later.'
  }
});

module.exports = {
  apiLimiter,
  aiLimiter,
  uploadLimiter
};
```

## 🔌 Socket.IO Integration

### Socket Server Setup

```javascript
// sockets/index.js
const { Server } = require('socket.io');
const videoEvents = require('./videoEvents');
const chatEvents = require('./chatEvents');

const setupSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });
  
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Register event handlers
    videoEvents(socket, io);
    chatEvents(socket, io);
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
  
  return io;
};

module.exports = setupSocketServer;
```

### Video Events

```javascript
// sockets/videoEvents.js
const videoProcessor = require('../services/videoProcessor');

module.exports = (socket, io) => {
  socket.on('video:process', async (data) => {
    try {
      const { videoId, operation, parameters } = data;
      
      // Emit processing started
      socket.emit('video:processing-started', { videoId, operation });
      
      let result;
      switch (operation) {
        case 'trim':
          result = await videoProcessor.trimVideo(
            parameters.inputPath,
            parameters.outputPath,
            parameters.startTime,
            parameters.endTime
          );
          break;
        case 'crop':
          result = await videoProcessor.cropVideo(
            parameters.inputPath,
            parameters.outputPath,
            parameters.width,
            parameters.height,
            parameters.x,
            parameters.y
          );
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      // Emit processing completed
      socket.emit('video:processing-completed', {
        videoId,
        operation,
        result
      });
      
    } catch (error) {
      socket.emit('video:processing-error', {
        videoId: data.videoId,
        operation: data.operation,
        error: error.message
      });
    }
  });
  
  socket.on('video:progress', (data) => {
    // Broadcast progress updates to all clients
    io.emit('video:progress-update', data);
  });
};
```

### Chat Events

```javascript
// sockets/chatEvents.js
const aiService = require('../services/aiService');

module.exports = (socket, io) => {
  socket.on('chat:message', async (data) => {
    try {
      const { message, context } = data;
      
      // Emit typing indicator
      socket.emit('chat:ai-typing', true);
      
      // Process message with AI
      const response = await aiService.processMessage(message, context);
      
      // Stop typing indicator
      socket.emit('chat:ai-typing', false);
      
      // Send AI response
      socket.emit('chat:ai-response', {
        message: response.response,
        actions: response.actions,
        timestamp: new Date()
      });
      
    } catch (error) {
      socket.emit('chat:ai-typing', false);
      socket.emit('chat:error', {
        error: 'Failed to process message',
        timestamp: new Date()
      });
    }
  });
  
  socket.on('chat:join-room', (roomId) => {
    socket.join(roomId);
    socket.emit('chat:joined-room', roomId);
  });
  
  socket.on('chat:leave-room', (roomId) => {
    socket.leave(roomId);
    socket.emit('chat:left-room', roomId);
  });
};
```

## 📁 File Upload & Processing

### Upload Middleware

```javascript
// middleware/upload.js
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/videos');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'), false);
  }
};

// Upload configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

module.exports = {
  uploadVideo: upload.single('video'),
  uploadMultiple: upload.array('videos', 5)
};
```

### File Service

```javascript
// services/fileService.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FileService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
  }
  
  async saveFile(file, category = 'videos') {
    try {
      const categoryDir = path.join(this.uploadDir, category);
      await this.ensureDirectoryExists(categoryDir);
      
      const filename = this.generateUniqueFilename(file.originalname);
      const filepath = path.join(categoryDir, filename);
      
      await fs.writeFile(filepath, file.buffer);
      
      return {
        filename,
        path: filepath,
        size: file.size,
        mimetype: file.mimetype
      };
    } catch (error) {
      throw new Error(`Failed to save file: ${error.message}`);
    }
  }
  
  async deleteFile(filepath) {
    try {
      await fs.unlink(filepath);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }
  
  async getFileInfo(filepath) {
    try {
      const stats = await fs.stat(filepath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }
  
  generateUniqueFilename(originalname) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalname);
    return `${timestamp}-${random}${extension}`;
  }
  
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
}

module.exports = new FileService();
```

## 🚨 Error Handling

### Custom Error Classes

```javascript
// utils/errors.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400);
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

class ServiceUnavailableError extends AppError {
  constructor(service) {
    super(`${service} service is currently unavailable`, 503);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ServiceUnavailableError
};
```

### Global Error Handler

```javascript
// utils/globalErrorHandler.js
const logger = require('./logger');
const { AppError } = require('./errors');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    
    sendErrorProd(error, res);
  }
};
```

## 🔒 Security

### Security Configuration

```javascript
// app.js - Security setup
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Security middleware
app.use(helmet()); // Set security HTTP headers

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
  whitelist: ['sort', 'fields', 'page', 'limit']
}));
```

### Input Validation

```javascript
// utils/validators.js
const Joi = require('joi');

const videoProcessingSchemas = {
  trim: Joi.object({
    videoId: Joi.string().uuid().required(),
    startTime: Joi.number().min(0).required(),
    endTime: Joi.number().min(Joi.ref('startTime')).required()
  }),
  
  crop: Joi.object({
    videoId: Joi.string().uuid().required(),
    width: Joi.number().integer().min(1).max(7680).required(),
    height: Joi.number().integer().min(1).max(4320).required(),
    x: Joi.number().integer().min(0).required(),
    y: Joi.number().integer().min(0).required()
  }),
  
  filter: Joi.object({
    videoId: Joi.string().uuid().required(),
    filterType: Joi.string().valid('vintage', 'blackwhite', 'sepia', 'blur', 'sharpen').required(),
    intensity: Joi.number().min(0).max(1).default(1)
  })
};

const aiSchemas = {
  chat: Joi.object({
    message: Joi.string().min(1).max(1000).required(),
    context: Joi.object({
      videoId: Joi.string().uuid(),
      currentTime: Joi.number().min(0)
    }).optional()
  })
};

module.exports = {
  videoProcessingSchemas,
  aiSchemas
};
```

## ⚡ Performance & Optimization

### Caching Strategy

```javascript
// utils/cache.js
const NodeCache = require('node-cache');

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 600, // 10 minutes default TTL
      checkperiod: 120 // Check for expired keys every 2 minutes
    });
  }
  
  get(key) {
    return this.cache.get(key);
  }
  
  set(key, value, ttl = 600) {
    return this.cache.set(key, value, ttl);
  }
  
  del(key) {
    return this.cache.del(key);
  }
  
  flush() {
    return this.cache.flushAll();
  }
  
  // Cache video metadata
  cacheVideoMetadata(videoId, metadata) {
    return this.set(`video:metadata:${videoId}`, metadata, 3600); // 1 hour
  }
  
  getVideoMetadata(videoId) {
    return this.get(`video:metadata:${videoId}`);
  }
  
  // Cache AI responses
  cacheAIResponse(messageHash, response) {
    return this.set(`ai:response:${messageHash}`, response, 1800); // 30 minutes
  }
  
  getAIResponse(messageHash) {
    return this.get(`ai:response:${messageHash}`);
  }
}

module.exports = new CacheService();
```

### Background Job Processing

```javascript
// utils/jobQueue.js
const Queue = require('bull');
const videoProcessor = require('../services/videoProcessor');

// Create job queues
const videoProcessingQueue = new Queue('video processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

// Process video jobs
videoProcessingQueue.process('trim', async (job) => {
  const { videoId, inputPath, outputPath, startTime, endTime } = job.data;
  
  try {
    const result = await videoProcessor.trimVideo(inputPath, outputPath, startTime, endTime);
    return { success: true, result };
  } catch (error) {
    throw new Error(`Video processing failed: ${error.message}`);
  }
});

videoProcessingQueue.process('crop', async (job) => {
  const { videoId, inputPath, outputPath, width, height, x, y } = job.data;
  
  try {
    const result = await videoProcessor.cropVideo(inputPath, outputPath, width, height, x, y);
    return { success: true, result };
  } catch (error) {
    throw new Error(`Video processing failed: ${error.message}`);
  }
});

// Job event handlers
videoProcessingQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

videoProcessingQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

module.exports = {
  videoProcessingQueue
};
```

## 🧪 Testing

### Unit Tests

```javascript
// tests/unit/videoProcessor.test.js
const videoProcessor = require('../../src/services/videoProcessor');
const fs = require('fs');
const path = require('path');

describe('VideoProcessor', () => {
  const testVideoPath = path.join(__dirname, '../fixtures/test-video.mp4');
  const outputPath = path.join(__dirname, '../temp/output.mp4');
  
  beforeEach(() => {
    // Ensure test directories exist
    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
  });
  
  afterEach(() => {
    // Clean up output files
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  });
  
  describe('trimVideo', () => {
    test('should trim video successfully', async () => {
      const result = await videoProcessor.trimVideo(
        testVideoPath,
        outputPath,
        5,
        15
      );
      
      expect(result).toBe(outputPath);
      expect(fs.existsSync(outputPath)).toBe(true);
    });
    
    test('should throw error for invalid input', async () => {
      await expect(
        videoProcessor.trimVideo(
          'nonexistent.mp4',
          outputPath,
          5,
          15
        )
      ).rejects.toThrow();
    });
  });
  
  describe('getVideoMetadata', () => {
    test('should return video metadata', async () => {
      const metadata = await videoProcessor.getVideoMetadata(testVideoPath);
      
      expect(metadata).toHaveProperty('format');
      expect(metadata).toHaveProperty('streams');
      expect(metadata.format).toHaveProperty('duration');
    });
  });
});
```

### Integration Tests

```javascript
// tests/integration/api.test.js
const request = require('supertest');
const app = require('../../src/app');
const path = require('path');

describe('API Integration Tests', () => {
  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });
  
  describe('POST /api/video/upload', () => {
    test('should upload video successfully', async () => {
      const testVideoPath = path.join(__dirname, '../fixtures/test-video.mp4');
      
      const response = await request(app)
        .post('/api/video/upload')
        .attach('video', testVideoPath)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('videoId');
      expect(response.body).toHaveProperty('filename');
    });
    
    test('should reject invalid file type', async () => {
      const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
      
      await request(app)
        .post('/api/video/upload')
        .attach('video', testImagePath)
        .expect(400);
    });
  });
  
  describe('POST /api/ai/chat', () => {
    test('should process AI chat message', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .send({
          message: 'Trim my video from 10 to 30 seconds',
          context: { videoId: 'test-video-id' }
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('actions');
    });
  });
});
```

## 🚀 Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/videos uploads/audio uploads/temp

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application
CMD ["npm", "start"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - REPLICATE_API_TOKEN=${REPLICATE_API_TOKEN}
      - ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
    volumes:
      - ./uploads:/usr/src/app/uploads
      - ./logs:/usr/src/app/logs
    depends_on:
      - redis
    restart: unless-stopped
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  redis_data:
```

### Environment Configuration

```bash
# .env.production
NODE_ENV=production
PORT=3001

# API Keys
OPENAI_API_KEY=your_openai_api_key
REPLICATE_API_TOKEN=your_replicate_token
ELEVENLABS_API_KEY=your_elevenlabs_key

# File Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=500000000

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Security
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
```

## 📊 Monitoring & Logging

### Winston Logger Configuration

```javascript
// utils/logger.js
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'vfxb-backend' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error'
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log')
    })
  ]
});

// If not in production, log to console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

### Health Check Endpoint

```javascript
// routes/health.js
const express = require('express');
const router = express.Router();
const ffmpeg = require('fluent-ffmpeg');
const OpenAI = require('openai');

router.get('/', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    services: {}
  };
  
  try {
    // Check FFmpeg availability
    ffmpeg.getAvailableFormats((err, formats) => {
      health.services.ffmpeg = err ? 'unavailable' : 'available';
    });
    
    // Check OpenAI API
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      await openai.models.list();
      health.services.openai = 'connected';
    } catch (error) {
      health.services.openai = 'disconnected';
    }
    
    // Check Replicate API
    try {
      const response = await fetch('https://api.replicate.com/v1/models', {
        headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` }
      });
      health.services.replicate = response.ok ? 'connected' : 'disconnected';
    } catch (error) {
      health.services.replicate = 'disconnected';
    }
    
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
```

### Performance Monitoring

```javascript
// utils/metrics.js
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const videoProcessingDuration = new prometheus.Histogram({
  name: 'video_processing_duration_seconds',
  help: 'Duration of video processing operations',
  labelNames: ['operation']
});

const activeConnections = new prometheus.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections'
});

// Middleware to track HTTP requests
const trackHttpRequests = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
};

module.exports = {
  httpRequestDuration,
  videoProcessingDuration,
  activeConnections,
  trackHttpRequests,
  register: prometheus.register
};
```

## 🔧 Troubleshooting

### Common Issues

#### FFmpeg Not Found
```bash
# Error: FFmpeg not found
# Solution: Install FFmpeg

# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

#### Memory Issues
```javascript
// Increase Node.js memory limit
node --max-old-space-size=4096 server.js

// Or in package.json
{
  "scripts": {
    "start": "node --max-old-space-size=4096 server.js"
  }
}
```

#### File Upload Issues
```javascript
// Check file permissions
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, 'uploads');

// Ensure directory exists and is writable
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
}
```

#### Socket.IO Connection Issues
```javascript
// Enable CORS for Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

### Debug Mode

```javascript
// Enable debug logging
process.env.DEBUG = 'socket.io:*,express:*';

// Or use Winston debug level
const logger = require('./utils/logger');
logger.level = 'debug';
```

### Performance Optimization

```javascript
// Enable gzip compression
const compression = require('compression');
app.use(compression());

// Optimize video processing
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  require('./server');
}
```

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Replicate API Documentation](https://replicate.com/docs)
- [ElevenLabs API Documentation](https://docs.elevenlabs.io/)

---

**Built with ❤️ by the VFXB Team**