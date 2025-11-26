# 🚀 Offline-First Quick Start Guide

Get the offline-first system running in 10 minutes.

## 5-Minute Setup

### 1. Verify Installation (Already Done ✅)
All offline-first files are already created and integrated:
- ✅ Service Worker: `public/service-worker.ts`
- ✅ Services: `src/services/offlineService.ts`, `offlineDataManager.ts`, `networkAwareFetcher.ts`
- ✅ Components: `src/components/SyncIndicator.tsx`, `OptimizedImage.tsx`
- ✅ Hooks: `src/hooks/useOfflineFirst.tsx`, `useNetworkAwareFetch.tsx`
- ✅ Config: `src/lib/offlineConfig.ts`
- ✅ Integration: `src/App.tsx`, `src/main.tsx` updated

### 2. Test Offline Mode (2 minutes)

**Chrome DevTools:**
```
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. Refresh page
5. App should load from cache!
```

**Expected Result:**
- App shell loads instantly
- Home page shows cached posts
- All navigation works
- Sync indicator appears at bottom

### 3. Test Creating Content Offline (2 minutes)

```
1. Keep app offline (DevTools → Offline)
2. Try to create a post
3. See "⏳" indicator next to post
4. Post appears immediately in feed
5. Go online (uncheck Offline)
6. Watch post sync automatically
```

### 4. Verify Service Worker (1 minute)

```
1. DevTools → Application tab
2. Look for "Service Workers" section
3. Should show "Service Worker" as "Active and running"
4. Click to inspect:
   - Should say "Activated and running"
   - Clients: 1
```

## 10-Minute Integration

### Use Offline Data in Components

**Before (without caching):**
```typescript
export function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    const data = await fetch('/api/feed');
    setPosts(await data.json());
    setLoading(false);
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {posts.map(post => <PostCard post={post} />)}
    </div>
  );
}
```

**After (with offline caching):**
```typescript
import { useOfflineFirstData } from '@/hooks/useOfflineFirst';
import { offlineDataManager } from '@/services/offlineDataManager';

export function Home() {
  const { data: posts, loading } = useOfflineFirstData(
    () => fetch('/api/feed').then(r => r.json()),
    'feed-list'
  );

  // Cache the posts
  useEffect(() => {
    if (posts) {
      offlineDataManager.cacheFeed(posts);
    }
  }, [posts]);

  return (
    <div>
      {loading && <p>Loading...</p>}
      {posts?.map(post => <PostCard post={post} />)}
    </div>
  );
}
```

**What changed:**
1. ✅ Data loads from cache immediately if offline
2. ✅ Automatically fetches fresh data when online
3. ✅ No loading delay on page revisit
4. ✅ Works perfectly offline

### Create with Optimistic Update

**Before:**
```typescript
const handleCreatePost = async (content: string) => {
  setLoading(true);
  try {
    const post = await postService.create(content);
    setPosts([post, ...posts]);
  } finally {
    setLoading(false);
  }
};
```

**After:**
```typescript
import { useOptimisticUpdate } from '@/hooks/useOfflineFirst';

const handleCreatePost = async (content: string) => {
  const { optimisticUpdate } = useOptimisticUpdate();
  const tempPost = { id: 'temp-' + Date.now(), content };

  await optimisticUpdate(
    () => postService.create(content),
    {
      entity: 'post',
      entityId: tempPost.id,
      optimisticData: tempPost,
      onSuccess: (post) => setPosts([post, ...posts])
    }
  );
};
```

**What changed:**
1. ✅ Post appears instantly in UI (offline or online)
2. ✅ Syncs automatically when online
3. ✅ Works perfectly offline
4. ✅ No loading spinner needed

## Common Implementation Patterns

### Pattern 1: Feed with Infinite Scroll

