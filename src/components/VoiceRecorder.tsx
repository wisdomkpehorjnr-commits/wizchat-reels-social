
import { useState, useRef } from 'react';
import { Mic, MicOff, Send, X, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onVoiceMessage: (audioBlob: Blob, duration: number) => void;
  onCancel?: () => void;
}

const VoiceRecorder = ({ onVoiceMessage, onCancel }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playAudio = () => {
    if (audioBlob && !isPlaying) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audioRef.current = audio;
      audio.play();
      setIsPlaying(true);
      
      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      audioRef.current = null;
    }
  };

  const sendVoiceMessage = () => {
    if (audioBlob) {
      onVoiceMessage(audioBlob, duration);
      resetRecorder();
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    if (isPlaying) {
      stopAudio();
    }
    resetRecorder();
    onCancel?.();
  };

  const resetRecorder = () => {
    setAudioBlob(null);
    setDuration(0);
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current = null;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (audioBlob) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-secondary/50 rounded-lg border">
        <Button
          size="sm"
          variant="outline"
          onClick={isPlaying ? stopAudio : playAudio}
          className="h-8 w-8 p-0"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        
        <div className="flex-1 flex items-center space-x-2">
          <div className="flex-1 h-1 bg-muted rounded-full">
            <div className="h-full bg-primary rounded-full w-full"></div>
          </div>
          <span className="text-sm text-muted-foreground font-mono">
            {formatDuration(duration)}
          </span>
        </div>
        
        <Button size="sm" onClick={sendVoiceMessage} className="h-8 bg-green-600 hover:bg-green-700 text-white">
          <Send className="h-4 w-4" />
        </Button>
        
        <Button size="sm" variant="outline" onClick={cancelRecording} className="h-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {isRecording ? (
        <>
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <div className="w-3 h-3 bg-red-600 dark:bg-red-400 rounded-full animate-pulse" />
            <span className="text-sm font-mono">{formatDuration(duration)}</span>
          </div>
          <Button
            size="sm"
            onClick={stopRecording}
            className="h-8 bg-red-600 hover:bg-red-700"
          >
            <MicOff className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={cancelRecording} className="h-8">
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          onClick={startRecording}
          variant="outline"
          className="h-8"
        >
          <Mic className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default VoiceRecorder;
