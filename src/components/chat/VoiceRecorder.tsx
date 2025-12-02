import { useState, useRef, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

const VoiceRecorder = ({ onSend, onCancel }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isCanceling, setIsCanceling] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const canceledRef = useRef(false);
  const sendSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize send sound
    sendSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSl+zPDTgjMGHm7A7+OZSA0PVavk8LJiHAdEo+Hzu2ohBSl+zPDTgjMGHm7A7+OZSA0PVavk8LJiHAc=');
    sendSoundRef.current.volume = 0.3;
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    canceledRef.current = false;
    setIsCanceling(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        
        if (!canceledRef.current && duration > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          // Play send sound immediately
          if (sendSoundRef.current) {
            sendSoundRef.current.play().catch(() => {});
          }
          // Send the voice message
          onSend(audioBlob, duration);
        }
        
        setDuration(0);
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    canceledRef.current = true;
    setIsCanceling(true);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    setDuration(0);
    audioChunksRef.current = [];
    onCancel();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    startRecording();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isRecording) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = startPosRef.current.y - currentY;

    // Show cancel hint when swiping up
    setIsCanceling(deltaY > 50);

    // Swipe up to cancel
    if (deltaY > 80) {
      cancelRecording();
    }
  };

  const handleTouchEnd = () => {
    if (isRecording && !canceledRef.current) {
      stopRecording();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startRecording();
  };

  const handleMouseUp = () => {
    if (isRecording && !canceledRef.current) {
      stopRecording();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      <Button
        size="icon"
        className="rounded-full bg-primary hover:bg-primary/90"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Mic className="w-5 h-5" />
      </Button>

      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-20 left-4 right-4 z-50"
          >
            <div className={`bg-background border-2 ${isCanceling ? 'border-destructive' : 'border-primary'} rounded-xl shadow-lg p-3 mx-auto max-w-xs`}>
              <p className={`text-xs text-center mb-2 ${isCanceling ? 'text-destructive' : 'text-muted-foreground'}`}>
                {isCanceling ? '↑ Release to cancel' : '↑ Swipe up to cancel'}
              </p>
              
              <div className="flex items-center justify-center gap-3">
                <div className={`w-10 h-10 rounded-full ${isCanceling ? 'bg-destructive/20' : 'bg-primary/20'} flex items-center justify-center`}>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Mic className={`w-5 h-5 ${isCanceling ? 'text-destructive' : 'text-primary'}`} />
                  </motion.div>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-lg font-semibold">{formatDuration(duration)}</span>
                  <span className="text-[10px] text-muted-foreground">Recording...</span>
                </div>
                
                {/* Mini waveform */}
                <div className="flex items-center gap-0.5 h-6">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className={`w-0.5 ${isCanceling ? 'bg-destructive' : 'bg-primary'} rounded-full`}
                      animate={{
                        height: [4, Math.random() * 16 + 8, 4],
                      }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceRecorder;
