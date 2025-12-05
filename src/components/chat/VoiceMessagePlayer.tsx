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
      className={`flex items-center gap-2 p-2.5 rounded-[18px] max-w-[70%] ${
        isOwn 
          ? 'bg-[#1DB954]' 
          : 'bg-[#E5E5EA] dark:bg-[#2D2D2D]'
      }`}
      style={{ minWidth: '200px' }}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isOwn
            ? 'bg-white/20 hover:bg-white/30'
            : 'bg-[#1DB954] hover:bg-[#1DB954]/90'
        }`}
      >
        {isPlaying ? (
          <Pause className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-white'}`} fill="currentColor" />
        ) : (
          <Play className={`w-5 h-5 ml-0.5 ${isOwn ? 'text-white' : 'text-white'}`} fill="currentColor" />
        )}
      </button>

      {/* Waveform Container */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* Waveform Bars */}
        <div className="flex items-center gap-[2px] h-8 relative">
          {barHeights.map((height, i) => {
            const barProgress = (i / waveformBars) * 100;
            const isActive = barProgress <= progress;
            
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-all duration-150 ${
                  isOwn
                    ? isActive ? 'bg-white' : 'bg-white/40'
                    : isActive ? 'bg-[#1DB954]' : 'bg-gray-400 dark:bg-gray-500'
                }`}
                style={{
                  height: `${height * 100}%`,
                  minHeight: '4px',
                  maxHeight: '28px',
                  transform: isPlaying && isActive ? `scaleY(${0.8 + Math.random() * 0.4})` : 'scaleY(1)',
                  transition: isPlaying ? 'transform 0.1s ease-out' : 'transform 0.3s ease-out',
                }}
              />
            );
          })}
        </div>
        
        {/* Bottom Row: Duration + Speed */}
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-medium ${
            isOwn ? 'text-white/80' : 'text-gray-600 dark:text-gray-300'
          }`}>
            {formatTime(isPlaying ? currentTime : duration)}
          </span>
          
          <div className="flex items-center gap-2">
            {/* Playback Speed Button */}
            <button
              onClick={cyclePlaybackRate}
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-colors ${
                isOwn
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              {playbackRate}×
            </button>
            
            {/* Mic icon for incoming messages */}
            {!isOwn && (
              <Mic className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Avatar for incoming messages */}
      {!isOwn && userAvatar && (
        <Avatar className="w-8 h-8 flex-shrink-0 border-2 border-white dark:border-gray-700 shadow-sm">
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
