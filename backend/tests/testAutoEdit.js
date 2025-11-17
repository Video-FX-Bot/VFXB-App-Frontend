import { AutoEditService } from "./src/services/autoEditService.js";
import { logger } from "./src/utils/logger.js";

/**
 * Test script for AutoEditService
 * Run with: node testAutoEdit.js (from backend directory)
 */

const autoEditService = new AutoEditService();

// Mock video metadata
const mockMetadata = {
  duration: 120,
  hasAudio: true,
  fps: 30,
  width: 1920,
  height: 1080,
  codec: "h264",
};

// Mock AI analysis results
const mockAnalysisHappy = {
  success: true,
  analysis: {
    mood: "happy",
    pacing: "medium",
    content_type: "vlog",
    suggestions: ["Add warm tones", "Enhance brightness"],
  },
  transcription: "Hey everyone, welcome back to my channel!",
};

const mockAnalysisEnergetic = {
  success: true,
  analysis: {
    mood: "energetic",
    pacing: "fast",
    content_type: "tutorial",
    suggestions: ["Increase contrast", "Stabilize footage"],
  },
  transcription: "Today we're going to learn something amazing!",
};

const mockAnalysisCalm = {
  success: true,
  analysis: {
    mood: "calm",
    pacing: "slow",
    content_type: "presentation",
    suggestions: ["Cinematic look", "Clear visuals"],
  },
  transcription: "Let me explain this concept step by step.",
};

// Test 1: Happy Vlog
console.log("\n=== Test 1: Happy Vlog ===");
const happyEdits = autoEditService.determineAutoEdits(
  mockAnalysisHappy,
  mockMetadata
);
console.log("Recommended Edits:", JSON.stringify(happyEdits, null, 2));
console.log(
  "\nSummary:",
  autoEditService.generateEditSummary(happyEdits, mockAnalysisHappy.analysis)
);

// Test 2: Energetic Tutorial
console.log("\n=== Test 2: Energetic Tutorial ===");
const energeticEdits = autoEditService.determineAutoEdits(
  mockAnalysisEnergetic,
  mockMetadata
);
console.log("Recommended Edits:", JSON.stringify(energeticEdits, null, 2));
console.log(
  "\nSummary:",
  autoEditService.generateEditSummary(
    energeticEdits,
    mockAnalysisEnergetic.analysis
  )
);

// Test 3: Calm Presentation
console.log("\n=== Test 3: Calm Presentation ===");
const calmEdits = autoEditService.determineAutoEdits(
  mockAnalysisCalm,
  mockMetadata
);
console.log("Recommended Edits:", JSON.stringify(calmEdits, null, 2));
console.log(
  "\nSummary:",
  autoEditService.generateEditSummary(calmEdits, mockAnalysisCalm.analysis)
);

// Test 4: Video without audio
console.log("\n=== Test 4: Video Without Audio ===");
const noAudioMetadata = { ...mockMetadata, hasAudio: false };
const noAudioAnalysis = {
  success: true,
  analysis: {
    mood: "neutral",
    pacing: "medium",
    content_type: "general",
  },
  transcription: null,
};
const noAudioEdits = autoEditService.determineAutoEdits(
  noAudioAnalysis,
  noAudioMetadata
);
console.log("Recommended Edits:", JSON.stringify(noAudioEdits, null, 2));
console.log(
  "Should NOT include audio enhancement:",
  !noAudioEdits.some((e) => e.type === "audio-enhancement")
);

// Test 5: Unknown mood fallback
console.log("\n=== Test 5: Unknown Mood (Fallback) ===");
const unknownAnalysis = {
  success: true,
  analysis: {
    mood: "mysterious",
    pacing: "medium",
    content_type: "unknown",
  },
  transcription: "Some mysterious content...",
};
const unknownEdits = autoEditService.determineAutoEdits(
  unknownAnalysis,
  mockMetadata
);
console.log("Recommended Edits:", JSON.stringify(unknownEdits, null, 2));
console.log("Should default to Cinematic filter with 40% intensity");

// Validation Tests
console.log("\n=== Validation Tests ===");

// Check that all edits have required properties
const validateEdit = (edit, testName) => {
  const hasType = edit.type !== undefined;
  const hasParameters = edit.parameters !== undefined;
  const hasReason = edit.reason !== undefined;

  console.log(`${testName}:`, {
    hasType,
    hasParameters,
    hasReason,
    valid: hasType && hasParameters && hasReason,
  });

  return hasType && hasParameters && hasReason;
};

happyEdits.forEach((edit, i) => validateEdit(edit, `Happy Edit ${i + 1}`));
energeticEdits.forEach((edit, i) =>
  validateEdit(edit, `Energetic Edit ${i + 1}`)
);

// Check intensity values are in valid range
console.log("\n=== Intensity Range Validation ===");
const checkIntensity = (edits, testName) => {
  const lutFilters = edits.filter((e) => e.type === "lut-filter");
  lutFilters.forEach((filter) => {
    const intensity = filter.parameters.intensity;
    const valid = intensity >= 0 && intensity <= 100;
    console.log(`${testName} - Intensity:`, intensity, valid ? "✓" : "✗");
  });
};

checkIntensity(happyEdits, "Happy");
checkIntensity(energeticEdits, "Energetic");
checkIntensity(calmEdits, "Calm");

console.log("\n=== All Tests Complete ===");
