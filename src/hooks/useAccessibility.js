/**
 * Accessibility hooks for React components
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import {
  focusUtils,
  keyboardUtils,
  ariaUtils,
  liveAnnouncer,
  motionUtils,
  highContrastUtils,
} from '../utils/accessibility';

// Hook for focus management
export const useFocusManagement = (options = {}) => {
  const {
    trapFocus = false,
    restoreFocus = true,
    initialFocus = null,
  } = options;

  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const cleanupRef = useRef(null);

  const saveFocus = useCallback(() => {
    previousFocusRef.current = focusUtils.saveFocus();
  }, []);

  const restorePreviousFocus = useCallback(() => {
    if (restoreFocus && previousFocusRef.current) {
      focusUtils.restoreFocus(previousFocusRef.current);
    }
  }, [restoreFocus]);

  const setupFocusTrap = useCallback(() => {
    if (trapFocus && containerRef.current) {
      cleanupRef.current = focusUtils.trapFocus(
        containerRef.current,
        initialFocus
      );
    }
  }, [trapFocus, initialFocus]);

  const cleanup = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (trapFocus) {
      saveFocus();
      setupFocusTrap();
    }

    return () => {
      cleanup();
      if (trapFocus) {
        restorePreviousFocus();
      }
    };
  }, [trapFocus, saveFocus, setupFocusTrap, cleanup, restorePreviousFocus]);

  return {
    containerRef,
    saveFocus,
    restoreFocus: restorePreviousFocus,
    setupFocusTrap,
    cleanup,
  };
};

// Hook for keyboard navigation
export const useKeyboardNavigation = (items, options = {}) => {
  const {
    orientation = 'vertical',
    loop = true,
    initialIndex = 0,
    onNavigate = null,
  } = options;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handleKeyDown = useCallback(
    (e) => {
      const newIndex = keyboardUtils.handleArrowNavigation(
        e,
        items,
        currentIndex,
        {
          orientation,
          loop,
          onNavigate: (index, item) => {
            setCurrentIndex(index);
            if (onNavigate) {
              onNavigate(index, item);
            }
          },
        }
      );
    },
    [items, currentIndex, orientation, loop, onNavigate]
  );

  const moveTo = useCallback(
    (index) => {
      if (index >= 0 && index < items.length) {
        setCurrentIndex(index);
        if (onNavigate) {
          onNavigate(index, items[index]);
        }
      }
    },
    [items, onNavigate]
  );

  const moveNext = useCallback(() => {
    const nextIndex = loop && currentIndex === items.length - 1 ? 0 : Math.min(currentIndex + 1, items.length - 1);
    moveTo(nextIndex);
  }, [currentIndex, items.length, loop, moveTo]);

  const movePrevious = useCallback(() => {
    const prevIndex = loop && currentIndex === 0 ? items.length - 1 : Math.max(currentIndex - 1, 0);
    moveTo(prevIndex);
  }, [currentIndex, items.length, loop, moveTo]);

  return {
    currentIndex,
    handleKeyDown,
    moveTo,
    moveNext,
    movePrevious,
  };
};

// Hook for ARIA attributes management
export const useAriaAttributes = (initialAttributes = {}) => {
  const [attributes, setAttributes] = useState(initialAttributes);
  const elementRef = useRef(null);

  const updateAttributes = useCallback((newAttributes) => {
    setAttributes(prev => ({ ...prev, ...newAttributes }));
  }, []);

  const setAttribute = useCallback((key, value) => {
    setAttributes(prev => ({ ...prev, [key]: value }));
  }, []);

  const removeAttribute = useCallback((key) => {
    setAttributes(prev => {
      const newAttributes = { ...prev };
      delete newAttributes[key];
      return newAttributes;
    });
  }, []);

  const toggleExpanded = useCallback((expanded = null) => {
    if (elementRef.current) {
      const newExpanded = ariaUtils.toggleExpanded(elementRef.current, expanded);
      setAttribute('aria-expanded', newExpanded.toString());
      return newExpanded;
    }
    return false;
  }, [setAttribute]);

  const setSelected = useCallback((selected) => {
    setAttribute('aria-selected', selected.toString());
  }, [setAttribute]);

  const setPressed = useCallback((pressed) => {
    setAttribute('aria-pressed', pressed.toString());
  }, [setAttribute]);

  const setChecked = useCallback((checked) => {
    setAttribute('aria-checked', checked.toString());
  }, [setAttribute]);

  // Apply attributes to element when they change
  useEffect(() => {
    if (elementRef.current) {
      ariaUtils.setAttributes(elementRef.current, attributes);
    }
  }, [attributes]);

  return {
    elementRef,
    attributes,
    updateAttributes,
    setAttribute,
    removeAttribute,
    toggleExpanded,
    setSelected,
    setPressed,
    setChecked,
  };
};

// Hook for live announcements
export const useLiveAnnouncer = () => {
  const announce = useCallback((message, priority = 'polite') => {
    liveAnnouncer.announce(message, priority);
  }, []);

  const announceImmediate = useCallback((message) => {
    liveAnnouncer.announceImmediate(message);
  }, []);

  return {
    announce,
    announceImmediate,
  };
};

// Hook for unique IDs
export const useUniqueId = (prefix = 'id') => {
  const [id] = useState(() => ariaUtils.generateId(prefix));
  return id;
};

// Hook for reduced motion preferences
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => motionUtils.prefersReducedMotion()
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const getSafeAnimationDuration = useCallback(
    (defaultDuration) => motionUtils.getSafeAnimationDuration(defaultDuration),
    []
  );

  const createMotionSafeCSS = useCallback(
    (animations) => motionUtils.createMotionSafeCSS(animations),
    []
  );

  return {
    prefersReducedMotion,
    getSafeAnimationDuration,
    createMotionSafeCSS,
  };
};

// Hook for high contrast mode
export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = useState(
    () => highContrastUtils.isHighContrastMode()
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    
    const handleChange = (e) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const getHighContrastStyles = useCallback(
    (normalStyles, highContrastStyles) => 
      highContrastUtils.getHighContrastStyles(normalStyles, highContrastStyles),
    []
  );

  return {
    isHighContrast,
    getHighContrastStyles,
  };
};

// Hook for escape key handling
export const useEscapeKey = (callback, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      keyboardUtils.handleEscape(e, callback);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callback, enabled]);
};

// Hook for click outside detection with accessibility considerations
export const useClickOutside = (callback, enabled = true) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        // Don't close if the click was on a focusable element that might be related
        const focusableElements = focusUtils.getFocusableElements();
        const clickedFocusable = focusableElements.includes(event.target);
        
        // Allow callback to decide based on the clicked element
        callback(event, clickedFocusable);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [callback, enabled]);

  return ref;
};

// Hook for managing disclosure widgets (dropdowns, accordions, etc.)
export const useDisclosure = (options = {}) => {
  const {
    defaultOpen = false,
    onOpen = null,
    onClose = null,
  } = options;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { announce } = useLiveAnnouncer();
  const triggerId = useUniqueId('disclosure-trigger');
  const contentId = useUniqueId('disclosure-content');

  const open = useCallback(() => {
    setIsOpen(true);
    if (onOpen) onOpen();
    announce('Expanded');
  }, [onOpen, announce]);

  const close = useCallback(() => {
    setIsOpen(false);
    if (onClose) onClose();
    announce('Collapsed');
  }, [onClose, announce]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const triggerProps = {
    id: triggerId,
    'aria-expanded': isOpen,
    'aria-controls': contentId,
    onClick: toggle,
    onKeyDown: (e) => {
      keyboardUtils.handleActivation(e, toggle);
    },
  };

  const contentProps = {
    id: contentId,
    'aria-labelledby': triggerId,
    hidden: !isOpen,
  };

  return {
    isOpen,
    open,
    close,
    toggle,
    triggerProps,
    contentProps,
    triggerId,
    contentId,
  };
};

// Hook for managing roving tabindex
export const useRovingTabIndex = (items, options = {}) => {
  const {
    orientation = 'horizontal',
    loop = true,
    defaultIndex = 0,
  } = options;

  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  const getTabIndex = useCallback(
    (index) => (index === activeIndex ? 0 : -1),
    [activeIndex]
  );

  const handleKeyDown = useCallback(
    (e, index) => {
      const newIndex = keyboardUtils.handleArrowNavigation(
        e,
        items,
        index,
        {
          orientation,
          loop,
          onNavigate: (newIdx) => {
            setActiveIndex(newIdx);
            // Focus the new active element
            const newActiveElement = items[newIdx];
            if (newActiveElement && newActiveElement.focus) {
              newActiveElement.focus();
            }
          },
        }
      );
    },
    [items, orientation, loop]
  );

  const updateActiveIndex = useCallback(
    (index) => {
      if (index >= 0 && index < items.length) {
        setActiveIndex(index);
      }
    },
    [items.length]
  );

  return {
    activeIndex,
    getTabIndex,
    handleKeyDown,
    setActiveIndex: updateActiveIndex,
  };
};

export default {
  useFocusManagement,
  useKeyboardNavigation,
  useAriaAttributes,
  useLiveAnnouncer,
  useUniqueId,
  useReducedMotion,
  useHighContrast,
  useEscapeKey,
  useClickOutside,
  useDisclosure,
  useRovingTabIndex,
};