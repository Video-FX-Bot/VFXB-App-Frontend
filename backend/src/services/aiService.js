import OpenAI from "openai";
import { logger } from "../utils/logger.js";
import { VideoProcessor } from "./videoProcessor.js";
import { TranscriptionService } from "./transcriptionService.js";

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
      logger.info("Processing chat message:", { message, context });

      // Analyze user intent
      const intent = await this.analyzeIntent(message, context);

      // Generate response based on intent
      const response = await this.generateResponse(intent, context);

      // For brightness/contrast effects, let the frontend handle the application
      // Don't execute operations here to avoid conflicts
      if (intent.action === "brightness") {
        logger.info(
          "Brightness intent detected, letting frontend handle application"
        );
        response.operationResult = null; // Frontend will apply the effect
      } else if (intent.action && intent.action !== "chat") {
        // Execute other video operations if needed
        const operationResult = await this.executeVideoOperation(
          intent,
          context
        );
        response.operationResult = operationResult;
      }

      return response;
    } catch (error) {
      logger.error("Error processing chat message:", error);
      throw new Error("Failed to process your request. Please try again.");
    }
  }

  // Pattern-based intent analyzer (fallback when OpenAI is not available)
  analyzeIntentPattern(message, context) {
    const lowerMessage = message.toLowerCase();

    // Brightness patterns
    const brightnessPatterns = {
      increase: /(?:increase|raise|up|more|brighten|lighter|brighter|turn up)/i,
      decrease: /(?:decrease|lower|down|less|darken|darker|dim|turn down)/i,
      specific: /(?:brightness|bright)/i,
      general: /(?:brighten|brighter|darken|darker|lighter)/i,
    };

    // Contrast patterns
    const contrastPatterns = {
      increase: /(?:increase|raise|up|more|boost|stronger|sharper)/i,
      decrease: /(?:decrease|lower|down|less|reduce|softer|weaker)/i,
      specific: /(?:contrast|contrasty)/i,
    };

    // Extract numbers from the message (e.g., "increase brightness by 50")
    const numberMatch = lowerMessage.match(/(\d+)/);
    const extractedNumber = numberMatch ? parseInt(numberMatch[1]) : null;

    // Check for both brightness AND contrast in same message
    const hasBrightness =
      brightnessPatterns.specific.test(lowerMessage) ||
      brightnessPatterns.general.test(lowerMessage);
    const hasContrast = contrastPatterns.specific.test(lowerMessage);

    if (hasBrightness && hasContrast) {
      let brightnessValue = 0;
      let contrastValue = 0;

      if (brightnessPatterns.increase.test(lowerMessage)) {
        brightnessValue = extractedNumber || 30;
      } else if (brightnessPatterns.decrease.test(lowerMessage)) {
        brightnessValue = -(extractedNumber || 30);
      }

      if (contrastPatterns.increase.test(lowerMessage)) {
        contrastValue = extractedNumber || 30;
      } else if (contrastPatterns.decrease.test(lowerMessage)) {
        contrastValue = -(extractedNumber || 30);
      }

      return {
        action: "brightness",
        parameters: {
          brightness: brightnessValue,
          contrast: contrastValue,
        },
        confidence: 0.85,
        explanation: `Adjusting brightness and contrast`,
        suggestedActions: ["color", "filter"],
      };
    }

    // Check for brightness commands
    if (hasBrightness) {
      let brightnessValue = 0;

      if (brightnessPatterns.increase.test(lowerMessage)) {
        brightnessValue = extractedNumber || 30; // Default increase
      } else if (brightnessPatterns.decrease.test(lowerMessage)) {
        brightnessValue = -(extractedNumber || 30); // Default decrease
      } else if (extractedNumber) {
        brightnessValue = extractedNumber;
      }

      return {
        action: "brightness",
        parameters: {
          brightness: brightnessValue,
          contrast: 0,
        },
        confidence: 0.85,
        explanation: `Adjusting brightness to ${
          brightnessValue > 0 ? "+" : ""
        }${brightnessValue}`,
        suggestedActions: ["color", "filter"],
      };
    }

    // Check for contrast commands
    if (hasContrast) {
      let contrastValue = 0;

      if (contrastPatterns.increase.test(lowerMessage)) {
        contrastValue = extractedNumber || 30;
      } else if (contrastPatterns.decrease.test(lowerMessage)) {
        contrastValue = -(extractedNumber || 30);
      } else if (extractedNumber) {
        contrastValue = extractedNumber;
      }

      return {
        action: "brightness",
        parameters: {
          brightness: 0,
          contrast: contrastValue,
        },
        confidence: 0.85,
        explanation: `Adjusting contrast to ${
          contrastValue > 0 ? "+" : ""
        }${contrastValue}`,
        suggestedActions: ["color", "filter"],
      };
    }

    // Blur patterns
    const blurPatterns = {
      gaussian: /(?:blur|blurry|soft|soften|gaussian|smooth)/i,
      motion: /(?:motion blur|directional blur|speed blur)/i,
      amount: /(?:blur|blurry)/i,
    };

    // Check for blur commands
    const hasBlur = blurPatterns.amount.test(lowerMessage);
    const isMotionBlur = blurPatterns.motion.test(lowerMessage);

    if (hasBlur || isMotionBlur) {
      if (isMotionBlur) {
        // Motion blur
        const angleMatch = lowerMessage.match(
          /(?:angle|direction|at)\s*(\d+)/i
        );
        const angle = angleMatch ? parseInt(angleMatch[1]) : 0;
        const strength = extractedNumber || 10;

        return {
          action: "motion-blur",
          parameters: {
            angle: angle,
            strength: strength,
          },
          confidence: 0.85,
          explanation: `Applying motion blur at ${angle}° with strength ${strength}`,
          suggestedActions: ["blur", "effect"],
        };
      } else {
        // Gaussian blur
        const radius = extractedNumber || 5;

        return {
          action: "gaussian-blur",
          parameters: {
            radius: radius,
          },
          confidence: 0.85,
          explanation: `Applying blur with radius ${radius}`,
          suggestedActions: ["blur", "effect"],
        };
      }
    }

    // LUT filter patterns
    const lutPatterns = {
      cinematic: /(?:cinematic|film|movie|hollywood)/i,
      warm: /(?:warm|orange|golden|sunset)/i,
      cool: /(?:cool|cold|blue|teal|ice)/i,
      vintage: /(?:vintage|retro|old|film|analog)/i,
      dramatic: /(?:dramatic|intense|bold|high contrast)/i,
      general: /(?:lut|color grade|color grading|grade|look)/i,
    };

    // Check for LUT commands
    const hasLUT =
      lutPatterns.general.test(lowerMessage) ||
      lutPatterns.cinematic.test(lowerMessage) ||
      lutPatterns.warm.test(lowerMessage) ||
      lutPatterns.cool.test(lowerMessage) ||
      lutPatterns.vintage.test(lowerMessage) ||
      lutPatterns.dramatic.test(lowerMessage);

    if (hasLUT) {
      let lutType = "Cinematic"; // Default

      if (lutPatterns.warm.test(lowerMessage)) {
        lutType = "Warm";
      } else if (lutPatterns.cool.test(lowerMessage)) {
        lutType = "Cool";
      } else if (lutPatterns.vintage.test(lowerMessage)) {
        lutType = "Vintage";
      } else if (lutPatterns.dramatic.test(lowerMessage)) {
        lutType = "Dramatic";
      }

      const intensity = extractedNumber || 100;

      return {
        action: "lut-filter",
        parameters: {
          lut: lutType,
          intensity: intensity,
        },
        confidence: 0.85,
        explanation: `Applying ${lutType} color grading`,
        suggestedActions: ["color", "lut", "grade"],
      };
    }

    // Check for transition patterns
    if (
      /\b(fade|cross[\s-]?dissolve|dissolve|fade[\s-]?in|fade[\s-]?out)\b/i.test(
        message
      )
    ) {
      const durationMatch = message.match(/(\d+\.?\d*)\s*(s|sec|second)/i);
      const duration = durationMatch ? parseFloat(durationMatch[1]) : 1;

      return {
        action: "cross-dissolve",
        parameters: {
          duration,
        },
        confidence: 0.9,
        explanation: `Applying cross dissolve transition (${duration}s)`,
        suggestedActions: ["transition", "fade", "dissolve"],
      };
    }

    if (
      /\b(zoom|scale[\s-]?transition|zoom[\s-]?in|zoom[\s-]?out)\b/i.test(
        message
      )
    ) {
      const durationMatch = message.match(/(\d+\.?\d*)\s*(s|sec|second)/i);
      const duration = durationMatch ? parseFloat(durationMatch[1]) : 1;

      // Detect zoom type
      let zoomType = "Zoom In";
      if (/\b(zoom[\s-]?out)\b/i.test(message)) {
        zoomType = "Zoom Out";
      } else if (
        /\b(zoom[\s-]?in[\s-]?out|in[\s-]?and[\s-]?out)\b/i.test(message)
      ) {
        zoomType = "Zoom In/Out";
      }

      return {
        action: "zoom-transition",
        parameters: {
          zoomType,
          duration,
          centerX: 50,
          centerY: 50,
        },
        confidence: 0.9,
        explanation: `Applying zoom transition (${zoomType}, ${duration}s)`,
        suggestedActions: ["transition", "zoom", "scale"],
      };
    }

    // Fallback to chat
    return {
      action: "chat",
      parameters: {},
      confidence: 0.3,
      explanation: "General conversation or unclear intent",
      suggestedActions: ["brightness", "filter", "color"],
    };
  }

  // Analyze user intent using OpenAI
  async analyzeIntent(message, context) {
    // Try pattern-based analysis first if OpenAI key is not available
    if (!process.env.OPENAI_API_KEY) {
      logger.info("OpenAI key not available, using pattern-based analysis");
      return this.analyzeIntentPattern(message, context);
    }

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
        model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      logger.error(
        "Error analyzing intent with OpenAI, falling back to pattern matching:",
        error
      );
      // Fallback to pattern-based analysis
      return this.analyzeIntentPattern(message, context);
    }
  }

  // Generate simple response without OpenAI
  generateSimpleResponse(intent, context) {
    let message = "";

    switch (intent.action) {
      case "brightness":
        const { brightness, contrast } = intent.parameters;
        if (brightness !== 0 && contrast !== 0) {
          message = `I'll adjust the brightness to ${
            brightness > 0 ? "+" : ""
          }${brightness} and contrast to ${
            contrast > 0 ? "+" : ""
          }${contrast}. Processing your video now...`;
        } else if (brightness !== 0) {
          message = `I'll ${
            brightness > 0 ? "increase" : "decrease"
          } the brightness by ${Math.abs(
            brightness
          )}. This will make your video ${
            brightness > 0 ? "brighter" : "darker"
          }. Processing now...`;
        } else if (contrast !== 0) {
          message = `I'll ${
            contrast > 0 ? "increase" : "decrease"
          } the contrast by ${Math.abs(contrast)}. This will make the ${
            contrast > 0 ? "colors more vivid" : "image softer"
          }. Processing now...`;
        } else {
          message = "Resetting brightness and contrast to normal levels...";
        }
        break;

      case "chat":
        message =
          'I can help you edit your video! Try saying things like "make it brighter", "increase contrast", or "brighten by 50".';
        break;

      default:
        message = `I'll ${intent.explanation}. Processing your video...`;
    }

    return {
      message,
      actions: this.generateSuggestedActions(intent),
      tips: this.generateTips(intent),
      intent: intent,
      timestamp: new Date().toISOString(),
      type: "ai",
    };
  }

  // Generate conversational response
  async generateResponse(intent, context) {
    // Use simple response if OpenAI is not available
    if (!process.env.OPENAI_API_KEY) {
      logger.info("OpenAI key not available, using simple response generation");
      return this.generateSimpleResponse(intent, context);
    }

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
        model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Intent: ${intent.explanation}` },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });

      let response;
      try {
        response = JSON.parse(completion.choices[0].message.content);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        response = {
          message: completion.choices[0].message.content,
          actions: this.generateSuggestedActions(intent),
          tips: this.generateTips(intent),
        };
      }

      return {
        message: response.message || completion.choices[0].message.content,
        actions: response.actions || this.generateSuggestedActions(intent),
        tips: response.tips || this.generateTips(intent),
        intent: intent,
        timestamp: new Date().toISOString(),
        type: "ai",
      };
    } catch (error) {
      logger.error(
        "Error generating response with OpenAI, using simple fallback:",
        error
      );
      return this.generateSimpleResponse(intent, context);
    }
  }

  // Execute video operations based on intent
  async executeVideoOperation(intent, context) {
    try {
      const { action, parameters } = intent;
      const { videoId, videoPath } = context;

      switch (action) {
        case "trim":
          return await this.videoProcessor.trimVideo(videoPath, parameters);

        case "crop":
          return await this.videoProcessor.cropVideo(videoPath, parameters);

        case "filter":
          return await this.videoProcessor.applyFilter(videoPath, parameters);

        case "brightness":
        case "color":
          // For brightness/contrast adjustments, use the effect application
          return {
            success: true,
            action: "brightness",
            parameters: parameters,
            message:
              "Apply brightness/contrast effect through the effects endpoint",
          };

        case "audio":
          return await this.videoProcessor.enhanceAudio(videoPath, parameters);

        case "text":
          return await this.videoProcessor.addText(videoPath, parameters);

        case "transition":
          return await this.videoProcessor.addTransition(videoPath, parameters);

        case "background":
          return await this.videoProcessor.processBackground(
            videoPath,
            parameters
          );

        case "analyze":
          return await this.analyzeVideo(videoPath);

        case "export":
          return await this.videoProcessor.exportVideo(videoPath, parameters);

        default:
          return { success: false, message: "Operation not supported yet" };
      }
    } catch (error) {
      logger.error("Error executing video operation:", error);
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
        transcription = await this.transcriptionService.transcribeVideo(
          videoPath
        );
      }

      // Analyze video content with AI
      const analysis = await this.analyzeVideoContent(videoPath, transcription);

      return {
        success: true,
        metadata,
        transcription,
        analysis,
      };
    } catch (error) {
      logger.error("Error analyzing video:", error);
      return { success: false, error: error.message };
    }
  }

  // AI-powered video content analysis
  async analyzeVideoContent(videoPath, transcription) {
    try {
      const systemPrompt = `Analyze this video content and provide insights:
      
      Video Transcription: ${transcription || "No audio/speech detected"}
      
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
        model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Please analyze this video content." },
        ],
        temperature: 0.5,
        max_tokens: 800,
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      logger.error("Error analyzing video content:", error);
      return {
        mood: "neutral",
        pacing: "medium",
        content_type: "general",
        suggestions: ["Consider adding transitions", "Enhance audio quality"],
        highlights: [],
        improvements: ["Audio could be clearer"],
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
        model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: "Generate editing suggestions for this video.",
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      logger.error("Error generating suggestions:", error);
      return "I can help you improve your video! Try adjusting the color balance or adding some transitions.";
    }
  }

  // Generate suggested actions based on intent
  generateSuggestedActions(intent) {
    const { action } = intent;
    const actionMap = {
      background: [
        {
          label: "Remove Background",
          command: "remove background",
          type: "primary",
        },
        {
          label: "Blur Background",
          command: "blur background",
          type: "secondary",
        },
        {
          label: "Solid Color Background",
          command: "replace background with blue color",
          type: "secondary",
        },
        {
          label: "Gradient Background",
          command: "add gradient background",
          type: "secondary",
        },
        {
          label: "Custom Image",
          command: "replace background with image",
          type: "secondary",
        },
      ],
      filter: [
        {
          label: "Make Vintage",
          command: "apply vintage filter",
          type: "primary",
        },
        {
          label: "Black & White",
          command: "make it black and white",
          type: "secondary",
        },
        {
          label: "Add Sepia",
          command: "apply sepia filter",
          type: "secondary",
        },
      ],
      brightness: [
        {
          label: "Brighten More",
          command: "increase brightness by 50",
          type: "primary",
        },
        {
          label: "Darken",
          command: "decrease brightness by 30",
          type: "secondary",
        },
        {
          label: "Increase Contrast",
          command: "increase contrast by 40",
          type: "secondary",
        },
        {
          label: "Reset",
          command: "reset brightness and contrast",
          type: "secondary",
        },
      ],
      color: [
        {
          label: "Auto Enhance",
          command: "enhance colors automatically",
          type: "primary",
        },
        {
          label: "Brighten Video",
          command: "make video brighter",
          type: "secondary",
        },
        {
          label: "Increase Contrast",
          command: "increase contrast",
          type: "secondary",
        },
      ],
      text: [
        {
          label: "Add Title",
          command: "add title at the beginning",
          type: "primary",
        },
        { label: "Add Subtitles", command: "add subtitles", type: "secondary" },
        { label: "Add Watermark", command: "add watermark", type: "secondary" },
      ],
      trim: [
        {
          label: "Cut Beginning",
          command: "trim first 10 seconds",
          type: "primary",
        },
        { label: "Cut End", command: "trim last 5 seconds", type: "secondary" },
        {
          label: "Extract Clip",
          command: "extract from 30s to 60s",
          type: "secondary",
        },
        {
          label: "Remove Middle",
          command: "remove from 20s to 40s",
          type: "secondary",
        },
      ],
      crop: [
        {
          label: "Square Crop",
          command: "crop to square format",
          type: "primary",
        },
        {
          label: "16:9 Format",
          command: "crop to 16:9 aspect ratio",
          type: "secondary",
        },
        {
          label: "Center Crop",
          command: "center crop video",
          type: "secondary",
        },
        {
          label: "Custom Crop",
          command: "crop to custom size",
          type: "secondary",
        },
      ],
      audio: [
        {
          label: "Remove Noise",
          command: "remove background noise",
          type: "primary",
        },
        {
          label: "Normalize Volume",
          command: "normalize audio volume",
          type: "secondary",
        },
        {
          label: "Enhance Audio",
          command: "enhance audio quality",
          type: "secondary",
        },
        {
          label: "Add Fade",
          command: "add fade in and out",
          type: "secondary",
        },
      ],
      transition: [
        {
          label: "Fade Transition",
          command: "add fade transition",
          type: "primary",
        },
        {
          label: "Dissolve Effect",
          command: "add dissolve transition",
          type: "secondary",
        },
        {
          label: "Slide Transition",
          command: "add slide transition",
          type: "secondary",
        },
        {
          label: "Wipe Effect",
          command: "add wipe transition",
          type: "secondary",
        },
      ],
      effect: [
        {
          label: "Slow Motion",
          command: "apply slow motion effect",
          type: "primary",
        },
        { label: "Speed Up", command: "speed up video 2x", type: "secondary" },
        {
          label: "Zoom Effect",
          command: "add zoom in effect",
          type: "secondary",
        },
        {
          label: "Stabilize",
          command: "stabilize shaky video",
          type: "secondary",
        },
      ],
    };

    return (
      actionMap[action] || [
        {
          label: "Analyze Video",
          command: "analyze my video",
          type: "primary",
        },
        {
          label: "Export Video",
          command: "export video in HD",
          type: "secondary",
        },
      ]
    );
  }

  // Generate helpful tips based on intent
  generateTips(intent) {
    const { action } = intent;
    const tipMap = {
      background: [
        "Use green screen for best background removal results",
        "Ensure good lighting for clean background separation",
        "Try different similarity values if edges look rough",
        "Blur backgrounds create professional depth of field effects",
        "Gradient backgrounds work great for presentations",
        "Upload custom images for personalized backgrounds",
      ],
      filter: [
        "Filters can dramatically change the mood of your video",
        "Try combining multiple filters for unique effects",
      ],
      brightness: [
        "Small adjustments (20-40) often work better than dramatic changes",
        "Brightness affects the overall exposure, while contrast affects the difference between light and dark areas",
        "Try adjusting brightness and contrast together for best results",
        "You can always reset to the original by setting both to 0",
      ],
      color: [
        "Small adjustments often work better than dramatic changes",
        "Consider the lighting conditions when adjusting colors",
      ],
      text: [
        "Keep text readable by choosing contrasting colors",
        "Position text where it won't cover important content",
      ],
      trim: [
        "Use precise timestamps for accurate cuts",
        "Preview your cuts before applying",
        "Consider preserving audio when trimming",
        "Extract multiple segments for highlight reels",
      ],
      crop: [
        "Maintain aspect ratio for professional look",
        "Center important subjects when cropping",
        "Consider final platform requirements (Instagram, YouTube)",
        "Preview crop on different screen sizes",
      ],
      audio: [
        "Record in quiet environments for best results",
        "Use noise reduction before other audio effects",
        "Normalize volume levels across clips",
        "Add fade effects for smooth transitions",
      ],
      transition: [
        "Match transition style to video mood",
        "Keep transitions short (0.5-2 seconds)",
        "Use dissolves for emotional content",
        "Fade transitions work well for most content",
      ],
      effect: [
        "Use effects sparingly for best impact",
        "Slow motion works great for action shots",
        "Speed effects can create dynamic energy",
        "Stabilization improves handheld footage",
      ],
    };

    return (
      tipMap[action] || [
        "Use natural language to describe what you want to do",
        "You can always undo changes if you're not happy with the result",
      ]
    );
  }
}

export default AIService;
export { AIService };
