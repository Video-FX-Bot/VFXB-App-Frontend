# Manual Training Guide - Step by Step

## Complete Process to Train Your Video Classification Model

This guide walks you through the entire process of manually training your AI model to better classify videos.

---

## 📋 **Overview**

```
Step 1: Generate Training Data (30 samples minimum)
   ↓
Step 2: Prepare Fine-Tuning Dataset (JSONL format)
   ↓
Step 3: Upload to OpenAI
   ↓
Step 4: Create Fine-Tuning Job
   ↓
Step 5: Monitor Training Progress
   ↓
Step 6: Deploy Trained Model
```

---

## 🚀 **Step 1: Generate Training Data**

### Option A: Use Sample Generator (For Testing)

```bash
cd backend
node generateTrainingData.js
```

This will:

- Create 30 sample video classifications
- Generate realistic feedback data
- Store everything in `backend/data/` directories

### Option B: Use Real User Data (Recommended for Production)

Just use your app normally! The system automatically:

- Stores every video classification
- Collects user feedback
- Tracks accuracy metrics

**Minimum needed:** 50 feedback samples
**Recommended:** 100+ feedback samples

---

## 📊 **Step 2: Check Your Training Data**

```bash
cd backend
node prepareFineTuning.js
```

This will show you:

```
📊 Current Training Status:
   Total Classifications: 30
   Feedback Samples: 30
   Current Accuracy: 85.5%
   Avg Satisfaction: 4.2/5

✅ Dataset prepared successfully!
   File: backend/data/training/fine_tuning_dataset.jsonl
   Examples: 30
```

**Important:** If you see "Need X more samples", keep collecting feedback!

---

## 🎯 **Step 3: Install OpenAI CLI**

### On Windows (PowerShell):

```powershell
# Install Python if you don't have it
# Download from: https://www.python.org/downloads/

# Install OpenAI CLI
pip install openai
```

### On Mac/Linux:

```bash
pip install openai
# or
pip3 install openai
```

### Verify Installation:

```bash
openai --version
```

---

## 🔑 **Step 4: Set OpenAI API Key**

### Windows (PowerShell):

```powershell
$env:OPENAI_API_KEY = "sk-your-api-key-here"
```

### Windows (Command Prompt):

```cmd
set OPENAI_API_KEY=sk-your-api-key-here
```

### Mac/Linux:

```bash
export OPENAI_API_KEY='sk-your-api-key-here'
```

**Get your API key:** https://platform.openai.com/api-keys

---

## 📤 **Step 5: Upload Training Dataset**

```bash
cd backend/data/training

# Upload the dataset file
openai api files.create -f fine_tuning_dataset.jsonl -p fine-tune
```

**Expected output:**

```json
{
  "id": "file-abc123",
  "object": "file",
  "purpose": "fine-tune",
  "filename": "fine_tuning_dataset.jsonl",
  "bytes": 50000,
  "created_at": 1729753200
}
```

**Save the file ID** - you'll need it in the next step!

---

## 🎓 **Step 6: Create Fine-Tuning Job**

### Choose Your Base Model:

**Option A: GPT-3.5-Turbo (Cheaper, Faster)**

```bash
openai api fine_tunes.create \
  -t file-abc123 \
  -m gpt-3.5-turbo \
  --suffix "video-classifier"
```

**Option B: GPT-4 (Better Quality, More Expensive)**

```bash
openai api fine_tunes.create \
  -t file-abc123 \
  -m gpt-4-0613 \
  --suffix "video-classifier"
```

**Expected output:**

```json
{
  "id": "ft-abc123",
  "object": "fine-tune",
  "model": "gpt-3.5-turbo",
  "created_at": 1729753200,
  "status": "pending"
}
```

**Save the fine-tune ID** - you'll need it to monitor progress!

---

## 👀 **Step 7: Monitor Training Progress**

```bash
# Follow the fine-tuning job
openai api fine_tunes.follow -i ft-abc123
```

**You'll see output like:**

```
[2025-10-24 12:00:00] Created fine-tune: ft-abc123
[2025-10-24 12:00:30] Fine-tune started
[2025-10-24 12:01:00] Fine-tune is running (Epoch 1/4)
[2025-10-24 12:02:00] Fine-tune is running (Epoch 2/4)
[2025-10-24 12:03:00] Fine-tune is running (Epoch 3/4)
[2025-10-24 12:04:00] Fine-tune is running (Epoch 4/4)
[2025-10-24 12:05:00] Fine-tune succeeded

Fine-tuned model: ft:gpt-3.5-turbo:your-org:video-classifier:abc123
```

**Training time:**

- GPT-3.5-turbo: ~10-30 minutes
- GPT-4: ~30-60 minutes

---

## 🚀 **Step 8: Deploy Your Trained Model**

