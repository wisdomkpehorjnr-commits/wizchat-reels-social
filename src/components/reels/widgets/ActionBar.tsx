import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Download,
  UserPlus,
} from 'lucide-react';
import { Reel } from '../types';
import { ReelTheme, getIconColor } from '../theme';
import { formatNumber } from '../utils';
import { useHaptic } from '../hooks';

interface ActionBarProps {
  reel: Reel;
  theme: ReelTheme;
  onLike?: (reelId: string) => void;
  onComment?: (reelId: string) => void;
  onShare?: (reelId: string) => void;
  onSave?: (reelId: string) => void;
  onDownload?: (reelId: string) => void;
  onFollow?: (userId: string) => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  reel,
  theme,
  onLike,
  onComment,
  onShare,
  onSave,
  onDownload,
  onFollow,
}) => {
  const { triggerHaptic } = useHaptic();
  const [likeState, setLikeState] = useState(reel.isLiked);
  const [saveState, setSaveState] = useState(reel.isSaved);
  const [followState, setFollowState] = useState(reel.isFollowing);
  const [likesCount, setLikesCount] = useState(reel.likesCount);

  const handleLike = () => {
    triggerHaptic('medium');
    const newState = !likeState;
    setLikeState(newState);
    setLikesCount((prev) => (newState ? prev + 1 : prev - 1));
    onLike?.(reel.id);
  };

  const handleComment = () => {
    triggerHaptic('light');
    onComment?.(reel.id);
  };

  const handleShare = () => {
    triggerHaptic('light');
    onShare?.(reel.id);
  };

  const handleSave = () => {
    triggerHaptic('medium');
    setSaveState(!saveState);
    onSave?.(reel.id);
  };

  const handleDownload = () => {
    triggerHaptic('heavy');
    onDownload?.(reel.id);
  };

  const handleFollow = () => {
    triggerHaptic('medium');
    setFollowState(!followState);
    onFollow?.(reel.userId);
  };

  const ActionButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    count?: number;
    isActive?: boolean;
    onClick: () => void;
  }> = ({ icon, label, count, isActive, onClick }) => (
    <motion.button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-3 rounded-full transition-colors"
      whileTap={{ scale: 0.85 }}
      whileHover={{ scale: 1.05 }}
    >
      <motion.div
        animate={isActive ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center"
      >
        <div
          className={`w-8 h-8 flex items-center justify-center transition-colors ${
            isActive ? 'text-rose-500' : 'text-white'
          }`}
        >
          {icon}
        </div>
      </motion.div>
      {count !== undefined && (
        <span className="text-xs font-semibold text-white">{formatNumber(count)}</span>
      )}
      {label && !count && (
        <span className="text-xs font-medium text-white/70 text-center">{label}</span>
      )}
    </motion.button>
  );

  return (
    <div
      className="absolute right-4 bottom-20 z-30 flex flex-col gap-6 pb-4"
      style={{
        background: theme.gradients.actionBarBg,
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '12px',
      }}
    >
      {/* Like Button */}
      <ActionButton
        icon={<Heart className="w-6 h-6 fill-current" />}
        label="Like"
        count={likesCount}
        isActive={likeState}
        onClick={handleLike}
      />

      {/* Comment Button */}
      <ActionButton
        icon={<MessageCircle className="w-6 h-6" />}
        label="Comment"
        count={reel.commentsCount}
        onClick={handleComment}
      />

      {/* Share Button */}
      <ActionButton
        icon={<Share2 className="w-6 h-6" />}
        label="Share"
        onClick={handleShare}
      />

      {/* Save Button */}
      <ActionButton
        icon={<Bookmark className="w-6 h-6 fill-current" />}
        label="Save"
        isActive={saveState}
        onClick={handleSave}
      />

      {/* Download Button */}
      <ActionButton
        icon={<Download className="w-6 h-6" />}
        label="Download"
        onClick={handleDownload}
      />

      {/* Follow Button */}
      <motion.button
        onClick={handleFollow}
        className="relative flex items-center justify-center"
        whileTap={{ scale: 0.85 }}
        whileHover={{ scale: 1.05 }}
      >
        <motion.div
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            followState
              ? `text-white border-2 border-white`
              : `text-white bg-gradient-to-br from-rose-500 to-pink-500 hover:shadow-lg hover:shadow-rose-500/50`
          }`}
          animate={followState ? {} : { boxShadow: ['0 0 0 0 rgba(244, 63, 94, 0.7)', '0 0 0 8px rgba(244, 63, 94, 0)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <UserPlus className="w-5 h-5" />
        </motion.div>
      </motion.button>
    </div>
  );
};

export default ActionBar;
