import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors,
  Copy,
  Trash2,
  RotateCw,
  RotateCcw,
  Move,
  Scale,
  Crop,
  Palette,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Layers,
  Type,
  Image,
  Video,
  Music,
  Mic,
  Zap,
  Wand2,
  Settings,
  Sliders,
  Sun,
  Moon,
  Contrast,
  Focus,
  Paintbrush,
  Eraser,
  Pipette,
  Grid3X3,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  Circle,
  Triangle,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  X
} from 'lucide-react';
import { Button, Card, Input } from '../ui';
import { useHotkeys } from 'react-hotkeys-hook';

const TOOL_CATEGORIES = {
  BASIC: 'Basic Tools',
  TRANSFORM: 'Transform',
  COLOR: 'Color & Grading',
  AUDIO: 'Audio Tools',
  TEXT: 'Text & Graphics',
  EFFECTS: 'Effects',
  PLAYBACK: 'Playback Controls'
};

const TOOLS_DATA = [
  // Basic Tools
  {
    id: 'select',
    name: 'Selection Tool',
    category: TOOL_CATEGORIES.BASIC,
    icon: Move,
    shortcut: 'V',
    description: 'Select and move clips',
    active: true
  },
  {
    id: 'cut',
    name: 'Cut Tool',
    category: TOOL_CATEGORIES.BASIC,
    icon: Scissors,
    shortcut: 'C',
    description: 'Cut clips at playhead'
  },
  {
    id: 'copy',
    name: 'Copy',
    category: TOOL_CATEGORIES.BASIC,
    icon: Copy,
    shortcut: 'Ctrl+C',
    description: 'Copy selected clips'
  },
  {
    id: 'delete',
    name: 'Delete',
    category: TOOL_CATEGORIES.BASIC,
    icon: Trash2,
    shortcut: 'Del',
    description: 'Delete selected clips'
  },
  
  // Transform Tools
  {
    id: 'scale',
    name: 'Scale',
    category: TOOL_CATEGORIES.TRANSFORM,
    icon: Scale,
    shortcut: 'S',
    description: 'Scale video size',
    parameters: [
      { name: 'scaleX', type: 'slider', min: 0.1, max: 5, default: 1, step: 0.1 },
      { name: 'scaleY', type: 'slider', min: 0.1, max: 5, default: 1, step: 0.1 },
      { name: 'uniform', type: 'checkbox', default: true }
    ]
  },
  {
    id: 'rotate',
    name: 'Rotate',
    category: TOOL_CATEGORIES.TRANSFORM,
    icon: RotateCw,
    shortcut: 'R',
    description: 'Rotate video',
    parameters: [
      { name: 'rotation', type: 'slider', min: -180, max: 180, default: 0, step: 1 }
    ]
  },
  {
    id: 'crop',
    name: 'Crop',
    category: TOOL_CATEGORIES.TRANSFORM,
    icon: Crop,
    shortcut: 'Shift+C',
    description: 'Crop video frame',
    parameters: [
      { name: 'top', type: 'slider', min: 0, max: 50, default: 0 },
      { name: 'bottom', type: 'slider', min: 0, max: 50, default: 0 },
      { name: 'left', type: 'slider', min: 0, max: 50, default: 0 },
      { name: 'right', type: 'slider', min: 0, max: 50, default: 0 }
    ]
  },
  
  // Color Tools
  {
    id: 'brightness',
    name: 'Brightness',
    category: TOOL_CATEGORIES.COLOR,
    icon: Sun,
    description: 'Adjust brightness',
    parameters: [
      { name: 'brightness', type: 'slider', min: -100, max: 100, default: 0 },
      { name: 'contrast', type: 'slider', min: -100, max: 100, default: 0 }
    ]
  },
  {
    id: 'color-correction',
    name: 'Color Correction',
    category: TOOL_CATEGORIES.COLOR,
    icon: Palette,
    description: 'Professional color grading',
    parameters: [
      { name: 'temperature', type: 'slider', min: -100, max: 100, default: 0 },
      { name: 'tint', type: 'slider', min: -100, max: 100, default: 0 },
      { name: 'saturation', type: 'slider', min: -100, max: 100, default: 0 },
      { name: 'vibrance', type: 'slider', min: -100, max: 100, default: 0 }
    ]
  },
  
  // Audio Tools
  {
    id: 'volume',
    name: 'Volume',
    category: TOOL_CATEGORIES.AUDIO,
    icon: Volume2,
    description: 'Adjust audio volume',
    parameters: [
      { name: 'volume', type: 'slider', min: 0, max: 200, default: 100 },
      { name: 'mute', type: 'checkbox', default: false }
    ]
  },
  {
    id: 'audio-enhance',
    name: 'Audio Enhancement',
    category: TOOL_CATEGORIES.AUDIO,
    icon: Wand2,
    description: 'AI-powered audio enhancement',
    parameters: [
      { name: 'noiseReduction', type: 'slider', min: 0, max: 100, default: 0 },
      { name: 'speechEnhance', type: 'checkbox', default: false },
      { name: 'normalize', type: 'checkbox', default: false }
    ]
  },
  
  // Text Tools
  {
    id: 'text',
    name: 'Add Text',
    category: TOOL_CATEGORIES.TEXT,
    icon: Type,
    shortcut: 'T',
    description: 'Add text overlay',
    parameters: [
      { name: 'text', type: 'text', default: 'Enter text...' },
      { name: 'fontSize', type: 'slider', min: 12, max: 120, default: 24 },
      { name: 'color', type: 'color', default: '#ffffff' },
      { name: 'fontFamily', type: 'select', options: ['Arial', 'Helvetica', 'Times', 'Courier'], default: 'Arial' }
    ]
  },
  
  // Playback Controls
  {
    id: 'play-pause',
    name: 'Play/Pause',
    category: TOOL_CATEGORIES.PLAYBACK,
    icon: Play,
    shortcut: 'Space',
    description: 'Toggle playback'
  },
  {
    id: 'step-back',
    name: 'Step Back',
    category: TOOL_CATEGORIES.PLAYBACK,
    icon: SkipBack,
    shortcut: 'Left',
    description: 'Step one frame back'
  },
  {
    id: 'step-forward',
    name: 'Step Forward',
    category: TOOL_CATEGORIES.PLAYBACK,
    icon: SkipForward,
    shortcut: 'Right',
    description: 'Step one frame forward'
  }
];

