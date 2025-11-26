/**
 * Persistent Caching Service
 * Manages IndexedDB for offline-friendly data storage with background sync
 */

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt?: number;
  ttl?: number;
}

interface CacheStore {
  openDB(): Promise<IDBDatabase>;
  set<T>(key: string, data: T, ttl?: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
  getAllEntries<T>(prefix?: string): Promise<T[]>;
  getExpiredKeys(): Promise<string[]>;
  cleanup(): Promise<void>;
}

let dbInstance: IDBDatabase | null = null;

const DB_NAME = 'wizchat-cache';
const STORE_NAME = 'cache';
const DB_VERSION = 1;

/**
 * Open or create IndexedDB database
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
};

/**
 * Set a cache entry with optional TTL
 */
const setCacheEntry = async <T>(
  key: string,
  data: T,
  ttl?: number
): Promise<void> => {
  try {
    const db = await openDB();
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      expiresAt: ttl ? Date.now() + ttl : undefined,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Cache set error:', error);
    // Fallback to localStorage
    try {
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (storageError) {
      console.error('Both IndexedDB and localStorage failed:', storageError);
    }
  }
};

/**
 * Get a cache entry with expiration check
 */
const getCacheEntry = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entry: CacheEntry<T> | undefined = request.result;

        if (!entry) {
          resolve(null);
          return;
        }

        // Check if expired
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          // Delete expired entry
          removeCacheEntry(key).catch(console.error);
          resolve(null);
          return;
        }

        resolve(entry.data);
      };
    });
  } catch (error) {
    console.error('Cache get error:', error);
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        return data as T;
      }
    } catch (storageError) {
      console.error('Both IndexedDB and localStorage failed:', storageError);
    }
    return null;
  }
};

/**
 * Remove a cache entry
 */
const removeCacheEntry = async (key: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Cache remove error:', error);
    localStorage.removeItem(key);
  }
};

/**
 * Clear all cache entries
 */
const clearAllCache = async (): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    // Clear localStorage as well
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

/**
 * Get all cache keys
 */
const getAllCacheKeys = async (): Promise<string[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve((request.result as string[]) || []);
      };
    });
  } catch (error) {
    console.error('Get all keys error:', error);
    return [];
  }
};

/**
 * Get all cache entries (optionally filtered by prefix)
 */
const getAllCacheEntries = async <T>(prefix?: string): Promise<T[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let entries = (request.result as CacheEntry<T>[]) || [];

        // Filter by prefix if provided
        if (prefix) {
          entries = entries.filter(e => e.key.startsWith(prefix));
        }

        // Filter out expired entries
        entries = entries.filter(e => {
          if (e.expiresAt && Date.now() > e.expiresAt) {
            removeCacheEntry(e.key).catch(console.error);
            return false;
          }
          return true;
        });

        resolve(entries.map(e => e.data));
      };
    });
  } catch (error) {
    console.error('Get all entries error:', error);
    return [];
  }
};

/**
 * Get all expired cache keys
 */
const getExpiredCacheKeys = async (): Promise<string[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entries = (request.result as CacheEntry<any>[]) || [];
        const expired = entries
          .filter(e => e.expiresAt && Date.now() > e.expiresAt)
          .map(e => e.key);
        resolve(expired);
      };
    });
  } catch (error) {
    console.error('Get expired keys error:', error);
    return [];
  }
};

/**
 * Clean up all expired cache entries
 */
const cleanupCache = async (): Promise<void> => {
  try {
    const expiredKeys = await getExpiredCacheKeys();
    for (const key of expiredKeys) {
      await removeCacheEntry(key);
    }
    console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

export const cacheService: CacheStore = {
  openDB,
  set: setCacheEntry,
  get: getCacheEntry,
  remove: removeCacheEntry,
  clear: clearAllCache,
  getAllKeys: getAllCacheKeys,
  getAllEntries: getAllCacheEntries,
  getExpiredKeys: getExpiredCacheKeys,
  cleanup: cleanupCache,
};

// Auto-cleanup on page load and periodically
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    cleanupCache().catch(console.error);
  });

  // Cleanup every 5 minutes
  setInterval(() => {
    cleanupCache().catch(console.error);
  }, 5 * 60 * 1000);
}
