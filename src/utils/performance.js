/**
 * Performance Optimization Utilities
 * Collection of utilities for optimizing React performance and state management
 */

// Debounce function for expensive operations
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

// Throttle function for high-frequency events
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memoization utility for expensive computations
export const memoize = (fn, getKey = (...args) => JSON.stringify(args)) => {
  const cache = new Map();
  
  return (...args) => {
    const key = getKey(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    // Prevent memory leaks by limiting cache size
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
};

// Deep equality check for React dependencies
export const deepEqual = (a, b) => {
  if (a === b) return true;
  
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  
  if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
    return a === b;
  }
  
  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }
  
  if (a.prototype !== b.prototype) return false;
  
  let keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) {
    return false;
  }
  
  return keys.every(k => deepEqual(a[k], b[k]));
};

// Shallow equality check for React props
export const shallowEqual = (a, b) => {
  if (a === b) return true;
  
  if (!a || !b) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => a[key] === b[key]);
};

// Request animation frame utility
export const raf = (callback) => {
  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(callback, 16); // ~60fps fallback
};

// Cancel animation frame utility
export const cancelRaf = (id) => {
  if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
    return window.cancelAnimationFrame(id);
  }
  return clearTimeout(id);
};

// Batch DOM updates
export const batchUpdates = (callback) => {
  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(callback);
    });
  } else {
    setTimeout(callback, 0);
  }
};

// Intersection Observer utility for lazy loading
export const createIntersectionObserver = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };
  
  if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
    return new IntersectionObserver(callback, defaultOptions);
  }
  
  // Fallback for browsers without IntersectionObserver
  return {
    observe: () => {},
    unobserve: () => {},
    disconnect: () => {}
  };
};

// Performance measurement utility
export const measurePerformance = (name, fn) => {
  if (typeof window !== 'undefined' && window.performance) {
    const start = window.performance.now();
    const result = fn();
    const end = window.performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }
  return fn();
};

// Async performance measurement
export const measureAsyncPerformance = async (name, fn) => {
  if (typeof window !== 'undefined' && window.performance) {
    const start = window.performance.now();
    const result = await fn();
    const end = window.performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }
  return await fn();
};

// Memory usage monitoring
export const getMemoryUsage = () => {
  if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
    const memory = window.performance.memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
    };
  }
  return null;
};

// Bundle size analyzer helper
export const analyzeBundle = () => {
  if (typeof window !== 'undefined' && window.performance) {
    const entries = window.performance.getEntriesByType('navigation');
    if (entries.length > 0) {
      const entry = entries[0];
      return {
        domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
        loadComplete: entry.loadEventEnd - entry.loadEventStart,
        totalTime: entry.loadEventEnd - entry.fetchStart
      };
    }
  }
  return null;
};

// Virtual scrolling utility
export const calculateVirtualScrolling = ({
  containerHeight,
  itemHeight,
  itemCount,
  scrollTop,
  overscan = 5
}) => {
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight)
  );
  
  const start = Math.max(0, visibleStart - overscan);
  const end = Math.min(itemCount - 1, visibleEnd + overscan);
  
  return {
    start,
    end,
    visibleStart,
    visibleEnd,
    totalHeight: itemCount * itemHeight,
    offsetY: start * itemHeight
  };
};

// Image optimization utilities
export const optimizeImage = (src, options = {}) => {
  const {
    width,
    height,
    quality = 80,
    format = 'webp'
  } = options;
  
  // This would typically integrate with a service like Cloudinary or similar
  // For now, return the original src with query parameters
  const params = new URLSearchParams();
  if (width) params.append('w', width);
  if (height) params.append('h', height);
  if (quality) params.append('q', quality);
  if (format) params.append('f', format);
  
  return `${src}?${params.toString()}`;
};

// Preload critical resources
export const preloadResource = (href, as = 'script', crossorigin = false) => {
  if (typeof document !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (crossorigin) link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    return link;
  }
  return null;
};

// Prefetch resources for future navigation
export const prefetchResource = (href) => {
  if (typeof document !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
    return link;
  }
  return null;
};

// Web Worker utility for heavy computations
export const createWebWorker = (workerFunction) => {
  if (typeof Worker !== 'undefined') {
    const blob = new Blob([`(${workerFunction.toString()})()`], {
      type: 'application/javascript'
    });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    
    // Clean up blob URL when worker is terminated
    const originalTerminate = worker.terminate;
    worker.terminate = function() {
      URL.revokeObjectURL(workerUrl);
      return originalTerminate.call(this);
    };
    
    return worker;
  }
  return null;
};

// Service Worker registration utility
export const registerServiceWorker = async (swPath = '/sw.js') => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(swPath);
      console.log('Service Worker registered successfully:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

// Cache management utilities
export const cacheManager = {
  set: (key, value, ttl = 300000) => { // 5 minutes default
    const item = {
      value,
      expiry: Date.now() + ttl
    };
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to cache item:', error);
    }
  },
  
  get: (key) => {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;
      
      const item = JSON.parse(itemStr);
      if (Date.now() > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }
      
      return item.value;
    } catch (error) {
      console.warn('Failed to retrieve cached item:', error);
      return null;
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove cached item:', error);
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
};

// Performance monitoring hook helper
export const createPerformanceMonitor = () => {
  const metrics = {
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    slowRenders: []
  };
  
  return {
    startRender: () => {
      metrics.renderStart = performance.now();
    },
    
    endRender: () => {
      if (metrics.renderStart) {
        const renderTime = performance.now() - metrics.renderStart;
        metrics.renderCount++;
        metrics.lastRenderTime = renderTime;
        metrics.averageRenderTime = 
          (metrics.averageRenderTime * (metrics.renderCount - 1) + renderTime) / metrics.renderCount;
        
        if (renderTime > 16) { // Slower than 60fps
          metrics.slowRenders.push({
            time: renderTime,
            timestamp: Date.now()
          });
          
          // Keep only last 10 slow renders
          if (metrics.slowRenders.length > 10) {
            metrics.slowRenders.shift();
          }
        }
        
        delete metrics.renderStart;
      }
    },
    
    getMetrics: () => ({ ...metrics })
  };
};

export default {
  debounce,
  throttle,
  memoize,
  deepEqual,
  shallowEqual,
  raf,
  cancelRaf,
  batchUpdates,
  createIntersectionObserver,
  measurePerformance,
  measureAsyncPerformance,
  getMemoryUsage,
  analyzeBundle,
  calculateVirtualScrolling,
  optimizeImage,
  preloadResource,
  prefetchResource,
  createWebWorker,
  registerServiceWorker,
  cacheManager,
  createPerformanceMonitor
};