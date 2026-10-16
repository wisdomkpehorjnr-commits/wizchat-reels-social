import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, MessageCircle, Share2 } from 'lucide-react';

interface Props {
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  disabled?: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  isDisliked?: boolean;
  dislikeCount?: number;
  onDislike?: () => void;
}

const fmt = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

const base =
  'relative flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-muted active:bg-muted disabled:opacity-50 select-none';

export const FbPostActions: React.FC<Props> = ({ isLiked, likeCount, commentCount, disabled, onLike, onComment, onShare, isDisliked, dislikeCount = 0, onDislike }) => {
  const [dislikeKey, setDislikeKey] = useState(0);
  const [likeKey, setLikeKey] = useState(0);
  const [commentKey, setCommentKey] = useState(0);
  const [shareKey, setShareKey] = useState(0);

  return (
    <div className="pt-2">
      {(likeCount > 0 || commentCount > 0) && (
        <div className="flex items-center justify-between px-1 pb-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {likeCount > 0 && (
              <>
                <motion.span
                  key={likeCount}
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <ThumbsUp className="h-2.5 w-2.5 fill-current" strokeWidth={2.5} />
                </motion.span>
                <span>{fmt(likeCount)}</span>
              </>
            )}
          </div>
          {commentCount > 0 && <span>{fmt(commentCount)} {commentCount === 1 ? 'comment' : 'comments'}</span>}
        </div>
      )}
      <div className="flex items-center border-t border-border pt-1">
        <button
          type="button"
          disabled={disabled}
          aria-label={isLiked ? 'Unlike' : 'Like'}
          aria-pressed={isLiked}
          onClick={() => { setLikeKey(k => k + 1); onLike(); }}
          className={`${base} ${isLiked ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <span className="relative inline-flex">
            <motion.span
              key={likeKey}
              initial={false}
              animate={likeKey ? { scale: [1, 1.45, 0.9, 1.1, 1], rotate: [0, -22, 8, -4, 0], y: [0, -5, 0] } : {}}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="inline-flex"
            >
              <ThumbsUp className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} strokeWidth={2.2} />
            </motion.span>
            <AnimatePresence>
              {isLiked && likeKey > 0 && (
                <motion.span
                  key={`burst-${likeKey}`}
                  initial={{ scale: 0.3, opacity: 0.7 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary"
                />
              )}
            </AnimatePresence>
          </span>
          <span>Like</span>
        </button>

        {onDislike && (
          <button
            type="button"
            disabled={disabled}
            aria-label="Dislike"
            aria-pressed={!!isDisliked}
            onClick={() => { setDislikeKey(k => k + 1); onDislike(); }}
            className={`${base} ${isDisliked ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            <motion.span
              key={dislikeKey}
              animate={dislikeKey ? { scale: [1, 1.35, 1], rotate: [0, 20, -6, 0], y: [0, 4, 0] } : {}}
              transition={{ duration: 0.5 }}
              className="inline-flex"
            >
              <ThumbsDown className={`h-5 w-5 ${isDisliked ? 'fill-current' : ''}`} strokeWidth={2.2} />
            </motion.span>
            {dislikeCount > 0 && <span>{fmt(dislikeCount)}</span>}
          </button>
        )}

        <button
          type="button"
          disabled={disabled}
          aria-label="Comment"
          onClick={() => { setCommentKey(k => k + 1); onComment(); }}
          className={`${base} text-muted-foreground`}
        >
          <motion.span
            key={commentKey}
            animate={commentKey ? { scale: [1, 1.25, 1], y: [0, -3, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="inline-flex"
          >
            <MessageCircle className="h-5 w-5" strokeWidth={2.2} />
          </motion.span>
          <span>Comment</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          aria-label="Share"
          onClick={() => { setShareKey(k => k + 1); onShare(); }}
          className={`${base} text-muted-foreground`}
        >
          <motion.span
            key={shareKey}
            animate={shareKey ? { x: [0, 5, -2, 0], rotate: [0, 15, 0], scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.45 }}
            className="inline-flex"
          >
            <Share2 className="h-5 w-5" strokeWidth={2.2} />
          </motion.span>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
  }
};

export default FbPostActions;
