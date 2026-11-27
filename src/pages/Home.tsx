import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import Layout from '@/components/Layout';
import CreatePost from '@/components/CreatePost';
import PostCard from '@/components/PostCard';
import StoriesSection from '@/components/StoriesSection';
import FriendsSuggestionCard from '@/components/FriendsSuggestionCard';
import PeopleYouMayKnowCard from '@/components/PeopleYouMayKnowCard';
import ReelsPromoCard from '@/components/ReelsPromoCard';
import { Button } from '@/components/ui/button';
import { RefreshCw, Search } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FeedSkeleton } from '@/components/SkeletonLoaders';
import { SmartLoading } from '@/components/SmartLoading';
import GlobalSearch from '@/components/GlobalSearch';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { preloadPostsImages } from '@/services/preloadService';
import { offlineDataManager } from '@/services/offlineDataManager';

// =============================================
// PERSISTENT MODULE-LEVEL STORE (survives all remounts)
// =============================================
const HOME_FEED_CACHE_KEY = 'wizchat_home_feed_cache';
const HOME_FEED_SCROLL_KEY = 'wizchat_home_feed_scroll';
const HOME_FEED_MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

interface HomeStore {
  posts: any[];
  scrollY: number;
  lastFetchTime: number;
  isInitialized: boolean;
  postCount: number;
}

const homeStore: HomeStore = {
  posts: [],
  scrollY: 0,
  lastFetchTime: 0,
  isInitialized: false,
  postCount: 0,
};

let tabVisible = !document.hidden;
document.addEventListener('visibilitychange', () => {
  tabVisible = !document.hidden;
});

(() => {
  if (homeStore.isInitialized) return;
  try {
    const cached = localStorage.getItem(HOME_FEED_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
        homeStore.posts = parsed.data;
        homeStore.lastFetchTime = parsed.timestamp || 0;
        homeStore.postCount = parsed.data.length;
      }
    }
    const scrollCached = localStorage.getItem(HOME_FEED_SCROLL_KEY);
    if (scrollCached) {
      const scrollPos = JSON.parse(scrollCached);
      if (typeof scrollPos === 'number' && scrollPos > 0) homeStore.scrollY = scrollPos;
    }
  } catch {}
  homeStore.isInitialized = true;
})();

const saveToLocalStorage = (posts: any[], scrollY: number = homeStore.scrollY) => {
  try {
    localStorage.setItem(HOME_FEED_CACHE_KEY, JSON.stringify({ data: posts, timestamp: Date.now() }));
    localStorage.setItem(HOME_FEED_SCROLL_KEY, JSON.stringify(scrollY));
  } catch {}
};

