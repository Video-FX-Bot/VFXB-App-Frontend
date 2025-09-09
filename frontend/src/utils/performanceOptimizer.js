// Performance Optimization Utilities for VFXB MVP

/**
 * Web Worker for background video processing
 */
class VideoProcessingWorker {
  constructor() {
    this.worker = null;
    this.isSupported = typeof Worker !== 'undefined';
    this.processingQueue = [];
    this.isProcessing = false;
  }

  init() {
    if (!this.isSupported) {
      console.warn('Web Workers not supported in this browser');
      return false;
    }

    // Create worker from inline script for video processing
    const workerScript = `
      self.onmessage = function(e) {
        const { type, data, id } = e.data;
        
        switch(type) {
          case 'PROCESS_FRAME':
            processFrame(data, id);
            break;
          case 'GENERATE_THUMBNAIL':
            generateThumbnail(data, id);
            break;
          case 'EXTRACT_AUDIO':
            extractAudio(data, id);
            break;
          case 'APPLY_FILTER':
            applyFilter(data, id);
            break;
        }
      };
      
      function processFrame(frameData, id) {
        // Simulate frame processing
        setTimeout(() => {
          self.postMessage({
            type: 'FRAME_PROCESSED',
            id: id,
            result: frameData // In real implementation, this would be processed frame
          });
        }, 100);
      }
      
      function generateThumbnail(videoData, id) {
        // Simulate thumbnail generation
        setTimeout(() => {
          self.postMessage({
            type: 'THUMBNAIL_GENERATED',
            id: id,
            result: 'data:image/jpeg;base64,thumbnail_data'
          });
        }, 200);
      }
      
      function extractAudio(videoData, id) {
        // Simulate audio extraction
        setTimeout(() => {
          self.postMessage({
            type: 'AUDIO_EXTRACTED',
            id: id,
            result: { waveform: [], duration: 0 }
          });
        }, 500);
      }
      
      function applyFilter(filterData, id) {
        // Simulate filter application
        setTimeout(() => {
          self.postMessage({
            type: 'FILTER_APPLIED',
            id: id,
            result: filterData
          });
        }, 300);
      }
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
    
    this.worker.onmessage = (e) => {
      this.handleWorkerMessage(e.data);
    };

    this.worker.onerror = (error) => {
      console.error('Worker error:', error);
    };

    return true;
  }

  handleWorkerMessage(data) {
    const { type, id, result } = data;
    
    // Find and resolve the corresponding promise
    const queueItem = this.processingQueue.find(item => item.id === id);
    if (queueItem) {
      queueItem.resolve(result);
      this.processingQueue = this.processingQueue.filter(item => item.id !== id);
    }
    
    this.processNextInQueue();
  }

  processNextInQueue() {
    if (this.processingQueue.length > 0 && !this.isProcessing) {
      this.isProcessing = true;
      const nextItem = this.processingQueue[0];
      this.worker.postMessage({
        type: nextItem.type,
        data: nextItem.data,
        id: nextItem.id
      });
    } else {
      this.isProcessing = false;
    }
  }

  addToQueue(type, data) {
    return new Promise((resolve, reject) => {
      const id = Date.now() + Math.random();
      this.processingQueue.push({
        id,
        type,
        data,
        resolve,
        reject
      });
      
      if (!this.isProcessing) {
        this.processNextInQueue();
      }
    });
  }

  processFrame(frameData) {
    return this.addToQueue('PROCESS_FRAME', frameData);
  }

  generateThumbnail(videoData) {
    return this.addToQueue('GENERATE_THUMBNAIL', videoData);
  }

  extractAudio(videoData) {
    return this.addToQueue('EXTRACT_AUDIO', videoData);
  }

  applyFilter(filterData) {
    return this.addToQueue('APPLY_FILTER', filterData);
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

/**
 * Smart Caching System for Video Assets
 */
class SmartCache {
  constructor(maxSize = 100 * 1024 * 1024) { // 100MB default
    this.cache = new Map();
    this.maxSize = maxSize;
    this.currentSize = 0;
    this.accessTimes = new Map();
    this.hitCount = 0;
    this.missCount = 0;
  }

  set(key, value, priority = 1) {
    const size = this.calculateSize(value);
    
    // Check if we need to evict items
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLeastRecentlyUsed();
    }

    // Add new item
    if (this.cache.has(key)) {
      this.currentSize -= this.calculateSize(this.cache.get(key));
    }

    this.cache.set(key, { value, size, priority, timestamp: Date.now() });
    this.accessTimes.set(key, Date.now());
    this.currentSize += size;
  }

  get(key) {
    if (this.cache.has(key)) {
      this.accessTimes.set(key, Date.now());
      this.hitCount++;
      return this.cache.get(key).value;
    }
    
    this.missCount++;
    return null;
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    if (this.cache.has(key)) {
      const item = this.cache.get(key);
      this.currentSize -= item.size;
      this.cache.delete(key);
      this.accessTimes.delete(key);
      return true;
    }
    return false;
  }

  clear() {
    this.cache.clear();
    this.accessTimes.clear();
    this.currentSize = 0;
  }

  evictLeastRecentlyUsed() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  calculateSize(value) {
    if (typeof value === 'string') {
      return value.length * 2; // Approximate size for UTF-16
    }
    if (value instanceof ArrayBuffer) {
      return value.byteLength;
    }
    if (value instanceof Blob) {
      return value.size;
    }
    // Rough estimate for objects
    return JSON.stringify(value).length * 2;
  }

  getStats() {
    return {
      size: this.currentSize,
      maxSize: this.maxSize,
      itemCount: this.cache.size,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0,
      hitCount: this.hitCount,
      missCount: this.missCount
    };
  }
}

/**
 * Progressive Loading Manager
 */
class ProgressiveLoader {
  constructor() {
    this.loadingQueue = [];
    this.loadedChunks = new Map();
    this.isLoading = false;
    this.chunkSize = 1024 * 1024; // 1MB chunks
  }

  async loadVideoProgressively(videoUrl, onProgress) {
    try {
      const response = await fetch(videoUrl);
      const contentLength = response.headers.get('content-length');
      const totalSize = parseInt(contentLength, 10);
      
      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const chunks = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        // Call progress callback
        onProgress?.({
          loaded: receivedLength,
          total: totalSize,
          percentage: (receivedLength / totalSize) * 100
        });
        
        // Store chunk for potential reuse
        this.loadedChunks.set(`${videoUrl}_${chunks.length}`, value);
      }

      // Combine chunks
      const allChunks = new Uint8Array(receivedLength);
      let position = 0;
      
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }

      return allChunks.buffer;
    } catch (error) {
      console.error('Progressive loading failed:', error);
      throw error;
    }
  }

  preloadVideoChunks(videoUrl, startByte = 0, endByte = this.chunkSize) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', videoUrl);
      xhr.setRequestHeader('Range', `bytes=${startByte}-${endByte}`);
      xhr.responseType = 'arraybuffer';
      
      xhr.onload = () => {
        if (xhr.status === 206 || xhr.status === 200) {
          const chunkKey = `${videoUrl}_${startByte}_${endByte}`;
          this.loadedChunks.set(chunkKey, xhr.response);
          resolve(xhr.response);
        } else {
          reject(new Error(`Failed to load chunk: ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send();
    });
  }
}

/**
 * Memory Management Utilities
 */
class MemoryManager {
  constructor() {
    this.memoryUsage = 0;
    this.memoryLimit = this.getMemoryLimit();
    this.cleanupCallbacks = [];
  }

  getMemoryLimit() {
    // Estimate available memory (conservative approach)
    if (navigator.deviceMemory) {
      return navigator.deviceMemory * 1024 * 1024 * 1024 * 0.5; // Use 50% of device memory
    }
    return 2 * 1024 * 1024 * 1024; // Default to 2GB
  }

  trackMemoryUsage(size) {
    this.memoryUsage += size;
    this.checkMemoryPressure();
  }

  releaseMemory(size) {
    this.memoryUsage = Math.max(0, this.memoryUsage - size);
  }

  checkMemoryPressure() {
    const usagePercentage = (this.memoryUsage / this.memoryLimit) * 100;
    
    if (usagePercentage > 80) {
      console.warn('High memory usage detected:', usagePercentage.toFixed(2) + '%');
      this.triggerCleanup();
    }
  }

  addCleanupCallback(callback) {
    this.cleanupCallbacks.push(callback);
  }

  triggerCleanup() {
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Cleanup callback failed:', error);
      }
    });
  }

  getMemoryStats() {
    return {
      usage: this.memoryUsage,
      limit: this.memoryLimit,
      percentage: (this.memoryUsage / this.memoryLimit) * 100,
      available: this.memoryLimit - this.memoryUsage
    };
  }
}

// Export singleton instances
export const videoWorker = new VideoProcessingWorker();
export const smartCache = new SmartCache();
export const progressiveLoader = new ProgressiveLoader();
export const memoryManager = new MemoryManager();

// Initialize worker
if (typeof window !== 'undefined') {
  videoWorker.init();
}

// Export classes for custom instances
export {
  VideoProcessingWorker,
  SmartCache,
  ProgressiveLoader,
  MemoryManager
};