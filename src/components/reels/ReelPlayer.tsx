import React, { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, ThumbsDown, ThumbsUp, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { reelsStore } from '@/services/reelsStore';
import { prefetchVideo, getCachedVideoUrl, clearCachedVideoUrl } from '@/services/reelsCache';

interface ReelPlayerProps {
  post: any;
  isActive: boolean;
  onLike: (postId: string, liked: boolean) => void;
  onComment: (post: any) => void;
  onShare: (post: any) => void;
  onMore: (post: any) => void;
}

const ReelPlayer: React.FC<ReelPlayerProps> = ({ post, isActive, onLike, onComment, onShare, onMore }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [cachedSrc, setCachedSrc] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Prefetch into cache
    if (post?.videoUrl) prefetchVideo(post.videoUrl);
  }, [post?.videoUrl]);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    const attach = async () => {
      if (!post?.videoUrl) return;
      const cached = await getCachedVideoUrl(post.videoUrl);
      if (cancelled) return;
      if (cached) {
        objectUrl = cached;
        setCachedSrc(cached);
        if (videoRef.current) videoRef.current.src = cached;
      } else if (videoRef.current && isActive) {
        // set direct URL when active to start streaming faster
        videoRef.current.src = post.videoUrl;
      }
    };
    attach();

    return () => {
      cancelled = true;
      if (objectUrl) {
        clearCachedVideoUrl(objectUrl).catch(() => {});
      }
    };
  }, [post?.videoUrl, isActive]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.muted = muted;
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      try {
        // Free memory: remove src when off-screen
        v.removeAttribute('src');
        v.load();
      } catch (e) {}
      setPlaying(false);
    }
  }, [isActive, muted]);

  const handleToggleSound = () => setMuted(!muted);

  const likeState = reelsStore.getLike(post.id);

  const handleLike = () => {
    const liked = !(likeState?.like === true);
    // optimistic
    onLike(post.id, liked);
    reelsStore.setLike(post.id, liked, (post.likeCount || 0) + (liked ? 1 : -1));
    if (user?.id) reelsStore.syncLikeToServer(post.id, user.id, liked);
  };

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        className="max-h-full max-w-full object-contain"
        playsInline
        webkit-playsinline="true"
        loop
        preload={isActive ? 'auto' : 'metadata'}
        muted={muted}
      />

      {/* Right-side action column */}
      <div className="absolute right-4 bottom-20 flex flex-col items-center space-y-4 text-white">
        <button onClick={handleLike} aria-label="Like" className="flex flex-col items-center">
          <Heart className={`w-8 h-8 ${likeState?.like ? 'text-red-500' : ''}`} />
          <div className="text-xs mt-1">{post.likeCount ?? 0}</div>
        </button>

        <button onClick={() => onComment(post)} aria-label="Comment" className="flex flex-col items-center">
          <MessageCircle className="w-8 h-8" />
          <div className="text-xs mt-1">{post.commentCount ?? 0}</div>
        </button>

        <button onClick={() => onShare(post)} aria-label="Share" className="flex flex-col items-center">
          <Share2 className="w-8 h-8" />
        </button>

        <button onClick={() => onMore(post)} aria-label="More" className="flex flex-col items-center">
          <MoreHorizontal className="w-8 h-8" />
        </button>

        <button onClick={handleToggleSound} aria-label="Sound" className="mt-2">
          {muted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};

export default ReelPlayer;
