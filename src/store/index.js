/**
 * Zustand Store - Global State Management
 * Optimized for performance with proper caching and minimal re-renders
 */
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// UI Store - Theme, modals, notifications, etc.
export const useUIStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        // Theme state
        theme: 'light',
        setTheme: (theme) => set((state) => {
          state.theme = theme;
        }),
        toggleTheme: () => set((state) => {
          state.theme = state.theme === 'light' ? 'dark' : 'light';
        }),

        // Sidebar state
        sidebarOpen: true,
        setSidebarOpen: (open) => set((state) => {
          state.sidebarOpen = open;
        }),
        toggleSidebar: () => set((state) => {
          state.sidebarOpen = !state.sidebarOpen;
        }),

        // Modal state
        modals: {},
        openModal: (modalId, props = {}) => set((state) => {
          state.modals[modalId] = { isOpen: true, props };
        }),
        closeModal: (modalId) => set((state) => {
          if (state.modals[modalId]) {
            state.modals[modalId].isOpen = false;
          }
        }),
        closeAllModals: () => set((state) => {
          Object.keys(state.modals).forEach(modalId => {
            state.modals[modalId].isOpen = false;
          });
        }),

        // Loading state
        loading: false,
        loadingMessage: '',
        setLoading: (loading, message = '') => set((state) => {
          state.loading = loading;
          state.loadingMessage = message;
        }),

        // Notifications
        notifications: [],
        addNotification: (notification) => set((state) => {
          const id = Date.now().toString();
          state.notifications.push({
            id,
            type: 'info',
            duration: 5000,
            ...notification,
          });
        }),
        removeNotification: (id) => set((state) => {
          state.notifications = state.notifications.filter(n => n.id !== id);
        }),
        clearNotifications: () => set((state) => {
          state.notifications = [];
        }),

        // Window dimensions
        windowSize: { width: 1920, height: 1080 },
        setWindowSize: (size) => set((state) => {
          state.windowSize = size;
        }),

        // Keyboard shortcuts
        keyboardShortcuts: true,
        setKeyboardShortcuts: (enabled) => set((state) => {
          state.keyboardShortcuts = enabled;
        }),
      })),
      {
        name: 'ui-store',
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
          keyboardShortcuts: state.keyboardShortcuts,
        }),
      }
    ),
    { name: 'UI Store' }
  )
);

