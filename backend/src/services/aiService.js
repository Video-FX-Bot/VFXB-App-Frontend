import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { VideoProcessor } from './videoProcessor.js';
import { TranscriptionService } from './transcriptionService.js';

class AIService {
  constructor() {
    this.openai = null;
    this.videoProcessor = new VideoProcessor();
    this.transcriptionService = new TranscriptionService();
  }

  getOpenAI() {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.openai;
  }

  // Main chat interface for video editing
  async processChatMessage(message, context = {}) {
    try {
      logger.info('Processing chat message:', { message, context });

      // Analyze user intent
      const intent = await this.analyzeIntent(message, context);
      
      // Generate response based on intent
      const response = await this.generateResponse(intent, context);
      
      // Execute any video operations if needed
      if (intent.action && intent.action !== 'chat') {
        const operationResult = await this.executeVideoOperation(intent, context);
        response.operationResult = operationResult;
      }

      return response;
    } catch (error) {
      logger.error('Error processing chat message:', error);
      throw new Error('Failed to process your request. Please try again.');
    }
  }

  // Analyze user intent using OpenAI
  async analyzeIntent(message, context) {
    const systemPrompt = `You are an AI video editor assistant. Analyze the user's message and determine their intent.
    
    Available video editing operations:
    - trim: Cut/trim video segments (parameters: startTime, endTime, duration, preserveAudio)
    - crop: Resize or crop video (parameters: x, y, width, height, aspectRatio, centerCrop)
    - filter: Apply visual filters (parameters: filterType - vintage, black_white, sepia, blur, sharpen, intensity, blend)
    - color: Color correction (parameters: brightness, contrast, saturation, hue, gamma, shadows, highlights)
    - audio: Audio enhancement, noise removal (parameters: operation - enhance, denoise, normalize, volume, fadeIn, fadeOut)
    - text: Add text overlays, titles, subtitles (parameters: text, x, y, fontSize, color, fontFamily, startTime, duration, animation, outline)
    - transition: Add transitions between clips (parameters: type - fade, dissolve, wipe, slide, duration, position - start/end, easing)
    - effect: Add special effects (parameters: effectType, intensity, duration, startTime, blend, mask)
    - background: Remove or change video background (parameters: action - remove/replace, backgroundType - solid/image/blur/gradient, backgroundImage, backgroundColor, gradientColors, blurRadius, color, similarity, blend)
    - export: Export/download video (parameters: format, quality, resolution)
    - analyze: Analyze video content
    - chat: General conversation
    
    Common user phrases and their mappings:
    - "remove background", "green screen", "chroma key", "transparent background" → background with action: remove
    - "change background", "replace background", "new background" → background with action: replace
    - "solid color background", "blue background", "white background" → background with action: replace, backgroundType: solid
    - "blur background", "blurred background", "bokeh effect" → background with action: replace, backgroundType: blur
    - "gradient background", "color gradient" → background with action: replace, backgroundType: gradient
    - "background image", "custom background", "photo background" → background with action: replace, backgroundType: image
    - "make it vintage", "old film look" → filter with filterType: vintage
    - "black and white", "monochrome" → filter with filterType: black_white
    - "add title", "put text", "add caption" → text
    - "fade in", "fade out", "dissolve", "crossfade" → transition with type: fade/dissolve
    - "brighten", "darker", "more contrast", "adjust colors", "color grade" → color
    - "cut from X to Y", "trim", "shorten", "clip", "extract segment" → trim
    - "crop video", "resize", "change aspect ratio", "square crop", "16:9 format" → crop
    - "louder", "quieter", "remove noise", "clean audio", "normalize volume" → audio
    - "slow motion", "speed up", "time lapse", "fast forward" → effect with effectType: speed
    - "zoom in", "zoom out", "pan", "ken burns effect" → effect with effectType: zoom/pan
    
    Context: ${JSON.stringify(context)}
    
    Respond with a JSON object containing:
    {
      "action": "operation_name",
      "parameters": {},
      "confidence": 0.95,
      "explanation": "What the user wants to do",
      "suggestedActions": ["action1", "action2"]
    }`;

    try {
      const completion = await this.getOpenAI().chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      logger.error('Error analyzing intent:', error);
      
      // Handle OpenAI quota/auth errors gracefully
      if (error.status === 429 || error.status === 401) {
        // Fallback intent analysis based on keywords
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('trim') || lowerMessage.includes('cut')) {
          return {
            action: 'trim',
            parameters: { startTime: 0, duration: 30 },
            confidence: 0.7,
            explanation: 'Detected trim/cut request - using fallback analysis'
          };
        }
        if (lowerMessage.includes('effect') || lowerMessage.includes('filter')) {
          return {
            action: 'apply_effect',
            parameters: { effectType: 'blur' },
            confidence: 0.7,
            explanation: 'Detected effect request - using fallback analysis'
          };
        }
      }
      
      return {
        action: 'chat',
        parameters: {},
        confidence: 0.5,
        explanation: 'I\'m not sure what you want to do. Can you be more specific?'
      };
    }
  }

  // Generate conversational response
  async generateResponse(intent, context) {
    const systemPrompt = `You are VFXB AI, a friendly and helpful video editing assistant. You help users edit their videos through natural conversation.
    
    Current intent: ${JSON.stringify(intent)}
    Context: ${JSON.stringify(context)}
    
    Guidelines:
    - Be conversational and encouraging
    - Explain what you're doing in simple terms
    - Offer helpful suggestions for next steps
    - If processing video, mention it will take a moment
    - For background operations, explain the process briefly
    - Suggest related actions the user might want to try
    
    Response format:
    {
      "message": "Your conversational response",
      "actions": [
        {"label": "Action Name", "command": "suggested command", "type": "primary|secondary"}
      ],
      "tips": ["helpful tip 1", "helpful tip 2"]
    }`; 
    
    try {
      const completion = await this.getOpenAI().chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Intent: ${intent.explanation}` }
        ],
        temperature: 0.7,
        max_tokens: 400
      });

      let response;
      try {
        response = JSON.parse(completion.choices[0].message.content);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        response = {
          message: completion.choices[0].message.content,
          actions: this.generateSuggestedActions(intent),
          tips: this.generateTips(intent)
        };
      }

      return {
        message: response.message || completion.choices[0].message.content,
        actions: response.actions || this.generateSuggestedActions(intent),
        tips: response.tips || this.generateTips(intent),
        intent: intent,
        timestamp: new Date().toISOString(),
        type: 'ai'
      };
    } catch (error) {
      logger.error('Error generating response:', error);
      
      // Handle specific OpenAI errors
      if (error.status === 429) {
        return {
          message: 'I\'m currently experiencing high demand. Here are some things you can try while I recover: trim your video, apply effects, or adjust playback settings.',
          actions: [
            {"label": "Trim Video", "command": "trim from 0 to 30 seconds", "type": "primary"},
            {"label": "Apply Effect", "command": "apply blur effect", "type": "secondary"},
            {"label": "Adjust Speed", "command": "change speed to 1.5x", "type": "secondary"}
          ],
          tips: ["Video editing operations still work normally", "Try basic commands while AI chat recovers"],
          intent: intent,
          timestamp: new Date().toISOString(),
          type: 'ai',
          fallback: true
        };
      }
      
      if (error.status === 401) {
        return {
          message: 'AI service temporarily unavailable. You can still use manual video editing tools.',
          actions: this.generateSuggestedActions(intent),
          tips: ["Use the timeline controls for manual editing", "Effects library is still available"],
          intent: intent,
          timestamp: new Date().toISOString(),
          type: 'ai',
          fallback: true
        };
      }
      
      return {
        message: 'I\'m here to help with your video editing! What would you like to do?',
        actions: this.generateSuggestedActions(intent),
        tips: this.generateTips(intent),
        intent: intent,
        timestamp: new Date().toISOString(),
        type: 'ai'
      };
    }
  }

  // Execute video operations based on intent
  async executeVideoOperation(intent, context) {
    try {
      const { action, parameters } = intent;
      const { videoId, videoPath } = context;

      switch (action) {
        case 'trim':
          return await this.videoProcessor.trimVideo(videoPath, parameters);
        
        case 'crop':
          return await this.videoProcessor.cropVideo(videoPath, parameters);
        
        case 'filter':
          return await this.videoProcessor.applyFilter(videoPath, parameters);
        
        case 'color':
          return await this.videoProcessor.adjustColor(videoPath, parameters);
        
        case 'audio':
          return await this.videoProcessor.enhanceAudio(videoPath, parameters);
        
        case 'text':
          return await this.videoProcessor.addText(videoPath, parameters);
        
        case 'transition':
          return await this.videoProcessor.addTransition(videoPath, parameters);
        
        case 'background':
          return await this.videoProcessor.processBackground(videoPath, parameters);
        
        case 'analyze':
          return await this.analyzeVideo(videoPath);
        
        case 'export':
          return await this.videoProcessor.exportVideo(videoPath, parameters);
        
        default:
          return { success: false, message: 'Operation not supported yet' };
      }
    } catch (error) {
      logger.error('Error executing video operation:', error);
      return { success: false, error: error.message };
    }
  }

  // Analyze video content
  async analyzeVideo(videoPath) {
    try {
      // Get video metadata
      const metadata = await this.videoProcessor.getVideoMetadata(videoPath);
      
      // Transcribe audio if present
      let transcription = null;
      if (metadata.hasAudio) {
        transcription = await this.transcriptionService.transcribeVideo(videoPath);
      }

      // Analyze video content with AI
      const analysis = await this.analyzeVideoContent(videoPath, transcription);

      // Generate improvement suggestions
      const suggestions = await this.generateVideoSuggestions(metadata, transcription, analysis);

      return {
        success: true,
        suggestions,
        metadata,
        transcription,
        analysis
      };
    } catch (error) {
      logger.error('Error analyzing video:', error);
      return { success: false, error: error.message };
    }
  }

  // AI-powered video content analysis
  async analyzeVideoContent(videoPath, transcription) {
    try {
      const systemPrompt = `Analyze this video content and provide insights:
      
      Video Transcription: ${transcription || 'No audio/speech detected'}
      
      Provide analysis in JSON format:
      {
        "mood": "happy/sad/energetic/calm/etc",
        "pacing": "fast/medium/slow",
        "content_type": "tutorial/vlog/presentation/etc",
        "suggestions": ["specific editing suggestions"],
        "highlights": ["interesting moments with timestamps"],
        "improvements": ["areas that could be enhanced"]
      }`;

      const completion = await this.getOpenAI().chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Please analyze this video content.' }
        ],
        temperature: 0.5,
        max_tokens: 800
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      logger.error('Error analyzing video content:', error);
      return {
        mood: 'neutral',
        pacing: 'medium',
        content_type: 'general',
        suggestions: ['Consider adding transitions', 'Enhance audio quality'],
        highlights: [],
        improvements: ['Audio could be clearer']
      };
    }
  }

  // Generate editing suggestions based on video analysis
  async generateEditingSuggestions(videoAnalysis, userPreferences = {}) {
    try {
      const systemPrompt = `Based on this video analysis, generate specific editing suggestions:
      
      Analysis: ${JSON.stringify(videoAnalysis)}
      User Preferences: ${JSON.stringify(userPreferences)}
      
      Provide 3-5 actionable editing suggestions that would improve the video.`;

      const completion = await this.getOpenAI().chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate editing suggestions for this video.' }
        ],
        temperature: 0.7,
        max_tokens: 400
      });

      return completion.choices[0].message.content;
    } catch (error) {
      logger.error('Error generating suggestions:', error);
      return 'I can help you improve your video! Try adjusting the color balance or adding some transitions.';
    }
  }

  // Generate video improvement suggestions
  async generateVideoSuggestions(metadata, transcription, analysis) {
    try {
      const suggestions = [];
      
      // Audio quality suggestions
      if (metadata.hasAudio && metadata.audioQuality < 0.7) {
        suggestions.push({
          type: 'audio_enhancement',
          title: 'Enhance Audio Quality',
          description: 'Your audio could benefit from noise reduction and volume normalization',
          action: 'enhance audio with noise reduction',
          priority: 'high',
          icon: 'volume-2'
        });
      }
      
      // Video quality suggestions
      if (metadata.resolution && metadata.resolution.width < 1920) {
        suggestions.push({
          type: 'upscale',
          title: 'Upscale Video Resolution',
          description: 'Increase video resolution for better quality',
          action: 'upscale video to 1080p',
          priority: 'medium',
          icon: 'maximize'
        });
      }
      
      // Lighting suggestions
      if (analysis && analysis.lighting === 'poor') {
        suggestions.push({
          type: 'color_correction',
          title: 'Improve Lighting',
          description: 'Adjust brightness and contrast for better visibility',
          action: 'apply brightness and contrast adjustment',
          priority: 'high',
          icon: 'sun'
        });
      }
      
      // Stabilization suggestions
      if (analysis && analysis.stability === 'shaky') {
        suggestions.push({
          type: 'stabilization',
          title: 'Stabilize Video',
          description: 'Reduce camera shake for smoother playback',
          action: 'apply video stabilization',
          priority: 'medium',
          icon: 'move'
        });
      }
      
      // Content-based suggestions
      if (transcription && transcription.text) {
        suggestions.push({
          type: 'captions',
          title: 'Add Captions',
          description: 'Automatically generate captions from your audio',
          action: 'generate captions from audio',
          priority: 'medium',
          icon: 'type'
        });
      }
      
      // Duration suggestions
      if (metadata.duration > 300) { // 5 minutes
        suggestions.push({
          type: 'trim',
          title: 'Consider Trimming',
          description: 'Long videos perform better when trimmed to key moments',
          action: 'trim video to highlights',
          priority: 'low',
          icon: 'scissors'
        });
      }
      
      return suggestions;
    } catch (error) {
      logger.error('Error generating video suggestions:', error);
      return [];
    }
  }

  // Generate suggested actions based on intent
  generateSuggestedActions(intent) {
    const { action } = intent;
    const actionMap = {
      background: [
        { label: 'Remove Background', command: 'remove background', type: 'primary' },
        { label: 'Blur Background', command: 'blur background', type: 'secondary' },
        { label: 'Solid Color Background', command: 'replace background with blue color', type: 'secondary' },
        { label: 'Gradient Background', command: 'add gradient background', type: 'secondary' },
        { label: 'Custom Image', command: 'replace background with image', type: 'secondary' }
      ],
      filter: [
        { label: 'Make Vintage', command: 'apply vintage filter', type: 'primary' },
        { label: 'Black & White', command: 'make it black and white', type: 'secondary' },
        { label: 'Add Sepia', command: 'apply sepia filter', type: 'secondary' }
      ],
      color: [
        { label: 'Auto Enhance', command: 'enhance colors automatically', type: 'primary' },
        { label: 'Brighten Video', command: 'make video brighter', type: 'secondary' },
        { label: 'Increase Contrast', command: 'increase contrast', type: 'secondary' }
      ],
      text: [
        { label: 'Add Title', command: 'add title at the beginning', type: 'primary' },
        { label: 'Add Subtitles', command: 'add subtitles', type: 'secondary' },
        { label: 'Add Watermark', command: 'add watermark', type: 'secondary' }
      ],
      trim: [
        { label: 'Cut Beginning', command: 'trim first 10 seconds', type: 'primary' },
        { label: 'Cut End', command: 'trim last 5 seconds', type: 'secondary' },
        { label: 'Extract Clip', command: 'extract from 30s to 60s', type: 'secondary' },
        { label: 'Remove Middle', command: 'remove from 20s to 40s', type: 'secondary' }
      ],
      crop: [
        { label: 'Square Crop', command: 'crop to square format', type: 'primary' },
        { label: '16:9 Format', command: 'crop to 16:9 aspect ratio', type: 'secondary' },
        { label: 'Center Crop', command: 'center crop video', type: 'secondary' },
        { label: 'Custom Crop', command: 'crop to custom size', type: 'secondary' }
      ],
      audio: [
        { label: 'Remove Noise', command: 'remove background noise', type: 'primary' },
        { label: 'Normalize Volume', command: 'normalize audio volume', type: 'secondary' },
        { label: 'Enhance Audio', command: 'enhance audio quality', type: 'secondary' },
        { label: 'Add Fade', command: 'add fade in and out', type: 'secondary' }
      ],
      transition: [
        { label: 'Fade Transition', command: 'add fade transition', type: 'primary' },
        { label: 'Dissolve Effect', command: 'add dissolve transition', type: 'secondary' },
        { label: 'Slide Transition', command: 'add slide transition', type: 'secondary' },
        { label: 'Wipe Effect', command: 'add wipe transition', type: 'secondary' }
      ],
      effect: [
        { label: 'Slow Motion', command: 'apply slow motion effect', type: 'primary' },
        { label: 'Speed Up', command: 'speed up video 2x', type: 'secondary' },
        { label: 'Zoom Effect', command: 'add zoom in effect', type: 'secondary' },
        { label: 'Stabilize', command: 'stabilize shaky video', type: 'secondary' }
      ]
    };

    return actionMap[action] || [
      { label: 'Analyze Video', command: 'analyze my video', type: 'primary' },
      { label: 'Export Video', command: 'export video in HD', type: 'secondary' }
    ];
  }

  // Generate helpful tips based on intent
  generateTips(intent) {
    const { action } = intent;
    const tipMap = {
      background: [
        'Use green screen for best background removal results',
        'Ensure good lighting for clean background separation',
        'Try different similarity values if edges look rough',
        'Blur backgrounds create professional depth of field effects',
        'Gradient backgrounds work great for presentations',
        'Upload custom images for personalized backgrounds'
      ],
      filter: [
        'Filters can dramatically change the mood of your video',
        'Try combining multiple filters for unique effects'
      ],
      color: [
        'Small adjustments often work better than dramatic changes',
        'Consider the lighting conditions when adjusting colors'
      ],
      text: [
        'Keep text readable by choosing contrasting colors',
        'Position text where it won\'t cover important content'
      ],
      trim: [
        'Use precise timestamps for accurate cuts',
        'Preview your cuts before applying',
        'Consider preserving audio when trimming',
        'Extract multiple segments for highlight reels'
      ],
      crop: [
        'Maintain aspect ratio for professional look',
        'Center important subjects when cropping',
        'Consider final platform requirements (Instagram, YouTube)',
        'Preview crop on different screen sizes'
      ],
      audio: [
        'Record in quiet environments for best results',
        'Use noise reduction before other audio effects',
        'Normalize volume levels across clips',
        'Add fade effects for smooth transitions'
      ],
      transition: [
        'Match transition style to video mood',
        'Keep transitions short (0.5-2 seconds)',
        'Use dissolves for emotional content',
        'Fade transitions work well for most content'
      ],
      effect: [
        'Use effects sparingly for best impact',
        'Slow motion works great for action shots',
        'Speed effects can create dynamic energy',
        'Stabilization improves handheld footage'
      ]
    };

    return tipMap[action] || [
      'Use natural language to describe what you want to do',
      'You can always undo changes if you\'re not happy with the result'
    ];
  }
}

export default AIService;
export { AIService };