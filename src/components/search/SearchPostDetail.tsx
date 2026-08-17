import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import PostCard from '@/components/PostCard';
import { dataService } from '@/services/dataService';
import type { Post } from '@/types';

interface SearchPostDetailProps {
  postId: string;
  /** Optional already-known post data so the header renders instantly */
  initialPost?: any;
  onClose: () => void;
}

const PAGE_SIZE = 5;

const extractHashtags = (text?: string): string[] => {
  if (!text) return [];
  return (text.match(/#[\p{L}\p{N}_]+/gu) || []).map((t) => t.toLowerCase());
};

/**
 * Immersive full-screen post view that opens ON TOP of Global Search.
 * Shows the tapped post plus an endlessly scrollable feed of similar posts.
 */
const SearchPostDetail: React.FC<SearchPostDetailProps> = ({ postId, initialPost, onClose }) => {
  const [post, setPost] = useState<any>(initialPost || null);
  const [similar, setSimilar] = useState<Post[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const all = await dataService.getPosts();
      const target = all.find((p) => p.id === postId) || initialPost || null;
      if (target) setPost(target);

      const tags = extractHashtags(target?.content);
      const others = all.filter((p) => p.id !== postId);

      let related: Post[] = [];
      if (tags.length) {
        related = others.filter((p) => {
          const pt = extractHashtags(p.content);
          return pt.some((t) => tags.includes(t));
        });
      }
      if (!related.length && target?.userId) {
        related = others.filter((p) => p.userId === target.userId);
      }
      if (!related.length) related = others;

      setSimilar(related);
    } catch (e) {
      console.warn('SearchPostDetail load failed', e);
    } finally {
      setLoading(false);
    }
  }, [postId, initialPost]);

  useEffect(() => { load(); }, [load]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisible((v) => (v < similar.length ? v + PAGE_SIZE : v));
      }
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [similar.length]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[200] bg-background flex flex-col"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
    >
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close post"
          className="h-9 w-9 rounded-full bg-foreground/10 border border-foreground/15 flex items-center justify-center text-foreground transition-transform active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>
        <span className="text-base font-semibold text-foreground">Post</span>
      </div>

      <div
        className="flex-1 overflow-y-auto no-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' as any, overscrollBehavior: 'contain' }}
      >
        <div className="p-3 space-y-3 pb-24">
          {post && <PostCard post={post} onPostUpdate={load} />}

          {similar.length > 0 && (
            <p className="px-1 pt-2 text-sm font-semibold text-muted-foreground">Similar posts</p>
          )}

          {similar.slice(0, visible).map((p) => (
            <PostCard key={p.id} post={p} onPostUpdate={load} />
          ))}

          <div ref={sentinelRef} className="h-10 flex items-center justify-center">
            {(loading || visible < similar.length) && (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SearchPostDetail;
