import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, VolumeX, Mic, MicOff, Headphones, Settings,
  Sliders, BarChart3, Zap, Filter, Waves, Music,
  Play, Pause, RotateCcw, Save, Download, Upload,
  ChevronDown, ChevronUp, X, Plus, Minus, Target,
  TrendingUp, Activity, Radio, Disc, Speaker,
  Gauge, Timer, Layers, Eye, EyeOff
} from 'lucide-react';
import { Button, Card } from '../ui';

const AUDIO_PRESETS = {
  VOICE: {
    name: 'Voice Enhancement',
    description: 'Optimized for speech clarity',
    settings: {
      eq: {
        '60': 0,
        '170': 2,
        '350': 1,
        '1000': 3,
        '3500': 2,
        '10000': 1
      },
      compressor: {
        threshold: -18,
        ratio: 3,
        attack: 3,
        release: 100,
        knee: 2
      },
      gate: {
        threshold: -40,
        ratio: 10,
        attack: 1,
        release: 50
      }
    }
  },
  MUSIC: {
    name: 'Music Master',
    description: 'Balanced for music content',
    settings: {
      eq: {
        '60': 1,
        '170': 0,
        '350': 0,
        '1000': 0,
        '3500': 1,
        '10000': 2
      },
      compressor: {
        threshold: -12,
        ratio: 2.5,
        attack: 5,
        release: 150,
        knee: 3
      },
      gate: {
        threshold: -50,
        ratio: 8,
        attack: 2,
        release: 100
      }
    }
  },
  PODCAST: {
    name: 'Podcast Pro',
    description: 'Professional podcast sound',
    settings: {
      eq: {
        '60': -2,
        '170': 1,
        '350': 2,
        '1000': 2,
        '3500': 1,
        '10000': 0
      },
      compressor: {
        threshold: -16,
        ratio: 4,
        attack: 2,
        release: 80,
        knee: 2
      },
      gate: {
        threshold: -35,
        ratio: 12,
        attack: 1,
        release: 40
      }
    }
  }
};

const EQ_FREQUENCIES = {
  '60': '60 Hz',
  '170': '170 Hz',
  '350': '350 Hz',
  '1000': '1 kHz',
  '3500': '3.5 kHz',
  '10000': '10 kHz'
};

const EFFECTS = {
  REVERB: {
    name: 'Reverb',
    icon: Waves,
    params: {
      roomSize: 0.5,
      damping: 0.5,
      wetLevel: 0.3,
      dryLevel: 0.7,
      width: 1.0
    }
  },
  DELAY: {
    name: 'Delay',
    icon: Timer,
    params: {
      delayTime: 250,
      feedback: 0.3,
      wetLevel: 0.2,
      dryLevel: 0.8,
      sync: false
    }
  },
  CHORUS: {
    name: 'Chorus',
    icon: Layers,
    params: {
      rate: 1.5,
      depth: 0.3,
      feedback: 0.2,
      wetLevel: 0.3,
      dryLevel: 0.7
    }
  },
  DISTORTION: {
    name: 'Distortion',
    icon: Zap,
    params: {
      drive: 0.5,
      tone: 0.5,
      level: 0.8,
      type: 'soft'
    }
  }
};

const AudioMixingPanel = ({
  selectedTrack = null,
  tracks = [],
  onApplyAudioEffect,
  onUpdateTrackVolume,
  onSavePreset,
  className = ''
}) => {
  const [activeSection, setActiveSection] = useState('mixer');
  const [audioSettings, setAudioSettings] = useState({
    volume: 0,
    pan: 0,
    mute: false,
    solo: false,
    eq: {
      '60': 0,
      '170': 0,
      '350': 0,
      '1000': 0,
      '3500': 0,
      '10000': 0
    },
    compressor: {
      threshold: -12,
      ratio: 3,
      attack: 5,
      release: 100,
      knee: 2,
      enabled: false
    },
    gate: {
      threshold: -40,
      ratio: 10,
      attack: 2,
      release: 50,
      enabled: false
    },
    limiter: {
      threshold: -1,
      release: 50,
      enabled: false
    }
  });
  
  const [effects, setEffects] = useState({});
  const [showPresets, setShowPresets] = useState(false);
  const [customPresets, setCustomPresets] = useState([]);
  const [vuMeterLevels, setVuMeterLevels] = useState({ left: 0, right: 0 });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const vuMeterRef = useRef(null);
  
  // Simulate VU meter updates
  useEffect(() => {
    if (!isMonitoring) return;
    
    const interval = setInterval(() => {
      setVuMeterLevels({
        left: Math.random() * 100,
        right: Math.random() * 100
      });
    }, 50);
    
    return () => clearInterval(interval);
  }, [isMonitoring]);
  
  // Apply audio settings
  const applyAudioSettings = useCallback(() => {
    if (selectedTrack && onApplyAudioEffect) {
      onApplyAudioEffect(selectedTrack.id, {
        ...audioSettings,
        effects
      });
    }
  }, [selectedTrack, audioSettings, effects, onApplyAudioEffect]);
  
  // Reset settings
  const resetSettings = useCallback(() => {
    setAudioSettings({
      volume: 0,
      pan: 0,
      mute: false,
      solo: false,
      eq: {
        '60': 0,
        '170': 0,
        '350': 0,
        '1000': 0,
        '3500': 0,
        '10000': 0
      },
      compressor: {
        threshold: -12,
        ratio: 3,
        attack: 5,
        release: 100,
        knee: 2,
        enabled: false
      },
      gate: {
        threshold: -40,
        ratio: 10,
        attack: 2,
        release: 50,
        enabled: false
      },
      limiter: {
        threshold: -1,
        release: 50,
        enabled: false
      }
    });
    setEffects({});
  }, []);
  
  // Apply preset
  const applyPreset = useCallback((preset) => {
    setAudioSettings(prev => ({
      ...prev,
      ...preset.settings
    }));
    setShowPresets(false);
  }, []);
  
  // Toggle effect
  const toggleEffect = useCallback((effectKey) => {
    setEffects(prev => ({
      ...prev,
      [effectKey]: {
        ...EFFECTS[effectKey].params,
        enabled: !prev[effectKey]?.enabled
      }
    }));
  }, []);
  
  // Render VU meter
  const renderVuMeter = () => {
    return (
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-white">Level Meter</h4>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={isMonitoring ? 'text-green-400' : 'text-gray-400'}
          >
            {isMonitoring ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
        </div>
        
        <div className="space-y-2">
          {['left', 'right'].map(channel => {
            const level = vuMeterLevels[channel];
            const dbLevel = level > 0 ? 20 * Math.log10(level / 100) : -60;
            
            return (
              <div key={channel} className="flex items-center space-x-2">
                <span className="text-xs text-gray-400 w-4 uppercase">{channel[0]}</span>
                <div className="flex-1 h-4 bg-gray-700 rounded overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-75 ${
                      level > 85 ? 'bg-red-500' :
                      level > 70 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.max(0, level)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-12 text-right">
                  {dbLevel.toFixed(1)} dB
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Render EQ section
  const renderEQ = () => {
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-white flex items-center">
          <Sliders className="w-4 h-4 mr-2" />
          6-Band EQ
        </h4>
        
        <div className="grid grid-cols-6 gap-2">
          {Object.entries(EQ_FREQUENCIES).map(([freq, label]) => {
            const value = audioSettings.eq[freq];
            const percentage = ((value + 12) / 24) * 100;
            
            return (
              <div key={freq} className="space-y-2">
                <div className="text-xs text-center text-gray-400">{label}</div>
                <div className="relative h-32 bg-gray-700 rounded">
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={value}
                    onChange={(e) => setAudioSettings(prev => ({
                      ...prev,
                      eq: {
                        ...prev.eq,
                        [freq]: parseFloat(e.target.value)
                      }
                    }))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' }}
                  />
                  <div 
                    className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-purple-500 rounded transition-all"
                    style={{ height: `${percentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-gray-600" />
                  </div>
                </div>
                <div className="text-xs text-center text-gray-400">
                  {value > 0 ? '+' : ''}{value.toFixed(1)} dB
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Render dynamics section
  const renderDynamics = () => {
    return (
      <div className="space-y-6">
        {/* Compressor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white flex items-center">
              <Gauge className="w-4 h-4 mr-2" />
              Compressor
            </h4>
            <Button
              size="sm"
              variant={audioSettings.compressor.enabled ? "default" : "ghost"}
              onClick={() => setAudioSettings(prev => ({
                ...prev,
                compressor: {
                  ...prev.compressor,
                  enabled: !prev.compressor.enabled
                }
              }))}
              className="text-xs"
            >
              {audioSettings.compressor.enabled ? 'ON' : 'OFF'}
            </Button>
          </div>
          
          {audioSettings.compressor.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400">Threshold</label>
                <input
                  type="range"
                  min="-40"
                  max="0"
                  step="1"
                  value={audioSettings.compressor.threshold}
                  onChange={(e) => setAudioSettings(prev => ({
                    ...prev,
                    compressor: {
                      ...prev.compressor,
                      threshold: parseInt(e.target.value)
                    }
                  }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-400 text-center">
                  {audioSettings.compressor.threshold} dB
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-400">Ratio</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.1"
                  value={audioSettings.compressor.ratio}
                  onChange={(e) => setAudioSettings(prev => ({
                    ...prev,
                    compressor: {
                      ...prev.compressor,
                      ratio: parseFloat(e.target.value)
                    }
                  }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-400 text-center">
                  {audioSettings.compressor.ratio.toFixed(1)}:1
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-400">Attack</label>
                <input
                  type="range"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={audioSettings.compressor.attack}
                  onChange={(e) => setAudioSettings(prev => ({
                    ...prev,
                    compressor: {
                      ...prev.compressor,
                      attack: parseFloat(e.target.value)
                    }
                  }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-400 text-center">
                  {audioSettings.compressor.attack} ms
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-400">Release</label>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={audioSettings.compressor.release}
                  onChange={(e) => setAudioSettings(prev => ({
                    ...prev,
                    compressor: {
                      ...prev.compressor,
                      release: parseInt(e.target.value)
                    }
                  }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-400 text-center">
                  {audioSettings.compressor.release} ms
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Gate */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Noise Gate
            </h4>
            <Button
              size="sm"
              variant={audioSettings.gate.enabled ? "default" : "ghost"}
              onClick={() => setAudioSettings(prev => ({
                ...prev,
                gate: {
                  ...prev.gate,
                  enabled: !prev.gate.enabled
                }
              }))}
              className="text-xs"
            >
              {audioSettings.gate.enabled ? 'ON' : 'OFF'}
            </Button>
          </div>
          
          {audioSettings.gate.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400">Threshold</label>
                <input
                  type="range"
                  min="-60"
                  max="-10"
                  step="1"
                  value={audioSettings.gate.threshold}
                  onChange={(e) => setAudioSettings(prev => ({
                    ...prev,
                    gate: {
                      ...prev.gate,
                      threshold: parseInt(e.target.value)
                    }
                  }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-400 text-center">
                  {audioSettings.gate.threshold} dB
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-400">Ratio</label>
                <input
                  type="range"
                  min="2"
                  max="20"
                  step="1"
                  value={audioSettings.gate.ratio}
                  onChange={(e) => setAudioSettings(prev => ({
                    ...prev,
                    gate: {
                      ...prev.gate,
                      ratio: parseInt(e.target.value)
                    }
                  }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-400 text-center">
                  {audioSettings.gate.ratio}:1
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render effects section
  const renderEffects = () => {
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-white">Audio Effects</h4>
        
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(EFFECTS).map(([key, effect]) => {
            const isEnabled = effects[key]?.enabled;
            const Icon = effect.icon;
            
            return (
              <Button
                key={key}
                variant={isEnabled ? "default" : "ghost"}
                onClick={() => toggleEffect(key)}
                className={`h-auto p-3 flex-col space-y-2 ${
                  isEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{effect.name}</span>
              </Button>
            );
          })}
        </div>
        
        {/* Effect parameters */}
        {Object.entries(effects).map(([key, effectSettings]) => {
          if (!effectSettings.enabled) return null;
          
          const effect = EFFECTS[key];
          
          return (
            <div key={key} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <h5 className="text-sm font-medium text-white mb-3">{effect.name} Settings</h5>
              
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(effect.params).map(([param, defaultValue]) => {
                  if (typeof defaultValue === 'boolean') {
                    return (
                      <div key={param} className="flex items-center justify-between">
                        <label className="text-xs text-gray-400 capitalize">{param}</label>
                        <Button
                          size="sm"
                          variant={effectSettings[param] ? "default" : "ghost"}
                          onClick={() => setEffects(prev => ({
                            ...prev,
                            [key]: {
                              ...prev[key],
                              [param]: !prev[key][param]
                            }
                          }))}
                          className="text-xs"
                        >
                          {effectSettings[param] ? 'ON' : 'OFF'}
                        </Button>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={param}>
                      <label className="text-xs text-gray-400 capitalize">{param}</label>
                      <input
                        type="range"
                        min={param.includes('Time') ? 0 : 0}
                        max={param.includes('Time') ? 1000 : 1}
                        step={param.includes('Time') ? 10 : 0.01}
                        value={effectSettings[param] || defaultValue}
                        onChange={(e) => setEffects(prev => ({
                          ...prev,
                          [key]: {
                            ...prev[key],
                            [param]: parseFloat(e.target.value)
                          }
                        }))}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-400 text-center">
                        {(effectSettings[param] || defaultValue).toFixed(2)}
                        {param.includes('Time') ? ' ms' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className={`bg-gray-900/95 border border-gray-700/50 rounded-lg backdrop-blur-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Volume2 className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Audio Mixing</h3>
              <p className="text-sm text-gray-400">
                {selectedTrack ? `Editing: ${selectedTrack.name}` : 'Select an audio track to edit'}
              </p>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowPresets(!showPresets)}
            className="text-gray-400 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Section tabs */}
        <div className="flex items-center space-x-1 mt-4">
          {[
            { id: 'mixer', label: 'Mixer', icon: Sliders },
            { id: 'eq', label: 'EQ', icon: Sliders },
            { id: 'dynamics', label: 'Dynamics', icon: Gauge },
            { id: 'effects', label: 'Effects', icon: Zap }
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
                <h4 className="text-sm font-medium text-white">Audio Presets</h4>
                <Button
                  size="sm"
                  onClick={() => {
                    const presetName = prompt('Enter preset name:');
                    if (presetName) {
                      const newPreset = {
                        id: Date.now(),
                        name: presetName,
                        settings: { ...audioSettings },
                        effects: { ...effects }
                      };
                      setCustomPresets(prev => [...prev, newPreset]);
                      if (onSavePreset) onSavePreset(newPreset);
                    }
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save Current
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(AUDIO_PRESETS).map(([key, preset]) => (
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Content */}
      <div className="p-4 space-y-6 max-h-96 overflow-y-auto">
        {activeSection === 'mixer' && (
          <div className="space-y-4">
            {renderVuMeter()}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Volume</label>
                <input
                  type="range"
                  min="-60"
                  max="12"
                  step="0.1"
                  value={audioSettings.volume}
                  onChange={(e) => setAudioSettings(prev => ({ 
                    ...prev, 
                    volume: parseFloat(e.target.value) 
                  }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-400 text-center mt-1">
                  {audioSettings.volume.toFixed(1)} dB
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Pan</label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={audioSettings.pan}
                  onChange={(e) => setAudioSettings(prev => ({ 
                    ...prev, 
                    pan: parseInt(e.target.value) 
                  }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-400 text-center mt-1">
                  {audioSettings.pan === 0 ? 'Center' : 
                   audioSettings.pan > 0 ? `${audioSettings.pan}% R` : 
                   `${Math.abs(audioSettings.pan)}% L`}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant={audioSettings.mute ? "destructive" : "ghost"}
                onClick={() => setAudioSettings(prev => ({ 
                  ...prev, 
                  mute: !prev.mute 
                }))}
                className="flex-1"
              >
                {audioSettings.mute ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                {audioSettings.mute ? 'Muted' : 'Mute'}
              </Button>
              
              <Button
                variant={audioSettings.solo ? "default" : "ghost"}
                onClick={() => setAudioSettings(prev => ({ 
                  ...prev, 
                  solo: !prev.solo 
                }))}
                className="flex-1"
              >
                <Headphones className="w-4 h-4 mr-2" />
                {audioSettings.solo ? 'Solo On' : 'Solo'}
              </Button>
            </div>
          </div>
        )}
        
        {activeSection === 'eq' && renderEQ()}
        {activeSection === 'dynamics' && renderDynamics()}
        {activeSection === 'effects' && renderEffects()}
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
              Export Mix
            </Button>
            
            <Button
              onClick={applyAudioSettings}
              disabled={!selectedTrack}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <Music className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioMixingPanel;