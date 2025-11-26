/**
 * Offline Configuration and Initialization
 * Central place to configure all offline-first features
 */

import { cacheService } from './cacheService';
import { networkStatusManager } from './networkStatusManager';
import { offlineService } from './offlineService';
import { offlineDataManager } from './offlineDataManager';

/**
 * Offline configuration constants
 */
export const OFFLINE_CONFIG = {
  // Cache settings
  cache: {
    enabled: true,
    version: 'v1',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxSize: 50 * 1024 * 1024, // 50MB
  },

  // Sync settings
  sync: {
    enabled: true,
    batchSize: 10,
    maxRetries: 5,
    retryDelay: 1000, // 1 second base delay
    offlineSyncInterval: 5000, // 5 seconds when offline
  },

  // Network settings
  network: {
    slowThreshold: 500000, // 500kbps
    timeoutShort: 5000,
    timeoutNormal: 15000,
    timeoutLong: 30000,
  },

  // Storage settings
  storage: {
    indexedDB: {
      enabled: true,
      dbName: 'wizchat-offline',
      version: 1,
    },
    localStorage: {
      enabled: true,
      maxSize: 5 * 1024 * 1024, // 5MB
    },
  },

  // Feature flags
  features: {
    optimisticUpdates: true,
    backgroundSync: true,
    conflictResolution: true,
    imageOptimization: true,
    requestBatching: true,
    compressionEnabled: false, // Disabled by default, enable if needed
  },

  // Page-specific caching
  pages: {
    home: {
      cacheEnabled: true,
      ttl: 15 * 60 * 1000, // 15 minutes
      staleWhileRevalidate: true,
    },
    reels: {
      cacheEnabled: true,
      ttl: 20 * 60 * 1000, // 20 minutes
      staleWhileRevalidate: true,
    },
    chat: {
      cacheEnabled: true,
      ttl: 10 * 60 * 1000, // 10 minutes
      staleWhileRevalidate: false, // Messages need to be fresh
    },
    profile: {
      cacheEnabled: true,
      ttl: 30 * 60 * 1000, // 30 minutes
      staleWhileRevalidate: true,
    },
    friends: {
      cacheEnabled: true,
      ttl: 60 * 60 * 1000, // 1 hour
      staleWhileRevalidate: true,
    },
    topics: {
      cacheEnabled: true,
      ttl: 60 * 60 * 1000, // 1 hour
      staleWhileRevalidate: true,
    },
  },
};

/**
 * Initialize all offline-first services
 */
export async function initializeOfflineMode() {
  try {
    console.log('[Offline] Initializing offline-first mode...');

    // 1. Initialize caching service
    if (OFFLINE_CONFIG.cache.enabled) {
      console.log('[Offline] Caching service ready');
    }

    // 2. Initialize network status monitoring
    console.log(`[Offline] Network monitoring: ${navigator.onLine ? 'online' : 'offline'}`);

    // 3. Initialize offline service
    console.log('[Offline] Offline sync service initialized');

    // 4. Initialize data manager
    console.log('[Offline] Data manager initialized');

    // 5. Register service worker
    if ('serviceWorker' in navigator && OFFLINE_CONFIG.cache.enabled) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
        });
        console.log('[Offline] Service Worker registered:', registration);
      } catch (error) {
        console.warn('[Offline] Service Worker registration failed:', error);
      }
    }

    // 6. Enable periodic sync
    if ('serviceWorker' in navigator && 'SyncManager' in window && OFFLINE_CONFIG.sync.enabled) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-offline-queue');
        console.log('[Offline] Periodic sync registered');
      } catch (error) {
        console.debug('[Offline] Periodic sync not available:', error);
      }
    }

    // 7. Monitor storage quota
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usagePercent = ((estimate.usage || 0) / (estimate.quota || 1)) * 100;
      console.log(`[Offline] Storage usage: ${usagePercent.toFixed(1)}%`);

      if (usagePercent > 80) {
        console.warn('[Offline] Storage usage above 80%, cleanup may be needed');
      }
    }

    console.log('[Offline] Initialization complete - App is offline-first!');
  } catch (error) {
    console.error('[Offline] Initialization error:', error);
  }
}

/**
 * Get offline status summary
 */
export async function getOfflineStatus() {
  try {
    const syncStatus = await offlineService.getStatus();
    const stats = await offlineDataManager.getStats();
    const isOnline = networkStatusManager.isOnline();

    return {
      isOnline,
      sync: syncStatus,
      storage: stats,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[Offline] Status error:', error);
    return null;
  }
}

/**
 * Debug helper - Log offline status
 */
export async function debugOfflineStatus() {
  console.group('🔌 Offline Mode Status');

  const isOnline = networkStatusManager.isOnline();
  console.log(`Connection: ${isOnline ? '🟢 Online' : '🔴 Offline'}`);

  const syncStatus = await offlineService.getStatus();
  console.log(`Sync Queue: ${syncStatus.queueLength} items`);
  console.log(`Syncing: ${syncStatus.isSyncing ? 'Yes' : 'No'}`);
  console.log(`Pending Changes: ${syncStatus.pendingChanges}`);

  const stats = await offlineDataManager.getStats();
  if (stats) {
    console.log(`Cached Items: ${stats.totalEntries}`);
    console.log(`By Domain:`, stats.byDomain);
  }

  console.groupEnd();
}

/**
 * Export all offline services and config
 */
export {
  cacheService,
  networkStatusManager,
  offlineService,
  offlineDataManager,
};
