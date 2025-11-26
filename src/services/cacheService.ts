/**
 * Persistent Caching Service
 * IndexedDB-based storage with localStorage fallback
 * Handles automatic expiration, cleanup, and cross-session persistence
 */

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt?: number;
  ttl?: number;
}

interface CacheStore {
  set<T>(key: string, data: T, ttl?: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
  getAllEntries<T>(prefix?: string): Promise<T[]>;
  cleanup(): Promise<void>;
}

let dbInstance: IDBDatabase | null = null;

const DB_NAME = 'wizchat-cache';
const STORE_NAME = 'cache';
const DB_VERSION = 1;

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
    console.error('[Cache] IndexedDB set failed, falling back to localStorage:', error);
    try {
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (storageError) {
      console.error('[Cache] Both IndexedDB and localStorage failed:', storageError);
    }
  }
};

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

        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          removeCacheEntry(key).catch(console.error);
          resolve(null);
          return;
        }

        resolve(entry.data);
      };
    });
  } catch (error) {
    console.error('[Cache] IndexedDB get failed, falling back to localStorage:', error);
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const { data } = JSON.parse(stored);
        return data as T;
      }
    } catch (storageError) {
      console.error('[Cache] localStorage failed:', storageError);
    }
    return null;
  }
};

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
    console.error('[Cache] Remove failed:', error);
    localStorage.removeItem(key);
  }
};

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
    console.error('[Cache] Clear failed:', error);
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_') || key.startsWith('tab_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

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
    console.error('[Cache] Get all keys failed:', error);
    return [];
  }
};

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

        if (prefix) {
          entries = entries.filter(e => e.key.startsWith(prefix));
        }

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
    console.error('[Cache] Get all entries failed:', error);
    return [];
  }
};

const cleanupCache = async (): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        const entries = (request.result as CacheEntry<any>[]) || [];
        const expired = entries.filter(e => e.expiresAt && Date.now() > e.expiresAt);

        for (const entry of expired) {
          await removeCacheEntry(entry.key);
        }

        console.log(`[Cache] Cleaned up ${expired.length} expired entries`);
        resolve();
      };
    });
  } catch (error) {
    console.error('[Cache] Cleanup failed:', error);
  }
};

export const cacheService: CacheStore = {
  set: setCacheEntry,
  get: getCacheEntry,
  remove: removeCacheEntry,
  clear: clearAllCache,
  getAllKeys: getAllCacheKeys,
  getAllEntries: getAllCacheEntries,
  cleanup: cleanupCache,
};

// Auto-cleanup on page load and periodically
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    cleanupCache().catch(console.error);
  });

  setInterval(() => {
    cleanupCache().catch(console.error);
  }, 5 * 60 * 1000);
}
