import { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, Check, X, Reply, Save, Forward, Pin, ThumbsUp, Laugh, Smile, Hands, Clap, Frown, Surprise, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';

interface MessageItemProps {
  message: Message;
  onEdit: (messageId: string, newContent: string) => void;
  onDelete: (messageId: string) => void;
  onLongPress?: (message: Message) => void;
  onSwipeReply?: (message: Message) => void;
  onSelect?: (messageId: string, selected: boolean) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  isSelected?: boolean;
  selectedCount?: number;
}

const EMOJI_REACTIONS = [
  { emoji: '👍', icon: ThumbsUp, name: 'thumbs' },
  { emoji: '😂', icon: Laugh, name: 'laugh' },
  { emoji: '😊', icon: Smile, name: 'smile' },
  { emoji: '🙏', icon: Hands, name: 'pray' },
  { emoji: '👏', icon: Clap, name: 'clap' },
  { emoji: '😢', icon: Frown, name: 'cry' },
  { emoji: '😮', icon: Surprise, name: 'surprise' },
  { emoji: '😔', icon: Heart, name: 'sad' },
];

const MessageItem = ({ 
  message, 
  onEdit, 
  onDelete,
  onLongPress,
  onSwipeReply,
  onSelect,
  onReaction,
  isSelected = false,
  selectedCount = 0
}: MessageItemProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState<string[]>([]);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const messageRef = useRef<HTMLDivElement>(null);
  
  const isOwn = message.userId === user?.id;
  const messageAge = Date.now() - message.timestamp.getTime();
  const canEdit = isOwn && messageAge < 5 * 60 * 1000; // 5 minutes
  
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handleLongPressStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    touchStartX.current = clientX;
    touchStartY.current = clientY;
    
    longPressTimer.current = setTimeout(() => {
      if (onLongPress) {
        onLongPress(message);
        setShowReactions(true);
      }
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
    handleLongPressStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = Math.abs(currentY - touchStartY.current);
    
    // Only allow swipe if horizontal movement is greater than vertical
    if (deltaX > 0 && deltaX > deltaY && isOwn) {
      setSwipeOffset(Math.min(deltaX, 100));
    }
    
    // Cancel long press if moved too much
    if (Math.abs(deltaX) > 10 || deltaY > 10) {
      handleLongPressEnd();
    }
  };

  const handleTouchEnd = () => {
    handleLongPressEnd();
    
    if (swipeOffset > 50 && onSwipeReply) {
      onSwipeReply(message);
    }
    
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (selectedCount > 0) {
      // Selection mode
      if (onSelect) {
        onSelect(message.id, !isSelected);
      }
    } else {
      // Normal click
      if (showReactions) {
        setShowReactions(false);
      }
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    
    try {
      await dataService.editMessage(message.id, editContent.trim());
      onEdit(message.id, editContent.trim());
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Message edited successfully"
      });
    } catch (error) {
      console.error('Error editing message:', error);
      toast({
        title: "Error",
        description: "Failed to edit message",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    try {
      await dataService.deleteMessage(message.id);
      onDelete(message.id);
      toast({
        title: "Success",
        description: "Message deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      });
    }
  };

  const handleReaction = (emoji: string) => {
    if (onReaction) {
      onReaction(message.id, emoji);
    }
    setReactions([...reactions, emoji]);
    setShowReactions(false);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const renderMediaContent = () => {
    if (message.type === 'image') {
      return (
        <img 
          src={message.mediaUrl} 
          alt="Shared image" 
          className="max-w-xs rounded-lg"
        />
      );
    }
    
    if (message.type === 'video') {
      return (
        <video 
          src={message.mediaUrl} 
          controls 
          className="max-w-xs rounded-lg"
        />
      );
    }
    
    if (message.type === 'voice') {
      return (
        <div className="flex items-center space-x-2">
          <audio src={message.mediaUrl} controls className="max-w-xs" />
          <span className="text-xs">
            {message.duration ? `${Math.floor(message.duration / 60)}:${String(message.duration % 60).padStart(2, '0')}` : ''}
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <div 
      ref={messageRef}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative`}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      <div 
        className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
      >
        {!isOwn && (
          <Avatar className="w-6 h-6">
            <AvatarImage src={message.user.avatar} />
            <AvatarFallback className="text-xs">
              {message.user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className="relative">
          <div
            className={`px-4 py-2 rounded-2xl transition-all ${
              isSelected 
                ? 'ring-2 ring-green-500 bg-green-500/20' 
                : isOwn
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
            }`}
          >
            {message.type === 'text' ? (
              isEditing ? (
                <div className="flex flex-col space-y-2">
                  <Input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleEdit()}
                    className="text-sm"
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={handleEdit}>
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm">{message.content}</p>
              )
            ) : (
              renderMediaContent()
            )}
            
            {/* Reactions */}
            {reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {reactions.map((emoji, idx) => (
                  <span key={idx} className="text-xs">{emoji}</span>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-1">
              <p className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {formatTime(message.timestamp)}
              </p>
              
              {canEdit && message.type === 'text' && !isEditing && selectedCount === 0 && (
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0"
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Emoji Reactions Popup */}
          {showReactions && (
            <div className="absolute bottom-full left-0 mb-2 bg-background border border-border rounded-lg shadow-lg p-2 flex gap-1 z-50">
              {EMOJI_REACTIONS.map((reaction) => {
                const Icon = reaction.icon;
                return (
                  <button
                    key={reaction.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReaction(reaction.emoji);
                    }}
                    className="p-2 hover:bg-accent rounded transition-colors"
                  >
                    <Icon className="w-4 h-4 text-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
