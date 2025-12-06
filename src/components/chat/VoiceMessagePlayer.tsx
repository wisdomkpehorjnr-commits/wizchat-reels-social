import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  fileName,
  userAvatar,
  userName 
}: VoiceMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaybackRate(prev => prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate compact waveform bars - WhatsApp style
  const waveformBars = 20;
  const barHeights = Array.from({ length: waveformBars }, (_, i) => {
    const base = Math.sin((i / waveformBars) * Math.PI * 2.5) * 0.4;
    const noise = Math.sin(i * 0.8) * 0.3;
    return Math.max(0.2, Math.min(1, 0.5 + base + noise));
  });

  return (
    <div 
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl ${
        isOwn 
          ? 'bg-primary' 
          : 'bg-muted dark:bg-muted/50'
      }`}
      style={{ maxWidth: '260px', minWidth: '160px' }}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Play/Pause Button - Compact */}
      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isOwn 
            ? 'bg-white/20 hover:bg-white/30' 
            : 'bg-primary hover:bg-primary/90'
        }`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-white" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 ml-0.5 text-white" fill="currentColor" />
        )}
      </button>

      {/* Waveform - Compact */}
      <div className="flex items-center gap-[1.5px] h-6 flex-1 min-w-0">
        {barHeights.map((height, i) => {
          const barProgress = (i / (waveformBars - 1)) * 100;
          const isActive = barProgress <= progress;
          return (
            <div
              key={i}
              className={`w-[2px] rounded-full transition-all ${
                isOwn
                  ? isActive ? 'bg-white' : 'bg-white/40'
                  : isActive ? 'bg-foreground' : 'bg-muted-foreground/40'
              }`}
              style={{
                height: `${height * 100}%`,
                minHeight: '3px',
                maxHeight: '20px',
                transform: isPlaying && isActive ? `scaleY(${0.85 + Math.random() * 0.25})` : 'scaleY(1)',
                transition: isPlaying ? 'transform 0.1s ease-out' : 'transform 0.2s ease-out',
              }}
            />
          );
        })}
      </div>

      {/* Duration & Controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={`text-[11px] font-medium tabular-nums ${
          isOwn ? 'text-white/80' : 'text-muted-foreground'
        }`}>
          {formatTime(isPlaying ? currentTime : duration)}
        </span>
        
        {/* Speed toggle */}
        <button
          onClick={cyclePlaybackRate}
          className={`text-[10px] font-semibold px-1 py-0.5 rounded transition-all ${
            isOwn
              ? 'text-white/70 hover:text-white'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {playbackRate}x
        </button>
      </div>

      {/* Mic icon for incoming - compact */}
      {!isOwn && (
        <Mic className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      )}

      {/* Avatar for incoming - compact */}
      {!isOwn && userAvatar && (
        <Avatar className="w-6 h-6 flex-shrink-0 border border-background">
          <AvatarImage src={userAvatar} />
          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
            {userName?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default VoiceMessagePlayer;