# 🤖 VFXB AI Implementation Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [AI Architecture](#ai-architecture)
3. [AI Services Integration](#ai-services-integration)
4. [OpenAI GPT-4 Implementation](#openai-gpt-4-implementation)
5. [Replicate AI Models](#replicate-ai-models)
6. [ElevenLabs Voice Synthesis](#elevenlabs-voice-synthesis)
7. [Custom AI Models](#custom-ai-models)
8. [Conversational AI Assistant](#conversational-ai-assistant)
9. [Smart Video Analysis](#smart-video-analysis)
10. [AI-Powered Effects](#ai-powered-effects)
11. [Performance Optimization](#performance-optimization)
12. [Error Handling & Fallbacks](#error-handling--fallbacks)
13. [Security & Privacy](#security--privacy)
14. [Monitoring & Analytics](#monitoring--analytics)
15. [Future Enhancements](#future-enhancements)
16. [Troubleshooting](#troubleshooting)

## 🌟 Overview

The VFXB application leverages cutting-edge AI technologies to provide intelligent video editing capabilities. Our AI implementation combines multiple services and models to deliver a seamless, conversational video editing experience.

### Key AI Features
- **Conversational Video Editor**: Natural language video editing commands
- **Smart Video Analysis**: Automatic content analysis and suggestions
- **AI-Powered Effects**: Intelligent effect recommendations and applications
- **Voice Synthesis**: High-quality narration and voiceover generation
- **Style Transfer**: Artistic style application to videos
- **Upscaling & Enhancement**: AI-driven video quality improvements
- **Smart Cropping**: Intelligent content-aware cropping
- **Automatic Subtitles**: AI-generated captions and subtitles

## 🏗️ AI Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │   AI Chat   │ │  Effects    │ │    Smart Features       ││
│  │ Interface   │ │ Suggestions │ │     Panel               ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                    Backend (Node.js)                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ AI Service  │ │  Command    │ │    Response             ││
│  │   Router    │ │  Parser     │ │   Generator             ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                   AI Services Layer                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │   OpenAI    │ │  Replicate  │ │     ElevenLabs          ││
│  │   GPT-4     │ │   Models    │ │   Voice Synthesis       ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                 Processing & Storage                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │   Video     │ │   Cache     │ │     Analytics           ││
│  │ Processing  │ │   Layer     │ │     Storage             ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Data Flow
```
User Input → AI Parser → Intent Recognition → Service Selection → Processing → Response Generation → UI Update
     ↑                                                                              ↓
     └── Feedback Loop ← Analytics ← Result Validation ← Quality Check ←──────────┘
```

## 🔌 AI Services Integration

### Service Configuration

```javascript
// config/aiServices.js
const aiConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
    maxTokens: 1000,
    temperature: 0.7,
    timeout: 30000
  },
  replicate: {
    apiToken: process.env.REPLICATE_API_TOKEN,
    timeout: 120000,
    retries: 3
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    defaultVoice: 'professional_male',
    timeout: 60000
  },
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: 1000
  },
  rateLimit: {
    openai: { requests: 60, window: 60000 }, // 60 requests per minute
    replicate: { requests: 30, window: 60000 }, // 30 requests per minute
    elevenlabs: { requests: 100, window: 60000 } // 100 requests per minute
  }
};

module.exports = aiConfig;
```

### AI Service Manager

```javascript
// services/aiServiceManager.js
const OpenAIService = require('./openaiService');
const ReplicateService = require('./replicateService');
const ElevenLabsService = require('./elevenLabsService');
const CacheService = require('./cacheService');
const logger = require('../utils/logger');

class AIServiceManager {
  constructor() {
    this.openai = new OpenAIService();
    this.replicate = new ReplicateService();
    this.elevenlabs = new ElevenLabsService();
    this.cache = new CacheService();
    this.metrics = {
      requests: 0,
      errors: 0,
      avgResponseTime: 0
    };
  }
  
  async processRequest(type, data, options = {}) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(type, data);
    
    try {
      // Check cache first
      if (options.useCache !== false) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          logger.info('AI request served from cache', { type, cacheKey });
          return cached;
        }
      }
      
      let result;
      switch (type) {
        case 'chat':
          result = await this.openai.processMessage(data.message, data.context);
          break;
        case 'upscale':
          result = await this.replicate.upscaleVideo(data.videoPath, data.scale);
          break;
        case 'voice':
          result = await this.elevenlabs.textToSpeech(data.text, data.voice);
          break;
        case 'style-transfer':
          result = await this.replicate.styleTransfer(data.videoPath, data.style);
          break;
        default:
          throw new Error(`Unknown AI service type: ${type}`);
      }
      
      // Cache the result
      if (options.useCache !== false) {
        await this.cache.set(cacheKey, result, options.cacheTTL);
      }
      
      // Update metrics
      this.updateMetrics(startTime, false);
      
      logger.info('AI request processed successfully', {
        type,
        duration: Date.now() - startTime,
        cached: false
      });
      
      return result;
      
    } catch (error) {
      this.updateMetrics(startTime, true);
      logger.error('AI request failed', {
        type,
        error: error.message,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }
  
  generateCacheKey(type, data) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5')
      .update(JSON.stringify({ type, data }))
      .digest('hex');
    return `ai:${type}:${hash}`;
  }
  
  updateMetrics(startTime, isError) {
    this.metrics.requests++;
    if (isError) this.metrics.errors++;
    
    const duration = Date.now() - startTime;
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime + duration) / 2;
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      errorRate: this.metrics.errors / this.metrics.requests,
      successRate: 1 - (this.metrics.errors / this.metrics.requests)
    };
  }
}

module.exports = new AIServiceManager();
```

## 🧠 OpenAI GPT-4 Implementation

### Core Service

```javascript
// services/openaiService.js
const OpenAI = require('openai');
const logger = require('../utils/logger');
const aiConfig = require('../config/aiServices');

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: aiConfig.openai.apiKey,
      timeout: aiConfig.openai.timeout
    });
    this.systemPrompts = {
      videoEditor: this.getVideoEditorPrompt(),
      analyzer: this.getAnalyzerPrompt(),
      assistant: this.getAssistantPrompt()
    };
  }
  
  async processMessage(message, context = {}, mode = 'videoEditor') {
    try {
      const systemPrompt = this.systemPrompts[mode];
      const contextualPrompt = this.buildContextualPrompt(context);
      
      const response = await this.client.chat.completions.create({
        model: aiConfig.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'system', content: contextualPrompt },
          { role: 'user', content: message }
        ],
        temperature: aiConfig.openai.temperature,
        max_tokens: aiConfig.openai.maxTokens,
        functions: this.getFunctionDefinitions(),
        function_call: 'auto'
      });
      
      const result = this.parseResponse(response);
      
      logger.info('OpenAI request processed', {
        model: aiConfig.openai.model,
        tokens: response.usage?.total_tokens,
        mode
      });
      
      return result;
      
    } catch (error) {
      logger.error('OpenAI request failed', {
        error: error.message,
        message: message.substring(0, 100)
      });
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }
  
  getVideoEditorPrompt() {
    return `You are VFXB AI, a professional video editing assistant. You help users edit videos through natural language commands.
    
    Your capabilities include:
    - Video trimming, cropping, and resizing
    - Applying filters and effects
    - Adding text overlays and subtitles
    - Audio enhancement and voice generation
    - Style transfer and upscaling
    - Smart content analysis
    
    Always respond with:
    1. A friendly, helpful message explaining what you'll do
    2. Specific function calls to execute the requested actions
    3. Suggestions for additional improvements when relevant
    
    Be concise but informative. Focus on the user's intent and provide actionable solutions.`;
  }
  
  getAnalyzerPrompt() {
    return `You are a video content analyzer. Analyze video content and provide insights about:
    - Scene composition and quality
    - Suggested improvements
    - Optimal effects and filters
    - Content categorization
    - Technical recommendations
    
    Provide structured, actionable analysis that helps improve video quality.`;
  }
  
  getAssistantPrompt() {
    return `You are a helpful video editing assistant. Provide guidance, tutorials, and support for video editing tasks.
    Be encouraging, educational, and practical in your responses.`;
  }
  
  buildContextualPrompt(context) {
    let prompt = 'Current context:\n';
    
    if (context.videoId) {
      prompt += `- Working with video: ${context.videoId}\n`;
    }
    
    if (context.currentTime) {
      prompt += `- Current playback time: ${context.currentTime}s\n`;
    }
    
    if (context.selectedRegion) {
      prompt += `- Selected region: ${context.selectedRegion.start}s to ${context.selectedRegion.end}s\n`;
    }
    
    if (context.appliedEffects && context.appliedEffects.length > 0) {
      prompt += `- Applied effects: ${context.appliedEffects.join(', ')}\n`;
    }
    
    if (context.projectSettings) {
      prompt += `- Project settings: ${JSON.stringify(context.projectSettings)}\n`;
    }
    
    return prompt;
  }
  
  getFunctionDefinitions() {
    return [
      {
        name: 'trim_video',
        description: 'Trim video to specified time range',
        parameters: {
          type: 'object',
          properties: {
            startTime: { type: 'number', description: 'Start time in seconds' },
            endTime: { type: 'number', description: 'End time in seconds' }
          },
          required: ['startTime', 'endTime']
        }
      },
      {
        name: 'apply_filter',
        description: 'Apply visual filter to video',
        parameters: {
          type: 'object',
          properties: {
            filterType: {
              type: 'string',
              enum: ['vintage', 'blackwhite', 'sepia', 'blur', 'sharpen', 'brightness', 'contrast']
            },
            intensity: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: ['filterType']
        }
      },
      {
        name: 'add_text',
        description: 'Add text overlay to video',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            position: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' }
              }
            },
            style: {
              type: 'object',
              properties: {
                fontSize: { type: 'number' },
                color: { type: 'string' },
                fontFamily: { type: 'string' }
              }
            },
            duration: {
              type: 'object',
              properties: {
                start: { type: 'number' },
                end: { type: 'number' }
              }
            }
          },
          required: ['text']
        }
      },
      {
        name: 'crop_video',
        description: 'Crop video to specified dimensions',
        parameters: {
          type: 'object',
          properties: {
            width: { type: 'number' },
            height: { type: 'number' },
            x: { type: 'number' },
            y: { type: 'number' }
          },
          required: ['width', 'height', 'x', 'y']
        }
      },
      {
        name: 'enhance_audio',
        description: 'Enhance audio quality',
        parameters: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['noise_reduction', 'volume_boost', 'clarity_enhance']
            },
            intensity: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: ['type']
        }
      },
      {
        name: 'generate_voice',
        description: 'Generate voice narration',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            voice: { type: 'string' },
            speed: { type: 'number', minimum: 0.5, maximum: 2.0 }
          },
          required: ['text']
        }
      }
    ];
  }
  
  parseResponse(response) {
    const message = response.choices[0].message;
    const result = {
      response: message.content,
      actions: [],
      confidence: 0.8
    };
    
    // Parse function calls
    if (message.function_call) {
      try {
        const functionCall = message.function_call;
        const parameters = JSON.parse(functionCall.arguments);
        
        result.actions.push({
          type: functionCall.name,
          parameters,
          confidence: 0.9
        });
      } catch (error) {
        logger.warn('Failed to parse function call', {
          functionCall: message.function_call,
          error: error.message
        });
      }
    }
    
    // Extract actions from text if no function calls
    if (result.actions.length === 0) {
      result.actions = this.extractActionsFromText(message.content);
    }
    
    return result;
  }
  
  extractActionsFromText(text) {
    const actions = [];
    const lowerText = text.toLowerCase();
    
    // Simple pattern matching for common actions
    if (lowerText.includes('trim') || lowerText.includes('cut')) {
      actions.push({ type: 'trim_video', parameters: {}, confidence: 0.6 });
    }
    
    if (lowerText.includes('filter') || lowerText.includes('effect')) {
      actions.push({ type: 'apply_filter', parameters: {}, confidence: 0.6 });
    }
    
    if (lowerText.includes('text') || lowerText.includes('subtitle')) {
      actions.push({ type: 'add_text', parameters: {}, confidence: 0.6 });
    }
    
    if (lowerText.includes('crop') || lowerText.includes('resize')) {
      actions.push({ type: 'crop_video', parameters: {}, confidence: 0.6 });
    }
    
    return actions;
  }
  
  async analyzeVideo(videoMetadata, frames = []) {
    try {
      const analysisPrompt = `Analyze this video and provide recommendations:
      
      Metadata: ${JSON.stringify(videoMetadata, null, 2)}
      
      Provide analysis in the following format:
      {
        "quality": "assessment of video quality",
        "recommendations": ["list of specific recommendations"],
        "suggestedEffects": ["recommended effects"],
        "technicalIssues": ["any technical problems detected"]
      }`;
      
      const response = await this.client.chat.completions.create({
        model: aiConfig.openai.model,
        messages: [
          { role: 'system', content: this.systemPrompts.analyzer },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3,
        max_tokens: 800
      });
      
      return JSON.parse(response.choices[0].message.content);
      
    } catch (error) {
      logger.error('Video analysis failed', { error: error.message });
      throw error;
    }
  }
}

module.exports = OpenAIService;
```

## 🎨 Replicate AI Models

### Replicate Service Implementation

```javascript
// services/replicateService.js
const Replicate = require('replicate');
const logger = require('../utils/logger');
const aiConfig = require('../config/aiServices');

class ReplicateService {
  constructor() {
    this.client = new Replicate({
      auth: aiConfig.replicate.apiToken
    });
    
    this.models = {
      upscaling: {
        id: 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
        description: 'Real-ESRGAN for video upscaling'
      },
      styleTransfer: {
        id: 'riffusion/riffusion:8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05',
        description: 'Style transfer for videos'
      },
      faceEnhancement: {
        id: 'tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3',
        description: 'Face enhancement and restoration'
      },
      backgroundRemoval: {
        id: 'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
        description: 'Background removal from videos'
      },
      colorization: {
        id: 'cjwbw/bigcolor:9451bfbf652b21a9bccc741e5c7046540faa5586cfa3aa45abc7c6e5e6e6e6e6',
        description: 'AI-powered video colorization'
      }
    };
  }
  
  async upscaleVideo(videoPath, scaleFactor = 2, options = {}) {
    try {
      logger.info('Starting video upscaling', { videoPath, scaleFactor });
      
      const prediction = await this.client.predictions.create({
        version: this.models.upscaling.id,
        input: {
          image: videoPath,
          scale: scaleFactor,
          face_enhance: options.enhanceFaces || false
        }
      });
      
      const result = await this.waitForCompletion(prediction.id);
      
      logger.info('Video upscaling completed', {
        predictionId: prediction.id,
        status: result.status
      });
      
      return {
        success: true,
        outputUrl: result.output,
        predictionId: prediction.id,
        processingTime: result.completed_at - result.created_at
      };
      
    } catch (error) {
      logger.error('Video upscaling failed', {
        error: error.message,
        videoPath,
        scaleFactor
      });
      throw new Error(`Video upscaling failed: ${error.message}`);
    }
  }
  
  async styleTransfer(videoPath, styleType, options = {}) {
    try {
      logger.info('Starting style transfer', { videoPath, styleType });
      
      const stylePrompts = {
        cartoon: 'cartoon style, animated, colorful',
        oil_painting: 'oil painting style, artistic, textured',
        watercolor: 'watercolor painting, soft, flowing',
        sketch: 'pencil sketch, black and white, artistic',
        cyberpunk: 'cyberpunk style, neon, futuristic',
        vintage: 'vintage film style, retro, aged'
      };
      
      const prediction = await this.client.predictions.create({
        version: this.models.styleTransfer.id,
        input: {
          video: videoPath,
          prompt: stylePrompts[styleType] || styleType,
          strength: options.intensity || 0.7,
          guidance_scale: options.guidanceScale || 7.5
        }
      });
      
      const result = await this.waitForCompletion(prediction.id);
      
      logger.info('Style transfer completed', {
        predictionId: prediction.id,
        styleType,
        status: result.status
      });
      
      return {
        success: true,
        outputUrl: result.output,
        predictionId: prediction.id,
        style: styleType,
        processingTime: result.completed_at - result.created_at
      };
      
    } catch (error) {
      logger.error('Style transfer failed', {
        error: error.message,
        videoPath,
        styleType
      });
      throw new Error(`Style transfer failed: ${error.message}`);
    }
  }
  
  async enhanceFaces(videoPath, options = {}) {
    try {
      logger.info('Starting face enhancement', { videoPath });
      
      const prediction = await this.client.predictions.create({
        version: this.models.faceEnhancement.id,
        input: {
          img: videoPath,
          version: options.version || 'v1.4',
          scale: options.scale || 2
        }
      });
      
      const result = await this.waitForCompletion(prediction.id);
      
      logger.info('Face enhancement completed', {
        predictionId: prediction.id,
        status: result.status
      });
      
      return {
        success: true,
        outputUrl: result.output,
        predictionId: prediction.id,
        processingTime: result.completed_at - result.created_at
      };
      
    } catch (error) {
      logger.error('Face enhancement failed', {
        error: error.message,
        videoPath
      });
      throw new Error(`Face enhancement failed: ${error.message}`);
    }
  }
  
  async removeBackground(videoPath, options = {}) {
    try {
      logger.info('Starting background removal', { videoPath });
      
      const prediction = await this.client.predictions.create({
        version: this.models.backgroundRemoval.id,
        input: {
          image: videoPath,
          model: options.model || 'u2net',
          alpha_matting: options.alphaMatting || false
        }
      });
      
      const result = await this.waitForCompletion(prediction.id);
      
      logger.info('Background removal completed', {
        predictionId: prediction.id,
        status: result.status
      });
      
      return {
        success: true,
        outputUrl: result.output,
        predictionId: prediction.id,
        processingTime: result.completed_at - result.created_at
      };
      
    } catch (error) {
      logger.error('Background removal failed', {
        error: error.message,
        videoPath
      });
      throw new Error(`Background removal failed: ${error.message}`);
    }
  }
  
  async colorizeVideo(videoPath, options = {}) {
    try {
      logger.info('Starting video colorization', { videoPath });
      
      const prediction = await this.client.predictions.create({
        version: this.models.colorization.id,
        input: {
          image: videoPath,
          model_name: options.model || 'artistic',
          render_factor: options.renderFactor || 35
        }
      });
      
      const result = await this.waitForCompletion(prediction.id);
      
      logger.info('Video colorization completed', {
        predictionId: prediction.id,
        status: result.status
      });
      
      return {
        success: true,
        outputUrl: result.output,
        predictionId: prediction.id,
        processingTime: result.completed_at - result.created_at
      };
      
    } catch (error) {
      logger.error('Video colorization failed', {
        error: error.message,
        videoPath
      });
      throw new Error(`Video colorization failed: ${error.message}`);
    }
  }
  
  async waitForCompletion(predictionId, maxWaitTime = 300000) { // 5 minutes max
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const prediction = await this.client.predictions.get(predictionId);
        
        if (prediction.status === 'succeeded') {
          return prediction;
        }
        
        if (prediction.status === 'failed') {
          throw new Error(`Prediction failed: ${prediction.error}`);
        }
        
        if (prediction.status === 'canceled') {
          throw new Error('Prediction was canceled');
        }
        
        // Still processing, wait and check again
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        if (error.message.includes('Prediction failed') || 
            error.message.includes('canceled')) {
          throw error;
        }
        
        // Network error, retry
        logger.warn('Error checking prediction status, retrying', {
          predictionId,
          error: error.message
        });
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    throw new Error(`Prediction timed out after ${maxWaitTime}ms`);
  }
  
  async cancelPrediction(predictionId) {
    try {
      await this.client.predictions.cancel(predictionId);
      logger.info('Prediction canceled', { predictionId });
      return true;
    } catch (error) {
      logger.error('Failed to cancel prediction', {
        predictionId,
        error: error.message
      });
      return false;
    }
  }
  
  async getModelInfo(modelType) {
    const model = this.models[modelType];
    if (!model) {
      throw new Error(`Unknown model type: ${modelType}`);
    }
    
    try {
      const modelInfo = await this.client.models.get(model.id);
      return {
        ...model,
        details: modelInfo
      };
    } catch (error) {
      logger.error('Failed to get model info', {
        modelType,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = ReplicateService;
```

## 🎙️ ElevenLabs Voice Synthesis

### ElevenLabs Service Implementation

```javascript
// services/elevenLabsService.js
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const aiConfig = require('../config/aiServices');

class ElevenLabsService {
  constructor() {
    this.apiKey = aiConfig.elevenlabs.apiKey;
    this.baseURL = 'https://api.elevenlabs.io/v1';
    this.timeout = aiConfig.elevenlabs.timeout;
    
    this.voices = {
      professional_male: '21m00Tcm4TlvDq8ikWAM',
      professional_female: 'AZnzlk1XvdvUeBnXmlld',
      casual_male: 'pNInz6obpgDQGcFmaJgB',
      casual_female: 'XB0fDUnXU5powFXDhCwa',
      narrator_male: 'onwK4e9ZLuTAKqWW03F9',
      narrator_female: 'oWAxZDx7w5VEj9dCyTzz',
      child_voice: 'ThT5KcBeYPX3keUQqHPh',
      elderly_male: 'ZQe5CqHNLWdVhrnuHIhO',
      elderly_female: 'pFGYVqjYTHWd6gLDizzi'
    };
    
    this.models = {
      multilingual: 'eleven_multilingual_v2',
      monolingual: 'eleven_monolingual_v1',
      turbo: 'eleven_turbo_v2'
    };
  }
  
  async textToSpeech(text, voiceId = 'professional_male', options = {}) {
    try {
      logger.info('Starting text-to-speech generation', {
        textLength: text.length,
        voiceId,
        options
      });
      
      // Resolve voice ID if it's a name
      const resolvedVoiceId = this.voices[voiceId] || voiceId;
      
      const requestData = {
        text: text,
        model_id: options.model || this.models.multilingual,
        voice_settings: {
          stability: options.stability || 0.5,
          similarity_boost: options.similarity_boost || 0.5,
          style: options.style || 0.0,
          use_speaker_boost: options.use_speaker_boost || true
        }
      };
      
      const response = await axios.post(
        `${this.baseURL}/text-to-speech/${resolvedVoiceId}`,
        requestData,
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer',
          timeout: this.timeout
        }
      );
      
      // Save audio file
      const filename = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
      const filepath = path.join(__dirname, '../../uploads/audio', filename);
      
      await fs.writeFile(filepath, response.data);
      
      logger.info('Text-to-speech generation completed', {
        filename,
        fileSize: response.data.length,
        voiceId: resolvedVoiceId
      });
      
      return {
        success: true,
        filename,
        filepath,
        size: response.data.length,
        voiceId: resolvedVoiceId,
        duration: this.estimateAudioDuration(text),
        url: `/uploads/audio/${filename}`
      };
      
    } catch (error) {
      logger.error('Text-to-speech generation failed', {
        error: error.message,
        voiceId,
        textLength: text.length
      });
      
      if (error.response) {
        const errorData = error.response.data;
        throw new Error(`ElevenLabs API error: ${errorData.detail || error.message}`);
      }
      
      throw new Error(`Text-to-speech failed: ${error.message}`);
    }
  }
  
  async getVoices() {
    try {
      const response = await axios.get(`${this.baseURL}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        },
        timeout: this.timeout
      });
      
      const voices = response.data.voices.map(voice => ({
        id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description,
        preview_url: voice.preview_url,
        available_for_tiers: voice.available_for_tiers,
        settings: voice.settings
      }));
      
      logger.info('Retrieved available voices', { count: voices.length });
      
      return {
        success: true,
        voices,
        predefined: this.voices
      };
      
    } catch (error) {
      logger.error('Failed to retrieve voices', { error: error.message });
      throw new Error(`Failed to get voices: ${error.message}`);
    }
  }
  
  async cloneVoice(name, description, files) {
    try {
      logger.info('Starting voice cloning', { name, filesCount: files.length });
      
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      
      // Add audio files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        formData.append('files', file.buffer, file.originalname);
      }
      
      const response = await axios.post(
        `${this.baseURL}/voices/add`,
        formData,
        {
          headers: {
            'xi-api-key': this.apiKey,
            ...formData.getHeaders()
          },
          timeout: 120000 // 2 minutes for voice cloning
        }
      );
      
      logger.info('Voice cloning completed', {
        voiceId: response.data.voice_id,
        name
      });
      
      return {
        success: true,
        voiceId: response.data.voice_id,
        name,
        description
      };
      
    } catch (error) {
      logger.error('Voice cloning failed', {
        error: error.message,
        name
      });
      throw new Error(`Voice cloning failed: ${error.message}`);
    }
  }
  
  async deleteVoice(voiceId) {
    try {
      await axios.delete(`${this.baseURL}/voices/${voiceId}`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      
      logger.info('Voice deleted', { voiceId });
      return { success: true };
      
    } catch (error) {
      logger.error('Failed to delete voice', {
        voiceId,
        error: error.message
      });
      throw new Error(`Failed to delete voice: ${error.message}`);
    }
  }
  
  async getVoiceSettings(voiceId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/voices/${voiceId}/settings`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );
      
      return {
        success: true,
        settings: response.data
      };
      
    } catch (error) {
      logger.error('Failed to get voice settings', {
        voiceId,
        error: error.message
      });
      throw new Error(`Failed to get voice settings: ${error.message}`);
    }
  }
  
  async updateVoiceSettings(voiceId, settings) {
    try {
      const response = await axios.post(
        `${this.baseURL}/voices/${voiceId}/settings/edit`,
        settings,
        {
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          }
        }
      );
      
      logger.info('Voice settings updated', { voiceId });
      
      return {
        success: true,
        settings: response.data
      };
      
    } catch (error) {
      logger.error('Failed to update voice settings', {
        voiceId,
        error: error.message
      });
      throw new Error(`Failed to update voice settings: ${error.message}`);
    }
  }
  
  async getUserInfo() {
    try {
      const response = await axios.get(`${this.baseURL}/user`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      
      return {
        success: true,
        user: response.data
      };
      
    } catch (error) {
      logger.error('Failed to get user info', { error: error.message });
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }
  
  estimateAudioDuration(text) {
    // Rough estimation: average speaking rate is about 150 words per minute
    const words = text.split(' ').length;
    const wordsPerMinute = 150;
    const durationMinutes = words / wordsPerMinute;
    return Math.ceil(durationMinutes * 60); // Return duration in seconds
  }
  
  validateText(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }
    
    if (text.length > 5000) {
      throw new Error('Text must be less than 5000 characters');
    }
    
    return true;
  }
  
  getOptimalSettings(voiceType, contentType) {
    const settingsMap = {
      professional: {
        narration: { stability: 0.7, similarity_boost: 0.8, style: 0.2 },
        conversation: { stability: 0.5, similarity_boost: 0.7, style: 0.4 },
        announcement: { stability: 0.8, similarity_boost: 0.9, style: 0.1 }
      },
      casual: {
        narration: { stability: 0.4, similarity_boost: 0.6, style: 0.6 },
        conversation: { stability: 0.3, similarity_boost: 0.5, style: 0.8 },
        announcement: { stability: 0.6, similarity_boost: 0.7, style: 0.3 }
      },
      dramatic: {
        narration: { stability: 0.6, similarity_boost: 0.7, style: 0.8 },
        conversation: { stability: 0.4, similarity_boost: 0.6, style: 0.9 },
        announcement: { stability: 0.7, similarity_boost: 0.8, style: 0.6 }
      }
    };
    
    return settingsMap[voiceType]?.[contentType] || 
           { stability: 0.5, similarity_boost: 0.7, style: 0.5 };
  }
}

module.exports = ElevenLabsService;
```

## 🤖 Custom AI Models

### Local Model Integration

```javascript
// services/customAIService.js
const tf = require('@tensorflow/tfjs-node');
const logger = require('../utils/logger');

class CustomAIService {
  constructor() {
    this.models = new Map();
    this.modelPaths = {
      sceneDetection: './models/scene_detection_model',
      objectTracking: './models/object_tracking_model',
      qualityAssessment: './models/quality_assessment_model',
      smartCrop: './models/smart_crop_model'
    };
  }
  
  async loadModel(modelName) {
    try {
      if (this.models.has(modelName)) {
        return this.models.get(modelName);
      }
      
      const modelPath = this.modelPaths[modelName];
      if (!modelPath) {
        throw new Error(`Unknown model: ${modelName}`);
      }
      
      logger.info('Loading AI model', { modelName, modelPath });
      
      const model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
      this.models.set(modelName, model);
      
      logger.info('AI model loaded successfully', { modelName });
      return model;
      
    } catch (error) {
      logger.error('Failed to load AI model', {
        modelName,
        error: error.message
      });
      throw error;
    }
  }
  
  async detectScenes(videoFrames) {
    try {
      const model = await this.loadModel('sceneDetection');
      
      const predictions = [];
      for (const frame of videoFrames) {
        const tensor = tf.browser.fromPixels(frame)
          .resizeNearestNeighbor([224, 224])
          .expandDims(0)
          .div(255.0);
        
        const prediction = await model.predict(tensor).data();
        predictions.push({
          timestamp: frame.timestamp,
          sceneChange: prediction[0] > 0.5,
          confidence: prediction[0]
        });
        
        tensor.dispose();
      }
      
      return {
        success: true,
        scenes: this.groupScenes(predictions),
        totalScenes: predictions.filter(p => p.sceneChange).length
      };
      
    } catch (error) {
      logger.error('Scene detection failed', { error: error.message });
      throw error;
    }
  }
  
  async assessVideoQuality(videoMetadata, sampleFrames) {
    try {
      const model = await this.loadModel('qualityAssessment');
      
      const qualityScores = [];
      for (const frame of sampleFrames) {
        const tensor = tf.browser.fromPixels(frame)
          .resizeNearestNeighbor([256, 256])
          .expandDims(0)
          .div(255.0);
        
        const prediction = await model.predict(tensor).data();
        qualityScores.push(prediction[0]);
        
        tensor.dispose();
      }
      
      const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
      
      return {
        success: true,
        overallQuality: avgQuality,
        qualityGrade: this.getQualityGrade(avgQuality),
        recommendations: this.getQualityRecommendations(avgQuality, videoMetadata),
        frameScores: qualityScores
      };
      
    } catch (error) {
      logger.error('Quality assessment failed', { error: error.message });
      throw error;
    }
  }
  
  async smartCrop(frame, aspectRatio = '16:9') {
    try {
      const model = await this.loadModel('smartCrop');
      
      const tensor = tf.browser.fromPixels(frame)
        .resizeNearestNeighbor([512, 512])
        .expandDims(0)
        .div(255.0);
      
      const prediction = await model.predict(tensor).data();
      
      // Prediction returns [x, y, width, height] normalized coordinates
      const cropBox = {
        x: Math.round(prediction[0] * frame.width),
        y: Math.round(prediction[1] * frame.height),
        width: Math.round(prediction[2] * frame.width),
        height: Math.round(prediction[3] * frame.height)
      };
      
      // Adjust for aspect ratio
      const adjustedCrop = this.adjustCropForAspectRatio(cropBox, aspectRatio);
      
      tensor.dispose();
      
      return {
        success: true,
        cropBox: adjustedCrop,
        confidence: prediction[4] || 0.8
      };
      
    } catch (error) {
      logger.error('Smart crop failed', { error: error.message });
      throw error;
    }
  }
  
  groupScenes(predictions) {
    const scenes = [];
    let currentScene = { start: 0, end: 0, confidence: 0 };
    
    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i];
      
      if (pred.sceneChange && i > 0) {
        currentScene.end = predictions[i - 1].timestamp;
        scenes.push({ ...currentScene });
        currentScene = {
          start: pred.timestamp,
          end: pred.timestamp,
          confidence: pred.confidence
        };
      } else {
        currentScene.end = pred.timestamp;
        currentScene.confidence = Math.max(currentScene.confidence, pred.confidence);
      }
    }
    
    if (currentScene.start < currentScene.end) {
      scenes.push(currentScene);
    }
    
    return scenes;
  }
  
  getQualityGrade(score) {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.7) return 'Good';
    if (score >= 0.5) return 'Fair';
    if (score >= 0.3) return 'Poor';
    return 'Very Poor';
  }
  
  getQualityRecommendations(score, metadata) {
    const recommendations = [];
    
    if (score < 0.5) {
      recommendations.push('Consider upscaling the video for better quality');
      recommendations.push('Apply noise reduction filters');
    }
    
    if (score < 0.7) {
      recommendations.push('Enhance sharpness and contrast');
      recommendations.push('Consider color correction');
    }
    
    if (metadata.resolution && metadata.resolution.width < 1920) {
      recommendations.push('Upscale to HD resolution for better viewing experience');
    }
    
    if (metadata.bitrate && metadata.bitrate < 5000000) {
      recommendations.push('Increase bitrate for better quality');
    }
    
    return recommendations;
  }
  
  adjustCropForAspectRatio(cropBox, aspectRatio) {
    const [targetWidth, targetHeight] = aspectRatio.split(':').map(Number);
    const targetAspect = targetWidth / targetHeight;
    const currentAspect = cropBox.width / cropBox.height;
    
    if (Math.abs(currentAspect - targetAspect) < 0.1) {
      return cropBox; // Already close to target aspect ratio
    }
    
    let adjustedBox = { ...cropBox };
    
    if (currentAspect > targetAspect) {
      // Too wide, reduce width
      const newWidth = cropBox.height * targetAspect;
      adjustedBox.width = newWidth;
      adjustedBox.x += (cropBox.width - newWidth) / 2;
    } else {
      // Too tall, reduce height
      const newHeight = cropBox.width / targetAspect;
      adjustedBox.height = newHeight;
      adjustedBox.y += (cropBox.height - newHeight) / 2;
    }
    
    return adjustedBox;
  }
}

module.exports = CustomAIService;
```

## 💬 Conversational AI Assistant

### Chat Interface Implementation

```javascript
// services/conversationalAI.js
const OpenAIService = require('./openaiService');
const VideoService = require('./videoService');
const logger = require('../utils/logger');

class ConversationalAI {
  constructor() {
    this.openai = new OpenAIService();
    this.videoService = new VideoService();
    this.conversationHistory = new Map();
    this.activeCommands = new Map();
  }
  
  async processMessage(userId, message, context = {}) {
    try {
      logger.info('Processing conversational message', {
        userId,
        messageLength: message.length,
        hasContext: Object.keys(context).length > 0
      });
      
      // Get conversation history
      const history = this.getConversationHistory(userId);
      
      // Add current message to history
      history.push({
        role: 'user',
        content: message,
        timestamp: Date.now(),
        context
      });
      
      // Process with OpenAI
      const aiResponse = await this.openai.processMessage(message, {
        ...context,
        conversationHistory: history.slice(-10) // Last 10 messages for context
      });
      
      // Execute any actions
      const executionResults = await this.executeActions(aiResponse.actions, context);
      
      // Generate final response
      const finalResponse = await this.generateResponse(aiResponse, executionResults);
      
      // Add AI response to history
      history.push({
        role: 'assistant',
        content: finalResponse.message,
        timestamp: Date.now(),
        actions: aiResponse.actions,
        results: executionResults
      });
      
      // Update conversation history
      this.updateConversationHistory(userId, history);
      
      logger.info('Conversational message processed', {
        userId,
        actionsExecuted: aiResponse.actions.length,
        responseLength: finalResponse.message.length
      });
      
      return finalResponse;
      
    } catch (error) {
      logger.error('Conversational AI processing failed', {
        userId,
        error: error.message
      });
      
      return {
        success: false,
        message: "I'm sorry, I encountered an error processing your request. Please try again.",
        error: error.message
      };
    }
  }
  
  async executeActions(actions, context) {
    const results = [];
    
    for (const action of actions) {
      try {
        logger.info('Executing AI action', {
          type: action.type,
          confidence: action.confidence
        });
        
        let result;
        switch (action.type) {
          case 'trim_video':
            result = await this.videoService.trimVideo(
              context.videoId,
              action.parameters.startTime,
              action.parameters.endTime
            );
            break;
            
          case 'apply_filter':
            result = await this.videoService.applyFilter(
              context.videoId,
              action.parameters.filterType,
              action.parameters.intensity
            );
            break;
            
          case 'add_text':
            result = await this.videoService.addTextOverlay(
              context.videoId,
              action.parameters
            );
            break;
            
          case 'crop_video':
            result = await this.videoService.cropVideo(
              context.videoId,
              action.parameters
            );
            break;
            
          case 'enhance_audio':
            result = await this.videoService.enhanceAudio(
              context.videoId,
              action.parameters.type,
              action.parameters.intensity
            );
            break;
            
          case 'generate_voice':
            result = await this.generateVoiceNarration(
              action.parameters.text,
              action.parameters.voice,
              action.parameters.speed
            );
            break;
            
          default:
            result = {
              success: false,
              error: `Unknown action type: ${action.type}`
            };
        }
        
        results.push({
          action: action.type,
          success: result.success,
          result,
          confidence: action.confidence
        });
        
      } catch (error) {
        logger.error('Action execution failed', {
          action: action.type,
          error: error.message
        });
        
        results.push({
          action: action.type,
          success: false,
          error: error.message,
          confidence: action.confidence
        });
      }
    }
    
    return results;
  }
  
  async generateResponse(aiResponse, executionResults) {
    const successfulActions = executionResults.filter(r => r.success);
    const failedActions = executionResults.filter(r => !r.success);
    
    let message = aiResponse.response;
    
    if (successfulActions.length > 0) {
      message += `\n\n✅ Successfully completed: ${successfulActions.map(a => a.action).join(', ')}`;
    }
    
    if (failedActions.length > 0) {
      message += `\n\n❌ Failed to complete: ${failedActions.map(a => a.action).join(', ')}`;
      message += "\nPlease check your video and try again.";
    }
    
    // Add suggestions based on context
    const suggestions = await this.generateSuggestions(executionResults);
    if (suggestions.length > 0) {
      message += `\n\n💡 Suggestions: ${suggestions.join(', ')}`;
    }
    
    return {
      success: true,
      message,
      actions: aiResponse.actions,
      results: executionResults,
      suggestions
    };
  }
  
  async generateSuggestions(executionResults) {
    const suggestions = [];
    
    // Analyze execution results to provide helpful suggestions
    const actionTypes = executionResults.map(r => r.action);
    
    if (actionTypes.includes('trim_video')) {
      suggestions.push('Consider adding transitions between clips');
    }
    
    if (actionTypes.includes('apply_filter')) {
      suggestions.push('Try adjusting the filter intensity for better results');
    }
    
    if (actionTypes.includes('add_text')) {
      suggestions.push('You can animate text overlays for more dynamic content');
    }
    
    if (actionTypes.includes('enhance_audio')) {
      suggestions.push('Consider adding background music to enhance the audio experience');
    }
    
    return suggestions;
  }
  
  getConversationHistory(userId) {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }
    return this.conversationHistory.get(userId);
  }
  
  updateConversationHistory(userId, history) {
    // Keep only last 50 messages to prevent memory issues
    const trimmedHistory = history.slice(-50);
    this.conversationHistory.set(userId, trimmedHistory);
  }
  
  clearConversationHistory(userId) {
    this.conversationHistory.delete(userId);
    logger.info('Conversation history cleared', { userId });
  }
  
  async generateVoiceNarration(text, voice, speed = 1.0) {
    try {
      const ElevenLabsService = require('./elevenLabsService');
      const elevenlabs = new ElevenLabsService();
      
      const result = await elevenlabs.textToSpeech(text, voice, {
        speed,
        stability: 0.7,
        similarity_boost: 0.8
      });
      
      return {
        success: true,
        audioUrl: result.url,
        duration: result.duration,
        filename: result.filename
      };
      
    } catch (error) {
      logger.error('Voice narration generation failed', {
        error: error.message,
        textLength: text.length
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ConversationalAI;
```

## 🔍 Smart Video Analysis

### Video Analysis Service

```javascript
// services/videoAnalysisService.js
const CustomAIService = require('./customAIService');
const OpenAIService = require('./openaiService');
const logger = require('../utils/logger');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

class VideoAnalysisService {
  constructor() {
    this.customAI = new CustomAIService();
    this.openai = new OpenAIService();
  }
  
  async analyzeVideo(videoPath, options = {}) {
    try {
      logger.info('Starting comprehensive video analysis', {
        videoPath,
        options
      });
      
      // Extract metadata
      const metadata = await this.extractMetadata(videoPath);
      
      // Extract sample frames
      const frames = await this.extractFrames(videoPath, options.frameCount || 10);
      
      // Perform various analyses
      const [qualityAnalysis, sceneAnalysis, contentAnalysis] = await Promise.all([
        this.analyzeQuality(metadata, frames),
        this.analyzeScenes(frames),
        this.analyzeContent(metadata, frames)
      ]);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations({
        metadata,
        quality: qualityAnalysis,
        scenes: sceneAnalysis,
        content: contentAnalysis
      });
      
      const result = {
        success: true,
        metadata,
        analysis: {
          quality: qualityAnalysis,
          scenes: sceneAnalysis,
          content: contentAnalysis
        },
        recommendations,
        timestamp: Date.now()
      };
      
      logger.info('Video analysis completed', {
        videoPath,
        qualityGrade: qualityAnalysis.qualityGrade,
        sceneCount: sceneAnalysis.totalScenes,
        recommendationCount: recommendations.length
      });
      
      return result;
      
    } catch (error) {
      logger.error('Video analysis failed', {
        videoPath,
        error: error.message
      });
      throw error;
    }
  }
  
  async extractMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
        
        resolve({
          duration: parseFloat(metadata.format.duration),
          size: parseInt(metadata.format.size),
          bitrate: parseInt(metadata.format.bit_rate),
          format: metadata.format.format_name,
          video: videoStream ? {
            codec: videoStream.codec_name,
            width: videoStream.width,
            height: videoStream.height,
            fps: eval(videoStream.r_frame_rate),
            bitrate: parseInt(videoStream.bit_rate) || 0,
            pixelFormat: videoStream.pix_fmt
          } : null,
          audio: audioStream ? {
            codec: audioStream.codec_name,
            sampleRate: parseInt(audioStream.sample_rate),
            channels: audioStream.channels,
            bitrate: parseInt(audioStream.bit_rate) || 0
          } : null
        });
      });
    });
  }
  
  async extractFrames(videoPath, count = 10) {
    return new Promise((resolve, reject) => {
      const frames = [];
      const outputDir = path.join(__dirname, '../../temp/frames');
      
      ffmpeg(videoPath)
        .screenshots({
          count,
          folder: outputDir,
          filename: 'frame_%i.png',
          size: '512x512'
        })
        .on('end', () => {
          // Load frame data (simplified - in real implementation, load actual image data)
          for (let i = 1; i <= count; i++) {
            frames.push({
              path: path.join(outputDir, `frame_${i}.png`),
              timestamp: (i - 1) * (100 / count), // Approximate timestamp
              index: i - 1
            });
          }
          resolve(frames);
        })
        .on('error', reject);
    });
  }
  
  async analyzeQuality(metadata, frames) {
    try {
      // Use custom AI model for quality assessment
      const qualityResult = await this.customAI.assessVideoQuality(metadata, frames);
      
      // Additional quality checks
      const qualityFactors = {
        resolution: this.assessResolution(metadata.video),
        bitrate: this.assessBitrate(metadata.bitrate, metadata.video),
        fps: this.assessFrameRate(metadata.video.fps),
        codec: this.assessCodec(metadata.video.codec),
        audio: this.assessAudioQuality(metadata.audio)
      };
      
      return {
        ...qualityResult,
        factors: qualityFactors,
        overallScore: this.calculateOverallQuality(qualityResult, qualityFactors)
      };
      
    } catch (error) {
      logger.error('Quality analysis failed', { error: error.message });
      return {
        success: false,
        error: error.message,
        overallQuality: 0.5,
        qualityGrade: 'Unknown'
      };
    }
  }
  
  async analyzeScenes(frames) {
    try {
      return await this.customAI.detectScenes(frames);
    } catch (error) {
      logger.error('Scene analysis failed', { error: error.message });
      return {
        success: false,
        scenes: [],
        totalScenes: 0,
        error: error.message
      };
    }
  }
  
  async analyzeContent(metadata, frames) {
    try {
      // Use OpenAI for content analysis
      const contentPrompt = `Analyze this video content based on the metadata and describe:
      1. Content type (e.g., tutorial, vlog, presentation, entertainment)
      2. Visual style and aesthetics
      3. Suggested improvements
      4. Target audience
      5. Optimal editing approach
      
      Metadata: ${JSON.stringify(metadata, null, 2)}`;
      
      const analysis = await this.openai.analyzeVideo(metadata, frames);
      
      return {
        success: true,
        ...analysis,
        contentType: this.detectContentType(metadata),
        complexity: this.assessComplexity(metadata, frames)
      };
      
    } catch (error) {
      logger.error('Content analysis failed', { error: error.message });
      return {
        success: false,
        error: error.message,
        contentType: 'unknown',
        complexity: 'medium'
      };
    }
  }
  
  async generateRecommendations(analysisData) {
    const recommendations = [];
    
    // Quality-based recommendations
    if (analysisData.quality.overallQuality < 0.7) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        title: 'Improve Video Quality',
        description: 'Your video quality could be enhanced',
        actions: ['upscale', 'denoise', 'sharpen'],
        confidence: 0.9
      });
    }
    
    // Scene-based recommendations
    if (analysisData.scenes.totalScenes > 10) {
      recommendations.push({
        type: 'editing',
        priority: 'medium',
        title: 'Consider Scene Transitions',
        description: 'Add smooth transitions between your many scenes',
        actions: ['add_transitions', 'scene_smoothing'],
        confidence: 0.8
      });
    }
    
    // Content-based recommendations
    if (analysisData.content.contentType === 'tutorial') {
      recommendations.push({
        type: 'content',
        priority: 'medium',
        title: 'Tutorial Enhancements',
        description: 'Add captions and highlight important sections',
        actions: ['add_subtitles', 'highlight_sections'],
        confidence: 0.85
      });
    }
    
    // Technical recommendations
    if (analysisData.metadata.video && analysisData.metadata.video.width < 1920) {
      recommendations.push({
        type: 'technical',
        priority: 'low',
        title: 'Resolution Enhancement',
        description: 'Upscale to HD for better viewing experience',
        actions: ['upscale_hd'],
        confidence: 0.7
      });
    }
    
    return recommendations;
  }
  
  assessResolution(videoInfo) {
    if (!videoInfo) return { score: 0, grade: 'Unknown' };
    
    const pixels = videoInfo.width * videoInfo.height;
    
    if (pixels >= 3840 * 2160) return { score: 1.0, grade: '4K' };
    if (pixels >= 1920 * 1080) return { score: 0.9, grade: 'Full HD' };
    if (pixels >= 1280 * 720) return { score: 0.7, grade: 'HD' };
    if (pixels >= 854 * 480) return { score: 0.5, grade: 'SD' };
    return { score: 0.3, grade: 'Low' };
  }
  
  assessBitrate(bitrate, videoInfo) {
    if (!bitrate || !videoInfo) return { score: 0.5, grade: 'Unknown' };
    
    const pixels = videoInfo.width * videoInfo.height;
    const expectedBitrate = pixels * videoInfo.fps * 0.1; // Rough estimation
    
    const ratio = bitrate / expectedBitrate;
    
    if (ratio >= 1.5) return { score: 1.0, grade: 'Excellent' };
    if (ratio >= 1.0) return { score: 0.8, grade: 'Good' };
    if (ratio >= 0.7) return { score: 0.6, grade: 'Fair' };
    return { score: 0.4, grade: 'Low' };
  }
  
  assessFrameRate(fps) {
    if (!fps) return { score: 0.5, grade: 'Unknown' };
    
    if (fps >= 60) return { score: 1.0, grade: 'High' };
    if (fps >= 30) return { score: 0.8, grade: 'Standard' };
    if (fps >= 24) return { score: 0.6, grade: 'Cinematic' };
    return { score: 0.4, grade: 'Low' };
  }
  
  assessCodec(codec) {
    const codecScores = {
      'h264': 0.8,
      'h265': 1.0,
      'vp9': 0.9,
      'av1': 1.0,
      'mpeg4': 0.5,
      'mpeg2': 0.3
    };
    
    const score = codecScores[codec?.toLowerCase()] || 0.5;
    return {
      score,
      grade: score >= 0.8 ? 'Modern' : score >= 0.6 ? 'Standard' : 'Legacy'
    };
  }
  
  assessAudioQuality(audioInfo) {
    if (!audioInfo) return { score: 0, grade: 'No Audio' };
    
    let score = 0.5;
    
    if (audioInfo.sampleRate >= 48000) score += 0.2;
    else if (audioInfo.sampleRate >= 44100) score += 0.1;
    
    if (audioInfo.channels >= 2) score += 0.1;
    if (audioInfo.bitrate >= 320000) score += 0.2;
    else if (audioInfo.bitrate >= 128000) score += 0.1;
    
    return {
      score: Math.min(score, 1.0),
      grade: score >= 0.8 ? 'High' : score >= 0.6 ? 'Good' : 'Standard'
    };
  }
  
  calculateOverallQuality(aiQuality, factors) {
    const weights = {
      ai: 0.4,
      resolution: 0.2,
      bitrate: 0.15,
      fps: 0.1,
      codec: 0.1,
      audio: 0.05
    };
    
    return (
      aiQuality.overallQuality * weights.ai +
      factors.resolution.score * weights.resolution +
      factors.bitrate.score * weights.bitrate +
      factors.fps.score * weights.fps +
      factors.codec.score * weights.codec +
      factors.audio.score * weights.audio
    );
  }
  
  detectContentType(metadata) {
    // Simple heuristics for content type detection
    const duration = metadata.duration;
    const aspectRatio = metadata.video ? metadata.video.width / metadata.video.height : 1;
    
    if (duration < 60) return 'short_form';
    if (duration > 3600) return 'long_form';
    if (aspectRatio > 1.5) return 'cinematic';
    if (aspectRatio < 0.8) return 'vertical';
    return 'standard';
  }
  
  assessComplexity(metadata, frames) {
    // Assess editing complexity based on various factors
    let complexity = 0;
    
    if (metadata.duration > 600) complexity += 1; // Long videos are more complex
    if (frames.length > 20) complexity += 1; // Many scenes
    if (metadata.video && metadata.video.width > 1920) complexity += 1; // High resolution
    
    if (complexity >= 2) return 'high';
    if (complexity >= 1) return 'medium';
    return 'low';
  }
}

module.exports = VideoAnalysisService;
```

## 🚀 Performance Optimization

### AI Service Optimization

```javascript
// utils/aiOptimization.js
const NodeCache = require('node-cache');
const logger = require('./logger');

class AIOptimization {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache
    this.requestQueue = new Map();
    this.rateLimits = {
      openai: { requests: 60, window: 60000 }, // 60 requests per minute
      replicate: { requests: 100, window: 60000 },
      elevenlabs: { requests: 120, window: 60000 }
    };
  }
  
  async optimizeRequest(service, operation, params) {
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(service, operation, params);
      
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.info('AI request served from cache', {
          service,
          operation,
          cacheKey
        });
        return cached;
      }
      
      // Apply rate limiting
      await this.applyRateLimit(service);
      
      // Execute request
      const result = await this.executeRequest(service, operation, params);
      
      // Cache successful results
      if (result.success) {
        this.cache.set(cacheKey, result);
      }
      
      return result;
      
    } catch (error) {
      logger.error('AI request optimization failed', {
        service,
        operation,
        error: error.message
      });
      throw error;
    }
  }
  
  generateCacheKey(service, operation, params) {
    const hash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify({ service, operation, params }))
      .digest('hex');
    return `ai_${service}_${operation}_${hash}`;
  }
  
  async applyRateLimit(service) {
    const limit = this.rateLimits[service];
    if (!limit) return;
    
    const now = Date.now();
    const windowStart = now - limit.window;
    
    // Clean old requests
    const requests = this.requestQueue.get(service) || [];
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= limit.requests) {
      const waitTime = recentRequests[0] + limit.window - now;
      logger.warn('Rate limit reached, waiting', {
        service,
        waitTime,
        requestCount: recentRequests.length
      });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Add current request
    recentRequests.push(now);
    this.requestQueue.set(service, recentRequests);
  }
  
  async executeRequest(service, operation, params) {
    // This would be implemented to call the actual AI service
    // Implementation depends on the specific service and operation
    throw new Error('executeRequest must be implemented by specific service');
  }
  
  // Batch processing for multiple requests
  async batchProcess(requests) {
    const batches = this.createBatches(requests, 5); // Process 5 at a time
    const results = [];
    
    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(req => this.optimizeRequest(req.service, req.operation, req.params))
      );
      
      results.push(...batchResults.map((result, index) => ({
        request: batch[index],
        result: result.status === 'fulfilled' ? result.value : { error: result.reason }
      })));
    }
    
    return results;
  }
  
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
  
  // Memory management for AI models
  async manageModelMemory() {
    const memoryUsage = process.memoryUsage();
    const threshold = 1024 * 1024 * 1024; // 1GB threshold
    
    if (memoryUsage.heapUsed > threshold) {
      logger.warn('High memory usage detected, cleaning up', {
        heapUsed: memoryUsage.heapUsed,
        threshold
      });
      
      // Clear cache
      this.cache.flushAll();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  }
}

