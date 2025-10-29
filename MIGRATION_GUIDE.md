# Migration Guide: Upgrading to AI Auto-Edit

## Overview

This guide helps you upgrade your existing VFXB installation to include the new AI Auto-Edit feature.

## Prerequisites

- Existing VFXB installation
- OpenAI API key configured
- Node.js backend running
- React frontend running

## Installation Steps

### 1. Backend Changes

#### Install Dependencies (if needed)

```bash
cd backend
npm install
```

#### Add New Service File

The new `autoEditService.js` has been created at:

```
backend/src/services/autoEditService.js
```

This service is already imported in `backend/src/routes/video.js`.

#### Update Environment Variables

Ensure your `.env` file has:

```env
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4-turbo-preview  # or gpt-3.5-turbo
```

### 2. Frontend Changes

#### Add New Component

The `AutoEditStatus.jsx` component has been created at:

```
frontend/src/components/AutoEditStatus.jsx
```

This component is already imported in `frontend/src/Pages/AIEditor.jsx`.

#### Install Dependencies (if needed)

```bash
cd frontend
npm install
```

### 3. Database Migration

#### Existing Videos

Existing videos in your database will work normally. They simply won't have the `aiEnhancements` array, which is fine - the AutoEditStatus component checks for this and only shows when present.

#### New Fields Added to Video Model

The Video model already supports these fields (no migration needed):

- `aiEnhancements` - Array of AI analysis and edit information
- `parentVideoId` - Link to original video (for auto-edited versions)
- `appliedEffects` - Array of effects applied to video

These fields are optional and backward-compatible.

## Testing the Installation

### 1. Start Services

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 2. Upload a Test Video

1. Navigate to AI Editor
2. Upload a video with audio (for best results)
3. Wait for processing to complete
4. Look for the "AI Auto-Edit Applied" banner

### 3. Verify Auto-Edit

Check that:

- [ ] Video uploads successfully
- [ ] Processing status shows progress
- [ ] Auto-edit banner appears after processing
- [ ] Can switch between "AI Enhanced" and "Original"
- [ ] "Show Details" expands analysis information
- [ ] AI Assistant still works for manual edits

### 4. Test Auto-Edit Service (Optional)

```bash
cd backend
node testAutoEdit.js
```

Expected output:

```
=== Test 1: Happy Vlog ===
Recommended Edits: [
  {
    "type": "lut-filter",
    "parameters": { "preset": "Warm", "intensity": 60 },
    "reason": "Warm tones enhance happy, positive content"
  },
  ...
]
```

## Troubleshooting

### Auto-Edit Not Triggering

**Problem:** Videos upload but no auto-edit happens

**Solutions:**

1. Check OpenAI API key is valid:

   ```bash
   # In backend/.env
   echo $OPENAI_API_KEY  # Linux/Mac
   # or check the file directly
   ```

2. Check server logs for errors:

   ```bash
   cd backend
   npm start
   # Look for errors during video processing
   ```

3. Verify the background processing function is running:
   - Upload a video
   - Check logs for "Starting background processing"
   - Check logs for "Starting AI analysis"

### Component Not Showing

**Problem:** AutoEditStatus component doesn't appear

**Solutions:**

1. Check video has `aiEnhancements` array:

   ```javascript
   // In browser console
   console.log(uploadedVideo?.aiEnhancements);
   ```

2. Verify import in AIEditor.jsx:

   ```javascript
   import AutoEditStatus from "../components/AutoEditStatus";
   ```

3. Check React DevTools for component errors

### Processing Hangs

**Problem:** Video stuck at "Processing..."

**Solutions:**

1. Check FFmpeg is installed and accessible:

   ```bash
   ffmpeg -version
   ```

2. Check video file permissions
3. Check available disk space
4. Check backend logs for FFmpeg errors

### Wrong Filter Applied

**Problem:** Auto-edit applies incorrect color grading

**Solutions:**

