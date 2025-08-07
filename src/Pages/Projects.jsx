import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Play,
  Clock,
  Calendar,
  MoreVertical,
  Star,
  Download,
  Share2,
  Edit3,
  Copy,
  Trash2,
  FolderOpen,
  Video,
  SortAsc,
  SortDesc,
  Image,
  Music,
  FileText,
  Archive,
  Eye,
  MoreHorizontal,
  HardDrive
} from 'lucide-react';
import { Button, Card } from '../components/ui';
import { useNavigate } from 'react-router-dom';

const Projects = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'recent', 'favorites', 'completed'
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [projectMenuOpen, setProjectMenuOpen] = useState(null);
  const [projects, setProjects] = useState([]);

  // Load projects from localStorage
  useEffect(() => {
    const savedProjects = JSON.parse(localStorage.getItem('vfxb_projects') || '[]');
    
    // Add some mock projects if no saved projects exist
    if (savedProjects.length === 0) {
      const mockProjects = [
        {
           id: 1,
           title: 'Summer Vacation Highlights',
           thumbnail: null,
           duration: '2:45',
           createdAt: '2024-01-15',
           lastEdited: '2 hours ago',
           status: 'Completed',
           favorite: true,
           size: '2.4 GB',
           type: 'video',
           views: 1250,
           rating: 4.8,
           description: 'Family vacation memories from our trip to the mountains'
         },
         {
           id: 2,
           title: 'Product Demo Video',
           thumbnail: null,
           duration: '1:30',
           createdAt: '2024-01-14',
           lastEdited: '1 day ago',
           status: 'In Progress',
           favorite: false,
           size: '1.8 GB',
           type: 'video',
           views: 890,
           rating: 4.6,
           description: 'Professional product demonstration for marketing'
         },
         {
            id: 3,
            title: 'Wedding Ceremony',
            thumbnail: null,
            duration: '5:20',
            createdAt: '2024-01-12',
            lastEdited: '3 days ago',
            status: 'Draft',
            favorite: true,
            size: '5.2 GB',
            type: 'video',
            views: 2100,
            rating: 4.9,
            description: 'Beautiful wedding ceremony highlights'
          },
          {
            id: 4,
            title: 'Travel Adventure Vlog',
            thumbnail: null,
            duration: '4:15',
            createdAt: '2024-01-10',
            lastEdited: '5 days ago',
            status: 'Completed',
            favorite: false,
            size: '3.8 GB',
            type: 'video',
            views: 1680,
            rating: 4.7,
            description: 'Epic travel adventure through scenic landscapes'
          },
          {
            id: 5,
            title: 'Corporate Training Module',
            thumbnail: null,
            duration: '6:30',
            createdAt: '2024-01-08',
            lastEdited: '1 week ago',
            status: 'In Progress',
            favorite: true,
            size: '4.2 GB',
            type: 'video',
            views: 945,
            rating: 4.5,
            description: 'Professional training content for employee onboarding'
          }
      ];
      setProjects(mockProjects);
    } else {
      setProjects(savedProjects);
    }
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'In Progress':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Draft':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusText = (status) => {
    return status;
  };

  const handleProjectAction = (action, projectId) => {
    console.log(`${action} project ${projectId}`);
    setProjectMenuOpen(null);
    
    switch (action) {
      case 'open': {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          navigate('/ai-editor', { 
            state: { 
              uploadedVideo: project.video || {
                name: project.title,
                url: project.thumbnail,
                size: 0,
                type: 'video/mp4'
              },
              projectData: project
            } 
          });
        }
        break;
      }
      case 'rename':
        // Implement rename functionality
        break;
      case 'duplicate':
        // Implement duplicate functionality
        break;
      case 'favorite':
        // Implement favorite toggle
        break;
      case 'delete':
        // Implement delete functionality
        break;
      default:
        break;
    }
  };

  const handleCreateProject = () => {
    navigate('/');
  };

  const filteredProjects = projects.filter(project => {
    if (!project || !project.title || !project.description) return false;
    
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterBy === 'all' || 
      (filterBy === 'favorites' && project.favorite) ||
      (filterBy === 'recent' && new Date(project.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
      (filterBy === 'completed' && project.status === 'Completed');
    
    return matchesSearch && matchesFilter;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.lastEdited) - new Date(a.lastEdited);
      case 'oldest':
        return new Date(a.lastEdited) - new Date(b.lastEdited);
      case 'name':
        return a.title.localeCompare(b.title);
      case 'size':
        return parseFloat(b.size) - parseFloat(a.size);
      default:
        return 0;
    }
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video': return Video;
      case 'music': return Music;
      case 'educational': return FileText;
      default: return Video;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
                My Projects
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage and organize your video projects
              </p>
            </div>
            <Button 
              onClick={handleCreateProject} 
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-lg shadow-elevation-2 hover:shadow-elevation-3 hover:scale-105 transition-all duration-200 border border-blue-500"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none"
              />
            </div>
            
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg bg-card text-muted-foreground focus:outline-none"
            >
              <option value="all" className="text-black">All Projects</option>
              <option value="recent" className="text-black">Recent</option>
              <option value="favorites" className="text-black">Favorites</option>
              <option value="completed" className="text-black">Completed</option>
            </select>

            <div className="flex items-center gap-2 border border-border rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>{filteredProjects.length} projects</span>
            <span>•</span>
            <span>{projects.filter(p => p.status === 'Completed').length} completed</span>
            <span>•</span>
            <span>{projects.filter(p => p.status === 'In Progress').length} in progress</span>
          </div>
        </div>
      </div>

      {/* Projects Grid/List */}
      <div className="p-6">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-card rounded-full flex items-center justify-center">
              <FolderOpen className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm || filterBy !== 'all' ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterBy !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first video project to get started'
              }
            </p>
            {(!searchTerm && filterBy === 'all') && (
              <Button 
                onClick={handleCreateProject}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-lg shadow-elevation-2 hover:shadow-elevation-3 hover:scale-105 transition-all duration-200 border border-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {sortedProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative"
              >
                {viewMode === 'grid' ? (
                  <Card className="bg-card backdrop-blur-sm border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-primary/10"
                       onClick={() => navigate(`/dashboard?project=${project.id}`)}>
                    {/* Thumbnail */}
                    <div className="relative overflow-hidden">
                      <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/20 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                        <Video className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                          <Play className="w-8 h-8 text-white fill-current" />
                        </div>
                      </div>
                      
                      {/* Top badges */}
                      <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                        </div>
                        <span className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-white text-xs font-medium">
                          {project.duration}
                        </span>
                      </div>
                      
                      {/* Bottom stats */}
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                        <div className="flex items-center space-x-3 text-sm text-white">
                           <div className="flex items-center space-x-1">
                             <Eye className="w-4 h-4" />
                             <span>{project.views}</span>
                           </div>
                           <div className="flex items-center space-x-1">
                             <Star className="w-4 h-4 text-yellow-400 fill-current" />
                             <span>{project.rating}</span>
                           </div>
                         </div>
                        <span className="text-xs bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-white">
                          {project.size}
                        </span>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-bold text-lg text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{project.description}</p>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{project.lastEdited}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <motion.button
                           onClick={(e) => {
                             e.stopPropagation();
                             navigate('/ai-editor', { 
                               state: { 
                                 uploadedVideo: project.video || {
                                   name: project.title,
                                   url: project.thumbnail,
                                   size: 0,
                                   type: 'video/mp4'
                                 },
                                 projectData: project
                               } 
                             });
                           }}
                           className="flex-1 bg-gradient-to-r from-primary to-primary hover:from-primary/90 hover:to-primary/90 text-primary-foreground py-2 px-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.98 }}
                         >
                           <Edit3 className="w-4 h-4" />
                           <span>Edit</span>
                         </motion.button>
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectMenuOpen(projectMenuOpen === project.id ? null : project.id);
                          }}
                          className="bg-muted hover:bg-muted/80 text-foreground p-2 rounded-lg transition-all duration-200"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                    
                    {/* Project Menu */}
                    {projectMenuOpen === project.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-4 top-16 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 min-w-[140px]"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProjectAction('open', project.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Open
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProjectAction('rename', project.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" />
                          Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProjectAction('duplicate', project.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          Duplicate
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProjectAction('favorite', project.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                        >
                          <Star className="w-4 h-4" />
                          {project.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                        </button>
                        <hr className="border-border my-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProjectAction('delete', project.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-destructive/10 text-destructive flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </motion.div>
                    )}
                  </Card>
                ) : (
                  // Redesigned Compact List View
                  <Card className="bg-card backdrop-blur-sm border border-border rounded-lg overflow-hidden hover:border-primary/60 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer group"
                        onClick={() => navigate('/ai-editor', { 
                          state: { 
                            uploadedVideo: project.video || {
                              name: project.title,
                              url: project.thumbnail,
                              size: 0,
                              type: 'video/mp4'
                            },
                            projectData: project
                          } 
                        })}>
                    <div className="flex items-center gap-4 p-4">
                      {/* Compact Thumbnail */}
                      <div className="relative w-20 h-14 bg-gradient-to-br from-primary/20 to-primary/20 rounded-md overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-white/30 backdrop-blur-sm rounded-full p-1.5">
                            <Play className="w-3 h-3 text-white fill-current" />
                          </div>
                        </div>
                        
                        {/* Duration Badge */}
                        <div className="absolute bottom-1 right-1">
                          <span className="bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-white text-xs font-medium">
                            {project.duration}
                          </span>
                        </div>
                      </div>
                      
                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                            {project.title}
                          </h3>
                          {project.favorite && (
                            <Star className="w-4 h-4 text-yellow-400 fill-current flex-shrink-0" />
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(project.status)} flex-shrink-0`}>
                            {getStatusText(project.status)}
                          </span>
                        </div>
                        
                        <p className="text-muted-foreground text-sm mb-2 line-clamp-1">
                          {project.description}
                        </p>
                        
                        {/* Compact Stats Row */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{project.lastEdited}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{project.views}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span>{project.rating}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            <span>{project.size}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Compact Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/ai-editor', { 
                              state: { 
                                uploadedVideo: project.video || {
                                  name: project.title,
                                  url: project.thumbnail,
                                  size: 0,
                                  type: 'video/mp4'
                                },
                                projectData: project
                              } 
                            });
                          }}
                          className="bg-gradient-to-r from-primary to-primary hover:from-primary/90 hover:to-primary/90 text-primary-foreground py-1.5 px-3 rounded-md font-medium transition-all duration-200 flex items-center gap-1.5 text-sm"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </motion.button>
                        
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle download
                          }}
                          className="bg-muted/80 hover:bg-muted text-foreground p-1.5 rounded-md transition-all duration-200"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </motion.button>
                        
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle share
                          }}
                          className="bg-muted/80 hover:bg-muted text-foreground p-1.5 rounded-md transition-all duration-200"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </motion.button>
                        
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectMenuOpen(projectMenuOpen === project.id ? null : project.id);
                          }}
                          className="bg-muted/80 hover:bg-muted text-foreground p-1.5 rounded-md transition-all duration-200 relative"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title="More options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>
                    
                    {/* Project Menu for List View */}
                    {projectMenuOpen === project.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-6 top-20 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 min-w-[140px]"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProjectAction('open', project.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Open
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProjectAction('rename', project.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" />
                          Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProjectAction('duplicate', project.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          Duplicate
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProjectAction('favorite', project.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                        >
                          <Star className="w-4 h-4" />
                          {project.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                        </button>
                        <hr className="border-border my-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProjectAction('delete', project.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-destructive/10 text-destructive flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </motion.div>
                    )}
                  </Card>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;