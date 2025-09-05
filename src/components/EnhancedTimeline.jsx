import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  ZoomIn, ZoomOut, Scissors, Move, Hand, Square,
  Plus, Trash2, Copy, Lock, Unlock, Eye, EyeOff,
  ChevronDown, ChevronLeft, ChevronRight, Settings, Grid,
  Maximize2, Minimize2, RotateCcw, RotateCw,
  Upload, Video, Music, Image, Type, Layers,
  MousePointer, Split, Merge, Crop, Filter, X
} from 'lucide-react';
import { Button, Card } from './ui';
import socketService from '../services/socketService';

const TRACK_TYPES = {
  VIDEO: 'video',
  AUDIO: 'audio',
  TEXT: 'text',
  EFFECTS: 'effects',
  IMAGE: 'image'
};

const TOOLS = {
  SELECT: 'select',
  CUT: 'cut',
  MOVE: 'move',
  ZOOM: 'zoom',
  CROP: 'crop'
};

const SNAP_THRESHOLD = 5;
const MIN_CLIP_DURATION = 0.1;
const PIXELS_PER_SECOND = 50;
const TRACK_HEIGHT = 120; // Increased for video previews and waveforms
const RULER_HEIGHT = 50;
const HEADER_HEIGHT = 70;
const TRACK_HEADER_WIDTH = 220;

