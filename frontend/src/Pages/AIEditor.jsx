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
import AutoEditStatus from "../components/AutoEditStatus";
import EnhancementLoadingScreen from "../components/EnhancementLoadingScreen";
import AppliedEffectsList from "../components/AppliedEffectsList";
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

  // Auto-enhancement loading state
  const [isWaitingForEnhancement, setIsWaitingForEnhancement] = useState(false);
  const [enhancementProgress, setEnhancementProgress] = useState(0);
  const [enhancementMessage, setEnhancementMessage] = useState("");

  // Track the original video before any effects are applied
  const [originalVideoBeforeEffects, setOriginalVideoBeforeEffects] =
    useState(null);

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

  // Track last applied effect for intensity adjustments
  const [lastAppliedEffect, setLastAppliedEffect] = useState(null);

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

      // If action has a 'command' property, treat it as a user message to be processed
      if (action.command && !action.kind && !action.action) {
        console.log(
          "🎯 Action is a command button, sending as message:",
          action.command
        );
        setIsProcessing(false);

        // Set the message and trigger send
        setNewMessage(action.command);
        // Use setTimeout to ensure state is updated before sending
        setTimeout(() => {
          handleSendMessage();
        }, 0);
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

            // Complete progress - loading screen will hide when new video loads
            clearInterval(progressInterval);
            setProcessingProgress(100);

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
            // Loading screen will auto-hide when new video loads

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
            // Loading screen will auto-hide when new video loads

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
        case "enhance-quality": {
          // Handle video quality enhancement
          const currentVideo = useVideoStore.getState().currentVideo;
          const applyEffect = useVideoStore.getState().applyGlobalEffect;

          if (!currentVideo?.id) {
            setChatMessages((p) => [
              ...p,
              {
                type: "ai",
                content: "❌ No video available to enhance quality.",
                timestamp: new Date().toISOString(),
              },
            ]);
            break;
          }

          const params = action.parameters || {};
          console.log("Applying quality enhancement:", params);

          setIsGeneratingVideo(true);
          setProcessingProgress(10);

          const progressInterval = setInterval(() => {
            setProcessingProgress((prev) => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90;
              }
              return prev + 5; // Slower progress for quality enhancement
            });
          }, 500);

          try {
            const effectConfig = {
              id: "enhance-quality",
              name: "Quality Enhancement",
              type: "enhancement",
              parameters: {
                upscale: params.upscale || false,
                denoise: params.denoise !== false, // default true
                sharpen: params.sharpen !== false, // default true
                targetResolution: params.targetResolution || null,
                ...params,
              },
              timestamp: Date.now(),
            };

            await applyEffect(effectConfig);

            clearInterval(progressInterval);
            setProcessingProgress(100);

            // Build description of what was done
            let enhancements = [];
            if (params.denoise !== false)
              enhancements.push("✨ Noise Reduction");
            if (params.sharpen !== false)
              enhancements.push("🔍 Enhanced Sharpness");
            enhancements.push("📊 Improved Contrast (+15%)");
            enhancements.push("🎨 Boosted Color Saturation (+20%)");
            if (params.upscale) enhancements.push("📐 Resolution Upscaling");
            if (params.targetResolution)
              enhancements.push(`🎯 Targeting ${params.targetResolution}`);

            const enhancementList = enhancements.join("\n• ");

            setChatMessages((p) => [
              ...p,
              {
                id: `msg-${Date.now()}-${Math.random()}`,
                type: "ai",
                content: `✅ **Video Quality Enhanced!**

Your video has been upgraded with the following improvements:
• ${enhancementList}

**What Changed:**
- **Clearer Details**: Sharper edges and text (50% stronger)
- **Cleaner Image**: Reduced video noise and grain
- **Better Colors**: 20% more vibrant and saturated
- **Enhanced Contrast**: 15% boost for better depth
- **Brighter Overall**: Subtle +2% brightness lift

💡 *Tip: Look at fine details like text, faces, or edges to see the difference!*`,
                timestamp: new Date().toISOString(),
                actions: [
                  {
                    label: "� Enhance Even More",
                    action: "enhance-quality",
                    parameters: { upscale: true },
                  },
                  {
                    label: "⚡ Make Brighter",
                    action: "brightness",
                    parameters: { brightness: 20 },
                  },
                ],
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
                content: `❌ Failed to enhance quality: ${error.message}`,
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

      // Don't show AI message if it's a brightness/contrast/blur/lut/caption intent - we'll show confirmation after applying
      const isAutoApplyIntent =
        response.intent?.action === "brightness" ||
        response.intent?.action === "contrast" ||
        response.intent?.action === "gaussian-blur" ||
        response.intent?.action === "motion-blur" ||
        response.intent?.action === "lut-filter" ||
        response.intent?.action === "caption" ||
        response.intent?.action === "enhance-quality" ||
        response.intent?.action === "remove-effect" ||
        response.intent?.action === "reset-video" ||
        response.intent?.action === "snow" ||
        response.intent?.action === "fire" ||
        response.intent?.action === "sparkles" ||
        response.intent?.action === "lens-flare";

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

      // Skip auto-apply for unavailable features
      if (intentAction === "unavailable") {
        console.log(
          "⚠️ Unavailable feature requested - skipping effect application"
        );
        // Just show the AI's message explaining it's not available
        return;
      }

      if (
        (intentAction === "brightness" ||
          intentAction === "contrast" ||
          intentAction === "gaussian-blur" ||
          intentAction === "motion-blur" ||
          intentAction === "lut-filter" ||
          intentAction === "cross-dissolve" ||
          intentAction === "zoom-transition" ||
          intentAction === "caption" ||
          intentAction === "enhance-quality" ||
          intentAction === "remove-effect" ||
          intentAction === "reset-video" ||
          intentAction === "snow" ||
          intentAction === "fire" ||
          intentAction === "sparkles" ||
          intentAction === "lens-flare") &&
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
            : intentAction === "zoom-transition"
            ? "Zoom Transition"
            : intentAction === "enhance-quality"
            ? "Quality Enhancement"
            : intentAction === "remove-effect"
            ? "Remove Effect"
            : intentAction === "reset-video"
            ? "Reset Video"
            : intentAction === "snow"
            ? "Snow Effect"
            : intentAction === "fire"
            ? "Fire Effect"
            : intentAction === "sparkles"
            ? "Sparkles Effect"
            : intentAction === "lens-flare"
            ? "Lens Flare"
            : "Captions";
        console.log(
          `✅ ${effectName} intent detected! Auto-applying effect...`
        );
        console.log("Intent parameters:", response.intent.parameters);
        console.log("Current video in store:", videoFromStore);
        console.log("Calling applyGlobalEffect...");

        // Show processing state (but not for remove/reset operations)
        if (
          intentAction !== "remove-effect" &&
          intentAction !== "reset-video"
        ) {
          setIsGeneratingVideo(true);
          setProcessingProgress(10);

          // Simulate progress updates
          var progressInterval = setInterval(() => {
            setProcessingProgress((prev) => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90;
              }
              return prev + 10;
            });
          }, 300);
        }

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
        } else if (intentAction === "caption") {
          effectConfig.id = "caption";
          effectConfig.name = "Captions";
          effectConfig.type = "caption";
        } else if (intentAction === "enhance-quality") {
          effectConfig.id = "enhance-quality";
          effectConfig.name = "Quality Enhancement";
          effectConfig.type = "enhancement";
        } else if (intentAction === "snow") {
          effectConfig.id = "snow";
          effectConfig.name = "Snow Effect";
          effectConfig.type = "particle";
        } else if (intentAction === "fire") {
          effectConfig.id = "fire";
          effectConfig.name = "Fire Effect";
          effectConfig.type = "particle";
        } else if (intentAction === "sparkles") {
          effectConfig.id = "sparkles";
          effectConfig.name = "Sparkles Effect";
          effectConfig.type = "particle";
        } else if (intentAction === "lens-flare") {
          effectConfig.id = "lens-flare";
          effectConfig.name = "Lens Flare";
          effectConfig.type = "lighting";
        } else if (intentAction === "remove-effect") {
          // Handle remove effect request
          const effectType = response.intent.parameters?.effectType || "last";
          const appliedEffects = videoFromStore.appliedEffects || [];

          console.log("🔍 Remove effect debug:");
          console.log("  - videoFromStore:", videoFromStore);
          console.log("  - appliedEffects:", appliedEffects);
          console.log("  - appliedEffects.length:", appliedEffects.length);

          if (appliedEffects.length === 0) {
            setChatMessages((p) => [
              ...p,
              {
                type: "ai",
                content:
                  "❌ No effects have been applied yet. Your video is already in its original state.",
                timestamp: new Date().toISOString(),
              },
            ]);
            return;
          }

          // Check if no effects match
          if (effectType === "none") {
            const effectsList = appliedEffects
              .map((e, i) => `${i + 1}. ${e.effect || e.id || e.type}`)
              .join("\n");
            setChatMessages((p) => [
              ...p,
              {
                type: "ai",
                content: `❌ I couldn't find that effect in your video. Currently applied effects:\n${effectsList}\n\nTry specifying one of these effects, or say "remove last effect".`,
                timestamp: new Date().toISOString(),
              },
            ]);
            return;
          }

          // Find the effect to remove
          let indexToRemove = -1;
          if (effectType === "last" || effectType === "all") {
            indexToRemove = appliedEffects.length - 1; // Remove last effect
          } else {
            // Find by exact match first
            for (let i = appliedEffects.length - 1; i >= 0; i--) {
              const effect = appliedEffects[i];
              const effectName = effect.effect || effect.id || effect.type;
              console.log(
                `🔍 Checking effect ${i}: ${effectName} vs ${effectType}`
              );
              if (effectName === effectType) {
                indexToRemove = i;
                console.log(`✅ Found exact match at index ${i}`);
                break;
              }
            }
            // If no exact match, try partial match
            if (indexToRemove === -1) {
              console.log(`⚠️ No exact match, trying partial match...`);
              for (let i = appliedEffects.length - 1; i >= 0; i--) {
                const effect = appliedEffects[i];
                const effectName = effect.effect || effect.id || effect.type;
                if (
                  effectName?.includes(effectType) ||
                  effectType?.includes(effectName)
                ) {
                  indexToRemove = i;
                  console.log(
                    `✅ Found partial match at index ${i}: ${effectName}`
                  );
                  break;
                }
              }
            }
          }

          console.log(
            `📊 Final indexToRemove: ${indexToRemove}, total effects: ${appliedEffects.length}`
          );

          if (indexToRemove >= 0) {
            const effectToRemove = appliedEffects[indexToRemove];
            const effectName =
              effectToRemove.effect || effectToRemove.id || effectToRemove.type;

            console.log(
              `🗑️ Calling handleRemoveEffect with index ${indexToRemove}: ${effectName}`
            );
            console.log(`📋 Applied effects before removal:`, appliedEffects);
            handleRemoveEffect(indexToRemove, effectName);
          } else {
            const effectsList = appliedEffects
              .map((e, i) => `${i + 1}. ${e.effect || e.id || e.type}`)
              .join("\n");
            setChatMessages((p) => [
              ...p,
              {
                type: "ai",
                content: `❌ Couldn't find "${effectType}" effect. Currently applied effects:\n${effectsList}\n\nTry saying "remove [effect name]" or "remove last effect".`,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
          return; // Don't continue to applyEffect
        } else if (intentAction === "reset-video") {
          // Reset to original video by removing all effects
          const appliedEffects = videoFromStore.appliedEffects || [];

          if (appliedEffects.length === 0) {
            setChatMessages((p) => [
              ...p,
              {
                type: "ai",
                content:
                  "✅ Your video is already in its original state with no effects applied.",
                timestamp: new Date().toISOString(),
              },
            ]);
            return;
          }

          // Remove all effects by going back to the original
          setChatMessages((p) => [
            ...p,
            {
              type: "ai",
              content: `🔄 Resetting video to original state... Removing ${appliedEffects.length} effect(s).`,
              timestamp: new Date().toISOString(),
            },
          ]);

          // Remove the last effect, which will trigger recursion to remove all
          handleRemoveEffect(
            appliedEffects.length - 1,
            appliedEffects[appliedEffects.length - 1].effect ||
              appliedEffects[appliedEffects.length - 1].id
          );
          return; // Don't continue to applyEffect
        }

        applyEffect(effectConfig)
          .then((result) => {
            console.log("✅ Effect applied successfully! Result:", result);
            console.log("Updated video store:", videoFromStore);

            // Track last applied effect for intensity adjustments
            setLastAppliedEffect({
              effect: intentAction,
              parameters: response.intent.parameters,
              timestamp: new Date().toISOString(),
            });

            // Update current effect parameters for manual controls (brightness/contrast only)
            if (intentAction === "brightness" || intentAction === "contrast") {
              const params = response.intent.parameters;
              setCurrentEffectParams({
                brightness: params.brightness || 0,
                contrast: params.contrast || 0,
              });
            }

            // Complete progress - but keep loading screen visible
            // It will be hidden when the new video actually loads (see useEffect above)
            clearInterval(progressInterval);
            setProcessingProgress(100);

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
            } else if (intentAction === "caption") {
              const captionCount = params.captionCount || "auto-generated";
              confirmationMsg = `✅ Captions generated and applied! (${captionCount} segments)`;
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
              const currentLut = params.lutType || params.lut || "Cinematic";
              const currentIntensity = params.intensity || 100;

              // Show all LUT filter options
              quickActions = [
                {
                  label: "🎬 Cinematic",
                  action: "lut-filter",
                  parameters: { lut: "Cinematic", intensity: currentIntensity },
                },
                {
                  label: "🌅 Warm",
                  action: "lut-filter",
                  parameters: { lut: "Warm", intensity: currentIntensity },
                },
                {
                  label: "❄️ Cool",
                  action: "lut-filter",
                  parameters: { lut: "Cool", intensity: currentIntensity },
                },
                {
                  label: "📷 Vintage",
                  action: "lut-filter",
                  parameters: { lut: "Vintage", intensity: currentIntensity },
                },
                {
                  label: "⚡ Dramatic",
                  action: "lut-filter",
                  parameters: { lut: "Dramatic", intensity: currentIntensity },
                },
              ];

              // Add intensity adjustment buttons if current intensity is not 0
              if (currentIntensity > 0) {
                quickActions.push({
                  label: "🔽 Lower Intensity (50%)",
                  action: "lut-filter",
                  parameters: { lut: currentLut, intensity: 50 },
                });
                quickActions.push({
                  label: "📉 Subtle (25%)",
                  action: "lut-filter",
                  parameters: { lut: currentLut, intensity: 25 },
                });
              }

              // Add "Full Strength" button if not already at 100%
              if (currentIntensity < 100) {
                quickActions.push({
                  label: "🔼 Full Strength (100%)",
                  action: "lut-filter",
                  parameters: { lut: currentLut, intensity: 100 },
                });
              }
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

    // Listen for auto-edit completion
    socketService.on("video_auto_edit_complete", (data) => {
      console.log("🎨 Auto-edit complete! Received enhanced video:", data);

      const { enhancedVideo, analysis, appliedEdits, summary } = data;

      // Debug: Log the received URL
      console.log("📋 Received enhancedVideo.url:", enhancedVideo.url);
      console.log(
        "📋 Received enhancedVideo.streamUrl:",
        enhancedVideo.streamUrl
      );

      // Add authentication token to the URLs
      const token = localStorage.getItem("authToken");
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

      // Check if URL is already absolute
      let enhancedUrl = enhancedVideo.url;

      // Only prepend base URL if the URL is relative (starts with /)
      if (!enhancedUrl.startsWith("http")) {
        enhancedUrl = `${baseUrl}${enhancedUrl}`;
      }

      // Add authentication token
      if (token) {
        enhancedUrl = `${enhancedUrl}${
          enhancedUrl.includes("?") ? "&" : "?"
        }token=${token}`;
      }

      console.log("📋 Final enhanced video URL:", enhancedUrl);
      console.log(
        "📋 Enhanced video filePath from backend:",
        enhancedVideo.filePath
      );

      // Convert appliedEdits to appliedEffects format
      // Backend sends recommendedEdits array with type, parameters, description
      const autoEnhancementEffects = (appliedEdits || []).map(
        (edit, index) => ({
          id: `auto-${Date.now()}-${index}`,
          effect: edit.type || "enhancement",
          type: edit.type || "enhancement",
          parameters: edit.parameters || {},
          timestamp: new Date().toISOString(),
          description:
            edit.description || edit.name || edit.type || "Auto enhancement",
          source: "auto-enhancement", // Track where this effect came from
        })
      );

      console.log(
        "📋 Converted auto-enhancement effects:",
        autoEnhancementEffects
      );

      const processedEnhancedVideo = {
        ...enhancedVideo,
        url: enhancedUrl,
        streamUrl: enhancedUrl,
        // Use backend's appliedEffects if available, otherwise use our converted ones
        appliedEffects: enhancedVideo.appliedEffects || autoEnhancementEffects,
        aiEnhancements: [
          {
            type: "auto-edit-analysis",
            analysis,
            recommendedEdits: appliedEdits,
          },
          {
            type: "auto-edited-version",
            summary,
            appliedEdits,
          },
        ],
      };

      // Hide loading screen
      setIsWaitingForEnhancement(false);
      setEnhancementProgress(100);

      // Switch to the enhanced video
      console.log("📽️ Switching to enhanced video:", processedEnhancedVideo);
      console.log(
        "📋 Enhanced video filePath:",
        processedEnhancedVideo.filePath
      );
      console.log(
        "📋 Applied auto-enhancement effects:",
        autoEnhancementEffects
      );
      console.log("📋 uploadedVideo before update:", uploadedVideo);

      // Save the CURRENT video as the original before applying enhancements
      // (if not already saved)
      if (!originalVideoBeforeEffects) {
        console.log(
          "💾 Saving original video before auto-enhancement:",
          uploadedVideo
        );
        setOriginalVideoBeforeEffects(uploadedVideo);
      }

      setUploadedVideo(processedEnhancedVideo);
      setCurrentVideo(processedEnhancedVideo);

      console.log("✅ Video state updated with appliedEffects");
      console.log("🔍 Verify currentVideo in store after update:");
      setTimeout(() => {
        const storeVideo = useVideoStore.getState().currentVideo;
        console.log(
          "  - Store currentVideo.appliedEffects:",
          storeVideo?.appliedEffects
        );
        console.log(
          "  - Number of effects:",
          storeVideo?.appliedEffects?.length || 0
        );
      }, 100);

      // Show notification in chat
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: `✨ **AI Enhancement Complete!**\n\n${summary}\n\nYou're now viewing the enhanced version. You can add more effects on top, or switch back to the original using the version switcher above.`,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Force video player reload with a slight delay
      setTimeout(() => {
        if (videoRef.current) {
          console.log("🔄 Forcing video reload...");
          console.log("📋 Video element src:", videoRef.current.src);
          videoRef.current.load();
          console.log("✅ Video reload initiated");
        } else {
          console.warn("⚠️ videoRef.current is null, cannot reload video");
        }
      }, 150);
    });

    // Listen for video operation completion (for text-to-video and other operations)
    socketService.on("video_operation_complete", async (data) => {
      console.log("🎬 Video operation complete:", data);
      console.log("🎬 Operation result:", data.result);
      console.log("🎬 Is update operation:", data.result?.isUpdate);

      const { operation, result, videoId } = data;

      if (result?.success && result?.outputPath) {
        // Update the video with the new processed version
        const token = localStorage.getItem("authToken");
        const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

        // Check if this is an update to existing video or a new video
        const isUpdateOperation = result.isUpdate === true;
        const targetVideoId = isUpdateOperation
          ? uploadedVideo?.id || result.videoId || videoId // Keep current video ID for updates
          : result.videoId || videoId; // Use new video ID for new videos

        console.log(
          "🎬 Target video ID:",
          targetVideoId,
          isUpdateOperation ? "(update)" : "(new)"
        );

        // Create the video URL with cache buster for updates
        let videoUrl = `${baseUrl}/api/videos/${targetVideoId}/stream`;
        if (token) {
          videoUrl = `${videoUrl}?token=${token}`;
        }

        // Add cache buster for update operations to force reload
        if (isUpdateOperation) {
          videoUrl = `${videoUrl}&t=${Date.now()}`;
        }

        console.log("🎬 Video URL:", videoUrl);

        // Use appliedEffects from the result (backend already includes all old + new effects)
        const appliedEffects = result.appliedEffects || [
          ...(uploadedVideo?.appliedEffects || []),
          {
            effect: operation,
            parameters: result.parameters || {},
            timestamp: new Date().toISOString(),
          },
        ];

        console.log("🎬 Applied effects count:", appliedEffects.length);

        // Update the video
        const updatedVideo = {
          ...uploadedVideo,
          id: targetVideoId,
          url: videoUrl,
          streamUrl: videoUrl,
          filePath: result.outputPath,
          appliedEffects: appliedEffects,
          duration: result.trimmedDuration || uploadedVideo?.duration,
        };

        console.log("🎬 Updated video object:", updatedVideo);

        setUploadedVideo(updatedVideo);
        setCurrentVideo(updatedVideo);

        // Reload video player with slight delay
        setTimeout(() => {
          if (videoRef.current) {
            console.log("🔄 Reloading video after operation...");
            console.log("🔄 Video src:", videoRef.current.src);
            videoRef.current.load();
          } else {
            console.warn("⚠️ videoRef.current is null!");
          }
        }, 150);
      }
    });

    // Listen for video processing progress
    socketService.on("video_processing", (data) => {
      console.log("📊 Video processing update:", data);

      const { status, progress, message, analysis, isAutoEnhancement } = data;

      setIsProcessing(status === "processing");
      setProcessingProgress(progress || 0);

      // Show the "Applying Effect" modal for all video operations
      if (status === "processing") {
        setIsGeneratingVideo(true);
      } else if (status === "ready" || status === "failed") {
        setIsGeneratingVideo(false);
      }

      // Update enhancement loading state ONLY for auto-enhancement events
      if (isAutoEnhancement) {
        // Clear the loading timeout since we received a socket event
        if (window.enhancementLoadingTimeout) {
          console.log(
            "✅ Clearing enhancement loading timeout - socket event received"
          );
          clearTimeout(window.enhancementLoadingTimeout);
          window.enhancementLoadingTimeout = null;
        }

        if (status === "processing" && progress > 0) {
          setIsWaitingForEnhancement(true);
          setEnhancementProgress(progress);
          setEnhancementMessage(message || "Processing...");
        } else if (status === "ready" || status === "failed") {
          setIsWaitingForEnhancement(false);
        }
      }

      // Show progress updates in chat
      if (message && progress > 0 && progress < 100) {
        // Update the last AI message or add new one
        setChatMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.type === "ai" && lastMessage?.isProcessing) {
            // Update existing processing message
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: `⏳ ${message} (${Math.round(progress)}%)`,
                timestamp: new Date().toISOString(),
              },
            ];
          } else {
            // Add new processing message
            return [
              ...prev,
              {
                type: "ai",
                content: `⏳ ${message} (${Math.round(progress)}%)`,
                timestamp: new Date().toISOString(),
                isProcessing: true,
              },
            ];
          }
        });
      }
    });

    return () => {
      console.log("🔌 Cleaning up socket listeners in AIEditor");

      // Clear enhancement loading timeout if it exists
      if (window.enhancementLoadingTimeout) {
        console.log("🧹 Clearing enhancement loading timeout on unmount");
        clearTimeout(window.enhancementLoadingTimeout);
        window.enhancementLoadingTimeout = null;
      }

      socketService.off("ai_response", handleAIResponse);
      socketService.off("ai_typing");
      socketService.off("chat_error");
      socketService.off("video_operation_complete");
      socketService.off("video_auto_edit_complete");
      socketService.off("video_processing");
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

      // Hide loading screen when new video is loaded (effect has been applied)
      if (isGeneratingVideo) {
        console.log("🎬 New video loaded - hiding generation loading screen");
        setTimeout(() => {
          setIsGeneratingVideo(false);
          setProcessingProgress(0);
        }, 500); // Small delay to ensure video actually loads
      }

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

      // Save as the original video before any effects
      if (!originalVideoBeforeEffects) {
        console.log("💾 Saving original video before effects:", processedVideo);
        setOriginalVideoBeforeEffects(processedVideo);
      }

      // IMPORTANT: Also set in videoStore so effects can be applied
      setCurrentVideo(processedVideo);
      console.log("Video set in videoStore:", processedVideo);

      // Show processing notification if video was just uploaded
      if (location.state?.fromDashboard && !hasShownWelcomeMessage.current) {
        // Show loading screen
        setIsWaitingForEnhancement(true);
        setEnhancementProgress(0);
        setEnhancementMessage("Analyzing your video...");

        setChatMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content:
              "🎬 Video loaded! AI is analyzing your video in the background to create automatic enhancements. You'll see a notification when it's ready!",
            timestamp: new Date().toISOString(),
            isProcessing: true,
          },
        ]);
        hasShownWelcomeMessage.current = true;

        // Safety timeout: Hide loading screen if no socket events received within 10 seconds
        // This prevents the UI from being stuck if processing completes before socket connection
        // or if there's an error in the backend processing
        const loadingTimeout = setTimeout(() => {
          console.log("⏰ Loading screen timeout - hiding enhancement loading");
          setIsWaitingForEnhancement(false);
          setEnhancementProgress(0);

          // Add a message to chat explaining the situation
          setChatMessages((prev) => [
            ...prev,
            {
              type: "ai",
              content:
                "Your video is ready to edit! If automatic enhancements are enabled, they will appear in the chat when ready. You can start editing manually in the meantime.",
              timestamp: new Date().toISOString(),
            },
          ]);
        }, 10000); // 10 second timeout

        // Store timeout ID so we can clear it if socket events are received
        window.enhancementLoadingTimeout = loadingTimeout;
      }

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
            thumbnail: video.thumbnailUrl || video.thumbnail || null,
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
            thumbnail: video.thumbnailUrl || video.thumbnail || null,
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
     APPLIED EFFECTS HANDLERS
  --------------------------------*/
  // Helper function to get user-friendly effect names
  const getEffectDisplayName = (effect) => {
    const names = {
      "lut-filter": "Color Grading",
      "gaussian-blur": "Blur",
      "motion-blur": "Motion Blur",
      brightness: "Brightness/Contrast",
      caption: "Captions",
      "cross-dissolve": "Fade Transition",
      "zoom-transition": "Zoom Effect",
      "audio-enhancement": "Audio Enhancement",
      trim: "Trim",
      crop: "Crop",
    };
    return names[effect] || effect;
  };

  const handleRemoveEffect = async (index, effectType) => {
    console.log("🔴 handleRemoveEffect called with:", { index, effectType });

    // Get FRESH video from store (not stale closure)
    const freshVideo = useVideoStore.getState().currentVideo;

    if (!freshVideo) {
      console.error("❌ No currentVideo found in store");
      return;
    }

    try {
      // Show loading animation on video preview
      setIsGeneratingVideo(true);
      setIsProcessing(true);
      setProcessingProgress(10);

      console.log("🗑️ Removing effect at index:", index);
      console.log("📋 Fresh video from store:", freshVideo.id);
      console.log("📋 Current appliedEffects:", freshVideo.appliedEffects);

      const currentEffects = freshVideo.appliedEffects || [];
      const newEffects = currentEffects.filter((_, i) => i !== index);

      console.log("📋 Remaining effects after removal:", newEffects);

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication required");
      }

      setProcessingProgress(30);

      // Find the original video - either from our saved reference or by traversing parent chain
      let originalVideo = originalVideoBeforeEffects;

      if (!originalVideo) {
        console.log(
          "⚠️ originalVideoBeforeEffects not found, traversing parent chain..."
        );

        // Try to find original by following parentVideoId chain
        originalVideo = storeCurrentVideo;
        const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

        while (originalVideo && originalVideo.parentVideoId) {
          try {
            console.log(
              "🔍 Fetching parent video:",
              originalVideo.parentVideoId
            );
            const parentResponse = await fetch(
              `${baseUrl}/api/videos/${originalVideo.parentVideoId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            if (!parentResponse.ok) {
              console.error(
                "❌ Parent video fetch failed:",
                parentResponse.status
              );
              break;
            }
            const parentData = await parentResponse.json();
            console.log("📦 Parent video response:", parentData);

            // Extract video from response (API returns { success: true, data: { video } })
            const parentVideo =
              parentData.data?.video || parentData.video || parentData;

            // Construct proper URL for parent video
            const parentVideoId = parentVideo._id || parentVideo.id;

            // Check if filePath is an absolute file system path
            let videoPath;
            if (
              parentVideo.filePath &&
              (parentVideo.filePath.includes(":\\") || // Windows absolute path
                (parentVideo.filePath.startsWith("/") &&
                  parentVideo.filePath.includes("backend")))
            ) {
              // It's an absolute file path, use stream endpoint
              videoPath = `/api/videos/${parentVideoId}/stream`;
            } else {
              // It's already a relative path or URL
              videoPath =
                parentVideo.filePath ||
                parentVideo.path ||
                `/api/videos/${parentVideoId}/stream`;
            }

            let videoUrl = videoPath.startsWith("http")
              ? videoPath
              : `${baseUrl}${videoPath}`;
            if (token) {
              videoUrl = `${videoUrl}${
                videoUrl.includes("?") ? "&" : "?"
              }token=${token}`;
            }

            originalVideo = {
              ...parentVideo,
              id: parentVideoId,
              url: videoUrl,
              streamUrl: videoUrl,
            };

            console.log("✅ Moved to parent video:", originalVideo.id);
          } catch (err) {
            console.error("❌ Error fetching parent video:", err);
            break;
          }
        }

        // Save it for future use
        if (originalVideo && originalVideo.id !== storeCurrentVideo.id) {
          console.log("💾 Saving found original video:", originalVideo);
          setOriginalVideoBeforeEffects(originalVideo);
        }
      }

      if (!originalVideo || !originalVideo.id) {
        throw new Error(
          "Could not find original video. Please reload the page."
        );
      }

      console.log("✅ Using original video:", originalVideo);

      // If no effects remain, load the original video
      if (newEffects.length === 0) {
        console.log("✅ No effects remaining - loading original video");

        setProcessingProgress(80);

        // Construct proper video URL
        const token = localStorage.getItem("authToken");
        const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

        // Extract video ID
        const videoId = originalVideo._id || originalVideo.id;

        // Construct video URL with auth token
        let videoPath;
        const filePath = originalVideo.filePath || originalVideo.path;

        // Check if filePath is an absolute file system path
        if (
          filePath &&
          (filePath.includes(":\\") ||
            (filePath.startsWith("/") && filePath.includes("backend")))
        ) {
          // Absolute path detected - use stream endpoint
          videoPath = `/api/videos/${videoId}/stream`;
        } else if (filePath) {
          // Relative path - use as-is
          videoPath = filePath;
        } else {
          // No path - construct default stream endpoint
          videoPath = `/api/videos/${videoId}/stream`;
        }

        let originalUrl = videoPath.startsWith("http")
          ? videoPath
          : `${baseUrl}${videoPath}`;
        if (token) {
          originalUrl = `${originalUrl}${
            originalUrl.includes("?") ? "&" : "?"
          }token=${token}`;
        }
        originalUrl = `${originalUrl}&t=${Date.now()}`; // Cache-busting

        // Load original video with cleared effects
        const updatedOriginalVideo = {
          ...originalVideo,
          id: videoId,
          _id: videoId,
          url: originalUrl,
          streamUrl: originalUrl,
          appliedEffects: [],
        };

        console.log("🎥 Setting original video after removing all effects:", {
          id: updatedOriginalVideo.id,
          url: updatedOriginalVideo.url,
          appliedEffects: updatedOriginalVideo.appliedEffects,
        });

        setCurrentVideo(updatedOriginalVideo);
        setUploadedVideo(updatedOriginalVideo);

        // Force video reload by clearing and resetting
        if (videoRef.current) {
          videoRef.current.load();
        }

        setProcessingProgress(100);

        setChatMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content: `✅ Removed ${getEffectDisplayName(
              effectType
            )} effect. Video restored to original state.`,
            timestamp: new Date().toISOString(),
          },
        ]);

        // Hide loading animation
        setTimeout(() => {
          setIsGeneratingVideo(false);
          setIsProcessing(false);
          setProcessingProgress(0);
        }, 500);

        return;
      }

      // If effects remain, we need to re-apply them to the original video
      console.log("🔄 Re-applying remaining effects to original video");

      setProcessingProgress(40);

      let currentVideoId = originalVideo.id;
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

      // Re-apply each remaining effect in sequence
      for (let i = 0; i < newEffects.length; i++) {
        const effect = newEffects[i];
        const progress = 40 + ((i + 1) / newEffects.length) * 50; // 40-90%
        setProcessingProgress(progress);

        console.log(
          `📤 Applying effect ${i + 1}/${newEffects.length}:`,
          effect
        );

        const response = await fetch(
          `${baseUrl}/api/video-edit/${currentVideoId}/effect`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              effect: effect.effect || effect.type,
              parameters: effect.parameters || {},
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to apply effect");
        }

        const result = await response.json();
        console.log(`📦 Remove effect - Effect ${i + 1} response:`, result);
        console.log(
          "📦 Remove effect - Current video ID before update:",
          currentVideoId
        );

        currentVideoId =
          result.data?.effectVideo || result.data?.id || currentVideoId;

        console.log(
          "📦 Remove effect - Current video ID after update:",
          currentVideoId
        );
      }

      setProcessingProgress(90);

      // Load the final video with all remaining effects
      console.log(
        "📦 Remove effect - Final video ID to fetch:",
        currentVideoId
      );
      const finalResponse = await fetch(
        `${baseUrl}/api/videos/${currentVideoId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const finalResponseData = await finalResponse.json();

      // Extract video from API response structure
      const finalVideo =
        finalResponseData.data?.video ||
        finalResponseData.video ||
        finalResponseData;

      console.log("✅ Final video loaded:", finalVideo);

      // Construct video URL with auth token
      const videoId = finalVideo._id || finalVideo.id;

      // Check if filePath is an absolute file system path (not a URL path)
      // If it's an absolute path, use the stream endpoint instead
      let videoPath;
      if (
        finalVideo.filePath &&
        (finalVideo.filePath.includes(":\\") || // Windows absolute path (C:\)
          (finalVideo.filePath.startsWith("/") &&
            finalVideo.filePath.includes("backend")))
      ) {
        // Unix absolute path
        // It's an absolute file path, use stream endpoint
        videoPath = `/api/videos/${videoId}/stream`;
      } else {
        // It's already a relative path or URL
        videoPath =
          finalVideo.filePath ||
          finalVideo.path ||
          `/api/videos/${videoId}/stream`;
      }

      let videoUrl = videoPath.startsWith("http")
        ? videoPath
        : `${baseUrl}${videoPath}`;
      if (token) {
        videoUrl = `${videoUrl}${
          videoUrl.includes("?") ? "&" : "?"
        }token=${token}`;
      }

      // Add cache-busting timestamp to force reload
      videoUrl = `${videoUrl}&t=${Date.now()}`;

      const updatedFinalVideo = {
        ...finalVideo,
        id: videoId,
        url: videoUrl,
        streamUrl: videoUrl,
        appliedEffects: newEffects,
      };

      console.log("🎥 Setting final video after removing effect:", {
        id: updatedFinalVideo.id,
        url: updatedFinalVideo.url,
        appliedEffects: updatedFinalVideo.appliedEffects,
      });

      setCurrentVideo(updatedFinalVideo);
      setUploadedVideo(updatedFinalVideo);

      // Force video reload by clearing and resetting
      if (videoRef.current) {
        videoRef.current.load();
      }

      setProcessingProgress(100);

      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: `✅ Removed ${getEffectDisplayName(effectType)} effect. ${
            newEffects.length
          } effect(s) remaining.`,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Hide loading animation
      setTimeout(() => {
        setIsGeneratingVideo(false);
        setIsProcessing(false);
        setProcessingProgress(0);
      }, 500);
    } catch (error) {
      console.error("Error removing effect:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: `❌ Failed to remove effect: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsGeneratingVideo(false);
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const handleEditEffect = async (index, effectType, newParameters) => {
    console.log("🔵 handleEditEffect called with:", {
      index,
      effectType,
      newParameters,
    });

    if (!storeCurrentVideo) {
      console.error("❌ No storeCurrentVideo found");
      return;
    }

    try {
      // Show loading animation on video preview
      setIsGeneratingVideo(true);
      setIsProcessing(true);
      setProcessingProgress(10);

      console.log("✏️ Editing effect at index:", index);
      console.log("📋 New parameters:", newParameters);

      const effects = storeCurrentVideo.appliedEffects || [];
      const updatedEffects = [...effects];
      updatedEffects[index] = {
        ...updatedEffects[index],
        parameters: newParameters,
      };

      console.log("📋 Updated effects:", updatedEffects);

      setProcessingProgress(20);

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication required");
      }

      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

      // Find the original video - either from our saved reference or by traversing parent chain
      let originalVideo = originalVideoBeforeEffects;

      if (!originalVideo) {
        console.log(
          "⚠️ originalVideoBeforeEffects not found, traversing parent chain..."
        );

        // Try to find original by following parentVideoId chain
        originalVideo = storeCurrentVideo;

        while (originalVideo && originalVideo.parentVideoId) {
          try {
            console.log(
              "🔍 Fetching parent video:",
              originalVideo.parentVideoId
            );
            const parentResponse = await fetch(
              `${baseUrl}/api/videos/${originalVideo.parentVideoId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            if (!parentResponse.ok) {
              console.error(
                "❌ Parent video fetch failed:",
                parentResponse.status
              );
              break;
            }
            const parentData = await parentResponse.json();
            console.log("📦 Parent video response:", parentData);

            // Extract video from response (API returns { success: true, data: { video } })
            const parentVideo =
              parentData.data?.video || parentData.video || parentData;

            // Construct proper URL for parent video
            const videoPath =
              parentVideo.filePath ||
              parentVideo.path ||
              `/api/videos/${parentVideo._id || parentVideo.id}/stream`;
            let videoUrl = videoPath.startsWith("http")
              ? videoPath
              : `${baseUrl}${videoPath}`;
            if (token) {
              videoUrl = `${videoUrl}${
                videoUrl.includes("?") ? "&" : "?"
              }token=${token}`;
            }

            originalVideo = {
              ...parentVideo,
              id: parentVideo._id || parentVideo.id,
              url: videoUrl,
              streamUrl: videoUrl,
            };

            console.log("✅ Moved to parent video:", originalVideo.id);
          } catch (err) {
            console.error("❌ Error fetching parent video:", err);
            break;
          }
        }

        // Save it for future use
        if (originalVideo && originalVideo.id !== storeCurrentVideo.id) {
          console.log("💾 Saving found original video:", originalVideo);
          setOriginalVideoBeforeEffects(originalVideo);
        }
      }

      if (!originalVideo || !originalVideo.id) {
      }

      if (!originalVideo || !originalVideo.id) {
        throw new Error(
          "Could not find original video. Please reload the page."
        );
      }

      console.log("✅ Using original video:", originalVideo);

      setProcessingProgress(30);

      let currentVideoId = originalVideo.id;

      // Apply all effects with updated parameters
      for (let i = 0; i < updatedEffects.length; i++) {
        const effect = updatedEffects[i];
        const progress = 30 + ((i + 1) / updatedEffects.length) * 50; // 30-80%
        setProcessingProgress(progress);

        console.log(
          `📤 Applying effect ${i + 1}/${updatedEffects.length}:`,
          effect
        );

        const response = await fetch(
          `${baseUrl}/api/video-edit/${currentVideoId}/effect`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              effect: effect.effect || effect.type,
              parameters: effect.parameters || {},
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to apply effect");
        }

        const result = await response.json();
        console.log(`📦 Edit effect - Effect ${i + 1} response:`, result);
        console.log(
          "📦 Edit effect - Current video ID before update:",
          currentVideoId
        );

        currentVideoId =
          result.data?.effectVideo || result.data?.id || currentVideoId;

        console.log(
          "📦 Edit effect - Current video ID after update:",
          currentVideoId
        );
      }

      setProcessingProgress(85);

      // Load the final video
      console.log("📦 Edit effect - Final video ID to fetch:", currentVideoId);
      const finalResponse = await fetch(
        `${baseUrl}/api/videos/${currentVideoId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const finalResponseData = await finalResponse.json();

      // Extract video from nested response structure
      const finalVideo =
        finalResponseData.data?.video ||
        finalResponseData.video ||
        finalResponseData;

      console.log("✅ Final video loaded:", finalVideo);

      // Extract video ID
      const videoId = finalVideo._id || finalVideo.id;

      // Construct video URL with auth token
      let videoPath;
      const filePath = finalVideo.filePath || finalVideo.path;

      // Check if filePath is an absolute file system path
      if (
        filePath &&
        (filePath.includes(":\\") ||
          (filePath.startsWith("/") && filePath.includes("backend")))
      ) {
        // Absolute path detected - use stream endpoint
        videoPath = `/api/videos/${videoId}/stream`;
      } else if (filePath) {
        // Relative path - use as-is
        videoPath = filePath;
      } else {
        // No path - construct default stream endpoint
        videoPath = `/api/videos/${videoId}/stream`;
      }

      let videoUrl = videoPath.startsWith("http")
        ? videoPath
        : `${baseUrl}${videoPath}`;
      if (token) {
        videoUrl = `${videoUrl}${
          videoUrl.includes("?") ? "&" : "?"
        }token=${token}`;
      }

      // Add cache-busting timestamp to force reload
      videoUrl = `${videoUrl}&t=${Date.now()}`;

      const updatedFinalVideo = {
        ...finalVideo,
        id: videoId,
        _id: videoId,
        url: videoUrl,
        streamUrl: videoUrl,
        appliedEffects: updatedEffects,
      };

      console.log("🎥 Setting final video after editing effect:", {
        id: updatedFinalVideo.id,
        url: updatedFinalVideo.url,
        appliedEffects: updatedFinalVideo.appliedEffects,
      });

      setCurrentVideo(updatedFinalVideo);
      setUploadedVideo(updatedFinalVideo);

      setProcessingProgress(100);

      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: `✅ Updated ${getEffectDisplayName(
            effectType
          )} effect successfully.`,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Hide loading animation after a brief moment
      setTimeout(() => {
        setIsGeneratingVideo(false);
        setIsProcessing(false);
        setProcessingProgress(0);
      }, 500);
    } catch (error) {
      console.error("Error editing effect:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: `❌ Failed to edit effect: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsGeneratingVideo(false);
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const handleResetToOriginal = async () => {
    if (!storeCurrentVideo) return;

    try {
      // Show loading animation on video preview
      setIsGeneratingVideo(true);
      setIsProcessing(true);
      setProcessingProgress(20);

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication required");
      }

      setProcessingProgress(50);

      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

      // Find original video by traversing parent chain
      let originalVideo = storeCurrentVideo;
      while (originalVideo.parentVideoId) {
        const parentResponse = await fetch(
          `${baseUrl}/api/videos/${originalVideo.parentVideoId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!parentResponse.ok) break;

        const parentData = await parentResponse.json();
        // Extract video from nested response structure
        originalVideo =
          parentData.data?.video || parentData.video || parentData;
      }

      setProcessingProgress(80);

      // Extract video ID
      const videoId = originalVideo._id || originalVideo.id;

      // Construct video URL with auth token
      let videoPath;
      const filePath = originalVideo.filePath || originalVideo.path;

      // Check if filePath is an absolute file system path
      if (
        filePath &&
        (filePath.includes(":\\") ||
          (filePath.startsWith("/") && filePath.includes("backend")))
      ) {
        // Absolute path detected - use stream endpoint
        videoPath = `/api/videos/${videoId}/stream`;
      } else if (filePath) {
        // Relative path - use as-is
        videoPath = filePath;
      } else {
        // No path - construct default stream endpoint
        videoPath = `/api/videos/${videoId}/stream`;
      }

      let videoUrl = videoPath.startsWith("http")
        ? videoPath
        : `${baseUrl}${videoPath}`;
      if (token) {
        videoUrl = `${videoUrl}${
          videoUrl.includes("?") ? "&" : "?"
        }token=${token}`;
      }
      videoUrl = `${videoUrl}&t=${Date.now()}`; // Cache-busting

      const resetVideo = {
        ...originalVideo,
        id: videoId,
        _id: videoId,
        url: videoUrl,
        streamUrl: videoUrl,
        appliedEffects: [], // Clear all effects
      };

      setCurrentVideo(resetVideo);
      setUploadedVideo(resetVideo);

      setProcessingProgress(100);

      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: "✅ Reset to original video. All effects removed.",
          timestamp: new Date().toISOString(),
        },
      ]);

      // Hide loading animation after a brief moment
      setTimeout(() => {
        setIsGeneratingVideo(false);
        setIsProcessing(false);
        setProcessingProgress(0);
      }, 300);
    } catch (error) {
      console.error("Error resetting to original:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: `❌ Failed to reset: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsGeneratingVideo(false);
      setIsProcessing(false);
      setProcessingProgress(0);
    }
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
      console.log("💬 Sending chat message:");
      console.log("   Current video ID:", storeCurrentVideo?.id);
      console.log("   Current video filePath:", storeCurrentVideo?.filePath);
      console.log("   Last applied effect:", lastAppliedEffect);
      console.log("   All applied effects:", storeCurrentVideo?.appliedEffects);

      socketService.sendChatMessage(
        newMessage,
        storeCurrentVideo?.id,
        "default-conversation",
        storeCurrentVideo?.filePath,
        lastAppliedEffect, // Pass last applied effect for intensity adjustments
        storeCurrentVideo?.appliedEffects || [] // Pass all applied effects for removal
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
      {/* Enhancement Loading Screen Overlay */}
      <EnhancementLoadingScreen
        isVisible={isWaitingForEnhancement}
        progress={enhancementProgress}
        message={enhancementMessage}
      />

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
                </div>

                {/* Auto-Edit Status (shown when video has been auto-edited) */}
                {uploadedVideo && (
                  <div className="px-6 mb-4">
                    <AutoEditStatus
                      video={uploadedVideo}
                      onVersionChange={(newVideoId) => {
                        console.log("Version changed to:", newVideoId);
                        // Optionally load the different version
                        // This would require fetching the video data
                      }}
                    />
                  </div>
                )}

                {/* Processing Indicator */}
                {isProcessing && (
                  <div className="px-6 mb-4">
                    <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
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
                  </div>
                )}

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
                <div className="flex-1 overflow-y-auto p-4 md:max-h-none max-h-[60vh] space-y-4">
                  {/* Applied Effects List */}
                  {storeCurrentVideo?.appliedEffects &&
                    storeCurrentVideo.appliedEffects.length > 0 && (
                      <AppliedEffectsList
                        effects={storeCurrentVideo.appliedEffects}
                        onRemoveEffect={handleRemoveEffect}
                        onEditEffect={handleEditEffect}
                        onResetToOriginal={handleResetToOriginal}
                      />
                    )}

                  {/* Effects Library */}
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
