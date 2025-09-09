import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../components/ui/Toast';

/**
 * Hook for progressive data fetching with loading states, caching, and error handling
 * @param {Function} fetchFunction - Function that returns a promise with data
 * @param {Array} dependencies - Dependencies that trigger refetch
 * @param {Object} options - Configuration options
 */
export const useProgressiveData = (
  fetchFunction,
  dependencies = [],
  options = {}
) => {
  const {
    immediate = true,
    retryCount = 3,
    retryDelay = 1000,
    cacheKey = null,
    cacheDuration = 5 * 60 * 1000, // 5 minutes
    showToastOnError = false,
    optimisticUpdate = null,
    onSuccess = null,
    onError = null,
    transform = null,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const [retries, setRetries] = useState(0);
  const [lastFetch, setLastFetch] = useState(null);
  
  const mountedRef = useRef(true);
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const { toast } = useToast();

  // Cache management
  const getCachedData = useCallback((key) => {
    if (!key) return null;
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return cached.data;
    }
    return null;
  }, [cacheDuration]);

  const setCachedData = useCallback((key, data) => {
    if (!key) return;
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now()
    });
  }, []);

  // Main fetch function
  const fetchData = useCallback(async (showLoading = true) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache first
    if (cacheKey) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        setData(transform ? transform(cachedData) : cachedData);
        setLoading(false);
        setError(null);
        return cachedData;
      }
    }

    if (!mountedRef.current) return;

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      // Optimistic update
      if (optimisticUpdate) {
        setData(optimisticUpdate);
      }

      const result = await fetchFunction({
        signal: abortControllerRef.current.signal
      });
      
      if (!mountedRef.current) return;

      const transformedData = transform ? transform(result) : result;
      setData(transformedData);
      setLoading(false);
      setRetries(0);
      setLastFetch(Date.now());

      // Cache the result
      if (cacheKey) {
        setCachedData(cacheKey, result);
      }

      // Success callback
      if (onSuccess) {
        onSuccess(transformedData);
      }

      return transformedData;
    } catch (err) {
      if (!mountedRef.current || err.name === 'AbortError') return;

      console.error('Data fetch error:', err);
      
      // Retry logic
      if (retries < retryCount) {
        const delay = retryDelay * Math.pow(2, retries); // Exponential backoff
        setTimeout(() => {
          if (mountedRef.current) {
            setRetries(prev => prev + 1);
            fetchData(showLoading);
          }
        }, delay);
        return;
      }

      // Final error state
      setError(err);
      setLoading(false);

      // Show toast notification
      if (showToastOnError) {
        toast.error(`Failed to load data: ${err.message}`);
      }

      // Error callback
      if (onError) {
        onError(err);
      }

      throw err;
    }
  }, [fetchFunction, retries, retryCount, retryDelay, cacheKey, getCachedData, setCachedData, transform, optimisticUpdate, onSuccess, onError, showToastOnError, toast]);

  // Refresh function
  const refresh = useCallback((showLoading = true) => {
    setRetries(0);
    return fetchData(showLoading);
  }, [fetchData]);

  // Mutate function for optimistic updates
  const mutate = useCallback((newData, shouldRevalidate = true) => {
    setData(newData);
    if (cacheKey) {
      setCachedData(cacheKey, newData);
    }
    if (shouldRevalidate) {
      fetchData(false);
    }
  }, [cacheKey, setCachedData, fetchData]);

  // Clear cache function
  const clearCache = useCallback((key = cacheKey) => {
    if (key) {
      cacheRef.current.delete(key);
    } else {
      cacheRef.current.clear();
    }
  }, [cacheKey]);

  // Initial fetch
  useEffect(() => {
    if (immediate) {
      fetchData();
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, dependencies);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    retries,
    lastFetch,
    refresh,
    mutate,
    clearCache,
    isStale: lastFetch && Date.now() - lastFetch > cacheDuration,
  };
};

/**
 * Hook for paginated data fetching
 */
export const usePaginatedData = (
  fetchFunction,
  dependencies = [],
  options = {}
) => {
  const {
    pageSize = 20,
    initialPage = 1,
    ...restOptions
  } = options;

  const [page, setPage] = useState(initialPage);
  const [allData, setAllData] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPage = useCallback(async ({ signal }) => {
    const result = await fetchFunction({ page, pageSize, signal });
    return result;
  }, [fetchFunction, page, pageSize]);

  const {
    data: pageData,
    loading,
    error,
    refresh: refreshPage,
    ...rest
  } = useProgressiveData(fetchPage, [page, ...dependencies], {
    ...restOptions,
    cacheKey: restOptions.cacheKey ? `${restOptions.cacheKey}_page_${page}` : null,
  });

  // Update aggregated data when page data changes
  useEffect(() => {
    if (pageData) {
      const { items = [], total = 0, hasMore: pageHasMore = false } = pageData;
      
      if (page === 1) {
        setAllData(items);
      } else {
        setAllData(prev => [...prev, ...items]);
      }
      
      setTotalCount(total);
      setHasMore(pageHasMore);
    }
  }, [pageData, page]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  const reset = useCallback(() => {
    setPage(initialPage);
    setAllData([]);
    setHasMore(true);
    setTotalCount(0);
  }, [initialPage]);

  const refresh = useCallback(() => {
    reset();
    return refreshPage();
  }, [reset, refreshPage]);

  return {
    data: allData,
    loading,
    error,
    hasMore,
    totalCount,
    page,
    loadMore,
    refresh,
    reset,
    ...rest,
  };
};

/**
 * Hook for infinite scroll data fetching
 */
export const useInfiniteScroll = (
  fetchFunction,
  dependencies = [],
  options = {}
) => {
  const {
    threshold = 0.1,
    rootMargin = '100px',
    enabled = true,
    ...restOptions
  } = options;

  const {
    data,
    loading,
    hasMore,
    loadMore,
    ...rest
  } = usePaginatedData(fetchFunction, dependencies, restOptions);

  const observerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { threshold, rootMargin }
    );

    if (triggerRef.current) {
      observer.observe(triggerRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, hasMore, loading, loadMore, threshold, rootMargin]);

  return {
    data,
    loading,
    hasMore,
    loadMore,
    triggerRef,
    ...rest,
  };
};

export default useProgressiveData;