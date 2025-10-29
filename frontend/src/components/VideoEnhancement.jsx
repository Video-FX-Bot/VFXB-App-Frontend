import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const VideoEnhancement = ({ videoId, onClose, onEnhanced }) => {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementMode, setEnhancementMode] = useState("custom"); // custom, quick, professional
  const [options, setOptions] = useState({
    upscale: false,
    targetResolution: "1080p",
    denoise: true,
    sharpen: true,
    deinterlace: false,
    stabilize: false,
    colorCorrection: true,
    brightnessBoost: 0,
    contrastBoost: 0,
    saturationBoost: 0,
    bitrate: "5M",
  });

  useEffect(() => {
    analyzeQuality();
  }, []);

  const analyzeQuality = async () => {
    setIsAnalyzing(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/video-edit/${videoId}/analyze-quality`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setAnalysis(response.data.data);
      }
    } catch (error) {
      console.error("Error analyzing video quality:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const enhanceVideo = async () => {
    setIsEnhancing(true);
    try {
      const token = localStorage.getItem("token");
      let endpoint = "";

      if (enhancementMode === "quick") {
        endpoint = "quick-enhance";
      } else if (enhancementMode === "professional") {
        endpoint = "professional-enhance";
      } else {
        endpoint = "enhance-quality";
      }

      const response = await axios.post(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/video-edit/${videoId}/${endpoint}`,
        enhancementMode === "custom" ? { options } : {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        if (onEnhanced) {
          onEnhanced(response.data.data);
        }
        alert("Video enhanced successfully!");
      }
    } catch (error) {
      console.error("Error enhancing video:", error);
      alert("Failed to enhance video. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "text-red-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-green-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-purple-500/20"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>✨</span>
            Video Quality Enhancement
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Analysis Section */}
          {isAnalyzing ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Analyzing video quality...</p>
            </div>
          ) : analysis ? (
            <div className="p-6">
              {/* Current Quality */}
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Current Quality
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Resolution</div>
                    <div className="text-white font-semibold">
                      {analysis.currentQuality.resolution}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Frame Rate</div>
                    <div className="text-white font-semibold">
                      {analysis.currentQuality.fps} fps
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Codec</div>
                    <div className="text-white font-semibold">
                      {analysis.currentQuality.codec}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Bitrate</div>
                    <div className="text-white font-semibold">
                      {analysis.currentQuality.bitrate
                        ? `${(
                            analysis.currentQuality.bitrate / 1000000
                          ).toFixed(1)} Mbps`
                        : "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Duration</div>
                    <div className="text-white font-semibold">
                      {analysis.currentQuality.duration.toFixed(1)}s
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Recommended Improvements
                  </h3>
                  <div className="space-y-3">
                    {analysis.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="bg-gray-700/50 rounded-lg p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`text-xs font-semibold uppercase ${getPriorityColor(
                              rec.priority
                            )}`}
                          >
                            {rec.priority}
                          </span>
                          <div className="flex-1">
                            <div className="text-white text-sm">
                              {rec.message}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enhancement Mode Selection */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Enhancement Mode
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setEnhancementMode("quick")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      enhancementMode === "quick"
                        ? "bg-purple-600/20 border-purple-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-2xl mb-2">⚡</div>
                    <div className="font-bold mb-1">Quick</div>
                    <div className="text-xs text-gray-400">
                      Fast enhancement
                    </div>
                  </button>
                  <button
                    onClick={() => setEnhancementMode("custom")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      enhancementMode === "custom"
                        ? "bg-purple-600/20 border-purple-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-2xl mb-2">🎨</div>
                    <div className="font-bold mb-1">Custom</div>
                    <div className="text-xs text-gray-400">Full control</div>
                  </button>
                  <button
                    onClick={() => setEnhancementMode("professional")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      enhancementMode === "professional"
                        ? "bg-purple-600/20 border-purple-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-2xl mb-2">💎</div>
                    <div className="font-bold mb-1">Professional</div>
                    <div className="text-xs text-gray-400">Maximum quality</div>
                  </button>
                </div>
              </div>

              {/* Custom Options */}
              {enhancementMode === "custom" && (
                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Custom Options
                  </h3>
                  <div className="space-y-4">
                    {/* Upscaling */}
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <div className="text-white font-medium">
                          Upscale Resolution
                        </div>
                        <div className="text-xs text-gray-400">
                          Increase video resolution
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={options.upscale}
                        onChange={(e) =>
                          setOptions({ ...options, upscale: e.target.checked })
                        }
                        className="w-5 h-5 accent-purple-600"
                      />
                    </label>

                    {options.upscale && (
                      <div className="ml-6">
                        <label className="block text-sm text-gray-400 mb-2">
                          Target Resolution
                        </label>
                        <select
                          value={options.targetResolution}
                          onChange={(e) =>
                            setOptions({
                              ...options,
                              targetResolution: e.target.value,
                            })
                          }
                          className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2"
                        >
                          <option value="720p">720p (HD)</option>
                          <option value="1080p">1080p (Full HD)</option>
                          <option value="1440p">1440p (2K)</option>
                          <option value="4k">4K (Ultra HD)</option>
                        </select>
                      </div>
                    )}

                    {/* Denoise */}
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <div className="text-white font-medium">
                          Reduce Noise
                        </div>
                        <div className="text-xs text-gray-400">
                          Remove video grain/noise
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={options.denoise}
                        onChange={(e) =>
                          setOptions({ ...options, denoise: e.target.checked })
                        }
                        className="w-5 h-5 accent-purple-600"
                      />
                    </label>

                    {/* Sharpen */}
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <div className="text-white font-medium">Sharpen</div>
                        <div className="text-xs text-gray-400">
                          Increase video sharpness
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={options.sharpen}
                        onChange={(e) =>
                          setOptions({ ...options, sharpen: e.target.checked })
                        }
                        className="w-5 h-5 accent-purple-600"
                      />
                    </label>

                    {/* Stabilize */}
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <div className="text-white font-medium">Stabilize</div>
                        <div className="text-xs text-gray-400">
                          Remove camera shake
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={options.stabilize}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            stabilize: e.target.checked,
                          })
                        }
                        className="w-5 h-5 accent-purple-600"
                      />
                    </label>

                    {/* Color Correction */}
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <div className="text-white font-medium">
                          Auto Color Correction
                        </div>
                        <div className="text-xs text-gray-400">
                          Improve colors automatically
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={options.colorCorrection}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            colorCorrection: e.target.checked,
                          })
                        }
                        className="w-5 h-5 accent-purple-600"
                      />
                    </label>

                    {/* Brightness */}
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Brightness: {options.brightnessBoost > 0 ? "+" : ""}
                        {options.brightnessBoost.toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.1"
                        value={options.brightnessBoost}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            brightnessBoost: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-purple-600"
                      />
                    </div>

                    {/* Contrast */}
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Contrast: {options.contrastBoost > 0 ? "+" : ""}
                        {options.contrastBoost.toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.1"
                        value={options.contrastBoost}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            contrastBoost: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-purple-600"
                      />
                    </div>

                    {/* Saturation */}
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Saturation: {options.saturationBoost > 0 ? "+" : ""}
                        {options.saturationBoost.toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.1"
                        value={options.saturationBoost}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            saturationBoost: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-purple-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Apply Button */}
              <button
                onClick={enhanceVideo}
                disabled={isEnhancing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEnhancing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Enhancing Video... This may take a few minutes
                  </span>
                ) : (
                  `✨ Enhance Video (${
                    enhancementMode === "quick"
                      ? "Quick"
                      : enhancementMode === "professional"
                      ? "Professional"
                      : "Custom"
                  })`
                )}
              </button>
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VideoEnhancement;
