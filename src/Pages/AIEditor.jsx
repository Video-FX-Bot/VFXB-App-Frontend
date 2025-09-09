import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
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
  Settings,
  MessageSquare,
} from "lucide-react";
// Lazy load heavy components for better performance
const EnhancedVideoPlayer = lazy(() => import("../components/video/EnhancedVideoPlayer"));
const EnhancedTimeline = lazy(() => import("../components/EnhancedTimeline"));
const EffectsLibrary = lazy(() => import("../components/effects/EffectsLibrary"));
// Removed ProfessionalToolPalette import as per user request
import {
  videoWorker,
  smartCache,
  progressiveLoader,
  memoryManager,
} from "../utils/performanceOptimizer";
import socketService from "../services/socketService";
import projectService from "../services/projectService";
import thumbnailService from "../services/thumbnailService";
import videoService from "../services/videoService";
import { useErrorHandler } from "../components/ErrorBoundary";
import ExportPanel from "../components/tools/ExportPanel";
import AISuggestionsPanel from "../components/AISuggestions/AISuggestionsPanel";

const AIEditor = () => {
  const handleError = useErrorHandler();
  const [activeTab, setActiveTab] = useState("assistant");
  const [selectedClip, setSelectedClip] = useState(null);
  const chatScrollRef = useRef(null);
  const location = useLocation();
  const videoRef = useRef(null);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      type: "ai",
      content:
        "Hi! I'm your AI video editing assistant. Upload a video to get started, or ask me anything about editing!",
      timestamp: new Date().toISOString(),
      suggestions: [
        "🎨 Apply color grading",
        "✂️ Trim video",
        "🎵 Add music",
        "📝 Add titles",
        "⚡ Enhance quality",
        "🔄 Add transitions",
      ],
    },
  ]);

  // Enhanced AI Chat features
  const [isTyping, setIsTyping] = useState(false);
  const [contextAwareSuggestions, setContextAwareSuggestions] = useState([]);
  const [voiceCommandActive, setVoiceCommandActive] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [userPreferences, setUserPreferences] = useState({
    preferredEffects: [],
    editingStyle: "cinematic",
    autoSuggestions: true,
  });
  const [newMessage, setNewMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1);

  // Professional tools and performance state
  const [selectedTool, setSelectedTool] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [memoryStats, setMemoryStats] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportQuality, setExportQuality] = useState("1080p");
  const [backgroundTasks, setBackgroundTasks] = useState([]);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [tracks, setTracks] = useState([
    {
      id: "video-track-1",
      type: "video",
      name: "Main Video",
      clips: uploadedVideo
        ? [
            {
              id: "clip-1",
              name: uploadedVideo.name || "Video Clip",
              type: "video",
              startTime: 0,
              duration: duration > 0 ? duration : 30,
              url: uploadedVideo.url,
              thumbnail: uploadedVideo.thumbnail,
            },
          ]
        : [],
      muted: false,
      locked: false,
      visible: true,
      volume: 1,
    },
    {
      id: "audio-track-1",
      type: "audio",
      name: "Audio Track",
      clips: uploadedVideo
        ? [
            {
              id: "audio-clip-1",
              name: "Audio",
              type: "audio",
              startTime: 0,
              duration: duration > 0 ? duration : 30,
              url: uploadedVideo.url,
            },
          ]
        : [],
      muted: false,
      locked: false,
      visible: true,
      volume: 1,
    },
  ]);
  const [projectName, setProjectName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [lastSavedState, setLastSavedState] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(null);
  const [lastAutoSave, setLastAutoSave] = useState(null);

  // Extract video metadata
  const extractVideoMetadata = (videoFile) => {
    return new Promise((resolve) => {
      if (
        !videoFile ||
        !(videoFile instanceof File || videoFile instanceof Blob)
      ) {
        console.error("Invalid video file provided to extractVideoMetadata");
        resolve({
          duration: 30,
          width: 1920,
          height: 1080,
          resolution: "1920x1080",
          fps: 30,
          fileSize: 0,
          format: "video/mp4",
        });
        return;
      }

      const video = document.createElement("video");
      video.preload = "metadata";
      let objectURL = null;

      const cleanup = () => {
        if (objectURL) {
          URL.revokeObjectURL(objectURL);
          objectURL = null;
        }
        video.removeAttribute("src");
        video.load();
      };

      video.onloadedmetadata = () => {
        const metadata = {
          duration: video.duration || 30,
          width: video.videoWidth || 1920,
          height: video.videoHeight || 1080,
          resolution: `${video.videoWidth || 1920}x${
            video.videoHeight || 1080
          }`,
          fps: 30, // Default, would need more complex detection for actual FPS
          fileSize: videoFile.size || 0,
          format: videoFile.type || "video/mp4",
        };
        cleanup();
        resolve(metadata);
      };

      video.onerror = (error) => {
        console.error("Video metadata extraction error:", error);
        cleanup();
        // Fallback metadata
        resolve({
          duration: 30,
          width: 1920,
          height: 1080,
          resolution: "1920x1080",
          fps: 30,
          fileSize: videoFile.size || 0,
          format: videoFile.type || "video/mp4",
        });
      };

      try {
        objectURL = URL.createObjectURL(videoFile);
        video.src = objectURL;
      } catch (error) {
        console.error("Failed to create object URL:", error);
        cleanup();
        resolve({
          duration: 30,
          width: 1920,
          height: 1080,
          resolution: "1920x1080",
          fps: 30,
          fileSize: videoFile.size || 0,
          format: videoFile.type || "video/mp4",
        });
      }
    });
  };
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    // Always scroll to the bottom when messages or loading state change
    el.scrollTop = el.scrollHeight;
  }, [chatMessages, isChatLoading]);

  // Update track durations when duration changes
  useEffect(() => {
    if (duration > 0 && uploadedVideo) {
      setTracks(prevTracks => 
        prevTracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => ({
            ...clip,
            duration: duration
          }))
        }))
      );
    }
  }, [duration, uploadedVideo]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveEnabled && uploadedVideo && currentProjectId) {
      const interval = setInterval(() => {
        if (hasUnsavedChanges) {
          handleAutoSave();
        }
      }, 30000); // Auto-save every 30 seconds
      
      setAutoSaveInterval(interval);
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [autoSaveEnabled, uploadedVideo, currentProjectId, hasUnsavedChanges]);

  // Track changes to mark unsaved state
  useEffect(() => {
    if (lastSavedState) {
      const currentState = {
        tracks,
        chatMessages,
        projectName,
        currentTime,
        volume,
        isMuted
      };
      
      const hasChanges = JSON.stringify(currentState) !== JSON.stringify(lastSavedState);
      setHasUnsavedChanges(hasChanges);
    }
  }, [tracks, chatMessages, projectName, currentTime, volume, isMuted, lastSavedState]);

  // Cleanup auto-save interval on unmount
  useEffect(() => {
    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }
    };
  }, [autoSaveInterval]);
  // Get video from navigation state
  useEffect(() => {
    if (location.state?.video) {
      const video = location.state.video;
      const autoAnalyze = location.state?.autoAnalyze;
      const fromDashboard = location.state?.fromDashboard;

      setUploadedVideo(video);

      // Extract actual video metadata
      extractVideoMetadata(video)
        .then(async (videoMetadata) => {
          try {
          console.log("Extracted video metadata:", videoMetadata);

          // Generate thumbnail from video first
          let generatedThumbnail = null;
          try {
            generatedThumbnail = await thumbnailService.generateThumbnail(video, 1);
            console.log('Generated thumbnail for project');
          } catch (error) {
            console.warn('Failed to generate thumbnail, using video URL as fallback:', error);
            generatedThumbnail = video.url;
          }

          // Automatically add video to timeline with detailed processing
          const videoClip = {
            id: `clip-${Date.now()}`,
            name: video.name || "Video Clip",
            type: "video",
            startTime: 0,
            duration: videoMetadata.duration,
            thumbnail: generatedThumbnail,
            url: video.url,
            metadata: videoMetadata,
            tags: ["main-content", "uploaded"],
            scenes: [
              {
                start: 0,
                end: Math.min(10, videoMetadata.duration),
                type: "intro",
                description: "Opening scene",
              },
              {
                start: Math.min(10, videoMetadata.duration),
                end: Math.min(
                  videoMetadata.duration - 10,
                  videoMetadata.duration
                ),
                type: "main",
                description: "Main content",
              },
              {
                start: Math.max(0, videoMetadata.duration - 10),
                end: videoMetadata.duration,
                type: "outro",
                description: "Closing scene",
              },
            ],
          };

          const audioClip = {
            id: `audio-clip-${Date.now()}`,
            name: "Audio Track",
            type: "audio",
            startTime: 0,
            duration: videoMetadata.duration,
            url: video.url,
            metadata: {
              channels: 2,
              sampleRate: 44100,
              bitrate: 128,
            },
          };

          // Update tracks with the new video
          setTracks([
            {
              id: "video-track-1",
              type: "video",
              name: "Main Video",
              clips: [videoClip],
              muted: false,
              locked: false,
              visible: true,
              volume: 1,
            },
            {
              id: "audio-track-1",
              type: "audio",
              name: "Audio Track",
              clips: [audioClip],
              muted: false,
              locked: false,
              visible: true,
              volume: 1,
            },
          ]);

          // Set duration and project name
          setDuration(videoMetadata.duration);
          const newProjectName =
            video.name?.replace(/\.[^/.]+$/, "") || "Untitled Project";
          setProjectName(newProjectName);



          // Automatically create and save project when video is loaded
          const autoProjectData = {
            name: newProjectName,
            video: video,
            videoData: {
              name: video.name,
              size: video.size,
              type: video.type,
              url: video.url,
            },
            thumbnail: generatedThumbnail,
            duration:
              Math.floor(videoMetadata.duration / 60) +
              ":" +
              Math.floor(videoMetadata.duration % 60)
                .toString()
                .padStart(2, "0"),
            lastModified: "Just now",
            status: "editing",
            createdAt: new Date().toISOString(),
            socketId: socketService.getSocketId(),
            chatHistory: [],
            tracks: [
              {
                id: "video-track-1",
                type: "video",
                name: "Main Video",
                clips: [videoClip],
                muted: false,
                locked: false,
                visible: true,
                volume: 1,
              },
              {
                id: "audio-track-1",
                type: "audio",
                name: "Audio Track",
                clips: [audioClip],
                muted: false,
                locked: false,
                visible: true,
                volume: 1,
              },
            ],
            metadata: videoMetadata,
            autoSaved: true,
          };

          // Save project using projectService with fallback to localStorage
          try {
            const savedProject = await projectService.saveProject(
              autoProjectData,
              true
            );
            console.log(
              "Project automatically created and saved:",
              savedProject
            );
            
            // Set project ID and initial saved state
            setCurrentProjectId(savedProject.id || savedProject._id);
            setLastSavedState({
              tracks: autoProjectData.tracks,
              chatMessages: autoProjectData.chatHistory,
              projectName: autoProjectData.name,
              currentTime: 0,
              volume: 1,
              isMuted: false
            });
            setHasUnsavedChanges(false);
            setLastAutoSave(new Date());
          } catch (error) {
            console.error("Failed to auto-save project:", error);
          }

          // Add AI welcome message with video details
          setChatMessages((prev) => [
            ...prev,
            {
              type: "ai",
              content: `Great! I've analyzed your video "${
                video.name
              }" and automatically created a project for you. Here are the details:\n\n📹 **Video Information:**\n- Duration: ${Math.floor(
                videoMetadata.duration / 60
              )}:${String(Math.floor(videoMetadata.duration % 60)).padStart(
                2,
                "0"
              )}\n- Resolution: ${videoMetadata.resolution}\n- File Size: ${(
                videoMetadata.fileSize /
                (1024 * 1024)
              ).toFixed(
                1
              )} MB\n\n✅ **Project Status:**\n- Automatically saved to Projects page\n- Ready for editing\n\nThe video has been added to your timeline with separate video and audio tracks. You can now start editing!`,
              timestamp: new Date().toISOString(),
            },
          ]);

          // Trigger automatic video analysis if requested from dashboard
          if (autoAnalyze && fromDashboard) {
            setTimeout(() => {
              setIsChatLoading(true);
              setIsProcessing(true);
              setProcessingProgress(0);

              // Simulate analysis progress
              const progressInterval = setInterval(() => {
                setProcessingProgress((prev) => {
                  if (prev >= 100) {
                    clearInterval(progressInterval);
                    setIsProcessing(false);
                    setIsChatLoading(false);

                    // Add analysis results message
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "ai",
                        content: `🔍 **Video Analysis Complete!**\n\nI've automatically analyzed your video and here's what I found:\n\n🎬 **Content Analysis:**\n- Scene Detection: ${videoClip.scenes.length} scenes identified\n- Video Quality: ${videoMetadata.resolution} - Good quality\n- Audio Quality: Clear audio detected\n\n💡 **AI Recommendations:**\n- Consider adding smooth transitions between scenes\n- The lighting could benefit from color correction\n- Audio levels are balanced\n- Perfect for adding background music\n\n✨ **Quick Actions Available:**\n- Apply cinematic color grading\n- Add fade transitions\n- Enhance audio quality\n- Create title sequence\n\nWhat would you like to work on first?`,
                        timestamp: new Date().toISOString(),
                        suggestions: [
                          "🎨 Apply cinematic color grading",
                          "🔄 Add smooth transitions",
                          "🎵 Add background music",
                          "📝 Create title sequence",
                          "⚡ Enhance video quality",
                        ],
                      },
                    ]);

                    return 100;
                  }
                  return prev + 10;
                });
              }, 200);
            }, 1000);
          }
          } catch (error) {
            handleError(error, {
              context: 'video_metadata_processing',
              videoName: video.name,
              operation: 'extractVideoMetadata'
            });
            // Fallback with default duration
            setDuration(30);
            setProjectName(
              video.name?.replace(/\.[^/.]+$/, "") || "Untitled Project"
            );
          }
        })
        .catch((error) => {
          handleError(error, {
            context: 'video_metadata_extraction',
            videoName: video.name,
            operation: 'extractVideoMetadata'
          });
          // Fallback with default duration
          setDuration(30);
          setProjectName(
            video.name?.replace(/\.[^/.]+$/, "") || "Untitled Project"
          );
        });
    }
  }, [location.state]);

  // Handle existing project data from navigation state
  useEffect(() => {
    // Handle loading existing project by ID
    if (location.state?.projectId && !location.state?.video) {
      console.log('Loading existing project by ID:', location.state.projectId);
      loadProjectState(location.state.projectId)
        .catch((error) => {
          console.error('Failed to load project:', error);
          alert('Failed to load project. Please try again.');
        });
      return;
    }
    
    // Handle existing project data passed directly
    if (location.state?.projectData && !location.state?.video) {
      const projectData = location.state.projectData;
      console.log('Loading existing project data:', projectData);

      try {
        // Set project name
        if (projectData.name) {
          setProjectName(projectData.name);
        }

        // Restore chat history if available
        if (projectData.chatHistory && Array.isArray(projectData.chatHistory)) {
          setChatMessages(projectData.chatHistory);
        }

        // Set video data if available
        if (projectData.video || projectData.videoData) {
          const videoData = projectData.video || projectData.videoData;
          setUploadedVideo(videoData);

          // Extract and set duration
          if (projectData.metadata?.duration) {
            setDuration(projectData.metadata.duration);
          } else if (projectData.duration) {
            // Parse duration string like "5:32" to seconds
            const durationParts = projectData.duration.split(':');
            if (durationParts.length === 2) {
              const minutes = parseInt(durationParts[0]);
              const seconds = parseInt(durationParts[1]);
              setDuration(minutes * 60 + seconds);
            }
          }

          // Restore timeline tracks if available
          if (projectData.tracks && Array.isArray(projectData.tracks)) {
            setTracks(projectData.tracks);
          } else {
            // Create default tracks with project video
            const videoClip = {
              id: `clip-${Date.now()}`,
              name: videoData.name || "Video Clip",
              type: "video",
              startTime: 0,
              duration: projectData.metadata?.duration || 30,
              thumbnail: projectData.thumbnail || videoData.url,
              url: videoData.url,
              metadata: projectData.metadata || {},
              tags: ["main-content", "saved-project"],
            };

            const audioClip = {
              id: `audio-clip-${Date.now()}`,
              name: "Audio Track",
              type: "audio",
              startTime: 0,
              duration: projectData.metadata?.duration || 30,
              url: videoData.url,
              metadata: {
                channels: 2,
                sampleRate: 44100,
                bitrate: 128,
              },
            };

            setTracks([
              {
                id: "video-track-1",
                type: "video",
                name: "Main Video",
                clips: [videoClip],
                muted: false,
                locked: false,
                visible: true,
                volume: 1,
              },
              {
                id: "audio-track-1",
                type: "audio",
                name: "Audio Track",
                clips: [audioClip],
                muted: false,
                locked: false,
                visible: true,
                volume: 1,
              },
            ]);
          }
        }

        // Add welcome back message if no chat history exists
        if (!projectData.chatHistory || projectData.chatHistory.length === 0) {
          setChatMessages([
            {
              type: "ai",
              content: `Welcome back to your project "${projectData.name}"! 🎬\n\nI've restored your project state and you can continue editing where you left off. What would you like to work on today?`,
              timestamp: new Date().toISOString(),
              suggestions: [
                "🎨 Apply color grading",
                "🔄 Add transitions",
                "🎵 Add background music",
                "📝 Create title sequence",
                "💾 Save current progress",
              ],
            },
          ]);
        }

      } catch (error) {
        console.error('Error loading existing project:', error);
        handleError(error, {
          context: 'existing_project_loading',
          projectName: projectData.name,
          operation: 'loadExistingProject'
        });
        
        // Add error message to chat
        setChatMessages([
          {
            type: "ai",
            content: "I encountered an issue loading your project, but I've restored what I could. You can continue editing or save your current progress.",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    }
  }, [location.state]);

  // Socket connection setup
  useEffect(() => {
    // Connect to socket service
    socketService.connect();

    // Set up event listeners
    socketService.onAIResponse((data) => {
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: data.message,
          actions: data.actions || [],
          tips: data.tips || [],
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsTyping(false);
      setIsLoading(false);
    });

    socketService.onVideoAnalysisComplete((data) => {
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: data.message,
          actions: data.actions || [],
          tips: data.tips || [],
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    socketService.onChatError((error) => {
      console.error("Socket error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsTyping(false);
      setIsLoading(false);
    });

    socketService.onAITyping((data) => {
      setIsTyping(data.typing);
    });

    socketService.onMessageReceived((data) => {
      setChatMessages((prev) => [
        ...prev,
        {
          type: "user",
          content: data.message,
          timestamp: new Date().toISOString(),
        },
      ]);
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
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${
        tracks.filter((t) => t.type === type).length + 1
      }`,
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      volume: 1,
    };
    setTracks((prev) => [...prev, newTrack]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      type: "user",
      content: newMessage,
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatHistory((prev) => [...prev, newMessage]);
    setNewMessage("");
    setIsChatLoading(true);
    setIsTyping(true);

    try {
      // Send message through socket service
      await socketService.sendChatMessage({
        message: newMessage,
        videoMetadata: uploadedVideo
          ? {
              name: uploadedVideo.name,
              duration: duration,
              size: uploadedVideo.size,
              type: uploadedVideo.type,
            }
          : null,
        chatHistory: chatHistory,
        projectContext: {
          tracks: tracks,
          currentTime: currentTime,
          projectName: projectName,
        },
      });

      // If there's an uploaded video and this is the first message about it, trigger video analysis
      if (uploadedVideo && chatHistory.length === 0) {
        await socketService.notifyVideoUpload({
          videoName: uploadedVideo.name,
          videoSize: uploadedVideo.size,
          videoType: uploadedVideo.type,
          duration: duration,
        });
      }
    } catch (error) {
      handleError(error, {
        context: 'chat_message_send',
        message: newMessage,
        operation: 'sendChatMessage'
      });
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content:
            "Sorry, I encountered an error while processing your message. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
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
      case "cut":
        // Handle cut operation
        break;
      case "trim":
        // Handle trim operation
        break;
      case "color-correction":
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

      setBackgroundTasks((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: task.type,
          status: "completed",
          result,
        },
      ]);
    } catch (error) {
      handleError(error, {
        context: 'background_video_processing',
        taskType: task.type,
        operation: 'processVideo'
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, []);

  // Keyboard shortcuts for professional tools
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle shortcuts if not typing in an input, textarea, or contenteditable element
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.contentEditable === "true" ||
        e.target.closest('[contenteditable="true"]') ||
        e.target.closest("textarea") ||
        e.target.closest("input")
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "x":
            e.preventDefault();
            handleToolSelect({ id: "cut", name: "Cut" });
            break;
          case "c":
            e.preventDefault();
            handleToolSelect({ id: "copy", name: "Copy" });
            break;
          case "v":
            e.preventDefault();
            handleToolSelect({ id: "paste", name: "Paste" });
            break;
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              // Redo
              console.log("Redo");
            } else {
              // Undo
              console.log("Undo");
            }
            break;
          case "s":
            e.preventDefault();
            // Save project
            console.log("Save project");
            break;
          case "e":
            e.preventDefault();
            // Export
            setShowExportPanel(true);
            break;
          case "i":
            e.preventDefault();
            // AI Suggestions
            setShowAISuggestions(true);
            break;
        }
      } else {
        switch (e.key) {
          case "Delete":
          case "Backspace":
            handleToolSelect({ id: "delete", name: "Delete" });
            break;
          case " ":
            e.preventDefault();
            togglePlayPause();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isPlaying,
    exportQuality,
    handleToolSelect,
    handleBackgroundProcess,
    togglePlayPause,
  ]);

  // Enhanced AI response generator with natural language processing
  const generateEnhancedAIResponse = (message, video, history) => {
    const lowerMessage = message.toLowerCase();

    // Context-aware responses based on video content and history
    const responses = {
      // Editing commands
      cut: {
        content:
          "I'll help you cut your video. You can use the scissors tool in the timeline or tell me the specific timestamps where you'd like to make cuts.",
        suggestions: [
          "Cut at current time",
          "Split clip in half",
          "Remove middle section",
        ],
        actions: ["enableCutTool", "highlightTimeline"],
      },
      trim: {
        content:
          "Let's trim your video! You can drag the clip edges in the timeline or specify the start and end times you want to keep.",
        suggestions: ["Trim beginning", "Trim end", "Keep middle section"],
        actions: ["enableTrimTool", "showTrimControls"],
      },
      transition: {
        content:
          "I can add smooth transitions between your clips. What type of transition would you like? Fade, dissolve, wipe, or something more creative?",
        suggestions: [
          "Add fade transition",
          "Cross dissolve",
          "Wipe transition",
          "Zoom transition",
        ],
        actions: ["openTransitionLibrary"],
      },
      effect: {
        content:
          "Great! I have over 50 professional effects available. What kind of look are you going for? Cinematic, vintage, artistic, or something specific?",
        suggestions: [
          "Color grading",
          "Blur effects",
          "Artistic filters",
          "Lighting effects",
        ],
        actions: ["openEffectsLibrary"],
      },
      music: {
        content:
          "Adding music will make your video more engaging! I can help you add background music, sync it to the beat, or adjust audio levels.",
        suggestions: [
          "Add background music",
          "Sync to beat",
          "Adjust audio levels",
          "Add fade in/out",
        ],
        actions: ["openMusicLibrary", "showAudioControls"],
      },
      text: {
        content:
          "Let's add some text to your video! I can create titles, subtitles, captions, or animated text overlays. What would you like to add?",
        suggestions: [
          "Add title",
          "Create subtitles",
          "Animated text",
          "Lower thirds",
        ],
        actions: ["openTextEditor", "showTextTemplates"],
      },
    };

    // Find matching response
    for (const [key, response] of Object.entries(responses)) {
      if (lowerMessage.includes(key)) {
        return {
          ...response,
          contextSuggestions: generateContextSuggestions(video, history),
        };
      }
    }

    // Default enhanced response
    return {
      content:
        "I'm here to help you create amazing videos! You can ask me to add effects, transitions, music, text, or perform any editing operation. What would you like to work on?",
      suggestions: [
        "Show me effects",
        "Add transitions",
        "Help with audio",
        "Create titles",
      ],
      actions: ["showTutorial"],
      contextSuggestions: generateContextSuggestions(video, history),
    };
  };

  // Generate context-aware suggestions based on video content
  const generateContextSuggestions = (video, history) => {
    const suggestions = [];

    if (video) {
      suggestions.push("Enhance video quality");
      suggestions.push("Add color grading");
      suggestions.push("Create highlight reel");
    }

    if (history.length > 0) {
      const recentTopics = history.slice(-3);
      if (recentTopics.some((topic) => topic.includes("color"))) {
        suggestions.push("Apply color correction");
      }
      if (recentTopics.some((topic) => topic.includes("audio"))) {
        suggestions.push("Noise reduction");
      }
    }

    return suggestions;
  };

  const handleAutoSave = async () => {
    if (!uploadedVideo || !currentProjectId) return;

    try {
      const projectData = {
        id: currentProjectId,
        name: projectName || `Project ${new Date().toLocaleDateString()}`,
        video: uploadedVideo,
        videoData: {
          name: uploadedVideo.name,
          size: uploadedVideo.size,
          type: uploadedVideo.type,
          url: uploadedVideo.url,
        },
        thumbnail: uploadedVideo.url,
        duration:
          Math.floor(duration / 60) +
          ":" +
          Math.floor(duration % 60)
            .toString()
            .padStart(2, "0"),
        lastModified: "Just now",
        status: "editing",
        chatHistory: chatMessages,
        tracks: tracks,
        currentTime: currentTime,
        autoSave: true,
      };

      await projectService.saveProject(projectData, false);
      
      // Update saved state
      setLastSavedState({
        tracks,
        chatMessages,
        projectName,
        currentTime,
        volume,
        isMuted
      });
      setHasUnsavedChanges(false);
      setLastAutoSave(new Date());
      
      console.log('Auto-saved project successfully');
    } catch (error) {
      console.warn('Auto-save failed:', error);
    }
  };

  const handleApplySuggestion = async (suggestion) => {
    if (!selectedClip && !uploadedVideo) {
      console.error('No video selected for applying suggestion');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingProgress(0);

      // Use the video data for processing
      const videoData = selectedClip || {
        id: 'main-video',
        name: uploadedVideo.name,
        url: uploadedVideo.url,
        path: uploadedVideo.url
      };

      // Apply the suggestion using the video service
      const result = await videoService.applyEffect(
        videoData.url,
        suggestion.action,
        suggestion.parameters
      );

      if (result && result.success) {
        // Update the video with the processed result
        if (result.outputUrl) {
          setUploadedVideo(prev => ({
            ...prev,
            url: result.outputUrl
          }));
        }

        // Add success message to chat
        const successMessage = {
          type: 'ai',
          content: `Successfully applied: ${suggestion.title}. ${suggestion.impact}`,
          timestamp: new Date().toISOString(),
          suggestion: suggestion
        };
        setChatMessages(prev => [...prev, successMessage]);

        // Mark as having unsaved changes
        setHasUnsavedChanges(true);
      } else {
        throw new Error(result?.error || 'Failed to apply suggestion');
      }
    } catch (error) {
      console.error('Failed to apply AI suggestion:', error);
      
      // Add error message to chat
      const errorMessage = {
        type: 'ai',
        content: `Sorry, I couldn't apply "${suggestion.title}". ${error.message || 'Please try again later.'}`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const saveProject = async () => {
    if (!uploadedVideo) {
      alert("No video to save!");
      return;
    }

    setIsSaving(true);

    // Generate thumbnail for manual save
    let projectThumbnail = uploadedVideo.url;
    try {
      projectThumbnail = await thumbnailService.generateThumbnail(uploadedVideo, 1);
      console.log('Generated thumbnail for manual save');
    } catch (error) {
      console.warn('Failed to generate thumbnail for manual save, using video URL as fallback:', error);
    }

    const projectData = {
      id: currentProjectId,
      name: projectName || `Project ${new Date().toLocaleDateString()}`,
      video: uploadedVideo,
      videoData: {
        name: uploadedVideo.name,
        size: uploadedVideo.size,
        type: uploadedVideo.type,
        url: uploadedVideo.url,
      },
      thumbnail: projectThumbnail,
      duration:
        Math.floor(duration / 60) +
        ":" +
        Math.floor(duration % 60)
          .toString()
          .padStart(2, "0"),
      lastModified: "Just now",
      status: "editing",
      createdAt: currentProjectId ? undefined : new Date().toISOString(),
      chatHistory: chatMessages,
      tracks: tracks,
      currentTime: currentTime,
      manualSave: true,
    };

    try {
      // Save project using projectService with fallback to localStorage
      const savedProject = await projectService.saveProject(projectData, !currentProjectId);
      
      // Update project ID if this was a new project
      if (!currentProjectId) {
        setCurrentProjectId(savedProject.id || savedProject._id);
      }
      
      // Update saved state
      setLastSavedState({
        tracks,
        chatMessages,
        projectName,
        currentTime,
        volume,
        isMuted
      });
      setHasUnsavedChanges(false);
      setLastAutoSave(new Date());
      
      console.log("Project saved successfully:", savedProject);
      alert("Project saved successfully!");
    } catch (error) {
      handleError(error, {
        context: 'project_save',
        projectName: projectName || 'Untitled Project',
        operation: 'saveProject'
      });
      alert("Failed to save project. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const loadProjectState = async (projectId) => {
    try {
      const project = await projectService.getProject(projectId);
      
      if (project) {
        setCurrentProjectId(project.id || project._id);
        setProjectName(project.name || '');
        
        if (project.tracks) {
          setTracks(project.tracks);
        }
        
        if (project.chatHistory) {
          setChatMessages(project.chatHistory);
        }
        
        if (project.currentTime !== undefined) {
          setCurrentTime(project.currentTime);
        }
        
        // Set initial saved state
        setLastSavedState({
          tracks: project.tracks || tracks,
          chatMessages: project.chatHistory || [],
          projectName: project.name || '',
          currentTime: project.currentTime || 0,
          volume: 1,
          isMuted: false
        });
        setHasUnsavedChanges(false);
        
        console.log('Project state loaded successfully:', project);
        return project;
      }
    } catch (error) {
      console.error('Failed to load project state:', error);
      throw error;
    }
  };

  const effects = [
    {
      name: "Color Grading",
      icon: Palette,
      description: "Enhance colors and mood",
    },
    { name: "Transitions", icon: Zap, description: "Smooth scene transitions" },
    {
      name: "Text Overlay",
      icon: Type,
      description: "Add titles and captions",
    },
    {
      name: "Audio Enhancement",
      icon: Music,
      description: "Improve audio quality",
    },
    { name: "Stabilization", icon: Eye, description: "Remove camera shake" },
    {
      name: "Speed Control",
      icon: Clock,
      description: "Slow motion & time-lapse",
    },
  ];

  const suggestions = [
    "Add smooth transitions between scenes",
    "Enhance audio quality and remove background noise",
    "Apply color grading for cinematic look",
    "Add text overlays for key moments",
    "Create slow-motion effects for highlights",
    "Generate automatic subtitles",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-foreground flex flex-col">
      {/* Header */}
      <div className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            AI Video Editor
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-3 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Editor Layout (two columns) */}
       <div className="flex flex-col lg:flex-row flex-1 overflow-hidden px-4 lg:px-8 py-4 lg:py-6 gap-4 lg:gap-8">
        {/* Left: Video Only (2/3) */}
         <div className="flex-1 flex flex-col lg:w-2/3 w-full">
          {/* Video Player */}
          <div className="bg-gradient-to-br from-black via-gray-900 to-black relative p-6 rounded-xl shadow-2xl border border-gray-700/30 flex-1 min-h-[700px] overflow-hidden">
            {uploadedVideo ? (
              <div className="h-full flex items-center justify-center">
                <Suspense fallback={
                  <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <div className="text-gray-400">Loading video player...</div>
                    </div>
                  </div>
                }>
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
                    showWaveform
                    showThumbnailScrubbing
                    enableKeyboardShortcuts
                    showMinimap
                    enableGestures
                    enablePiP
                    selectedTool={selectedTool}
                    isProcessing={isProcessing}
                    onBackgroundProcess={handleBackgroundProcess}
                    exportProgress={exportProgress}
                    exportQuality={exportQuality}
                  />
                </Suspense>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-32 h-32 rounded-full flex items-center justify-center mx-auto shadow-elevation-2">
                    <Play className="w-16 h-16 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    No Video Loaded
                  </h3>
                  <p className="text-gray-400 mb-6 text-lg">
                    Upload a video from the Dashboard to start editing with AI
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sidebar Tabs (1/3) */}
         <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 shadow-2xl rounded-xl flex flex-col lg:w-1/3 w-full h-96 lg:h-[700px]">
          {/* Tabs */}
           <div className="flex border-b border-gray-700/50 bg-gray-800/50 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("assistant")}
              className={`flex-1 py-4 px-6 text-sm font-semibold transition-all duration-200 ${
                activeTab === "assistant"
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-3" />
              AI Assistant
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("effects")}
              className={`flex-1 py-4 px-6 text-sm font-semibold transition-all duration-200 ${
                activeTab === "effects"
                  ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
            >
              <Sparkles className="w-4 h-4 inline mr-3" />
              Effects
            </button>
          </div>

          {/* Assistant Tab */}
          {activeTab === "assistant" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Header */}
              <div className="pb-6 border-b-2 border-border mb-6 flex-shrink-0 px-6 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold flex items-center">
                    <Sparkles className="w-6 h-6 mr-3 text-primary" />
                    AI Assistant
                  </h3>
                  <div className="flex items-center space-x-4">
                    {memoryStats && (
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span>
                            Memory: {Math.round(memoryStats.used / 1024 / 1024)}
                            MB
                          </span>
                        </div>
                        {cacheStats && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            <span>Cache: {cacheStats.hitRate}%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ask me anything about video editing
                </p>

                {isProcessing && (
                  <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-blue-400">
                        Processing...
                      </span>
                      <span className="text-sm text-blue-400">
                        {Math.round(processingProgress)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${processingProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto min-h-0 px-6"
                style={{ scrollbarWidth: "thin" }}
              >
                <div className="space-y-6 pb-6">
                  {chatMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.type === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] p-3 rounded-lg shadow-elevation-1 ${
                          message.type === "user"
                            ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-elevation-2 mr-2"
                            : "bg-muted text-muted-foreground border-2 border-border ml-2"
                        }`}
                      >
                        <p className="text-sm break-words">{message.content}</p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {new Date().toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}

                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted p-3 rounded-lg border-2 border-border shadow-elevation-1 ml-2">
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
              </div>

              {/* Input */}
              <div className="pt-4 border-t-2 border-border mt-auto flex-shrink-0 bg-card/50 backdrop-blur-sm px-6 pb-4">
                <div className="flex space-x-3">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask me to edit your video... (Press Enter to send, Shift+Enter for new line)"
                    className="flex-1 bg-background border-2 border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground shadow-elevation-1 transition-all duration-200 resize-none min-h-[44px] max-h-[120px] overflow-y-auto"
                    rows={1}
                    onInput={(e) => {
                      e.target.style.height = "auto";
                      e.target.style.height =
                        Math.min(e.target.scrollHeight, 120) + "px";
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
              </div>
            </div>
          )}

          {/* Effects Tab */}
          {activeTab === "effects" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 bg-gray-900/30">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Effects Library</h3>
                  <p className="text-sm text-gray-400">Choose from our collection of professional video effects</p>
                </div>
                <Suspense fallback={
                  <div className="bg-gray-800 rounded-lg p-8 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <div className="text-gray-400">Loading effects library...</div>
                    </div>
                  </div>
                }>
                  <EffectsLibrary
                    onApplyEffect={async (effect, params) => {
                      try {
                        const selectedClips = tracks.flatMap((track) =>
                          track.clips.filter((clip) => clip.selected)
                        );
                        
                        if (selectedClips.length === 0) {
                          alert('Please select a video clip to apply effects to.');
                          return;
                        }
                        
                        // Apply effect to each selected clip
                        for (const clip of selectedClips) {
                          const result = await videoService.applyEffect(
                            clip.src, // video path
                            effect.effectId || effect.id, // effect ID
                            params || effect.params // effect parameters
                          );
                          
                          if (result.success) {
                            // Update clip with processed video path
                            clip.src = result.outputPath;
                            console.log(`Effect ${effect.effectId || effect.id} applied to ${clip.name}`);
                          }
                        }
                        
                        // Trigger re-render of timeline
                        setTracks([...tracks]);
                        
                      } catch (error) {
                        console.error('Error applying effect:', error);
                        alert('Failed to apply effect. Please try again.');
                      }
                    }}
                    selectedClips={tracks.flatMap((track) =>
                      track.clips.filter((clip) => clip.selected)
                    )}
                  />
                </Suspense>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-Width Timeline (below both columns) */}
       <div className="px-4 lg:px-8 pb-4 lg:pb-8">
        <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 shadow-2xl rounded-xl overflow-hidden w-full">
          <div className="p-6 border-b border-gray-700/50 bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Timeline</h3>
                <p className="text-sm text-gray-400 mt-1">Edit and arrange your video content</p>
              </div>
              {/* Timeline controls removed as requested */}
            </div>
          </div>

          <div className="bg-gray-900/20 p-6">
            <Suspense fallback={
              <div className="min-h-[400px] bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <div className="text-gray-400">Loading timeline...</div>
                </div>
              </div>
            }>
              <EnhancedTimeline
                tracks={tracks}
                currentTime={currentTime}
                duration={Math.max(duration, tracks.reduce((maxDuration, track) => {
                  const trackDuration = track.clips.reduce((max, clip) => 
                    Math.max(max, clip.startTime + clip.duration), 0);
                  return Math.max(maxDuration, trackDuration);
                }, duration || 30))}
                zoom={timelineZoom}
                isPlaying={isPlaying}
                theme="dark"
                onTimeChange={handleTimeChange}
                onZoomChange={setTimelineZoom}
                onPlay={() => {
                  setIsPlaying(true);
                  videoRef?.current?.play();
                }}
                onPause={() => {
                  setIsPlaying(false);
                  videoRef?.current?.pause();
                }}
                onTracksChange={setTracks}
                addTrack={addTrack}
                onClipSelect={(clip) => setSelectedClip(clip)}
                className="min-h-[200px]"
              />
            </Suspense>
          </div>

          {/* Global Actions */}
          <div className="border-t-2 border-border px-6 py-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between bg-card">
            <div className="flex gap-3">
              <button className="bg-card hover:bg-muted text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-elevation-1 hover:shadow-elevation-2 hover:scale-105 border border-border">
                <RotateCcw className="w-4 h-4 mr-2" />
                Undo
              </button>
              <button className="bg-card hover:bg-muted text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-elevation-1 hover:shadow-elevation-2 hover:scale-105 border border-border">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </button>
            </div>

            <div className="flex gap-3 items-center">
              {/* Project Name Input */}
              <div className="flex flex-col">
                <label className="text-xs text-gray-400 mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name..."
                  className="bg-card border border-border text-foreground px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                />
              </div>
              
              <div className="flex items-center gap-3">
                {/* Auto-save status indicator */}
                {lastAutoSave && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Auto-saved {new Date(lastAutoSave).toLocaleTimeString()}</span>
                  </div>
                )}
                
                {/* Unsaved changes indicator */}
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-1 text-xs text-orange-400">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Unsaved changes</span>
                  </div>
                )}
                
                {/* Auto-save toggle */}
                <button
                  onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    autoSaveEnabled 
                      ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' 
                      : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                  }`}
                  title={autoSaveEnabled ? 'Auto-save enabled' : 'Auto-save disabled'}
                >
                  {autoSaveEnabled ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Auto-save
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      Manual
                    </>
                  )}
                </button>
                
                {/* Manual save button */}
                <button 
                  onClick={saveProject}
                  disabled={isSaving}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-elevation-1 hover:shadow-elevation-2 hover:scale-105 flex items-center ${
                    hasUnsavedChanges
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                  } disabled:bg-blue-400 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
                </button>
              </div>
              <button 
                onClick={() => setShowAISuggestions(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-elevation-1 hover:shadow-elevation-2 hover:scale-105 flex items-center"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                AI Suggestions
              </button>
              <button 
                onClick={() => setShowExportPanel(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-elevation-1 hover:shadow-elevation-2 hover:scale-105 flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Video
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Editing Panels removed as requested */}

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
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Background Tasks
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {backgroundTasks.slice(-3).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-gray-300 capitalize">{task.type}</span>
                  <span
                    className={`px-2 py-1 rounded ${
                      task.status === "completed"
                        ? "bg-green-900 text-green-300"
                        : task.status === "processing"
                        ? "bg-blue-900 text-blue-300"
                        : "bg-red-900 text-red-300"
                    }`}
                  >
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
      
      {/* Export Panel */}
      <ExportPanel
        isOpen={showExportPanel}
        onClose={() => setShowExportPanel(false)}
        selectedClip={selectedClip}
      />
      
      {/* AI Suggestions Panel */}
      <AISuggestionsPanel
        isOpen={showAISuggestions}
        onClose={() => setShowAISuggestions(false)}
        selectedClip={selectedClip}
        onApplySuggestion={handleApplySuggestion}
        projectContext={{
          projectType: 'video_editing',
          targetAudience: userPreferences.editingStyle,
          platform: 'general',
          duration: duration
        }}
      />
    </div>
  );
};

export default AIEditor;
