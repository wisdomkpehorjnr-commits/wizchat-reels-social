import { useState, useEffect, useRef } from 'react';
import { Check, CheckCheck, Clock, Smile } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessageProps {
  message: Message;
  onReaction: (emoji: string) => void;
}

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '👏'];

const ChatMessage = ({ message, onReaction }: ChatMessageProps) => {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef<NodeJS.Timeout>();
  const isOwn = message.userId === user?.id;

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

  const handleDoubleTap = () => {
    setTapCount(prev => prev + 1);

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    if (tapCount === 1) {
      // Double tap detected
      setShowReactions(true);
      setTapCount(0);
    } else {
      // Wait for second tap
      tapTimerRef.current = setTimeout(() => {
        setTapCount(0);
      }, 300);
    }
  };

  const handleReactionSelect = (emoji: string) => {
    onReaction(emoji);
    setShowReactions(false);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const renderStatusIcon = () => {
    if (!isOwn) return null;

    if (message.status === 'pending') {
      return <Clock className="w-3 h-3 text-muted-foreground/50 animate-pulse" />;
    }
    if (message.status === 'sent') {
      return <Check className="w-3 h-3 text-primary" />;
    }
    if (message.status === 'delivered') {
      return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
    }
    if (message.status === 'read') {
      return <CheckCheck className="w-3 h-3 text-primary" />;
    }
    return null;
  };

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group relative`}
      onClick={handleDoubleTap}
    >
      <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {!isOwn && (
          <Avatar className="w-6 h-6 flex-shrink-0">
            <AvatarImage src={message.user.avatar} />
            <AvatarFallback className="text-xs">
              {message.user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="relative">
          <div
            className={`px-4 py-2 rounded-2xl ${
              isOwn
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}
          >
            {message.type === 'text' ? (
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            ) : message.type === 'image' ? (
              <img src={message.mediaUrl} alt="Shared" className="max-w-full rounded-lg" />
            ) : message.type === 'video' ? (
              <video src={message.mediaUrl} controls className="max-w-full rounded-lg" />
            ) : message.type === 'voice' ? (
              <audio src={message.mediaUrl} controls />
            ) : null}

            <div className="flex items-center justify-end gap-1 mt-1">
              <span className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {formatTime(message.timestamp)}
              </span>
              {renderStatusIcon()}
            </div>
          </div>

          {/* Reactions display */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 ml-2">
              {Object.entries(
                message.reactions.reduce((acc: { [key: string]: number }, reaction) => {
                  acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                  return acc;
                }, {})
              ).map(([emoji, count]) => (
                <div
                  key={emoji}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-accent text-xs"
                >
                  <span>{emoji}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Reaction picker */}
          <AnimatePresence>
            {showReactions && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setShowReactions(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className={`absolute ${isOwn ? 'right-0' : 'left-0'} bottom-full mb-2 z-50`}
                >
                  <div className="flex items-center gap-1 p-2 bg-background rounded-full shadow-lg border-2 border-primary/20">
                    {REACTION_EMOJIS.map((emoji) => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReactionSelect(emoji)}
                        className="h-10 w-10 p-0 text-xl hover:scale-125 transition-transform hover:bg-secondary"
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;