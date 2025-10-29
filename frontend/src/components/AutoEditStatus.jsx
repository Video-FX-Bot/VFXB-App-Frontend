import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * AutoEditStatus Component
 * Shows the status of automatic video editing and allows switching between versions
 */
const AutoEditStatus = ({ video, onVersionChange }) => {
  const [currentVersion, setCurrentVersion] = useState("auto-edited");
  const [showDetails, setShowDetails] = useState(false);

  // Check if video has auto-edit information
  const autoEditInfo = video?.aiEnhancements?.find(
    (e) => e.type === "auto-edited-version"
  );

  const analysisInfo = video?.aiEnhancements?.find(
    (e) => e.type === "auto-edit-analysis"
  );

  if (!autoEditInfo) return null;

  const handleVersionSwitch = (version) => {
    setCurrentVersion(version);
    if (onVersionChange) {
      onVersionChange(
        version === "original" ? video.id : autoEditInfo.editedVideoId
      );
    }
  };

  const appliedEdits = autoEditInfo.appliedEdits || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4 mb-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold">AI Auto-Edit Applied</h3>
            <p className="text-gray-400 text-sm">
              {appliedEdits.length} enhancement
              {appliedEdits.length !== 1 ? "s" : ""} applied
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
        >
          {showDetails ? "Hide Details" : "Show Details"}
        </button>
      </div>

      {/* Version Switcher */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => handleVersionSwitch("auto-edited")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            currentVersion === "auto-edited"
              ? "bg-purple-500 text-white shadow-lg shadow-purple-500/50"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            AI Enhanced
          </div>
        </button>
        <button
          onClick={() => handleVersionSwitch("original")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            currentVersion === "original"
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/50"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            Original
          </div>
        </button>
      </div>

      {/* Details Section */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-700 pt-3 mt-3"
          >
            {/* AI Analysis */}
            {analysisInfo?.analysis && (
              <div className="mb-3">
                <h4 className="text-white font-medium mb-2 text-sm">
                  AI Analysis
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {analysisInfo.analysis.mood && (
                    <div className="bg-gray-800/50 rounded p-2">
                      <span className="text-gray-400">Mood:</span>{" "}
                      <span className="text-purple-400 font-medium capitalize">
                        {analysisInfo.analysis.mood}
                      </span>
                    </div>
                  )}
                  {analysisInfo.analysis.pacing && (
                    <div className="bg-gray-800/50 rounded p-2">
                      <span className="text-gray-400">Pacing:</span>{" "}
                      <span className="text-blue-400 font-medium capitalize">
                        {analysisInfo.analysis.pacing}
                      </span>
                    </div>
                  )}
                  {analysisInfo.analysis.content_type && (
                    <div className="bg-gray-800/50 rounded p-2 col-span-2">
                      <span className="text-gray-400">Content Type:</span>{" "}
                      <span className="text-green-400 font-medium capitalize">
                        {analysisInfo.analysis.content_type}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Applied Edits */}
            <div>
              <h4 className="text-white font-medium mb-2 text-sm">
                Applied Enhancements
              </h4>
              <div className="space-y-2">
                {appliedEdits.map((edit, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/50 rounded p-2 text-sm flex items-start gap-2"
                  >
                    <div className="w-5 h-5 bg-purple-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-purple-400 text-xs font-bold">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium capitalize mb-1">
                        {edit.type.replace(/-/g, " ")}
                      </div>
                      <div className="text-gray-400 text-xs">{edit.reason}</div>
                      {edit.parameters && (
                        <div className="text-gray-500 text-xs mt-1">
                          {Object.entries(edit.parameters)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            {autoEditInfo.summary && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-gray-400 text-xs whitespace-pre-line">
                  {autoEditInfo.summary}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Banner */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <svg
            className="w-4 h-4 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            You can use the AI Assistant below to apply additional effects on
            top of the auto-edit
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default AutoEditStatus;
