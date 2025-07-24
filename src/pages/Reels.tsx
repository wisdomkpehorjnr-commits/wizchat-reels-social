
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ReelCard from '@/components/ReelCard';
import { Post } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Video } from 'lucide-react';

const Reels = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    try {
      console.log('Loading reels...');
      const allPosts = await dataService.getPosts();
      // Filter for video posts and reels
      const videoReels = allPosts.filter(post => 
        post.videoUrl || post.isReel || post.mediaType === 'video'
      );
      console.log('Found reels:', videoReels.length);
      setReels(videoReels);
    } catch (error) {
      console.error('Error loading reels:', error);
      toast({
        title: "Error",
        description: "Failed to load reels",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    
    try {
      await dataService.likePost(postId);
      
      // Update local state
      setReels(prevReels => 
        prevReels.map(reel => {
          if (reel.id === postId) {
            const isLiked = reel.likes.includes(user.id);
            return {
              ...reel,
              likes: isLiked 
                ? reel.likes.filter(id => id !== user.id)
                : [...reel.likes, user.id]
            };
          }
          return reel;
        })
      );
      
      toast({
        title: "Success",
        description: "Like updated",
      });
    } catch (error) {
      console.error('Error liking reel:', error);
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive"
      });
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const handleShare = async (post: Post) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out this reel by ${post.user.name}`,
          text: post.content || 'Check out this awesome reel!',
          url: `${window.location.origin}/reel/${post.id}`
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that don't support native sharing
      const shareText = `Check out this reel by ${post.user.name}: ${window.location.origin}/reel/${post.id}`;
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Link copied",
        description: "Reel link copied to clipboard",
      });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
      setCurrentIndex(newIndex);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto h-[calc(100vh-4rem)] overflow-hidden">
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border-2 green-border rounded-lg aspect-[9/16] bg-card animate-pulse">
                <div className="w-full h-full bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : reels.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No reels available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create a video post to see it here
            </p>
          </div>
        ) : (
          <div 
            ref={containerRef}
            className="h-full overflow-y-auto snap-y snap-mandatory"
            onScroll={handleScroll}
          >
            {reels.map((reel, index) => (
              <div key={reel.id} className="h-full snap-start">
                <ReelCard 
                  post={reel} 
                  isActive={index === currentIndex}
                  onLike={handleLike}
                  onUserClick={handleUserClick}
                  onShare={handleShare}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reels;
