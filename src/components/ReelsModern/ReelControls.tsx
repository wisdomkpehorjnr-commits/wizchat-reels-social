import React, { useState } from 'react';
import { Heart, MessageCircle, Send, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReelControlsProps {
  isLiked: boolean;
  likesCount?: number;
  commentsCount?: number;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onMore: () => void;
}

export const ReelControls: React.FC<ReelControlsProps> = ({
  isLiked,
  likesCount = 0,
  commentsCount = 0,
  onLike,
  onComment,
  onShare,
  onMore,
}) => {
  const [animateLike, setAnimateLike] = useState(false);

  const handleLike = () => {
    setAnimateLike(true);
    setTimeout(() => setAnimateLike(false), 500);
    onLike();
  };

  const formatCount = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  };

  return (
    <div className="absolute right-3 bottom-24 z-40 flex flex-col items-center gap-5">
      {/* Like */}
      <button onClick={handleLike} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
        <motion.div animate={animateLike ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.4 }}>
          <Heart
            className={`w-7 h-7 drop-shadow-lg ${isLiked ? 'text-red-500 fill-red-500' : 'text-white fill-none'}`}
            strokeWidth={2.5}
          />
        </motion.div>
        {likesCount > 0 && (
          <span className="text-white text-xs font-bold drop-shadow">{formatCount(likesCount)}</span>
        )}
      </button>

      {/* Comment */}
      <button onClick={onComment} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
        <MessageCircle className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={2.5} />
        {commentsCount > 0 && (
          <span className="text-white text-xs font-bold drop-shadow">{formatCount(commentsCount)}</span>
        )}
      </button>

      {/* Share */}
      <button onClick={onShare} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
        <Send className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={2.5} />
      </button>

      {/* More */}
      <button onClick={onMore} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
        <MoreVertical className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default ReelControls;
