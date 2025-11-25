import { useEffect } from 'react';
import { useTabManager } from '@/contexts/TabManagerContext';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';

/**
 * Hook to preload tab data in the background after app launch
 */
export const useTabPreloader = () => {
  const { preloadTab, isTabPreloaded } = useTabManager();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Preload tab data in background after a short delay
    const preloadTimer = setTimeout(() => {
      // Preload Chat friends
      if (!isTabPreloaded('/chat')) {
        dataService.getFriends()
          .then(friends => {
            preloadTab('/chat', { friends });
          })
          .catch(() => {
            // Silently fail - user will see skeleton
            preloadTab('/chat');
          });
      }

      // Preload Friends list
      if (!isTabPreloaded('/friends')) {
        dataService.getFriends()
          .then(friends => {
            preloadTab('/friends', { friends });
          })
          .catch(() => {
            preloadTab('/friends');
          });
      }

      // Preload Reels
      if (!isTabPreloaded('/reels')) {
        dataService.getPosts()
          .then(posts => {
            const videoReels = posts.filter(post => 
              post.videoUrl || post.isReel || post.mediaType === 'video'
            );
            preloadTab('/reels', { reels: videoReels });
          })
          .catch(() => {
            preloadTab('/reels');
          });
      }

      // Preload Topics
      if (!isTabPreloaded('/topics')) {
        // Topics will be loaded by the component itself
        preloadTab('/topics');
      }
    }, 1000); // Wait 1 second after app load to not interfere with initial render

    return () => clearTimeout(preloadTimer);
  }, [user, preloadTab, isTabPreloaded]);
};

