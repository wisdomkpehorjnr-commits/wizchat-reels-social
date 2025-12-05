import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // WhatsApp-style waveform bars
  const waveformBars = 25;
  const barHeights = Array.from({ length: waveformBars }, (_, i) => 
    Math.sin((i / waveformBars) * Math.PI * 3) * 35 + 25
  );

  return (
    <div className={`flex items-center gap-2 py-1 min-w-[200px] max-w-[260px] ${isOwn ? '' : ''}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Play button */}
      <button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isOwn
            ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground'
            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
        }`}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Waveform and time */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Waveform */}
        <div className="flex items-center gap-[2px] h-6">
          {barHeights.map((height, i) => {
            const isActive = (i / waveformBars) * 100 <= progress;
            return (
              <motion.div
                key={i}
                className={`w-[3px] rounded-full transition-colors ${
                  isOwn
                    ? isActive ? 'bg-primary-foreground' : 'bg-primary-foreground/30'
                    : isActive ? 'bg-primary' : 'bg-primary/30'
                }`}
                animate={{
                  height: isPlaying ? `${Math.random() * 50 + 20}%` : `${height}%`,
                }}
                transition={{
                  duration: isPlaying ? 0.15 : 0.3,
                  repeat: isPlaying ? Infinity : 0,
                  repeatType: 'reverse',
                }}
                style={{ minHeight: '4px', maxHeight: '24px' }}
              />
            );
          })}
        </div>
        
        {/* Time and speed controls */}
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-mono ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {formatTime(isPlaying ? currentTime : duration)}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPlaybackRate(playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1);
              }}
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                isOwn
                  ? 'bg-primary-foreground/10 text-primary-foreground/70 hover:bg-primary-foreground/20'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              {playbackRate}x
            </button>
            <Volume2 className={`w-3.5 h-3.5 ${isOwn ? 'text-primary-foreground/50' : 'text-muted-foreground'}`} />
          </div>
        </div>
      </div>

      {/* Profile picture for incoming messages - WhatsApp style */}
      {!isOwn && userAvatar && (
        <Avatar className="w-9 h-9 flex-shrink-0 border-2 border-background shadow-sm">
          <AvatarImage src={userAvatar} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {userName?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default VoiceMessagePlayer;
