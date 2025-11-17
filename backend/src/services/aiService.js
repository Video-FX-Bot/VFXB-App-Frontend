import OpenAI from "openai";
import { logger } from "../utils/logger.js";
import { VideoProcessor } from "./videoProcessor.js";
import { TranscriptionService } from "./transcriptionService.js";
import CaptionService from "./captionService.js";

class AIService {
  constructor() {
    this.openai = null;
    this.videoProcessor = new VideoProcessor();
    this.transcriptionService = new TranscriptionService();
    this.captionService = new CaptionService();
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
      // Separate socket from context (it has circular references and can't be stringified)
      const { socket, ...cleanContext } = context;
      logger.info("Processing chat message:", {
        message,
        context: cleanContext,
      });

      // Analyze user intent (pass cleanContext without socket)
      const intent = await this.analyzeIntent(message, cleanContext);

      // Generate response based on intent (pass cleanContext)
      const response = await this.generateResponse(intent, cleanContext);

      // Don't execute operations for unavailable features or chat
      if (intent.action === "unavailable" || intent.action === "chat") {
        logger.info(
          `${
            intent.action === "unavailable" ? "Unavailable feature" : "Chat"
          } - no operation to execute`
        );
        response.operationResult = null;
      } else if (intent.action === "brightness") {
        // For brightness/contrast effects, let the frontend handle the application
        logger.info(
          "Brightness intent detected, letting frontend handle application"
        );
        response.operationResult = null; // Frontend will apply the effect
      } else if (intent.action === "caption") {
        // For captions, execute the operation in the backend
        logger.info("Caption intent detected, executing caption generation");
        // Pass full context with socket for execution
        const operationResult = await this.executeVideoOperation(intent, {
          ...cleanContext,
          socket,
        });
        response.operationResult = operationResult;
      } else if (intent.action) {
        // Execute other video operations if needed
        // Pass full context with socket for execution
        const operationResult = await this.executeVideoOperation(intent, {
          ...cleanContext,
          socket,
        });
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

    // Check for intensity adjustment patterns (for filters)
    const intensityPatterns = {
      adjust:
        /(?:change|adjust|set|modify|make)\s+(?:the\s+)?(?:filter\s+)?intensity/i,
      increase:
        /(?:increase|raise|stronger|more intense)\s+(?:filter|intensity)/i,
      decrease:
        /(?:decrease|lower|reduce|weaken|tone down|make.*subtle|make.*weaker)\s+(?:filter|intensity)/i,
      percentage: /(?:intensity|filter).*?(\d+)\s*%/i,
      toPercentage: /to\s+(\d+)\s*%/i,
    };

    const hasIntensityRequest =
      intensityPatterns.adjust.test(lowerMessage) ||
      intensityPatterns.increase.test(lowerMessage) ||
      intensityPatterns.decrease.test(lowerMessage) ||
      intensityPatterns.percentage.test(lowerMessage) ||
      intensityPatterns.toPercentage.test(lowerMessage);

    if (
      hasIntensityRequest &&
      context.lastAppliedEffect?.effect === "lut-filter"
    ) {
      // Extract percentage
      let intensity = 100;
      const percentMatch = lowerMessage.match(/(\d+)\s*%/);
      if (percentMatch) {
        intensity = parseInt(percentMatch[1]);
      } else if (intensityPatterns.decrease.test(lowerMessage)) {
        intensity = 50; // Default lower intensity
      } else if (intensityPatterns.increase.test(lowerMessage)) {
        intensity = 100;
      }

      return {
        action: "lut-filter",
        parameters: {
          lut: context.lastAppliedEffect.parameters.lut || "Cinematic",
          intensity: Math.max(0, Math.min(100, intensity)),
        },
        confidence: 0.9,
        explanation: `Adjusting ${
          context.lastAppliedEffect.parameters.lut || "filter"
        } intensity to ${intensity}%`,
        suggestedActions: ["lut-filter", "color", "intensity"],
      };
    }

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

    // Auto trim silence patterns
    if (
      /\b(remove|cut|trim|delete)\s+(silence|dead\s*space|pauses?|quiet\s*parts|gaps?|dead\s*air|filler|awkward\s*silence)\b/i.test(
        message
      ) ||
      /\b(auto\s*trim|silence\s*removal|remove\s*silence)\b/i.test(message)
    ) {
      return {
        action: "auto-trim-silence",
        parameters: {
          silenceThreshold: -30,
          minSilenceDuration: 0.5,
          padding: 0.1,
        },
        confidence: 0.95,
        explanation: "Removing silence and dead space from video",
        suggestedActions: ["trim", "audio"],
      };
    }

    // Auto text-to-video patterns
    if (
      /\b(auto|automatically)\s+(generate|create|add)\s+(text[\s-]?to[\s-]?video|clips?|video\s*clips?)\b/i.test(
        message
      ) ||
      /\b(generate\s+multiple|add\s+clips\s+throughout)\b/i.test(message)
    ) {
      const clipCountMatch = message.match(/(\d+)\s+clips?/i);
      const clipCount = clipCountMatch ? parseInt(clipCountMatch[1]) : 3;

      return {
        action: "auto-text-to-video",
        parameters: {
          clipCount: Math.max(2, Math.min(5, clipCount)),
          clipDuration: 3,
        },
        confidence: 0.95,
        explanation: `Automatically generating ${clipCount} text-to-video clips`,
        suggestedActions: ["text-to-video", "generate-video"],
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
    - brightness: Adjust brightness and contrast (parameters: brightness -100 to 100, contrast -100 to 100)
    - gaussian-blur: Apply Gaussian blur effect (parameters: intensity 0-50)
    - motion-blur: Apply motion blur effect (parameters: intensity 0-50)
    - lut-filter: Apply cinematic color grading LUT filters (parameters: preset - "Warm", "Cool", "Cinematic", "Vintage", "Dramatic", intensity 0-100 for blend strength)
    - cross-dissolve: Add fade in/out transition (parameters: duration 0.1-5 seconds)
    - zoom-transition: Add animated zoom effect (parameters: zoomType - "Zoom In", "Zoom Out", "Zoom In-Out", duration 0.1-5 seconds, centerX/centerY 0-100)
    - snow: Add falling snow particle effect (parameters: density 0-100, size 1-10, speed 0-100)
    - fire: Add fire particle effect (parameters: intensity 0-100, height 10-100, color hex)
    - sparkles: Add sparkles/glitter effect (parameters: count 10-200, size 1-20, lifetime 0.5-5)
    - lens-flare: Add cinematic lens flare effect (parameters: intensity 0-100, x 0-100, y 0-100, color hex)
    - text-to-video: Generate a video clip from text description and insert it into the current video (parameters: prompt - text description of what to generate, position - "beginning"/"end"/"timestamp:X" where X is seconds, duration - clip length in seconds 1-5)
    - auto-text-to-video: Automatically generate and insert multiple AI video clips throughout the entire video based on extracted keywords (parameters: clipCount - number of clips to generate 2-5, clipDuration - length of each clip 2-5 seconds)
    - auto-trim-silence: Automatically detect and remove silence, dead space, and pauses from video to make it more engaging (parameters: silenceThreshold - volume threshold in dB default -30, minSilenceDuration - minimum silence duration to remove in seconds default 0.5, padding - time to keep around speech in seconds default 0.1)
    - caption: Generate and add captions/subtitles from video audio transcription (parameters: style object with fontColor, fontFamily, fontSize, position: "top"/"center"/"bottom", bold: true/false, italic: true/false)
    - trim: Cut/trim video segments (parameters: startTime, endTime, duration, preserveAudio)
    - crop: Resize or crop video (parameters: x, y, width, height, aspectRatio, centerCrop)
    - filter: Apply visual filters (parameters: filterType - vintage, black_white, sepia, blur, sharpen, intensity, blend)
    - color: Color correction (parameters: brightness, contrast, saturation, hue, gamma, shadows, highlights)
    - audio: Audio enhancement, noise removal (parameters: operation - enhance, denoise, normalize, volume, fadeIn, fadeOut)
    - text: Add text overlays, titles (parameters: text, x, y, fontSize, color, fontFamily, startTime, duration, animation, outline)
    - background: Remove or change video background (parameters: action - remove/replace, backgroundType - solid/image/blur/gradient)
    - enhance-quality: Enhance overall video quality with AI upscaling, denoising, and sharpening (parameters: upscale - true/false for 2x resolution, denoise - true/false for noise reduction, sharpen - true/false for sharpening, targetResolution - "720p"/"1080p"/"4k")
    - remove-effect: Remove/undo last applied effect or specific effect type (parameters: effectType - "blur", "filter", "brightness", "quality", "all", or "last")
    - reset-video: Reset video to original state, removing all effects
    - export: Export/download video (parameters: format, quality, resolution)
    - analyze: Analyze video content
    - chat: General conversation
    
    Common user phrases and their mappings:
    - "brighten", "brighter", "lighter", "increase brightness" → brightness with positive brightness value
    - "darken", "darker", "dim", "decrease brightness" → brightness with negative brightness value
    - "more contrast", "higher contrast", "punchier" → brightness with positive contrast value
    - "less contrast", "lower contrast", "softer" → brightness with negative contrast value
    - "blur", "blur it", "make it blurry", "soft focus", "blur the video", "blur the background", "add blur" → gaussian-blur with intensity (NOT background effect)
    - "motion blur", "speed blur", "movement blur" → motion-blur with intensity
    - "cinematic", "movie look", "film look" → lut-filter with preset: "Cinematic", intensity: 100
    - "warm tones", "warmer", "orange look", "sunset feel" → lut-filter with preset: "Warm", intensity: 100
    - "cool tones", "cooler", "blue look", "cold feel" → lut-filter with preset: "Cool", intensity: 100
    - "vintage", "retro", "old film", "nostalgic" → lut-filter with preset: "Vintage", intensity: 100
    - "dramatic", "intense", "bold colors", "high contrast" → lut-filter with preset: "Dramatic", intensity: 100
    - "reduce filter intensity", "lower filter to 50%", "make filter subtle", "tone down the filter" → lut-filter with same preset but lower intensity (extract percentage if mentioned)
    - "increase filter intensity", "stronger filter", "more intense" → lut-filter with same preset but higher intensity
    - "fade in", "fade out", "dissolve", "crossfade", "fade transition" → cross-dissolve with duration
    - "zoom in", "zoom into video", "zoom effect", "ken burns" → zoom-transition with zoomType: "Zoom In"
    - "zoom out", "zoom out effect" → zoom-transition with zoomType: "Zoom Out"
    - "zoom in and out", "zoom in then out" → zoom-transition with zoomType: "Zoom In-Out"
    - "snow effect", "add snow", "falling snow", "snow particles", "make it snow", "snowing" → snow with density 50, size 3, speed 30
    - "fire effect", "add fire", "flames", "fire particles", "burning" → fire with intensity 70, height 50
    - "sparkles", "glitter", "sparkle effect", "add sparkles", "twinkling", "shimmer" → sparkles with count 50, size 5
    - "lens flare", "add lens flare", "light flare", "sun flare", "flare effect", "cinematic flare", "light leak", "add flare" → lens-flare with intensity 50, x 50, y 50
    - "generate video", "create video", "add a flying cat", "add a dragon", "add a [subject]", "generate a clip of", "create a clip with", "insert a video of" → text-to-video with prompt (extracted subject), position (beginning/end/timestamp)
    - "add [subject] at the beginning", "add [subject] at the start" → text-to-video with position: "beginning"
    - "add [subject] at the end", "append [subject]" → text-to-video with position: "end"
    - "add [subject] at 5 seconds", "insert [subject] at 10s" → text-to-video with position: "timestamp:X"
    - "automatically generate text to video", "auto generate clips", "generate multiple clips", "add text to video effects throughout", "auto text to video", "generate clips throughout video" → auto-text-to-video with clipCount (default 3), clipDuration (default 3)
    - "remove silence", "cut silence", "trim silence", "remove dead space", "remove pauses", "cut out silence", "auto trim", "remove quiet parts", "remove gaps", "cut dead air", "trim dead space", "remove filler", "cut pauses", "remove awkward silence" → auto-trim-silence with silenceThreshold (default -30), minSilenceDuration (default 0.5), padding (default 0.1)
    - "remove background", "green screen", "chroma key" → background with action: remove
    - "enhance video quality", "improve quality", "upscale", "make it HD", "make it 4K", "increase resolution", "improve video", "enhance quality", "quality upgrade", "denoise", "reduce noise", "sharpen video", "make it sharper", "make it clearer" → enhance-quality (with appropriate parameters based on request: upscale for resolution increase, denoise for noise, sharpen for sharpness)
    - "add captions", "add subtitles", "generate captions", "caption this", "transcribe", "subtitle this", "captions", "subtitles" → caption (NOT text - caption generates from audio)
    
    For caption styling, extract these parameters:
    - Color: "red captions", "yellow subtitles", "white captions" → style.fontColor: "red", "yellow", "white" (or any color)
    - Position: "top captions", "bottom subtitles", "center captions", "middle captions" → style.position: "top", "bottom", "center"
    - Font: "Arial captions", "bold captions", "italic subtitles" → style.fontFamily: "Arial", style.bold: true, style.italic: true
    - Size: "large captions", "small subtitles", "18px captions" → style.fontSize: number (12-48)
    - Examples:
      * "add yellow captions at the top" → caption with style: { fontColor: "yellow", position: "top" }
      * "add bold red subtitles" → caption with style: { fontColor: "red", bold: true }
      * "add captions at the center" → caption with style: { position: "center" }
      * "add captions in the middle" → caption with style: { position: "center" }
    
    IMPORTANT: Captions are burned into the video and cannot be moved or modified after creation.
    - "move captions", "change caption color", "reposition subtitles" → Respond with chat explaining captions must be regenerated with new styling
    - To change captions, user must say "add [color] captions at [position]" to replace them
    
    - "add title", "put text", "add text", "text overlay" → text (for custom text overlays)
    - "cut from X to Y", "trim", "shorten" → trim
    - "crop video", "resize", "change aspect ratio" → crop
    - "louder", "quieter", "remove noise", "clean audio" → audio
    - "remove filter", "remove the filter", "undo filter", "remove effect", "undo effect", "remove blur", "remove enhancement", "undo", "undo last", "remove last effect", "go back", "revert" → remove-effect (with effectType based on what they mention: "blur", "filter", "brightness", "quality", "enhancement", or "last")
    - "reset video", "start over", "remove all effects", "reset to original", "clear all effects" → reset-video
    
    Context: ${JSON.stringify(context)}
    
    ${
      context.appliedEffects && context.appliedEffects.length > 0
        ? `
    Currently Applied Effects (in order):
    ${context.appliedEffects
      .map(
        (e, i) =>
          `${i + 1}. ${e.effect || e.id || e.type} - ${JSON.stringify(
            e.parameters || {}
          )}`
      )
      .join("\n")}
    
    IMPORTANT for remove-effect:
    - If user says "remove filter" or "remove the filter" and there are multiple filters, identify which one they mean based on context
    - If ambiguous, remove the MOST RECENTLY applied filter of that type
    - Set effectType to the EXACT effect name from the list above (e.g., "lut-filter", "gaussian-blur", "brightness")
    - If no effects match the user's request, set effectType to "none" and confidence to 0
    `
        : ""
    }
    
    
    IMPORTANT: 
    - ONLY use actions from the available list above. 
    - If the user requests something not in the available operations, set action to "unavailable" and explain what they asked for in the explanation.
    - Do NOT map unavailable features to similar available ones.
    - For example: if user asks for "speed up" or "slow motion" but that's not in available operations, return action: "unavailable"
    
    Respond with a JSON object containing:
    {
      "action": "operation_name or unavailable",
      "parameters": {},
      "confidence": 0.95,
      "explanation": "What the user wants to do",
      "suggestedActions": ["action1", "action2"],
      "requestedFeature": "name of unavailable feature if action is unavailable"
    }`;

    try {
      const completion = await this.getOpenAI().chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const response = completion.choices[0].message.content;
      const intent = JSON.parse(response);

      // Log what OpenAI returned for debugging
      logger.info(`OpenAI intent analysis:`, {
        action: intent.action,
        parameters: intent.parameters,
        confidence: intent.confidence,
      });

      // Validate that the action is in our available list
      const availableActions = [
        "brightness",
        "gaussian-blur",
        "motion-blur",
        "lut-filter",
        "cross-dissolve",
        "zoom-transition",
        "snow",
        "fire",
        "sparkles",
        "lens-flare",
        "text-to-video",
        "generate-video",
        "add-generated-clip",
        "auto-text-to-video",
        "auto-trim-silence",
        "remove-silence",
        "trim-silence",
        "trim",
        "crop",
        "filter",
        "color",
        "audio",
        "text",
        "caption",
        "background",
        "enhance-quality",
        "remove-effect",
        "reset-video",
        "export",
        "analyze",
        "chat",
        "unavailable",
      ];

      if (!availableActions.includes(intent.action)) {
        logger.warn(
          `OpenAI returned unavailable action: ${intent.action}, marking as unavailable`
        );
        return {
          action: "unavailable",
          parameters: {},
          confidence: intent.confidence || 0.8,
          explanation: intent.explanation,
          suggestedActions: intent.suggestedActions || [],
          requestedFeature: intent.action,
        };
      }

      return intent;
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
      case "unavailable":
        message = `I don't have that feature available yet. 😅 But I can help you with brightness/contrast, blur effects, color grading (warm, cool, cinematic), zoom transitions, fade effects, auto text-to-video generation, silence removal, and captions! Try saying "make it cinematic", "remove silence", or "add captions".`;
        break;

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

      case "enhance-quality":
        const { upscale, denoise, sharpen, targetResolution } =
          intent.parameters;
        let enhancements = [];
        if (denoise) enhancements.push("noise reduction");
        if (sharpen) enhancements.push("enhanced sharpness (+50%)");
        enhancements.push("contrast boost (+15%)");
        enhancements.push("color saturation (+20%)");
        if (upscale) enhancements.push("resolution upscaling");
        if (targetResolution)
          enhancements.push(`targeting ${targetResolution}`);

        if (enhancements.length > 0) {
          message = `I'll significantly enhance your video quality with:\n• ${enhancements.join(
            "\n• "
          )}\n\nYou'll notice clearer details, better colors, and improved overall quality. This may take a moment...`;
        } else {
          message =
            "I'll enhance your video quality with professional-grade improvements. Processing now...";
        }
        break;

      case "remove-effect":
        const effectType = intent.parameters.effectType || "last";
        if (effectType === "all") {
          message =
            "I'll reset your video to the original state, removing all effects...";
        } else if (effectType === "last") {
          message =
            "I'll remove the last effect that was applied to your video...";
        } else {
          message = `I'll remove the ${effectType} effect from your video...`;
        }
        break;

      case "reset-video":
        message =
          "I'll reset your video to the original state, removing all applied effects...";
        break;

      case "auto-trim-silence":
      case "remove-silence":
      case "trim-silence":
        message =
          "I'll analyze your video and automatically remove all silence, dead space, and pauses to make it more engaging and fast-paced. This might take a moment...";
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

    // Handle unavailable features
    if (intent.action === "unavailable") {
      const unavailablePrompt = `You are VFXB AI, a friendly video editing assistant. The user asked for a feature that isn't available yet.
      
      User requested: ${intent.requestedFeature || intent.explanation}
      
      Guidelines:
      - Politely explain that this feature isn't available yet
      - Be empathetic and understanding
      - Suggest 2-3 alternative features they CAN use that might achieve a similar result
      - Keep it brief and friendly
      
      Available features they CAN use:
      - Brightness/Contrast adjustments
      - Blur effects (Gaussian, Motion)
      - Color grading (Warm, Cool, Cinematic, Vintage, Dramatic)
      - Fade transitions
      - Zoom effects
      - Crop and Trim
      
      Response format (MUST be valid JSON):
      {
        "message": "I don't have that feature yet, but here's what I can do...",
        "actions": [
          {"label": "Alternative Action", "command": "user-friendly command", "type": "secondary"}
        ],
        "tips": ["Helpful tip about available alternatives"]
      }`;

      try {
        const completion = await this.getOpenAI().chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
          messages: [
            { role: "system", content: unavailablePrompt },
            { role: "user", content: intent.explanation },
          ],
          temperature: 0.7,
          max_tokens: 300,
        });

        let response;
        try {
          response = JSON.parse(completion.choices[0].message.content);
        } catch (parseError) {
          response = {
            message: `I don't have that feature available yet. 😅 But I can help you with color grading, blur effects, zoom transitions, auto text-to-video, silence removal, captions, and more!`,
            actions: [
              {
                label: "Try Cinematic Look",
                command: "make it cinematic",
                type: "secondary",
              },
              {
                label: "Add Blur",
                command: "add some blur",
                type: "secondary",
              },
            ],
            tips: ["Ask me about color grading or transitions!"],
          };
        }

        return {
          message: response.message,
          actions: response.actions || [],
          tips: response.tips || [],
          intent: intent,
          timestamp: new Date().toISOString(),
          type: "ai",
        };
      } catch (error) {
        logger.error("Error generating unavailable feature response:", error);
        return {
          message: `I don't have that feature available yet. 😅 But I can help you with brightness, contrast, blur effects, color grading, zoom transitions, fade effects, auto text-to-video, silence removal, and captions!`,
          actions: [
            {
              label: "Try Cinematic Look",
              command: "make it cinematic",
              type: "secondary",
            },
            {
              label: "Remove Silence",
              command: "remove silence from my video",
              type: "secondary",
            },
          ],
          tips: [
            "Try asking: 'make it cinematic', 'remove silence', or 'add captions'",
          ],
          intent: intent,
          timestamp: new Date().toISOString(),
          type: "ai",
        };
      }
    }

    const systemPrompt = `You are VFXB AI, a friendly and enthusiastic video editing assistant. You help users create amazing videos through natural conversation.
    
    Current intent action: ${intent.action}
    Parameters: ${JSON.stringify(intent.parameters)}
    Explanation: ${intent.explanation}
    
    Guidelines:
    - Be warm, conversational, and genuinely excited about their edits
    - Use casual language and occasional emojis to feel more personal
    - Explain what you're doing in simple, creative terms (e.g., "Adding that cinematic movie magic!" instead of "Applying LUT filter")
    - Keep responses brief and engaging (1-2 sentences max)
    - Always mention you're processing their video and it'll be ready in a moment
    - For visual effects, describe what they'll see (e.g., "Your video will have that warm, sunset glow!")
    - Suggest creative next steps they might enjoy
    - IMPORTANT: For lut-filter, use the EXACT preset name from parameters (Warm, Cool, Cinematic, Vintage, or Dramatic)
    
    Effect-specific responses:
    - Brightness/Contrast: "Adjusting the lighting to make it pop!" or "Bringing out those details!"
    - Blur effects: "Adding that dreamy blur effect!" or "Creating some artistic motion blur!"
    - LUT filters (lut-filter): "Adding [USE THE PRESET NAME FROM PARAMETERS] color grading!" - e.g., if preset is "Warm", say "Warm", if "Cool" say "Cool"
    - Transitions: "Adding smooth fade transitions!" or "Creating a dynamic zoom effect!"
    - Zoom: "Zooming [in/out] for that cinematic feel!"
    - Captions: "Generating captions from your video's audio!" or "Transcribing and adding captions!"
    
    Response format (MUST be valid JSON):
    {
      "message": "Your enthusiastic, brief response with what you're doing",
      "actions": [
        {"label": "Suggested Action", "command": "user-friendly command", "type": "primary|secondary"}
      ],
      "tips": ["Quick creative tip related to their edit"]
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
      let { videoId, videoPath } = context;

      // If videoPath is not provided, fetch it from the database
      if (!videoPath && videoId) {
        const { Video } = await import("../models/Video.js");
        const video = await Video.findById(videoId);
        if (video) {
          videoPath = video.filePath;
          logger.info(`📹 Fetched video path from database: ${videoPath}`);
        } else {
          throw new Error(`Video not found: ${videoId}`);
        }
      }

      if (!videoPath) {
        throw new Error("Video path is required for this operation");
      }

      // 🔍 Debug: Log the videoPath being used
      logger.info(`🎬 Executing video operation:`, {
        action,
        videoId,
        videoPath,
        parameters,
      });

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

        case "caption":
          return await this.generateAndApplyCaptions(videoPath, parameters);

        case "text-to-video":
        case "generate-video":
        case "add-generated-clip":
          return await this.generateAndInsertVideoClip(
            videoPath,
            videoId,
            parameters,
            context.socket // Pass socket for progress updates
          );

        case "auto-text-to-video":
          return await this.autoGenerateTextToVideoClips(
            videoPath,
            videoId,
            parameters,
            context.socket // Pass socket for progress updates
          );

        case "auto-trim-silence":
        case "remove-silence":
        case "trim-silence":
          return await this.autoTrimSilence(
            videoPath,
            videoId,
            parameters,
            context.socket // Pass socket for progress updates
          );

        case "enhance-quality":
          return await this.enhanceVideoQuality(
            videoPath,
            videoId,
            parameters,
            context.socket // Pass socket for progress updates
          );

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

  // Generate and apply captions to video
  async generateAndApplyCaptions(videoPath, parameters = {}) {
    try {
      logger.info(`🎤 Generating captions for video: ${videoPath}`);

      // Generate captions from video audio
      const captionResult = await this.captionService.generateCaptions(
        videoPath
      );

      if (!captionResult.success || !captionResult.captions) {
        throw new Error("Failed to generate captions from video audio");
      }

      logger.info(
        `✅ Generated ${captionResult.captions.length} caption segments`
      );

      // Default styling (can be customized via parameters)
      const style = {
        fontFamily: parameters.fontFamily || "Arial",
        fontSize: parameters.fontSize || 24,
        fontColor: parameters.fontColor || "#ffffff",
        outlineColor: parameters.outlineColor || "#000000",
        outlineWidth: parameters.outlineWidth || 2,
        position: parameters.position || "bottom",
        alignment: parameters.alignment || "center",
        bold: parameters.bold || false,
        italic: parameters.italic || false,
      };

      // Apply captions to video
      logger.info(
        `📝 Applying ${captionResult.captions.length} captions to video`
      );
      const result = await this.captionService.applyCaptionsToVideo(
        videoPath,
        captionResult.captions,
        style
      );

      // Return in the same format as effects so frontend can handle it
      return {
        success: true,
        outputPath: result.outputPath,
        operation: "caption",
        parameters: {
          captionCount: captionResult.captions.length,
          language: captionResult.language,
          style: style,
        },
        metadata: {
          processingTime: Date.now(),
          captions: captionResult.captions,
        },
      };
    } catch (error) {
      logger.error("Error generating/applying captions:", error);
      return {
        success: false,
        error: error.message,
        message:
          "Failed to generate or apply captions. Make sure the video has clear audio.",
      };
    }
  }

  // Generate video clip from text and insert into existing video
  async generateAndInsertVideoClip(
    videoPath,
    videoId,
    parameters = {},
    socket = null
  ) {
    try {
      logger.info(`🎬 Generating and inserting video clip from text`);
      logger.info(`Parameters:`, parameters);

      // Emit progress: Starting
      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 10,
          message: "Starting text-to-video generation...",
          operation: "text-to-video",
        });
      }

      // Import HuggingFace service
      const huggingFaceService = (await import("./huggingFaceService.js"))
        .default;

      // Parse parameters
      const prompt =
        parameters.prompt || parameters.subject || "cinematic scene";
      const position = parameters.position || "beginning";
      const duration = parameters.duration || 3;

      logger.info(`🎨 Prompt: "${prompt}"`);
      logger.info(`📍 Position: ${position}`);
      logger.info(`⏱️ Duration: ${duration}s`);

      // Emit progress: Generating image
      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 20,
          message: `Generating image from: "${prompt}"`,
          operation: "text-to-video",
        });
      }

      // Generate video clip from text
      logger.info(`🤖 Generating video from prompt...`);
      const generatedVideoPath = await huggingFaceService.textToVideo(prompt, {
        duration,
        fps: 24,
      });

      logger.info(`✅ Generated video: ${generatedVideoPath}`);

      // Emit progress: Converting to video
      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 50,
          message: "Converting image to video clip...",
          operation: "text-to-video",
        });
      }

      // Emit progress: Inserting into video
      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 60,
          message: "Inserting clip into your video...",
          operation: "text-to-video",
        });
      }

      // Insert the generated clip into the user's video
      logger.info(`🔗 Inserting generated clip at position: ${position}`);
      const combinedVideoPath = await this.videoProcessor.insertVideoClip(
        videoPath,
        generatedVideoPath,
        position
      );

      logger.info(`✅ Combined video created: ${combinedVideoPath}`);

      // Emit progress: Finalizing
      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 90,
          message: "Finalizing video...",
          operation: "text-to-video",
        });
      }

      // Update video record in database
      if (videoId) {
        const { Video } = await import("../models/Video.js");
        const path = await import("path");

        // Get the original video to get userId and existing effects
        const originalVideo = await Video.findById(videoId);

        // Get metadata of new video
        const metadata = await this.videoProcessor.getVideoMetadata(
          combinedVideoPath
        );

        // Copy all existing effects from the original video
        const previousEffects = originalVideo.appliedEffects || [];

        // Add the new text-to-video effect
        const allEffects = [
          ...previousEffects,
          {
            effect: "text-to-video",
            parameters: { prompt, position, duration },
            appliedAt: new Date(),
          },
        ];

        logger.info(
          `📋 Preserving ${previousEffects.length} previous effects + adding text-to-video`
        );

        // Create new video record
        const newVideo = await Video.create({
          title: `${originalVideo.title || "Video"} (with generated ${prompt})`,
          userId: originalVideo.userId,
          filename: path.basename(combinedVideoPath),
          originalFilename: path.basename(combinedVideoPath),
          filePath: combinedVideoPath,
          parentVideoId: videoId,
          duration: metadata.duration,
          fileSize: metadata.size,
          resolution: {
            width: metadata.video?.width || 1280,
            height: metadata.video?.height || 720,
          },
          frameRate: metadata.video?.fps || 24,
          appliedEffects: allEffects,
        });

        logger.info(`✅ New video record created: ${newVideo._id}`);
        logger.info(
          `📋 Returning ${allEffects.length} applied effects to frontend`
        );

        // Emit completion
        if (socket) {
          socket.emit("video_processing", {
            status: "ready",
            progress: 100,
            message: "Text-to-video generation complete!",
            operation: "text-to-video",
          });
        }

        return {
          success: true,
          outputPath: combinedVideoPath,
          videoId: newVideo._id,
          operation: "text-to-video",
          parameters: { prompt, position, duration },
          appliedEffects: allEffects, // Send all effects to frontend
          message: `Generated and inserted video clip: "${prompt}"`,
        };
      }

      return {
        success: true,
        outputPath: combinedVideoPath,
        operation: "text-to-video",
        parameters: { prompt, position, duration },
        message: `Generated and inserted video clip: "${prompt}"`,
      };
    } catch (error) {
      logger.error("Error generating/inserting video clip:", error);
      return {
        success: false,
        error: error.message,
        message: `Failed to generate video clip: ${error.message}`,
      };
    }
  }

  /**
   * Automatically generate and insert multiple text-to-video clips throughout the video
   * Uses AI to extract keywords from video content and generate relevant clips
   * @param {string} videoPath - Path to the video file
   * @param {string} videoId - Video ID from database
   * @param {object} parameters - Configuration parameters
   * @param {object} socket - Socket.io connection for progress updates
   * @returns {Promise<object>} - Result with all generated clips
   */
  async autoGenerateTextToVideoClips(
    videoPath,
    videoId,
    parameters = {},
    socket = null
  ) {
    try {
      logger.info(`🤖 Auto-generating text-to-video clips throughout video`);

      // Emit initial progress
      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 5,
          message: "Analyzing video to extract keywords...",
          operation: "auto-text-to-video",
        });
      }

      // Get video metadata to determine duration
      const metadata = await this.videoProcessor.getVideoMetadata(videoPath);
      const videoDuration = metadata.duration;

      logger.info(`📹 Video duration: ${videoDuration}s`);

      // Extract keywords using AI
      const clipCount = parameters.clipCount || 3; // Default to 3 clips
      const clipDuration = parameters.clipDuration || 3; // Each clip 3s

      logger.info(`🎯 Generating ${clipCount} clips of ${clipDuration}s each`);

      // Emit progress
      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 10,
          message: "Extracting keywords from video...",
          operation: "auto-text-to-video",
        });
      }

      // Get keywords WITH TIMESTAMPS from transcript analysis
      const keywordObjects = await this.extractKeywordsForVideo(
        videoId,
        clipCount
      );

      logger.info(`🔑 Extracted keywords with timestamps:`, keywordObjects);

      // Emit progress
      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 20,
          message: `Found ${keywordObjects.length} keywords. Generating clips...`,
          operation: "auto-text-to-video",
        });
      }

      // Import HuggingFace service
      const huggingFaceService = (await import("./huggingFaceService.js"))
        .default;

      let currentVideoPath = videoPath;
      let currentVideoId = videoId;
      const generatedClips = [];

      // Validate and sanitize timestamps before processing
      for (let i = 0; i < keywordObjects.length; i++) {
        if (
          !keywordObjects[i].timestamp ||
          isNaN(keywordObjects[i].timestamp)
        ) {
          const fallbackTimestamp = Math.floor(
            (videoDuration / (keywordObjects.length + 1)) * (i + 1)
          );
          logger.warn(
            `⚠️ Invalid timestamp for "${keywordObjects[i].keyword}": ${keywordObjects[i].timestamp}, using fallback ${fallbackTimestamp}s`
          );
          keywordObjects[i].timestamp = fallbackTimestamp;
        }
      }

      // Generate and insert each clip using transcript-aligned timestamps
      for (let i = 0; i < keywordObjects.length; i++) {
        const { keyword, timestamp } = keywordObjects[i];
        const progressPercent =
          20 + Math.floor((i / keywordObjects.length) * 70);

        logger.info(
          `\n🎬 [${i + 1}/${
            keywordObjects.length
          }] Generating clip: "${keyword}" at ${timestamp}s (aligned with speech)`
        );

        // Emit progress
        if (socket) {
          socket.emit("video_processing", {
            status: "processing",
            progress: progressPercent,
            message: `Generating clip ${i + 1}/${
              keywordObjects.length
            }: "${keyword}" at ${timestamp}s`,
            operation: "auto-text-to-video",
          });
        }

        // Generate the video clip
        const generatedClipPath = await huggingFaceService.textToVideo(
          keyword,
          {
            duration: clipDuration,
            fps: 24,
          }
        );

        logger.info(`✅ Generated clip: ${generatedClipPath}`);

        // Replace segment at calculated timestamp (overlay mode - maintains video length)
        const combinedVideoPath = await this.videoProcessor.replaceAtTimestamp(
          currentVideoPath,
          generatedClipPath,
          timestamp
        );

        logger.info(
          `✅ Replaced segment at ${timestamp}s: ${combinedVideoPath}`
        );

        // Update for next iteration
        currentVideoPath = combinedVideoPath;

        generatedClips.push({
          keyword,
          timestamp,
          clipPath: generatedClipPath,
        });
      }

      // Emit progress: Finalizing
      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 95,
          message: "Finalizing video with all clips...",
          operation: "auto-text-to-video",
        });
      }

      // Update video record in database
      if (videoId) {
        const { Video } = await import("../models/Video.js");
        const path = await import("path");

        // Get the original video
        const originalVideo = await Video.findById(videoId);

        // Get metadata of new video
        const newMetadata = await this.videoProcessor.getVideoMetadata(
          currentVideoPath
        );

        // Copy all existing effects
        const previousEffects = originalVideo.appliedEffects || [];

        // Add the auto text-to-video effect
        const allEffects = [
          ...previousEffects,
          {
            effect: "auto-text-to-video",
            parameters: {
              clipCount: keywordObjects.length,
              clipDuration,
              keywordObjects, // Store the keyword + timestamp pairs
            },
            appliedAt: new Date(),
          },
        ];

        logger.info(
          `📋 Creating video with ${allEffects.length} total effects`
        );

        // Create new video record
        const newVideo = await Video.create({
          title: `${originalVideo.title || "Video"} (Auto Text-to-Video)`,
          userId: originalVideo.userId,
          filename: path.basename(currentVideoPath),
          originalFilename: path.basename(currentVideoPath),
          filePath: currentVideoPath,
          parentVideoId: videoId,
          duration: newMetadata.duration,
          fileSize: newMetadata.size,
          resolution: {
            width: newMetadata.video?.width || 1280,
            height: newMetadata.video?.height || 720,
          },
          frameRate: newMetadata.video?.fps || 24,
          appliedEffects: allEffects,
        });

        logger.info(`✅ New video created: ${newVideo._id}`);

        // Emit completion
        if (socket) {
          socket.emit("video_processing", {
            status: "ready",
            progress: 100,
            message: `Successfully generated ${keywordObjects.length} text-to-video clips aligned with speech!`,
            operation: "auto-text-to-video",
          });
        }

        return {
          success: true,
          outputPath: currentVideoPath,
          videoId: newVideo._id,
          operation: "auto-text-to-video",
          generatedClips,
          keywordObjects, // Return keyword + timestamp pairs
          appliedEffects: allEffects,
          message: `Generated ${keywordObjects.length} text-to-video clips aligned with transcript`,
        };
      }

      return {
        success: true,
        outputPath: currentVideoPath,
        operation: "auto-text-to-video",
        generatedClips,
        keywordObjects, // Return keyword + timestamp pairs
        message: `Generated ${keywordObjects.length} text-to-video clips`,
      };
    } catch (error) {
      logger.error("Error auto-generating text-to-video clips:", error);

      if (socket) {
        socket.emit("video_processing", {
          status: "error",
          progress: 0,
          message: `Failed: ${error.message}`,
          operation: "auto-text-to-video",
        });
      }

      return {
        success: false,
        error: error.message,
        message: `Failed to auto-generate clips: ${error.message}`,
      };
    }
  }

  /**
   * Generate and burn subtitles into video from transcription
   * @param {string} videoPath - Path to input video
   * @param {string} videoId - Video ID from database
   * @param {object} parameters - Subtitle parameters (transcription, style, etc)
   * @param {object} socket - Socket.io connection for progress updates
   * @returns {Promise<object>} - Result with subtitled video path
   */
  async generateSubtitles(videoPath, videoId, parameters = {}, socket = null) {
    try {
      logger.info("📝 Generating subtitles for video");

      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 5,
          message: "Preparing subtitle generation...",
          operation: "auto-subtitles",
        });
      }

      const { transcription, style = {} } = parameters;

      if (!transcription || !transcription.text) {
        throw new Error("No transcription data available for subtitles");
      }

      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 20,
          message: "Creating subtitle file...",
          operation: "auto-subtitles",
        });
      }

      // Generate subtitles using videoProcessor
      const result = await this.videoProcessor.generateSubtitles(
        videoPath,
        transcription,
        style
      );

      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 80,
          message: "Burning subtitles into video...",
          operation: "auto-subtitles",
        });
      }

      if (!result.success) {
        throw new Error(result.error || "Subtitle generation failed");
      }

      // Update video in database
      const { Video } = await import("../models/Video.js");
      const video = await Video.findById(videoId);

      if (video && result.outputPath !== videoPath) {
        const metadata = await this.videoProcessor.getVideoMetadata(
          result.outputPath
        );

        const existingEffects = video.appliedEffects || [];
        const newEffect = {
          effect: "auto-subtitles",
          parameters: {
            style: style,
            transcriptionLength: transcription.text.length,
          },
          timestamp: new Date().toISOString(),
        };

        video.filePath = result.outputPath;
        video.duration = metadata.duration;
        video.fileSize = metadata.format?.size || video.fileSize;
        video.appliedEffects = [...existingEffects, newEffect];
        await video.save();

        logger.info("✅ Updated video with subtitles");

        if (socket) {
          socket.emit("video_updated", {
            videoId: videoId,
            filePath: result.outputPath,
            duration: metadata.duration,
            operation: "auto-subtitles",
            appliedEffects: video.appliedEffects,
            timestamp: Date.now(),
          });
        }
      }

      if (socket) {
        await new Promise((resolve) => setTimeout(resolve, 100));

        socket.emit("video_processing", {
          status: "completed",
          progress: 100,
          message: "Subtitles added successfully!",
          operation: "auto-subtitles",
          videoId: videoId,
          newPath: result.outputPath,
          isUpdate: true,
          timestamp: Date.now(),
        });
      }

      return {
        success: true,
        outputPath: result.outputPath,
        videoId: videoId,
        isUpdate: true,
        operation: "auto-subtitles",
        message: "Subtitles generated and added to video",
      };
    } catch (error) {
      logger.error("❌ Error generating subtitles:", error);

      if (socket) {
        socket.emit("video_processing", {
          status: "error",
          progress: 0,
          message: `Subtitle generation failed: ${error.message}`,
          operation: "auto-subtitles",
        });
      }

      return {
        success: false,
        error: error.message,
        message: `Failed to generate subtitles: ${error.message}`,
      };
    }
  }

  /**
   * Enhance video quality using AI upscaling and enhancement
   * @param {string} videoPath - Path to input video
   * @param {string} videoId - Video ID from database
   * @param {object} parameters - Enhancement parameters
   * @param {object} socket - Socket.io connection for progress updates
   * @returns {Promise<object>} - Result with enhanced video path
   */
  async enhanceVideoQuality(
    videoPath,
    videoId,
    parameters = {},
    socket = null
  ) {
    try {
      logger.info("🎨 AI-enhancing video quality");

      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 5,
          message: "Preparing AI video enhancement...",
          operation: "enhance-quality",
        });
      }

      const {
        upscale = true,
        denoise = true,
        sharpen = true,
        targetResolution = null,
      } = parameters;

      // Determine upscale factor based on target resolution
      let upscaleFactor = 2;
      if (targetResolution === "4k" || targetResolution === "2160p") {
        upscaleFactor = 4;
      } else if (targetResolution === "1080p") {
        upscaleFactor = 2;
      }

      logger.info(
        `🎚️ Enhancement settings: upscale=${upscaleFactor}x, denoise=${denoise}, sharpen=${sharpen}`
      );

      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 10,
          message: "Extracting video frames for AI processing...",
          operation: "enhance-quality",
        });
      }

      // Perform AI enhancement using Hugging Face
      const huggingFaceService = await import("./huggingFaceService.js");

      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 30,
          message:
            "Enhancing frames with AI models (this may take a few minutes)...",
          operation: "enhance-quality",
        });
      }

      const enhancedVideoPath =
        await huggingFaceService.default.enhanceVideoQuality(videoPath, {
          upscaleFactor: upscale ? upscaleFactor : 1,
          denoise,
          sharpen,
        });

      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 80,
          message: "Finalizing enhanced video...",
          operation: "enhance-quality",
        });
      }

      // Update video in database
      const { Video } = await import("../models/Video.js");
      const video = await Video.findById(videoId);

      if (video && enhancedVideoPath !== videoPath) {
        const metadata = await this.videoProcessor.getVideoMetadata(
          enhancedVideoPath
        );

        const existingEffects = video.appliedEffects || [];
        const newEffect = {
          effect: "enhance-quality",
          parameters: {
            upscaleFactor: upscale ? upscaleFactor : 1,
            denoise,
            sharpen,
            targetResolution,
          },
          timestamp: new Date().toISOString(),
        };

        video.filePath = enhancedVideoPath;
        video.duration = metadata.duration;
        video.fileSize = metadata.format?.size || video.fileSize;
        video.width = metadata.width;
        video.height = metadata.height;
        video.appliedEffects = [...existingEffects, newEffect];
        await video.save();

        logger.info("✅ Updated video with AI enhancement");

        if (socket) {
          socket.emit("video_updated", {
            videoId: videoId,
            filePath: enhancedVideoPath,
            duration: metadata.duration,
            width: metadata.width,
            height: metadata.height,
            operation: "enhance-quality",
            appliedEffects: video.appliedEffects,
            timestamp: Date.now(),
          });
        }
      }

      if (socket) {
        await new Promise((resolve) => setTimeout(resolve, 100));

        socket.emit("video_processing", {
          status: "completed",
          progress: 100,
          message: `Video quality enhanced with AI! Resolution: ${upscaleFactor}x upscaling`,
          operation: "enhance-quality",
          videoId: videoId,
          newPath: enhancedVideoPath,
          isUpdate: true,
          timestamp: Date.now(),
        });
      }

      return {
        success: true,
        outputPath: enhancedVideoPath,
        videoId: videoId,
        isUpdate: true,
        operation: "enhance-quality",
        upscaleFactor,
        message: `Video quality enhanced with ${upscaleFactor}x AI upscaling`,
      };
    } catch (error) {
      logger.error("❌ Error enhancing video quality:", error);
      logger.error("❌ Error stack:", error.stack);

      if (socket) {
        socket.emit("video_processing", {
          status: "error",
          progress: 0,
          message: `Enhancement failed: ${error.message}`,
          operation: "enhance-quality",
        });
      }

      return {
        success: false,
        error: error.message,
        message: `Failed to enhance video: ${error.message}`,
      };
    }
  }

  /**
   * Automatically trim silence and dead space from video
   * @param {string} videoPath - Path to input video
   * @param {string} videoId - Video ID from database
   * @param {object} parameters - Trimming parameters
   * @param {object} socket - Socket.io connection for progress updates
   * @returns {Promise<object>} - Result with trimmed video path
   */
  async autoTrimSilence(videoPath, videoId, parameters = {}, socket = null) {
    try {
      logger.info(`🤖 Auto-trimming silence from video`);

      // Emit initial progress
      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 5,
          message: "Analyzing audio to detect silence...",
          operation: "auto-trim-silence",
        });
      }

      // Extract parameters with defaults
      const silenceThreshold = parameters.silenceThreshold || -30; // dB
      const minSilenceDuration = parameters.minSilenceDuration || 0.5; // seconds
      const padding = parameters.padding || 0.1; // seconds

      logger.info(
        `🎚️ Silence detection settings: threshold=${silenceThreshold}dB, minDuration=${minSilenceDuration}s, padding=${padding}s`
      );

      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 20,
          message: "Analyzing audio with advanced detection...",
          operation: "auto-trim-silence",
        });
      }

      // Perform auto-trim silence using advanced audio analysis
      const huggingFaceService = await import("./huggingFaceService.js");
      const trimmedVideoPath =
        await huggingFaceService.default.autoTrimSilenceWithAI(videoPath, {
          silenceThreshold,
          minSilenceDuration,
          padding,
        });

      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 80,
          message: "Finalizing trimmed video...",
          operation: "auto-trim-silence",
        });
      }

      logger.info(`📊 Getting metadata for original video: ${videoPath}`);

      // Calculate time saved
      const originalMetadata = await this.videoProcessor.getVideoMetadata(
        videoPath
      );

      logger.info(`📊 Original video duration: ${originalMetadata.duration}s`);

      if (socket) {
        socket.emit("video_processing", {
          status: "processing",
          progress: 90,
          message: "Calculating time saved...",
          operation: "auto-trim-silence",
        });
      }

      logger.info(`📊 Getting metadata for trimmed video: ${trimmedVideoPath}`);

      const trimmedMetadata = await this.videoProcessor.getVideoMetadata(
        trimmedVideoPath
      );

      logger.info(`📊 Trimmed video duration: ${trimmedMetadata.duration}s`);

      const timeSaved = originalMetadata.duration - trimmedMetadata.duration;

      logger.info(`⏱️ Time saved: ${timeSaved.toFixed(2)}s`);

      // Update video in database if it changed
      if (trimmedVideoPath !== videoPath) {
        const { Video } = await import("../models/Video.js");
        const video = await Video.findById(videoId);

        if (video) {
          // Preserve existing applied effects and add new one
          const existingEffects = video.appliedEffects || [];
          const newEffect = {
            effect: "auto-trim-silence",
            parameters: {
              silenceThreshold,
              minSilenceDuration,
              padding,
              timeSaved: timeSaved,
            },
            timestamp: new Date().toISOString(),
          };

          logger.info(`📊 Existing effects: ${existingEffects.length}`);
          logger.info(`➕ Adding new effect: auto-trim-silence`);

          // Update video record with new path, metadata, and effects
          video.filePath = trimmedVideoPath;
          video.duration = trimmedMetadata.duration;
          video.fileSize = trimmedMetadata.format.size;
          video.appliedEffects = [...existingEffects, newEffect];
          await video.save();

          logger.info(`✅ Updated video record with trimmed version`);
          logger.info(`✅ Total effects now: ${video.appliedEffects.length}`);

          // Emit video update event so frontend can reload the video
          if (socket) {
            socket.emit("video_updated", {
              videoId: videoId,
              filePath: trimmedVideoPath,
              duration: trimmedMetadata.duration,
              fileSize: trimmedMetadata.format.size,
              operation: "auto-trim-silence",
              timeSaved: timeSaved,
              appliedEffects: video.appliedEffects, // Send updated effects list
              timestamp: Date.now(), // Cache buster
            });
          }
        }
      } else {
        logger.info(
          `ℹ️ Video unchanged - original and trimmed paths are the same`
        );
      }

      logger.info(`🎉 Preparing completion event...`);

      // Get updated video with all effects
      const { Video } = await import("../models/Video.js");
      const updatedVideo = await Video.findById(videoId);
      const appliedEffects = updatedVideo?.appliedEffects || [];

      logger.info(`📊 Final applied effects count: ${appliedEffects.length}`);

      if (socket) {
        // Small delay to ensure frontend is ready to receive completion
        await new Promise((resolve) => setTimeout(resolve, 100));

        logger.info(`📡 Emitting completion event to frontend...`);
        socket.emit("video_processing", {
          status: "completed",
          progress: 100,
          message: `Silence removed successfully! Saved ${timeSaved.toFixed(
            1
          )}s`,
          operation: "auto-trim-silence",
          videoId: videoId,
          newPath: trimmedVideoPath,
          isUpdate: true, // This updates existing video, doesn't create new one
          appliedEffects: appliedEffects, // Include all effects
          timestamp: Date.now(), // Cache buster for video reload
        });
        logger.info(`✅ Completion event emitted successfully`);
      } else {
        logger.warn(`⚠️ No socket available to emit completion event`);
      }

      return {
        success: true,
        outputPath: trimmedVideoPath,
        videoId: videoId, // Same video ID - this is an update, not a new video
        isUpdate: true, // Flag to indicate this updates the existing video
        operation: "auto-trim-silence",
        originalDuration: originalMetadata.duration,
        trimmedDuration: trimmedMetadata.duration,
        timeSaved: timeSaved,
        appliedEffects: appliedEffects, // Include all effects in response
        message: `Removed ${timeSaved.toFixed(1)}s of silence (${(
          (timeSaved / originalMetadata.duration) *
          100
        ).toFixed(1)}% reduction)`,
      };
    } catch (error) {
      logger.error("❌ Error auto-trimming silence:", error);
      logger.error("❌ Error stack:", error.stack);

      if (socket) {
        socket.emit("video_processing", {
          status: "error",
          progress: 0,
          message: `Failed: ${error.message}`,
          operation: "auto-trim-silence",
        });
      }

      return {
        success: false,
        error: error.message,
        message: `Failed to trim silence: ${error.message}`,
      };
    }
  }

  /**
   * Extract keywords from video using AI analysis of transcript WITH TIMESTAMPS
   * @param {string} videoId - Video ID to analyze
   * @param {number} count - Number of keywords to extract
   * @returns {Promise<Array<{keyword: string, timestamp: number}>>} - Array of keywords with timestamps
   */
  async extractKeywordsForVideo(videoId, count = 3) {
    try {
      const { Video } = await import("../models/Video.js");
      const video = await Video.findById(videoId);

      if (!video) {
        logger.warn("Video not found, using default keywords");
        return this.getDefaultKeywordsWithTimestamps(
          count,
          video?.duration || 30
        );
      }

      // Use OpenAI to extract relevant keywords
      if (!process.env.OPENAI_API_KEY) {
        logger.warn("No OpenAI key, using default keywords");
        return this.getDefaultKeywordsWithTimestamps(count, video.duration);
      }

      logger.info(`🎙️ Transcribing video with word-level timestamps...`);

      // Transcribe the video to get actual spoken content WITH WORD TIMESTAMPS
      let transcriptResult = null;
      let transcription = null;
      let words = [];

      try {
        transcriptResult = await this.transcriptionService.transcribeVideo(
          video.filePath
        );
        transcription = transcriptResult?.text || null;

        logger.info(`🔍 Transcript result structure:`, {
          hasText: !!transcription,
          textLength: transcription?.length || 0,
          hasSegments: !!transcriptResult?.segments,
          segmentsCount: transcriptResult?.segments?.length || 0,
          provider: transcriptResult?.provider,
        });

        // Get word-level data - Whisper returns words directly in segments
        if (transcriptResult?.segments) {
          for (const segment of transcriptResult.segments) {
            // Check if segment itself has word data
            if (segment.words && Array.isArray(segment.words)) {
              words.push(...segment.words);
            } else if (segment.word) {
              // Single word in segment
              words.push(segment);
            }
          }
        }

        logger.info(
          `✅ Transcription complete: ${transcription?.length || 0} characters`
        );
        logger.info(`📝 Extracted ${words.length} words with timestamps`);

        if (words.length > 0) {
          logger.info(`📋 Sample words:`, words.slice(0, 5));
        }

        if (!transcription) {
          logger.warn("No transcription text available");
          return this.getDefaultKeywordsWithTimestamps(count, video.duration);
        }

        if (words.length === 0) {
          logger.warn(
            "No word timestamps available, using transcript text only"
          );
          // Fallback: Use transcript without timestamps
        }
      } catch (transcriptionError) {
        logger.error(`⚠️ Transcription failed:`, transcriptionError);
        return this.getDefaultKeywordsWithTimestamps(count, video.duration);
      }

      logger.info(
        `🔍 Analyzing transcript to find ${count} keywords with timestamps...`
      );

      // Create a transcript with word indices for reference
      const wordTexts = words.map((w) => w.word || w.text).join(" ");

      const prompt = `Analyze the following video transcript and extract ${count} concrete, visually interesting subjects or objects mentioned that would make great AI-generated video overlays.

TRANSCRIPT WITH WORDS:
"${transcription}"

AVAILABLE WORDS (for timestamp matching):
${words
  .slice(0, 100)
  .map((w, i) => `[${i}] "${w.word || w.text}"`)
  .join(", ")}${words.length > 100 ? "..." : ""}

REQUIREMENTS:
- Extract ${count} specific nouns or subjects from the transcript
- Each keyword must be a CONCRETE visual object (e.g., "money", "laptop", "car", "building")
- NOT abstract concepts (e.g., NOT "success", "motivation", "mindset")
- Should be actual words or phrases spoken in the transcript
- Return the EXACT word(s) as they appear in the transcript
- Each keyword should be 1-3 words maximum

GOOD EXAMPLES: "money", "laptop", "business", "car", "house", "phone"
BAD EXAMPLES: "motivation", "success mindset", "personal growth", "achieving goals"

Return a JSON array of objects with the keyword and the approximate word it relates to:
[
  {"keyword": "money", "searchWord": "money"},
  {"keyword": "laptop computer", "searchWord": "laptop"},
  {"keyword": "luxury car", "searchWord": "car"}
]`;

      const completion = await this.getOpenAI().chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      });

      const response = completion.choices[0].message.content.trim();
      logger.info(`AI response: ${response}`);

      // Parse JSON response
      const keywordObjects = JSON.parse(response);

      if (!Array.isArray(keywordObjects) || keywordObjects.length === 0) {
        logger.warn("Invalid AI response, using default keywords");
        return this.getDefaultKeywordsWithTimestamps(count, video.duration);
      }

      // Match each keyword to its timestamp in the transcript
      const keywordsWithTimestamps = [];

      // If we have word timestamps, try to match
      if (words.length > 0) {
        logger.info(
          `🔍 Matching keywords to ${words.length} word timestamps...`
        );

        for (const item of keywordObjects.slice(0, count)) {
          const keyword = item.keyword;
          const searchWord = item.searchWord || keyword;

          // Find the word in the transcript
          const matchingWord = words.find((w) =>
            (w.word || w.text)?.toLowerCase().includes(searchWord.toLowerCase())
          );

          if (matchingWord) {
            // Get timestamp from word, ensuring it's a valid number
            let timestamp =
              matchingWord.start ||
              matchingWord.timestamp ||
              matchingWord.start_time ||
              0;

            // Ensure timestamp is a number
            if (typeof timestamp !== "number" || isNaN(timestamp)) {
              logger.warn(
                `⚠️ Invalid timestamp value for word "${
                  matchingWord.word || matchingWord.text
                }": ${timestamp}`
              );
              timestamp = 0;
            }

            keywordsWithTimestamps.push({
              keyword,
              timestamp: Math.floor(timestamp),
            });
            logger.info(
              `✅ Matched "${keyword}" to timestamp ${timestamp}s (word: "${
                matchingWord.word || matchingWord.text
              }")`
            );
          } else {
            // If not found in words, use evenly spaced fallback
            const validDuration =
              video.duration && !isNaN(video.duration) ? video.duration : 30;
            const fallbackTimestamp = Math.floor(
              (validDuration / (count + 1)) *
                (keywordsWithTimestamps.length + 1)
            );
            keywordsWithTimestamps.push({
              keyword,
              timestamp: fallbackTimestamp,
            });
            logger.warn(
              `⚠️ Could not find "${keyword}" in word list, using fallback timestamp ${fallbackTimestamp}s`
            );
          }
        }
      } else {
        // No word timestamps available - use evenly spaced timestamps with transcript-based keywords
        logger.warn(
          `⚠️ No word timestamps available, using evenly spaced distribution for transcript keywords`
        );

        // Ensure video duration is valid
        const validDuration =
          video.duration && !isNaN(video.duration) ? video.duration : 30;
        const spacing = validDuration / (count + 1);

        for (let i = 0; i < keywordObjects.slice(0, count).length; i++) {
          const keyword = keywordObjects[i].keyword;
          const timestamp = Math.floor(spacing * (i + 1));
          keywordsWithTimestamps.push({
            keyword,
            timestamp,
          });
          logger.info(
            `📍 Keyword "${keyword}" from transcript assigned to ${timestamp}s (evenly spaced)`
          );
        }
      }

      logger.info(
        `✅ Final result: ${keywordsWithTimestamps.length} keywords with timestamps`
      );
      logger.info(`📋 Keywords:`, keywordsWithTimestamps);
      return keywordsWithTimestamps;
    } catch (error) {
      logger.error("Error extracting keywords:", error);
      return this.getDefaultKeywordsWithTimestamps(count, 30);
    }
  }

  /**
   * Get default keywords WITH TIMESTAMPS if AI extraction fails
   * @param {number} count - Number of keywords
   * @param {number} videoDuration - Video duration in seconds
   * @returns {Array<{keyword: string, timestamp: number}>} - Default keywords with timestamps
   */
  getDefaultKeywordsWithTimestamps(count = 3, videoDuration = 30) {
    const defaults = [
      "colorful particles",
      "glowing orb",
      "sparkles effect",
      "light rays",
      "abstract shapes",
      "flowing energy",
      "cosmic nebula",
      "digital grid",
    ];

    const keywords = defaults.slice(0, count);
    const spacing = videoDuration / (count + 1);

    return keywords.map((keyword, index) => ({
      keyword,
      timestamp: Math.floor(spacing * (index + 1)),
    }));
  }

  /**
   * Get default keywords (legacy - without timestamps)
   * @param {number} count - Number of keywords
   * @returns {string[]} - Default keywords
   */
  getDefaultKeywords(count = 3) {
    const defaults = [
      "colorful particles",
      "glowing orb",
      "sparkles effect",
      "light rays",
      "abstract shapes",
      "flowing energy",
      "cosmic nebula",
      "digital grid",
    ];

    return defaults.slice(0, count);
  }

  /**
   * Calculate evenly spaced timestamps for clip insertion
   * @param {number} videoDuration - Total video duration in seconds
   * @param {number} clipCount - Number of clips to insert
   * @param {number} clipDuration - Duration of each clip
   * @returns {number[]} - Array of timestamps
   */
  calculateEvenTimestamps(videoDuration, clipCount, clipDuration) {
    const timestamps = [];

    // Calculate spacing to distribute clips evenly
    const effectiveVideoDuration = videoDuration;
    const spacing = effectiveVideoDuration / (clipCount + 1);

    for (let i = 1; i <= clipCount; i++) {
      const timestamp = Math.floor(spacing * i);
      timestamps.push(timestamp);
    }

    logger.info(`📍 Calculated ${clipCount} evenly spaced timestamps`);
    return timestamps;
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
