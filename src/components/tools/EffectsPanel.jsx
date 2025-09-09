import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Zap, Filter, Layers, Eye, EyeOff, Settings,
  Palette, Wand2, Star, Sun, Moon, Droplets, Wind,
  RotateCcw, Save, Download, Upload, Play, Pause,
  ChevronDown, ChevronUp, X, Plus, Minus, Target,
  Sliders, BarChart3, TrendingUp, Circle, Square,
  Triangle, Hexagon, Aperture, Focus, Blur, Contrast,
  Brightness, Saturation, Hue, Gamma, Vibrance,
  Film, Camera, Video, Image, Type, Music, Mic
} from 'lucide-react';
import { Button, Card } from '../ui';

const EFFECT_CATEGORIES = {
  COLOR: {
    name: 'Color & Grading',
    icon: Palette,
    effects: {
      COLOR_BALANCE: {
        name: 'Color Balance',
        description: 'Adjust color temperature and tint',
        params: {
          temperature: 0,
          tint: 0,
          shadows: 0,
          midtones: 0,
          highlights: 0
        }
      },
      HUE_SATURATION: {
        name: 'Hue/Saturation',
        description: 'Modify hue, saturation, and lightness',
        params: {
          hue: 0,
          saturation: 0,
          lightness: 0,
          colorize: false,
          colorizeHue: 0,
          colorizeSaturation: 25
        }
      },
      CURVES: {
        name: 'Curves',
        description: 'Advanced tone curve adjustments',
        params: {
          channel: 'rgb',
          points: [],
          shadows: 0,
          highlights: 0
        }
      },
      LUT: {
        name: 'LUT (Color Lookup)',
        description: 'Apply color lookup tables',
        params: {
          lutFile: null,
          intensity: 1.0,
          blend: 'normal'
        }
      }
    }
  },
  BLUR: {
    name: 'Blur & Sharpen',
    icon: Focus,
    effects: {
      GAUSSIAN_BLUR: {
        name: 'Gaussian Blur',
        description: 'Smooth blur effect',
        params: {
          radius: 5,
          quality: 'high'
        }
      },
      MOTION_BLUR: {
        name: 'Motion Blur',
        description: 'Directional motion blur',
        params: {
          angle: 0,
          distance: 10,
          quality: 'high'
        }
      },
      RADIAL_BLUR: {
        name: 'Radial Blur',
        description: 'Circular blur from center',
        params: {
          centerX: 50,
          centerY: 50,
          amount: 10,
          quality: 'high'
        }
      },
      UNSHARP_MASK: {
        name: 'Unsharp Mask',
        description: 'Sharpen image details',
        params: {
          amount: 100,
          radius: 1,
          threshold: 0
        }
      }
    }
  },
  DISTORT: {
    name: 'Distortion',
    icon: Wand2,
    effects: {
      LENS_DISTORTION: {
        name: 'Lens Distortion',
        description: 'Barrel and pincushion distortion',
        params: {
          distortion: 0,
          zoom: 1,
          centerX: 50,
          centerY: 50
        }
      },
      PERSPECTIVE: {
        name: 'Perspective',
        description: '3D perspective transformation',
        params: {
          topLeft: { x: 0, y: 0 },
          topRight: { x: 100, y: 0 },
          bottomLeft: { x: 0, y: 100 },
          bottomRight: { x: 100, y: 100 }
        }
      },
      RIPPLE: {
        name: 'Ripple',
        description: 'Water ripple effect',
        params: {
          amplitude: 10,
          frequency: 5,
          phase: 0,
          centerX: 50,
          centerY: 50
        }
      },
      TWIRL: {
        name: 'Twirl',
        description: 'Spiral twirl distortion',
        params: {
          angle: 90,
          radius: 100,
          centerX: 50,
          centerY: 50
        }
      }
    }
  },
  STYLIZE: {
    name: 'Stylize',
    icon: Star,
    effects: {
      EMBOSS: {
        name: 'Emboss',
        description: '3D embossed look',
        params: {
          angle: 135,
          height: 3,
          amount: 100
        }
      },
      EDGE_DETECT: {
        name: 'Edge Detection',
        description: 'Highlight edges',
        params: {
          threshold: 50,
          invert: false,
          colorize: false
        }
      },
      POSTERIZE: {
        name: 'Posterize',
        description: 'Reduce color levels',
        params: {
          levels: 8,
          dither: false
        }
      },
      SOLARIZE: {
        name: 'Solarize',
        description: 'Invert bright areas',
        params: {
          threshold: 128,
          invert: false
        }
      }
    }
  },
  NOISE: {
    name: 'Noise & Grain',
    icon: Droplets,
    effects: {
      FILM_GRAIN: {
        name: 'Film Grain',
        description: 'Vintage film texture',
        params: {
          amount: 25,
          size: 1,
          roughness: 50,
          color: false
        }
      },
      NOISE: {
        name: 'Noise',
        description: 'Random noise pattern',
        params: {
          amount: 10,
          distribution: 'uniform',
          monochromatic: false
        }
      },
      DUST_SCRATCHES: {
        name: 'Dust & Scratches',
        description: 'Remove dust and scratches',
        params: {
          radius: 2,
          threshold: 10
        }
      }
    }
  },
  LIGHTING: {
    name: 'Lighting',
    icon: Sun,
    effects: {
      LENS_FLARE: {
        name: 'Lens Flare',
        description: 'Camera lens flare effect',
        params: {
          centerX: 50,
          centerY: 50,
          brightness: 100,
          flareType: 'standard',
          color: '#ffffff'
        }
      },
      GLOW: {
        name: 'Glow',
        description: 'Soft glow effect',
        params: {
          radius: 10,
          intensity: 50,
          threshold: 50,
          color: '#ffffff'
        }
      },
      VIGNETTE: {
        name: 'Vignette',
        description: 'Darken edges',
        params: {
          amount: 50,
          midpoint: 50,
          roundness: 50,
          feather: 50
        }
      }
    }
  }
};

