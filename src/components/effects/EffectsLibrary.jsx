import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Star,
  Download,
  Eye,
  Palette,
  Zap,
  Layers,
  Volume2,
  Sparkles,
  Wind,
  Sun,
  Moon,
  Droplets,
  Flame,
  Snowflake,
  Heart,
  Camera,
  Film,
  Aperture,
  Focus,
  Contrast,
  // Brightness4, // Not available in lucide-react
  // Blur, // Not available in lucide-react
  Crop,
  RotateCw,
  Move,
  Scale,
  Scissors,
  Copy,
  Settings,
  ChevronDown,
  Grid3X3,
  Wand2,
  Paintbrush,
  Eraser,
  Pipette,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Play,
  Pause,
  X,
  RotateCcw,
  Save,
  Upload,
  List,
  Sliders,
  Clock,
  Bookmark,
  ChevronUp,
  Info,
  AlertCircle,
  CheckCircle,
  Music,
  Type
} from 'lucide-react';
import { Button, Input, Card } from '../ui';
import { useHotkeys } from 'react-hotkeys-hook';

const EFFECT_CATEGORIES = {
  COLOR: 'Color & Grading',
  BLUR: 'Blur & Focus',
  DISTORTION: 'Distortion',
  STYLIZE: 'Stylize',
  TRANSITION: 'Transitions',
  PARTICLE: 'Particles',
  LIGHTING: 'Lighting',
  AUDIO: 'Audio Effects',
  MOTION: 'Motion Graphics',
  VINTAGE: 'Vintage & Film',
  ARTISTIC: 'Artistic',
  TECHNICAL: 'Technical'
};

const EFFECTS_DATA = [
  // Color & Grading
  {
    id: 'brightness',
    name: 'Brightness/Contrast',
    category: EFFECT_CATEGORIES.COLOR,
    icon: Sun,
    description: 'Adjust brightness and contrast levels',
    premium: false,
    preview: '/effects/brightness.jpg',
    parameters: [
      { name: 'brightness', type: 'slider', min: -100, max: 100, default: 0 },
      { name: 'contrast', type: 'slider', min: -100, max: 100, default: 0 }
    ]
  },
  {
    id: 'color-correction',
    name: 'Color Correction',
    category: EFFECT_CATEGORIES.COLOR,
    icon: Palette,
    description: 'Professional color grading tools',
    premium: true,
    preview: '/effects/color-correction.jpg',
    parameters: [
      { name: 'temperature', type: 'slider', min: -100, max: 100, default: 0 },
      { name: 'tint', type: 'slider', min: -100, max: 100, default: 0 },
      { name: 'saturation', type: 'slider', min: -100, max: 100, default: 0 },
      { name: 'vibrance', type: 'slider', min: -100, max: 100, default: 0 }
    ]
  },
  {
    id: 'lut-filter',
    name: 'LUT Filter',
    category: EFFECT_CATEGORIES.COLOR,
    icon: Film,
    description: 'Apply cinematic color lookup tables',
    premium: true,
    preview: '/effects/lut-filter.jpg',
    parameters: [
      { name: 'lut', type: 'select', options: ['Cinematic', 'Warm', 'Cool', 'Vintage', 'Dramatic'], default: 'Cinematic' },
      { name: 'intensity', type: 'slider', min: 0, max: 100, default: 100 }
    ]
  },
  
  // Blur & Focus
  {
    id: 'gaussian-blur',
    name: 'Gaussian Blur',
    category: EFFECT_CATEGORIES.BLUR,
    icon: Focus,
    description: 'Smooth blur effect',
    premium: false,
    preview: '/effects/gaussian-blur.jpg',
    parameters: [
      { name: 'radius', type: 'slider', min: 0, max: 50, default: 5 }
    ]
  },
  {
    id: 'motion-blur',
    name: 'Motion Blur',
    category: EFFECT_CATEGORIES.BLUR,
    icon: Wind,
    description: 'Directional motion blur',
    premium: false,
    preview: '/effects/motion-blur.jpg',
    parameters: [
      { name: 'angle', type: 'slider', min: 0, max: 360, default: 0 },
      { name: 'distance', type: 'slider', min: 0, max: 100, default: 10 }
    ]
  },
  {
    id: 'depth-of-field',
    name: 'Depth of Field',
    category: EFFECT_CATEGORIES.BLUR,
    icon: Focus,
    description: 'Realistic camera focus effect',
    premium: true,
    preview: '/effects/depth-of-field.jpg',
    parameters: [
      { name: 'focusDistance', type: 'slider', min: 0, max: 100, default: 50 },
      { name: 'aperture', type: 'slider', min: 1.4, max: 22, default: 2.8 },
      { name: 'bokehShape', type: 'select', options: ['Circle', 'Hexagon', 'Octagon'], default: 'Circle' }
    ]
  },
  
  // Transitions
  {
    id: 'cross-dissolve',
    name: 'Cross Dissolve',
    category: EFFECT_CATEGORIES.TRANSITION,
    icon: Layers,
    description: 'Smooth fade transition',
    premium: false,
    preview: '/effects/cross-dissolve.jpg',
    parameters: [
      { name: 'duration', type: 'slider', min: 0.1, max: 5, default: 1 }
    ]
  },
  {
    id: 'wipe-transition',
    name: 'Wipe Transition',
    category: EFFECT_CATEGORIES.TRANSITION,
    icon: Scissors,
    description: 'Directional wipe effect',
    premium: false,
    preview: '/effects/wipe-transition.jpg',
    parameters: [
      { name: 'direction', type: 'select', options: ['Left to Right', 'Right to Left', 'Top to Bottom', 'Bottom to Top'], default: 'Left to Right' },
      { name: 'feather', type: 'slider', min: 0, max: 100, default: 10 }
    ]
  },
  {
    id: 'zoom-transition',
    name: 'Zoom Transition',
    category: EFFECT_CATEGORIES.TRANSITION,
    icon: Scale,
    description: 'Dynamic zoom transition',
    premium: true,
    preview: '/effects/zoom-transition.jpg',
    parameters: [
      { name: 'zoomType', type: 'select', options: ['Zoom In', 'Zoom Out', 'Zoom In/Out'], default: 'Zoom In' },
      { name: 'centerX', type: 'slider', min: 0, max: 100, default: 50 },
      { name: 'centerY', type: 'slider', min: 0, max: 100, default: 50 }
    ]
  },
  
  // Particles
  {
    id: 'snow',
    name: 'Snow',
    category: EFFECT_CATEGORIES.PARTICLE,
    icon: Snowflake,
    description: 'Realistic snow particles',
    premium: false,
    preview: '/effects/snow.jpg',
    parameters: [
      { name: 'density', type: 'slider', min: 0, max: 100, default: 50 },
      { name: 'size', type: 'slider', min: 1, max: 10, default: 3 },
      { name: 'speed', type: 'slider', min: 0, max: 100, default: 30 }
    ]
  },
  {
    id: 'fire',
    name: 'Fire',
    category: EFFECT_CATEGORIES.PARTICLE,
    icon: Flame,
    description: 'Dynamic fire effect',
    premium: true,
    preview: '/effects/fire.jpg',
    parameters: [
      { name: 'intensity', type: 'slider', min: 0, max: 100, default: 70 },
      { name: 'height', type: 'slider', min: 10, max: 100, default: 50 },
      { name: 'color', type: 'color', default: '#ff4500' }
    ]
  },
  {
    id: 'sparkles',
    name: 'Sparkles',
    category: EFFECT_CATEGORIES.PARTICLE,
    icon: Sparkles,
    description: 'Magical sparkle particles',
    premium: false,
    preview: '/effects/sparkles.jpg',
    parameters: [
      { name: 'count', type: 'slider', min: 10, max: 200, default: 50 },
      { name: 'size', type: 'slider', min: 1, max: 20, default: 5 },
      { name: 'lifetime', type: 'slider', min: 0.5, max: 5, default: 2 }
    ]
  },
  
  // Lighting
  {
    id: 'lens-flare',
    name: 'Lens Flare',
    category: EFFECT_CATEGORIES.LIGHTING,
    icon: Sun,
    description: 'Cinematic lens flare effect',
    premium: true,
    preview: '/effects/lens-flare.jpg',
    parameters: [
      { name: 'intensity', type: 'slider', min: 0, max: 100, default: 50 },
      { name: 'x', type: 'slider', min: 0, max: 100, default: 50 },
      { name: 'y', type: 'slider', min: 0, max: 100, default: 50 },
      { name: 'color', type: 'color', default: '#ffffff' }
    ]
  },
  {
    id: 'light-rays',
    name: 'Light Rays',
    category: EFFECT_CATEGORIES.LIGHTING,
    icon: Sun,
    description: 'Volumetric light rays',
    premium: true,
    preview: '/effects/light-rays.jpg',
    parameters: [
      { name: 'angle', type: 'slider', min: 0, max: 360, default: 45 },
      { name: 'intensity', type: 'slider', min: 0, max: 100, default: 30 },
      { name: 'rayCount', type: 'slider', min: 5, max: 50, default: 20 }
    ]
  },
  
  // Stylize
  {
    id: 'cartoon',
    name: 'Cartoon',
    category: EFFECT_CATEGORIES.STYLIZE,
    icon: Paintbrush,
    description: 'Cartoon-style effect',
    premium: false,
    preview: '/effects/cartoon.jpg',
    parameters: [
      { name: 'edgeThreshold', type: 'slider', min: 0, max: 100, default: 50 },
      { name: 'colorReduction', type: 'slider', min: 2, max: 32, default: 8 }
    ]
  },
  {
    id: 'oil-painting',
    name: 'Oil Painting',
    category: EFFECT_CATEGORIES.STYLIZE,
    icon: Paintbrush,
    description: 'Oil painting artistic effect',
    premium: true,
    preview: '/effects/oil-painting.jpg',
    parameters: [
      { name: 'brushSize', type: 'slider', min: 1, max: 20, default: 5 },
      { name: 'detail', type: 'slider', min: 0, max: 100, default: 70 }
    ]
  },
  
  // Audio Effects
  {
    id: 'reverb',
    name: 'Reverb',
    category: EFFECT_CATEGORIES.AUDIO,
    icon: Volume2,
    description: 'Add spatial reverb',
    premium: false,
    preview: '/effects/reverb.jpg',
    parameters: [
      { name: 'roomSize', type: 'slider', min: 0, max: 100, default: 50 },
      { name: 'damping', type: 'slider', min: 0, max: 100, default: 50 },
      { name: 'wetLevel', type: 'slider', min: 0, max: 100, default: 30 }
    ]
  },
  {
    id: 'echo',
    name: 'Echo',
    category: EFFECT_CATEGORIES.AUDIO,
    icon: Volume2,
    description: 'Echo delay effect',
    premium: false,
    preview: '/effects/echo.jpg',
    parameters: [
      { name: 'delay', type: 'slider', min: 0, max: 2000, default: 500 },
      { name: 'feedback', type: 'slider', min: 0, max: 95, default: 30 },
      { name: 'mix', type: 'slider', min: 0, max: 100, default: 25 }
    ]
  },
  // Enhanced MVP Effects
  {
    id: 'noise-reduction',
    name: 'Noise Reduction',
    category: EFFECT_CATEGORIES.AUDIO,
    icon: Volume2,
    description: 'AI-powered noise reduction',
    premium: true,
    preview: '/effects/noise-reduction.jpg',
    parameters: [
      { name: 'strength', type: 'slider', min: 0, max: 100, default: 50 },
      { name: 'preserveVoice', type: 'toggle', default: true }
    ]
  },
  {
    id: 'equalizer',
    name: 'Equalizer',
    category: EFFECT_CATEGORIES.AUDIO,
    icon: Sliders,
    description: 'Professional audio EQ',
    premium: false,
    preview: '/effects/equalizer.jpg',
    parameters: [
      { name: 'bass', type: 'slider', min: -20, max: 20, default: 0 },
      { name: 'mid', type: 'slider', min: -20, max: 20, default: 0 },
      { name: 'treble', type: 'slider', min: -20, max: 20, default: 0 }
    ]
  },
  {
    id: 'beat-sync',
    name: 'Beat Sync',
    category: EFFECT_CATEGORIES.AUDIO,
    icon: Music,
    description: 'Sync effects to music beat',
    premium: true,
    preview: '/effects/beat-sync.jpg',
    parameters: [
      { name: 'sensitivity', type: 'slider', min: 0, max: 100, default: 70 },
      { name: 'effect', type: 'select', options: ['Flash', 'Zoom', 'Color'], default: 'Flash' }
    ]
  },
  {
    id: 'chroma-key',
    name: 'Chroma Key',
    category: EFFECT_CATEGORIES.TECHNICAL,
    icon: Pipette,
    description: 'Green screen removal',
    premium: false,
    preview: '/effects/chroma-key.jpg',
    parameters: [
      { name: 'keyColor', type: 'color', default: '#00ff00' },
      { name: 'tolerance', type: 'slider', min: 0, max: 100, default: 20 },
      { name: 'softness', type: 'slider', min: 0, max: 100, default: 10 }
    ]
  },
  {
    id: 'stabilization',
    name: 'Video Stabilization',
    category: EFFECT_CATEGORIES.TECHNICAL,
    icon: Move,
    description: 'Reduce camera shake',
    premium: true,
    preview: '/effects/stabilization.jpg',
    parameters: [
      { name: 'strength', type: 'slider', min: 0, max: 100, default: 50 },
      { name: 'cropMode', type: 'select', options: ['Auto', 'Manual'], default: 'Auto' }
    ]
  },
  {
    id: 'speed-ramp',
    name: 'Speed Ramping',
    category: EFFECT_CATEGORIES.MOTION,
    icon: Zap,
    description: 'Dynamic speed changes',
    premium: true,
    preview: '/effects/speed-ramp.jpg',
    parameters: [
      { name: 'startSpeed', type: 'slider', min: 0.1, max: 5, default: 1 },
      { name: 'endSpeed', type: 'slider', min: 0.1, max: 5, default: 1 },
      { name: 'curve', type: 'select', options: ['Linear', 'Ease In', 'Ease Out', 'Ease In/Out'], default: 'Ease In/Out' }
    ]
  },
  {
    id: 'text-animation',
    name: 'Text Animation',
    category: EFFECT_CATEGORIES.MOTION,
    icon: Type,
    description: 'Animated text presets',
    premium: false,
    preview: '/effects/text-animation.jpg',
    parameters: [
      { name: 'animation', type: 'select', options: ['Fade In', 'Slide In', 'Typewriter', 'Bounce'], default: 'Fade In' },
      { name: 'duration', type: 'slider', min: 0.5, max: 5, default: 1 }
    ]
  }
];

