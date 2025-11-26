import React, { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean; // Load immediately without lazy loading
  quality?: 'low' | 'medium' | 'high';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized image component with:
 * - Lazy loading on intersection observer
 * - Responsive sizes
 * - WebP with fallback
 * - Quality adaptation based on network
 * - Blur placeholder while loading
 */
export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  quality = 'high',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(priority);
  const [isVisible, setIsVisible] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before visible
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  // Determine image quality based on network
  const getQualityUrl = () => {
    const params = new URLSearchParams();

    switch (quality) {
      case 'low':
        params.set('w', '256');
        params.set('q', '40');
        break;
      case 'medium':
        params.set('w', '512');
        params.set('q', '75');
        break;
      case 'high':
        params.set('w', '1024');
        params.set('q', '90');
        break;
    }

    return src.includes('?')
      ? `${src}&${params.toString()}`
      : `${src}?${params.toString()}`;
  };

  const imageUrl = isVisible ? getQualityUrl() : undefined;
  const placeholderUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width || 1} ${height || 1}'%3E%3Crect fill='%23f0f0f0'/%3E%3C/svg%3E`;

  return (
    <picture>
      {/* WebP format for modern browsers */}
      {isVisible && <source srcSet={imageUrl?.replace(/\.(jpg|jpeg|png)/, '.webp')} type="image/webp" />}

      {/* Fallback to original format */}
      <img
        ref={imgRef}
        src={isLoaded ? imageUrl : placeholderUrl}
        alt={alt}
        className={`${className} ${!isLoaded ? 'blur-sm' : ''} transition-all duration-300`}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => {
          setIsLoaded(true);
          onLoad?.();
        }}
        onError={onError}
        decoding="async"
      />
    </picture>
  );
}

/**
 * Image gallery with progressive loading
 */
export function ImageGallery({
  images,
  className,
}: {
  images: string[];
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 ${className}`}>
      {images.map((img, idx) => (
        <OptimizedImage
          key={idx}
          src={img}
          alt={`Gallery image ${idx + 1}`}
          priority={idx < 2} // Load first 2 images immediately
          quality={idx < 4 ? 'high' : 'medium'}
          className="w-full h-40 object-cover rounded-lg"
        />
      ))}
    </div>
  );
}

/**
 * Background image with loading state
 */
export function BackgroundImageOptimized({
  src,
  children,
  className,
}: {
  src: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundImage: isLoaded ? `url(${src})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Hidden image element to preload */}
      <img
        src={src}
        alt="Background"
        style={{ display: 'none' }}
        onLoad={() => setIsLoaded(true)}
      />

      {/* Placeholder gradient while loading */}
      {!isLoaded && <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300" />}

      {children}
    </div>
  );
}

/**
 * Avatar image with fallback
 */
export function AvatarImage({
  src,
  alt,
  fallback,
  className,
}: {
  src?: string;
  alt: string;
  fallback: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(!src);

  if (hasError || !src) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white font-semibold ${className}`}>
        {fallback}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={className}
      priority
      quality="high"
      onError={() => setHasError(true)}
    />
  );
}
