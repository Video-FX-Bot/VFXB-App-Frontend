import React, { useState } from "react";
import { X, Edit2, Check, RotateCcw } from "lucide-react";

const AppliedEffectsList = ({
  effects = [],
  onRemoveEffect,
  onEditEffect,
  onResetToOriginal,
}) => {
  const [editingEffect, setEditingEffect] = useState(null);
  const [editValues, setEditValues] = useState({});

  // Get user-friendly effect names
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

  // Get effect parameter display
  const getEffectParameters = (effect, parameters) => {
    switch (effect) {
      case "lut-filter":
        return `${parameters.preset} (${parameters.intensity}%)`;
      case "gaussian-blur":
        return `Intensity: ${parameters.intensity || parameters.radius || 10}`;
      case "brightness":
        return `Brightness: ${parameters.brightness || 0}, Contrast: ${
          parameters.contrast || 0
        }`;
      case "caption":
        const style = parameters.style || {};
        return `${style.fontColor || "white"} @ ${style.position || "bottom"}`;
      case "audio-enhancement":
        const features = [];
        if (parameters.normalize) features.push("Normalize");
        if (parameters.denoise) features.push("Denoise");
        return features.join(", ") || "Enhanced";
      default:
        return JSON.stringify(parameters).substring(0, 50);
    }
  };

  const handleEditStart = (index, effect) => {
    setEditingEffect(index);
    setEditValues(effect.parameters || {});
  };

  const handleEditSave = (index, effect) => {
    onEditEffect(index, effect.effect, editValues);
    setEditingEffect(null);
    setEditValues({});
  };

  const handleEditCancel = () => {
    setEditingEffect(null);
    setEditValues({});
  };

  const renderEditForm = (effect, parameters) => {
    switch (effect) {
      case "lut-filter":
        return (
          <div className="space-y-2 p-3 bg-gray-700 rounded">
            <div>
              <label className="text-xs text-gray-300">Preset</label>
              <select
                value={editValues.preset || parameters.preset}
                onChange={(e) =>
                  setEditValues({ ...editValues, preset: e.target.value })
                }
                className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              >
                <option value="Warm">Warm</option>
                <option value="Cool">Cool</option>
                <option value="Cinematic">Cinematic</option>
                <option value="Vintage">Vintage</option>
                <option value="Dramatic">Dramatic</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-300">
                Intensity: {editValues.intensity || parameters.intensity}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={editValues.intensity || parameters.intensity}
                onChange={(e) =>
                  setEditValues({
                    ...editValues,
                    intensity: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>
          </div>
        );

      case "gaussian-blur":
        return (
          <div className="space-y-2 p-3 bg-gray-700 rounded">
            <label className="text-xs text-gray-300">
              Intensity:{" "}
              {editValues.intensity ||
                parameters.intensity ||
                parameters.radius}
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={
                editValues.intensity ||
                parameters.intensity ||
                parameters.radius ||
                10
              }
              onChange={(e) =>
                setEditValues({
                  ...editValues,
                  intensity: parseInt(e.target.value),
                })
              }
              className="w-full"
            />
          </div>
        );

      case "brightness":
        return (
          <div className="space-y-2 p-3 bg-gray-700 rounded">
            <div>
              <label className="text-xs text-gray-300">
                Brightness:{" "}
                {editValues.brightness ?? parameters.brightness ?? 0}
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                value={editValues.brightness ?? parameters.brightness ?? 0}
                onChange={(e) =>
                  setEditValues({
                    ...editValues,
                    brightness: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-300">
                Contrast: {editValues.contrast ?? parameters.contrast ?? 0}
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                value={editValues.contrast ?? parameters.contrast ?? 0}
                onChange={(e) =>
                  setEditValues({
                    ...editValues,
                    contrast: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>
          </div>
        );

      case "caption":
        return (
          <div className="p-3 bg-gray-700 rounded text-xs text-gray-300">
            <p>
              Captions cannot be edited. Remove and regenerate with new style.
            </p>
          </div>
        );

      default:
        return (
          <div className="p-3 bg-gray-700 rounded text-xs text-gray-300">
            <p>This effect cannot be edited</p>
          </div>
        );
    }
  };

  const canEditEffect = (effect) => {
    return [
      "lut-filter",
      "gaussian-blur",
      "brightness",
      "motion-blur",
    ].includes(effect);
  };

  if (!effects || effects.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          Applied Effects
        </h3>
        <p className="text-gray-400 text-sm">No effects applied yet</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          Applied Effects ({effects.length})
        </h3>
        {effects.length > 0 && (
          <button
            onClick={onResetToOriginal}
            className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-1"
            title="Reset to original video"
          >
            <RotateCcw size={12} />
            Reset All
          </button>
        )}
      </div>

      <div className="space-y-2">
        {effects.map((effectItem, index) => (
          <div
            key={index}
            className="bg-gray-700 rounded p-3 border border-gray-600"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium text-sm">
                    {getEffectDisplayName(effectItem.effect)}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-gray-600 text-gray-300 rounded">
                    #{index + 1}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {getEffectParameters(
                    effectItem.effect,
                    effectItem.parameters || {}
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1">
                {canEditEffect(effectItem.effect) &&
                  editingEffect !== index && (
                    <button
                      onClick={() => handleEditStart(index, effectItem)}
                      className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded"
                      title="Edit effect"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                {editingEffect === index && (
                  <>
                    <button
                      onClick={() => handleEditSave(index, effectItem)}
                      className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded"
                      title="Save changes"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={handleEditCancel}
                      className="p-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded"
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
                {editingEffect !== index && (
                  <button
                    onClick={() => onRemoveEffect(index, effectItem.effect)}
                    className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded"
                    title="Remove effect"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {editingEffect === index && (
              <div className="mt-3">
                {renderEditForm(effectItem.effect, effectItem.parameters || {})}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppliedEffectsList;
