/**
 * Offline Service - Central orchestration for offline-first architecture
 * Handles sync queue, conflict resolution, retry logic, and local-first operations
 * 
 * Key principles:
 * 1. All data changes saved locally first
 * 2. Changes synced to server in background with exponential backoff
 * 3. Conflicts resolved using timestamps and user preferences
 * 4. Complete app functionality offline
 */

import { cacheService } from './cacheService';
import { networkStatusManager } from './networkStatusManager';

export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'post' | 'comment' | 'message' | 'friend' | 'like' | 'reaction';
  entityId: string;
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface SyncStatus {
  isSyncing: boolean;
  queueLength: number;
  lastSyncTime?: number;
  isOffline: boolean;
  pendingChanges: number;
}

export interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge';
  resolvedData: any;
  timestamp: number;
}

const SYNC_QUEUE_KEY = 'sync-queue';
const SYNC_HISTORY_KEY = 'sync-history';
const CONFLICT_KEY = 'conflicts';
const MAX_RETRIES = 5;
const RETRY_BASE_DELAY = 1000; // 1 second
const BATCH_SIZE = 10;

class OfflineService {
  private syncSubscribers: ((status: SyncStatus) => void)[] = [];
  private isSyncing = false;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private conflictResolvers: Map<string, (resolution: ConflictResolution) => Promise<void>> = new Map();

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    // Start monitoring network status
    networkStatusManager.subscribe((status) => {
      if (status === 'online' || status === 'reconnecting') {
        this.startSync();
      }
    });

