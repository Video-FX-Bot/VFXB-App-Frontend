<<<<<<< HEAD
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
=======
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
>>>>>>> origin/main
import {
  Play,
  Send,
  Save,
<<<<<<< HEAD
  Settings
} from 'lucide-react';
import EnhancedVideoPlayer from '../components/video/EnhancedVideoPlayer';
import EnhancedTimeline from '../components/EnhancedTimeline';
import EffectsLibrary from '../components/effects/EffectsLibrary';
// Removed ProfessionalToolPalette import as per user request
import { videoWorker, smartCache, progressiveLoader, memoryManager } from '../utils/performanceOptimizer';
import socketService from '../services/socketService';
import projectService from '../services/projectService';
=======
  Download,
  Sparkles,
  Settings,
  RotateCcw,
  MessageSquareMore,
  Wand2,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import EnhancedVideoPlayer from "../components/video/EnhancedVideoPlayer";
import EnhancedTimeline from "../components/timeline/EnhancedTimeline";
import EffectsLibrary from "../components/effects/EffectsLibrary";
>>>>>>> origin/main

const WELCOME_MSG = {
  type: "ai",
  content:
    "Welcome to VFXB AI Editor! I'm here to help you create amazing videos. Upload a video or ask me anything about video editing.",
  timestamp: new Date().toISOString(),
};

const formatDuration = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
};

export default function AIEditor() {
  const location = useLocation();
<<<<<<< HEAD
  const videoRef = useRef(null);
=======

  // refs/state
  const videoElRef = useRef(null);
>>>>>>> origin/main
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
<<<<<<< HEAD
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      type: 'ai',
      content: 'Hi! I\'m your AI video editing assistant. Upload a video to get started, or ask me anything about editing!',
      timestamp: new Date().toISOString(),
      suggestions: [
        '🎨 Apply color grading',
        '✂️ Trim video',
        '🎵 Add music',
        '📝 Add titles',
        '⚡ Enhance quality',
        '🔄 Add transitions'
      ]
    }
  ]);
  
  // Enhanced AI Chat features
  const [isTyping, setIsTyping] = useState(false);
  const [contextAwareSuggestions, setContextAwareSuggestions] = useState([]);
  const [voiceCommandActive, setVoiceCommandActive] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [userPreferences, setUserPreferences] = useState({
    preferredEffects: [],
    editingStyle: 'cinematic',
    autoSuggestions: true
  });
  const [newMessage, setNewMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1);
  
  // Professional tools and performance state
  const [selectedTool, setSelectedTool] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [memoryStats, setMemoryStats] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportQuality, setExportQuality] = useState('1080p');
  const [backgroundTasks, setBackgroundTasks] = useState([]);
