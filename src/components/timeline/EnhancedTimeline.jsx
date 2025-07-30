import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Scissors,
  Copy,
  Trash2,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Minus,
  RotateCcw,
  RotateCw,
  Move,
  Square,
  Circle,
  Triangle,
  Zap,
  Layers,
  Music,
  Type,
  Image,
  Video,
  Mic,
  Settings,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Upload,
  X,
  FolderPlus
} from 'lucide-react';
import { Button, Card } from '../ui';
import MediaUpload from './MediaUpload';

const TRACK_TYPES = {
  VIDEO: 'video',
  AUDIO: 'audio',
  TEXT: 'text',
  IMAGE: 'image',
  EFFECT: 'effect'
};

const SNAP_THRESHOLD = 10; // pixels
const MIN_CLIP_DURATION = 0.1; // seconds

const EnhancedTimeline = ({
  duration = 60,
  currentTime = 0,
  onTimeChange,
  onClipSelect,
  onClipEdit,
  tracks: initialTracks = [],
  zoom = 1,
  onZoomChange,
  isPlaying = false,
  onPlay,
  onPause,
  enableMagneticTimeline = true,
  enableRippleEdit = true,
  className = ''
}) => {
  const timelineRef = useRef(null);
  const playheadRef = useRef(null);
  const [tracks, setTracks] = useState(initialTracks);
  const [selectedClips, setSelectedClips] = useState([]);
  const [dragState, setDragState] = useState(null);
  const [snapPoints, setSnapPoints] = useState([]);
  const [showKeyframes, setShowKeyframes] = useState(true);
  const [trackHeight, setTrackHeight] = useState(80);
  const [collapsedTracks, setCollapsedTracks] = useState(new Set());
  const [loopRegion, setLoopRegion] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [showMediaUpload, setShowMediaUpload] = useState(null);
  const [uploadingTrackId, setUploadingTrackId] = useState(null);
  
  // Calculate pixels per second based on zoom
  const pixelsPerSecond = 50 * zoom;
  const totalWidth = duration * pixelsPerSecond;
  
  useEffect(() => {
    if (timelineRef.current) {
      setTimelineWidth(timelineRef.current.offsetWidth);
    }
  }, [zoom]);
  
  // Generate snap points from clips and markers
  useEffect(() => {
    const points = [];
    
    // Add clip boundaries
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        points.push(clip.startTime, clip.startTime + clip.duration);
      });
    });
    
    // Add markers
    markers.forEach(marker => {
      points.push(marker.time);
    });
    
    // Add playhead position
    points.push(currentTime);
    
    setSnapPoints([...new Set(points)].sort((a, b) => a - b));
  }, [tracks, markers, currentTime]);
  
  const timeToPixels = useCallback((time) => {
    return time * pixelsPerSecond;
  }, [pixelsPerSecond]);
  
  const pixelsToTime = useCallback((pixels) => {
    return pixels / pixelsPerSecond;
  }, [pixelsPerSecond]);
  
  const findSnapPoint = useCallback((time) => {
    if (!enableMagneticTimeline) return time;
    
    const timeInPixels = timeToPixels(time);
    const threshold = SNAP_THRESHOLD;
    
    for (const snapTime of snapPoints) {
      const snapPixels = timeToPixels(snapTime);
      if (Math.abs(timeInPixels - snapPixels) < threshold) {
        return snapTime;
      }
    }
    
    return time;
  }, [enableMagneticTimeline, snapPoints, timeToPixels]);
  
  const handleTimelineClick = useCallback((e) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = findSnapPoint(pixelsToTime(x));
    
    onTimeChange?.(Math.max(0, Math.min(duration, time)));
  }, [pixelsToTime, findSnapPoint, duration, onTimeChange]);
  
  const handleClipDragStart = useCallback((e, clipId, trackId) => {
    e.stopPropagation();
    
    const rect = timelineRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    
    setDragState({
      type: 'move',
      clipId,
      trackId,
      startX,
      startTime: pixelsToTime(startX)
    });
  }, [pixelsToTime]);
  
  const handleClipResizeStart = useCallback((e, clipId, trackId, edge) => {
    e.stopPropagation();
    
    const rect = timelineRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    
    setDragState({
      type: 'resize',
      clipId,
      trackId,
      edge,
      startX,
      startTime: pixelsToTime(startX)
    });
  }, [pixelsToTime]);
  
  const handleMouseMove = useCallback((e) => {
    if (!dragState || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const deltaX = currentX - dragState.startX;
    const deltaTime = pixelsToTime(deltaX);
    
    setTracks(prevTracks => {
      return prevTracks.map(track => {
        if (track.id !== dragState.trackId) return track;
        
        return {
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== dragState.clipId) return clip;
            
            if (dragState.type === 'move') {
              const newStartTime = findSnapPoint(clip.startTime + deltaTime);
              return {
                ...clip,
                startTime: Math.max(0, newStartTime)
              };
            } else if (dragState.type === 'resize') {
              if (dragState.edge === 'left') {
                const newStartTime = findSnapPoint(clip.startTime + deltaTime);
                const newDuration = clip.duration - deltaTime;
                
                if (newDuration >= MIN_CLIP_DURATION) {
                  return {
                    ...clip,
                    startTime: Math.max(0, newStartTime),
                    duration: newDuration
                  };
                }
              } else if (dragState.edge === 'right') {
                const newDuration = Math.max(MIN_CLIP_DURATION, clip.duration + deltaTime);
                return {
                  ...clip,
                  duration: newDuration
                };
              }
            }
            
            return clip;
          })
        };
      });
    });
  }, [dragState, pixelsToTime, findSnapPoint]);
  
  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);
  
  useEffect(() => {
    if (dragState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);
  
  const addTrack = useCallback((type) => {
    const newTrack = {
      id: `track-${Date.now()}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${tracks.length + 1}`,
      type,
      clips: [],
      muted: false,
      solo: false,
      locked: false,
      visible: true,
      volume: 1,
      color: getTrackColor(type)
    };
    
    setTracks(prev => [...prev, newTrack]);
  }, [tracks.length]);

  const deleteTrack = useCallback((trackId) => {
    setTracks(prev => prev.filter(track => track.id !== trackId));
    setCollapsedTracks(prev => {
      const newSet = new Set(prev);
      newSet.delete(trackId);
      return newSet;
    });
  }, []);

  const handleMediaUpload = useCallback((trackId, mediaData) => {
    const newClip = {
      id: `clip-${Date.now()}`,
      name: mediaData.name,
      startTime: 0,
      duration: mediaData.duration || 5,
      type: mediaData.mediaType.toLowerCase(),
      url: mediaData.url,
      file: mediaData.file,
      volume: 1,
      effects: []
    };

    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, clips: [...track.clips, newClip] }
        : track
    ));
    
    setShowMediaUpload(null);
    setUploadingTrackId(null);
  }, []);

  // Calculate dynamic timeline height based on number of tracks
  const calculateTimelineHeight = useCallback(() => {
    const headerHeight = 120; // Header controls height
    const footerHeight = 60;  // Footer height
    const rulerHeight = 32;   // Time ruler height
    const minHeight = 300;    // Minimum timeline height
    
    let totalTrackHeight = 0;
    tracks.forEach(track => {
      const isCollapsed = collapsedTracks.has(track.id);
      totalTrackHeight += isCollapsed ? 40 : trackHeight;
    });
    
    const calculatedHeight = Math.max(minHeight, totalTrackHeight + rulerHeight);
    return Math.min(calculatedHeight, window.innerHeight - headerHeight - footerHeight);
  }, [tracks, collapsedTracks, trackHeight]);
  
  const getTrackColor = (type) => {
    const colors = {
      [TRACK_TYPES.VIDEO]: 'bg-blue-500',
      [TRACK_TYPES.AUDIO]: 'bg-green-500',
      [TRACK_TYPES.TEXT]: 'bg-purple-500',
      [TRACK_TYPES.IMAGE]: 'bg-yellow-500',
      [TRACK_TYPES.EFFECT]: 'bg-red-500'
    };
    return colors[type] || 'bg-gray-500';
  };
  
  const getTrackIcon = (type) => {
    const icons = {
      [TRACK_TYPES.VIDEO]: Video,
      [TRACK_TYPES.AUDIO]: Music,
      [TRACK_TYPES.TEXT]: Type,
      [TRACK_TYPES.IMAGE]: Image,
      [TRACK_TYPES.EFFECT]: Zap
    };
    return icons[type] || Square;
  };
  
  const toggleTrackCollapse = useCallback((trackId) => {
    setCollapsedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  }, []);
  
  const toggleTrackProperty = useCallback((trackId, property) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, [property]: !track[property] }
        : track
    ));
  }, []);
  
  const splitClip = useCallback((clipId, trackId, time) => {
    setTracks(prev => prev.map(track => {
      if (track.id !== trackId) return track;
      
      return {
        ...track,
        clips: track.clips.flatMap(clip => {
          if (clip.id !== clipId) return [clip];
          
          const splitTime = time - clip.startTime;
          if (splitTime <= 0 || splitTime >= clip.duration) return [clip];
          
          return [
            {
              ...clip,
              id: `${clip.id}-1`,
              duration: splitTime
            },
            {
              ...clip,
              id: `${clip.id}-2`,
              startTime: clip.startTime + splitTime,
              duration: clip.duration - splitTime
            }
          ];
        })
      };
    }));
  }, []);
  
  const deleteClip = useCallback((clipId, trackId) => {
    setTracks(prev => prev.map(track => {
      if (track.id !== trackId) return track;
      
      return {
        ...track,
        clips: track.clips.filter(clip => clip.id !== clipId)
      };
    }));
  }, []);
  
  const addMarker = useCallback((time, label = '') => {
    const newMarker = {
      id: `marker-${Date.now()}`,
      time,
      label: label || `Marker ${markers.length + 1}`,
      color: 'bg-yellow-400'
    };
    
    setMarkers(prev => [...prev, newMarker].sort((a, b) => a.time - b.time));
  }, [markers.length]);
  
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const frames = Math.floor((time % 1) * 30); // Assuming 30fps
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };
  
  return (
    <Card className={`bg-gray-900 border-gray-700 ${className}`} padding="none">
      {/* Timeline Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-white">Timeline</h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => isPlaying ? onPause?.() : onPlay?.()}
                className="text-white hover:bg-gray-700 hover:bg-opacity-80"
              >
                {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
              </Button>
              
              <div className="text-white text-sm font-mono bg-gray-700 px-2 py-1 rounded">
                {formatTime(currentTime)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onZoomChange?.(Math.max(0.1, zoom - 0.1))}
              className="text-white hover:bg-gray-700"
            >
              <Minus className="w-4 h-4" />
            </Button>
            
            <span className="text-white text-sm min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onZoomChange?.(Math.min(5, zoom + 0.1))}
              className="text-white hover:bg-gray-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
            
            {/* Track Height */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTrackHeight(prev => Math.max(40, prev - 20))}
              className="text-white hover:bg-gray-700"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTrackHeight(prev => Math.min(120, prev + 20))}
              className="text-white hover:bg-gray-700"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            
            {/* Add Track Dropdown */}
            <div className="relative group">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-gray-700 flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Track</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
              
              <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[140px]">
                {Object.values(TRACK_TYPES).map(type => {
                  const Icon = getTrackIcon(type);
                  return (
                    <button
                      key={type}
                      onClick={() => addTrack(type)}
                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center space-x-2 first:rounded-t-lg last:rounded-b-lg"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="capitalize">{type}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Timeline Content */}
      <div className="flex" style={{ height: calculateTimelineHeight() }}>
        {/* Track Headers */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          {tracks.length === 0 ? (
            <div className="p-8 text-center">
              <div className="bg-gray-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FolderPlus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-white text-sm font-medium mb-2">No Tracks Yet</h3>
              <p className="text-gray-400 text-xs mb-4">Add tracks to start building your timeline</p>
              <div className="space-y-2">
                {Object.values(TRACK_TYPES).slice(0, 3).map(type => {
                  const Icon = getTrackIcon(type);
                  return (
                    <button
                      key={type}
                      onClick={() => addTrack(type)}
                      className="w-full px-3 py-2 text-left text-xs text-white hover:bg-gray-700 flex items-center space-x-2 rounded-md transition-colors"
                    >
                      <Icon className="w-3 h-3" />
                      <span className="capitalize">Add {type}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            tracks.map(track => {
            const Icon = getTrackIcon(track.type);
            const isCollapsed = collapsedTracks.has(track.id);
            
            return (
              <div
                key={track.id}
                className="border-b border-gray-700"
                style={{ height: isCollapsed ? 40 : trackHeight }}
              >
                <div className="p-3 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <button
                        onClick={() => toggleTrackCollapse(track.id)}
                        className="text-gray-400 hover:text-white flex-shrink-0"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                      
                      <div className={`w-3 h-3 rounded flex-shrink-0 ${track.color}`} />
                      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-white text-sm font-medium truncate flex-1">
                        {track.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          setShowMediaUpload(track.id);
                          setUploadingTrackId(track.id);
                        }}
                        className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                        title="Upload Media"
                      >
                        <Upload className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={() => deleteTrack(track.id)}
                        className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"
                        title="Delete Track"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  {!isCollapsed && (
                    <div className="flex items-center space-x-1 mt-auto">
                      <button
                        onClick={() => toggleTrackProperty(track.id, 'muted')}
                        className={`p-1 rounded hover:bg-gray-700 ${
                          track.muted ? 'text-red-400' : 'text-gray-400'
                        }`}
                        title="Mute"
                      >
                        {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                      
                      <button
                        onClick={() => toggleTrackProperty(track.id, 'solo')}
                        className={`p-1 rounded hover:bg-gray-700 text-xs font-bold ${
                          track.solo ? 'text-yellow-400' : 'text-gray-400'
                        }`}
                        title="Solo"
                      >
                        S
                      </button>
                      
                      <button
                        onClick={() => toggleTrackProperty(track.id, 'visible')}
                        className={`p-1 rounded hover:bg-gray-700 ${
                          track.visible ? 'text-gray-400' : 'text-red-400'
                        }`}
                        title="Visibility"
                      >
                        {track.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                      
                      <button
                        onClick={() => toggleTrackProperty(track.id, 'locked')}
                        className={`p-1 rounded hover:bg-gray-700 ${
                          track.locked ? 'text-red-400' : 'text-gray-400'
                        }`}
                        title="Lock"
                      >
                        {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
          )}
        </div>
        
        {/* Timeline Tracks */}
        <div className="flex-1 relative overflow-auto" ref={timelineRef}>
          {/* Time Ruler */}
          <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 h-8 flex items-center">
            <div className="relative" style={{ width: totalWidth }}>
              {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center"
                  style={{ left: timeToPixels(i) }}
                >
                  <div className="w-px h-full bg-gray-600" />
                  <span className="text-xs text-gray-400 ml-1">
                    {formatTime(i)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Tracks */}
          <div className="relative" onClick={handleTimelineClick}>
            {tracks.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center py-16">
                  <div className="bg-gray-700 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                    <Layers className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-white text-lg font-medium mb-2">Empty Timeline</h3>
                  <p className="text-gray-400 text-sm mb-6">Add tracks and upload media to get started</p>
                  <div className="flex justify-center space-x-2">
                    {Object.values(TRACK_TYPES).slice(0, 4).map(type => {
                      const Icon = getTrackIcon(type);
                      return (
                        <button
                          key={type}
                          onClick={(e) => {
                            e.stopPropagation();
                            addTrack(type);
                          }}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center space-x-2 transition-colors text-sm"
                        >
                          <Icon className="w-4 h-4" />
                          <span className="capitalize">{type}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              tracks.map(track => {
              const isCollapsed = collapsedTracks.has(track.id);
              
              return (
                <div
                  key={track.id}
                  className="border-b border-gray-700 relative"
                  style={{ height: isCollapsed ? 40 : trackHeight }}
                >
                  {/* Track Background */}
                  <div className="absolute inset-0 bg-gray-850" />
                  
                  {/* Clips */}
                  {track.clips.map(clip => {
                    const clipLeft = timeToPixels(clip.startTime);
                    const clipWidth = timeToPixels(clip.duration);
                    const isSelected = selectedClips.includes(clip.id);
                    
                    return (
                      <motion.div
                        key={clip.id}
                        className={`absolute top-1 bottom-1 rounded cursor-move select-none ${
                          track.color
                        } ${isSelected ? 'ring-2 ring-white' : ''} opacity-80 hover:opacity-100`}
                        style={{
                          left: clipLeft,
                          width: clipWidth,
                          minWidth: 20
                        }}
                        onMouseDown={(e) => handleClipDragStart(e, clip.id, track.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClips([clip.id]);
                          onClipSelect?.(clip);
                        }}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.1 }}
                      >
                        {/* Clip Content */}
                        <div className="h-full p-2 flex items-center justify-between text-white text-xs">
                          <span className="truncate font-medium">{clip.name}</span>
                          {clipWidth > 60 && (
                            <span className="text-xs opacity-70">
                              {formatTime(clip.duration)}
                            </span>
                          )}
                        </div>
                        
                        {/* Resize Handles */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white bg-opacity-0 hover:bg-opacity-30"
                          onMouseDown={(e) => handleClipResizeStart(e, clip.id, track.id, 'left')}
                        />
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white bg-opacity-0 hover:bg-opacity-30"
                          onMouseDown={(e) => handleClipResizeStart(e, clip.id, track.id, 'right')}
                        />
                        
                        {/* Keyframes */}
                        {showKeyframes && clip.keyframes && (
                          <div className="absolute bottom-0 left-0 right-0 h-1">
                            {clip.keyframes.map((keyframe, index) => (
                              <div
                                key={index}
                                className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                                style={{
                                  left: `${(keyframe.time / clip.duration) * 100}%`
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              );
            })
            )}
            
            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
              style={{ left: timeToPixels(currentTime) }}
            >
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full" />
            </div>
            
            {/* Markers */}
            {markers.map(marker => (
              <div
                key={marker.id}
                className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10"
                style={{ left: timeToPixels(marker.time) }}
                title={marker.label}
              >
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-400 rounded-full" />
              </div>
            ))}
            
            {/* Loop Region */}
            {loopRegion && (
              <div
                className="absolute top-0 bottom-0 bg-blue-500 bg-opacity-20 border-l-2 border-r-2 border-blue-500 z-5"
                style={{
                  left: timeToPixels(loopRegion.start),
                  width: timeToPixels(loopRegion.end - loopRegion.start)
                }}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Timeline Footer */}
      <div className="bg-gray-800 border-t border-gray-700 p-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <span>Duration: {formatTime(duration)}</span>
            <span>Tracks: {tracks.length}</span>
            <span>Selected: {selectedClips.length}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowKeyframes(!showKeyframes)}
              className={`px-2 py-1 rounded text-xs ${
                showKeyframes ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              Keyframes
            </button>
            
            <button
              onClick={() => addMarker(currentTime)}
              className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600"
            >
              Add Marker
            </button>
          </div>
        </div>
      </div>
      
      {/* Media Upload Modal */}
      <AnimatePresence>
        {showMediaUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => {
              setShowMediaUpload(null);
              setUploadingTrackId(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Upload Media to {tracks.find(t => t.id === showMediaUpload)?.name}
                </h3>
                <button
                  onClick={() => {
                    setShowMediaUpload(null);
                    setUploadingTrackId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <MediaUpload
                mediaType={tracks.find(t => t.id === showMediaUpload)?.type?.toUpperCase() || 'VIDEO'}
                onMediaSelect={(mediaData) => handleMediaUpload(showMediaUpload, mediaData)}
                maxSize={200 * 1024 * 1024} // 200MB
                className=""
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default EnhancedTimeline;