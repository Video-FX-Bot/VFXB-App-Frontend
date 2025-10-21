import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
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
import EffectsLibrary from "../components/effects/EffectsLibrary";
import {
  videoWorker,
  smartCache,
  progressiveLoader,
  memoryManager,
} from "../utils/performanceOptimizer";
import socketService from "../services/socketService";
import projectService from "../services/projectService";
import aiService from "../services/aiService";
import useVideoStore from "../context/videoStore";

/* ===========================================================
   FrameStrip (unchanged except for formatting)
=========================================================== */
function FrameStrip({
  videoUrl,
  duration,
  currentTime,
  height = 72,
  frames = 30,
  isPlaying = false,
  isGenerating = false,
}) {
  const [thumbs, setThumbs] = React.useState([]);
  const [mediaDuration, setMediaDuration] = React.useState(null);
  const containerRef = React.useRef(null);

  const [isIOS, setIsIOS] = React.useState(false);
  React.useEffect(() => {
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);
  }, []);

  const pad2 = (n) => String(n).padStart(2, "0");
  const formatTime = (s) => {
    const mm = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${pad2(mm)}:${pad2(ss)}`;
  };

  React.useEffect(() => {
    if (!videoUrl) return;

    let cancelled = false;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";
    video.src = videoUrl;

    const generate = async () => {
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

  const tileW = 96;
  const contentWidth = thumbs.length * tileW;

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
      <div
        className="relative z-0 flex"
        style={{ height, width: contentWidth || "100%" }}
      >
        {isGenerating && !isIOS && (
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
            <div className="shimmer-bar h-full w-[22%]" />
          </div>
        )}

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
            <div className="absolute -top-6 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium px-2 py-[2px] rounded bg-blue-600 text-white border border-blue-400/70">
              {formatTime(Math.min(currentTime ?? 0, mediaDuration))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .shimmer-bar {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.35) 50%,
            rgba(255,255,255,0) 100%
          );
          will-change: transform;
          animation: shimmerLTR 3.6s linear infinite;
          transform: translate3d(-50%, 0, 0);
          opacity: 0;
        }
        @keyframes shimmerLTR {
          0%   { transform: translate3d(-50%, 0, 0); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translate3d(150%, 0, 0); opacity: 0; }
        }
        @supports (-webkit-touch-callout: none) { .shimmer-bar { display: none !important; } }
        @media (max-width: 640px) { .shimmer-bar { display: none !important; } }
        @media (prefers-reduced-motion: reduce) { .shimmer-bar { animation: none !important; display: none !important; } }
      `}</style>
    </div>
  );
}

