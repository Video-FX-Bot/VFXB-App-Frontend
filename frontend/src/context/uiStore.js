import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useUIStore = create(
  devtools(
    (set, get) => ({
      // Theme and appearance
      theme: 'light', // 'light' | 'dark' | 'system'
      sidebarOpen: true,
      sidebarCollapsed: false,
      activeTab: 'chat', // 'chat' | 'history' | 'settings'
      
      // Modal states
      modalOpen: false,
      modalProps: {},
      modals: {
        settings: false,
        export: false,
        share: false,
        help: false,
        profile: false
      },
      
      // Loading states
      loading: {
        global: false,
        video: false,
        ai: false,
        export: false
      },
      loadingMessage: '',
      
      // Notifications
      notifications: [],
      
      // Layout preferences
      layout: {
        videoPlayerSize: 'large', // 'small' | 'medium' | 'large'
        sidebarWidth: 400,
        timelineHeight: 120,
        showTimeline: true,
        showMinimap: false
      },
      
      // Workspace state
      workspace: {
        zoom: 1,
        panX: 0,
        panY: 0,
        selectedTool: 'select', // 'select' | 'cut' | 'trim' | 'text' | 'audio'
        snapToGrid: true,
        gridSize: 10
      },
      
      // Performance settings
      performance: {
        autoSave: true,
        autoSaveInterval: 30000, // 30 seconds
        previewQuality: 'medium', // 'low' | 'medium' | 'high'
        enableGPUAcceleration: true,
        maxUndoSteps: 50
      },
      
      // Actions
      setTheme: (theme) => {
        set({ theme });
        
        // Apply theme to document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          // System theme
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
      
      toggleSidebar: () => {
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed
        }));
      },
      
      setSidebarOpen: (open) => {
        set({ sidebarOpen: open });
      },
      
      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },
      
      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },
      
      setModalOpen: (open) => {
        set({ modalOpen: open });
      },
      
      setModalProps: (props) => {
        set({ modalProps: props });
      },
      
      setLoadingMessage: (message) => {
        set({ loadingMessage: message });
      },
      
      setLayout: (layout) => {
        set({ layout });
      },
      
      // Modal management
      openModal: (modalName) => {
        set((state) => ({
          modals: {
            ...state.modals,
            [modalName]: true
          }
        }));
      },
      
      closeModal: (modalName) => {
        set((state) => ({
          modals: {
            ...state.modals,
            [modalName]: false
          }
        }));
      },
      
      closeAllModals: () => {
        set((state) => ({
          modals: Object.keys(state.modals).reduce((acc, key) => {
            acc[key] = false;
            return acc;
          }, {})
        }));
      },
      
      // Loading states
      setLoading: (type, isLoading) => {
        set((state) => ({
          loading: {
            ...state.loading,
            [type]: isLoading
          }
        }));
      },
      
      setGlobalLoading: (isLoading) => {
        set((state) => ({
          loading: {
            ...state.loading,
            global: isLoading
          }
        }));
      },
      
      // Notification management
      addNotification: (notification) => {
        const id = Date.now();
        const newNotification = {
          id,
          type: 'info', // 'success' | 'error' | 'warning' | 'info'
          duration: 5000,
          ...notification
        };
        
        set((state) => ({
          notifications: [...state.notifications, newNotification]
        }));
        
        // Auto-remove notification
        if (newNotification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }
        
        return id;
      },
      
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      },
      
      clearNotifications: () => {
        set({ notifications: [] });
      },
      
      // Convenience methods for different notification types
      showSuccess: (message, options = {}) => {
        return get().addNotification({
          type: 'success',
          message,
          ...options
        });
      },
      
      showError: (message, options = {}) => {
        return get().addNotification({
          type: 'error',
          message,
          duration: 8000, // Longer duration for errors
          ...options
        });
      },
      
      showWarning: (message, options = {}) => {
        return get().addNotification({
          type: 'warning',
          message,
          ...options
        });
      },
      
      showInfo: (message, options = {}) => {
        return get().addNotification({
          type: 'info',
          message,
          ...options
        });
      },
      
      // Layout management
      updateLayout: (updates) => {
        set((state) => ({
          layout: {
            ...state.layout,
            ...updates
          }
        }));
      },
      
      setSidebarWidth: (width) => {
        set((state) => ({
          layout: {
            ...state.layout,
            sidebarWidth: Math.max(300, Math.min(600, width))
          }
        }));
      },
      
      setVideoPlayerSize: (size) => {
        set((state) => ({
          layout: {
            ...state.layout,
            videoPlayerSize: size
          }
        }));
      },
      
      toggleTimeline: () => {
        set((state) => ({
          layout: {
            ...state.layout,
            showTimeline: !state.layout.showTimeline
          }
        }));
      },
      
      // Workspace management
      setWorkspace: (workspace) => {
        set({ workspace });
      },
      
      updateWorkspace: (updates) => {
        set((state) => ({
          workspace: {
            ...state.workspace,
            ...updates
          }
        }));
      },
      
      setSelectedTool: (tool) => {
        set((state) => ({
          workspace: {
            ...state.workspace,
            selectedTool: tool
          }
        }));
      },
      
      setZoom: (zoom) => {
        set((state) => ({
          workspace: {
            ...state.workspace,
            zoom: Math.max(0.1, Math.min(5, zoom))
          }
        }));
      },
      
      resetWorkspace: () => {
        set((state) => ({
          workspace: {
            ...state.workspace,
            zoom: 1,
            panX: 0,
            panY: 0,
            selectedTool: 'select'
          }
        }));
      },
      
      // Performance settings
      updatePerformance: (updates) => {
        set((state) => ({
          performance: {
            ...state.performance,
            ...updates
          }
        }));
      },
      
      // Keyboard shortcuts
      shortcuts: {
        'ctrl+z': 'undo',
        'ctrl+y': 'redo',
        'ctrl+s': 'save',
        'ctrl+e': 'export',
        'space': 'play_pause',
        'ctrl+/': 'help',
        'escape': 'close_modal'
      },
      
      handleKeyboardShortcut: (key) => {
        const state = get();
        const action = state.shortcuts[key];
        
        switch (action) {
          case 'help':
            state.openModal('help');
            break;
          case 'close_modal':
            state.closeAllModals();
            break;
          // Add more shortcut handlers as needed
          default:
            break;
        }
      },
      
      // Utility functions
      reset: () => {
        set({
          theme: 'light',
          sidebarCollapsed: false,
          activeTab: 'chat',
          modals: {
            settings: false,
            export: false,
            share: false,
            help: false,
            profile: false
          },
          loading: {
            global: false,
            video: false,
            ai: false,
            export: false
          },
          notifications: [],
          layout: {
            videoPlayerSize: 'large',
            sidebarWidth: 400,
            timelineHeight: 120,
            showTimeline: true,
            showMinimap: false
          },
          workspace: {
            zoom: 1,
            panX: 0,
            panY: 0,
            selectedTool: 'select',
            snapToGrid: true,
            gridSize: 10
          }
        });
      },
      
      // Get computed values
      getIsAnyModalOpen: () => {
        const state = get();
        return Object.values(state.modals).some(isOpen => isOpen);
      },
      
      getIsAnyLoading: () => {
        const state = get();
        return Object.values(state.loading).some(isLoading => isLoading);
      }
    }),
    {
      name: 'ui-store'
    }
  )
);

export default useUIStore;