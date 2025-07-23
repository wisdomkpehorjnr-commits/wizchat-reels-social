
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import CreatePost from '@/components/CreatePost';
import PostCard from '@/components/PostCard';
import StoriesSection from '@/components/StoriesSection';
import HashtagTrends from '@/components/HashtagTrends';
import TopicRooms from '@/components/TopicRooms';
import { dataService } from '@/services/dataService';
import { Post } from '@/types';
import { useToast } from '@/components/ui/use-toast';

const Home = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const postsData = await dataService.getPosts();
      setPosts(postsData);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = async (newPost: Post) => {
    setPosts(prevPosts => [newPost, ...prevPosts]);
  };

  const handleSavePost = async (postId: string) => {
    try {
      // Implement save post functionality
      toast({
        title: "Saved",
        description: "Post saved to your collection",
      });
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: "Error",
        description: "Failed to save post",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Stories Section */}
        <StoriesSection />
        
        {/* Create Post */}
        <CreatePost onPostCreated={handlePostCreated} />
        
        {/* Posts Feed */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-white/60 mt-2">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/60">No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                onSave={() => handleSavePost(post.id)}
              />
            ))
          )}
        </div>

        {/* Sidebar Components (on larger screens) */}
        <div className="hidden lg:block fixed right-4 top-20 w-80 space-y-6">
          <HashtagTrends />
          <TopicRooms />
        </div>
      </div>
    </Layout>
  );
};

export default Home;
