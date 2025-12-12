import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Post } from '@/types';
import { Button } from '@/components/ui/button';

interface ReelPlayerProps {
  post: Post;
  isActive: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onLike: (postId: string) => void;
  onComment: (post: Post) => void;
  onShare: (post: Post) => void;
  onMore: (post: Post) => void;
}

const ReelPlayer: React.FC<ReelPlayerProps> = ({ post, isActive, soundEnabled, onToggleSound, onLike, onComment, onShare, onMore }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => { setIsLoading(false); };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }

    return () => {
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [isActive]);

  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, []);

  // Double-tap like
  const lastTap = useRef<number>(0);
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onLike(post.id);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      // single tap toggles play
      setTimeout(() => {
        if (Date.now() - lastTap.current >= 300) {
          handleTogglePlay();
          lastTap.current = 0;
        }
      }, 320);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black snap-start flex-shrink-0">
      <div className="absolute inset-0 bg-black flex items-center justify-center" onClick={handleTap}>
        {post.videoUrl ? (
          <video
            ref={videoRef}
            src={post.videoUrl}
            className="w-full h-full object-contain"
            playsInline
            loop
            muted={!soundEnabled}
            preload="auto"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">No video</div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {!isPlaying && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/40 rounded-full p-3">
              <Play className="w-8 h-8 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Right side action bar */}
      <div className="absolute right-4 bottom-28 top-1/3 flex flex-col items-center gap-4 z-30">
        <button aria-label="Like" onClick={() => onLike(post.id)} className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20">
          <Heart className="w-6 h-6 text-white" />
        </button>

        <button aria-label="Comment" onClick={() => onComment(post)} className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20">
          <MessageCircle className="w-6 h-6 text-white" />
        </button>

        <button aria-label="Share" onClick={() => onShare(post)} className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20">
          <Share2 className="w-6 h-6 text-white" />
        </button>

        <button aria-label="More" onClick={() => onMore(post)} className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20">
          <MoreHorizontal className="w-6 h-6 text-white" />
        </button>

        <button aria-label="Sound" onClick={onToggleSound} className="mt-4 flex items-center justify-center w-10 h-10 rounded-full bg-white/6 hover:bg-white/12">
          {soundEnabled ? <Volume2 className="w-5 h-5 text-white" /> : <VolumeX className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute left-4 bottom-6 right-4 z-20 text-white">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <img src={post.user?.avatar} alt={post.user?.name} className="w-10 h-10 rounded-full border-2 border-white/20" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{post.user?.name}</span>
              <span className="text-xs text-white/70">@{post.user?.username}</span>
            </div>
            <p className="text-sm text-white/90 mt-1 line-clamp-2">{post.content}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelPlayer;
