import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  Award
} from 'lucide-react';

const Templates = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFilter, setSelectedFilter] = useState('popular');

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
      tags: ['intro', 'social', 'modern'],
      description: 'Eye-catching intro perfect for social media content'
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
      tags: ['corporate', 'presentation', 'professional'],
      description: 'Professional template for business presentations'
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

  const useTemplate = (templateId) => {
    console.log('Using template:', templateId);
    // Navigate to editor with template
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
            Video Templates
          </h1>
          <p className="text-muted-foreground text-lg">
            Professional templates to jumpstart your video creation
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="bg-card border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none pr-10"
              >
                {filters.map(filter => (
                  <option key={filter.id} value={filter.id}>{filter.name}</option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-3">
            {categories.map(category => {
              const IconComponent = category.icon;
              return (
                <motion.button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                    selectedCategory === category.id
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-border hover:bg-muted'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="font-medium">{category.name}</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">{category.count}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              className="bg-card backdrop-blur-sm border border-border rounded-xl overflow-hidden hover:border-border transition-all duration-300 group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              {/* Thumbnail */}
              <div className="relative overflow-hidden">
                <img
                  src={template.thumbnail}
                  alt={template.title}
                  className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Overlay Content */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <motion.button
                    onClick={() => useTemplate(template.id)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 shadow-lg text-white"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Play className="w-5 h-5" />
                    <span>Use Template</span>
                  </motion.button>
                </div>

                {/* Top badges */}
                <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                  <div className="flex space-x-2">
                    {template.isPremium && (
                      <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center space-x-1">
                        <Sparkles className="w-3 h-3" />
                        <span>PRO</span>
                      </span>
                    )}
                  </div>
                  <span className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-sm font-medium text-white">
                    {template.duration}
                  </span>
                </div>

                {/* Bottom stats */}
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                  <div className="flex items-center space-x-3 text-sm text-white">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{template.views}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4" />
                      <span>{template.likes}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-white">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">{template.rating}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-bold text-lg text-foreground mb-2 line-clamp-1">{template.title}</h3>
                <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{template.description}</p>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {template.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <motion.button
                    onClick={() => useTemplate(template.id)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Zap className="w-4 h-4" />
                    <span>Use</span>
                  </motion.button>
                  <motion.button
                    className="bg-muted hover:bg-muted/80 text-foreground p-2 rounded-lg transition-all duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Download className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Load More */}
        {filteredTemplates.length > 0 && (
          <div className="text-center mt-12">
            <motion.button
              className="bg-card hover:bg-muted border border-border hover:border-border text-foreground px-8 py-3 rounded-lg font-medium transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Load More Templates
            </motion.button>
          </div>
        )}

        {/* No Results */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-16">
            <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No templates found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Templates;