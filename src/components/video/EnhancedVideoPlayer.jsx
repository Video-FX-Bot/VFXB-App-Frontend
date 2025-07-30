import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  RotateCcw,
  Settings,
  PictureInPicture,
  Repeat,
  Repeat1,
  Download,
  Share2,
  Bookmark,
  Zap,
  Gauge
} from 'lucide-react';
import { Button, Card } from '../ui';

const EnhancedVideoPlayer = ({
  src,
  poster,
  autoPlay = false,
  controls = true,
  className = '',
  onTimeUpdate,
  onDurationChange,
  onPlay,
  onPause,
  enableWaveform = true,
  enableThumbnailScrubbing = true,
  enableGestures = true,
  enablePiP = true,
  showMinimap = true
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const progressRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopMode, setLoopMode] = useState('none'); // 'none', 'single', 'playlist'
  const [showSettings, setShowSettings] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [buffered, setBuffered] = useState([]);
  const [isHovering, setIsHovering] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [previewTime, setPreviewTime] = useState(0);
  const [waveformData, setWaveformData] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [qualityLevels, setQualityLevels] = useState(['1080p', '720p', '480p', '360p']);
  const [currentQuality, setCurrentQuality] = useState('1080p');
  
  // Control visibility timer
  const controlsTimeoutRef = useRef(null);
  
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isHovering) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, isHovering]);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleLoadedData = () => {
      setIsLoading(false);
      generateWaveform();
    };
    const handleLoadStart = () => setIsLoading(true);
    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
      updateBuffered();
    };
    const handleDurationChange = () => {
      const dur = video.duration;
      setDuration(dur);
      onDurationChange?.(dur);
    };
    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
      resetControlsTimeout();
    };
    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };
    const handleEnded = () => {
      if (loopMode === 'single') {
        video.currentTime = 0;
        video.play();
      } else {
        setIsPlaying(false);
      }
    };
    
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    
    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, onDurationChange, onPlay, onPause, loopMode, resetControlsTimeout]);
  
  const updateBuffered = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const bufferedRanges = [];
    for (let i = 0; i < video.buffered.length; i++) {
      bufferedRanges.push({
        start: video.buffered.start(i),
        end: video.buffered.end(i)
      });
    }
    setBuffered(bufferedRanges);
  }, []);
  
  const generateWaveform = useCallback(async () => {
    if (!enableWaveform || !videoRef.current) return;
    
    // Simulate waveform data generation
    // In a real implementation, you'd extract audio data and generate waveform
    const mockWaveform = Array.from({ length: 200 }, () => Math.random() * 100);
    setWaveformData(mockWaveform);
  }, [enableWaveform]);
  
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [isPlaying]);
  
  const handleSeek = useCallback((e) => {
    const video = videoRef.current;
    if (!video || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);
  
  const handleProgressHover = useCallback((e) => {
    if (!enableThumbnailScrubbing || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const time = pos * duration;
    setPreviewTime(time);
    
    // In a real implementation, you'd generate thumbnail at this time
    setThumbnailPreview({
      time,
      x: e.clientX - rect.left,
      url: poster // Placeholder
    });
  }, [enableThumbnailScrubbing, duration, poster]);
  
  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.volume = newVolume;
      video.muted = newVolume === 0;
    }
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);
  
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const newMuted = !isMuted;
    video.muted = newMuted;
    setIsMuted(newMuted);
  }, [isMuted]);
  
  const changePlaybackRate = useCallback((rate) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = rate;
    }
    setPlaybackRate(rate);
  }, []);
  
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (videoRef.current?.requestFullscreen) {
        videoRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  }, []);
  
  const togglePiP = useCallback(async () => {
    if (!enablePiP || !videoRef.current) return;
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  }, [enablePiP]);
  
  const skip = useCallback((seconds) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  }, [duration]);
  
  const addBookmark = useCallback(() => {
    const newBookmark = {
      id: Date.now(),
      time: currentTime,
      label: `Bookmark ${bookmarks.length + 1}`
    };
    setBookmarks(prev => [...prev, newBookmark]);
  }, [currentTime, bookmarks.length]);
  
  const formatTime = useCallback((time) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);
  
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(e.shiftKey ? -30 : -10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(e.shiftKey ? 30 : 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyB':
          e.preventDefault();
          addBookmark();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip, toggleMute, toggleFullscreen, addBookmark]);
  
  return (
    <Card className={`relative overflow-hidden bg-black ${className}`} padding="none">
      <div
        className="relative group"
        onMouseEnter={() => {
          setIsHovering(true);
          resetControlsTimeout();
        }}
        onMouseLeave={() => {
          setIsHovering(false);
          setThumbnailPreview(null);
        }}
        onMouseMove={resetControlsTimeout}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          className="w-full h-auto"
          onClick={togglePlay}
        />
        
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
            />
          </div>
        )}
        
        {/* Thumbnail Preview */}
        <AnimatePresence>
          {thumbnailPreview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-20 bg-black bg-opacity-80 rounded-lg p-2 pointer-events-none z-50"
              style={{ left: Math.max(10, Math.min(thumbnailPreview.x - 60, window.innerWidth - 130)) }}
            >
              <div className="w-24 h-14 bg-gray-700 rounded mb-1 flex items-center justify-center">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div className="text-white text-xs text-center">
                {formatTime(previewTime)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Enhanced Controls */}
        {controls && (
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6"
              >
                {/* Waveform Visualization */}
                {enableWaveform && waveformData.length > 0 && (
                  <div className="mb-4 h-12 flex items-end space-x-1">
                    {waveformData.map((height, index) => (
                      <div
                        key={index}
                        className="bg-purple-500 opacity-60 flex-1 rounded-sm"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                )}
                
                {/* Enhanced Progress Bar */}
                <div className="mb-4">
                  <div
                    ref={progressRef}
                    className="relative w-full h-2 bg-white bg-opacity-30 rounded-full cursor-pointer group"
                    onClick={handleSeek}
                    onMouseMove={handleProgressHover}
                    onMouseLeave={() => setThumbnailPreview(null)}
                  >
                    {/* Buffered Progress */}
                    {buffered.map((range, index) => (
                      <div
                        key={index}
                        className="absolute h-full bg-white bg-opacity-50 rounded-full"
                        style={{
                          left: `${(range.start / duration) * 100}%`,
                          width: `${((range.end - range.start) / duration) * 100}%`
                        }}
                      />
                    ))}
                    
                    {/* Current Progress */}
                    <div
                      className="absolute h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-200"
                      style={{ width: `${progressPercentage}%` }}
                    />
                    
                    {/* Progress Handle */}
                    <div
                      className="absolute w-4 h-4 bg-white rounded-full shadow-lg transform -translate-y-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ left: `calc(${progressPercentage}% - 8px)` }}
                    />
                    
                    {/* Bookmarks */}
                    {bookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="absolute w-2 h-2 bg-yellow-400 rounded-full transform -translate-y-1"
                        style={{ left: `calc(${(bookmark.time / duration) * 100}% - 4px)` }}
                        title={bookmark.label}
                      />
                    ))}
                    
                    {/* Chapters */}
                    {chapters.map((chapter, index) => (
                      <div
                        key={index}
                        className="absolute w-1 h-full bg-white bg-opacity-70"
                        style={{ left: `${(chapter.time / duration) * 100}%` }}
                        title={chapter.title}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => skip(-30)}
                      className="text-white hover:bg-gray-700 hover:bg-opacity-80"
                    >
                      <RotateCcw className="w-4 h-4 text-white" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => skip(-10)}
                      className="text-white hover:bg-gray-700 hover:bg-opacity-80"
                    >
                      <SkipBack className="w-5 h-5 text-white" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={togglePlay}
                      className="text-white hover:bg-gray-700 hover:bg-opacity-80 bg-gray-800 bg-opacity-60"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 text-white" />
                      ) : (
                        <Play className="w-6 h-6 text-white" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => skip(10)}
                      className="text-white hover:bg-gray-700 hover:bg-opacity-80"
                    >
                      <SkipForward className="w-5 h-5 text-white" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLoopMode(loopMode === 'none' ? 'single' : 'none')}
                      className={`text-white hover:bg-gray-700 hover:bg-opacity-80 ${
                        loopMode !== 'none' ? 'bg-gray-700 bg-opacity-60' : ''
                      }`}
                    >
                      {loopMode === 'single' ? (
                        <Repeat1 className="w-4 h-4 text-white" />
                      ) : (
                        <Repeat className="w-4 h-4 text-white" />
                      )}
                    </Button>
                    
                    {/* Volume Control */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleMute}
                        className="text-white hover:bg-gray-700 hover:bg-opacity-80"
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4 text-white" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-white" />
                        )}
                      </Button>
                      
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-white bg-opacity-30 rounded-full appearance-none cursor-pointer slider"
                      />
                    </div>
                    
                    {/* Playback Speed */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSettings(!showSettings)}
                        className="text-white hover:bg-gray-700 hover:bg-opacity-80 flex items-center space-x-1"
                      >
                        <Gauge className="w-4 h-4 text-white" />
                        <span className="text-xs text-white">{playbackRate}x</span>
                      </Button>
                      
                      <AnimatePresence>
                        {showSettings && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full mb-2 left-0 bg-black bg-opacity-90 rounded-lg p-2 min-w-[120px]"
                          >
                            <div className="text-white text-xs mb-2 font-medium">Playback Speed</div>
                            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                              <button
                                key={rate}
                                onClick={() => {
                                  changePlaybackRate(rate);
                                  setShowSettings(false);
                                }}
                                className={`block w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-700 hover:bg-opacity-80 ${
                                  playbackRate === rate ? 'bg-gray-700 bg-opacity-60' : ''
                                }`}
                              >
                                {rate}x
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Time Display */}
                    <span className="text-white text-sm font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                    
                    {/* Bookmark */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addBookmark}
                      className="text-white hover:bg-gray-700 hover:bg-opacity-80"
                      title="Add Bookmark (B)"
                    >
                      <Bookmark className="w-4 h-4 text-white" />
                    </Button>
                    
                    {/* Picture in Picture */}
                    {enablePiP && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={togglePiP}
                        className={`text-white hover:bg-gray-700 hover:bg-opacity-80 ${
                          isPiP ? 'bg-gray-700 bg-opacity-60' : ''
                        }`}
                      >
                        <PictureInPicture className="w-4 h-4 text-white" />
                      </Button>
                    )}
                    
                    {/* Download */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-gray-700 hover:bg-opacity-80"
                    >
                      <Download className="w-4 h-4 text-white" />
                    </Button>
                    
                    {/* Share */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-gray-700 hover:bg-opacity-80"
                    >
                      <Share2 className="w-4 h-4 text-white" />
                    </Button>
                    
                    {/* Fullscreen */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleFullscreen}
                      className="text-white hover:bg-gray-700 hover:bg-opacity-80"
                    >
                      {isFullscreen ? (
                        <Minimize className="w-4 h-4 text-white" />
                      ) : (
                        <Maximize className="w-4 h-4 text-white" />
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        
        {/* Minimap */}
        {showMinimap && duration > 0 && (
          <div className="absolute top-4 right-4 w-32 h-2 bg-black bg-opacity-50 rounded-full overflow-hidden">
            <div
              className="h-full bg-white bg-opacity-70 transition-all duration-200"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
      </div>
      
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </Card>
  );
};

export default EnhancedVideoPlayer;