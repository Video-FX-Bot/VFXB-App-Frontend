// Quick test for AI pattern matching without OpenAI API key
import AIService from "./src/services/aiService.js";

const aiService = new AIService();

const testMessages = [
  "make it brighter",
  "increase brightness",
  "brighten by 50",
  "make it darker",
  "decrease brightness by 30",
  "increase contrast",
  "more contrast",
  "less contrast",
  "reduce contrast by 20",
  "make it brighter and increase contrast",
  "brighten the video",
  "darken it a bit",
  "can you adjust the brightness?",
  "I want more contrast",
  "turn up the brightness",
  "turn down the brightness",
];

console.log("Testing AI Pattern Matching (without OpenAI API):\n");

testMessages.forEach((message, index) => {
  const result = aiService.analyzeIntentPattern(message, {});
  console.log(`${index + 1}. "${message}"`);
  console.log(`   Action: ${result.action}`);
  console.log(`   Parameters:`, result.parameters);
  console.log(`   Explanation: ${result.explanation}`);
  console.log(`   Confidence: ${result.confidence}\n`);
});
