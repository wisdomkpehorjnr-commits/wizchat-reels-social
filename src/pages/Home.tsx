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
import { useLocation } from 'react-router-dom';
import { useTabCache } from '@/hooks/useTabCache';
import { FeedSkeleton, PostCardSkeleton } from '@/components/SkeletonLoaders';

const Home = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const { saveScrollPosition, getScrollPosition, getCachedData, clearScrollPosition } = useScrollPosition();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const isRestoringScrollRef = useRef(false);
  const scrollRestoredRef = useRef(false);

  // Tab caching for instant content on tab switch
  const { 
    cachedData: cachedPosts, 
    cacheStatus, 
    isCached, 
    cacheData, 
    refreshFromNetwork 
  } = useTabCache({
    tabId: 'home-feed',
    ttl: 30 * 60 * 1000, // 30 minutes
  });

  // Check if we have cached data and scroll position on mount
  useEffect(() => {
    const cachedPosts = getCachedData('/');
    const savedScroll = getScrollPosition('/');
    
    if (cachedPosts && cachedPosts.length > 0 && !hasLoadedRef.current) {
      // Restore cached posts immediately
      setPosts(cachedPosts);
      setLoading(false);
      hasLoadedRef.current = true;
      
      // Restore scroll position after a brief delay to ensure DOM is ready
      if (savedScroll !== null && savedScroll > 0) {
        isRestoringScrollRef.current = true;
        // Use multiple requestAnimationFrame calls to ensure DOM is fully rendered
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
      // No cache, load from server
      loadPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load posts from server (only if no cache)
  useEffect(() => {
    // Listen for home refresh events
    const handleRefreshHome = () => {
      refreshFeed();
    };
    
    window.addEventListener('refreshHome', handleRefreshHome);
    
    // Check for post ID in URL (from notifications)
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    if (postId) {
      // Wait for posts to load, then scroll to post
      const scrollToPost = () => {
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (postElement) {
          postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the post briefly
          postElement.classList.add('ring-4', 'ring-green-500', 'ring-offset-2', 'transition-all');
          setTimeout(() => {
            postElement.classList.remove('ring-4', 'ring-green-500', 'ring-offset-2');
          }, 2000);
        } else {
          // If post not found yet, try again after a delay
          setTimeout(scrollToPost, 500);
        }
      };
      
      // Clean up URL immediately
      window.history.replaceState({}, '', '/');
      
      // Try scrolling after posts load
      setTimeout(scrollToPost, 1000);
    }
    
    return () => {
      window.removeEventListener('refreshHome', handleRefreshHome);
    };
  }, []);
  
  // Save posts to cache whenever they change (scroll position is saved automatically by context)
  useEffect(() => {
    if (posts.length > 0 && !isRestoringScrollRef.current && scrollRestoredRef.current) {
      // Update cache with current posts (scroll position is handled by ScrollPositionContext)
      const currentScroll = window.scrollY;
      saveScrollPosition('/', currentScroll, posts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]);

  const loadPosts = async (skipCache = false) => {
    if (!user) return;
    try {
      setLoading(true);
      // Fetch all posts and active pinned post IDs
      const [postsData, pinnedIds] = await Promise.all([
        dataService.getPosts(),
        dataService.getActivePinnedPosts(),
      ]);
      // Pinned posts go at the top, ordered by their "pinned_at" timestamps.
      const pinnedPosts = postsData
        .filter(post => pinnedIds.includes(post.id));
      // Optionally, sort pinnedPosts by their pin time (add pinned_at to post and sort if needed)
      const otherPosts = postsData
        .filter(post => !pinnedIds.includes(post.id));
      const sortedPosts = [...pinnedPosts, ...otherPosts];
      
      setPosts(sortedPosts);
      
      // Cache the posts
      if (!skipCache) {
        const currentScroll = window.scrollY;
        saveScrollPosition('/', currentScroll, sortedPosts);
      }
      
      hasLoadedRef.current = true;
    } catch (error) {
      console.error('Error fetching posts:', error);
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
      // Optimistically update the UI
      setPosts(currentPosts => {
        const updated = currentPosts.map(post =>
          post.id === postId ? { ...post, likes: post.likes.includes(user?.id) ? post.likes.filter(id => id !== user?.id) : [...post.likes, user?.id] } : post
        );
        // Update cache
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
    try {
      // Clear cached data and scroll position
      clearScrollPosition('/');
      scrollRestoredRef.current = false;
      
      // Fetch fresh posts
      const [freshPosts, pinnedIds] = await Promise.all([
        dataService.getPosts(),
        dataService.getActivePinnedPosts(),
      ]);
      
      const pinnedPosts = freshPosts.filter(post => pinnedIds.includes(post.id));
      const otherPosts = freshPosts.filter(post => !pinnedIds.includes(post.id));
      const sortedPosts = [...pinnedPosts, ...otherPosts];
      
      setPosts(sortedPosts);
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Cache the new posts with scroll at 0
      saveScrollPosition('/', 0, sortedPosts);
      
      toast({
        title: "Feed Refreshed",
        description: "Your feed has been updated with the latest posts"
      });
    } catch (error) {
      console.error('Error refreshing feed:', error);
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
                console.log('Creating post:', postData);
                
                // Create the post in database
                const createdPost = await dataService.createPost(postData);
                console.log('Post created successfully:', createdPost.id);
                
                // Add the real post to the top of the feed
                setPosts(prevPosts => {
                  const updated = [createdPost, ...prevPosts];
                  // Update cache with new post
                  const currentScroll = window.scrollY;
                  saveScrollPosition('/', currentScroll, updated);
                  return updated;
                });
                
                // Scroll to top to show the new post
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  // Update cache with scroll at top
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

          {/* Posts Feed - Show all posts except reels */}
          <div className="space-y-6">
                       {/* Show skeleton loaders while loading */}
                       {loading && posts.length === 0 && (
                         <FeedSkeleton />
                       )}

                       {/* Show actual posts */}
            {posts
              .filter(post => !post.isReel)
              .map((post, index) => {
                console.log('Rendering post:', {
                  id: post.id,
                  content: post.content,
                  imageUrls: post.imageUrls,
                  imageUrl: post.imageUrl,
                  mediaType: post.mediaType,
                  hasImages: !!(post.imageUrls?.length || post.imageUrl)
                });
                
                // Show friends suggestion card after every 60 posts
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

          {/* Loading State */}
          {loading && (
            <div className="text-center py-4">
              Loading posts...
            </div>
          )}

          {/* Empty State */}
          {!loading && posts.length === 0 && (
            <div className="text-center py-4">
              No posts yet. Start following people to see their posts!
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Home;
