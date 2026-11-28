
import React, { useEffect, useRef, useState, useCallback } from 'react';
import OptimizedReelPlayer from './OptimizedReelPlayer';
import MoreBottomSheet from './MoreBottomSheet';
import CommentsModal from './CommentsModal';
import { useToast } from '@/hooks/use-toast';
import { Post } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaOptimization } from '@/hooks/useMediaOptimization';
import { WifiOff, Heart, MessageCircle, Send, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
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
      if (parsed?.data?.length) {
        reelsStore.reels = parsed.data;
        reelsStore.lastFetchTime = parsed.timestamp || 0;
      }
    }
  } catch {}
  reelsStore.isInitialized = true;
})();

const saveReelsToLocalStorage = (reels: Post[]) => {
  try {
    localStorage.setItem(REELS_CACHE_KEY, JSON.stringify({ data: reels, timestamp: Date.now() }));
  } catch {}
};

type FeedTab = 'foryou' | 'following';

// Format large engagement counts
const formatReelCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

// Bottom nav height on mobile
const BOTTOM_NAV_HEIGHT = 64;

interface ReelsFeedProps {
  searchQuery?: string;
  /** Called when a search result tile is opened so the page can close search UI */
  onClearSearch?: () => void;
  /** Deep link: reel id to jump to on mount */
  initialReelId?: string;
}

