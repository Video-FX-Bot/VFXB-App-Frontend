import { useCallback, useMemo, useEffect } from 'react';
import { useUIStore, uiSelectors } from '../store';
import { debounce } from '../utils/performance';
import { getStoredTheme, setStoredTheme } from '../utils/theme';

/**
 * Enhanced UI hook with Zustand store integration
 * Optimized for performance with selective subscriptions
 */
export const useUI = () => {
  // Selective subscriptions for optimal performance
  const theme = useUIStore(uiSelectors.theme);
  const sidebarOpen = useUIStore(uiSelectors.sidebarOpen);
  const modals = useUIStore(uiSelectors.modals);
  const loading = useUIStore(uiSelectors.loading);
  const notifications = useUIStore(uiSelectors.notifications);
  
  // Get actions (these don't cause re-renders)
  const {
    setTheme: setStoreTheme,
    toggleTheme: toggleStoreTheme,
    setSidebarOpen,
    toggleSidebar,
    openModal,
    closeModal,
    closeAllModals,
    setLoading,
    addNotification,
    removeNotification,
    clearNotifications,
    windowSize,
    setWindowSize,
    keyboardShortcuts,
    setKeyboardShortcuts,
    loadingMessage,
  } = useUIStore();

  // Debounced window resize handler
  const debouncedResize = useMemo(
    () => debounce(() => {
      const newSize = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      setWindowSize(newSize);
    }, 150),
    [setWindowSize]
  );

  // Window resize effect
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial dimensions
    const initialSize = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    setWindowSize(initialSize);

    // Add resize listener
    window.addEventListener('resize', debouncedResize);
    return () => window.removeEventListener('resize', debouncedResize);
  }, [debouncedResize, setWindowSize]);

  // Enhanced theme setter with persistence
  const setTheme = useCallback((newTheme) => {
    setStoreTheme(newTheme);
    setStoredTheme(newTheme);
    
    // Apply theme to document
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', newTheme);
      document.documentElement.className = newTheme;
    }
  }, [setStoreTheme]);

  // Toggle theme with persistence
  const toggleTheme = useCallback(() => {
    toggleStoreTheme();
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setStoredTheme(newTheme);
    
    // Apply theme to document
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', newTheme);
      document.documentElement.className = newTheme;
    }
  }, [toggleStoreTheme, theme]);

  // Enhanced notification system
  const showNotification = useCallback((notification) => {
    const id = Date.now().toString();
    const enhancedNotification = {
      id,
      type: 'info',
      duration: 5000,
      ...notification,
    };
    
    addNotification(enhancedNotification);
    
    // Auto-remove notification after duration
    if (enhancedNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, enhancedNotification.duration);
    }
    
    return id;
  }, [addNotification, removeNotification]);

  // Convenience notification methods
  const showSuccess = useCallback((message, options = {}) => {
    return showNotification({
      type: 'success',
      message,
      ...options,
    });
  }, [showNotification]);

  const showError = useCallback((message, options = {}) => {
    return showNotification({
      type: 'error',
      message,
      duration: 8000, // Longer duration for errors
      ...options,
    });
  }, [showNotification]);

  const showWarning = useCallback((message, options = {}) => {
    return showNotification({
      type: 'warning',
      message,
      duration: 6000,
      ...options,
    });
  }, [showNotification]);

  const showInfo = useCallback((message, options = {}) => {
    return showNotification({
      type: 'info',
      message,
      ...options,
    });
  }, [showNotification]);

  // Modal helpers
  const isModalOpen = useCallback((modalId) => {
    return modals[modalId]?.isOpen || false;
  }, [modals]);

  const getModalProps = useCallback((modalId) => {
    return modals[modalId]?.props || {};
  }, [modals]);

  // Responsive helpers
  const isMobile = useMemo(() => windowSize.width < 768, [windowSize.width]);
  const isTablet = useMemo(() => windowSize.width >= 768 && windowSize.width < 1024, [windowSize.width]);
  const isDesktop = useMemo(() => windowSize.width >= 1024, [windowSize.width]);
  const isLargeScreen = useMemo(() => windowSize.width >= 1440, [windowSize.width]);

  // Keyboard shortcut handler
  useEffect(() => {
    if (!keyboardShortcuts || typeof window === 'undefined') return;

    const handleKeyDown = (event) => {
      // Ctrl/Cmd + K for command palette
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        openModal('commandPalette');
      }
      
      // Escape to close modals
      if (event.key === 'Escape') {
        closeAllModals();
      }
      
      // Ctrl/Cmd + \ to toggle sidebar
      if ((event.ctrlKey || event.metaKey) && event.key === '\\') {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcuts, openModal, closeAllModals, toggleSidebar]);

  // Initialize theme on mount
  useEffect(() => {
    const storedTheme = getStoredTheme();
    if (storedTheme && storedTheme !== theme) {
      setTheme(storedTheme);
    }
  }, [theme, setTheme]);

  return {
    // Theme
    theme,
    setTheme,
    toggleTheme,
    
    // Sidebar
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    
    // Modals
    modals,
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    getModalProps,
    
    // Loading
    loading,
    loadingMessage,
    setLoading,
    
    // Notifications
    notifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    clearNotifications,
    
    // Window dimensions
    windowSize,
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    
    // Settings
    keyboardShortcuts,
    setKeyboardShortcuts,
  };
};

export default useUI;