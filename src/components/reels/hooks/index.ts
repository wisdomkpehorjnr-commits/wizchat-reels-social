import { useEffect, useRef, useCallback, useState } from 'react';
import { videoPlayerController } from '../services/VideoPlayerController';
import { Reel } from '../types';

/**
 * Hook for managing video playback
 */
export const useVideoPlayer = (reel: Reel, videoElementRef: React.RefObject<HTMLVideoElement>) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    if (!videoElementRef.current) return;

    const element = videoElementRef.current;

    // Initialize player
    videoPlayerController.initializePlayer(reel, element);

    const handleTimeUpdate = () => {
      videoPlayerController.updatePlaybackState(reel.id);
      const state = videoPlayerController.getPlaybackState(reel.id);
      if (state) {
        setCurrentTime(state.currentTime);
        setDuration(state.duration);
      }
    };

    const handleLoadedMetadata = () => {
      videoPlayerController.updatePlaybackState(reel.id);
      const state = videoPlayerController.getPlaybackState(reel.id);
      if (state) {
        setDuration(state.duration);
      }
    };

    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);

    element.addEventListener('timeupdate', handleTimeUpdate);
    element.addEventListener('loadedmetadata', handleLoadedMetadata);
    element.addEventListener('waiting', handleWaiting);
    element.addEventListener('canplay', handleCanPlay);

    return () => {
      element.removeEventListener('timeupdate', handleTimeUpdate);
      element.removeEventListener('loadedmetadata', handleLoadedMetadata);
      element.removeEventListener('waiting', handleWaiting);
      element.removeEventListener('canplay', handleCanPlay);
    };
  }, [reel, videoElementRef]);

  const play = useCallback(async () => {
    await videoPlayerController.playReel(reel.id);
    setIsPlaying(true);
  }, [reel.id]);

  const pause = useCallback(async () => {
    await videoPlayerController.pauseReel(reel.id);
    setIsPlaying(false);
  }, [reel.id]);

  const togglePlayPause = useCallback(async () => {
    const newState = await videoPlayerController.togglePlayPause(reel.id);
    setIsPlaying(newState);
  }, [reel.id]);

  const seek = useCallback((time: number) => {
    videoPlayerController.seekTo(reel.id, time);
  }, [reel.id]);

  return {
    isPlaying,
    currentTime,
    duration,
    isBuffering,
    play,
    pause,
    togglePlayPause,
    seek,
  };
};

/**
 * Hook for handling gesture interactions
 */
export const useGestureHandler = () => {
  const tapTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTapRef = useRef<number>(0);
  const [doubleTapDetected, setDoubleTapDetected] = useState(false);

  const handleTap = useCallback((callback: () => void) => {
    const now = Date.now();
    const timeSinceLast = now - lastTapRef.current;

    if (timeSinceLast < 300) {
      // Double tap
      setDoubleTapDetected(true);
      clearTimeout(tapTimeoutRef.current);
      if (callback) callback();
      lastTapRef.current = 0;
    } else {
      // Single tap
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        setDoubleTapDetected(false);
      }, 300);
    }
  }, []);

  return { handleTap, doubleTapDetected };
};

/**
 * Hook for detecting when a video is visible
 */
export const useVideoVisibility = (ref: React.RefObject<HTMLDivElement>) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.7,
      }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return isVisible;
};

/**
 * Hook for managing scroll momentum and resistance
 */
export const useScrollMomentum = () => {
  const velocityRef = useRef<number>(0);
  const lastYRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const updateVelocity = useCallback((y: number) => {
    const now = Date.now();
    const dt = Math.max(1, now - lastTimeRef.current);

    if (lastTimeRef.current !== 0) {
      velocityRef.current = (y - lastYRef.current) / dt;
    }

    lastYRef.current = y;
    lastTimeRef.current = now;
  }, []);

  const getVelocity = useCallback(() => velocityRef.current, []);

  const resetVelocity = useCallback(() => {
    velocityRef.current = 0;
    lastTimeRef.current = 0;
  }, []);

  return {
    updateVelocity,
    getVelocity,
    resetVelocity,
  };
};

/**
 * Hook for haptic feedback
 */
export const useHaptic = () => {
  const triggerHaptic = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    if ('vibrate' in navigator) {
      const vibrationPatterns = {
        light: [10],
        medium: [20],
        heavy: [40],
      };
      navigator.vibrate(vibrationPatterns[intensity]);
    }
  }, []);

  return { triggerHaptic };
};

/**
 * Hook for debounced callbacks
 */
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  );
};

/**
 * Hook for throttled callbacks
 */
export const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): ((...args: Parameters<T>) => void) => {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        callback(...args);
        lastCallRef.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastCallRef.current = Date.now();
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay]
  );
};
