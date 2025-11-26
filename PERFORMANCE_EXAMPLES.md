# Performance Implementation Examples

## Complete Integration Examples

### Example 1: Home Page with Full Caching & Skeletons

```typescript
// src/pages/Home.tsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import CreatePost from '@/components/CreatePost';
import PostCard from '@/components/PostCard';
import { useTabCache } from '@/hooks/useTabCache';
import { useNetworkStatus } from '@/hooks/useNetworkAware';
import { SmartLoading, CachedBadge, RefreshButton } from '@/components/SmartLoading';
import { FeedSkeleton } from '@/components/SkeletonLoaders';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isOffline, isSlow } = useNetworkStatus();

  // Tab caching for instant content
  const {
    cachedData: cachedPosts,
    cacheStatus,
    isCached,
    cacheData,
    refreshFromNetwork,
  } = useTabCache({
    tabId: 'home-feed',
    ttl: 30 * 60 * 1000, // 30 minutes
  });

  // Load cached data first
  useEffect(() => {
    if (cachedPosts && !posts.length) {
      setPosts(cachedPosts);
      setLoading(false);
    }
  }, [cachedPosts]);

  // Then fetch fresh data if online
  useEffect(() => {
    if (!isOffline && !refreshing) {
      loadFreshPosts();
    }
  }, [isOffline]);

  const loadFreshPosts = async () => {
    try {
      setLoading(true);
      const freshPosts = await dataService.getPosts();
      setPosts(freshPosts);
      cacheData(freshPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshFromNetwork(() => dataService.getPosts());
      loadFreshPosts();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Status indicators */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Home</h1>
          <div className="flex items-center gap-2">
            {isCached && <CachedBadge isCached timestamp={Date.now()} />}
            <RefreshButton isRefreshing={refreshing} onRefresh={handleRefresh} />
          </div>
        </div>

        {/* Offline indicator */}
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm"
          >
            📵 Offline mode - viewing cached posts
          </motion.div>
        )}

        {/* Slow connection indicator */}
        {!isOffline && isSlow && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm"
          >
            🐢 Slow connection - showing saved content
          </motion.div>
        )}

        {/* Create post - only when online */}
        {!isOffline && <CreatePost onPostCreated={handleRefresh} />}

        {/* Feed with smart loading */}
        <SmartLoading
          isLoading={loading && !posts.length}
          isEmpty={!loading && posts.length === 0}
          skeleton={<FeedSkeleton />}
          emptyFallback={
            <div className="text-center py-8 text-gray-500">
              No posts yet. Follow people to see their posts!
            </div>
          }
        >
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onPostUpdate={handleRefresh} />
            ))}
          </div>
        </SmartLoading>
      </div>
    </Layout>
  );
}
```

---

### Example 2: Reels Page with Video Caching

```typescript
// src/pages/Reels.tsx
import { useState, useEffect } from 'react';
import { useTabCache } from '@/hooks/useTabCache';
import { useNetworkStatus } from '@/hooks/useNetworkAware';
import { SmartLoading, StaleWhileRevalidate } from '@/components/SmartLoading';
import { ReelCardSkeleton, ListSkeleton } from '@/components/SkeletonLoaders';
import { ReelsFeedScreen } from '@/components/reels';
import { dataService } from '@/services/dataService';

export default function Reels() {
  const [reels, setReels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOffline } = useNetworkStatus();

  const {
    cachedData: cachedReels,
    cacheStatus,
    isCached,
    cacheData,
  } = useTabCache({
    tabId: 'reels',
    ttl: 60 * 60 * 1000, // 1 hour (less frequently updating)
  });

  // Load cached reels first
  useEffect(() => {
    if (cachedReels && !reels.length) {
      setReels(cachedReels);
      setIsLoading(false);
    }
  }, [cachedReels]);

  // Fetch fresh reels if online
  useEffect(() => {
    if (!isOffline && (isLoading || !isCached)) {
      loadReels();
    }
  }, [isOffline]);

  const loadReels = async () => {
    try {
      setIsLoading(true);
      const freshReels = await dataService.getReels();
      setReels(freshReels);
      cacheData(freshReels);
    } catch (error) {
      console.error('Error loading reels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StaleWhileRevalidate isCached={isCached} isLoading={isLoading}>
      <SmartLoading
        isLoading={isLoading && !reels.length}
        isEmpty={!isLoading && reels.length === 0}
        skeleton={<ListSkeleton count={3} type="reel" />}
        emptyFallback={<div>No reels available</div>}
      >
        <ReelsFeedScreen reels={reels} />
      </SmartLoading>
    </StaleWhileRevalidate>
  );
}
```

---

### Example 3: Chat Page with Smart Messages Loading