const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light',
  'color-dodge', 'color-burn', 'darken', 'lighten', 'difference', 'exclusion'
];

const EffectsPanel = ({
  selectedClip = null,
  onApplyEffect,
  onRemoveEffect,
  onSavePreset,
  className = ''
}) => {
  const [activeCategory, setActiveCategory] = useState('COLOR');
  const [appliedEffects, setAppliedEffects] = useState([]);
  const [selectedEffect, setSelectedEffect] = useState(null);
  const [effectParams, setEffectParams] = useState({});
  const [showPreview, setShowPreview] = useState(true);
  const [customPresets, setCustomPresets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedEffect, setDraggedEffect] = useState(null);
  
  // Apply effect to selected clip
  const applyEffect = useCallback(async (categoryKey, effectKey, params) => {
    if (!selectedClip) return;
    
    const effectId = `${categoryKey}_${effectKey}_${Date.now()}`;
    const newEffect = {
      id: effectId,
      category: categoryKey,
      type: effectKey,
      name: EFFECT_CATEGORIES[categoryKey].effects[effectKey].name,
      params: { ...params },
      enabled: true,
      opacity: 100,
      blendMode: 'normal'
    };
    
    // For video clips, use backend API
    if (selectedClip.type === 'video') {
      try {
        const response = await fetch('/api/video-edit/apply-effect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoPath: selectedClip.src,
            effect: {
              id: effectKey,
              name: newEffect.name,
              parameters: params,
            },
            outputPath: `processed_${Date.now()}_${selectedClip.name}`,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to apply effect');
        }

        const result = await response.json();
        
        // Update clip with processed video
        const updatedClip = {
          ...selectedClip,
          src: result.outputPath,
          effects: [...(selectedClip.effects || []), newEffect],
        };
        
        if (onApplyEffect) {
          onApplyEffect(updatedClip.id, newEffect, updatedClip);
        }
      } catch (error) {
        console.error('Error applying effect:', error);
        // Fallback to local application
        if (onApplyEffect) {
          onApplyEffect(selectedClip.id, newEffect);
        }
      }
    } else {
      // For non-video clips, apply locally
      if (onApplyEffect) {
        onApplyEffect(selectedClip.id, newEffect);
      }
    }
    
    setAppliedEffects(prev => [...prev, newEffect]);
  }, [selectedClip, onApplyEffect]);
  
  // Remove effect
  const removeEffect = useCallback((effectId) => {
    setAppliedEffects(prev => prev.filter(effect => effect.id !== effectId));
    
    if (onRemoveEffect) {
      onRemoveEffect(selectedClip?.id, effectId);
    }
  }, [selectedClip, onRemoveEffect]);
  
  // Update effect parameters
  const updateEffectParam = useCallback((effectId, paramKey, value) => {
    setAppliedEffects(prev => prev.map(effect => 
      effect.id === effectId 
        ? { ...effect, params: { ...effect.params, [paramKey]: value } }
        : effect
    ));
  }, []);
  
  // Toggle effect enabled state
  const toggleEffect = useCallback((effectId) => {
    setAppliedEffects(prev => prev.map(effect => 
      effect.id === effectId 
        ? { ...effect, enabled: !effect.enabled }
        : effect
    ));
  }, []);
  
  // Render parameter control
  const renderParamControl = (effectId, paramKey, paramValue, paramConfig = {}) => {
    const { min = 0, max = 100, step = 1, type = 'range', options = [] } = paramConfig;
    
    if (type === 'boolean') {
      return (
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300 capitalize">{paramKey.replace(/([A-Z])/g, ' $1')}</label>
          <Button
            size="sm"
            variant={paramValue ? "default" : "ghost"}
            onClick={() => updateEffectParam(effectId, paramKey, !paramValue)}
            className="text-xs"
          >
            {paramValue ? 'ON' : 'OFF'}
          </Button>
        </div>
      );
    }
    
    if (type === 'select') {
      return (
        <div className="space-y-2">
          <label className="text-sm text-gray-300 capitalize">{paramKey.replace(/([A-Z])/g, ' $1')}</label>
          <select
            value={paramValue}
            onChange={(e) => updateEffectParam(effectId, paramKey, e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm"
          >
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      );
    }
    
    if (type === 'color') {
      return (
        <div className="space-y-2">
          <label className="text-sm text-gray-300 capitalize">{paramKey.replace(/([A-Z])/g, ' $1')}</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={paramValue}
              onChange={(e) => updateEffectParam(effectId, paramKey, e.target.value)}
              className="w-8 h-8 rounded border border-gray-600 bg-gray-700"
            />
            <input
              type="text"
              value={paramValue}
              onChange={(e) => updateEffectParam(effectId, paramKey, e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            />
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300 capitalize">{paramKey.replace(/([A-Z])/g, ' $1')}</label>
          <span className="text-xs text-gray-400">{paramValue}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={paramValue}
          onChange={(e) => updateEffectParam(effectId, paramKey, parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    );
  };
  
  // Render effect item
  const renderEffectItem = (categoryKey, effectKey, effect) => {
    return (
      <motion.div
        key={effectKey}
        className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 hover:border-gray-600/50 cursor-pointer transition-all"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        draggable
        onDragStart={() => setDraggedEffect({ categoryKey, effectKey, effect })}
        onClick={() => applyEffect(categoryKey, effectKey, effect.params)}
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-white">{effect.name}</h4>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              applyEffect(categoryKey, effectKey, effect.params);
            }}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        <p className="text-xs text-gray-400">{effect.description}</p>
      </motion.div>
    );
  };
  
  // Render applied effects list
  const renderAppliedEffects = () => {
    if (appliedEffects.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No effects applied</p>
          <p className="text-xs">Drag effects here or click to apply</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {appliedEffects.map((effect, index) => (
          <motion.div
            key={effect.id}
            className={`bg-gray-800/70 rounded-lg p-3 border ${
              effect.enabled ? 'border-blue-500/50' : 'border-gray-700/50'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant={effect.enabled ? "default" : "ghost"}
                  onClick={() => toggleEffect(effect.id)}
                  className="text-xs"
                >
                  {effect.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </Button>
                <span className="text-sm font-medium text-white">{effect.name}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedEffect(selectedEffect === effect.id ? null : effect.id)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  <Settings className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeEffect(effect.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            {/* Effect controls */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-400">Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={effect.opacity}
                  onChange={(e) => updateEffectParam(effect.id, 'opacity', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-400 text-center">{effect.opacity}%</div>
              </div>
              
              <div>
                <label className="text-xs text-gray-400">Blend Mode</label>
                <select
                  value={effect.blendMode}
                  onChange={(e) => updateEffectParam(effect.id, 'blendMode', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                >
                  {BLEND_MODES.map(mode => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Parameter controls */}
            <AnimatePresence>
              {selectedEffect === effect.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 pt-3 border-t border-gray-700/50"
                >
                  {Object.entries(effect.params).map(([paramKey, paramValue]) => (
                    <div key={paramKey}>
                      {renderParamControl(effect.id, paramKey, paramValue, {
                        min: paramKey.includes('angle') ? -180 : paramKey.includes('percent') || paramKey.includes('opacity') ? 0 : -100,
                        max: paramKey.includes('angle') ? 180 : 100,
                        step: paramKey.includes('angle') ? 1 : 0.1,
                        type: typeof paramValue === 'boolean' ? 'boolean' : 
                              paramKey.includes('color') ? 'color' :
                              paramKey.includes('mode') || paramKey.includes('type') ? 'select' : 'range',
                        options: paramKey.includes('blend') ? BLEND_MODES : 
                                paramKey.includes('distribution') ? ['uniform', 'gaussian'] :
                                paramKey.includes('quality') ? ['low', 'medium', 'high'] : []
                      })}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    );
  };
  
  // Filter effects based on search
  const filteredEffects = Object.entries(EFFECT_CATEGORIES[activeCategory].effects).filter(
    ([key, effect]) => 
      effect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      effect.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className={`bg-gray-900/95 border border-gray-700/50 rounded-lg backdrop-blur-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Effects & Filters</h3>
              <p className="text-sm text-gray-400">
                {selectedClip ? `Editing: ${selectedClip.name}` : 'Select a clip to apply effects'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPreview(!showPreview)}
              className={showPreview ? 'text-blue-400' : 'text-gray-400'}
            >
              <Eye className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="mt-4">
          <input
            type="text"
            placeholder="Search effects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 text-sm"
          />
        </div>
      </div>
      
      <div className="flex h-96">
        {/* Categories sidebar */}
        <div className="w-48 border-r border-gray-700/50 bg-gray-800/30">
          <div className="p-3">
            <h4 className="text-sm font-medium text-white mb-3">Categories</h4>
            <div className="space-y-1">
              {Object.entries(EFFECT_CATEGORIES).map(([key, category]) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={key}
                    variant={activeCategory === key ? "default" : "ghost"}
                    onClick={() => setActiveCategory(key)}
                    className="w-full justify-start text-xs"
                  >
                    <Icon className="w-3 h-3 mr-2" />
                    {category.name}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Effects grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {filteredEffects.map(([effectKey, effect]) => 
              renderEffectItem(activeCategory, effectKey, effect)
            )}
          </div>
          
          {filteredEffects.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No effects found</p>
              <p className="text-xs">Try a different search term</p>
            </div>
          )}
        </div>
        
        {/* Applied effects panel */}
        <div className="w-80 border-l border-gray-700/50 bg-gray-800/30">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Applied Effects</h4>
              <span className="text-xs text-gray-400">{appliedEffects.length} effects</span>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {renderAppliedEffects()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-700/50 bg-gray-800/30">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setAppliedEffects([])}
            className="text-gray-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Clear All
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => {
                const presetName = prompt('Enter preset name:');
                if (presetName) {
                  const newPreset = {
                    id: Date.now(),
                    name: presetName,
                    effects: [...appliedEffects]
                  };
                  setCustomPresets(prev => [...prev, newPreset]);
                  if (onSavePreset) onSavePreset(newPreset);
                }
              }}
              className="text-gray-400 hover:text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Preset
            </Button>
            
            <Button
              disabled={!selectedClip || appliedEffects.length === 0}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 mr-2" />
              Apply All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EffectsPanel;