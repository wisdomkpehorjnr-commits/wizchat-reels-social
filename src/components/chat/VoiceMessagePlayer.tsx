import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration: number;
  isOwn: boolean;
}

const VoiceMessagePlayer = ({ audioUrl, duration, isOwn }: VoiceMessagePlayerProps) => {
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

  const togglePlay = () => {
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

  return (
    <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isOwn
            ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground'
            : 'bg-primary/20 hover:bg-primary/30 text-primary'
        }`}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className={`w-5 h-5 ${isOwn ? 'ml-0.5' : 'ml-0.5'}`} />
        )}
      </button>

      <div className={`flex-1 flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Waveform visualization */}
        <div className="flex-1 h-8 flex items-center gap-0.5 px-2">
          {[...Array(20)].map((_, i) => {
            const barHeight = isPlaying 
              ? Math.random() * 100 
              : Math.sin((i / 20) * Math.PI * 2) * 30 + 30;
            return (
              <motion.div
                key={i}
                className={`flex-1 rounded-full ${
                  isOwn ? 'bg-primary-foreground/40' : 'bg-primary/40'
                }`}
                animate={{
                  height: `${barHeight}%`,
                }}
                transition={{
                  duration: 0.3,
                  repeat: isPlaying ? Infinity : 0,
                  repeatType: 'reverse',
                }}
                style={{ minHeight: '4px' }}
              />
            );
          })}
        </div>

        {/* Time and speed */}
        <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className={`text-xs font-mono ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {formatTime(isPlaying ? currentTime : duration)}
          </span>
          <button
            onClick={() => setPlaybackRate(playbackRate === 1 ? 2 : 1)}
            className={`text-xs px-1.5 py-0.5 rounded ${
              isOwn
                ? 'bg-primary-foreground/10 text-primary-foreground/70 hover:bg-primary-foreground/20'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            }`}
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceMessagePlayer;

