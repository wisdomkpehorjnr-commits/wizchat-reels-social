/**
 * Tab Preload Manager
 * Handles background prefetching and caching of tab content for instant switching
 */

import { cacheService } from '@/services/cacheService';
import { requestManager } from '@/lib/performanceUtils';

interface TabConfig {
  id: string;
  name: string;
  loadFn: () => Promise<any>;
  ttl?: number;
}

class TabPreloadManager {
  private tabs: Map<string, TabConfig> = new Map();
  private preloadedTabs: Set<string> = new Set();
  private isInitialized = false;

  /**
   * Register a tab for preloading
   */
  registerTab(config: TabConfig) {
    this.tabs.set(config.id, {
      ...config,
      ttl: config.ttl || 30 * 60 * 1000, // Default 30 minutes
    });
  }

  /**
   * Initialize preloading for all registered tabs
   * Should be called after app loads
   */
  async initializePreload() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log(`[TabPreloadManager] Starting preload for ${this.tabs.size} tabs`);

    // Preload all tabs in background with staggered timing
    let delay = 500; // Start after 500ms
    for (const [tabId, config] of this.tabs) {
      setTimeout(() => {
        this.preloadTab(tabId, config).catch(error => {
          console.debug(`[TabPreloadManager] Preload failed for ${tabId}:`, error);
        });
      }, delay);

      delay += 300; // Add 300ms between each preload
    }
  }

  /**
   * Preload a specific tab
   */
  private async preloadTab(tabId: string, config: TabConfig) {
    try {
      // Check if already cached
      const cached = await cacheService.get(`tab_${tabId}`);
      if (cached) {
        console.log(`[TabPreloadManager] Tab ${tabId} already cached`);
        this.preloadedTabs.add(tabId);
        return;
      }

      // Load from network with request manager
      const data = await requestManager.executeRequest(
        `preload_${tabId}`,
        () => config.loadFn(),
        {
          timeout: 15 * 1000, // 15 second timeout
          cache: false, // We'll handle caching ourselves
          priority: 'low',
        }
      );

      // Cache the data
      await cacheService.set(`tab_${tabId}`, data, config.ttl);
      this.preloadedTabs.add(tabId);

      console.log(`[TabPreloadManager] Tab ${tabId} preloaded successfully`);
    } catch (error) {
      console.debug(`[TabPreloadManager] Failed to preload tab ${tabId}:`, error);
      // Silently fail - don't block app
    }
  }

  /**
   * Prefetch adjacent tabs when user navigates
   */
  async prefetchAdjacentTabs(tabIds: string[], currentTabId: string) {
    const currentIndex = tabIds.indexOf(currentTabId);
    const nextTabId = tabIds[currentIndex + 1];
    const prevTabId = tabIds[currentIndex - 1];

    const adjacentIds = [nextTabId, prevTabId].filter(Boolean);

    for (const tabId of adjacentIds) {
      const config = this.tabs.get(tabId);
      if (config && !this.preloadedTabs.has(tabId)) {
        // Prefetch in background
        setTimeout(() => {
          this.preloadTab(tabId, config).catch(error => {
            console.debug(`Prefetch failed for adjacent tab ${tabId}:`, error);
          });
        }, 100);
      }
    }
  }

  /**
   * Get preload stats
   */
  getStats() {
    return {
      registeredTabs: this.tabs.size,
      preloadedTabs: this.preloadedTabs.size,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Clear all preloaded data
   */
  async clearAll() {
    for (const tabId of this.preloadedTabs) {
      await cacheService.remove(`tab_${tabId}`);
    }
    this.preloadedTabs.clear();
  }
}

export const tabPreloadManager = new TabPreloadManager();
