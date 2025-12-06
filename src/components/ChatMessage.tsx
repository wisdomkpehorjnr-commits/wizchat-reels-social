import { useState, useEffect, useRef } from 'react';
import { Check, CheckCheck, Clock, Reply, Download, Play, Volume2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import MessageContextMenu from './chat/MessageContextMenu';
import DeleteMessageDialog from './chat/DeleteMessageDialog';
import EditMessageDialog from './chat/EditMessageDialog';
import VoiceMessagePlayer from './chat/VoiceMessagePlayer';
import DocumentMessage from './chat/DocumentMessage';
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
  selectedMessages?: Set<string>;
  messages?: Message[];
  onDeleteMultiple?: () => void;
  onCopyMultiple?: () => void;
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
  selectedMessages,
  messages,
  onDeleteMultiple,
  onCopyMultiple,
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
    // 4 second delay for long press menu as requested
    longPressTimerRef.current = setTimeout(() => {
      if (selectedCount > 0 && onSelect) {
        onSelect(message.id);
      } else {
        setShowContextMenu(true);
      }
    }, 4000);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const handleTap = (e: React.MouseEvent) => {
    // If in selection mode, toggle selection
    if (selectedCount > 0 && onSelect) {
      onSelect(message.id);
      e.stopPropagation();
      return;
    }

    // Don't trigger tap if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('audio, video, button, [role="button"]')) {
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
      // Smooth return animation
      setTimeout(() => {
        setSwipeOffset(0);
      }, 200);
    } else {
      // Smooth return if not enough swipe
      setSwipeOffset(0);
    }
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
        dragElastic={0.2}
        dragMomentum={false}
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
        animate={{ x: isOwn ? -swipeOffset : swipeOffset }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
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

        {/* WhatsApp-style: max 70% width for all message bubbles */}
        <div className={`flex items-end space-x-2 max-w-[70%] ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {!isOwn && (
            <Avatar className="w-6 h-6 flex-shrink-0">
              <AvatarImage src={message.user.avatar} />
              <AvatarFallback className="text-xs">
                {message.user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          )}

          <div className="relative">
            {/* Selection overlay - transparent green glass effect */}
            {isSelected && (
              <div className="absolute inset-0 bg-green-500/20 dark:bg-green-500/15 backdrop-blur-[2px] rounded-2xl pointer-events-none z-10 border-2 border-green-500/40 dark:border-green-500/30" />
            )}

            {/* WhatsApp-style bubble: rounded corners, soft shadow, theme-aware */}
            <div
              className={`px-2 py-2 rounded-[18px] transition-all shadow-sm ${
                isSelected
                  ? 'bg-green-500/10 dark:bg-green-500/8'
                  : isOwn
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-[hsl(var(--muted))] dark:bg-[hsl(220,10%,18%)]'
              }`}
              style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            >
              {/* Reply reference - WhatsApp style */}
              {replyToMessage && (
                <div className={`mb-2 pb-2 border-l-4 ${isOwn ? 'border-primary-foreground/40' : 'border-primary/40'} pl-2 pr-2 bg-black/5 dark:bg-white/5 rounded-l-md`}>
                  <p className={`text-xs font-semibold mb-0.5 ${isOwn ? 'text-primary-foreground/90' : 'text-primary'}`}>
                    {replyToMessage.user.name}
                  </p>
                  {replyToMessage.type === 'text' ? (
                    <p className={`text-xs line-clamp-2 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {replyToMessage.content}
                    </p>
                  ) : replyToMessage.type === 'image' ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                        <span className="text-[8px]">📷</span>
                      </div>
                      <p className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        Photo
                      </p>
                    </div>
                  ) : replyToMessage.type === 'video' ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                        <span className="text-[8px]">🎥</span>
                      </div>
                      <p className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        Video
                      </p>
                    </div>
                  ) : replyToMessage.type === 'voice' ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                        <span className="text-[8px]">🎤</span>
                      </div>
                      <p className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        Voice message
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {(() => {
                // Detect message type - VOICE MESSAGES MUST NEVER RENDER AS VIDEO
                // Voice message detection: has mediaUrl with audio extension OR has duration OR type is 'voice'
                const audioExtensions = /\.(mp3|wav|ogg|m4a|aac|webm|opus|flac)$/i;
                const videoExtensions = /\.(mp4|mov|avi|mkv|wmv)$/i;
                const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
                const documentExtensions = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)$/i;
                
                // Check if this is a voice/audio message - PRIORITY CHECK
                const hasAudioExtension = message.mediaUrl && audioExtensions.test(message.mediaUrl);
                const hasDuration = message.duration && message.duration > 0;
                const isVoiceType = message.type === 'voice' || message.type === 'audio';
                const isVoiceMessage = isVoiceType || hasAudioExtension || (message.mediaUrl && hasDuration && !videoExtensions.test(message.mediaUrl));
                
                // Document check
                const isDocument = message.mediaUrl && (
                  documentExtensions.test(message.mediaUrl) || 
                  message.fileName?.match(documentExtensions) ||
                  message.type === 'document'
                );
                
                // Image check - but NOT if it's a voice message
                const isImage = !isVoiceMessage && !isDocument && (
                  message.type === 'image' || 
                  (message.mediaUrl && imageExtensions.test(message.mediaUrl))
                );
                
                // Video check - but NOT if it's a voice message or audio file
                const isVideo = !isVoiceMessage && !isDocument && !isImage && (
                  message.type === 'video' || 
                  (message.mediaUrl && videoExtensions.test(message.mediaUrl))
                );
                
                // VOICE MESSAGE - ALWAYS USE CUSTOM AUDIO PLAYER, NEVER VIDEO
                if (isVoiceMessage) {
                  return (
                    <VoiceMessagePlayer 
                      audioUrl={message.mediaUrl || ''} 
                      duration={message.duration || 0}
                      isOwn={isOwn}
                      fileName={message.fileName}
                      userAvatar={!isOwn ? message.user.avatar : undefined}
                      userName={!isOwn ? message.user.name : undefined}
                    />
                  );
                }
                
                if (isImage) {
                  // WhatsApp-style image: fills bubble, 12px border radius, preserves aspect ratio
                  return (
                    <div className="relative -mx-2 -mt-2 overflow-hidden">
                      <img 
                        src={message.mediaUrl} 
                        alt="Shared" 
                        className="w-full max-w-[280px] rounded-t-[16px] rounded-b-[12px] object-cover cursor-pointer hover:opacity-95 transition-opacity" 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(message.mediaUrl, '_blank');
                        }}
                      />
                      {message.content && (
                        <p className="text-sm mt-2 px-2 whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                    </div>
                  );
                }
                
                if (isVideo) {
                  // WhatsApp-style video: thumbnail with play button and duration
                  return (
                    <div className="relative -mx-2 -mt-2 overflow-hidden">
                      <div className="relative">
                        <video 
                          src={message.mediaUrl}
                          className="w-full max-w-[280px] rounded-t-[16px] rounded-b-[12px] object-cover cursor-pointer"
                          preload="metadata"
                          onClick={(e) => {
                            e.stopPropagation();
                            const video = e.target as HTMLVideoElement;
                            if (video.paused) {
                              video.play();
                              video.controls = true;
                            }
                          }}
                        />
                        {/* Play button overlay */}
                        <div 
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
                            <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
                          </div>
                        </div>
                        {/* Duration badge */}
                        {message.duration && (
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-md">
                            {Math.floor(message.duration / 60)}:{String(Math.floor(message.duration % 60)).padStart(2, '0')}
                          </div>
                        )}
                      </div>
                      {message.content && (
                        <p className="text-sm mt-2 px-2 whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                    </div>
                  );
                }
                
                if (isDocument) {
                  // Document message with icon and download
                  return (
                    <div className="space-y-2">
                      <DocumentMessage
                        mediaUrl={message.mediaUrl || ''}
                        fileName={message.fileName}
                        fileSize={message.fileSize}
                        fileType={message.mediaUrl?.split('.').pop() || ''}
                        isOwn={isOwn}
                      />
                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                    </div>
                  );
                }
                
                // Regular text message (default)
                return <p className="text-sm whitespace-pre-wrap break-words">{displayContent}</p>;
              })()}

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
                    className={`fixed ${isOwn ? 'right-2 sm:right-auto sm:left-auto' : 'left-2 sm:left-auto'} bottom-20 sm:bottom-auto sm:absolute sm:${isOwn ? 'right-0' : 'left-0'} sm:bottom-full sm:mb-2 z-50`}
                  >
                    <div className="flex items-center gap-1 p-2 bg-background/95 backdrop-blur-md rounded-full shadow-lg border-2 border-primary/20 max-w-[calc(100vw-4rem)] sm:max-w-none overflow-x-auto"
                      style={{ 
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                      }}
                    >
                      {REACTION_EMOJIS.map((emoji) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReactionSelect(emoji);
                          }}
                          className="h-10 w-10 sm:h-8 sm:w-8 p-0 text-xl sm:text-lg hover:scale-125 transition-transform hover:bg-secondary flex-shrink-0"
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
          onCopy={selectedCount > 1 ? (onCopyMultiple || handleCopy) : handleCopy}
          onForward={handleForwardToChats}
          onReply={() => onReply && onReply(message)}
          onDelete={selectedCount > 1 ? (onDeleteMultiple || (() => setShowDeleteDialog(true))) : () => setShowDeleteDialog(true)}
          onEdit={() => setShowEditDialog(true)}
          onClose={() => setShowContextMenu(false)}
          onDeleteMultiple={onDeleteMultiple}
          onCopyMultiple={onCopyMultiple}
          onSelect={onSelect ? () => onSelect(message.id) : undefined}
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
