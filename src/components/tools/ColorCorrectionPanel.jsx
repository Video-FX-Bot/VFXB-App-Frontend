import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Eye, RotateCcw, Save, Download, Upload,
  Sun, Moon, Contrast, Droplets, Thermometer,
  Sliders, Target, Zap, Sparkles, Settings,
  ChevronDown, ChevronUp, X, Plus, Minus,
  BarChart3, TrendingUp, Circle, Square
} from 'lucide-react';
import { Button, Card } from '../ui';

const COLOR_PRESETS = {
  CINEMATIC: {
    name: 'Cinematic',
    description: 'Film-like color grading',
    settings: {
      exposure: 0.2,
      contrast: 0.15,
      highlights: -0.3,
      shadows: 0.2,
      whites: 0.1,
      blacks: -0.1,
      saturation: 0.1,
      vibrance: 0.15,
      temperature: -200,
      tint: 10
    }
  },
  VINTAGE: {
    name: 'Vintage',
    description: 'Retro film look',
    settings: {
      exposure: -0.1,
      contrast: 0.2,
      highlights: -0.4,
      shadows: 0.3,
      whites: -0.2,
      blacks: 0.1,
      saturation: -0.2,
      vibrance: 0.1,
      temperature: 300,
      tint: -15
    }
  },
  BRIGHT: {
    name: 'Bright & Airy',
    description: 'Clean, bright look',
    settings: {
      exposure: 0.3,
      contrast: -0.1,
      highlights: -0.2,
      shadows: 0.4,
      whites: 0.2,
      blacks: -0.2,
      saturation: 0.05,
      vibrance: 0.2,
      temperature: 100,
      tint: 5
    }
  },
  DRAMATIC: {
    name: 'Dramatic',
    description: 'High contrast, moody',
    settings: {
      exposure: 0,
      contrast: 0.4,
      highlights: -0.5,
      shadows: -0.2,
      whites: 0.3,
      blacks: -0.3,
      saturation: 0.2,
      vibrance: 0.3,
      temperature: -100,
      tint: 0
    }
  }
};

const CURVE_TYPES = {
  RGB: 'rgb',
  RED: 'red',
  GREEN: 'green',
  BLUE: 'blue'
};