1. Check AI analysis results in video metadata
2. Verify mood detection in `aiEnhancements` array
3. Adjust mood mappings in `autoEditService.js`:
   ```javascript
   getMoodBasedColorGrading(mood) {
     // Customize mappings here
   }
   ```

## Rollback Plan

If you need to revert the changes:

### 1. Remove Auto-Edit from Upload Flow

In `backend/src/routes/video.js`, remove the auto-edit section from `processVideoInBackground()`:

```javascript
// Comment out or remove these lines (around line 320-400):
/*
// Step 2: AI Analysis and Auto-Edit
try {
  ...all the auto-edit code...
} catch (error) {
  logger.error('Auto-edit processing failed:', error);
}
*/
```

### 2. Remove Frontend Component

In `frontend/src/Pages/AIEditor.jsx`, remove:

```javascript
// Remove import
import AutoEditStatus from "../components/AutoEditStatus";

// Remove component usage (around line 2170)
/*
{uploadedVideo && (
  <div className="px-6 mb-4">
    <AutoEditStatus ... />
  </div>
)}
*/
```

### 3. Delete Files (Optional)

```bash
rm backend/src/services/autoEditService.js
rm frontend/src/components/AutoEditStatus.jsx
rm backend/testAutoEdit.js
```

## Performance Considerations

### Resource Usage

- **CPU:** Moderate increase during auto-edit processing
- **Memory:** +200-500MB per concurrent auto-edit
- **Disk:** Each auto-edited video creates a new file
- **API Calls:** +1 OpenAI API call per video upload

### Optimization Tips

1. **Limit concurrent uploads** if server resources are limited
2. **Adjust intensity values** to reduce processing time
3. **Cache analysis results** for similar videos (future enhancement)
4. **Use queue system** for high-volume scenarios

### Cost Estimates

- OpenAI API cost per video: ~$0.01-0.05 (depending on length)
- Storage: 1 additional video file per upload
- Processing time: 30-60 seconds per video (varies by length)

## Configuration Options

### Customize Auto-Edit Behavior

#### Change Default Intensities

In `backend/src/services/autoEditService.js`:

```javascript
getMoodBasedColorGrading(mood) {
  // Change intensity values here
  happy: {
    preset: "Warm",
    intensity: 60,  // Change to 40-80 range
  },
}
```

#### Add New Mood Mappings

```javascript
getMoodBasedColorGrading(mood) {
  const moodToPreset = {
    // ... existing mappings ...
    mysterious: {
      type: "lut-filter",
      parameters: {
        preset: "Cool",
        intensity: 70,
      },
      reason: "Cool tones add mystery",
    },
  };
}
```

#### Disable Specific Auto-Edits

Comment out sections in `determineAutoEdits()`:

```javascript
determineAutoEdits(analysis, metadata) {
  const edits = [];

  // 1. Color grading - ENABLED
  const colorGrading = this.getMoodBasedColorGrading(...);
  if (colorGrading) edits.push(colorGrading);

  // 2. Exposure - DISABLED
  // const exposure = this.getContentTypeExposure(...);
  // if (exposure) edits.push(exposure);

  // 3. Stabilization - ENABLED
  if (videoAnalysis.pacing === "fast") {
    edits.push({...});
  }

  return edits;
}
```

## Support

### Getting Help

- Check full documentation: `docs/AI_AUTO_EDIT_FEATURE.md`
- Review quick start: `AI_AUTO_EDIT_README.md`
- Run test script: `node backend/testAutoEdit.js`
- Check server logs for detailed error messages

### Common Questions

See the FAQ section in `AI_AUTO_EDIT_README.md`

## Summary

✅ **Installation**: Drop in new files, no database migration needed
✅ **Backward Compatible**: Existing videos continue to work
✅ **Non-Breaking**: Original manual editing workflow preserved
✅ **Configurable**: Easy to customize behavior
✅ **Reversible**: Can disable or remove if needed

The AI Auto-Edit feature is designed to enhance your workflow without disrupting existing functionality. All changes are additive and optional.

---

**Need Help?** Check the logs, review the documentation, and test with the provided test script before deploying to production.
