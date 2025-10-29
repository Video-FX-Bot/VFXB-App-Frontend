# AI Video Classification Training Guide

## Overview

This system allows you to continuously improve the AI's ability to detect video types and recommend appropriate edits through:

1. **Automatic Data Collection** - Every video classification is stored
2. **User Feedback Loop** - Users rate accuracy and provide corrections
3. **Performance Metrics** - Track model accuracy over time
4. **Fine-Tuning** - Create custom OpenAI models with your data

## How It Works

### 1. Video Classification Flow

```
Upload Video → Extract Metadata → Transcribe Audio → Analyze Frame (optional)
     ↓
GPT-4 Analysis → Classification Result → Store Training Data
     ↓
User Reviews → Provides Feedback → Update Metrics
     ↓
Collect 50+ Feedbacks → Prepare Dataset → Fine-Tune Model
```

### 2. Classification Features

The AI analyzes:

- **Video Metadata**: Duration, resolution, FPS, aspect ratio
- **Audio Transcription**: What's being said (using Whisper)
- **Visual Analysis**: Frame analysis with GPT-4 Vision (optional)
- **Content Type**: Vlog, tutorial, gaming, presentation, etc.
- **Style**: Professional, casual, cinematic, raw
- **Recommendations**: Specific effects and editing styles

## API Endpoints

### Classify a Video

```javascript
POST /api/classification/classify/:videoId
Authorization: Bearer <token>

Body (optional):
{
  "includeFrameAnalysis": true  // Use GPT-4 Vision (costs more)
}

Response:
{
  "success": true,
  "data": {
    "classification": {
      "primary_type": "tutorial",
      "confidence": 0.87,
      "style": "professional",
      "recommended_effects": ["lut-filter", "caption"],
      "recommended_style": {
        "color_grading": "cinematic",
        "transitions": "smooth",
        "audio_treatment": "enhance"
      }
    }
  }
}
```

### Submit Feedback

```javascript
POST /api/classification/feedback
Authorization: Bearer <token>

Body:
{
  "classificationId": "2025-10-24T10:30:00.000Z",
  "wasAccurate": false,
  "correctType": "vlog",  // What it actually was
  "userSatisfaction": 4,  // 1-5 rating
  "comments": "Good suggestions but type was wrong",
  "editsMade": ["lut-filter", "caption", "gaussian-blur"]
}

Response:
{
  "success": true,
  "message": "Thank you! Your feedback helps improve our AI."
}
```

### Get Performance Metrics

```javascript
GET /api/classification/metrics
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "metrics": {
      "totalClassifications": 127,
      "accurateClassifications": 98,
      "accuracy": 0.77,
      "averageSatisfaction": 4.2,
      "byType": {
        "tutorial": { "total": 45, "accurate": 39 },
        "vlog": { "total": 32, "accurate": 28 }
      }
    },
    "recommendations": [
      {
        "priority": "high",
        "recommendation": "Ready for fine-tuning",
        "action": "Create custom model with collected data"
      }
    ],
    "readyForFineTuning": true
  }
}
```

### Prepare Training Dataset

```javascript
POST /api/classification/prepare-training
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "datasetPath": "/data/training/fine_tuning_dataset.jsonl",
    "exampleCount": 98,
    "message": "Dataset ready for fine-tuning"
  },
  "instructions": {
    "step1": "Download the generated JSONL file",
    "step2": "Upload to OpenAI: https://platform.openai.com/finetune",
    "step3": "Create a fine-tuning job",
    "step4": "Update OPENAI_MODEL env variable"
  }
}
```

### Download Training Data

```javascript
GET /api/classification/download-training-data
Authorization: Bearer <token>

Downloads: fine_tuning_dataset.jsonl
```

## Frontend Integration

### Add Classification to Video Upload

