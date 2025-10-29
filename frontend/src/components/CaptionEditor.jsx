import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const CaptionEditor = ({ videoId, onClose, onApplied }) => {
  const [captions, setCaptions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedCaption, setSelectedCaption] = useState(null);
  const [style, setStyle] = useState({
    fontFamily: "Arial",
    fontSize: 24,
    fontColor: "#ffffff",
    backgroundColor: "rgba(0,0,0,0.5)",
    outlineColor: "#000000",
    outlineWidth: 2,
    position: "bottom",
    alignment: "center",
    marginBottom: 50,
    uppercase: false,
    bold: false,
    italic: false,
  });

  const fonts = [
    "Arial",
    "Arial Black",
    "Comic Sans MS",
    "Courier New",
    "Georgia",
    "Impact",
    "Times New Roman",
    "Trebuchet MS",
    "Verdana",
  ];

  const colors = [
    { name: "White", value: "#ffffff" },
    { name: "Black", value: "#000000" },
    { name: "Red", value: "#ff0000" },
    { name: "Blue", value: "#0000ff" },
    { name: "Green", value: "#00ff00" },
    { name: "Yellow", value: "#ffff00" },
    { name: "Purple", value: "#800080" },
    { name: "Orange", value: "#ffa500" },
  ];

  const generateCaptions = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/video-edit/${videoId}/generate-captions`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setCaptions(response.data.data.captions);
      }
    } catch (error) {
      console.error("Error generating captions:", error);
      alert("Failed to generate captions. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const applyCaptions = async () => {
    if (captions.length === 0) {
      alert("Please generate captions first");
      return;
    }

    setIsApplying(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/video-edit/${videoId}/apply-captions`,
        {
          captions,
          style,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        if (onApplied) {
          onApplied(response.data.data);
        }
        alert("Captions applied successfully!");
      }
    } catch (error) {
      console.error("Error applying captions:", error);
      alert("Failed to apply captions. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  const updateCaption = (id, text) => {
    setCaptions(
      captions.map((cap) => (cap.id === id ? { ...cap, text } : cap))
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}.${String(ms).padStart(3, "0")}`;
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
        className="bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-purple-500/20"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📝</span>
            Caption Generator
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Caption List */}
          <div className="w-1/2 border-r border-gray-700 overflow-y-auto p-6">
            <div className="mb-4">
              <button
                onClick={generateCaptions}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating Captions...
                  </span>
                ) : (
                  "🎤 Generate Captions from Audio"
                )}
              </button>
            </div>

            {captions.length > 0 ? (
              <div className="space-y-2">
                <div className="text-gray-400 text-sm mb-4">
                  {captions.length} captions generated. Click to edit.
                </div>
                {captions.map((caption) => (
                  <div
                    key={caption.id}
                    onClick={() => setSelectedCaption(caption)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedCaption?.id === caption.id
                        ? "bg-purple-600/20 border border-purple-500"
                        : "bg-gray-800 hover:bg-gray-700 border border-gray-700"
                    }`}
                  >
                    <div className="text-xs text-gray-400 mb-1">
                      {formatTime(caption.startTime)} →{" "}
                      {formatTime(caption.endTime)}
                    </div>
                    <textarea
                      value={caption.text}
                      onChange={(e) =>
                        updateCaption(caption.id, e.target.value)
                      }
                      className="w-full bg-transparent text-white text-sm resize-none focus:outline-none"
                      rows="2"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-20">
                <div className="text-6xl mb-4">🎤</div>
                <p>No captions generated yet</p>
                <p className="text-sm mt-2">
                  Click the button above to generate captions from your video's
                  audio
                </p>
              </div>
            )}
          </div>

          {/* Style Editor */}
          <div className="w-1/2 overflow-y-auto p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Caption Styling
            </h3>

            <div className="space-y-4">
              {/* Font Family */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Font Family
                </label>
                <select
                  value={style.fontFamily}
                  onChange={(e) =>
                    setStyle({ ...style, fontFamily: e.target.value })
                  }
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                >
                  {fonts.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Font Size: {style.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={style.fontSize}
                  onChange={(e) =>
                    setStyle({ ...style, fontSize: parseInt(e.target.value) })
                  }
                  className="w-full accent-purple-600"
                />
              </div>

              {/* Font Color */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Font Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() =>
                        setStyle({ ...style, fontColor: color.value })
                      }
                      className={`p-3 rounded-lg border-2 transition-all ${
                        style.fontColor === color.value
                          ? "border-purple-500 scale-110"
                          : "border-gray-700"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Outline Width */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Outline Width: {style.outlineWidth}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={style.outlineWidth}
                  onChange={(e) =>
                    setStyle({
                      ...style,
                      outlineWidth: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-purple-600"
                />
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Position
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["top", "center", "bottom"].map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setStyle({ ...style, position: pos })}
                      className={`px-4 py-2 rounded-lg capitalize transition-all ${
                        style.position === pos
                          ? "bg-purple-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alignment */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Alignment
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["left", "center", "right"].map((align) => (
                    <button
                      key={align}
                      onClick={() => setStyle({ ...style, alignment: align })}
                      className={`px-4 py-2 rounded-lg capitalize transition-all ${
                        style.alignment === align
                          ? "bg-purple-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Options */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={style.bold}
                    onChange={(e) =>
                      setStyle({ ...style, bold: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-600"
                  />
                  <span className="text-gray-300">Bold</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={style.italic}
                    onChange={(e) =>
                      setStyle({ ...style, italic: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-600"
                  />
                  <span className="text-gray-300">Italic</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={style.uppercase}
                    onChange={(e) =>
                      setStyle({ ...style, uppercase: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-600"
                  />
                  <span className="text-gray-300">Uppercase</span>
                </label>
              </div>

              {/* Preview */}
              <div className="mt-6 p-6 bg-black rounded-lg">
                <div className="text-center text-gray-400 text-sm mb-2">
                  Preview
                </div>
                <div
                  className="text-center"
                  style={{
                    fontFamily: style.fontFamily,
                    fontSize: `${style.fontSize}px`,
                    color: style.fontColor,
                    textShadow: `0 0 ${style.outlineWidth}px ${
                      style.outlineColor
                    }, 0 0 ${style.outlineWidth * 2}px ${style.outlineColor}`,
                    fontWeight: style.bold ? "bold" : "normal",
                    fontStyle: style.italic ? "italic" : "normal",
                    textTransform: style.uppercase ? "uppercase" : "none",
                  }}
                >
                  Sample Caption Text
                </div>
              </div>

              {/* Apply Button */}
              <button
                onClick={applyCaptions}
                disabled={isApplying || captions.length === 0}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isApplying ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Applying Captions...
                  </span>
                ) : (
                  "✨ Apply Captions to Video"
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CaptionEditor;
