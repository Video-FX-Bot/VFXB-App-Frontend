import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const OptimizedImage = ({
  src,
  alt,
  className = '',
  placeholder = null,
  blurDataURL = null,
  priority = false,
  lazy = true,
  quality = 75,
  sizes = '100vw',
  onLoad = () => {},
  onError = () => {},
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the image enters viewport
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [priority, isInView]);

  // Generate responsive image URLs
  const generateSrcSet = (baseSrc) => {
    if (!baseSrc) return '';
    
    const widths = [320, 640, 768, 1024, 1280, 1920];
    return widths
      .map(width => {
        // For demo purposes, using the same image
        // In production, you'd generate different sizes
        return `${baseSrc} ${width}w`;
      })
      .join(', ');
  };

  // Generate WebP URL from original URL
  const generateWebPUrl = (originalUrl) => {
    if (!originalUrl) return '';
    
    // Check if it's a Pexels URL (most common in our app)
    if (originalUrl.includes('pexels.com')) {
      // Add WebP format parameter to Pexels URL
      const url = new URL(originalUrl);
      url.searchParams.set('fm', 'webp');
      if (quality && quality !== 80) {
        url.searchParams.set('q', quality.toString());
      }
      return url.toString();
    }
    
    // For other URLs, try to replace extension with .webp
    if (originalUrl.match(/\.(jpg|jpeg|png)$/i)) {
      return originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    
    return originalUrl;
  };

  // Check if browser supports WebP
  const supportsWebP = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  };

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before image comes into view
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, isInView]);

  // Set image source when component mounts or src changes
  useEffect(() => {
    if (!src || !isInView) return;

    setIsLoading(true);
    setHasError(false);

    // Try WebP first if supported
    if (supportsWebP()) {
      const webpUrl = generateWebPUrl(src);
      if (webpUrl !== src) {
        setCurrentSrc(webpUrl);
        return;
      }
    }

    // Fallback to original URL
    setCurrentSrc(src);
  }, [src, isInView, quality]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad(e);
  };

  const handleError = (e) => {
    setHasError(true);
    onError(e);
  };

  // Placeholder component
  const PlaceholderComponent = () => {
    if (placeholder) {
      return placeholder;
    }

    return (
      <div className={`bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`}>
        <div className="flex items-center justify-center h-full">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    );
  };

  // Error component
  const ErrorComponent = () => (
    <div className={`bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 ${className}`}>
      <div className="flex flex-col items-center justify-center h-full p-4 text-gray-500 dark:text-gray-400">
        <svg
          className="w-8 h-8 mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <span className="text-sm">Failed to load image</span>
      </div>
    </div>
  );

  // Show placeholder while not in view (lazy loading)
  if (!isInView) {
    return (
      <div 
        ref={imgRef} 
        className={`bg-muted animate-pulse ${className}`}
      />
    );
  }

  if (hasError) {
    return <ErrorComponent />;
  }

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder */}
      {blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
          aria-hidden="true"
        />
      )}

      {/* Loading placeholder */}
      {!isLoaded && !blurDataURL && <PlaceholderComponent />}

      {/* Main image */}
      {isInView && (
        <motion.img
          src={currentSrc}
          srcSet={generateSrcSet(currentSrc)}
          sizes={sizes}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          {...props}
        />
      )}

      {/* Loading overlay */}
      {isInView && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;

// Hook for preloading images
export const useImagePreloader = () => {
  const preloadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const preloadImages = async (srcArray) => {
    try {
      const promises = srcArray.map(src => preloadImage(src));
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.warn('Failed to preload some images:', error);
      return false;
    }
  };

  return { preloadImage, preloadImages };
};

// Higher-order component for image optimization
export const withImageOptimization = (Component) => {
  return function OptimizedComponent(props) {
    const { images = [], ...otherProps } = props;
    const { preloadImages } = useImagePreloader();

    React.useEffect(() => {
      if (images.length > 0) {
        preloadImages(images);
      }
    }, [images, preloadImages]);

    return <Component {...otherProps} />;
  };
};

// Utility function to check WebP support
export const supportsWebP = () => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

// Utility function to optimize image URL
export const optimizeImageUrl = (url, options = {}) => {
  const { width, height, quality = 80, format = 'auto' } = options;
  
  // This is a placeholder - in a real app, you'd integrate with your image CDN
  // Examples: Cloudinary, ImageKit, or custom image optimization service
  
  let optimizedUrl = url;
  
  // Add query parameters for optimization (example format)
  const params = new URLSearchParams();
  
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  if (quality) params.append('q', quality.toString());
  if (format !== 'auto') params.append('f', format);
  
  if (params.toString()) {
    optimizedUrl += (url.includes('?') ? '&' : '?') + params.toString();
  }
  
  return optimizedUrl;
};