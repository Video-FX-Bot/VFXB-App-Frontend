import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Wand2,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Info,
  Play,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Star,
  Zap,
  Eye,
  Volume2,
  Image,
  Accessibility,
  Target
} from 'lucide-react';
import aiSuggestionsService from '../../services/aiSuggestionsService';

const AISuggestionsPanel = ({ 
  isOpen, 
  onClose, 
  selectedClip, 
  onApplySuggestion,
  projectContext = {} 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority');

  // Analyze video and get suggestions
  const analyzeVideo = useCallback(async () => {
    if (!selectedClip || isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const result = await aiSuggestionsService.analyzeVideoAndSuggest(
        selectedClip,
        projectContext
      );
      
      if (result && result.suggestions) {
        setSuggestions(result.suggestions);
      }
    } catch (error) {
      console.error('Failed to analyze video:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedClip, projectContext, isAnalyzing]);

  useEffect(() => {
    if (isOpen && selectedClip) {
      analyzeVideo();
    }
  }, [isOpen, selectedClip, analyzeVideo]);

  // Filter and sort suggestions
  const filteredSuggestions = suggestions
    .filter(suggestion => {
      if (filter === 'all') return true;
      return suggestion.type === filter;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      if (sortBy === 'confidence') {
        return b.confidence - a.confidence;
      }
      if (sortBy === 'effort') {
        const effortOrder = { low: 3, medium: 2, high: 1 };
        return effortOrder[b.effort] - effortOrder[a.effort];
      }
      return b.score - a.score;
    });

  // Apply suggestion
  const handleApplySuggestion = async (suggestion) => {
    try {
      await onApplySuggestion(suggestion);
      setAppliedSuggestions(prev => new Set([...prev, suggestion.id]));
      
      // Track successful application
      aiSuggestionsService.trackSuggestionUsage(suggestion, true);
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
      aiSuggestionsService.trackSuggestionUsage(suggestion, false);
    }
  };

  // Get icon for suggestion type
  const getSuggestionIcon = (type) => {
    const icons = {
      technical: Zap,
      content: Eye,
      audio: Volume2,
      visual: Image,
      accessibility: Accessibility,
      platform: Target
    };
    return icons[type] || Sparkles;
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      high: 'text-red-500 bg-red-50 border-red-200',
      medium: 'text-yellow-500 bg-yellow-50 border-yellow-200',
      low: 'text-green-500 bg-green-50 border-green-200'
    };
    return colors[priority] || colors.medium;
  };

  // Get effort indicator
  const getEffortIndicator = (effort) => {
    const indicators = {
      low: { dots: 1, color: 'bg-green-400' },
      medium: { dots: 2, color: 'bg-yellow-400' },
      high: { dots: 3, color: 'bg-red-400' }
    };
    return indicators[effort] || indicators.medium;
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">AI Suggestions</h2>
                <p className="text-purple-100">
                  Intelligent recommendations to enhance your video
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Filters and Sort */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filter:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-white/20 border border-white/30 rounded-lg px-3 py-1 text-sm"
              >
                <option value="all">All Types</option>
                <option value="technical">Technical</option>
                <option value="content">Content</option>
                <option value="audio">Audio</option>
                <option value="visual">Visual</option>
                <option value="accessibility">Accessibility</option>
                <option value="platform">Platform</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white/20 border border-white/30 rounded-lg px-3 py-1 text-sm"
              >
                <option value="priority">Priority</option>
                <option value="confidence">Confidence</option>
                <option value="effort">Effort</option>
                <option value="score">Score</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-200px)]">
          {/* Suggestions List */}
          <div className="flex-1 overflow-y-auto p-6">
            {isAnalyzing ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                  <p className="text-gray-600">Analyzing your video...</p>
                  <p className="text-sm text-gray-400 mt-2">
                    This may take a few moments
                  </p>
                </div>
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <div className="text-center py-12">
                <Wand2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No suggestions available</p>
                <p className="text-gray-400 text-sm mt-2">
                  Try selecting a different video or adjusting filters
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {filteredSuggestions.map((suggestion, index) => {
                    const Icon = getSuggestionIcon(suggestion.type);
                    const isApplied = appliedSuggestions.has(suggestion.id);
                    const effortIndicator = getEffortIndicator(suggestion.effort);

                    return (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                        className={`border rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg ${
                          selectedSuggestion?.id === suggestion.id
                            ? 'border-purple-300 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${isApplied ? 'opacity-60' : ''}`}
                        onClick={() => setSelectedSuggestion(suggestion)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon and Priority */}
                          <div className="flex-shrink-0">
                            <div className={`p-2 rounded-lg ${getPriorityColor(suggestion.priority)}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {suggestion.title}
                              </h3>
                              {isApplied && (
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-3">
                              {suggestion.description}
                            </p>

                            {/* Metadata */}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Priority:</span>
                                <span className={`px-2 py-1 rounded-full border ${
                                  getPriorityColor(suggestion.priority)
                                }`}>
                                  {suggestion.priority}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Effort:</span>
                                <div className="flex gap-1">
                                  {Array.from({ length: 3 }, (_, i) => (
                                    <div
                                      key={i}
                                      className={`w-2 h-2 rounded-full ${
                                        i < effortIndicator.dots
                                          ? effortIndicator.color
                                          : 'bg-gray-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                <span>{Math.round(suggestion.confidence * 100)}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex-shrink-0 flex items-center gap-2">
                            {!isApplied && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplySuggestion(suggestion);
                                }}
                                className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                              >
                                Apply
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSuggestion(suggestion);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Suggestion Details */}
          {selectedSuggestion && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-80 border-l border-gray-200 p-6 bg-gray-50"
            >
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {selectedSuggestion.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {selectedSuggestion.description}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Impact:</span>
                    <span className="text-sm text-gray-600">
                      {selectedSuggestion.impact}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Confidence:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${selectedSuggestion.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {Math.round(selectedSuggestion.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Type:</span>
                    <span className="text-sm text-gray-600 capitalize">
                      {selectedSuggestion.type}
                    </span>
                  </div>
                </div>

                {!appliedSuggestions.has(selectedSuggestion.id) && (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleApplySuggestion(selectedSuggestion)}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Apply Suggestion
                    </button>
                    
                    <div className="flex gap-2">
                      <button className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        Helpful
                      </button>
                      <button className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-1">
                        <ThumbsDown className="w-3 h-3" />
                        Not Helpful
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AISuggestionsPanel;