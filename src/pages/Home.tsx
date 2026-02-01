import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
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
import { useFeedStore, getFeedScrollPosition, setFeedScrollPosition } from '@/hooks/useFeedStore';

const Home = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showSearch, setShowSearch] = useState(false);
  
  // Use the persistent feed store
  const {
    posts,
    loading,
    refreshing,
    error,
    fullRefresh,
    addPostLocally,
    updatePostLocally,
    getSavedScrollY,
  } = useFeedStore({ userId: user?.id });

  const scrollRestoredRef = useRef(false);

  // Restore scroll position immediately on mount
  useLayoutEffect(() => {
    if (scrollRestoredRef.current) return;
    scrollRestoredRef.current = true;
    
    const savedScroll = getSavedScrollY();
    if (savedScroll > 0 && posts.length > 0) {
      // Use double RAF to ensure DOM is rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: savedScroll, behavior: 'instant' as any });
          console.debug('[Home] Restored scroll to:', savedScroll);
        });
      });
    }
  }, [posts.length, getSavedScrollY]);

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      setFeedScrollPosition(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Event listeners
  useEffect(() => {
    const handleRefreshHome = () => fullRefresh();
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
  }, [fullRefresh]);

  const handleLikePost = async (postId: string) => {
    if (!user) return;
    
    try {
      // Optimistic update
      updatePostLocally(postId, post => ({
        ...post,
        likes: post.likes.includes(user.id)
          ? post.likes.filter(id => id !== user.id)
          : [...post.likes, user.id],
      }));
      
      await dataService.likePost(postId);
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert on error
      updatePostLocally(postId, post => ({
        ...post,
        likes: post.likes.includes(user.id)
          ? post.likes.filter(id => id !== user.id)
          : [...post.likes, user.id],
      }));
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
    await fullRefresh();
    toast({
      title: "Feed Refreshed",
      description: "Your feed has been updated with the latest posts"
    });
  };

  const handlePostCreated = async (postData: any) => {
    try {
      const createdPost = await dataService.createPost(postData);
      
      // Add to local store immediately
      addPostLocally(createdPost);

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setFeedScrollPosition(0);
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

  // Filter non-reel posts for feed display
  const feedPosts = posts.filter(post => !post.isReel);
  const reelPosts = posts.filter(post => post.isReel || post.videoUrl);

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
            onRetry={fullRefresh}
          >
            <div className="space-y-6">
              {feedPosts.map((post, index) => {
                const shouldShowSuggestion = (index + 1) % 60 === 0;

                return (
                  <div key={post.id} data-post-id={post.id}>
                    <PostCard
                      post={post}
                      onPostUpdate={fullRefresh}
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
