/**
 * Offline Data Manager - Comprehensive caching for all app pages
 * Manages cache lifecycle, invalidation, and persistence
 */

import { cacheService } from './cacheService';

interface CacheKey {
  domain: 'feed' | 'reels' | 'messages' | 'profile' | 'friends' | 'topics' | 'notifications';
  scope?: string;
  identifier?: string;
}

interface CacheMetadata {
  key: string;
  domain: string;
  createdAt: number;
  updatedAt: number;
  ttl: number;
  expiresAt: number;
  accessCount: number;
  lastAccessAt: number;
}

const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
const CRITICAL_TTL = 60 * 60 * 1000; // 1 hour for critical data
const TEMP_TTL = 5 * 60 * 1000; // 5 minutes for temporary data

class OfflineDataManager {
  private metadata: Map<string, CacheMetadata> = new Map();
  private metadataKey = 'cache-metadata';

  constructor() {
    this.loadMetadata();
    // Cleanup stale cache every 15 minutes
    setInterval(() => this.cleanupStaleCache(), 15 * 60 * 1000);
  }

  /**
   * Generate cache key from parameters
   */
  private generateKey(cacheKey: CacheKey): string {
    const parts = [cacheKey.domain as string];
    if (cacheKey.scope) parts.push(cacheKey.scope);
    if (cacheKey.identifier) parts.push(cacheKey.identifier);
    return `cache-${parts.join('-')}`;
  }

  /**
   * Cache feed/posts data
   */
  async cacheFeed(posts: any[], ttl = DEFAULT_TTL) {
    return this.set('feed' as const, 'all', posts, ttl);
  }

  async getCachedFeed() {
    return this.get('feed' as const, 'all');
  }

  /**
   * Cache reels data
   */
  async cacheReels(reels: any[], ttl = DEFAULT_TTL) {
    return this.set('reels', 'all', reels, ttl);
  }

  async getCachedReels() {
    return this.get('reels', 'all');
  }

  /**
   * Cache messages
   */
  async cacheMessages(chatId: string, messages: any[], ttl = DEFAULT_TTL) {
    return this.set('messages', chatId, messages, ttl);
  }

  async getCachedMessages(chatId: string) {
    return this.get('messages', chatId);
  }

  /**
   * Cache conversation list
   */
  async cacheConversations(conversations: any[], ttl = DEFAULT_TTL) {
    return this.set('messages', 'conversations', conversations, ttl);
  }

  async getCachedConversations() {
    return this.get('messages', 'conversations');
  }

  /**
   * Cache profile data
   */
  async cacheProfile(userId: string, profile: any, ttl = CRITICAL_TTL) {
    return this.set('profile', userId, profile, ttl);
  }

  async getCachedProfile(userId: string) {
    return this.get('profile', userId);
  }

  /**
   * Cache friends list
   */
  async cacheFriends(friends: any[], ttl = CRITICAL_TTL) {
    return this.set('friends', 'all', friends, ttl);
  }

  async getCachedFriends() {
    return this.get('friends', 'all');
  }

  /**
   * Cache topic rooms
   */
  async cacheTopicRooms(rooms: any[], ttl = CRITICAL_TTL) {
    return this.set('topics', 'all', rooms, ttl);
  }

  async getCachedTopicRooms() {
    return this.get('topics', 'all');
  }

  /**
   * Cache notifications
   */
  async cacheNotifications(notifications: any[], ttl = TEMP_TTL) {
    return this.set('notifications', 'all', notifications, ttl);
  }

  async getCachedNotifications() {
    return this.get('notifications', 'all');
  }

  /**
   * Generic set with metadata tracking
   */
  private async set(
    domain: CacheKey['domain'],
    scope: string,
    data: any,
    ttl: number
  ): Promise<void> {
    try {
      const key = `cache-${domain}-${scope}`;

      // Save data
      await cacheService.set(key, data, ttl);

      // Update metadata
      const now = Date.now();
      const metadata: CacheMetadata = {
        key,
        domain,
        createdAt: now,
        updatedAt: now,
        ttl,
        expiresAt: now + ttl,
        accessCount: 0,
        lastAccessAt: now,
      };

      this.metadata.set(key, metadata);
      await this.saveMetadata();
    } catch (error) {
      console.error('[OfflineDataManager] Set error:', error);
    }
  }

