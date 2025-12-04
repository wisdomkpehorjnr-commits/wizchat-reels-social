// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Check, CheckCheck, Clock, Reply, Download } from 'lucide-react';
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
  const tapTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isOwn = message.userId === user?.id;
  
  const messageAge = Date.now() - message.timestamp.getTime();
  const canEdit = isOwn && messageAge < 2 * 60 * 1000; // 2 minutes
  const isEdited = message.content.includes('[edited]') || (message as any).isEdited;

  // Add state
  const [selectMode, setSelectMode] = useState(false);

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
    }, 4000); // 4 seconds for pop-up (was 500)
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  // Handler for select option in context menu
  const handleContextSelect = () => {
    setSelectMode(true);
    if (onSelect) onSelect(message.id); // select this first message
    setShowContextMenu(false);
  };

  const handleTap = (e: React.MouseEvent) => {
    // If in selection mode, toggle selection
    if (selectMode && onSelect) {
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
      // Ultra fast return:
      setTimeout(() => {
        setSwipeOffset(0);
      }, 80); // much faster return!
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

        <div className={`flex items-end max-w-[70vw] ${isOwn ? 'flex-row-reverse ml-auto' : 'mr-auto'} w-full`}>
          {/* Avatar (incoming) */}
          {!isOwn && (
            <Avatar className="w-7 h-7 mr-2 flex-shrink-0">
              <AvatarImage src={message.user.avatar} />
              <AvatarFallback className="text-xs">{message.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          )}

          <div className="relative flex-1">
            {/* Select overlay (updated further in select-mode step) */}
            {isSelected && (
              <div className="absolute inset-0 rounded-2xl z-10 border-2 border-green-500/40 dark:border-green-500/30 bg-green-500/10 dark:bg-green-500/8 pointer-events-none" />
            )}
            <div
              className={
                `whatsapp-media-bubble${
                  isOwn
                    ? ' outgoing'
                    : ' incoming'
                }${isSelected ? ' selected' : ''}`
              }
              style={{
                background: isOwn ? '#1DB954' : '#ECEFF1',
                borderRadius: 18,
                padding: 8,
                maxWidth: '100%',
                boxShadow: '0 2px 4px rgba(0,0,0,0.07)',
                color: isOwn ? '#fff' : '#222',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                ...(isOwn && {
                  background: 'var(--primary, #1DB954)',
                  color: 'var(--primary-foreground, #fff)',
                }),
              }}
            >
              {/* Reply (if any) */}
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

              {/* --- Media/message rendering --- */}
              {(() => {
                // Detect
                const isVoiceMessage = message.mediaUrl && message.duration && message.duration > 0 && !message.content;
                const isAudioFile = message.mediaUrl && !message.duration && message.mediaUrl.match(/\.(mp3|wav|ogg|m4a|aac|webm)$/i);
                const isDocument = message.mediaUrl && !message.duration && !isAudioFile && 
                  (message.mediaUrl.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)$/i) || 
                  message.fileName || message.type === 'document');
                if (
                  message.type === 'image' ||
                  (message.mediaUrl && message.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) && !isDocument)
                ) {
                  return (
                    <div className="relative w-full" style={{ borderRadius: 12, overflow: 'hidden', margin: 0, padding: 0 }}>
                      <img
                        src={message.mediaUrl} alt="Shared"
                        onClick={() => {/* TODO: show fullscreen */}}
                        className="w-full max-w-full object-cover block select-none cursor-pointer rounded-xl"
                        style={{ borderRadius: 12, margin: 0, padding: 0, maxHeight: 320 }}
                      />
                      {message.content && <p className="text-sm mt-2 whitespace-pre-wrap break-words">{message.content}</p>}
                    </div>
                  );
                } else if (
                  message.type === 'video' ||
                  (message.mediaUrl && message.mediaUrl.match(/\.(mp4|webm|ogg|mov|avi)$/i) && !isDocument)
                ) {
                  return (
                    <div className="relative w-full" style={{ borderRadius: 12, overflow: 'hidden', margin: 0, padding: 0 }}>
                      <video
                        src={message.mediaUrl} 
                        className="w-full max-w-full object-cover block select-none rounded-xl"
                        style={{ borderRadius: 12, margin: 0, padding: 0, maxHeight: 320 }}
                        preload="metadata"
                        poster={message.thumbnailUrl}
                        onClick={() => {/* TODO: popout video */}}
                      />
                      {/* Play overlay */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          background: 'rgba(29, 185, 84, 0.95)',
                          borderRadius: '50%',
                          width: 48,
                          height: 48,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          cursor: 'pointer',
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          // TODO: Launch video modal/play inline
                        }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="white" opacity=".15"/><path d="M9.1 7.25C8.5 7.033 8 7.406 8 8.067V15.933C8 16.594 8.5 16.967 9.1 16.75L16 14.024V9.976L9.1 7.25Z" fill="white"/></svg>
                      </div>
                      {/* Duration corner badge (bottom right) */}
                      {message.duration && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 8,
                            right: 12,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(0,0,0,0.65)',
                            color: '#fff',
                            fontSize: 12,
                          }}
                        >{`${Math.floor(message.duration/60)}:${String(message.duration%60).padStart(2,'0')}`}</div>
                      )}
                      {message.content && <p className="text-sm mt-2 whitespace-pre-wrap break-words">{message.content}</p>}
                    </div>
                  );
                }
                if (isVoiceMessage || message.type === 'voice') {
                  return (
                    <div className="flex items-center w-full">
                      {!isOwn && <Avatar className="w-6 h-6 mr-2"><AvatarImage src={message.user.avatar} /><AvatarFallback>{message.user.name.charAt(0)}</AvatarFallback></Avatar>}
                      <div className="flex-1 flex items-center gap-3 py-1">
                        <VoiceMessagePlayer audioUrl={message.mediaUrl || ''} duration={message.duration || 0} isOwn={isOwn} fileName={message.fileName} />
                      </div>
                    </div>
                  );
                } else if (isAudioFile || message.type === 'audio') {
                  return (
                    <div className="flex items-center gap-3 w-full" style={{minHeight:40}}>
                      <div className={`w-10 h-10 flex items-center justify-center rounded-full ${isOwn ? 'bg-primary/20' : 'bg-primary/10'}`}>
                        <span className="text-xl">🎵</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[15px] font-semibold truncate ${isOwn ? 'text-primary-foreground' : 'text-foreground'}`}>{message.fileName || message.mediaUrl?.split('/').pop()?.split('?')[0] || 'Audio File'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <audio src={message.mediaUrl} controls className="w-full h-8 rounded-lg" preload="metadata" />
                          <span className="text-xs text-muted-foreground">{message.duration ? `${Math.floor(message.duration/60)}:${String(message.duration%60).padStart(2, '0')}` : ''}</span>
                        </div>
                      </div>
                    </div>
                  );
                } else if (isDocument || message.type === 'document') {
                  return (
                    <div className="w-full">
                      <DocumentMessage mediaUrl={message.mediaUrl || ''} fileName={message.fileName} fileSize={message.fileSize} fileType={message.mediaUrl?.split('.').pop() || ''} isOwn={isOwn} />
                    </div>
                  );
                } else {
                  // regular text
                  return <p className="text-[15px] whitespace-pre-wrap break-words text-clip leading-relaxed" style={{maxWidth:'100%'}}>{displayContent}</p>;
                }
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
          onSelect={handleContextSelect}
          onDeleteMultiple={onDeleteMultiple}
          onCopyMultiple={onCopyMultiple}
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
