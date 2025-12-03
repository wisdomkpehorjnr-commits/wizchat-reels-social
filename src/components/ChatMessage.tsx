import { useState, useEffect, useRef } from 'react';
import { Check, CheckCheck, Clock, Reply } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import MessageContextMenu from './chat/MessageContextMenu';
import DeleteMessageDialog from './chat/DeleteMessageDialog';
import EditMessageDialog from './chat/EditMessageDialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ChatMessageProps {
  message: Message;
  onReaction: (emoji: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string, deleteForEveryone: boolean) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onPin?: (messageId: string) => void;
  onSelect?: (messageId: string) => void;
  isSelected?: boolean;
  selectedCount?: number;
  isPinned?: boolean;
  replyToMessage?: Message;
}

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '👏'];

const ChatMessage = ({ 
  message, 
  onReaction,
  onEdit,
  onDelete,
  onReply,
  onForward,
  onPin,
  onSelect,
  isSelected = false,
  selectedCount = 0,
  isPinned = false,
  replyToMessage,
}: ChatMessageProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showReactions, setShowReactions] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const tapTimerRef = useRef<NodeJS.Timeout>();
  const longPressTimerRef = useRef<NodeJS.Timeout>();
  const isOwn = message.userId === user?.id;
  
  const messageAge = Date.now() - message.timestamp.getTime();
  const canEdit = isOwn && messageAge < 2 * 60 * 1000; // 2 minutes
  const isEdited = message.content.includes('[edited]') || (message as any).isEdited;

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      if (selectedCount > 0 && onSelect) {
        onSelect(message.id);
      } else {
        setShowContextMenu(true);
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const handleTap = () => {
    // If in selection mode, toggle selection
    if (selectedCount > 0 && onSelect) {
      onSelect(message.id);
      return;
    }

    setTapCount(prev => prev + 1);

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    if (tapCount === 1) {
      // Double tap - show reactions
      setShowReactions(true);
      setTapCount(0);
    } else {
      tapTimerRef.current = setTimeout(() => {
        setTapCount(0);
      }, 300);
    }
  };

  const handleReactionSelect = (emoji: string) => {
    onReaction(emoji);
    setShowReactions(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content.replace(' [edited]', ''));
    toast({ title: "Copied", description: "Message copied to clipboard" });
  };

  const handleForwardToChats = () => {
    if (onForward) onForward(message);
    navigate('/chat');
  };

  const handleEdit = (newContent: string) => {
    if (onEdit) {
      onEdit(message.id, newContent);
    }
  };

  const handleDrag = (event: any, info: PanInfo) => {
    if (info.offset.x > 0) {
      setSwipeOffset(Math.min(info.offset.x, 80));
    }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.x > 50 && onReply) {
      onReply(message);
    }
    setSwipeOffset(0);
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

  const displayContent = message.content.replace(' [edited]', '');

  return (
    <>
      <motion.div 
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group relative`}
        drag="x"
        dragConstraints={{ left: 0, right: 80 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          if (selectedCount > 0 && onSelect) {
            onSelect(message.id);
          } else {
            setShowContextMenu(true);
          }
        }}
      >
        {/* Swipe reply indicator */}
        <AnimatePresence>
          {swipeOffset > 20 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"
            >
              <Reply className="w-4 h-4 text-primary" />
            </motion.div>
          )}
        </AnimatePresence>

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
            {/* Selection overlay */}
            {isSelected && (
              <div className="absolute inset-0 bg-primary/10 rounded-2xl pointer-events-none z-10 border-2 border-primary/30" />
            )}

            <div
              className={`px-4 py-2 rounded-2xl ${
                isOwn
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {/* Reply reference */}
              {replyToMessage && (
                <div className={`mb-2 pb-2 border-b ${isOwn ? 'border-primary-foreground/20' : 'border-border'}`}>
                  <p className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    ↩ {replyToMessage.user.name}
                  </p>
                  <p className={`text-xs truncate ${isOwn ? 'text-primary-foreground/80' : 'text-foreground/80'}`}>
                    {replyToMessage.content.substring(0, 50)}...
                  </p>
                </div>
              )}

              {message.type === 'text' ? (
                <p className="text-sm whitespace-pre-wrap break-words">{displayContent}</p>
              ) : message.type === 'image' ? (
                <img src={message.mediaUrl} alt="Shared" className="max-w-full rounded-lg" />
              ) : message.type === 'video' ? (
                <video src={message.mediaUrl} controls className="max-w-full rounded-lg" />
              ) : message.type === 'voice' ? (
                <audio src={message.mediaUrl} controls />
              ) : null}

              <div className="flex items-center justify-end gap-1 mt-1">
                {(isEdited || message.content.includes('[edited]')) && (
                  <span className={`text-[9px] ${isOwn ? 'text-primary-foreground/50' : 'text-muted-foreground'}`}>
                    edited
                  </span>
                )}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReactionSelect(emoji);
                          }}
                          className="h-8 w-8 p-0 text-lg hover:scale-125 transition-transform hover:bg-secondary"
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
      </motion.div>

      {/* Context Menu */}
      {showContextMenu && (
        <MessageContextMenu
          message={message}
          isOwn={isOwn}
          canEdit={canEdit}
          isPinned={isPinned}
          selectedCount={selectedCount > 0 ? selectedCount : 1}
          onPin={() => {
            if (onPin) onPin(message.id);
          }}
          onCopy={handleCopy}
          onForward={handleForwardToChats}
          onReply={() => onReply && onReply(message)}
          onDelete={() => setShowDeleteDialog(true)}
          onEdit={() => setShowEditDialog(true)}
          onClose={() => setShowContextMenu(false)}
        />
      )}

      {/* Delete Dialog */}
      <DeleteMessageDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onDeleteForMe={() => onDelete && onDelete(message.id, false)}
        onDeleteForEveryone={() => onDelete && onDelete(message.id, true)}
        isOwn={isOwn}
      />

      {/* Edit Dialog */}
      <EditMessageDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        currentContent={displayContent}
        onSave={handleEdit}
      />
    </>
  );
};

export default ChatMessage;
