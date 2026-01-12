import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { useLazyVideo, useMediaOptimization } from '@/hooks/useMediaOptimization';

interface OptimizedReelPlayerProps {
  src?: string;
  poster?: string;
  isActive?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

/**
 * Optimized Reel Player with:
 * - Thumbnail-first loading
 * - Tap-to-play on mobile data
 * - Auto-play only on WiFi
 * - Local caching of viewed videos
 * - Memory-efficient unloading when off-screen
 */
export const OptimizedReelPlayer: React.FC<OptimizedReelPlayerProps> = ({
  src,
  poster,
  isActive = false,
  onPlay,
  onPause,
  onEnded
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  const { isOnWifi, isDataSaverEnabled } = useMediaOptimization();
  const { 
    shouldLoad, 
    shouldAutoplay, 
    thumbnailUrl, 
    requestPlay, 
    setVisibility 
  } = useLazyVideo(src, poster);

  // Track visibility for lazy loading
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisibility(entry.isIntersecting);
        
        // Unload video when not visible to save memory
        if (!entry.isIntersecting && videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [setVisibility]);

  // Handle active state and autoplay
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    video.muted = isMuted;

    if (isActive && shouldAutoplay && videoLoaded) {
      video.play().catch(() => {
        // Autoplay blocked, show play button
        setShowPlayButton(true);
      });
      setIsPlaying(true);
      onPlay?.();
    } else if (!isActive) {
      video.pause();
      setIsPlaying(false);
      onPause?.();
    }
  }, [isActive, shouldAutoplay, shouldLoad, videoLoaded, isMuted, onPlay, onPause]);

  // Show play button when data saver is on or on cellular
  useEffect(() => {
    if (isActive && !shouldAutoplay) {
      setShowPlayButton(true);
    }
  }, [isActive, shouldAutoplay]);

  const handleTap = useCallback(() => {
    if (!shouldLoad) {
      // First tap loads the video
      requestPlay();
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      setShowPlayButton(true);
      onPause?.();
    } else {
      video.play().catch(console.error);
      setIsPlaying(true);
      setShowPlayButton(false);
      onPlay?.();
    }
  }, [shouldLoad, isPlaying, requestPlay, onPlay, onPause]);

  const handleVideoLoaded = useCallback(() => {
    setVideoLoaded(true);
    setShowPlayButton(!shouldAutoplay);
  }, [shouldAutoplay]);

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
    setShowPlayButton(true);
    onEnded?.();
  }, [onEnded]);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(prev => !prev);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  }, [isMuted]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden"
      onClick={handleTap}
    >
      {/* Thumbnail/Poster - Always show first */}
      {(!shouldLoad || !videoLoaded) && (thumbnailUrl || poster) && (
        <img
          src={thumbnailUrl || poster}
          alt="Video thumbnail"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {/* Video Element - Only load when needed */}
      {shouldLoad && src && (
        <video
          ref={videoRef}
          src={src}
          poster={thumbnailUrl || poster}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
          playsInline
          webkit-playsinline="true"
          preload="metadata"
          muted={isMuted}
          loop
          onLoadedData={handleVideoLoaded}
          onEnded={handleVideoEnded}
          onError={() => setShowPlayButton(true)}
        />
      )}

      {/* Play Button Overlay */}
      <AnimatePresence>
        {(showPlayButton || (!shouldLoad && isActive)) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Play className="w-10 h-10 text-white fill-white ml-1" />
              </div>
              
              {/* Data saver indicator */}
              {isDataSaverEnabled && !shouldLoad && (
                <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full text-white text-sm">
                  <WifiOff className="w-4 h-4" />
                  <span>Tap to play</span>
                </div>
              )}
              
              {!isDataSaverEnabled && !isOnWifi && !shouldLoad && (
                <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full text-white text-sm">
                  <WifiOff className="w-4 h-4 text-yellow-400" />
                  <span>Mobile data - Tap to play</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Network Status Indicator */}
      <div className="absolute top-4 left-4 z-50">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
          isOnWifi ? 'bg-green-500/80 text-white' : 'bg-yellow-500/80 text-black'
        }`}>
          {isOnWifi ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>WiFi</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Data</span>
            </>
          )}
        </div>
      </div>

      {/* Mute Toggle */}
      {shouldLoad && videoLoaded && (
        <button
          onClick={toggleMute}
          className="absolute bottom-24 right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>
      )}

      {/* Loading indicator when video is loading */}
      {shouldLoad && !videoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default OptimizedReelPlayer;
