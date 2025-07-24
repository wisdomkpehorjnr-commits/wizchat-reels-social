
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import CreatePost from '@/components/CreatePost';
import PostCard from '@/components/PostCard';
import StoriesSection from '@/components/StoriesSection';
import TopicRooms from '@/components/TopicRooms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      const userPosts = await dataService.getPosts();
      setPosts(userPosts);
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

  const handlePostCreated = () => {
    loadPosts();
  };

  const handleSavePost = async (postId: string) => {
    try {
      await dataService.savePost(postId);
      toast({
        title: "Post saved",
        description: "Post has been saved to your collection",
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
      <div className="min-h-screen bg-background">
        <StoriesSection />
        
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              <CreatePost onPostCreated={handlePostCreated} />
              
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="border-2 green-border">
                      <CardContent className="p-4">
                        <div className="animate-pulse space-y-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-muted rounded-full" />
                            <div className="space-y-2">
                              <div className="w-24 h-4 bg-muted rounded" />
                              <div className="w-20 h-3 bg-muted rounded" />
                            </div>
                          </div>
                          <div className="w-full h-32 bg-muted rounded" />
                        </div>
                      </CardContent>
                    </Card>
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
                    <Card className="border-2 green-border">
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">
                          No posts yet. Create your first post to get started!
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <TopicRooms />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
