import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  Share2,
  Scissors,
  Wand2,
  Type,
  Music,
  Palette,
  Zap,
  Eye,
  BarChart3,
  Clock,
  Lightbulb,
  Send,
  Plus,
  Layers,
  Filter,
  Sparkles,
  RotateCcw,
  Save,
  Settings
} from 'lucide-react';
import EnhancedVideoPlayer from '../components/video/EnhancedVideoPlayer';
import EnhancedTimeline from '../components/timeline/EnhancedTimeline';
import EffectsLibrary from '../components/effects/EffectsLibrary';

const AIEditor = () => {
  const location = useLocation();
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      type: 'ai',
      content: 'Welcome to VFXB AI Editor! I\'m here to help you create amazing videos. Upload a video or ask me anything about video editing.',
      timestamp: new Date().toISOString()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [tracks, setTracks] = useState([
    {
      id: 'video-track-1',
      type: 'video',
      name: 'Main Video',
      clips: uploadedVideo ? [{
        id: 'clip-1',
        name: uploadedVideo.name || 'Video Clip',
        type: 'video',
        startTime: 0,
        duration: duration || 30,
        thumbnail: uploadedVideo.thumbnail
      }] : [],
      muted: false,
      locked: false,
      visible: true,
      volume: 1
    },
    {
      id: 'audio-track-1',
      type: 'audio',
      name: 'Audio Track',
      clips: uploadedVideo ? [{
        id: 'audio-clip-1',
        name: 'Audio',
        type: 'audio',
        startTime: 0,
        duration: duration || 30
      }] : [],
      muted: false,
      locked: false,
      visible: true,
      volume: 1
    }
  ]);
  const [videoRef, setVideoRef] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save project when video is imported
  const autoSaveProject = (video) => {
    const videoName = video.name ? video.name.replace(/\.[^/.]+$/, '') : 'Untitled Video';
    const projectData = {
      id: Date.now(),
      name: videoName,
      video: video,
      thumbnail: video.thumbnail || video.url,
      duration: Math.floor((video.duration || 30) / 60) + ':' + Math.floor((video.duration || 30) % 60).toString().padStart(2, '0'),
      lastModified: 'Just now',
      status: 'editing',
      createdAt: new Date().toISOString(),
      chatHistory: []
    };

    // Get existing projects from localStorage
    const existingProjects = JSON.parse(localStorage.getItem('vfxb_projects') || '[]');
    
    // Check if project with same video already exists
    const existingProjectIndex = existingProjects.findIndex(p => p.video?.name === video.name);
    
    if (existingProjectIndex >= 0) {
      // Update existing project
      existingProjects[existingProjectIndex] = {
        ...existingProjects[existingProjectIndex],
        lastModified: 'Just now',
        video: video
      };
    } else {
      // Add new project
      existingProjects.unshift(projectData);
    }
    
    // Save to localStorage
    localStorage.setItem('vfxb_projects', JSON.stringify(existingProjects));
    
    // Update recent projects in sidebar
    const recentProjects = existingProjects.slice(0, 3);
    localStorage.setItem('vfxb_recent_projects', JSON.stringify(recentProjects));
    
    // Set project name in state
    setProjectName(videoName);
  };

  // Get video from navigation state
  useEffect(() => {
    if (location.state?.video) {
      setUploadedVideo(location.state.video);
      // Auto-save project when video is imported
      autoSaveProject(location.state.video);
      setChatMessages(prev => [...prev, {
        type: 'ai',
        content: `Perfect! I've loaded "${location.state.video.name}" and automatically saved it as a project. I can help you with editing, effects, transitions, color grading, and more. What would you like to do first?`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [location.state]);

  // Video control functions
  const togglePlayPause = () => {
    if (videoRef) {
      if (isPlaying) {
        videoRef.pause();
      } else {
        videoRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skipBackward = () => {
    if (videoRef) {
      videoRef.currentTime = Math.max(0, videoRef.currentTime - 10);
    }
  };

  const skipForward = () => {
    if (videoRef) {
      videoRef.currentTime = Math.min(duration, videoRef.currentTime + 10);
    }
  };

  const toggleMute = () => {
    if (videoRef) {
      videoRef.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef) {
      videoRef.volume = newVolume;
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      type: 'user',
      content: newMessage,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsChatLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        `I can help you with "${newMessage}". Let me analyze your video and suggest the best approach.`,
        `Great idea! For "${newMessage}", I recommend using our AI-powered tools. Would you like me to apply some automatic enhancements?`,
        `I understand you want to work on "${newMessage}". I've prepared several options that would work well with your video.`
      ];
      
      const aiResponse = {
        type: 'ai',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, aiResponse]);
      setIsChatLoading(false);
    }, 1500);
  };

  const saveProject = () => {
    if (!uploadedVideo) {
      alert('No video to save!');
      return;
    }

    setIsSaving(true);
    
    const projectData = {
      id: Date.now(),
      name: projectName || `Project ${new Date().toLocaleDateString()}`,
      video: uploadedVideo,
      thumbnail: uploadedVideo.url,
      duration: Math.floor(duration / 60) + ':' + Math.floor(duration % 60).toString().padStart(2, '0'),
      lastModified: 'Just now',
      status: 'editing',
      createdAt: new Date().toISOString(),
      chatHistory: chatMessages
    };

    // Get existing projects from localStorage
    const existingProjects = JSON.parse(localStorage.getItem('vfxb_projects') || '[]');
    
    // Add new project
    const updatedProjects = [projectData, ...existingProjects];
    
    // Save to localStorage
    localStorage.setItem('vfxb_projects', JSON.stringify(updatedProjects));
    
    // Update recent projects in sidebar
    const recentProjects = updatedProjects.slice(0, 3);
    localStorage.setItem('vfxb_recent_projects', JSON.stringify(recentProjects));
    
    setTimeout(() => {
      setIsSaving(false);
      alert('Project saved successfully!');
    }, 1000);
  };

  const effects = [
    { name: 'Color Grading', icon: Palette, description: 'Enhance colors and mood' },
    { name: 'Transitions', icon: Zap, description: 'Smooth scene transitions' },
    { name: 'Text Overlay', icon: Type, description: 'Add titles and captions' },
    { name: 'Audio Enhancement', icon: Music, description: 'Improve audio quality' },
    { name: 'Stabilization', icon: Eye, description: 'Remove camera shake' },
    { name: 'Speed Control', icon: Clock, description: 'Slow motion & time-lapse' }
  ];

  const suggestions = [
    'Add smooth transitions between scenes',
    'Enhance audio quality and remove background noise',
    'Apply color grading for cinematic look',
    'Add text overlays for key moments',
    'Create slow-motion effects for highlights',
    'Generate automatic subtitles'
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Main Editor Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Preview Section (2/3 width) */}
        <div className="flex-1 flex flex-col" style={{ width: '66.666%' }}>
          {/* Enhanced Video Player */}
          <div className="flex-1 bg-black relative p-4">
            {uploadedVideo ? (
              <EnhancedVideoPlayer
                ref={setVideoRef}
                src={uploadedVideo.url}
                poster={uploadedVideo.thumbnail}
                currentTime={currentTime}
                duration={duration}
                onTimeUpdate={setCurrentTime}
                onDurationChange={setDuration}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full h-full"
                showWaveform={true}
                showThumbnailScrubbing={true}
                enableKeyboardShortcuts={true}
                showMinimap={true}
                enableGestures={true}
                enablePiP={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="bg-gray-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
                    <Play className="w-12 h-12 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">No Video Loaded</h3>
                    <p className="text-gray-500">Upload a video from the Dashboard to start editing</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Enhanced Timeline */}
          <div className="bg-gray-800 border-t border-gray-700 p-4">
            <EnhancedTimeline
              tracks={tracks}
              currentTime={currentTime}
              duration={duration || 30}
              zoom={timelineZoom}
              isPlaying={isPlaying}
              onTimeChange={(time) => {
                setCurrentTime(time);
                if (videoRef && videoRef.current) {
                  videoRef.current.currentTime = time;
                }
              }}
              onZoomChange={setTimelineZoom}
              onTracksChange={setTracks}
              onPlay={() => {
                setIsPlaying(true);
                if (videoRef && videoRef.current) {
                  videoRef.current.play();
                }
              }}
              onPause={() => {
                setIsPlaying(false);
                if (videoRef && videoRef.current) {
                  videoRef.current.pause();
                }
              }}
              enableMagneticTimeline={true}
              enableKeyframes={true}
              enableMultiSelect={true}
              className="h-64"
            />
          </div>
        </div>
        
        {/* Chat Section (1/3 width) */}
        <div className="bg-gray-800 border-l border-gray-700 p-4" style={{ width: '33.333%' }}>
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="pb-4 border-b border-gray-700 mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-blue-400" />
                AI Assistant
              </h3>
              <p className="text-sm text-gray-400">Ask me anything about video editing</p>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {chatMessages.map((message, index) => (
                <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-700 text-gray-100'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Chat Input */}
            <div className="pt-4 border-t border-gray-700 mt-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask me to edit your video..."
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Panel - Enhanced Effects Library */}
      <div className="bg-gray-800 border-t border-gray-700 p-6">
        <EffectsLibrary
          onApplyEffect={(effect, params) => {
            console.log('Applying effect:', effect, 'with params:', params);
            // Handle effect application logic here
          }}
          selectedClips={tracks.flatMap(track => track.clips.filter(clip => clip.selected))}
          className="mb-6"
        />
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-700">
          <div className="flex space-x-3">
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center">
              <RotateCcw className="w-4 h-4 mr-2" />
              Undo
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
             <input
               type="text"
               value={projectName}
               onChange={(e) => setProjectName(e.target.value)}
               placeholder="Enter project name..."
               className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
             />
             <button 
               onClick={saveProject}
               disabled={isSaving || !uploadedVideo}
               className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                 isSaving || !uploadedVideo
                   ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                   : 'bg-green-500 hover:bg-green-600 text-white'
               }`}
             >
               <Save className="w-4 h-4 mr-2" />
               {isSaving ? 'Saving...' : 'Save Project'}
             </button>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export Video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIEditor;