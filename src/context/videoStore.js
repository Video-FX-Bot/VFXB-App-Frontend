import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useVideoStore = create(
  devtools(
    (set, get) => ({
      // Video state
      currentVideo: null,
      videoMetadata: null,
      isProcessing: false,
      processingProgress: 0,
      processingStatus: '',
      
      // Playback state
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      playbackRate: 1,
      
      // Edit history
      editHistory: [],
      currentHistoryIndex: -1,
      
      // Timeline state
      timelineZoom: 1,
      timelinePosition: 0,
      selectedClips: [],
      
      // Actions
      setCurrentVideo: (video) => {
        set((state) => ({
          currentVideo: video,
          videoMetadata: video ? {
            name: video.name,
            size: video.size,
            type: video.type,
            duration: 0, // Will be set when video loads
            resolution: null,
            fps: null,
            bitrate: null
          } : null,
          // Reset playback state when new video is loaded
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          // Clear edit history for new video
          editHistory: [],
          currentHistoryIndex: -1
        }));
      },
      
      updateVideoMetadata: (metadata) => {
        set((state) => ({
          videoMetadata: {
            ...state.videoMetadata,
            ...metadata
          }
        }));
      },
      
      setProcessing: (isProcessing, progress = 0, status = '') => {
        set({
          isProcessing,
          processingProgress: progress,
          processingStatus: status
        });
      },
      
      updateProcessingProgress: (progress, status = '') => {
        set((state) => ({
          processingProgress: progress,
          processingStatus: status || state.processingStatus
        }));
      },
      
      // Playback controls
      setPlaying: (isPlaying) => set({ isPlaying }),
      
      setCurrentTime: (currentTime) => set({ currentTime }),
      
      setDuration: (duration) => {
        set((state) => ({
          duration,
          videoMetadata: state.videoMetadata ? {
            ...state.videoMetadata,
            duration
          } : null
        }));
      },
      
      setVolume: (volume) => {
        set({
          volume: Math.max(0, Math.min(1, volume)),
          isMuted: volume === 0
        });
      },
      
      toggleMute: () => {
        set((state) => ({
          isMuted: !state.isMuted
        }));
      },
      
      setPlaybackRate: (playbackRate) => {
        set({
          playbackRate: Math.max(0.25, Math.min(2, playbackRate))
        });
      },
      
      // Edit history management
      addToHistory: (action) => {
        set((state) => {
          const newHistory = state.editHistory.slice(0, state.currentHistoryIndex + 1);
          newHistory.push({
            id: Date.now(),
            action,
            timestamp: new Date().toISOString(),
            videoState: {
              currentTime: state.currentTime,
              duration: state.duration
            }
          });
          
          return {
            editHistory: newHistory,
            currentHistoryIndex: newHistory.length - 1
          };
        });
      },
      
      undo: () => {
        set((state) => {
          if (state.currentHistoryIndex > 0) {
            return {
              currentHistoryIndex: state.currentHistoryIndex - 1
            };
          }
          return state;
        });
      },
      
      redo: () => {
        set((state) => {
          if (state.currentHistoryIndex < state.editHistory.length - 1) {
            return {
              currentHistoryIndex: state.currentHistoryIndex + 1
            };
          }
          return state;
        });
      },
      
      canUndo: () => {
        const state = get();
        return state.currentHistoryIndex > 0;
      },
      
      canRedo: () => {
        const state = get();
        return state.currentHistoryIndex < state.editHistory.length - 1;
      },
      
      // Timeline controls
      setTimelineZoom: (zoom) => {
        set({
          timelineZoom: Math.max(0.1, Math.min(10, zoom))
        });
      },
      
      setTimelinePosition: (position) => set({ timelinePosition: position }),
      
      setSelectedClips: (clips) => set({ selectedClips: clips }),
      
      addSelectedClip: (clip) => {
        set((state) => ({
          selectedClips: [...state.selectedClips, clip]
        }));
      },
      
      removeSelectedClip: (clipId) => {
        set((state) => ({
          selectedClips: state.selectedClips.filter(clip => clip.id !== clipId)
        }));
      },
      
      clearSelectedClips: () => set({ selectedClips: [] }),
      
      // Utility functions
      reset: () => {
        set({
          currentVideo: null,
          videoMetadata: null,
          isProcessing: false,
          processingProgress: 0,
          processingStatus: '',
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          volume: 1,
          isMuted: false,
          playbackRate: 1,
          editHistory: [],
          currentHistoryIndex: -1,
          timelineZoom: 1,
          timelinePosition: 0,
          selectedClips: []
        });
      }
    }),
    {
      name: 'video-store'
    }
  )
);

export default useVideoStore;