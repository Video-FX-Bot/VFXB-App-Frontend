import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Video,
  Music,
  Image,
  FileText,
  X,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';
import { Button, Card } from '../ui';
import OptimizedImage from '../ui/OptimizedImage';

const MEDIA_TYPES = {
  VIDEO: {
    accept: {
      'video/*': ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv']
    },
    icon: Video,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300'
  },
  AUDIO: {
    accept: {
      'audio/*': ['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac']
    },
    icon: Music,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300'
  },
  IMAGE: {
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    },
    icon: Image,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300'
  },
  TEXT: {
    accept: {
      'text/*': ['.txt', '.srt', '.vtt', '.ass']
    },
    icon: FileText,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300'
  }
};

const MediaUpload = ({
  mediaType = 'VIDEO',
  onMediaSelect,
  maxSize = 100 * 1024 * 1024, // 100MB default
  className = '',
  compact = false
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const mediaConfig = MEDIA_TYPES[mediaType] || MEDIA_TYPES.VIDEO;
  const Icon = mediaConfig.icon;

  // Function to get actual media duration
  const getMediaDuration = (file, url) => {
    return new Promise((resolve) => {
      if (mediaType === 'VIDEO') {
        const video = document.createElement('video');
        video.src = url;
        video.muted = true;
        video.addEventListener('loadedmetadata', () => {
          resolve(video.duration || 5);
        });
        video.addEventListener('error', () => {
          resolve(5); // Fallback duration
        });
        video.load();
      } else if (mediaType === 'AUDIO') {
        const audio = document.createElement('audio');
        audio.src = url;
        audio.addEventListener('loadedmetadata', () => {
          resolve(audio.duration || 5);
        });
        audio.addEventListener('error', () => {
          resolve(5); // Fallback duration
        });
        audio.load();
      } else {
        resolve(5); // Default for images
      }
    });
  };

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`File is too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB`);
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError(`Invalid file type for ${mediaType.toLowerCase()}.`);
      } else {
        setError('Failed to upload file. Please try again.');
      }
      return;
    }
    
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const url = URL.createObjectURL(file);
      setIsUploading(true);
      setSelectedMedia({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        url,
        mediaType
      });
      
      try {
        // Get actual media duration
        const actualDuration = await getMediaDuration(file, url);
        
        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 20;
          if (progress > 100) progress = 100;
          setUploadProgress(progress);
          
          if (progress >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            onMediaSelect?.({
              file,
              name: file.name,
              size: file.size,
              type: file.type,
              url,
              mediaType,
              duration: actualDuration
            });
          }
        }, 200);
      } catch (error) {
        console.error('Error getting media duration:', error);
        // Fallback to simulated upload with default duration
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 20;
          if (progress > 100) progress = 100;
          setUploadProgress(progress);
          
          if (progress >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            onMediaSelect?.({
              file,
              name: file.name,
              size: file.size,
              type: file.type,
              url,
              mediaType,
              duration: 5 // Fallback duration
            });
          }
        }, 200);
      }
    }
  }, [maxSize, onMediaSelect, mediaType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: mediaConfig.accept,
    maxSize,
    multiple: false
  });

  const removeMedia = () => {
    if (selectedMedia?.url) {
      URL.revokeObjectURL(selectedMedia.url);
    }
    setSelectedMedia(null);
    setUploadProgress(0);
    setError(null);
    setIsUploading(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMediaPreview = () => {
    if (!selectedMedia) return null;

    switch (mediaType) {
      case 'VIDEO':
        return (
          <video
            src={selectedMedia.url}
            className="w-full h-32 object-cover rounded-lg"
            muted
            controls={false}
          />
        );
      case 'AUDIO':
        return (
          <div className="w-full h-32 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
            <Music className="w-12 h-12 text-white" />
          </div>
        );
      case 'IMAGE':
        return (
          <OptimizedImage
            src={selectedMedia.url}
            alt={selectedMedia.name}
            className="w-full h-32 object-cover rounded-lg"
            lazy
            quality={85}
          />
        );
      case 'TEXT':
        return (
          <div className="w-full h-32 bg-gradient-to-r from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
            <FileText className="w-12 h-12 text-white" />
          </div>
        );
      default:
        return null;
    }
  };

  if (compact && selectedMedia && !isUploading) {
    return (
      <div className={`flex items-center space-x-2 p-2 bg-gray-100 rounded-lg ${className}`}>
        <div className="flex-shrink-0">
          <Icon className={`w-4 h-4 ${mediaConfig.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {selectedMedia.name}
          </p>
          <p className="text-xs text-gray-500">
            {formatFileSize(selectedMedia.size)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={removeMedia}
          className="flex-shrink-0 p-1"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  if (isUploading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Loader className={`w-8 h-8 ${mediaConfig.color} animate-spin`} />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Uploading {selectedMedia?.name}
          </h3>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <motion.div
              className={`h-2 rounded-full ${mediaConfig.color.replace('text-', 'bg-')}`}
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-gray-500">{Math.round(uploadProgress)}% complete</p>
        </div>
      </Card>
    );
  }

  if (selectedMedia && !isUploading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-900">Upload Complete</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeMedia}
              className="p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            {renderMediaPreview()}
            <div>
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedMedia.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(selectedMedia.size)} • {selectedMedia.type}
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? `${mediaConfig.borderColor} ${mediaConfig.bgColor}`
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        
        <motion.div
          animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <div className={`w-12 h-12 mx-auto rounded-full ${mediaConfig.bgColor} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${mediaConfig.color}`} />
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {isDragActive ? `Drop your ${mediaType.toLowerCase()} here` : `Upload ${mediaType.toLowerCase()}`}
            </h3>
            
            <p className="text-xs text-gray-500 mb-3">
              Drag and drop or click to browse
            </p>
            
            <Button variant="outline" size="sm">
              Choose File
            </Button>
            
            <p className="text-xs text-gray-400 mt-2">
              Max size: {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        </motion.div>
      </div>
      
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2"
          >
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default MediaUpload;