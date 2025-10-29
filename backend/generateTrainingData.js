import VideoClassificationService from "./src/services/videoClassificationService.js";
import { logger } from "./src/utils/logger.js";

/**
 * Generate sample training data for testing fine-tuning
 * This simulates real user feedback on video classifications
 */

const classificationService = new VideoClassificationService();

// Sample video types and their characteristics
const sampleVideos = [
  // Tutorials
  {
    type: "tutorial",
    transcription: "Today I'll show you how to edit videos step by step",
    duration: 480,
    isVertical: false,
  },
  {
    type: "tutorial",
    transcription: "Welcome to this beginner's guide on photography techniques",
    duration: 600,
    isVertical: false,
  },
  {
    type: "tutorial",
    transcription: "Let me teach you the basics of coding in JavaScript",
    duration: 720,
    isVertical: false,
  },

  // Vlogs
  {
    type: "vlog",
    transcription: "Hey guys! So today I went to this amazing cafe downtown",
    duration: 180,
    isVertical: true,
  },
  {
    type: "vlog",
    transcription: "Good morning everyone! Let me show you my daily routine",
    duration: 240,
    isVertical: true,
  },
  {
    type: "vlog",
    transcription: "What's up fam! Come with me on this crazy adventure",
    duration: 300,
    isVertical: false,
  },

  // Product Reviews
  {
    type: "review",
    transcription: "I've been testing this new camera for two weeks now",
    duration: 420,
    isVertical: false,
  },
  {
    type: "review",
    transcription: "Here's my honest opinion about this smartphone",
    duration: 360,
    isVertical: false,
  },
  {
    type: "review",
    transcription: "Let's unbox and review this gaming laptop",
    duration: 540,
    isVertical: false,
  },

  // Gaming
  {
    type: "gaming",
    transcription: "Let's play this new game and see if it's worth it",
    duration: 900,
    isVertical: false,
  },
  {
    type: "gaming",
    transcription: "Welcome back to another episode of our gameplay series",
    duration: 1200,
    isVertical: false,
  },
  {
    type: "gaming",
    transcription: "Here are the best strategies to win this level",
    duration: 480,
    isVertical: false,
  },

  // Educational
  {
    type: "educational",
    transcription: "In this lecture we'll explore the fundamentals of physics",
    duration: 1800,
    isVertical: false,
  },
  {
    type: "educational",
    transcription: "Understanding the principles of economics is essential",
    duration: 2400,
    isVertical: false,
  },
  {
    type: "educational",
    transcription: "Let's dive into the history of ancient civilizations",
    duration: 1500,
    isVertical: false,
  },

  // Cooking
  {
    type: "cooking",
    transcription: "Today we're making a delicious pasta recipe from scratch",
    duration: 420,
    isVertical: false,
  },
  {
    type: "cooking",
    transcription: "Let me show you my secret technique for perfect steak",
    duration: 360,
    isVertical: false,
  },
  {
    type: "cooking",
    transcription: "Quick and easy meal prep ideas for busy weekdays",
    duration: 300,
    isVertical: true,
  },

  // Fitness
  {
    type: "fitness",
    transcription: "Here's a 10-minute full body workout you can do at home",
    duration: 600,
    isVertical: true,
  },
  {
    type: "fitness",
    transcription: "Let's build muscle with these effective exercises",
    duration: 720,
    isVertical: false,
  },
  {
    type: "fitness",
    transcription: "My morning yoga routine for flexibility and mindfulness",
    duration: 900,
    isVertical: false,
  },

  // Travel
  {
    type: "travel",
    transcription: "Exploring the beautiful beaches of this tropical island",
    duration: 480,
    isVertical: false,
  },
  {
    type: "travel",
    transcription: "My complete travel guide to visiting Europe on a budget",
    duration: 840,
    isVertical: false,
  },
  {
    type: "travel",
    transcription: "Hidden gems you must see when visiting this city",
    duration: 600,
    isVertical: false,
  },

  // Music
  {
    type: "music_video",
    transcription: "New music video from our latest album",
    duration: 240,
    isVertical: false,
  },
  {
    type: "music_video",
    transcription: "Behind the scenes of making this song",
    duration: 360,
    isVertical: false,
  },
  {
    type: "music_video",
    transcription: "Official lyric video for our new single",
    duration: 180,
    isVertical: true,
  },

  // Comedy
  {
    type: "comedy",
    transcription: "Here's a funny sketch about everyday situations",
    duration: 240,
    isVertical: true,
  },
  {
    type: "comedy",
    transcription: "Watch these hilarious pranks on my friends",
    duration: 300,
    isVertical: false,
  },
  {
    type: "comedy",
    transcription: "Comedy roast of popular trends and memes",
    duration: 420,
    isVertical: false,
  },

  // Interview
  {
    type: "interview",
    transcription: "Sitting down with an industry expert to discuss trends",
    duration: 1800,
    isVertical: false,
  },
  {
    type: "interview",
    transcription: "Q and A session answering your most asked questions",
    duration: 900,
    isVertical: false,
  },
  {
    type: "interview",
    transcription: "Career advice from a successful entrepreneur",
    duration: 1200,
    isVertical: false,
  },
];