    // Initial sync attempt if online
    if (networkStatusManager.isOnline()) {
      setTimeout(() => this.startSync(), 2000);
    }
  }

  /**
   * Queue a change for offline sync
   * Data is saved locally immediately, synced when online
   */
  async queueChange(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) {
    try {
      const syncItem: SyncQueueItem = {
        ...item,
        id: `${item.entity}-${item.entityId}-${Date.now()}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      // Get existing queue
      const queue = await this.getSyncQueue();

      // Check for duplicate recent changes (debouncing)
      const isDuplicate = queue.some(
        q => q.entity === item.entity &&
             q.entityId === item.entityId &&
             q.type === item.type &&
             (Date.now() - q.timestamp) < 2000 // Within 2 seconds
      );

      if (!isDuplicate) {
        queue.push(syncItem);
        await cacheService.set(SYNC_QUEUE_KEY, queue);
        this.notifySubscribers();

        // If online, start syncing immediately
        if (networkStatusManager.isOnline()) {
          this.startSync();
        }
      }
    } catch (error) {
      console.error('[OfflineService] Error queueing change:', error);
    }
  }

  /**
   * Start syncing queue with exponential backoff
   */
  private startSync = async () => {
    if (this.isSyncing || !networkStatusManager.isOnline()) {
      return;
    }

    this.isSyncing = true;
    this.notifySubscribers();

    try {
      const queue = await this.getSyncQueue();

      if (queue.length === 0) {
        this.isSyncing = false;
        this.notifySubscribers();
        return;
      }

      // Process queue in batches
      for (let i = 0; i < queue.length; i += BATCH_SIZE) {
        if (!networkStatusManager.isOnline()) {
          break; // Stop if connection lost
        }

        const batch = queue.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(batch.map(item => this.syncItem(item)));
      }

      // Re-fetch remaining queue
      const updatedQueue = await this.getSyncQueue();

      if (updatedQueue.length === 0) {
        await cacheService.set(SYNC_HISTORY_KEY, {
          lastSyncTime: Date.now(),
          successCount: queue.length,
          totalAttempted: queue.length,
        });
      }

      this.notifySubscribers();
    } catch (error) {
      console.error('[OfflineService] Sync error:', error);
    } finally {
      this.isSyncing = false;
      this.notifySubscribers();

      // Schedule next sync attempt
      if (networkStatusManager.isOnline()) {
        this.syncTimer = setTimeout(() => this.startSync(), 5000);
      }
    }
  };

  /**
   * Attempt to sync a single item
   */
  private syncItem = async (item: SyncQueueItem) => {
    try {
      const response = await this.executeSyncOperation(item);

      if (response.conflict) {
        // Handle conflict
        await this.handleConflict(item, response.remoteData);
      } else {
        // Success - remove from queue
        await this.removeFromQueue(item.id);
      }
    } catch (error) {
      const err = error instanceof Error ? error.message : 'Unknown error';

      if (item.retryCount < MAX_RETRIES) {
        // Retry with exponential backoff
        const delay = RETRY_BASE_DELAY * Math.pow(2, item.retryCount);
        item.retryCount++;
        item.lastError = err;

        await this.updateQueueItem(item);

        setTimeout(() => {
          this.syncItem(item);
        }, delay);
      } else {
        // Max retries exceeded - mark as failed
        await this.markItemFailed(item, err);
      }
    }
  };

  /**
   * Execute the actual sync operation (delegated to specific services)
   */
  private executeSyncOperation = async (item: SyncQueueItem) => {
    // This would be implemented by delegating to actual API services
    // For now, return a mock successful response
    return { success: true, conflict: false };
  };

  /**
   * Handle conflicts between local and remote data
   */
  private handleConflict = async (
    item: SyncQueueItem,
    remoteData: any
  ) => {
    try {
      // Store conflict for user resolution
      const conflicts = await this.getConflicts();
      conflicts.push({
        localItem: item,
        remoteData,
        timestamp: Date.now(),
      });

      await cacheService.set(CONFLICT_KEY, conflicts);

      // Try automatic resolution first
      const resolver = this.conflictResolvers.get(`${item.entity}-${item.entityId}`);
      if (resolver) {
        const resolution = await this.autoResolveConflict(item, remoteData);
        await resolver(resolution);
        await this.removeFromQueue(item.id);
      }
    } catch (error) {
      console.error('[OfflineService] Error handling conflict:', error);
    }
  };

  /**
   * Automatic conflict resolution using timestamp strategy
   */
  private autoResolveConflict = async (
    item: SyncQueueItem,
    remoteData: any
  ): Promise<ConflictResolution> => {
    const remoteTimestamp = remoteData.updated_at || remoteData.created_at || 0;
    const localTimestamp = item.timestamp;

    // Local is newer - use local
    if (localTimestamp > remoteTimestamp) {
      return {
        strategy: 'local',
        resolvedData: item.data,
        timestamp: localTimestamp,
      };
    }

    // Remote is newer - use remote
    return {
      strategy: 'remote',
      resolvedData: remoteData,
      timestamp: remoteTimestamp,
    };
  };

  /**
   * Get current sync status
   */
  getStatus = async (): Promise<SyncStatus> => {
    const queue = await this.getSyncQueue();
    return {
      isSyncing: this.isSyncing,
      queueLength: queue.length,
      lastSyncTime: (await cacheService.get<any>(SYNC_HISTORY_KEY))?.lastSyncTime,
      isOffline: !networkStatusManager.isOnline(),
      pendingChanges: queue.filter(q => q.retryCount === 0).length,
    };
  };

  /**
   * Manually trigger sync
   */
  async manualSync() {
    await this.startSync();
  }

  /**
   * Clear sync queue
   */
  async clearQueue() {
    await cacheService.remove(SYNC_QUEUE_KEY);
    this.notifySubscribers();
  }

  /**
   * Get conflicts for user resolution
   */
  async getConflicts() {
    return (await cacheService.get<any[]>(CONFLICT_KEY)) || [];
  }

  /**
   * Resolve conflict manually
   */
  async resolveConflict(conflictId: string, strategy: 'local' | 'remote') {
    try {
      const conflicts = await this.getConflicts();
      const conflict = conflicts.find(c => c.localItem.id === conflictId);

      if (conflict) {
        const resolution: ConflictResolution = {
          strategy,
          resolvedData: strategy === 'local' ? conflict.localItem.data : conflict.remoteData,
          timestamp: Date.now(),
        };

        // Re-sync with resolution
        if (strategy === 'local') {
          await this.queueChange({
            type: conflict.localItem.type,
            entity: conflict.localItem.entity,
            entityId: conflict.localItem.entityId,
            data: conflict.localItem.data,
          });
        } else {
          // Remove local version, accept remote
          await this.removeFromQueue(conflictId);
        }

        // Remove from conflicts list
        const updated = conflicts.filter(c => c.localItem.id !== conflictId);
        await cacheService.set(CONFLICT_KEY, updated);
      }
    } catch (error) {
      console.error('[OfflineService] Error resolving conflict:', error);
    }
  }

  /**
   * Register conflict resolver callback
   */
  registerConflictResolver(
    entityKey: string,
    resolver: (resolution: ConflictResolution) => Promise<void>
  ) {
    this.conflictResolvers.set(entityKey, resolver);
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(callback: (status: SyncStatus) => void) {
    this.syncSubscribers.push(callback);
    return () => {
      this.syncSubscribers = this.syncSubscribers.filter(s => s !== callback);
    };
  }

  private notifySubscribers = async () => {
    const status = await this.getStatus();
    this.syncSubscribers.forEach(cb => cb(status));
  };

  private getSyncQueue = async (): Promise<SyncQueueItem[]> => {
    return (await cacheService.get<SyncQueueItem[]>(SYNC_QUEUE_KEY)) || [];
  };

  private removeFromQueue = async (itemId: string) => {
    const queue = await this.getSyncQueue();
    const updated = queue.filter(q => q.id !== itemId);
    await cacheService.set(SYNC_QUEUE_KEY, updated);
  };

  private updateQueueItem = async (item: SyncQueueItem) => {
    const queue = await this.getSyncQueue();
    const index = queue.findIndex(q => q.id === item.id);
    if (index !== -1) {
      queue[index] = item;
      await cacheService.set(SYNC_QUEUE_KEY, queue);
    }
  };

  private markItemFailed = async (item: SyncQueueItem, error: string) => {
    const queue = await this.getSyncQueue();
    const index = queue.findIndex(q => q.id === item.id);
    if (index !== -1) {
      queue[index].lastError = error;
      await cacheService.set(SYNC_QUEUE_KEY, queue);
    }
  };
}

export const offlineService = new OfflineService();
