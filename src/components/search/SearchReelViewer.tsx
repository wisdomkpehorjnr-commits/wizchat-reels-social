import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import ReelsFeed from '@/components/ReelsModern/ReelsFeed';

interface SearchReelViewerProps {
  reelId: string;
  onClose: () => void;
}

/**
 * Full-screen reel viewer opened from Global Search.
 * Reuses the main Reels feed so the tapped reel plays with the exact same
 * experience, with the vertical swipe feed of other reels beneath it.
 */
const SearchReelViewer: React.FC<SearchReelViewerProps> = ({ reelId, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[200] bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close reel"
        className="absolute top-4 left-4 z-[210] h-10 w-10 rounded-full bg-background/50 backdrop-blur-xl border border-foreground/20 flex items-center justify-center text-foreground transition-transform active:scale-95"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="h-full w-full overflow-hidden">
        <ReelsFeed initialReelId={reelId} />
      </div>
    </motion.div>
  );
};

export default SearchReelViewer;