module.exports = AIOptimization;
```

### Model Loading Optimization

```javascript
// utils/modelLoader.js
const tf = require('@tensorflow/tfjs-node');
const logger = require('./logger');

class ModelLoader {
  constructor() {
    this.loadedModels = new Map();
    this.loadingPromises = new Map();
    this.modelMetrics = new Map();
  }
  
  async loadModel(modelPath, options = {}) {
    const modelKey = `${modelPath}_${JSON.stringify(options)}`;
    
    // Return already loaded model
    if (this.loadedModels.has(modelKey)) {
      return this.loadedModels.get(modelKey);
    }
    
    // Return loading promise if already loading
    if (this.loadingPromises.has(modelKey)) {
      return this.loadingPromises.get(modelKey);
    }
    
    // Start loading
    const loadingPromise = this._loadModelInternal(modelPath, options, modelKey);
    this.loadingPromises.set(modelKey, loadingPromise);
    
    try {
      const model = await loadingPromise;
      this.loadedModels.set(modelKey, model);
      this.loadingPromises.delete(modelKey);
      return model;
    } catch (error) {
      this.loadingPromises.delete(modelKey);
      throw error;
    }
  }
  
  async _loadModelInternal(modelPath, options, modelKey) {
    const startTime = Date.now();
    
    try {
      logger.info('Loading AI model', { modelPath, options });
      
      // Configure TensorFlow for optimal performance
      if (options.enableGPU && tf.getBackend() !== 'tensorflow') {
        await tf.setBackend('tensorflow');
      }
      
      // Load model with optimizations
      const model = await tf.loadLayersModel(`file://${modelPath}`, {
        strict: options.strict !== false,
        weightPathPrefix: options.weightPathPrefix
      });
      
      // Warm up the model
      if (options.warmup !== false) {
        await this._warmupModel(model, options.inputShape);
      }
      
      const loadTime = Date.now() - startTime;
      
      // Store metrics
      this.modelMetrics.set(modelKey, {
        loadTime,
        memoryUsage: this._getModelMemoryUsage(model),
        lastUsed: Date.now()
      });
      
      logger.info('AI model loaded successfully', {
        modelPath,
        loadTime,
        modelSize: model.countParams()
      });
      
      return model;
      
    } catch (error) {
      logger.error('Failed to load AI model', {
        modelPath,
        error: error.message,
        loadTime: Date.now() - startTime
      });
      throw error;
    }
  }
  
