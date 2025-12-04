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

  // Generate waveform bars - WhatsApp style
  const waveformBars = 28;
  const barHeights = Array.from({ length: waveformBars }, (_, i) => {
    // Create a natural-looking waveform pattern
    const base = Math.sin((i / waveformBars) * Math.PI * 2.5) * 0.4;
    const noise = Math.sin(i * 0.8) * 0.3;
    return Math.max(0.15, Math.min(1, 0.5 + base + noise));
  });

  return (
    <div 
      className={`flex items-center p-2.5 rounded-[18px] max-w-[70%] w-full shadow-sm ${
        isOwn 
          ? 'bg-[#1DB954]' 
          : 'bg-[#F1F1F1] dark:bg-[#262D31]'
      }`}
      style={{padding:'10px', minWidth:'140px'}}
      data-testid="whatsapp-voice-bubble"
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mr-3 shadow ${
          isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-[#1DB954] hover:bg-[#1DB954]/90'
        }`}
        style={{ outline: 'none', border: 'none' }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-white" fill="currentColor" />
        ) : (
          <Play className="w-5 h-5 ml-0.5 text-white" fill="currentColor" />
        )}
      </button>
      {/* Waveform */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        {/* Waveform bars (WhatsApp style) */}
        <div className="flex items-end gap-[2px] h-8 w-full relative select-none" style={{minWidth:'84px'}}>
          {barHeights.map((height, i) => {
            const barProgress = (i / (waveformBars-1)) * 100;
            const isActive = barProgress <= progress;
            return (
              <div
                key={i}
                className={`w-[3.2px] rounded-full transition-transform duration-100 ${
                  isOwn
                    ? isActive ? 'bg-white' : 'bg-white/50'
                    : isActive ? 'bg-[#222] dark:bg-gray-100' : 'bg-gray-400 dark:bg-gray-700'
                }`}
                style={{
                  height: `${height * 100}%`,
                  minHeight: '5px',
                  maxHeight: '28px',
                  transform: isPlaying && isActive ? `scaleY(${0.85 + Math.random() * 0.25})` : 'scaleY(1)',
                  transition: isPlaying ? 'transform 0.12s cubic-bezier(.68,-0.55,.27,1.55)' : 'transform 0.25s cubic-bezier(.68,-0.55,.27,1.55)',
                }}
              />
            );
          })}
        </div>
        {/* Bottom Row (duration, speed, mic) */}
        <div className="flex flex-col items-end justify-between h-8 ml-3 min-w-[36px]">
          {/* Duration/Mic/Speed in row */}
          <div className="flex items-center gap-1 mt-auto">
            {/* Mic on incoming */}
            {!isOwn && (
              <Mic className="w-3 h-3 text-[#696969] dark:text-gray-400 mr-[2px]" />
            )}
            <span className={`text-xs font-semibold tabular-nums select-none ${
              isOwn ? 'text-white/80' : 'text-[#323232] dark:text-gray-200'
            }`} style={{minWidth:'36px', textAlign:'right'}}>{formatTime(isPlaying ? currentTime : duration)}</span>
            {/* Speed (always show on desktop/mobile) */}
            <button
              onClick={cyclePlaybackRate}
              className={`ml-2 text-[11px] font-bold px-1.5 py-0.5 rounded-full border transition-all ${
                isOwn
                  ? 'border-white/40 text-white bg-white/20 hover:bg-white/30'
                  : 'border-gray-400 dark:border-gray-500 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-50 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              style={{ minWidth:'28px', height:'20px', lineHeight:'18px'}}
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>
      {/* Sender Avatar at right end (incoming) */}
      {!isOwn && userAvatar && (
        <Avatar className="w-8 h-8 flex-shrink-0 border-2 border-background dark:border-gray-700 ml-2 -mr-2 shadow-md" style={{marginLeft:'12px'}}>
          <AvatarImage src={userAvatar} />
          <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200">
            {userName?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default VoiceMessagePlayer;