```typescript
import { useOfflineFirstData } from '@/hooks/useOfflineFirst';
import { offlineDataManager } from '@/services/offlineDataManager';

export function Feed() {
  const [page, setPage] = useState(0);
  const { data: posts } = useOfflineFirstData(
    () => fetch(`/api/feed?page=${page}`).then(r => r.json()),
    `feed-${page}`,
    { revalidateOnReconnect: true }
  );

  // Save to cache
  useEffect(() => {
    if (posts) offlineDataManager.cacheFeed(posts);
  }, [posts]);

  const handleInfiniteScroll = () => {
    setPage(p => p + 1); // Load next page
  };

  return (
    <InfiniteScroll
      dataLength={posts?.length || 0}
      next={handleInfiniteScroll}
      hasMore={posts?.length > 0}
    >
      {posts?.map(post => <PostCard post={post} />)}
    </InfiniteScroll>
  );
}
```

### Pattern 2: Chat with Real-time Sync

```typescript
import { useOptimisticUpdate, useSyncStatus } from '@/hooks/useOfflineFirst';
import { offlineDataManager } from '@/services/offlineDataManager';
import { offlineService } from '@/services/offlineService';

export function Chat({ chatId }) {
  const [messages, setMessages] = useState([]);
  const { optimisticUpdate } = useOptimisticUpdate();
  const syncStatus = useSyncStatus();

  // Load from cache
  useEffect(() => {
    offlineDataManager.getCachedMessages(chatId).then(cached => {
      if (cached) setMessages(cached);
    });
  }, [chatId]);

  const sendMessage = async (text: string) => {
    const msg = { id: 'msg-' + Date.now(), text, sent: false };

    await optimisticUpdate(
      () => chatService.sendMessage(chatId, text),
      {
        entity: 'message',
        entityId: msg.id,
        optimisticData: msg,
        onSuccess: (newMsg) => {
          setMessages(prev => [...prev, newMsg]);
          offlineDataManager.cacheMessages(chatId, [...messages, newMsg]);
        }
      }
    );
  };

  return (
    <div>
      {syncStatus.queueLength > 0 && (
        <div className="sync-status">⏳ Sending {syncStatus.queueLength}...</div>
      )}
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

### Pattern 3: Profile with Manual Refresh

```typescript
import { useOfflineFirstData } from '@/hooks/useOfflineFirst';

export function Profile({ userId }) {
  const { data: profile, isStale, refetch } = useOfflineFirstData(
    () => userService.getProfile(userId),
    `profile-${userId}`,
    {
      revalidateOnReconnect: true,
      revalidateOnFocus: true
    }
  );

  return (
    <div>
      {isStale && (
        <div className="stale-warning">
          ⚠️ Showing cached data
          <button onClick={refetch}>Refresh</button>
        </div>
      )}
      <ProfileDetails profile={profile} />
    </div>
  );
}
```

## Test Offline Sync

### Step 1: Enable Debugging
```javascript
// In browser console
window.DEBUG_OFFLINE = true;

// Watch for logs:
// [OFFLINE] Service Worker registered
// [CACHE] Feed cached: 20 items
// [SYNC] Queued: create post
```

### Step 2: Create Offline
```javascript
// 1. Go offline (DevTools → Offline)
// 2. Create a post
// 3. Check queue
(async () => {
  const status = await window.offlineService.getStatus();
  console.log('Queue:', status.queueLength); // Should be 1+
})();
```

### Step 3: Go Online & Watch Sync
```javascript
// 1. Go online (uncheck Offline)
// 2. Watch sync happen
(async () => {
  window.offlineService.subscribe(status => {
    console.log('Syncing:', status.isSyncing, 'Queue:', status.queueLength);
  });
})();

// 3. Should see:
// Syncing: true Queue: 1
// Syncing: true Queue: 0
// Syncing: false Queue: 0
```

### Step 4: Verify Data
```javascript
// Check cache
(async () => {
  const cached = await window.offlineDataManager.getCachedFeed();
  console.log('Cached items:', cached?.length);
})();

