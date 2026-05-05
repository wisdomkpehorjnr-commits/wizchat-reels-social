import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, WifiOff } from 'lucide-react';
import { useLazyVideo, useMediaOptimization } from '@/hooks/useMediaOptimization';

interface OptimizedReelPlayerProps {
  src?: string;
  poster?: string;
  isActive?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

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
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  const { isDataSaverEnabled } = useMediaOptimization();
  const { 
    shouldLoad, 
    shouldAutoplay, 
    thumbnailUrl, 
    requestPlay, 
    setVisibility 
  } = useLazyVideo(src, poster);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisibility(entry.isIntersecting);
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    video.muted = false;

    if (isActive && shouldAutoplay && videoLoaded) {
      video.play().catch(() => {
        video.muted = true;
        video.play().then(() => {
          setTimeout(() => { video.muted = false; }, 100);
        }).catch(() => setShowPlayButton(true));
      });
      setIsPlaying(true);
      onPlay?.();
    } else if (!isActive) {
      video.pause();
      setIsPlaying(false);
      onPause?.();
    }
  }, [isActive, shouldAutoplay, shouldLoad, videoLoaded, onPlay, onPause]);

  useEffect(() => {
    if (isActive && !shouldAutoplay) setShowPlayButton(true);
  }, [isActive, shouldAutoplay]);

  const handleTap = useCallback(() => {
    if (!shouldLoad) { requestPlay(); return; }
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      setShowPlayButton(true);
      onPause?.();
    } else {
      video.muted = false;
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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden"
      onClick={handleTap}
    >
      {(!shouldLoad || !videoLoaded) && (thumbnailUrl || poster) && (
        <img src={thumbnailUrl || poster} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      )}

      {shouldLoad && src && (
        <video
          ref={videoRef}
          src={src}
          poster={thumbnailUrl || poster}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
          playsInline
          preload="metadata"
          muted={false}
          loop
          onLoadedData={handleVideoLoaded}
          onEnded={handleVideoEnded}
          onError={() => setShowPlayButton(true)}
        />
      )}

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
              {isDataSaverEnabled && !shouldLoad && (
                <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full text-white text-sm font-bold">
                  <WifiOff className="w-4 h-4" />
                  <span>Tap to play</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {shouldLoad && !videoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default OptimizedReelPlayer;
