/**
 * Timeline Management Hook
 * Specialized hook for video timeline interactions and management
 */
import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useVideoStore, useCacheStore, videoSelectors } from '../store';
import { videoService } from '../services/videoService';

export const useTimeline = () => {
  // Selective subscriptions for timeline-specific state
  const timelineZoom = useVideoStore(state => state.timelineZoom);
  const timelinePosition = useVideoStore(state => state.timelinePosition);
  const currentTime = useVideoStore(videoSelectors.currentTime);
  const duration = useVideoStore(state => state.duration);
  const selectedClips = useVideoStore(videoSelectors.selectedClips);
  const currentVideo = useVideoStore(videoSelectors.currentVideo);
  
  // Get timeline actions
  const {
    setTimelineZoom,
    setTimelinePosition,
    setCurrentTime,
    addSelectedClip,
    removeSelectedClip,
    clearSelectedClips,
  } = useVideoStore();
  
  // Cache for thumbnails and timeline data
  const { getCache, setCache } = useCacheStore();
  
  // Refs for timeline interactions
  const timelineRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, time: 0 });
  
  // Timeline zoom controls
  const zoomIn = useCallback(() => {
    setTimelineZoom(Math.min(10, timelineZoom * 1.5));
  }, [timelineZoom, setTimelineZoom]);
  
  const zoomOut = useCallback(() => {
    setTimelineZoom(Math.max(0.1, timelineZoom / 1.5));
  }, [timelineZoom, setTimelineZoom]);
  
  const resetZoom = useCallback(() => {
    setTimelineZoom(1);
  }, [setTimelineZoom]);
  
  const setZoom = useCallback((zoom) => {
    setTimelineZoom(Math.max(0.1, Math.min(10, zoom)));
  }, [setTimelineZoom]);
  
  // Timeline position controls
  const scrollToTime = useCallback((time) => {
    if (duration) {
      const position = Math.max(0, Math.min(duration, time));
      setTimelinePosition(position);
    }
  }, [duration, setTimelinePosition]);
  
  const scrollToCurrentTime = useCallback(() => {
    scrollToTime(currentTime);
  }, [currentTime, scrollToTime]);
  
  // Timeline interaction handlers
  const handleTimelineClick = useCallback((event) => {
    if (!timelineRef.current || !duration) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const timelineWidth = rect.width;
    
    // Calculate time based on click position and zoom
    const visibleDuration = duration / timelineZoom;
    const clickTime = timelinePosition + (x / timelineWidth) * visibleDuration;
    
    setCurrentTime(Math.max(0, Math.min(duration, clickTime)));
  }, [duration, timelineZoom, timelinePosition, setCurrentTime]);
  
  const handleTimelineDragStart = useCallback((event) => {
    if (!timelineRef.current) return;
    
    isDraggingRef.current = true;
    const rect = timelineRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: event.clientX - rect.left,
      time: currentTime
    };
    
    event.preventDefault();
  }, [currentTime]);
  
  const handleTimelineDrag = useCallback((event) => {
    if (!isDraggingRef.current || !timelineRef.current || !duration) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const deltaX = currentX - dragStartRef.current.x;
    const timelineWidth = rect.width;
    
    // Calculate time delta based on drag distance and zoom
    const visibleDuration = duration / timelineZoom;
    const timeDelta = (deltaX / timelineWidth) * visibleDuration;
    const newTime = dragStartRef.current.time + timeDelta;
    
    setCurrentTime(Math.max(0, Math.min(duration, newTime)));
  }, [duration, timelineZoom, setCurrentTime]);
  
  const handleTimelineDragEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);
  
  // Clip selection on timeline
  const selectClipAtTime = useCallback((time, addToSelection = false) => {
    // This would need to be implemented based on your clip data structure
    // For now, this is a placeholder
    console.log('Select clip at time:', time, 'Add to selection:', addToSelection);
  }, []);
  
  const selectClipsInRange = useCallback((startTime, endTime) => {
    // This would need to be implemented based on your clip data structure
    // For now, this is a placeholder
    console.log('Select clips in range:', startTime, 'to', endTime);
  }, []);
  
  // Timeline markers and guides
  const getTimelineMarkers = useCallback(() => {
    if (!duration) return [];
    
    const markers = [];
    const visibleDuration = duration / timelineZoom;
    const markerInterval = visibleDuration / 10; // 10 markers across visible area
    
    for (let i = 0; i <= 10; i++) {
      const time = timelinePosition + (i * markerInterval);
      if (time <= duration) {
        markers.push({
          time,
          position: (i / 10) * 100, // Percentage position
          label: formatTime(time)
        });
      }
    }
    
    return markers;
  }, [duration, timelineZoom, timelinePosition]);
  
  // Generate thumbnails for timeline
  const getTimelineThumbnails = useCallback(async (count = 20) => {
    if (!currentVideo) return [];
    
    const cacheKey = `timeline_thumbnails_${currentVideo.id}_${count}_${timelineZoom}_${timelinePosition}`;
    const cached = getCache(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    try {
      const visibleDuration = duration / timelineZoom;
      const startTime = timelinePosition;
      const endTime = Math.min(duration, timelinePosition + visibleDuration);
      
      const thumbnails = await videoService.generateTimelineThumbnails(
        currentVideo.id,
        startTime,
        endTime,
        count
      );
      
      setCache(cacheKey, thumbnails, 300000); // 5 minutes
      return thumbnails;
    } catch (error) {
      console.error('Error generating timeline thumbnails:', error);
      return [];
    }
  }, [currentVideo, duration, timelineZoom, timelinePosition, getCache, setCache]);
  
  // Keyboard shortcuts for timeline
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle shortcuts when timeline is focused or no input is focused
      const isTyping = event.target.tagName === 'INPUT' ||
                      event.target.tagName === 'TEXTAREA' ||
                      event.target.contentEditable === 'true';
      
      if (isTyping) return;
      
      switch (event.code) {
        case 'Equal': // Plus key
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            zoomIn();
          }
          break;
        case 'Minus':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            zoomOut();
          }
          break;
        case 'Digit0':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            resetZoom();
          }
          break;
        case 'Home':
          event.preventDefault();
          setCurrentTime(0);
          scrollToTime(0);
          break;
        case 'End':
          event.preventDefault();
          if (duration) {
            setCurrentTime(duration);
            scrollToTime(duration);
          }
          break;
        case 'Escape':
          event.preventDefault();
          clearSelectedClips();
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom, setCurrentTime, scrollToTime, duration, clearSelectedClips]);
  
  // Mouse wheel zoom
  useEffect(() => {
    const handleWheel = (event) => {
      if (!timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const isOverTimeline = event.clientX >= rect.left && 
                            event.clientX <= rect.right && 
                            event.clientY >= rect.top && 
                            event.clientY <= rect.bottom;
      
      if (isOverTimeline && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = timelineZoom * zoomFactor;
        setZoom(newZoom);
      }
    };
    
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [timelineZoom, setZoom]);
  
  // Computed values
  const visibleDuration = useMemo(() => {
    return duration ? duration / timelineZoom : 0;
  }, [duration, timelineZoom]);
  
  const timelineProgress = useMemo(() => {
    if (!duration || duration === 0) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);
  
  const visibleProgress = useMemo(() => {
    if (!visibleDuration || visibleDuration === 0) return 0;
    const relativeTime = currentTime - timelinePosition;
    return Math.max(0, Math.min(100, (relativeTime / visibleDuration) * 100));
  }, [currentTime, timelinePosition, visibleDuration]);
  
  // Utility function to format time
  const formatTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  return {
    // State
    timelineZoom,
    timelinePosition,
    currentTime,
    duration,
    selectedClips,
    visibleDuration,
    timelineProgress,
    visibleProgress,
    
    // Zoom controls
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    
    // Position controls
    scrollToTime,
    scrollToCurrentTime,
    
    // Interaction handlers
    handleTimelineClick,
    handleTimelineDragStart,
    handleTimelineDrag,
    handleTimelineDragEnd,
    
    // Clip selection
    selectClipAtTime,
    selectClipsInRange,
    clearSelectedClips,
    
    // Timeline data
    getTimelineMarkers,
    getTimelineThumbnails,
    
    // Refs
    timelineRef,
    
    // Utilities
    formatTime,
  };
};

export default useTimeline;