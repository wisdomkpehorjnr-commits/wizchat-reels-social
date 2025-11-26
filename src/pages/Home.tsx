import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import CreatePost from '@/components/CreatePost';
import PostCard from '@/components/PostCard';
import StoriesSection from '@/components/StoriesSection';
import WatchReelsCard from '@/components/WatchReelsCard';
import FriendsSuggestionCard from '@/components/FriendsSuggestionCard';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useScrollPosition } from '@/contexts/ScrollPositionContext';
import { useTabCache } from '@/hooks/useTabCache';
import { FeedSkeleton, PostCardSkeleton } from '@/components/SkeletonLoaders';
import { SmartLoading } from '@/components/SmartLoading';

const Home = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { saveScrollPosition, getScrollPosition, getCachedData, clearScrollPosition } = useScrollPosition();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasLoadedRef = useRef(false);
  const isRestoringScrollRef = useRef(false);
  const scrollRestoredRef = useRef(false);

  // Use tab cache for persistent feed caching (15 minutes TTL)
  const { cachedData, cacheStatus, isCached, cacheData, refreshFromNetwork, clearCache } = useTabCache({
    tabId: 'home-feed',
    enabled: true,
    ttl: 15 * 60 * 1000,
    onStatusChange: (status) => {
      console.debug(`[Home] Cache status: ${status}`);
    },
  });

  // Initialize: restore from cache or load from server
  useEffect(() => {
    const cachedPosts = getCachedData('/');
    const savedScroll = getScrollPosition('/');

    if (cachedPosts && cachedPosts.length > 0 && !hasLoadedRef.current) {
      setPosts(cachedPosts);
      setLoading(false);
      hasLoadedRef.current = true;

      if (savedScroll !== null && savedScroll > 0) {
        isRestoringScrollRef.current = true;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.scrollTo({ top: savedScroll, behavior: 'instant' });
              scrollRestoredRef.current = true;
              isRestoringScrollRef.current = false;
            });
          });
        });
      } else {
        scrollRestoredRef.current = true;
      }
    } else if (!hasLoadedRef.current) {
      loadPosts();
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
    }
  }, [posts]);

  const loadPosts = async (skipCache = false) => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const [postsData, pinnedIds] = await Promise.all([
        dataService.getPosts(),
        dataService.getActivePinnedPosts(),
      ]);

      const pinnedPosts = postsData.filter(post => pinnedIds.includes(post.id));
      const otherPosts = postsData.filter(post => !pinnedIds.includes(post.id));
      const sortedPosts = [...pinnedPosts, ...otherPosts];

      setPosts(sortedPosts);

      if (!skipCache) {
        const currentScroll = window.scrollY;
        saveScrollPosition('/', currentScroll, sortedPosts);
        await cacheData(sortedPosts);
      }

      hasLoadedRef.current = true;
    } catch (error) {
      console.error('Error fetching posts:', error);
      const err = error instanceof Error ? error : new Error('Failed to fetch posts');
      setError(err);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive"
      });
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
        const currentScroll = window.scrollY;
        saveScrollPosition('/', currentScroll, updated);
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
      await clearCache();
      scrollRestoredRef.current = false;

      const freshPosts = await refreshFromNetwork(async () => {
        const [posts, pinnedIds] = await Promise.all([
          dataService.getPosts(),
          dataService.getActivePinnedPosts(),
        ]);

        const pinnedPosts = posts.filter(post => pinnedIds.includes(post.id));
        const otherPosts = posts.filter(post => !pinnedIds.includes(post.id));
        return [...pinnedPosts, ...otherPosts];
      });

      setPosts(freshPosts || []);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      saveScrollPosition('/', 0, freshPosts || []);

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
                  const currentScroll = window.scrollY;
                  saveScrollPosition('/', currentScroll, updated);
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
            isError={error !== null && !isCached}
            isEmpty={!loading && posts.length === 0}
            error={error}
            loadingFallback={<FeedSkeleton />}
            errorFallback={(retry) => (
              <div className="text-center py-12 space-y-4">
                <p className="text-red-600 dark:text-red-400">Failed to load feed</p>
                <Button onClick={retry} variant="outline">Try Again</Button>
              </div>
            )}
            emptyFallback={
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-slate-400">No posts yet. Start following people to see their posts!</p>
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
    </Layout>
  );
};

export default Home;
