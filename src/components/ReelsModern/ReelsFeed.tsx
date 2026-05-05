import React, { useEffect, useRef, useState, useCallback } from 'react';
import OptimizedReelPlayer from './OptimizedReelPlayer';
import ReelControls from './ReelControls';
import MoreBottomSheet from './MoreBottomSheet';
import CommentsModal from './CommentsModal';
import { useToast } from '@/hooks/use-toast';
import { Post } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaOptimization } from '@/hooks/useMediaOptimization';
import { WifiOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import { supabase } from '@/integrations/supabase/client';

const REELS_CACHE_KEY = 'wizchat_reels_cache';
const REELS_MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

interface ReelsStore {
  reels: Post[];
  lastFetchTime: number;
  isInitialized: boolean;
}

const reelsStore: ReelsStore = { reels: [], lastFetchTime: 0, isInitialized: false };

(() => {
  if (reelsStore.isInitialized) return;
  try {
    const cached = localStorage.getItem(REELS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.data?.length) { reelsStore.reels = parsed.data; reelsStore.lastFetchTime = parsed.timestamp || 0; }
    }
  } catch {}
  reelsStore.isInitialized = true;
})();

const saveReelsToLocalStorage = (reels: Post[]) => {
  try { localStorage.setItem(REELS_CACHE_KEY, JSON.stringify({ data: reels, timestamp: Date.now() })); } catch {}
};

type FeedTab = 'foryou' | 'following';

// Bottom nav height on mobile
const BOTTOM_NAV_HEIGHT = 64;

