import React, { useEffect, useRef, useState, useCallback } from 'react';
import OptimizedReelPlayer from './OptimizedReelPlayer';
import MoreBottomSheet from './MoreBottomSheet';
import CommentsModal from './CommentsModal';
import { useToast } from '@/hooks/use-toast';
import { Post } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaOptimization } from '@/hooks/useMediaOptimization';
import {
  WifiOff,
  Heart,
  MessageCircle,
  Send,
  Repeat2,
  Phone,
} from 'lucide-react';
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

const reelsStore: ReelsStore = {
  reels: [],
  lastFetchTime: 0,
  isInitialized: false,
};

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
    localStorage.setItem(
      REELS_CACHE_KEY,
      JSON.stringify({
        data: reels,
        timestamp: Date.now(),
      })
    );
  } catch {}
};

type FeedTab = 'foryou' | 'following';

const formatReelCount = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return String(value);
};

interface ReelsFeedProps {
  searchQuery?: string;
  onClearSearch?: () => void;
  initialReelId?: string;
}

export const ReelsFeed: React.FC<ReelsFeedProps> = ({
  searchQuery = '',
  onClearSearch,
  initialReelId,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const obsRef = useRef<IntersectionObserver | null>(null);
  const hasLoadedRef = useRef(false);

  const hasCachedReels = reelsStore.reels.length > 0;

  const [posts, setPosts] = useState<Post[]>(reelsStore.reels);
  const [loading, setLoading] = useState(!hasCachedReels);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [reposted, setReposted] = useState<Record<string, boolean>>({});
  const [repostCounts, setRepostCounts] = useState<Record<string, number>>({});
  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({});
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<FeedTab>('foryou');

  const { toast } = useToast();
  const { user } = useAuth();
  const { isDataSaverEnabled } = useMediaOptimization();

  const [visibleRange, setVisibleRange] = useState({
    start: 0,
    end: 5,
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);

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

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (data) {
        setFollowedUsers(new Set(data.map(f => f.following_id)));
      }
    })();
  }, [user?.id]);

  // Load persisted repost counts and the current user's repost state.
  useEffect(() => {
    if (posts.length === 0) {
      setReposted({});
      setRepostCounts({});
      return;
    }

    let cancelled = false;
    const postIds = posts.map(post => post.id);

    (async () => {
      const { data, error } = await (supabase as any)
        .from('reel_reposts')
        .select('post_id, user_id')
        .in('post_id', postIds);

      if (cancelled || error || !data) return;

      const counts: Record<string, number> = {};
      const mine: Record<string, boolean> = {};

      data.forEach((row: { post_id: string; user_id: string }) => {
        counts[row.post_id] = (counts[row.post_id] || 0) + 1;

        if (user?.id && row.user_id === user.id) {
          mine[row.post_id] = true;
        }
      });

      setRepostCounts(counts);
      setReposted(mine);
    })();

    return () => {
      cancelled = true;
    };
  }, [posts.map(post => post.id).join(','), user?.id]);

  useEffect(() => {
    if (hasLoadedRef.current) return;

    hasLoadedRef.current = true;

    const isCacheStale =
      Date.now() - reelsStore.lastFetchTime >
      REELS_MIN_REFRESH_INTERVAL_MS;

    if (hasCachedReels && !isCacheStale) {
      setLoading(false);
      return;
    }

    loadReels(hasCachedReels);
  }, [hasCachedReels]);

  const loadReels = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const all = await dataService.getPosts();

      const reels = (all || []).filter(
        p => p.videoUrl || p.isReel || p.mediaType === 'video'
      );

      setPosts(reels);

      reelsStore.reels = reels;
      reelsStore.lastFetchTime = Date.now();

      saveReelsToLocalStorage(reels);
    } catch {
      if (reelsStore.reels.length === 0) {
        toast({
          title: 'Failed to load reels',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (posts.length > 0) {
      reelsStore.reels = posts;
      saveReelsToLocalStorage(posts);
    }
  }, [posts]);

  useEffect(() => {
    setLikes(() => {
      const map: Record<string, boolean> = {};

      posts.forEach(p => {
        if ((p as any).isLiked) {
          map[p.id] = true;
        }
      });

      return map;
    });
  }, [posts]);

  const tabPosts =
    activeTab === 'following'
      ? posts.filter(p => followedUsers.has(p.userId))
      : posts;

  const normalizedQuery = searchQuery.trim().toLowerCase();

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
        ? p.hashtags.map((h: any) =>
            typeof h === 'string'
              ? h
              : h?.name || h?.hashtag?.name
          )
        : []),
      ...(Array.isArray(any.tags)
        ? any.tags.map((t: any) =>
            typeof t === 'string' ? t : t?.name
          )
        : []),
    ];

    return parts.filter(Boolean).join(' ').toLowerCase();
  };

  const searchResults = normalizedQuery
    ? posts.filter(p => buildSearchIndex(p).includes(normalizedQuery))
    : [];

  const displayPosts = tabPosts;

  const [jumpToId, setJumpToId] = useState<string | null>(
    initialReelId || null
  );

  useEffect(() => {
    if (initialReelId) {
      setJumpToId(initialReelId);
    }
  }, [initialReelId]);

  useEffect(() => {
    if (!jumpToId || !containerRef.current || displayPosts.length === 0) {
      return;
    }

    const index = displayPosts.findIndex(p => p.id === jumpToId);

    if (index < 0) return;

    const container = containerRef.current;

    requestAnimationFrame(() => {
      container.scrollTo({
        top: index * container.clientHeight,
        behavior: 'auto',
      });

      setActiveIndex(index);

      setVisibleRange({
        start: Math.max(0, index - 1),
        end: index + 3,
      });

      setJumpToId(null);
    });
  }, [jumpToId, displayPosts.length]);

  const openFromSearch = useCallback(
    (id: string) => {
      setJumpToId(id);
      onClearSearch?.();
    },
    [onClearSearch]
  );

  // Like and unlike.
  const handleLike = useCallback(
    async (id: string) => {
      if (!user) {
        toast({ title: 'Login required' });
        return;
      }

      const wasLiked = !!likes[id];

      setLikes(prev => ({
        ...prev,
        [id]: !wasLiked,
      }));

      setPosts(prev =>
        prev.map(p => {
          if (p.id !== id) return p;

          const count = Array.isArray(p.likes)
            ? p.likes.length
            : (p as any).likeCount || 0;

          const nextCount = Math.max(
            0,
            count + (wasLiked ? -1 : 1)
          );

          return {
            ...p,
            likeCount: nextCount,
            isLiked: !wasLiked,
          } as Post;
        })
      );

      try {
        await dataService.likePost(id);

        const likesData = await dataService.getLikes(id);

        const liked = likesData.some(
          (l: any) => (l.user_id ?? l.userId) === user.id
        );

        setPosts(prev =>
          prev.map(p =>
            p.id === id
              ? ({
                  ...p,
                  likes: likesData,
                  likeCount: likesData.length,
                  isLiked: liked,
                } as Post)
              : p
          )
        );

        setLikes(prev => ({
          ...prev,
          [id]: liked,
        }));
      } catch {
        setLikes(prev => ({
          ...prev,
          [id]: wasLiked,
        }));

        setPosts(prev =>
          prev.map(p => {
            if (p.id !== id) return p;

            const count = (p as any).likeCount || 0;

            return {
              ...p,
              likeCount: Math.max(
                0,
                count + (wasLiked ? 1 : -1)
              ),
              isLiked: wasLiked,
            } as Post;
          })
        );

        toast({
          title: 'Like failed',
          variant: 'destructive',
        });
      }
    },
    [toast, user, likes]
  );

  // Repost and undo repost. The database keeps one record per user and reel.
  const handleRepost = useCallback(
    async (postId: string) => {
      if (!user) {
        toast({ title: 'Login required' });
        return;
      }

      const wasReposted = !!reposted[postId];

      setReposted(prev => ({
        ...prev,
        [postId]: !wasReposted,
      }));

      setRepostCounts(prev => ({
        ...prev,
        [postId]: Math.max(
          0,
          (prev[postId] || 0) + (wasReposted ? -1 : 1)
        ),
      }));

      try {
        if (wasReposted) {
          const { error } = await (supabase as any)
            .from('reel_reposts')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id);

          if (error) throw error;

          toast({ title: 'Repost removed' });
        } else {
          const { error } = await (supabase as any)
            .from('reel_reposts')
            .insert({
              post_id: postId,
              user_id: user.id,
            });

          if (error) throw error;

          toast({ title: 'Reposted' });
        }
      } catch {
        setReposted(prev => ({
          ...prev,
          [postId]: wasReposted,
        }));

        setRepostCounts(prev => ({
          ...prev,
          [postId]: Math.max(
            0,
            (prev[postId] || 0) + (wasReposted ? 1 : -1)
          ),
        }));

        toast({
          title: 'Could not update repost',
          description: 'Please try again.',
          variant: 'destructive',
        });
      }
    },
    [user, reposted, toast]
  );

  // Open WhatsApp with the current reel's deep link.
  const handleWhatsAppShare = useCallback((post: Post) => {
    const url = `${window.location.origin}/reels?reel=${encodeURIComponent(
      post.id
    )}`;

    const message = `${
      post.content ? `${post.content}\n\n` : ''
    }Watch this reel on WizChat: ${url}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
      message
    )}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }, []);

  // Existing native share functionality.
  const handleShare = useCallback(
    async (post: Post) => {
      const url = `${window.location.origin}/reels?reel=${post.id}`;

      const copyLink = async () => {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
          } else {
            const ta = document.createElement('textarea');

            ta.value = url;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';

            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
          }

          toast({ title: 'Link copied' });
        } catch {
          // Clipboard blocked.
        }
      };

      if (navigator.share) {
        try {
          await navigator.share({
            title: post.content || 'Video',
            url,
          });

          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
        }
      }

      await copyLink();
    },
    [toast]
  );

  const handleFollow = useCallback(
    async (userId: string) => {
      if (!user) {
        toast({ title: 'Login required' });
        return;
      }

      if (userId === user.id) return;

      try {
        const { error } = await supabase.from('follows').insert({
          follower_id: user.id,
          following_id: userId,
        });

        if (error) throw error;

        setFollowedUsers(prev => new Set(prev).add(userId));

        toast({ title: 'Followed!' });
      } catch {
        toast({
          title: 'Already following',
          variant: 'destructive',
        });
      }
    },
    [user, toast]
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPost, setSheetPost] = useState<Post | null>(null);

  const handleMore = useCallback((post: Post) => {
    setSheetPost(post);
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!sheetPost) return;

    const saved = JSON.parse(
      localStorage.getItem('saved_reels') || '[]'
    );

    if (!saved.includes(sheetPost.id)) {
      saved.push(sheetPost.id);

      localStorage.setItem(
        'saved_reels',
        JSON.stringify(saved)
      );

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
      toast({ title: 'No video' });
    }

    setSheetOpen(false);
  }, [sheetPost, toast]);

  const handleReport = useCallback(() => {
    if (!sheetPost) return;

    const reports = JSON.parse(
      localStorage.getItem('reported_reels') || '[]'
    );

    reports.push({
      id: sheetPost.id,
      at: Date.now(),
    });

    localStorage.setItem(
      'reported_reels',
      JSON.stringify(reports)
    );

    toast({ title: 'Reported' });
    setSheetOpen(false);
  }, [sheetPost, toast]);

  // Intersection Observer for active reel.
  useEffect(() => {
    if (!containerRef.current) return;

    obsRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const index = Number(
            (entry.target as HTMLElement).dataset.index
          );

          if (entry.isIntersecting) {
            setActiveIndex(index);

            setVisibleRange({
              start: Math.max(0, index - 1),
              end: Math.min(displayPosts.length, index + 3),
            });
          }
        });
      },
      {
        root: containerRef.current,
        threshold: [0.6],
      }
    );

    const els =
      containerRef.current.querySelectorAll('.reel-item');

    els.forEach(el => obsRef.current?.observe(el));

    return () => {
      obsRef.current?.disconnect();
    };
  }, [displayPosts]);

  const visiblePosts = displayPosts.map((p, i) => ({
    ...p,
    shouldRender:
      i >= visibleRange.start && i <= visibleRange.end,
  }));

  const DESC_MAX_LENGTH = 80;

  if (loading && posts.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  if (isOffline && posts.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <div className="p-8 text-center">
          <WifiOff className="mx-auto mb-4 h-12 w-12 text-white/50" />

          <h3 className="mb-2 text-lg font-bold text-white">
            You're offline
          </h3>

          <p className="text-sm text-white/60">
            Connect to load reels
          </p>
        </div>
      </div>
    );
  }

  // Search results grid.
  if (normalizedQuery) {
    return (
      <div className="h-full w-full overflow-y-auto bg-background">
        {searchResults.length === 0 ? (
          <div className="flex h-full items-center justify-center px-8">
            <p className="text-center text-sm text-muted-foreground">
              No reels found for "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 p-2">
            {searchResults.map(p => (
              <button
                key={p.id}
                onClick={() => openFromSearch(p.id)}
                className="relative aspect-[9/16] overflow-hidden rounded-xl bg-muted transition-transform active:scale-95"
              >
                {p.videoUrl ? (
                  <video
                    src={`${p.videoUrl}#t=0.1`}
                    className="absolute inset-0 h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                  <p className="truncate text-left text-[10px] font-semibold text-white">
                    {p.user?.name || 'User'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* Fixed floating glass feed navigation */}
      <div className="reels-feed-tabs pointer-events-none absolute left-0 right-0 top-0 z-50 flex justify-center bg-gradient-to-b from-black/55 via-black/20 to-transparent pb-7 pt-4">
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
        <div className="absolute left-0 right-0 top-16 z-50 bg-black/45 py-1.5 text-center text-xs font-bold text-white backdrop-blur-xl">
          Data Saver Mode
        </div>
      )}

      {isOffline && posts.length > 0 && (
        <div className="absolute left-0 right-0 top-16 z-50 bg-black/45 py-1.5 text-center text-xs font-bold text-white backdrop-blur-xl">
          <WifiOff className="mr-1 inline-block h-3 w-3" />
          Offline
        </div>
      )}

      {displayPosts.length === 0 && !loading && (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {activeTab === 'following'
              ? 'No reels from people you follow yet'
              : 'No reels yet'}
          </p>
        </div>
      )}

      {/* Stable, contained vertical reel scroller */}
      <div
        ref={containerRef}
        className="h-full min-h-0 w-full snap-y snap-mandatory overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y"
        style={{
          height: '100%',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
          scrollBehavior: 'auto',
        }}
      >
        {visiblePosts.map((p, i) => {
          const isDescLong =
            (p.content || '').length > DESC_MAX_LENGTH;

          const isExpanded = expandedDesc[p.id];

          const descText =
            isDescLong && !isExpanded
              ? p.content?.slice(0, DESC_MAX_LENGTH) + '...'
              : p.content;

          const postUser = p.user;
          const isVerified = !!(postUser as any)?.is_verified;
          const isFollowing = followedUsers.has(p.userId);
          const isOwnPost = p.userId === user?.id;

          return (
            <div
              key={p.id}
              data-index={i}
              className="reel-item relative h-full min-h-full w-full snap-start snap-always overflow-hidden"
            >
              {p.shouldRender ? (
                <OptimizedReelPlayer
                  src={p.videoUrl}
                  isActive={i === activeIndex}
                  poster={(p as any).thumbnail || p.imageUrl}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-black">
                  <div className="h-12 w-12 animate-pulse rounded-full bg-white/5" />
                </div>
              )}

              {/* Video readability gradients */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[52%] bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-black/35 to-transparent" />

              {/* Creator details and caption */}
              <div className="absolute bottom-3 left-4 right-[82px] z-30 max-h-[38%] overflow-y-auto overscroll-contain pr-1 text-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="mb-3 flex min-w-0 items-center gap-2.5">
                  <div className="shrink-0 rounded-full bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400 p-[2px]">
                    <Avatar className="h-10 w-10 border-2 border-black">
                      <AvatarImage
                        src={postUser?.avatar || postUser?.photoURL}
                      />

                      <AvatarFallback className="bg-zinc-800 text-xs font-bold text-white">
                        {postUser?.name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex min-w-0 items-center gap-1">
                    <span className="truncate text-sm font-extrabold text-white drop-shadow-md">
                      {postUser?.name || 'User'}
                    </span>

                    {isVerified && (
                      <VerifiedBadge className="h-4 w-4 shrink-0" />
                    )}
                  </div>

                  {!isOwnPost && (
                    <motion.button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();

                        if (!isFollowing) {
                          handleFollow(p.userId);
                        }
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
                        onClick={e => {
                          e.stopPropagation();

                          setExpandedDesc(prev => ({
                            ...prev,
                            [p.id]: !prev[p.id],
                          }));
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

                  <span className="normal-case tracking-normal">
                    Watch and discover
                  </span>
                </div>
              </div>

              {/* Premium Reels action rail */}
              <div className="absolute right-2 top-[54%] z-30 flex -translate-y-1/2 flex-col items-center gap-2 sm:right-4 sm:gap-2.5">
                {/* Like */}
                <div className="flex flex-col items-center gap-0.5">
                  <motion.button
                    type="button"
                    aria-label={
                      (likes[p.id] ?? !!(p as any).isLiked)
                        ? 'Unlike reel'
                        : 'Like reel'
                    }
                    aria-pressed={
                      likes[p.id] ?? !!(p as any).isLiked
                    }
                    onClick={e => {
                      e.stopPropagation();
                      handleLike(p.id);
                    }}
                    whileTap={{ scale: 0.82 }}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.85)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <motion.span
                      animate={
                        (likes[p.id] ?? !!(p as any).isLiked)
                          ? { scale: [1, 1.3, 1] }
                          : { scale: 1 }
                      }
                      transition={{ duration: 0.35 }}
                    >
                      <Heart
                        className={`h-8 w-8 ${
                          (likes[p.id] ?? !!(p as any).isLiked)
                            ? 'fill-rose-500 text-rose-500'
                            : 'fill-white text-white'
                        }`}
                        strokeWidth={2.4}
                      />
                    </motion.span>
                  </motion.button>

                  <span className="text-[12px] font-extrabold leading-tight text-white [text-shadow:0_2px_5px_rgba(0,0,0,0.9)]">
                    {formatReelCount(
                      typeof (p as any).likeCount === 'number'
                        ? (p as any).likeCount
                        : Array.isArray(p.likes)
                          ? p.likes.length
                          : 0
                    )}
                  </span>
                </div>

                {/* Comments */}
                <div className="flex flex-col items-center gap-0.5">
                  <motion.button
                    type="button"
                    aria-label="View comments"
                    onClick={e => {
                      e.stopPropagation();
                      setCommentsOpenFor(p.id);
                    }}
                    whileTap={{ scale: 0.86 }}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <span className="relative flex h-7 w-7 items-center justify-center">
                      <MessageCircle
                        className="h-7 w-7 fill-white text-white"
                        strokeWidth={2.2}
                      />
                      <span className="absolute top-[9px] text-[10px] font-black leading-none tracking-[1px] text-black">
                        •••
                      </span>
                    </span>
                  </motion.button>

                  <span className="text-[12px] font-extrabold leading-tight text-white [text-shadow:0_2px_5px_rgba(0,0,0,0.9)]">
                    {formatReelCount(
                      Array.isArray((p as any).comments)
                        ? (p as any).comments.length
                        : (p as any).commentCount || 0
                    )}
                  </span>
                </div>

                {/* Repost */}
                <div className="flex flex-col items-center gap-0.5">
                  <motion.button
                    type="button"
                    aria-label={
                      reposted[p.id] ? 'Remove repost' : 'Repost reel'
                    }
                    aria-pressed={!!reposted[p.id]}
                    onClick={e => {
                      e.stopPropagation();
                      handleRepost(p.id);
                    }}
                    whileTap={{ scale: 0.86 }}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <Repeat2
                      className="h-8 w-8"
                      strokeWidth={3}
                    />
                  </motion.button>

                  <span className="text-[12px] font-extrabold leading-tight text-white [text-shadow:0_2px_5px_rgba(0,0,0,0.9)]">
                    {formatReelCount(repostCounts[p.id] || 0)}
                  </span>
                </div>

                {/* Native share */}
                <motion.button
                  type="button"
                  aria-label="Share reel"
                  onClick={e => {
                    e.stopPropagation();
                    handleShare(p);
                  }}
                  whileTap={{ scale: 0.86 }}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Send
                    className="h-8 w-8 fill-white text-white"
                    strokeWidth={2.8}
                  />
                </motion.button>

                {/* WhatsApp */}
                <motion.button
                  type="button"
                  aria-label="Share reel on WhatsApp"
                  onClick={e => {
                    e.stopPropagation();
                    handleWhatsAppShare(p);
                  }}
                  whileTap={{ scale: 0.86 }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#25D366] shadow-lg transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span className="relative flex h-7 w-7 items-center justify-center">
                    <MessageCircle
                      className="h-7 w-7 fill-white text-white"
                      strokeWidth={2}
                    />
                    <Phone
                      className="absolute h-3.5 w-3.5 -rotate-[25deg] text-[#168B45]"
                      strokeWidth={3.2}
                    />
                  </span>
                </motion.button>

                {/* More options */}
                <motion.button
                  type="button"
                  aria-label="More reel options"
                  onClick={e => {
                    e.stopPropagation();
                    handleMore(p);
                  }}
                  whileTap={{ scale: 0.86 }}
                  className="flex h-9 w-10 items-center justify-center rounded-full text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span className="flex flex-col items-center justify-center gap-[3px]">
                    <span className="h-[5px] w-[5px] rounded-full bg-white" />
                    <span className="h-[5px] w-[5px] rounded-full bg-white" />
                    <span className="h-[5px] w-[5px] rounded-full bg-white" />
                  </span>
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
          onCountChange={count => {
            setPosts(prev =>
              prev.map(p =>
                p.id === commentsOpenFor
                  ? ({
                      ...p,
                      comments: new Array(count).fill(null),
                    } as any)
                  : p
              )
            );
          }}
        />
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
