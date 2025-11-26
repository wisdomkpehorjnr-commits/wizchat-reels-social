import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music, ChevronRight } from 'lucide-react';
import { Reel } from '../types';
import { ReelTheme, getTextColor } from '../theme';
import { truncateText, highlightHashtagsAndMentions } from '../utils';

interface VideoInfoSectionProps {
  reel: Reel;
  theme: ReelTheme;
  onFollowClick?: (userId: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  onAvatarClick?: (userId: string) => void;
}

export const VideoInfoSection: React.FC<VideoInfoSectionProps> = ({
  reel,
  theme,
  onFollowClick,
  onHashtagClick,
  onAvatarClick,
}) => {
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [audioMarqueePosition, setAudioMarqueePosition] = useState(0);

  // Simple marquee animation for audio title
  useEffect(() => {
    if (!reel.audioInfo) return;

    const interval = setInterval(() => {
      setAudioMarqueePosition((prev) => (prev + 1) % 100);
    }, 50);

    return () => clearInterval(interval);
  }, [reel.audioInfo]);

  const captionParts = highlightHashtagsAndMentions(reel.caption);
  const shouldShowMore = reel.caption.length > 100;

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 z-20 pt-12 pb-6 px-4"
      style={{
        background: theme.gradients.overlayGradient,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Audio Info */}
      {reel.audioInfo && (
        <motion.div
          className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10"
          whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <div className="relative w-10 h-10 flex-shrink-0">
            {reel.audioInfo.iconUrl ? (
              <img src={reel.audioInfo.iconUrl} alt="audio" className="w-full h-full rounded-lg object-cover" />
            ) : (
              <div
                className="w-full h-full rounded-lg flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` }}
              >
                <Music className="w-5 h-5 text-white" />
              </div>
            )}
            {/* Ripple effect */}
            <motion.div
              className="absolute inset-0 rounded-lg border-2 border-white/30"
              animate={{ scale: [1, 1.2], opacity: [1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{reel.audioInfo.title}</div>
            <div className="text-xs text-white/60 truncate">{reel.audioInfo.artist}</div>
          </div>

          <ChevronRight className="w-5 h-5 text-white/40 flex-shrink-0" />
        </motion.div>
      )}

      {/* User Info */}
      <motion.div className="flex items-center gap-3 mb-4">
        <motion.img
          src={reel.userAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reel.userId}`}
          alt={reel.username}
          className="w-12 h-12 rounded-full object-cover cursor-pointer border-2 border-white/20"
          onClick={() => onAvatarClick?.(reel.userId)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        />

        <div className="flex-1">
          <h3
            className="text-sm font-bold text-white cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onAvatarClick?.(reel.userId)}
          >
            {reel.username}
          </h3>
          <p className="text-xs text-white/60">{reel.createdAt ? new Date(reel.createdAt).toLocaleDateString() : 'Recently'}</p>
        </div>

        {/* Follow Button */}
        {!reel.isFollowing && (
          <motion.button
            onClick={() => onFollowClick?.(reel.userId)}
            className="px-4 py-2 bg-white text-black font-semibold text-xs rounded-full"
            whileHover={{ backgroundColor: '#f5f5f5' }}
            whileTap={{ scale: 0.95 }}
          >
            Follow
          </motion.button>
        )}
      </motion.div>

      {/* Caption */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className={`text-sm leading-relaxed text-white ${!showFullCaption && 'line-clamp-2'}`}>
          {captionParts.map((part, idx) => {
            if (part.type === 'hashtag') {
              return (
                <span
                  key={idx}
                  className="text-cyan-300 cursor-pointer hover:opacity-80 font-medium"
                  onClick={() => onHashtagClick?.(part.content.substring(1))}
                >
                  {part.content}{' '}
                </span>
              );
            } else if (part.type === 'mention') {
              return (
                <span
                  key={idx}
                  className="text-blue-300 cursor-pointer hover:opacity-80 font-medium"
                  onClick={() => onAvatarClick?.(part.content.substring(1))}
                >
                  {part.content}{' '}
                </span>
              );
            }
            return <span key={idx}>{part.content}</span>;
          })}
        </div>

        {shouldShowMore && (
          <motion.button
            onClick={() => setShowFullCaption(!showFullCaption)}
            className="text-xs text-white/70 font-medium mt-1 hover:text-white transition-colors"
            whileHover={{ x: 4 }}
          >
            {showFullCaption ? 'Show less' : 'More'}
          </motion.button>
        )}
      </motion.div>

      {/* Hashtags */}
      {reel.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {reel.hashtags.slice(0, 3).map((tag) => (
            <motion.button
              key={tag}
              onClick={() => onHashtagClick?.(tag)}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-xs font-medium text-cyan-300 rounded-full transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              #{tag}
            </motion.button>
          ))}
          {reel.hashtags.length > 3 && (
            <span className="text-xs text-white/50 self-center">+{reel.hashtags.length - 3} more</span>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default VideoInfoSection;
