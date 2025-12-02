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
  const durationRef = useRef(0); // Track duration in ref for accurate capture

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
    durationRef.current = 0; // Reset duration ref
    setDuration(0); // Reset duration state
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        
        // Use ref value for accurate duration
        const finalDuration = durationRef.current;
        
        if (!canceledRef.current && finalDuration >= 0 && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: mediaRecorder.mimeType || 'audio/webm' 
          });
          
          // Play send sound immediately
          if (sendSoundRef.current) {
            sendSoundRef.current.play().catch(() => {});
          }
          
          // Send the voice message with actual duration
          onSend(audioBlob, finalDuration);
        }
        
        durationRef.current = 0;
        setDuration(0);
        setIsRecording(false);
        audioChunksRef.current = [];
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        cancelRecording();
      };

      // Start recording immediately
      mediaRecorder.start(100); // Collect data every 100ms for better quality
      setIsRecording(true);
      
      // Show 0:00 immediately
      durationRef.current = 0;
      setDuration(0);

      // Start timer immediately - update both state and ref
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setIsRecording(false);
      setDuration(0);
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Stop the timer first to capture final duration
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop recording - onstop will handle sending
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
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
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }
    
    durationRef.current = 0;
    setDuration(0);
    audioChunksRef.current = [];
    setIsRecording(false);
    onCancel();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    startRecording();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isRecording) return;
    e.preventDefault();
    
    const currentY = e.touches[0].clientY;
    const deltaY = startPosRef.current.y - currentY;

    // Show cancel hint when swiping up
    setIsCanceling(deltaY > 50);

    // Swipe up to cancel
    if (deltaY > 80) {
      cancelRecording();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRecording && !canceledRef.current) {
      stopRecording();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startRecording();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRecording && !canceledRef.current) {
      stopRecording();
    }
  };
  
  const handleMouseLeave = (e: React.MouseEvent) => {
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
        className="rounded-full bg-primary hover:bg-primary/90 active:bg-primary/80 touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        type="button"
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
