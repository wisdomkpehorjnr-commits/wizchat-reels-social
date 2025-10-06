import { useState, useEffect, useCallback } from 'react';

interface CacheOptions {
  key: string;
  ttl?: number; // Time to live in milliseconds
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function useCache<T>(options: CacheOptions) {
  const { key, ttl = 5 * 60 * 1000 } = options; // Default 5 minutes
  const [cachedData, setCachedData] = useState<T | null>(null);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    // Load from cache on mount
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const entry: CacheEntry<T> = JSON.parse(cached);
        const age = Date.now() - entry.timestamp;
        
        if (age < ttl) {
          setCachedData(entry.data);
          setIsStale(false);
        } else {
          setIsStale(true);
        }
      } catch (error) {
        console.error('Error loading cache:', error);
        localStorage.removeItem(key);
      }
    }
  }, [key, ttl]);

  const setCache = useCallback((data: T) => {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(entry));
    setCachedData(data);
    setIsStale(false);
  }, [key]);

  const clearCache = useCallback(() => {
    localStorage.removeItem(key);
    setCachedData(null);
    setIsStale(true);
  }, [key]);

  const refreshCache = useCallback(async (fetchFn: () => Promise<T>) => {
    try {
      const data = await fetchFn();
      setCache(data);
      return data;
    } catch (error) {
      console.error('Error refreshing cache:', error);
      throw error;
    }
  }, [setCache]);

  return {
    cachedData,
    isStale,
    setCache,
    clearCache,
    refreshCache
  };
}
