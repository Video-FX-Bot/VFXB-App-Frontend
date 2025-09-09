/**
 * Accessibility utilities for WCAG compliance and enhanced user experience
 */

// ARIA live region announcer
class LiveAnnouncer {
  constructor() {
    this.liveRegion = null;
    this.init();
  }

  init() {
    if (typeof document === 'undefined') return;
    
    // Create live region if it doesn't exist
    this.liveRegion = document.getElementById('live-announcer');
    if (!this.liveRegion) {
      this.liveRegion = document.createElement('div');
      this.liveRegion.id = 'live-announcer';
      this.liveRegion.setAttribute('aria-live', 'polite');
      this.liveRegion.setAttribute('aria-atomic', 'true');
      this.liveRegion.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(this.liveRegion);
    }
  }

  announce(message, priority = 'polite') {
    if (!this.liveRegion || !message) return;
    
    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = '';
      }
    }, 1000);
  }

  announceImmediate(message) {
    this.announce(message, 'assertive');
  }
}

export const liveAnnouncer = new LiveAnnouncer();

// Focus management utilities
export const focusUtils = {
  // Get all focusable elements within a container
  getFocusableElements(container = document) {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'audio[controls]',
      'video[controls]',
      'details > summary',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(el => {
        // Check if element is visible and not hidden
        const style = window.getComputedStyle(el);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          el.offsetWidth > 0 &&
          el.offsetHeight > 0
        );
      });
  },

  // Trap focus within a container
  trapFocus(container, initialFocus = null) {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus initial element or first focusable element
    if (initialFocus && focusableElements.includes(initialFocus)) {
      initialFocus.focus();
    } else {
      firstElement.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  },

  // Save and restore focus
  saveFocus() {
    return document.activeElement;
  },

  restoreFocus(element) {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  },

  // Move focus to element with announcement
  moveFocusTo(element, announcement = null) {
    if (element && typeof element.focus === 'function') {
      element.focus();
      if (announcement) {
        liveAnnouncer.announce(announcement);
      }
    }
  },
};

// Keyboard navigation utilities
export const keyboardUtils = {
  // Common keyboard event handlers
  handleArrowNavigation(e, items, currentIndex, options = {}) {
    const {
      orientation = 'vertical', // 'vertical', 'horizontal', 'both'
      loop = true,
      onNavigate = null,
    } = options;

    let newIndex = currentIndex;
    const maxIndex = items.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault();
          newIndex = loop && currentIndex === maxIndex ? 0 : Math.min(currentIndex + 1, maxIndex);
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault();
          newIndex = loop && currentIndex === 0 ? maxIndex : Math.max(currentIndex - 1, 0);
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault();
          newIndex = loop && currentIndex === maxIndex ? 0 : Math.min(currentIndex + 1, maxIndex);
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault();
          newIndex = loop && currentIndex === 0 ? maxIndex : Math.max(currentIndex - 1, 0);
        }
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = maxIndex;
        break;
    }

    if (newIndex !== currentIndex && onNavigate) {
      onNavigate(newIndex, items[newIndex]);
    }

    return newIndex;
  },

  // Handle escape key
  handleEscape(e, callback) {
    if (e.key === 'Escape') {
      e.preventDefault();
      callback();
    }
  },

  // Handle enter/space activation
  handleActivation(e, callback) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  },
};

