import { useCallback, useEffect, useState } from 'react';
import { offlineService, SyncStatus, SyncQueueItem } from '@/services/offlineService';
import { networkStatusManager } from '@/services/networkStatusManager';

interface OptimisticUpdateOptions {
  entity: string;
  entityId: string;
  optimisticData: any;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for optimistic UI updates with offline sync
 * Updates UI immediately while syncing in background
 */
export function useOptimisticUpdate() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const optimisticUpdate = useCallback(
    async (
      updateFn: () => Promise<any>,
      options: OptimisticUpdateOptions
    ) => {
      try {
        setError(null);
        setIsSyncing(true);

        // Apply optimistic update immediately
        const optimisticResult = options.optimisticData;
        options.onSuccess?.(optimisticResult);

        // Queue for sync
        await offlineService.queueChange({
          type: 'update',
          entity: options.entity as any,
          entityId: options.entityId,
          data: optimisticResult,
        });

        // Try to sync immediately if online
        if (networkStatusManager.isOnline()) {
          try {
            const result = await updateFn();
            options.onSuccess?.(result);
          } catch (syncError) {
            // Queued for retry, but optimistic update is already applied
            console.warn('[OptimisticUpdate] Sync error:', syncError);
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Update failed');
        setError(error);
        options.onError?.(error);
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  return { optimisticUpdate, isSyncing, error };
}

/**
 * Hook for monitoring sync status
 */
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    queueLength: 0,
    isOffline: !networkStatusManager.isOnline(),
    pendingChanges: 0,
  });

  useEffect(() => {
    const unsubscribe = offlineService.subscribe(setStatus);
    return () => unsubscribe();
  }, []);

  return status;
}

/**
 * Hook for conflict detection and resolution
 */
export function useConflictResolver(
  entityType: string,
  entityId: string
) {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    const checkConflicts = async () => {
      const allConflicts = await offlineService.getConflicts();
      const relevant = allConflicts.filter(
        c => c.localItem.entity === entityType && c.localItem.entityId === entityId
      );
      setConflicts(relevant);
    };

    checkConflicts();
    const interval = setInterval(checkConflicts, 5000);
    return () => clearInterval(interval);
  }, [entityType, entityId]);

  const resolve = useCallback(
    async (conflictId: string, strategy: 'local' | 'remote') => {
      try {
        setResolving(true);
        await offlineService.resolveConflict(conflictId, strategy);
        setConflicts(prev => prev.filter(c => c.localItem.id !== conflictId));
      } catch (error) {
        console.error('[ConflictResolver] Error resolving conflict:', error);
      } finally {
        setResolving(false);
      }
    },
    []
  );

  return { conflicts, resolve, resolving };
}

/**
 * Hook for offline-first data fetching with caching
 */
export function useOfflineFirstData<T>(
  fetchFn: () => Promise<T>,
  cacheKey: string,
  options?: {
    ttl?: number;
    revalidateOnFocus?: boolean;
    revalidateOnReconnect?: boolean;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch fresh data
      const result = await fetchFn();
      setData(result);
      setIsStale(false);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fetch failed');
      setError(error);

      // Fall back to cached data
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          setData(cachedData);
          setIsStale(true);
        } catch {
          setData(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFn, cacheKey]);

  // Initial fetch
  useEffect(() => {
    fetch();
  }, []);

  // Revalidate on network reconnect
  useEffect(() => {
    if (!options?.revalidateOnReconnect) return;

    const unsubscribe = networkStatusManager.subscribe(status => {
      if ((status === 'online' || status === 'reconnecting') && isStale) {
        fetch();
      }
    });

    return () => unsubscribe();
  }, [fetch, isStale, options?.revalidateOnReconnect]);

  // Revalidate on window focus
  useEffect(() => {
    if (!options?.revalidateOnFocus) return;

    const handleFocus = () => {
      if (isStale) {
        fetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetch, isStale, options?.revalidateOnFocus]);

  return { data, loading, error, isStale, refetch: fetch };
}

/**
 * Hook for background data sync
 */
export function useBackgroundSync(
  entity: string,
  entityId: string,
  shouldSync: boolean = true
) {
  const [synced, setSynced] = useState(false);
  const syncStatus = useSyncStatus();

  useEffect(() => {
    if (!shouldSync) return;

    // Check if this specific entity is synced
    const isSynced = !syncStatus.isSyncing &&
                    !syncStatus.pendingChanges &&
                    syncStatus.queueLength === 0;

    setSynced(isSynced);
  }, [shouldSync, syncStatus]);

  return { synced, hasPendingChanges: !synced };
}