async function generateTrainingData() {
  try {
    logger.info("🎓 Starting Training Data Generation");
    logger.info(
      `📊 Generating ${sampleVideos.length} sample classifications with feedback`
    );

    for (let i = 0; i < sampleVideos.length; i++) {
      const video = sampleVideos[i];

      logger.info(
        `\n[${i + 1}/${sampleVideos.length}] Processing ${video.type} video...`
      );

      // Create mock metadata
      const mockMetadata = {
        duration: video.duration,
        width: video.isVertical ? 1080 : 1920,
        height: video.isVertical ? 1920 : 1080,
        fps: 30,
        hasAudio: true,
        audioChannels: 2,
        videoBitrate: 5000000,
        audioBitrate: 128000,
        aspectRatio: video.isVertical ? "9:16" : "16:9",
      };

      // Classify the video (this will store classification data)
      const classification = await classificationService.classifyVideo(
        `sample_video_${i + 1}.mp4`,
        mockMetadata,
        video.transcription
      );

      // Simulate user feedback
      // 80% of time, classification is "accurate" for training purposes
      const wasAccurate = Math.random() > 0.2;
      const userSatisfaction = wasAccurate
        ? 4 + Math.floor(Math.random() * 2)
        : 2 + Math.floor(Math.random() * 2);

      const feedback = {
        wasAccurate,
        correctType: wasAccurate ? classification.primary_type : video.type,
        userSatisfaction,
        comments: wasAccurate ? "Good detection!" : "Type was incorrect",
        editsMade: getTypicalEffects(video.type),
      };

      // Record the feedback
      await classificationService.recordFeedback(
        classification.timestamp,
        feedback
      );

      logger.info(`   ✓ Classification stored`);
      logger.info(`   ✓ Feedback recorded (Accurate: ${wasAccurate})`);

      // Small delay to avoid rate limits if using OpenAI
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    logger.info("\n🎉 Training data generation complete!");
    logger.info(`📁 Data saved to: backend/data/training/`);
    logger.info(`📁 Feedback saved to: backend/data/feedback/`);

    // Show metrics
    const metrics = classificationService.getMetrics();
    logger.info("\n📊 Current Metrics:");
    logger.info(`   Total Classifications: ${metrics.totalClassifications}`);
    logger.info(`   Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`);
    logger.info(
      `   Average Satisfaction: ${metrics.averageSatisfaction.toFixed(1)}/5`
    );
    logger.info(`   Training Data Files: ${metrics.trainingDataCount}`);
    logger.info(`   Feedback Files: ${metrics.feedbackCount}`);

    if (metrics.feedbackCount >= 50) {
      logger.info("\n✅ Ready for fine-tuning! Run: node prepareFineTuning.js");
    } else {
      logger.info(
        `\n⏳ Need ${
          50 - metrics.feedbackCount
        } more feedback samples for fine-tuning`
      );
    }
  } catch (error) {
    logger.error("Error generating training data:", error);
    throw error;
  }
}

// Get typical effects used for each video type
function getTypicalEffects(type) {
  const effectMap = {
    tutorial: ["caption", "lut-filter", "audio-enhancement"],
    vlog: ["lut-filter", "caption", "gaussian-blur"],
    review: ["caption", "lut-filter", "brightness"],
    gaming: ["lut-filter", "caption"],
    educational: ["caption", "brightness", "audio-enhancement"],
    cooking: ["lut-filter", "caption", "brightness"],
    fitness: ["lut-filter", "caption"],
    travel: ["lut-filter", "gaussian-blur", "brightness"],
    music_video: ["lut-filter", "gaussian-blur"],
    comedy: ["caption", "lut-filter"],
    interview: ["caption", "audio-enhancement", "brightness"],
  };

  return effectMap[type] || ["lut-filter"];
}

// Run the generation
generateTrainingData()
  .then(() => {
    logger.info("\n✓ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Script failed:", error);
    process.exit(1);
  });
