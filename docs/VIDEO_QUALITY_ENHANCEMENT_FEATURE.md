# Video Quality Enhancement Feature

## Overview

The Video Quality Enhancement feature allows users to improve their video quality through AI-powered denoising, sharpening, and optional resolution upscaling. This is now integrated into the AI chat interface and can be triggered with natural language commands.

## User Commands

Users can request quality enhancement using various phrases:

- "enhance video quality"
- "improve quality"
- "upscale"
- "make it HD"
- "make it 4K"
- "increase resolution"
- "improve video"
- "enhance quality"
- "quality upgrade"
- "denoise"
- "reduce noise"
- "sharpen video"
- "make it sharper"
- "make it clearer"

## Features

### 1. **Noise Reduction (Denoise)**

- **Filter**: `hqdn3d` (High Quality Denoise 3D)
- **Default**: Enabled
- **Purpose**: Removes video noise and grain for cleaner footage
- **Parameters**: `hqdn3d=4:3:6:4.5`
  - Luma spatial: 4
  - Chroma spatial: 3
  - Luma temporal: 6
  - Chroma temporal: 4.5

### 2. **Sharpening**

- **Filter**: `unsharp` mask
- **Default**: Enabled
- **Purpose**: Enhances edge definition and clarity
- **Parameters**: `unsharp=5:5:1.0:5:5:0.0`
  - Luma matrix: 5x5
  - Luma amount: 1.0
  - Chroma matrix: 5x5
  - Chroma amount: 0.0 (only sharpen luma)

### 3. **Resolution Upscaling**

- **Filter**: `scale` with lanczos algorithm
- **Default**: Disabled (opt-in)
- **Purpose**: Increases video resolution
- **Options**:
  - **2x upscale** (default): Doubles current resolution
  - **720p**: 1280x720
  - **1080p**: 1920x1080
  - **4K**: 3840x2160
- **Algorithm**: Lanczos (high-quality resampling)

## API Integration

### Backend Service

**File**: `backend/src/services/videoProcessor.js`

**Effect Configuration**:

```javascript
{
  id: "enhance-quality",
  name: "Quality Enhancement",
  type: "enhancement",
  parameters: {
    denoise: true,    // Noise reduction
    sharpen: true,    // Sharpening
    upscale: false,   // Resolution upscaling
    targetResolution: null // "720p", "1080p", "4k", or null for 2x
  }
}
```

### AI Service

**File**: `backend/src/services/aiService.js`

**Intent Recognition**:

- Action: `enhance-quality`
- Parameters extracted from user message:
  - `upscale`: true if "upscale", "HD", "4K", "increase resolution"
  - `denoise`: true if "denoise", "reduce noise", "clean"
  - `sharpen`: true if "sharpen", "sharper", "clearer"
  - `targetResolution`: "720p", "1080p", "4k" based on keywords

**Example Responses**:

```javascript
{
  action: "enhance-quality",
  parameters: {
    denoise: true,
    sharpen: true,
    upscale: false
  },
  confidence: 0.95,
  explanation: "Enhance video quality with AI denoising and sharpening"
}
```

### Frontend Integration

**File**: `frontend/src/Pages/AIEditor.jsx`

**Automatic Application**:

- Quality enhancement is automatically applied when detected
- Shows processing progress
- Displays confirmation message with details
- No manual confirmation needed

**User Experience**:

1. User types command (e.g., "enhance video quality")
2. AI recognizes intent
3. Processing starts with progress indicator
4. Video is enhanced in background
5. Confirmation message shows what was applied
6. Enhanced video replaces original

## Technical Details

### FFmpeg Filter Chain

When all options are enabled, the filter chain is:

```bash
hqdn3d=4:3:6:4.5,unsharp=5:5:1.0:5:5:0.0,scale=3840:2160:flags=lanczos
```

### Processing Options

**Video Codec**: libx264
**Preset**: slow (for better quality)
**CRF**: 18 (high quality)
**Pixel Format**: yuv420p
**Audio Codec**: aac
**Audio Bitrate**: 192k

### Performance Considerations

- **Denoise + Sharpen only**: ~1-2x real-time processing
- **With 2x upscaling**: ~3-5x video duration
- **With 4K upscaling**: ~5-10x video duration (from 1080p)

