import { useState, useRef, useEffect } from 'react';
import { Mic, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

const VoiceRecorder = ({ onSend, onCancel }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (duration > 0) {
          onSend(audioBlob, duration);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
        setAmplitude(Math.random() * 100);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setDuration(0);
    audioChunksRef.current = [];
    onCancel();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setTouchPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    startRecording();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    setTouchPos({ x: currentX, y: currentY });

    const deltaY = startPosRef.current.y - currentY;
    const deltaX = startPosRef.current.x - currentX;

    // Swipe up to cancel
    if (deltaY > 100) {
      cancelRecording();
    }
    // Swipe left to cancel
    if (deltaX > 100) {
      cancelRecording();
    }
  };

  const handleTouchEnd = () => {
    stopRecording();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  return (
    <div className="relative">
      <Button
        size="icon"
        className="rounded-full bg-primary hover:bg-primary/90"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={(e) => {
          startPosRef.current = { x: e.clientX, y: e.clientY };
          startRecording();
        }}
        onMouseUp={stopRecording}
      >
        <Mic className="w-5 h-5" />
      </Button>

      <AnimatePresence>
        {isRecording && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="fixed inset-x-4 bottom-24 bg-background border-2 border-primary rounded-2xl shadow-xl p-6 z-50"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Swipe up or left to cancel
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center animate-pulse">
                    <Mic className="w-8 h-8 text-destructive" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">{formatDuration(duration)}</span>
                    <span className="text-xs text-muted-foreground">Recording...</span>
                  </div>
                </div>

                {/* Waveform visualization */}
                <div className="flex items-center gap-1 h-12">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary rounded-full"
                      animate={{
                        height: Math.random() * amplitude + 10,
                      }}
                      transition={{ duration: 0.1 }}
                    />
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="border-destructive text-destructive"
                  onClick={cancelRecording}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceRecorder;
