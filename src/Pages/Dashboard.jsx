import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  Video,
  Play,
  Clock,
  TrendingUp,
  Users,
  Star,
  ArrowRight,
  Plus,
  FileVideo,
  Image,
  Music,
  Zap,
  Edit,
  MoreHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NewDashboard = () => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const videoCategories = [
    { id: 'all', name: 'All Videos', icon: Video, color: 'bg-blue-500' },
    { id: 'social', name: 'Social Media', icon: Users, color: 'bg-pink-500' },
    { id: 'marketing', name: 'Marketing', icon: TrendingUp, color: 'bg-green-500' },
    { id: 'education', name: 'Education', icon: Star, color: 'bg-purple-500' },
    { id: 'entertainment', name: 'Entertainment', icon: Play, color: 'bg-orange-500' }
  ];

  const recentProjects = [
    {
      id: 1,
      name: 'Summer Vacation Video',
      thumbnail: '/api/placeholder/300/200',
      duration: '2:45',
      lastModified: '2 hours ago',
      status: 'editing'
    },
    {
      id: 2,
      name: 'Product Demo',
      thumbnail: '/api/placeholder/300/200',
      duration: '1:30',
      lastModified: '1 day ago',
      status: 'completed'
    },
    {
      id: 3,
      name: 'Wedding Highlights',
      thumbnail: '/api/placeholder/300/200',
      duration: '5:20',
      lastModified: '3 days ago',
      status: 'processing'
    }
  ];

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
      // Pass video data to AI Editor via navigation state
      navigate('/ai-editor', { state: { video: uploadedVideo } });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Welcome to VFXB Studio
          </h1>
          <p className="text-muted-foreground text-lg">
            Create stunning videos with AI-powered editing tools
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div 
            className="bg-card backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Projects</p>
                <p className="text-2xl font-bold text-foreground">24</p>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div 
            className="bg-card backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Hours Saved</p>
                <p className="text-2xl font-bold text-foreground">156</p>
              </div>
              <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div 
            className="bg-card backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">AI Enhancements</p>
                <p className="text-2xl font-bold text-foreground">89</p>
              </div>
              <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div 
            className="bg-card backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Export Quality</p>
                <p className="text-2xl font-bold text-foreground">4K</p>
              </div>
              <div className="bg-orange-500/10 p-3 rounded-lg border border-orange-500/20">
                <Star className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Start Creating</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Area - 2/3 width */}
            <div
              className={`lg:col-span-2 relative border-4 border-dashed rounded-xl transition-all duration-300 shadow-elevation-1 hover:shadow-elevation-2 hover:scale-[1.01] ${
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
                  <div className="p-8 text-center space-y-4">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-elevation-2">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-foreground">Upload Your Videos</h3>
                      <p className="text-muted-foreground mb-4">
                        Drag and drop your video files here, or click to browse
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Supports MP4, MOV, AVI, WebM • Max 500MB per file
                      </p>
                    </div>
                  </div>
                </>
              ) : isUploading ? (
                <div className="p-8 text-center space-y-4">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto animate-pulse shadow-elevation-2">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Uploading Video...</h3>
                    <div className="w-full bg-muted rounded-full h-3 mb-4 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300 shadow-elevation-1"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-muted-foreground">{Math.round(uploadProgress)}% complete</p>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="bg-card rounded-lg overflow-hidden mb-4 shadow-elevation-2">
                    <video 
                      src={uploadedVideo.url} 
                      className="w-full h-80 object-cover"
                      controls={true}
                      muted={false}
                      preload="metadata"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-green-600">✓ Upload Complete</h3>
                    <p className="text-muted-foreground text-sm">{uploadedVideo.name}</p>
                    <p className="text-muted-foreground text-xs">{(uploadedVideo.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Video Categories - 1/3 width */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-xl font-semibold mb-4 text-foreground">Choose Video Category</h3>
              <div className="grid grid-cols-1 gap-3">
                {videoCategories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center p-4 rounded-lg border-2 transition-all duration-200 shadow-elevation-1 hover:shadow-elevation-2 hover:scale-[1.02] hover:-translate-y-0.5 ${
                        selectedCategory === category.id
                          ? 'border-blue-500 bg-blue-500/10 shadow-elevation-2'
                          : 'border-gray-300 dark:border-gray-600 bg-card/50 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-card/70'
                      }`}
                    >
                      <div className={`${category.color} p-2 rounded-lg mr-3 shadow-elevation-1`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-medium text-foreground">{category.name}</span>
                      {selectedCategory === category.id && (
                        <ArrowRight className="w-5 h-5 ml-auto text-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={startEditing}
                disabled={!uploadComplete || !uploadedVideo}
                className={`w-full font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-elevation-1 hover:shadow-elevation-2 hover:scale-[1.02] hover:-translate-y-0.5 ${
                  uploadComplete && uploadedVideo
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white cursor-pointer'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                <Play className="w-5 h-5" />
                <span>{uploadComplete && uploadedVideo ? 'Start Editing' : 'Upload Video First'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Projects */}
        <div
          className="bg-card backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-elevation-2"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center space-x-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <span>Recent Projects</span>
            </h2>
            <button 
              onClick={() => navigate('/projects')}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium transition-colors"
            >
              View All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { id: 1, title: 'Summer Vacation Vlog', thumbnail: 'https://images.pexels.com/photos/1144275/pexels-photo-1144275.jpeg?auto=compress&cs=tinysrgb&w=400', duration: '5:32', status: 'Completed', lastEdited: '2 hours ago' },
              { id: 2, title: 'Product Launch Video', thumbnail: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400', duration: '2:15', status: 'In Progress', lastEdited: '1 day ago' },
              { id: 3, title: 'Wedding Highlights', thumbnail: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=400', duration: '8:45', status: 'Draft', lastEdited: '3 days ago' }
            ].map((project) => (
              <div
                key={project.id}
                className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all duration-300 cursor-pointer group shadow-elevation-2 hover:shadow-elevation-3 hover:scale-[1.02] hover:-translate-y-1"
              >
                {/* Video Thumbnail */}
                <div className="relative overflow-hidden">
                  <img
                    src={project.thumbnail}
                    alt={project.title}
                    className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 shadow-elevation-2">
                      <Play className="w-6 h-6 text-white fill-current" />
                    </div>
                  </div>
                  
                  {/* Duration Badge */}
                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-white text-xs font-medium shadow-elevation-1">
                    {project.duration}
                  </div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium shadow-elevation-1 ${
                      project.status === 'Completed' ? 'bg-success-light text-success-light border border-green-500/30' :
                      project.status === 'In Progress' ? 'bg-info-light text-info-light border border-blue-500/30' :
                      'bg-warning-light text-warning-light border border-yellow-500/30'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </div>
                
                {/* Project Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-2 line-clamp-1 group-hover:text-purple-600 transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Last edited {project.lastEdited}</span>
                  </p>
                  
                  {/* Action Buttons */}
                   <div className="flex items-center justify-between">
                     <button className="text-purple-600 hover:text-purple-700 text-sm font-medium transition-colors flex items-center space-x-1">
                       <Edit className="w-3 h-3" />
                       <span>Continue Editing</span>
                     </button>
                     <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
                       <MoreHorizontal className="w-4 h-4" />
                     </button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewDashboard;