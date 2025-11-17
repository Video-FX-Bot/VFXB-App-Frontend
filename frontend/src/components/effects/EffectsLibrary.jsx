// src/components/effects/EffectsLibrary.jsx
import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import useVideoStore from "../../context/videoStore";
import { AnimatePresence, motion } from "framer-motion";

// Custom hook for effect application
function useEffectApplication() {
  const videoStore = useVideoStore();

  const applyEffect = async (effect, parameters) => {
    if (!videoStore.currentVideo?.id) {
      throw new Error("No video selected. Please upload a video first.");
    }

    const effectConfig = {
      id: effect.id,
      name: effect.name,
      type: effect.type,
      parameters: parameters || {},
      timestamp: Date.now(),
    };

    await videoStore.applyGlobalEffect(effectConfig);
  };

  return {
    applyEffect,
  };
}

import {
  Search,
  Star,
  Clock,
  X,
  Save,
  RotateCcw,
  Eye,
  CheckCircle,
  Sun,
  Palette,
  Film,
  Focus,
  Wind,
  Layers,
  Scale,
  Snowflake,
  Flame,
  Sparkles,
  Zap,
  Wand2,
} from "lucide-react";

/* ========= Categories & Data ========= */
const EFFECT_CATEGORIES = {
  COLOR: "Color & Grading",
  BLUR: "Blur & Focus",
  TRANSITION: "Transitions",
  PARTICLE: "Particles",
  LIGHTING: "Lighting",
  AI: "AI Generation",
};

