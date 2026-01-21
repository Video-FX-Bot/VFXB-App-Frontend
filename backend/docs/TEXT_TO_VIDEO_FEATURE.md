# Text-to-Video Generation Feature

## Overview

The text-to-video feature allows users to generate video clips from text descriptions using AI and insert them into their existing videos. For example, typing "add a flying cat at the beginning of the video" will generate a 3-second clip of a flying cat and prepend it to the video.

## Setup Instructions

### 1. Get a HuggingFace API Key

1. Go to [HuggingFace.co](https://huggingface.co/)
2. Create an account or log in
3. Navigate to Settings → Access Tokens
4. Create a new token with `Read` permission
5. Copy your token (starts with `hf_`)

### 2. Add API Key to Environment

1. Open `backend/.env` file (create it from `.env.example` if it doesn't exist)
2. Add your key:
   ```
   HUGGINGFACE_API_KEY=hf_your_actual_token_here
   ```
3. Restart the backend server

### 3. Verify Installation

The backend will log on startup:

```
✅ HuggingFace service initialized successfully
```

If you see a warning about missing API key, check your `.env` file.

## Usage

### Via AI Chat

Users can type natural language commands:

**Single Clip Examples:**

- "add a flying cat at the beginning"
- "generate a dragon at the end"
- "insert a sunset at 10 seconds"
- "create a video of waves crashing"
- "add a spaceship flying at the start"
- "add a glowing orb in the middle"

**Auto-Generate Multiple Clips:**

- "automatically generate text to video"
- "auto generate clips throughout the video"
- "generate multiple text to video clips"
- "add text to video effects periodically"

### Via Effects Tab

1. Open the **Effects Library**
2. Navigate to **AI Generation** category
3. Select **Auto Text-to-Video**
4. Configure:
   - **Number of Clips**: 2-5 clips
   - **Clip Duration**: 2-5 seconds per clip
5. Click **Apply**

The AI will:

- Analyze your video's title and context
- Extract relevant keywords automatically
- Generate unique clips for each keyword
- Insert them evenly throughout the video
- Preserve continuous audio

### How It Works

1. **User Request**: User types a text-to-video command in chat
2. **AI Detection**: AI service detects `text-to-video` intent
3. **Extract Details**: System extracts:
   - **Prompt**: What to generate ("flying cat")
   - **Position**: Where to insert ("beginning", "end", or "timestamp:10")
   - **Duration**: How long (default 3 seconds)
4. **Generation**: HuggingFace generates the video clip
5. **Insertion**: System inserts clip into user's video
6. **Result**: User gets new video with generated clip

## Technical Details

### Backend Files Created/Modified

**New Files:**

- `backend/src/services/huggingFaceService.js` - Core text-to-video service

**Modified Files:**

- `backend/src/services/videoProcessor.js` - Added concatenation methods
- `backend/src/services/aiService.js` - Added text-to-video intent recognition

### API Flow

```
User Chat Message
    ↓
AI Service (analyzes intent)
    ↓
Detects: text-to-video
    ↓
HuggingFace Service
    ↓
Generates Image → Converts to Video
    ↓
Video Processor
    ↓
Inserts at Position (beginning/end/timestamp)
    ↓
New Video Created
```

### Position Options

| Position      | Example Command            | Result                                |
| ------------- | -------------------------- | ------------------------------------- |
| `beginning`   | "add cat at the beginning" | **Replaces** first X seconds with cat |
| `end`         | "add cat at the end"       | **Replaces** last X seconds with cat  |
| `center`      | "add cat in the middle"    | Inserts at center timestamp           |
| `timestamp:5` | "add cat at 5 seconds"     | Inserts: [part1][generated][part2]    |

**Important**: Beginning and end positions **replace** video portions (not append), maintaining continuous audio.

## Auto Text-to-Video Feature

The **Auto Text-to-Video** feature automatically generates and inserts multiple AI video clips throughout your entire video based on intelligent keyword extraction.

### How Auto-Generation Works

1. **Video Analysis**: AI analyzes your video's:

   - Title
   - Duration
   - Previously applied effects
   - Overall context

2. **Keyword Extraction**: Using OpenAI, the system:

   - Generates 2-5 creative, visually interesting subjects
   - Ensures keywords are concrete and suitable for image generation
   - Tailors keywords to match video theme

3. **Timestamp Calculation**:

   - Clips are evenly distributed throughout the video
   - Example: 3 clips in a 30s video → timestamps at 7.5s, 15s, 22.5s

4. **Sequential Generation**:

   - Each keyword is generated as a text-to-image clip
   - Clips are inserted one by one at calculated timestamps
   - Progress updates sent in real-time (socket.io)

5. **Audio Preservation**:
   - Original audio continues playing through all inserted clips
   - No audio gaps or breaks

### Example Auto-Generation

**Input Video**: "Summer Vacation" (30 seconds)

**AI Extracts Keywords**:

1. "flying seagull"
2. "beach sunset"
3. "ocean waves"

**Timestamps Calculated**: 7s, 15s, 23s

**Result**:

- 0-7s: Original video
- 7-10s: Flying seagull clip (3s)
- 10-15s: Original video continues
- 15-18s: Beach sunset clip (3s)
- 18-23s: Original video continues
- 23-26s: Ocean waves clip (3s)
- 26-30s: Original video
- **Total duration**: 36 seconds (30 + 6 seconds of clips)

### Configuration Options

| Parameter      | Range | Default | Description                   |
| -------------- | ----- | ------- | ----------------------------- |
| `clipCount`    | 2-5   | 3       | Number of clips to generate   |
| `clipDuration` | 2-5s  | 3s      | Length of each generated clip |

## Current Limitations

### 1. Text-to-Image + Video Conversion

Currently, the system uses text-to-**image** generation and converts it to video because:

- True text-to-video models are computationally expensive
- Most text-to-video models aren't available on HuggingFace Inference API
- Image generation is faster and more reliable

**What this means:**

- Generated clips are static images displayed for N seconds
- No motion or animation in generated content
- Still useful for adding static elements (logos, title cards, etc.)

### 2. Generation Time

- Text-to-image: ~5-10 seconds
- Image-to-video conversion: ~2-3 seconds
- **Total**: ~10-15 seconds per clip

### 3. Quality

- Generated images: 512x512 or 1024x1024 (model dependent)
- Converted to 1280x720 video
- Quality depends on HuggingFace model used

## Upgrading to True Text-to-Video

### Option 1: Use Replicate (Recommended)

Replace HuggingFace with Replicate's text-to-video models:

```javascript
// In huggingFaceService.js - add new method:
async textToVideoReplicate(prompt) {
  const output = await replicate.run(
    "anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
    {
      input: {
        prompt: prompt,
        num_frames: 24,
        num_inference_steps: 50
      }
    }
  );
  return output;
}
```

**Pros:**

- Actual animated video generation
- Better quality and motion
- More model options

**Cons:**

- Costs money (~$0.05-0.10 per generation)
- Slower (30-60 seconds)
- Requires Replicate API key

### Option 2: Use Runway ML

Similar to Replicate, but with different models:

- Gen-2 text-to-video
- More cinematic results
- Higher cost (~$0.15 per generation)

### Option 3: Local Models (Advanced)

Run models locally using:

- ModelScope text-to-video
- Stable Diffusion Video
- AnimateDiff

Requires:

- GPU with 12GB+ VRAM
- Longer setup time
- No API costs

## Testing

### Test Commands

1. Simple generation:

   ```
   User: "add a cat"
   Expected: Generates cat image, adds to beginning
   ```

2. Position control:

   ```
   User: "add a sunset at the end"
   Expected: Generates sunset, appends to video
   ```

3. Timestamp insertion:
   ```
   User: "insert a logo at 5 seconds"
   Expected: Splits video at 5s, inserts generated logo
   ```

### Debugging

If generation fails, check:

1. HuggingFace API key is valid
2. Network connection
3. Backend logs for error messages
4. HuggingFace model availability (some models have downtime)

### Logs to Watch

```
🎬 Generating video from prompt: "flying cat"
✅ Generated image saved: uploads/ai-generated/generated_xxx.png
✅ Image converted to video: uploads/ai-generated/video_xxx.mp4
📽️ Inserting clip at position: beginning
🔗 Concatenating 2 videos...
✅ Videos concatenated: uploads/temp/concat_xxx.mp4
```

## Future Enhancements

### Planned Features

1. **Animation Support**: Add motion to generated clips
2. **Style Control**: Let users specify art styles
3. **Duration Control**: Custom clip lengths
4. **Multiple Generations**: Generate multiple clips at once
5. **Preview**: Show generation before inserting
6. **Templates**: Pre-made generation prompts

### Model Improvements

- Switch to actual text-to-video models when available
- Add model selection UI
- Cache frequently generated elements
- Batch processing for multiple requests

## Cost Estimation

### Current (HuggingFace Free Tier):

- **Cost**: FREE
- **Limit**: ~1000 requests/month
- **Quality**: Good for static content

### With Replicate:

- **Cost**: ~$0.05-0.10 per generation
- **Quality**: Actual animated video
- **Speed**: 30-60 seconds

### With Runway:

- **Cost**: ~$0.15 per generation
- **Quality**: High-end cinematic
- **Speed**: 45-90 seconds

## Support & Troubleshooting

### Common Issues

**Error: "HuggingFace service not initialized"**

- Solution: Add `HUGGINGFACE_API_KEY` to `.env` file

**Error: "Model is loading"**

- Solution: Wait 20 seconds and try again (cold start)

**Error: "Failed to generate video"**

- Check API key validity
- Check network connection
- Try simpler prompt

**Generated video looks wrong**

- Improve prompt detail: "high quality flying cat, detailed, cinematic"
- Try different keywords
- Check model being used

### Getting Help

- Check backend logs: `uploads/logs/`
- Test API key: `curl -H "Authorization: Bearer hf_xxx" https://api-inference.huggingface.co/status`
- Open an issue with error logs

## Credits

- **HuggingFace**: AI model hosting and inference
- **FFmpeg**: Video processing and concatenation
- **Stable Diffusion**: Image generation model (via HuggingFace)
