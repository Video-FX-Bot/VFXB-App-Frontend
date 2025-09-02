const openaiService = require('./openaiService');
const json2videoService = require('./json2videoService');
const captionsAiService = require('./captionsAiService');
const logger = require('../utils/logger');

class AiChatService {
  constructor() {
    this.videoEditingCommands = {
      'create_video': this.handleCreateVideo.bind(this),
      'transcribe_video': this.handleTranscribeVideo.bind(this),
      'add_captions': this.handleAddCaptions.bind(this),
      'edit_video': this.handleEditVideo.bind(this),
      'generate_script': this.handleGenerateScript.bind(this)
    };
  }

  /**
   * Process chat message and detect video editing commands
   * @param {string} message - User message
   * @param {Object} context - Chat context including project info
   * @returns {Object} Response with AI reply and any video editing actions
   */
  async processChatMessage(message, context = {}) {
    try {
      logger.info('Processing chat message for AI video editing', {
        messageLength: message.length,
        hasContext: !!context.projectId
      });

      // Detect video editing intent
      const intent = await this.detectVideoEditingIntent(message);
      
      let response = {
        success: true,
        data: {
          reply: '',
          actions: [],
          suggestions: []
        }
      };

      if (intent.isVideoEditing) {
        // Handle video editing command
        const actionResult = await this.executeVideoEditingAction(intent, message, context);
        response.data.reply = actionResult.reply;
        response.data.actions = actionResult.actions;
        response.data.suggestions = actionResult.suggestions;
      } else {
        // Regular chat response
        const chatResult = await this.generateChatResponse(message, context);
        response.data.reply = chatResult.reply;
        response.data.suggestions = chatResult.suggestions;
      }

      return response;
    } catch (error) {
      logger.error('Error processing chat message:', error);
      return {
        success: false,
        error: 'Failed to process chat message'
      };
    }
  }

  /**
   * Detect if message contains video editing intent
   * @param {string} message - User message
   * @returns {Object} Intent detection result
   */
  async detectVideoEditingIntent(message) {
    try {
      const prompt = `
Analyze this user message and determine if it's related to video editing, creation, or processing.

User message: "${message}"

Respond with a JSON object containing:
- isVideoEditing: boolean (true if video-related)
- command: string (one of: create_video, transcribe_video, add_captions, edit_video, generate_script, or null)
- confidence: number (0-1)
- parameters: object (extracted parameters like text, duration, style, etc.)

Examples:
- "Create a video from this text: Hello world" -> {"isVideoEditing": true, "command": "create_video", "confidence": 0.9, "parameters": {"text": "Hello world"}}
- "Add captions to my video" -> {"isVideoEditing": true, "command": "add_captions", "confidence": 0.8, "parameters": {}}
- "What's the weather like?" -> {"isVideoEditing": false, "command": null, "confidence": 0.1, "parameters": {}}
`;

      const result = await openaiService.chatCompletion([
        { role: 'system', content: 'You are a video editing intent detection system. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.1,
        maxTokens: 200
      });

      if (result.success) {
        try {
          const intent = JSON.parse(result.data.message.content);
          return {
            isVideoEditing: intent.isVideoEditing || false,
            command: intent.command || null,
            confidence: intent.confidence || 0,
            parameters: intent.parameters || {}
          };
        } catch (parseError) {
          logger.warn('Failed to parse intent JSON:', parseError);
          return { isVideoEditing: false, command: null, confidence: 0, parameters: {} };
        }
      }

      return { isVideoEditing: false, command: null, confidence: 0, parameters: {} };
    } catch (error) {
      logger.error('Error detecting video editing intent:', error);
      return { isVideoEditing: false, command: null, confidence: 0, parameters: {} };
    }
  }

  /**
   * Execute video editing action based on detected intent
   * @param {Object} intent - Detected intent
   * @param {string} message - Original message
   * @param {Object} context - Chat context
   * @returns {Object} Action result
   */
  async executeVideoEditingAction(intent, message, context) {
    try {
      const { command, parameters } = intent;
      
      if (this.videoEditingCommands[command]) {
        return await this.videoEditingCommands[command](parameters, message, context);
      }

      return {
        reply: "I understand you want to work with video, but I'm not sure exactly what you'd like me to do. Could you be more specific?",
        actions: [],
        suggestions: [
          "Create a video from text",
          "Add captions to a video",
          "Transcribe a video",
          "Generate a video script"
        ]
      };
    } catch (error) {
      logger.error('Error executing video editing action:', error);
      return {
        reply: "I encountered an error while processing your video editing request. Please try again.",
        actions: [],
        suggestions: []
      };
    }
  }

  /**
   * Handle create video command
   */
  async handleCreateVideo(parameters, message, context) {
    try {
      const { text, style, duration } = parameters;
      
      if (!text) {
        return {
          reply: "I'd be happy to create a video for you! Please provide the text content you'd like to convert into a video.",
          actions: [],
          suggestions: [
            "Create a video with the text: 'Welcome to our company'",
            "Make a promotional video",
            "Generate a tutorial video"
          ]
        };
      }

      // Create video using JSON2Video service
      const videoResult = await json2videoService.createVideoFromText(text, style);
      
      if (videoResult.success) {
        return {
          reply: `Great! I'm creating a video from your text. The video creation has started and you'll receive the video ID: ${videoResult.data.id}. I'll monitor the progress for you.`,
          actions: [{
            type: 'video_creation_started',
            videoId: videoResult.data.id,
            status: videoResult.data.status
          }],
          suggestions: [
            "Check video creation status",
            "Create another video",
            "Add captions to the video when ready"
          ]
        };
      } else {
        return {
          reply: `I encountered an issue creating the video: ${videoResult.error}. Would you like to try again with different parameters?`,
          actions: [],
          suggestions: [
            "Try with shorter text",
            "Use a different video style",
            "Check API status"
          ]
        };
      }
    } catch (error) {
      logger.error('Error handling create video command:', error);
      return {
        reply: "I encountered an error while creating the video. Please try again.",
        actions: [],
        suggestions: []
      };
    }
  }

  /**
   * Handle transcribe video command
   */
  async handleTranscribeVideo(parameters, message, context) {
    try {
      const { videoUrl, language } = parameters;
      
      if (!videoUrl && !context.currentVideo) {
        return {
          reply: "I can transcribe a video for you! Please provide a video URL or upload a video file.",
          actions: [],
          suggestions: [
            "Upload a video file",
            "Provide a video URL",
            "Select from project videos"
          ]
        };
      }

      const targetUrl = videoUrl || context.currentVideo;
      const transcriptionResult = await captionsAiService.transcribeVideoFromUrl(targetUrl, { language });
      
      if (transcriptionResult.success) {
        return {
          reply: `Perfect! I've started transcribing your video. Job ID: ${transcriptionResult.data.id}. I'll let you know when the transcription is complete.`,
          actions: [{
            type: 'transcription_started',
            jobId: transcriptionResult.data.id,
            status: transcriptionResult.data.status
          }],
          suggestions: [
            "Check transcription status",
            "Set up automatic captions",
            "Translate to other languages"
          ]
        };
      } else {
        return {
          reply: `I had trouble starting the transcription: ${transcriptionResult.error}. Please check the video URL and try again.`,
          actions: [],
          suggestions: [
            "Check video URL format",
            "Try a different video",
            "Upload video file instead"
          ]
        };
      }
    } catch (error) {
      logger.error('Error handling transcribe video command:', error);
      return {
        reply: "I encountered an error while starting the transcription. Please try again.",
        actions: [],
        suggestions: []
      };
    }
  }

  /**
   * Handle add captions command
   */
  async handleAddCaptions(parameters, message, context) {
    return {
      reply: "I can help you add captions to your video! First, I'll need to transcribe the video, then we can add the captions. Would you like me to start the transcription process?",
      actions: [],
      suggestions: [
        "Start video transcription",
        "Upload SRT file",
        "Manually add captions"
      ]
    };
  }

  /**
   * Handle edit video command
   */
  async handleEditVideo(parameters, message, context) {
    return {
      reply: "I can help you edit your video! What specific editing would you like to do? I can help with creating new content, adding captions, or processing existing videos.",
      actions: [],
      suggestions: [
        "Add captions to video",
        "Create video from script",
        "Transcribe video content",
        "Generate video script"
      ]
    };
  }

  /**
   * Handle generate script command
   */
  async handleGenerateScript(parameters, message, context) {
    try {
      const { topic, duration, style } = parameters;
      
      const prompt = `Create a video script for the following:
Topic: ${topic || 'general video content'}
Duration: ${duration || '1-2 minutes'}
Style: ${style || 'professional and engaging'}

Please create a well-structured script with clear sections and engaging content.`;

      const scriptResult = await openaiService.chatCompletion([
        { role: 'system', content: 'You are a professional video script writer. Create engaging, well-structured scripts.' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.7,
        maxTokens: 1000
      });

      if (scriptResult.success) {
        return {
          reply: `Here's a video script I've generated for you:\n\n${scriptResult.data.message.content}\n\nWould you like me to create a video from this script?`,
          actions: [{
            type: 'script_generated',
            script: scriptResult.data.message.content
          }],
          suggestions: [
            "Create video from this script",
            "Modify the script",
            "Generate another version"
          ]
        };
      } else {
        return {
          reply: "I had trouble generating the script. Could you provide more details about what kind of video you'd like to create?",
          actions: [],
          suggestions: [
            "Specify video topic",
            "Describe target audience",
            "Set video duration"
          ]
        };
      }
    } catch (error) {
      logger.error('Error handling generate script command:', error);
      return {
        reply: "I encountered an error while generating the script. Please try again.",
        actions: [],
        suggestions: []
      };
    }
  }

  /**
   * Generate regular chat response
   */
  async generateChatResponse(message, context) {
    try {
      const systemPrompt = `You are VFXB AI, an intelligent video editing assistant. You help users with video creation, editing, and processing tasks. 

You can:
- Create videos from text using AI
- Transcribe videos and add captions
- Generate video scripts
- Provide video editing guidance
- Help with video project management

Be helpful, concise, and always suggest relevant video editing actions when appropriate.`;

      const chatResult = await openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ], {
        temperature: 0.7,
        maxTokens: 500
      });

      if (chatResult.success) {
        return {
          reply: chatResult.data.message.content,
          suggestions: [
            "Create a video",
            "Transcribe video",
            "Generate script",
            "Add captions"
          ]
        };
      } else {
        return {
          reply: "I'm here to help with your video editing needs! What would you like to work on today?",
          suggestions: [
            "Create a video from text",
            "Transcribe a video",
            "Generate a video script",
            "Add captions to video"
          ]
        };
      }
    } catch (error) {
      logger.error('Error generating chat response:', error);
      return {
        reply: "I'm here to help with your video editing needs! What would you like to work on today?",
        suggestions: [
          "Create a video from text",
          "Transcribe a video",
          "Generate a video script",
          "Add captions to video"
        ]
      };
    }
  }

  /**
   * Check status of ongoing video operations
   * @param {string} operationType - Type of operation (video_creation, transcription)
   * @param {string} operationId - ID of the operation
   * @returns {Object} Status result
   */
  async checkOperationStatus(operationType, operationId) {
    try {
      switch (operationType) {
        case 'video_creation':
          return await json2videoService.getVideoStatus(operationId);
        case 'transcription':
          return await captionsAiService.getTranscriptionStatus(operationId);
        default:
          return {
            success: false,
            error: 'Unknown operation type'
          };
      }
    } catch (error) {
      logger.error('Error checking operation status:', error);
      return {
        success: false,
        error: 'Failed to check operation status'
      };
    }
  }
}

module.exports = new AiChatService();