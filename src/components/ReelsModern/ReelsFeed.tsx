import React, { useEffect, useRef, useState, useCallback } from 'react';
import OptimizedReelPlayer from './OptimizedReelPlayer';
import ReelControls from './ReelControls';
import MoreBottomSheet from './MoreBottomSheet';
import CommentsModal from './CommentsModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { Post } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaOptimization } from '@/hooks/useMediaOptimization';
import { WifiOff } from 'lucide-react';

// =============================================
// PERSISTENT MODULE-LEVEL STORE (survives all remounts)
// =============================================
const REELS_CACHE_KEY = 'wizchat_reels_cache';
const REELS_MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface ReelsStore {
  reels: Post[];
  lastFetchTime: number;
  isInitialized: boolean;
}

const reelsStore: ReelsStore = {
  reels: [],
  lastFetchTime: 0,
  isInitialized: false,
};

// SYNCHRONOUS initialization from localStorage on module load
(() => {
  if (reelsStore.isInitialized) return;
  
  try {
    const cached = localStorage.getItem(REELS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
        reelsStore.reels = parsed.data;
        reelsStore.lastFetchTime = parsed.timestamp || 0;
        console.debug('[Reels] INSTANT hydration from localStorage:', parsed.data.length, 'reels');
      }
    }
  } catch (e) {
    console.debug('[Reels] localStorage parse failed:', e);
  }
  reelsStore.isInitialized = true;
})();