  async _warmupModel(model, inputShape) {
    if (!inputShape) return;
    
    try {
      // Create dummy input for warmup
      const dummyInput = tf.randomNormal(inputShape);
      await model.predict(dummyInput);
      dummyInput.dispose();
      
      logger.info('Model warmup completed', { inputShape });
    } catch (error) {
      logger.warn('Model warmup failed', { error: error.message });
    }
  }
  
  _getModelMemoryUsage(model) {
    try {
      return model.countParams() * 4; // Approximate bytes (float32)
    } catch {
      return 0;
    }
  }
  
  // Unload unused models to free memory
  async cleanupUnusedModels(maxAge = 3600000) { // 1 hour
    const now = Date.now();
    const modelsToRemove = [];
    
    for (const [key, metrics] of this.modelMetrics.entries()) {
      if (now - metrics.lastUsed > maxAge) {
        modelsToRemove.push(key);
      }
    }
    
    for (const key of modelsToRemove) {
      const model = this.loadedModels.get(key);
      if (model) {
        model.dispose();
        this.loadedModels.delete(key);
        this.modelMetrics.delete(key);
        
        logger.info('Unloaded unused model', { modelKey: key });
      }
    }
    
    return modelsToRemove.length;
  }
  
  getModelStats() {
    const stats = {
      loadedModels: this.loadedModels.size,
      totalMemoryUsage: 0,
      models: []
    };
    
    for (const [key, metrics] of this.modelMetrics.entries()) {
      stats.totalMemoryUsage += metrics.memoryUsage;
      stats.models.push({
        key,
        ...metrics
      });
    }
    
    return stats;
  }
}

module.exports = ModelLoader;
```

## 🧪 Testing AI Implementation

### AI Service Testing

```javascript
// tests/ai/aiServices.test.js
const OpenAIService = require('../../services/openaiService');
const ReplicateService = require('../../services/replicateService');
const ElevenLabsService = require('../../services/elevenLabsService');
const CustomAIService = require('../../services/customAIService');

describe('AI Services', () => {
  let openaiService, replicateService, elevenLabsService, customAIService;
  
  beforeEach(() => {
    openaiService = new OpenAIService();
    replicateService = new ReplicateService();
    elevenLabsService = new ElevenLabsService();
    customAIService = new CustomAIService();
  });
  
  describe('OpenAI Service', () => {
    test('should analyze video content', async () => {
      const mockMetadata = {
        duration: 120,
        video: { width: 1920, height: 1080, fps: 30 }
      };
      
      const result = await openaiService.analyzeVideo(mockMetadata, []);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('recommendations');
    });
    
    test('should handle API errors gracefully', async () => {
      // Mock API failure
      jest.spyOn(openaiService, 'makeRequest').mockRejectedValue(
        new Error('API rate limit exceeded')
      );
      
      const result = await openaiService.analyzeVideo({}, []);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });
  });
  
  describe('Replicate Service', () => {
    test('should upscale video successfully', async () => {
      const mockVideoUrl = 'https://example.com/video.mp4';
      
      // Mock successful prediction
      jest.spyOn(replicateService, 'createPrediction').mockResolvedValue({
        id: 'pred_123',
        status: 'succeeded',
        output: 'https://example.com/upscaled.mp4'
      });
      
      const result = await replicateService.upscaleVideo(mockVideoUrl, 2);
      
      expect(result.success).toBe(true);
      expect(result.outputUrl).toBeDefined();
    });
    
    test('should handle prediction failures', async () => {
      jest.spyOn(replicateService, 'createPrediction').mockResolvedValue({
        id: 'pred_456',
        status: 'failed',
        error: 'Processing failed'
      });
      
      const result = await replicateService.upscaleVideo('invalid-url', 2);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Processing failed');
    });
  });
  
  describe('ElevenLabs Service', () => {
    test('should generate speech from text', async () => {
      const text = 'Hello, this is a test narration.';
      const voiceId = 'voice_123';
      
      const result = await elevenLabsService.textToSpeech(text, voiceId);
      
      expect(result.success).toBe(true);
      expect(result.audioUrl).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
    
    test('should validate text length', async () => {
      const longText = 'a'.repeat(10000); // Very long text
      
      const result = await elevenLabsService.textToSpeech(longText, 'voice_123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Text too long');
    });
  });
  
  describe('Custom AI Service', () => {
    test('should detect scenes in video frames', async () => {
      const mockFrames = [
        { timestamp: 0, width: 640, height: 480 },
        { timestamp: 30, width: 640, height: 480 },
        { timestamp: 60, width: 640, height: 480 }
      ];
      
      const result = await customAIService.detectScenes(mockFrames);
      
      expect(result.success).toBe(true);
      expect(result.scenes).toBeInstanceOf(Array);
      expect(result.totalScenes).toBeGreaterThanOrEqual(0);
    });
    
    test('should assess video quality', async () => {
      const mockMetadata = {
        resolution: { width: 1920, height: 1080 },
        bitrate: 5000000
      };
      const mockFrames = [{ width: 1920, height: 1080 }];
      
      const result = await customAIService.assessVideoQuality(mockMetadata, mockFrames);
      
      expect(result.success).toBe(true);
      expect(result.overallQuality).toBeGreaterThanOrEqual(0);
      expect(result.overallQuality).toBeLessThanOrEqual(1);
      expect(result.qualityGrade).toBeDefined();
    });
  });
});
```

### Integration Testing

```javascript
// tests/integration/aiWorkflow.test.js
const request = require('supertest');
const app = require('../../app');
const path = require('path');

describe('AI Workflow Integration', () => {
  const testVideoPath = path.join(__dirname, '../fixtures/test-video.mp4');
  
  test('should complete full AI analysis workflow', async () => {
    // Upload video
    const uploadResponse = await request(app)
      .post('/api/upload')
      .attach('video', testVideoPath)
      .expect(200);
    
    const videoId = uploadResponse.body.videoId;
    
    // Start AI analysis
    const analysisResponse = await request(app)
      .post(`/api/ai/analyze/${videoId}`)
      .expect(200);
    
    expect(analysisResponse.body.success).toBe(true);
    expect(analysisResponse.body.analysisId).toBeDefined();
    
    // Check analysis status
    const statusResponse = await request(app)
      .get(`/api/ai/analysis/${analysisResponse.body.analysisId}/status`)
      .expect(200);
    
    expect(statusResponse.body.status).toMatch(/pending|processing|completed/);
  });
  
  test('should handle conversational AI requests', async () => {
    const message = 'Please trim my video from 10 seconds to 30 seconds';
    
    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        message,
        videoId: 'test-video-id',
        userId: 'test-user-id'
      })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBeDefined();
    expect(response.body.actions).toBeInstanceOf(Array);
  });
  
  test('should apply AI recommendations', async () => {
    const recommendations = [
      {
        type: 'quality',
        action: 'upscale',
        parameters: { factor: 2 }
      }
    ];
    
    const response = await request(app)
      .post('/api/ai/apply-recommendations')
      .send({
        videoId: 'test-video-id',
        recommendations
      })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.results).toBeInstanceOf(Array);
  });
});
```

## 🚀 Deployment

### Environment Configuration

```bash
# Production Environment Variables
NODE_ENV=production

# AI Service API Keys
OPENAI_API_KEY=your_openai_api_key
REPLICATE_API_TOKEN=your_replicate_token
ELEVENLABS_API_KEY=your_elevenlabs_key

# AI Service Configuration
AI_REQUEST_TIMEOUT=30000
AI_MAX_RETRIES=3
AI_CACHE_TTL=3600

# Model Configuration
CUSTOM_MODELS_PATH=/app/models
MODEL_CACHE_SIZE=1000
MODEL_MEMORY_LIMIT=2048

# Performance Settings
AI_BATCH_SIZE=5
AI_CONCURRENT_REQUESTS=10
AI_RATE_LIMIT_ENABLED=true

# Monitoring
AI_METRICS_ENABLED=true
AI_LOGGING_LEVEL=info
```

### Docker Configuration

```dockerfile
# Dockerfile.ai
FROM node:18-alpine

# Install Python and TensorFlow dependencies
RUN apk add --no-cache python3 py3-pip build-base

# Install TensorFlow.js Node dependencies
RUN npm install -g @tensorflow/tfjs-node

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy AI models
COPY models/ ./models/

# Copy application code
COPY . .

# Set environment
ENV NODE_ENV=production
ENV TF_CPP_MIN_LOG_LEVEL=2

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
# k8s/ai-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vfxb-ai-service
  labels:
    app: vfxb-ai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vfxb-ai
  template:
    metadata:
      labels:
        app: vfxb-ai
    spec:
      containers:
      - name: ai-service
        image: vfxb/ai-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-secrets
              key: openai-api-key
        - name: REPLICATE_API_TOKEN
          valueFrom:
            secretKeyRef:
              name: ai-secrets
              key: replicate-token
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        volumeMounts:
        - name: model-storage
          mountPath: /app/models
      volumes:
      - name: model-storage
        persistentVolumeClaim:
          claimName: ai-models-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: vfxb-ai-service
spec:
  selector:
    app: vfxb-ai
  ports:
  - port: 80
    targetPort: 3001
  type: ClusterIP
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Model Loading Failures
```javascript
// Debug model loading issues
const debugModelLoading = async (modelPath) => {
  try {
    console.log('Checking model path:', modelPath);
    
    // Check if model files exist
    const fs = require('fs');
    const modelJsonPath = path.join(modelPath, 'model.json');
    
    if (!fs.existsSync(modelJsonPath)) {
      throw new Error(`Model file not found: ${modelJsonPath}`);
    }
    
    // Check model.json structure
    const modelConfig = JSON.parse(fs.readFileSync(modelJsonPath, 'utf8'));
    console.log('Model config:', modelConfig);
    
    // Verify weight files
    if (modelConfig.weightsManifest) {
      for (const manifest of modelConfig.weightsManifest) {
        for (const path of manifest.paths) {
          const weightPath = path.join(modelPath, path);
          if (!fs.existsSync(weightPath)) {
            throw new Error(`Weight file not found: ${weightPath}`);
          }
        }
      }
    }
    
    console.log('Model files verified successfully');
    
  } catch (error) {
    console.error('Model loading debug failed:', error.message);
    throw error;
  }
};
```

#### 2. API Rate Limiting
```javascript
// Handle API rate limits
const handleRateLimit = async (service, error) => {
  if (error.message.includes('rate limit')) {
    const waitTime = extractWaitTime(error.message) || 60000; // Default 1 minute
    
    logger.warn('Rate limit hit, implementing backoff', {
      service,
      waitTime,
      error: error.message
    });
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return true; // Indicate retry should be attempted
  }
  
  return false;
};

const extractWaitTime = (errorMessage) => {
  const match = errorMessage.match(/retry after (\d+) seconds?/i);
  return match ? parseInt(match[1]) * 1000 : null;
};
```

