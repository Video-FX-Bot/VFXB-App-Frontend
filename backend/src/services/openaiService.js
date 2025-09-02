const OpenAI = require('openai');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/openai.log' })
  ]
});

class OpenAIService {
  constructor() {
    this.client = null;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Initialize the service and validate API key
   */
  async initialize() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        logger.warn('OPENAI_API_KEY not set - OpenAI features will be disabled');
        return false;
      }
      
      // Create the OpenAI client
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      // Skip API validation in local storage mode for faster startup
      if (process.env.USE_LOCAL_STORAGE === 'true') {
        logger.info('OpenAI service initialized in local storage mode');
        return true;
      }
      
      // Test the API key with a simple request
      await this.client.models.list();
      logger.info('OpenAI service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize OpenAI service:', error);
      throw error;
    }
  }

  /**
   * Chat completion with conversation context
   */
  async chatCompletion(messages, options = {}) {
    try {
      if (!this.client) {
        throw new Error('OpenAI service not initialized');
      }
      
      const {
        model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        temperature = 0.7,
        maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
        stream = false
      } = options;

      const response = await this.retryRequest(async () => {
        return await this.client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream
        });
      });

      logger.info('Chat completion successful', {
        model,
        messageCount: messages.length,
        tokensUsed: response.usage?.total_tokens
      });

      return {
        success: true,
        data: {
          message: response.choices[0].message,
          usage: response.usage,
          model: response.model
        }
      };
    } catch (error) {
      logger.error('Chat completion failed:', error);
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Analyze video content using GPT-4 Vision
   */
  async analyzeVideo(videoMetadata, frames = []) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are a professional video editor AI assistant. Analyze the provided video content and provide insights about:
          - Scene composition and visual elements
          - Suggested cuts and transitions
          - Color grading recommendations
          - Audio sync suggestions
          - Overall editing recommendations`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this video with the following metadata: ${JSON.stringify(videoMetadata)}`
            },
            ...frames.map(frame => ({
              type: 'image_url',
              image_url: {
                url: frame.url,
                detail: 'high'
              }
            }))
          ]
        }
      ];

      const response = await this.chatCompletion(messages, {
        model: 'gpt-4-vision-preview',
        maxTokens: 1500
      });

      if (response.success) {
        return {
          success: true,
          analysis: response.data.message.content,
          recommendations: this.extractRecommendations(response.data.message.content),
          metadata: videoMetadata
        };
      }

      return response;
    } catch (error) {
      logger.error('Video analysis failed:', error);
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Process voice commands using Whisper
   */
  async processVoiceCommand(audioBuffer) {
    try {
      // Convert audio to text using Whisper
      const transcription = await this.retryRequest(async () => {
        return await this.client.audio.transcriptions.create({
          file: audioBuffer,
          model: 'whisper-1',
          language: 'en'
        });
      });

      const text = transcription.text;
      logger.info('Voice transcription successful:', { text });

      // Analyze the command intent
      const intentAnalysis = await this.analyzeIntent(text);

      return {
        success: true,
        transcription: text,
        intent: intentAnalysis.intent,
        parameters: intentAnalysis.parameters,
        confidence: intentAnalysis.confidence
      };
    } catch (error) {
      logger.error('Voice command processing failed:', error);
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Analyze user intent from text
   */
  async analyzeIntent(text) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are an intent recognition system for a video editing application. 
          Analyze the user's text and identify:
          1. Intent (cut, trim, add_effect, add_music, export, etc.)
          2. Parameters (timestamps, effect types, etc.)
          3. Confidence level (0-1)
          
          Respond in JSON format:
          {
            "intent": "action_name",
            "parameters": {},
            "confidence": 0.95
          }`
        },
        {
          role: 'user',
          content: text
        }
      ];

      const response = await this.chatCompletion(messages, {
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 200
      });

      if (response.success) {
        try {
          const analysis = JSON.parse(response.data.message.content);
          return analysis;
        } catch (parseError) {
          logger.error('Failed to parse intent analysis:', parseError);
          return {
            intent: 'unknown',
            parameters: {},
            confidence: 0.0
          };
        }
      }

      return {
        intent: 'unknown',
        parameters: {},
        confidence: 0.0
      };
    } catch (error) {
      logger.error('Intent analysis failed:', error);
      return {
        intent: 'unknown',
        parameters: {},
        confidence: 0.0
      };
    }
  }

  /**
   * Generate video editing suggestions
   */
  async generateEditingSuggestions(projectData) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are a professional video editing consultant. Based on the project data provided, 
          generate specific, actionable editing suggestions including:
          - Cut points and timing
          - Transition recommendations
          - Color correction suggestions
          - Audio enhancement tips
          - Export settings
          
          Provide practical, implementable advice.`
        },
        {
          role: 'user',
          content: `Please analyze this video project and provide editing suggestions: ${JSON.stringify(projectData)}`
        }
      ];

      const response = await this.chatCompletion(messages, {
        model: 'gpt-4',
        temperature: 0.8,
        maxTokens: 1200
      });

      if (response.success) {
        return {
          success: true,
          suggestions: response.data.message.content,
          timestamp: new Date().toISOString()
        };
      }

      return response;
    } catch (error) {
      logger.error('Editing suggestions generation failed:', error);
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Retry mechanism for API requests
   */
  async retryRequest(requestFn, retries = this.maxRetries) {
    try {
      return await requestFn();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        logger.warn(`Request failed, retrying... (${retries} attempts left)`, { error: error.message });
        await this.delay(this.retryDelay);
        return this.retryRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const retryableStatuses = [429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status) || 
           error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT';
  }

  /**
   * Delay utility for retries
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extract recommendations from analysis text
   */
  extractRecommendations(analysisText) {
    const recommendations = [];
    const lines = analysisText.split('\n');
    
    for (const line of lines) {
      if (line.includes('recommend') || line.includes('suggest') || line.includes('should')) {
        recommendations.push(line.trim());
      }
    }
    
    return recommendations;
  }

  /**
   * Format error for consistent response
   */
  formatError(error) {
    if (error.status === 429) {
      return 'Rate limit exceeded. Please try again later.';
    }
    if (error.status === 401) {
      return 'Invalid API key. Please check your OpenAI configuration.';
    }
    if (error.status >= 500) {
      return 'OpenAI service temporarily unavailable. Please try again.';
    }
    return error.message || 'An unexpected error occurred.';
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    try {
      const start = Date.now();
      await this.client.models.list();
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: this.formatError(error),
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new OpenAIService();