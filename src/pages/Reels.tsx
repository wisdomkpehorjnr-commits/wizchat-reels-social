import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ReelCard from '@/components/ReelCard';
import { Post } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Video, ArrowLeft } from 'lucide-react';

const Reels = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
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
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Check out this reel by ${post.user.name}`,
          text: post.content || 'Check out this awesome reel!',
          url: `${window.location.origin}/reel/${post.id}`
        });
        
        toast({
          title: "Shared successfully",
          description: "Reel shared!",
        });
      } else {
        // Fallback for browsers that don't support native sharing
        const shareText = `Check out this reel by ${post.user.name}: ${window.location.origin}/reel/${post.id}`;
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Link copied",
          description: "Reel link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Error",
        description: "Failed to share reel",
        variant: "destructive"
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
      
      // Snap to the current video after scroll ends
      setTimeout(() => {
        const targetScrollTop = newIndex * itemHeight;
        if (Math.abs(container.scrollTop - targetScrollTop) > 10) {
          container.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        }
      }, 150);
    }
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* Exit Arrow Button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 left-4 z-50 text-white hover:bg-white/20 rounded-full p-2"
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="w-6 h-6" />
      </Button>
      
      <div className="w-full h-full overflow-hidden">
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
            className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth"
            onScroll={handleScroll}
            style={{ scrollBehavior: 'smooth' }}
          >
            {reels.map((post) => (
              <ReelCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onUserClick={handleUserClick}
                onShare={handleShare}
                isMuted={isMuted}
                onMuteToggle={() => setIsMuted(!isMuted)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reels;
