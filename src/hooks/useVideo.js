import { useState, useEffect, useCallback, useRef } from 'react';
import useVideoStore from '../context/videoStore';
import apiService from '../services/apiService';
import { validateVideoFile, formatTime } from '../utils';
import { UPLOAD_CONFIG, VIDEO_PROCESSING } from '../constants';

// Custom hook for video management
export const useVideo = () => {
  const {
    videos,
    currentVideo,
    isPlaying,
    currentTime,
    volume,
    muted,
    fullscreen,
    playbackRate,
    processingJobs,
    editHistory,
    setVideos,
    setCurrentVideo,
    setPlaybackState,
    setCurrentTime,
    setVolume,
    setMuted,
    setFullscreen,
    setPlaybackRate,
    addProcessingJob,
    updateProcessingJob,
    addToEditHistory,
  } = useVideoStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  // Load user videos
  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getVideos();
      if (response.success) {
        setVideos(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [setVideos]);

  // Upload video file
  const uploadVideo = useCallback(async (file, onProgress) => {
    try {
      setLoading(true);
      setError(null);

      // Validate file
      const validation = validateVideoFile(file);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Upload file
      const response = await apiService.uploadVideo(file, onProgress);
      if (response.success) {
        // Add to videos list
        setVideos(prev => [response.data, ...prev]);
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setVideos]);

  // Select video for editing
  const selectVideo = useCallback(async (videoId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getVideo(videoId);
      if (response.success) {
        setCurrentVideo(response.data);
        // Reset playback state
        setPlaybackState(false);
        setCurrentTime(0);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [setCurrentVideo, setPlaybackState, setCurrentTime]);

  // Delete video
  const deleteVideo = useCallback(async (videoId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.deleteVideo(videoId);
      if (response.success) {
        setVideos(prev => prev.filter(v => v.id !== videoId));
        if (currentVideo?.id === videoId) {
          setCurrentVideo(null);
        }
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [setVideos, currentVideo, setCurrentVideo]);

  // Process video with AI operation
  const processVideo = useCallback(async (operation, parameters = {}) => {
    if (!currentVideo) {
      setError('No video selected');
      return;
    }

    try {
      setError(null);
      
      // Create processing job
      const jobId = `job_${Date.now()}`;
      const job = {
        id: jobId,
        videoId: currentVideo.id,
        operation,
        parameters,
        status: 'pending',
        progress: 0,
        startTime: new Date(),
      };
      
      addProcessingJob(job);
      
      // Start processing
      const response = await apiService.processVideo(currentVideo.id, {
        operation,
        parameters,
        jobId,
      });
      
      if (response.success) {
        // Add to edit history
        addToEditHistory({
          id: `edit_${Date.now()}`,
          operation,
          parameters,
          timestamp: new Date(),
          description: `Applied ${operation} operation`,
        });
        
        return response.data;
      } else {
        updateProcessingJob(jobId, {
          status: 'failed',
          error: response.error,
          endTime: new Date(),
        });
        setError(response.error);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [currentVideo, addProcessingJob, updateProcessingJob, addToEditHistory]);

  // Export video
  const exportVideo = useCallback(async (format = 'mp4', quality = 'high') => {
    if (!currentVideo) {
      setError('No video selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.exportVideo(
        currentVideo.id,
        format,
        quality
      );
      
      if (response.success) {
        // Trigger download
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = response.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return response.data;
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentVideo]);

  // Video player controls
  const play = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play();
      setPlaybackState(true);
    }
  }, [setPlaybackState]);

  const pause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setPlaybackState(false);
    }
  }, [setPlaybackState]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [setCurrentTime]);

  const seekBy = useCallback((seconds) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(
        videoRef.current.duration,
        videoRef.current.currentTime + seconds
      ));
      seek(newTime);
    }
  }, [seek]);

  const changeVolume = useCallback((newVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    if (videoRef.current) {
      videoRef.current.volume = clampedVolume;
    }
    setVolume(clampedVolume);
    if (clampedVolume > 0 && muted) {
      setMuted(false);
    }
  }, [setVolume, muted, setMuted]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
    }
    setMuted(!muted);
  }, [muted, setMuted]);

  const changePlaybackRate = useCallback((rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setPlaybackRate(rate);
  }, [setPlaybackRate]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (videoRef.current?.requestFullscreen) {
        videoRef.current.requestFullscreen();
        setFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setFullscreen(false);
      }
    }
  }, [setFullscreen]);

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
    setPlaybackState(false);
  }, [setPlaybackState]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!currentVideo) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekBy(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekBy(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(volume - 0.1);
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentVideo, togglePlay, seekBy, changeVolume, volume, toggleMute, toggleFullscreen]);

  // Format current time and duration
  const formattedCurrentTime = formatTime(currentTime);
  const formattedDuration = formatTime(currentVideo?.metadata?.duration || 0);

  return {
    // State
    videos,
    currentVideo,
    isPlaying,
    currentTime,
    volume,
    muted,
    fullscreen,
    playbackRate,
    processingJobs,
    editHistory,
    loading,
    error,
    
    // Formatted values
    formattedCurrentTime,
    formattedDuration,
    
    // Video management
    loadVideos,
    uploadVideo,
    selectVideo,
    deleteVideo,
    processVideo,
    exportVideo,
    
    // Playback controls
    play,
    pause,
    togglePlay,
    seek,
    seekBy,
    changeVolume,
    toggleMute,
    changePlaybackRate,
    toggleFullscreen,
    
    // Refs
    videoRef,
    
    // Utilities
    clearError: () => setError(null),
  };
};

export default useVideo;