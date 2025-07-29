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
  const [videoRef, setVideoRef] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Get video from navigation state
  useEffect(() => {
    if (location.state?.video) {
      setUploadedVideo(location.state.video);
      setChatMessages(prev => [...prev, {
        type: 'ai',
        content: `Perfect! I've loaded "${location.state.video.name}". I can help you with editing, effects, transitions, color grading, and more. What would you like to do first?`,
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Main Editor Layout */}
      <div className="flex h-screen">
        {/* Video Preview Section (2/3 width) */}
        <div className="flex-1 flex flex-col" style={{ width: '66.666%' }}>
          {/* Video Player */}
          <div className="flex-1 bg-black relative">
            {uploadedVideo ? (
              <>
                <video
                  ref={setVideoRef}
                  className="w-full h-full object-contain"
                  src={uploadedVideo.url}
                  controls={false}
                  muted={isMuted}
                  preload="metadata"
                  onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.target.duration)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                
                {/* Video Controls Overlay */}
                <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={togglePlayPause}
                      className="bg-blue-500 hover:bg-blue-600 p-2 rounded-full transition-colors"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    
                    <button onClick={skipBackward} className="p-2 hover:bg-gray-700 rounded transition-colors">
                      <SkipBack className="w-4 h-4" />
                    </button>
                    
                    <button onClick={skipForward} className="p-2 hover:bg-gray-700 rounded transition-colors">
                      <SkipForward className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={toggleMute}
                        className="p-2 hover:bg-gray-700 rounded transition-colors"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-20"
                      />
                    </div>
                    
                    <div className="flex-1 mx-4">
                      <div className="text-sm text-gray-300">
                        {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / 
                        {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                    
                    <button className="p-2 hover:bg-gray-700 rounded transition-colors">
                      <Maximize className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </>
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
          
          {/* Timeline Editor */}
          <div className="bg-gray-800 border-t border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Timeline</h3>
              <div className="flex space-x-2">
                <button className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-sm transition-colors">
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Layer
                </button>
                <button className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm transition-colors">
                  <Layers className="w-4 h-4 inline mr-1" />
                  Tracks
                </button>
              </div>
            </div>
            
            {/* Timeline Tracks */}
            <div className="space-y-2">
              <div className="bg-gray-700 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Video Track</span>
                  <div className="flex space-x-1">
                    <button className="p-1 hover:bg-gray-600 rounded">
                      <Eye className="w-3 h-3" />
                    </button>
                    <button className="p-1 hover:bg-gray-600 rounded">
                      <Volume2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="bg-blue-500/30 border border-blue-500 rounded h-8 flex items-center px-2">
                  <span className="text-xs">{uploadedVideo?.name || 'No video loaded'}</span>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Audio Track</span>
                  <div className="flex space-x-1">
                    <button className="p-1 hover:bg-gray-600 rounded">
                      <Volume2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="bg-green-500/30 border border-green-500 rounded h-6">
                  {/* Audio waveform placeholder */}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Chat Section (1/3 width) */}
        <div className="bg-gray-800 border-l border-gray-700" style={{ width: '33.333%' }}>
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-blue-400" />
                AI Assistant
              </h3>
              <p className="text-sm text-gray-400">Ask me anything about video editing</p>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            <div className="p-4 border-t border-gray-700">
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
      
      {/* Bottom Panel - Effects and Suggestions */}
      <div className="bg-gray-800 border-t border-gray-700 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Effects Panel */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Wand2 className="w-5 h-5 mr-2 text-purple-400" />
              AI Effects
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {effects.map((effect, index) => {
                const IconComponent = effect.icon;
                return (
                  <motion.button
                    key={index}
                    className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg text-left transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center mb-2">
                      <IconComponent className="w-5 h-5 mr-2 text-blue-400" />
                      <span className="font-medium text-sm">{effect.name}</span>
                    </div>
                    <p className="text-xs text-gray-400">{effect.description}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>
          
          {/* AI Suggestions */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-yellow-400" />
              AI Suggestions
            </h3>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  className="w-full bg-gray-700 hover:bg-gray-600 p-3 rounded-lg text-left text-sm transition-colors"
                  whileHover={{ scale: 1.01 }}
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-700">
          <div className="flex space-x-3">
            <button className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors flex items-center">
              <RotateCcw className="w-4 h-4 mr-2" />
              Undo
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors flex items-center">
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
               className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
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
            <button className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center">
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