
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import PostCard from '@/components/PostCard';
import CreatePost from '@/components/CreatePost';
import StoriesSection from '@/components/StoriesSection';
import HashtagTrends from '@/components/HashtagTrends';
import TopicRooms from '@/components/TopicRooms';
import NotificationCenter from '@/components/NotificationCenter';
import { dataService } from '@/services/dataService';
import { Post } from '@/types';

const Home = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const fetchedPosts = await dataService.getPosts();
        setPosts(fetchedPosts);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  const handleNewPost = async (newPost: Post) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const handleLike = async (postId: string) => {
    try {
      await dataService.likePost(postId);
      
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const isLiked = post.likes.includes('current-user');
          return {
            ...post,
            likes: isLiked 
              ? post.likes.filter(id => id !== 'current-user')
              : [...post.likes, 'current-user']
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleReaction = async (postId: string, emoji: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      const existingReaction = post?.reactions.find(r => r.emoji === emoji && r.userId === 'current-user');
      
      if (existingReaction) {
        await dataService.removeReaction(postId, emoji);
      } else {
        await dataService.addReaction(postId, emoji);
      }
      
      // Refresh posts to get updated reactions
      const updatedPosts = await dataService.getPosts();
      setPosts(updatedPosts);
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading posts...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Stories Section */}
        <StoriesSection />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-4">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <HashtagTrends />
            <TopicRooms />
          </div>
          
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            <CreatePost onPostCreated={handleNewPost} />
            
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onReaction={handleReaction}
                />
              ))}
            </div>

            {posts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
              </div>
            )}
          </div>
          
          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <NotificationCenter />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
