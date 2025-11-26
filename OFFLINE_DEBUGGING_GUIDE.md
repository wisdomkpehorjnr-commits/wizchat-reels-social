# 🔧 Offline-First Debugging & Troubleshooting Guide

## Quick Debug Commands

### Browser Console Commands
Paste these in DevTools Console to debug offline-first features:

```javascript
// 1. CHECK SYNC QUEUE STATUS
(async () => {
  const status = await window.offlineService.getStatus();
  console.log('=== SYNC QUEUE STATUS ===');
  console.log('Queue Length:', status.queueLength);
  console.log('Is Online:', status.isOnline);
  console.log('Last Sync:', new Date(status.lastSync).toLocaleString());
  console.log('Failed Items:', status.failedItems?.length || 0);
})();

// 2. CHECK CACHE CONTENTS
(async () => {
  const stats = await window.offlineDataManager.getStats();
  console.log('=== CACHE STATISTICS ===');
  console.log('Total Entries:', stats.totalEntries);
  console.log('Total Size:', (stats.totalSize / 1024 / 1024).toFixed(2) + ' MB');
  console.log('By Type:', stats.byType);
  console.log('Oldest Cache:', new Date(stats.oldestEntry).toLocaleString());
})();

// 3. MANUAL SYNC TRIGGER
(async () => {
  console.log('Starting manual sync...');
  const result = await window.offlineService.manualSync();
  console.log('Sync Result:', result);
})();

// 4. VIEW SPECIFIC CACHE
(async () => {
  const feed = await window.offlineDataManager.getCachedFeed();
  console.log('Cached Feed Items:', feed?.length || 0);
  const reels = await window.offlineDataManager.getCachedReels();
  console.log('Cached Reels:', reels?.length || 0);
  const friends = await window.offlineDataManager.getCachedFriends();
  console.log('Cached Friends:', friends?.length || 0);
})();

// 5. CLEAR CACHE COMPLETELY
(async () => {
  await window.offlineDataManager.invalidateAll();
  console.log('All caches cleared!');
})();

// 6. CHECK SERVICE WORKER STATUS
(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  console.log('=== SERVICE WORKER STATUS ===');
  console.log('Registered:', !!reg);
  console.log('Controller Active:', !!navigator.serviceWorker.controller);
  console.log('State:', reg?.active?.state);
  console.log('Scope:', reg?.scope);
})();

// 7. VIEW OFFLINE CONFIG
(() => {
  console.log('=== OFFLINE CONFIG ===');
  console.log(window.OFFLINE_CONFIG);
})();

// 8. SIMULATE NETWORK CONDITIONS
(() => {
  const speedSimulator = {
    slow2G: () => console.log('Simulating 2G - responses will be >10s'),
    slow3G: () => console.log('Simulating 3G - responses will be 1-5s'),
    fast3G: () => console.log('Simulating Fast 3G - responses will be 400ms'),
    fast4G: () => console.log('Simulating 4G - responses will be <100ms'),
    info: () => console.log('Set in DevTools → Network → Throttling'),
  };
  console.log('Network Simulator:', speedSimulator);
})();

// 9. SUBSCRIBE TO SYNC EVENTS
(() => {
  const unsubscribe = window.offlineService.subscribe(status => {
    console.log('[SYNC EVENT]', {
      queue: status.queueLength,
      online: status.isOnline,
      syncing: status.isSyncing,
      time: new Date().toLocaleTimeString()
    });
  });
  console.log('Listening to sync events. Call unsubscribe() to stop.');
  window.unsubscribeSyncEvents = unsubscribe;
})();

// 10. CHECK INDEXED DB
(() => {
  const req = indexedDB.databases();
  req.then(dbs => {
    console.log('=== INDEXED DB ===');
    console.log('Databases:', dbs.map(d => d.name));
  });
})();
```

## Common Issues & Solutions

### Issue 1: "App is offline but changes aren't syncing"

**Symptoms:**
- Create post offline → shows with ⏳ indicator
- Go online → indicator stays, nothing syncs

**Diagnosis:**
```javascript
// Check if sync queue has items
(async () => {
  const status = await window.offlineService.getStatus();
  console.log('Queue items:', status.queueLength);
  console.log('Failed items:', status.failedItems?.length);
})();
```

**Solutions:**

1. **Check if online detection works:**
   ```javascript
   // Check network status
   (async () => {
     const isOnline = await window.networkStatusManager.isOnline();
     console.log('Is Online:', isOnline);
     const speed = await window.networkStatusManager.getConnectionSpeed();
     console.log('Connection Speed:', speed, 'Mbps');
   })();
   ```

2. **Manual sync:**
   ```javascript
   (async () => {
     const result = await window.offlineService.manualSync();
     console.log('Sync result:', result);
   })();
   ```

3. **Check backend endpoint:**
   ```javascript
   // Verify /api/sync endpoint is reachable
   fetch('/api/sync', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ test: true })
   })
   .then(r => console.log('Endpoint available:', r.status))
   .catch(e => console.error('Endpoint error:', e.message));
   ```

4. **If stuck, force re-queue:**
   ```javascript
   (async () => {
     // Clear failed items and retry
     await window.offlineService.clearFailedItems();
     await window.offlineService.manualSync();
   })();
   ```

---

### Issue 2: "Cache is growing too large"

**Symptoms:**
- IndexedDB size >50MB
- Browser slow, storage warnings

**Diagnosis:**
```javascript
(async () => {
  const stats = await window.offlineDataManager.getStats();
  console.log('Total Size (MB):', (stats.totalSize / 1024 / 1024).toFixed(2));
  console.log('Items by type:', stats.byType);
})();
```

**Solutions:**

1. **Auto-cleanup (happens every 15 min):**
   ```javascript
   (async () => {
     await window.offlineDataManager.cleanup();
     console.log('Cleanup completed');
   })();
   ```

2. **Invalidate specific domain:**
   ```javascript
   (async () => {
     // Clear just old reels, keep recent feed
     await window.offlineDataManager.invalidate('reels');
     console.log('Reels cache cleared');
   })();
   ```

3. **Clear everything:**
   ```javascript
   (async () => {
     await window.offlineDataManager.invalidateAll();
     console.log('All cache cleared');
   })();
   ```

---

### Issue 3: "Service Worker not caching pages"

**Symptoms:**
- Refresh app offline → blank page
- Expected app shell but see error page

**Diagnosis:**
```javascript
// Check Service Worker status
(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  console.log('SW Active:', !!reg?.active);
  console.log('SW State:', reg?.active?.state);
  console.log('Controller:', !!navigator.serviceWorker.controller);
})();

// Check cache storage
(async () => {
  const cacheNames = await caches.keys();
  console.log('Cache names:', cacheNames);
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    console.log(`Cache "${name}":`, requests.map(r => r.url));
  }
})();
```

**Solutions:**

1. **Re-register Service Worker:**
   ```javascript
   (async () => {
     // Unregister old
     const reg = await navigator.serviceWorker.getRegistration();
     await reg?.unregister();
     
     // Re-register new
     await navigator.serviceWorker.register('/service-worker.js', {
       scope: '/'
     });
     console.log('Service Worker re-registered');
   })();
   ```

2. **Clear Cache Storage:**
   ```javascript
   (async () => {
     const cacheNames = await caches.keys();
     for (const name of cacheNames) {
       await caches.delete(name);
     }
     console.log('All caches cleared');
   })();
   ```

3. **Force update:**
   - Open DevTools → Application → Service Workers
   - Click "Update on reload" checkbox
   - Hard refresh (Ctrl+Shift+R)

---

### Issue 4: "Images showing as placeholder offline"

**Symptoms:**
- Images load online
- Offline → see colored placeholder instead of image
- Error message: "Offline - image not cached"

**Diagnosis:**
```javascript
(async () => {
  // Check if images were actually cached
  const cache = await caches.open('wizchat-image-cache-v1');
  const requests = await cache.keys();
  console.log('Cached images:', requests.length);
  requests.slice(0, 5).forEach(r => console.log(r.url));
})();
```

**Solutions:**

1. **Pre-cache important images:**
   ```javascript
   (async () => {
     // Manually cache specific images
     const cache = await caches.open('wizchat-image-cache-v1');
     const imageUrls = [
       'https://example.com/logo.png',
       'https://example.com/hero.jpg',
     ];
     await cache.addAll(imageUrls);
     console.log('Images pre-cached');
   })();
   ```

2. **Enable image optimization:**
   ```javascript
   // Use OptimizedImage component instead of <img>
   <OptimizedImage
     src={url}
     alt="Description"
     priority="high" // Priority images cached first
   />
   ```

