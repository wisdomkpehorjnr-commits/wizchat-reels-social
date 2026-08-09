import React, { useState } from 'react';
import { Heart, MessageCircle, Send, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

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

  const btn =
    'w-12 h-12 rounded-2xl bg-background border border-border shadow-md flex items-center justify-center transition-transform active:scale-90';

  return (
    <div className="absolute right-3 bottom-6 z-40 flex flex-col items-center gap-4">
      {/* Like */}
      <div className="flex flex-col items-center gap-1">
        <button onClick={handleLike} aria-label="Like" className={btn}>
          <motion.div animate={animateLike ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.4 }}>
            <Heart
              className={`w-6 h-6 ${isLiked ? 'text-destructive fill-current' : 'text-foreground fill-none'}`}
              strokeWidth={2.2}
            />
          </motion.div>
        </button>
        <span className="text-white text-xs font-bold drop-shadow">{formatCount(likesCount)}</span>
      </div>

      {/* Comment */}
      <div className="flex flex-col items-center gap-1">
        <button onClick={onComment} aria-label="Comments" className={btn}>
          <MessageCircle className="w-6 h-6 text-foreground" strokeWidth={2.2} />
        </button>
        <span className="text-white text-xs font-bold drop-shadow">{formatCount(commentsCount)}</span>
      </div>

      {/* Share */}
      <button onClick={onShare} aria-label="Share" className={btn}>
        <Send className="w-6 h-6 text-foreground" strokeWidth={2.2} />
      </button>

      {/* More */}
      <button onClick={onMore} aria-label="More options" className={btn}>
        <MoreVertical className="w-6 h-6 text-foreground" strokeWidth={2.2} />
      </button>
    </div>
  );
};


export default ReelControls;
