import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart } from 'lucide-react';
import { Comment, Reel } from '../types';
import { ReelTheme } from '../theme';
import { formatTimeAgo, formatNumber } from '../utils';
import { useHaptic } from '../hooks';

interface CommentsBottomSheetProps {
  isOpen: boolean;
  reel: Reel;
  comments: Comment[];
  theme: ReelTheme;
  isLoading?: boolean;
  hasMore?: boolean;
  onClose?: () => void;
  onLoadMore?: () => void;
  onPostComment?: (text: string) => void;
  onLikeComment?: (commentId: string) => void;
  onReply?: (commentId: string, text: string) => void;
}

export const CommentsBottomSheet: React.FC<CommentsBottomSheetProps> = ({
  isOpen,
  reel,
  comments,
  theme,
  isLoading,
  hasMore,
  onClose,
  onLoadMore,
  onPostComment,
  onLikeComment,
  onReply,
}) => {
  const [commentText, setCommentText] = useState('');
  const [textRows, setTextRows] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { triggerHaptic } = useHaptic();

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommentText(e.target.value);
    // Auto-expand textarea
    const lines = e.target.value.split('\n').length;
    setTextRows(Math.min(Math.max(lines, 1), 4));
  };

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    triggerHaptic('medium');
    onPostComment?.(commentText);
    setCommentText('');
    setTextRows(1);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    if (element.scrollHeight - element.scrollTop <= 200) {
      onLoadMore?.();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-h-[80vh] flex flex-col"
            style={{ backgroundColor: theme.colors.surface }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragElastic={0.2}
            onDragEnd={(event, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose?.();
              }
            }}
          >
            {/* Handle Bar */}
            <div className="flex justify-center pt-3 pb-4">
              <div className="w-12 h-1 rounded-full bg-white/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b" style={{ borderColor: theme.colors.border }}>
              <h2 className="text-lg font-bold" style={{ color: theme.colors.text }}>
                Comments ({reel.commentsCount})
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" style={{ color: theme.colors.text }} />
              </button>
            </div>

            {/* Comments List */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
            >
              {isLoading && comments.length === 0 ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: theme.colors.border, borderTopColor: theme.colors.primary }} />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8">
                  <p style={{ color: theme.colors.textTertiary }}>No comments yet. Be the first!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    className="flex gap-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {/* Avatar */}
                    <img
                      src={comment.userAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`}
                      alt={comment.username}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />

                    {/* Comment Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className="text-sm font-semibold"
                          style={{ color: theme.colors.text }}
                        >
                          {comment.username}
                        </h4>
                        <span
                          className="text-xs"
                          style={{ color: theme.colors.textTertiary }}
                        >
                          {formatTimeAgo(comment.createdAt)}
                        </span>
                      </div>

                      <p
                        className="text-sm mt-1 break-words"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        {comment.text}
                      </p>

                      {/* Like Button */}
                      <button
                        onClick={() => onLikeComment?.(comment.id)}
                        className="flex items-center gap-1 mt-2 text-xs font-medium hover:opacity-70 transition-opacity"
                        style={{ color: comment.isLiked ? theme.colors.primary : theme.colors.textTertiary }}
                      >
                        <Heart className={`w-3 h-3 ${comment.isLiked ? 'fill-current' : ''}`} />
                        {formatNumber(comment.likesCount)}
                      </button>
                    </div>
                  </motion.div>
                ))
              )}

              {/* Load More Indicator */}
              {hasMore && !isLoading && (
                <div className="text-center py-4">
                  <button
                    onClick={onLoadMore}
                    className="text-sm font-medium"
                    style={{ color: theme.colors.primary }}
                  >
                    Load more comments
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ backgroundColor: theme.colors.border }} className="h-px" />

            {/* Comment Input */}
            <div className="p-4 space-y-3">
              <div className="flex gap-3">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=current-user"
                  alt="Your avatar"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />

                <div className="flex-1 flex gap-2">
                  <textarea
                    value={commentText}
                    onChange={handleTextChange}
                    placeholder="Add a comment..."
                    rows={textRows}
                    className="flex-1 resize-none rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all"
                    style={{
                      backgroundColor: theme.colors.surfaceVariant,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    }}
                  />

                  <button
                    onClick={handlePostComment}
                    disabled={!commentText.trim()}
                    className="self-end px-3 py-2 rounded-full font-semibold transition-all disabled:opacity-50"
                    style={{
                      background: commentText.trim() ? theme.colors.primary : theme.colors.border,
                      color: theme.colors.background,
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommentsBottomSheet;
