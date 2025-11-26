# 📚 Offline-First API Reference

## Services API

### offlineService

Central service for offline-first operations.

```typescript
import { offlineService } from '@/services/offlineService';
```

#### Methods

**`queueChange(item: SyncQueueItem): Promise<void>`**
Queue a change for syncing when online.
```typescript
await offlineService.queueChange({
  type: 'create',
  entity: 'post',
  entityId: 'post-123',
  data: { content: 'Hello', timestamp: Date.now() }
});
```

**`getStatus(): Promise<SyncStatus>`**
Get current sync queue status.
```typescript
const status = await offlineService.getStatus();
// Returns: { queueLength, isOnline, isSyncing, lastSync, failedItems, conflicts }
```

**`manualSync(): Promise<SyncResult>`**
Manually trigger sync of queued changes.
```typescript
const result = await offlineService.manualSync();
// Returns: { success, syncedCount, failedCount, conflicts }
```

**`subscribe(callback: (status: SyncStatus) => void): () => void`**
Listen to sync status changes.
```typescript
const unsubscribe = offlineService.subscribe(status => {
  console.log('Queue:', status.queueLength);
});
// Call unsubscribe() to stop listening
```

**`resolveConflict(entityId: string, version: 'local' | 'remote'): Promise<void>`**
Resolve conflict by choosing a version.
```typescript
await offlineService.resolveConflict('post-123', 'local');
```

**`clearFailedItems(): Promise<void>`**
Clear items that failed to sync.
```typescript
await offlineService.clearFailedItems();
```

---

### offlineDataManager

Unified cache manager for all app data.

```typescript
import { offlineDataManager } from '@/services/offlineDataManager';
```

#### Feed Methods

**`cacheFeed(posts: Post[]): Promise<void>`**
```typescript
await offlineDataManager.cacheFeed(posts);
```

**`getCachedFeed(): Promise<Post[] | null>`**
```typescript
const posts = await offlineDataManager.getCachedFeed();
```

**`invalidate('feed'): Promise<void>`**
```typescript
await offlineDataManager.invalidate('feed');
```

#### Reels Methods

**`cacheReels(reels: Reel[]): Promise<void>`**
```typescript
await offlineDataManager.cacheReels(reels);
```

**`getCachedReels(): Promise<Reel[] | null>`**
```typescript
const reels = await offlineDataManager.getCachedReels();
```

#### Messages Methods

**`cacheMessages(chatId: string, messages: Message[]): Promise<void>`**
```typescript
await offlineDataManager.cacheMessages(chatId, messages);
```

**`getCachedMessages(chatId: string): Promise<Message[] | null>`**
```typescript
const messages = await offlineDataManager.getCachedMessages(chatId);
```

#### Profile Methods

**`cacheProfile(userId: string, profile: UserProfile): Promise<void>`**
```typescript
await offlineDataManager.cacheProfile(userId, profile);
```

**`getCachedProfile(userId: string): Promise<UserProfile | null>`**
```typescript
const profile = await offlineDataManager.getCachedProfile(userId);
```

#### Friends Methods

**`cacheFriends(friends: User[]): Promise<void>`**
```typescript
await offlineDataManager.cacheFriends(friends);
```

**`getCachedFriends(): Promise<User[] | null>`**
```typescript
const friends = await offlineDataManager.getCachedFriends();
```

#### Topics Methods

**`cacheTopicRooms(topics: Topic[]): Promise<void>`**
```typescript
await offlineDataManager.cacheTopicRooms(topics);
```

**`getCachedTopicRooms(): Promise<Topic[] | null>`**
```typescript
const topics = await offlineDataManager.getCachedTopicRooms();
```

#### Notifications Methods

**`cacheNotifications(notifications: Notification[]): Promise<void>`**
```typescript
await offlineDataManager.cacheNotifications(notifications);
```

**`getCachedNotifications(): Promise<Notification[] | null>`**
```typescript
const notifications = await offlineDataManager.getCachedNotifications();
```

#### Management Methods

**`invalidateAll(): Promise<void>`**
Clear all caches.
```typescript
await offlineDataManager.invalidateAll();
```

**`cleanup(): Promise<void>`**
Remove expired cache entries.
```typescript
await offlineDataManager.cleanup();
```

**`getStats(): Promise<CacheStats>`**
Get cache statistics.
```typescript
const stats = await offlineDataManager.getStats();
// Returns: { totalEntries, totalSize, byType, oldestEntry, newestEntry }
```

---

### networkAwareFetcher

Intelligent fetch that adapts to network conditions.

```typescript
import { networkAwareFetcher } from '@/services/networkAwareFetcher';
```

#### Methods