const EFFECTS_DATA = [
  // Color & Grading
  {
    id: "brightness",
    name: "Brightness / Contrast",
    category: EFFECT_CATEGORIES.COLOR,
    icon: Sun,
    description: "Adjust brightness and contrast levels.",
    premium: false,
    parameters: [
      { name: "brightness", type: "slider", min: -100, max: 100, default: 0 },
      { name: "contrast", type: "slider", min: -100, max: 100, default: 0 },
    ],
  },
  {
    id: "color-correction",
    name: "Color Correction",
    category: EFFECT_CATEGORIES.COLOR,
    icon: Palette,
    description: "Professional color tools (temperature, tint, saturation).",
    premium: true,
    parameters: [
      { name: "temperature", type: "slider", min: -100, max: 100, default: 0 },
      { name: "tint", type: "slider", min: -100, max: 100, default: 0 },
      { name: "saturation", type: "slider", min: -100, max: 100, default: 0 },
      { name: "vibrance", type: "slider", min: -100, max: 100, default: 0 },
    ],
  },
  {
    id: "lut-filter",
    name: "LUT Filter",
    category: EFFECT_CATEGORIES.COLOR,
    icon: Film,
    description: "Apply cinematic LUTs.",
    premium: true,
    parameters: [
      {
        name: "lut",
        type: "select",
        options: ["Cinematic", "Warm", "Cool", "Vintage", "Dramatic"],
        default: "Cinematic",
      },
      { name: "intensity", type: "slider", min: 0, max: 100, default: 100 },
    ],
  },

  // Blur & Focus
  {
    id: "gaussian-blur",
    name: "Gaussian Blur",
    category: EFFECT_CATEGORIES.BLUR,
    icon: Focus,
    description: "Smooth blur.",
    premium: false,
    parameters: [
      { name: "radius", type: "slider", min: 0, max: 50, default: 5 },
    ],
  },
  {
    id: "motion-blur",
    name: "Motion Blur",
    category: EFFECT_CATEGORIES.BLUR,
    icon: Wind,
    description: "Directional motion blur.",
    premium: false,
    parameters: [
      { name: "angle", type: "slider", min: 0, max: 360, default: 0 },
      { name: "strength", type: "slider", min: 0, max: 100, default: 10 },
    ],
  },

  // Transitions
  {
    id: "cross-dissolve",
    name: "Cross Dissolve",
    category: EFFECT_CATEGORIES.TRANSITION,
    icon: Layers,
    description: "Smooth fade.",
    premium: false,
    parameters: [
      { name: "duration", type: "slider", min: 0.1, max: 5, default: 1 },
    ],
  },
  {
    id: "zoom-transition",
    name: "Zoom Transition",
    category: EFFECT_CATEGORIES.TRANSITION,
    icon: Scale,
    description: "Dynamic zoom.",
    premium: true,
    parameters: [
      {
        name: "zoomType",
        type: "select",
        options: ["Zoom In", "Zoom Out", "Zoom In/Out"],
        default: "Zoom In",
      },
      { name: "centerX", type: "slider", min: 0, max: 100, default: 50 },
      { name: "centerY", type: "slider", min: 0, max: 100, default: 50 },
    ],
  },

  // Particles
  {
    id: "snow",
    name: "Snow",
    category: EFFECT_CATEGORIES.PARTICLE,
    icon: Snowflake,
    description: "Realistic snow particles.",
    premium: false,
    parameters: [
      { name: "density", type: "slider", min: 0, max: 100, default: 50 },
      { name: "size", type: "slider", min: 1, max: 10, default: 3 },
      { name: "speed", type: "slider", min: 0, max: 100, default: 30 },
    ],
  },
  {
    id: "fire",
    name: "Fire",
    category: EFFECT_CATEGORIES.PARTICLE,
    icon: Flame,
    description: "Dynamic fire.",
    premium: true,
    parameters: [
      { name: "intensity", type: "slider", min: 0, max: 100, default: 70 },
      { name: "height", type: "slider", min: 10, max: 100, default: 50 },
      { name: "color", type: "color", default: "#ff4500" },
    ],
  },
  {
    id: "sparkles",
    name: "Sparkles",
    category: EFFECT_CATEGORIES.PARTICLE,
    icon: Sparkles,
    description: "Magical sparkles.",
    premium: false,
    parameters: [
      { name: "count", type: "slider", min: 10, max: 200, default: 50 },
      { name: "size", type: "slider", min: 1, max: 20, default: 5 },
      { name: "lifetime", type: "slider", min: 0.5, max: 5, default: 2 },
    ],
  },

  // Lighting
  {
    id: "lens-flare",
    name: "Lens Flare",
    category: EFFECT_CATEGORIES.LIGHTING,
    icon: Sun,
    description: "Cinematic flares.",
    premium: true,
    parameters: [
      { name: "intensity", type: "slider", min: 0, max: 100, default: 50 },
      { name: "x", type: "slider", min: 0, max: 100, default: 50 },
      { name: "y", type: "slider", min: 0, max: 100, default: 50 },
      { name: "color", type: "color", default: "#ffffff" },
    ],
    applyGlobally: true,
  },

  // AI Generation
  {
    id: "auto-text-to-video",
    name: "Auto Text-to-Video",
    category: EFFECT_CATEGORIES.AI,
    icon: Wand2,
    description:
      "AI generates and inserts multiple video clips throughout your video based on intelligent keyword extraction.",
    premium: true,
    parameters: [
      {
        name: "clipCount",
        type: "slider",
        min: 2,
        max: 5,
        default: 3,
        label: "Number of Clips",
      },
      {
        name: "clipDuration",
        type: "slider",
        min: 2,
        max: 5,
        default: 3,
        label: "Clip Duration (seconds)",
      },
    ],
    applyGlobally: true,
    requiresChat: true, // This effect uses the chat API
  },
  {
    id: "auto-trim-silence",
    name: "Auto Trim Silence",
    category: EFFECT_CATEGORIES.AI,
    icon: Zap,
    description:
      "Automatically detect and remove silence, dead space, and pauses to make your video more engaging.",
    premium: true,
    parameters: [
      {
        name: "silenceThreshold",
        type: "slider",
        min: -50,
        max: -10,
        default: -30,
        label: "Silence Threshold (dB)",
      },
      {
        name: "minSilenceDuration",
        type: "slider",
        min: 0.1,
        max: 2.0,
        step: 0.1,
        default: 0.5,
        label: "Min Silence Duration (s)",
      },
      {
        name: "padding",
        type: "slider",
        min: 0,
        max: 0.5,
        step: 0.05,
        default: 0.1,
        label: "Padding (s)",
      },
    ],
    applyGlobally: true,
    requiresChat: true, // This effect uses the chat API
  },
  {
    id: "enhance-quality",
    name: "AI Enhance Quality",
    category: EFFECT_CATEGORIES.AI,
    icon: Sparkles,
    description:
      "AI-powered video enhancement with upscaling, denoising, sharpening, and color enhancement for professional quality.",
    premium: true,
    parameters: [
      {
        name: "upscale",
        type: "toggle",
        default: true,
        label: "Upscale Resolution (2x)",
      },
      {
        name: "denoise",
        type: "toggle",
        default: true,
        label: "Remove Noise",
      },
      {
        name: "sharpen",
        type: "toggle",
        default: true,
        label: "Enhance Sharpness",
      },
      {
        name: "targetResolution",
        type: "select",
        options: [
          { value: "720p", label: "HD (720p)" },
          { value: "1080p", label: "Full HD (1080p)" },
          { value: "4k", label: "4K Ultra HD" },
        ],
        default: "1080p",
        label: "Target Resolution",
      },
    ],
    applyGlobally: true,
    requiresChat: true, // This effect uses the chat API
  },
];

