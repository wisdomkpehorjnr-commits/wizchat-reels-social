import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';

interface ReelControlsProps {
  isLiked: boolean;
  likesCount?: number;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onMore: () => void;
}

export const ReelControls: React.FC<ReelControlsProps> = ({ isLiked, likesCount = 0, onLike, onComment, onShare, onMore }) => {
  const [mounted, setMounted] = useState(false);
  const [popping, setPopping] = useState(false);
  const [rippleId, setRippleId] = useState<number | null>(null);

  useEffect(() => {
    // entrance animation
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // trigger like pop animation
  const handleLike = () => {
    setPopping(true);
    setTimeout(() => setPopping(false), 420);
    onLike();
  };

  // simple ripple for comment/share
  const triggerRipple = (cb: () => void) => {
    const id = Date.now();
    setRippleId(id);
    setTimeout(() => setRippleId(null), 420);
    cb();
  };

  return (
    <>
      <style>{`
        @keyframes like-pop {
          0% { transform: scale(1); }
          30% { transform: scale(1.18); }
          60% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes ripple {
          0% { transform: scale(0); opacity: 0.6; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>

      <div
        className={`absolute right-4 bottom-28 z-50 flex flex-col items-center gap-4 pointer-events-auto`}
        aria-hidden={false}
      >
        {/* container to slightly float above video */}
        <div className={`flex flex-col items-center gap-4 transform transition-all duration-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>

          {/* Like button */}
          <div className="relative">
            <button
              aria-label="Like"
              onClick={handleLike}
              className={`w-14 h-14 rounded-full flex items-center justify-center relative overflow-visible
                backdrop-blur-md bg-white/8 border border-white/10 shadow-[0_6px_24px_rgba(2,6,23,0.55)]
                transition-transform duration-320 ease-out
                ${isLiked ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white scale-105' : 'text-white'}`}
              style={{
                WebkitBackdropFilter: 'blur(8px)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'text-white' : 'text-white'}`} />

              {/* floating count */}
              <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-white/90">
                {likesCount}
              </div>

              {/* pop animation overlay */}
              <span
                className={`absolute inset-0 rounded-full pointer-events-none ${popping ? '' : 'hidden'}`}
                style={{ animation: popping ? 'like-pop 420ms cubic-bezier(.2,.9,.2,1)' : 'none' }}
              />
            </button>
          </div>

          {/* Comment button */}
          <div className="relative">
            <button
              aria-label="Comment"
              onClick={() => triggerRipple(onComment)}
              className="w-12 h-12 rounded-full flex items-center justify-center relative overflow-hidden
                backdrop-blur-md bg-white/6 border border-white/8 shadow-md transition-transform duration-200 ease-in-out text-white"
              style={{ WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)' }}
            >
              <MessageCircle className="w-5 h-5" />
              {rippleId && (
                <span className="absolute w-28 h-28 rounded-full bg-white/20 -z-10" style={{ animation: 'ripple 420ms linear' }} />
              )}
            </button>
          </div>

          {/* Share button */}
          <div className="relative">
            <button
              aria-label="Share"
              onClick={() => triggerRipple(onShare)}
              className="w-12 h-12 rounded-full flex items-center justify-center relative overflow-hidden
                backdrop-blur-md bg-white/6 border border-white/8 shadow-md transition-transform duration-200 ease-in-out text-white"
              style={{ WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)' }}
            >
              <Share2 className="w-5 h-5" />
              {rippleId && (
                <span className="absolute w-28 h-28 rounded-full bg-white/20 -z-10" style={{ animation: 'ripple 420ms linear' }} />
              )}
            </button>
          </div>

          {/* More button */}
          <div className="relative">
            <button
              aria-label="More"
              onClick={onMore}
              className="w-12 h-12 rounded-full flex items-center justify-center relative overflow-hidden
                backdrop-blur-md bg-white/6 border border-white/8 shadow-md transition-transform duration-200 ease-in-out text-white"
              style={{ WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)' }}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default ReelControls;
