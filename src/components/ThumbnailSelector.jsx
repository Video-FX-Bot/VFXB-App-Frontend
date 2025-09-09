import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  Image as ImageIcon,
  Check,
  Loader2,
  RefreshCw,
  Camera,
  Play
} from 'lucide-react';
import thumbnailService from '../services/thumbnailService';
import OptimizedImage from './ui/OptimizedImage';

const ThumbnailSelector = ({ 
  isOpen, 
  onClose, 
  videoFile, 
  currentThumbnail, 
  onThumbnailSelect,
  projectId 
}) => {
  const [generatedThumbnails, setGeneratedThumbnails] = useState([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState(currentThumbnail);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customThumbnail, setCustomThumbnail] = useState(null);
  const [activeTab, setActiveTab] = useState('auto'); // 'auto' or 'custom'
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && videoFile && generatedThumbnails.length === 0) {
      generateThumbnails();
    }
  }, [isOpen, videoFile]);

  const generateThumbnails = async () => {
    if (!videoFile) return;
    
    setIsGenerating(true);
    try {
      const thumbnails = await thumbnailService.generateMultipleThumbnails(videoFile, 6);
      setGeneratedThumbnails(thumbnails);
      
      // Auto-select the first thumbnail if none is selected
      if (!selectedThumbnail && thumbnails.length > 0) {
        setSelectedThumbnail(thumbnails[0].thumbnail);
      }
    } catch (error) {
      console.error('Failed to generate thumbnails:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCustomUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const customThumb = e.target.result;
        setCustomThumbnail(customThumb);
        setSelectedThumbnail(customThumb);
        setActiveTab('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (selectedThumbnail) {
      // Save thumbnail to service if projectId is provided
      if (projectId) {
        thumbnailService.saveThumbnail(projectId, selectedThumbnail);
      }
      onThumbnailSelect(selectedThumbnail);
    }
    onClose();
  };

  const handleThumbnailClick = (thumbnail) => {
    setSelectedThumbnail(thumbnail);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card border border-border rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                Select Thumbnail
              </h2>
              <p className="text-muted-foreground">
                Choose from auto-generated thumbnails or upload a custom image
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('auto')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'auto'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Camera className="w-4 h-4" />
                Auto-Generated
              </div>
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'custom'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Custom Upload
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {activeTab === 'auto' && (
              <div>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Generating thumbnails...</p>
                  </div>
                ) : generatedThumbnails.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        Click on a thumbnail to select it
                      </p>
                      <button
                        onClick={generateThumbnails}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Regenerate
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {generatedThumbnails.map((thumb, index) => (
                        <motion.div
                          key={index}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                            selectedThumbnail === thumb.thumbnail
                              ? 'border-primary shadow-lg shadow-primary/20'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handleThumbnailClick(thumb.thumbnail)}
                        >
                          <div className="aspect-video relative">
                            <OptimizedImage
                              src={thumb.thumbnail}
                              alt={`Thumbnail at ${thumb.timeFormatted}`}
                              className="w-full h-full object-cover"
                              lazy={true}
                              quality={85}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            
                            {/* Time indicator */}
                            <div className="absolute bottom-2 left-2">
                              <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                                {thumb.timeFormatted}
                              </span>
                            </div>
                            
                            {/* Selection indicator */}
                            {selectedThumbnail === thumb.thumbnail && (
                              <div className="absolute top-2 right-2">
                                <div className="bg-primary text-primary-foreground rounded-full p-1">
                                  <Check className="w-4 h-4" />
                                </div>
                              </div>
                            )}
                            
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-primary/10 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Play className="w-8 h-8 text-white" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No thumbnails generated yet
                    </p>
                    <button
                      onClick={generateThumbnails}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Generate Thumbnails
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'custom' && (
              <div>
                <div className="mb-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCustomUpload}
                    className="hidden"
                  />
                  
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-8 text-center cursor-pointer transition-colors group"
                  >
                    <Upload className="w-12 h-12 text-muted-foreground group-hover:text-primary mx-auto mb-4 transition-colors" />
                    <p className="text-foreground font-medium mb-2">
                      Upload Custom Thumbnail
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Click to browse or drag and drop an image file
                    </p>
                    <p className="text-muted-foreground text-xs mt-2">
                      Supports JPG, PNG, WebP (Max 5MB)
                    </p>
                  </div>
                </div>

                {customThumbnail && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Custom thumbnail preview:
                    </p>
                    <div className="relative max-w-md mx-auto">
                      <img
                        src={customThumbnail}
                        alt="Custom thumbnail"
                        className="w-full aspect-video object-cover rounded-lg border border-border"
                      />
                      {selectedThumbnail === customThumbnail && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-border bg-muted/20">
            <div className="text-sm text-muted-foreground">
              {selectedThumbnail ? 'Thumbnail selected' : 'No thumbnail selected'}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!selectedThumbnail}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Thumbnail
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ThumbnailSelector;