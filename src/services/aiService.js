import apiService from './apiService';

// AI Service for handling conversational AI and video processing
class AIService {
  constructor() {
    this.isProcessing = false;
    this.currentContext = null;
  }
  
  // Intent recognition patterns
  intentPatterns = {
    // Audio operations
    audio_enhance: [
      /enhance.*audio/i,
      /improve.*sound/i,
      /audio.*quality/i,
      /noise.*reduction/i,
      /remove.*noise/i
    ],
    audio_remove_noise: [
      /remove.*background.*noise/i,
      /clean.*audio/i,
      /noise.*removal/i,
      /denoise/i
    ],
    
    // Video operations
    video_trim: [
      /trim.*video/i,
      /cut.*video/i,
      /shorten/i,
      /remove.*part/i
    ],
    video_crop: [
      /crop.*video/i,
      /resize.*video/i,
      /change.*aspect/i
    ],
    
    // Visual effects
    color_correction: [
      /color.*correct/i,
      /adjust.*color/i,
      /brightness/i,
      /contrast/i,
      /saturation/i
    ],
    add_filter: [
      /add.*filter/i,
      /apply.*effect/i,
      /vintage/i,
      /sepia/i,
      /black.*white/i
    ],
    
    // Text and subtitles
    add_subtitles: [
      /add.*subtitle/i,
      /caption/i,
      /text.*overlay/i,
      /transcribe/i
    ],
    add_text: [
      /add.*text/i,
      /title/i,
      /heading/i,
      /label/i
    ],
    
    // Transitions and effects
    add_transition: [
      /add.*transition/i,
      /fade.*in/i,
      /fade.*out/i,
      /smooth.*cut/i
    ],
    
    // Export and sharing
    export_video: [
      /export/i,
      /download/i,
      /save.*video/i,
      /render/i
    ],
    share_video: [
      /share/i,
      /publish/i,
      /upload.*to/i
    ]
  };
  
  // Recognize user intent from message
  recognizeIntent(message) {
    const normalizedMessage = message.toLowerCase().trim();
    
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedMessage)) {
          return {
            intent,
            confidence: 0.8,
            originalMessage: message
          };
        }
      }
    }
    
    return {
      intent: 'general_query',
      confidence: 0.3,
      originalMessage: message
    };
  }
  
  // Extract parameters from message
  extractParameters(message, intent) {
    const params = {};
    const normalizedMessage = message.toLowerCase();
    
    // Time-based parameters
    const timeMatch = normalizedMessage.match(/(\d+)\s*(second|minute|hour)s?/i);
    if (timeMatch) {
      const value = parseInt(timeMatch[1]);
      const unit = timeMatch[2].toLowerCase();
      params.duration = unit === 'minute' ? value * 60 : unit === 'hour' ? value * 3600 : value;
    }
    
    // Percentage parameters
    const percentMatch = normalizedMessage.match(/(\d+)\s*%/);
    if (percentMatch) {
      params.percentage = parseInt(percentMatch[1]);
    }
    
    // Quality parameters
    if (normalizedMessage.includes('high quality')) params.quality = 'high';
    if (normalizedMessage.includes('medium quality')) params.quality = 'medium';
    if (normalizedMessage.includes('low quality')) params.quality = 'low';
    
    // Format parameters
    if (normalizedMessage.includes('mp4')) params.format = 'mp4';
    if (normalizedMessage.includes('webm')) params.format = 'webm';
    if (normalizedMessage.includes('avi')) params.format = 'avi';
    
    // Position parameters
    if (normalizedMessage.includes('beginning') || normalizedMessage.includes('start')) {
      params.position = 'start';
    }
    if (normalizedMessage.includes('end') || normalizedMessage.includes('ending')) {
      params.position = 'end';
    }
    
    return params;
  }
  
  // Process user message and generate AI response
  async processMessage(message, context = {}) {
    try {
      this.isProcessing = true;
      this.currentContext = context;
      
      // Recognize intent
      const intentResult = this.recognizeIntent(message);
      const parameters = this.extractParameters(message, intentResult.intent);
      
      // Generate response based on intent
      const response = await this.generateResponse(intentResult, parameters, context);
      
      return {
        success: true,
        response,
        intent: intentResult.intent,
        parameters,
        confidence: intentResult.confidence
      };
    } catch (error) {
      console.error('AI processing error:', error);
      return {
        success: false,
        error: error.message,
        response: {
          content: "I'm sorry, I encountered an error processing your request. Please try again.",
          actions: []
        }
      };
    } finally {
      this.isProcessing = false;
    }
  }
  
  // Generate response based on intent
  async generateResponse(intentResult, parameters, context) {
    const { intent, originalMessage } = intentResult;
    
    switch (intent) {
      case 'audio_enhance':
        return {
          content: "I'll enhance the audio quality of your video. This will improve clarity and reduce background noise.",
          actions: [
            {
              label: 'Apply Audio Enhancement',
              onClick: () => this.executeVideoOperation('audio_enhance', parameters)
            },
            {
              label: 'Preview Changes',
              onClick: () => this.previewOperation('audio_enhance', parameters)
            }
          ]
        };
        
      case 'audio_remove_noise':
        return {
          content: "I'll remove background noise from your video to make the audio cleaner and more professional.",
          actions: [
            {
              label: 'Remove Background Noise',
              onClick: () => this.executeVideoOperation('noise_reduction', parameters)
            },
            {
              label: 'Adjust Noise Threshold',
              onClick: () => this.showNoiseSettings()
            }
          ]
        };
        
      case 'video_trim':
        return {
          content: "I can help you trim your video. Would you like to specify the start and end times, or should I help you select the portion to keep?",
          actions: [
            {
              label: 'Select Trim Points',
              onClick: () => this.openTrimTool()
            },
            {
              label: 'Auto-detect Silent Parts',
              onClick: () => this.autoDetectTrimPoints()
            }
          ]
        };
        
      case 'add_subtitles':
        return {
          content: "I'll add subtitles to your video. I can either auto-generate them from the audio or you can upload a subtitle file.",
          actions: [
            {
              label: 'Auto-generate Subtitles',
              onClick: () => this.executeVideoOperation('auto_subtitles', parameters)
            },
            {
              label: 'Upload Subtitle File',
              onClick: () => this.openSubtitleUpload()
            }
          ]
        };
        
      case 'color_correction':
        return {
          content: "I'll help you adjust the colors in your video. This includes brightness, contrast, saturation, and color balance.",
          actions: [
            {
              label: 'Auto Color Correction',
              onClick: () => this.executeVideoOperation('auto_color_correct', parameters)
            },
            {
              label: 'Manual Adjustments',
              onClick: () => this.openColorTool()
            }
          ]
        };
        
      case 'export_video':
        return {
          content: `I'll help you export your video. What format and quality would you like?`,
          actions: [
            {
              label: 'Export as MP4 (High Quality)',
              onClick: () => this.exportVideo('mp4', 'high')
            },
            {
              label: 'Export as WebM',
              onClick: () => this.exportVideo('webm', 'medium')
            },
            {
              label: 'Custom Export Settings',
              onClick: () => this.openExportSettings()
            }
          ]
        };
        
      default:
        // For general queries, try to provide helpful suggestions
        return {
          content: `I understand you want to "${originalMessage}". Here are some things I can help you with:`,
          actions: [
            {
              label: 'Enhance Audio Quality',
              onClick: () => this.executeVideoOperation('audio_enhance', {})
            },
            {
              label: 'Add Subtitles',
              onClick: () => this.executeVideoOperation('auto_subtitles', {})
            },
            {
              label: 'Trim Video',
              onClick: () => this.openTrimTool()
            },
            {
              label: 'Color Correction',
              onClick: () => this.openColorTool()
            }
          ]
        };
    }
  }
  
  // Execute video operations
  async executeVideoOperation(operation, parameters) {
    try {
      if (!this.currentContext?.videoId) {
        throw new Error('No video selected for processing');
      }
      
      // Call API service to process video
      const result = await apiService.processVideo(this.currentContext.videoId, {
        operation,
        parameters
      });
      
      return result;
    } catch (error) {
      console.error('Video operation failed:', error);
      throw error;
    }
  }
  
  // Preview operations
  async previewOperation(operation, parameters) {
    console.log('Previewing operation:', operation, parameters);
    // Implementation for preview functionality
  }
  
  // Tool opening methods
  openTrimTool() {
    console.log('Opening trim tool');
    // Implementation to open trim tool
  }
  
  openColorTool() {
    console.log('Opening color correction tool');
    // Implementation to open color tool
  }
  
  openExportSettings() {
    console.log('Opening export settings');
    // Implementation to open export settings
  }
  
  openSubtitleUpload() {
    console.log('Opening subtitle upload');
    // Implementation to open subtitle upload
  }
  
  showNoiseSettings() {
    console.log('Showing noise reduction settings');
    // Implementation to show noise settings
  }
  
  autoDetectTrimPoints() {
    console.log('Auto-detecting trim points');
    // Implementation for auto-detection
  }
  
  // Export functionality
  async exportVideo(format, quality) {
    try {
      if (!this.currentContext?.videoId) {
        throw new Error('No video selected for export');
      }
      
      const result = await apiService.exportVideo(
        this.currentContext.videoId,
        format,
        quality
      );
      
      return result;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
  
  // Get processing status
  async getProcessingStatus(jobId) {
    return await apiService.getProcessingStatus(jobId);
  }
  
  // Cancel processing
  async cancelProcessing(jobId) {
    return await apiService.cancelProcessing(jobId);
  }
  
  // Get suggestions based on context
  getContextualSuggestions(context) {
    const suggestions = [];
    
    if (context.videoLoaded) {
      suggestions.push(
        'Enhance audio quality',
        'Add subtitles',
        'Trim the video',
        'Adjust colors and brightness'
      );
    }
    
    if (context.hasAudio) {
      suggestions.push(
        'Remove background noise',
        'Normalize audio levels',
        'Add background music'
      );
    }
    
    if (context.videoDuration > 300) { // 5 minutes
      suggestions.push(
        'Create highlights reel',
        'Split into chapters',
        'Auto-detect scene changes'
      );
    }
    
    return suggestions;
  }
  
  // Utility methods
  isProcessing() {
    return this.isProcessing;
  }
  
  getCurrentContext() {
    return this.currentContext;
  }
  
  setContext(context) {
    this.currentContext = context;
  }
}

// Create singleton instance
const aiService = new AIService();

export default aiService;

// Export class for testing
export { AIService };