#### 3. Memory Management
```javascript
// Monitor and manage memory usage
const monitorMemory = () => {
  const usage = process.memoryUsage();
  const threshold = 1024 * 1024 * 1024; // 1GB
  
  logger.info('Memory usage', {
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`
  });
  
  if (usage.heapUsed > threshold) {
    logger.warn('High memory usage detected');
    
    // Trigger cleanup
    if (global.gc) {
      global.gc();
      logger.info('Garbage collection triggered');
    }
  }
};

// Run memory monitoring every 5 minutes
setInterval(monitorMemory, 5 * 60 * 1000);
```

### Debug Mode

```javascript
// Enable debug mode for AI services
const enableDebugMode = () => {
  process.env.AI_DEBUG = 'true';
  process.env.TF_CPP_MIN_LOG_LEVEL = '0'; // Show all TensorFlow logs
  
  // Override console methods to add timestamps
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog(`[${new Date().toISOString()}] [AI-DEBUG]`, ...args);
  };
  
  logger.info('AI debug mode enabled');
};

if (process.env.NODE_ENV === 'development') {
  enableDebugMode();
}
```

---

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Replicate API Guide](https://replicate.com/docs)
- [ElevenLabs API Reference](https://docs.elevenlabs.io/)
- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

---

**Built with ❤️ by the VFXB Team**