export const ReelsFeed: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const obsRef = useRef<IntersectionObserver | null>(null);
  const hasLoadedRef = useRef(false);
  const hasCachedReels = reelsStore.reels.length > 0;

  const [posts, setPosts] = useState<Post[]>(reelsStore.reels);
  const [loading, setLoading] = useState(!hasCachedReels);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({});
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<FeedTab>('foryou');

  const { toast } = useToast();
  const { user } = useAuth();
  const { isDataSaverEnabled } = useMediaOptimization();

  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 5 });

  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); if (hasLoadedRef.current) loadReels(true); };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
      if (data) setFollowedUsers(new Set(data.map(f => f.following_id)));
    })();
  }, [user?.id]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    const isCacheStale = (Date.now() - reelsStore.lastFetchTime) > REELS_MIN_REFRESH_INTERVAL_MS;
    if (hasCachedReels && !isCacheStale) { setLoading(false); return; }
    loadReels(hasCachedReels);
  }, [hasCachedReels]);

  const loadReels = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const all = await dataService.getPosts();
      const reels = (all || []).filter(p => p.videoUrl || p.isReel || p.mediaType === 'video');
      setPosts(reels);
      reelsStore.reels = reels;
      reelsStore.lastFetchTime = Date.now();
      saveReelsToLocalStorage(reels);
    } catch {
      if (reelsStore.reels.length === 0) toast({ title: 'Failed to load reels', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (posts.length > 0) { reelsStore.reels = posts; saveReelsToLocalStorage(posts); }
  }, [posts]);

  useEffect(() => {
    setLikes(() => {
      const map: Record<string, boolean> = {};
      posts.forEach(p => { if ((p as any).isLiked) map[p.id] = true; });
      return map;
    });
  }, [posts]);

  const displayPosts = activeTab === 'following'
    ? posts.filter(p => followedUsers.has(p.userId))
    : posts;

  const handleLike = useCallback(async (id: string) => {
    if (!user) { toast({ title: 'Login required' }); return; }
    try {
      await dataService.likePost(id);
      const likesData = await dataService.getLikes(id);
      setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: likesData, likeCount: likesData.length, isLiked: likesData.some((l: any) => l.userId === user.id) } : p));
      setLikes(prev => ({ ...prev, [id]: !prev[id] }));
    } catch { toast({ title: 'Like failed', variant: 'destructive' }); }
  }, [toast, user]);

  const handleShare = useCallback(async (post: Post) => {
    try {
      if (navigator.share) await navigator.share({ title: post.content || 'Video', url: `${window.location.origin}/reels?reel=${post.id}` });
      else { await navigator.clipboard.writeText(`${window.location.origin}/reels?reel=${post.id}`); toast({ title: 'Link copied' }); }
    } catch {}
  }, [toast]);

  const handleFollow = useCallback(async (userId: string) => {
    if (!user) { toast({ title: 'Login required' }); return; }
    if (userId === user.id) return;
    try {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: userId });
      setFollowedUsers(prev => new Set(prev).add(userId));
      toast({ title: 'Followed!' });
    } catch { toast({ title: 'Already following', variant: 'destructive' }); }
  }, [user, toast]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPost, setSheetPost] = useState<Post | null>(null);

  const handleMore = useCallback((post: Post) => { setSheetPost(post); setSheetOpen(true); }, []);

  const handleSave = useCallback(() => {
    if (!sheetPost) return;
    const saved = JSON.parse(localStorage.getItem('saved_reels') || '[]');
    if (!saved.includes(sheetPost.id)) { saved.push(sheetPost.id); localStorage.setItem('saved_reels', JSON.stringify(saved)); toast({ title: 'Saved' }); }
    else toast({ title: 'Already saved' });
    setSheetOpen(false);
  }, [sheetPost, toast]);

  const handleDownload = useCallback(() => {
    if (!sheetPost) return;
    if (sheetPost.videoUrl) { const a = document.createElement('a'); a.href = sheetPost.videoUrl; a.download = `reel_${sheetPost.id}.mp4`; a.click(); toast({ title: 'Download started' }); }
    else toast({ title: 'No video' });
    setSheetOpen(false);
  }, [sheetPost, toast]);

  const handleReport = useCallback(() => {
    if (!sheetPost) return;
    const reports = JSON.parse(localStorage.getItem('reported_reels') || '[]');
    reports.push({ id: sheetPost.id, at: Date.now() }); localStorage.setItem('reported_reels', JSON.stringify(reports));
    toast({ title: 'Reported' }); setSheetOpen(false);
  }, [sheetPost, toast]);

  // Intersection Observer for active reel
  useEffect(() => {
    if (!containerRef.current) return;
    obsRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const index = Number((entry.target as HTMLElement).dataset.index);
        if (entry.isIntersecting) {
          setActiveIndex(index);
          setVisibleRange({ start: Math.max(0, index - 1), end: Math.min(displayPosts.length, index + 3) });
        }
      });
    }, { root: containerRef.current, threshold: [0.6] });
    const els = containerRef.current.querySelectorAll('.reel-item');
    els.forEach(el => obsRef.current?.observe(el));
    return () => { obsRef.current?.disconnect(); };
  }, [displayPosts]);

  const visiblePosts = displayPosts.map((p, i) => ({ ...p, shouldRender: i >= visibleRange.start && i <= visibleRange.end }));

  const DESC_MAX_LENGTH = 80;

  if (loading && posts.length === 0) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (isOffline && posts.length === 0) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-center p-8">
          <WifiOff className="w-12 h-12 text-white/50 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">You're offline</h3>
          <p className="text-white/60 text-sm">Connect to load reels</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* For You / Following tabs - sticky at top */}
      <div className="absolute top-0 left-0 right-0 z-50 pt-3 pb-2 flex justify-center gap-6" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
        <button
          onClick={() => setActiveTab('foryou')}
          className={`text-base font-bold transition-all pb-1 ${activeTab === 'foryou' ? 'text-white border-b-2 border-white' : 'text-white/50'}`}
        >
          For You
        </button>
        <button
          onClick={() => setActiveTab('following')}
          className={`text-base font-bold transition-all pb-1 ${activeTab === 'following' ? 'text-white border-b-2 border-white' : 'text-white/50'}`}
        >
          Following
        </button>
      </div>

      {isDataSaverEnabled && (
        <div className="absolute top-12 left-0 right-0 z-50 bg-yellow-500/90 text-black text-center py-1 text-xs font-bold">
          Data Saver Mode
        </div>
      )}

      {isOffline && posts.length > 0 && (
        <div className="absolute top-12 left-0 right-0 z-50 bg-white/10 backdrop-blur-xl text-white text-center py-1.5 text-xs font-bold">
          <WifiOff className="w-3 h-3 inline-block mr-1" /> Offline
        </div>
      )}

      {displayPosts.length === 0 && !loading && (
        <div className="flex items-center justify-center h-full">
          <p className="text-white/60 text-sm">
            {activeTab === 'following' ? 'No reels from people you follow yet' : 'No reels yet'}
          </p>
        </div>
      )}

      <div ref={containerRef} className="h-full w-full overflow-y-auto snap-y snap-mandatory touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
        {visiblePosts.map((p, i) => {
          const isDescLong = (p.content || '').length > DESC_MAX_LENGTH;
          const isExpanded = expandedDesc[p.id];
          const descText = isDescLong && !isExpanded ? p.content?.slice(0, DESC_MAX_LENGTH) + '...' : p.content;
          const postUser = p.user;
          const isVerified = !!(postUser as any)?.is_verified;
          const isFollowing = followedUsers.has(p.userId);
          const isOwnPost = p.userId === user?.id;

          return (
            <div key={p.id} data-index={i} className="reel-item snap-start w-full relative" style={{ height: '100%' }}>
              {p.shouldRender ? (
                <OptimizedReelPlayer src={p.videoUrl} isActive={i === activeIndex} poster={(p as any).thumbnail || p.imageUrl} />
              ) : (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse" />
                </div>
              )}

              {/* Bottom gradient for text readability */}
              <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none z-10" />

              {/* User info + description */}
              <div className="absolute left-4 bottom-6 z-30 max-w-[65%]">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-9 h-9 border-2 border-white/40">
                    <AvatarImage src={postUser?.avatar || postUser?.photoURL} />
                    <AvatarFallback className="text-white bg-white/20 text-xs font-bold">
                      {postUser?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1">
                    <span className="text-white font-bold text-sm drop-shadow">{postUser?.name}</span>
                    {isVerified && <VerifiedBadge className="w-4 h-4" />}
                  </div>
                  {!isOwnPost && !isFollowing && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFollow(p.userId); }}
                      className="ml-1 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-semibold hover:bg-white/30 transition-colors"
                    >
                      Follow
                    </button>
                  )}
                </div>

                {p.content && (
                  <div className="text-white text-sm leading-snug drop-shadow">
                    <span>{descText}</span>
                    {isDescLong && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedDesc(prev => ({ ...prev, [p.id]: !prev[p.id] })); }}
                        className="ml-1 text-white/70 font-semibold text-xs"
                      >
                        {isExpanded ? 'less' : 'more'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Controls */}
              <ReelControls
                likesCount={Array.isArray(p.likes) ? p.likes.length : ((p as any).likeCount || 0)}
                commentsCount={(p as any).commentCount || 0}
                isLiked={!!(p as any).isLiked || !!likes[p.id]}
                onLike={() => handleLike(p.id)}
                onComment={() => setCommentsOpenFor(p.id)}
                onShare={() => handleShare(p)}
                onMore={() => handleMore(p)}
              />
            </div>
          );
        })}
      </div>

      {commentsOpenFor && (
        <CommentsModal reelId={commentsOpenFor} open={!!commentsOpenFor} onClose={() => setCommentsOpenFor(null)} />
      )}

      {sheetOpen && sheetPost && (
        <MoreBottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSave={handleSave} onDownload={handleDownload} onReport={handleReport} />
      )}
    </div>
  );
};

export default ReelsFeed;
