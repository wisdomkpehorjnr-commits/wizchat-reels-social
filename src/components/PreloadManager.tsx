import { useEffect } from 'react';

/**
 * Preload Manager - Pre-loads all lazy-loaded page chunks
 * Ensures pages work offline from first launch
 */

const preloadChunks = async () => {
  try {
    // Pre-load all lazy-loaded page chunks by importing them dynamically
    // This forces webpack/vite to bundle them and service worker can cache them
    const chunks = [
      () => import(/* webpackPrefetch: true */ '../pages/Reels'),
      () => import(/* webpackPrefetch: true */ '../pages/Chat'),
      () => import(/* webpackPrefetch: true */ '../pages/ChatRoom'),
      () => import(/* webpackPrefetch: true */ '../pages/Topics'),
      () => import(/* webpackPrefetch: true */ '../pages/TopicRoom'),
      () => import(/* webpackPrefetch: true */ '../pages/Profile'),
      () => import(/* webpackPrefetch: true */ '../pages/Friends'),
      () => import(/* webpackPrefetch: true */ '../pages/Admin'),
      () => import(/* webpackPrefetch: true */ '../pages/Settings'),
      () => import(/* webpackPrefetch: true */ '../pages/NotFound'),
      () => import(/* webpackPrefetch: true */ '../components/AvatarStudio'),
      () => import(/* webpackPrefetch: true */ '../pages/Premium'),
      () => import(/* webpackPrefetch: true */ '../pages/premium/Advertise'),
      () => import(/* webpackPrefetch: true */ '../pages/premium/VerifyAccount'),
      () => import(/* webpackPrefetch: true */ '../pages/premium/BeAnAdmin'),
      () => import(/* webpackPrefetch: true */ '../pages/premium/WizBoost'),
      () => import(/* webpackPrefetch: true */ '../pages/premium/UnlimitedWizAi'),
      () => import(/* webpackPrefetch: true */ '../pages/premium/PremiumThemes'),
      () => import(/* webpackPrefetch: true */ '../pages/premium/GPP'),
    ];

    // Load all chunks in parallel with Promise.allSettled to avoid blocking
    const results = await Promise.allSettled(chunks.map(chunk => chunk()));
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`[PreloadManager] Preloaded ${successful} chunks, ${failed} failed`);
  } catch (error) {
    console.warn('[PreloadManager] Preload error:', error);
  }
};

const PreloadManager = () => {
  useEffect(() => {
    // Preload chunks in the background
    // Use requestIdleCallback for non-blocking load
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        if (navigator.onLine) {
          preloadChunks();
        }
      }, { timeout: 5000 });
    } else {
      // Fallback to setTimeout if requestIdleCallback is not available
      const timer = setTimeout(() => {
        if (navigator.onLine) {
          preloadChunks();
        }
      }, 3000);

      return () => clearTimeout(timer);
    }

    // Also preload when coming back online
    const handleOnline = () => {
      preloadChunks();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // This component doesn't render anything
  return null;
};

export default PreloadManager;
