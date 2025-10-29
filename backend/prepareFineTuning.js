import VideoClassificationService from "./src/services/videoClassificationService.js";
import { logger } from "./src/utils/logger.js";
import fs from "fs";
import path from "path";

/**
 * Prepare fine-tuning dataset from collected training data
 */

const classificationService = new VideoClassificationService();

async function prepareFineTuning() {
  try {
    logger.info("🎓 Preparing Fine-Tuning Dataset");
    logger.info("=".repeat(50));

    // Get current metrics
    const metrics = classificationService.getMetrics();
    logger.info("\n📊 Current Training Status:");
    logger.info(`   Total Classifications: ${metrics.totalClassifications}`);
    logger.info(`   Feedback Samples: ${metrics.feedbackCount}`);
    logger.info(`   Current Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`);
    logger.info(
      `   Avg Satisfaction: ${metrics.averageSatisfaction.toFixed(1)}/5`
    );

    // Check if we have enough data
    if (metrics.feedbackCount < 50) {
      logger.warn(
        `\n⚠️  Warning: Only ${metrics.feedbackCount} feedback samples`
      );
      logger.warn(`   Recommended minimum: 50 samples`);
      logger.warn(`   Ideal: 100+ samples`);
      logger.info(
        `\n   Continue anyway? The dataset will be prepared but may not be optimal.`
      );
    } else {
      logger.info(
        `\n✅ Good! You have ${metrics.feedbackCount} feedback samples`
      );
    }

    logger.info("\n🔧 Preparing dataset...");

    // Prepare the dataset
    const result = await classificationService.prepareFineTuningDataset();

    logger.info("\n✅ Dataset prepared successfully!");
    logger.info(`   File: ${result.datasetPath}`);
    logger.info(`   Examples: ${result.exampleCount}`);

    // Read and show a sample
    if (fs.existsSync(result.datasetPath)) {
      const content = fs.readFileSync(result.datasetPath, "utf8");
      const lines = content.split("\n").filter((line) => line.trim());

      logger.info("\n📝 Sample Training Example:");
      if (lines.length > 0) {
        const sample = JSON.parse(lines[0]);
        logger.info(JSON.stringify(sample, null, 2));
      }

      logger.info(
        `\n📁 Dataset Size: ${(content.length / 1024).toFixed(2)} KB`
      );
      logger.info(`   Total Examples: ${lines.length}`);
    }

    // Show next steps
    logger.info("\n" + "=".repeat(50));
    logger.info("📚 Next Steps for Fine-Tuning:");
    logger.info("=".repeat(50));
    logger.info("\n1. Install OpenAI CLI:");
    logger.info("   pip install openai");

    logger.info("\n2. Set your OpenAI API key:");
    logger.info("   export OPENAI_API_KEY='your-key-here'");
    logger.info("   # Or on Windows:");
    logger.info("   set OPENAI_API_KEY=your-key-here");

    logger.info("\n3. Upload the dataset:");
    logger.info("   openai api files.create \\");
    logger.info(`     -f ${path.basename(result.datasetPath)} \\`);
    logger.info("     -p fine-tune");

    logger.info("\n4. Create fine-tuning job:");
    logger.info("   openai api fine_tunes.create \\");
    logger.info("     -t <FILE_ID_FROM_STEP_3> \\");
    logger.info("     -m gpt-3.5-turbo \\");
    logger.info('     --suffix "video-classifier"');

    logger.info(
      "\n   Note: Use gpt-3.5-turbo (cheaper) or gpt-4 (better quality)"
    );

    logger.info("\n5. Monitor training progress:");
    logger.info("   openai api fine_tunes.follow -i <FINE_TUNE_ID>");

    logger.info("\n6. Once complete, update your .env file:");
    logger.info(
      "   OPENAI_MODEL=ft:gpt-3.5-turbo:your-org:video-classifier:ID"
    );

    logger.info("\n7. Restart your backend:");
    logger.info("   npm run dev");

    logger.info("\n" + "=".repeat(50));
    logger.info("💰 Estimated Costs:");
    logger.info("=".repeat(50));
    logger.info(`   Training (${result.exampleCount} examples):`);
    logger.info("   - GPT-3.5-turbo: ~$0.50 - $2.00");
    logger.info("   - GPT-4: ~$2.00 - $8.00");
    logger.info("\n   Usage after training:");
    logger.info("   - Same as base model rates");
    logger.info("   - Fine-tuned models may be slightly more expensive");

    logger.info("\n" + "=".repeat(50));
    logger.info("📖 Documentation:");
    logger.info("   https://platform.openai.com/docs/guides/fine-tuning");
    logger.info("=".repeat(50));

    logger.info("\n✅ Preparation complete!");
    logger.info(`📁 Your dataset is ready at: ${result.datasetPath}`);
  } catch (error) {
    logger.error("\n❌ Error preparing fine-tuning dataset:", error);
    logger.error(error.stack);
    throw error;
  }
}

// Run the preparation
prepareFineTuning()
  .then(() => {
    logger.info("\n✓ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Script failed:", error);
    process.exit(1);
  });