// ARIA utilities
export const ariaUtils = {
  // Generate unique IDs for ARIA relationships
  generateId(prefix = 'aria') {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Set ARIA attributes
  setAttributes(element, attributes) {
    if (!element) return;
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        element.setAttribute(key, value);
      } else {
        element.removeAttribute(key);
      }
    });
  },

  // Manage ARIA expanded state
  toggleExpanded(element, expanded = null) {
    if (!element) return;
    
    const currentExpanded = element.getAttribute('aria-expanded') === 'true';
    const newExpanded = expanded !== null ? expanded : !currentExpanded;
    
    element.setAttribute('aria-expanded', newExpanded.toString());
    return newExpanded;
  },

  // Manage ARIA selected state
  setSelected(element, selected) {
    if (!element) return;
    element.setAttribute('aria-selected', selected.toString());
  },

  // Manage ARIA pressed state
  setPressed(element, pressed) {
    if (!element) return;
    element.setAttribute('aria-pressed', pressed.toString());
  },

  // Manage ARIA checked state
  setChecked(element, checked) {
    if (!element) return;
    element.setAttribute('aria-checked', checked.toString());
  },

  // Set ARIA label
  setLabel(element, label) {
    if (!element) return;
    if (label) {
      element.setAttribute('aria-label', label);
    } else {
      element.removeAttribute('aria-label');
    }
  },

  // Set ARIA described by
  setDescribedBy(element, ids) {
    if (!element) return;
    if (ids && ids.length > 0) {
      element.setAttribute('aria-describedby', Array.isArray(ids) ? ids.join(' ') : ids);
    } else {
      element.removeAttribute('aria-describedby');
    }
  },

  // Set ARIA labelled by
  setLabelledBy(element, ids) {
    if (!element) return;
    if (ids && ids.length > 0) {
      element.setAttribute('aria-labelledby', Array.isArray(ids) ? ids.join(' ') : ids);
    } else {
      element.removeAttribute('aria-labelledby');
    }
  },
};

// Color contrast utilities
export const contrastUtils = {
  // Calculate relative luminance
  getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  },

  // Calculate contrast ratio
  getContrastRatio(color1, color2) {
    const lum1 = this.getLuminance(...color1);
    const lum2 = this.getLuminance(...color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  },

  // Check if contrast meets WCAG standards
  meetsWCAG(color1, color2, level = 'AA', size = 'normal') {
    const ratio = this.getContrastRatio(color1, color2);
    const requirements = {
      'AA': { normal: 4.5, large: 3 },
      'AAA': { normal: 7, large: 4.5 }
    };
    return ratio >= requirements[level][size];
  },

  // Convert hex to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  },
};

// Screen reader utilities
export const screenReaderUtils = {
  // Hide content from screen readers
  hideFromScreenReader(element) {
    if (!element) return;
    element.setAttribute('aria-hidden', 'true');
  },

  // Show content to screen readers
  showToScreenReader(element) {
    if (!element) return;
    element.removeAttribute('aria-hidden');
  },

  // Create screen reader only text
  createSROnlyText(text) {
    const span = document.createElement('span');
    span.textContent = text;
    span.className = 'sr-only';
    return span;
  },

  // Add screen reader only description
  addSRDescription(element, description) {
    if (!element || !description) return;
    
    const descId = ariaUtils.generateId('desc');
    const descElement = this.createSROnlyText(description);
    descElement.id = descId;
    
    element.appendChild(descElement);
    ariaUtils.setDescribedBy(element, descId);
    
    return descId;
  },
};

// Reduced motion utilities
export const motionUtils = {
  // Check if user prefers reduced motion
  prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Get safe animation duration
  getSafeAnimationDuration(defaultDuration) {
    return this.prefersReducedMotion() ? 0 : defaultDuration;
  },

  // Create motion-safe CSS
  createMotionSafeCSS(animations) {
    if (this.prefersReducedMotion()) {
      return {
        transition: 'none',
        animation: 'none',
      };
    }
    return animations;
  },
};

// High contrast utilities
export const highContrastUtils = {
  // Check if high contrast mode is enabled
  isHighContrastMode() {
    return window.matchMedia('(prefers-contrast: high)').matches;
  },

  // Get high contrast safe styles
  getHighContrastStyles(normalStyles, highContrastStyles) {
    return this.isHighContrastMode() ? highContrastStyles : normalStyles;
  },
};

// Export all utilities
export default {
  liveAnnouncer,
  focusUtils,
  keyboardUtils,
  ariaUtils,
  contrastUtils,
  screenReaderUtils,
  motionUtils,
  highContrastUtils,
};