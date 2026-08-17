import React, { useEffect, useRef, useState } from 'react';
import { Clapperboard } from 'lucide-react';

interface ReelResultTileProps {
  videoUrl?: string;
  posterUrl?: string;
  onOpen: () => void;
}

/**
 * Instagram-Reels style search tile: full-bleed 9:16 video thumbnail,
 * no play button / overlay clutter. First tap starts a muted inline
 * preview, second tap opens the immersive reel viewer.
 */
const ReelResultTile: React.FC<ReelResultTileProps> = ({ videoUrl, posterUrl, onOpen }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewing, setPreviewing] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (previewing) {
      v.play().catch(() => {});
    } else {
      v.pause();
      try { v.currentTime = 0; } catch {}
    }
  }, [previewing]);

  const handleClick = () => {
    if (!previewing && videoUrl) setPreviewing(true);
    else onOpen();
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden bg-muted transition-transform active:scale-[0.97]"
    >
      {videoUrl ? (
        <video
          ref={videoRef}
          src={`${videoUrl}#t=0.1`}
          poster={posterUrl}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || null)}
        />
      ) : posterUrl ? (
        <img src={posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center">
          <Clapperboard className="w-7 h-7 text-muted-foreground" />
        </span>
      )}

      {duration != null && Number.isFinite(duration) && (
        <span className="absolute bottom-2 right-2 rounded-md bg-background/60 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
          {fmt(duration)}
        </span>
      )}
    </button>
  );
};

export default ReelResultTile;
