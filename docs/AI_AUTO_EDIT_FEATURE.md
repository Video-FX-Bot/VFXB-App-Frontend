# AI Auto-Edit Feature Documentation

## Overview

The AI Auto-Edit feature automatically analyzes and enhances your videos upon upload, applying intelligent edits based on AI analysis while keeping the original video intact for manual editing.

## How It Works

### 1. **Upload & Analysis**

When you upload a video:

- The system analyzes the content using AI (OpenAI GPT)
- Transcribes audio if present
- Detects mood, pacing, and content type
- Generates enhancement recommendations

### 2. **Automatic Enhancements**

Based on the analysis, the system automatically applies:

#### Color Grading (Based on Mood)

- **Happy content** → Warm color filter (60% intensity)
- **Energetic content** → Dramatic filter (70% intensity)
- **Sad/Melancholic** → Cool tones (50% intensity)
- **Calm content** → Cinematic look (50% intensity)
- **Nostalgic** → Vintage filter (65% intensity)
- **Default** → Subtle cinematic enhancement (40% intensity)

#### Exposure Adjustments (Based on Content Type)

- **Tutorial videos** → Brightness +10, Contrast +15 (clear visuals)
- **Presentations** → Brightness +15, Contrast +20 (high clarity)
- **Vlogs** → Brightness +5, Contrast +10 (natural look)
- **Cinematic** → Brightness -5, Contrast +25 (dramatic look)

#### Additional Enhancements

- **Video Stabilization** → Applied to fast-paced content with high FPS
- **Audio Enhancement** → Noise reduction and normalization when speech is detected

### 3. **Dual-Version System**

After auto-editing:

- **Original video** → Preserved unchanged
- **AI Enhanced version** → Automatically created with edits applied
- Both versions are saved and accessible

### 4. **Manual Editing on Top**

You can use the AI Assistant to apply additional effects to either version:

- The original video remains available for pure manual editing
- The auto-edited version can be further refined
- All manual edits stack on top of auto-edits

## User Interface

### Auto-Edit Status Component

When a video has been auto-edited, you'll see a status banner showing:

```
┌─────────────────────────────────────────────────┐
│ ⚡ AI Auto-Edit Applied                         │
│    3 enhancements applied                       │
│                                                 │
│ [AI Enhanced] [Original]  ← Version switcher  │
│                                                 │
│ Show Details ▼                                  │
│ ├─ AI Analysis                                 │
│ │  • Mood: Energetic                          │
│ │  • Pacing: Fast                             │
│ │  • Content Type: Tutorial                   │
│ │                                              │
│ ├─ Applied Enhancements                       │
│ │  1. LUT Filter                              │
│ │     Dramatic colors boost energetic content │
│ │     preset: Dramatic, intensity: 70         │
│ │  2. Brightness                              │
│ │     Tutorials benefit from clear visuals    │
│ │     brightness: 10, contrast: 15            │
│ │  3. Video Stabilization                     │
│ │     Fast-paced content benefits from smooth │
│ │     shakiness: 5, smoothing: 10             │
│ │                                              │
│ └─ ℹ️ Use AI Assistant below for more edits    │
└─────────────────────────────────────────────────┘
```

## Backend Architecture

### Files Modified/Created

#### New Service: `autoEditService.js`

```javascript
// Main methods:
- analyzeForAutoEdit(videoPath, metadata)
  → Analyzes video and determines automatic edits

- determineAutoEdits(analysis, metadata)
  → Converts AI analysis into specific edit operations

- applyAutoEdits(video, edits, userId)
  → Applies the automatic edits to the video

- generateEditSummary(edits, analysis)
  → Creates user-friendly summary
```

#### Updated: `video.js` (Routes)

- Integrated `autoEditService` into upload flow
- `processVideoInBackground()` now includes:
  1. Thumbnail generation (30% progress)
  2. AI analysis (50% progress)
  3. Auto-edit application (70% progress)
  4. Creates separate auto-edited video record
  5. Links both versions via `parentVideoId` and `aiEnhancements`

#### Frontend Component: `AutoEditStatus.jsx`

- Shows auto-edit information
- Version switcher (original ↔ enhanced)
- Expandable details with analysis breakdown
- Visual indicators for applied enhancements

## Data Model Changes

### Video Model Enhancements

Videos now store auto-edit information in `aiEnhancements` array:

```javascript
{
  aiEnhancements: [
    {
      type: 'auto-edit-analysis',
      timestamp: Date,
      analysis: {
        mood: 'happy',
        pacing: 'medium',
        content_type: 'tutorial'
      },
      transcription: '...',
      recommendedEdits: [...]
    },
    {
      type: 'auto-edited-version',
      timestamp: Date,
      editedVideoId: 'video_id_here',
      appliedEdits: [...],
      summary: 'AI Auto-Edit Summary...'
    }
  ]
}
```

### Video Relationships

```
Original Video (ID: abc123)
  ├─ aiEnhancements[0]: auto-edit-analysis
  └─ aiEnhancements[1]: auto-edited-version
      └─ editedVideoId: xyz789

Auto-Edited Video (ID: xyz789)
  ├─ parentVideoId: abc123
  ├─ appliedEffects: [array of edits]
  └─ metadata.isAutoEdited: true
```

## Workflow Example

### User Journey

1. **Upload video** → "Birthday_Party.mp4"
2. **Backend processes** (background):
   - AI detects: mood=happy, pacing=medium, content_type=vlog
   - Recommends: Warm filter (60%), +5 brightness, +10 contrast
   - Applies edits automatically
3. **User sees**:
   - Original video ready
   - Auto-edited version available
   - Status banner showing "AI Auto-Edit Applied: 2 enhancements"
4. **User can**:
   - Switch between versions
   - View detailed analysis
   - Ask AI Assistant: "make it more dramatic"
   - AI applies additional effect on top of auto-edits

## Configuration

### Environment Variables

```bash
# Existing OpenAI config (used for analysis)
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4-turbo-preview
```

### Customization Points

#### Mood-to-Filter Mapping

Located in: `backend/src/services/autoEditService.js`

```javascript
getMoodBasedColorGrading(mood) {
  const moodToPreset = {
    happy: { preset: "Warm", intensity: 60 },
    energetic: { preset: "Dramatic", intensity: 70 },
    // Add custom mappings here
  };
}
```

#### Content Type Adjustments

```javascript
getContentTypeExposure(contentType) {
  const contentAdjustments = {
    tutorial: { brightness: 10, contrast: 15 },
    // Add custom adjustments here
  };
}
```

## API Endpoints (Existing)

### Upload Video

```
POST /api/videos/upload
Body: multipart/form-data
  - video: File
  - title: String
  - description: String
  - tags: String (comma-separated)

Response:
  - Original video data
  - Background processing starts automatically
  - Auto-edit happens asynchronously
```

### Get Video

```
GET /api/videos/:id

Response includes:
  - aiEnhancements: Array (if auto-edited)
  - parentVideoId: String (if this is an auto-edited version)
```

## Benefits

### For Users

✅ **Time-saving** - Videos are enhanced automatically
✅ **Smart defaults** - AI chooses appropriate enhancements
✅ **Non-destructive** - Original always preserved
✅ **Full control** - Can switch versions or add manual edits
✅ **Learning tool** - See what AI recommends and why

### For Developers

✅ **Modular** - Auto-edit service is independent
✅ **Extensible** - Easy to add new analysis criteria
✅ **Customizable** - Mood/content mappings are configurable
✅ **Traceable** - All edits logged with reasons

## Future Enhancements

### Potential Additions

1. **User Preferences**

   - Allow users to set default enhancement levels
   - Remember preferred styles (aggressive/subtle)

2. **A/B Comparison View**

   - Split-screen original vs enhanced
   - Slider to transition between versions

3. **Edit Refinement**

   - "Apply 50% less" or "Make more dramatic"
   - Fine-tune auto-edits before accepting

4. **Batch Processing**

   - Apply same auto-edit style to multiple videos
   - Create custom presets from auto-edits

5. **Advanced Analysis**

   - Scene detection for per-scene grading
   - Face detection for skin tone correction
   - Action detection for dynamic stabilization

6. **Performance Optimizations**
   - Parallel processing for large videos
   - Progressive auto-edit (quick preview → final quality)
   - Smart caching of analysis results

## Testing

### Manual Test Checklist

- [ ] Upload video with speech (happy mood)
- [ ] Verify auto-edit status appears
- [ ] Check "Warm" filter applied (mood=happy)
- [ ] Switch to original version
- [ ] Apply additional manual edit via AI Assistant
- [ ] Verify manual edit works on both versions
- [ ] Check video metadata includes aiEnhancements
- [ ] Upload video without audio
- [ ] Verify audio enhancement skipped
- [ ] Check processing progress updates

### Test Videos

- **Tutorial** → Should get bright, high-contrast look
- **Vlog with happy tone** → Warm color grading
- **Fast action** → Stabilization applied
- **Silent video** → No audio enhancement

## Troubleshooting

### Auto-Edit Not Appearing

1. Check `aiEnhancements` array in video data
2. Verify background processing completed (`status: 'ready'`)
3. Check server logs for auto-edit errors
4. Ensure OpenAI API key is valid

### Wrong Enhancement Applied

1. Review AI analysis results in video metadata
2. Check mood/content type detection
3. Adjust mappings in `autoEditService.js`
4. Retrain or modify AI prompts in `aiService.js`

### Performance Issues

1. Auto-edit runs in background (non-blocking)
2. Monitor FFmpeg memory usage for large videos
3. Consider queue system for high upload volume
4. Add timeout limits for analysis phase

## Summary

The AI Auto-Edit feature provides an intelligent, automated first-pass at video enhancement while preserving full manual control. It analyzes content using AI, applies contextually appropriate edits, and presents both original and enhanced versions to the user. The AI Assistant remains available for additional manual refinements, creating a hybrid workflow that combines automation with creative control.

**Key Principle**: Automate the obvious, preserve choice, enable creativity.
