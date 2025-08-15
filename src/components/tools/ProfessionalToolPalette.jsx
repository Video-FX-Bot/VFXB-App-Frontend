import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors,
  Crop,
  RotateCw,
  Move,
  Scale,
  Palette,
  Volume2,
  Type,
  Layers,
  Zap,
  Settings,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Undo,
  Redo,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';
import { Button, Card } from '../ui';

const TOOL_CATEGORIES = {
  BASIC: 'Basic Editing',
  TRANSFORM: 'Transform',
  COLOR: 'Color & Effects',
  AUDIO: 'Audio',
  TEXT: 'Text & Graphics',
  ADVANCED: 'Advanced'
};

const PROFESSIONAL_TOOLS = {
  [TOOL_CATEGORIES.BASIC]: [
    {
      id: 'cut',
      name: 'Cut Tool',
      icon: Scissors,
      description: 'Split clips at playhead position',
      shortcut: 'C',
      action: 'cut'
    },
    {
      id: 'trim',
      name: 'Trim Tool',
      icon: Move,
      description: 'Adjust clip start and end points',
      shortcut: 'T',
      action: 'trim'
    },
    {
      id: 'copy',
      name: 'Copy',
      icon: Copy,
      description: 'Copy selected clips',
      shortcut: 'Ctrl+C',
      action: 'copy'
    },
    {
      id: 'delete',
      name: 'Delete',
      icon: Trash2,
      description: 'Delete selected clips',
      shortcut: 'Del',
      action: 'delete'
    }
  ],
  [TOOL_CATEGORIES.TRANSFORM]: [
    {
      id: 'crop',
      name: 'Crop',
      icon: Crop,
      description: 'Crop video frame',
      shortcut: 'R',
      action: 'crop'
    },
    {
      id: 'rotate',
      name: 'Rotate',
      icon: RotateCw,
      description: 'Rotate video clockwise/counterclockwise',
      shortcut: 'Shift+R',
      action: 'rotate'
    },
    {
      id: 'scale',
      name: 'Scale',
      icon: Scale,
      description: 'Resize video',
      shortcut: 'S',
      action: 'scale'
    },
    {
      id: 'position',
      name: 'Position',
      icon: Move,
      description: 'Move video position',
      shortcut: 'P',
      action: 'position'
    }
  ],
  [TOOL_CATEGORIES.COLOR]: [
    {
      id: 'color-correction',
      name: 'Color Correction',
      icon: Palette,
      description: 'Adjust colors and exposure',
      shortcut: 'Ctrl+Shift+C',
      action: 'colorCorrection'
    },
    {
      id: 'lut',
      name: 'LUT Application',
      icon: Layers,
      description: 'Apply color lookup tables',
      shortcut: 'L',
      action: 'lut'
    }
  ],
  [TOOL_CATEGORIES.AUDIO]: [
    {
      id: 'audio-levels',
      name: 'Audio Levels',
      icon: Volume2,
      description: 'Adjust volume and audio levels',
      shortcut: 'A',
      action: 'audioLevels'
    },
    {
      id: 'noise-reduction',
      name: 'Noise Reduction',
      icon: Volume2,
      description: 'Remove background noise',
      shortcut: 'Ctrl+N',
      action: 'noiseReduction'
    }
  ],
  [TOOL_CATEGORIES.TEXT]: [
    {
      id: 'text',
      name: 'Text Tool',
      icon: Type,
      description: 'Add text and titles',
      shortcut: 'Ctrl+T',
      action: 'text'
    }
  ],
  [TOOL_CATEGORIES.ADVANCED]: [
    {
      id: 'keyframe',
      name: 'Keyframe Editor',
      icon: Zap,
      description: 'Create custom animations',
      shortcut: 'K',
      action: 'keyframe'
    }
  ]
};

const ProfessionalToolPalette = ({
  onToolSelect,
  selectedTool = null,
  className = '',
  compact = false,
  showShortcuts = true
}) => {
  const [expandedCategories, setExpandedCategories] = useState(new Set([TOOL_CATEGORIES.BASIC]));
  const [hoveredTool, setHoveredTool] = useState(null);

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

  const handleToolSelect = useCallback((tool) => {
    onToolSelect?.(tool);
  }, [onToolSelect]);

  return (
    <Card className={`w-full max-w-sm bg-gray-900/95 backdrop-blur-sm border-gray-700 ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Professional Tools</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {Object.entries(PROFESSIONAL_TOOLS).map(([category, tools]) => {
            const isExpanded = expandedCategories.has(category);
            
            return (
              <div key={category} className="border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-750 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-200">{category}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-2 space-y-1 bg-gray-850">
                        {tools.map((tool) => {
                          const Icon = tool.icon;
                          const isSelected = selectedTool?.id === tool.id;
                          const isHovered = hoveredTool === tool.id;
                          
                          return (
                            <motion.button
                              key={tool.id}
                              onClick={() => handleToolSelect(tool)}
                              onMouseEnter={() => setHoveredTool(tool.id)}
                              onMouseLeave={() => setHoveredTool(null)}
                              className={`
                                w-full flex items-center gap-3 p-2 rounded-md transition-all duration-200
                                ${isSelected 
                                  ? 'bg-blue-600 text-white shadow-lg' 
                                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                }
                              `}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                              
                              <div className="flex-1 text-left">
                                <div className="text-sm font-medium">{tool.name}</div>
                                {!compact && (
                                  <div className="text-xs text-gray-500">{tool.description}</div>
                                )}
                              </div>
                              
                              {showShortcuts && tool.shortcut && (
                                <div className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                                  {tool.shortcut}
                                </div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-gray-300 hover:text-white"
            >
              <Undo className="w-4 h-4" />
              Undo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-gray-300 hover:text-white"
            >
              <Redo className="w-4 h-4" />
              Redo
            </Button>
          </div>
        </div>

        {/* Tool Info Panel */}
        {hoveredTool && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-600"
          >
            <div className="text-sm text-gray-300">
              {PROFESSIONAL_TOOLS[Object.keys(PROFESSIONAL_TOOLS).find(cat => 
                PROFESSIONAL_TOOLS[cat].some(tool => tool.id === hoveredTool)
              )]?.find(tool => tool.id === hoveredTool)?.description}
            </div>
          </motion.div>
        )}
      </div>
    </Card>
  );
};

export default ProfessionalToolPalette;