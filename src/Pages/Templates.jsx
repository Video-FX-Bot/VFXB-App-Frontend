import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Play,
  Download,
  Star,
  Clock,
  Eye,
  Heart,
  Zap,
  Sparkles,
  Video,
  Music,
  Image,
  Type,
  Palette,
  Users,
  TrendingUp,
  Award,
  Crown,
  Flame,
  Grid3X3,
  List,
  ArrowRight,
  Bookmark,
  Share2
} from 'lucide-react';
import OptimizedImage from '../components/ui/OptimizedImage';
import { ProjectCardSkeleton } from '../components/ui/Skeleton';
import { useErrorHandler } from '../components/ErrorBoundary';
import templateService from '../services/templateService';

const Templates = () => {
  const handleError = useErrorHandler();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFilter, setSelectedFilter] = useState('popular');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [favoriteTemplates, setFavoriteTemplates] = useState(new Set());
  const [showFeatured, setShowFeatured] = useState(true);
  const [hoveredTemplate, setHoveredTemplate] = useState(null);

  // Simulate loading templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        // Simulate API call delay (reduced for better performance)
      await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        handleError(error, {
          context: 'templates_load',
          operation: 'loadTemplates'
        });
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, [handleError]);

  const categories = [
    { id: 'all', name: 'All Templates', icon: Video, count: 156 },
    { id: 'social', name: 'Social Media', icon: Users, count: 45 },
    { id: 'marketing', name: 'Marketing', icon: TrendingUp, count: 32 },
    { id: 'intro', name: 'Intros & Outros', icon: Sparkles, count: 28 },
    { id: 'music', name: 'Music Videos', icon: Music, count: 24 },
    { id: 'corporate', name: 'Corporate', icon: Award, count: 18 },
    { id: 'education', name: 'Educational', icon: Type, count: 15 }
  ];

  const filters = [
    { id: 'popular', name: 'Most Popular' },
    { id: 'recent', name: 'Recently Added' },
    { id: 'trending', name: 'Trending' },
    { id: 'free', name: 'Free Templates' },
    { id: 'premium', name: 'Premium' }
  ];

  // Featured templates for hero section
  const featuredTemplates = [
    {
      id: 'featured-1',
      title: 'AI-Powered Video Creator',
      subtitle: 'Transform your ideas into stunning videos',
      description: 'Create professional videos with AI assistance, smart editing tools, and automated effects.',
      thumbnail: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&fit=crop',
      category: 'ai-powered',
      isPremium: true,
      isTrending: true,
      features: ['AI Editing', 'Auto Captions', 'Smart Transitions'],
      gradient: 'from-purple-600 via-pink-600 to-blue-600'
    },
    {
      id: 'featured-2',
      title: 'Social Media Mastery Pack',
      subtitle: 'Complete toolkit for social content',
      description: 'Everything you need to create engaging content for Instagram, TikTok, YouTube, and more.',
      thumbnail: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&fit=crop',
      category: 'social',
      isPremium: false,
      isTrending: true,
      features: ['Multi-Platform', 'Trending Effects', 'Quick Export'],
      gradient: 'from-green-500 via-teal-500 to-blue-500'
    }
  ];

  const templates = [
    {
      id: 1,
      title: 'Modern Social Media Intro',
      category: 'social',
      thumbnail: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      duration: '0:15',
      views: '12.5K',
      likes: 892,
      rating: 4.8,
      isPremium: false,
      isTrending: true,
      difficulty: 'Beginner',
      tags: ['intro', 'social', 'modern'],
      description: 'Eye-catching intro perfect for social media content',
      features: ['Animated Text', 'Music Sync', 'Color Customization'],
      author: 'VFXB Studio',
      downloads: '2.1K'
    },
    {
      id: 2,
      title: 'Corporate Presentation Template',
      category: 'corporate',
      thumbnail: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      duration: '1:30',
      views: '8.2K',
      likes: 654,
      rating: 4.9,
      isPremium: true,
      isTrending: false,
      difficulty: 'Intermediate',
      tags: ['corporate', 'presentation', 'professional'],
      description: 'Professional template for business presentations',
      features: ['Data Visualization', 'Clean Design', 'Multiple Layouts'],
      author: 'Pro Templates',
      downloads: '1.8K'
    },
    {
      id: 3,
      title: 'Music Video Visualizer',
      category: 'music',
      thumbnail: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      duration: '3:45',
      views: '15.7K',
      likes: 1203,
      rating: 4.7,
      isPremium: false,
      tags: ['music', 'visualizer', 'audio'],
      description: 'Dynamic audio visualizer for music content'
    },
    {
      id: 4,
      title: 'Product Launch Promo',
      category: 'marketing',
      thumbnail: 'https://images.pexels.com/photos/1144275/pexels-photo-1144275.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      duration: '0:45',
      views: '9.8K',
      likes: 743,
      rating: 4.6,
      isPremium: true,
      tags: ['marketing', 'product', 'promo'],
      description: 'High-impact template for product launches'
    },
    {
      id: 5,
      title: 'Educational Explainer',
      category: 'education',
      thumbnail: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      duration: '2:15',
      views: '6.4K',
      likes: 521,
      rating: 4.8,
      isPremium: false,
      tags: ['education', 'explainer', 'animated'],
      description: 'Perfect for educational and tutorial content'
    },
    {
      id: 6,
      title: 'Cinematic Title Sequence',
      category: 'intro',
      thumbnail: 'https://images.pexels.com/photos/3184394/pexels-photo-3184394.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      duration: '0:30',
      views: '18.3K',
      likes: 1456,
      rating: 4.9,
      isPremium: true,
      tags: ['cinematic', 'title', 'dramatic'],
      description: 'Hollywood-style cinematic title sequence'
    },
    {
      id: 7,
      title: 'Instagram Story Template',
      category: 'social',
      thumbnail: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      duration: '0:10',
      views: '22.1K',
      likes: 1789,
      rating: 4.7,
      isPremium: false,
      tags: ['instagram', 'story', 'vertical'],
      description: 'Trendy template for Instagram stories'
    },
    {
      id: 8,
      title: 'Tech Startup Pitch',
      category: 'corporate',
      thumbnail: 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      duration: '2:00',
      views: '5.9K',
      likes: 432,
      rating: 4.8,
      isPremium: true,
      tags: ['startup', 'tech', 'pitch'],
      description: 'Modern template for startup presentations'
    },
    {
      id: 9,
      title: 'Gaming Highlight Reel',
      category: 'intro',
      thumbnail: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      duration: '1:15',
      views: '13.7K',
      likes: 1098,
      rating: 4.6,
      isPremium: false,
      tags: ['gaming', 'highlights', 'action'],
      description: 'Dynamic template for gaming content'
    }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Utility functions
  const toggleFavorite = (templateId) => {
    setFavoriteTemplates(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(templateId)) {
        newFavorites.delete(templateId);
      } else {
        newFavorites.add(templateId);
      }
      return newFavorites;
    });
  };

  const shareTemplate = (template) => {
    if (navigator.share) {
      navigator.share({
        title: template.title,
        text: template.description,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Template link copied to clipboard!');
    }
  };

  const useTemplate = (templateId) => {
    console.log('Using template:', templateId);
    
    // Find the template
    const template = templates.find(t => t.id === templateId) || 
                    featuredTemplates.find(t => t.id === templateId);
    
    if (template) {
      // Navigate to AI editor with template data
      navigate('/ai-editor', {
        state: {
          templateData: template,
          projectName: `${template.title} Project`
        }
      });
    }
  };

  const useFeaturedTemplate = (templateId) => {
    console.log('Using featured template:', templateId);
    navigate('/ai-editor', {
      state: {
        templateData: featuredTemplates.find(t => t.id === templateId),
        projectName: 'New AI Project'
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto">
        {/* Simple Header - Consistent with other pages */}
        <div className="bg-card border-b border-border">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
                  Video Templates
                </h1>
                <p className="text-muted-foreground mt-1">
                  Professional templates to jumpstart your video creation
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border/30">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">AI-Powered</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Templates Section */}
        <AnimatePresence>
          {showFeatured && (
            <motion.div 
              className="mx-6 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Flame className="w-6 h-6 text-orange-500" />
                  Featured Templates
                </h2>
                <button 
                  onClick={() => setShowFeatured(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ×
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {featuredTemplates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${template.gradient} p-1`}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="bg-background/95 backdrop-blur-sm rounded-2xl p-6 h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-foreground mb-2">{template.title}</h3>
                          <p className="text-muted-foreground text-sm mb-3">{template.subtitle}</p>
                          <p className="text-muted-foreground text-sm">{template.description}</p>
                        </div>
                        <div className="flex gap-2">
                          {template.isPremium && (
                            <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <Crown className="w-3 h-3" />
                              PRO
                            </span>
                          )}
                          {template.isTrending && (
                            <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <Flame className="w-3 h-3" />
                              HOT
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {template.features.map((feature, idx) => (
                          <span key={idx} className="bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs">
                            {feature}
                          </span>
                        ))}
                      </div>
                      <motion.button
                        onClick={() => useFeaturedTemplate(template.id)}
                        className={`w-full bg-gradient-to-r ${template.gradient} text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Play className="w-5 h-5" />
                        Start Creating
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-6">

          {/* Enhanced Search and Filters */}
          <div className="mb-8 space-y-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search templates, categories, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-card/50 backdrop-blur-sm border border-border rounded-xl pl-12 pr-4 py-4 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
              </div>

              {/* Filter and View Controls */}
              <div className="flex gap-3">
                {/* Filter Dropdown */}
                <div className="relative">
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="bg-card/50 backdrop-blur-sm border border-border rounded-xl px-4 py-4 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none pr-10 min-w-[140px]"
                  >
                    {filters.map(filter => (
                      <option key={filter.id} value={filter.id} className="text-black">{filter.name}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
                </div>

                {/* View Mode Toggle */}
                <div className="flex bg-card/50 backdrop-blur-sm border border-border rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 rounded-lg transition-all duration-200 ${
                      viewMode === 'grid'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Grid3X3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-3 rounded-lg transition-all duration-200 ${
                      viewMode === 'list'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

          {/* Enhanced Categories */}
          <div className="flex flex-wrap gap-3">
            {categories.map((category, index) => {
              const IconComponent = category.icon;
              return (
                <motion.button
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-full border transition-all duration-300 shadow-sm ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25'
                      : 'border-border bg-card/50 backdrop-blur-sm text-muted-foreground hover:border-primary/30 hover:bg-muted hover:shadow-md'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="font-medium">{category.name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedCategory === category.id
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>{category.count}</span>
                  {selectedCategory === category.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 bg-primary-foreground rounded-full"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
        </div>

        {/* Templates Display */}
        <div className="px-6">
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          : "space-y-4"
        }>
          {isLoadingTemplates ? (
            // Loading skeletons
            Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className={viewMode === 'grid' 
                ? "bg-card rounded-xl border border-border overflow-hidden animate-pulse"
                : "bg-card rounded-xl border border-border overflow-hidden animate-pulse flex"
              }>
                {viewMode === 'grid' ? (
                  <>
                    <div className="h-48 bg-muted"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="flex justify-between items-center">
                        <div className="h-3 bg-muted rounded w-1/4"></div>
                        <div className="h-3 bg-muted rounded w-1/4"></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-48 h-32 bg-muted flex-shrink-0"></div>
                    <div className="flex-1 p-4 space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-1/3"></div>
                    </div>
                  </>
                )}
              </div>
            ))
          ) : filteredTemplates.length > 0 ? (
            filteredTemplates.map((template, index) => (
              viewMode === 'grid' ? (
                // Grid View
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  onHoverStart={() => setHoveredTemplate(template.id)}
                  onHoverEnd={() => setHoveredTemplate(null)}
                  className="bg-card/50 backdrop-blur-sm rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 group"
                >
                  <div className="relative overflow-hidden">
                    <OptimizedImage
                      src={template.thumbnail}
                      alt={template.title}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                      lazy={true}
                      quality={85}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    
                    {/* Enhanced Overlay badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {template.isPremium && (
                        <motion.span 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1 shadow-lg"
                        >
                          <Crown className="w-3 h-3" />
                          Premium
                        </motion.span>
                      )}
                      {template.isTrending && (
                        <motion.span 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1 }}
                          className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1 shadow-lg"
                        >
                          <Flame className="w-3 h-3" />
                          Trending
                        </motion.span>
                      )}
                    </div>
                    
                    {/* Enhanced Play button overlay */}
                    <AnimatePresence>
                      {hoveredTemplate === template.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="bg-white/95 backdrop-blur-sm text-gray-900 rounded-full p-4 shadow-2xl border border-white/20"
                          >
                            <Play className="w-8 h-8 ml-1" />
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Enhanced Duration and difficulty badges */}
                    <div className="absolute bottom-3 right-3 flex gap-2">
                      <span className="bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium">
                        {template.duration}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        template.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        template.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {template.difficulty}
                      </span>
                    </div>
                    
                    {/* Favorite button */}
                    <div className="absolute top-3 right-3">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleFavorite(template.id)}
                        className={`p-2 rounded-full backdrop-blur-sm transition-all duration-200 ${
                          favoriteTemplates.has(template.id)
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${
                          favoriteTemplates.has(template.id) ? 'fill-current' : ''
                        }`} />
                      </motion.button>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-1 text-lg">
                          {template.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          by {template.author}
                        </p>
                      </div>
                      <button 
                        onClick={() => shareTemplate(template)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                      {template.description}
                    </p>
                    
                    {/* Enhanced Stats */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {template.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {template.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {template.rating}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {template.downloads}
                        </span>
                      </div>
                    </div>
                    
                    {/* Enhanced Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {template.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="bg-muted/50 text-muted-foreground text-xs px-2 py-1 rounded-full border border-border hover:border-primary/30 transition-colors">
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full border border-border">
                          +{template.tags.length - 3}
                        </span>
                      )}
                    </div>
                    
                    {/* Enhanced Action buttons */}
                    <div className="flex gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => useTemplate(template.id)}
                        className="flex-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        Use Template
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-all duration-200 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                // List View
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  className="bg-card/50 backdrop-blur-sm rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 group flex"
                >
                  <div className="relative w-48 flex-shrink-0">
                    <OptimizedImage
                      src={template.thumbnail}
                      alt={template.title}
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                      lazy={true}
                      quality={85}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
                    
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      {template.isPremium && (
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                        </span>
                      )}
                      {template.isTrending && (
                        <span className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    
                    <div className="absolute bottom-2 right-2">
                      <span className="bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                        {template.duration}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 text-lg">
                            {template.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            by {template.author}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => toggleFavorite(template.id)}
                            className={`p-1 rounded transition-colors ${
                              favoriteTemplates.has(template.id)
                                ? 'text-red-500'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${
                              favoriteTemplates.has(template.id) ? 'fill-current' : ''
                            }`} />
                          </button>
                          <button 
                            onClick={() => shareTemplate(template)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {template.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {template.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {template.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {template.rating}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          template.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-400' :
                          template.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {template.difficulty}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-3">
                        {template.tags.slice(0, 4).map(tag => (
                          <span key={tag} className="bg-muted/50 text-muted-foreground text-xs px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => useTemplate(template.id)}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors duration-200 flex items-center gap-2"
                      >
                        Use Template
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-3 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors duration-200"
                      >
                        <Download className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )
            ))
          ) : (
            // Enhanced No results
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-full text-center py-16"
            >
              <div className="text-muted-foreground">
                <Search className="w-16 h-16 mx-auto mb-6 opacity-30" />
                <h3 className="text-xl font-semibold mb-2">No templates found</h3>
                <p className="text-sm mb-6">Try adjusting your search terms or filters to find what you're looking for</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setSelectedFilter('popular');
                  }}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Clear Filters
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Enhanced Load More Button */}
        {filteredTemplates.length > 0 && filteredTemplates.length >= 12 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-16"
          >
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground px-8 py-4 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary/25 border border-primary/20 backdrop-blur-sm"
            >
              <span className="flex items-center gap-2">
                Load More Templates
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </span>
            </motion.button>
            <p className="text-muted-foreground text-sm mt-4">
              Showing {filteredTemplates.length} of 500+ templates
            </p>
          </motion.div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Templates;