// Project Store - Projects, templates, recent items
export const useProjectStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        // Projects
        projects: [],
        currentProject: null,
        recentProjects: [],
        
        // Project actions
        setProjects: (projects) => set((state) => {
          state.projects = projects;
        }),
        addProject: (project) => set((state) => {
          const newProject = {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...project,
          };
          state.projects.unshift(newProject);
          
          // Add to recent projects
          state.recentProjects = [
            newProject,
            ...state.recentProjects.filter(p => p.id !== newProject.id)
          ].slice(0, 10);
        }),
        updateProject: (id, updates) => set((state) => {
          const projectIndex = state.projects.findIndex(p => p.id === id);
          if (projectIndex !== -1) {
            state.projects[projectIndex] = {
              ...state.projects[projectIndex],
              ...updates,
              updatedAt: new Date().toISOString(),
            };
            
            // Update current project if it's the one being updated
            if (state.currentProject?.id === id) {
              state.currentProject = state.projects[projectIndex];
            }
            
            // Update recent projects
            const recentIndex = state.recentProjects.findIndex(p => p.id === id);
            if (recentIndex !== -1) {
              state.recentProjects[recentIndex] = state.projects[projectIndex];
            }
          }
        }),
        deleteProject: (id) => set((state) => {
          state.projects = state.projects.filter(p => p.id !== id);
          state.recentProjects = state.recentProjects.filter(p => p.id !== id);
          if (state.currentProject?.id === id) {
            state.currentProject = null;
          }
        }),
        setCurrentProject: (project) => set((state) => {
          state.currentProject = project;
          if (project) {
            // Add to recent projects
            state.recentProjects = [
              project,
              ...state.recentProjects.filter(p => p.id !== project.id)
            ].slice(0, 10);
          }
        }),
        
        // Templates
        templates: [],
        setTemplates: (templates) => set((state) => {
          state.templates = templates;
        }),
        
        // Search and filters
        searchQuery: '',
        setSearchQuery: (query) => set((state) => {
          state.searchQuery = query;
        }),
        sortBy: 'updatedAt',
        setSortBy: (sortBy) => set((state) => {
          state.sortBy = sortBy;
        }),
        filterBy: 'all',
        setFilterBy: (filter) => set((state) => {
          state.filterBy = filter;
        }),
        
        // Computed getters
        getFilteredProjects: () => {
          const { projects, searchQuery, sortBy, filterBy } = get();
          let filtered = [...projects];
          
          // Apply search filter
          if (searchQuery) {
            filtered = filtered.filter(project => 
              project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              project.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
          }
          
          // Apply category filter
          if (filterBy !== 'all') {
            filtered = filtered.filter(project => project.category === filterBy);
          }
          
          // Apply sorting
          filtered.sort((a, b) => {
            switch (sortBy) {
              case 'name':
                return a.name.localeCompare(b.name);
              case 'createdAt':
                return new Date(b.createdAt) - new Date(a.createdAt);
              case 'updatedAt':
              default:
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            }
          });
          
          return filtered;
        },
      })),
      {
        name: 'project-store',
        partialize: (state) => ({
          projects: state.projects,
          recentProjects: state.recentProjects,
          templates: state.templates,
        }),
      }
    ),
    { name: 'Project Store' }
  )
);

// Video Store - Video player, timeline, effects
export const useVideoStore = create(
  devtools(
    immer((set, get) => ({
      // Video player state
      currentVideo: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      muted: false,
      playbackRate: 1,
      
      // Video actions
      setCurrentVideo: (video) => set((state) => {
        state.currentVideo = video;
        state.currentTime = 0;
        state.isPlaying = false;
      }),
      setPlaying: (playing) => set((state) => {
        state.isPlaying = playing;
      }),
      setCurrentTime: (time) => set((state) => {
        state.currentTime = time;
      }),
      setDuration: (duration) => set((state) => {
        state.duration = duration;
      }),
      setVolume: (volume) => set((state) => {
        state.volume = Math.max(0, Math.min(1, volume));
      }),
      setMuted: (muted) => set((state) => {
        state.muted = muted;
      }),
      setPlaybackRate: (rate) => set((state) => {
        state.playbackRate = rate;
      }),
      
      // Timeline state
      timelineZoom: 1,
      timelinePosition: 0,
      selectedClips: [],
      
      // Timeline actions
      setTimelineZoom: (zoom) => set((state) => {
        state.timelineZoom = Math.max(0.1, Math.min(10, zoom));
      }),
      setTimelinePosition: (position) => set((state) => {
        state.timelinePosition = position;
      }),
      setSelectedClips: (clips) => set((state) => {
        state.selectedClips = clips;
      }),
      addSelectedClip: (clipId) => set((state) => {
        if (!state.selectedClips.includes(clipId)) {
          state.selectedClips.push(clipId);
        }
      }),
      removeSelectedClip: (clipId) => set((state) => {
        state.selectedClips = state.selectedClips.filter(id => id !== clipId);
      }),
      clearSelectedClips: () => set((state) => {
        state.selectedClips = [];
      }),
      
      // Effects state
      availableEffects: [],
      appliedEffects: [],
      
      // Effects actions
      setAvailableEffects: (effects) => set((state) => {
        state.availableEffects = effects;
      }),
      addEffect: (effect) => set((state) => {
        const newEffect = {
          id: Date.now().toString(),
          ...effect,
        };
        state.appliedEffects.push(newEffect);
      }),
      updateEffect: (id, updates) => set((state) => {
        const effectIndex = state.appliedEffects.findIndex(e => e.id === id);
        if (effectIndex !== -1) {
          state.appliedEffects[effectIndex] = {
            ...state.appliedEffects[effectIndex],
            ...updates,
          };
        }
      }),
      removeEffect: (id) => set((state) => {
        state.appliedEffects = state.appliedEffects.filter(e => e.id !== id);
      }),
      clearEffects: () => set((state) => {
        state.appliedEffects = [];
      }),
    })),
    { name: 'Video Store' }
  )
);