const Home = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  useNetworkStatus();
  const hasCachedPosts = homeStore.posts.length > 0;
  const [posts, setPosts] = useState<any[]>(homeStore.posts);
  const [loading, setLoading] = useState(!hasCachedPosts);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [showSearch, setShowSearch] = useState<boolean>(() => {
    try { return sessionStorage.getItem('wizchat_search_open') === '1'; } catch { return false; }
  });

  useEffect(() => {
    try {
      if (showSearch) sessionStorage.setItem('wizchat_search_open', '1');
      else sessionStorage.removeItem('wizchat_search_open');
    } catch {}
  }, [showSearch]);

  useEffect(() => {
    const closeSearch = () => setShowSearch(false);
    window.addEventListener('wizchat-home-pressed', closeSearch);
    return () => window.removeEventListener('wizchat-home-pressed', closeSearch);
  }, []);

  const hasLoadedRef = useRef(false);
  const scrollRestoredRef = useRef(false);
  const isRestoringScrollRef = useRef(false);

  useLayoutEffect(() => {
    if (scrollRestoredRef.current || !hasCachedPosts) return;
    scrollRestoredRef.current = true;
    isRestoringScrollRef.current = true;
    const savedScrollY = homeStore.scrollY;
    if (savedScrollY > 0) {
      window.scrollTo(0, savedScrollY);
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollY);
        requestAnimationFrame(() => {
          window.scrollTo(0, savedScrollY);
          isRestoringScrollRef.current = false;
        });
      });
    } else {
      isRestoringScrollRef.current = false;
    }
  }, [hasCachedPosts]);

  useEffect(() => {
    const handleScroll = () => {
      if (isRestoringScrollRef.current) return;
      homeStore.scrollY = window.scrollY;
      saveToLocalStorage(homeStore.posts, window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (posts.length > 0) preloadPostsImages(posts);
  }, [posts]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const { postId, isLiked, likeCount, userId } = detail;
      if (!postId) return;
      const apply = (list: any[]) => list.map((p) => {
        if (p.id !== postId) return p;
        const arr = Array.isArray(p.likes) ? [...p.likes] : [];
        let nextLikes = arr;
        if (userId) {
          const has = arr.some((l: any) => (typeof l === 'string' ? l === userId : l?.user_id === userId));
          if (isLiked && !has) nextLikes = [...arr, { user_id: userId }];
          if (!isLiked && has) nextLikes = arr.filter((l: any) => (typeof l === 'string' ? l !== userId : l?.user_id !== userId));
        }
        return { ...p, isLiked, likeCount, likes: nextLikes };
      });
      homeStore.posts = apply(homeStore.posts);
      saveToLocalStorage(homeStore.posts, homeStore.scrollY);
      setPosts((prev) => apply(prev));
    };
    window.addEventListener('post-like-changed', handler as EventListener);
    return () => window.removeEventListener('post-like-changed', handler as EventListener);
  }, []);

  useEffect(() => {
    if (posts.length > 0) {
      homeStore.posts = posts;
      homeStore.postCount = posts.length;
      saveToLocalStorage(posts, homeStore.scrollY);
    }
  }, [posts]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    const now = Date.now();
    const isCacheStale = now - homeStore.lastFetchTime > HOME_FEED_MIN_REFRESH_INTERVAL_MS;
    if (hasCachedPosts && !isCacheStale) {
      setLoading(false);
      return;
    }
    if (!tabVisible && hasCachedPosts) {
      setLoading(false);
      return;
    }
    loadPosts(hasCachedPosts);
  }, [hasCachedPosts]);

  useEffect(() => {
    const handleRefreshHome = () => refreshFeed();
    window.addEventListener('refreshHome', handleRefreshHome);
    const jumpTo = (postId: string) => {
      let tries = 0;
      const scrollToPost = () => {
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (postElement) {
          postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          postElement.classList.add('ring-4', 'ring-primary', 'ring-offset-2', 'transition-all');
          setTimeout(() => postElement.classList.remove('ring-4', 'ring-primary', 'ring-offset-2'), 2000);
        } else if (tries++ < 20) {
          setTimeout(scrollToPost, 400);
        }
      };
      window.history.replaceState({}, '', '/');
      setTimeout(scrollToPost, 300);
    };
    const initialPost = new URLSearchParams(window.location.search).get('post');
    if (initialPost) jumpTo(initialPost);
    const onJump = (e: Event) => jumpTo((e as CustomEvent).detail);
    window.addEventListener('scroll-to-post', onJump);
    return () => {
      window.removeEventListener('refreshHome', handleRefreshHome);
      window.removeEventListener('scroll-to-post', onJump);
    };
  }, []);

  const loadPosts = useCallback(async (silent = false) => {
    if (!user || (!tabVisible && hasCachedPosts)) return;
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [postsData, pinnedIds] = await Promise.all([
        dataService.getPosts(),
        dataService.getActivePinnedPosts(),
      ]);
      const pinnedPosts = postsData.filter(post => pinnedIds.includes(post.id));
      const otherPosts = postsData.filter(post => !pinnedIds.includes(post.id));
      const sortedPosts = [...pinnedPosts, ...otherPosts];
      setPosts(sortedPosts);
      homeStore.posts = sortedPosts;
      homeStore.lastFetchTime = Date.now();
      homeStore.postCount = sortedPosts.length;
      saveToLocalStorage(sortedPosts, homeStore.scrollY);
      try { offlineDataManager.cacheFeed(sortedPosts, 2 * 60 * 60 * 1000).catch(() => {}); } catch {}
    } catch (error) {
      if (homeStore.posts.length === 0) setError(error instanceof Error ? error : new Error('Failed to fetch posts'));
    } finally {
      setLoading(false);
    }
  }, [user, hasCachedPosts]);

  const refreshFeed = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [postsData, pinnedIds] = await Promise.all([dataService.getPosts(), dataService.getActivePinnedPosts()]);
      const pinnedPosts = postsData.filter(post => pinnedIds.includes(post.id));
      const otherPosts = postsData.filter(post => !pinnedIds.includes(post.id));
      const freshPosts = [...pinnedPosts, ...otherPosts];
      setPosts(freshPosts);
      homeStore.posts = freshPosts;
      homeStore.postCount = freshPosts.length;
      homeStore.lastFetchTime = Date.now();
      homeStore.scrollY = 0;
      saveToLocalStorage(freshPosts, 0);
      try { offlineDataManager.cacheFeed(freshPosts, 2 * 60 * 60 * 1000).catch(() => {}); } catch {}
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast({ title: 'Feed Refreshed', description: 'Your feed has been updated with the latest posts' });
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to refresh feed'));
      toast({ title: 'Error', description: 'Failed to refresh feed', variant: 'default' });
    } finally {
      setRefreshing(false);
    }
  };

  const handlePostCreated = async (postData: any) => {
    try {
      const createdPost = await dataService.createPost(postData);
      setPosts(prevPosts => {
        const updated = [createdPost, ...prevPosts];
        homeStore.posts = updated;
        homeStore.postCount = updated.length;
        saveToLocalStorage(updated, homeStore.scrollY);
        try { offlineDataManager.cacheFeed(updated, 2 * 60 * 60 * 1000).catch(() => {}); } catch {}
        return updated;
      });
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        homeStore.scrollY = 0;
        saveToLocalStorage(homeStore.posts, 0);
      }, 100);
      toast({ title: 'Success', description: 'Post created successfully!', duration: 2000 });
    } catch (error) {
      throw error;
    }
  };

  const regularPosts = useMemo(() => posts.filter(post => !post.isReel && !post.videoUrl && post.mediaType !== 'video'), [posts]);
  const reelPosts = useMemo(() => posts.filter(post => post.isReel || post.videoUrl || post.mediaType === 'video'), [posts]);
  const reelRotationOffsetRef = useRef<number>(Math.random());
  const rotatedReelPosts = useMemo(() => {
    if (reelPosts.length <= 1) return reelPosts;
    const offset = Math.floor(reelRotationOffsetRef.current * reelPosts.length);
    return [...reelPosts.slice(offset), ...reelPosts.slice(0, offset)];
  }, [reelPosts]);

  return (
    <Layout>
      <div className="w-full px-3 py-6 sm:px-5 md:px-6 lg:px-8">
        <div className="mx-auto w-full md:max-w-none">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="home-instagram-title text-3xl font-semibold text-foreground">Home</h1>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowSearch(true)} aria-label="Global search" variant="outline" size="sm">
                <Search className="w-4 h-4 app-chrome-icon" />
              </Button>
              <Button onClick={refreshFeed} disabled={refreshing} variant="outline" size="sm">
                <RefreshCw className={`w-4 h-4 mr-2 app-chrome-icon ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>

          <div className="mb-6"><StoriesSection /></div>
          <div className="mb-6"><CreatePost onPostCreated={handlePostCreated} /></div>

          <SmartLoading
            isLoading={loading && posts.length === 0 && navigator.onLine}
            isError={error !== null && posts.length === 0}
            isEmpty={!loading && posts.length === 0}
            error={error}
            loadingFallback={<FeedSkeleton />}
            errorFallback={(retry) => (
              <div className="text-center py-12 space-y-4">
                <p className="text-destructive">Failed to load feed</p>
                <Button onClick={retry} variant="outline">Try Again</Button>
              </div>
            )}
            emptyFallback={
              <div className="text-center py-12">
                {!navigator.onLine ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-muted/30 backdrop-blur-xl flex items-center justify-center">
                      <RefreshCw className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p class="text-muted-foreground">You're offline. Posts will appear once you connect.</p>
                  </div>
                ) : <p className="text-muted-foreground">No posts yet. Start following people to see their posts!</p>}
              </div>
            }
            onRetry={() => loadPosts()}
          >
            <div className="home-feed-list space-y-6">
              <PeopleYouMayKnowCard />
              {regularPosts.map((post, index) => {
                const position = index + 1;
                const shouldShowReels = position % 8 === 0;
                const shouldShowPymk = position % 30 === 15;
                const promoIndex = position / 8 - 1;
                return (
                  <div key={post.id} data-post-id={post.id} className="space-y-6">
                    <PostCard post={post} onPostUpdate={loadPosts} />
                    {shouldShowPymk && <PeopleYouMayKnowCard />}
                    {shouldShowReels && <ReelsPromoCard reels={rotatedReelPosts} promoIndex={promoIndex} />}
                  </div>
                );
              })}
            </div>
          </SmartLoading>
        </div>
      </div>
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </Layout>
  );
};

export default Home;
