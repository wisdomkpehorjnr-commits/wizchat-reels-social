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
