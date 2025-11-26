import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { Reel } from '../types';
import { useVideoPlayer, useGestureHandler } from '../hooks';
import { formatDuration } from '../utils';
import FloatingHearts from './FloatingHearts';
import { ReelTheme } from '../theme';

interface FullscreenVideoPlayerProps {
  reel: Reel;
  isActive: boolean;
  theme: ReelTheme;
  onTogglePlayPause?: (isPlaying: boolean) => void;
}

export const FullscreenVideoPlayer: React.FC<FullscreenVideoPlayerProps> = ({
  reel,
  isActive,
  theme,
  onTogglePlayPause,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isPlaying, currentTime, duration, isBuffering, togglePlayPause } = useVideoPlayer(reel, videoRef);
  const { handleTap, doubleTapDetected } = useGestureHandler();
  const [showPlayPause, setShowPlayPause] = useState(false);

  useEffect(() => {
    if (!isActive) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } else {
      if (videoRef.current && !isPlaying) {
        videoRef.current.play().catch(() => {
          // Autoplay may fail, user can tap to play
        });
      }
    }
  }, [isActive, isPlaying]);

  const handlePlayPauseClick = async () => {
    const newState = await togglePlayPause();
    onTogglePlayPause?.(newState);
    setShowPlayPause(true);
    setTimeout(() => setShowPlayPause(false), 1000);
  };

  const handleTapEvent = () => {
    handleTap(handlePlayPauseClick);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden"
      onClick={handleTapEvent}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="w-full h-full object-cover"
        playsInline
        loop
      />

      {/* Floating Hearts for double-tap */}
      <FloatingHearts />

      {/* Loading/Buffering Indicator */}
      {isBuffering && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </motion.div>
      )}

      {/* Play/Pause Overlay */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: showPlayPause ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        pointerEvents="none"
      >
        <motion.div
          className="flex items-center justify-center w-16 h-16 rounded-full bg-white/30 backdrop-blur-md"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.4 }}
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 text-white fill-white" />
          ) : (
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          )}
        </motion.div>
      </motion.div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <motion.div
          className={`h-full`}
          style={{ background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.secondary})` }}
          animate={{ width: `${(currentTime / duration) * 100}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>

      {/* Duration Display */}
      <div className="absolute bottom-2 right-2 text-xs font-medium text-white bg-black/40 px-2 py-1 rounded">
        {formatDuration(currentTime)} / {formatDuration(duration)}
      </div>

      {/* Network Status / Slow Network Indicator */}
      {isBuffering && (
        <motion.div
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-500/80 text-yellow-900 text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm"
          animate={{ opacity: [0.7, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          Buffering...
        </motion.div>
      )}
    </div>
  );
};

export default FullscreenVideoPlayer;
