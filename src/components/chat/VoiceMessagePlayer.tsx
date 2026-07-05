import { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration: number;
  isOwn: boolean;
  fileName?: string;
  userAvatar?: string;
  userName?: string;
}

/**
 * Compact voice message bubble.
 * Small, neat, live-wavy animation while playing. Fully theme-aware.
 */
const VoiceMessagePlayer = ({ audioUrl, duration, isOwn }: VoiceMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [rate, setRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Deterministic 22-bar wave pattern per clip
  const bars = useMemo(() => {
    const count = 22;
    let seed = 0;
    for (let i = 0; i < audioUrl.length; i++) seed = ((seed << 5) - seed + audioUrl.charCodeAt(i)) | 0;
    return Array.from({ length: count }, (_, i) => {
      const x = Math.abs(Math.sin(seed + i * 1.7) * 0.6 + Math.cos(seed + i * 0.9) * 0.35);
      return Math.max(0.25, Math.min(1, x + 0.15));
    });
  }, [audioUrl]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onEnd = () => { setIsPlaying(false); setCurrentTime(0); };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) a.pause();
    else a.play().catch(() => {});
  };

  const cycleRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRate(r => (r === 1 ? 1.5 : r === 1.5 ? 2 : 1));
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-2 py-1.5 max-w-[220px] w-full border ${
        isOwn ? 'bg-primary/15 border-primary/25' : 'bg-muted border-border/50'
      }`}
      style={{ minWidth: 160 }}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" style={{ display: 'none' }} />

      <button
        onClick={toggle}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all"
      >
        {isPlaying
          ? <Pause className="w-3.5 h-3.5" fill="currentColor" />
          : <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />}
      </button>

      {/* Wavy bars */}
      <div className="flex-1 flex items-center gap-[2px] h-5 min-w-0">
        {bars.map((h, i) => {
          const barPct = ((i + 0.5) / bars.length) * 100;
          const active = barPct <= progress;
          const animDelay = `${(i % 6) * 0.08}s`;
          return (
            <span
              key={i}
              className={`flex-1 rounded-full transition-colors duration-150 ${
                active ? 'bg-primary' : isOwn ? 'bg-primary/35' : 'bg-muted-foreground/40'
              } ${isPlaying && active ? 'wave-bar-animate' : ''}`}
              style={{
                height: `${h * 100}%`,
                minHeight: 3,
                animationDelay: animDelay,
              }}
            />
          );
        })}
      </div>

      <button
        onClick={cycleRate}
        className="text-[9px] font-bold px-1 rounded bg-background/40 text-foreground/80 hover:bg-background/60 transition-colors"
      >
        {rate}x
      </button>

      <span className="text-[10px] tabular-nums text-muted-foreground font-medium">
        {fmt(isPlaying ? currentTime : duration)}
      </span>

      <style>{`
        @keyframes wave-bar {
          0%,100% { transform: scaleY(1); }
          50% { transform: scaleY(1.6); }
        }
        .wave-bar-animate {
          animation: wave-bar 0.9s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>
    </div>
  );
};

export default VoiceMessagePlayer;
