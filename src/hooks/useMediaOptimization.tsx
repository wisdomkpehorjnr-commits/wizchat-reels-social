/**
 * Hook for using media optimization service in React components
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  mediaOptimizationService, 
  NetworkInfo, 
  DataSaverSettings 
} from '@/services/mediaOptimizationService';

export function useMediaOptimization() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>(
    mediaOptimizationService.getNetworkInfo()
  );
  const [settings, setSettings] = useState<DataSaverSettings>(
    mediaOptimizationService.getDataSaverSettings()
  );
  const [cacheSize, setCacheSize] = useState(0);

  useEffect(() => {
    // Poll network info (Network API events don't always fire)
    const interval = setInterval(() => {
      setNetworkInfo(mediaOptimizationService.getNetworkInfo());
      setCacheSize(mediaOptimizationService.getCacheSize());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<DataSaverSettings>) => {
    mediaOptimizationService.saveDataSaverSettings(newSettings);
    setSettings(mediaOptimizationService.getDataSaverSettings());
  }, []);

  const clearCache = useCallback(async () => {
    await mediaOptimizationService.clearCache();
    setCacheSize(0);
  }, []);

  return {
    networkInfo,
    settings,
    updateSettings,
    cacheSize,
    clearCache,
    isOnWifi: mediaOptimizationService.isOnWifi(),
    isOnCellular: mediaOptimizationService.isOnCellular(),
    shouldAutoplay: mediaOptimizationService.shouldAutoplay(),
    shouldAutoDownload: mediaOptimizationService.shouldAutoDownload(),
    shouldPreloadVideos: mediaOptimizationService.shouldPreloadVideos(),
    isDataSaverEnabled: mediaOptimizationService.isDataSaverEnabled(),
    videoQuality: mediaOptimizationService.getVideoQuality(),
  };
}

/**
 * Hook for cached media loading
 */
export function useCachedMedia(url: string | undefined, type: 'video' | 'image' | 'audio') {
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) {
      setCachedUrl(null);
      return;
    }

    let mounted = true;
    setLoading(true);

    mediaOptimizationService.loadMedia(url, type)
      .then((loadedUrl) => {
        if (mounted) {
          setCachedUrl(loadedUrl);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setCachedUrl(url); // Fallback to original
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      // Revoke blob URL on cleanup if it was created
      if (cachedUrl && cachedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cachedUrl);
      }
    };
  }, [url, type]);

  return { cachedUrl: cachedUrl || url, loading, error };
}

/**
 * Hook for lazy video loading with thumbnail-first approach
 */
export function useLazyVideo(videoUrl: string | undefined, thumbnailUrl?: string) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  
  const shouldAutoplay = mediaOptimizationService.shouldAutoplay();
  const isDataSaverEnabled = mediaOptimizationService.isDataSaverEnabled();

  // Determine if video should load based on visibility and settings
  useEffect(() => {
    if (!videoUrl) return;
    
    if (isDataSaverEnabled) {
      // In data saver mode, only load when user explicitly requests
      setShouldLoad(hasPlayed);
    } else if (shouldAutoplay && isVisible) {
      // On WiFi with autoplay, load when visible
      setShouldLoad(true);
    } else {
      // On mobile data, only load when user taps play
      setShouldLoad(hasPlayed);
    }
  }, [videoUrl, isVisible, hasPlayed, shouldAutoplay, isDataSaverEnabled]);

  const requestPlay = useCallback(() => {
    setHasPlayed(true);
    setShouldLoad(true);
  }, []);

  const setVisibility = useCallback((visible: boolean) => {
    setIsVisible(visible);
  }, []);

  return {
    shouldLoad,
    shouldAutoplay: shouldAutoplay && !isDataSaverEnabled,
    thumbnailUrl: thumbnailUrl || mediaOptimizationService.getVideoThumbnailUrl(videoUrl || ''),
    requestPlay,
    setVisibility,
    isDataSaverEnabled
  };
}
