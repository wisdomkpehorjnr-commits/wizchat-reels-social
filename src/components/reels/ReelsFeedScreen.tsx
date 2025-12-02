import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Reel, Comment } from './types';
import { ReelsFeedProvider, useReelsFeed } from './state/ReelsFeedContext';
import { reelsApiService } from './services/ReelsApiService';
import { videoPlayerController } from './services/VideoPlayerController';
import { useTheme } from '../../contexts/ThemeContext';
import { themeManager, ReelTheme } from './theme';
import FullscreenVideoPlayer from './widgets/FullscreenVideoPlayer';
import ActionBar from './widgets/ActionBar';
import VideoInfoSection from './widgets/VideoInfoSection';
import CommentsBottomSheet from './widgets/CommentsBottomSheet';
import { useThrottledCallback } from './hooks';

interface InnerReelsFeedScreenProps {
  theme: ReelTheme;
}

const InnerReelsFeedScreen: React.FC<InnerReelsFeedScreenProps> = ({ theme }) => {
  const { state, actions } = useReelsFeed();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [selectedReelForComments, setSelectedReelForComments] = useState<Reel | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsPage, setCommentsPage] = useState(0);
  const lastLoadTimeRef = useRef<number>(0);
  const loadingRef = useRef(false);

  // Initial load
  useEffect(() => {
    const loadInitialReels = async () => {
      actions.setLoading(true);
      const reels = await reelsApiService.fetchReels(0);
      actions.addReels(reels);
      setCurrentPage(1);
      actions.setLoading(false);
    };

    loadInitialReels();
  }, []);

  // Handle scroll for infinite scroll and page snapping
  const handleScroll = useThrottledCallback(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight; // Full viewport height for fullscreen
    const newIndex = Math.round(scrollTop / itemHeight);

    // Update current index
    if (newIndex !== state.currentIndex) {
      actions.setCurrentIndex(newIndex);
    }

    // Check if near end for infinite scroll
    const totalHeight = container.scrollHeight;
    const scrollPercentage = (scrollTop + container.clientHeight) / totalHeight;

    if (scrollPercentage > 0.8 && !loadingRef.current && state.hasMore) {
      loadMoreReels();
    }
  }, 300);

  const loadMoreReels = async () => {
    if (loadingRef.current) return;
    if (Date.now() - lastLoadTimeRef.current < 2000) return; // Prevent rapid requests

    loadingRef.current = true;
    actions.setLoading(true);
    lastLoadTimeRef.current = Date.now();

    try {
      const reels = await reelsApiService.fetchReels(currentPage);
      if (reels.length === 0) {
        actions.setHasMore(false);
      } else {
        actions.addReels(reels);
        setCurrentPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Failed to load more reels:', error);
      actions.setError('Failed to load more reels');
    } finally {
      actions.setLoading(false);
      loadingRef.current = false;
    }
  };

  // Auto-play current reel
  useEffect(() => {
    const currentReel = state.reels[state.currentIndex];
    if (currentReel) {
      videoPlayerController.playReel(currentReel.id);
    }
  }, [state.currentIndex, state.reels]);

  // Snap to page on scroll end
  const handleScrollEnd = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const itemHeight = container.clientHeight;
    const scrollTop = container.scrollTop;
    const targetIndex = Math.round(scrollTop / itemHeight);
    const targetScrollTop = targetIndex * itemHeight;

    if (Math.abs(scrollTop - targetScrollTop) > 10) {
      container.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth',
      });
    }
  }, []);

  // Handle interactions
  const handleLike = useCallback(async (reelId: string) => {
    actions.toggleLike(reelId);
    const reel = state.reels.find((r) => r.id === reelId);
    if (reel?.isLiked) {
      await reelsApiService.likeReel(reelId);
    } else {
      await reelsApiService.unlikeReel(reelId);
    }
  }, [state.reels, actions]);

  const handleSave = useCallback(async (reelId: string) => {
    actions.toggleSave(reelId);
    const reel = state.reels.find((r) => r.id === reelId);
    if (reel?.isSaved) {
      await reelsApiService.saveReel(reelId);
    } else {
      await reelsApiService.unsaveReel(reelId);
    }
  }, [state.reels, actions]);

  const handleFollow = useCallback(async (userId: string) => {
    actions.toggleFollow(userId);
    const reel = state.reels.find((r) => r.userId === userId);
    if (reel?.isFollowing) {
      await reelsApiService.followUser(userId);
    } else {
      await reelsApiService.unfollowUser(userId);
    }
  }, [state.reels, actions]);

  const handleComment = useCallback((reelId: string) => {
    const reel = state.reels.find((r) => r.id === reelId);
    if (reel) {
      setSelectedReelForComments(reel);
      loadCommentsForReel(reel.id);
      setIsCommentsOpen(true);
    }
  }, [state.reels]);

  const loadCommentsForReel = async (reelId: string) => {
    setCommentsLoading(true);
    try {
      const comments = await reelsApiService.fetchComments(reelId, 0);
      setComments(comments);
      setCommentsPage(1);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handlePostComment = useCallback(
    async (text: string) => {
      if (!selectedReelForComments) return;

      const comment = await reelsApiService.postComment(selectedReelForComments.id, text);
      if (comment) {
        setComments((prev) => [comment, ...prev]);
      }
    },
    [selectedReelForComments]
  );

  const handleLoadMoreComments = useCallback(async () => {
    if (!selectedReelForComments) return;

    setCommentsLoading(true);
    try {
      const moreComments = await reelsApiService.fetchComments(
        selectedReelForComments.id,
        commentsPage
      );
      setComments((prev) => [...prev, ...moreComments]);
      setCommentsPage((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to load more comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  }, [selectedReelForComments, commentsPage]);

  const currentReel = state.reels[state.currentIndex];

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Feed Container with snap scrolling */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory"
        style={{
          scrollSnapType: 'y mandatory',
          scrollBehavior: 'smooth',
        }}
      >
        {state.reels.map((reel, index) => (
          <motion.div
            key={reel.id}
            className="w-full h-screen flex-shrink-0 relative snap-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Video Player */}
            <FullscreenVideoPlayer
              reel={reel}
              isActive={state.currentIndex === index}
              theme={theme}
            />

            {/* Action Bar */}
            {state.currentIndex === index && (
              <ActionBar
                reel={reel}
                theme={theme}
                onLike={handleLike}
                onComment={handleComment}
                onShare={() => reelsApiService.shareReel(reel)}
                onSave={handleSave}
                onDownload={() => reelsApiService.downloadVideo(reel)}
                onFollow={handleFollow}
              />
            )}

            {/* Video Info Section */}
            {state.currentIndex === index && (
              <VideoInfoSection
                reel={reel}
                theme={theme}
                onFollowClick={handleFollow}
                onHashtagClick={(hashtag) => {
                  console.log('Hashtag clicked:', hashtag);
                  // Navigate to hashtag page
                }}
                onAvatarClick={(userId) => {
                  console.log('Avatar clicked:', userId);
                  // Navigate to user profile
                }}
              />
            )}
          </motion.div>
        ))}

        {/* Loading Indicator */}
        {state.isLoading && (
          <div className="w-full h-screen flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Comments Bottom Sheet */}
      {selectedReelForComments && (
        <CommentsBottomSheet
          isOpen={isCommentsOpen}
          reel={selectedReelForComments}
          comments={comments}
          theme={theme}
          isLoading={commentsLoading}
          hasMore={comments.length >= 20}
          onClose={() => setIsCommentsOpen(false)}
          onLoadMore={handleLoadMoreComments}
          onPostComment={handlePostComment}
          onLikeComment={(commentId) => {
            reelsApiService.likeComment(commentId);
            setComments((prev) =>
              prev.map((c) =>
                c.id === commentId ? { ...c, isLiked: !c.isLiked, likesCount: c.isLiked ? c.likesCount - 1 : c.likesCount + 1 } : c
              )
            );
          }}
        />
      )}
    </div>
  );
};

export const ReelsFeedScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const theme = themeManager.getTheme(isDarkMode);

  return (
    <ReelsFeedProvider>
      <InnerReelsFeedScreen theme={theme} />
    </ReelsFeedProvider>
  );
};

export default ReelsFeedScreen;
