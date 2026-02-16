import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import Layout from '@/components/Layout';
import CreatePost from '@/components/CreatePost';
import PostCard from '@/components/PostCard';
import StoriesSection from '@/components/StoriesSection';
import WatchReelsCard from '@/components/WatchReelsCard';
import FriendsSuggestionCard from '@/components/FriendsSuggestionCard';
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
const HOME_FEED_MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (longer to prevent data drain)

interface HomeStore {
  posts: any[];
  scrollY: number;
  lastFetchTime: number;
  isInitialized: boolean;
  postCount: number;
}

// Module-level store - persists across ALL component remounts
const homeStore: HomeStore = {
  posts: [],
  scrollY: 0,
  lastFetchTime: 0,
  isInitialized: false,
  postCount: 0,
};

// Track tab visibility to prevent fetches when tab is hidden
let tabVisible = !document.hidden;
document.addEventListener('visibilitychange', () => {
  tabVisible = !document.hidden;
  console.debug('[Home] Tab visibility changed to:', tabVisible);
});

// SYNCHRONOUS initialization from localStorage on module load (BEFORE any render)
(() => {
  if (homeStore.isInitialized) return;
  
  try {
    // Load posts
    const cached = localStorage.getItem(HOME_FEED_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
        homeStore.posts = parsed.data;
        homeStore.lastFetchTime = parsed.timestamp || 0;
        homeStore.postCount = parsed.data.length;
        console.debug('[Home] INSTANT hydration from localStorage:', parsed.data.length, 'posts');
      }
    }

    // Load scroll position
    const scrollCached = localStorage.getItem(HOME_FEED_SCROLL_KEY);
    if (scrollCached) {
      const scrollPos = JSON.parse(scrollCached);
      if (typeof scrollPos === 'number' && scrollPos > 0) {
        homeStore.scrollY = scrollPos;
        console.debug('[Home] Loaded scroll position:', scrollPos);
      }
    }
  } catch (e) {
    console.debug('[Home] localStorage parse failed:', e);
  }
  homeStore.isInitialized = true;
})();

const saveToLocalStorage = (posts: any[], scrollY: number = homeStore.scrollY) => {
  try {
    localStorage.setItem(HOME_FEED_CACHE_KEY, JSON.stringify({
      data: posts,
      timestamp: Date.now()
    }));
    localStorage.setItem(HOME_FEED_SCROLL_KEY, JSON.stringify(scrollY));
  } catch (e) {
    console.debug('[Home] Failed to save to localStorage:', e);
  }
};

