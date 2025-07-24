
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import CreatePost from '@/components/CreatePost';
import PostCard from '@/components/PostCard';
import StoriesSection from '@/components/StoriesSection';
import { Post } from '@/types';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';

const Home = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const allPosts = await dataService.getPosts();
      // Filter out reels from main feed
      const regularPosts = allPosts.filter(post => !post.isReel);
      setPosts(regularPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePost = async (postId: string) => {
    try {
      await dataService.savePost(postId);
      toast({
        title: "Success",
        description: "Post saved successfully"
      });
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: "Error", 
        description: "Failed to save post",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <StoriesSection />
        <CreatePost />
        
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border-2 green-border rounded-lg p-6 animate-pulse bg-card">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="space-y-2">
                    <div className="w-32 h-4 bg-muted rounded" />
                    <div className="w-24 h-3 bg-muted rounded" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="w-full h-4 bg-muted rounded" />
                  <div className="w-3/4 h-4 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                onSave={() => handleSavePost(post.id)}
              />
            ))}
            {posts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Home;
