import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import TikTokReelCard from '@/components/TikTokReelCard';
import { Post } from '@/types';
import { dataService } from '@/services/dataService';
import { ProfileService } from '@/services/profileService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTabManager } from '@/contexts/TabManagerContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ReelAnalytics {
  reelId: string;
  userId: string;
  viewTime?: number;
  liked?: boolean;
  shared?: boolean;
  soundEnabled?: boolean;
  position?: number;
}

const Reels = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getCachedData, setCachedData } = useTabManager();
  
  // Check TabManager cache first for instant loading
  const tabCache = getCachedData('/reels');
  const initialReels = tabCache?.reels || [];
  
  const [reels, setReels] = useState<Post[]>(initialReels);
  const [loading, setLoading] = useState(!initialReels.length);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [preloadedVideos, setPreloadedVideos] = useState<Set<string>>(new Set());
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isScrolling = useRef(false);
  const watchTimes = useRef<Map<string, number>>(new Map());
  const analyticsQueue = useRef<ReelAnalytics[]>([]);

  // Load reels
  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    try {
      setLoading(true);
      const allPosts = await dataService.getPosts();
      const videoReels = allPosts.filter(post => 
        post.videoUrl || post.isReel || post.mediaType === 'video'
      );
      setReels(videoReels);
      setCachedData('/reels', { reels: videoReels }); // Update TabManager cache
      
      // Preload first video
      if (videoReels.length > 0) {
        preloadVideo(videoReels[0].id, videoReels[0].videoUrl);
      }
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

  // Preload video
  const preloadVideo = useCallback((reelId: string, videoUrl?: string) => {
    if (!videoUrl || preloadedVideos.has(reelId)) return;

    const video = document.createElement('video');
    video.src = videoUrl;
    video.preload = 'auto';
    video.muted = true;
    
    video.addEventListener('loadeddata', () => {
      setPreloadedVideos(prev => new Set(prev).add(reelId));
    });

    video.addEventListener('error', () => {
      console.error('Failed to preload video:', reelId);
    });
  }, [preloadedVideos]);

  // Preload next video when index changes
  useEffect(() => {
    if (reels.length > 0 && currentIndex < reels.length - 1) {
      const nextReel = reels[currentIndex + 1];
      if (nextReel?.videoUrl) {
        preloadVideo(nextReel.id, nextReel.videoUrl);
      }
    }
  }, [currentIndex, reels, preloadVideo]);

  // Handle swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    isScrolling.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const touchY = e.touches[0].clientY;
    const deltaY = touchY - touchStartY.current;
    
    if (Math.abs(deltaY) > 10) {
      isScrolling.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isScrolling.current || !containerRef.current) return;

    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchEndY - touchStartY.current;
    const deltaTime = Date.now() - touchStartTime.current;
    const threshold = 50; // Minimum swipe distance
    const velocity = Math.abs(deltaY / deltaTime);

    // Only navigate if swipe is fast enough or far enough
    if (Math.abs(deltaY) > threshold || velocity > 0.3) {
      if (deltaY < 0 && currentIndex < reels.length - 1) {
        // Swipe up - next
        navigateToIndex(currentIndex + 1);
      } else if (deltaY > 0 && currentIndex > 0) {
        // Swipe down - previous
        navigateToIndex(currentIndex - 1);
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && currentIndex < reels.length - 1) {
        e.preventDefault();
        navigateToIndex(currentIndex + 1);
      } else if (e.key === 'ArrowDown' && currentIndex > 0) {
        e.preventDefault();
        navigateToIndex(currentIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, reels.length]);

  // Navigate to specific index with smooth scroll
  const navigateToIndex = useCallback((index: number) => {
    if (index < 0 || index >= reels.length) return;

    setCurrentIndex(index);
    
    if (containerRef.current) {
      const targetScroll = index * window.innerHeight;
      containerRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }

    // Preload adjacent videos
    if (index < reels.length - 1) {
      const nextReel = reels[index + 1];
      if (nextReel?.videoUrl) {
        preloadVideo(nextReel.id, nextReel.videoUrl);
      }
    }
    if (index > 0) {
      const prevReel = reels[index - 1];
      if (prevReel?.videoUrl) {
        preloadVideo(prevReel.id, prevReel.videoUrl);
      }
    }
  }, [reels, preloadVideo]);

  // Handle scroll snap
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isScrolling.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const viewportHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / viewportHeight);

    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, reels.length]);

  // Track analytics
  const trackAnalytics = useCallback((event: ReelAnalytics) => {
    analyticsQueue.current.push(event);
    
    // Batch send analytics (in production, send to analytics service)
    if (analyticsQueue.current.length >= 5) {
      console.log('Analytics batch:', analyticsQueue.current);
      // Send to analytics service here
      analyticsQueue.current = [];
    }
  }, []);

  // Handle like
  const handleLike = async (postId: string) => {
    if (!user) return;
    
    try {
      await dataService.likePost(postId);
      
      // Update local state
      setReels(prevReels => 
        prevReels.map(reel => {
          if (reel.id === postId) {
            const isLiked = reel.likes?.includes(user.id) || false;
            const currentLikes = reel.likes || [];
            return {
              ...reel,
              likes: isLiked 
                ? currentLikes.filter((id: string) => id !== user.id)
                : [...currentLikes, user.id]
            };
          }
          return reel;
        })
      );

      // Track analytics
      trackAnalytics({
        reelId: postId,
        userId: user.id,
        liked: true
      });
    } catch (error) {
      console.error('Error liking reel:', error);
      throw error;
    }
  };

  // Handle follow
  const handleFollow = async (userId: string) => {
    if (!user) return;
    
    try {
      await ProfileService.followUser(userId);
      
      // Track analytics
      trackAnalytics({
        reelId: reels[currentIndex]?.id || '',
        userId: user.id
      });
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  };

  // Handle comment
  const handleComment = async (postId: string, content: string) => {
    if (!user) return;
    
    try {
      await dataService.addComment(postId, content);
      
      // Update local state
      setReels(prevReels => 
        prevReels.map(reel => {
          if (reel.id === postId) {
            return {
              ...reel,
              comments: [...(reel.comments || []), {
                id: `temp-${Date.now()}`,
                userId: user.id,
                user: user,
                postId: postId,
                content: content,
                createdAt: new Date()
              }]
            };
          }
          return reel;
        })
      );
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  // Handle share
  const handleShare = async (post: Post) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Check out this reel by ${post.user.name}`,
          text: post.content || 'Check out this awesome reel!',
          url: `${window.location.origin}/reels?reel=${post.id}`
        });
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/reels?reel=${post.id}`);
        toast({
          title: "Link copied",
          description: "Reel link copied to clipboard"
        });
      }

      // Track analytics
      if (user) {
        trackAnalytics({
          reelId: post.id,
          userId: user.id,
          shared: true
        });
      }
    } catch (error) {
      console.error('Error sharing reel:', error);
    }
  };

  // Handle save
  const handleSave = async (postId: string) => {
    if (!user) return;
    
    try {
      await ProfileService.savePost(postId);
      toast({
        title: "Saved",
        description: "Reel saved successfully"
      });
    } catch (error) {
      console.error('Error saving reel:', error);
      throw error;
    }
  };

  // Handle view tracking
  const handleView = (postId: string) => {
    if (!user) return;
    
    trackAnalytics({
      reelId: postId,
      userId: user.id,
      position: currentIndex
    });
  };

  // Persist sound preference
  useEffect(() => {
    const savedSound = localStorage.getItem('reels_sound_enabled');
    if (savedSound !== null) {
      setSoundEnabled(savedSound === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('reels_sound_enabled', soundEnabled.toString());
    
    if (user) {
      trackAnalytics({
        reelId: reels[currentIndex]?.id || '',
        userId: user.id,
        soundEnabled: soundEnabled
      });
    }
  }, [soundEnabled]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white p-4">
        <p className="text-xl mb-2">No reels available</p>
        <p className="text-gray-400">Create a video post to see it here</p>
        <Button 
          onClick={() => navigate('/')}
          className="mt-4"
        >
          Go to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Exit button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 left-4 z-50 text-white hover:bg-white/20 rounded-full p-2"
        onClick={() => navigate('/')}
        aria-label="Exit reels"
      >
        <ArrowLeft className="w-6 h-6" />
      </Button>

      {/* Reels container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          scrollBehavior: 'smooth',
          scrollSnapType: 'y mandatory',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {reels.map((reel, index) => (
          <TikTokReelCard
            key={reel.id}
            post={reel}
            isActive={index === currentIndex}
            onLike={handleLike}
            onFollow={handleFollow}
            onComment={handleComment}
            onShare={handleShare}
            onSave={handleSave}
            onDownload={(postId) => {
              if (reel.videoUrl) {
                const link = document.createElement('a');
                link.href = reel.videoUrl;
                link.download = `reel_${postId}.mp4`;
                link.click();
              }
            }}
            onReport={(postId) => {
              toast({
                title: "Report submitted",
                description: "Thank you for reporting. We'll review this shortly."
              });
            }}
            soundEnabled={soundEnabled}
            onSoundToggle={() => setSoundEnabled(!soundEnabled)}
            onView={handleView}
            musicTitle={reel.music?.title}
            musicArtist={reel.music?.artist}
          />
        ))}
      </div>
    </div>
  );
};

export default Reels;
