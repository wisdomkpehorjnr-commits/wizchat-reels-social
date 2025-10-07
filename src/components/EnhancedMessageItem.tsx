import { useState } from 'react';
import { Edit2, Trash2, Check, X, Reply, Pin, Copy, Forward, Download, Flag, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import MessageReactionPicker from './MessageReactionPicker';
import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';

interface EnhancedMessageItemProps {
  message: Message;
  onEdit: (messageId: string, newContent: string) => void;
  onDelete: (messageId: string) => void;
  onReply?: (message: Message) => void;
  onPin?: (messageId: string) => void;
}

const EnhancedMessageItem = ({ message, onEdit, onDelete, onReply, onPin }: EnhancedMessageItemProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [reactions, setReactions] = useState<{ [key: string]: string[] }>({});

  const isOwn = message.userId === user?.id;
  const messageAge = Date.now() - message.timestamp.getTime();
  const canEdit = isOwn && messageAge < 5 * 60 * 1000; // 5 minutes

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

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast({
      title: "Copied",
      description: "Message copied to clipboard"
    });
  };

  const handleReaction = (emoji: string) => {
    const userId = user?.id || '';
    const currentReactions = { ...reactions };
    
    if (currentReactions[emoji]?.includes(userId)) {
      currentReactions[emoji] = currentReactions[emoji].filter(id => id !== userId);
      if (currentReactions[emoji].length === 0) {
        delete currentReactions[emoji];
      }
    } else {
      if (!currentReactions[emoji]) {
        currentReactions[emoji] = [];
      }
      currentReactions[emoji].push(userId);
    }
    
    setReactions(currentReactions);
  };

  const handlePin = () => {
    onPin?.(message.id);
    toast({
      title: "Message pinned",
      description: "Message pinned to top of chat"
    });
  };

  const handleForward = () => {
    toast({
      title: "Forward message",
      description: "Select a chat to forward to"
    });
  };

  const handleReport = () => {
    toast({
      title: "Report submitted",
      description: "Thank you for reporting. We'll review this message."
    });
  };

  const handleSaveMedia = () => {
    toast({
      title: "Saved",
      description: "Media saved to gallery"
    });
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
          className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
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
    <ContextMenu>
      <ContextMenuTrigger>
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-2`}>
          <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
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
                className={`px-4 py-2 rounded-2xl ${
                  isOwn
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
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  )
                ) : (
                  renderMediaContent()
                )}

                <div className="flex items-center justify-between mt-1">
                  <p className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {formatTime(message.timestamp)}
                  </p>

                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <MessageReactionPicker onReactionSelect={handleReaction}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                        >
                          <Smile className="w-3 h-3" />
                        </Button>
                      </MessageReactionPicker>
                    </div>
                  )}
                </div>
              </div>

              {/* Reactions display */}
              {Object.keys(reactions).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(reactions).map(([emoji, users]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent hover:bg-accent/80 text-xs transition-colors"
                    >
                      <span>{emoji}</span>
                      <span className="text-muted-foreground">{users.length}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handleCopy}>
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onReply?.(message)}>
          <Reply className="w-4 h-4 mr-2" />
          Reply
        </ContextMenuItem>
        <ContextMenuItem onClick={handlePin}>
          <Pin className="w-4 h-4 mr-2" />
          Pin Message
        </ContextMenuItem>
        <ContextMenuItem onClick={handleForward}>
          <Forward className="w-4 h-4 mr-2" />
          Forward
        </ContextMenuItem>
        {(message.type === 'image' || message.type === 'video') && (
          <ContextMenuItem onClick={handleSaveMedia}>
            <Download className="w-4 h-4 mr-2" />
            Save to Gallery
          </ContextMenuItem>
        )}
        {canEdit && message.type === 'text' && (
          <ContextMenuItem onClick={() => setIsEditing(true)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </ContextMenuItem>
        )}
        {!isOwn && (
          <ContextMenuItem onClick={handleReport} className="text-destructive">
            <Flag className="w-4 h-4 mr-2" />
            Report Message
          </ContextMenuItem>
        )}
        {isOwn && (
          <ContextMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default EnhancedMessageItem;