3. **Check Service Worker image strategy:**
   - Navigate to specific image URL (e.g., https://example.com/photo.jpg)
   - DevTools → Network → Check if Service Worker responded
   - Should show "Service Worker" in Size column

---

### Issue 5: "Conflicts keep appearing when syncing"

**Symptoms:**
- Make changes online → changes sync fine
- Make changes → conflict dialog appears
- Same changes should not conflict

**Diagnosis:**
```javascript
(async () => {
  const status = await window.offlineService.getStatus();
  console.log('Failed items:', status.failedItems);
  console.log('Conflicts:', status.conflicts?.length || 0);
})();
```

**Solutions:**

1. **Check timestamps:**
   ```javascript
   // Conflicts usually because server time != client time
   console.log('Server time:', new Date().toISOString());
   // Sync server with NTP time source
   ```

2. **Use server time for new changes:**
   ```javascript
   // Don't use local timestamp - use server's
   const response = await fetch('/api/server-time');
   const { timestamp } = await response.json();
   // Use this timestamp for all new items
   ```

3. **Clear conflicts and retry:**
   ```javascript
   (async () => {
     await window.offlineService.clearConflicts();
     await window.offlineService.manualSync();
   })();
   ```

---

### Issue 6: "App crashes when clearing cache"

**Symptoms:**
- Click "clear cache" → app freezes/crashes
- DevTools shows uncaught error

**Diagnosis:**
```javascript
// Run cache clear with error handling
(async () => {
  try {
    await window.offlineDataManager.invalidateAll();
    console.log('Cache cleared successfully');
  } catch (error) {
    console.error('Error clearing cache:', error);
    console.error('Stack:', error.stack);
  }
})();
```

**Solutions:**

1. **Clear with error handling:**
   ```javascript
   (async () => {
     const cacheNames = await caches.keys();
     await Promise.all(cacheNames.map(name => caches.delete(name)));
     
     const dbs = await indexedDB.databases();
     dbs.forEach(db => indexedDB.deleteDatabase(db.name));
     
     localStorage.clear();
     sessionStorage.clear();
     
     console.log('All storage cleared - reload required');
     window.location.reload();
   })();
   ```

2. **Restart app:**
   - Close all tabs
   - Clear browser cache (DevTools → Application → Clear site data)
   - Close DevTools
   - Reopen and refresh

---

## Performance Monitoring

### Enable Debug Logging
```javascript
// Add to main.tsx or index.html
window.DEBUG_OFFLINE = true;

// Now check console for detailed logs:
// [OFFLINE] Service Worker registered
// [CACHE] Feed cached: 20 items, 2.5MB
// [SYNC] Queued: create post
// [NETWORK] Speed: 2.5 Mbps (fast 3G)
```

### Monitor Performance
```javascript
(async () => {
  // Measure app load time
  const perfData = performance.getEntriesByType('navigation')[0];
  console.log('=== PERFORMANCE ===');
  console.log('DNS Lookup:', perfData.domainLookupEnd - perfData.domainLookupStart, 'ms');
  console.log('TCP Connection:', perfData.connectEnd - perfData.connectStart, 'ms');
  console.log('Time to First Byte:', perfData.responseStart - perfData.requestStart, 'ms');
  console.log('DOM Content Loaded:', perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart, 'ms');
  console.log('Load Complete:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
  
  // Paint timing
  const paints = performance.getEntriesByType('paint');
  paints.forEach(p => console.log(p.name + ':', p.startTime.toFixed(0), 'ms'));
})();
```

### Check Storage Quota
```javascript
(async () => {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    console.log('=== STORAGE QUOTA ===');
    console.log('Usage:', (estimate.usage / 1024 / 1024).toFixed(2), 'MB');
    console.log('Quota:', (estimate.quota / 1024 / 1024).toFixed(2), 'MB');
    console.log('Percentage:', ((estimate.usage / estimate.quota) * 100).toFixed(1) + '%');
  }
})();
```

## Testing Scenarios

### Scenario 1: Offline Workflow
```javascript
// 1. Go offline
// DevTools → Network → Offline

// 2. Create post
// Should see ⏳ indicator

// 3. Check queue
(async () => {
  const status = await window.offlineService.getStatus();
  console.log('Queued:', status.queueLength); // Should be 1+
})();

// 4. Go online
// DevTools → Network → Online

// 5. Watch sync
// Should see indicator disappear, post accepted
(async () => {
  window.unsubscribeSyncEvents = window.offlineService.subscribe(s => {
    console.log('Sync Status:', {
      queue: s.queueLength,
      syncing: s.isSyncing,
      lastSync: new Date(s.lastSync).toLocaleTimeString()
    });
  });
})();
```

### Scenario 2: Slow Network
```javascript
// 1. DevTools → Network → Throttling: Slow 3G

// 2. Load feed
// Should batch requests

// 3. Check network requests
// DevTools → Network tab
// Should see fewer requests than normal
// Image sizes should be smaller

// 4. Monitor batching
(async () => {
  const speed = await window.networkStatusManager.getConnectionSpeed();
  console.log('Connection speed:', speed, 'Mbps');
  console.log('Batching enabled:', speed < 0.5);
})();
```

### Scenario 3: Conflict Resolution
```javascript
// 1. Create post offline
// 2. Another device creates similar post
// 3. Sync offline post
// Should show ConflictResolutionDialog

// 4. Check conflict
(async () => {
  const status = await window.offlineService.getStatus();
  console.log('Conflicts:', status.conflicts);
})();

// 5. Resolve manually
// Dialog shows options - choose one

// 6. Verify resolution
(async () => {
  const status = await window.offlineService.getStatus();
  console.log('Conflicts resolved:', status.conflicts?.length === 0);
})();
```

---

## Support Resources

| Resource | Purpose |
|----------|---------|
| `OFFLINE_FIRST_GUIDE.md` | Architecture overview |
| `OFFLINE_INTEGRATION_CHECKLIST.md` | Integration guide |
| DevTools Console | Real-time debugging |
| DevTools Application | Inspect storage/SW |
| Network tab | Monitor requests |

For additional help, enable console logging and share error messages.

**Version**: 1.0  
**Last Updated**: Session 3
