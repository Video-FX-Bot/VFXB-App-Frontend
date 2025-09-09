/**
 * Video Management Hook with Zustand Integration
 * Optimized for video player, timeline, and effects management
 */
import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useVideoStore, useCacheStore, videoSelectors } from '../store';
import { videoService } from '../services/videoService';

export const useVideo = () => {
  // Selective subscriptions for optimal performance
  const currentVideo = useVideoStore(videoSelectors.currentVideo);
  const isPlaying = useVideoStore(videoSelectors.isPlaying);
  const currentTime = useVideoStore(videoSelectors.currentTime);
  const selectedClips = useVideoStore(videoSelectors.selectedClips);
  const appliedEffects = useVideoStore(videoSelectors.appliedEffects);
  
  // Get actions and other state
  const {
    setCurrentVideo,
    setPlaying,
    setCurrentTime,
    setDuration,
    duration,
    volume,
    setVolume,
    muted,
    setMuted,
    playbackRate,
    setPlaybackRate,
    timelineZoom,
    setTimelineZoom,
    timelinePosition,
    setTimelinePosition,
    setSelectedClips,
    addSelectedClip,
    removeSelectedClip,
    clearSelectedClips,
    availableEffects,
    setAvailableEffects,
    addEffect,
    updateEffect,
    removeEffect,
    clearEffects,
  } = useVideoStore();
  
  // Cache store for video metadata and thumbnails
  const { getCache, setCache, invalidateCache } = useCacheStore();
  
  // Refs for video element and animation frames
  const videoRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Load video with caching
  const loadVideo = useCallback(async (videoId) => {
    try {
      // Check cache first
      const cacheKey = `video_${videoId}`;
      const cachedVideo = getCache(cacheKey);
      
      if (cachedVideo) {
        setCurrentVideo(cachedVideo);
        return cachedVideo;
      }
      
      // Load from API
      const video = await videoService.getVideo(videoId);
      
      // Cache the result
      setCache(cacheKey, video, 300000); // 5 minutes
      setCurrentVideo(video);
      
      return video;
    } catch (error) {
      console.error('Error loading video:', error);
      throw error;
    }
  }, [getCache, setCache, setCurrentVideo]);
  
  // Play/pause video
  const togglePlayback = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setPlaying(false);
      } else {
        videoRef.current.play();
        setPlaying(true);
      }
    }
  }, [isPlaying, setPlaying]);
  
  // Seek to specific time
  const seekTo = useCallback((time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [setCurrentTime]);
  
  // Update volume
  const updateVolume = useCallback((newVolume) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  }, [setVolume]);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  }, [muted, setMuted]);
  
  // Update playback rate
  const updatePlaybackRate = useCallback((rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, [setPlaybackRate]);

  // Timeline management
  const updateTimelineZoom = useCallback((zoom) => {
    setTimelineZoom(Math.max(0.1, Math.min(10, zoom)));
  }, [setTimelineZoom]);
  
  const updateTimelinePosition = useCallback((position) => {
    setTimelinePosition(Math.max(0, Math.min(duration || 0, position)));
  }, [setTimelinePosition, duration]);
  
  // Clip selection management
  const selectClip = useCallback((clipId) => {
    addSelectedClip(clipId);
  }, [addSelectedClip]);
  
  const deselectClip = useCallback((clipId) => {
    removeSelectedClip(clipId);
  }, [removeSelectedClip]);
  
  const selectMultipleClips = useCallback((clipIds) => {
    clearSelectedClips();
    clipIds.forEach(id => addSelectedClip(id));
  }, [clearSelectedClips, addSelectedClip]);
  
  // Effects management
  const applyEffect = useCallback((effectType, settings = {}) => {
    const effectId = `effect_${Date.now()}`;
    const effect = {
      id: effectId,
      type: effectType,
      settings,
      enabled: true,
      timestamp: Date.now()
    };
    
    addEffect(effect);
    return effectId;
  }, [addEffect]);
  
  const modifyEffect = useCallback((effectId, updates) => {
    updateEffect(effectId, updates);
  }, [updateEffect]);
  
  const removeVideoEffect = useCallback((effectId) => {
    removeEffect(effectId);
  }, [removeEffect]);
  
  const toggleEffect = useCallback((effectId) => {
    const effect = appliedEffects.find(e => e.id === effectId);
    if (effect) {
      updateEffect(effectId, { enabled: !effect.enabled });
    }
  }, [appliedEffects, updateEffect]);
  
  // Select video for editing
  const selectVideo = useCallback(async (videoId) => {
    try {
      const video = await loadVideo(videoId);
      return video;
    } catch (error) {
      console.error('Error selecting video:', error);
      throw error;
    }
  }, [loadVideo]);

  // Delete video
  const deleteVideo = useCallback(async (videoId) => {
    try {
      await videoService.deleteVideo(videoId);
      
      // Clear current video if it was deleted
      if (currentVideo?.id === videoId) {
        setCurrentVideo(null);
      }
      
      // Invalidate cache
      invalidateCache(`video_${videoId}`);
      
      return true;
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }, [currentVideo, setCurrentVideo, invalidateCache]);
  
  // Generate thumbnails for timeline
  const generateThumbnails = useCallback(async (videoId, count = 10) => {
    try {
      const cacheKey = `thumbnails_${videoId}_${count}`;
      const cached = getCache(cacheKey);
      
      if (cached) {
        return cached;
      }
      
      const thumbnails = await videoService.generateThumbnails(videoId, count);
      setCache(cacheKey, thumbnails, 600000); // 10 minutes
      
      return thumbnails;
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      return [];
    }
  }, [getCache, setCache]);

  // Process video with effects and clips
  const processVideo = useCallback(async (operation, parameters = {}) => {
    if (!currentVideo) {
      throw new Error('No video selected');
    }

    try {
      const processData = {
        videoId: currentVideo.id,
        operation,
        parameters,
        effects: activeEffects,
        clips: selectedClips
      };
      
      const result = await videoService.processVideo(processData);
      return result;
    } catch (error) {
      console.error('Error processing video:', error);
      throw error;
    }
  }, [currentVideo, activeEffects, selectedClips]);

  // Export video with current settings
  const exportVideo = useCallback(async (settings = {}) => {
    if (!currentVideo) {
      throw new Error('No video selected for export');
    }
    
    try {
      const exportData = {
        videoId: currentVideo.id,
        effects: activeEffects,
        clips: selectedClips,
        settings
      };
      
      const result = await videoService.exportVideo(exportData);
      
      // Trigger download if URL is provided
      if (result.downloadUrl) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename || 'exported_video.mp4';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      return result;
    } catch (error) {
      console.error('Error exporting video:', error);
      throw error;
    }
  }, [currentVideo, activeEffects, selectedClips]);

  // Additional video player controls
  const play = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play();
      setPlaying(true);
    }
  }, [setPlaying]);

  const pause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, [setPlaying]);

  const seekBy = useCallback((seconds) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(
        videoRef.current.duration || 0,
        videoRef.current.currentTime + seconds
      ));
      seekTo(newTime);
    }
  }, [seekTo]);

  const skipForward = useCallback(() => {
    seekBy(10);
  }, [seekBy]);

  const skipBackward = useCallback(() => {
    seekBy(-10);
  }, [seekBy]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (videoRef.current?.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, [setCurrentTime]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current && currentVideo) {
      // Update video metadata if needed
      const metadata = {
        duration: videoRef.current.duration,
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      };
      
      // Update current video with metadata
      setCurrentVideo({
        ...currentVideo,
        metadata: {
          ...currentVideo.metadata,
          ...metadata,
        },
      });
    }
  }, [currentVideo, setCurrentVideo]);

  const handleEnded = useCallback(() => {
    setPlaying(false);
  }, [setPlaying]);

  // Initialize video element
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('ended', handleEnded);
      
      // Set initial properties
      video.volume = volume;
      video.muted = muted;
      video.playbackRate = playbackRate;
      
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('ended', handleEnded);
      };
    }
  }, [volume, muted, playbackRate, handleTimeUpdate, handleLoadedMetadata, handleEnded]);
  
  // Update video duration when current video changes
  useEffect(() => {
    if (currentVideo?.metadata?.duration) {
      setDuration(currentVideo.metadata.duration);
    }
  }, [currentVideo, setDuration]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!currentVideo) return;
      
      // Check if user is typing in an input field
      const isTyping = e.target.tagName === 'INPUT' || 
                      e.target.tagName === 'TEXTAREA' || 
                      e.target.contentEditable === 'true' ||
                      e.target.closest('[contenteditable="true"]') ||
                      e.target.closest('input') ||
                      e.target.closest('textarea');
      
      if (isTyping) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayback();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekTo(Math.max(0, currentTime - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekTo(Math.min(duration || 0, currentTime + 5));
          break;
        case 'ArrowUp':
          e.preventDefault();
          updateVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          updateVolume(Math.max(0, volume - 0.1));
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'Escape':
          e.preventDefault();
          clearSelectedClips();
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentVideo, togglePlayback, seekTo, currentTime, duration, updateVolume, volume, toggleMute, clearSelectedClips]);

  // Memoized computed values
  const progress = useMemo(() => {
    if (!duration || duration === 0) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);
  
  const hasSelectedClips = useMemo(() => {
    return selectedClips.length > 0;
  }, [selectedClips]);
  
  const activeEffects = useMemo(() => {
    return appliedEffects.filter(effect => effect.enabled);
  }, [appliedEffects]);
  
  // Utility function to format time
  const formatTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  const formattedCurrentTime = useMemo(() => formatTime(currentTime), [currentTime, formatTime]);
  const formattedDuration = useMemo(() => formatTime(duration), [duration, formatTime]);

  return {
    // State
    currentVideo,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    playbackRate,
    timelineZoom,
    timelinePosition,
    selectedClips,
    appliedEffects,
    availableEffects,
    
    // Computed values
    progress,
    hasSelectedClips,
    activeEffects,
    formattedCurrentTime,
    formattedDuration,
    
    // Video management
     loadVideo,
     selectVideo,
     deleteVideo,
     processVideo,
     exportVideo,
     generateThumbnails,
    
    // Playback controls
    togglePlayback,
    play,
    pause,
    seekTo,
    seekBy,
    skipForward,
    skipBackward,
    updateVolume,
    toggleMute,
    updatePlaybackRate,
    toggleFullscreen,
    
    // Timeline controls
    updateTimelineZoom,
    updateTimelinePosition,
    
    // Clip management
    selectClip,
    deselectClip,
    selectMultipleClips,
    clearSelectedClips,
    
    // Effects management
    applyEffect,
    modifyEffect,
    removeVideoEffect,
    toggleEffect,
    clearEffects,
    setAvailableEffects,
    
    // Refs
    videoRef,
    
    // Cache utilities
    invalidateCache,
  };
};

// Helper function to format time (moved outside component for reusability)
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export { formatTime };
export default useVideo;