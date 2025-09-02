const axios = require('axios');
const FormData = require('form-data');
const winston = require('winston');
const fs = require('fs');

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
    new winston.transports.File({ filename: 'logs/captions-ai.log' })
  ]
});

class CaptionsAiService {
  constructor() {
    this.apiKey = process.env.CAPTIONS_AI_API_KEY;
    this.baseURL = 'https://api.captions.ai/v1';
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
  }

  /**
   * Initialize the service and validate API key
   */
  async initialize() {
    try {
      if (!this.apiKey) {
        logger.warn('CAPTIONS_AI_API_KEY not set - Captions.ai features will be disabled');
        return false;
      }
      
      // Test the API key with a simple request
      const response = await this.makeRequest('GET', '/account');
      logger.info('Captions.ai service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Captions.ai service:', error.message);
      return false;
    }
  }

  /**
   * Make HTTP request to Captions.ai API with retry logic
   */
  async makeRequest(method, endpoint, data = null, retryCount = 0, isFormData = false) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      };

      if (data) {
        if (isFormData) {
          config.data = data;
          // FormData sets its own content-type with boundary
        } else {
          config.headers['Content-Type'] = 'application/json';
          config.data = data;
        }
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        logger.warn(`Captions.ai API request failed, retrying (${retryCount + 1}/${this.maxRetries})...`);
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.makeRequest(method, endpoint, data, retryCount + 1, isFormData);
      }
      
      logger.error('Captions.ai API request failed:', {
        endpoint,
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw error;
    }
  }

  /**
   * Check if error should trigger a retry
   */
  shouldRetry(error) {
    const status = error.response?.status;
    return status >= 500 || status === 429 || !status;
  }

  /**
   * Delay utility for retries
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Upload video file for transcription
   */
  async uploadVideo(filePath, options = {}) {
    try {
      const {
        language = 'auto',
        format = 'srt',
        includeTimestamps = true,
        includeSpeakerLabels = false
      } = options;

      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('language', language);
      formData.append('format', format);
      formData.append('include_timestamps', includeTimestamps.toString());
      formData.append('include_speaker_labels', includeSpeakerLabels.toString());

      const result = await this.makeRequest('POST', '/transcribe', formData, 0, true);
      logger.info('Video uploaded for transcription:', result.job_id);
      return result;
    } catch (error) {
      logger.error('Failed to upload video for transcription:', error.message);
      throw new Error('Failed to upload video for transcription');
    }
  }

  /**
   * Upload video from URL for transcription
   */
  async transcribeFromURL(videoUrl, options = {}) {
    try {
      const {
        language = 'auto',
        format = 'srt',
        includeTimestamps = true,
        includeSpeakerLabels = false
      } = options;

      const requestData = {
        url: videoUrl,
        language,
        format,
        include_timestamps: includeTimestamps,
        include_speaker_labels: includeSpeakerLabels
      };

      const result = await this.makeRequest('POST', '/transcribe-url', requestData);
      logger.info('Video URL submitted for transcription:', result.job_id);
      return result;
    } catch (error) {
      logger.error('Failed to transcribe video from URL:', error.message);
      throw new Error('Failed to transcribe video from URL');
    }
  }

  /**
   * Get transcription job status
   */
  async getTranscriptionStatus(jobId) {
    try {
      const status = await this.makeRequest('GET', `/transcribe/${jobId}`);
      return status;
    } catch (error) {
      logger.error('Failed to get transcription status:', error.message);
      throw new Error('Failed to retrieve transcription status');
    }
  }

  /**
   * Get completed transcription result
   */
  async getTranscriptionResult(jobId) {
    try {
      const result = await this.makeRequest('GET', `/transcribe/${jobId}/result`);
      return result;
    } catch (error) {
      logger.error('Failed to get transcription result:', error.message);
      throw new Error('Failed to retrieve transcription result');
    }
  }

  /**
   * Translate existing captions to another language
   */
  async translateCaptions(captions, targetLanguage, sourceLanguage = 'auto') {
    try {
      const requestData = {
        captions,
        target_language: targetLanguage,
        source_language: sourceLanguage
      };

      const result = await this.makeRequest('POST', '/translate', requestData);
      logger.info('Caption translation completed');
      return result;
    } catch (error) {
      logger.error('Failed to translate captions:', error.message);
      throw new Error('Failed to translate captions');
    }
  }

  /**
   * Generate captions with custom vocabulary
   */
  async transcribeWithVocabulary(filePath, vocabulary, options = {}) {
    try {
      const {
        language = 'auto',
        format = 'srt',
        includeTimestamps = true
      } = options;

      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('language', language);
      formData.append('format', format);
      formData.append('include_timestamps', includeTimestamps.toString());
      formData.append('vocabulary', JSON.stringify(vocabulary));

      const result = await this.makeRequest('POST', '/transcribe-vocabulary', formData, 0, true);
      logger.info('Video uploaded for transcription with custom vocabulary:', result.job_id);
      return result;
    } catch (error) {
      logger.error('Failed to transcribe with custom vocabulary:', error.message);
      throw new Error('Failed to transcribe with custom vocabulary');
    }
  }

  /**
   * Wait for transcription completion with polling
   */
  async waitForTranscription(jobId, maxWaitTime = 600000) { // 10 minutes max
    const startTime = Date.now();
    const pollInterval = 10000; // 10 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.getTranscriptionStatus(jobId);
        
        if (status.status === 'completed') {
          logger.info('Transcription completed:', jobId);
          const result = await this.getTranscriptionResult(jobId);
          return result;
        }
        
        if (status.status === 'failed' || status.status === 'error') {
          throw new Error(`Transcription failed: ${status.error || 'Unknown error'}`);
        }
        
        logger.info(`Transcription in progress: ${status.status} (${status.progress || 0}%)`);
        await this.delay(pollInterval);
      } catch (error) {
        if (error.message.includes('Transcription failed')) {
          throw error;
        }
        logger.warn('Error checking transcription status, retrying...', error.message);
        await this.delay(pollInterval);
      }
    }
    
    throw new Error('Transcription timeout');
  }

  /**
   * Transcribe video and wait for completion
   */
  async transcribeAndWait(filePath, options = {}) {
    try {
      const job = await this.uploadVideo(filePath, options);
      const result = await this.waitForTranscription(job.job_id);
      return result;
    } catch (error) {
      logger.error('Failed to transcribe and wait:', error.message);
      throw error;
    }
  }

  /**
   * Transcribe from URL and wait for completion
   */
  async transcribeURLAndWait(videoUrl, options = {}) {
    try {
      const job = await this.transcribeFromURL(videoUrl, options);
      const result = await this.waitForTranscription(job.job_id);
      return result;
    } catch (error) {
      logger.error('Failed to transcribe URL and wait:', error.message);
      throw error;
    }
  }

  /**
   * Convert captions to different formats
   */
  async convertCaptionFormat(captions, fromFormat, toFormat) {
    try {
      const requestData = {
        captions,
        from_format: fromFormat,
        to_format: toFormat
      };

      const result = await this.makeRequest('POST', '/convert-format', requestData);
      logger.info(`Caption format converted from ${fromFormat} to ${toFormat}`);
      return result;
    } catch (error) {
      logger.error('Failed to convert caption format:', error.message);
      throw new Error('Failed to convert caption format');
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages() {
    try {
      const languages = await this.makeRequest('GET', '/languages');
      return languages;
    } catch (error) {
      logger.error('Failed to get supported languages:', error.message);
      throw new Error('Failed to retrieve supported languages');
    }
  }

  /**
   * Get account information and usage
   */
  async getAccountInfo() {
    try {
      const account = await this.makeRequest('GET', '/account');
      return account;
    } catch (error) {
      logger.error('Failed to get account info:', error.message);
      throw new Error('Failed to retrieve account information');
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    try {
      await this.makeRequest('GET', '/account');
      return {
        status: 'healthy',
        service: 'captions-ai',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'captions-ai',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = CaptionsAiService;