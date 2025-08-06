import React, { useState, useMemo } from 'react';
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
  X
} from 'lucide-react';
import { Button, Input, Card } from '../ui';

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
  }
];

const EffectsLibrary = ({
  onEffectSelect,
  onEffectApply,
  selectedClip = null,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [effectParameters, setEffectParameters] = useState({});
  
  const filteredEffects = useMemo(() => {
    return EFFECTS_DATA.filter(effect => {
      const matchesSearch = effect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           effect.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || effect.category === selectedCategory;
      const matchesPremium = !showPremiumOnly || effect.premium;
      
      return matchesSearch && matchesCategory && matchesPremium;
    });
  }, [searchTerm, selectedCategory, showPremiumOnly]);
  
  const categories = Object.values(EFFECT_CATEGORIES);
  
  const toggleFavorite = (effectId) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(effectId)) {
        newFavorites.delete(effectId);
      } else {
        newFavorites.add(effectId);
      }
      return newFavorites;
    });
  };
  
  const handleEffectSelect = (effect) => {
    setSelectedEffect(effect);
    
    // Initialize parameters with default values
    const params = {};
    effect.parameters.forEach(param => {
      params[param.name] = param.default;
    });
    setEffectParameters(params);
    
    onEffectSelect?.(effect);
  };
  
  const handleParameterChange = (paramName, value) => {
    setEffectParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };
  
  const handleApplyEffect = () => {
    if (selectedEffect && selectedClip) {
      onEffectApply?.({
        effect: selectedEffect,
        parameters: effectParameters,
        clipId: selectedClip.id
      });
    }
  };
  
  const renderParameterControl = (param) => {
    const value = effectParameters[param.name] || param.default;
    
    switch (param.type) {
      case 'slider':
        return (
          <div key={param.name} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-300 capitalize">
                {param.name.replace(/([A-Z])/g, ' $1')}
              </label>
              <span className="text-xs text-gray-400">{value}</span>
            </div>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step || (param.max - param.min) / 100}
              value={value}
              onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        );
        
      case 'select':
        return (
          <div key={param.name} className="space-y-2">
            <label className="text-sm font-medium text-gray-300 capitalize">
              {param.name.replace(/([A-Z])/g, ' $1')}
            </label>
            <select
              value={value}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {param.options.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );
        
      case 'color':
        return (
          <div key={param.name} className="space-y-2">
            <label className="text-sm font-medium text-gray-300 capitalize">
              {param.name.replace(/([A-Z])/g, ' $1')}
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={value}
                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                className="w-8 h-8 rounded border border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Effects Library</h3>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={previewMode ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className="text-white"
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPremiumOnly(!showPremiumOnly)}
              className={`text-white ${showPremiumOnly ? 'bg-yellow-600' : ''}`}
            >
              <Star className="w-4 h-4 mr-1" />
              Premium
            </Button>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search effects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <div className="flex items-center space-x-2 overflow-x-auto pt-2 pb-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-all duration-200 ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-foreground border border-pink-500/30'
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
                    ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-foreground border border-pink-500/30'
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
        {/* Effects Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredEffects.map(effect => {
              const Icon = effect.icon;
              const isFavorite = favorites.has(effect.id);
              const isSelected = selectedEffect?.id === effect.id;
              
              return (
                <motion.div
                  key={effect.id}
                  className={`relative bg-gray-800 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    isSelected ? 'border-blue-500' : 'border-transparent hover:border-gray-600'
                  }`}
                  onClick={() => handleEffectSelect(effect)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Preview Image */}
                  <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
                    <Icon className="w-8 h-8 text-blue-400 z-10" />
                    
                    {/* Premium Badge */}
                    {effect.premium && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold">
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
                        isFavorite ? 'bg-yellow-500 text-black' : 'bg-black bg-opacity-50 text-white'
                      }`}
                    >
                      <Star className="w-3 h-3" fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  
                  {/* Effect Info */}
                  <div className="p-3">
                    <h4 className="text-white font-medium text-sm mb-1">{effect.name}</h4>
                    <p className="text-gray-400 text-xs line-clamp-2">{effect.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          {filteredEffects.length === 0 && (
            <div className="text-center py-12">
              <Wand2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No effects found matching your criteria</p>
            </div>
          )}
        </div>
        
        {/* Effect Controls Panel */}
        {selectedEffect && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Effect Header */}
              <div className="border-b border-gray-700 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <selectedEffect.icon className="w-6 h-6 text-blue-400" />
                    <div>
                      <h4 className="text-white font-semibold">{selectedEffect.name}</h4>
                      <p className="text-gray-400 text-sm">{selectedEffect.category}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEffect(null)}
                    className="p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-gray-300 text-sm">{selectedEffect.description}</p>
              </div>
              
              {/* Parameters */}
              <div className="space-y-4">
                <h5 className="text-white font-medium">Parameters</h5>
                {selectedEffect.parameters.map(renderParameterControl)}
              </div>
              
              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-gray-700">
                <Button
                  onClick={handleApplyEffect}
                  disabled={!selectedClip}
                  className="w-full"
                >
                  Apply Effect
                </Button>
                
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-white"
                    onClick={() => {
                      // Reset parameters to defaults
                      const params = {};
                      selectedEffect.parameters.forEach(param => {
                        params[param.name] = param.default;
                      });
                      setEffectParameters(params);
                    }}
                  >
                    Reset
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-white"
                    onClick={() => {
                      // Save as preset
                      console.log('Save preset:', { effect: selectedEffect, parameters: effectParameters });
                    }}
                  >
                    Save Preset
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