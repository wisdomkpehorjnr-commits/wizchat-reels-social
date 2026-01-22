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
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-full border border-border shadow-sm hover:shadow-md transition-all">
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                {showQueueCount && (
                  <span className="text-xs text-foreground font-medium">
                    {syncStatus.queueLength > 99 ? '99+' : syncStatus.queueLength}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-full border border-border shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-foreground" />
                <span className="text-xs text-foreground font-medium">Synced</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-full border border-border shadow-sm">
            <CloudOff className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-foreground font-medium">Offline</span>
          </div>
        )}
      </div>
    );
  }

  // Expanded view
  return (
    <div className={`${getPositionClass()} min-w-[250px]`}>
      <div className="bg-card rounded-lg shadow-lg border border-border p-4 space-y-3">
        {/* Status header */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Cloud className="w-5 h-5 text-foreground" />
          ) : (
            <CloudOff className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="font-semibold text-sm text-foreground">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Sync status */}
        <div className="space-y-2 text-xs">
        {hasPending && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded border border-border">
              <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
              <span className="text-foreground">
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
            <div className="flex items-center gap-2 p-2 bg-muted rounded border border-border">
              <AlertCircle className="w-3 h-3 text-muted-foreground" />
              <span className="text-foreground">
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
            className="w-full px-3 py-2 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors"
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
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground rounded-full text-xs font-medium">
      <div className="w-2 h-2 bg-foreground rounded-full animate-pulse" />
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
      <div className="bg-card rounded-lg shadow-lg p-6 max-w-sm space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Data Conflict</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Your changes conflict with updates from the server. Choose which version to keep:
        </p>

        <div className="space-y-2">
          <div className="p-3 bg-muted rounded border border-border">
            <p className="text-xs font-medium text-foreground mb-1">Your version</p>
            <p className="text-xs text-muted-foreground truncate">
              {JSON.stringify(conflict.localItem.data).substring(0, 100)}...
            </p>
          </div>

          <div className="p-3 bg-muted rounded border border-border">
            <p className="text-xs font-medium text-foreground mb-1">Server version</p>
            <p className="text-xs text-muted-foreground truncate">
              {JSON.stringify(conflict.remoteData).substring(0, 100)}...
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleResolve('local')}
            disabled={resolving}
            className="flex-1 px-3 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-medium rounded transition-colors"
          >
            {resolving ? 'Resolving...' : 'Keep Yours'}
          </button>
          <button
            onClick={() => handleResolve('remote')}
            disabled={resolving}
            className="flex-1 px-3 py-2 bg-secondary hover:bg-secondary/90 disabled:opacity-50 text-secondary-foreground text-sm font-medium rounded transition-colors"
          >
            {resolving ? 'Resolving...' : 'Use Server'}
          </button>
        </div>

        <button
          onClick={onDismiss}
          disabled={resolving}
          className="w-full px-3 py-2 border border-border hover:bg-muted text-sm font-medium rounded transition-colors disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