const saveReelsToLocalStorage = (reels: Post[]) => {
  try {
    localStorage.setItem(REELS_CACHE_KEY, JSON.stringify({
      data: reels,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.debug('[Reels] Failed to save to localStorage:', e);
  }
};

export const ReelsFeed: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const obsRef = useRef<IntersectionObserver | null>(null);
  const hasLoadedRef = useRef(false);
  
  // INSTANT display from module store
  const hasCachedReels = reelsStore.reels.length > 0;
  
  const [posts, setPosts] = useState<Post[]>(reelsStore.reels);
  const [loading, setLoading] = useState(!hasCachedReels);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const { isDarkMode } = useTheme();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isDataSaverEnabled, networkInfo } = useMediaOptimization();
  
  // Only load 5 reels at a time to save data
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 5 });

  // Network status listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Silent refresh when coming back online
      if (hasLoadedRef.current) {
        loadReels(true);
      }
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch reels with caching
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const now = Date.now();
    const timeSinceLastFetch = now - reelsStore.lastFetchTime;
    const isCacheStale = timeSinceLastFetch > REELS_MIN_REFRESH_INTERVAL_MS;
    
    if (hasCachedReels && !isCacheStale) {
      console.debug('[Reels] Cache fresh, skipping network fetch');
      setLoading(false);
      return;
    }

    // Background refresh if we have cached data
    loadReels(hasCachedReels);
  }, [hasCachedReels]);

  const loadReels = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      
      const all = await dataService.getPosts();
      const reels = (all || []).filter(p => p.videoUrl || p.isReel || p.mediaType === 'video');
      
      setPosts(reels);
      reelsStore.reels = reels;
      reelsStore.lastFetchTime = Date.now();
      saveReelsToLocalStorage(reels);
      
      console.debug(`[Reels] Loaded ${reels.length} reels. Data saver: ${isDataSaverEnabled}, Network: ${networkInfo.type}`);
    } catch (err) {
      console.error('Failed to load reels', err);
      if (reelsStore.reels.length === 0) {
        toast({ title: 'Failed to load reels', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Sync posts to store
  useEffect(() => {
    if (posts.length > 0) {
      reelsStore.reels = posts;
      saveReelsToLocalStorage(posts);
    }
  }, [posts]);

  useEffect(() => {
    // Initialize likes from loaded posts' isLiked flag
    setLikes(() => {
      const map: Record<string, boolean> = {};
      posts.forEach(p => { if ((p as any).isLiked) map[p.id] = true; });
      return map;
    });
  }, [posts]);

  const handleLike = useCallback(async (id: string) => {
    try {
      if (!user) {
        toast({ title: 'Login required', description: 'Please sign in to like videos' });
        return;
      }

      await dataService.likePost(id);

      // Refresh likes for this post
      const likesData = await dataService.getLikes(id);
      setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: likesData, likeCount: likesData.length, isLiked: likesData.some((l: any) => l.userId === user.id) } : p));

      setLikes(prev => ({ ...prev, [id]: !prev[id] }));
    } catch (err) {
      console.error('Like failed', err);
      toast({ title: 'Like failed', variant: 'destructive' });
    }
  }, [toast, user]);

  const handleShare = useCallback(async (post: Post) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: post.content || 'Video', url: `${window.location.origin}/reels?reel=${post.id}` });
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/reels?reel=${post.id}`);
        toast({ title: 'Link copied to clipboard' });
      }
    } catch (err) { console.error('Share failed', err); }
  }, [toast]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPost, setSheetPost] = useState<Post | null>(null);

  const handleMore = useCallback((post: Post) => {
    setSheetPost(post);
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!sheetPost) return;
    const saved = JSON.parse(localStorage.getItem('saved_reels') || '[]');
    if (!saved.includes(sheetPost.id)) {
      saved.push(sheetPost.id);
      localStorage.setItem('saved_reels', JSON.stringify(saved));
      toast({ title: 'Saved' });
    } else {
      toast({ title: 'Already saved' });
    }
    setSheetOpen(false);
  }, [sheetPost, toast]);

  const handleDownload = useCallback(() => {
    if (!sheetPost) return;
    if (sheetPost.videoUrl) {
      const a = document.createElement('a');
      a.href = sheetPost.videoUrl;
      a.download = `reel_${sheetPost.id}.mp4`;
      a.click();
      toast({ title: 'Download started' });
    } else {
      toast({ title: 'No video', description: 'This reel has no downloadable video.' });
    }
    setSheetOpen(false);
  }, [sheetPost, toast]);

  const handleReport = useCallback(() => {
    if (!sheetPost) return;
    const reports = JSON.parse(localStorage.getItem('reported_reels') || '[]');
    reports.push({ id: sheetPost.id, at: Date.now() });
    localStorage.setItem('reported_reels', JSON.stringify(reports));
    toast({ title: 'Reported', description: 'We will review this content.' });
    setSheetOpen(false);
  }, [sheetPost, toast]);

  // Intersection observer with optimized lazy loading
  useEffect(() => {
    if (!containerRef.current) return;
    
    const options = { root: containerRef.current, threshold: [0.6] };
    obsRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const index = Number((entry.target as HTMLElement).dataset.index);
        if (entry.isIntersecting) {
          setActiveIndex(index);
          
          // Update visible range to only load nearby reels (saves data)
          setVisibleRange({
            start: Math.max(0, index - 1),
            end: Math.min(posts.length, index + 3)
          });
        }
      });
    }, options);

    const els = containerRef.current.querySelectorAll('.reel-item');
    els.forEach(el => obsRef.current?.observe(el));

    return () => { obsRef.current?.disconnect(); };
  }, [posts]);

  // Get only the reels we should render (for memory optimization)
  const visiblePosts = posts.map((p, i) => ({
    ...p,
    shouldRender: i >= visibleRange.start && i <= visibleRange.end
  }));

  // Loading skeleton
  if (loading && posts.length === 0) {
    return (
      <div className={`fixed inset-0 ${isDarkMode ? 'bg-black' : 'bg-white'} flex items-center justify-center`}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted" />
          <div className="w-32 h-4 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Offline with no cached reels
  if (isOffline && posts.length === 0) {
    return (
      <div className={`fixed inset-0 ${isDarkMode ? 'bg-black' : 'bg-white'} flex items-center justify-center`}>
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/20 backdrop-blur-xl flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">You're offline</h3>
          <p className="text-muted-foreground text-sm">
            Connect to the internet to load reels
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      {/* Data saver banner */}
      {isDataSaverEnabled && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-yellow-500/90 text-black text-center py-1 text-sm font-medium">
          Data Saver Mode - Tap videos to play
        </div>
      )}
      
      {/* Offline indicator */}
      {isOffline && posts.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-muted/80 backdrop-blur-xl text-foreground text-center py-2 text-sm">
          <WifiOff className="w-4 h-4 inline-block mr-2" />
          Offline - Showing cached reels
        </div>
      )}
      
      <div ref={containerRef} className="h-full w-full overflow-y-auto snap-y snap-mandatory touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
        {visiblePosts.map((p, i) => (
          <div key={p.id} data-index={i} className="reel-item snap-start w-full h-screen relative">
            {/* Only render video component for visible range to save memory */}
            {p.shouldRender ? (
              <OptimizedReelPlayer 
                src={p.videoUrl} 
                isActive={i === activeIndex} 
                poster={(p as any).thumbnail || p.imageUrl}
              />
            ) : (
              // Placeholder for non-visible reels
              <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gray-800 animate-pulse" />
              </div>
            )}

            <div className="absolute left-4 bottom-8 text-white z-40 max-w-[60%]">
              <div className="font-semibold text-lg">{p.user?.name}</div>
              <div className="text-sm mt-1 line-clamp-3">{p.content}</div>
            </div>

            <ReelControls
              likesCount={Array.isArray(p.likes) ? p.likes.length : ((p as any).likeCount || 0)}
              isLiked={!!(p as any).isLiked || !!likes[p.id]}
              onLike={() => handleLike(p.id)}
              onComment={() => setCommentsOpenFor(p.id)}
              onShare={() => handleShare(p)}
              onMore={() => handleMore(p)}
            />
          </div>
        ))}
      </div>

      {commentsOpenFor && (
        <CommentsModal reelId={commentsOpenFor} open={!!commentsOpenFor} onClose={() => setCommentsOpenFor(null)} />
      )}
      
      {sheetOpen && sheetPost && (
        <MoreBottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSave={handleSave}
          onDownload={handleDownload}
          onReport={handleReport}
        />
      )}
    </div>
  );
};

export default ReelsFeed;
