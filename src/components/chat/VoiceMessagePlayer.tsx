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
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

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
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
      });
    }
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

  // Generate waveform bars - WhatsApp style with more natural variation
  const waveformBars = 28;
  const barHeights = Array.from({ length: waveformBars }, (_, i) => {
    // Create a natural-looking waveform pattern
    const base = Math.sin((i / waveformBars) * Math.PI * 2.5) * 0.4;
    const noise = Math.sin(i * 0.8) * 0.3;
    return Math.max(0.2, Math.min(1, 0.5 + base + noise));
  });

  return (
    <div 
      className={`flex items-center gap-2.5 rounded-[18px] max-w-[70%] w-full ${
        isOwn 
          ? 'bg-[#DCF8C6] dark:bg-[#005C4B]' 
          : 'bg-[#F1F1F1] dark:bg-[#262D31]'
      }`}
      style={{ padding: '8px 12px', minWidth: '180px' }}
      data-testid="whatsapp-voice-bubble"
    >
      {/* Hidden audio element - NO CONTROLS */}
      <audio 
        ref={audioRef} 
        src={audioUrl} 
        preload="metadata"
        style={{ display: 'none' }}
      />
      
      {/* Avatar for incoming messages (left side) */}
      {!isOwn && userAvatar && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={userAvatar} />
          <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200">
            {userName?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Mic icon for incoming messages */}
      {!isOwn && (
        <Mic className="w-4 h-4 flex-shrink-0 text-[#696969] dark:text-gray-400" />
      )}

      {/* Play/Pause Button - Circular with triangle/pause icon */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isOwn 
            ? 'bg-[#25D366] hover:bg-[#20BA5A]' 
            : 'bg-[#25D366] hover:bg-[#20BA5A]'
        }`}
        style={{ outline: 'none', border: 'none' }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-white" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 ml-0.5 text-white" fill="currentColor" />
        )}
      </button>

      {/* Waveform and Progress */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        {/* Waveform bars (WhatsApp style) */}
        <div className="flex items-end gap-[2px] h-8 w-full relative select-none" style={{ minWidth: '84px' }}>
          {barHeights.map((height, i) => {
            const barProgress = (i / (waveformBars - 1)) * 100;
            const isActive = barProgress <= progress;
            const animatedHeight = isPlaying && isActive 
              ? height * (0.9 + Math.sin(Date.now() / 100 + i) * 0.2)
              : height;
            
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-all duration-150 ${
                  isOwn
                    ? isActive ? 'bg-[#075E54] dark:bg-white' : 'bg-[#075E54]/40 dark:bg-white/40'
                    : isActive ? 'bg-[#222] dark:bg-gray-200' : 'bg-gray-400 dark:bg-gray-600'
                }`}
                style={{
                  height: `${animatedHeight * 100}%`,
                  minHeight: '4px',
                  maxHeight: '28px',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Duration and Speed */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={`text-xs font-medium tabular-nums select-none ${
          isOwn 
            ? 'text-[#075E54] dark:text-white/90' 
            : 'text-[#323232] dark:text-gray-200'
        }`}>
          {formatTime(isPlaying ? currentTime : duration)}
        </span>
        <button
          onClick={cyclePlaybackRate}
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-all ${
            isOwn
              ? 'border-[#075E54]/30 dark:border-white/30 text-[#075E54] dark:text-white/80 bg-transparent hover:bg-[#075E54]/10 dark:hover:bg-white/10'
              : 'border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-200 bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
          style={{ minWidth: '26px', height: '18px', lineHeight: '16px' }}
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
};

export default VoiceMessagePlayer;
