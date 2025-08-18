# VFXB Backend - API Integrations

This document outlines all the third-party API integrations and new endpoints added to the VFXB backend.

## 🔧 Integrated Services

### 1. Cloudinary
**Purpose**: Cloud-based video and image processing, storage, and delivery

**Configuration**:
- Cloud Name: `dblmc245i`
- API Key: Configured in `.env`
- API Secret: Configured in `.env`

**Features**:
- Video upload and storage
- Image transformations
- URL generation with optimizations
- Resource management

### 2. Replicate
**Purpose**: AI-powered video processing and generation

**Configuration**:
- API Token: Configured in `.env`

**Features**:
- Video upscaling
- Video stabilization
- Frame interpolation
- Video colorization
- Background removal
- Style transfer
- Text-to-video generation

### 3. ElevenLabs
**Purpose**: AI voice generation and audio processing

**Configuration**:
- API Key: Configured in `.env`

**Features**:
- Text-to-speech conversion
- Voice cloning
- Multiple voice options
- Custom voice settings

### 4. AssemblyAI
**Purpose**: Advanced speech-to-text transcription

**Configuration**:
- API Key: Configured in `.env`

**Features**:
- High-accuracy transcription
- Speaker diarization
- Sentiment analysis
- Auto-highlights

## 📡 New API Endpoints

### Video Cloud Upload
```
POST /api/videos/:id/upload-to-cloud
```
**Description**: Upload a video to Cloudinary for cloud storage and processing

**Headers**:
- `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "message": "Video uploaded to cloud successfully",
  "data": {
    "cloudUrl": "https://res.cloudinary.com/...",
    "publicId": "video_12345"
  }
}
```

### AI Video Enhancement
```
POST /api/videos/:id/ai-enhance
```
**Description**: Enhance videos using AI (upscaling, stabilization, etc.)

**Headers**:
- `Authorization: Bearer <token>`

**Body**:
```json
{
  "enhancementType": "upscale", // upscale, stabilize, interpolate, colorize, remove_background
  "options": {
    "scale": 2,
    "model": "realesrgan-x4plus"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "AI enhancement started",
  "data": {
    "predictionId": "abc123",
    "enhancementType": "upscale",
    "status": "processing"
  }
}
```

### Check Enhancement Status
```
GET /api/videos/:id/ai-enhance/:predictionId/status
```
**Description**: Check the status of an AI enhancement job

**Headers**:
- `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "predictionId": "abc123",
    "status": "succeeded", // processing, succeeded, failed
    "output": "https://replicate.delivery/...",
    "error": null
  }
}
```

### Generate AI Voiceover
```
POST /api/videos/:id/generate-voiceover
```
**Description**: Generate AI voiceover for a video

**Headers**:
- `Authorization: Bearer <token>`

**Body**:
```json
{
  "text": "Hello, this is a test voiceover",
  "voiceId": "21m00Tcm4TlvDq8ikWAM", // Optional, uses default if not provided
  "voiceSettings": {
    "stability": 0.5,
    "similarity_boost": 0.5
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Voiceover generated successfully",
  "data": {
    "audioUrl": "https://res.cloudinary.com/...",
    "publicId": "voiceover_12345_1234567890"
  }
}
```

### Get Available AI Voices
```
GET /api/videos/ai/voices
```
**Description**: Get list of available AI voices from ElevenLabs

**Headers**:
- `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "voices": [
      {
        "voice_id": "21m00Tcm4TlvDq8ikWAM",
        "name": "Rachel",
        "category": "premade",
        "description": "Young Adult Female"
      }
    ]
  }
}
```

## 🧪 Testing Endpoints

### Test Service Connectivity
```
GET /api/test/services
```
**Description**: Test connectivity to all integrated services

**Headers**:
- `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "message": "Service connectivity test completed",
  "data": {
    "cloudinary": { "status": "connected", "error": null },
    "replicate": { "status": "connected", "error": null },
    "elevenlabs": { "status": "connected", "error": null }
  }
}
```

### Test Configuration
```
GET /api/test/config
```
**Description**: Check if all API keys and configuration are properly set

**Headers**:
- `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "message": "Configuration check completed",
  "data": {
    "cloudinary": { "configured": true, "cloudName": "Set" },
    "replicate": { "configured": true, "token": "Set" },
    "elevenlabs": { "configured": true, "apiKey": "Set" },
    "assemblyai": { "configured": true, "apiKey": "Set" }
  }
}
```

## 🔒 Authentication & Rate Limiting

All endpoints require:
- Valid JWT token in Authorization header
- User subscription limits are checked
- Rate limiting is applied
- Activity logging is performed

## 📊 Usage Tracking

The following activities are tracked:
- `cloud_upload`: Uploading videos to cloud storage
- `ai_enhance`: AI video enhancement operations
- `ai_voiceover`: AI voiceover generation

## 🚨 Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

## 🔧 Environment Variables

Ensure these are set in your `.env` file:
```env
# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name

# Replicate
REPLICATE_API_TOKEN=your_replicate_api_token

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# AssemblyAI
ASSEMBLYAI_API_KEY=e5378a603f94486ab172c935015cc225
```

## 📝 Notes

1. **MongoDB vs Supabase**: As requested, if MongoDB integration becomes complicated, we can easily switch to Supabase for the database layer.

2. **File Storage**: Videos are initially stored locally, then optionally uploaded to Cloudinary for cloud processing.

3. **AI Processing**: All AI operations are asynchronous. Use the status endpoints to check progress.

4. **Cost Management**: Consider implementing usage quotas and cost tracking for AI services.

5. **Security**: All API keys are stored securely in environment variables and never exposed to the client.

## 🚀 Next Steps

1. Test all endpoints with real data
2. Implement frontend integration
3. Add more AI models and processing options
4. Set up monitoring and alerting
5. Consider database migration to Supabase if needed