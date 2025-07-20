import { useState } from 'react';
import Layout from '@/components/Layout';
import PostCard from '@/components/PostCard';
import CreatePost from '@/components/CreatePost';
import { mockPosts } from '@/lib/mockData';
import { Post } from '@/types';

const Home = () => {
  const [posts, setPosts] = useState<Post[]>(mockPosts);

  const handleNewPost = (newPost: Post) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = post.likes.includes('1'); // current user id
        return {
          ...post,
          likes: isLiked 
            ? post.likes.filter(id => id !== '1')
            : [...post.likes, '1']
        };
      }
      return post;
    }));
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <CreatePost onPostCreated={handleNewPost} />
        
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
            />
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Home;