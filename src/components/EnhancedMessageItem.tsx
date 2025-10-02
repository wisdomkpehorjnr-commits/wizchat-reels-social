import { useState } from 'react';
import { Copy, Trash2, Pin, Reply, Smile, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Message, MessageReaction } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import MessageReactionPicker from './MessageReactionPicker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const [reactions, setReactions] = useState<MessageReaction[]>(message.reactions || []);
  
  const isOwn = message.userId === user?.id;
  const messageAge = Date.now() - message.timestamp.getTime();
  const canEdit = isOwn && messageAge < 5 * 60 * 1000; // 5 minutes

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast({
        title: "Copied",
        description: "Message copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy message",
        variant: "destructive"
      });
    }
  };

  const handleReaction = async (emoji: string) => {
    try {
      await dataService.addMessageReaction(message.id, emoji);
      // Refresh reactions
      const updatedReactions = await dataService.getMessageReactions(message.id);
      setReactions(updatedReactions);
    } catch (error: any) {
      if (error.message !== 'Reaction removed') {
        toast({
          title: "Error",
          description: "Failed to add reaction",
          variant: "destructive"
        });
      } else {
        // Refresh reactions after removal
        const updatedReactions = await dataService.getMessageReactions(message.id);
        setReactions(updatedReactions);
      }
    }
  };

  const handlePin = async () => {
    try {
      await dataService.pinMessage(message.chatId, message.id);
      onPin?.(message.id);
      toast({
        title: "Success",
        description: "Message pinned"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pin message",
        variant: "destructive"
      });
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, MessageReaction[]>);

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
    <ContextMenu>
      <ContextMenuTrigger asChild>
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
              {message.isPinned && (
                <div className="absolute -top-3 left-2 text-xs text-muted-foreground flex items-center gap-1">
                  <Pin className="w-3 h-3" />
                  <span>Pinned</span>
                </div>
              )}
              
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
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            onEdit(message.id, editContent);
                            setIsEditing(false);
                          }
                        }}
                        className="text-sm"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )
                ) : (
                  renderMediaContent()
                )}
                
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>

              {/* Reactions Display */}
              {Object.keys(groupedReactions).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(groupedReactions).map(([emoji, reactionList]) => (
                    <TooltipProvider key={emoji}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleReaction(emoji)}
                          >
                            <span className="mr-1">{emoji}</span>
                            <span>{reactionList.length}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{reactionList.map(r => r.user?.name || 'Someone').join(', ')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              )}

              {/* Quick Actions */}
              <div className="absolute -bottom-4 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MessageReactionPicker onReactionSelect={handleReaction}>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Smile className="w-3 h-3" />
                  </Button>
                </MessageReactionPicker>
              </div>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handleCopy}>
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </ContextMenuItem>
        
        {onReply && (
          <ContextMenuItem onClick={() => onReply(message)}>
            <Reply className="w-4 h-4 mr-2" />
            Reply
          </ContextMenuItem>
        )}

        {onPin && (
          <ContextMenuItem onClick={handlePin}>
            <Pin className="w-4 h-4 mr-2" />
            {message.isPinned ? 'Unpin' : 'Pin'}
          </ContextMenuItem>
        )}

        {canEdit && message.type === 'text' && (
          <ContextMenuItem onClick={() => setIsEditing(true)}>
            <MoreVertical className="w-4 h-4 mr-2" />
            Edit
          </ContextMenuItem>
        )}

        {isOwn && (
          <ContextMenuItem 
            onClick={() => onDelete(message.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default EnhancedMessageItem;
