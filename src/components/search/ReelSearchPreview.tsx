import React, { useEffect, useRef, useState } from 'react';
import { Video, Heart, MessageCircle } from 'lucide-react';

interface Props {
  videoUrl?: string;
  posterUrl?: string;
  title: string;
  likes?: number;
  comments?: number;
  onClick: () => void;
}

/**
 * Reel search result preview — shows reel thumbnail/frame, NEVER profile picture.
 */
const ReelSearchPreview: React.FC<Props> = ({ videoUrl, posterUrl, title, likes, comments, onClick }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [generatedPoster, setGeneratedPoster] = useState<string | null>(null);

  useEffect(() => {
    if (posterUrl || !videoUrl || generatedPoster) return;
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = v.videoWidth || 240;
        canvas.height = v.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        setGeneratedPoster(canvas.toDataURL('image/jpeg', 0.6));
      } catch {}
    };
    v.addEventListener('loadeddata', onLoaded, { once: true });
    return () => v.removeEventListener('loadeddata', onLoaded);
  }, [videoUrl, posterUrl, generatedPoster]);

  const poster = posterUrl || generatedPoster;

  return (
    <button onClick={onClick} className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted group">
      {poster ? (
        <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      ) : videoUrl ? (
        <video
          ref={videoRef}
          src={`${videoUrl}#t=0.1`}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center"><Video className="w-8 h-8 text-muted-foreground" /></div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-xs font-medium text-white truncate text-left">{title}</p>
        <div className="flex items-center gap-2 text-[10px] text-white/90 mt-0.5">
          <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{likes ?? 0}</span>
          <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{comments ?? 0}</span>
        </div>
      </div>
    </button>
  );
};

export default ReelSearchPreview;