const ToolPalette = ({
  onToolSelect,
  onParameterChange,
  selectedTool = 'select',
  toolParameters = {},
  className = '',
  compact = false,
  showCategories = true
}) => {
  const [expandedCategories, setExpandedCategories] = useState(new Set(['BASIC', 'PLAYBACK']));
  const [searchQuery, setSearchQuery] = useState('');
  const [showParameters, setShowParameters] = useState(true);
  
  // Filter tools based on search
  const filteredTools = TOOLS_DATA.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Group tools by category
  const groupedTools = filteredTools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {});
  
  const toggleCategory = useCallback((category) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);
  
  const handleToolSelect = useCallback((toolId) => {
    onToolSelect?.(toolId);
  }, [onToolSelect]);
  
  const handleParameterChange = useCallback((paramName, value) => {
    onParameterChange?.(selectedTool, paramName, value);
  }, [selectedTool, onParameterChange]);
  
  // Setup keyboard shortcuts
  TOOLS_DATA.forEach(tool => {
    if (tool.shortcut && !tool.shortcut.includes('Ctrl') && !tool.shortcut.includes('Shift')) {
      useHotkeys(tool.shortcut.toLowerCase(), () => handleToolSelect(tool.id), {
        preventDefault: true
      });
    }
  });
  
  // Special shortcuts
  useHotkeys('ctrl+c', () => handleToolSelect('copy'));
  useHotkeys('delete', () => handleToolSelect('delete'));
  useHotkeys('shift+c', () => handleToolSelect('crop'));
  useHotkeys('space', () => handleToolSelect('play-pause'), { preventDefault: true });
  useHotkeys('left', () => handleToolSelect('step-back'));
  useHotkeys('right', () => handleToolSelect('step-forward'));
  
  const selectedToolData = TOOLS_DATA.find(tool => tool.id === selectedTool);
  
  const renderParameterControl = (param) => {
    const value = toolParameters[param.name] ?? param.default;
    
    switch (param.type) {
      case 'slider':
        return (
          <div key={param.name} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-gray-700 capitalize">
                {param.name.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <span className="text-xs text-gray-500">{value}</span>
            </div>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step || 1}
              value={value}
              onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        );
      
      case 'checkbox':
        return (
          <div key={param.name} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleParameterChange(param.name, e.target.checked)}
              className="rounded border-gray-300"
            />
            <label className="text-xs font-medium text-gray-700 capitalize">
              {param.name.replace(/([A-Z])/g, ' $1').trim()}
            </label>
          </div>
        );
      
      case 'color':
        return (
          <div key={param.name} className="space-y-2">
            <label className="text-xs font-medium text-gray-700 capitalize">
              {param.name.replace(/([A-Z])/g, ' $1').trim()}
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={value}
                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                className="w-8 h-8 rounded border border-gray-300"
              />
              <Input
                value={value}
                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                className="flex-1 text-xs"
              />
            </div>
          </div>
        );
      
      case 'select':
        return (
          <div key={param.name} className="space-y-2">
            <label className="text-xs font-medium text-gray-700 capitalize">
              {param.name.replace(/([A-Z])/g, ' $1').trim()}
            </label>
            <select
              value={value}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            >
              {param.options.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );
      
      case 'text':
        return (
          <div key={param.name} className="space-y-2">
            <label className="text-xs font-medium text-gray-700 capitalize">
              {param.name.replace(/([A-Z])/g, ' $1').trim()}
            </label>
            <Input
              value={value}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              placeholder={param.default}
              className="text-xs"
            />
          </div>
        );
      
      default:
        return null;
    }
  };
  
  if (compact) {
    return (
      <Card className={`p-2 ${className}`}>
        <div className="flex flex-wrap gap-1">
          {TOOLS_DATA.filter(tool => tool.category === TOOL_CATEGORIES.BASIC || tool.category === TOOL_CATEGORIES.PLAYBACK).map(tool => {
            const Icon = tool.icon;
            return (
              <Button
                key={tool.id}
                onClick={() => handleToolSelect(tool.id)}
                variant={selectedTool === tool.id ? "default" : "outline"}
                size="sm"
                className="p-2"
                title={`${tool.name} (${tool.shortcut || ''})`}
              >
                <Icon className="w-4 h-4" />
              </Button>
            );
          })}
        </div>
      </Card>
    );
  }
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Tools</h3>
          <Button
            onClick={() => setShowParameters(!showParameters)}
            variant="outline"
            size="sm"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Search */}
        <Input
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm"
        />
      </div>
      
      {/* Tools List */}
      <div className="flex-1 overflow-y-auto">
        {showCategories ? (
          Object.entries(groupedTools).map(([category, tools]) => (
            <div key={category} className="border-b border-gray-100">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between"
              >
                <span>{category}</span>
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedCategories.has(category) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pb-2">
                      {tools.map(tool => {
                        const Icon = tool.icon;
                        return (
                          <button
                            key={tool.id}
                            onClick={() => handleToolSelect(tool.id)}
                            className={`w-full px-6 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 ${
                              selectedTool === tool.id ? 'bg-primary-50 border-r-2 border-primary-500' : ''
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${
                              selectedTool === tool.id ? 'text-primary-600' : 'text-gray-500'
                            }`} />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{tool.name}</div>
                              <div className="text-xs text-gray-500">
                                {tool.description}
                                {tool.shortcut && (
                                  <span className="ml-2 px-1 py-0.5 bg-gray-200 rounded text-xs">
                                    {tool.shortcut}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        ) : (
          <div className="p-2">
            {filteredTools.map(tool => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  className={`w-full p-3 text-left hover:bg-gray-50 flex items-center space-x-3 rounded ${
                    selectedTool === tool.id ? 'bg-primary-50 border border-primary-200' : ''
                  }`}
                >
                  <Icon className={`w-5 h-5 ${
                    selectedTool === tool.id ? 'text-primary-600' : 'text-gray-500'
                  }`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{tool.name}</div>
                    <div className="text-xs text-gray-500">{tool.description}</div>
                  </div>
                  {tool.shortcut && (
                    <span className="text-xs px-2 py-1 bg-gray-200 rounded">
                      {tool.shortcut}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Parameters Panel */}
      {showParameters && selectedToolData?.parameters && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">{selectedToolData.name} Settings</h4>
            <Button
              onClick={() => setShowParameters(false)}
              variant="ghost"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            {selectedToolData.parameters.map(renderParameterControl)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolPalette;