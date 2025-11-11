import { useState, useEffect } from 'react';
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

/** Minimal feed PostCard skeleton */
function PostCardSkeleton() {
  return (
    <div className="w-full border-2 border-gray-200 dark:border-white/10 bg-background rounded-xl mb-6 p-6 animate-pulse">
      <div className="flex items-center mb-4">
        <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-white/10 mr-4" />
        <div className="flex-1 space-y-2">
          <div className="h-4 rounded bg-gray-200 dark:bg-white/10 w-1/3" />
          <div className="h-3 rounded bg-gray-100 dark:bg-white/5 w-1/4" />
        </div>
      </div>
      <div className="h-4 w-3/4 bg-gray-200 dark:bg-white/10 rounded mb-2" />
      <div className="h-48 w-full rounded-lg bg-gray-100 dark:bg-white/5 mb-4" />
      <div className="flex space-x-4 mt-2">
        <div className="h-9 w-20 rounded bg-gray-200 dark:bg-white/10" />
        <div className="h-9 w-20 rounded bg-gray-200 dark:bg-white/10" />
        <div className="h-9 w-20 rounded bg-gray-200 dark:bg-white/10" />
      </div>
    </div>
  );
}

const Home = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPosts();
    
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

  const loadPosts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const posts = await dataService.getPosts();
      console.log('Loaded posts:', posts);
      console.log('Posts with imageUrls:', posts.filter(p => p.imageUrls));
      
      setPosts(posts);
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
      setPosts(currentPosts =>
        currentPosts.map(post =>
          post.id === postId ? { ...post, likes: post.likes.includes(user?.id) ? post.likes.filter(id => id !== user?.id) : [...post.likes, user?.id] } : post
        )
      );
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
      const freshPosts = await dataService.getPosts();
      setPosts(freshPosts);
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
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
                setPosts(prevPosts => [createdPost, ...prevPosts]);
                
                // Scroll to top to show the new post
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
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
            {loading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <PostCardSkeleton key={i} />
                ))}
              </>
            ) : (
              posts
                .filter(post => !post.isReel)
                .map((post, index) => {
                  // Show friends suggestion card after every 60 posts
                  const shouldShowSuggestion = (index + 1) % 60 === 0;
                  return (
                    <div key={post.id} className="animate-fade-in">
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
            )}
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