```javascript
// In your video upload handler
const handleVideoUpload = async (file) => {
  // 1. Upload video
  const video = await uploadVideo(file);

  // 2. Classify it
  const classification = await fetch(
    `/api/classification/classify/${video.id}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        includeFrameAnalysis: true, // Optional, costs more
      }),
    }
  ).then((r) => r.json());

  // 3. Show recommendations
  showRecommendations(classification.data.classification);

  // 4. Auto-apply recommended effects (optional)
  if (autoApply) {
    for (const effect of classification.data.classification
      .recommended_effects) {
      await applyEffect(video.id, effect);
    }
  }
};
```

### Add Feedback UI

```javascript
// After user finishes editing
const FeedbackDialog = ({ classificationId }) => {
  const [feedback, setFeedback] = useState({
    wasAccurate: true,
    correctType: "",
    userSatisfaction: 5,
    comments: "",
    editsMade: [],
  });

  const submitFeedback = async () => {
    await fetch("/api/classification/feedback", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        classificationId,
        ...feedback,
      }),
    });
  };

  return (
    <div>
      <h3>Was our video type detection accurate?</h3>
      <button onClick={() => setFeedback({ ...feedback, wasAccurate: true })}>
        Yes ✓
      </button>
      <button onClick={() => setFeedback({ ...feedback, wasAccurate: false })}>
        No ✗
      </button>

      {!feedback.wasAccurate && (
        <select
          onChange={(e) =>
            setFeedback({ ...feedback, correctType: e.target.value })
          }
        >
          <option value="vlog">Vlog</option>
          <option value="tutorial">Tutorial</option>
          <option value="gaming">Gaming</option>
          {/* Add all types */}
        </select>
      )}

      <div>
        <label>How satisfied are you? (1-5)</label>
        <input
          type="range"
          min="1"
          max="5"
          value={feedback.userSatisfaction}
          onChange={(e) =>
            setFeedback({
              ...feedback,
              userSatisfaction: parseInt(e.target.value),
            })
          }
        />
      </div>

      <button onClick={submitFeedback}>Submit Feedback</button>
    </div>
  );
};
```

### Admin Dashboard for Metrics

```javascript
const AdminMetricsDashboard = () => {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetch("/api/classification/metrics", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setMetrics(data.data));
  }, []);

  if (!metrics) return <div>Loading...</div>;

  return (
    <div className="metrics-dashboard">
      <h2>AI Performance Metrics</h2>

      <div className="metric-card">
        <h3>Overall Accuracy</h3>
        <div className="big-number">
          {(metrics.metrics.accuracy * 100).toFixed(1)}%
        </div>
        <p>
          {metrics.metrics.accurateClassifications} /{" "}
          {metrics.metrics.totalClassifications} correct
        </p>
      </div>

      <div className="metric-card">
        <h3>User Satisfaction</h3>
        <div className="big-number">
          {metrics.metrics.averageSatisfaction.toFixed(1)} / 5
        </div>
      </div>

      <div className="metric-card">
        <h3>Training Status</h3>
        {metrics.readyForFineTuning ? (
          <button onClick={prepareFineTuning}>
            Prepare Fine-Tuning Dataset
          </button>
        ) : (
          <p>
            Need {50 - metrics.metrics.totalClassifications} more
            classifications
          </p>
        )}
      </div>

      <h3>Performance by Video Type</h3>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Total</th>
            <th>Accurate</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(metrics.metrics.byType).map(([type, stats]) => (
            <tr key={type}>
              <td>{type}</td>
              <td>{stats.total}</td>
              <td>{stats.accurate}</td>
              <td>{((stats.accurate / stats.total) * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Recommendations</h3>
      {metrics.recommendations.map((rec, i) => (
        <div key={i} className={`recommendation priority-${rec.priority}`}>
          <strong>{rec.recommendation}</strong>
          <p>{rec.action}</p>
        </div>
      ))}
    </div>
  );
};
```

## Fine-Tuning Process

### Step 1: Collect Data (Automatic)

- System automatically stores every classification
- Collects user feedback
- Minimum 50 feedback samples recommended (100+ ideal)

### Step 2: Prepare Dataset

```bash
# Call API endpoint
POST /api/classification/prepare-training

# Or run directly
node -e "
  import VideoClassificationService from './src/services/videoClassificationService.js';
  const service = new VideoClassificationService();
  await service.prepareFineTuningDataset();
"
```

This creates: `backend/data/training/fine_tuning_dataset.jsonl`

### Step 3: Upload to OpenAI

```bash
# Install OpenAI CLI
pip install openai

# Upload dataset
openai api fine_tunes.create \
  -t fine_tuning_dataset.jsonl \
  -m gpt-4-0613 \
  --suffix "video-classifier"

# Monitor progress
openai api fine_tunes.follow -i <FINE_TUNE_ID>
```

### Step 4: Use Fine-Tuned Model

```bash
# Update .env
OPENAI_MODEL=ft:gpt-4-0613:your-org:video-classifier:ABC123

# Restart backend
npm restart
```

## Data Storage Structure

```
backend/data/
├── training/
│   ├── classification_1729753200000_abc123.json
│   ├── classification_1729753250000_def456.json
│   └── fine_tuning_dataset.jsonl
├── feedback/
│   ├── feedback_1729753200000_abc123.json
│   └── feedback_1729753250000_def456.json
└── metrics/
    └── metrics.json
```

### Classification Data Format

```json
{
  "id": "1729753200000_abc123",
  "videoPath": "video_123.mp4",
  "timestamp": "2025-10-24T10:30:00.000Z",
  "classification": {
    "primary_type": "tutorial",
    "confidence": 0.87,
    "style": "professional"
  },
  "features": {
    "duration": 180,
    "resolution": "1920x1080",
    "hasAudio": true,
    "isVertical": false
  },
  "transcription": "Hey everyone, today I'll show you..."
}
```

### Feedback Data Format

```json
{
  "classificationId": "1729753200000_abc123",
  "timestamp": "2025-10-24T10:35:00.000Z",
  "wasAccurate": false,
  "correctType": "vlog",
  "userSatisfaction": 4,
  "comments": "Recommendations were good but type was wrong",
  "editsMade": ["lut-filter", "caption"]
}
```

## Best Practices

### 1. Encourage User Feedback

- Show feedback dialog after editing session
- Make it quick and easy (1-2 clicks)
- Gamify it: "Help us improve! Rate our suggestions"
- Offer incentives: "Get 10 free credits for 5 feedbacks"

### 2. Start with Good Prompts

- Current system uses detailed prompts
- Include examples in prompts
- Adjust temperature (0.3 for consistency)

### 3. Monitor Accuracy

- Check metrics dashboard weekly
- Look for patterns in misclassifications
- Identify weak video types

### 4. Iterative Improvement

- Start with base GPT-4 model
- Collect 100+ feedbacks
- Fine-tune with that data
- Collect 100+ more feedbacks
- Fine-tune again (2nd generation)
- Repeat for continuous improvement

### 5. A/B Testing

- Test fine-tuned vs base model
- Compare accuracy and user satisfaction
- Keep best performing model

## Cost Optimization

### GPT-4 Vision (Frame Analysis)

- **Cost**: ~$0.01 per frame
- **When to use**: Only for important classifications
- **Alternative**: Use metadata + transcription only (much cheaper)

### Fine-Tuning Costs

- **Training**: $0.03 per 1K tokens
- **Usage**: $0.06 per 1K tokens (input), $0.12 per 1K tokens (output)
- **Dataset size**: 100 examples ≈ 50K tokens ≈ $1.50 training cost

### Recommendations

1. **Start without Vision API** - Use only metadata + transcription
2. **Add Vision selectively** - Only for videos over 1 minute
3. **Fine-tune when ready** - Wait for 100+ quality feedbacks
4. **Monitor ROI** - Track if fine-tuned model improves accuracy enough to justify cost

## Troubleshooting

### Low Accuracy (<70%)

- **Cause**: Insufficient training data or poor prompts
- **Solution**: Collect more feedback, improve system prompt

### No Improvement After Fine-Tuning

- **Cause**: Low quality training data or too few examples
- **Solution**: Collect 200+ feedbacks, validate data quality

### High Costs

- **Cause**: Using Vision API on every video
- **Solution**: Only use Vision for videos >1min or when confidence <0.7

### Slow Classifications

- **Cause**: Vision API + transcription on every video
- **Solution**: Cache classifications, skip transcription for short videos

## Monitoring & Analytics

### Key Metrics to Track

1. **Classification Accuracy** - % of correct video type predictions
2. **User Satisfaction** - Average rating from users
3. **Recommendation Effectiveness** - % of recommendations actually used
4. **Confidence Scores** - Average confidence of classifications
5. **Type Distribution** - Which video types are most common
6. **Feedback Rate** - % of users providing feedback

### Success Criteria

- ✅ **Good**: 70%+ accuracy, 3.5+ satisfaction
- ✅ **Great**: 85%+ accuracy, 4.0+ satisfaction
- ✅ **Excellent**: 90%+ accuracy, 4.5+ satisfaction

## Next Steps

1. **Integrate classification into upload flow**
2. **Add feedback UI component**
3. **Monitor metrics for 1-2 weeks**
4. **Collect 50+ feedbacks**
5. **Prepare fine-tuning dataset**
6. **Create custom model**
7. **Deploy and compare**
8. **Repeat cycle**

## Resources

- [OpenAI Fine-Tuning Guide](https://platform.openai.com/docs/guides/fine-tuning)
- [GPT-4 Vision Documentation](https://platform.openai.com/docs/guides/vision)
- [OpenAI Pricing](https://openai.com/pricing)
- [Best Practices for Fine-Tuning](https://platform.openai.com/docs/guides/fine-tuning/preparing-your-dataset)