const ColorCorrectionPanel = ({
  selectedClip = null,
  onApplyCorrection,
  onSavePreset,
  className = ''
}) => {
  const [activeSection, setActiveSection] = useState('basic');
  const [colorSettings, setColorSettings] = useState({
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    saturation: 0,
    vibrance: 0,
    temperature: 0,
    tint: 0,
    hue: 0,
    luminance: 0,
    clarity: 0,
    dehaze: 0
  });
  
  const [curves, setCurves] = useState({
    [CURVE_TYPES.RGB]: [],
    [CURVE_TYPES.RED]: [],
    [CURVE_TYPES.GREEN]: [],
    [CURVE_TYPES.BLUE]: []
  });
  
  const [activeCurve, setActiveCurve] = useState(CURVE_TYPES.RGB);
  const [showPresets, setShowPresets] = useState(false);
  const [customPresets, setCustomPresets] = useState([]);
  const [beforeAfterMode, setBeforeAfterMode] = useState(false);
  
  // Apply color correction to selected clip
  const applyCorrection = useCallback(() => {
    if (selectedClip && onApplyCorrection) {
      onApplyCorrection(selectedClip.id, {
        ...colorSettings,
        curves
      });
    }
  }, [selectedClip, colorSettings, curves, onApplyCorrection]);
  
  // Reset all settings
  const resetSettings = useCallback(() => {
    setColorSettings({
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      saturation: 0,
      vibrance: 0,
      temperature: 0,
      tint: 0,
      hue: 0,
      luminance: 0,
      clarity: 0,
      dehaze: 0
    });
    setCurves({
      [CURVE_TYPES.RGB]: [],
      [CURVE_TYPES.RED]: [],
      [CURVE_TYPES.GREEN]: [],
      [CURVE_TYPES.BLUE]: []
    });
  }, []);
  
  // Apply preset
  const applyPreset = useCallback((preset) => {
    setColorSettings(preset.settings);
    setShowPresets(false);
  }, []);
  
  // Save custom preset
  const saveCustomPreset = useCallback(() => {
    const presetName = prompt('Enter preset name:');
    if (presetName) {
      const newPreset = {
        id: Date.now(),
        name: presetName,
        settings: { ...colorSettings },
        curves: { ...curves }
      };
      setCustomPresets(prev => [...prev, newPreset]);
      if (onSavePreset) {
        onSavePreset(newPreset);
      }
    }
  }, [colorSettings, curves, onSavePreset]);
  
  // Render slider control
  const renderSlider = (label, key, min = -1, max = 1, step = 0.01, unit = '') => {
    const value = colorSettings[key];
    const percentage = ((value - min) / (max - min)) * 100;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">{label}</label>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400 w-12 text-right">
              {value.toFixed(2)}{unit}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              onClick={() => setColorSettings(prev => ({ ...prev, [key]: 0 }))}
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setColorSettings(prev => ({ 
              ...prev, 
              [key]: parseFloat(e.target.value) 
            }))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #374151 0%, #374151 ${percentage}%, #6b7280 ${percentage}%, #6b7280 100%)`
            }}
          />
          <div 
            className="absolute top-0 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg pointer-events-none"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };
  
  // Render curves editor
  const renderCurvesEditor = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white">Tone Curves</h4>
          <div className="flex items-center space-x-2">
            {Object.values(CURVE_TYPES).map(type => (
              <Button
                key={type}
                size="sm"
                variant={activeCurve === type ? "default" : "ghost"}
                onClick={() => setActiveCurve(type)}
                className={`h-8 px-3 text-xs ${
                  type === CURVE_TYPES.RED ? 'text-red-400' :
                  type === CURVE_TYPES.GREEN ? 'text-green-400' :
                  type === CURVE_TYPES.BLUE ? 'text-blue-400' :
                  'text-white'
                }`}
              >
                {type.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="relative w-full h-48 bg-gray-900/50 rounded border border-gray-600">
            {/* Grid */}
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#374151" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Diagonal line */}
              <line x1="0" y1="100%" x2="100%" y2="0" stroke="#6b7280" strokeWidth="1" strokeDasharray="4,4" />
              
              {/* Curve line */}
              <path
                d="M 0 192 Q 48 144 96 96 T 192 0"
                fill="none"
                stroke={activeCurve === CURVE_TYPES.RED ? '#ef4444' :
                       activeCurve === CURVE_TYPES.GREEN ? '#10b981' :
                       activeCurve === CURVE_TYPES.BLUE ? '#3b82f6' : '#ffffff'}
                strokeWidth="2"
              />
            </svg>
            
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
              Click to add curve points
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-gray-400">Shadows</div>
            <div className="text-xs text-gray-400">Highlights</div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className={`bg-gray-900/95 border border-gray-700/50 rounded-lg backdrop-blur-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Palette className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Color Correction</h3>
              <p className="text-sm text-gray-400">
                {selectedClip ? `Editing: ${selectedClip.name}` : 'Select a clip to edit'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setBeforeAfterMode(!beforeAfterMode)}
              className={beforeAfterMode ? 'text-blue-400' : 'text-gray-400'}
            >
              <Eye className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPresets(!showPresets)}
              className="text-gray-400 hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Section tabs */}
        <div className="flex items-center space-x-1 mt-4">
          {[
            { id: 'basic', label: 'Basic', icon: Sun },
            { id: 'advanced', label: 'Advanced', icon: Sliders },
            { id: 'curves', label: 'Curves', icon: TrendingUp },
            { id: 'color', label: 'Color', icon: Palette }
          ].map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              size="sm"
              variant={activeSection === id ? "default" : "ghost"}
              onClick={() => setActiveSection(id)}
              className="text-xs"
            >
              <Icon className="w-3 h-3 mr-1" />
              {label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Presets dropdown */}
      <AnimatePresence>
        {showPresets && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-700/50 bg-gray-800/30"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-white">Presets</h4>
                <Button
                  size="sm"
                  onClick={saveCustomPreset}
                  className="text-xs bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save Current
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(COLOR_PRESETS).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="ghost"
                    onClick={() => applyPreset(preset)}
                    className="h-auto p-3 text-left flex-col items-start space-y-1 hover:bg-gray-700/50"
                  >
                    <div className="text-sm font-medium text-white">{preset.name}</div>
                    <div className="text-xs text-gray-400">{preset.description}</div>
                  </Button>
                ))}
                
                {customPresets.map(preset => (
                  <Button
                    key={preset.id}
                    variant="ghost"
                    onClick={() => applyPreset(preset)}
                    className="h-auto p-3 text-left flex-col items-start space-y-1 hover:bg-gray-700/50 border border-blue-500/30"
                  >
                    <div className="text-sm font-medium text-blue-400">{preset.name}</div>
                    <div className="text-xs text-gray-400">Custom preset</div>
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Content */}
      <div className="p-4 space-y-6 max-h-96 overflow-y-auto">
        {activeSection === 'basic' && (
          <div className="space-y-4">
            {renderSlider('Exposure', 'exposure', -2, 2)}
            {renderSlider('Contrast', 'contrast', -1, 1)}
            {renderSlider('Highlights', 'highlights', -1, 1)}
            {renderSlider('Shadows', 'shadows', -1, 1)}
            {renderSlider('Whites', 'whites', -1, 1)}
            {renderSlider('Blacks', 'blacks', -1, 1)}
          </div>
        )}
        
        {activeSection === 'advanced' && (
          <div className="space-y-4">
            {renderSlider('Saturation', 'saturation', -1, 1)}
            {renderSlider('Vibrance', 'vibrance', -1, 1)}
            {renderSlider('Clarity', 'clarity', -1, 1)}
            {renderSlider('Dehaze', 'dehaze', -1, 1)}
          </div>
        )}
        
        {activeSection === 'curves' && renderCurvesEditor()}
        
        {activeSection === 'color' && (
          <div className="space-y-4">
            {renderSlider('Temperature', 'temperature', -1000, 1000, 10, 'K')}
            {renderSlider('Tint', 'tint', -100, 100, 1)}
            {renderSlider('Hue', 'hue', -180, 180, 1, '°')}
            {renderSlider('Luminance', 'luminance', -1, 1)}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-700/50 bg-gray-800/30">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={resetSettings}
            className="text-gray-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export LUT
            </Button>
            
            <Button
              onClick={applyCorrection}
              disabled={!selectedClip}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorCorrectionPanel;