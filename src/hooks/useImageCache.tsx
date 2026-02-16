import { useState, useEffect } from 'react';
import { cacheService } from '@/services/cacheService';

// ============================================
// ULTRA-FAST MODULE-LEVEL IN-MEMORY CACHE
// ============================================
interface CachedImageEntry {
  blob: Blob;
  expiresAt: number;
}

const imageMemoryCache = new Map<string, CachedImageEntry>(); // URL -> {blob, expiresAt}
const imageBlobUrlCache = new Map<string, string>(); // URL -> blob URL (transient, recreated as needed)
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

/**
 * Get or create a blob URL from a cached entry, ensuring it's valid and not expired
 */
function getBlobUrl(imageUrl: string): string | null {
  const entry = imageMemoryCache.get(imageUrl);
  
  if (!entry) return null;
  
  // Check if expired
  if (Date.now() > entry.expiresAt) {
    imageMemoryCache.delete(imageUrl);
    imageBlobUrlCache.delete(imageUrl);
    return null;
  }
  
  // Reuse blob URL if it exists
  if (imageBlobUrlCache.has(imageUrl)) {
    return imageBlobUrlCache.get(imageUrl) || null;
  }
  
  // Create fresh blob URL from the stored blob
  const blobUrl = URL.createObjectURL(entry.blob);
  imageBlobUrlCache.set(imageUrl, blobUrl);
  return blobUrl;
}

/**
 * Store blob + expiry in memory cache
 */
function setCachedBlob(imageUrl: string, blob: Blob, expiresAt: number): void {
  imageMemoryCache.set(imageUrl, { blob, expiresAt });
  // Create blob URL on first access
  const blobUrl = URL.createObjectURL(blob);
  imageBlobUrlCache.set(imageUrl, blobUrl);
  console.debug('[ImageCache] Cached blob in memory for:', imageUrl.substring(0, 50));
}

// Ultra-fast cache lookup - returns immediately, caches in background
function getCachedImageUrl(originalSrc: string): string {
  if (!originalSrc) return '';

  // INSTANT RETURN: Check memory cache first (blob + expiry)
  const cachedUrl = getBlobUrl(originalSrc);
  if (cachedUrl) {
    return cachedUrl;
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

  // Already in memory cache and not expired?
  const existing = imageMemoryCache.get(imageUrl);
  if (existing && Date.now() <= existing.expiresAt) {
    return;
  }

  // Try Cache API (fast)
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(IMAGE_CACHE_NAME);
      const expiresAt = Date.now() + IMAGE_PERSIST_TTL;

      // 1) Check metadata in IndexedDB (durable storage) to enforce TTL,
      //    then use the Cache API response (which is better for storing large blobs)
      try {
        const meta = await cacheService.get<{ expiresAt: number }>(`perm-image-meta-${imageUrl}`);
        if (meta && meta.expiresAt && Date.now() <= meta.expiresAt) {
          const cachedResp = await cache.match(imageUrl);
          if (cachedResp) {
            const blob = await cachedResp.blob();
            // Store blob + expiry in memory cache for fast repeated access
            setCachedBlob(imageUrl, blob, meta.expiresAt);
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
        // Store blob + expiry in memory cache
        setCachedBlob(imageUrl, blob, expiresAt);
        console.debug('[ImageCache] Loaded from Cache API:', imageUrl.substring(0, 50));
        // Persist metadata to IndexedDB for TTL enforcement. Cache API holds the response.
        try {
          await cacheService.set(`perm-image-meta-${imageUrl}`, { expiresAt }, IMAGE_PERSIST_TTL);
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
        // Store blob + expiry in memory cache
        setCachedBlob(imageUrl, blob, expiresAt);
        console.debug('[ImageCache] Cached new image:', imageUrl.substring(0, 50));

        // Persist metadata to IndexedDB for TTL enforcement. Cache API holds the response.
        try {
          await cacheService.set(`perm-image-meta-${imageUrl}`, { expiresAt }, IMAGE_PERSIST_TTL);
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
    // Component will re-render when blob URL becomes available
    const checkInterval = setInterval(() => {
      const blobUrl = getBlobUrl(imageUrl);
      if (blobUrl && blobUrl !== url) {
        setCachedUrl(blobUrl);
        clearInterval(checkInterval);
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [imageUrl]);

  return { 
    cachedUrl: cachedUrl || imageUrl || '', 
    isLoading, 
    error 
  };
}

// Export for direct use
export { getCachedImageUrl, cacheImageAsync, imageMemoryCache, IMAGE_CACHE_NAME };
