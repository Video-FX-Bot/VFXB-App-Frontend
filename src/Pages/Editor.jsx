import React from "react";
import {
  Download,
  Share2,
  Save,
  Sparkles,
  Film,
  Clapperboard,
  Music2,
  Mic,
  Tv,
  Gamepad2,
  Smile,
  Bot,
  Send,
  ImageIcon,
} from "lucide-react";

// --- Mock UI Components ---
const Button = ({ children, className = "", ...props }) => (
  <button
    className={`flex items-center justify-center bg-pink-600 text-white rounded px-4 py-2 h-10 text-sm font-semibold transition-all ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Input = (props) => (
  <input
    className="border bg-[#1C1C1C] text-white px-4 py-2 rounded w-full"
    {...props}
  />
);

const Progress = ({ value }) => (
  <div className="bg-gray-700 w-full h-2 rounded overflow-hidden">
    <div className="bg-green-500 h-2" style={{ width: `${value}%` }} />
  </div>
);

const Badge = ({ children, className = "" }) => (
  <span
    className={`bg-[#2A2A2A] border border-[#444] text-gray-300 text-xs px-2 py-1 rounded flex items-center ${className}`}
  >
    {children}
  </span>
);

// --- Sidebar Video Categories ---
const VideoCategory = () => {
  const categories = [
    { name: "Dance Slow", icon: Sparkles },
    { name: "Dance Stock", icon: Music2 },
    { name: "Dance Medium", icon: Sparkles },
    { name: "Hip Hop", icon: Music2 },
    { name: "Ballet", icon: Sparkles },
    { name: "Jazz", icon: Music2 },
    { name: "Contemporary", icon: Sparkles },
    { name: "Tap", icon: Music2 },
    { name: "Ballroom", icon: Sparkles },
  ];
  return (
    <div
      className="p-4 rounded-lg w-full border border-gray-800"
      style={{ backgroundColor: "#121415" }}
    >
      <h3 className="text-base font-semibold mb-4 text-white">
        Video Category
      </h3>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-pink-400" />
        <span className="text-sm font-medium text-gray-300">
          AI Suggestions
        </span>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((cat) => (
          <Badge key={cat.name}>
            <cat.icon className="w-3 h-3 mr-1.5" />
            {cat.name}
          </Badge>
        ))}
      </div>
      {/* Pill-shaped Quick Edit button below the categories */}
      <Button
        className="h-8 px-4 rounded-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold flex items-center justify-center mb-6"
        aria-label="Quick Edit"
      >
        <Bot className="w-4 h-4 mr-1" />
        Quick Edit
      </Button>
      <div className="space-y-3 mt-6">
        <Button className="w-full h-10 bg-transparent border border-gray-600 hover:bg-[#2A2A2A] text-gray-300 hover:text-white">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
        <Button className="w-full h-10 bg-transparent border border-gray-600 hover:bg-[#2A2A2A] text-gray-300 hover:text-white">
          <Save className="w-4 h-4 mr-2" />
          Save Project
        </Button>
        <Button className="w-full h-10 bg-gradient-to-r from-[#06b6d4] to-[#8b5cf6] hover:from-[#22d3ee] hover:to-[#a78bfa] text-white font-bold border-0 shadow-none">
          <Download className="w-4 h-4 mr-2" />
          Download Enhanced Video
        </Button>
      </div>
    </div>
  );
};

// --- Timeline Preview ---
const Timeline = () => (
  <div className="w-full">
    <div className="flex items-center gap-4 mb-2">
      <p className="text-sm">Processing Video...</p>
      <Progress value={75} />
      <p className="text-sm font-mono">75%</p>
    </div>
    <div className="bg-black/20 p-2 rounded-lg flex gap-1 overflow-x-auto mb-6">
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className={`relative h-16 w-24 bg-gray-700 rounded-md flex-shrink-0 flex items-center justify-center ${
            i === 8 ? "border-2 border-red-500" : ""
          }`}
        >
          <Film className="w-6 h-6 text-gray-500" />
        </div>
      ))}
    </div>
  </div>
);

// --- AI Chat Editor ---
const AiChatEditor = () => (
  <div
    className="mb-10 p-4 rounded-lg border border-gray-800 bg-[#121415] mt-0"
    // removed negative margin
  >
    <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
      <Bot className="w-5 h-5" /> AI Chat Editor
    </h3>
    <div className="relative">
      <Input placeholder="Ask AI to enhance your video..." />
      <Button className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 bg-pink-600 hover:bg-pink-700 flex items-center justify-center">
        <Send className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

// --- Main Editor Page ---
export default function EditorPage() {
  return (
    <div className="flex flex-col flex-1 max-w-7xl mx-auto p-6 pt-2 overflow-hidden">
      <h1 className="text-3xl font-bold mb-2 pt-2" style={{ color: "#F472B6" }}>
        AI Video Editor
      </h1>
      <div className="flex-1 flex gap-6">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="relative w-full rounded-lg overflow-hidden mb-2 border border-gray-800 aspect-video bg-black/20 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <ImageIcon className="w-16 h-16 mx-auto mb-4" />
              <p>Video Preview</p>
            </div>
          </div>
          <Timeline />
          <AiChatEditor />
        </div>
        <div className="w-72 flex-shrink-0">
          <VideoCategory />
        </div>
      </div>
      <style>{`
  .gradient-text {
    background: linear-gradient(90deg, #06b6d4, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    color: transparent;
  }
  .pink-glow {
    color: #F472B6;
    text-shadow: 0 0 8px #F472B6, 0 0 16px #F472B6;
  }
`}</style>
    </div>
  );
}