## Usage Examples

### Example 1: Basic Quality Enhancement

**User**: "enhance video quality"

**AI Response**: "I'll enhance your video quality with noise reduction and sharpening. Processing now..."

**Result**: Video with reduced noise and improved sharpness

---

### Example 2: Upscale to 4K

**User**: "make it 4K"

**AI Response**: "I'll enhance your video quality with upscaling to higher resolution, noise reduction, sharpening, targeting 4k. This may take a moment depending on video length. Processing now..."

**Result**: Video upscaled to 3840x2160 with quality improvements

---

### Example 3: Noise Reduction Only

**User**: "reduce noise"

**AI Response**: "I'll enhance your video quality with noise reduction. Processing now..."

**Result**: Video with noise reduction applied (sharpening also included by default)

---

### Example 4: Sharpen Video

**User**: "make it sharper"

**AI Response**: "I'll enhance your video quality with sharpening. Processing now..."

**Result**: Video with enhanced edge definition

## Benefits

### For Users

- **One-command enhancement**: Natural language makes it easy
- **Automatic processing**: No complex settings to configure
- **Visual improvement**: Noticeably cleaner and sharper videos
- **Flexible options**: Works with specific requests (denoise, sharpen, upscale)

### Technical Benefits

- **Non-destructive**: Original video preserved, new version created
- **High-quality algorithms**: Professional-grade filters (hqdn3d, unsharp, lanczos)
- **Efficient processing**: Optimized FFmpeg settings
- **Stackable effects**: Can combine with other effects in single pass

## Limitations

### Current Limitations

1. **Processing time**: Upscaling can be slow for long videos
2. **Quality ceiling**: Can't truly add detail that doesn't exist
3. **Single pass**: Multiple quality enhancements replace previous ones
4. **Memory usage**: 4K processing requires significant RAM

### Not Included (Potential Future Features)

- AI upscaling (e.g., Topaz, Real-ESRGAN)
- Super-resolution models
- Frame interpolation
- Color space conversion
- HDR processing

## Troubleshooting

### Issue: Quality enhancement takes too long

**Solution**:

- Avoid 4K upscaling for long videos
- Use denoise + sharpen without upscaling for faster results
- Consider trimming video first

### Issue: Video looks worse after enhancement

**Solution**:

- Already high-quality videos may not benefit
- Over-sharpening can introduce artifacts
- Use "Remove Effect" to revert

### Issue: Upscaling doesn't improve quality significantly

**Expected Behavior**:

- Upscaling increases pixel count but can't add true detail
- Works best for videos with minor compression artifacts
- AI upscaling (future feature) will provide better results

## Future Enhancements

### Planned Features

1. **AI Super-Resolution**: Integration with Replicate or similar services
2. **Custom Parameters**: User control over denoise/sharpen intensity
3. **Quality Analysis**: Before/after comparison metrics
4. **Batch Processing**: Apply to multiple videos
5. **Presets**: One-click profiles (Social Media, Cinema, Archive)

### Integration Opportunities

- **Replicate API**: Use Real-ESRGAN or similar models
- **Cloud Processing**: Offload heavy upscaling to cloud
- **GPU Acceleration**: NVENC/CUDA for faster processing
- **Quality Metrics**: VMAF, SSIM, PSNR analysis

## Related Documentation

- `VIDEO_EDITING_FEATURES_DOCUMENTATION.md` - Complete feature list
- `AI_IMPLEMENTATION_DOCUMENTATION.md` - AI chat system details
- `BACKEND_DOCUMENTATION.md` - API endpoints and services

## Testing Checklist

- [ ] Test "enhance video quality" command
- [ ] Test "make it 4K" upscaling
- [ ] Test "reduce noise" command
- [ ] Test "sharpen video" command
- [ ] Verify denoise filter applied
- [ ] Verify sharpen filter applied
- [ ] Verify upscaling works (2x, 720p, 1080p, 4K)
- [ ] Check processing progress updates
- [ ] Verify confirmation message shows correct details
- [ ] Test with different video resolutions
- [ ] Test with long videos (10+ minutes)
- [ ] Verify video quality improved visually
- [ ] Check file size increase is reasonable
- [ ] Test combining with other effects