export const ReelsFeed: React.FC<ReelsFeedProps> = ({ searchQuery = '', onClearSearch, initialReelId }) => {

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

  const tabPosts = activeTab === 'following'
    ? posts.filter(p => followedUsers.has(p.userId))
    : posts;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Every searchable field attached to a reel: caption, author, hashtags,
  // music metadata and generic video keywords. Users without reels never appear.
  const buildSearchIndex = (p: Post): string => {
    const any = p as any;
    const parts: (string | undefined)[] = [
      p.content,
      any.title,
      any.description,
      p.user?.name,
      (p.user as any)?.username,
      (p.user as any)?.bio,
      p.music?.title,
      (p.music as any)?.artist,
      p.mediaType,
      p.isReel || p.videoUrl ? 'reel video' : undefined,
      ...(Array.isArray(p.hashtags)
        ? p.hashtags.map((h: any) => (typeof h === 'string' ? h : h?.name || h?.hashtag?.name))
        : []),
      ...(Array.isArray(any.tags) ? any.tags.map((t: any) => (typeof t === 'string' ? t : t?.name)) : []),
    ];
    return parts.filter(Boolean).join(' ').toLowerCase();
  };

  const searchResults = normalizedQuery
    ? posts.filter(p => buildSearchIndex(p).includes(normalizedQuery))
    : [];


  const displayPosts = tabPosts;

  // Jump to a specific reel (deep link or a search result tile)
  const [jumpToId, setJumpToId] = useState<string | null>(initialReelId || null);
  useEffect(() => { if (initialReelId) setJumpToId(initialReelId); }, [initialReelId]);

  useEffect(() => {
    if (!jumpToId || !containerRef.current || displayPosts.length === 0) return;
    const index = displayPosts.findIndex(p => p.id === jumpToId);
    if (index < 0) return;
    const container = containerRef.current;
    requestAnimationFrame(() => {
      container.scrollTo({ top: index * container.clientHeight, behavior: 'auto' });
      setActiveIndex(index);
      setVisibleRange({ start: Math.max(0, index - 1), end: index + 3 });
      setJumpToId(null);
    });
  }, [jumpToId, displayPosts.length]);

  const openFromSearch = useCallback((id: string) => {
    setJumpToId(id);
    onClearSearch?.();
  }, [onClearSearch]);


  const handleLike = useCallback(async (id: string) => {
    if (!user) { toast({ title: 'Login required' }); return; }

    // Optimistic: flip instantly, roll back if the request fails.
    const wasLiked = !!likes[id];
    setLikes(prev => ({ ...prev, [id]: !wasLiked }));
    setPosts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const count = Array.isArray(p.likes) ? p.likes.length : ((p as any).likeCount || 0);
      const nextCount = Math.max(0, count + (wasLiked ? -1 : 1));
      return { ...p, likeCount: nextCount, isLiked: !wasLiked } as Post;
    }));

    try {
      await dataService.likePost(id);
      const likesData = await dataService.getLikes(id);
      const liked = likesData.some((l: any) => (l.user_id ?? l.userId) === user.id);
      setPosts(prev => prev.map(p => p.id === id
        ? ({ ...p, likes: likesData, likeCount: likesData.length, isLiked: liked } as Post)
        : p));
      setLikes(prev => ({ ...prev, [id]: liked }));
    } catch {
      setLikes(prev => ({ ...prev, [id]: wasLiked }));
      setPosts(prev => prev.map(p => {
        if (p.id !== id) return p;
        const count = (p as any).likeCount || 0;
        return { ...p, likeCount: Math.max(0, count + (wasLiked ? 1 : -1)), isLiked: wasLiked } as Post;
      }));
      toast({ title: 'Like failed', variant: 'destructive' });
    }
  }, [toast, user, likes]);


  const handleShare = useCallback(async (post: Post) => {
    const url = `${window.location.origin}/reels?reel=${post.id}`;
    const copyLink = async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
        } else {
          const ta = document.createElement('textarea');
          ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        }
        toast({ title: 'Link copied' });
      } catch { /* clipboard blocked — stay silent */ }
    };

    if (navigator.share) {
      try {
        await navigator.share({ title: post.content || 'Video', url });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // user dismissed the sheet
      }
    }
    await copyLink();
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

  // Search results grid — tap a tile to watch it fullscreen
  if (normalizedQuery) {
    return (
      <div className="w-full h-full bg-background overflow-y-auto">
        {searchResults.length === 0 ? (
          <div className="flex items-center justify-center h-full px-8">
            <p className="text-muted-foreground text-sm text-center">No reels found for "{searchQuery}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 p-2">
            {searchResults.map(p => (
              <button
                key={p.id}
                onClick={() => openFromSearch(p.id)}
                className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted transition-transform active:scale-95"
              >
                {p.videoUrl ? (
                  <video src={`${p.videoUrl}#t=0.1`} className="absolute inset-0 w-full h-full object-cover" muted playsInline preload="metadata" />
                ) : p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                ) : null}
                <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-[10px] font-semibold text-white truncate text-left">{p.user?.name || 'User'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (

    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Floating glass feed navigation */}
      <div className="reels-feed-tabs absolute top-0 left-0 right-0 z-50 pt-4 pb-7 flex justify-center pointer-events-none bg-gradient-to-b from-black/55 via-black/20 to-transparent">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/20 bg-black/35 p-1 shadow-xl backdrop-blur-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('foryou')}
            aria-pressed={activeTab === 'foryou'}
            className={`rounded-full px-5 py-2 text-sm font-bold transition-all duration-200 active:scale-95 ${
              activeTab === 'foryou'
                ? 'bg-white text-black shadow-md'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            For You
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('following')}
            aria-pressed={activeTab === 'following'}
            className={`rounded-full px-5 py-2 text-sm font-bold transition-all duration-200 active:scale-95 ${
              activeTab === 'following'
                ? 'bg-white text-black shadow-md'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            Following
          </button>
        </div>
      </div>


      {isDataSaverEnabled && (
        <div className="absolute top-16 left-0 right-0 z-50 bg-black/45 backdrop-blur-xl text-white text-center py-1.5 text-xs font-bold">
          Data Saver Mode
        </div>
      )}

      {isOffline && posts.length > 0 && (
        <div className="absolute top-16 left-0 right-0 z-50 bg-black/45 backdrop-blur-xl text-white text-center py-1.5 text-xs font-bold">
          <WifiOff className="w-3 h-3 inline-block mr-1" /> Offline
        </div>
      )}

      {displayPosts.length === 0 && !loading && (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground text-sm">
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

              {/* Video readability gradients */}
              <div className="absolute inset-x-0 bottom-0 z-10 h-[52%] bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-black/35 to-transparent pointer-events-none" />

              {/* Creator details and caption */}
              <div className="absolute left-4 right-[86px] bottom-7 z-30 text-white">
                <div className="mb-3 flex min-w-0 items-center gap-2.5">
                  <div className="shrink-0 rounded-full bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400 p-[2px]">
                    <Avatar className="h-10 w-10 border-2 border-black">
                      <AvatarImage src={postUser?.avatar || postUser?.photoURL} />
                      <AvatarFallback className="bg-zinc-800 text-xs font-bold text-white">
                        {postUser?.name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex min-w-0 items-center gap-1">
                    <span className="truncate text-sm font-extrabold text-white drop-shadow-md">
                      {postUser?.name || 'User'}
                    </span>
                    {isVerified && <VerifiedBadge className="h-4 w-4 shrink-0" />}
                  </div>

                  {!isOwnPost && (
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isFollowing) handleFollow(p.userId);
                      }}
                      whileTap={{ scale: 0.94 }}
                      className={`ml-1 shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                        isFollowing
                          ? 'border-white/30 bg-white/15 text-white backdrop-blur-md'
                          : 'border-white bg-white text-black hover:bg-white/90'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </motion.button>
                  )}
                </div>

                {p.content && (
                  <div className="max-w-full text-[13px] leading-relaxed text-white drop-shadow-md sm:text-sm">
                    <span>{descText}</span>
                    {isDescLong && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedDesc(prev => ({ ...prev, [p.id]: !prev[p.id] }));
                        }}
                        className="ml-1 font-bold text-white/75 hover:text-white"
                      >
                        {isExpanded ? 'less' : 'more'}
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
                  <span>WizChat Reels</span>
                  <span className="h-1 w-1 rounded-full bg-white/60" />
                  <span className="normal-case tracking-normal">Watch and discover</span>
                </div>
              </div>

              {/* Floating glass action rail */}
              <div className="absolute bottom-24 right-3 z-30 flex flex-col items-center gap-4 sm:right-5">
                <div className="flex flex-col items-center gap-1.5">
                  <motion.button
                    type="button"
                    aria-label={(likes[p.id] ?? !!(p as any).isLiked) ? 'Unlike reel' : 'Like reel'}
                    aria-pressed={likes[p.id] ?? !!(p as any).isLiked}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(p.id);
                    }}
                    whileTap={{ scale: 0.84 }}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white shadow-lg backdrop-blur-xl transition-colors hover:bg-white/20"
                  >
                    <motion.span
                      animate={(likes[p.id] ?? !!(p as any).isLiked) ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                      transition={{ duration: 0.35 }}
                    >
                      <Heart
                        className={`h-6 w-6 ${
                          (likes[p.id] ?? !!(p as any).isLiked)
                            ? 'fill-rose-500 text-rose-500'
                            : 'text-white'
                        }`}
                        strokeWidth={2.2}
                      />
                    </motion.span>
                  </motion.button>
                  <span className="rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-bold leading-none text-white backdrop-blur-sm">
                    {formatReelCount(typeof (p as any).likeCount === 'number' ? (p as any).likeCount : (Array.isArray(p.likes) ? p.likes.length : 0))}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <motion.button
                    type="button"
                    aria-label="View comments"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCommentsOpenFor(p.id);
                    }}
                    whileTap={{ scale: 0.88 }}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white shadow-lg backdrop-blur-xl transition-colors hover:bg-white/20"
                  >
                    <MessageCircle className="h-6 w-6" strokeWidth={2.2} />
                  </motion.button>
                  <span className="rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-bold leading-none text-white backdrop-blur-sm">
                    {formatReelCount(Array.isArray((p as any).comments) ? (p as any).comments.length : ((p as any).commentCount || 0))}
                  </span>
                </div>

                <motion.button
                  type="button"
                  aria-label="Share reel"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(p);
                  }}
                  whileTap={{ scale: 0.88 }}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white shadow-lg backdrop-blur-xl transition-colors hover:bg-white/20"
                >
                  <Send className="h-6 w-6" strokeWidth={2.2} />
                </motion.button>

                <motion.button
                  type="button"
                  aria-label="More reel options"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMore(p);
                  }}
                  whileTap={{ scale: 0.88 }}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white shadow-lg backdrop-blur-xl transition-colors hover:bg-white/20"
                >
                  <MoreHorizontal className="h-6 w-6" strokeWidth={2.2} />
                </motion.button>
              </div>
            </div>
          );
        })}
      </div>

      {commentsOpenFor && (
        <CommentsModal
          reelId={commentsOpenFor}
          open={!!commentsOpenFor}
          onClose={() => setCommentsOpenFor(null)}
          onCountChange={(count) => {
            setPosts(prev => prev.map(p => p.id === commentsOpenFor
              ? ({ ...p, comments: new Array(count).fill(null) } as any)
              : p));
          }}
        />

      )}

      {sheetOpen && sheetPost && (
        <MoreBottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSave={handleSave} onDownload={handleDownload} onReport={handleReport} />
      )}
    </div>
  );
};

export default ReelsFeed;