**`smartFetch<T>(url: string, options?: FetchOptions): Promise<T>`**
Fetch with automatic batching and compression.
```typescript
const data = await networkAwareFetcher.smartFetch('/api/feed', {
  priority: 'normal',
  adaptiveQuality: true,
  batchable: true,
  timeout: 15000,
  retries: 3,
  compressPayload: false
});
```

**`getAdaptiveImageUrl(url: string, width?: number): string`**
Get URL with quality parameters for slow networks.
```typescript
const optimizedUrl = networkAwareFetcher.getAdaptiveImageUrl(
  'https://example.com/image.jpg',
  500 // width in pixels
);
// Returns: https://example.com/image.jpg?w=256&q=60 (on slow network)
```

**`getImageSrcset(url: string): string`**
Generate responsive image srcset.
```typescript
const srcset = networkAwareFetcher.getImageSrcset('https://example.com/image.jpg');
// Returns: "https://example.com/image.jpg?w=256&q=80 256w, ..."
```

**`prefetch(url: string): Promise<void>`**
Prefetch resource.
```typescript
await networkAwareFetcher.prefetch('/api/feed');
```

**`preload(url: string): Promise<void>`**
Preload critical resource.
```typescript
await networkAwareFetcher.preload('/critical-bundle.js');
```

---

### networkStatusManager

Monitor connection status and speed.

```typescript
import { networkStatusManager } from '@/services/networkStatusManager';
```

#### Methods

**`isOnline(): Promise<boolean>`**
```typescript
const online = await networkStatusManager.isOnline();
```

**`getConnectionSpeed(): Promise<number>`**
Returns speed in Mbps.
```typescript
const speed = await networkStatusManager.getConnectionSpeed();
// Returns: 2.5 (for example)
```

**`subscribe(callback: (status: NetworkStatus) => void): () => void`**
Listen to connection changes.
```typescript
const unsubscribe = networkStatusManager.subscribe(status => {
  console.log('Online:', status.online);
  console.log('Speed:', status.speed, 'Mbps');
});
```

---

## Hooks API

### useOfflineFirst

```typescript
import {
  useOptimisticUpdate,
  useSyncStatus,
  useConflictResolver,
  useOfflineFirstData,
  useBackgroundSync
} from '@/hooks/useOfflineFirst';
```

#### useOptimisticUpdate

Apply UI update immediately while syncing.

```typescript
const { optimisticUpdate, isSyncing } = useOptimisticUpdate();

await optimisticUpdate(
  () => dataService.likePost(postId), // async operation
  {
    entity: 'post',
    entityId: postId,
    optimisticData: { ...post, liked: true },
    onSuccess: (result) => setPost(result),
    onError: () => setPost(post) // rollback
  }
);
```

#### useSyncStatus

```typescript
const syncStatus = useSyncStatus();
// Returns: { isSyncing, queueLength, lastSync, isOffline }

if (syncStatus.queueLength > 0) {
  return <div>⏳ Syncing {syncStatus.queueLength} changes...</div>;
}
```

#### useConflictResolver

```typescript
const { hasConflict, resolveConflict } = useConflictResolver(entityId);

if (hasConflict) {
  return (
    <ConflictResolutionDialog
      onResolve={(version) => resolveConflict(version)}
    />
  );
}
```

#### useOfflineFirstData

```typescript
const { data, loading, error, isStale, refetch } = useOfflineFirstData(
  () => dataService.getFeed(), // fetch function
  'feed-list', // cache key
  {
    revalidateOnReconnect: true,
    revalidateOnFocus: true,
    dedupeInterval: 5000
  }
);

// Automatically loads from cache, fetches fresh in background
```

#### useBackgroundSync

```typescript
const { isSyncing, lastSync } = useBackgroundSync(entityId);

return <span>{isSyncing ? '⏳' : '✅'} {lastSync}</span>;
```

---

### useNetworkAwareFetch

```typescript
import { useNetworkAwareFetch } from '@/hooks/useNetworkAwareFetch';

const { data, loading, error } = useNetworkAwareFetch(
  '/api/feed',
  { retries: 3, timeout: 15000 }
);
```

---

## Component API

### SyncIndicator

Real-time sync status display.

```typescript
import { SyncIndicator } from '@/components/SyncIndicator';

<SyncIndicator variant="compact" />
// or
<SyncIndicator variant="expanded" />
```

**Props:**
- `variant?: 'compact' | 'expanded'` - Display style

---

### QueueStatusBadge

Inline badge showing pending changes.

```typescript
import { QueueStatusBadge } from '@/components/SyncIndicator';

<QueueStatusBadge />
// Shows: "3" or "99+"
```

---

### ConflictResolutionDialog

Dialog for resolving data conflicts.

```typescript
import { ConflictResolutionDialog } from '@/components/SyncIndicator';

<ConflictResolutionDialog
  isOpen={hasConflict}
  onResolve={(version) => handleResolve(version)}
/>
```

---

### OptimizedImage