### 1. Copy the fine-tuned model ID:

```
ft:gpt-3.5-turbo:your-org:video-classifier:abc123
```

### 2. Update your `.env` file:

```bash
# Open backend/.env
# Update or add this line:
OPENAI_MODEL=ft:gpt-3.5-turbo:your-org:video-classifier:abc123
```

### 3. Restart your backend:

```bash
cd backend
npm run dev
```

### 4. Test the new model:

```bash
node testClassification.js
```

---

## ✅ **Step 9: Verify Improvements**

Test your model and compare results:

### Before Fine-Tuning:

```json
{
  "primary_type": "general",
  "confidence": 0.65,
  "recommended_effects": ["lut-filter"]
}
```

### After Fine-Tuning:

```json
{
  "primary_type": "tutorial",
  "confidence": 0.92,
  "recommended_effects": ["caption", "lut-filter", "audio-enhancement"]
}
```

---

## 📊 **Step 10: Monitor Performance**

Keep tracking accuracy:

```bash
# Check metrics via API
curl http://localhost:5000/api/classification/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Or check the dashboard in your admin panel.

---

## 🔄 **Continuous Improvement Loop**

```
Use Model → Collect Feedback (100+ samples) → Fine-Tune Again → Deploy
                                    ↑                                  ↓
                                    ←─────────────────────────────────┘
```

**Recommendation:** Re-train every 100-200 new feedback samples or monthly.

---

## 💰 **Cost Breakdown**

### Training Costs (One-time):

- **GPT-3.5-turbo:** $0.0080 per 1K tokens

  - 50 examples ≈ $0.40
  - 100 examples ≈ $0.80
  - 200 examples ≈ $1.60

- **GPT-4:** $0.03 per 1K tokens
  - 50 examples ≈ $1.50
  - 100 examples ≈ $3.00
  - 200 examples ≈ $6.00

### Usage Costs (Ongoing):

- Fine-tuned models cost the same as base models
- GPT-3.5-turbo: ~$0.002 per classification
- GPT-4: ~$0.01 per classification

**Recommendation:** Start with GPT-3.5-turbo, upgrade to GPT-4 if needed.

---

## 🔧 **Troubleshooting**

### "Not enough training data"

**Solution:** Collect more feedback samples (minimum 50, ideal 100+)

### "Training failed"

**Solution:** Check your JSONL format:

```bash
# Validate your dataset
python -c "import json; [json.loads(line) for line in open('fine_tuning_dataset.jsonl')]"
```

### "Model not improving accuracy"

**Solutions:**

1. Collect more diverse feedback
2. Ensure feedback is accurate (correct video types)
3. Try a different base model (GPT-4 vs GPT-3.5)
4. Increase training examples (200+ is better)

### "API key invalid"

**Solution:**

1. Get a new key: https://platform.openai.com/api-keys
2. Make sure you have billing set up
3. Check if key has fine-tuning permissions

---

## 📚 **Quick Reference Commands**

```bash
# Generate sample data
node generateTrainingData.js

# Prepare dataset
node prepareFineTuning.js

# Upload to OpenAI
cd backend/data/training
openai api files.create -f fine_tuning_dataset.jsonl -p fine-tune

# Start training
openai api fine_tunes.create -t FILE_ID -m gpt-3.5-turbo --suffix "video-classifier"

# Monitor progress
openai api fine_tunes.follow -i FINE_TUNE_ID

# List all fine-tunes
openai api fine_tunes.list

# Get specific fine-tune
openai api fine_tunes.get -i FINE_TUNE_ID

# Test the model
node testClassification.js
```

---

## 🎯 **Success Checklist**

- [ ] Generated at least 50 training samples
- [ ] Collected user feedback for each sample
- [ ] Prepared JSONL dataset
- [ ] Uploaded to OpenAI
- [ ] Created fine-tuning job
- [ ] Monitored training completion
- [ ] Updated .env with new model ID
- [ ] Restarted backend
- [ ] Tested new model
- [ ] Verified improved accuracy

---

## 📖 **Additional Resources**

- [OpenAI Fine-Tuning Guide](https://platform.openai.com/docs/guides/fine-tuning)
- [OpenAI Pricing](https://openai.com/pricing)
- [Fine-Tuning Best Practices](https://platform.openai.com/docs/guides/fine-tuning/preparing-your-dataset)
- [OpenAI CLI Documentation](https://github.com/openai/openai-python)

---

## 🆘 **Need Help?**

1. Check OpenAI docs: https://platform.openai.com/docs
2. View training logs: `openai api fine_tunes.get -i FINE_TUNE_ID`
3. Check your data quality in `backend/data/`
4. Test with `node testClassification.js`

---

**Ready to train? Start with Step 1!** 🚀
