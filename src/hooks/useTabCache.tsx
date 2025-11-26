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
 * Displays cached content instantly, refreshes in background
 */
export function useTabCache(options: TabCacheOptions) {
  const { tabId, enabled = true, ttl = 30 * 60 * 1000, onStatusChange } = options;
  const [cachedData, setCachedData] = useState<CachedTabData | null>(null);
  const isInitializedRef = useRef(false);
  const isOfflineRef = useRef(false);

  useEffect(() => {
    if (!enabled || isInitializedRef.current) return;

    isInitializedRef.current = true;

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
        console.error(`[TabCache] Error loading cache for ${tabId}:`, error);
      }
    };

    loadCachedData();

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
      console.error(`[TabCache] Error caching data for ${tabId}:`, error);
    }
  };

  const updateCachedData = async (updater: (prev: any) => any) => {
    try {
      const updated = updater(cachedData?.data);
      await cacheData(updated);
    } catch (error) {
      console.error(`[TabCache] Error updating cache for ${tabId}:`, error);
    }
  };

  const refreshFromNetwork = async (fetchFn: () => Promise<any>) => {
    try {
      const freshData = await fetchFn();
      await cacheData(freshData);
      return freshData;
    } catch (error) {
      console.error(`[TabCache] Error refreshing cache for ${tabId}:`, error);
      return cachedData?.data;
    }
  };

  const clearCache = async () => {
    try {
      await cacheService.remove(`tab_${tabId}`);
      setCachedData(null);
      onStatusChange?.('loading');
    } catch (error) {
      console.error(`[TabCache] Error clearing cache for ${tabId}:`, error);
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
 * Hook for tab prefetching (adjacent tabs)
 */
export function useTabPrefetch(
  currentTabId: string,
  tabIds: string[],
  prefetchFn: (tabId: string) => Promise<any>
) {
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIndex = tabIds.indexOf(currentTabId);
    const nextTabId = tabIds[currentIndex + 1];
    const prevTabId = tabIds[currentIndex - 1];

    const tabsToPrefetch = [nextTabId, prevTabId].filter(Boolean);

    tabsToPrefetch.forEach(tabId => {
      if (!prefetchedRef.current.has(tabId)) {
        prefetchedRef.current.add(tabId);

        setTimeout(() => {
          prefetchFn(tabId).catch(error => {
            console.debug(`[TabPrefetch] Prefetch failed for ${tabId}:`, error);
          });
        }, 500);
      }
    });
  }, [currentTabId, tabIds, prefetchFn]);
}
