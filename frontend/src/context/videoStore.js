import { create } from "zustand";
import { devtools } from "zustand/middleware";
import ApiService from "../services/apiService";

const useVideoStore = create(
  devtools(
    (set, get) => ({
      // Video state
      videos: [],
      currentVideo: null,
      originalVideoId: null, // Track the original video ID for effects
      videoMetadata: null,
      isProcessing: false,
      processingProgress: 0,
      processingStatus: "",

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
      globalEffects: [], // Store effects that apply to entire video
      clipEffects: {}, // Store effects for specific clips

      // Video list actions
      setVideos: (videos) =>
        set({
          videos: Array.isArray(videos)
            ? videos
            : typeof videos === "function"
            ? videos(get().videos)
            : [videos],
        }),

      // Actions
      applyGlobalEffect: async (effect) => {
        try {
          // Use the current video ID (which has accumulated effects)
          // Not the original, because effects are stored on the processed versions
          const currentVideoId = get().currentVideo?.id;

          console.log("=== Apply Effect Debug ===");
          console.log("Current Video:", get().currentVideo);
          console.log("Original Video ID:", get().originalVideoId);
          console.log("Using Video ID:", currentVideoId);
          console.log("Effect:", effect);
          console.log("========================");

          if (!currentVideoId) {
            throw new Error("No video selected");
          }

          // Set processing state
          set({ isProcessing: true, processingProgress: 0 });

          // Call the API to apply the effect (ApiService is already a singleton instance)
          const result = await ApiService.applyVideoEffect(
            currentVideoId,
            effect.id,
            effect.parameters || {}
          );

          if (!result.success) {
            throw new Error(result.message || "Failed to apply effect");
          }

          // Update state with new video
          const { data } = result;

          console.log("Effect applied successfully, response:", data);

          // Extract video data from response
          let processedVideo = data.video || {};
          const videoId =
            data.effectVideo || processedVideo._id || processedVideo.id;

          // If processedVideo is empty, fetch it from the backend
          if (!processedVideo._id && !processedVideo.id && videoId) {
            console.log(
              "📋 processedVideo is empty, fetching from backend:",
              videoId
            );
            try {
              const token = localStorage.getItem("authToken");
              const baseUrl =
                import.meta.env.VITE_API_URL || "http://localhost:5000";
              const videoResponse = await fetch(
                `${baseUrl}/api/videos/${videoId}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              const videoData = await videoResponse.json();
              // Extract video from nested response
              processedVideo =
                videoData.data?.video || videoData.video || videoData;
              console.log("📋 Fetched video from backend:", processedVideo);
            } catch (error) {
              console.error("Failed to fetch video details:", error);
            }
          }

          // Construct full video URL with authentication token
          const token = localStorage.getItem("authToken");
          const baseUrl =
            import.meta.env.VITE_API_URL || "http://localhost:5000";

          // Use downloadUrl from API or construct from video ID
          let videoPath = data.downloadUrl || `/api/videos/${videoId}/stream`;
          let newVideoUrl = videoPath.startsWith("http")
            ? videoPath
            : `${baseUrl}${videoPath}`;

          // Add token to the URL if not already present
          if (token && !newVideoUrl.includes("token=")) {
            newVideoUrl = `${newVideoUrl}${
              newVideoUrl.includes("?") ? "&" : "?"
            }token=${token}`;
          }

          // Add cache-busting timestamp to force reload
          newVideoUrl = `${newVideoUrl}&t=${Date.now()}`;

          console.log("New video URL:", newVideoUrl);
          console.log("Video ID:", videoId);
          console.log("Processed video data:", processedVideo);

          // If the effect resulted in returning to the original (isOriginal flag)
          // clear global effects for this type
          const isReturningToOriginal = data.isOriginal === true;

          // Use appliedEffects from backend response (which handles deduplication)
          // If not available, fall back to current effects
          let backendEffects =
            processedVideo.appliedEffects ||
            get().currentVideo?.appliedEffects ||
            [];

          console.log(
            "📋 Raw appliedEffects from backend:",
            processedVideo.appliedEffects
          );
          console.log(
            "📋 Type of appliedEffects:",
            typeof processedVideo.appliedEffects
          );
          console.log(
            "📋 Is Array?:",
            Array.isArray(processedVideo.appliedEffects)
          );

          // Normalize appliedEffects: convert object to array if needed
          // (Sometimes backend returns object with numeric keys instead of array)
          if (
            !Array.isArray(backendEffects) &&
            typeof backendEffects === "object" &&
            backendEffects !== null
          ) {
            console.log("🔄 Converting object to array...");
            console.log("🔄 Object keys:", Object.keys(backendEffects));

            // Extract only numeric keys and convert to array (filter out non-numeric like "service", "environment")
            const numericKeys = Object.keys(backendEffects)
              .filter((key) => !isNaN(parseInt(key)))
              .sort((a, b) => parseInt(a) - parseInt(b));

            console.log("🔄 Numeric keys found:", numericKeys);

            backendEffects = numericKeys
              .map((key) => backendEffects[key])
              .filter(
                (item) =>
                  item && typeof item === "object" && (item.effect || item.type)
              );

            console.log("✅ Converted to array:", backendEffects);
          }

          const updatedAppliedEffects = isReturningToOriginal
            ? [] // Clear appliedEffects when returning to original
            : backendEffects;

          console.log("📋 Final updatedAppliedEffects:", updatedAppliedEffects);
          console.log("📋 Length:", updatedAppliedEffects.length);

          set((state) => ({
            currentVideo: {
              ...state.currentVideo,
              ...processedVideo, // Include all properties from backend
              id: data.effectVideo,
              url: newVideoUrl,
              streamUrl: newVideoUrl,
              filePath: data.outputPath, // ✅ Preserve the file path from API response
              appliedEffects: updatedAppliedEffects, // ✅ Use backend's appliedEffects (deduplication handled server-side)
            },
            // Keep originalVideoId unchanged - always reference the first uploaded video
            globalEffects: isReturningToOriginal
              ? [] // Clear all effects when returning to original
              : [...state.globalEffects, { ...effect, id: data.effectVideo }],
            editHistory: [
              ...state.editHistory,
              {
                type: isReturningToOriginal
                  ? "RESET_TO_ORIGINAL"
                  : "APPLY_GLOBAL_EFFECT",
                effect,
                timestamp: Date.now(),
                videoId: data.effectVideo,
              },
            ],
            isProcessing: false,
            processingProgress: 100,
          }));

          return result;
        } catch (error) {
          console.error("Failed to apply effect:", error);
          set({ isProcessing: false, processingProgress: 0 });
          throw error;
        }
      },

      removeGlobalEffect: (effectId) => {
        set((state) => ({
          globalEffects: state.globalEffects.filter((e) => e.id !== effectId),
        }));
      },

      setCurrentVideo: (video) => {
        set((state) => ({
          currentVideo: video,
          originalVideoId: video?.id || null, // Store original video ID when first loaded
          videoMetadata: video
            ? {
                id: video.id, // Keep track of backend video ID
                name: video.name,
                size: video.size,
                type: video.type,
                duration: 0, // Will be set when video loads
                resolution: null,
                fps: null,
                bitrate: null,
              }
            : null,
          // Reset playback state when new video is loaded
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          // Clear edit history for new video
          editHistory: [],
          currentHistoryIndex: -1,
          globalEffects: [], // Clear effects when loading new video
        }));
      },

      updateVideoMetadata: (metadata) => {
        set((state) => ({
          videoMetadata: {
            ...state.videoMetadata,
            ...metadata,
          },
        }));
      },

      setProcessing: (isProcessing, progress = 0, status = "") => {
        set({
          isProcessing,
          processingProgress: progress,
          processingStatus: status,
        });
      },

      updateProcessingProgress: (progress, status = "") => {
        set((state) => ({
          processingProgress: progress,
          processingStatus: status || state.processingStatus,
        }));
      },

      // Playback controls
      setPlaying: (isPlaying) => set({ isPlaying }),

      setCurrentTime: (currentTime) => set({ currentTime }),

      setDuration: (duration) => {
        set((state) => ({
          duration,
          videoMetadata: state.videoMetadata
            ? {
                ...state.videoMetadata,
                duration,
              }
            : null,
        }));
      },

      setVolume: (volume) => {
        set({
          volume: Math.max(0, Math.min(1, volume)),
          isMuted: volume === 0,
        });
      },

      toggleMute: () => {
        set((state) => ({
          isMuted: !state.isMuted,
        }));
      },

      setPlaybackRate: (playbackRate) => {
        set({
          playbackRate: Math.max(0.25, Math.min(2, playbackRate)),
        });
      },

      // Edit history management
      addToHistory: (action) => {
        set((state) => {
          const newHistory = state.editHistory.slice(
            0,
            state.currentHistoryIndex + 1
          );
          newHistory.push({
            id: Date.now(),
            action,
            timestamp: new Date().toISOString(),
            videoState: {
              currentTime: state.currentTime,
              duration: state.duration,
            },
          });

          return {
            editHistory: newHistory,
            currentHistoryIndex: newHistory.length - 1,
          };
        });
      },

      undo: () => {
        set((state) => {
          if (state.currentHistoryIndex > 0) {
            return {
              currentHistoryIndex: state.currentHistoryIndex - 1,
            };
          }
          return state;
        });
      },

      redo: () => {
        set((state) => {
          if (state.currentHistoryIndex < state.editHistory.length - 1) {
            return {
              currentHistoryIndex: state.currentHistoryIndex + 1,
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
          timelineZoom: Math.max(0.1, Math.min(10, zoom)),
        });
      },

      setTimelinePosition: (position) => set({ timelinePosition: position }),

      setSelectedClips: (clips) => set({ selectedClips: clips }),

      addSelectedClip: (clip) => {
        set((state) => ({
          selectedClips: [...state.selectedClips, clip],
        }));
      },

      removeSelectedClip: (clipId) => {
        set((state) => ({
          selectedClips: state.selectedClips.filter(
            (clip) => clip.id !== clipId
          ),
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
          processingStatus: "",
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
          selectedClips: [],
        });
      },
    }),
    {
      name: "video-store",
    }
  )
);

export default useVideoStore;
