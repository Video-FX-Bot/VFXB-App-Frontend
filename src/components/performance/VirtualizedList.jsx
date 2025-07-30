import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

const VirtualizedList = ({
  items = [],
  itemHeight = 80,
  containerHeight = 400,
  renderItem,
  getItemKey,
  overscan = 5,
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  loadingComponent,
  errorComponent,
  emptyComponent,
  className = '',
  onScroll,
  scrollToIndex,
  enableInfiniteScroll = true,
  threshold = 0.8
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [error, setError] = useState(null);
  const scrollTimeoutRef = useRef(null);
  const lastScrollTop = useRef(0);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Calculate visible range
  const visibleRange = useMemo(() => {
    const containerHeightValue = containerHeight;
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeightValue / itemHeight);
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, start + visibleCount + overscan)
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);
  
  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
      key: getItemKey ? getItemKey(item, visibleRange.start + index) : visibleRange.start + index
    }));
  }, [items, visibleRange, getItemKey]);
  
  // Total height for scrollbar
  const totalHeight = items.length * itemHeight;
  
  // Handle scroll events
  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set timeout to detect scroll end
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
    
    // Call external scroll handler
    onScroll?.({
      scrollTop: newScrollTop,
      scrollDirection: newScrollTop > lastScrollTop.current ? 'down' : 'up',
      isScrolling: true
    });
    
    lastScrollTop.current = newScrollTop;
    
    // Infinite scroll logic
    if (enableInfiniteScroll && hasNextPage && !isLoading && !loadingMore) {
      const scrollPercentage = (newScrollTop + containerHeight) / totalHeight;
      if (scrollPercentage >= threshold) {
        handleLoadMore();
      }
    }
  }, [containerHeight, totalHeight, threshold, enableInfiniteScroll, hasNextPage, isLoading, loadingMore, onScroll]);
  
  // Handle load more
  const handleLoadMore = useCallback(async () => {
    if (!onLoadMore || loadingMore) return;
    
    try {
      setLoadingMore(true);
      setError(null);
      await onLoadMore();
    } catch (err) {
      setError(err.message || 'Failed to load more items');
    } finally {
      setLoadingMore(false);
    }
  }, [onLoadMore, loadingMore]);
  
  // Scroll to specific index
  useEffect(() => {
    if (scrollToIndex !== undefined && containerRef.current) {
      const targetScrollTop = scrollToIndex * itemHeight;
      containerRef.current.scrollTop = targetScrollTop;
      setScrollTop(targetScrollTop);
    }
  }, [scrollToIndex, itemHeight]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);
  
  // Loading component
  const LoadingComponent = loadingComponent || (() => (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
      <span className="text-gray-400">Loading...</span>
    </div>
  ));
  
  // Error component
  const ErrorComponent = errorComponent || (({ error, onRetry }) => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
      <p className="text-red-400 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Retry</span>
      </button>
    </div>
  ));
  
  // Empty component
  const EmptyComponent = emptyComponent || (() => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4">
        <div className="w-8 h-8 bg-gray-600 rounded" />
      </div>
      <p className="text-gray-400">No items to display</p>
    </div>
  ));
  
  // Show loading state
  if (isLoading && items.length === 0) {
    return (
      <div className={`${className}`} style={{ height: containerHeight }}>
        <LoadingComponent />
      </div>
    );
  }
  
  // Show error state
  if (error && items.length === 0) {
    return (
      <div className={`${className}`} style={{ height: containerHeight }}>
        <ErrorComponent error={error} onRetry={() => {
          setError(null);
          handleLoadMore();
        }} />
      </div>
    );
  }
  
  // Show empty state
  if (items.length === 0) {
    return (
      <div className={`${className}`} style={{ height: containerHeight }}>
        <EmptyComponent />
      </div>
    );
  }
  
  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Virtual container */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items */}
        <div
          style={{
            transform: `translateY(${visibleRange.start * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          <AnimatePresence mode="popLayout">
            {visibleItems.map(({ item, index, key }) => (
              <motion.div
                key={key}
                style={{ height: itemHeight }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className={isScrolling ? 'pointer-events-none' : ''}
              >
                {renderItem({ item, index, isScrolling })}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {/* Load more indicator */}
        {enableInfiniteScroll && (loadingMore || (hasNextPage && !isLoading)) && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 60
            }}
            className="flex items-center justify-center"
          >
            {loadingMore ? (
              <div className="flex items-center space-x-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading more...</span>
              </div>
            ) : (
              hasNextPage && (
                <button
                  onClick={handleLoadMore}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  Load More
                </button>
              )
            )}
          </div>
        )}
        
        {/* Error indicator for load more */}
        {error && items.length > 0 && (
          <div
            style={
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 60
            }}
            className="flex items-center justify-center"
          >
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
              <button
                onClick={() => {
                  setError(null);
                  handleLoadMore();
                }}
                className="ml-2 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Scroll indicator */}
      {isScrolling && (
        <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-lg text-sm z-50">
          {Math.round((scrollTop / (totalHeight - containerHeight)) * 100)}%
        </div>
      )}
    </div>
  );
};

// Hook for managing virtualized list state
export const useVirtualizedList = ({
  initialItems = [],
  pageSize = 50,
  loadPage
}) => {
  const [items, setItems] = useState(initialItems);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState(null);
  
  const loadMore = useCallback(async () => {
    if (!loadPage || isLoading || !hasNextPage) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await loadPage(currentPage + 1, pageSize);
      
      if (result.items && result.items.length > 0) {
        setItems(prev => [...prev, ...result.items]);
        setCurrentPage(prev => prev + 1);
        setHasNextPage(result.hasNextPage !== false);
      } else {
        setHasNextPage(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to load items');
    } finally {
      setIsLoading(false);
    }
  }, [loadPage, isLoading, hasNextPage, currentPage, pageSize]);
  
  const reset = useCallback(() => {
    setItems(initialItems);
    setCurrentPage(0);
    setHasNextPage(true);
    setError(null);
    setIsLoading(false);
  }, [initialItems]);
  
  const refresh = useCallback(async () => {
    reset();
    await loadMore();
  }, [reset, loadMore]);
  
  return {
    items,
    isLoading,
    hasNextPage,
    error,
    loadMore,
    reset,
    refresh
  };
};

export default VirtualizedList;