=======
  const [timelineZoom, setTimelineZoom] = useState(1);

  // chat
  const [chatMessages, setChatMessages] = useState([WELCOME_MSG]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // tracks
>>>>>>> origin/main
  const [tracks, setTracks] = useState([
    {
      id: "video-track-1",
      type: "video",
      name: "Main Video",
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      volume: 1,
    },
    {
      id: "audio-track-1",
      type: "audio",
      name: "Audio Track",
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      volume: 1,
    },
  ]);
<<<<<<< HEAD
  const [projectName, setProjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Extract video metadata
  const extractVideoMetadata = (videoFile) => {
    return new Promise((resolve) => {
      if (!videoFile || !(videoFile instanceof File || videoFile instanceof Blob)) {
        console.error('Invalid video file provided to extractVideoMetadata');
        resolve({
          duration: 30,
          width: 1920,
          height: 1080,
          resolution: '1920x1080',
          fps: 30,
          fileSize: 0,
          format: 'video/mp4'
        });
        return;
      }

      const video = document.createElement('video');
      video.preload = 'metadata';
      let objectURL = null;
      
      const cleanup = () => {
        if (objectURL) {
          URL.revokeObjectURL(objectURL);
          objectURL = null;
        }
        video.removeAttribute('src');
        video.load();
      };
      
      video.onloadedmetadata = () => {
        const metadata = {
          duration: video.duration || 30,
          width: video.videoWidth || 1920,
          height: video.videoHeight || 1080,
          resolution: `${video.videoWidth || 1920}x${video.videoHeight || 1080}`,
          fps: 30, // Default, would need more complex detection for actual FPS
          fileSize: videoFile.size || 0,
          format: videoFile.type || 'video/mp4'
        };
        cleanup();
        resolve(metadata);
      };
      
      video.onerror = (error) => {
        console.error('Video metadata extraction error:', error);
        cleanup();
        // Fallback metadata
        resolve({
          duration: 30,
          width: 1920,
          height: 1080,
          resolution: '1920x1080',
          fps: 30,
          fileSize: videoFile.size || 0,
          format: videoFile.type || 'video/mp4'
        });
      };
      
      try {
        objectURL = URL.createObjectURL(videoFile);
        video.src = objectURL;
      } catch (error) {
        console.error('Failed to create object URL:', error);
        cleanup();
        resolve({
          duration: 30,
          width: 1920,
          height: 1080,
          resolution: '1920x1080',
          fps: 30,
          fileSize: videoFile.size || 0,
          format: videoFile.type || 'video/mp4'
        });
      }
    });
  };

  // Get video from navigation state
  useEffect(() => {
    if (location.state?.video) {
      const video = location.state.video;
      const autoAnalyze = location.state?.autoAnalyze;
      const fromDashboard = location.state?.fromDashboard;
      
      setUploadedVideo(video);
      
      // Extract actual video metadata
       extractVideoMetadata(video).then(async (videoMetadata) => {
         console.log('Extracted video metadata:', videoMetadata);
         
         // Automatically add video to timeline with detailed processing
         const videoClip = {
           id: `clip-${Date.now()}`,
           name: video.name || 'Video Clip',
           type: 'video',
           startTime: 0,
           duration: videoMetadata.duration,
           thumbnail: video.url,
           url: video.url,
           metadata: videoMetadata,
           tags: ['main-content', 'uploaded'],
           scenes: [
             { start: 0, end: Math.min(10, videoMetadata.duration), type: 'intro', description: 'Opening scene' },
             { start: Math.min(10, videoMetadata.duration), end: Math.min(videoMetadata.duration - 10, videoMetadata.duration), type: 'main', description: 'Main content' },
             { start: Math.max(0, videoMetadata.duration - 10), end: videoMetadata.duration, type: 'outro', description: 'Closing scene' }
           ]
         };
         
         const audioClip = {
           id: `audio-clip-${Date.now()}`,
           name: 'Audio Track',
           type: 'audio',
           startTime: 0,
           duration: videoMetadata.duration,
           url: video.url,
           metadata: {
             channels: 2,
             sampleRate: 44100,
             bitrate: 128
           }
         };
         
         // Update tracks with the new video
         setTracks([
           {
             id: 'video-track-1',
             type: 'video',
             name: 'Main Video',
             clips: [videoClip],
             muted: false,
             locked: false,
             visible: true,
             volume: 1
           },
           {
             id: 'audio-track-1',
             type: 'audio',
             name: 'Audio Track',
             clips: [audioClip],
             muted: false,
             locked: false,
             visible: true,
             volume: 1
           }
         ]);
         
         // Set duration and project name
         setDuration(videoMetadata.duration);
         const newProjectName = video.name?.replace(/\.[^/.]+$/, '') || 'Untitled Project';
         setProjectName(newProjectName);
         
         // Automatically create and save project when video is loaded
         const autoProjectData = {
           name: newProjectName,
           video: video,
           videoData: {
             name: video.name,
             size: video.size,
             type: video.type,
             url: video.url
           },
           thumbnail: video.url,
           duration: Math.floor(videoMetadata.duration / 60) + ':' + Math.floor(videoMetadata.duration % 60).toString().padStart(2, '0'),
           lastModified: 'Just now',
           status: 'editing',
           createdAt: new Date().toISOString(),
           socketId: socketService.getSocketId(),
           chatHistory: [],
           metadata: videoMetadata,
           autoSaved: true
         };

         // Save project using projectService with fallback to localStorage
         try {
           const savedProject = await projectService.saveProject(autoProjectData, true);
           console.log('Project automatically created and saved:', savedProject);
         } catch (error) {
           console.error('Failed to auto-save project:', error);
         }
         
         // Add AI welcome message with video details
         setChatMessages(prev => [...prev, {
           type: 'ai',
           content: `Great! I've analyzed your video "${video.name}" and automatically created a project for you. Here are the details:\n\n📹 **Video Information:**\n- Duration: ${Math.floor(videoMetadata.duration / 60)}:${String(Math.floor(videoMetadata.duration % 60)).padStart(2, '0')}\n- Resolution: ${videoMetadata.resolution}\n- File Size: ${(videoMetadata.fileSize / (1024 * 1024)).toFixed(1)} MB\n\n✅ **Project Status:**\n- Automatically saved to Projects page\n- Ready for editing\n\nThe video has been added to your timeline with separate video and audio tracks. You can now start editing!`,
           timestamp: new Date().toISOString()
         }]);
         
         // Trigger automatic video analysis if requested from dashboard
         if (autoAnalyze && fromDashboard) {
           setTimeout(() => {
             setIsChatLoading(true);
             setIsProcessing(true);
             setProcessingProgress(0);
             
             // Simulate analysis progress
             const progressInterval = setInterval(() => {
               setProcessingProgress(prev => {
                 if (prev >= 100) {
                   clearInterval(progressInterval);
                   setIsProcessing(false);
                   setIsChatLoading(false);
                   
                   // Add analysis results message
                   setChatMessages(prev => [...prev, {
                     type: 'ai',
                     content: `🔍 **Video Analysis Complete!**\n\nI've automatically analyzed your video and here's what I found:\n\n🎬 **Content Analysis:**\n- Scene Detection: ${videoClip.scenes.length} scenes identified\n- Video Quality: ${videoMetadata.resolution} - Good quality\n- Audio Quality: Clear audio detected\n\n💡 **AI Recommendations:**\n- Consider adding smooth transitions between scenes\n- The lighting could benefit from color correction\n- Audio levels are balanced\n- Perfect for adding background music\n\n✨ **Quick Actions Available:**\n- Apply cinematic color grading\n- Add fade transitions\n- Enhance audio quality\n- Create title sequence\n\nWhat would you like to work on first?`,
                     timestamp: new Date().toISOString(),
                     suggestions: [
                       '🎨 Apply cinematic color grading',
                       '🔄 Add smooth transitions',
                       '🎵 Add background music',
                       '📝 Create title sequence',
                       '⚡ Enhance video quality'
                     ]
                   }]);
                   
                   return 100;
                 }
                 return prev + 10;
               });
             }, 200);
           }, 1000);
         }
       }).catch((error) => {
         console.error('Error extracting video metadata:', error);
         // Fallback with default duration
         setDuration(30);
         setProjectName(video.name?.replace(/\.[^/.]+$/, '') || 'Untitled Project');
       });
    }
  }, [location.state]);

  // Socket connection setup
  useEffect(() => {
    // Connect to socket service
    socketService.connect();

    // Set up event listeners
    socketService.onAIResponse((data) => {
      setChatMessages(prev => [...prev, {
        type: 'ai',
        content: data.message,
        actions: data.actions || [],
        tips: data.tips || [],
        timestamp: new Date().toISOString()
      }]);
      setIsTyping(false);
      setIsLoading(false);
    });

    socketService.onVideoAnalysisComplete((data) => {
      setChatMessages(prev => [...prev, {
        type: 'ai',
        content: data.message,
        actions: data.actions || [],
        tips: data.tips || [],
        timestamp: new Date().toISOString()
      }]);
    });

    socketService.onChatError((error) => {
      console.error('Socket error:', error);
      setChatMessages(prev => [...prev, {
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      }]);
      setIsTyping(false);
      setIsLoading(false);
    });

    socketService.onAITyping((data) => {
      setIsTyping(data.typing);
    });

    socketService.onMessageReceived((data) => {
      setChatMessages(prev => [...prev, {
        type: 'user',
        content: data.message,
        timestamp: new Date().toISOString()
      }]);
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Video control functions
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      const newTime = Math.max(0, videoRef.current.currentTime - 10);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      const newTime = Math.min(duration, videoRef.current.currentTime + 10);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleTimeChange = (time) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const addTrack = (type) => {
    const newTrack = {
      id: `${type}-track-${Date.now()}`,
      type: type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${tracks.filter(t => t.type === type).length + 1}`,
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      volume: 1
    };
    setTracks(prev => [...prev, newTrack]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      type: 'user',
      content: newMessage,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatHistory(prev => [...prev, newMessage]);
    setNewMessage('');
    setIsChatLoading(true);
    setIsTyping(true);

    try {
      // Send message through socket service
      await socketService.sendChatMessage({
        message: newMessage,
        videoMetadata: uploadedVideo ? {
          name: uploadedVideo.name,
          duration: duration,
          size: uploadedVideo.size,
          type: uploadedVideo.type
        } : null,
        chatHistory: chatHistory,
        projectContext: {
          tracks: tracks,
          currentTime: currentTime,
          projectName: projectName
        }
      });

      // If there's an uploaded video and this is the first message about it, trigger video analysis
      if (uploadedVideo && chatHistory.length === 0) {
        await socketService.notifyVideoUpload({
          videoName: uploadedVideo.name,
          videoSize: uploadedVideo.size,
          videoType: uploadedVideo.type,
          duration: duration
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setChatMessages(prev => [...prev, {
        type: 'ai',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date().toISOString()
      }]);
      setIsChatLoading(false);
      setIsTyping(false);
    }
  };
  
  // Performance monitoring and optimization
  useEffect(() => {
    const monitorPerformance = () => {
      const stats = memoryManager.getMemoryStats();
      setMemoryStats(stats);
      
      const cache = smartCache.getStats();
      setCacheStats(cache);
    };
    
    const interval = setInterval(monitorPerformance, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Tool handling functions
   const handleToolSelect = useCallback((tool) => {
    setSelectedTool(tool);
    
    // Execute tool-specific actions
    switch (tool.id) {
      case 'cut':
        // Handle cut operation
        break;
      case 'trim':
        // Handle trim operation
        break;
      case 'color-correction':
        // Handle color correction
        break;
      default:
        console.log(`Tool selected: ${tool.name}`);
    }
  }, []);
   
   // Background processing handler
   const handleBackgroundProcess = useCallback(async (task) => {
    setIsProcessing(true);
    setProcessingProgress(0);
    
    try {
      const result = await videoWorker.processVideo(task, (progress) => {
        setProcessingProgress(progress);
      });
      
      setBackgroundTasks(prev => [...prev, {
        id: Date.now(),
        type: task.type,
        status: 'completed',
        result
      }]);
    } catch (error) {
      console.error('Background processing failed:', error);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, []);
   
   // Keyboard shortcuts for professional tools
   useEffect(() => {
     const handleKeyDown = (e) => {
       // Only handle shortcuts if not typing in an input, textarea, or contenteditable element
       if (e.target.tagName === 'INPUT' || 
           e.target.tagName === 'TEXTAREA' || 
           e.target.contentEditable === 'true' ||
           e.target.closest('[contenteditable="true"]') ||
           e.target.closest('textarea') ||
           e.target.closest('input')) {
         return;
       }
       
       if (e.ctrlKey || e.metaKey) {
         switch (e.key) {
           case 'x':
             e.preventDefault();
             handleToolSelect({ id: 'cut', name: 'Cut' });
             break;
           case 'c':
             e.preventDefault();
             handleToolSelect({ id: 'copy', name: 'Copy' });
             break;
           case 'v':
             e.preventDefault();
             handleToolSelect({ id: 'paste', name: 'Paste' });
             break;
           case 'z':
             e.preventDefault();
             if (e.shiftKey) {
               // Redo
               console.log('Redo');
             } else {
               // Undo
               console.log('Undo');
             }
             break;
           case 's':
             e.preventDefault();
             // Save project
             console.log('Save project');
             break;
           case 'e':
             e.preventDefault();
             // Export
             handleBackgroundProcess({ type: 'export', quality: exportQuality });
             break;
         }
       } else {
         switch (e.key) {
           case 'Delete':
           case 'Backspace':
             handleToolSelect({ id: 'delete', name: 'Delete' });
             break;
           case ' ':
             e.preventDefault();
             togglePlayPause();
             break;
         }
       }
     };
     
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
   }, [isPlaying, exportQuality, handleToolSelect, handleBackgroundProcess, togglePlayPause]);
 
   // Enhanced AI response generator with natural language processing
  const generateEnhancedAIResponse = (message, video, history) => {
    const lowerMessage = message.toLowerCase();
    
    // Context-aware responses based on video content and history
    const responses = {
      // Editing commands
      cut: {
        content: "I'll help you cut your video. You can use the scissors tool in the timeline or tell me the specific timestamps where you'd like to make cuts.",
        suggestions: ['Cut at current time', 'Split clip in half', 'Remove middle section'],
        actions: ['enableCutTool', 'highlightTimeline']
      },
      trim: {
        content: "Let's trim your video! You can drag the clip edges in the timeline or specify the start and end times you want to keep.",
        suggestions: ['Trim beginning', 'Trim end', 'Keep middle section'],
        actions: ['enableTrimTool', 'showTrimControls']
      },
      transition: {
        content: "I can add smooth transitions between your clips. What type of transition would you like? Fade, dissolve, wipe, or something more creative?",
        suggestions: ['Add fade transition', 'Cross dissolve', 'Wipe transition', 'Zoom transition'],
        actions: ['openTransitionLibrary']
      },
      effect: {
        content: "Great! I have over 50 professional effects available. What kind of look are you going for? Cinematic, vintage, artistic, or something specific?",
        suggestions: ['Color grading', 'Blur effects', 'Artistic filters', 'Lighting effects'],
        actions: ['openEffectsLibrary']
      },
      music: {
        content: "Adding music will make your video more engaging! I can help you add background music, sync it to the beat, or adjust audio levels.",
        suggestions: ['Add background music', 'Sync to beat', 'Adjust audio levels', 'Add fade in/out'],
        actions: ['openMusicLibrary', 'showAudioControls']
      },
      text: {
        content: "Let's add some text to your video! I can create titles, subtitles, captions, or animated text overlays. What would you like to add?",
        suggestions: ['Add title', 'Create subtitles', 'Animated text', 'Lower thirds'],
        actions: ['openTextEditor', 'showTextTemplates']
      }
    };
    
    // Find matching response
    for (const [key, response] of Object.entries(responses)) {
      if (lowerMessage.includes(key)) {
        return {
          ...response,
          contextSuggestions: generateContextSuggestions(video, history)
        };
      }
    }
    
    // Default enhanced response
    return {
      content: "I'm here to help you create amazing videos! You can ask me to add effects, transitions, music, text, or perform any editing operation. What would you like to work on?",
      suggestions: ['Show me effects', 'Add transitions', 'Help with audio', 'Create titles'],
      actions: ['showTutorial'],
      contextSuggestions: generateContextSuggestions(video, history)
    };
  };
  
  // Generate context-aware suggestions based on video content
  const generateContextSuggestions = (video, history) => {
    const suggestions = [];
    
    if (video) {
      suggestions.push('Enhance video quality');
      suggestions.push('Add color grading');
      suggestions.push('Create highlight reel');
    }
    
    if (history.length > 0) {
      const recentTopics = history.slice(-3);
      if (recentTopics.some(topic => topic.includes('color'))) {
        suggestions.push('Apply color correction');
      }
      if (recentTopics.some(topic => topic.includes('audio'))) {
        suggestions.push('Noise reduction');
      }
    }
    
    return suggestions;
  };

  const saveProject = async () => {
    if (!uploadedVideo) {
      alert('No video to save!');
      return;
    }
=======

  // project
  const [projectName, setProjectName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // right panel (tabs & mobile drawers)
  const [activeTab, setActiveTab] = useState("assistant"); // 'assistant' | 'effects'
  const [mobileDrawer, setMobileDrawer] = useState(null); // null | 'assistant' | 'effects'

  // load video from router state
  useEffect(() => {
    const vid = location.state?.video;
    if (!vid) return;
    setUploadedVideo(vid);
    setChatMessages((prev) => [
      ...prev,
      {
        type: "ai",
        content: `Perfect! I've loaded "${vid.name}". What would you like to do first?`,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [location.state]);

  // rebuild tracks when video/duration changes
  useEffect(() => {
    if (!uploadedVideo) return;
    const clipDuration = duration || 30;
    setTracks((prev) => {
      const next = [...prev];
      next[0] = {
        ...next[0],
        clips: [
          {
            id: "clip-1",
            name: uploadedVideo.name || "Video Clip",
            type: "video",
            startTime: 0,
            duration: clipDuration,
            thumbnail: uploadedVideo.thumbnail,
          },
        ],
      };
      next[1] = {
        ...next[1],
        clips: [
          {
            id: "audio-clip-1",
            name: "Audio",
            type: "audio",
            startTime: 0,
            duration: clipDuration,
          },
        ],
      };
      return next;
    });
  }, [uploadedVideo, duration]);

  const selectedClips = useMemo(
    () => tracks.flatMap((t) => (t.clips || []).filter((c) => c.selected)),
    [tracks]
  );

  // chat handlers
  const handleSendMessage = useCallback(() => {
    const content = newMessage.trim();
    if (!content) return;
    setChatMessages((prev) => [
      ...prev,
      { type: "user", content, timestamp: new Date().toISOString() },
    ]);
    setNewMessage("");
    setIsChatLoading(true);
    setTimeout(() => {
      const responses = [
        `I can help you with "${content}". Let me analyze your video and suggest the best approach.`,
        `Great idea! For "${content}", I can apply automatic enhancements. Want me to proceed?`,
        `Working on "${content}". I’ve prepared a few options that fit your footage.`,
      ];
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsChatLoading(false);
    }, 1000);
  }, [newMessage]);
>>>>>>> origin/main

  // save
  const saveProject = useCallback(() => {
    if (!uploadedVideo) return alert("No video to save!");
    setIsSaving(true);
    const projectData = {
      name: projectName || `Project ${new Date().toLocaleDateString()}`,
      video: uploadedVideo,
      videoData: {
        name: uploadedVideo.name,
        size: uploadedVideo.size,
        type: uploadedVideo.type,
        url: uploadedVideo.url
      },
      thumbnail: uploadedVideo.url,
      duration: formatDuration(duration),
      lastModified: "Just now",
      status: "editing",
      createdAt: new Date().toISOString(),
      chatHistory: chatMessages,
<<<<<<< HEAD
      tracks: tracks,
      currentTime: currentTime,
      manualSave: true
    };

    try {
      // Save project using projectService with fallback to localStorage
      const savedProject = await projectService.saveProject(projectData, true);
      console.log('Project saved successfully:', savedProject);
      alert('Project saved successfully!');
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('Failed to save project. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Main Editor Layout */}
      <div className="flex flex-1 overflow-hidden px-8 py-4 gap-6">
        {/* Video Preview Section (2/3 width) */}
        <div className="flex-1 flex flex-col" style={{ width: '66.666%' }}>
          {/* Enhanced Video Player - Fixed Height */}
          <div className="bg-black relative p-4 rounded-lg shadow-elevation-2 h-[450px] flex-shrink-0">
            {uploadedVideo ? (
              <EnhancedVideoPlayer
                ref={videoRef}
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
                selectedTool={selectedTool}
                isProcessing={isProcessing}
                onBackgroundProcess={handleBackgroundProcess}
                exportProgress={exportProgress}
                exportQuality={exportQuality}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-elevation-2">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2 text-white">No Video Loaded</h3>
                    <p className="text-muted-foreground">Upload a video from the Dashboard to start editing</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Enhanced Timeline - Dynamic Height */}
          <div className="bg-card border-2 border-border shadow-elevation-1 rounded-lg mt-6 overflow-hidden flex-1">
            {/* Simple Media Controls */}
            <div className="p-4 border-b border-border bg-card/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Timeline</h3>
              </div>
            </div>
            <EnhancedTimeline
              tracks={tracks}
              currentTime={currentTime}
              duration={duration || 30}
              zoom={timelineZoom}
              isPlaying={isPlaying}
              theme="dark"
              onTimeChange={handleTimeChange}
              onZoomChange={setTimelineZoom}
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
              onTracksChange={setTracks}
              addTrack={addTrack}
              className="min-h-[200px]"
            />
          </div>
        </div>
        
        {/* Chat Section (1/3 width) - Fixed height with scrollable content */}
        <div className="bg-card border-2 border-border shadow-elevation-2 rounded-lg flex flex-col" style={{ width: '33.333%', height: '700px' }}>
            {/* Chat Header */}
            <div className="pb-6 border-b-2 border-border mb-6 flex-shrink-0 px-6 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold flex items-center">
                  <Sparkles className="w-6 h-6 mr-3 text-primary" />
                  AI Assistant
                </h3>
                <div className="flex items-center space-x-4">
                  {/* Performance Indicators */}
                  {memoryStats && (
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Memory: {Math.round(memoryStats.used / 1024 / 1024)}MB</span>
                      </div>
                      {cacheStats && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Cache: {cacheStats.hitRate}%</span>
                        </div>
                      )}
                    </div>
                  )}
                  

                </div>
              </div>
              <p className="text-sm text-muted-foreground">Ask me anything about video editing</p>
               
               {/* Processing Progress Indicator */}
               {isProcessing && (
                 <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-sm text-blue-400">Processing...</span>
                     <span className="text-sm text-blue-400">{Math.round(processingProgress)}%</span>
                   </div>
                   <div className="w-full bg-gray-700 rounded-full h-2">
                     <div 
                       className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                       style={{ width: `${processingProgress}%` }}
                     ></div>
                   </div>
                 </div>
               )}
             </div>
            
            {/* Chat Messages - Enhanced scrolling with better visibility */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6" style={{ scrollbarWidth: 'thin' }}>
              <div className="space-y-6 pb-6">
                {chatMessages.map((message, index) => (
                  <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-lg shadow-elevation-1 ${
                      message.type === 'user' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-elevation-2 mr-2' 
                        : 'bg-muted text-muted-foreground border-2 border-border ml-2'
                    }`}>
                      <p className="text-sm break-words">{message.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {new Date().toLocaleTimeString()}
                      </span>
=======
    };
    const existing = JSON.parse(localStorage.getItem("vfxb_projects") || "[]");
    const updated = [projectData, ...existing];
    localStorage.setItem("vfxb_projects", JSON.stringify(updated));
    localStorage.setItem(
      "vfxb_recent_projects",
      JSON.stringify(updated.slice(0, 3))
    );
    setTimeout(() => {
      setIsSaving(false);
      alert("Project saved successfully!");
    }, 600);
  }, [uploadedVideo, projectName, duration, chatMessages]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* GRID: Left content || Right sticky sidebar */}
      <div className="flex-1 p-4 lg:grid lg:grid-cols-12 lg:gap-4">
        {/* LEFT COLUMN (lg: span 8) */}
        <div className="min-w-0 lg:col-span-8 flex flex-col gap-4">
          {/* Preview — reasonable height */}
          <div className="bg-black relative p-4 rounded-lg shadow-elevation-2 w-full max-w-full min-w-0">
            <div className="w-full h-[420px] md:h-[500px] lg:h-[560px]">
              {uploadedVideo ? (
                <EnhancedVideoPlayer
                  ref={videoElRef}
                  src={uploadedVideo.url}
                  poster={uploadedVideo.thumbnail}
                  currentTime={currentTime}
                  duration={duration}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={setDuration}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full h-full"
                  showWaveform
                  showThumbnailScrubbing
                  enableKeyboardShortcuts
                  showMinimap
                  enableGestures
                  enablePiP
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="text-center space-y-4">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-elevation-2">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        No Video Loaded
                      </h3>
                      <p className="text-muted-foreground">
                        Upload a video from the Dashboard to start editing
                      </p>
>>>>>>> origin/main
                    </div>
                  </div>
                ))}
                
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted p-3 rounded-lg border-2 border-border shadow-elevation-1 ml-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
<<<<<<< HEAD
            
            {/* Chat Input - Enhanced fixed bottom with better spacing */}
            <div className="pt-4 border-t-2 border-border mt-auto flex-shrink-0 bg-card/50 backdrop-blur-sm px-6 pb-4">
              <div className="flex space-x-3">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask me to edit your video... (Press Enter to send, Shift+Enter for new line)"
                  className="flex-1 bg-background border-2 border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground shadow-elevation-1 transition-all duration-200 resize-none min-h-[44px] max-h-[120px] overflow-y-auto"
                  rows={1}
                  style={{
                    height: 'auto',
                    minHeight: '44px',
                    maxHeight: '120px'
                  }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:bg-muted disabled:cursor-not-allowed p-3 rounded-lg transition-all duration-200 shadow-elevation-1 hover:shadow-elevation-2 hover:scale-105 min-w-[48px] flex items-center justify-center self-end"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
=======
          </div>

          {/* Timeline — minimal w/ title + play + time (no clipping) */}
          <div className="bg-card border-2 border-border shadow-elevation-2 rounded-lg w-full max-w-full min-w-0">
            <EnhancedTimeline
              title="Timeline"
              currentTime={currentTime}
              duration={duration || 30}
              zoom={timelineZoom}
              isPlaying={isPlaying}
              onPlay={() => {
                setIsPlaying(true);
                const el = videoElRef.current;
                if (el) el.play();
              }}
              onPause={() => {
                setIsPlaying(false);
                const el = videoElRef.current;
                if (el) el.pause();
              }}
              onTimeChange={(time) => {
                setCurrentTime(time);
                const el = videoElRef.current;
                if (el) el.currentTime = time;
              }}
              className="h-47" // little taller so the white bar + ticks don’t get cropped
            />
          </div>

          {/* (Optional) Actions row under left column if you still want it visible here */}
          <div className="hidden lg:flex justify-between items-center bg-card border-2 border-border shadow-elevation-2 rounded-lg p-4">
            <div className="flex space-x-3">
              <button className="bg-card hover:bg-muted text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-all border border-border flex items-center">
                <RotateCcw className="w-4 h-4 mr-2" />
                Undo
              </button>
              <button className="bg-card hover:bg-muted text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-all border border-border flex items-center">
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
                className="bg-card border-2 border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-elevation-1 w-48 min-w-0"
              />
              <button
                onClick={saveProject}
                disabled={isSaving || !uploadedVideo}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${
                  isSaving || !uploadedVideo
                    ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border border-green-500"
                }`}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save Project"}
              </button>
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all border border-blue-500 flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export Video
              </button>
>>>>>>> origin/main
            </div>
        </div>

      {/* RIGHT SIDEBAR (lg: span 4) — NOT sticky, fixed height, internal scroll */}
<div className="lg:col-span-4 min-w-0 mt-4 lg:mt-0">
  <div className="bg-card border-2 border-border rounded-lg shadow-elevation-2 w-full max-w-full">
    {/* Tabs */}
    <div className="flex items-stretch border-b border-border">
      <button
        className={`flex-1 px-4 py-2 text-sm font-medium ${
          activeTab === "assistant" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => setActiveTab("assistant")}
      >
        AI Assistant
      </button>
      <button
        className={`flex-1 px-4 py-2 text-sm font-medium ${
          activeTab === "effects" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => setActiveTab("effects")}
      >
        Effects
      </button>
    </div>

    {/* Panel: fixed height, scrolls internally */}
    {/* Adjust the height to taste: h-[70vh], h-[600px], or calc */}
    <div className="p-4 h-[80vh] overflow-hidden">
      {/* Inner scroller so input can stay visible if you want a sticky input */}
      <div className="h-full overflow-y-auto">
        {activeTab === "assistant" ? (
          <AssistantPanel
            chatMessages={chatMessages}
            isChatLoading={isChatLoading}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleSendMessage={handleSendMessage}
          />
        ) : (
          <EffectsPanel selectedClips={selectedClips} />
        )}
      </div>
<<<<<<< HEAD
      
      {/* Bottom Panel - Effects Library Only */}
      <div className="bg-card border-2 border-border shadow-elevation-2 rounded-lg mx-4 mb-4">
        {/* Effects Library */}
        <EffectsLibrary
          onApplyEffect={(effect, params) => {
            console.log('Applying effect:', effect, 'with params:', params);
            // Handle effect application logic here
          }}
          selectedClips={tracks.flatMap(track => track.clips.filter(clip => clip.selected))}
          className="p-4"
        />
        
        {/* Action Buttons - Original Layout */}
        <div className="flex justify-between items-center p-4 border-t-2 border-border px-6">
          {/* Left Side - Utility Buttons */}
          <div className="flex space-x-3">
            <button className="bg-card hover:bg-muted text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center shadow-elevation-1 hover:shadow-elevation-2 hover:scale-105 border border-border">
              <RotateCcw className="w-4 h-4 mr-2" />
              Undo
            </button>
            <button className="bg-card hover:bg-muted text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center shadow-elevation-1 hover:shadow-elevation-2 hover:scale-105 border border-border">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>
          </div>
          
          {/* Right Side - Input and Action Buttons */}
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name..."
              className="bg-card border-2 border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-elevation-1 transition-all duration-200 w-48"
            />
            <button 
              onClick={saveProject}
              disabled={isSaving || !uploadedVideo}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center shadow-elevation-1 hover:shadow-elevation-2 hover:scale-105 ${
                isSaving || !uploadedVideo
                  ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border border-green-500'
              }`}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Project'}
            </button>
            <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center shadow-elevation-1 hover:shadow-elevation-2 hover:scale-105 border border-blue-500">
              <Download className="w-4 h-4 mr-2" />
              Export Video
            </button>
=======
    </div>
  </div>
</div>

      </div>

      {/* MOBILE: floating dock to open Assistant/Effects drawers */}
      <div className="lg:hidden fixed bottom-4 left-0 right-0 flex justify-center z-40">
        <div className="bg-card border border-border rounded-full shadow-elevation-2 px-3 py-2 flex gap-2">
          <button
            onClick={() => setMobileDrawer("assistant")}
            className="px-3 py-1.5 rounded-full text-sm bg-muted hover:bg-muted/80 flex items-center gap-1"
          >
            <MessageSquareMore className="w-4 h-4" /> Assistant
          </button>
          <button
            onClick={() => setMobileDrawer("effects")}
            className="px-3 py-1.5 rounded-full text-sm bg-muted hover:bg-muted/80 flex items-center gap-1"
          >
            <Wand2 className="w-4 h-4" /> Effects
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileDrawer && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileDrawer(null)}
          />
          <div className="absolute left-0 right-0 bottom-0 bg-card border-t border-border rounded-t-2xl p-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">
                {mobileDrawer === "assistant" ? "AI Assistant" : "Effects"}
              </h3>
              <button
                onClick={() => setMobileDrawer(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            {mobileDrawer === "assistant" ? (
              <AssistantPanel
                chatMessages={chatMessages}
                isChatLoading={isChatLoading}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessage}
              />
            ) : (
              <EffectsPanel selectedClips={selectedClips} />
            )}
>>>>>>> origin/main
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Subcomponents ------------------------------- */

function AssistantPanel({
  chatMessages,
  isChatLoading,
  newMessage,
  setNewMessage,
  handleSendMessage,
}) {
  const listRef = React.useRef(null);

  // Stick to bottom only if user is near the bottom
  const shouldStickToBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    const threshold = 40; // px
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    return dist < threshold;
  };

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  React.useEffect(() => {
    // on mount
    scrollToBottom();
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isChatLoading]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="pb-3 border-b border-border">
        <h3 className="text-lg font-semibold flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-primary" />
          AI Assistant
        </h3>
        <p className="text-xs text-muted-foreground">
          Use natural language to edit your video.
        </p>
      </div>

      {/* Messages LIST is the ONLY scroll area */}
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {chatMessages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-lg ${
                m.type === "user"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              <p className="text-sm">{m.content}</p>
            </div>
          </div>
        ))}

        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-muted p-3 rounded-lg border border-border">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INPUT lives OUTSIDE the scroller → never overlaps */}
      <div className="border-t border-border pt-3 mt-3 bg-card">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Describe your edit…"
            className="flex-1 min-w-0 bg-card border-2 border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm disabled:bg-muted disabled:text-muted-foreground"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
      
      {/* Background Tasks Panel */}
      {backgroundTasks.length > 0 && (
        <motion.div 
          className="fixed bottom-4 right-4 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
        >
          <div className="p-4">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Background Tasks
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {backgroundTasks.slice(-3).map((task) => (
                <div key={task.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 capitalize">{task.type}</span>
                  <span className={`px-2 py-1 rounded ${
                    task.status === 'completed' ? 'bg-green-900 text-green-300' :
                    task.status === 'processing' ? 'bg-blue-900 text-blue-300' :
                    'bg-red-900 text-red-300'
                  }`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
            {backgroundTasks.length > 3 && (
              <div className="text-xs text-gray-400 mt-2">
                +{backgroundTasks.length - 3} more tasks
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function EffectsPanel({ selectedClips }) {
  return (
    <div className="flex h-full flex-col">
      <div className="pb-3 border-b border-border mb-3">
        <h3 className="text-lg font-semibold flex items-center">
          <Wand2 className="w-5 h-5 mr-2 text-primary" />
          Effects Library
        </h3>
        <p className="text-xs text-muted-foreground">Pick and apply effects to selected clips.</p>
      </div>

      {/* <-- ONLY this area scrolls */}
      <div className="flex-1 overflow-y-auto pr-2">
        <EffectsLibrary
          onApplyEffect={(effect, params) => {
            console.log("Applying effect:", effect, "with params:", params);
          }}
          selectedClips={selectedClips}
        />
      </div>
    </div>
  );
}