/* ===========================================================
   AIEditor
=========================================================== */
const AIEditor = () => {
  const [activeTab, setActiveTab] = useState("assistant");
  const chatScrollRef = useRef(null);
  const location = useLocation();
  const [suppressHotkeys, setSuppressHotkeys] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const videoRef = useRef(null);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const prevStoreVideoRef = useRef({ id: null, url: null }); // Track previous store values
  const processedResponseIds = useRef(new Set()); // Track processed AI responses to prevent duplicates
  const hasShownWelcomeMessage = useRef(false); // Track if we've shown the welcome message to prevent duplicates

  // Connect to video store - only select what we need to prevent re-renders
  const storeCurrentVideo = useVideoStore((state) => state.currentVideo);
  const applyGlobalEffect = useVideoStore((state) => state.applyGlobalEffect);
  const setCurrentVideo = useVideoStore((state) => state.setCurrentVideo);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
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

  // Track current effect parameters for manual controls
  const [currentEffectParams, setCurrentEffectParams] = useState({
    brightness: 0,
    contrast: 0,
  });

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

  /* -------------------------------
     Helpers to adapt AI actions
  --------------------------------*/
  const labelize = (op) =>
    (op || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

  const toActionDescriptors = (intent, params) => {
    switch (intent) {
      case "audio_enhance":
        return [
          {
            label: "Apply Audio Enhancement",
            kind: "exec",
            operation: "audio_enhance",
            params,
          },
          {
            label: "Preview Changes",
            kind: "preview",
            operation: "audio_enhance",
            params,
          },
        ];
      case "audio_remove_noise":
        return [
          {
            label: "Remove Background Noise",
            kind: "exec",
            operation: "noise_reduction",
            params,
          },
          { label: "Noise Settings", kind: "tool", name: "noise-settings" },
        ];
      case "video_trim":
        return [
          { label: "Select Trim Points", kind: "tool", name: "trim-tool" },
          {
            label: "Auto-detect Silent Parts",
            kind: "tool",
            name: "auto-trim",
          },
        ];
      case "add_subtitles":
        return [
          {
            label: "Auto-generate Subtitles",
            kind: "exec",
            operation: "auto_subtitles",
            params,
          },
          {
            label: "Upload Subtitle File",
            kind: "tool",
            name: "subtitle-upload",
          },
        ];
      case "color_correction":
        return [
          {
            label: "Auto Color Correction",
            kind: "exec",
            operation: "auto_color_correct",
            params,
          },
          { label: "Manual Adjustments", kind: "tool", name: "color-tool" },
        ];
      case "export_video":
        return [
          {
            label: "Export MP4 (High)",
            kind: "export",
            format: "mp4",
            quality: "high",
          },
          {
            label: "Export WebM (Medium)",
            kind: "export",
            format: "webm",
            quality: "medium",
          },
          {
            label: "Custom Export Settings",
            kind: "tool",
            name: "export-settings",
          },
        ];
      default:
        return [
          {
            label: "Enhance Audio",
            kind: "exec",
            operation: "audio_enhance",
            params,
          },
          {
            label: "Add Subtitles",
            kind: "exec",
            operation: "auto_subtitles",
            params,
          },
          { label: "Trim Video", kind: "tool", name: "trim-tool" },
          { label: "Color Correction", kind: "tool", name: "color-tool" },
        ];
    }
  };

  const handleAIAction = async (action) => {
    console.log("🎯 handleAIAction called with:", action);
    try {
      setIsProcessing(true);
      setProcessingProgress(0);

      if (!uploadedVideo) {
        setChatMessages((p) => [
          ...p,
          {
            type: "ai",
            content: "Please upload a video first.",
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }

      // Check both action.kind (old format) and action.action (new format)
      const actionType = action.kind || action.action;
      console.log("🎯 actionType resolved to:", actionType);

      switch (actionType) {
        case "exec": {
          const res = await aiService.executeVideoOperation(
            action.operation,
            action.params || {}
          );
          setBackgroundTasks((prev) => [
            ...prev,
            {
              id: Date.now(),
              type: action.operation,
              status: "completed",
              result: res,
            },
          ]);
          setChatMessages((p) => [
            ...p,
            {
              type: "ai",
              content: `✅ ${labelize(action.operation)} applied.`,
              timestamp: new Date().toISOString(),
            },
          ]);
          break;
        }
        case "preview": {
          await aiService.previewOperation(
            action.operation,
            action.params || {}
          );
          setChatMessages((p) => [
            ...p,
            {
              type: "ai",
              content: `🔍 Preview ready for ${labelize(action.operation)}.`,
              timestamp: new Date().toISOString(),
            },
          ]);
          break;
        }
        case "export": {
          const res = await aiService.exportVideo(
            action.format,
            action.quality
          );
          setChatMessages((p) => [
            ...p,
            {
              type: "ai",
              content: `📦 Export started (${action.format.toUpperCase()}, ${
                action.quality
              }).`,
              timestamp: new Date().toISOString(),
            },
          ]);
          // Optionally handle res.downloadUrl when your backend returns it
          break;
        }
        case "tool": {
          if (action.name === "trim-tool") {
            setSelectedTool({ id: "trim", name: "Trim" });
            aiService.openTrimTool?.();
          } else if (action.name === "auto-trim") {
            aiService.autoDetectTrimPoints?.();
          } else if (action.name === "color-tool") {
            setSelectedTool({
              id: "color-correction",
              name: "Color Correction",
            });
            aiService.openColorTool?.();
          } else if (action.name === "export-settings") {
            aiService.openExportSettings?.();
          } else if (action.name === "noise-settings") {
            aiService.showNoiseSettings?.();
          } else if (action.name === "subtitle-upload") {
            aiService.openSubtitleUpload?.();
          }
          break;
        }
        case "adjust_brightness":
        case "adjust_contrast":
        case "reset": {
          // Get current video from store
          const currentVideo = useVideoStore.getState().currentVideo;
          if (!currentVideo?.id) {
            setChatMessages((p) => [
              ...p,
              {
                type: "ai",
                content: "No video loaded to adjust.",
                timestamp: new Date().toISOString(),
              },
            ]);
            return;
          }

          // Show processing state
          setIsGeneratingVideo(true);
          setProcessingProgress(10);

          // Simulate progress updates
          const progressInterval = setInterval(() => {
            setProcessingProgress((prev) => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90;
              }
              return prev + 10;
            });
          }, 300);

          // Apply the effect
          const applyEffect = useVideoStore.getState().applyGlobalEffect;
          try {
            await applyEffect({
              id: "brightness",
              name: "Brightness/Contrast",
              type: "color",
              parameters: action.parameters || {},
              timestamp: Date.now(),
            });

            // Complete progress
            clearInterval(progressInterval);
            setProcessingProgress(100);

            setTimeout(() => {
              setIsGeneratingVideo(false);
              setProcessingProgress(0);
            }, 500);

            // Update current effect parameters for manual controls
            const params = action.parameters;
            setCurrentEffectParams({
              brightness: params.brightness || 0,
              contrast: params.contrast || 0,
            });

            // Show confirmation with quick actions again
            let confirmationMsg = "✅ Done! ";

            if (action.action === "reset") {
              confirmationMsg = "✅ Reset to original video!";
            } else if (params.brightness && params.brightness !== 0) {
              confirmationMsg += `Brightness ${
                params.brightness > 0 ? "increased" : "decreased"
              }.`;
            } else if (params.contrast && params.contrast !== 0) {
              confirmationMsg += `Contrast ${
                params.contrast > 0 ? "increased" : "decreased"
              }.`;
            }

            // Add the same quick actions for further adjustments
            const quickActions = [
              {
                label: "✨ Brighten More",
                action: "adjust_brightness",
                parameters: { brightness: 30, contrast: 0 },
              },
              {
                label: "🌙 Darken",
                action: "adjust_brightness",
                parameters: { brightness: -30, contrast: 0 },
              },
              {
                label: "📈 Increase Contrast",
                action: "adjust_contrast",
                parameters: { brightness: 0, contrast: 30 },
              },
              {
                label: "📉 Decrease Contrast",
                action: "adjust_contrast",
                parameters: { brightness: 0, contrast: -30 },
              },
              {
                label: "🔄 Reset to Original",
                action: "reset",
                parameters: { brightness: 0, contrast: 0 },
              },
            ];

            setChatMessages((p) => [
              ...p,
              {
                id: `msg-${Date.now()}-${Math.random()}`,
                type: "ai",
                content: confirmationMsg,
                timestamp: new Date().toISOString(),
                actions: quickActions,
              },
            ]);
          } catch (error) {
            clearInterval(progressInterval);
            setIsGeneratingVideo(false);
            setProcessingProgress(0);

            setChatMessages((p) => [
              ...p,
              {
                type: "ai",
                content: `❌ Sorry, I couldn't apply the effect: ${error.message}`,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
          break;
        }
        case "lut-filter": {
          // Handle LUT filter button clicks
          const currentVideo = useVideoStore.getState().currentVideo;
          const applyEffect = useVideoStore.getState().applyGlobalEffect;

          if (!currentVideo?.id) {
            setChatMessages((p) => [
              ...p,
              {
                type: "ai",
                content: "❌ No video available to apply filter.",
                timestamp: new Date().toISOString(),
              },
            ]);
            break;
          }

          const params = action.parameters || {};
          const lutType = params.lut || "Cinematic";
          const intensity = params.intensity || 100;

          console.log(`Applying LUT filter: ${lutType} at ${intensity}%`);

          setIsGeneratingVideo(true);
          setProcessingProgress(10);

          const progressInterval = setInterval(() => {
            setProcessingProgress((prev) => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90;
              }
              return prev + 10;
            });
          }, 300);

          try {
            const effectConfig = {
              id: "lut-filter",
              name: "LUT Filter",
              type: "color",
              parameters: { lut: lutType, intensity },
              timestamp: Date.now(),
            };

            await applyEffect(effectConfig);

            clearInterval(progressInterval);
            setProcessingProgress(100);

            setTimeout(() => {
              setIsGeneratingVideo(false);
              setProcessingProgress(0);
            }, 500);

            // Show confirmation with all LUT options
            const quickActions = [
              {
                label: "🎬 Cinematic",
                action: "lut-filter",
                parameters: { lut: "Cinematic", intensity: 100 },
              },
              {
                label: "🌅 Warm",
                action: "lut-filter",
                parameters: { lut: "Warm", intensity: 100 },
              },
              {
                label: "❄️ Cool",
                action: "lut-filter",
                parameters: { lut: "Cool", intensity: 100 },
              },
              {
                label: "📷 Vintage",
                action: "lut-filter",
                parameters: { lut: "Vintage", intensity: 100 },
              },
              {
                label: "⚡ Dramatic",
                action: "lut-filter",
                parameters: { lut: "Dramatic", intensity: 100 },
              },
            ];

            setChatMessages((p) => [
              ...p,
              {
                id: `msg-${Date.now()}-${Math.random()}`,
                type: "ai",
                content: `✅ ${lutType} filter applied at ${intensity}% intensity!`,
                timestamp: new Date().toISOString(),
                actions: quickActions,
              },
            ]);
          } catch (error) {
            clearInterval(progressInterval);
            setIsGeneratingVideo(false);
            setProcessingProgress(0);

            setChatMessages((p) => [
              ...p,
              {
                type: "ai",
                content: `❌ Failed to apply LUT filter: ${error.message}`,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
          break;
        }
        case "gaussian-blur":
        case "motion-blur": {
          // Handle blur button clicks
          const currentVideo = useVideoStore.getState().currentVideo;
          const applyEffect = useVideoStore.getState().applyGlobalEffect;

          if (!currentVideo?.id) {
            setChatMessages((p) => [
              ...p,
              {
                type: "ai",
                content: "❌ No video available to apply blur.",
                timestamp: new Date().toISOString(),
              },
            ]);
            break;
          }

          const params = action.parameters || {};
          const isGaussian = actionType === "gaussian-blur";

          console.log(
            `Applying ${isGaussian ? "Gaussian" : "Motion"} blur:`,
            params
          );

          setIsGeneratingVideo(true);
          setProcessingProgress(10);

          const progressInterval = setInterval(() => {
            setProcessingProgress((prev) => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90;
              }
              return prev + 10;
            });
          }, 300);

          try {
            const effectConfig = {
              id: isGaussian ? "gaussian-blur" : "motion-blur",
              name: isGaussian ? "Gaussian Blur" : "Motion Blur",
              type: "blur",
              parameters: params,
              timestamp: Date.now(),
            };

            await applyEffect(effectConfig);

            clearInterval(progressInterval);
            setProcessingProgress(100);

            setTimeout(() => {
              setIsGeneratingVideo(false);
              setProcessingProgress(0);
            }, 500);

            // Show confirmation with blur adjustment options
            const quickActions = [
              {
                label: "🔼 More Blur",
                action: actionType,
                parameters: isGaussian
                  ? { radius: (params.radius || 5) + 3 }
                  : {
                      angle: params.angle || 0,
                      strength: (params.strength || 10) + 5,
                    },
              },
              {
                label: "🔽 Less Blur",
                action: actionType,
                parameters: isGaussian
                  ? { radius: Math.max(1, (params.radius || 5) - 3) }
                  : {
                      angle: params.angle || 0,
                      strength: Math.max(1, (params.strength || 10) - 5),
                    },
              },
              {
                label: "🔄 Remove Blur",
                action: "reset",
                parameters: {},
              },
            ];

            const blurDetails = isGaussian
              ? `radius ${params.radius || 5}`
              : `angle ${params.angle || 0}° with strength ${
                  params.strength || 10
                }`;

            setChatMessages((p) => [
              ...p,
              {
                id: `msg-${Date.now()}-${Math.random()}`,
                type: "ai",
                content: `✅ ${
                  isGaussian ? "Gaussian" : "Motion"
                } blur applied (${blurDetails})!`,
                timestamp: new Date().toISOString(),
                actions: quickActions,
              },
            ]);
          } catch (error) {
            clearInterval(progressInterval);
            setIsGeneratingVideo(false);
            setProcessingProgress(0);

            setChatMessages((p) => [
              ...p,
              {
                type: "ai",
                content: `❌ Failed to apply blur: ${error.message}`,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
          break;
        }
        default:
          console.warn("Unknown action:", action);
      }
    } catch (e) {
      console.error(e);
      setChatMessages((p) => [
        ...p,
        {
          type: "ai",
          content: "⚠️ That action failed. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  /* -------------------------------
     Metadata extraction
  --------------------------------*/
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
          format: "video/mp4",
        });
      }
    });
  };

  /* -------------------------------
     Scroll chat to bottom
  --------------------------------*/
  // Connect to socket and listen for AI responses
  useEffect(() => {
    console.log("🔌 Setting up socket connection in AIEditor");
    console.log("Component mounted, setting up listeners...");

    socketService.connect();

    // Listen for AI responses - using socketService wrapper
    const handleAIResponse = (response) => {
      console.log("🎬 ===============================================");
      console.log("🎬 AI Response received in AIEditor handleAIResponse");
      console.log("🎬 ===============================================");
      console.log("Full response:", response);
      console.log("Intent:", response.intent);
      console.log("Intent action:", response.intent?.action);
      console.log("Intent parameters:", response.intent?.parameters);

      // Prevent duplicate processing of the same response
      if (response.id && processedResponseIds.current.has(response.id)) {
        console.log("⚠️ Duplicate response detected, skipping:", response.id);
        return;
      }
      if (response.id) {
        processedResponseIds.current.add(response.id);
      }

      // Don't show AI message if it's a brightness/contrast/blur/lut intent - we'll show confirmation after applying
      const isAutoApplyIntent =
        response.intent?.action === "brightness" ||
        response.intent?.action === "contrast" ||
        response.intent?.action === "gaussian-blur" ||
        response.intent?.action === "motion-blur" ||
        response.intent?.action === "lut-filter";

      if (!isAutoApplyIntent) {
        setChatMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content: response.message,
            timestamp: response.timestamp,
            actions: response.actions,
            tips: response.tips,
          },
        ]);
      }

      setIsChatLoading(false);
      setIsTyping(false);
      setIsGeneratingVideo(false);

      // Automatically apply brightness/contrast/blur/lut effects
      // Get fresh video ID from store, not from stale closure
      const applyEffect = useVideoStore.getState().applyGlobalEffect;
      const videoFromStore = useVideoStore.getState().currentVideo;
      const intentAction = response.intent?.action;

      if (
        (intentAction === "brightness" ||
          intentAction === "contrast" ||
          intentAction === "gaussian-blur" ||
          intentAction === "motion-blur" ||
          intentAction === "lut-filter" ||
          intentAction === "cross-dissolve" ||
          intentAction === "zoom-transition") &&
        videoFromStore?.id
      ) {
        const effectName =
          intentAction === "brightness"
            ? "brightness"
            : intentAction === "contrast"
            ? "contrast"
            : intentAction === "gaussian-blur"
            ? "Gaussian Blur"
            : intentAction === "motion-blur"
            ? "Motion Blur"
            : intentAction === "lut-filter"
            ? "LUT Filter"
            : intentAction === "cross-dissolve"
            ? "Cross Dissolve"
            : "Zoom Transition";
        console.log(
          `✅ ${effectName} intent detected! Auto-applying effect...`
        );
        console.log("Intent parameters:", response.intent.parameters);
        console.log("Current video in store:", videoFromStore);
        console.log("Calling applyGlobalEffect...");

        // Show processing state
        setIsGeneratingVideo(true);
        setProcessingProgress(10);

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setProcessingProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 300);

        // Determine effect configuration based on intent
        let effectConfig = {
          parameters: response.intent.parameters || {},
          timestamp: Date.now(),
        };

        if (intentAction === "brightness" || intentAction === "contrast") {
          effectConfig.id = "brightness";
          effectConfig.name = "Brightness/Contrast";
          effectConfig.type = "color";
        } else if (intentAction === "gaussian-blur") {
          effectConfig.id = "gaussian-blur";
          effectConfig.name = "Gaussian Blur";
          effectConfig.type = "blur";
        } else if (intentAction === "motion-blur") {
          effectConfig.id = "motion-blur";
          effectConfig.name = "Motion Blur";
          effectConfig.type = "blur";
        } else if (intentAction === "lut-filter") {
          effectConfig.id = "lut-filter";
          effectConfig.name = "LUT Filter";
          effectConfig.type = "color";
        } else if (intentAction === "cross-dissolve") {
          effectConfig.id = "cross-dissolve";
          effectConfig.name = "Cross Dissolve";
          effectConfig.type = "transition";
        } else if (intentAction === "zoom-transition") {
          effectConfig.id = "zoom-transition";
          effectConfig.name = "Zoom Transition";
          effectConfig.type = "transition";
        }

        applyEffect(effectConfig)
          .then((result) => {
            console.log("✅ Effect applied successfully! Result:", result);
            console.log("Updated video store:", videoFromStore);

            // Update current effect parameters for manual controls (brightness/contrast only)
            if (intentAction === "brightness" || intentAction === "contrast") {
              const params = response.intent.parameters;
              setCurrentEffectParams({
                brightness: params.brightness || 0,
                contrast: params.contrast || 0,
              });
            }

            // Complete progress and hide after a short delay
            clearInterval(progressInterval);
            setProcessingProgress(100);

            setTimeout(() => {
              setIsGeneratingVideo(false);
              setProcessingProgress(0);
            }, 500);

            // Show specific confirmation based on what was changed
            const params = response.intent.parameters;
            let confirmationMsg = "✅ Done! ";

            if (intentAction === "gaussian-blur") {
              confirmationMsg = `✅ Blur applied with radius ${
                params.radius || 5
              }!`;
            } else if (intentAction === "motion-blur") {
              confirmationMsg = `✅ Motion blur applied at ${
                params.angle || 0
              }° with strength ${params.strength || 10}!`;
            } else if (intentAction === "lut-filter") {
              const lutType = params.lutType || params.lut || "Cinematic";
              const intensity = params.intensity || 100;
              confirmationMsg = `✅ ${lutType} LUT filter applied at ${intensity}% intensity!`;
            } else if (intentAction === "cross-dissolve") {
              const duration = params.duration || 1;
              confirmationMsg = `✅ Cross dissolve transition applied (${duration}s)!`;
            } else if (intentAction === "zoom-transition") {
              const zoomType = params.zoomType || "Zoom In";
              const duration = params.duration || 1;
              confirmationMsg = `✅ Zoom transition applied (${zoomType}, ${duration}s)!`;
            } else {
              // Brightness/contrast
              if (params.brightness && params.brightness !== 0) {
                confirmationMsg += `Brightness ${
                  params.brightness > 0 ? "increased" : "decreased"
                }.`;
              }
              if (params.contrast && params.contrast !== 0) {
                if (params.brightness && params.brightness !== 0)
                  confirmationMsg += " ";
                confirmationMsg += `Contrast ${
                  params.contrast > 0 ? "increased" : "decreased"
                }.`;
              }
            }

            // Add interactive action buttons for quick adjustments
            let quickActions = [];
            if (intentAction === "brightness" || intentAction === "contrast") {
              quickActions = [
                {
                  label: "✨ Brighten More",
                  action: "adjust_brightness",
                  parameters: { brightness: 30, contrast: 0 },
                },
                {
                  label: "🌙 Darken",
                  action: "adjust_brightness",
                  parameters: { brightness: -30, contrast: 0 },
                },
                {
                  label: "📈 Increase Contrast",
                  action: "adjust_contrast",
                  parameters: { brightness: 0, contrast: 30 },
                },
                {
                  label: "📉 Decrease Contrast",
                  action: "adjust_contrast",
                  parameters: { brightness: 0, contrast: -30 },
                },
                {
                  label: "🔄 Reset to Original",
                  action: "reset",
                  parameters: { brightness: 0, contrast: 0 },
                },
              ];
            } else if (intentAction === "lut-filter") {
              // Show all LUT filter options
              quickActions = [
                {
                  label: "🎬 Cinematic",
                  action: "lut-filter",
                  parameters: { lut: "Cinematic", intensity: 100 },
                },
                {
                  label: "🌅 Warm",
                  action: "lut-filter",
                  parameters: { lut: "Warm", intensity: 100 },
                },
                {
                  label: "❄️ Cool",
                  action: "lut-filter",
                  parameters: { lut: "Cool", intensity: 100 },
                },
                {
                  label: "📷 Vintage",
                  action: "lut-filter",
                  parameters: { lut: "Vintage", intensity: 100 },
                },
                {
                  label: "⚡ Dramatic",
                  action: "lut-filter",
                  parameters: { lut: "Dramatic", intensity: 100 },
                },
              ];
            } else if (
              intentAction === "gaussian-blur" ||
              intentAction === "motion-blur"
            ) {
              // Show blur adjustment options
              quickActions = [
                {
                  label: "🔼 More Blur",
                  action: intentAction,
                  parameters:
                    intentAction === "gaussian-blur"
                      ? { radius: (params.radius || 5) + 3 }
                      : {
                          angle: params.angle || 0,
                          strength: (params.strength || 10) + 5,
                        },
                },
                {
                  label: "🔽 Less Blur",
                  action: intentAction,
                  parameters:
                    intentAction === "gaussian-blur"
                      ? { radius: Math.max(1, (params.radius || 5) - 3) }
                      : {
                          angle: params.angle || 0,
                          strength: Math.max(1, (params.strength || 10) - 5),
                        },
                },
                {
                  label: "🔄 Remove Blur",
                  action: "reset",
                  parameters: {},
                },
              ];
            }

            setChatMessages((prev) => [
              ...prev,
              {
                id: `msg-${Date.now()}-${Math.random()}`,
                type: "ai",
                content: confirmationMsg,
                timestamp: new Date().toISOString(),
                actions: quickActions,
              },
            ]);
          })
          .catch((error) => {
            console.error("❌ Error applying effect:", error);
            console.error("Error stack:", error.stack);

            // Hide processing state on error
            clearInterval(progressInterval);
            setIsGeneratingVideo(false);
            setProcessingProgress(0);

            setChatMessages((prev) => [
              ...prev,
              {
                type: "ai",
                content: `❌ Sorry, I couldn't apply the effect: ${error.message}`,
                timestamp: new Date().toISOString(),
              },
            ]);
          });
      } else {
        console.log(
          "⚠️ Brightness/contrast intent not detected or no video loaded"
        );
        console.log(
          "- Intent action matches 'brightness' or 'contrast'?",
          intentAction === "brightness" || intentAction === "contrast"
        );
        console.log("- Video ID exists?", !!videoFromStore?.id);
      }
    };

    // Register listeners using socketService wrapper
    console.log("🎯 Registering AI response listener in AIEditor");
    socketService.onAIResponse(handleAIResponse);

    // Listen for AI typing indicator
    socketService.onAITyping((data) => {
      setIsTyping(data.typing);
      setIsChatLoading(data.typing);
    });

    // Listen for chat errors
    socketService.onChatError((error) => {
      console.error("Chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content:
            error.error || "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsChatLoading(false);
      setIsTyping(false);
      setIsGeneratingVideo(false);
    });

    return () => {
      console.log("🔌 Cleaning up socket listeners in AIEditor");
      socketService.off("ai_response", handleAIResponse);
      socketService.off("ai_typing");
      socketService.off("chat_error");
    };
  }, []); // Only connect once on mount, don't reconnect when video changes

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatMessages, isChatLoading]);

  /* -------------------------------
     Watch for video updates from store (when effects are applied)
  --------------------------------*/
  useEffect(() => {
    if (!storeCurrentVideo || !uploadedVideo) return;

    const prevId = prevStoreVideoRef.current.id;
    const prevUrl = prevStoreVideoRef.current.url;
    const currentId = storeCurrentVideo.id;
    const currentUrl = storeCurrentVideo.url;

    // Check if ID or URL actually changed
    const idChanged = currentId !== prevId && currentId !== uploadedVideo.id;
    const urlChanged =
      currentUrl !== prevUrl && currentUrl !== uploadedVideo.url;

    if (idChanged || urlChanged) {
      console.log("=== Video Store Update Detected ===");
      console.log("Previous store values:", prevStoreVideoRef.current);
      console.log("Current store video:", storeCurrentVideo);
      console.log("Current uploadedVideo:", uploadedVideo);
      console.log("ID changed:", idChanged, `(${prevId} -> ${currentId})`);
      console.log("URL changed:", urlChanged);
      console.log("Old URL:", prevUrl);
      console.log("New URL:", currentUrl);

      // Update uploadedVideo with new data from store
      const updatedVideo = {
        ...uploadedVideo,
        id: currentId,
        url: currentUrl,
        streamUrl: currentUrl,
      };

      console.log("Setting uploadedVideo to:", updatedVideo);
      setUploadedVideo(updatedVideo);

      // Update ref for next comparison
      prevStoreVideoRef.current = { id: currentId, url: currentUrl };

      // Force video player to reload (though key prop should handle this)
      setTimeout(() => {
        if (videoRef.current) {
          console.log("Calling videoRef.current.load()");
          videoRef.current.load();
        }
      }, 100);
    }
  }, [storeCurrentVideo?.id, storeCurrentVideo?.url]); // Only watch for store changes

  /* -------------------------------
     Load from navigation + set AI context
  --------------------------------*/
  useEffect(() => {
    if (location.state?.video) {
      const video = location.state.video;
      console.log("=== AI Editor Video Loading Debug ===");
      console.log("Video data received:", video);
      console.log("Video URL:", video.url);
      console.log("Video streamUrl:", video.streamUrl);

      // Ensure we have a valid video URL
      if (!video.url && !video.streamUrl) {
        console.error("No valid video URL found in video data");
        return;
      }

      const videoUrl = video.url || video.streamUrl;
      console.log("Selected videoUrl:", videoUrl);

      // Ensure the URL is absolute with proper base URL
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      console.log("Base URL from env:", baseUrl);

      let fullUrl = videoUrl.startsWith("http")
        ? videoUrl
        : `${baseUrl}${videoUrl}`;

      console.log("Full URL before token:", fullUrl);

      // Add authentication token to the URL
      const token = localStorage.getItem("authToken");
      console.log("Auth token present:", !!token);

      if (token && fullUrl) {
        fullUrl = `${fullUrl}${
          fullUrl.includes("?") ? "&" : "?"
        }token=${token}`;
      }

      console.log("Final video URL with token:", fullUrl);
      console.log("=====================================");

      const processedVideo = {
        ...video,
        url: fullUrl,
        streamUrl: fullUrl,
      };

      setUploadedVideo(processedVideo);

      // IMPORTANT: Also set in videoStore so effects can be applied
      setCurrentVideo(processedVideo);
      console.log("Video set in videoStore:", processedVideo);

      // Initialize tracks with a clip
      setTracks([
        {
          id: "video-track-1",
          type: "video",
          name: "Main Video",
          clips: [
            {
              id: video.id,
              type: "video",
              url: fullUrl,
              start: 0,
              duration: video.duration || 0,
              selected: true,
              effects: [],
            },
          ],
        },
      ]);

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

            // ✅ Tell AIService what video/project it's operating on
            aiService.setContext({
              videoId: (savedProject && savedProject.id) || "local-video",
              videoLoaded: true,
              hasAudio: true,
              videoDuration: videoMetadata.duration,
            });
          } catch (error) {
            console.error("Failed to auto-save project:", error);
            // Fallback context if save failed (still lets AI run locally)
            aiService.setContext({
              videoId: "local-video",
              videoLoaded: true,
              hasAudio: true,
              videoDuration: videoMetadata.duration,
            });
          }

          // Only show welcome message once
          if (!hasShownWelcomeMessage.current) {
            hasShownWelcomeMessage.current = true;

            const videoName =
              video.name || video.title || newProjectName || "your video";

            setChatMessages((prev) => [
              ...prev,
              {
                type: "ai",
                content: `Great! I've analyzed your video "${videoName}" and automatically created a project for you. Here are the details:\n\n📹 **Video Information:**\n- Duration: ${Math.floor(
                  videoMetadata.duration / 60
                )}:${String(Math.floor(videoMetadata.duration % 60)).padStart(
                  2,
                  "0"
                )}\n- Resolution: ${
                  videoMetadata.resolution ||
                  videoMetadata.width + "x" + videoMetadata.height
                }\n- File Size: ${(
                  (videoMetadata.fileSize || video.size) /
                  (1024 * 1024)
                ).toFixed(
                  1
                )} MB\n\n✅ **Project Status:**\n- Automatically saved to Projects page\n- Ready for editing\n\nThe video has been added to your timeline with separate video and audio tracks. You can now start editing!`,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        })
        .catch((error) => {
          console.error("Error extracting video metadata:", error);
          setDuration(30);
          setProjectName(
            location.state.video.name?.replace(/\.[^/.]+$/, "") ||
              "Untitled Project"
          );
        });
    }
  }, [location.state]);

  /* -------------------------------
     Player controls
  --------------------------------*/
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

  /* -------------------------------
     SEND MESSAGE: now uses aiService locally,
     then optionally notifies your socket backend
  --------------------------------*/
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      type: "user",
      content: newMessage,
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatHistory((prev) => [...prev, newMessage]);
    setNewMessage("");
    setIsChatLoading(true);
    setIsTyping(true);

    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    try {
      // Use socket service to send message to backend
      socketService.sendChatMessage(
        newMessage,
        storeCurrentVideo?.id,
        "default-conversation",
        storeCurrentVideo?.filePath
      );

      // The response will come via socket event listener (set up in useEffect)
    } catch (error) {
      console.error("Error sending message:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content:
            "Sorry, I encountered an error while processing your message. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsChatLoading(false);
      setIsTyping(false);
      setIsGeneratingVideo(false);
    }
  };

  /* -------------------------------
     Perf monitor
  --------------------------------*/
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
      tracks,
      currentTime,
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
    <div
      className="ai-editor-page bg-background text-foreground flex flex-col overflow-x-hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
    >
      <style>{`
      @media (max-width: 640px) {
        .ai-editor-page input,
        .ai-editor-page textarea,
        .ai-editor-page select {
          font-size: 16px !important;
        }
      }
    `}</style>

      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 md:px-8">
        <div className="flex flex-1 overflow-visible md:overflow-hidden py-4 md:gap-6 gap-4 items-stretch flex-col md:flex-row">
          {/* Left: Video */}
          <div className="flex-1 flex flex-col w-full md:w-2/3">
            <div className="relative bg-black rounded-lg overflow-hidden shadow-elevation-2 mb-3 aspect-video md:aspect-auto md:h-[670px]">
              {uploadedVideo ? (
                <EnhancedVideoPlayer
                  key={uploadedVideo.url} // Force re-render when URL changes
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
                <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-10">
                  <div className="bg-card/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-primary/20 max-w-md mx-4">
                    {/* Animated spinner */}
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <div className="absolute inset-0 rounded-full border-4 border-primary/30"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
                      <div
                        className="absolute inset-2 rounded-full border-4 border-transparent border-t-primary/50 animate-spin"
                        style={{
                          animationDuration: "1.5s",
                          animationDirection: "reverse",
                        }}
                      ></div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-foreground mb-2">
                        Applying Effect
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Processing your video with AI magic...
                      </p>
                    </div>

                    {/* Progress bar */}
                    {processingProgress > 0 && (
                      <div className="w-full bg-border rounded-full h-2 mb-3 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${processingProgress}%` }}
                        ></div>
                      </div>
                    )}

                    {/* Status text */}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground animate-pulse">
                        This may take a few seconds...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile timeline is now integrated into the main timeline */}

          {/* Right: Sidebar Tabs */}
          <div className="bg-card border-2 border-border shadow-elevation-2 rounded-lg flex flex-col w-full md:w-1/3 md:h-[670px]">
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
                  className="flex-1 overflow-y-auto min-h-0 px-6 md:max-h-none max-h-[50vh]"
                  style={{ scrollbarWidth: "thin" }}
                >
                  <div className="space-y-6 pb-6">
                    {chatMessages.map((message, index) => (
                      <div
                        key={message.id || `msg-${index}`}
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
                            {new Date().toLocaleTimeString()}
                          </span>

                          {/* Render AI action buttons */}
                          {message.type === "ai" &&
                            Array.isArray(message.actions) &&
                            message.actions.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {message.actions.map((a, i) => (
                                  <button
                                    key={i}
                                    onClick={() => handleAIAction(a)}
                                    className="text-xs px-3 py-1.5 rounded border border-border bg-card hover:bg-muted transition"
                                  >
                                    {a.label}
                                  </button>
                                ))}
                              </div>
                            )}
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
                      className="flex-1 bg-background border-2 border-border rounded-lg px-5 pt-2 pb-3 text-base md:text-sm leading-[1.3] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground shadow-elevation-1 transition-all duration-200 resize-none min-h-[52px] max-h-[120px] overflow-hidden"
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
                      <Send className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Effects Tab */}
            {activeTab === "effects" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 md:max-h-none max-h-[60vh]">
                  <EffectsLibrary
                    className="w-full"
                    currentEffectParams={currentEffectParams}
                    onEffectParamsChange={setCurrentEffectParams}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Area */}
        <div className="w-full mb-4">
          {uploadedVideo ? (
            <div className="overflow-hidden w-full">
              <FrameStrip
                videoUrl={uploadedVideo.url}
                duration={duration || 30}
                currentTime={currentTime}
                onSeek={handleTimeChange}
                height={72}
                frames={Math.max(24, Math.min(80, Math.floor(duration || 60)))}
                isPlaying={isPlaying}
                autoScroll={false}
                stretchToFit
                isGenerating={isGeneratingVideo}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              Upload a video to see the timeline.
            </div>
          )}
        </div>

        {/* Global Toolbar */}
        <div className="w-full flex justify-center mt-4 md:mb-8 mb-4">
          <div
            className="
      bg-card/95 backdrop-blur border-2 border-border rounded-xl shadow-elevation-2
      w-full max-w-[680px] md:max-w-[1000px]
      px-3 py-3 md:px-4
      flex flex-col md:flex-row md:items-center md:justify-between
      gap-2 md:gap-3
      overflow-hidden
    "
          >
            {/* Left: Undo + Settings */}
            <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
              <button className="bg-card hover:bg-muted text-foreground px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 shadow-elevation-1 hover:shadow-elevation-2 border border-border w-full sm:w-auto">
                <RotateCcw className="w-4 h-4 mr-2 inline-block" />
                Undo
              </button>
              <button className="bg-card hover:bg-muted text-foreground px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 shadow-elevation-1 hover:shadow-elevation-2 border border-border w-full sm:w-auto">
                <Settings className="w-4 h-4 mr-2 inline-block" />
                Settings
              </button>
            </div>

            {/* Right: Project name + Save + Export */}
            <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3 w-full md:w-auto">
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="bg-card border-2 border-border rounded-lg px-4 py-2.5 text-base md:text-sm text-foreground placeholder-muted-foreground
          focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
          shadow-elevation-1 transition-all duration-200
          w-full md:w-64 min-w-0 flex-1
        "
              />
              <button
                onClick={saveProject}
                disabled={isSaving || !uploadedVideo}
                className={`
          rounded-lg font-medium transition-all duration-200
          shadow-elevation-1 hover:shadow-elevation-2
          px-4 md:px-6 py-2 md:py-2.5 text-xs md:text-sm
          w-full sm:w-auto
          ${
            isSaving || !uploadedVideo
              ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
              : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border border-green-500"
          }
        `}
              >
                <Save className="w-4 h-4 mr-2 inline-block" />
                {isSaving ? "Saving..." : "Save Project"}
              </button>
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 shadow-elevation-1 border border-blue-500 px-4 md:px-6 py-2 md:py-2.5 text-xs md:text-sm w-full sm:w-auto">
                <Download className="w-4 h-4 mr-2 inline-block" />
                Export Video
              </button>
            </div>
          </div>
        </div>
        {/* End Global Toolbar */}
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