// Check sync status
(async () => {
  const status = await window.offlineService.getStatus();
  console.log('Queue empty:', status.queueLength === 0);
})();
```

## Test Slow Networks

### Simulate 2G Connection
```
1. DevTools → Network → Throttling
2. Select "Slow 3G" (or slower)
3. Load feed
4. Images should load at lower quality
5. Requests should be batched
```

**Expected behavior:**
- ✅ Images smaller (60-80% less data)
- ✅ Fewer network requests
- ✅ Page still usable
- ✅ No "stalled" requests

### Monitor Network Savings
```javascript
// Check network speed
(async () => {
  const speed = await window.networkStatusManager.getConnectionSpeed();
  console.log('Speed:', speed, 'Mbps');
  console.log('Batching enabled:', speed < 0.5);
})();

// Check image optimization
const img = document.querySelector('img[data-optimized]');
console.log('Image size:', img.naturalWidth, 'x', img.naturalHeight);
```

## Troubleshooting

### Service Worker Not Activating?
```javascript
// 1. Clear all caches
(async () => {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
})();

// 2. Unregister old SW
(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  await reg?.unregister();
})();

// 3. Hard refresh
// Ctrl+Shift+R (Chrome/Linux)
// Cmd+Shift+R (Mac)
```

### Changes Not Syncing?
```javascript
// 1. Check if online
(async () => {
  const online = await window.networkStatusManager.isOnline();
  console.log('Online:', online);
})();

// 2. Manual sync
(async () => {
  const result = await window.offlineService.manualSync();
  console.log('Result:', result);
})();

// 3. Check backend
fetch('/api/sync', { method: 'POST', body: JSON.stringify({}) })
  .then(r => console.log('API available:', r.ok))
  .catch(e => console.error('API error:', e));
```

### Cache Too Large?
```javascript
// 1. Check size
(async () => {
  const stats = await window.offlineDataManager.getStats();
  console.log('Size (MB):', (stats.totalSize / 1024 / 1024).toFixed(2));
})();

// 2. Clean up old entries
(async () => {
  await window.offlineDataManager.cleanup();
})();

// 3. Clear specific domain
(async () => {
  await window.offlineDataManager.invalidate('reels');
})();
```

## Performance Benchmarks

Test your implementation against these targets:

| Metric | Target | How to Test |
|--------|--------|-----------|
| App load (offline) | <500ms | DevTools → Performance |
| First paint (3G) | <1s | Throttle to 3G, measure |
| Image optimization | 60-80% reduction | Compare sizes in Network tab |
| Sync queue | <5s for 10 items | Queue 10 changes, measure |
| Cache retrieval | <100ms | Console: `time(offlineDataManager.getCachedFeed())` |

## Next Steps

1. **Review OFFLINE_FIRST_GUIDE.md** - Understand the architecture
2. **Update your components** - Use the patterns above
3. **Test thoroughly** - Follow the testing checklist
4. **Monitor in production** - Check performance metrics
5. **Gather feedback** - Iterate based on user experience

## Support & Resources

| Document | Purpose |
|----------|---------|
| `OFFLINE_FIRST_GUIDE.md` | Complete architecture overview |
| `OFFLINE_INTEGRATION_CHECKLIST.md` | Component-by-component integration |
| `OFFLINE_DEBUGGING_GUIDE.md` | Debugging and troubleshooting |
| `OFFLINE_API_REFERENCE.md` | Full API documentation |

## Quick Reference

**Get sync status:**
```typescript
const status = await offlineService.getStatus();
```

**Load with cache:**
```typescript
const { data } = useOfflineFirstData(fetchFn, cacheKey);
```

**Create with optimistic update:**
```typescript
await optimisticUpdate(createFn, { entity, entityId, optimisticData });
```

**Monitor sync:**
```typescript
const syncStatus = useSyncStatus();
```

**Debug:**
```javascript
window.offlineService.getStatus().then(console.log);
```

---

**Version**: 1.0  
**Setup Time**: 5-10 minutes  
**Status**: Ready to integrate ✅

Happy coding! 🚀