```typescript
// src/pages/Chat.tsx
import { useState, useEffect } from 'react';
import { useTabCache } from '@/hooks/useTabCache';
import { useNetworkStatus } from '@/hooks/useNetworkAware';
import { useSmartCache } from '@/hooks/useNetworkAware';
import { SmartLoading } from '@/components/SmartLoading';
import { ListSkeleton } from '@/components/SkeletonLoaders';
import ChatList from '@/components/ChatList';
import { dataService } from '@/services/dataService';

export default function Chat() {
  const { isOffline, isSlow } = useNetworkStatus();

  // Use smart cache for chat list
  const { data: chats, loading, error, isCached } = useSmartCache(
    () => dataService.getChats(),
    'cache_chats',
    {
      cacheTTL: 10 * 60 * 1000, // 10 minutes
      timeout: 10 * 1000, // 10 second timeout
    }
  );

  return (
    <SmartLoading
      isLoading={loading}
      error={error}
      isEmpty={!loading && !chats?.length}
      skeleton={<ListSkeleton count={5} type="comment" />}
      errorFallback={
        <div className="p-4 text-red-600">
          Failed to load chats. {!isOffline && 'Try again?'}
        </div>
      }
      emptyFallback={<div className="p-4 text-gray-500">No chats yet</div>}
    >
      <ChatList
        chats={chats}
        isCached={isCached}
        isOffline={isOffline}
        isSlow={isSlow}
      />
    </SmartLoading>
  );
}
```

---

### Example 4: Profile with Progressive Loading

```typescript
// src/pages/Profile.tsx
import { useState, useEffect } from 'react';
import { useTabCache } from '@/hooks/useTabCache';
import { SmartLoading, ContentFadeIn } from '@/components/SmartLoading';
import { ProfileSectionSkeleton } from '@/components/SkeletonLoaders';
import { dataService } from '@/services/dataService';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const {
    cachedData: cachedProfile,
    cacheData: cacheProfile,
  } = useTabCache({
    tabId: 'profile',
    ttl: 60 * 60 * 1000, // 1 hour
  });

  // Load profile first (critical)
  useEffect(() => {
    if (cachedProfile) {
      setProfile(cachedProfile);
      setLoadingProfile(false);
    } else {
      loadProfile();
    }
  }, []);

  // Then load posts (secondary)
  useEffect(() => {
    if (profile) {
      loadPosts();
    }
  }, [profile]);

  const loadProfile = async () => {
    try {
      const profileData = await dataService.getProfile();
      setProfile(profileData);
      cacheProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadPosts = async () => {
    try {
      setLoadingPosts(true);
      const postsData = await dataService.getProfilePosts();
      setPosts(postsData);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile section - show skeleton first */}
      <SmartLoading
        isLoading={loadingProfile}
        skeleton={<ProfileSectionSkeleton />}
      >
        <ContentFadeIn show={!loadingProfile}>
          <ProfileHeader profile={profile} />
        </ContentFadeIn>
      </SmartLoading>

      {/* Posts section - can show while profile loads */}
      <ContentFadeIn show={!loadingProfile} delay={0.1}>
        <div className="space-y-4">
          {loadingPosts && <ProfileSectionSkeleton />}
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </ContentFadeIn>
    </div>
  );
}
```

---

### Example 5: Infinite Scroll with Smart Loading

```typescript
// src/components/InfiniteScrollFeed.tsx
import { useEffect, useRef, useState } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { useTabCache } from '@/hooks/useTabCache';
import { PaginationLoading } from '@/components/SmartLoading';
import { PostCardSkeleton } from '@/components/SkeletonLoaders';
import PostCard from './PostCard';

export default function InfiniteScrollFeed() {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef(null);

  const { cachedData, cacheData } = useTabCache({
    tabId: 'infinite-feed',
  });

  // Intersection observer for infinite scroll
  useIntersectionObserver(loadMoreRef, async (isVisible) => {
    if (isVisible && !isLoadingMore && hasMore) {
      loadMore();
    }
  });

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const newItems = await fetchFeedPage(page + 1);
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        const updated = [...items, ...newItems];
        setItems(updated);
        cacheData(updated);
        setPage(page + 1);
      }
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <PaginationLoading
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      skeleton={<PostCardSkeleton />}
    >
      <div className="space-y-4">
        {items.map((item) => (
          <PostCard key={item.id} post={item} />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="h-10" />
    </PaginationLoading>
  );
}
```

---

## Performance Monitoring

```typescript
// Add to your app initialization
import { requestManager } from '@/lib/performanceUtils';
import { cacheService } from '@/services/cacheService';
import { networkStatusManager } from '@/services/networkStatusManager';

// Log stats every 30 seconds
setInterval(async () => {
  console.log('[Performance Stats]', {
    requests: requestManager.getCacheStats(),
    network: networkStatusManager.getStatus(),
  });
}, 30000);

// Monitor long tasks
if (window.PerformanceObserver) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('Long task:', entry.duration);
    }
  });

  observer.observe({ entryTypes: ['longtask'] });
}
```

---

## Testing Checklist

- [ ] Tab switch <100ms
- [ ] No blank screens
- [ ] Skeleton appears instantly
- [ ] Network banner displays correctly
- [ ] Offline mode shows cached content
- [ ] Reconnection syncs data
- [ ] Slow network detection works
- [ ] Cache persists after reload
- [ ] Cache clears on logout
- [ ] No console errors
- [ ] Memory stays <100MB
- [ ] Animations smooth (60fps)
- [ ] Touch responsive on mobile
- [ ] Scroll position preserved
- [ ] Images lazy-load smoothly
