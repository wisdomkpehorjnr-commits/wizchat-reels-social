import React from 'react';
import { ReelsFeedScreen } from '@/components/reels';

/**
 * Modern TikTok-style Reels page with full-featured feed
 * 
 * Features:
 * - Fullscreen vertical video feed with page snapping
 * - Gesture-enabled player (tap to pause/play, double-tap to like)
 * - Right-side action bar (Like, Comment, Share, Save, Download, Follow)
 * - Comments bottom sheet with real-time updates
 * - Auto-play/pause based on visibility
 * - Infinite scroll with video preloading
 * - Fully theme-aware with smooth animations
 * - Optimistic UI updates with haptic feedback
 * - Video caching and intelligent memory management
 */
const ReelsPage = () => {
  return <ReelsFeedScreen />;
};

export default ReelsPage;
