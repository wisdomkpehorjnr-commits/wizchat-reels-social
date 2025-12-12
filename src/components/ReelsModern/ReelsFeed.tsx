import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ReelPlayer } from './ReelPlayer';
import ReelControls from './ReelControls';
import MoreBottomSheet from './MoreBottomSheet';
import CommentsModal from './CommentsModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { Post } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';

export const ReelsFeed: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const obsRef = useRef<IntersectionObserver | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const all = await dataService.getPosts();
        const reels = (all || []).filter(p => p.videoUrl || p.isReel || p.mediaType === 'video');
        setPosts(reels);
      } catch (err) {
        console.error('Failed to load reels', err);
        toast({ title: 'Failed to load reels', variant: 'destructive' });
      }
    })();
  }, [toast]);

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

  const handleMore = useCallback((post: Post) => {
    // open bottom sheet handled in UI
    setSheetPost(post);
    setSheetOpen(true);
  }, [toast]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPost, setSheetPost] = useState<Post | null>(null);

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

  // Intersection observer to detect the currently visible reel and ensure one-video-per-snap
  useEffect(() => {
    if (!containerRef.current) return;
    const options = { root: containerRef.current, threshold: [0.6] };
    obsRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const index = Number((entry.target as HTMLElement).dataset.index);
        if (entry.isIntersecting) {
          setActiveIndex(index);
        }
      });
    }, options);

    const els = containerRef.current.querySelectorAll('.reel-item');
    els.forEach(el => obsRef.current?.observe(el));

    return () => { obsRef.current?.disconnect(); };
  }, [posts]);

  return (
    <div className={`fixed inset-0 ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      <div ref={containerRef} className="h-full w-full overflow-y-auto snap-y snap-mandatory touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
        {posts.map((p, i) => (
          <div key={p.id} data-index={i} className="reel-item snap-start w-full h-screen relative">
            <ReelPlayer src={p.videoUrl} isActive={i === activeIndex} poster={(p as any).thumbnail || p.imageUrl} />

            <div className="absolute left-4 bottom-8 text-white z-40 max-w-[60%]">
              <div className="font-semibold text-lg">{p.user?.name}</div>
              <div className="text-sm mt-1 line-clamp-3">{p.content}</div>
            </div>

            <ReelControls
              likesCount={Array.isArray(p.likes) ? p.likes.length : (p.likeCount || 0)}
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
    </div>
  );
};

export default ReelsFeed;
