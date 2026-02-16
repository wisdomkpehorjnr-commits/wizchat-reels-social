import { useState, useEffect, useRef } from 'react';
import { cacheService } from '@/services/cacheService';

// ============================================
// ULTRA-FAST MODULE-LEVEL IN-MEMORY CACHE
// ============================================
const imageMemoryCache = new Map<string, string>(); // URL -> cached blob URL
const IMAGE_CACHE_NAME = 'wizchat-post-images-v2';
// Persist images for 2 hours by default
const IMAGE_PERSIST_TTL = 2 * 60 * 60 * 1000; // 2 hours

// Preload cache from storage at module init (fire and forget)
const initCachePreload = () => {
  if (typeof caches === 'undefined') return;
  
  _requestIdleCallback(() => {
    caches.open(IMAGE_CACHE_NAME).catch(e => {
      console.debug('[ImageCache] Cache init failed:', e);
    });
  });
};

const _requestIdleCallback = (typeof requestIdleCallback !== 'undefined')
  ? requestIdleCallback
  : (cb: IdleRequestCallback) => setTimeout(cb, 0);

// Initialize on module load
initCachePreload();

// Ultra-fast cache lookup - returns immediately, caches in background
function getCachedImageUrl(originalSrc: string): string {
  if (!originalSrc) return '';

  // INSTANT RETURN: Check memory cache first
  if (imageMemoryCache.has(originalSrc)) {
    return imageMemoryCache.get(originalSrc) || originalSrc;
  }

  // INSTANT RETURN: Return original src while caching happens in background
  // Start caching operations WITHOUT blocking render
  _requestIdleCallback(() => {
    cacheImageAsync(originalSrc).catch(e => {
      console.debug('[ImageCache] Background cache failed:', e);
    });
  });

  return originalSrc;
}

// Background caching - doesn't block anything
async function cacheImageAsync(imageUrl: string): Promise<void> {
  if (!imageUrl) return;

  // Already in memory cache?
  if (imageMemoryCache.has(imageUrl)) return;

  // Try Cache API (fast)
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(IMAGE_CACHE_NAME);

          // 1) Check metadata in IndexedDB (durable storage) to enforce TTL,
          //    then use the Cache API response (which is better for storing large blobs)
          try {
            const meta = await cacheService.get<{ expiresAt: number }>(`perm-image-meta-${imageUrl}`);
            if (meta && meta.expiresAt && Date.now() <= meta.expiresAt) {
              const cachedResp = await cache.match(imageUrl);
              if (cachedResp) {
                const blob = await cachedResp.blob();
                const blobUrl = URL.createObjectURL(blob);
                imageMemoryCache.set(imageUrl, blobUrl);
                console.debug('[ImageCache] Loaded from Cache API (via valid meta):', imageUrl.substring(0, 50));
                return;
              }
            }
          } catch (e) {
            console.debug('[ImageCache] IndexedDB metadata read failed:', e);
          }

      // 2) Check Cache API
      const cached = await cache.match(imageUrl);
      if (cached) {
        const blob = await cached.blob();
        const blobUrl = URL.createObjectURL(blob);
        imageMemoryCache.set(imageUrl, blobUrl);
        console.debug('[ImageCache] Loaded from Cache API:', imageUrl.substring(0, 50));
        // Persist metadata to IndexedDB for TTL enforcement. Cache API holds the response.
        try {
          await cacheService.set(`perm-image-meta-${imageUrl}`, { expiresAt: Date.now() + IMAGE_PERSIST_TTL }, IMAGE_PERSIST_TTL);
        } catch (e) {
          console.debug('[ImageCache] Persist meta to IndexedDB failed:', e);
        }
        return;
      }

      // 3) Not in cache - fetch and store
      const response = await fetch(imageUrl);
      if (response.ok) {
        const cloned = response.clone();
        await cache.put(imageUrl, cloned);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        imageMemoryCache.set(imageUrl, blobUrl);
        console.debug('[ImageCache] Cached new image:', imageUrl.substring(0, 50));

        // Persist metadata to IndexedDB for TTL enforcement. Cache API holds the response.
        try {
          await cacheService.set(`perm-image-meta-${imageUrl}`, { expiresAt: Date.now() + IMAGE_PERSIST_TTL }, IMAGE_PERSIST_TTL);
        } catch (e) {
          console.debug('[ImageCache] Persist meta to IndexedDB failed:', e);
        }
      }
    } catch (e) {
      console.debug('[ImageCache] Cache API failed:', e);
    }
  }
}

// Hook for using cached images - INSTANT RETURN, no waiting
export function useImageCache(imageUrl: string | undefined): { 
  cachedUrl: string; 
  isLoading: boolean; 
  error: Error | null;
} {
  const [cachedUrl, setCachedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setCachedUrl('');
      return;
    }

    // IMMEDIATE: Get URL right away (either cached or original)
    const url = getCachedImageUrl(imageUrl);
    setCachedUrl(url);
    setError(null);

    // Background caching will update memory cache if not already there
    // Component will re-render if image becomes available from memory cache
    const checkForCachedVersion = setInterval(() => {
      if (imageMemoryCache.has(imageUrl)) {
        const cached = imageMemoryCache.get(imageUrl);
        if (cached !== url) {
          setCachedUrl(cached || imageUrl);
          clearInterval(checkForCachedVersion);
        }
      }
    }, 100);

    return () => clearInterval(checkForCachedVersion);
  }, [imageUrl]);

  return { 
    cachedUrl: cachedUrl || imageUrl || '', 
    isLoading, 
    error 
  };
}

// Export for direct use
export { getCachedImageUrl, cacheImageAsync, imageMemoryCache, IMAGE_CACHE_NAME };
