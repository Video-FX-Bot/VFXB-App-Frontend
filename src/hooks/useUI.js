import { useState, useEffect, useCallback, useRef } from 'react';
import useUIStore from '../context/uiStore';
import { storage, debounce } from '../utils';
import { UI_CONFIG, KEYBOARD_SHORTCUTS, STORAGE_KEYS } from '../constants';

// Custom hook for UI state management
export const useUI = () => {
  const {
    theme,
    sidebarOpen,
    sidebarCollapsed,
    activeTab,
    modalOpen,
    modalProps,
    loading,
    loadingMessage,
    notifications,
    layout,
    workspace,
    performance: performanceSettings,
    setTheme,
    setSidebarOpen,
    setSidebarCollapsed,
    setActiveTab,
    setModalOpen,
    setModalProps,
    setLoading,
    setLoadingMessage,
    addNotification,
    removeNotification,
    clearNotifications,
    setLayout,
    setWorkspace,
    updatePerformance,
  } = useUIStore();

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < UI_CONFIG.BREAKPOINTS.MD);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= UI_CONFIG.BREAKPOINTS.MD && 
    window.innerWidth < UI_CONFIG.BREAKPOINTS.LG
  );
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(new Map());
  const resizeTimeoutRef = useRef(null);

  // Handle window resize
  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    setWindowSize({ width, height });
    setIsMobile(width < UI_CONFIG.BREAKPOINTS.MD);
    setIsTablet(width >= UI_CONFIG.BREAKPOINTS.MD && width < UI_CONFIG.BREAKPOINTS.LG);
    
    // Auto-collapse sidebar on mobile
    if (width < UI_CONFIG.BREAKPOINTS.MD && sidebarOpen) {
      setSidebarOpen(false);
    }
    
    // Update layout based on screen size
    setLayout(prevLayout => ({
      ...prevLayout,
      screenSize: width < UI_CONFIG.BREAKPOINTS.MD ? 'mobile' : 
                  width < UI_CONFIG.BREAKPOINTS.LG ? 'tablet' : 'desktop',
      sidebarWidth: sidebarCollapsed ? UI_CONFIG.SIDEBAR_COLLAPSED_WIDTH : UI_CONFIG.SIDEBAR_WIDTH,
    }));
  }, [sidebarOpen, sidebarCollapsed, setSidebarOpen, setLayout]);

  // Debounced resize handler
  const debouncedResize = useCallback(
    debounce(handleResize, 150),
    [handleResize]
  );

  // Toggle theme
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    storage.set(STORAGE_KEYS.THEME, newTheme);
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Add notification
    addNotification({
      id: `theme_${Date.now()}`,
      type: 'info',
      title: 'Theme Changed',
      message: `Switched to ${newTheme} theme`,
      duration: 2000,
    });
  }, [theme, setTheme, addNotification]);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
    
    // Save state
    storage.set(STORAGE_KEYS.SIDEBAR_STATE, {
      open: !sidebarOpen,
      collapsed: !sidebarCollapsed,
    });
  }, [isMobile, sidebarOpen, sidebarCollapsed, setSidebarOpen, setSidebarCollapsed]);

  // Open modal
  const openModal = useCallback((component, props = {}) => {
    setModalProps({ component, ...props });
    setModalOpen(true);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }, [setModalProps, setModalOpen]);

  // Close modal
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalProps({});
    
    // Restore body scroll
    document.body.style.overflow = 'unset';
  }, [setModalOpen, setModalProps]);

  // Show loading
  const showLoading = useCallback((message = 'Loading...') => {
    setLoading(true);
    setLoadingMessage(message);
  }, [setLoading, setLoadingMessage]);

  // Hide loading
  const hideLoading = useCallback(() => {
    setLoading(false);
    setLoadingMessage('');
  }, [setLoading, setLoadingMessage]);

  // Show notification
  const showNotification = useCallback((notification) => {
    const id = notification.id || `notification_${Date.now()}`;
    const fullNotification = {
      id,
      type: 'info',
      duration: 5000,
      timestamp: new Date(),
      read: false,
      ...notification,
    };
    
    addNotification(fullNotification);
    
    // Auto-remove after duration
    if (fullNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, fullNotification.duration);
    }
    
    return id;
  }, [addNotification, removeNotification]);

  // Show success notification
  const showSuccess = useCallback((message, title = 'Success') => {
    return showNotification({
      type: 'success',
      title,
      message,
      duration: 3000,
    });
  }, [showNotification]);

  // Show error notification
  const showError = useCallback((message, title = 'Error') => {
    return showNotification({
      type: 'error',
      title,
      message,
      duration: 0, // Don't auto-dismiss errors
    });
  }, [showNotification]);

  // Show warning notification
  const showWarning = useCallback((message, title = 'Warning') => {
    return showNotification({
      type: 'warning',
      title,
      message,
      duration: 5000,
    });
  }, [showNotification]);

  // Register keyboard shortcut
  const registerShortcut = useCallback((key, handler, description = '') => {
    setKeyboardShortcuts(prev => {
      const newMap = new Map(prev);
      newMap.set(key, { handler, description });
      return newMap;
    });
  }, []);

  // Unregister keyboard shortcut
  const unregisterShortcut = useCallback((key) => {
    setKeyboardShortcuts(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    const key = [
      e.ctrlKey && 'ctrl',
      e.shiftKey && 'shift',
      e.altKey && 'alt',
      e.metaKey && 'meta',
      e.key.toLowerCase()
    ].filter(Boolean).join('+');
    
    const shortcut = keyboardShortcuts.get(key);
    if (shortcut) {
      e.preventDefault();
      shortcut.handler(e);
      
      // Track shortcut usage
      updatePerformance({
        shortcutsUsed: performanceSettings.shortcutsUsed + 1,
      });
    }
  }, [keyboardShortcuts, performanceSettings.shortcutsUsed, updatePerformance]);

  // Update workspace layout
  const updateWorkspaceLayout = useCallback((updates) => {
    const newWorkspace = { ...workspace, ...updates };
    setWorkspace(newWorkspace);
    storage.set(STORAGE_KEYS.WORKSPACE_LAYOUT, newWorkspace);
  }, [workspace, setWorkspace]);

  // Get responsive breakpoint
  const getBreakpoint = useCallback(() => {
    const width = windowSize.width;
    if (width < UI_CONFIG.BREAKPOINTS.SM) return 'xs';
    if (width < UI_CONFIG.BREAKPOINTS.MD) return 'sm';
    if (width < UI_CONFIG.BREAKPOINTS.LG) return 'md';
    if (width < UI_CONFIG.BREAKPOINTS.XL) return 'lg';
    if (width < UI_CONFIG.BREAKPOINTS['2XL']) return 'xl';
    return '2xl';
  }, [windowSize.width]);

  // Check if screen size matches breakpoint
  const matchesBreakpoint = useCallback((breakpoint) => {
    const width = windowSize.width;
    const breakpoints = UI_CONFIG.BREAKPOINTS;
    
    switch (breakpoint) {
      case 'sm': return width >= breakpoints.SM;
      case 'md': return width >= breakpoints.MD;
      case 'lg': return width >= breakpoints.LG;
      case 'xl': return width >= breakpoints.XL;
      case '2xl': return width >= breakpoints['2XL'];
      default: return false;
    }
  }, [windowSize.width]);

  // Initialize UI state from storage
  useEffect(() => {
    // Load theme
    const savedTheme = storage.get(STORAGE_KEYS.THEME, 'light');
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Load sidebar state
    const savedSidebarState = storage.get(STORAGE_KEYS.SIDEBAR_STATE, {
      open: true,
      collapsed: false,
    });
    setSidebarOpen(savedSidebarState.open);
    setSidebarCollapsed(savedSidebarState.collapsed);
    
    // Load workspace layout
    const savedWorkspace = storage.get(STORAGE_KEYS.WORKSPACE_LAYOUT, workspace);
    setWorkspace(savedWorkspace);
  }, [setTheme, setSidebarOpen, setSidebarCollapsed, setWorkspace]);

  // Register default keyboard shortcuts
  useEffect(() => {
    registerShortcut(KEYBOARD_SHORTCUTS.TOGGLE_SIDEBAR, toggleSidebar, 'Toggle sidebar');
    registerShortcut(KEYBOARD_SHORTCUTS.TOGGLE_THEME, toggleTheme, 'Toggle theme');
  }, [registerShortcut, toggleSidebar, toggleTheme]);

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('resize', debouncedResize);
    window.addEventListener('keydown', handleKeyDown);
    
    // Initial resize call
    handleResize();
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('keydown', handleKeyDown);
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [debouncedResize, handleKeyDown, handleResize]);

  // Performance monitoring
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      updatePerformance({
        renderTime: endTime - startTime,
        lastRender: new Date(),
      });
    };
  }, [updatePerformance]);

  return {
    // State
    theme,
    sidebarOpen,
    sidebarCollapsed,
    activeTab,
    modalOpen,
    modalProps,
    loading,
    loadingMessage,
    notifications,
    layout,
    workspace,
    windowSize,
    isMobile,
    isTablet,
    
    // Actions
    toggleTheme,
    toggleSidebar,
    setActiveTab,
    openModal,
    closeModal,
    showLoading,
    hideLoading,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    removeNotification,
    clearNotifications,
    updateWorkspaceLayout,
    
    // Keyboard shortcuts
    registerShortcut,
    unregisterShortcut,
    keyboardShortcuts,
    
    // Responsive utilities
    getBreakpoint,
    matchesBreakpoint,
    
    // Utilities
    isDesktop: !isMobile && !isTablet,
    currentBreakpoint: getBreakpoint(),
  };
};

export default useUI;