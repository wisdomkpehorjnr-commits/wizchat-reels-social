import { useEffect, useRef } from 'react';
import { useTabManager } from '@/contexts/TabManagerContext';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';

/**
 * Hook to preload tab data in the background
 */
export const useTabPreloader = (tab: string) => {
  const { setCachedData, getCachedData, isTabPreloaded, setTabLoading } = useTabManager();
  const { user } = useAuth();
  const preloadedRef = useRef(false);

  useEffect(() => {
    if (!user || preloadedRef.current) return;

    const preloadData = async () => {
      try {
        setTabLoading(tab, true);

        switch (tab) {
          case '/chat':
            // Preload friends list for chat
            try {
              const friends = await dataService.getFriends();
              setCachedData(tab, { friends });
            } catch (error) {
              console.error('Error preloading chat data:', error);
            }
            break;

          case '/friends':
            // Preload friends list
            try {
              const friends = await dataService.getFriends();
              setCachedData(tab, { friends });
            } catch (error) {
              console.error('Error preloading friends data:', error);
            }
            break;

          case '/reels':
            // Preload reels
            try {
              const allPosts = await dataService.getPosts();
              const videoReels = allPosts.filter(post => 
                post.videoUrl || post.isReel || post.mediaType === 'video'
              );
              setCachedData(tab, { reels: videoReels });
            } catch (error) {
              console.error('Error preloading reels data:', error);
            }
            break;

          case '/topics':
            // Preload topics (if there's a method for it)
            // This would need to be implemented in dataService
            break;

          default:
            break;
        }
      } catch (error) {
        console.error(`Error preloading ${tab}:`, error);
      } finally {
        setTabLoading(tab, false);
        preloadedRef.current = true;
      }
    };

    // Delay preloading to not block initial render
    const timer = setTimeout(preloadData, 500);
    return () => clearTimeout(timer);
  }, [tab, user, setCachedData, setTabLoading]);

  return {
    cachedData: getCachedData(tab),
    isPreloaded: isTabPreloaded(tab)
  };
};