Image with lazy loading and quality adaptation.

```typescript
import { OptimizedImage } from '@/components/OptimizedImage';

<OptimizedImage
  src="https://example.com/image.jpg"
  alt="Description"
  width={300}
  height={200}
  priority="low"
/>
```

**Props:**
- `src: string` - Image URL
- `alt: string` - Alt text
- `width?: number` - Width in pixels
- `height?: number` - Height in pixels
- `priority?: 'low' | 'normal' | 'high'` - Preload priority
- `onLoad?: () => void` - Load callback
- `className?: string` - CSS class

---

### ImageGallery

Grid of images with progressive loading.

```typescript
import { ImageGallery } from '@/components/OptimizedImage';

<ImageGallery
  images={[
    { src: 'img1.jpg', alt: 'Image 1' },
    { src: 'img2.jpg', alt: 'Image 2' },
  ]}
/>
```

---

### BackgroundImageOptimized

Background image with preload.

```typescript
import { BackgroundImageOptimized } from '@/components/OptimizedImage';

<BackgroundImageOptimized
  src="https://example.com/bg.jpg"
  className="hero"
>
  Content here
</BackgroundImageOptimized>
```

---

### AvatarImage

Avatar with fallback gradient.

```typescript
import { AvatarImage } from '@/components/OptimizedImage';

<AvatarImage
  src={user.avatar}
  alt={user.name}
  size="medium"
/>
```

**Sizes:** `small` | `medium` | `large`

---

## Configuration API

### OFFLINE_CONFIG

```typescript
import { OFFLINE_CONFIG } from '@/lib/offlineConfig';

console.log(OFFLINE_CONFIG.cache.maxSize); // 50MB
console.log(OFFLINE_CONFIG.sync.maxRetries); // 5
```

---

### initializeOfflineMode

Initialize offline-first on app startup.

```typescript
import { initializeOfflineMode } from '@/lib/offlineConfig';

// Called automatically in main.tsx
await initializeOfflineMode();
```

---

### getOfflineStatus

Get offline status summary.

```typescript
import { getOfflineStatus } from '@/lib/offlineConfig';

const status = getOfflineStatus();
// Returns: { isOnline, queueLength, cacheSize, swActive, features }
```

---

### debugOfflineStatus

Debug helper for console.

```typescript
import { debugOfflineStatus } from '@/lib/offlineConfig';

// In console
debugOfflineStatus();
// Logs detailed offline status info
```

---

## Types

```typescript
// Sync Queue Item
interface SyncQueueItem {
  type: 'create' | 'update' | 'delete';
  entity: string;
  entityId: string;
  data: any;
  timestamp?: number;
  retries?: number;
}

// Sync Status
interface SyncStatus {
  queueLength: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: number;
  failedItems?: SyncQueueItem[];
  conflicts?: ConflictItem[];
}

// Network Status
interface NetworkStatus {
  online: boolean;
  speed: number; // Mbps
  type: string;  // 4g, 3g, 2g, etc
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
}

// Cache Stats
interface CacheStats {
  totalEntries: number;
  totalSize: number;
  byType: Record<string, number>;
  oldestEntry: number;
  newestEntry: number;
}

// Fetch Options
interface FetchOptions {
  priority?: 'low' | 'normal' | 'high';
  adaptiveQuality?: boolean;
  batchable?: boolean;
  timeout?: number;
  retries?: number;
  compressPayload?: boolean;
}

// Optimistic Update Options
interface OptimisticUpdateOptions {
  entity: string;
  entityId: string;
  optimisticData: any;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}
```

---

## Common Patterns

### Pattern 1: Load with Cache Fallback
```typescript
const { data: feed } = useOfflineFirstData(
  () => feedService.getFeed(),
  'feed-list',
  { revalidateOnReconnect: true }
);

// Automatically uses cache if offline
```

### Pattern 2: Create with Optimistic Update
```typescript
const { optimisticUpdate } = useOptimisticUpdate();

const handleCreate = async (content) => {
  await optimisticUpdate(
    () => postService.create(content),
    {
      entity: 'post',
      entityId: tempId,
      optimisticData: newPost,
      onSuccess: (post) => addToFeed(post)
    }
  );
};
```

### Pattern 3: Monitor Sync
```typescript
const syncStatus = useSyncStatus();

useEffect(() => {
  if (syncStatus.isSyncing) {
    showToast('Syncing changes...');
  }
}, [syncStatus.isSyncing]);
```

### Pattern 4: Handle Conflicts
```typescript
const { hasConflict, resolveConflict } = useConflictResolver(postId);

if (hasConflict) {
  return (
    <ConflictResolutionDialog
      onResolve={(version) => resolveConflict(version)}
    />
  );
}
```

---

**Version**: 1.0  
**Status**: Production Ready  
**Last Updated**: Session 3
