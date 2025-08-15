import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.isConfigured = !!this.apiKey;
    this.tempDir = path.join(process.env.UPLOAD_PATH || './uploads', 'temp');
    
    if (!this.isConfigured) {
      logger.warn('ElevenLabs API key not provided - AI voice generation will be unavailable');
    } else {
      logger.info('ElevenLabs service initialized successfully');
    }
  }

  // Generate speech from text
  async textToSpeech(text, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('ElevenLabs service not configured');
      }

      const {
        voice_id = 'pNInz6obpgDQGcFmaJgB', // Default voice (Adam)
        model_id = 'eleven_monolingual_v1',
        voice_settings = {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true
        },
        output_format = 'mp3_44100_128'
      } = options;

      logger.info('Generating speech from text:', { 
        textLength: text.length, 
        voice_id, 
        model_id 
      });

      const response = await fetch(`${this.baseUrl}/text-to-speech/${voice_id}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id,
          voice_settings,
          output_format
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      // Save audio to temp file
      const audioBuffer = await response.arrayBuffer();
      const fileName = `speech_${uuidv4()}.mp3`;
      const filePath = path.join(this.tempDir, fileName);
      
      await fs.mkdir(this.tempDir, { recursive: true });
      await fs.writeFile(filePath, Buffer.from(audioBuffer));

      logger.info('Speech generation completed:', { filePath, size: audioBuffer.byteLength });

      return {
        success: true,
        file_path: filePath,
        file_name: fileName,
        size: audioBuffer.byteLength,
        voice_id,
        model_id,
        text_length: text.length
      };
    } catch (error) {
      logger.error('Error generating speech:', error);
      throw new Error(`Failed to generate speech: ${error.message}`);
    }
  }

  // Get available voices
  async getVoices() {
    try {
      if (!this.isConfigured) {
        throw new Error('ElevenLabs service not configured');
      }

      logger.info('Fetching available voices');

      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      logger.info('Voices fetched successfully:', { count: data.voices?.length || 0 });

      return {
        success: true,
        voices: data.voices.map(voice => ({
          voice_id: voice.voice_id,
          name: voice.name,
          category: voice.category,
          description: voice.description,
          preview_url: voice.preview_url,
          available_for_tiers: voice.available_for_tiers,
          settings: voice.settings,
          labels: voice.labels
        }))
      };
    } catch (error) {
      logger.error('Error fetching voices:', error);
      throw new Error(`Failed to fetch voices: ${error.message}`);
    }
  }

  // Get voice details
  async getVoiceDetails(voiceId) {
    try {
      if (!this.isConfigured) {
        throw new Error('ElevenLabs service not configured');
      }

      logger.info('Fetching voice details:', { voiceId });

      const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const voice = await response.json();
      
      logger.info('Voice details fetched successfully:', { voiceId, name: voice.name });

      return {
        success: true,
        voice: {
          voice_id: voice.voice_id,
          name: voice.name,
          category: voice.category,
          description: voice.description,
          preview_url: voice.preview_url,
          available_for_tiers: voice.available_for_tiers,
          settings: voice.settings,
          labels: voice.labels,
          samples: voice.samples
        }
      };
    } catch (error) {
      logger.error('Error fetching voice details:', error);
      throw new Error(`Failed to fetch voice details: ${error.message}`);
    }
  }

  // Clone voice from audio samples
  async cloneVoice(name, description, files, labels = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('ElevenLabs service not configured');
      }

      logger.info('Cloning voice:', { name, description, fileCount: files.length });

      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('labels', JSON.stringify(labels));

      // Add audio files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileBuffer = await fs.readFile(file.path);
        const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });
        formData.append('files', blob, file.name);
      }

      const response = await fetch(`${this.baseUrl}/voices/add`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      logger.info('Voice cloned successfully:', { voiceId: result.voice_id, name });

      return {
        success: true,
        voice_id: result.voice_id,
        name,
        description
      };
    } catch (error) {
      logger.error('Error cloning voice:', error);
      throw new Error(`Failed to clone voice: ${error.message}`);
    }
  }

  // Get user subscription info
  async getUserInfo() {
    try {
      if (!this.isConfigured) {
        throw new Error('ElevenLabs service not configured');
      }

      logger.info('Fetching user subscription info');

      const response = await fetch(`${this.baseUrl}/user`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const userInfo = await response.json();
      
      logger.info('User info fetched successfully');

      return {
        success: true,
        subscription: userInfo.subscription,
        is_new_user: userInfo.is_new_user,
        xi_api_key: userInfo.xi_api_key,
        can_extend_character_limit: userInfo.can_extend_character_limit,
        allowed_to_extend_character_limit: userInfo.allowed_to_extend_character_limit,
        next_character_count_reset_unix: userInfo.next_character_count_reset_unix,
        character_count: userInfo.character_count,
        character_limit: userInfo.character_limit
      };
    } catch (error) {
      logger.error('Error fetching user info:', error);
      throw new Error(`Failed to fetch user info: ${error.message}`);
    }
  }

  // Get available models
  async getModels() {
    try {
      if (!this.isConfigured) {
        throw new Error('ElevenLabs service not configured');
      }

      logger.info('Fetching available models');

      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      logger.info('Models fetched successfully:', { count: data.length });

      return {
        success: true,
        models: data.map(model => ({
          model_id: model.model_id,
          name: model.name,
          can_be_finetuned: model.can_be_finetuned,
          can_do_text_to_speech: model.can_do_text_to_speech,
          can_do_voice_conversion: model.can_do_voice_conversion,
          can_use_style: model.can_use_style,
          can_use_speaker_boost: model.can_use_speaker_boost,
          serves_pro_voices: model.serves_pro_voices,
          token_cost_factor: model.token_cost_factor,
          description: model.description,
          requires_alpha_access: model.requires_alpha_access,
          max_characters_request_free_tier: model.max_characters_request_free_tier,
          max_characters_request_subscribed_tier: model.max_characters_request_subscribed_tier
        }))
      };
    } catch (error) {
      logger.error('Error fetching models:', error);
      throw new Error(`Failed to fetch models: ${error.message}`);
    }
  }

  // Generate speech with streaming
  async textToSpeechStream(text, voiceId, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('ElevenLabs service not configured');
      }

      const {
        model_id = 'eleven_monolingual_v1',
        voice_settings = {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true
        },
        output_format = 'mp3_44100_128'
      } = options;

      logger.info('Starting streaming speech generation:', { 
        textLength: text.length, 
        voiceId, 
        model_id 
      });

      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}/stream`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id,
          voice_settings,
          output_format
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      return {
        success: true,
        stream: response.body,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      logger.error('Error streaming speech:', error);
      throw new Error(`Failed to stream speech: ${error.message}`);
    }
  }

  // Check if service is ready
  isReady() {
    return this.isConfigured;
  }

  // Get default voice options
  getDefaultVoices() {
    return [
      {
        voice_id: 'pNInz6obpgDQGcFmaJgB',
        name: 'Adam',
        category: 'premade',
        description: 'Middle-aged American male'
      },
      {
        voice_id: 'yoZ06aMxZJJ28mfd3POQ',
        name: 'Sam',
        category: 'premade', 
        description: 'Young American male'
      },
      {
        voice_id: 'AZnzlk1XvdvUeBnXmlld',
        name: 'Domi',
        category: 'premade',
        description: 'Young American female'
      },
      {
        voice_id: 'EXAVITQu4vr4xnSDxMaL',
        name: 'Bella',
        category: 'premade',
        description: 'Young American female'
      },
      {
        voice_id: 'ErXwobaYiN019PkySvjV',
        name: 'Antoni',
        category: 'premade',
        description: 'Young American male'
      },
      {
        voice_id: 'VR6AewLTigWG4xSOukaG',
        name: 'Arnold',
        category: 'premade',
        description: 'Middle-aged American male'
      }
    ];
  }
}

// Create and export singleton instance
const elevenlabsService = new ElevenLabsService();

// Reinitialize after environment variables are loaded
setTimeout(() => {
  const newService = new ElevenLabsService();
  elevenlabsService.apiKey = newService.apiKey;
  elevenlabsService.isConfigured = newService.isConfigured;
  if (elevenlabsService.isConfigured) {
    logger.info('ElevenLabs service reinitialized successfully');
  }
}, 100);

export default elevenlabsService;
export { ElevenLabsService };