const Home = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOnline = useNetworkStatus();
  
  // INSTANT display from module-level store - NO loading state if we have cached posts
  const hasCachedPosts = homeStore.posts.length > 0;
  
  const [posts, setPosts] = useState<any[]>(homeStore.posts);
  const [loading, setLoading] = useState(!hasCachedPosts);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  
  const hasLoadedRef = useRef(false);
  const scrollRestoredRef = useRef(false);
  const isRestoringScrollRef = useRef(false);
  const componentMountTracker = useRef(0);

  // CRITICAL: Restore scroll position IMMEDIATELY on mount (before paint)
  useLayoutEffect(() => {
    componentMountTracker.current++;
    
    if (scrollRestoredRef.current) return;
    if (!hasCachedPosts) return;
    
    scrollRestoredRef.current = true;
    isRestoringScrollRef.current = true;
    
    const savedScrollY = homeStore.scrollY;
    if (savedScrollY > 0) {
      // Force immediate scroll restore - try multiple times to ensure it sticks
      window.scrollTo(0, savedScrollY);
      
      // Double-check after layout
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

  // Save scroll position on scroll (but not during restoration)
  useEffect(() => {
    const handleScroll = () => {
      if (isRestoringScrollRef.current) return;
      homeStore.scrollY = window.scrollY;
      // Periodically save to localStorage while scrolling
      saveToLocalStorage(homeStore.posts, window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Preload all post images in background (fire and forget)
  useEffect(() => {
    if (posts.length > 0) {
      preloadPostsImages(posts);
    }
  }, [posts]);

  // Sync posts to module store whenever they change
  useEffect(() => {
    if (posts.length > 0) {
      homeStore.posts = posts;
      homeStore.postCount = posts.length;
      saveToLocalStorage(posts, homeStore.scrollY);
    }
  }, [posts]);

  // Fetch posts - only when truly needed
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const now = Date.now();
    const timeSinceLastFetch = now - homeStore.lastFetchTime;
    const isCacheStale = timeSinceLastFetch > HOME_FEED_MIN_REFRESH_INTERVAL_MS;
    
    if (hasCachedPosts && !isCacheStale) {
      // Cache is fresh - don't fetch, just use cached data
      console.debug('[Home] Cache fresh, skipping network fetch. Posts:', homeStore.posts.length);
      setLoading(false);
      return;
    }

    // Either no cache or cache is stale
    // ONLY fetch if:
    // 1. Tab is visible (don't drain data in background)
    // 2. We're online or have no cached data
    // 3. We're not refreshing already
    
    if (!tabVisible && hasCachedPosts) {
      console.debug('[Home] Tab not visible, skipping fetch. Using cached data.');
      setLoading(false);
      return;
    }

    // Do a fetch, but silently if we have cached data
    loadPosts(hasCachedPosts);
  }, [hasCachedPosts]);

  // Event listeners
  useEffect(() => {
    const handleRefreshHome = () => refreshFeed();
    window.addEventListener('refreshHome', handleRefreshHome);

    // Handle post URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    if (postId) {
      const scrollToPost = () => {
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (postElement) {
          postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          postElement.classList.add('ring-4', 'ring-green-500', 'ring-offset-2', 'transition-all');
          setTimeout(() => {
            postElement.classList.remove('ring-4', 'ring-green-500', 'ring-offset-2');
          }, 2000);
        } else {
          setTimeout(scrollToPost, 500);
        }
      };
      window.history.replaceState({}, '', '/');
      setTimeout(scrollToPost, 1000);
    }

    return () => {
      window.removeEventListener('refreshHome', handleRefreshHome);
    };
  }, []);

  const loadPosts = useCallback(async (silent = false) => {
    if (!user) return;
    
    // Don't fetch if tab is not visible and we have cached data
    if (!tabVisible && hasCachedPosts) {
      console.debug('[Home] Tab hidden, skipping fetch');
      return;
    }
    
    try {
      if (!silent) {
        setLoading(true);
      }
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
      // Persist feed to offline manager for durable caching
      try {
        offlineDataManager.cacheFeed(sortedPosts, 2 * 60 * 60 * 1000).catch(() => {});
      } catch (e) {
        console.debug('[Home] offlineDataManager.cacheFeed failed:', e);
      }
      
      console.debug('[Home] Fetched', sortedPosts.length, 'posts (silent:', silent, ')');
    } catch (error) {
      console.error('Error fetching posts:', error);
      // Only show error if we have no cached data to display
      if (homeStore.posts.length === 0) {
        const err = error instanceof Error ? error : new Error('Failed to fetch posts');
        setError(err);
        toast({
          title: "Error",
          description: "Failed to load posts",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user, toast, hasCachedPosts]);

  const handleLikePost = async (postId: string) => {
    try {
      await dataService.likePost(postId);
      setPosts(currentPosts => {
        const updated = currentPosts.map(post =>
          post.id === postId 
            ? { 
                ...post, 
                likes: post.likes.includes(user?.id) 
                  ? post.likes.filter((id: string) => id !== user?.id) 
                  : [...post.likes, user?.id] 
              } 
            : post
        );
        return updated;
      });
    } catch (error) {
      console.error('Error liking post:', error);
      toast({
        title: "Like queued",
        description: "Your like count will be updated once you are connected"
      });
    }
  };

  const handleSharePost = (post: any) => {
    if (navigator.share) {
      navigator.share({
        title: 'Check out this post!',
        text: post.content,
        url: window.location.origin,
      }).then(() => {
        toast({
          title: "Post Shared",
          description: "Thanks for sharing!",
        });
      }).catch((error) => {
        console.error('Error sharing:', error);
        toast({
          title: "Error",
          description: "Failed to share post",
          variant: "destructive"
        });
      });
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          toast({
            title: "Link Copied",
            description: "Post link copied to clipboard!",
          });
        })
        .catch((error) => {
          console.error('Error copying to clipboard:', error);
          toast({
            title: "Error",
            description: "Failed to copy link",
            variant: "destructive"
          });
        });
    }
  };

  const refreshFeed = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [postsData, pinnedIds] = await Promise.all([
        dataService.getPosts(),
        dataService.getActivePinnedPosts(),
      ]);

      const pinnedPosts = postsData.filter(post => pinnedIds.includes(post.id));
      const otherPosts = postsData.filter(post => !pinnedIds.includes(post.id));
      const freshPosts = [...pinnedPosts, ...otherPosts];

      setPosts(freshPosts);
      homeStore.posts = freshPosts;
      homeStore.postCount = freshPosts.length;
      homeStore.lastFetchTime = Date.now();
      homeStore.scrollY = 0;
      saveToLocalStorage(freshPosts, 0);
      // Persist refreshed feed
      try {
        offlineDataManager.cacheFeed(freshPosts, 2 * 60 * 60 * 1000).catch(() => {});
      } catch (e) {
        console.debug('[Home] offlineDataManager.cacheFeed failed:', e);
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });

      toast({
        title: "Feed Refreshed",
        description: "Your feed has been updated with the latest posts"
      });
    } catch (error) {
      console.error('Error refreshing feed:', error);
      const err = error instanceof Error ? error : new Error('Failed to refresh feed');
      setError(err);
      toast({
        title: "Error",
        description: "Failed to refresh feed",
        variant: "destructive"
      });
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
        // Persist updated feed
        try {
          offlineDataManager.cacheFeed(updated, 2 * 60 * 60 * 1000).catch(() => {});
        } catch (e) {
          console.debug('[Home] offlineDataManager.cacheFeed failed:', e);
        }
        return updated;
      });

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        homeStore.scrollY = 0;
        saveToLocalStorage(homeStore.posts, 0);
      }, 100);

      toast({
        title: "Success",
        description: "Post created successfully!",
        duration: 2000
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Memoize post lists
  const regularPosts = useMemo(() => posts.filter(post => !post.isReel), [posts]);
  const reelPosts = useMemo(() => posts.filter(post => post.isReel || post.videoUrl), [posts]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-foreground">Home</h1>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setShowSearch(true)}
                variant="outline"
                size="sm"
              >
                <Search className="w-4 h-4" />
              </Button>
              <Button 
                onClick={refreshFeed}
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Stories Section */}
          <div className="mb-6">
            <StoriesSection />
          </div>

          {/* Create Post */}
          <div className="mb-6">
            <CreatePost onPostCreated={handlePostCreated} />
          </div>

          {/* Watch Reels Section */}
          {reelPosts.length > 0 && (
            <div className="mb-6">
              <WatchReelsCard reelPosts={reelPosts} />
            </div>
          )}

          {/* Posts Feed with SmartLoading */}
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
                    <p className="text-muted-foreground">You're offline. Posts will appear once you connect.</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No posts yet. Start following people to see their posts!</p>
                )}
              </div>
            }
            onRetry={() => loadPosts()}
          >
            <div className="space-y-6">
              {regularPosts.map((post, index) => {
                const shouldShowSuggestion = (index + 1) % 60 === 0;

                return (
                  <div key={post.id} data-post-id={post.id}>
                    <PostCard
                      post={post}
                      onPostUpdate={loadPosts}
                    />
                    {shouldShowSuggestion && (
                      <FriendsSuggestionCard />
                    )}
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
