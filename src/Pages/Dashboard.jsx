import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Play,
  FileVideo,
  MoreHorizontal,
  Brain,
  Eye,
  AudioWaveform,
  Sparkles,
  Target,
  Lightbulb,
  CheckCircle,
  Trash2,
  Download,
  Filter,
  Search,
  Grid3X3,
  List,
  Folder,

  ChevronDown,
  ChevronUp,
  Video,
  Users,
  TrendingUp,
  Star,
  BarChart3,
  Clock,
  Zap,
  Edit3,
  Share2,
  Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OptimizedImage from '../components/ui/OptimizedImage';
import { ProjectCardSkeleton, DashboardStatsSkeleton } from '../components/ui/Skeleton';
import { ProgressiveLoader } from '../components/ui/ProgressiveLoader';
import { useErrorHandler } from '../components/ErrorBoundary';
import ShareModal from '../components/ui/ShareModal';

const NewDashboard = () => {
  const navigate = useNavigate();
  const handleError = useErrorHandler();
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [aiInsights, setAiInsights] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'name', 'duration'
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [isProjectsCollapsed, setIsProjectsCollapsed] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [projects, setProjects] = useState([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Simulate loading data
  useEffect(() => {
    // Simulate loading projects
    const loadProjects = async () => {
      try {
        setIsLoadingProjects(true);
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        setProjects(enhancedProjects);
      } catch (error) {
        handleError(error, {
          context: 'dashboard_projects_load',
          operation: 'loadProjects'
        });
      } finally {
        setIsLoadingProjects(false);
      }
    };

    // Simulate loading stats
    const loadStats = async () => {
      try {
        setIsLoadingStats(true);
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        handleError(error, {
          context: 'dashboard_stats_load',
          operation: 'loadStats'
        });
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadProjects();
    loadStats();
  }, []);

  // Handle video deletion
  const handleDeleteVideo = () => {
    setUploadedVideo(null);
    setUploadComplete(false);
    setUploadProgress(0);
    setSelectedCategory('all');
    setAiInsights([]);
  };

  const videoCategories = [
    { id: 'all', name: 'All Videos', icon: Video, color: 'bg-blue-500', description: 'All your video projects' },
    { id: 'social', name: 'Social Media', icon: Users, color: 'bg-pink-500', description: 'Instagram, TikTok, YouTube Shorts' },
    { id: 'marketing', name: 'Marketing', icon: TrendingUp, color: 'bg-green-500', description: 'Promotional and brand content' },
    { id: 'education', name: 'Education', icon: Star, color: 'bg-purple-500', description: 'Tutorials and learning content' },
    { id: 'entertainment', name: 'Entertainment', icon: Play, color: 'bg-orange-500', description: 'Creative and fun videos' },
    { id: 'business', name: 'Business', icon: BarChart3, color: 'bg-indigo-500', description: 'Corporate and professional content' }
  ];

  // Enhanced project data with more realistic information
  const enhancedProjects = [
    {
      id: 1,
      title: 'Summer Vacation Vlog',
      thumbnail: 'https://images.pexels.com/photos/1144275/pexels-photo-1144275.jpeg?auto=compress&cs=tinysrgb&w=400',
      duration: '5:32',
      status: 'Completed',
      lastEdited: '2 hours ago',
      category: 'social',
      aiScore: 92,
      views: '12.5K',
      engagement: '8.2%',
      fileSize: '245 MB',
      resolution: '1080p',
      fps: 30,
      collaborators: [
        { name: 'Sarah Chen', avatar: 'SC', role: 'Editor' },
        { name: 'Mike Johnson', avatar: 'MJ', role: 'Reviewer' }
      ],
      isShared: true,
      comments: 3
    },
    {
      id: 2,
      title: 'Product Launch Video',
      thumbnail: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
      duration: '2:15',
      status: 'In Progress',
      lastEdited: '1 day ago',
      category: 'marketing',
      aiScore: 87,
      views: '8.1K',
      engagement: '12.4%',
      fileSize: '156 MB',
      resolution: '4K',
      fps: 60,
      collaborators: [
        { name: 'Alex Rivera', avatar: 'AR', role: 'Co-editor' }
      ],
      isShared: true,
      comments: 7
    },
    {
      id: 3,
      title: 'Wedding Highlights',
      thumbnail: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=400',
      duration: '8:45',
      status: 'Draft',
      lastEdited: '3 days ago',
      category: 'entertainment',
      aiScore: 95,
      views: '25.3K',
      engagement: '15.7%',
      fileSize: '892 MB',
      resolution: '4K',
      fps: 24,
      collaborators: [],
      isShared: false,
      comments: 0
    },
    {
      id: 4,
      title: 'Tutorial: Video Editing Basics',
      thumbnail: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=400',
      duration: '12:30',
      status: 'Completed',
      lastEdited: '1 week ago',
      category: 'education',
      aiScore: 89,
      views: '45.2K',
      engagement: '18.9%',
      fileSize: '1.2 GB',
      resolution: '1080p',
      fps: 30,
      collaborators: [
        { name: 'Emma Davis', avatar: 'ED', role: 'Reviewer' },
        { name: 'Tom Wilson', avatar: 'TW', role: 'Editor' },
        { name: 'Lisa Park', avatar: 'LP', role: 'Reviewer' }
      ],
      isShared: true,
      comments: 12
    }
  ];

  // AI Insights data
  const mockAIInsights = [
    {
      id: 1,
      type: 'scene_detection',
      title: 'Scene Changes Detected',
      description: '12 distinct scenes identified',
      confidence: 94,
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10'
    },
    {
      id: 2,
      type: 'audio_analysis',
      title: 'Audio Quality',
      description: 'Good quality, minimal noise',
      confidence: 87,
      icon: AudioWaveform,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10'
    },
    {
      id: 3,
      type: 'mood_detection',
      title: 'Mood Analysis',
      description: 'Upbeat and energetic tone',
      confidence: 91,
      icon: Brain,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10'
    },
    {
      id: 4,
      type: 'optimization',
      title: 'Smart Suggestions',
      description: '3 enhancement opportunities',
      confidence: 88,
      icon: Lightbulb,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10'
    }
  ];

  // Simulate AI analysis when video is uploaded
  useEffect(() => {
    if (uploadComplete && uploadedVideo) {
      setIsAnalyzing(true);
      // Simulate AI analysis delay
      setTimeout(() => {
        setAiInsights(mockAIInsights);
        setIsAnalyzing(false);
      }, 2000);
    }
  }, [uploadComplete, uploadedVideo]);

  // Filter and sort projects
  const filteredProjects = enhancedProjects
    .filter(project => {
      const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
      const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'duration':
          return b.duration.localeCompare(a.duration);
        default: // 'recent'
          return new Date(b.lastEdited) - new Date(a.lastEdited);
      }
    });

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = [...e.dataTransfer.files];
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const videoFiles = files.filter(file => file.type.startsWith('video/'));
    if (videoFiles.length > 0) {
      const file = videoFiles[0]; // Take first video file
      setIsUploading(true);
      setUploadProgress(0);
      setUploadComplete(false);
      
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            setUploadComplete(true);
            setUploadedVideo({
              name: file.name,
              url: URL.createObjectURL(file),
              size: file.size,
              type: file.type,
              duration: '0:00' // Would be calculated from actual video
            });
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 200);
    }
  };

  const handleFileInput = (e) => {
    const files = [...e.target.files];
    handleFiles(files);
  };

  const startEditing = () => {
    if (uploadComplete && uploadedVideo) {
      // Pass video data to AI Editor via navigation state with analysis flag
      navigate('/ai-editor', { 
        state: { 
          video: uploadedVideo,
          autoAnalyze: true,
          fromDashboard: true
        } 
      });
    }
  };

  // Share functionality handlers
  const handleShareProject = (project) => {
    setSelectedProject(project);
    setShareModalOpen(true);
  };

  const handleShare = async (shareData) => {
    try {
      // TODO: Implement actual API call to backend
      console.log('Sharing project:', selectedProject.id, 'with data:', shareData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Close modal on success
      setShareModalOpen(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('Failed to share project:', error);
      throw error; // Let ShareModal handle the error display
    }
  };

  const handleCloseShareModal = () => {
    setShareModalOpen(false);
    setSelectedProject(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[1920px] mx-auto">
        {/* Enhanced Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/50 backdrop-blur-sm border-b border-border/50 p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                VFXB Studio Dashboard
              </h1>
              <p className="text-muted-foreground text-lg flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <span>AI-powered video editing at your fingertips</span>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowAIPanel(!showAIPanel)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  showAIPanel 
                    ? 'bg-purple-500/20 text-purple-600 border border-purple-500/30' 
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>AI Insights</span>
              </button>

            </div>
          </div>
        </motion.div>

        <div className="px-6">

          {/* Quick Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            {isLoadingStats ? (
              // Show skeleton stats while loading
              Array.from({ length: 4 }).map((_, index) => (
                <DashboardStatsSkeleton key={`stats-skeleton-${index}`} />
              ))
            ) : (
              [
                { label: 'Total Projects', value: '24', icon: Video, color: 'blue', trend: '+12%' },
                { label: 'Hours Saved', value: '156', icon: Clock, color: 'green', trend: '+8%' },
                { label: 'AI Enhancements', value: '89', icon: Zap, color: 'purple', trend: '+23%' },
                { label: 'Export Quality', value: '4K', icon: Star, color: 'orange', trend: '100%' }
              ].map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  className="bg-card backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">{stat.label}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        <span className="text-xs text-green-600 bg-green-500/10 px-2 py-1 rounded-full">
                          {stat.trend}
                        </span>
                      </div>
                    </div>
                    <div className={`bg-${stat.color}-500/10 p-3 rounded-lg border border-${stat.color}-500/20 group-hover:scale-110 transition-transform`}>
                      <IconComponent className={`w-6 h-6 text-${stat.color}-600`} />
                    </div>
                  </div>
                </motion.div>
              );
            })
            )}
          </motion.div>

          {/* Main Content Grid */}
          <div className={`grid grid-cols-1 gap-8 mb-8 ${
            showAIPanel ? 'xl:grid-cols-4' : 'xl:grid-cols-1'
          }`}>
            {/* Upload and Video Preview Section - Responsive width */}
            <div className={`space-y-8 ${
              showAIPanel ? 'xl:col-span-3' : 'xl:col-span-1'
            }`}>

              {/* Upload Section */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground flex items-center space-x-2">
                    <Upload className="w-6 h-6 text-purple-600" />
                    <span>Start Creating</span>
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Supported formats:</span>
                    <div className="flex items-center space-x-1">
                      {['MP4', 'MOV', 'AVI'].map(format => (
                        <span key={format} className="text-xs bg-muted px-2 py-1 rounded">{format}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Enhanced Upload Area */}
                <div
                  className={`relative border-4 border-dashed rounded-xl transition-all duration-300 shadow-elevation-1 hover:shadow-elevation-2 hover:scale-[1.01] ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-500/5' 
                      : 'border-gray-300 dark:border-gray-600 bg-muted/30 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-muted/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {!uploadedVideo && !isUploading ? (
                    <>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileInput}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="p-6 sm:p-8 md:p-12 text-center space-y-6">
                        <motion.div 
                          animate={{ 
                            scale: dragActive ? 1.1 : 1,
                            rotate: dragActive ? 5 : 0
                          }}
                          className="bg-gradient-to-r from-blue-500 to-purple-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-elevation-2"
                        >
                          <Upload className="w-10 h-10 text-white" />
                        </motion.div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-foreground">Upload Your Videos</h3>
                          <p className="text-muted-foreground mb-4 text-base sm:text-lg">
                            Drag and drop your video files here, or click to browse
                          </p>
                          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <FileVideo className="w-4 h-4" />
                              <span>MP4, MOV, AVI, WebM</span>
                            </div>
                            <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                            <div className="flex items-center space-x-1">
                              <Target className="w-4 h-4" />
                              <span>Max 500MB per file</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : isUploading ? (
                    <div className="p-6 sm:p-8 md:p-12 text-center space-y-6">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-elevation-2"
                      >
                        <Upload className="w-10 h-10 text-white" />
                      </motion.div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-foreground">Uploading Video...</h3>
                        <div className="w-full bg-muted rounded-full h-4 mb-4 shadow-inner overflow-hidden">
                          <motion.div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 rounded-full shadow-elevation-1"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <div className="flex items-center justify-center space-x-4">
                          <p className="text-muted-foreground text-base sm:text-lg">{Math.round(uploadProgress)}% complete</p>
                          <div className="flex space-x-1">
                            {[0, 1, 2].map(i => (
                              <motion.div
                                key={i}
                                className="w-2 h-2 bg-purple-500 rounded-full"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                   ) : (
                     <motion.div 
                       initial={{ opacity: 0, scale: 0.9 }}
                       animate={{ opacity: 1, scale: 1 }}
                       className="p-4 sm:p-6"
                     >
                       <div className="bg-card rounded-lg overflow-hidden mb-6 shadow-elevation-2">
                         <div className="relative w-full" style={{ paddingBottom: '56.25%' }}> {/* 16:9 aspect ratio */}
                           <video 
                             src={uploadedVideo.url} 
                             className="absolute inset-0 w-full h-full object-contain bg-black rounded-lg"
                             controls={true}
                             muted={false}
                             preload="metadata"
                           />
                         </div>
                       </div>
                       <div className="text-center space-y-3">
                         <div className="flex items-center justify-center space-x-2">
                           <CheckCircle className="w-6 h-6 text-green-600" />
                           <h3 className="text-xl font-semibold text-green-600">Upload Complete</h3>
                         </div>
                         <p className="text-foreground font-medium">{uploadedVideo.name}</p>
                         <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-muted-foreground">
                           <span>{(uploadedVideo.size / (1024 * 1024)).toFixed(1)} MB</span>
                           <div className="hidden sm:block w-1 h-1 bg-muted-foreground rounded-full"></div>
                           <span>{uploadedVideo.type}</span>
                         </div>
                         
                         {/* Delete Video Button */}
                         <motion.button
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: 0.2 }}
                           onClick={handleDeleteVideo}
                           className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-md"
                         >
                           <Trash2 className="w-4 h-4" />
                           <span className="text-sm font-medium">Delete Video</span>
                         </motion.button>
                       </div>
                     </motion.div>
                   )}
                 </div>

                 {/* Video Categories */}
                 <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.3 }}
                   className="space-y-6"
                 >
                   <h3 className="text-xl font-semibold text-foreground flex items-center space-x-2">
                     <Folder className="w-5 h-5 text-purple-600" />
                     <span>Choose Video Category</span>
                   </h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                     {videoCategories.map((category, index) => {
                       const IconComponent = category.icon;
                       return (
                         <motion.button
                           key={category.id}
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: 0.3 + index * 0.1 }}
                           onClick={() => setSelectedCategory(category.id)}
                           className={`group p-4 rounded-xl border-2 transition-all duration-200 shadow-elevation-1 hover:shadow-elevation-2 hover:scale-[1.02] hover:-translate-y-1 ${
                             selectedCategory === category.id
                               ? 'border-purple-500 bg-purple-500/10 shadow-elevation-2'
                               : 'border-gray-300 dark:border-gray-600 bg-card/50 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-card/70'
                           }`}
                         >
                           <div className="text-center space-y-3">
                             <div className={`${category.color} p-3 rounded-lg mx-auto w-fit shadow-elevation-1 group-hover:scale-110 transition-transform`}>
                               <IconComponent className="w-6 h-6 text-white" />
                             </div>
                             <div>
                               <h4 className="font-semibold text-foreground group-hover:text-purple-600 transition-colors">
                                 {category.name}
                               </h4>
                               <p className="text-xs text-muted-foreground mt-1">
                                 {category.description}
                               </p>
                             </div>
                             {selectedCategory === category.id && (
                               <motion.div
                                 initial={{ scale: 0 }}
                                 animate={{ scale: 1 }}
                                 className="flex justify-center"
                               >
                                 <CheckCircle className="w-5 h-5 text-purple-600" />
                               </motion.div>
                             )}
                           </div>
                         </motion.button>
                       );
                     })}
                   </div>
                   
                   <motion.button
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.5 }}
                     onClick={startEditing}
                     disabled={!uploadComplete || !uploadedVideo}
                     className={`w-full font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-elevation-1 hover:shadow-elevation-2 hover:scale-[1.02] hover:-translate-y-1 ${
                       uploadComplete && uploadedVideo
                         ? 'bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 text-white cursor-pointer'
                         : 'bg-muted text-muted-foreground cursor-not-allowed'
                     }`}
                   >
                     <Play className="w-5 h-5" />
                     <span>{uploadComplete && uploadedVideo ? 'Start AI Editing' : 'Upload Video First'}</span>
                     <Sparkles className="w-5 h-5" />
                   </motion.button>
                 </motion.div>
               </motion.div>
             </div>

             {/* AI Insights Panel - 1/4 width */}
             <AnimatePresence>
               {showAIPanel && (
                 <motion.div
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: 20 }}
                   className="xl:col-span-1 space-y-6"
                 >
                   <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-elevation-2">
                     <div className="flex items-center justify-between mb-6">
                       <h3 className="text-xl font-semibold text-foreground flex items-center space-x-2">
                         <Brain className="w-5 h-5 text-purple-600" />
                         <span>AI Insights</span>
                       </h3>
                       <button 
                         onClick={() => setShowAIPanel(false)}
                         className="text-muted-foreground hover:text-foreground transition-colors p-1"
                       >
                         <MoreHorizontal className="w-4 h-4" />
                       </button>
                     </div>

                     {isAnalyzing ? (
                       <div className="space-y-4">
                         <div className="text-center py-8">
                           <motion.div
                             animate={{ rotate: 360 }}
                             transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                             className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full mx-auto mb-4"
                           />
                           <p className="text-muted-foreground">Analyzing your video...</p>
                         </div>
                       </div>
                     ) : aiInsights.length > 0 ? (
                       <div className="space-y-4">
                         {aiInsights.map((insight, index) => {
                           const IconComponent = insight.icon;
                           return (
                             <motion.div
                               key={insight.id}
                               initial={{ opacity: 0, y: 20 }}
                               animate={{ opacity: 1, y: 0 }}
                               transition={{ delay: index * 0.1 }}
                               className={`${insight.bgColor} border border-opacity-20 rounded-lg p-4 hover:shadow-elevation-1 transition-all duration-200`}
                             >
                               <div className="flex items-start space-x-3">
                                 <div className={`${insight.bgColor} p-2 rounded-lg`}>
                                   <IconComponent className={`w-4 h-4 ${insight.color}`} />
                                 </div>
                                 <div className="flex-1">
                                   <h4 className="font-medium text-foreground text-sm">{insight.title}</h4>
                                   <p className="text-muted-foreground text-xs mt-1">{insight.description}</p>
                                   <div className="flex items-center justify-between mt-2">
                                     <div className="flex items-center space-x-1">
                                       <div className="w-full bg-muted rounded-full h-1.5 max-w-[60px]">
                                         <div 
                                           className={`h-1.5 rounded-full bg-gradient-to-r ${insight.color.replace('text-', 'from-')} to-purple-500`}
                                           style={{ width: `${insight.confidence}%` }}
                                         />
                                       </div>
                                       <span className="text-xs text-muted-foreground">{insight.confidence}%</span>
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             </motion.div>
                           );
                         })}
                       </div>
                     ) : (
                       <div className="text-center py-8">
                         <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                         <p className="text-muted-foreground">Upload a video to see AI insights</p>
                       </div>
                     )}
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
           </div>
         </div>

        {/* Recent Projects */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-elevation-2"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-3">
              <div>
                <h2 className="text-2xl font-bold text-foreground flex items-center space-x-2">
                  <Folder className="w-6 h-6 text-blue-600" />
                  <span>Recent Projects</span>
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {filteredProjects.length} projects • {filteredProjects.filter(p => p.status === 'Completed').length} completed
                </p>
              </div>
              <button
                onClick={() => setIsProjectsCollapsed(!isProjectsCollapsed)}
                className="p-2 hover:bg-muted rounded-lg transition-colors flex items-center justify-center"
                title={isProjectsCollapsed ? 'Expand projects' : 'Collapse projects'}
              >
                {isProjectsCollapsed ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm transition-all ${
                    viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span>Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm transition-all ${
                    viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span>List</span>
                </button>
              </div>
              
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all [&>option]:bg-background [&>option]:text-foreground"
              >
                <option value="recent" className="bg-background text-foreground">Last Edited</option>
                <option value="name" className="bg-background text-foreground">Title</option>
                <option value="duration" className="bg-background text-foreground">Duration</option>
              </select>
            </div>
          </div>

          {/* Projects Grid/List */}
          <AnimatePresence>
            {!isProjectsCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  {viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {isLoadingProjects ? (
                  // Show skeleton cards while loading
                  Array.from({ length: 8 }).map((_, index) => (
                    <ProjectCardSkeleton key={`skeleton-${index}`} />
                  ))
                ) : (
                  filteredProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card/50 border border-border/30 rounded-xl overflow-hidden hover:shadow-elevation-3 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-2 group cursor-pointer"
                    whileHover={{ 
                      boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                      y: -8
                    }}
                  >
                    <div className="relative overflow-hidden">
                      <OptimizedImage
                        src={project.thumbnail}
                        alt={project.title}
                        className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-500"
                        lazy={true}
                        quality={85}
                      />
                      
                      {/* Quick Action Buttons Overlay */}
                      <motion.div 
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                      >
                        <div className="flex items-center space-x-3">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 hover:shadow-xl"
                            title="Edit Project"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/ai-editor', { state: { project } });
                            }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all duration-200 hover:shadow-xl"
                            title="Share Project"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareProject(project);
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg transition-all duration-200 hover:shadow-xl"
                            title="Duplicate Project"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Duplicate project:', project.id);
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all duration-200 hover:shadow-xl"
                            title="Delete Project"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this project?')) {
                                console.log('Delete project:', project.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </motion.div>
                      
                      <div className="absolute top-3 right-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                          project.status === 'Completed' ? 'bg-green-500/20 text-green-600 border border-green-500/30' :
                          project.status === 'In Progress' ? 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/30' :
                          'bg-blue-500/20 text-blue-600 border border-blue-500/30'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3">
                        <span className="bg-black/70 text-white px-2 py-1 rounded-md text-xs backdrop-blur-sm">
                          {project.duration}
                        </span>
                      </div>
                      <div className="absolute top-3 left-3">
                        <div className="flex items-center space-x-1">
                          <div className="bg-purple-500/20 text-purple-600 p-1 rounded-md backdrop-blur-sm border border-purple-500/30">
                            <Sparkles className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {project.title}
                      </h3>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Last edited</span>
                          <span>{project.lastEdited}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Size</span>
                          <span>{project.fileSize}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Quality</span>
                          <span className="text-green-600 font-medium">{project.resolution}</span>
                        </div>
                      </div>
                      
                      {/* Owner Information */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Owner</span>
                          <span className="font-medium">{project.owner || 'You'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <button className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all text-sm shadow-elevation-1 hover:shadow-elevation-2">
                          <Play className="w-4 h-4" />
                          <span>Continue</span>
                        </button>
                        <div className="flex items-center space-x-1">
                          <button 
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted" 
                            title="Share Project"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareProject(project);
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
                            <Download className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {isLoadingProjects ? (
                  // Show skeleton cards while loading
                  Array.from({ length: 6 }).map((_, index) => (
                    <ProjectCardSkeleton key={`list-skeleton-${index}`} variant="list" />
                  ))
                ) : (
                  filteredProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card/50 border border-border/30 rounded-xl p-4 hover:shadow-elevation-1 transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative flex-shrink-0">
                        <img
                          src={project.thumbnail}
                          alt={project.title}
                          className="w-16 h-16 object-cover rounded-lg group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute -top-1 -right-1">
                          <span className={`w-3 h-3 rounded-full ${
                            project.status === 'Completed' ? 'bg-green-500' :
                            project.status === 'In Progress' ? 'bg-yellow-500' :
                            'bg-blue-500'
                          }`} />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-foreground group-hover:text-blue-600 transition-colors truncate">
                            {project.title}
                          </h3>
                          <div className="flex items-center space-x-2 ml-4">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                          <span>{project.duration}</span>
                          <span>•</span>
                          <span>{project.fileSize}</span>
                          <span>•</span>
                          <span>{project.lastEdited}</span>
                          <span>•</span>
                          <span className="text-green-600 font-medium">{project.resolution}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all text-sm">
                          <Play className="w-4 h-4" />
                          <span>Continue</span>
                        </button>
                        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
                )}
              </motion.div>
            )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
          
          {filteredProjects.length === 0 && !isProjectsCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Folder className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No projects found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? `No projects match "${searchQuery}"` : 'Start by uploading your first video'}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
      
      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={handleCloseShareModal}
        project={selectedProject}
        onShare={handleShare}
      />
    </div>
  );
};

export default NewDashboard;