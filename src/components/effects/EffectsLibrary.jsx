// src/components/effects/EffectsLibrary.jsx
import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, Star, Clock, X, Save, RotateCcw, Eye, CheckCircle,
  Sun, Palette, Film, Focus, Wind, Layers, Scissors, Scale,
  Snowflake, Flame, Sparkles as SparklesIcon,
  Volume2, Sliders, Music, Pipette, Move, Zap, Type, Wand2
} from "lucide-react";

/* ========= Categories & Data ========= */
const EFFECT_CATEGORIES = {
  COLOR: "Color & Grading",
  BLUR: "Blur & Focus",
  TRANSITION: "Transitions",
  PARTICLE: "Particles",
  LIGHTING: "Lighting",
  AUDIO: "Audio Effects",
  MOTION: "Motion Graphics",
  TECHNICAL: "Technical",
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
      { name: "lut", type: "select", options: ["Cinematic", "Warm", "Cool", "Vintage", "Dramatic"], default: "Cinematic" },
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
    parameters: [{ name: "radius", type: "slider", min: 0, max: 50, default: 5 }],
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
      { name: "distance", type: "slider", min: 0, max: 100, default: 10 },
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
    parameters: [{ name: "duration", type: "slider", min: 0.1, max: 5, default: 1 }],
  },
  {
    id: "wipe-transition",
    name: "Wipe Transition",
    category: EFFECT_CATEGORIES.TRANSITION,
    icon: Scissors,
    description: "Directional wipe.",
    premium: false,
    parameters: [
      { name: "direction", type: "select", options: ["Left to Right", "Right to Left", "Top to Bottom", "Bottom to Top"], default: "Left to Right" },
      { name: "feather", type: "slider", min: 0, max: 100, default: 10 },
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
      { name: "zoomType", type: "select", options: ["Zoom In", "Zoom Out", "Zoom In/Out"], default: "Zoom In" },
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
    icon: SparklesIcon,
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
  },

  // Audio
  {
    id: "reverb",
    name: "Reverb",
    category: EFFECT_CATEGORIES.AUDIO,
    icon: Volume2,
    description: "Add spatial reverb.",
    premium: false,
    parameters: [
      { name: "roomSize", type: "slider", min: 0, max: 100, default: 50 },
      { name: "damping", type: "slider", min: 0, max: 100, default: 50 },
      { name: "wetLevel", type: "slider", min: 0, max: 100, default: 30 },
    ],
  },
  {
    id: "echo",
    name: "Echo",
    category: EFFECT_CATEGORIES.AUDIO,
    icon: Volume2,
    description: "Echo delay.",
    premium: false,
    parameters: [
      { name: "delay", type: "slider", min: 0, max: 2000, default: 500 },
      { name: "feedback", type: "slider", min: 0, max: 95, default: 30 },
      { name: "mix", type: "slider", min: 0, max: 100, default: 25 },
    ],
  },
  {
    id: "equalizer",
    name: "Equalizer",
    category: EFFECT_CATEGORIES.AUDIO,
    icon: Sliders,
    description: "Professional EQ.",
    premium: false,
    parameters: [
      { name: "bass", type: "slider", min: -20, max: 20, default: 0 },
      { name: "mid", type: "slider", min: -20, max: 20, default: 0 },
      { name: "treble", type: "slider", min: -20, max: 20, default: 0 },
    ],
  },
  {
    id: "noise-reduction",
    name: "Noise Reduction",
    category: EFFECT_CATEGORIES.AUDIO,
    icon: Volume2,
    description: "AI powered noise cleanup.",
    premium: true,
    parameters: [
      { name: "strength", type: "slider", min: 0, max: 100, default: 50 },
      { name: "preserveVoice", type: "toggle", default: true },
    ],
  },

  // Motion & Technical
  {
    id: "speed-ramp",
    name: "Speed Ramping",
    category: EFFECT_CATEGORIES.MOTION,
    icon: Zap,
    description: "Dynamic speed changes.",
    premium: true,
    parameters: [
      { name: "startSpeed", type: "slider", min: 0.1, max: 5, default: 1 },
      { name: "endSpeed", type: "slider", min: 0.1, max: 5, default: 1 },
      { name: "curve", type: "select", options: ["Linear", "Ease In", "Ease Out", "Ease In/Out"], default: "Ease In/Out" },
    ],
  },
  {
    id: "text-animation",
    name: "Text Animation",
    category: EFFECT_CATEGORIES.MOTION,
    icon: Type,
    description: "Animated text presets.",
    premium: false,
    parameters: [
      { name: "animation", type: "select", options: ["Fade In", "Slide In", "Typewriter", "Bounce"], default: "Fade In" },
      { name: "duration", type: "slider", min: 0.5, max: 5, default: 1 },
    ],
  },
  {
    id: "chroma-key",
    name: "Chroma Key",
    category: EFFECT_CATEGORIES.TECHNICAL,
    icon: Pipette,
    description: "Green screen removal.",
    premium: false,
    parameters: [
      { name: "keyColor", type: "color", default: "#00ff00" },
      { name: "tolerance", type: "slider", min: 0, max: 100, default: 20 },
      { name: "softness", type: "slider", min: 0, max: 100, default: 10 },
    ],
  },
  {
    id: "stabilization",
    name: "Video Stabilization",
    category: EFFECT_CATEGORIES.TECHNICAL,
    icon: Move,
    description: "Reduce camera shake.",
    premium: true,
    parameters: [
      { name: "strength", type: "slider", min: 0, max: 100, default: 50 },
      { name: "cropMode", type: "select", options: ["Auto", "Manual"], default: "Auto" },
    ],
  },
];

