import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const EnhancementLoadingScreen = ({
  isVisible,
  progress = 0,
  message = "Processing...",
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          <div className="text-center space-y-8 px-6">
            {/* AI Enhancement Icon Animation */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="flex justify-center"
            >
              <div className="relative">
                {/* Outer Glow Ring */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 blur-xl"
                />

                {/* AI Icon */}
                <div className="relative bg-gradient-to-br from-purple-600 to-pink-600 rounded-full p-8 shadow-2xl">
                  <svg
                    className="w-16 h-16 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white">
                AI Enhancement in Progress
              </h2>
              <p className="text-gray-300 text-lg">
                Please wait while we analyze and enhance your video
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md mx-auto space-y-3">
              {/* Progress Bar Container */}
              <div className="relative h-3 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                {/* Progress Fill */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-[length:200%_100%] rounded-full"
                  style={{
                    animation: "shimmer 2s infinite linear",
                  }}
                />

                {/* Shimmer Effect */}
                <style>{`
                  @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                  }
                `}</style>
              </div>

              {/* Progress Text */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">{message}</span>
                <span className="text-white font-semibold">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            {/* Processing Steps Indicator */}
            <div className="flex justify-center items-center space-x-8 text-sm">
              <ProcessingStep
                icon="🎬"
                label="Analyzing"
                active={progress >= 0 && progress < 30}
              />
              <ProcessingStep
                icon="🎨"
                label="Enhancing"
                active={progress >= 30 && progress < 70}
              />
              <ProcessingStep
                icon="✨"
                label="Finalizing"
                active={progress >= 70 && progress < 100}
              />
              <ProcessingStep
                icon="✓"
                label="Complete"
                active={progress >= 100}
              />
            </div>

            {/* Helpful Tip */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="text-gray-400 text-sm max-w-lg mx-auto"
            >
              💡 Tip: The AI is analyzing mood, content type, and applying color
              grading, exposure adjustments, and stabilization to enhance your
              video.
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Processing Step Component
const ProcessingStep = ({ icon, label, active }) => {
  return (
    <div className="flex flex-col items-center space-y-2">
      <motion.div
        animate={{
          scale: active ? [1, 1.2, 1] : 1,
          opacity: active ? 1 : 0.4,
        }}
        transition={{
          duration: 1,
          repeat: active ? Infinity : 0,
          ease: "easeInOut",
        }}
        className={`text-2xl ${active ? "filter-none" : "grayscale"}`}
      >
        {icon}
      </motion.div>
      <span
        className={`text-xs ${
          active ? "text-white font-semibold" : "text-gray-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
};

export default EnhancementLoadingScreen;
