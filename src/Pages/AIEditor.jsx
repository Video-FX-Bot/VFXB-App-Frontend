import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import EnhancedTimeline from "../components/EnhancedTimeline";
import { useLocation } from "react-router-dom";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  Share2,
  Scissors,
  Wand2,
  Type,
  Music,
  Palette,
  Zap,
  Eye,
  BarChart3,
  Clock,
  Lightbulb,
  Send,
  Plus,
  Layers,
  Filter,
  Sparkles,
  RotateCcw,
  Save,
  Settings,
} from "lucide-react";
import EnhancedVideoPlayer from "../components/video/EnhancedVideoPlayer";
// import EnhancedTimeline from "../components/EnhancedTimeline"; // ⛔️ removed
import EffectsLibrary from "../components/effects/EffectsLibrary";
import {
  videoWorker,
  smartCache,
  progressiveLoader,
  memoryManager,
} from "../utils/performanceOptimizer";
import socketService from "../services/socketService";
import projectService from "../services/projectService";

function FrameStrip({
  videoUrl,
  duration, // may be wrong/short; we won't trust it
  currentTime,
  height = 72,
  frames = 30,
  isPlaying = false,
  isGenerating = false,
}) {
  const [thumbs, setThumbs] = React.useState([]);
  const [mediaDuration, setMediaDuration] = React.useState(null); // real video duration
  const containerRef = React.useRef(null);

  // helper: mm:ss
  const pad2 = (n) => String(n).padStart(2, "0");
  const formatTime = (s) => {
    const mm = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${pad2(mm)}:${pad2(ss)}`;
  };

  // Generate thumbnails across the FULL media duration (not clamped to prop)
  React.useEffect(() => {
    if (!videoUrl) return;

    let cancelled = false;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";
    video.src = videoUrl;

    const generate = async () => {
      // wait for metadata to get actual duration
      await new Promise((res, rej) => {
        const to = setTimeout(() => rej(new Error("metadata timeout")), 15000);
        video.onloadedmetadata = () => {
          clearTimeout(to);
          res();
        };
        video.onerror = () => rej(new Error("video load error"));
        video.load();
      });

      const actual = Math.max(
        0.1,
        Number(video.duration) || Number(duration) || 0.1
      );
      if (!cancelled) setMediaDuration(actual);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 160;
      canvas.height = 90;

      // how many thumbs? cap to frames, but spread across FULL duration
      const count = Math.max(1, Math.min(frames, Math.floor(actual)));
      const out = [];

      for (let i = 0; i < count; i++) {
        if (cancelled) return;
        const t = (actual / count) * i;
        await new Promise((res) => {
          const onSeek = () => {
            try {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              out.push({
                time: t,
                dataUrl: canvas.toDataURL("image/jpeg", 0.7),
              });
            } catch {}
            video.removeEventListener("seeked", onSeek);
            res();
          };
          video.addEventListener("seeked", onSeek);
          video.currentTime = Math.max(0, Math.min(actual - 0.05, t));
        });
      }
      if (!cancelled) setThumbs(out);
    };

    generate().catch(() => {
      setThumbs([]);
      setMediaDuration(Number(duration) || 0);
    });

    return () => {
      cancelled = true;
    };
  }, [videoUrl, duration, frames]);

  // Fixed tile width so content is scrollable; hide scrollbar in CSS
  const tileW = 96;
  const contentWidth = thumbs.length * tileW;

  // Auto-center the playhead using the REAL mediaDuration
  React.useEffect(() => {
    if (!containerRef.current || !thumbs.length || !mediaDuration) return;

    const el = containerRef.current;
    const safeDur = mediaDuration || 0.0001;
    const clampedT = Math.max(0, Math.min(currentTime ?? 0, safeDur));
    const playheadX = (clampedT / safeDur) * contentWidth;

    el.scrollTo({
      left: Math.max(0, playheadX - el.clientWidth / 2),
      behavior: isPlaying ? "smooth" : "auto",
    });
  }, [currentTime, mediaDuration, thumbs.length, isPlaying, contentWidth]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-x-auto rounded-lg border border-border bg-black/40
               [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      style={{ height }}
    >
      {/* --- TIMELINE CONTENT (spans full contentWidth) --- */}
      <div
        className="relative z-0 flex"
        style={{ height, width: contentWidth || "100%" }}
      >
        {/* LEFT → RIGHT SHIMMER OVERLAY (fades in from the left, fades out on the right) */}
        {isGenerating && (
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
            <div className="shimmer-bar h-full w-[22%]" />
          </div>
        )}

        {/* Thumbnails */}
        {thumbs.map((t, i) => (
          <div
            key={i}
            className="relative shrink-0 select-none"
            style={{ width: tileW, height }}
            title={formatTime(t.time)}
          >
            <img
              src={t.dataUrl}
              alt={`frame ${i}`}
              className="h-full w-full object-cover pointer-events-none"
              draggable={false}
            />
            <span className="absolute bottom-1 right-1 text-[10px] px-1 py-[2px] rounded bg-black/70 text-white">
              {formatTime(t.time)}
            </span>
          </div>
        ))}

        {/* Playhead + time bubble */}
        {Number.isFinite(mediaDuration) && mediaDuration > 0 && (
          <div
            className="absolute inset-y-0 pointer-events-none"
            style={{
              left: `${
                (Math.min(currentTime ?? 0, mediaDuration) / mediaDuration) *
                contentWidth
              }px`,
            }}
          >
            <div className="w-0.5 h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
            <div
              className="absolute -top-6 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium
                       px-2 py-[2px] rounded bg-blue-600 text-white border border-blue-400/70"
            >
              {formatTime(Math.min(currentTime ?? 0, mediaDuration))}
            </div>
          </div>
        )}
      </div>

      {/* Keyframes + class for a soft, blended shimmer */}
      <style>
        {`
        .shimmer-bar {
          /* Soft bright core with feathered edges */
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.6) 50%,
            rgba(255,255,255,0) 100%
          );
          filter: blur(0.5px);               /* tiny blur for smoother blend */
          will-change: transform, opacity;
          animation: shimmerLTR 3.6s linear infinite;
          transform: translate3d(-50%, 0, 0); /* start well off-screen left */
          opacity: 0;                         /* invisible at the very start */
        }

        @keyframes shimmerLTR {
          0%   { transform: translate3d(-50%, 0, 0); opacity: 0; }
          8%   { opacity: 1; }   /* fade in as it enters the first frame */
          92%  { opacity: 1; }   /* stay visible through most of the sweep */
          100% { transform: translate3d(150%, 0, 0); opacity: 0; } /* fade out off right */
        }
      `}
      </style>
    </div>
  );
}

const AIEditor = () => {
  const [activeTab, setActiveTab] = useState("assistant");
  const chatScrollRef = useRef(null);
  const location = useLocation();
  const [suppressHotkeys, setSuppressHotkeys] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const videoRef = useRef(null);
  const demoResponses = useRef([
    "Absolutely!",
    "You got it!",
    "Sure thing!",
    "Done!",
    "All set!",
    "On it!",
    "Consider it done!",
  ]);
  const demoIndex = useRef(0);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      type: "ai",
      content:
        "Hi! I'm your AI video editing assistant. Upload a video to get started, or ask me anything about editing!",
      timestamp: new Date().toISOString(),
      suggestions: [
        "🎨 Apply color grading",
        "✂️ Trim video",
        "🎵 Add music",
        "📝 Add titles",
        "⚡ Enhance quality",
        "🔄 Add transitions",
      ],
    },
  ]);

  const [isTyping, setIsTyping] = useState(false);
  const [contextAwareSuggestions, setContextAwareSuggestions] = useState([]);
  const [voiceCommandActive, setVoiceCommandActive] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [userPreferences, setUserPreferences] = useState({
    preferredEffects: [],
    editingStyle: "cinematic",
    autoSuggestions: true,
  });
  const [newMessage, setNewMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1);

  const [selectedTool, setSelectedTool] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [memoryStats, setMemoryStats] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportQuality, setExportQuality] = useState("1080p");
  const [backgroundTasks, setBackgroundTasks] = useState([]);
  const [tracks, setTracks] = useState([
    {
      id: "video-track-1",
      type: "video",
      name: "Main Video",
      clips: uploadedVideo
        ? [
            {
              id: "clip-1",
              name: uploadedVideo.name || "Video Clip",
              type: "video",
              startTime: 0,
              duration: duration || 30,
              thumbnail: uploadedVideo.thumbnail,
            },
          ]
        : [],
      muted: false,
      locked: false,
      visible: true,
      volume: 1,
    },
    {
      id: "audio-track-1",
      type: "audio",
      name: "Audio Track",
      clips: uploadedVideo
        ? [
            {
              id: "audio-clip-1",
              name: "Audio",
              type: "audio",
              startTime: 0,
              duration: duration || 30,
            },
          ]
        : [],
      muted: false,
      locked: false,
      visible: true,
      volume: 1,
    },
  ]);
  const [projectName, setProjectName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // NEW: timeout ref to auto-hide the overlay safely
  const genTimeoutRef = useRef(null);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatMessages, isChatLoading]);

  // Cleanup any pending overlay timeout on unmount
  useEffect(() => {
    return () => {
      if (genTimeoutRef.current) clearTimeout(genTimeoutRef.current);
    };
  }, []);

  // Load video from navigation state
  useEffect(() => {
    if (location.state?.video) {
      const video = location.state.video;
      const autoAnalyze = location.state?.autoAnalyze;

      setUploadedVideo(video);

      extractVideoMetadata(video)
        .then(async (videoMetadata) => {
          console.log("Extracted video metadata:", videoMetadata);

          const videoClip = {
            id: `clip-${Date.now()}`,
            name: video.name || "Video Clip",
            type: "video",
            startTime: 0,
            duration: videoMetadata.duration,
            thumbnail: video.url,
            url: video.url,
            metadata: videoMetadata,
            tags: ["main-content", "uploaded"],
            scenes: [
              {
                start: 0,
                end: Math.min(10, videoMetadata.duration),
                type: "intro",
                description: "Opening scene",
              },
              {
                start: Math.min(10, videoMetadata.duration),
                end: Math.min(
                  videoMetadata.duration - 10,
                  videoMetadata.duration
                ),
                type: "main",
                description: "Main content",
              },
              {
                start: Math.max(0, videoMetadata.duration - 10),
                end: videoMetadata.duration,
                type: "outro",
                description: "Closing scene",
              },
            ],
          };

          const audioClip = {
            id: `audio-clip-${Date.now()}`,
            name: "Audio Track",
            type: "audio",
            startTime: 0,
            duration: videoMetadata.duration,
            url: video.url,
            metadata: {
              channels: 2,
              sampleRate: 44100,
              bitrate: 128,
            },
          };

          setTracks([
            {
              id: "video-track-1",
              type: "video",
              name: "Main Video",
              clips: [videoClip],
              muted: false,
              locked: false,
              visible: true,
              volume: 1,
            },
            {
              id: "audio-track-1",
              type: "audio",
              name: "Audio Track",
              clips: [audioClip],
              muted: false,
              locked: false,
              visible: true,
              volume: 1,
            },
          ]);

          setDuration(videoMetadata.duration);
          const newProjectName =
            video.name?.replace(/\.[^/.]+$/, "") || "Untitled Project";
          setProjectName(newProjectName);

          const autoProjectData = {
            name: newProjectName,
            video: video,
            videoData: {
              name: video.name,
              size: video.size,
              type: video.type,
              url: video.url,
            },
            thumbnail: video.url,
            duration:
              Math.floor(videoMetadata.duration / 60) +
              ":" +
              Math.floor(videoMetadata.duration % 60)
                .toString()
                .padStart(2, "0"),
            lastModified: "Just now",
            status: "editing",
            createdAt: new Date().toISOString(),
            socketId: socketService.getSocketId(),
            chatHistory: [],
            metadata: videoMetadata,
            autoSaved: true,
          };

          try {
            const savedProject = await projectService.saveProject(
              autoProjectData,
              true
            );
            console.log(
              "Project automatically created and saved:",
              savedProject
            );
          } catch (error) {
            console.error("Failed to auto-save project:", error);
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "ai",
              content: `Great! I've analyzed your video "${
                video.name
              }" and automatically created a project for you. Here are the details:\n\n📹 **Video Information:**\n- Duration: ${Math.floor(
                videoMetadata.duration / 60
              )}:${String(Math.floor(videoMetadata.duration % 60)).padStart(
                2,
                "0"
              )}\n- Resolution: ${videoMetadata.resolution}\n- File Size: ${(
                videoMetadata.fileSize /
                (1024 * 1024)
              ).toFixed(
                1
              )} MB\n\n✅ **Project Status:**\n- Automatically saved to Projects page\n- Ready for editing\n\nThe video has been added to your timeline with separate video and audio tracks. You can now start editing!`,
              timestamp: new Date().toISOString(),
            },
          ]);
        })
        .catch((error) => {
          console.error("Error extracting video metadata:", error);
          setDuration(30);
          setProjectName(
            video.name?.replace(/\.[^/.]+$/, "") || "Untitled Project"
          );
        });
    }
  }, [location.state]);

  // Socket setup
  useEffect(() => {
    socketService.connect();

    socketService.onAIResponse((data) => {
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: data.message,
          actions: data.actions || [],
          tips: data.tips || [],
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsTyping(false);
      setIsChatLoading(false);
      setIsGeneratingVideo(false);
    });
    socketService.onVideoAnalysisComplete((data) => {
      setIsGeneratingVideo(false);
    });

    socketService.onVideoAnalysisComplete((data) => {
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: data.message,
          actions: data.actions || [],
          tips: data.tips || [],
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    socketService.onChatError((error) => {
      console.error("Socket error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsTyping(false);
      setIsChatLoading(false);
      setIsGeneratingVideo(false);
    });

    socketService.onAITyping((data) => {
      setIsTyping(data.typing);
    });

    socketService.onMessageReceived((data) => {
      setChatMessages((prev) => [
        ...prev,
        {
          type: "user",
          content: data.message,
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      const newTime = Math.max(0, videoRef.current.currentTime - 10);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      const newTime = Math.min(duration, videoRef.current.currentTime + 10);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleTimeChange = (time) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const extractVideoMetadata = (videoFile) => {
    return new Promise((resolve) => {
      if (
        !videoFile ||
        !(videoFile instanceof File || videoFile instanceof Blob)
      ) {
        console.error("Invalid video file provided to extractVideoMetadata");
        resolve({
          duration: 30,
          width: 1920,
          height: 1080,
          resolution: "1920x1080",
          fps: 30,
          fileSize: 0,
          format: "video/mp4",
        });
        return;
      }

      const video = document.createElement("video");
      video.preload = "metadata";
      let objectURL = null;

      const cleanup = () => {
        if (objectURL) {
          URL.revokeObjectURL(objectURL);
          objectURL = null;
        }
        video.removeAttribute("src");
        video.load();
      };

      video.onloadedmetadata = () => {
        const metadata = {
          duration: video.duration || 30,
          width: video.videoWidth || 1920,
          height: video.videoHeight || 1080,
          resolution: `${video.videoWidth || 1920}x${
            video.videoHeight || 1080
          }`,
        };
        cleanup();
        resolve({
          ...metadata,
          fps: 30,
          fileSize: videoFile.size || 0,
          format: videoFile.type || "video/mp4",
        });
      };

      video.onerror = (error) => {
        console.error("Video metadata extraction error:", error);
        cleanup();
        resolve({
          duration: 30,
          width: 1920,
          height: 1080,
          resolution: "1920x1080",
          fps: 30,
          fileSize: videoFile.size || 0,
          format: videoFile.type || "video/mp4",
        });
      };

      try {
        objectURL = URL.createObjectURL(videoFile);
        video.src = objectURL;
      } catch (error) {
        console.error("Failed to create object URL:", error);
        cleanup();
        resolve({
          duration: 30,
          width: 1920,
          height: 1080,
          resolution: "1920x1080",
          fps: 30,
          fileSize: videoFile.size || 0,
          format: videoFile.type || "video/mp4",
        });
      }
    });
  };

  const addTrack = (type) => {
    const newTrack = {
      id: `${type}-track-${Date.now()}`,
      type: type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${
        tracks.filter((t) => t.type === type).length + 1
      }`,
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      volume: 1,
    };
    setTracks((prev) => [...prev, newTrack]);
  };

  // ********** TEMPORARY SIMPLE HANDLER FOR YOUR DEMO **********
  const handleSendMessage = async () => {
  if (!newMessage.trim()) return;

  setChatMessages((prev) => [
    ...prev,
    { type: "user", content: newMessage, timestamp: new Date().toISOString() },
  ]);
  setNewMessage("");

  if (videoRef.current && !videoRef.current.paused) {
    videoRef.current.pause();
    setIsPlaying(false);
  }

  setIsGeneratingVideo(true);

  // cycle through phrases
  const reply = demoResponses.current[demoIndex.current];
  demoIndex.current =
    (demoIndex.current + 1) % demoResponses.current.length;

  setChatMessages((prev) => [
    ...prev,
    {
      type: "ai",
      content: reply,
      timestamp: new Date().toISOString(),
    },
  ]);

  if (genTimeoutRef.current) clearTimeout(genTimeoutRef.current);
  genTimeoutRef.current = setTimeout(() => {
    setIsGeneratingVideo(false);
  }, 5000);
};

  // ************************************************************

  useEffect(() => {
    const monitorPerformance = () => {
      const stats = memoryManager.getMemoryStats();
      setMemoryStats(stats);

      const cache = smartCache.getStats();
      setCacheStats(cache);
    };

    const interval = setInterval(monitorPerformance, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToolSelect = useCallback((tool) => {
    setSelectedTool(tool);
    switch (tool.id) {
      case "cut":
        break;
      case "trim":
        break;
      case "color-correction":
        break;
      default:
        console.log(`Tool selected: ${tool.name}`);
    }
  }, []);

  const handleBackgroundProcess = useCallback(async (task) => {
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      const result = await videoWorker.processVideo(task, (progress) => {
        setProcessingProgress(progress);
      });

      setBackgroundTasks((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: task.type,
          status: "completed",
          result,
        },
      ]);
    } catch (error) {
      console.error("Background processing failed:", error);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, []);

  const generateContextSuggestions = (video, history) => {
    const suggestions = [];
    if (video) {
      suggestions.push("Enhance video quality");
      suggestions.push("Add color grading");
      suggestions.push("Create highlight reel");
    }
    if (history.length > 0) {
      const recentTopics = history.slice(-3);
      if (recentTopics.some((topic) => topic.includes("color"))) {
        suggestions.push("Apply color correction");
      }
      if (recentTopics.some((topic) => topic.includes("audio"))) {
        suggestions.push("Noise reduction");
      }
    }
    return suggestions;
  };

  const saveProject = async () => {
    if (!uploadedVideo) {
      alert("No video to save!");
      return;
    }

    setIsSaving(true);

    const projectData = {
      name: projectName || `Project ${new Date().toLocaleDateString()}`,
      video: uploadedVideo,
      videoData: {
        name: uploadedVideo.name,
        size: uploadedVideo.size,
        type: uploadedVideo.type,
        url: uploadedVideo.url,
      },
      thumbnail: uploadedVideo.url,
      duration:
        Math.floor(duration / 60) +
        ":" +
        Math.floor(duration % 60)
          .toString()
          .padStart(2, "0"),
      lastModified: "Just now",
      status: "editing",
      createdAt: new Date().toISOString(),
      chatHistory: chatMessages,
      tracks: tracks,
      currentTime: currentTime,
      manualSave: true,
    };

    try {
      const savedProject = await projectService.saveProject(projectData, true);
      console.log("Project saved successfully:", savedProject);
      alert("Project saved successfully!");
    } catch (error) {
      console.error("Failed to save project:", error);
      alert("Failed to save project. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-background text-foreground flex flex-col">
      {/* ======= Shared container for editor + filmstrip + toolbar ======= */}
      <div className="mx-auto w-full max-w-screen-2xl px-8">
        {/* Main Editor Layout (two columns) */}
        <div className="flex flex-1 overflow-hidden py-4 gap-6 items-stretch">
          {/* Left: Video Only (2/3) */}
          <div className="flex-1 flex flex-col" style={{ width: "66.666%" }}>
            {/* Video Player */}
            <div className="relative bg-black rounded-lg overflow-hidden shadow-elevation-2 mb-3 h-[670px]">
              {uploadedVideo ? (
                <EnhancedVideoPlayer
                  ref={videoRef}
                  src={uploadedVideo.url}
                  poster={uploadedVideo.thumbnail}
                  currentTime={currentTime}
                  duration={duration}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={setDuration}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full h-full"
                  fitMode="cover"
                  showWaveform
                  showThumbnailScrubbing
                  enableKeyboardShortcuts={!suppressHotkeys}
                  showMinimap
                  enableGestures
                  enablePiP
                  selectedTool={selectedTool}
                  isProcessing={isProcessing}
                  onBackgroundProcess={handleBackgroundProcess}
                  exportProgress={exportProgress}
                  exportQuality={exportQuality}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-elevation-2">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No Video Loaded
                    </h3>
                    <p className="text-muted-foreground">
                      Upload a video from the Dashboard to start editing
                    </p>
                  </div>
                </div>
              )}

              {isGeneratingVideo && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                  {/* spinner */}
                  <div className="w-12 h-12 rounded-full border-4 border-white/30 border-t-transparent animate-spin mb-4" />
                  <div className="text-white text-sm font-medium tracking-wide">
                    Generating video…
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Sidebar Tabs (1/3) */}
          <div
            className="bg-card border-2 border-border shadow-elevation-2 rounded-lg flex flex-col"
            style={{ width: "33.333%", height: "670px" }}
          >
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setActiveTab("assistant")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === "assistant"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                AI Assistant
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("effects")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === "effects"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Effects
              </button>
            </div>

            {/* Assistant Tab */}
            {activeTab === "assistant" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <div className="pb-6 border-b-2 border-border mb-6 flex-shrink-0 px-6 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold flex items-center">
                      <Sparkles className="w-6 h-6 mr-3 text-primary" />
                      AI Assistant
                    </h3>
                    <div className="flex items-center space-x-4">
                      {memoryStats && (
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span>
                              Memory:{" "}
                              {Math.round(memoryStats.used / 1024 / 1024)}
                              MB
                            </span>
                          </div>
                          {cacheStats && (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              <span>Cache: {cacheStats.hitRate}%</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ask me anything about video editing
                  </p>

                  {isProcessing && (
                    <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-blue-400">
                          Processing...
                        </span>
                        <span className="text-sm text-blue-400">
                          {Math.round(processingProgress)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${processingProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-auto min-h-0 px-6"
                  style={{ scrollbarWidth: "thin" }}
                >
                  <div className="space-y-6 pb-6">
                    {chatMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          message.type === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] p-3 rounded-lg shadow-elevation-1 ${
                            message.type === "user"
                              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-elevation-2 mr-2"
                              : "bg-muted text-muted-foreground border-2 border-border ml-2"
                          }`}
                        >
                          <p className="text-sm break-words">
                            {message.content}
                          </p>
                          <span className="text-xs opacity-70 mt-1 block">
                           
                          </span>
                        </div>
                      </div>
                    ))}

                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted p-3 rounded-lg border-2 border-border shadow-elevation-1 ml-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                            <div
                              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            />
                            <div
                              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Input */}
                <div className="pt-2 border-t-2 border-border mt-auto flex-shrink-0 bg-card/50 backdrop-blur-sm px-6 pb-2">
                  <div className="flex space-x-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onFocus={() => setSuppressHotkeys(true)}
                      onBlur={() => setSuppressHotkeys(false)}
                      onKeyDown={(e) => {
                        const key = (e.key || "").toLowerCase();
                        const isSpace = key === " " || e.code === "Space";
                        const blocked =
                          isSpace || key === "f" || key === "m" || key === "b";
                        if (blocked && !e.ctrlKey && !e.metaKey && !e.altKey)
                          e.stopPropagation();
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      onKeyDownCapture={(e) => {
                        const key = (e.key || "").toLowerCase();
                        const isSpace = key === " " || e.code === "Space";
                        const blocked =
                          isSpace || key === "f" || key === "m" || key === "b";
                        if (blocked && !e.ctrlKey && !e.metaKey && !e.altKey)
                          e.stopPropagation();
                      }}
                      placeholder="Ask me to edit your video... (Press Enter to send, Shift+Enter for new line)"
                      className="flex-1 bg-background border-2 border-border rounded-lg px-5 pt-2 pb-3 text-sm leading-[1.3] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground shadow-elevation-1 transition-all duration-200 resize-none min-h-[52px] max-h-[120px] overflow-hidden"
                      rows={1}
                      onInput={(e) => {
                        const el = e.currentTarget;
                        el.style.height = "auto";
                        el.style.height =
                          Math.min(el.scrollHeight + 2, 120) + "px";
                        el.style.overflowY =
                          el.scrollHeight + 2 > 120 ? "auto" : "hidden";
                      }}
                    />

                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:bg-muted disabled:cursor-not-allowed p-3 rounded-lg transition-all duration-200 shadow-elevation-1 hover:shadow-elevation-2 hover:scale-105 min-w-[48px] flex items-center justify-center self-end"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Effects Tab */}
            {activeTab === "effects" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4">
                  <EffectsLibrary
                    onApplyEffect={(effect, params) => {
                      console.log("Applying effect:", effect, params);
                    }}
                    selectedClips={tracks.flatMap((track) =>
                      track.clips.filter((clip) => clip.selected)
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== Timeline area: filmstrip OR enhanced timeline ===== */}
        <div className="w-full mb-4">
          {!showTimeline ? (
            uploadedVideo ? (
              <div
                onClick={() => setShowTimeline(true)}
                className="cursor-pointer overflow-hidden w-full"
              >
                <FrameStrip
                  videoUrl={uploadedVideo.url}
                  duration={
                    duration ||
                    tracks.find((t) => t.type === "video")?.clips?.[0]
                      ?.duration ||
                    30
                  }
                  currentTime={currentTime}
                  onSeek={(t) => {
                    handleTimeChange(t);
                    setShowTimeline(true);
                  }}
                  height={72}
                  frames={Math.max(
                    24,
                    Math.min(80, Math.floor(duration || 60))
                  )}
                  isPlaying={isPlaying}
                  autoScroll={false} // turn off auto horizontal scrolling
                  stretchToFit // (if your FrameStrip component supports it)
                  isGenerating={isGeneratingVideo}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                Upload a video to see the frame strip.
              </div>
            )
          ) : (
            <div className="bg-card border-2 border-border shadow-elevation-1 rounded-lg overflow-hidden w-full">
              <div className="p-4 border-b border-border bg-card/50 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  Timeline
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTimeline(false)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                  title="Collapse back to mini timeline"
                >
                  Back to mini timeline
                </button>
              </div>
              <EnhancedTimeline
                tracks={tracks}
                currentTime={currentTime}
                duration={duration || 30}
                zoom={timelineZoom}
                isPlaying={isPlaying}
                theme="dark"
                onTimeChange={handleTimeChange}
                onZoomChange={setTimelineZoom}
                onPlay={() => {
                  setIsPlaying(true);
                  videoRef?.current?.play();
                }}
                onPause={() => {
                  setIsPlaying(false);
                  videoRef?.current?.pause();
                }}
                onTracksChange={setTracks}
                addTrack={addTrack}
                className="min-h-[200px]"
              />
            </div>
          )}
        </div>

        {/* ===== Global Toolbar (Centered, Scrolls with Page) ===== */}
        <div className="w-full flex justify-center mt-4 mb-8">
          <div className="bg-card/95 backdrop-blur border-2 border-border rounded-xl shadow-elevation-2 px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
            {/* Left side: Undo + Settings */}
            <div className="flex gap-3">
              <button className="bg-card hover:bg-muted text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-elevation-1 hover:shadow-elevation-2 border border-border">
                <RotateCcw className="w-4 h-4 mr-2 inline-block" />
                Undo
              </button>
              <button className="bg-card hover:bg-muted text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-elevation-1 hover:shadow-elevation-2 border border-border">
                <Settings className="w-4 h-4 mr-2 inline-block" />
                Settings
              </button>
            </div>

            {/* Right side: Project name + Save + Export */}
            <div className="flex items-center gap-3 md:ml-3">
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="bg-card border-2 border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-elevation-1 transition-all duration-200 w-56"
              />
              <button
                onClick={saveProject}
                disabled={isSaving || !uploadedVideo}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-elevation-1 hover:shadow-elevation-2 ${
                  isSaving || !uploadedVideo
                    ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border border-green-500"
                }`}
              >
                <Save className="w-4 h-4 mr-2 inline-block" />
                {isSaving ? "Saving..." : "Save Project"}
              </button>
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-elevation-1 border border-blue-500">
                <Download className="w-4 h-4 mr-2 inline-block" />
                Export Video
              </button>
            </div>
          </div>
        </div>
        {/* ===== End Global Toolbar ===== */}
      </div>

      {/* Background Tasks Panel */}
      {backgroundTasks.length > 0 && (
        <motion.div
          className="fixed bottom-4 right-4 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
        >
          <div className="p-4">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Background Tasks
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {backgroundTasks.slice(-3).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-gray-300 capitalize">{task.type}</span>
                  <span
                    className={`px-2 py-1 rounded ${
                      task.status === "completed"
                        ? "bg-green-900 text-green-300"
                        : task.status === "processing"
                        ? "bg-blue-900 text-blue-300"
                        : "bg-red-900 text-red-300"
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
            {backgroundTasks.length > 3 && (
              <div className="text-xs text-gray-400 mt-2">
                +{backgroundTasks.length - 3} more tasks
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AIEditor;
