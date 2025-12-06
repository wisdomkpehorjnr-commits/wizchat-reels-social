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
  const [audioDuration, setAudioDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setAudioDuration(audio.duration);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
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
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const effectiveDuration = audioDuration || duration || 0;
  const progress = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  // Generate WhatsApp-style waveform bars
  const waveformBars = 28;
  const barHeights = Array.from({ length: waveformBars }, (_, i) => {
    const base = Math.sin((i / waveformBars) * Math.PI * 3) * 0.35;
    const noise = Math.sin(i * 1.2) * 0.25;
    return Math.max(0.15, Math.min(1, 0.45 + base + noise));
  });

  return (
    <div 
      className="flex items-center gap-2 min-w-[200px] max-w-[260px]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Hidden audio element - NO VIDEO ELEMENT EVER */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Avatar for incoming messages - WhatsApp style on left */}
      {!isOwn && userAvatar && (
        <div className="relative flex-shrink-0">
          <Avatar className="w-10 h-10 border-2 border-background shadow-sm">
            <AvatarImage src={userAvatar} />
            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
              {userName?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          {/* Small mic icon overlay */}
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
            <Mic className="w-2.5 h-2.5 text-primary-foreground" />
          </div>
        </div>
      )}

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isOwn 
            ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30' 
            : 'bg-foreground/10 hover:bg-foreground/15 dark:bg-white/10 dark:hover:bg-white/15'
        }`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className={`w-4 h-4 ${isOwn ? 'text-primary-foreground' : 'text-foreground'}`} fill="currentColor" />
        ) : (
          <Play className={`w-4 h-4 ml-0.5 ${isOwn ? 'text-primary-foreground' : 'text-foreground'}`} fill="currentColor" />
        )}
      </button>

      {/* Waveform + Progress Container */}
      <div className="flex-1 flex flex-col justify-center min-w-0 gap-1">
        {/* Waveform bars */}
        <div className="flex items-center gap-[2px] h-5">
          {barHeights.map((height, i) => {
            const barProgress = (i / (waveformBars - 1)) * 100;
            const isActive = barProgress <= progress;
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-all duration-100 ${
                  isOwn
                    ? isActive ? 'bg-primary-foreground' : 'bg-primary-foreground/40'
                    : isActive ? 'bg-foreground dark:bg-white' : 'bg-foreground/30 dark:bg-white/30'
                }`}
                style={{
                  height: `${height * 100}%`,
                  minHeight: '4px',
                  maxHeight: '18px',
                  transform: isPlaying && isActive 
                    ? `scaleY(${0.8 + Math.random() * 0.4})` 
                    : 'scaleY(1)',
                  transition: isPlaying 
                    ? 'transform 0.08s ease-out, background-color 0.1s' 
                    : 'transform 0.15s ease-out, background-color 0.1s',
                }}
              />
            );
          })}
        </div>

        {/* Time and progress indicator */}
        <div className="flex items-center justify-between">
          {/* Playhead dot indicator */}
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              isOwn 
                ? isPlaying ? 'bg-primary-foreground animate-pulse' : 'bg-primary-foreground/60'
                : isPlaying ? 'bg-foreground animate-pulse dark:bg-white' : 'bg-foreground/40 dark:bg-white/40'
            }`} />
            <span className={`text-[11px] font-medium tabular-nums ${
              isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'
            }`}>
              {formatTime(isPlaying ? currentTime : effectiveDuration)}
            </span>
          </div>
        </div>
      </div>

      {/* Playback speed toggle */}
      <button
        onClick={cyclePlaybackRate}
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all flex-shrink-0 ${
          isOwn
            ? 'bg-primary-foreground/20 text-primary-foreground/80 hover:bg-primary-foreground/30 hover:text-primary-foreground'
            : 'bg-foreground/10 text-muted-foreground hover:bg-foreground/15 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/15'
        }`}
      >
        {playbackRate}x
      </button>
    </div>
  );
};

export default VoiceMessagePlayer;