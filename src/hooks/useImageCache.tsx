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
const inFlightCachePromises = new Map<string, Promise<void>>();
const cacheSubscribers = new Map<string, Set<(blobUrl: string) => void>>();
const IMAGE_CACHE_NAME = 'wizchat-post-images-v2';
// Keep seen images effectively permanent for offline-first UX
const IMAGE_PERSIST_TTL = 365 * 24 * 60 * 60 * 1000; // 365 days

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

function notifySubscribers(imageUrl: string, blobUrl: string): void {
  const listeners = cacheSubscribers.get(imageUrl);
  if (!listeners?.size) return;

  listeners.forEach(listener => {
    try {
      listener(blobUrl);
    } catch (e) {
      console.debug('[ImageCache] Subscriber callback failed:', e);
    }
  });
}

function subscribeToCachedImage(imageUrl: string, listener: (blobUrl: string) => void): () => void {
  const existing = cacheSubscribers.get(imageUrl) || new Set<(blobUrl: string) => void>();
  existing.add(listener);
  cacheSubscribers.set(imageUrl, existing);

  return () => {
    const listeners = cacheSubscribers.get(imageUrl);
    if (!listeners) return;
    listeners.delete(listener);
    if (listeners.size === 0) {
      cacheSubscribers.delete(imageUrl);
    }
  };
}

/**
 * Get or create a blob URL from a cached entry, ensuring it's valid and not expired
 */
function getBlobUrl(imageUrl: string): string | null {
  const entry = imageMemoryCache.get(imageUrl);

  if (!entry) return null;

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    imageMemoryCache.delete(imageUrl);
    const previousBlobUrl = imageBlobUrlCache.get(imageUrl);
    if (previousBlobUrl) {
      URL.revokeObjectURL(previousBlobUrl);
    }
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

  const previousBlobUrl = imageBlobUrlCache.get(imageUrl);
  if (previousBlobUrl) {
    URL.revokeObjectURL(previousBlobUrl);
  }

  const blobUrl = URL.createObjectURL(blob);
  imageBlobUrlCache.set(imageUrl, blobUrl);
  notifySubscribers(imageUrl, blobUrl);
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

  // START CACHING IMMEDIATELY (NOT deferred, fires in next microtask)
  if (typeof queueMicrotask !== 'undefined') {
    queueMicrotask(() => {
      cacheImageAsync(originalSrc).catch(e => {
        console.debug('[ImageCache] Background cache failed:', e);
      });
    });
  } else {
    Promise.resolve().then(() => {
      cacheImageAsync(originalSrc).catch(e => {
        console.debug('[ImageCache] Background cache failed:', e);
      });
    });
  }

  return originalSrc;
}

// Background caching - deduped and non-blocking
async function cacheImageAsync(imageUrl: string): Promise<void> {
  if (!imageUrl) return;

  // Already in memory cache and not expired?
  const existing = imageMemoryCache.get(imageUrl);
  if (existing && Date.now() <= existing.expiresAt) {
    return;
  }

  // Reuse in-flight task to prevent repeated fetches on tab switches/remounts
  const inFlight = inFlightCachePromises.get(imageUrl);
  if (inFlight) {
    return inFlight;
  }

  const task = (async () => {
    if (typeof caches === 'undefined') return;

    try {
      const cache = await caches.open(IMAGE_CACHE_NAME);
      const expiresAt = Date.now() + IMAGE_PERSIST_TTL;

      // 1) Check metadata in IndexedDB for TTL enforcement
      try {
        const meta = await cacheService.get<{ expiresAt: number }>(`perm-image-meta-${imageUrl}`);
        if (meta && meta.expiresAt && Date.now() <= meta.expiresAt) {
          const cachedResp = await cache.match(imageUrl);
          if (cachedResp) {
            const blob = await cachedResp.blob();
            setCachedBlob(imageUrl, blob, meta.expiresAt);
            console.debug('[ImageCache] Loaded from Cache API (via valid meta):', imageUrl.substring(0, 50));
            return;
          }
        }
      } catch (e) {
        console.debug('[ImageCache] IndexedDB metadata read failed:', e);
      }

      // 2) Check Cache API directly
      const cached = await cache.match(imageUrl);
      if (cached) {
        const blob = await cached.blob();
        setCachedBlob(imageUrl, blob, expiresAt);
        console.debug('[ImageCache] Loaded from Cache API:', imageUrl.substring(0, 50));

        try {
          await cacheService.set(`perm-image-meta-${imageUrl}`, { expiresAt }, IMAGE_PERSIST_TTL);
        } catch (e) {
          console.debug('[ImageCache] Persist meta to IndexedDB failed:', e);
        }
        return;
      }

      // 3) Not in cache - fetch and store
      const response = await fetch(imageUrl, { cache: 'force-cache' });
      if (!response.ok) return;

      const cloned = response.clone();
      await cache.put(imageUrl, cloned);
      const blob = await response.blob();
      setCachedBlob(imageUrl, blob, expiresAt);
      console.debug('[ImageCache] Cached new image:', imageUrl.substring(0, 50));

      try {
        await cacheService.set(`perm-image-meta-${imageUrl}`, { expiresAt }, IMAGE_PERSIST_TTL);
      } catch (e) {
        console.debug('[ImageCache] Persist meta to IndexedDB failed:', e);
      }
    } catch (e) {
      console.debug('[ImageCache] Cache API failed:', e);
    }
  })();

  inFlightCachePromises.set(imageUrl, task);

  try {
    await task;
  } finally {
    if (inFlightCachePromises.get(imageUrl) === task) {
      inFlightCachePromises.delete(imageUrl);
    }
  }
}

// Hook for using cached images - instant URL + subscriber updates
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
      setIsLoading(false);
      return;
    }

    let mounted = true;

    // IMMEDIATE: return memory-cached blob URL if available
    const instantUrl = getCachedImageUrl(imageUrl);
    setCachedUrl(instantUrl);
    setError(null);

    if (instantUrl !== imageUrl) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = subscribeToCachedImage(imageUrl, (blobUrl) => {
      if (!mounted) return;
      setCachedUrl(blobUrl);
      setIsLoading(false);
    });

    cacheImageAsync(imageUrl)
      .then(() => {
        if (!mounted) return;
        const freshBlobUrl = getBlobUrl(imageUrl);
        if (freshBlobUrl) {
          setCachedUrl(freshBlobUrl);
        }
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e instanceof Error ? e : new Error('Failed to cache image'));
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [imageUrl]);

  return {
    cachedUrl: cachedUrl || imageUrl || '',
    isLoading,
    error,
  };
}

// Export for direct use
export { getCachedImageUrl, cacheImageAsync, imageMemoryCache, IMAGE_CACHE_NAME };
