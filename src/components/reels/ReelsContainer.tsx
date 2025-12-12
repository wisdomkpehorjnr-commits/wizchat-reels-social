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