  /**
   * Generic get with metadata tracking
   */
  private async get(domain: CacheKey['domain'], scope: string): Promise<any> {
    try {
      const key = `cache-${domain}-${scope}`;

      // Get data
      const data = await cacheService.get(key);

      if (data) {
        // Update access metadata
        const metadata = this.metadata.get(key);
        if (metadata) {
          metadata.accessCount++;
          metadata.lastAccessAt = Date.now();
          await this.saveMetadata();
        }
      }

      return data;
    } catch (error) {
      console.error('[OfflineDataManager] Get error:', error);
      return null;
    }
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidate(domain: string, scope?: string) {
    try {
      const pattern = scope ? `cache-${domain}-${scope}` : `cache-${domain}-`;

      // Get all keys
      const allKeys = await cacheService.getAllKeys();

      // Delete matching keys
      for (const key of allKeys) {
        if (key.startsWith(pattern)) {
          await cacheService.remove(key);
          this.metadata.delete(key);
        }
      }

      await this.saveMetadata();
    } catch (error) {
      console.error('[OfflineDataManager] Invalidation error:', error);
    }
  }

  /**
   * Invalidate all cache
   */
  async invalidateAll() {
    try {
      const allKeys = await cacheService.getAllKeys();
      for (const key of allKeys) {
        if (key.startsWith('cache-')) {
          await cacheService.remove(key);
        }
      }
      this.metadata.clear();
      await this.saveMetadata();
    } catch (error) {
      console.error('[OfflineDataManager] Invalidate all error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const stats = {
        totalEntries: this.metadata.size,
        byDomain: {} as Record<string, number>,
        totalSize: 0,
        oldestEntry: null as CacheMetadata | null,
        mostAccessedEntry: null as CacheMetadata | null,
      };

      let maxAccess = 0;
      let oldestTime = Date.now();

      for (const metadata of this.metadata.values()) {
        // Count by domain
        stats.byDomain[metadata.domain] = (stats.byDomain[metadata.domain] || 0) + 1;

        // Track oldest
        if (metadata.createdAt < oldestTime) {
          oldestTime = metadata.createdAt;
          stats.oldestEntry = metadata;
        }

        // Track most accessed
        if (metadata.accessCount > maxAccess) {
          maxAccess = metadata.accessCount;
          stats.mostAccessedEntry = metadata;
        }
      }

      return stats;
    } catch (error) {
      console.error('[OfflineDataManager] Stats error:', error);
      return null;
    }
  }

  /**
   * Cleanup expired cache entries
   */
  private async cleanupStaleCache() {
    try {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, metadata] of this.metadata.entries()) {
        if (now > metadata.expiresAt) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        await cacheService.remove(key);
        this.metadata.delete(key);
      }

      if (keysToDelete.length > 0) {
        await this.saveMetadata();
        console.debug(`[OfflineDataManager] Cleaned up ${keysToDelete.length} stale entries`);
      }
    } catch (error) {
      console.error('[OfflineDataManager] Cleanup error:', error);
    }
  }

  /**
   * Load metadata from storage
   */
  private async loadMetadata() {
    try {
      const stored = await cacheService.get<Map<string, CacheMetadata>>(this.metadataKey);
      if (stored instanceof Map) {
        this.metadata = stored;
      } else if (Array.isArray(stored)) {
        // Handle serialized array format
        this.metadata = new Map(stored);
      }
    } catch (error) {
      console.error('[OfflineDataManager] Metadata load error:', error);
    }
  }

  /**
   * Save metadata to storage
   */
  private async saveMetadata() {
    try {
      // Convert Map to array for serialization
      const data = Array.from(this.metadata.entries());
      await cacheService.set(this.metadataKey, data, 7 * 24 * 60 * 60 * 1000); // 7 days
    } catch (error) {
      console.error('[OfflineDataManager] Metadata save error:', error);
    }
  }
}

export const offlineDataManager = new OfflineDataManager();