const EffectsLibrary = ({
  onEffectSelect,
  onEffectApply,
  selectedClip = null,
  className = '',
  onPreview,
  realTimePreview = true,
  showPresets = true,
  compact = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [effectParameters, setEffectParameters] = useState({});
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'category', 'popularity'
  const [presets, setPresets] = useState([]);
  const [showPresetsPanel, setShowPresetsPanel] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [recentEffects, setRecentEffects] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(new Set(['COLOR', 'BLUR']));
  const previewTimeoutRef = useRef(null);
  
  const filteredEffects = useMemo(() => {
    let effects = EFFECTS_DATA.filter(effect => {
      const matchesSearch = effect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           effect.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           effect.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || effect.category === selectedCategory;
      const matchesPremium = !showPremiumOnly || effect.premium;
      
      return matchesSearch && matchesCategory && matchesPremium;
    });
    
    // Sort effects
    effects.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'popularity':
          return (favorites.has(b.id) ? 1 : 0) - (favorites.has(a.id) ? 1 : 0);
        default:
          return 0;
      }
    });
    
    return effects;
  }, [searchTerm, selectedCategory, showPremiumOnly, sortBy, favorites]);
  
  const categories = Object.values(EFFECT_CATEGORIES);
  
  const handleEffectSelect = useCallback((effect) => {
    setSelectedEffect(effect);
    
    // Initialize parameters with defaults
    const params = {};
    effect.parameters.forEach(param => {
      params[param.name] = param.default;
    });
    setEffectParameters(params);
    
    // Add to recent effects
    setRecentEffects(prev => {
      const filtered = prev.filter(id => id !== effect.id);
      return [effect.id, ...filtered].slice(0, 5);
    });
    
    onEffectSelect?.(effect);
  }, [onEffectSelect]);
  
  const handleParameterChange = useCallback((paramName, value) => {
    setEffectParameters(prev => {
      const newParams = {
        ...prev,
        [paramName]: value
      };
      
      // Real-time preview with debouncing
      if (realTimePreview && selectedEffect && onPreview) {
        if (previewTimeoutRef.current) {
          clearTimeout(previewTimeoutRef.current);
        }
        previewTimeoutRef.current = setTimeout(() => {
          onPreview({
            effect: selectedEffect,
            parameters: newParams,
            clipId: selectedClip?.id
          });
        }, 300);
      }
      
      return newParams;
    });
  }, [realTimePreview, selectedEffect, onPreview, selectedClip]);
  
  const handleApplyEffect = useCallback(async () => {
    if (selectedEffect && selectedClip) {
      setIsApplying(true);
      try {
        await onEffectApply?.({
          effect: selectedEffect,
          parameters: effectParameters,
          clipId: selectedClip.id
        });
      } finally {
        setIsApplying(false);
      }
    }
  }, [selectedEffect, selectedClip, effectParameters, onEffectApply]);
  
  const toggleFavorite = useCallback((effectId) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(effectId)) {
        newFavorites.delete(effectId);
      } else {
        newFavorites.add(effectId);
      }
      return newFavorites;
    });
  }, []);
  
  const savePreset = useCallback(() => {
    if (selectedEffect && effectParameters) {
      const preset = {
        id: Date.now().toString(),
        name: `${selectedEffect.name} Preset`,
        effectId: selectedEffect.id,
        parameters: { ...effectParameters },
        createdAt: new Date().toISOString()
      };
      setPresets(prev => [preset, ...prev]);
    }
  }, [selectedEffect, effectParameters]);
  
  const loadPreset = useCallback((preset) => {
    const effect = EFFECTS_DATA.find(e => e.id === preset.effectId);
    if (effect) {
      setSelectedEffect(effect);
      setEffectParameters(preset.parameters);
    }
  }, []);
  
  const resetParameters = useCallback(() => {
    if (selectedEffect) {
      const params = {};
      selectedEffect.parameters.forEach(param => {
        params[param.name] = param.default;
      });
      setEffectParameters(params);
    }
  }, [selectedEffect]);
  
  // Keyboard shortcuts
  useHotkeys('ctrl+shift+e', () => {
    if (selectedEffect && selectedClip) {
      handleApplyEffect();
    }
  });
  
  useHotkeys('ctrl+shift+r', () => {
    resetParameters();
  });
  
  useHotkeys('ctrl+shift+s', () => {
    savePreset();
  });
  
  // Cleanup preview timeout
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);
  
  const renderParameterControl = (param) => {
    const value = effectParameters[param.name] || param.default;
    
    switch (param.type) {
      case 'slider':
        return (
          <div key={param.name} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-foreground capitalize">
                {param.name.replace(/([A-Z])/g, ' $1')}
              </label>
              <span className="text-xs text-muted-foreground">{value}</span>
            </div>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step || (param.max - param.min) / 100}
              value={value}
              onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        );
        
      case 'select':
        return (
          <div key={param.name} className="space-y-2">
            <label className="text-sm font-medium text-foreground capitalize">
              {param.name.replace(/([A-Z])/g, ' $1')}
            </label>
            <select
              value={value}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {param.options.map(option => (
                <option key={option} value={option} className="text-black">{option}</option>
              ))}
            </select>
          </div>
        );
        
      case 'color':
        return (
          <div key={param.name} className="space-y-2">
            <label className="text-sm font-medium text-foreground capitalize">
              {param.name.replace(/([A-Z])/g, ' $1')}
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={value}
                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                className="flex-1 bg-card border border-border rounded px-2 py-1 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className={`bg-card border-2 border-border rounded-lg ${className}`}>
      {/* Header */}
      <div className="bg-muted border-b-2 border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-foreground">Effects Library</h3>
            {recentEffects.length > 0 && (
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{recentEffects.length} recent</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none border-0"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none border-0"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-border rounded px-2 py-1 bg-card text-foreground"
            >
              <option value="name">Sort by Name</option>
              <option value="category">Sort by Category</option>
              <option value="popularity">Sort by Popularity</option>
            </select>
            
            <Button
              variant={previewMode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className="border border-border"
              title="Toggle real-time preview"
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
            
            <Button
              variant={showPremiumOnly ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowPremiumOnly(!showPremiumOnly)}
              className="border border-border"
            >
              <Star className="w-4 h-4 mr-1" />
              Premium
            </Button>
            
            {showPresets && (
              <Button
                variant={showPresetsPanel ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowPresetsPanel(!showPresetsPanel)}
                className="border border-border"
              >
                <Bookmark className="w-4 h-4 mr-1" />
                Presets
                {presets.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                    {presets.length}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search effects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card border-border text-foreground"
            />
          </div>
          
          <div className="flex items-center space-x-2 overflow-x-auto pt-2 pb-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-all duration-200 ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-foreground border border-blue-500/30'
                  : 'bg-card text-muted-foreground hover:bg-muted border border-border'
              }`}
            >
              All
            </button> 
            
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-foreground border border-blue-500/30'
                    : 'bg-card text-muted-foreground hover:bg-muted border border-border'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex h-96">
        {/* Effects Grid/List */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Recent Effects */}
          {recentEffects.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Recently Used
              </h4>
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {recentEffects.map(effectId => {
                  const effect = EFFECTS_DATA.find(e => e.id === effectId);
                  if (!effect) return null;
                  const Icon = effect.icon;
                  return (
                    <button
                      key={effectId}
                      onClick={() => handleEffectSelect(effect)}
                      className="flex-shrink-0 p-2 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
                      title={effect.name}
                    >
                      <Icon className="w-5 h-5 text-primary" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredEffects.map(effect => {
                const Icon = effect.icon;
                const isFavorite = favorites.has(effect.id);
                const isSelected = selectedEffect?.id === effect.id;
                
                return (
                  <motion.div
                    key={effect.id}
                    className={`relative bg-card rounded-lg overflow-hidden cursor-pointer border-2 transition-all shadow-elevation-1 hover:shadow-elevation-2 ${
                      isSelected ? 'border-primary' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleEffectSelect(effect)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Preview Image */}
                    <div className="aspect-video bg-gradient-to-br from-muted to-card flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
                      <Icon className="w-8 h-8 text-primary z-10" />
                      
                      {/* Premium Badge */}
                      {effect.premium && (
                        <div className="absolute top-2 right-2 bg-warning-light text-warning-light text-xs px-2 py-1 rounded-full font-bold">
                          PRO
                        </div>
                      )}
                      
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(effect.id);
                        }}
                        className={`absolute top-2 left-2 p-1 rounded-full ${
                          isFavorite ? 'bg-warning-light text-warning-light' : 'bg-black/50 text-white'
                        }`}
                      >
                        <Star className="w-3 h-3" fill={isFavorite ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    
                    {/* Effect Info */}
                    <div className="p-3">
                      <h4 className="text-foreground font-medium text-sm mb-1">{effect.name}</h4>
                      <p className="text-muted-foreground text-xs line-clamp-2">{effect.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEffects.map(effect => {
                const Icon = effect.icon;
                const isFavorite = favorites.has(effect.id);
                const isSelected = selectedEffect?.id === effect.id;
                
                return (
                  <motion.div
                    key={effect.id}
                    className={`flex items-center p-3 bg-card rounded-lg cursor-pointer border-2 transition-all ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleEffectSelect(effect)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg mr-3">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-foreground font-medium text-sm">{effect.name}</h4>
                        {effect.premium && (
                          <span className="bg-warning-light text-warning-light text-xs px-2 py-0.5 rounded-full font-bold">
                            PRO
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">{effect.description}</p>
                      <p className="text-muted-foreground text-xs mt-1">{effect.category}</p>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(effect.id);
                      }}
                      className={`p-2 rounded-full ${
                        isFavorite ? 'bg-warning-light text-warning-light' : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
          
          {filteredEffects.length === 0 && (
            <div className="text-center py-12">
              <Wand2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No effects found matching your criteria</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setShowPremiumOnly(false);
                }}
                className="mt-2"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
        
        {/* Presets Panel */}
        {showPresetsPanel && (
          <div className="w-80 bg-muted border-l-2 border-border p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-foreground font-semibold">Effect Presets</h4>
              <button
                onClick={() => setShowPresetsPanel(false)}
                className="p-1 rounded-full hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {presets.length === 0 ? (
              <div className="text-center py-8">
                <Bookmark className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No presets saved yet</p>
                <p className="text-muted-foreground text-xs mt-1">Select an effect and save your settings</p>
              </div>
            ) : (
              <div className="space-y-2">
                {presets.map(preset => {
                  const effect = EFFECTS_DATA.find(e => e.id === preset.effectId);
                  if (!effect) return null;
                  const Icon = effect.icon;
                  
                  return (
                    <div
                      key={preset.id}
                      className="p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <Icon className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                          <h5 className="text-foreground font-medium text-sm">{preset.name}</h5>
                          <p className="text-muted-foreground text-xs">{effect.name}</p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadPreset(preset)}
                          className="flex-1 text-xs"
                        >
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPresets(prev => prev.filter(p => p.id !== preset.id));
                          }}
                          className="text-xs text-red-500 hover:text-red-600"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {/* Effect Controls Panel */}
        {selectedEffect && !showPresetsPanel && (
          <div className="w-80 bg-muted border-l-2 border-border p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Effect Header */}
              <div className="border-b-2 border-border pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <selectedEffect.icon className="w-6 h-6 text-primary" />
                    <div>
                      <h4 className="text-foreground font-semibold">{selectedEffect.name}</h4>
                      <p className="text-muted-foreground text-sm">{selectedEffect.category}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEffect(null)}
                    className="p-1 rounded-full hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-muted-foreground text-sm">{selectedEffect.description}</p>
                
                {/* Real-time Preview Indicator */}
                {realTimePreview && previewMode && (
                  <div className="flex items-center space-x-2 mt-2 p-2 bg-green-50 border border-green-200 rounded">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-700">Real-time preview active</span>
                  </div>
                )}
              </div>
              
              {/* Parameters */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-foreground font-medium">Parameters</h5>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetParameters}
                      className="text-xs"
                      title="Reset to defaults (Ctrl+Shift+R)"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={savePreset}
                      className="text-xs"
                      title="Save preset (Ctrl+Shift+S)"
                    >
                      <Save className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {selectedEffect.parameters.map(renderParameterControl)}
              </div>
              
              {/* Actions */}
              <div className="space-y-2 pt-4 border-t-2 border-border">
                <Button
                  onClick={handleApplyEffect}
                  disabled={!selectedClip || isApplying}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 hover:scale-105 transition-all duration-200 border-2 border-blue-400/30 disabled:opacity-50"
                  title="Apply effect (Ctrl+Shift+E)"
                >
                  {isApplying ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Applying...</span>
                    </div>
                  ) : (
                    'Apply Effect'
                  )}
                </Button>
                
                {!selectedClip && (
                  <div className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <span className="text-xs text-yellow-700">Select a clip to apply effects</span>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 border border-border"
                    onClick={resetParameters}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 border border-border"
                    onClick={savePreset}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EffectsLibrary;