/* =============== Component =============== */
const EffectsLibrary = ({
  className = "",
  onEffectSelect = () => {},
  onPreview = () => {},
  realTimePreview = false,
  currentEffectParams = { brightness: 0, contrast: 0 },
  onEffectParamsChange = () => {},
}) => {
  const { applyEffect } = useEffectApplication();
  const currentVideo = useVideoStore((state) => state.currentVideo);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState(null);
  const [params, setParams] = useState({});
  const [previewOn, setPreviewOn] = useState(false);
  const [recent, setRecent] = useState([]);
  // Store last applied parameters for each effect
  const [savedParams, setSavedParams] = useState({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return EFFECTS_DATA.filter((e) => {
      const inCat = category === "All" || e.category === category;
      const inQ =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q);
      const inPremium = !showPremiumOnly || e.premium;
      return inCat && inQ && inPremium;
    });
  }, [search, category, showPremiumOnly]);

  const startEffect = useCallback(
    (effect) => {
      setSelectedEffect(effect);
      // Use saved parameters if available, otherwise use defaults
      const p = savedParams[effect.id] || {};
      if (Object.keys(p).length === 0) {
        (effect.parameters || []).forEach((pr) => (p[pr.name] = pr.default));
      }

      // For brightness effect, use currentEffectParams from AI chat
      if (effect.id === "brightness") {
        p.brightness = currentEffectParams.brightness;
        p.contrast = currentEffectParams.contrast;
      }

      setParams(p);
      setRecent((r) =>
        [effect.id, ...r.filter((id) => id !== effect.id)].slice(0, 6)
      );
      onEffectSelect(effect);
    },
    [savedParams, currentEffectParams, onEffectSelect] // Add currentEffectParams as dependency
  );

  useEffect(() => {
    if (!realTimePreview || !previewOn || !selectedEffect || !onPreview) return;
    const t = setTimeout(() => {
      onPreview({
        effect: selectedEffect,
        parameters: params,
      });
    }, 250);
    return () => clearTimeout(t);
  }, [params, realTimePreview, previewOn, selectedEffect, onPreview]);

  const handleParamChange = (name, value) =>
    setParams((prev) => ({ ...prev, [name]: value }));
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(false);

  const handleApplyEffect = async () => {
    if (!selectedEffect) {
      setError("Please select an effect to apply.");
      return;
    }

    setError(null);
    setApplying(true);

    try {
      // If effect requires chat API (like auto-text-to-video or auto-trim-silence), use that instead
      if (selectedEffect.requiresChat) {
        const { default: socketService } = await import(
          "../../services/socketService"
        );

        // Build a natural language message for the AI based on effect type
        let message;

        if (selectedEffect.id === "auto-text-to-video") {
          message = `automatically generate ${
            params.clipCount || 3
          } text to video clips throughout the video with ${
            params.clipDuration || 3
          } second duration each`;
        } else if (selectedEffect.id === "auto-trim-silence") {
          message = `remove silence from my video with threshold ${
            params.silenceThreshold || -30
          }dB, minimum duration ${
            params.minSilenceDuration || 0.5
          }s, and padding ${params.padding || 0.1}s`;
        } else if (selectedEffect.id === "enhance-quality") {
          const enhancements = [];
          if (params.upscale) enhancements.push("upscale");
          if (params.denoise) enhancements.push("denoise");
          if (params.sharpen) enhancements.push("sharpen");

          message = `enhance video quality${
            enhancements.length > 0 ? " with " + enhancements.join(", ") : ""
          }${
            params.targetResolution
              ? ` targeting ${params.targetResolution}`
              : ""
          }`;
        } else {
          // Generic fallback
          message = `apply ${selectedEffect.name} effect`;
        }

        // Send via chat API
        await socketService.sendChatMessage(
          message,
          currentVideo.id,
          null // conversationId
        );

        // Close panel immediately since progress will be shown via socket events
        setSelectedEffect(null);
        setApplying(false);
        return;
      }

      await applyEffect(selectedEffect, params);
      // Save the current parameters for this effect
      setSavedParams((prev) => ({
        ...prev,
        [selectedEffect.id]: { ...params },
      }));

      // Update parent state if this is brightness/contrast
      if (selectedEffect.id === "brightness") {
        onEffectParamsChange({
          brightness: params.brightness || 0,
          contrast: params.contrast || 0,
        });
      }

      // Close the effect panel after successful application
      setSelectedEffect(null);
      // Optionally update recent effects
      setRecent((prev) =>
        [
          selectedEffect,
          ...prev.filter((e) => e.id !== selectedEffect.id),
        ].slice(0, 5)
      );
    } catch (err) {
      setError(err.message || "Failed to apply effect");
    } finally {
      setApplying(false);
    }
  };
  const resetParams = () => {
    if (!selectedEffect) return;
    const p = {};
    (selectedEffect.parameters || []).forEach(
      (pr) => (p[pr.name] = pr.default)
    );
    setParams(p);
  };

  const Parameter = ({ def }) => {
    const value = params[def.name] ?? def.default;
    if (def.type === "slider") {
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground truncate">
              {def.name.replace(/([A-Z])/g, " $1")}
            </label>
            <span className="text-[11px] text-muted-foreground">{value}</span>
          </div>
          <input
            type="range"
            min={def.min}
            max={def.max}
            step={def.step || (def.max - def.min) / 100}
            value={value}
            onChange={(e) =>
              handleParamChange(def.name, parseFloat(e.target.value))
            }
            className="w-full h-2 rounded-lg cursor-pointer"
          />
        </div>
      );
    }
    if (def.type === "select") {
      return (
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground truncate">
            {def.name.replace(/([A-Z])/g, " $1")}
          </label>
          <select
            value={value}
            onChange={(e) => handleParamChange(def.name, e.target.value)}
            className="w-full bg-card border border-border rounded px-2 py-1 text-sm"
          >
            {def.options.map((opt) => (
              <option key={opt.value} value={opt.value} className="text-black">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }
    if (def.type === "color") {
      return (
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground truncate">
            {def.name.replace(/([A-Z])/g, " $1")}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value}
              onChange={(e) => handleParamChange(def.name, e.target.value)}
              className="w-8 h-8 rounded border border-border"
            />
            <input
              type="text"
              value={value}
              onChange={(e) => handleParamChange(def.name, e.target.value)}
              className="flex-1 bg-card border border-border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      );
    }
    if (def.type === "toggle") {
      return (
        <label className="flex items-center justify-between text-xs">
          <span className="font-medium">
            {def.name.replace(/([A-Z])/g, " $1")}
          </span>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => handleParamChange(def.name, e.target.checked)}
            className="h-4 w-4"
          />
        </label>
      );
    }
    return null;
  };

  return (
    <div
      className={`relative bg-card border-2 border-border rounded-lg overflow-hidden ${className}`}
    >
      {/* Header (wraps; no horizontal scroll) */}
      <div className="p-4 border-b-2 border-border bg-muted/50">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Wand2 className="w-5 h-5 text-primary shrink-0" />
            <h3 className="text-lg font-semibold truncate">Effects Library</h3>
            {recent.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Clock className="w-4 h-4" />
                <span>{recent.length} recent</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <button
              onClick={() => setPreviewOn((v) => !v)}
              className={`px-2.5 py-1 rounded border text-xs flex items-center gap-1 ${
                previewOn
                  ? "border-primary text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
              title="Toggle real-time preview"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={() => setShowPremiumOnly((v) => !v)}
              className={`px-2.5 py-1 rounded border text-xs flex items-center gap-1 ${
                showPremiumOnly
                  ? "border-primary text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
              title="Show only Pro effects"
            >
              <Star className="w-4 h-4" />
              Pro
            </button>
          </div>

          {/* Search (full width on wrap) */}
          <div className="relative basis-full mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search effects…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border-2 border-border bg-card text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Categories (wrap; no horizontal scroll) */}
          <div className="flex flex-wrap gap-2 basis-full mt-2">
            {["All", ...Object.values(EFFECT_CATEGORIES)].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs border transition ${
                  category === c
                    ? "border-primary text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Big Cards Grid (no images) */}
      <div className="p-4 max-h-[480px] overflow-y-auto overflow-x-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Wand2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No effects match your filters.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setCategory("All");
                setShowPremiumOnly(false);
              }}
              className="mt-3 px-3 py-1.5 text-xs rounded border border-border hover:bg-muted"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
            {filtered.map((e) => {
              const Icon = e.icon;
              const active = selectedEffect?.id === e.id;
              return (
                <motion.button
                  key={e.id}
                  onClick={() => startEffect(e)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`text-left rounded-xl border-2 transition-all p-4 w-full
                    ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 bg-card"
                    }`}
                  title={e.description}
                >
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 mx-auto mb-3">
                    <Icon
                      className={`w-6 h-6 ${
                        active ? "text-primary" : "text-primary"
                      }`}
                    />
                  </div>
                  <h4 className="text-sm font-semibold text-center truncate">
                    {e.name}
                  </h4>
                  <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
                    {e.description}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      {e.category}
                    </span>
                    {e.premium && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                        PRO
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-in Parameters */}
      <AnimatePresence>
        {selectedEffect && (
          <motion.div
            key="editor"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="absolute inset-y-0 right-0 w-full max-w-full sm:max-w-[360px] bg-muted border-l-2 border-border shadow-elevation-2 overflow-y-auto"
          >
            <div className="p-4 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b-2 border-border pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <selectedEffect.icon className="w-5 h-5 text-primary shrink-0" />
                    <h4 className="text-sm font-semibold truncate">
                      {selectedEffect.name}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {selectedEffect.description}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEffect(null)}
                  className="p-1 rounded hover:bg-card text-muted-foreground hover:text-foreground"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {realTimePreview && previewOn && (
                <div className="flex items-center gap-2 p-2 rounded border border-green-200 bg-green-50">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-700">
                    Real-time preview active
                  </span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium">Parameters</h5>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={resetParams}
                      className="px-2 py-1 text-[11px] rounded border border-border hover:bg-card flex items-center gap-1"
                      title="Reset to defaults"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                    <button
                      onClick={() => {
                        /* hook up save preset here if needed */
                      }}
                      className="px-2 py-1 text-[11px] rounded border border-border hover:bg-card flex items-center gap-1"
                      title="Save preset"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                  </div>
                </div>

                {(selectedEffect.parameters || []).map((def) => (
                  <div key={def.name}>
                    <Parameter def={def} />
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t-2 border-border">
                {error && (
                  <div className="mb-2 p-2 text-xs text-red-700 bg-red-100 rounded border border-red-300">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleApplyEffect}
                  disabled={applying}
                  className={`w-full text-sm font-medium rounded-md px-3 py-2 transition
                    bg-gradient-to-r from-blue-500 to-purple-600 text-white 
                    ${
                      applying
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:opacity-95"
                    }`}
                >
                  {applying ? "Applying Effect..." : "Apply Effect"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EffectsLibrary;
