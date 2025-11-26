import { useEffect, useRef, useState } from 'react';
import { cacheService } from '@/services/cacheService';
import { networkStatusManager } from '@/services/networkStatusManager';

interface TabCacheOptions {
  tabId: string;
  enabled?: boolean;
  ttl?: number;
  onStatusChange?: (status: 'loading' | 'cached' | 'fresh' | 'offline') => void;
}

interface CachedTabData {
  data: any;
  timestamp: number;
  status: 'loading' | 'cached' | 'fresh' | 'offline';
  isOffline: boolean;
}

/**
 * Hook for intelligent tab caching and prefetching
 * Stores tab content in IndexedDB and instantly displays cached content
 */
export function useTabCache(options: TabCacheOptions) {
  const { tabId, enabled = true, ttl = 30 * 60 * 1000, onStatusChange } = options;
  const [cachedData, setCachedData] = useState<CachedTabData | null>(null);
  const isInitializedRef = useRef(false);
  const isOfflineRef = useRef(false);

  // Initialize cache on mount
  useEffect(() => {
    if (!enabled || isInitializedRef.current) return;

    isInitializedRef.current = true;

    // Load cached data immediately
    const loadCachedData = async () => {
      try {
        const cached = await cacheService.get<any>(`tab_${tabId}`);
        const isOffline = !networkStatusManager.isOnline();
        isOfflineRef.current = isOffline;

        if (cached) {
          const status = isOffline ? 'offline' : 'cached';
          setCachedData({
            data: cached,
            timestamp: Date.now(),
            status,
            isOffline,
          });
          onStatusChange?.(status);
        }
      } catch (error) {
        console.error(`Error loading cache for tab ${tabId}:`, error);
      }
    };

    // Load immediately
    loadCachedData();

    // Subscribe to network status changes
    const unsubscribe = networkStatusManager.subscribe((status) => {
      if (status === 'offline') {
        isOfflineRef.current = true;
        if (cachedData) {
          setCachedData(prev => prev ? { ...prev, isOffline: true, status: 'offline' } : null);
          onStatusChange?.('offline');
        }
      } else if (status === 'online' || status === 'reconnecting') {
        isOfflineRef.current = false;
        if (cachedData) {
          setCachedData(prev => prev ? { ...prev, isOffline: false, status: 'cached' } : null);
          onStatusChange?.('cached');
        }
      }
    });

    return () => unsubscribe();
  }, [enabled, tabId, onStatusChange]);

  /**
   * Cache new data from a fetch operation
   */
  const cacheData = async (data: any) => {
    try {
      await cacheService.set(`tab_${tabId}`, data, ttl);
      const isOffline = !networkStatusManager.isOnline();
      const status = isOffline ? 'offline' : 'fresh';

      setCachedData({
        data,
        timestamp: Date.now(),
        status,
        isOffline,
      });
      onStatusChange?.(status);
    } catch (error) {
      console.error(`Error caching data for tab ${tabId}:`, error);
    }
  };

  /**
   * Update cached data with new content while maintaining cache
   */
  const updateCachedData = async (updater: (prev: any) => any) => {
    try {
      const updated = updater(cachedData?.data);
      await cacheData(updated);
    } catch (error) {
      console.error(`Error updating cache for tab ${tabId}:`, error);
    }
  };

  /**
   * Refresh cache from network (background sync)
   */
  const refreshFromNetwork = async (fetchFn: () => Promise<any>) => {
    try {
      const freshData = await fetchFn();
      await cacheData(freshData);
      return freshData;
    } catch (error) {
      console.error(`Error refreshing cache for tab ${tabId}:`, error);
      // Return cached data if refresh fails
      return cachedData?.data;
    }
  };

  /**
   * Clear cache for this tab
   */
  const clearCache = async () => {
    try {
      await cacheService.remove(`tab_${tabId}`);
      setCachedData(null);
      onStatusChange?.('loading');
    } catch (error) {
      console.error(`Error clearing cache for tab ${tabId}:`, error);
    }
  };

  return {
    cachedData: cachedData?.data,
    cacheStatus: cachedData?.status || 'loading',
    isOffline: cachedData?.isOffline || !networkStatusManager.isOnline(),
    isCached: !!cachedData,
    cacheData,
    updateCachedData,
    refreshFromNetwork,
    clearCache,
  };
}

/**
 * Hook for tab prefetching
 * Preloads adjacent tab data in the background
 */
export function useTabPrefetch(
  currentTabId: string,
  tabIds: string[],
  prefetchFn: (tabId: string) => Promise<any>
) {
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Find adjacent tabs
    const currentIndex = tabIds.indexOf(currentTabId);
    const nextTabId = tabIds[currentIndex + 1];
    const prevTabId = tabIds[currentIndex - 1];

    const tabsToPrefetch = [nextTabId, prevTabId].filter(Boolean);

    // Prefetch in background with low priority
    tabsToPrefetch.forEach(tabId => {
      if (!prefetchedRef.current.has(tabId)) {
        prefetchedRef.current.add(tabId);

        // Debounce prefetch to avoid too many requests
        setTimeout(() => {
          prefetchFn(tabId).catch(error => {
            console.debug(`Prefetch failed for tab ${tabId}:`, error);
          });
        }, 500);
      }
    });
  }, [currentTabId, tabIds, prefetchFn]);
}

/**
 * Hook for managing tab transition animations
 */
export function useTabTransition() {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();

  const startTransition = () => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    setIsTransitioning(true);

    // End transition after 80ms (ultra-fast)
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 80);
  };

  const stopTransition = () => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    setIsTransitioning(false);
  };

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  return { isTransitioning, startTransition, stopTransition };
}
