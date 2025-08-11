// src/components/effects/EffectsLibrary.jsx
import React, { useMemo, useState } from "react";
import { Search, Star, Wand2, X } from "lucide-react";

/* ===========================
   Categories & Effects (same data you had)
   =========================== */
const EFFECT_CATEGORIES = {
  COLOR: "Color",
  TRANSITION: "Transitions",
  TEXT: "Text",
  AUDIO: "Audio",
  STABILIZATION: "Stabilization",
  SPEED: "Speed",
  BLUR: "Blur",
  UTILITY: "Utility",
};

const EFFECTS_DATA = [
  {
    id: "color_grading",
    name: "Color Grading",
    category: EFFECT_CATEGORIES.COLOR,
    description: "Enhance tones, hues, and overall look.",
    premium: false,
    parameters: [
      {
        key: "style",
        label: "Style",
        type: "select",
        options: ["Cinematic", "Warm", "Cool", "Vibrant"],
        default: "Cinematic",
      },
    ],
  },
  {
    id: "brightness_contrast",
    name: "Brightness / Contrast",
    category: EFFECT_CATEGORIES.COLOR,
    description: "Adjust exposure and contrast for clarity.",
    premium: false,
    parameters: [
      {
        key: "brightness",
        label: "Brightness",
        type: "slider",
        min: -100,
        max: 100,
        default: 0,
      },
      {
        key: "contrast",
        label: "Contrast",
        type: "slider",
        min: -100,
        max: 100,
        default: 0,
      },
    ],
  },
  {
    id: "vignette",
    name: "Vignette",
    category: EFFECT_CATEGORIES.COLOR,
    description: "Subtle vignette to focus attention.",
    premium: false,
    parameters: [
      {
        key: "strength",
        label: "Strength",
        type: "slider",
        min: 0,
        max: 100,
        default: 30,
      },
    ],
  },
  {
    id: "motion_blur",
    name: "Motion Blur",
    category: EFFECT_CATEGORIES.BLUR,
    description: "Add directional blur to fast motion.",
    premium: true,
    parameters: [
      {
        key: "angle",
        label: "Angle",
        type: "slider",
        min: 0,
        max: 360,
        default: 0,
      },
      {
        key: "amount",
        label: "Amount",
        type: "slider",
        min: 0,
        max: 100,
        default: 40,
      },
    ],
  },
  {
    id: "stabilize",
    name: "Stabilization",
    category: EFFECT_CATEGORIES.STABILIZATION,
    description: "Reduce camera shake for smoother footage.",
    premium: true,
    parameters: [
      {
        key: "strength",
        label: "Strength",
        type: "slider",
        min: 0,
        max: 100,
        default: 50,
      },
    ],
  },
  {
    id: "speed_ramp",
    name: "Speed Ramp",
    category: EFFECT_CATEGORIES.SPEED,
    description: "Stylish slow/fast motion transitions.",
    premium: false,
    parameters: [
      {
        key: "curve",
        label: "Ramp Curve",
        type: "select",
        options: ["Ease In", "Ease Out", "Both"],
        default: "Both",
      },
    ],
  },
  {
    id: "text_overlay",
    name: "Text Overlay",
    category: EFFECT_CATEGORIES.TEXT,
    description: "Add titles, captions, or callouts.",
    premium: false,
    parameters: [
      {
        key: "text",
        label: "Text",
        type: "text",
        placeholder: "Enter title…",
        default: "",
      },
      {
        key: "style",
        label: "Style",
        type: "select",
        options: ["Title", "Lower Third", "Subtitle"],
        default: "Title",
      },
    ],
  },
  {
    id: "audio_enhance",
    name: "Audio Enhance",
    category: EFFECT_CATEGORIES.AUDIO,
    description: "Boost clarity and reduce background noise.",
    premium: false,
    parameters: [
      {
        key: "noise_reduction",
        label: "Noise Reduction",
        type: "slider",
        min: 0,
        max: 100,
        default: 35,
      },
    ],
  },
  {
    id: "levels",
    name: "Levels",
    category: EFFECT_CATEGORIES.COLOR,
    description: "Fine-tune shadows, midtones, and highlights.",
    premium: false,
    parameters: [],
  },
  {
    id: "contrast_boost",
    name: "Contrast Boost",
    category: EFFECT_CATEGORIES.COLOR,
    description: "Punch up contrast for extra pop.",
    premium: false,
    parameters: [
      {
        key: "amount",
        label: "Amount",
        type: "slider",
        min: 0,
        max: 100,
        default: 25,
      },
    ],
  },
  {
    id: "auto_magic",
    name: "Auto Magic",
    category: EFFECT_CATEGORIES.UTILITY,
    description: "One-click AI cleanup & enhancement.",
    premium: true,
    parameters: [],
  },
];

/* ===========================
   EffectsLibrary
   =========================== */
