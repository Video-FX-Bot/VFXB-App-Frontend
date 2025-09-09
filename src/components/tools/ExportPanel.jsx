import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Settings,
  Video,
  FileVideo,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Play,
  Pause
} from 'lucide-react';
import { videoService } from '../../services/videoService';
import { useVideoStore } from '../../store';
import { toast } from 'react-hot-toast';

const EXPORT_FORMATS = [
  { value: 'mp4', label: 'MP4', description: 'Most compatible format' },
  { value: 'webm', label: 'WebM', description: 'Web optimized' },
  { value: 'mov', label: 'MOV', description: 'High quality' },
  { value: 'avi', label: 'AVI', description: 'Uncompressed' }
];

const QUALITY_PRESETS = [
  { value: 'low', label: 'Low (480p)', bitrate: '1000k', resolution: '854x480' },
  { value: 'medium', label: 'Medium (720p)', bitrate: '2500k', resolution: '1280x720' },
  { value: 'high', label: 'High (1080p)', bitrate: '5000k', resolution: '1920x1080' },
  { value: 'ultra', label: 'Ultra (4K)', bitrate: '15000k', resolution: '3840x2160' }
];

const ExportPanel = ({ isOpen, onClose, selectedClip }) => {
  const [exportSettings, setExportSettings] = useState({
    format: 'mp4',
    quality: 'high',
    customResolution: '',
    customBitrate: '',
    includeAudio: true,
    startTime: 0,
    endTime: null
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState(null); // 'success', 'error', null
  const [exportedFile, setExportedFile] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const { currentProject, clips } = useVideoStore();

  const handleExport = useCallback(async () => {
    if (!selectedClip && (!currentProject || clips.length === 0)) {
      toast.error('No video to export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStatus(null);
    
    try {
      const exportData = {
        format: exportSettings.format,
        quality: exportSettings.quality,
        resolution: exportSettings.customResolution || QUALITY_PRESETS.find(p => p.value === exportSettings.quality)?.resolution,
        bitrate: exportSettings.customBitrate || QUALITY_PRESETS.find(p => p.value === exportSettings.quality)?.bitrate,
        includeAudio: exportSettings.includeAudio,
        startTime: exportSettings.startTime,
        endTime: exportSettings.endTime
      };

      let result;
      if (selectedClip) {
        // Export single clip
        result = await videoService.exportVideo(selectedClip.id, exportData);
      } else {
        // Export entire project
        result = await videoService.exportVideoWithOptions(currentProject.name, exportData);
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Wait for actual result
      await new Promise(resolve => setTimeout(resolve, 2000));
      clearInterval(progressInterval);
      setExportProgress(100);
      
      setExportedFile(result);
      setExportStatus('success');
      toast.success('Video exported successfully!');
      
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
      toast.error(error.message || 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedClip, currentProject, clips, exportSettings]);

  const handleDownload = useCallback(() => {
    if (exportedFile && exportedFile.downloadUrl) {
      const link = document.createElement('a');
      link.href = exportedFile.downloadUrl;
      link.download = exportedFile.filename || `export.${exportSettings.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [exportedFile, exportSettings.format]);

  const resetExport = useCallback(() => {
    setExportProgress(0);
    setExportStatus(null);
    setExportedFile(null);
    setIsExporting(false);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Download className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Export Video</h2>
                <p className="text-sm text-gray-400">
                  {selectedClip ? `Export "${selectedClip.name}"` : 'Export entire project'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
            {/* Export Status */}
            {(isExporting || exportStatus) && (
              <motion.div
                className="bg-gray-800 rounded-lg p-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {isExporting && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                      <span className="text-white font-medium">Exporting video...</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-400">{exportProgress}% complete</p>
                  </div>
                )}
                
                {exportStatus === 'success' && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-white font-medium">Export completed!</span>
                    </div>
                    {exportedFile && (
                      <div className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <FileVideo className="w-5 h-5 text-blue-400" />
                          <div>
                            <p className="text-white text-sm font-medium">
                              {exportedFile.filename || `export.${exportSettings.format}`}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {exportedFile.size ? `${(exportedFile.size / 1024 / 1024).toFixed(1)} MB` : 'Ready to download'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleDownload}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {exportStatus === 'error' && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="text-white font-medium">Export failed</span>
                    </div>
                    <button
                      onClick={resetExport}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Format Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">Format</label>
              <div className="grid grid-cols-2 gap-3">
                {EXPORT_FORMATS.map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setExportSettings(prev => ({ ...prev, format: format.value }))}
                    className={`p-3 rounded-lg border transition-all ${
                      exportSettings.format === format.value
                        ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                        : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-medium">{format.label}</p>
                      <p className="text-xs opacity-75">{format.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">Quality</label>
              <div className="space-y-2">
                {QUALITY_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setExportSettings(prev => ({ ...prev, quality: preset.value }))}
                    className={`w-full p-3 rounded-lg border transition-all text-left ${
                      exportSettings.quality === preset.value
                        ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                        : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{preset.label}</p>
                        <p className="text-xs opacity-75">{preset.resolution} • {preset.bitrate}</p>
                      </div>
                      <Video className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-3">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Advanced Settings</span>
              </button>
              
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    className="space-y-4 bg-gray-800 rounded-lg p-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-400 mb-2 block">Custom Resolution</label>
                        <input
                          type="text"
                          placeholder="1920x1080"
                          value={exportSettings.customResolution}
                          onChange={(e) => setExportSettings(prev => ({ ...prev, customResolution: e.target.value }))}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 mb-2 block">Custom Bitrate</label>
                        <input
                          type="text"
                          placeholder="5000k"
                          value={exportSettings.customBitrate}
                          onChange={(e) => setExportSettings(prev => ({ ...prev, customBitrate: e.target.value }))}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="includeAudio"
                        checked={exportSettings.includeAudio}
                        onChange={(e) => setExportSettings(prev => ({ ...prev, includeAudio: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="includeAudio" className="text-sm text-white">Include Audio</label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || exportStatus === 'success'}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : exportStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Exported</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Video</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExportPanel;