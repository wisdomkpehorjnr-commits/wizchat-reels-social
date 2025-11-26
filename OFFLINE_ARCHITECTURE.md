# 🗺️ Offline-First System - Visual Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │ Home Component   │  │ Chat Component   │  │ Profile Page │   │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘   │
│           │                     │                    │            │
│        useOfflineFirstData    useOptimisticUpdate   useSyncStatus  │
│           │                     │                    │            │
└───────────┼─────────────────────┼────────────────────┼────────────┘
            │                     │                    │
            └─────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────────┐
│                    HOOKS LAYER (React)                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ • useOptimisticUpdate()        → Optimistic UI updates      │ │
│  │ • useSyncStatus()              → Monitor sync progress      │ │
│  │ • useOfflineFirstData()        → Load with cache fallback   │ │
│  │ • useConflictResolver()        → Handle conflicts           │ │
│  │ • useBackgroundSync()          → Track entity-level sync    │ │
│  │ • useNetworkAwareFetch()       → Smart fetch with retries   │ │
│  └────────────────────────────────┬──────────────────────────┬─┘ │
│                                   │                          │     │
└───────────────────────────────────┼──────────────────────────┼─────┘
                                    │                          │
            ┌───────────────────────▼──┐  ┌──────────────────┐ │
            │ offlineDataManager        │  │ SyncIndicator    │ │
            │ (Caching Layer)           │  │ Component (UI)   │ │
            │                           │  │                  │ │
            │ • cacheFeed()             │  │ Displays:        │ │
            │ • getCachedFeed()         │  │ • Queue length   │ │
            │ • cacheFriends()          │  │ • Sync status    │ │
            │ • getCachedMessages()     │  │ • Online/Offline │ │
            │ + 6 more...              │  │ • Manual sync    │ │
            └────────────┬─────────────┘  └────────┬─────────┘ │
                         │                         │            │
           ┌─────────────▼─────────────────────────▼──────────┐  │
           │       SERVICES LAYER (Business Logic)           │  │
           │                                                   │  │
           │  ┌─────────────────────────────────────────┐    │  │
           │  │        offlineService (Core)            │    │  │
           │  │                                         │    │  │
           │  │ • Sync Queue Management                │    │  │
           │  │   - queueChange()                      │    │  │
           │  │   - startSync()                        │    │  │
           │  │   - manualSync()                       │    │  │
           │  │                                         │    │  │
           │  │ • Retry Logic (Exponential Backoff)    │    │  │
           │  │   - Max 5 retries                      │    │  │
           │  │   - 1s → 2s → 4s → 8s → 16s           │    │  │
           │  │                                         │    │  │
           │  │ • Conflict Resolution                  │    │  │
           │  │   - Automatic (timestamp-based)       │    │  │
           │  │   - Manual (user dialog)               │    │  │
           │  │                                         │    │  │
           │  │ • Batch Processing                     │    │  │
           │  │   - Groups 10 items per batch         │    │  │
           │  │   - Deduplication (2s window)         │    │  │
           │  │                                         │    │  │
           │  └──────┬───────────────────────────┬───────┘   │  │
           │         │                           │            │  │
           │  ┌──────▼──────────┐  ┌────────────▼────────┐   │  │
           │  │networkAwareFetcher  │networkStatusManager│   │  │
           │  │                     │                    │   │  │
           │  │ • smartFetch()      │ • isOnline()      │   │  │
           │  │ • Batching          │ • getConnectionSpeed│  │  │
           │  │ • Compression       │ • Speed detection │   │  │
           │  │ • Image quality     │ • Event subscribe │   │  │
           │  │   adaptation (60-80%)                      │   │  │
           │  │ • Request dedup     │                    │   │  │
           │  └─────────┬──────────┘  └────────┬─────────┘   │  │
           │            │                      │              │  │
           └────────────┼──────────────────────┼──────────────┘  │
                        │                      │                 │
