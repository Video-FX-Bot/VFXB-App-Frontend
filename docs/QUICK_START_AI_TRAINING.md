# Quick Start: Training Your Video Classification AI

## TL;DR

Your AI can now learn from user feedback and get better at detecting video types! Here's how:

## 1. **Start Using the System** (No changes needed)

```javascript
// Classification happens automatically when you analyze videos
// Data is stored in: backend/data/training/
```

## 2. **Add Feedback Collection** (Frontend)

```javascript
// Add this after user finishes editing
const askForFeedback = async () => {
  const response = await fetch("/api/classification/feedback", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      classificationId: video.classificationId, // Stored in video metadata
      wasAccurate: true, // User says if type was correct
      correctType: "vlog", // If wrong, what it actually was
      userSatisfaction: 5, // 1-5 rating
      editsMade: ["lut-filter", "caption"], // What effects they applied
    }),
  });
};
```

## 3. **Monitor Progress** (Admin Dashboard)

```javascript
// Check how well the AI is doing
const metrics = await fetch("/api/classification/metrics", {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

console.log(`Accuracy: ${metrics.data.metrics.accuracy * 100}%`);
console.log(`Ready for training: ${metrics.data.readyForFineTuning}`);
```

## 4. **Train When Ready** (After 50+ feedbacks)

```bash
# Step 1: Prepare dataset
curl -X POST http://localhost:5000/api/classification/prepare-training \
  -H "Authorization: Bearer YOUR_TOKEN"

# Step 2: Download dataset
curl -O http://localhost:5000/api/classification/download-training-data \
  -H "Authorization: Bearer YOUR_TOKEN"

# Step 3: Upload to OpenAI (requires OpenAI CLI)
openai api fine_tunes.create -t fine_tuning_dataset.jsonl -m gpt-4-0613

# Step 4: Update .env with new model ID
# OPENAI_MODEL=ft:gpt-4-0613:your-org:video-classifier:ABC123
```

## 5. **Benefit** 🎉

- ✅ More accurate video type detection
- ✅ Better editing recommendations
- ✅ Happier users
- ✅ System learns from YOUR specific content types

## What Gets Better?

### Before Training

```json
{
  "primary_type": "general",
  "confidence": 0.65,
  "recommended_effects": ["lut-filter"]
}
```

### After Training (with 100+ feedbacks)

```json
{
  "primary_type": "tutorial",
  "confidence": 0.92,
  "recommended_effects": ["caption", "lut-filter", "audio-enhancement"],
  "recommended_style": {
    "color_grading": "professional",
    "transitions": "smooth"
  }
}
```

## Key Benefits

1. **Learns Your Content** - Recognizes the specific types of videos YOUR users upload
2. **Gets Smarter Over Time** - Every feedback makes it better
3. **Personalized Recommendations** - Suggests effects that actually work for your users
4. **Automatic** - Collects data in the background, no manual work needed

## Cost

- **Collection**: FREE (stores JSON files locally)
- **Fine-Tuning**: ~$2-5 for 100 examples (one-time)
- **Usage**: Same as regular GPT-4 (~$0.01 per classification)

## Timeline

- **Week 1-2**: Collect feedback (target: 50+)
- **Week 3**: Prepare dataset and fine-tune
- **Week 4**: Deploy and test new model
- **Ongoing**: Continuous improvement loop

## Example Feedback UI Component

```jsx
const VideoFeedbackDialog = ({ video, onClose }) => {
  const [wasAccurate, setWasAccurate] = useState(null);

  const submitFeedback = async (accurate) => {
    setWasAccurate(accurate);

    await fetch("/api/classification/feedback", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        classificationId: video.classificationId,
        wasAccurate: accurate,
        userSatisfaction: accurate ? 5 : 3,
        editsMade: video.appliedEffects?.map((e) => e.effect) || [],
      }),
    });

    // Show thank you message
    setTimeout(onClose, 1500);
  };

  return (
    <div className="feedback-dialog">
      <h3>Was this a {video.detectedType} video?</h3>
      <button onClick={() => submitFeedback(true)}>Yes, that's right! ✓</button>
      <button onClick={() => submitFeedback(false)}>
        No, it's something else ✗
      </button>

      {wasAccurate !== null && (
        <p className="thank-you">
          Thank you! Your feedback helps improve our AI 🎉
        </p>
      )}
    </div>
  );
};
```

## Need More Details?

See the full guide: `docs/AI_VIDEO_CLASSIFICATION_TRAINING.md`

## Questions?

- **Q: How much data do I need?**
  A: Start with 50, ideal is 100-200 feedbacks

- **Q: How often should I retrain?**
  A: Every 100-200 new feedbacks, or monthly

- **Q: Will it cost more?**
  A: Initial fine-tuning: ~$2-5. Usage: same as base GPT-4

- **Q: Can I undo a fine-tune?**
  A: Yes, just switch back to `gpt-4-turbo-preview` in .env

- **Q: What if accuracy doesn't improve?**
  A: Need more data or better prompts. Check metrics dashboard for insights.
