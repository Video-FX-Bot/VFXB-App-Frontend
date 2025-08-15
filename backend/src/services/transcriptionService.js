import OpenAI from 'openai';
import { AssemblyAI } from 'assemblyai';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

export class TranscriptionService {
  constructor() {
    this.openai = null;
    this.assemblyai = null;
    this.tempDir = path.join(process.env.UPLOAD_PATH || './uploads', 'temp');
    this.ensureDirectories();
  }

  getOpenAI() {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    return this.openai;
  }

  getAssemblyAI() {
    if (!this.assemblyai) {
      this.assemblyai = new AssemblyAI({
        apiKey: process.env.ASSEMBLYAI_API_KEY
      });
    }
    return this.assemblyai;
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Error creating temp directory:', error);
    }
  }

  // Extract audio from video
  async extractAudio(videoPath) {
    try {
      const audioPath = path.join(this.tempDir, `audio_${uuidv4()}.wav`);
      
      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .output(audioPath)
          .audioCodec('pcm_s16le')
          .audioChannels(1)
          .audioFrequency(16000)
          .noVideo()
          .on('end', () => {
            logger.info('Audio extraction completed:', audioPath);
            resolve(audioPath);
          })
          .on('error', (err) => {
            logger.error('Error extracting audio:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in extractAudio:', error);
      throw error;
    }
  }

  // Transcribe using OpenAI Whisper
  async transcribeWithWhisper(audioPath, options = {}) {
    try {
      const {
        language = 'auto',
        model = 'whisper-1',
        response_format = 'verbose_json',
        timestamp_granularities = ['word']
      } = options;

      const audioFile = await fs.readFile(audioPath);
      
      const transcription = await this.getOpenAI().audio.transcriptions.create({
        file: new File([audioFile], path.basename(audioPath), { type: 'audio/wav' }),
        model,
        language: language === 'auto' ? undefined : language,
        response_format,
        timestamp_granularities
      });

      return {
        provider: 'openai',
        text: transcription.text,
        segments: transcription.words || transcription.segments || [],
        language: transcription.language,
        duration: transcription.duration,
        confidence: this.calculateAverageConfidence(transcription.words || [])
      };
    } catch (error) {
      logger.error('Error transcribing with Whisper:', error);
      throw error;
    }
  }

  // Transcribe using AssemblyAI (more advanced features)
  async transcribeWithAssemblyAI(audioPath, options = {}) {
    try {
      const {
        speaker_labels = true,
        auto_punctuation = true,
        auto_highlights = true,
        sentiment_analysis = true,
        entity_detection = true,
        content_safety = true,
        language_detection = true
      } = options;

      // Upload audio file
      const audioFile = await fs.readFile(audioPath);
      const uploadResponse = await this.getAssemblyAI().files.upload(audioFile);
      
      // Create transcription job
      const transcript = await this.getAssemblyAI().transcripts.transcribe({
        audio_url: uploadResponse.upload_url,
        speaker_labels,
        auto_punctuation,
        auto_highlights,
        sentiment_analysis,
        entity_detection,
        content_safety_labels: content_safety,
        language_detection
      });

      // Wait for completion
      const completedTranscript = await this.getAssemblyAI().transcripts.get(transcript.id);
      
      return {
        provider: 'assemblyai',
        text: completedTranscript.text,
        segments: completedTranscript.utterances || [],
        words: completedTranscript.words || [],
        language: completedTranscript.language_code,
        confidence: completedTranscript.confidence,
        speakers: this.extractSpeakers(completedTranscript.utterances || []),
        highlights: completedTranscript.auto_highlights_result?.results || [],
        sentiment: completedTranscript.sentiment_analysis_results || [],
        entities: completedTranscript.entities || [],
        contentSafety: completedTranscript.content_safety_labels?.results || []
      };
    } catch (error) {
      logger.error('Error transcribing with AssemblyAI:', error);
      throw error;
    }
  }

  // Main transcription method with fallback
  async transcribeVideo(videoPath, options = {}) {
    try {
      const { provider = 'auto', ...transcriptionOptions } = options;
      
      // Extract audio from video
      const audioPath = await this.extractAudio(videoPath);
      
      let result;
      
      if (provider === 'openai' || provider === 'auto') {
        try {
          result = await this.transcribeWithWhisper(audioPath, transcriptionOptions);
        } catch (error) {
          if (provider === 'auto' && process.env.ASSEMBLYAI_API_KEY) {
            logger.warn('OpenAI transcription failed, falling back to AssemblyAI:', error.message);
            result = await this.transcribeWithAssemblyAI(audioPath, transcriptionOptions);
          } else {
            throw error;
          }
        }
      } else if (provider === 'assemblyai') {
        result = await this.transcribeWithAssemblyAI(audioPath, transcriptionOptions);
      } else {
        throw new Error(`Unsupported transcription provider: ${provider}`);
      }
      
      // Clean up temporary audio file
      await this.cleanupFile(audioPath);
      
      return result;
    } catch (error) {
      logger.error('Error in transcribeVideo:', error);
      throw error;
    }
  }

  // Generate subtitles in SRT format
  async generateSubtitles(transcriptionResult, options = {}) {
    try {
      const { format = 'srt', maxLineLength = 40, maxDuration = 5 } = options;
      
      if (format !== 'srt') {
        throw new Error(`Unsupported subtitle format: ${format}`);
      }
      
      const segments = transcriptionResult.segments || transcriptionResult.words || [];
      
      if (!segments.length) {
        throw new Error('No segments available for subtitle generation');
      }
      
      let srtContent = '';
      let segmentIndex = 1;
      
      for (const segment of segments) {
        const startTime = this.formatSRTTime(segment.start || segment.start_time || 0);
        const endTime = this.formatSRTTime(segment.end || segment.end_time || segment.start + maxDuration);
        const text = this.formatSubtitleText(segment.text || segment.words?.map(w => w.text).join(' ') || '', maxLineLength);
        
        srtContent += `${segmentIndex}\n`;
        srtContent += `${startTime} --> ${endTime}\n`;
        srtContent += `${text}\n\n`;
        
        segmentIndex++;
      }
      
      return {
        format: 'srt',
        content: srtContent,
        segmentCount: segmentIndex - 1
      };
    } catch (error) {
      logger.error('Error generating subtitles:', error);
      throw error;
    }
  }

  // Analyze audio content for insights
  async analyzeAudioContent(transcriptionResult) {
    try {
      const text = transcriptionResult.text;
      
      if (!text || text.trim().length === 0) {
        return {
          wordCount: 0,
          speakingRate: 0,
          topics: [],
          sentiment: 'neutral',
          keyPhrases: []
        };
      }
      
      // Basic analysis
      const words = text.split(/\s+/).filter(word => word.length > 0);
      const duration = transcriptionResult.duration || this.calculateDuration(transcriptionResult.segments);
      const speakingRate = duration > 0 ? (words.length / duration) * 60 : 0; // words per minute
      
      // Extract key phrases using simple frequency analysis
      const keyPhrases = this.extractKeyPhrases(text);
      
      // Use AI for deeper analysis if available
      let aiAnalysis = {};
      if (process.env.OPENAI_API_KEY) {
        try {
          aiAnalysis = await this.analyzeWithAI(text);
        } catch (error) {
          logger.warn('AI analysis failed:', error.message);
        }
      }
      
      return {
        wordCount: words.length,
        speakingRate: Math.round(speakingRate),
        duration,
        keyPhrases,
        ...aiAnalysis,
        // Include provider-specific analysis if available
        sentiment: transcriptionResult.sentiment || aiAnalysis.sentiment || 'neutral',
        topics: aiAnalysis.topics || [],
        entities: transcriptionResult.entities || [],
        highlights: transcriptionResult.highlights || []
      };
    } catch (error) {
      logger.error('Error analyzing audio content:', error);
      throw error;
    }
  }

  // Helper methods
  calculateAverageConfidence(words) {
    if (!words || words.length === 0) return 0;
    const totalConfidence = words.reduce((sum, word) => sum + (word.confidence || 0), 0);
    return totalConfidence / words.length;
  }

  extractSpeakers(utterances) {
    const speakers = new Set();
    utterances.forEach(utterance => {
      if (utterance.speaker) {
        speakers.add(utterance.speaker);
      }
    });
    return Array.from(speakers);
  }

  calculateDuration(segments) {
    if (!segments || segments.length === 0) return 0;
    const lastSegment = segments[segments.length - 1];
    return lastSegment.end || lastSegment.end_time || 0;
  }

  formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  formatSubtitleText(text, maxLineLength) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxLineLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }

  extractKeyPhrases(text, limit = 10) {
    // Simple frequency-based key phrase extraction
    const words = text.toLowerCase().split(/\s+/).filter(word => 
      word.length > 3 && !this.isStopWord(word)
    );
    
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([word, count]) => ({ phrase: word, frequency: count }));
  }

  isStopWord(word) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);
    return stopWords.has(word);
  }

  async analyzeWithAI(text) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: 'Analyze the following text and provide insights in JSON format with keys: sentiment (positive/negative/neutral), topics (array of main topics), summary (brief summary).'
        }, {
          role: 'user',
          content: text
        }],
        max_tokens: 500,
        temperature: 0.3
      });
      
      const analysis = JSON.parse(response.choices[0].message.content);
      return analysis;
    } catch (error) {
      logger.error('Error in AI analysis:', error);
      return {};
    }
  }

  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
      logger.info('Cleaned up file:', filePath);
    } catch (error) {
      logger.warn('Error cleaning up file:', error.message);
    }
  }
}