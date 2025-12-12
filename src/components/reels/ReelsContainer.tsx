import React, { useEffect, useRef, useState } from 'react';
import ReelPlayer from './ReelPlayer';
import CommentsSheet from './CommentsSheet';
import MoreSheet from './MoreSheet';
import { useAuth } from '@/contexts/AuthContext';
import { reelsStore } from '@/services/reelsStore';
import { prefetchVideo } from '@/services/reelsCache';

const SNAP_TIMEOUT = 120; // ms

const ReelsContainer: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [commentsOpenFor, setCommentsOpenFor] = useState<any | null>(null);
  const [moreOpenFor, setMoreOpenFor] = useState<any | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Load posts from server
    const load = async () => {
      try {
        const res = await fetch('/api/reels');
        const json = await res.json();
        setPosts(json || []);
      } catch (e) {
        console.warn('Failed to load reels', e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    // Prefetch next video when activeIndex changes
    if (posts[activeIndex + 1]) {
      prefetchVideo(posts[activeIndex + 1].videoUrl);
    }
  }, [activeIndex, posts]);

  // Intersection observer-based snap
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const children = Array.from(el.querySelectorAll('.reel-item')) as HTMLElement[];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          const idx = Number((entry.target as HTMLElement).dataset.index || '0');
          setActiveIndex(idx);
        }
      });
    }, { threshold: [0.6] });

    children.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [posts]);

  const handleLike = (postId: string, liked: boolean) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likeCount: (p.likeCount || 0) + (liked ? 1 : -1) } : p));
    reelsStore.setLike(postId, liked, undefined);
    if (user?.id) reelsStore.syncLikeToServer(postId, user.id, liked);
  };

  const handleComment = (post: any) => setCommentsOpenFor(post);
  const handleShare = (post: any) => {
    if (navigator.share) {
      navigator.share({ title: post.title || '', text: post.description || '', url: window.location.origin + `/reels/${post.id}` }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.origin + `/reels/${post.id}`).catch(() => {});
      alert('Link copied');
    }
  };

  const handleMore = (post: any) => setMoreOpenFor(post);

  return (
    <div className="w-full h-full bg-black text-white">
      <div ref={containerRef} className="h-full overflow-y-auto snap-y snap-mandatory">
        {posts.map((post, idx) => (
          <div key={post.id} data-index={idx} className="reel-item snap-start h-screen">
            <ReelPlayer post={post} isActive={idx === activeIndex} onLike={handleLike} onComment={handleComment} onShare={handleShare} onMore={handleMore} />
          </div>
        ))}
      </div>

      {commentsOpenFor && <CommentsSheet post={commentsOpenFor} open={!!commentsOpenFor} onClose={() => setCommentsOpenFor(null)} />}
      {moreOpenFor && <MoreSheet post={moreOpenFor} open={!!moreOpenFor} onClose={() => setMoreOpenFor(null)} />}
    </div>
  );
};

export default ReelsContainer;
import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReelPlayer from './ReelPlayer';
import { Post } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import CommentsSheet from './CommentsSheet';

const LOCAL_LIKES_KEY = 'wiz_reels_likes_v1';
const LOCAL_COUNTS_KEY = 'wiz_reels_like_counts_v1';

const ReelsContainer: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showCommentsFor, setShowCommentsFor] = useState<Post | null>(null);

  // local persistence for likes and counts
  const readLocal = <T,>(key: string): T | null => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : null; } catch { return null; }
  };
  const writeLocal = (key: string, val: any) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

  useEffect(() => {
    const savedSound = localStorage.getItem('reels_sound_enabled');
    if (savedSound !== null) setSoundEnabled(savedSound === 'true');
  }, []);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const posts = await dataService.getPosts();
        const videos = posts.filter(p => p.videoUrl || p.isReel || p.mediaType === 'video');
        // Normalize counts with local overrides
        const counts = readLocal<Record<string, number>>(LOCAL_COUNTS_KEY) || {};
        const normalized = videos.map(v => ({ ...v, likesCount: counts[v.id] ?? (v.likes?.length || 0) }));
        setReels(normalized);
      } catch (err) {
        console.error(err);
        toast({ title: 'Error', description: 'Failed to load reels', variant: 'destructive' });
        setReels([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Scroll snapping handler
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      window.requestAnimationFrame(() => {
        const idx = Math.round(el.scrollTop / window.innerHeight);
        if (idx !== currentIndex) setCurrentIndex(idx);
        ticking = false;
      });
      ticking = true;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [currentIndex]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(s => { const next = !s; localStorage.setItem('reels_sound_enabled', String(next)); return next; });
  }, []);

  const handleLike = useCallback(async (postId: string) => {
    // Ensure single like per client
    const likes = readLocal<Record<string, boolean>>(LOCAL_LIKES_KEY) || {};
    const counts = readLocal<Record<string, number>>(LOCAL_COUNTS_KEY) || {};
    const already = !!likes[postId];
    likes[postId] = !already;
    // update counts
    const current = counts[postId] ?? (reels.find(r => r.id === postId)?.likesCount || 0);
    counts[postId] = already ? Math.max(0, current - 1) : current + 1;
    writeLocal(LOCAL_LIKES_KEY, likes);
    writeLocal(LOCAL_COUNTS_KEY, counts);
    setReels(prev => prev.map(r => r.id === postId ? { ...r, likesCount: counts[postId] } : r));

    // try server-side like (best-effort)
    try { if (user) await dataService.likePost(postId); } catch (err) { /* ignore */ }
  }, [reels, user]);

  const handleComment = useCallback((post: Post) => {
    setShowCommentsFor(post);
  }, []);

  const handleShare = useCallback(async (post: Post) => {
    try {
      if (navigator.share) await navigator.share({ title: post.content || 'Reel', url: `${window.location.origin}/reels?reel=${post.id}` });
      else { await navigator.clipboard.writeText(`${window.location.origin}/reels?reel=${post.id}`); toast({ title: 'Link copied' }); }
    } catch (err) { console.error(err); }
  }, [toast]);

  const handleMore = useCallback((post: Post) => {
    // Simple options menu via browser confirm for now; can be replaced with styled menu
    const action = window.prompt('Options: type "download", "save", or "report"');
    if (!action) return;
    if (action === 'download' && post.videoUrl) {
      const a = document.createElement('a'); a.href = post.videoUrl; a.download = `reel_${post.id}.mp4`; a.click();
    } else if (action === 'save') {
      dataService.savePost(post.id).then(() => toast({ title: 'Saved' })).catch(() => toast({ title: 'Error', variant: 'destructive' }));
    } else if (action === 'report') {
      toast({ title: 'Reported', description: 'Thanks. We will review this content.' });
    }
  }, [toast]);

  if (loading) return <div className="w-full h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-gray-300 border-t-transparent rounded-full animate-spin" /></div>;
  if (reels.length === 0) return <div className="w-full h-screen flex items-center justify-center">No reels found</div>;

  return (
    <div ref={containerRef} className="w-full h-screen overflow-y-scroll snap-y snap-mandatory" style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}>
      {reels.map((r, idx) => (
        <div key={r.id} style={{ height: '100vh' }}>
          <ReelPlayer
            post={r}
            isActive={idx === currentIndex}
            soundEnabled={soundEnabled}
            onToggleSound={toggleSound}
            onLike={handleLike}
            onComment={handleComment}
            onShare={handleShare}
            onMore={handleMore}
          />
        </div>
      ))}

      {showCommentsFor && (
        <CommentsSheet post={showCommentsFor} onClose={() => setShowCommentsFor(null)} />
      )}
    </div>
  );
};

export default ReelsContainer;