// Cache Store - API responses, computed values
export const useCacheStore = create(
  devtools(
    immer((set, get) => ({
      cache: new Map(),
      cacheTimestamps: new Map(),
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      
      // Cache actions
      setCache: (key, value, ttl) => set((state) => {
        state.cache.set(key, value);
        state.cacheTimestamps.set(key, Date.now() + (ttl || state.defaultTTL));
      }),
      getCache: (key) => {
        const { cache, cacheTimestamps } = get();
        const timestamp = cacheTimestamps.get(key);
        
        if (!timestamp || Date.now() > timestamp) {
          // Cache expired
          cache.delete(key);
          cacheTimestamps.delete(key);
          return null;
        }
        
        return cache.get(key);
      },
      invalidateCache: (key) => set((state) => {
        if (key) {
          state.cache.delete(key);
          state.cacheTimestamps.delete(key);
        } else {
          // Clear all cache
          state.cache.clear();
          state.cacheTimestamps.clear();
        }
      }),
      
      // Cache utilities
      getCacheSize: () => get().cache.size,
      cleanExpiredCache: () => set((state) => {
        const now = Date.now();
        for (const [key, timestamp] of state.cacheTimestamps.entries()) {
          if (now > timestamp) {
            state.cache.delete(key);
            state.cacheTimestamps.delete(key);
          }
        }
      }),
    })),
    { name: 'Cache Store' }
  )
);

// Performance Store - Metrics, optimization flags
export const usePerformanceStore = create(
  devtools(
    immer((set, get) => ({
      // Performance metrics
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      
      // Optimization flags
      enableVirtualization: true,
      enableMemoization: true,
      enableLazyLoading: true,
      batchUpdates: true,
      
      // Performance actions
      incrementRenderCount: () => set((state) => {
        state.renderCount += 1;
      }),
      setRenderTime: (time) => set((state) => {
        state.lastRenderTime = time;
        state.averageRenderTime = (
          (state.averageRenderTime * (state.renderCount - 1) + time) / state.renderCount
        );
      }),
      setOptimizationFlag: (flag, value) => set((state) => {
        state[flag] = value;
      }),
      
      // Performance utilities
      getPerformanceMetrics: () => {
        const { renderCount, lastRenderTime, averageRenderTime } = get();
        return {
          renderCount,
          lastRenderTime,
          averageRenderTime,
          performance: averageRenderTime < 16 ? 'good' : averageRenderTime < 33 ? 'fair' : 'poor',
        };
      },
    })),
    { name: 'Performance Store' }
  )
);

// Export store selectors for optimized subscriptions
export const uiSelectors = {
  theme: (state) => state.theme,
  sidebarOpen: (state) => state.sidebarOpen,
  modals: (state) => state.modals,
  loading: (state) => state.loading,
  notifications: (state) => state.notifications,
};

export const projectSelectors = {
  projects: (state) => state.projects,
  currentProject: (state) => state.currentProject,
  recentProjects: (state) => state.recentProjects,
  filteredProjects: (state) => state.getFilteredProjects(),
};

export const videoSelectors = {
  currentVideo: (state) => state.currentVideo,
  isPlaying: (state) => state.isPlaying,
  currentTime: (state) => state.currentTime,
  selectedClips: (state) => state.selectedClips,
  appliedEffects: (state) => state.appliedEffects,
};

// Store cleanup utility
export const cleanupStores = () => {
  useCacheStore.getState().cleanExpiredCache();
};

// Auto cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupStores, 5 * 60 * 1000);
}