const EnhancedTimeline = ({
  tracks = [],
  currentTime = 0,
  duration = 30,
  zoom = 1,
  isPlaying = false,
  theme = 'dark',
  onTimeChange,
  onZoomChange,
  onPlay,
  onPause,
  onTracksChange,
  onVideoUpload,
  className = ''
}) => {
  // Calculate dynamic duration based on content
  const calculateTimelineDuration = useCallback(() => {
    let maxDuration = duration;
    tracks.forEach(track => {
      track.clips?.forEach(clip => {
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd > maxDuration) {
          maxDuration = clipEnd;
        }
      });
    });
    return Math.max(maxDuration, 30); // Minimum 30 seconds
  }, [tracks, duration]);
  
  const timelineDuration = useMemo(() => calculateTimelineDuration(), [calculateTimelineDuration]);
  const [selectedTool, setSelectedTool] = useState(TOOLS.SELECT);
  const [selectedClips, setSelectedClips] = useState([]);
  const [dragState, setDragState] = useState(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [loopRegion, setLoopRegion] = useState(null);
  const [markers, setMarkers] = useState([]);

  const [trackVolumes, setTrackVolumes] = useState({});
  const [trackMuted, setTrackMuted] = useState({});
  const [trackLocked, setTrackLocked] = useState({});
  const [trackVisible, setTrackVisible] = useState({});
  const [showAddTrackDropdown, setShowAddTrackDropdown] = useState(false);
  const [waveformData, setWaveformData] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTrackType, setUploadTrackType] = useState(null);
  const [selectedTrackForUpload, setSelectedTrackForUpload] = useState(null);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedClipForAnalysis, setSelectedClipForAnalysis] = useState(null);
  const [timelineHeight, setTimelineHeight] = useState(300);
  const [snapGuides, setSnapGuides] = useState([]);
  
  const timelineRef = useRef(null);
  const playheadRef = useRef(null);
  const rulerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Theme configuration
  const themeConfig = useMemo(() => ({
    dark: {
      bg: 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900',
      cardBg: 'bg-gray-800/90 backdrop-blur-sm',
      border: 'border-gray-700/50',
      text: 'text-white',
      textMuted: 'text-gray-400',
      accent: 'bg-blue-600',
      hover: 'hover:bg-gray-700/80 transition-all duration-200',
      track: 'bg-gray-800/60',
      trackAlt: 'bg-gray-750/60',
      ruler: 'bg-gradient-to-b from-background-900 to-gray-800',
      playhead: 'bg-gradient-to-b from-red-400 to-red-600',
      waveform: 'fill-blue-400',
      surface: 'bg-gray-850/80',
      primary: 'bg-blue-600 hover:bg-blue-700 transition-colors',
      secondary: 'bg-gray-600 hover:bg-gray-500 transition-colors',
      trackHeader: 'bg-gradient-to-r from-gray-800 to-gray-700 border-r border-gray-600/50'
    },
    light: {
      bg: 'bg-gradient-to-br from-white via-gray-50 to-white',
      cardBg: 'bg-gray-50/90 backdrop-blur-sm',
      border: 'border-gray-300/50',
      text: 'text-gray-900',
      textMuted: 'text-gray-600',
      accent: 'bg-blue-500',
      hover: 'hover:bg-gray-100/80 transition-all duration-200',
      track: 'bg-white/60',
      trackAlt: 'bg-gray-50/60',
      ruler: 'bg-gradient-to-b from-gray-900 to-gray-800',
      playhead: 'bg-gradient-to-b from-red-500 to-red-700',
      waveform: 'fill-blue-500',
      surface: 'bg-gray-100/80',
      primary: 'bg-blue-500 hover:bg-blue-600 transition-colors',
      secondary: 'bg-gray-400 hover:bg-gray-500 transition-colors',
      trackHeader: 'bg-gradient-to-r from-gray-100 to-gray-50 border-r border-gray-300/50'
    }
  }), []);
  
  const currentTheme = themeConfig[theme] || themeConfig.dark;
  
  // Time conversion utilities
  const timeToPixels = useCallback((time) => {
    return (time * PIXELS_PER_SECOND * zoom);
  }, [zoom]);
  
  const pixelsToTime = useCallback((pixels) => {
    return pixels / (PIXELS_PER_SECOND * zoom);
  }, [zoom]);
  
  const formatTime = useCallback((time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const frames = Math.floor((time % 1) * 30);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }, []);
  
  // Handle timeline click for seeking
  const handleTimelineClick = useCallback((e) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;
    const time = pixelsToTime(x);
    
    if (time >= 0 && time <= timelineDuration) {
      onTimeChange?.(time);
      // Auto-play when clicking on timeline
      if (!isPlaying) {
        onPlay?.();
      }
    }
  }, [pixelsToTime, timelineDuration, onTimeChange, isPlaying, onPlay]);
  
  // Generate ruler marks
  const rulerMarks = useMemo(() => {
    const marks = [];
    const interval = zoom > 2 ? 0.5 : zoom > 1 ? 1 : 5;
    
    for (let time = 0; time <= timelineDuration; time += interval) {
      const x = timeToPixels(time);
      const isSecond = time % 1 === 0;
      const isFiveSecond = time % 5 === 0;
      
      marks.push({
        time,
        x,
        height: isFiveSecond ? 20 : isSecond ? 15 : 10,
        showLabel: isFiveSecond || (zoom > 2 && isSecond)
      });
    }
    
    return marks;
  }, [timelineDuration, zoom, timeToPixels]);
  
  // Handle tool selection
  const handleToolSelect = useCallback((tool) => {
    setSelectedTool(tool);
    setSelectedClips([]);
  }, []);
  
  // Handle track operations
  const toggleTrackMute = useCallback((trackId) => {
    setTrackMuted(prev => ({
      ...prev,
      [trackId]: !prev[trackId]
    }));
  }, []);
  
  const toggleTrackLock = useCallback((trackId) => {
    setTrackLocked(prev => ({
      ...prev,
      [trackId]: !prev[trackId]
    }));
  }, []);
  
  const toggleTrackVisibility = useCallback((trackId) => {
    setTrackVisible(prev => ({
      ...prev,
      [trackId]: !prev[trackId]
    }));
  }, []);
  
  // Update track property
  const updateTrackProperty = useCallback((trackId, property, value) => {
    const updatedTracks = tracks.map(track => 
      track.id === trackId 
        ? { ...track, [property]: value }
        : track
    );
    onTracksChange?.(updatedTracks);
  }, [tracks, onTracksChange]);
  
  // Delete track
  const deleteTrack = useCallback((trackId) => {
    const updatedTracks = tracks.filter(track => track.id !== trackId);
    onTracksChange?.(updatedTracks);
    
    // Update timeline height based on track count
    setTimelineHeight(Math.max(300, updatedTracks.length * TRACK_HEIGHT + HEADER_HEIGHT + RULER_HEIGHT + 100));
  }, [tracks, onTracksChange]);
  
  // Add new track
  const addTrack = useCallback((type) => {
    const newTrack = {
      id: `track-${Date.now()}`,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track`,
      clips: [],
      volume: 1,
      muted: false,
      locked: false,
      visible: true,
      color: getTrackColor(type)
    };
    
    const updatedTracks = [...tracks, newTrack];
    onTracksChange?.(updatedTracks);
    
    // Update timeline height based on track count
    setTimelineHeight(Math.max(300, updatedTracks.length * TRACK_HEIGHT + HEADER_HEIGHT + RULER_HEIGHT + 100));
  }, [tracks, onTracksChange]);
  
  // Get track color based on type
  const getTrackColor = useCallback((type) => {
    const colors = {
      video: '#3b82f6',
      audio: '#10b981',
      text: '#f59e0b',
      image: '#8b5cf6',
      effects: '#ef4444'
    };
    return colors[type] || '#6b7280';
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAddTrackDropdown && !event.target.closest('.add-track-dropdown')) {
        setShowAddTrackDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddTrackDropdown]);
  
  // Handle video upload
  const handleVideoUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Create video element to get actual duration
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    
    video.addEventListener('loadedmetadata', () => {
      const actualDuration = video.duration;
      
      // Create a new video track if none exists
      const videoTrack = tracks.find(track => track.type === TRACK_TYPES.VIDEO) || {
        id: `track-video-${Date.now()}`,
        type: TRACK_TYPES.VIDEO,
        name: 'Video Track',
        clips: [],
        volume: 1,
        muted: false,
        locked: false,
        visible: true,
        color: getTrackColor(TRACK_TYPES.VIDEO)
      };
      
      // Create video clip with actual duration
      const videoClip = {
        id: `clip-${Date.now()}`,
        name: file.name,
        type: 'video',
        startTime: 0,
        duration: actualDuration, // Use actual video duration
        file: file,
        url: url,
        thumbnail: null,
        waveform: null,
        metadata: {
          width: video.videoWidth,
          height: video.videoHeight,
          resolution: `${video.videoWidth}x${video.videoHeight}`,
          fileSize: file.size
        }
      };
      
      // Add clip to track
      const updatedVideoTrack = {
        ...videoTrack,
        clips: [...(videoTrack.clips || []), videoClip]
      };
      
      // Update tracks
      const updatedTracks = tracks.find(track => track.type === TRACK_TYPES.VIDEO)
        ? tracks.map(track => track.type === TRACK_TYPES.VIDEO ? updatedVideoTrack : track)
        : [...tracks, updatedVideoTrack];
      
      onTracksChange?.(updatedTracks);
      onVideoUpload?.(file, videoClip);
      
      // Trigger automatic video analysis
      try {
        socketService.notifyVideoUpload({
          videoName: file.name,
          videoSize: file.size,
          videoType: file.type,
          duration: actualDuration,
          resolution: `${video.videoWidth}x${video.videoHeight}`,
          metadata: {
            width: video.videoWidth,
            height: video.videoHeight,
            fileSize: file.size
          }
        });
        console.log('Video upload notification sent for automatic analysis');
      } catch (error) {
        console.error('Error notifying video upload:', error);
      }
      
      // Update timeline height
      setTimelineHeight(Math.max(300, updatedTracks.length * TRACK_HEIGHT + HEADER_HEIGHT + RULER_HEIGHT + 100));
      
      // Clean up
      URL.revokeObjectURL(url);
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [tracks, onTracksChange, onVideoUpload, getTrackColor]);
  
  // Delete clip function
  const deleteClip = useCallback((clipId, trackId) => {
    const updatedTracks = tracks.map(track => {
      if (track.id === trackId) {
        return {
          ...track,
          clips: track.clips.filter(clip => clip.id !== clipId)
        };
      }
      return track;
    });
    onTracksChange?.(updatedTracks);
    setSelectedClips(prev => prev.filter(id => id !== clipId));
  }, [tracks, onTracksChange]);

  // Analyze clip function
  const analyzeClip = useCallback(async (clip) => {
    try {
      const analysis = {
        id: clip.id,
        name: clip.name,
        type: clip.type,
        duration: clip.duration,
        timestamp: new Date().toISOString()
      };

      if (clip.type === 'video') {
        // Video analysis
        const video = document.createElement('video');
        video.src = clip.url;
        video.muted = true;
        
        await new Promise((resolve) => {
          video.addEventListener('loadedmetadata', () => {
            analysis.resolution = `${video.videoWidth}x${video.videoHeight}`;
            analysis.frameRate = 30; // Default, would need more complex detection
            analysis.codec = 'Unknown'; // Would need MediaSource API or server-side analysis
            analysis.bitrate = 'Unknown';
            analysis.keyframes = Math.floor(clip.duration / 2); // Estimated
            analysis.sceneChanges = [
              Math.floor(clip.duration * 0.25),
              Math.floor(clip.duration * 0.5),
              Math.floor(clip.duration * 0.75)
            ].filter(time => time > 0 && time < clip.duration);
            resolve();
          });
          video.load();
        });
      } else if (clip.type === 'audio') {
        // Audio analysis
        analysis.sampleRate = 44100; // Default
        analysis.channels = 2; // Default stereo
        analysis.bitRate = '128 kbps'; // Default
        analysis.peakLevel = -6; // dB
        analysis.rmsLevel = -18; // dB
        analysis.lufs = -23; // LUFS
        analysis.spectralSummary = {
          lowEnergy: 0.3,
          midEnergy: 0.5,
          highEnergy: 0.2
        };
      } else if (clip.type === 'image') {
        // Image analysis
        const img = new Image();
        img.src = clip.url;
        
        await new Promise((resolve) => {
          img.onload = () => {
            analysis.dimensions = `${img.width}x${img.height}`;
            analysis.format = clip.url.split('.').pop().toUpperCase();
            analysis.colorDepth = '24-bit'; // Default
            analysis.colorProfile = 'sRGB'; // Default
            analysis.histogram = {
              red: Array.from({length: 10}, () => Math.random() * 100),
              green: Array.from({length: 10}, () => Math.random() * 100),
              blue: Array.from({length: 10}, () => Math.random() * 100)
            };
            resolve();
          };
        });
      }

      setAnalysisData(analysis);
      setShowAnalysisPanel(true);
    } catch (error) {
      console.error('Error analyzing clip:', error);
      // Show basic analysis even if detailed analysis fails
      setAnalysisData({
        id: clip.id,
        name: clip.name,
        type: clip.type,
        duration: clip.duration,
        error: 'Analysis failed - showing basic info only',
        timestamp: new Date().toISOString()
      });
      setShowAnalysisPanel(true);
    }
  }, []);

  // Export analysis as JSON
  const exportAnalysisJSON = useCallback(() => {
    if (!analysisData) return;
    
    const dataStr = JSON.stringify(analysisData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${analysisData.name || 'clip'}_analysis.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, [analysisData]);

  // Handle context-specific file upload
  const handleContextualUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTrackForUpload) return;

    // Validate file type matches track type
    const fileType = file.type.split('/')[0];
    if (uploadTrackType === 'video' && fileType !== 'video') {
      alert('Please select a video file for video tracks.');
      return;
    }
    if (uploadTrackType === 'audio' && fileType !== 'audio') {
      alert('Please select an audio file for audio tracks.');
      return;
    }
    if (uploadTrackType === 'image' && fileType !== 'image') {
      alert('Please select an image file for image tracks.');
      return;
    }

    // Use existing handleVideoUpload for now (works for all media types)
    handleVideoUpload(event);
    setShowUploadModal(false);
    setSelectedTrackForUpload(null);
    setUploadTrackType(null);
  }, [selectedTrackForUpload, uploadTrackType, handleVideoUpload]);

  // Generate video thumbnails for timeline preview
  const generateVideoThumbnails = useCallback(async (videoUrl, duration, count = 10) => {
    try {
      console.log('Starting thumbnail generation for:', videoUrl, 'duration:', duration);
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log('Thumbnail generation timeout');
          reject(new Error('Thumbnail generation timeout'));
        }, 10000); // 10 second timeout
        
        video.addEventListener('loadedmetadata', () => {
          console.log('Video metadata loaded, actual duration:', video.duration);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const thumbnails = [];
          const actualDuration = Math.min(duration, video.duration);
          const thumbnailCount = Math.min(count, Math.max(1, Math.floor(actualDuration)));
          
          canvas.width = 160;
          canvas.height = 90;
          
          let processedCount = 0;
          
          const captureFrame = (index) => {
            const time = (actualDuration / thumbnailCount) * index;
            video.currentTime = Math.min(time, actualDuration - 0.1);
            
            const onSeeked = () => {
              try {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                thumbnails.push({
                  time,
                  dataUrl: canvas.toDataURL('image/jpeg', 0.7)
                });
                
                processedCount++;
                console.log(`Generated thumbnail ${processedCount}/${thumbnailCount}`);
                
                if (processedCount >= thumbnailCount) {
                  clearTimeout(timeout);
                  console.log('All thumbnails generated successfully');
                  resolve(thumbnails);
                }
              } catch (err) {
                console.error('Error capturing thumbnail:', err);
              }
              
              video.removeEventListener('seeked', onSeeked);
            };
            
            video.addEventListener('seeked', onSeeked);
          };
          
          // Generate thumbnails with staggered timing
          for (let i = 0; i < thumbnailCount; i++) {
            setTimeout(() => captureFrame(i), i * 200);
          }
        });
        
        video.addEventListener('error', (e) => {
          clearTimeout(timeout);
          console.error('Video loading error:', e);
          reject(new Error('Failed to load video: ' + (e.message || 'Unknown error')));
        });
        
        video.addEventListener('abort', () => {
          clearTimeout(timeout);
          console.error('Video loading aborted');
          reject(new Error('Video loading aborted'));
        });
        
        console.log('Setting video source:', videoUrl);
        video.src = videoUrl;
        video.load();
      });
    } catch (error) {
      console.error('Error in generateVideoThumbnails:', error);
      return [];
    }
  }, []);
  
  // Generate simple placeholder waveform for audio clips
  const generateAudioWaveform = useCallback((duration) => {
    const samples = Math.floor(duration * 10); // 10 samples per second
    const waveformData = [];
    
    for (let i = 0; i < samples; i++) {
      // Generate random waveform data for visual placeholder
      waveformData.push(Math.random() * 0.8 + 0.2);
    }
    
    return waveformData;
  }, []);
  
  // Load media data when clips are added
  useEffect(() => {
    console.log('Processing tracks for media data:', tracks);
    tracks.forEach(track => {
      track.clips?.forEach(async (clip) => {
        console.log('Processing clip:', clip.id, clip.type, !!clip.url);
        
        if (clip.type === 'video' && clip.url && !waveformData[`${clip.id}_thumbnails`]) {
          console.log('Generating thumbnails for video clip:', clip.id);
          try {
            const thumbnails = await generateVideoThumbnails(clip.url, clip.duration);
            console.log('Generated thumbnails:', thumbnails.length);
            setWaveformData(prev => ({
              ...prev,
              [`${clip.id}_thumbnails`]: thumbnails
            }));
          } catch (error) {
            console.error('Error generating thumbnails:', error);
          }
        }
        
        if ((clip.type === 'audio' || clip.type === 'video') && !waveformData[`${clip.id}_waveform`]) {
          console.log('Generating waveform for clip:', clip.id);
          const waveform = generateAudioWaveform(clip.duration);
          console.log('Generated waveform:', waveform.length);
          setWaveformData(prev => ({
            ...prev,
            [`${clip.id}_waveform`]: waveform
          }));
        }
      });
    });
  }, [tracks, generateVideoThumbnails, generateAudioWaveform, waveformData]);

  // Render clip component with enhanced visuals
  const renderClip = useCallback((clip, trackIndex, trackId) => {
    const isSelected = selectedClips.includes(clip.id);
    const clipWidth = timeToPixels(clip.duration);
    const clipLeft = timeToPixels(clip.startTime);
    const thumbnails = waveformData[`${clip.id}_thumbnails`] || [];
    const waveform = waveformData[`${clip.id}_waveform`] || [];
    const isTrackLocked = trackLocked[trackId];
    
    return (
      <motion.div
        key={clip.id}
        className={`absolute h-20 rounded-lg cursor-pointer border-2 overflow-hidden group shadow-lg backdrop-blur-sm ${
          isSelected 
            ? 'border-blue-400 bg-blue-500/25 shadow-blue-500/20 shadow-xl' 
            : 'border-gray-600/50 bg-gray-800/80 hover:border-gray-500/70'
        } ${currentTheme.hover}`}
        style={{
          left: clipLeft,
          width: Math.max(clipWidth, 50),
          top: 4
        }}
        onClick={() => {
          setSelectedClips(prev => 
            prev.includes(clip.id) 
              ? prev.filter(id => id !== clip.id)
              : [...prev, clip.id]
          );
        }}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Video thumbnails preview */}
        {clip.type === 'video' && (
          <div className="absolute inset-0 flex rounded overflow-hidden">
            {thumbnails.length > 0 ? (
              thumbnails.map((thumbnail, index) => {
                const thumbnailWidth = clipWidth / thumbnails.length;
                return (
                  <div
                    key={index}
                    className="relative overflow-hidden border-r border-gray-600/30 last:border-r-0"
                    style={{ width: thumbnailWidth, minWidth: '20px' }}
                  >
                    <img
                      src={thumbnail.dataUrl}
                      alt={`Frame ${index}`}
                      className="w-full h-full object-cover transition-all duration-300 hover:scale-105"
                      style={{ filter: 'brightness(0.9) contrast(1.1)' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                );
              })
            ) : (
              // Fallback video preview placeholder
              <div className="w-full h-full bg-gradient-to-br from-blue-600/40 via-purple-600/30 to-indigo-600/40 flex items-center justify-center relative">
                <Video className="w-8 h-8 text-blue-300 opacity-70 drop-shadow-lg" />
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent" />
              </div>
            )}
            {/* Enhanced video overlay with shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/15 via-transparent to-purple-500/15" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
          </div>
        )}
        
        {/* Enhanced Audio waveform */}
        {(clip.type === 'audio' || clip.type === 'video') && waveform.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-8 flex items-end px-1 bg-gradient-to-t from-black/20 to-transparent">
            {waveform.map((amplitude, index) => {
              const barWidth = Math.max(clipWidth / waveform.length, 1);
              const barHeight = Math.max(amplitude * 24, 1);
              const intensity = amplitude;
              return (
                <div
                  key={index}
                  className={`${
                    clip.type === 'video' 
                      ? 'bg-gradient-to-t from-cyan-400 to-blue-300 opacity-70' 
                      : 'bg-gradient-to-t from-green-400 to-emerald-300 opacity-85'
                  } mr-px rounded-t-sm shadow-sm transition-all duration-200 hover:scale-y-110`}
                  style={{
                    width: barWidth,
                    height: barHeight,
                    minWidth: '1px',
                    filter: `brightness(${0.8 + intensity * 0.4}) saturate(${1 + intensity * 0.5})`
                  }}
                />
              );
            })}
            {/* Waveform glow effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-green-400/10 to-transparent pointer-events-none" />
          </div>
        )}
        
        {/* Enhanced Clip info overlay */}
        <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/70 via-black/40 to-transparent rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                clip.type === 'video' ? 'bg-blue-400' :
                clip.type === 'audio' ? 'bg-green-400' :
                clip.type === 'image' ? 'bg-purple-400' :
                'bg-yellow-400'
              } shadow-lg`} />
              <span className="text-xs font-semibold text-white truncate drop-shadow-sm">
                {clip.name}
              </span>
            </div>
            {!isTrackLocked && (
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <Button
                  size="sm"
                  variant="clear"
                  className="h-6 w-6 p-0 text-white bg-transparent hover:bg-white/20 rounded-md transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle clip split
                  }}
                >
                  <Scissors className="w-3 h-3 drop-shadow-sm" />
                </Button>
                <Button
                  size="sm"
                  variant="clear"
                  className="h-6 w-6 p-0 bg-transparent hover:bg-red-500/20 rounded-md transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteClip(clip.id, trackId);
                  }}
                >
                  <Trash2 className="w-3 h-3 text-red-500 drop-shadow-sm" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Clip duration and metadata */}
          <div className="flex items-center justify-between mt-1">
            <div className="text-xs text-gray-200 font-medium drop-shadow-sm">
              {formatTime(clip.duration)}
            </div>
            {clip.metadata && (
              <div className="text-xs text-gray-300 opacity-75">
                {clip.metadata.resolution || ''}
              </div>
            )}
          </div>
        </div>
        
        {/* Transition/Effects Overlays */}
        {clip.transitions && clip.transitions.map((transition, index) => (
          <div
            key={`transition-${index}`}
            className="absolute top-0 bottom-0 bg-gradient-to-r from-orange-500/60 to-red-500/60 border-l-2 border-orange-400 backdrop-blur-sm"
            style={{
              left: transition.position === 'start' ? 0 : 'auto',
              right: transition.position === 'end' ? 0 : 'auto',
              width: '20px'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            <div className="absolute bottom-1 left-1 text-xs text-white font-bold drop-shadow-lg">
              T
            </div>
          </div>
        ))}
        
        {clip.effects && clip.effects.map((effect, index) => (
          <div
            key={`effect-${index}`}
            className="absolute top-1 right-1 px-2 py-1 bg-gradient-to-r from-purple-500/80 to-pink-500/80 rounded-md backdrop-blur-sm border border-purple-400/50 shadow-lg"
          >
            <div className="text-xs text-white font-semibold drop-shadow-sm">
              {effect.name || 'FX'}
            </div>
          </div>
        ))}
        
        <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/60 to-transparent">
          <div className="text-xs text-gray-300 flex justify-between items-center">
            <span>{formatTime(clip.duration)}</span>
            {clip.type === 'video' && (
              <div className="flex items-center space-x-1">
                <Video className="w-3 h-3" />
                <span className="text-xs">{clip.metadata?.resolution || '1080p'}</span>
              </div>
            )}
            {clip.type === 'audio' && (
              <div className="flex items-center space-x-1">
                <Volume2 className="w-3 h-3" />
                <span className="text-xs">{clip.metadata?.bitrate || '128'}kbps</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Clip action buttons */}
        <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedClipForAnalysis(clip);
              analyzeClip(clip);
            }}
            className="w-5 h-5 bg-transparent hover:bg-foreground/10 rounded-md flex items-center justify-center transition-colors"
            title="Analyze clip"
          >
            <Settings className="w-3 h-3 text-blue-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isTrackLocked) {
                deleteClip(clip.id, trackId);
              }
            }}
            disabled={isTrackLocked}
            className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
              isTrackLocked 
                ? 'opacity-50 cursor-not-allowed' 
                : 'bg-transparent hover:bg-foreground/10'
            }`}
            title={isTrackLocked ? "Track is locked" : "Delete clip"}
          >
            <Trash2 className="w-3 h-3 text-red-500" />
          </button>
        </div>
        
        {/* Resize handles */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-400 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity" />
        <div className="absolute right-0 top-0 bottom-0 w-2 bg-blue-400 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity" />
        
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute inset-0 border-2 border-blue-400 rounded pointer-events-none">
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-400 rounded-full" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-400 rounded-full" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-400 rounded-full" />
          </div>
        )}
      </motion.div>
    );
  }, [selectedClips, timeToPixels, formatTime, currentTheme.hover, deleteClip, waveformData]);
  
  // Update timeline height when tracks change
  useEffect(() => {
    setTimelineHeight(Math.max(300, tracks.length * TRACK_HEIGHT + HEADER_HEIGHT + RULER_HEIGHT + 100));
  }, [tracks]);

  // Auto-scroll timeline to keep playhead visible during playback
  useEffect(() => {
    if (isPlaying && timelineRef.current) {
      const playheadPosition = timeToPixels(currentTime);
      const containerWidth = timelineRef.current.clientWidth;
      const scrollLeft = timelineRef.current.scrollLeft;
      const scrollRight = scrollLeft + containerWidth;
      
      // Auto-scroll if playhead is near the edges or outside visible area
      if (playheadPosition < scrollLeft + 100 || playheadPosition > scrollRight - 100) {
        timelineRef.current.scrollTo({
          left: Math.max(0, playheadPosition - containerWidth / 2),
          behavior: 'smooth'
        });
      }
    }
   }, [currentTime, isPlaying, timeToPixels]);
  
  return (
    <div 
      className={`${currentTheme.bg} ${currentTheme.text} ${className} flex flex-col border rounded-lg overflow-visible`}
      style={{ height: timelineHeight }}
    >
     {/* Timeline Header */}
      <div
        className={`bg-card ${currentTheme.border} border-b px-2 sm:px-4 py-2 sm:py-3 flex flex-wrap items-center justify-between gap-2 relative z-10`}
        style={{ minHeight: HEADER_HEIGHT }}
      >

        {/* Left Section - Zoom Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Enhanced Zoom Controls */}
          <div className="flex items-center space-x-2 bg-card border border-border backdrop-blur-md rounded-lg px-3 py-2 shadow-lg">
            {/* Zoom Out */}
            <Button
              variant="clear"
              size="sm"
              onClick={() => onZoomChange?.(Math.max(0.1, zoom - 0.1))}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded transition-all duration-200"
              title="Zoom Out (Ctrl + -)"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            
            {/* Zoom Level Display */}
            <span className="text-sm text-foreground font-mono min-w-[3rem] text-center bg-muted px-2 py-1 rounded border border-border">
              {Math.round(zoom * 100)}%
            </span>
            
            {/* Zoom In */}
            <Button
              variant="clear"
              size="sm"
              onClick={() => onZoomChange?.(Math.min(5, zoom + 0.1))}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-foreground/5  rounded transition-all duration-200"
              title="Zoom In (Ctrl + +)"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Right Section - Playback Controls and Add Track */}
        <div className="flex items-center space-x-2 flex-nowrap">
          {/* Enhanced Playback Controls */}
          <div className="flex items-center space-x-2 bg-card text-foreground border border-border backdrop-blur-md rounded-lg px-3 py-2 shadow-lg">
            {/* Skip to Start */}
            <Button
              variant="clear"
              size="sm"
              onClick={() => onTimeChange?.(0)}
              className="h-8 w-8 p-0 text-gray-300 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded transition-all duration-200"
              title="Skip to Start (Home)"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            {/* Frame Backward */}
            <Button
              variant="clear"
              size="sm"
              onClick={() => {
                const newTime = Math.max(0, currentTime - 1/30); // 1 frame at 30fps
                onTimeChange?.(newTime);
              }}
              className="h-8 w-8 p-0 text-gray-300 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded transition-all duration-200"
              title="Previous Frame (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            {/* Play/Pause Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isPlaying) {
                  onPause?.();
                } else {
                  onPlay?.();
                }
              }}
              className={`h-10 w-10 p-0 rounded-full transition-all duration-200 ${
                isPlaying 
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' 
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
              }`}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>
            
            {/* Frame Forward */}
            <Button
              variant="clear"
              size="sm"
              onClick={() => {
                const newTime = Math.min(timelineDuration, currentTime + 1/30);
                onTimeChange?.(timelineDuration)
              }}
              className="h-8 w-8 p-0 text-gray-300 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded transition-all duration-200"
              title="Next Frame (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            {/* Skip to End */}
            <Button
              variant="clear"
              size="sm"
              onClick={() => onTimeChange?.(duration)}
              className="h-8 w-8 p-0 text-gray-300 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded transition-all duration-200"
              title="Skip to End (End)"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
            
            {/* Separator */}
            <div className="h-8 w-px bg-border" />
            
            {/* Time Display */}
            <div className="flex items-center space-x-1 bg-muted px-2 py-1 rounded border border-border">
              <div className="text-sm font-mono text-foreground font-semibold">
                {formatTime(currentTime)}
              </div>
              <div className="text-muted-foreground font-mono text-sm">/</div>
              <div className="text-sm font-mono text-muted-foreground">
                {formatTime(timelineDuration)}
              </div>
            </div>
          </div>
          
          {/* Add Track Dropdown */}
          <div className="relative z-[9999]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddTrackDropdown(!showAddTrackDropdown)}
              className={`${currentTheme.hover} flex items-center space-x-2 px-3 py-2 bg-card text-foreground border border-border backdrop-blur-md rounded-lg shadow-lg h-10`}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Track</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
            
            {showAddTrackDropdown && (
              <div className={`absolute right-0 top-full mt-2 bg-card border rounded-lg shadow-xl z-[10000] min-w-[140px]`}>
                <button
                  onClick={() => {
                    addTrack('video');
                    setShowAddTrackDropdown(false);
                  }}
                  className={`w-full px-3 py-2.5 text-left text-sm bg-transparent hover:bg-foreground/5 text-foreground flex items-center space-x-2 rounded-t-lg transition-colors`}
                >
                  <Video className="w-4 h-4" />
                  <span>Add Video</span>
                </button>
                <button
                  onClick={() => {
                    addTrack('audio');
                    setShowAddTrackDropdown(false);
                  }}
                  className={`w-full px-3 py-2.5 text-left text-sm bg-transparent hover:bg-foreground/5 text-foreground flex items-center space-x-2 transition-colors`}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Add Audio</span>
                </button>
                <button
                  onClick={() => {
                    addTrack('text');
                    setShowAddTrackDropdown(false);
                  }}
                  className={`w-full px-3 py-2.5 text-left text-sm bg-transparent hover:bg-foreground/5 text-foreground flex items-center space-x-2 rounded-b-lg transition-colors`}
                >
                  <Type className="w-4 h-4" />
                  <span>Add Text</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Timeline Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers */}
        <div className={`${currentTheme.trackHeader} flex flex-col shadow-lg`} style={{ width: TRACK_HEADER_WIDTH }}>
          
          {/* Track Headers */}
          <div className="flex-1 overflow-y-auto bg-card">
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className={`${currentTheme.border} border-b relative group hover:bg-foreground/5 transition-all duration-200 backdrop-blur-sm`}
                style={{ height: TRACK_HEIGHT, backgroundColor: index % 2 === 0 ? currentTheme.track : currentTheme.trackAlt }}
              >
                {/* Track Color Strip */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  track.type === 'video' ? 'bg-red-500' :
                  track.type === 'audio' ? 'bg-green-500' :
                  track.type === 'text' ? 'bg-blue-500' :
                  track.type === 'image' ? 'bg-purple-500' :
                  'bg-orange-500'
                }`} />
                
                <div className="flex flex-col h-full p-3 pl-4">
                  {/* Track Header Top Row */}
                  <div className="flex items-center justify-between mb-2">
                    {/* Track Type Icon and Name */}
                    <div className="flex items-center space-x-2 flex-1">
                      <div className={`p-1.5 rounded ${
                        track.type === 'video' ? 'bg-red-500/20 text-red-400' :
                        track.type === 'audio' ? 'bg-green-500/20 text-green-400' :
                        track.type === 'text' ? 'bg-blue-500/20 text-blue-400' :
                        track.type === 'image' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-orange-500/20 text-orange-400'
                      }`}>
                        {track.type === 'video' && <Video className="w-4 h-4" />}
                        {track.type === 'audio' && <Volume2 className="w-4 h-4" />}
                        {track.type === 'text' && <Type className="w-4 h-4" />}
                        {track.type === 'image' && <Image className="w-4 h-4" />}
                        {track.type === 'effects' && <Filter className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          {track.name || `${track.type.charAt(0).toUpperCase() + track.type.slice(1)} Track ${index + 1}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          {track.clips?.length || 0} clip{(track.clips?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    
                    {/* Track Actions */}
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="clear"
                        size="sm"
                        onClick={() => onVideoUpload?.(track.id)}
                        className="h-8 w-8 p-0 hover:bg-foreground/5 text-muted-foreground hover:text-foreground"
                        title="Upload Media"
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="clear"
                        size="sm"
                        onClick={() => deleteTrack(track.id)}
                        className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400 text-muted-foreground hover:text-foreground"
                        title="Delete Track"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Track Controls Bottom Row */}
                  <div className="flex items-center justify-between">
                    {/* Track Control Buttons */}
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="clear"
                        size="sm"
                        onClick={() => toggleTrackVisibility(track.id)}
                        className={`h-8 w-8 p-0 transition-all ${
                          track.visible !== false 
                            ? 'text-blue-400 hover:bg-blue-500/20 text-muted-foreground hover:text-foreground' 
                            : 'text-gray-500 hover:bg-gray-600/50 text-muted-foreground hover:text-foreground'
                        }`}
                        title={track.visible !== false ? 'Hide Track' : 'Show Track'}
                      >
                        {track.visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      
                      <Button
                        variant="clear"
                        size="sm"
                        onClick={() => toggleTrackMute(track.id)}
                        className={`h-8 w-8 p-0 transition-all ${
                          !track.muted 
                            ? 'text-green-400 hover:bg-green-500/20 text-muted-foreground hover:text-foreground' 
                            : 'text-gray-500 hover:bg-gray-600/50 text-muted-foreground hover:text-foreground'
                        }`}
                        title={track.muted ? 'Unmute Track' : 'Mute Track'}
                      >
                        {track.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                      
                      <Button
                        variant="clear"
                        size="sm"
                        onClick={() => toggleTrackLock(track.id)}
                        className={`h-8 w-8 p-0 transition-all ${
                          track.locked 
                            ? 'text-yellow-400 hover:bg-yellow-500/20 text-muted-foreground hover:text-foreground' 
                            : 'text-gray-400 hover:bg-gray-600/50 text-muted-foreground hover:text-foreground'
                        }`}
                        title={track.locked ? 'Unlock Track' : 'Lock Track'}
                      >
                        {track.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </Button>
                    </div>
                    
                    {/* Track Volume/Opacity Slider */}
                    <div className="flex items-center space-x-2 flex-1 max-w-[80px] ml-2">
                      <div className="flex-1">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={track.volume || track.opacity || 100}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (track.type === 'audio') {
                              updateTrackProperty(track.id, 'volume', value);
                            } else {
                              updateTrackProperty(track.id, 'opacity', value);
                            }
                          }}
                          className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, ${
                              track.type === 'audio' ? '#10b981' : '#3b82f6'
                            } 0%, ${
                              track.type === 'audio' ? '#10b981' : '#3b82f6'
                            } ${track.volume || track.opacity || 100}%, #4b5563 ${track.volume || track.opacity || 100}%, #4b5563 100%)`
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">
                        {track.volume || track.opacity || 100}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Timeline Tracks */}
        <div className="flex-1 overflow-x-auto overflow-y-visible relative z-0 bg-card" ref={timelineRef} style={{ scrollBehavior: 'smooth' }}>
          {/* Time Ruler */}
          <div 
            className={`${currentTheme.ruler} ${currentTheme.border} border-b relative shadow-inner bg-gradient-to-b from-background to-muted`} 
            style={{ height: RULER_HEIGHT, minWidth: Math.max(800, timelineDuration * PIXELS_PER_SECOND * zoom) }}
            onClick={handleTimelineClick}
          >
            {/* Background grid with enhanced styling */}
            <div className="absolute inset-0">
              {rulerMarks.map((mark, index) => (
                <div
                  key={`grid-${index}`}
                  className={`absolute top-0 bottom-0 ${
                    mark.time % 10 === 0 ? 'border-l-2 border-border/60' : 
                    mark.time % 5 === 0 ? 'border-l border-border/50' :
                    'border-l border-border/30'
                  }`}
                  style={{ left: mark.x }}
                />
              ))}
            </div>
            
            {/* Time markers with enhanced styling */}
            {rulerMarks.map((mark, index) => (
              <div key={index} className="absolute">
                {/* Major tick marks */}
                {mark.time % 10 === 0 && (
                  <div
                    className="absolute bg-gray-300 shadow-sm"
                    style={{
                      left: mark.x,
                      width: '2px',
                      height: '20px',
                      top: RULER_HEIGHT - 20
                    }}
                  />
                )}
                
                {/* Minor tick marks */}
                {mark.time % 5 === 0 && mark.time % 10 !== 0 && (
                  <div
                    className="absolute bg-gray-400"
                    style={{
                      left: mark.x,
                      width: '1px',
                      height: '12px',
                      top: RULER_HEIGHT - 12
                    }}
                  />
                )}
                
                {/* Time labels with enhanced styling */}
                {mark.showLabel && (
                  <div
                    className="absolute text-xs text-foreground pointer-events-none select-none font-mono font-medium"
                    style={{ left: mark.x - 25, top: 4 }}
                  >
                    <div className="bg-card backdrop-blur-sm px-2 py-1 rounded-md text-center min-w-[50px] border border-border shadow-lg">
                      {formatTime(mark.time)}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Modern Timeline Indicator */}
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none"
              style={{ left: timeToPixels(currentTime) }}
            >
              {/* Main playhead line */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 shadow-lg" />
              
              {/* Top indicator handle */}
              <div className="absolute -top-1 -left-2 w-4 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-b-lg shadow-xl border border-blue-300/50 flex items-center justify-center">
                <div className="w-1 h-3 bg-white/80 rounded-full" />
              </div>
              
              {/* Time display bubble */}
              <div
                className="absolute top-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-mono font-bold px-2 py-1 rounded-md shadow-xl border border-blue-400/50 backdrop-blur-sm transform -translate-x-1/2"
                style={{ left: '50%' }}
              >
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rotate-45" />
                {formatTime(currentTime)}
              </div>
            </div>
            
            {/* Snap guides */}
            {snapGuides.map((guide, index) => (
              <div
                key={`snap-${index}`}
                className="absolute top-0 bottom-0 bg-yellow-400/60 z-10 pointer-events-none animate-pulse"
                style={{
                  left: guide.x,
                  width: '1px'
                }}
              />
            ))}
          </div>
          
          {/* Track Lanes */}
          <div className="relative" style={{ minWidth: Math.max(800, timelineDuration * PIXELS_PER_SECOND * zoom) }}>
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className={`relative bg-card ${currentTheme.border} border-b group backdrop-blur-sm transition-all duration-200 hover:bg-gray-700/20`}
                style={{ 
                  height: TRACK_HEIGHT,
                  backgroundColor: index % 2 === 0 ? currentTheme.track : currentTheme.trackAlt
                }}
                onClick={handleTimelineClick}
              >
                {/* Enhanced grid lines */}
                {rulerMarks.map((mark, markIndex) => (
                  <div
                    key={markIndex}
                    className={`absolute top-0 bottom-0 ${
                      mark.time % 10 === 0 ? 'border-l border-gray-500/30' : 
                      mark.time % 5 === 0 ? 'border-l border-gray-600/20' :
                      'border-l border-gray-700/15'
                    }`}
                    style={{
                      left: mark.x,
                      width: '1px'
                    }}
                  />
                ))}
                
                {/* Track background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="w-full h-full" style={{
                    backgroundImage: `repeating-linear-gradient(
                      90deg,
                      transparent,
                      transparent 49px,
                      rgba(255,255,255,0.1) 50px
                    )`
                  }} />
                </div>
                
                {/* Track clips with enhanced rendering */}
                {track.clips?.map(clip => renderClip(clip, index, track.id))}
                
                {/* Enhanced drop zone indicator */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-all duration-300 pointer-events-none ${
                  track.type === 'video' ? 'bg-red-500/30' :
                  track.type === 'audio' ? 'bg-green-500/30' :
                  track.type === 'text' ? 'bg-blue-500/30' :
                  track.type === 'image' ? 'bg-purple-500/30' :
                  'bg-orange-500/30'
                } border-2 border-dashed border-current rounded-lg m-1`} />
                
                {/* Track info overlay */}
                {track.clips && track.clips.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none">
                    <div className="text-center">
                      <div className={`w-8 h-8 mx-auto mb-1 rounded-full flex items-center justify-center ${
                        track.type === 'video' ? 'bg-red-500/20 text-red-400' :
                        track.type === 'audio' ? 'bg-green-500/20 text-green-400' :
                        track.type === 'text' ? 'bg-blue-500/20 text-blue-400' :
                        track.type === 'image' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-orange-500/20 text-orange-400'
                      }`}>
                        {track.type === 'video' && <Video className="w-4 h-4" />}
                        {track.type === 'audio' && <Volume2 className="w-4 h-4" />}
                        {track.type === 'text' && <Type className="w-4 h-4" />}
                        {track.type === 'image' && <Image className="w-4 h-4" />}
                        {track.type === 'effects' && <Filter className="w-4 h-4" />}
                      </div>
                      <div className="text-xs text-gray-400 font-medium">
                        Drop {track.type} here
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Track statistics */}
                {track.clips && track.clips.length > 0 && (
                  <div className="absolute bottom-1 right-2 flex items-center space-x-2">
                    <div className="text-xs text-gray-400 bg-card backdrop-blur-sm px-2 py-1 rounded-md border border-gray-600/30">
                      {track.clips.length} clip{track.clips.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-gray-400 bg-card backdrop-blur-sm px-2 py-1 rounded-md border border-gray-600/30">
                      {formatTime(track.clips.reduce((total, clip) => total + clip.duration, 0))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Empty state for timeline */}
            {tracks.length === 0 && (
              <div className="flex items-center justify-center h-40 text-gray-500">
                <div className="text-center">
                  <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tracks added yet</p>
                  <p className="text-xs text-gray-600">Upload a video to get started</p>
                </div>
              </div>
            )}
            
            {/* Enhanced Global Playhead Line */}
            <div
              className="absolute top-0 z-40 pointer-events-none"
              style={{
                left: timeToPixels(currentTime),
                width: '2px',
                height: tracks.length * TRACK_HEIGHT
              }}
            >
              {/* Main playhead line with modern blue gradient */}
              <div className="w-0.5 h-full bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 shadow-lg" 
                   style={{
                     boxShadow: '0 0 10px rgba(59, 130, 246, 0.6), 0 0 20px rgba(59, 130, 246, 0.3)'
                   }} />
              
              {/* Playhead handle with modern design */}
              <div className="absolute -top-1 -left-2 w-4 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-b-lg shadow-xl border border-blue-300/50 flex items-center justify-center">
                <div className="w-1 h-3 bg-white/80 rounded-full" />
              </div>
              

              
              {/* Snap guides */}
              {snapGuides.map((guide, index) => (
                <div
                  key={index}
                  className="absolute top-0 w-px bg-yellow-400/60 pointer-events-none"
                  style={{
                    left: timeToPixels(guide.time) - timeToPixels(currentTime),
                    height: tracks.length * TRACK_HEIGHT,
                    boxShadow: '0 0 8px rgba(251, 191, 36, 0.4)'
                  }}
                >
                  <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-400 rounded-full border border-yellow-300 shadow-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Timeline Footer - Enhanced */}
      <div className={`bg-card text-muted-foreground border-t border-border p-3 flex items-center justify-between text-sm`}>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="font-medium">Tracks: {tracks.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="font-medium">Selected: {selectedClips.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="font-medium">Duration: {formatTime(timelineDuration)}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="px-2 py-1 bg-card rounded text-xs font-medium">Professional Mode</span>
          <span className="px-2 py-1 bg-blue-600 rounded text-xs font-medium text-white">Zoom: {Math.round(zoom * 100)}%</span>
        </div>
      </div>
      
      {/* Context-Specific Upload Modal */}
      {showUploadModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUploadModal(false);
              setSelectedTrackForUpload(null);
              setUploadTrackType(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowUploadModal(false);
              setSelectedTrackForUpload(null);
              setUploadTrackType(null);
            }
          }}
          tabIndex={-1}
        >
          <div className={`${currentTheme.cardBg} ${currentTheme.border} border rounded-lg p-6 w-96 max-w-[90vw] shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Upload {uploadTrackType ? uploadTrackType.charAt(0).toUpperCase() + uploadTrackType.slice(1) : 'Content'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedTrackForUpload(null);
                  setUploadTrackType(null);
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {uploadTrackType === 'video' && (
                <label className={`${currentTheme.hover} border-2 border-dashed ${currentTheme.border} rounded-lg p-6 cursor-pointer flex flex-col items-center space-y-3 transition-colors`}>
                  <Video className="w-12 h-12 text-red-500" />
                  <span className="text-lg font-medium">Select Video File</span>
                  <span className="text-sm text-gray-400">MP4, AVI, MOV, WebM</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleContextualUpload}
                  />
                </label>
              )}
              
              {uploadTrackType === 'audio' && (
                <label className={`${currentTheme.hover} border-2 border-dashed ${currentTheme.border} rounded-lg p-6 cursor-pointer flex flex-col items-center space-y-3 transition-colors`}>
                  <Music className="w-12 h-12 text-blue-500" />
                  <span className="text-lg font-medium">Select Audio File</span>
                  <span className="text-sm text-gray-400">MP3, WAV, OGG, AAC</span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleContextualUpload}
                  />
                </label>
              )}
              
              {uploadTrackType === 'image' && (
                <label className={`${currentTheme.hover} border-2 border-dashed ${currentTheme.border} rounded-lg p-6 cursor-pointer flex flex-col items-center space-y-3 transition-colors`}>
                  <Image className="w-12 h-12 text-green-500" />
                  <span className="text-lg font-medium">Select Image File</span>
                  <span className="text-sm text-gray-400">JPG, PNG, GIF, WebP</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleContextualUpload}
                  />
                </label>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedTrackForUpload(null);
                    setUploadTrackType(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Panel */}
      {showAnalysisPanel && analysisData && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAnalysisPanel(false);
              setAnalysisData(null);
              setSelectedClipForAnalysis(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowAnalysisPanel(false);
              setAnalysisData(null);
              setSelectedClipForAnalysis(null);
            }
          }}
          tabIndex={-1}
        >
          <div className={`bg-card border border-border text-foreground rounded-lg p-6 w-[600px] max-w-[90vw] max-h-[80vh] overflow-y-auto shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Media Analysis</span>
              </h3>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={exportAnalysisJSON}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2"
                >
                  Export JSON
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAnalysisPanel(false);
                    setAnalysisData(null);
                    setSelectedClipForAnalysis(null);
                  }}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Basic Info */}
              <div className={`${currentTheme.surface} rounded-lg p-4`}>
                <h4 className="font-semibold mb-3 text-blue-700 dark:text-blue-300">Basic Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{analysisData.name}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{analysisData.type}</span></div>
                  <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium">{analysisData.duration?.toFixed(2)}s</span></div>
                  <div><span className="text-muted-foreground">Analyzed:</span> <span className="font-medium">{new Date(analysisData.timestamp).toLocaleString()}</span></div>
                </div>
              </div>

              {/* Video Analysis */}
              {analysisData.type === 'video' && (
                <div className={`${currentTheme.surface} rounded-lg p-4`}>
                  <h4 className="font-semibold mb-3 text-red-700 dark:text-red-300">Video Properties</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Resolution:</span> <span className="font-medium">{analysisData.resolution}</span></div>
                    <div><span className="text-muted-foreground">Frame Rate:</span> <span className="font-medium">{analysisData.frameRate} fps</span></div>
                    <div><span className="text-muted-foreground">Codec:</span> <span className="font-medium">{analysisData.codec}</span></div>
                    <div><span className="text-muted-foreground">Bitrate:</span> <span className="font-medium">{analysisData.bitrate}</span></div>
                    <div><span className="text-muted-foreground">Keyframes:</span> <span className="font-medium">{analysisData.keyframes}</span></div>
                  </div>
                  {analysisData.sceneChanges && analysisData.sceneChanges.length > 0 && (
                    <div className="mt-3">
                      <span className="text-muted-foreground">Scene Changes:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysisData.sceneChanges.map((time, index) => (
                          <span key={index} className="bg-primary/20 text-primary-700 dark:text-primary-300 px-2 py-1 rounded text-xs">
                            {time}s
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Audio Analysis */}
              {analysisData.type === 'audio' && (
                <div className={`${currentTheme.surface} rounded-lg p-4`}>
                  <h4 className="font-semibold mb-3 text-blue-700 dark:text-blue-300">Audio Properties</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Sample Rate:</span> <span className="font-medium">{analysisData.sampleRate} Hz</span></div>
                    <div><span className="text-muted-foreground">Channels:</span> <span className="font-medium">{analysisData.channels}</span></div>
                    <div><span className="text-muted-foreground">Bit Rate:</span> <span className="font-medium">{analysisData.bitRate}</span></div>
                    <div><span className="text-muted-foreground">Peak Level:</span> <span className="font-medium">{analysisData.peakLevel} dB</span></div>
                    <div><span className="text-muted-foreground">RMS Level:</span> <span className="font-medium">{analysisData.rmsLevel} dB</span></div>
                    <div><span className="text-muted-foreground">LUFS:</span> <span className="font-medium">{analysisData.lufs}</span></div>
                  </div>
                  {analysisData.spectralSummary && (
                    <div className="mt-3">
                      <span className="text-muted-foreground">Spectral Summary:</span>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="bg-red-500/15 dark:bg-red-600/20 text-red-700 dark:text-red-300 p-2 rounded text-center text-xs">
                          <div className="font-medium">Low</div>
                          <div>{(analysisData.spectralSummary.lowEnergy * 100).toFixed(1)}%</div>
                        </div>
                        <div className="bg-yellow-500/15 dark:bg-yellow-600/20 text-yellow-700 dark:text-yellow-300 p-2 rounded text-center text-xs">
                          <div className="font-medium">Mid</div>
                          <div>{(analysisData.spectralSummary.midEnergy * 100).toFixed(1)}%</div>
                        </div>
                        <div className="bg-green-500/15 dark:bg-green-600/20 text-green-700 dark:text-green-300 p-2 rounded text-center text-xs">
                          <div className="font-medium">High</div>
                          <div>{(analysisData.spectralSummary.highEnergy * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Image Analysis */}
              {analysisData.type === 'image' && (
                <div className={`${currentTheme.surface} rounded-lg p-4`}>
                  <h4 className="font-semibold mb-3 text-green-700 dark:text-green-300">Image Properties</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Dimensions:</span> <span className="font-medium">{analysisData.dimensions}</span></div>
                    <div><span className="text-muted-foreground">Format:</span> <span className="font-medium">{analysisData.format}</span></div>
                    <div><span className="text-muted-foreground">Color Depth:</span> <span className="font-medium">{analysisData.colorDepth}</span></div>
                    <div><span className="text-muted-foreground">Color Profile:</span> <span className="font-medium">{analysisData.colorProfile}</span></div>
                  </div>
                  {analysisData.histogram && (
                    <div className="mt-3">
                      <span className="text-muted-foreground">Color Histogram:</span>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="bg-red-500/15 dark:bg-red-600/20 text-red-700 dark:text-red-300 p-2 rounded text-center text-xs">
                          <div className="font-medium">Red Channel</div>
                          <div className="text-xs opacity-75">Distribution data available</div>
                        </div>
                        <div className="bg-green-500/15 dark:bg-green-600/20 text-green-700 dark:text-green-300 p-2 rounded text-center text-xs">
                          <div className="font-medium">Green Channel</div>
                          <div className="text-xs opacity-75">Distribution data available</div>
                        </div>
                        <div className="bg-blue-500/15 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 p-2 rounded text-center text-xs">
                          <div className="font-medium">Blue Channel</div>
                          <div className="text-xs opacity-75">Distribution data available</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error Display */}
              {analysisData.error && (
                <div className="bg-red-500/15 dark:bg-red-600/20 border border-red-500/30 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 text-red-700 dark:text-red-300">Analysis Error</h4>
                  <p className="text-sm text-red-700 dark:text-red-300">{analysisData.error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTimeline;