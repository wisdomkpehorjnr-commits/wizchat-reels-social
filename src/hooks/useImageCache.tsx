import { useState, useEffect, useRef } from 'react';

// ============================================
// MODULE-LEVEL IN-MEMORY CACHE (survives remounts)
// ============================================
const imageMemoryCache = new Map<string, {
  blobUrl: string;
  timestamp: number;
}>();

const IMAGE_DB_NAME = 'WizChatImageCache';
const IMAGE_DB_STORE = 'images';
const IMAGE_MEMORY_TTL = 24 * 60 * 60 * 1000; // 24 hours

let dbInstance: IDBDatabase | null = null;

// Initialize IndexedDB at module load
async function initializeImageDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB_NAME, 1);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IMAGE_DB_STORE)) {
        db.createObjectStore(IMAGE_DB_STORE, { keyPath: 'url' });
      }
    };
  });
}

// Get image from IndexedDB
async function getImageFromDB(imageUrl: string): Promise<Blob | null> {
  try {
    const db = await initializeImageDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([IMAGE_DB_STORE], 'readonly');
      const store = transaction.objectStore(IMAGE_DB_STORE);
      const request = store.get(imageUrl);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.blob) {
          resolve(new Blob([result.blob], { type: result.mimeType }));
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  } catch (e) {
    console.debug('[ImageCache] DB read failed:', e);
    return null;
  }
}

// Save image to IndexedDB
async function saveImageToDB(imageUrl: string, blob: Blob): Promise<void> {
  try {
    const db = await initializeImageDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([IMAGE_DB_STORE], 'readwrite');
      const store = transaction.objectStore(IMAGE_DB_STORE);

      blob.arrayBuffer().then(buffer => {
        store.put({
          url: imageUrl,
          blob: new Blob([buffer], { type: blob.type }),
          mimeType: blob.type,
          timestamp: Date.now(),
        });
        resolve();
      });
    });
  } catch (e) {
    console.debug('[ImageCache] DB write failed:', e);
  }
}

// Fetch and cache image
async function getCachedImageUrl(originalSrc: string, ignoreMemoryCache = false): Promise<string> {
  if (!originalSrc) return '';

  // STEP 1: Check memory cache first (fastest)
  if (!ignoreMemoryCache) {
    const memCached = imageMemoryCache.get(originalSrc);
    if (memCached) {
      // Validate URL is still valid
      try {
        // Test if blob URL still works by attempting to create an image
        const testImg = new Image();
        testImg.src = memCached.blobUrl;
        return memCached.blobUrl;
      } catch (e) {
        // Blob URL invalid, remove from memory cache
        imageMemoryCache.delete(originalSrc);
      }
    }
  }

  // STEP 2: Try to get from IndexedDB
  try {
    const blob = await getImageFromDB(originalSrc);
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      // Store in memory cache for instant access next time
      imageMemoryCache.set(originalSrc, {
        blobUrl,
        timestamp: Date.now(),
      });
      console.debug('[ImageCache] Loaded from IndexedDB:', originalSrc.substring(0, 50));
      return blobUrl;
    }
  } catch (e) {
    console.debug('[ImageCache] DB retrieval failed:', e);
  }

  // STEP 3: Fetch from network, cache it, and return
  try {
    const response = await fetch(originalSrc);
    if (!response.ok) {
      return originalSrc; // Fallback to original
    }

    const blob = await response.blob();

    // Save to IndexedDB for offline access
    await saveImageToDB(originalSrc, blob);

    // Create blob URL and store in memory cache
    const blobUrl = URL.createObjectURL(blob);
    imageMemoryCache.set(originalSrc, {
      blobUrl,
      timestamp: Date.now(),
    });

    console.debug('[ImageCache] Cached new image:', originalSrc.substring(0, 50));
    return blobUrl;
  } catch (error) {
    console.debug('[ImageCache] Fetch failed, returning original:', error);
    return originalSrc; // Fallback to original if fetch fails
  }
}

// Hook for using cached images
export function useImageCache(imageUrl: string | undefined): { 
  cachedUrl: string; 
  isLoading: boolean; 
  error: Error | null;
} {
  const [cachedUrl, setCachedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!imageUrl) {
      setCachedUrl('');
      return;
    }

    // Skip if already loading
    if (loadingRef.current) return;
    loadingRef.current = true;

    setIsLoading(true);
    setError(null);

    getCachedImageUrl(imageUrl)
      .then((url) => {
        setCachedUrl(url || imageUrl);
        setError(null);
      })
      .catch((err) => {
        console.error('[ImageCache] Hook error:', err);
        setCachedUrl(imageUrl);
        setError(err instanceof Error ? err : new Error('Image cache failed'));
      })
      .finally(() => {
        setIsLoading(false);
        loadingRef.current = false;
      });
  }, [imageUrl]);

  return { 
    cachedUrl: cachedUrl || imageUrl || '', 
    isLoading, 
    error 
  };
}

// Export for direct use
export { getCachedImageUrl, getImageFromDB, saveImageToDB, imageMemoryCache };
