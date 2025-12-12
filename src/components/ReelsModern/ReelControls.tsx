import React from 'react';
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
  return (
    <div className="absolute right-4 bottom-28 flex flex-col items-center gap-6 z-40 text-white">
      <button aria-label="Like" onClick={onLike} className="flex flex-col items-center text-white/90">
        <Heart className={`w-8 h-8 ${isLiked ? 'text-red-500' : ''}`} />
        <span className="text-xs mt-1 text-white/90">{likesCount}</span>
      </button>

      <button aria-label="Comment" onClick={onComment} className="flex flex-col items-center text-white/90">
        <MessageCircle className="w-8 h-8" />
      </button>

      <button aria-label="Share" onClick={onShare} className="flex flex-col items-center text-white/90">
        <Share2 className="w-8 h-8" />
      </button>

      <button aria-label="More" onClick={onMore} className="flex flex-col items-center text-white/90">
        <MoreHorizontal className="w-7 h-7" />
      </button>
    </div>
  );
};

export default ReelControls;
