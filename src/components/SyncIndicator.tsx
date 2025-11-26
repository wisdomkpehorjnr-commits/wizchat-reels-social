import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useSyncStatus } from '@/hooks/useOfflineFirst';
import { networkStatusManager } from '@/services/networkStatusManager';

interface SyncIndicatorProps {
  position?: 'top-right' | 'bottom-right' | 'bottom-left';
  variant?: 'compact' | 'expanded';
  showQueueCount?: boolean;
}

/**
 * Sync indicator shows offline status, pending changes, and sync progress
 */
export function SyncIndicator({
  position = 'bottom-right',
  variant = 'compact',
  showQueueCount = true,
}: SyncIndicatorProps) {
  const syncStatus = useSyncStatus();
  const [connectionStatus, setConnectionStatus] = useState<string>('online');

  useEffect(() => {
    const unsubscribe = networkStatusManager.subscribe(status => {
      setConnectionStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const getPositionClass = () => {
    const baseClass = 'fixed z-40';
    switch (position) {
      case 'top-right':
        return `${baseClass} top-4 right-4`;
      case 'bottom-left':
        return `${baseClass} bottom-4 left-4`;
      case 'bottom-right':
      default:
        return `${baseClass} bottom-4 right-4`;
    }
  };

  const isOnline = !syncStatus.isOffline && connectionStatus === 'online';
  const hasPending = syncStatus.queueLength > 0 || syncStatus.pendingChanges > 0;

  if (variant === 'compact') {
    return (
      <div className={`${getPositionClass()} group cursor-pointer`} title={
        isOnline
          ? hasPending ? `${syncStatus.queueLength} pending changes` : 'All synced'
          : 'Offline - changes queued for sync'
      }>
        {isOnline ? (
          <>
            {hasPending ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950 rounded-full border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-all">
                <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                {showQueueCount && (
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                    {syncStatus.queueLength > 99 ? '99+' : syncStatus.queueLength}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950 rounded-full border border-green-200 dark:border-green-800 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs text-green-700 dark:text-green-300 font-medium">Synced</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950 rounded-full border border-amber-200 dark:border-amber-800 shadow-sm">
            <CloudOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">Offline</span>
          </div>
        )}
      </div>
    );
  }

  // Expanded view
  return (
    <div className={`${getPositionClass()} min-w-[250px]`}>
      <div className="bg-white dark:bg-slate-950 rounded-lg shadow-lg border border-gray-200 dark:border-slate-800 p-4 space-y-3">
        {/* Status header */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <CloudOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          )}
          <span className="font-semibold text-sm text-foreground">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Sync status */}
        <div className="space-y-2 text-xs">
          {hasPending && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
              <Loader2 className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin" />
              <span className="text-blue-700 dark:text-blue-300">
                {syncStatus.queueLength} pending change{syncStatus.queueLength !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {syncStatus.lastSyncTime && (
            <div className="text-muted-foreground">
              Last synced: {new Date(syncStatus.lastSyncTime).toLocaleTimeString()}
            </div>
          )}

          {!isOnline && hasPending && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950 rounded border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span className="text-amber-700 dark:text-amber-300">
                Changes will sync when online
              </span>
            </div>
          )}
        </div>

        {/* Manual sync button */}
        {hasPending && isOnline && (
          <button
            onClick={async () => {
              // Trigger manual sync
              const { offlineService } = await import('@/services/offlineService');
              await offlineService.manualSync();
            }}
            className="w-full px-3 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Sync Now
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Queue status badge - shows number of pending changes
 */
export function QueueStatusBadge() {
  const syncStatus = useSyncStatus();

  if (syncStatus.queueLength === 0) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      {syncStatus.queueLength > 99 ? '99+' : syncStatus.queueLength} pending
    </div>
  );
}

/**
 * Conflict resolution dialog
 */
export function ConflictResolutionDialog({
  open,
  conflict,
  onResolve,
  onDismiss,
}: {
  open: boolean;
  conflict: any;
  onResolve: (strategy: 'local' | 'remote') => Promise<void>;
  onDismiss: () => void;
}) {
  const [resolving, setResolving] = useState(false);

  if (!open || !conflict) return null;

  const handleResolve = async (strategy: 'local' | 'remote') => {
    setResolving(true);
    try {
      await onResolve(strategy);
      onDismiss();
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-950 rounded-lg shadow-lg p-6 max-w-sm space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h3 className="font-semibold text-foreground">Data Conflict</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Your changes conflict with updates from the server. Choose which version to keep:
        </p>

        <div className="space-y-2">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Your version</p>
            <p className="text-xs text-muted-foreground truncate">
              {JSON.stringify(conflict.localItem.data).substring(0, 100)}...
            </p>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded border border-amber-200 dark:border-amber-800">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">Server version</p>
            <p className="text-xs text-muted-foreground truncate">
              {JSON.stringify(conflict.remoteData).substring(0, 100)}...
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleResolve('local')}
            disabled={resolving}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
          >
            {resolving ? 'Resolving...' : 'Keep Yours'}
          </button>
          <button
            onClick={() => handleResolve('remote')}
            disabled={resolving}
            className="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
          >
            {resolving ? 'Resolving...' : 'Use Server'}
          </button>
        </div>

        <button
          onClick={onDismiss}
          disabled={resolving}
          className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 text-sm font-medium rounded transition-colors disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
