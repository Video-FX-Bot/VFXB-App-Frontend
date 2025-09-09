import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, Video, X, AlertCircle } from 'lucide-react';
import { Button, Card } from '../ui';

const VideoUpload = ({
  onVideoSelect,
  maxSize = 100 * 1024 * 1024, // 100MB default
  acceptedFormats = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'],
  className = ''
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`File is too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB`);
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload a video file.');
      } else {
        setError('Failed to upload file. Please try again.');
      }
      return;
    }
    
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedVideo({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file)
      });
      
      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          onVideoSelect?.({
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            url: URL.createObjectURL(file)
          });
        }
      }, 200);
    }
  }, [maxSize, onVideoSelect]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': acceptedFormats.map(format => format.split('/')[1])
    },
    maxSize,
    multiple: false
  });
  
  const removeVideo = () => {
    if (selectedVideo?.url) {
      URL.revokeObjectURL(selectedVideo.url);
    }
    setSelectedVideo(null);
    setUploadProgress(0);
    setError(null);
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  if (selectedVideo && uploadProgress < 100) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <Video className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Uploading {selectedVideo.name}
          </h3>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <motion.div
              className="bg-primary-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-sm text-gray-500">{uploadProgress}% complete</p>
        </div>
      </Card>
    );
  }
  
  if (selectedVideo && uploadProgress === 100) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <video
              src={selectedVideo.url}
              className="w-24 h-16 object-cover rounded-lg"
              muted
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {selectedVideo.name}
            </h3>
            <p className="text-sm text-gray-500">
              {formatFileSize(selectedVideo.size)} • {selectedVideo.type}
            </p>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              Upload complete
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeVideo}
            className="flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <div
        {...getRootProps()}
        className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-200 ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        
        <motion.div
          animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Upload className={`w-12 h-12 mx-auto mb-4 ${
            isDragActive ? 'text-primary-600' : 'text-gray-400'
          }`} />
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isDragActive ? 'Drop your video here' : 'Upload a video'}
          </h3>
          
          <p className="text-sm text-gray-500 mb-4">
            Drag and drop your video file here, or click to browse
          </p>
          
          <Button variant="outline" size="sm">
            Choose File
          </Button>
          
          <p className="text-xs text-gray-400 mt-4">
            Supported formats: MP4, WebM, OGG, AVI, MOV<br />
            Maximum file size: {Math.round(maxSize / (1024 * 1024))}MB
          </p>
        </motion.div>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </Card>
  );
};

export default VideoUpload;