import React, { useEffect, useRef } from 'react';

interface ReelPlayerProps {
  src?: string;
  isActive?: boolean;
  muted?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  poster?: string;
}

export const ReelPlayer: React.FC<ReelPlayerProps> = ({ src, isActive, muted = true, onPlay, onPause, onEnded, poster }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = muted;

    if (isActive) {
      // attempt to play when active
      const p = video.play();
      if (p && typeof p.then === 'function') p.catch(() => {});
      onPlay && onPlay();
    } else {
      video.pause();
      onPause && onPause();
    }
  }, [isActive, muted, onPlay, onPause]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handleEnded = () => onEnded && onEnded();
    v.addEventListener('ended', handleEnded);
    return () => v.removeEventListener('ended', handleEnded);
  }, [onEnded]);

  return (
    <div className="w-full h-screen flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="max-h-full w-auto h-full object-cover"
        playsInline
        webkit-playsinline="true"
        preload="metadata"
        controls={false}
      />
    </div>
  );
};

export default ReelPlayer;
