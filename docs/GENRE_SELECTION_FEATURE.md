# Genre Selection Feature

## Overview

The Genre Selection feature allows users to explicitly specify the type of video content they're uploading, providing 100% accurate labels for AI training and better video analysis recommendations.

## User Flow

### 1. File Upload Trigger

When a user drops or selects a video file on the Dashboard:

- File is stored in `pendingFile` state
- Genre selection modal appears (`showGenreModal = true`)
- Upload is **deferred** until genre is selected

### 2. Genre Selection Modal

**Modal Display:**

- Dark overlay with backdrop blur
- Centered modal card with smooth animations
- 21 genre options displayed in a responsive grid (2-4 columns)
- Each genre card shows:
  - Emoji icon (visual identifier)
  - Genre name
  - Color gradient background
  - Hover effects for interactivity

**Available Genres:**

1. 🎮 Gaming
2. 📹 Vlog / Lifestyle
3. 📚 Tutorial / Educational
4. 😂 Comedy / Entertainment
5. 🎵 Music / Audio
6. 💃 Dance
7. 💄 Beauty / Fashion
8. 💪 Motivational / Inspirational
9. 🔬 Tech / Science
10. 💬 Opinion / Commentary
11. 🐾 Animals / Pets
12. 🍔 Food / Drink
13. 🎨 DIY / Creative
14. 💼 Business / Finance
15. 🧘 Health / Wellness
16. 🔥 Trends / Challenges
17. 🎬 Film / Editing / Transitions
18. ✈️ Travel / Adventure
19. 💑 Relationships / Social
20. 👨‍👩‍👧‍👦 Family / Kids
21. 🔍 Mystery / Storytelling

### 3. Genre Selection Process

When user clicks a genre card:

1. `handleGenreSelection(genre)` is called
2. Modal closes (`showGenreModal = false`)
3. Video upload starts with progress tracking
4. After successful upload:
   - PATCH request to backend stores genre metadata
   - Endpoint: `PATCH /api/videos/:id`
   - Data: `{ genre: genreId, genreName: genreName }`
5. Navigate to AIEditor with genre data included

### 4. Cancel/Close Options

Users can cancel genre selection by:

- Clicking the backdrop overlay
- Clicking the X button in modal header
- Clicking "Cancel" button in modal footer

Canceling will:

- Close the modal
- Clear the pending file
- Return to normal dashboard state

## Technical Implementation

### Frontend (Dashboard.jsx)

**State Management:**

```javascript
const [showGenreModal, setShowGenreModal] = useState(false);
const [selectedGenre, setSelectedGenre] = useState(null);
const [pendingFile, setPendingFile] = useState(null);
```

**Genre Data Structure:**

```javascript
const videoGenres = [
  {
    id: "gaming",
    name: "Gaming",
    icon: "🎮",
    color: "from-purple-500 to-pink-500",
  },
  // ... 20 more genres
];
```

**Upload Flow:**

```javascript
// Original handleFiles() - now shows modal
const handleFiles = (files) => {
  const videoFile = files[0];
  setPendingFile(videoFile);
  setShowGenreModal(true); // Show modal instead of immediate upload
};

// New handler - performs actual upload with genre
const handleGenreSelection = async (genre) => {
  setSelectedGenre(genre);
  setShowGenreModal(false);

  // Start upload with progress tracking
  const uploadedVideo = await uploadVideo(pendingFile, (progress) => {
    setUploadProgress(progress);
  });

  // Store genre in backend
  await fetch(`/api/videos/${video.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
    body: JSON.stringify({
      genre: genre.id,
      genreName: genre.name,
    }),
  });

  // Navigate to editor with genre data
  navigate("/ai-editor", {
    state: {
      video: {
        ...video,
        genre: genre.id,
        genreName: genre.name,
      },
      autoAnalyze: true,
    },
  });
};
```

### Backend Integration

**Video Model Updates:**
The Video model should include:

```javascript
{
  id: String,
  filename: String,
  url: String,
  // ... other fields
  genre: String,        // Genre ID (e.g., "gaming", "vlog")
  genreName: String,    // Display name (e.g., "Gaming", "Vlog / Lifestyle")
}
```

**API Endpoint:**

- Route: `PATCH /api/videos/:id`
- Body: `{ genre, genreName }`
- Purpose: Store genre metadata with video record
- Authentication: Required (Bearer token)

### Classification System Integration

**Using Genre Data:**

1. **Ground Truth Labels**: Genre selection provides 100% accurate labels for training data
2. **Enhanced Recommendations**: AI can use genre to provide more targeted effect suggestions
3. **Training Quality**: Fine-tuning dataset will have verified genre labels
4. **Metrics Tracking**: Can measure accuracy by genre category

**Classification Service Updates:**

```javascript
// In videoClassificationService.js
async classifyVideo(videoId, useVision = false) {
  const video = await getVideoById(videoId);

  // Use genre as ground truth if available
  const actualGenre = video.genre || null;

  // ... perform classification

  // Store classification with ground truth comparison
  const trainingData = {
    videoId,
    actualGenre,      // From user selection
    predictedGenre,   // From AI classification
    confidence,
    accuracy: actualGenre === predictedGenre ? 1.0 : 0.0
  };

  await saveTrainingData(trainingData);
}
```

## Benefits

### 1. Data Quality

- **100% Accurate Labels**: Eliminates classification errors for training data
- **User Confirmation**: Users explicitly verify video type
- **Consistent Categories**: Standardized genre taxonomy

### 2. AI Performance

- **Better Recommendations**: AI knows exact video type for targeted suggestions
- **Improved Training**: Fine-tuning with accurate labels improves model quality
- **Faster Classification**: Can skip or validate AI predictions with ground truth

### 3. User Experience

- **Contextual Effects**: Users get effects appropriate for their video genre
- **Clear Intent**: Explicit genre selection clarifies user expectations
- **Better Results**: More accurate AI recommendations lead to better edits

### 4. Analytics

- **Genre Metrics**: Track which genres are most popular
- **Accuracy by Genre**: Measure AI performance per category
- **Effect Preferences**: Understand which effects work best for each genre

## Future Enhancements

### Potential Improvements:

1. **Genre Memory**: Remember user's most-used genres for quick selection
2. **Multi-Genre Support**: Allow selecting multiple genres (e.g., "Gaming + Tutorial")
3. **Custom Genres**: Let users create custom genre categories
4. **Genre Editing**: Allow changing genre after upload
5. **Genre-Based Presets**: Pre-configured effect presets per genre
6. **Smart Suggestions**: AI suggests genre based on video preview
7. **Genre Analytics**: Dashboard showing genre distribution and trends

### Integration Opportunities:

- **Classification Dashboard**: Show genre accuracy metrics
- **Effect Library**: Filter effects by recommended genres
- **Project Templates**: Genre-specific project templates
- **Collaboration**: Share genre preferences with team members

## Testing Checklist

- [ ] Upload file → Modal appears
- [ ] Click genre → Upload starts with progress
- [ ] Genre stored in backend (check database/JSON)
- [ ] Navigate to AIEditor with genre data
- [ ] Cancel modal → File cleared, returns to dashboard
- [ ] Responsive layout on mobile/tablet/desktop
- [ ] All 21 genres display correctly with icons
- [ ] Hover effects working on genre cards
- [ ] Modal animations smooth (fade in/out, scale)
- [ ] Backdrop click closes modal
- [ ] X button closes modal
- [ ] Cancel button closes modal
- [ ] Genre data visible in AIEditor state
- [ ] Classification API receives genre
- [ ] Training data includes genre field

## Related Documentation

- `AI_VIDEO_CLASSIFICATION_TRAINING.md` - Classification system overview
- `QUICK_START_AI_TRAINING.md` - Training workflow guide
- `MANUAL_TRAINING_GUIDE.md` - Detailed training instructions
- `VIDEO_EDITING_IMPROVEMENT_RECOMMENDATIONS.md` - Effect recommendations system
