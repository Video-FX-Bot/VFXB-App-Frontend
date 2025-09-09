import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Filter,
  Clock,
  Monitor,
  Star,
  Play,
  Grid3X3,
  List,
  ChevronDown,
  Sparkles,
  Video,
  Music,
  Type,
  Zap
} from 'lucide-react';
import templateService from '../services/templateService';

const TemplateSelector = ({ isOpen, onClose, onSelect }) => {
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [projectName, setProjectName] = useState('');

  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory, selectedDifficulty]);

  const loadTemplates = () => {
    const allTemplates = templateService.getTemplates();
    const allCategories = templateService.getCategories();
    setTemplates(allTemplates);
    setCategories(allCategories);
    setFilteredTemplates(allTemplates);
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery) {
      filtered = templateService.searchTemplates(searchQuery);
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Filter by difficulty
    if (selectedDifficulty !== 'All') {
      filtered = filtered.filter(template => template.difficulty === selectedDifficulty);
    }

    setFilteredTemplates(filtered);
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setProjectName(`${template.name} Project`);
  };

  const handleCreateProject = () => {
    if (selectedTemplate && projectName.trim()) {
      const projectData = templateService.createProjectFromTemplate(
        selectedTemplate.id,
        projectName.trim()
      );
      onSelect(projectData);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setProjectName('');
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedDifficulty('All');
    onClose();
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return 'text-green-600 bg-green-100';
      case 'Intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'Advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getFeatureIcon = (feature) => {
    if (feature.toLowerCase().includes('music') || feature.toLowerCase().includes('audio')) {
      return <Music className="w-3 h-3" />;
    }
    if (feature.toLowerCase().includes('text') || feature.toLowerCase().includes('title')) {
      return <Type className="w-3 h-3" />;
    }
    if (feature.toLowerCase().includes('effect') || feature.toLowerCase().includes('transition')) {
      return <Zap className="w-3 h-3" />;
    }
    return <Video className="w-3 h-3" />;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Choose a Template</h2>
                <p className="text-sm text-muted-foreground">Start your project with a professional template</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex h-[calc(90vh-120px)]">
            {/* Template List */}
            <div className="flex-1 flex flex-col">
              {/* Search and Filters */}
              <div className="p-4 border-b border-border space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Filter Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Category Filter */}
                    <div className="relative">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="appearance-none bg-muted border border-border rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        {categories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>

                    {/* Difficulty Filter */}
                    <div className="relative">
                      <select
                        value={selectedDifficulty}
                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                        className="appearance-none bg-muted border border-border rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        {difficulties.map(difficulty => (
                          <option key={difficulty} value={difficulty}>{difficulty}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-colors ${
                        viewMode === 'grid' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                      }`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-colors ${
                        viewMode === 'list' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Templates Grid/List */}
              <div className="flex-1 overflow-y-auto p-4">
                {filteredTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No templates found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div className={`${
                    viewMode === 'grid' 
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
                      : 'space-y-3'
                  }`}>
                    {filteredTemplates.map((template) => (
                      <motion.div
                        key={template.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`${
                          viewMode === 'grid' ? 'aspect-[4/3]' : 'h-24'
                        } bg-card border border-border rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 ${
                          selectedTemplate?.id === template.id ? 'ring-2 ring-primary border-primary' : ''
                        }`}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        {viewMode === 'grid' ? (
                          <div className="h-full flex flex-col">
                            {/* Template Thumbnail */}
                            <div className="flex-1 relative bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                              <Play className="w-8 h-8 text-primary/60" />
                              <div className="absolute top-2 right-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                                  {template.difficulty}
                                </span>
                              </div>
                            </div>
                            
                            {/* Template Info */}
                            <div className="p-3">
                              <h3 className="font-medium text-foreground text-sm mb-1 truncate">{template.name}</h3>
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{template.description}</p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {template.estimatedTime}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Monitor className="w-3 h-3" />
                                  {template.aspectRatio}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center p-4 gap-4">
                            {/* Template Thumbnail */}
                            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Play className="w-6 h-6 text-primary/60" />
                            </div>
                            
                            {/* Template Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-foreground truncate">{template.name}</h3>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                                  {template.difficulty}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground truncate mb-1">{template.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {template.estimatedTime}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Monitor className="w-3 h-3" />
                                  {template.aspectRatio}
                                </span>
                                <span>{template.category}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Template Preview */}
            {selectedTemplate && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-80 border-l border-border bg-muted/30 flex flex-col"
              >
                {/* Preview Header */}
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground mb-1">{selectedTemplate.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Template Preview */}
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                    <Play className="w-12 h-12 text-primary/60" />
                  </div>

                  {/* Template Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Category</span>
                      <span className="text-sm font-medium">{selectedTemplate.category}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Duration</span>
                      <span className="text-sm font-medium">{selectedTemplate.duration}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Resolution</span>
                      <span className="text-sm font-medium">{selectedTemplate.resolution}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Difficulty</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${getDifficultyColor(selectedTemplate.difficulty)}`}>
                        {selectedTemplate.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Features</h4>
                    <div className="space-y-2">
                      {selectedTemplate.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          {getFeatureIcon(feature)}
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Assets */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Included Assets</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Video clips</span>
                        <span className="font-medium">{selectedTemplate.assets.videoClips}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Audio tracks</span>
                        <span className="font-medium">{selectedTemplate.assets.audioTracks}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Text elements</span>
                        <span className="font-medium">{selectedTemplate.assets.textElements}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Effects</span>
                        <span className="font-medium">{selectedTemplate.assets.effects}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Create Project Section */}
                <div className="p-4 border-t border-border space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Enter project name..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <button
                    onClick={handleCreateProject}
                    disabled={!projectName.trim()}
                    className="w-full bg-gradient-to-r from-primary to-primary hover:from-primary/90 hover:to-primary/90 disabled:from-muted disabled:to-muted disabled:text-muted-foreground text-primary-foreground py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Create Project
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TemplateSelector;