┌───────────────────────▼──────────────────────▼────────────────┐│
│               STORAGE & NETWORK LAYER                         ││
│  ┌────────────────────┐  ┌────────────────────┐  ┌──────────┐││
│  │   IndexedDB        │  │  localStorage      │  │ Fetch   │││
│  │                    │  │                    │  │ API    │││
│  │ • Sync Queue (IDB) │  │ • Metadata         │  │        │││
│  │ • Feed Cache       │  │ • Quick Flags      │  │ Network││││
│  │ • Messages Cache   │  │ • Settings         │  │ Calls  │││
│  │ • Profile Cache    │  │                    │  │        │││
│  │ • 500+ entries     │  │ • 5MB limit        │  │        │││
│  │ • 50MB total max   │  │                    │  │        │││
│  └────────────────────┘  └────────────────────┘  └──────────┘││
│                                                                ││
│  ┌──────────────────────────────────────────────────────────┐││
│  │              Service Worker (App Shell Cache)            │││
│  │                                                           │││
│  │  • Precaches: HTML, CSS, JS, Fonts                      │││
│  │  • Network Strategy:                                     │││
│  │    - API calls: Network-First (fallback to cache)       │││
│  │    - Images: Cache-First (fetch background)            │││
│  │    - Assets: Cache-First (long expiry)                │││
│  │    - Pages: Stale-While-Revalidate                     │││
│  │  • Offline HTML Response (503 page with message)      │││
│  │  • Background Sync Handler                             │││
│  │  • Push Notifications Support                          │││
│  │                                                           │││
│  └──────────────────────────────────────────────────────────┘││
└───────────────────────────────────────────────────────────────┘│
                                                                   │
└───────────────────────────────────────────────────────────────────┘


                              ↓ (Server API)


┌───────────────────────────────────────────────────────────────────┐
│                      BACKEND (Server)                              │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              REST API Endpoints                             │   │
│  │  • POST /api/sync          → Process queued changes       │   │
│  │  • GET /api/feed           → Fetch new posts              │   │
│  │  • POST /api/messages      → Send messages                │   │
│  │  • GET /api/profile        → Get user profile             │   │
│  │  + More endpoints...                                       │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow - Creating a Post Offline

```
User clicks "Create Post"
         ↓
App generates temporary ID
         ↓
Optimistic Update Hook (useOptimisticUpdate)
         ├─→ Show post immediately in UI (⏳ indicator)
         └─→ Return optimistic data to component
         ↓
Component updates state
         ├─→ Post appears in feed instantly
         └─→ User sees ⏳ indicator
         ↓
offlineService.queueChange() called
         ├─→ Create SyncQueueItem object
         ├─→ Save to IndexedDB (survives app restart)
         └─→ Notify subscribers (SyncIndicator updates)
         ↓
offlineDataManager.cacheFeed() called
         ├─→ Add post to feed cache
         └─→ Save to IndexedDB
         ↓
While offline: Nothing more happens
     (post stays in UI with ⏳ indicator)
         ↓
User goes online
         ↓
networkStatusManager detects online status
         ├─→ Notifies offlineService
         └─→ offlineService.startSync() triggered
         ↓
Sync Process Begins
         ├─→ Fetch queued changes from IndexedDB
         ├─→ Batch them (max 10 per batch)
         └─→ networkAwareFetcher.smartFetch('/api/sync')
         ↓
Backend receives sync request
         ├─→ Validates post data
         ├─→ Saves to database
         └─→ Returns updated post with server ID & timestamp
         ↓
Response processed
         ├─→ Remove from sync queue
         ├─→ Update cache with server response
         ├─→ Notify component of success
         └─→ SyncIndicator hides ⏳ indicator
         ↓
User sees ✅ (or updated post from server)
```

---

## Conflict Resolution Flow

```
Offline: User edits post (creates local version)
         ↓
Online: offlineService.startSync()
         ↓
Backend: Post was also edited remotely
         ↓
Response has conflict (server timestamp > client)
         ↓
offlineService.handleConflict()
         ├─→ Compare timestamps
         └─→ Detect different versions
         ↓
Option 1: Automatic Resolution (if timestamps differ significantly)
         ├─→ Newest version wins (server update)
         └─→ Local version discarded
         ↓
Option 2: User Decision
         ├─→ ConflictResolutionDialog shows both versions
         ├─→ User selects: "Keep Local" or "Use Remote"
         └─→ Selected version saved
         ↓
Resolution confirmed
         ├─→ Update cache
         ├─→ Remove from conflict list
         └─→ Sync complete
```

---

## Network Adaptation Flow

```
User loads feed on 2G network
         ↓
networkStatusManager detects speed: 0.3 Mbps
         ↓
networkAwareFetcher.smartFetch('/api/feed')
         ├─→ Detects slow network (< 0.5 Mbps)
         ├─→ Enables batching (groups requests)
         ├─→ Reduces timeout multiplier (2x)
         └─→ Notifies components: use low quality
         ↓
Response received (batched API request)
         ├─→ Fewer HTTP requests = less overhead
         └─→ Data transferred: 60% less
         ↓
Images load with quality adaptation
         ├─→ Gets image URLs with ?q=60 parameter
         ├─→ Smaller file sizes (90% reduction possible)
         ├─→ Shows blur placeholder while loading
         └─→ Progressive quality on reconnect
         ↓
Cache stores both low-quality versions
         ├─→ Uses less storage
         └─→ Faster retrieval
         ↓
User experience: Smooth, responsive
         ├─→ App feels fast despite slow network
         └─→ Battery lasts longer (less data transfer)
```

---

## Cache Lifecycle

```
T=0: User loads feed
     ↓
offlineDataManager.cacheFeed(posts)
     ├─→ IndexedDB stores posts
     ├─→ Sets TTL = 15 minutes
     └─→ Records access time & count
     ↓
T=5min: User navigates away
     ↓
Cache still valid (TTL not expired)
     ↓
T=10min: User returns to feed
     ↓
getCachedFeed() returns posts immediately
     ├─→ UI shows data instantly
     └─→ Fetch fresh in background
     ↓
T=15min: TTL expires for older entries
     ↓
Cleanup function runs automatically
     ├─→ Removes expired feed entries
     ├─→ Keeps recent entries
     └─→ Frees up storage (~1MB)
     ↓
T=30min+: Old cache cleaned
     ↓
Storage usage stays under 50MB max
     ├─→ Automatic eviction if needed
     └─→ Newest data preserved
```

---

## Component Integration Points

```
Home.tsx
├─→ useOfflineFirstData() - Load feed with cache
├─→ offlineDataManager.cacheFeed() - Cache posts
├─→ useOptimisticUpdate() - Create post offline
└─→ SyncIndicator component - Show sync status

Chat.tsx
├─→ useOfflineFirstData() - Load messages
├─→ offlineDataManager.cacheMessages() - Cache per chat
├─→ useOptimisticUpdate() - Send message offline
└─→ useSyncStatus() - Monitor sync

Profile.tsx
├─→ useOfflineFirstData() - Load profile
├─→ offlineDataManager.cacheProfile() - Cache profile
├─→ OptimizedImage - Lazy load avatar
└─→ useConflictResolver() - Handle profile conflicts

Friends.tsx
├─→ useOfflineFirstData() - Load friends (1hr cache)
├─→ offlineDataManager.cacheFriends() - Persistent cache
├─→ OptimizedImage - Friend avatars
└─→ useOptimisticUpdate() - Add/remove friends

Topics.tsx
├─→ useOfflineFirstData() - Load topics (1hr cache)
├─→ offlineDataManager.cacheTopicRooms() - Persistent
├─→ OptimizedImage - Topic images
└─→ useSyncStatus() - Show sync status

All Pages
└─→ NetworkStatusBanner - Show online/offline
└─→ SyncIndicator - Show queue status
```

---

## Storage Model

```
Browser Storage Architecture:

┌─────────────────────────────────────┐
│      IndexedDB (Primary Storage)     │
│  Capacity: 500MB typical, 50MB limit │
│                                      │
│  Database: wizchat-offline           │
│  ├─ Store: sync-queue                │
│  │  └─ Items: SyncQueueItem objects   │
│  │     (survives app restart)         │
│  │                                    │
│  ├─ Store: feed-cache                 │
│  │  └─ Posts: 20-50 items, ~2MB       │
│  │     TTL: 15 minutes                │
│  │                                    │
│  ├─ Store: messages-cache             │
│  │  └─ Messages: per chat-id          │
│  │     TTL: 10 minutes                │
│  │                                    │
│  ├─ Store: profile-cache              │
│  │  └─ Profiles: cached users         │
│  │     TTL: 30 minutes                │
│  │                                    │
│  ├─ Store: friends-cache              │
│  │  └─ Friends: 100-500 items         │
│  │     TTL: 1 hour (persistent)       │
│  │                                    │
│  └─ Store: topics-cache               │
│     └─ Topics: 20-50 items            │
│        TTL: 1 hour (persistent)       │
│                                       │
└─────────────────────────────────────┘
         ↓ (fallback)
┌─────────────────────────────────────┐
│    localStorage (Fallback)           │
│  Capacity: 5-10MB per domain         │
│                                      │
│  • Metadata (quick flags)            │
│  • Settings                          │
│  • Small data only                   │
│                                      │
└─────────────────────────────────────┘
         ↓ (app shell)
┌─────────────────────────────────────┐
│  Service Worker Cache API            │
│  Capacity: Varies by browser         │
│                                      │
│  • HTTP resources (HTML, CSS, JS)    │
│  • Images (with quality variants)    │
│  • API responses (if selected)       │
│                                      │
└─────────────────────────────────────┘
```

---

## Performance Timeline - App Load (Offline)