export default function EffectsLibrary({
  onApplyEffect,
  selectedClips = [],
  className = "",
  modalMode = "full", // "full" (with parameter controls) | "simple" (confirm only)
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Modal state
  const [isModalOpen, setModalOpen] = useState(false);
  const [activeEffect, setActiveEffect] = useState(null);
  const [params, setParams] = useState({});

  const categories = useMemo(
    () => ["All", ...Object.values(EFFECT_CATEGORIES)],
    []
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EFFECTS_DATA.filter((e) => {
      const matchCat =
        activeCategory === "All" || e.category === activeCategory;
      const matchQuery =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [query, activeCategory]);

  const openModalForEffect = (effect) => {
    setActiveEffect(effect);
    // seed defaults
    const seeded = {};
    (effect.parameters || []).forEach((p) => {
      if (p.type === "slider" && typeof p.default === "number")
        seeded[p.key] = p.default;
      else if (p.type === "select" && p.options?.length)
        seeded[p.key] = p.default ?? p.options[0];
      else if (p.type === "text") seeded[p.key] = p.default ?? "";
    });
    setParams(seeded);
    setModalOpen(true);
  };

  const applyNow = () => {
    if (!activeEffect) return;
    const toSend = modalMode === "full" ? params : {}; // simple mode ignores params
    if (typeof onApplyEffect === "function") {
      onApplyEffect(activeEffect, toSend, selectedClips);
    } else {
      console.log(
        "Apply effect:",
        activeEffect.id,
        "params:",
        toSend,
        "clips:",
        selectedClips
      );
    }
    setModalOpen(false);
  };

  const updateParam = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className={`${className} flex flex-col h-full`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Effects Library</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Search + Categories */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search effects…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border-2 border-border bg-card text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                activeCategory === c
                  ? "border-primary text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* BIG scrollable cards (centered) */}
      <div
        className="flex-1 overflow-y-auto pr-1"
        style={{ maxHeight: "calc(100vh - 220px)" }}
      >
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
          {filtered.map((effect) => (
            <div
              key={effect.id}
              className="border border-border rounded-xl bg-card hover:bg-muted/50 transition-colors p-6 min-h-[200px] flex flex-col items-center justify-between text-center"
            >
              <div className="w-full">
                <div className="flex items-center justify-center gap-2">
                  <h4 className="text-base font-semibold break-words">
                    {effect.name}
                  </h4>
                  {effect.premium && (
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] bg-amber-100 text-amber-700 border border-amber-200">
                      <Star className="w-3 h-3" /> Pro
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground leading-snug break-words">
                  {effect.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between w-full">
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                  {effect.category}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // don't let the card's onClick eat this
                    openModalForEffect(effect); // <- use your existing opener
                  }}
                  className="px-2 py-1 rounded text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full text-sm text-muted-foreground border border-border rounded-lg p-6 text-center">
              No effects found. Try a different search or category.
            </div>
          )}
        </div>
      </div>

      {/* Modal (covers both modes) */}
      {isModalOpen && activeEffect && (
        <Modal onClose={() => setModalOpen(false)} title={activeEffect.name}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {activeEffect.description}
            </p>

            {modalMode === "full" &&
              (activeEffect.parameters?.length ? (
                <div className="mt-2 space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                  {activeEffect.parameters.map((p) => (
                    <ParamControl
                      key={p.key}
                      p={p}
                      value={params[p.key]}
                      onChange={(v) => updateParam(p.key, v)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  This effect has no adjustable parameters.
                </div>
              ))}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-2 rounded-md border border-border text-sm"
              >
                Cancel
              </button>
              <button
                onClick={applyNow}
                className="px-4 py-2 rounded-md bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm"
              >
                {modalMode === "full" ? "Apply Effect" : "Apply"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ===========================
   Param Control (full mode)
   =========================== */
function ParamControl({ p, value, onChange }) {
  if (p.type === "slider") {
    return (
      <div>
        <label className="text-sm font-medium">{p.label}</label>
        <div className="flex items-center gap-3 mt-2">
          <input
            type="range"
            min={p.min ?? 0}
            max={p.max ?? 100}
            value={typeof value === "number" ? value : p.default ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full"
          />
          <input
            type="number"
            min={p.min ?? 0}
            max={p.max ?? 100}
            value={typeof value === "number" ? value : p.default ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-20 px-2 py-1 rounded border border-border bg-card text-sm"
          />
        </div>
      </div>
    );
  }

  if (p.type === "select") {
    return (
      <div>
        <label className="text-sm font-medium">{p.label}</label>
        <select
          value={value ?? p.default ?? p.options?.[0] ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full px-3 py-2 rounded border border-border bg-card text-sm"
        >
          {(p.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (p.type === "text") {
    return (
      <div>
        <label className="text-sm font-medium">{p.label}</label>
        <input
          type="text"
          placeholder={p.placeholder || ""}
          value={value ?? p.default ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full px-3 py-2 rounded border border-border bg-card text-sm"
        />
      </div>
    );
  }

  // Fallback
  return (
    <div className="text-xs text-muted-foreground">
      Unsupported parameter type: {p.type}
    </div>
  );
}

/* ===========================
   Modal
   =========================== */
// Inside the same EffectsLibrary.jsx — only the Modal function changes

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-[400px] max-w-full h-full bg-card border-l border-border shadow-xl animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h4 className="text-base font-semibold">{title}</h4>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-64px)]">
          {children}
        </div>
      </div>

      {/* Animation */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