/* =============== Component =============== */
const EffectsLibrary = ({
  onEffectSelect,
  onEffectApply,
  onPreview,
  selectedClip = null,
  realTimePreview = true,
  className = "",
}) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState(null);
  const [params, setParams] = useState({});
  const [previewOn, setPreviewOn] = useState(false);
  const [recent, setRecent] = useState([]);

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

  const startEffect = useCallback((effect) => {
    setSelectedEffect(effect);
    const p = {};
    (effect.parameters || []).forEach((pr) => (p[pr.name] = pr.default));
    setParams(p);
    setRecent((r) => [effect.id, ...r.filter((id) => id !== effect.id)].slice(0, 6));
    onEffectSelect?.(effect);
  }, [onEffectSelect]);

  useEffect(() => {
    if (!realTimePreview || !previewOn || !selectedEffect || !onPreview) return;
    const t = setTimeout(() => {
      onPreview({ effect: selectedEffect, parameters: params, clipId: selectedClip?.id });
    }, 250);
    return () => clearTimeout(t);
  }, [params, realTimePreview, previewOn, selectedEffect, selectedClip, onPreview]);

  const handleParamChange = (name, value) => setParams((prev) => ({ ...prev, [name]: value }));
  const applyEffect = async () => {
    if (!selectedEffect || !selectedClip) return;
    await onEffectApply?.({ effect: selectedEffect, parameters: params, clipId: selectedClip.id });
  };
  const resetParams = () => {
    if (!selectedEffect) return;
    const p = {};
    (selectedEffect.parameters || []).forEach((pr) => (p[pr.name] = pr.default));
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
            onChange={(e) => handleParamChange(def.name, parseFloat(e.target.value))}
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
              <option key={opt} value={opt} className="text-black">
                {opt}
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
          <span className="font-medium">{def.name.replace(/([A-Z])/g, " $1")}</span>
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
    <div className={`relative bg-card border-2 border-border rounded-lg overflow-hidden ${className}`}>
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
                previewOn ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
              title="Toggle real-time preview"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={() => setShowPremiumOnly((v) => !v)}
              className={`px-2.5 py-1 rounded border text-xs flex items-center gap-1 ${
                showPremiumOnly ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"
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
            <p className="text-sm text-muted-foreground">No effects match your filters.</p>
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
                    ${active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 bg-card"}`}
                  title={e.description}
                >
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 mx-auto mb-3">
                    <Icon className={`w-6 h-6 ${active ? "text-primary" : "text-primary"}`} />
                  </div>
                  <h4 className="text-sm font-semibold text-center truncate">{e.name}</h4>
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
                    <h4 className="text-sm font-semibold truncate">{selectedEffect.name}</h4>
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
                  <span className="text-xs text-green-700">Real-time preview active</span>
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
                      onClick={() => {/* hook up save preset here if needed */}}
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
                <button
                  onClick={applyEffect}
                  disabled={!selectedClip}
                  className={`w-full text-sm font-medium rounded-md px-3 py-2 transition
                    ${selectedClip
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-95"
                      : "bg-muted text-muted-foreground cursor-not-allowed border border-border"}`}
                >
                  Apply Effect
                </button>
                {!selectedClip && (
                  <p className="mt-2 text-[11px] text-yellow-600 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                    Select a clip to apply effects.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EffectsLibrary;
