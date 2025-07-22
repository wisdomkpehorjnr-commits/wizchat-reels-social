
import { useState, useRef } from 'react';
import { Mic, MicOff, Send, X } from 'lucide-react';
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
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

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Could not access microphone",
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
    resetRecorder();
    onCancel?.();
  };

  const resetRecorder = () => {
    setAudioBlob(null);
    setDuration(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (audioBlob) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-secondary rounded-lg">
        <audio controls className="flex-1">
          <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
        </audio>
        <span className="text-sm text-muted-foreground">
          {formatDuration(duration)}
        </span>
        <Button size="sm" onClick={sendVoiceMessage} className="bg-green-600 hover:bg-green-700">
          <Send className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={cancelRecording}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {isRecording ? (
        <>
          <div className="flex items-center space-x-2 text-red-600">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            <span className="text-sm font-medium">{formatDuration(duration)}</span>
          </div>
          <Button
            size="sm"
            onClick={stopRecording}
            className="bg-red-600 hover:bg-red-700"
          >
            <MicOff className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={cancelRecording}>
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          onClick={startRecording}
          variant="outline"
        >
          <Mic className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default VoiceRecorder;
