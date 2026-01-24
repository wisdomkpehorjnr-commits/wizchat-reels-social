import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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
import { useScrollPosition } from '@/contexts/ScrollPositionContext';
import { FeedSkeleton } from '@/components/SkeletonLoaders';
import { SmartLoading } from '@/components/SmartLoading';
import GlobalSearch from '@/components/GlobalSearch';

const HOME_FEED_CACHE_KEY = 'wizchat_home_feed_cache';

const HOME_FEED_MIN_REFRESH_INTERVAL_MS = 2 * 60 * 1000; // avoid re-downloading when tab-switching

// Synchronous localStorage hydration - INSTANT display
const getInitialCachedPosts = (): any[] => {
  try {
    const cached = localStorage.getItem(HOME_FEED_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.data && Array.isArray(parsed.data)) {
        console.debug('[Home] Hydrated from localStorage instantly');
        return parsed.data;
      }
    }
  } catch (e) {
    console.debug('[Home] localStorage hydration failed:', e);
  }
  return [];
};

const savePostsToCache = (posts: any[]) => {
  try {
    localStorage.setItem(HOME_FEED_CACHE_KEY, JSON.stringify({
      data: posts,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.debug('[Home] Failed to cache posts:', e);
  }
};

const getCacheTimestamp = (): number | null => {
  try {
    const cached = localStorage.getItem(HOME_FEED_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return typeof parsed?.timestamp === 'number' ? parsed.timestamp : null;
  } catch {
    return null;
  }
};

const Home = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { saveScrollPosition, getScrollPosition, getCachedData, clearScrollPosition } = useScrollPosition();

  // Prefer in-memory cached feed (persists across tab switches) over localStorage.
  const initialCachedData = useMemo(() => {
    const inMemory = getCachedData('/') as any[] | null;
    if (inMemory && Array.isArray(inMemory) && inMemory.length > 0) return inMemory;
    return getInitialCachedPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasCachedData = initialCachedData.length > 0;

  const [posts, setPosts] = useState<any[]>(initialCachedData);
  const [loading, setLoading] = useState(!hasCachedData); // no skeleton if cached
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const hasLoadedDataRef = useRef(false);
  const isRestoringScrollRef = useRef(false);
  const scrollRestoredRef = useRef(false);
  const pendingRestoreScrollRef = useRef<number | null>(null);

  // Capture desired scroll position on mount; apply after cached feed is rendered.
  useEffect(() => {
    const savedScroll = getScrollPosition('/');
    pendingRestoreScrollRef.current = (savedScroll !== null && savedScroll > 0) ? savedScroll : null;
  }, [getScrollPosition]);

  // Apply scroll restoration once the feed is present (prevents jumping to top on tab return).
  useLayoutEffect(() => {
    if (scrollRestoredRef.current) return;
    if (!hasCachedData) {
      scrollRestoredRef.current = true;
      return;
    }
    if (posts.length === 0) return;

    const savedScroll = pendingRestoreScrollRef.current;
    if (savedScroll === null) {
      scrollRestoredRef.current = true;
      return;
    }

    isRestoringScrollRef.current = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedScroll, behavior: 'auto' });
        scrollRestoredRef.current = true;
        isRestoringScrollRef.current = false;
      });
    });
  }, [hasCachedData, posts.length]);

  // Load data only when needed (avoid re-downloading on every tab switch)
  useEffect(() => {
    if (!hasLoadedDataRef.current) {
      hasLoadedDataRef.current = true;
      
      if (hasCachedData) {
        const ts = getCacheTimestamp();
        const isFresh = typeof ts === 'number' && Date.now() - ts < HOME_FEED_MIN_REFRESH_INTERVAL_MS;
        if (!isFresh) {
          // Silent refresh only if cache is stale
          loadPosts(true);
        }
      } else {
        // First load - show skeleton
        loadPosts(false);
      }
    }
  }, []);

  // Setup event listeners and URL handling
  useEffect(() => {
    const handleRefreshHome = () => refreshFeed();
    window.addEventListener('refreshHome', handleRefreshHome);

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

  // Save posts to cache whenever they change
  useEffect(() => {
    if (posts.length > 0 && !isRestoringScrollRef.current && scrollRestoredRef.current) {
      const currentScroll = window.scrollY;
      saveScrollPosition('/', currentScroll, posts);
      savePostsToCache(posts); // Persist for instant hydration
    }
  }, [posts]);

  const loadPosts = async (silent = false) => {
    if (!user) return;
    try {
      if (!silent && !hasCachedData) {
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
      savePostsToCache(sortedPosts); // Persist for instant hydration

      if (!silent) {
        const currentScroll = window.scrollY;
        saveScrollPosition('/', currentScroll, sortedPosts);
      }

    } catch (error) {
      console.error('Error fetching posts:', error);
      // Only show error if we have no cached data
      if (!hasCachedData) {
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
  };

  const handleLikePost = async (postId: string) => {
    try {
      await dataService.likePost(postId);
      setPosts(currentPosts => {
        const updated = currentPosts.map(post =>
          post.id === postId 
            ? { 
                ...post, 
                likes: post.likes.includes(user?.id) 
                  ? post.likes.filter(id => id !== user?.id) 
                  : [...post.likes, user?.id] 
              } 
            : post
        );
        return updated;
      });
    } catch (error) {
      console.error('Error liking post:', error);
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive"
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
      clearScrollPosition('/');
      scrollRestoredRef.current = false;

      const [postsData, pinnedIds] = await Promise.all([
        dataService.getPosts(),
        dataService.getActivePinnedPosts(),
      ]);

      const pinnedPosts = postsData.filter(post => pinnedIds.includes(post.id));
      const otherPosts = postsData.filter(post => !pinnedIds.includes(post.id));
      const freshPosts = [...pinnedPosts, ...otherPosts];

      setPosts(freshPosts);
      savePostsToCache(freshPosts);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      saveScrollPosition('/', 0, freshPosts);
      scrollRestoredRef.current = true;

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
            <CreatePost onPostCreated={async (postData) => {
              try {
                const createdPost = await dataService.createPost(postData);

                setPosts(prevPosts => {
                  const updated = [createdPost, ...prevPosts];
                  savePostsToCache(updated);
                  return updated;
                });

                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  saveScrollPosition('/', 0, [createdPost, ...posts]);
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
            }} />
          </div>

          {/* Watch Reels Section */}
          {posts.filter(post => post.isReel || post.videoUrl).length > 0 && (
            <div className="mb-6">
              <WatchReelsCard reelPosts={posts.filter(post => post.isReel || post.videoUrl)} />
            </div>
          )}

          {/* Posts Feed with SmartLoading */}
          <SmartLoading
            isLoading={loading && posts.length === 0}
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
                <p className="text-muted-foreground">No posts yet. Start following people to see their posts!</p>
              </div>
            }
            onRetry={() => loadPosts()}
          >
            <div className="space-y-6">
              {posts
                .filter(post => !post.isReel)
                .map((post, index) => {
                  const shouldShowSuggestion = (index + 1) % 60 === 0;

                  return (
                    <div key={post.id}>
                      <PostCard
                        post={post}
                        onPostUpdate={loadPosts}
                      />
                      {shouldShowSuggestion && (
                        <FriendsSuggestionCard />
                      )}
                    </div>
                  );
                })
              }
            </div>
          </SmartLoading>
        </div>
      </div>
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </Layout>
  );
};

export default Home;
