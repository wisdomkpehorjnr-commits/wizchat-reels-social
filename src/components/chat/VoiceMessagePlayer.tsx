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

const VoiceMessagePlayer = ({ 
  audioUrl, 
  duration, 
  isOwn, 
}: VoiceMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>();

  // Generate stable waveform pattern based on audioUrl hash
  const bars = useMemo(() => {
    const count = 32;
    let seed = 0;
    for (let i = 0; i < audioUrl.length; i++) seed = ((seed << 5) - seed + audioUrl.charCodeAt(i)) | 0;
    return Array.from({ length: count }, (_, i) => {
      const x = Math.abs(Math.sin(seed + i * 1.3) * 0.5 + Math.cos(seed + i * 0.7) * 0.3);
      return Math.max(0.15, Math.min(1, x + 0.2));
    });
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const cycleRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaybackRate(prev => prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 max-w-[280px] w-full ${
      isOwn ? 'bg-primary/15' : 'bg-muted'
    }`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" style={{ display: 'none' }} />

      {/* Play Button */}
      <button
        onClick={togglePlay}
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Waveform */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-end gap-[1.5px] h-7" style={{ minWidth: '80px' }}>
          {bars.map((h, i) => {
            const barPct = (i / (bars.length - 1)) * 100;
            const active = barPct <= progress;
            return (
              <div
                key={i}
                className={`w-[2.5px] rounded-full transition-all duration-100 ${
                  active
                    ? 'bg-primary'
                    : isOwn ? 'bg-primary/30' : 'bg-muted-foreground/30'
                }`}
                style={{
                  height: `${h * 100}%`,
                  minHeight: '3px',
                }}
              />
            );
          })}
        </div>

        {/* Time & Speed */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] tabular-nums text-muted-foreground font-medium">
            {fmt(isPlaying ? currentTime : duration)}
          </span>
          <button
            onClick={cycleRate}
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20 transition-colors"
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceMessagePlayer;
