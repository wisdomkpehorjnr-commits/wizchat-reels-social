import { useEffect, useState, useCallback } from 'react';
import { networkStatusManager, ConnectionStatus, ConnectionSpeed } from '@/services/networkStatusManager';

export function useNetworkStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(
    networkStatusManager.getStatus()
  );
  const [speed, setSpeed] = useState<ConnectionSpeed>(
    networkStatusManager.getSpeed()
  );

  useEffect(() => {
    const unsubscribe = networkStatusManager.subscribe((newStatus, newSpeed) => {
      setStatus(newStatus);
      setSpeed(newSpeed);
    });

    return unsubscribe;
  }, []);

  const isOnline = useCallback(() => networkStatusManager.isOnline(), []);
  const isOffline = useCallback(() => networkStatusManager.isOffline(), []);
  const isSlow = useCallback(() => networkStatusManager.isSlow(), []);

  return {
    status,
    speed,
    isOnline: isOnline(),
    isOffline: isOffline(),
    isSlow: isSlow(),
    timeSinceLastOnline: networkStatusManager.getTimeSinceLastOnline(),
  };
}

/**
 * Hook for smart caching strategy based on network speed
 */
export function useSmartCache(
  fetchFn: () => Promise<any>,
  cacheKey: string,
  options: { cacheTTL?: number; timeout?: number } = {}
) {
  const { isOffline, isSlow } = useNetworkStatus();
  const { cacheTTL = 5 * 60 * 1000, timeout = 30 * 1000 } = options;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isCached, setIsCached] = useState(false);

  // Fetch with smart cache strategy
  const fetchWithCache = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check localStorage cache first
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          // If offline or cache is fresh, use it
          if (isOffline || age < cacheTTL) {
            setData(cachedData);
            setIsCached(true);
            setLoading(false);

            // If online and slow, don't try to refresh
            if (isOffline || isSlow) {
              return;
            }
          }
        } catch (e) {
          console.error('Error parsing cached data:', e);
          localStorage.removeItem(cacheKey);
        }
      }

      // If offline, stop here
      if (isOffline) {
        setLoading(false);
        return;
      }

      // Fetch fresh data with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const freshData = await fetchFn();

        clearTimeout(timeoutId);

        // Cache the fresh data
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: freshData,
            timestamp: Date.now(),
          })
        );

        setData(freshData);
        setIsCached(false);
        setError(null);
      } catch (fetchError) {
        clearTimeout(timeoutId);

        // Fetch failed, use cached data if available
        if (cached) {
          try {
            const { data: cachedData } = JSON.parse(cached);
            setData(cachedData);
            setIsCached(true);
            return;
          } catch (e) {
            // Cache parse failed too
          }
        }

        throw fetchError;
      }
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, cacheKey, cacheTTL, timeout, isOffline, isSlow]);

  useEffect(() => {
    fetchWithCache();
  }, [fetchWithCache]);

  return { data, loading, error, isCached };
}