```
T=0ms      Browser starts loading app
           ↓
T=50ms     Service Worker intercepts request
           ├─→ Checks cache
           └─→ Finds HTML (precached)
           ↓
T=100ms    Service Worker returns cached HTML
           ↓
T=150ms    React hydrates (from cache)
           ├─→ main.tsx runs
           ├─→ initializeOfflineMode() called
           └─→ offlineService initializes
           ↓
T=200ms    IndexedDB opens & connects
           ├─→ Loads sync queue
           ├─→ Loads metadata
           └─→ Checks cache expiry
           ↓
T=250ms    App shell renders (skeleton)
           ├─→ HTML structure visible
           ├─→ CSS loaded from cache
           └─→ Header visible
           ↓
T=300ms    Service Worker delivers CSS & JS
           ├─→ Assets from cache
           └─→ Decompresses and injects
           ↓
T=350ms    Feed loads from IndexedDB
           ├─→ 20 cached posts retrieved
           └─→ React renders posts
           ↓
T=400ms    Images load (with placeholders)
           ├─→ Blur placeholders show
           ├─→ Images lazy-load in viewport
           └─→ Progressive quality loading
           ↓
T=450ms    Home page interactive ✅
           ├─→ User can scroll
           ├─→ User can click posts
           └─→ All cached data visible
           ↓
T=500ms    Page fully loaded
           └─→ All images loaded/cached
           
Total: ~500ms to fully interactive
```

---

## Status Indicators

```
SyncIndicator States:

1. Online & Synced ✅
   Color: Green
   Icon: Checkmark
   Text: "All caught up"
   Queue: 0

2. Online & Syncing ⏳
   Color: Blue
   Icon: Spinner
   Text: "Syncing..."
   Queue: 2 (example)
   Shows: "Sending 2 changes"

3. Online & Pending 📤
   Color: Blue
   Icon: Upload arrow
   Text: "2 pending"
   Queue: 2 (example)
   Shows: "Manual sync button"

4. Offline 📵
   Color: Amber
   Icon: Offline symbol
   Text: "Offline mode"
   Queue: 1+ (example)
   Shows: "Changes will sync when online"

5. Offline & Full 🚨
   Color: Red
   Icon: Warning
   Text: "Offline - queue full"
   Queue: 50+ (example)
   Shows: "Sync to clear queue"

6. Error ❌
   Color: Red
   Icon: Error
   Text: "Sync error"
   Queue: 2+ (example)
   Shows: "Retry? Failed items may be in queue"
```

---

## Browser Compatibility Matrix

```
Feature Support by Browser:

                Chrome  Firefox  Safari  Edge   IE11
IndexedDB         ✅      ✅      ✅     ✅     ✅
Service Worker    ✅      ✅      ⚠️     ✅     ❌
localStorage      ✅      ✅      ✅     ✅     ✅
Fetch API         ✅      ✅      ✅     ✅     ❌
Promise           ✅      ✅      ✅     ✅     ❌
Offline-First     ✅      ✅      ⚠️     ✅     ❌

Legend:
✅ = Full support
⚠️  = Limited support
❌ = No support

Notes:
- Safari: Limited Service Worker (iOS not fully supported)
- IE11: Falls back to online-only mode
- Fallback for missing features: Uses localStorage only
```

---

## Implementation Checklist Visualization

```
Phase 1: Infrastructure ✅
├─ [✅] Service Worker created
├─ [✅] offline services created
├─ [✅] Hooks created
├─ [✅] Components created
└─ [✅] App.tsx integrated

Phase 2: Data Caching ✅
├─ [✅] Feed caching
├─ [✅] Messages caching
├─ [✅] Profile caching
├─ [✅] Friends caching
└─ [✅] Topics caching

Phase 3: Sync & Queue ✅
├─ [✅] Sync queue created
├─ [✅] Retry logic
├─ [✅] Conflict detection
├─ [✅] Batch processing
└─ [✅] Persistence

Phase 4: UI/UX ✅
├─ [✅] SyncIndicator component
├─ [✅] OptimizedImage component
├─ [✅] Network status banner
├─ [✅] Conflict dialog
└─ [✅] Status indicators

Phase 5: Testing ⏳
├─ [ ] Offline mode testing
├─ [ ] Sync testing
├─ [ ] Conflict testing
├─ [ ] Performance testing
└─ [ ] Browser compatibility testing

Phase 6: Deployment ⏳
├─ [ ] Production build
├─ [ ] Monitor performance
├─ [ ] Gather user feedback
└─ [ ] Iterate based on data
```

---

**Version**: 1.0  
**Status**: ✅ Architecture Complete  
**Ready**: For Testing & Integration  

For more details, see corresponding documentation files:
- OFFLINE_FIRST_GUIDE.md - Complete guide
- OFFLINE_API_REFERENCE.md - API documentation
- OFFLINE_QUICK_START.md - Quick start
