import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Pin, PinOff, BellOff, Ban, AlertTriangle, Trash2, Archive } from 'lucide-react';
import { User } from '@/types';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface ChatListItemProps {
  friend: User;
  lastMessage?: string;
  unreadCount?: number;
  isPinned?: boolean;
  onClick: () => void;
}

const ChatListItem = ({ friend, lastMessage, unreadCount, isPinned, onClick }: ChatListItemProps) => {
  const { toast } = useToast();
  const [pinned, setPinned] = useState(isPinned || false);
  const isOnline = useOnlineStatus(friend.id);

  const handlePin = () => {
    setPinned(!pinned);
    toast({
      title: pinned ? "Chat unpinned" : "Chat pinned",
      description: pinned ? "Chat moved to regular list" : "Chat moved to top",
    });
  };

  const handleMute = (duration: string) => {
    toast({
      title: "Chat muted",
      description: `Notifications muted for ${duration}`,
    });
  };

  const handleBlock = () => {
    toast({
      title: "User blocked",
      description: "You won't receive messages from this user",
      variant: "destructive",
    });
  };

  const handleReport = () => {
    toast({
      title: "Report submitted",
      description: "Thank you for reporting. We'll review this shortly.",
    });
  };

  const handleDelete = () => {
    toast({
      title: "Chat deleted",
      description: "Conversation has been removed",
    });
  };

  const handleArchive = () => {
    toast({
      title: "Chat archived",
      description: "Chat moved to archives",
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={onClick}
          className="flex items-center gap-3 p-4 mb-3 hover:bg-accent rounded-lg cursor-pointer transition-colors active:scale-98"
        >
          <div className="relative">
            <Avatar className={`${isOnline ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background' : ''}`}>
              <AvatarImage src={friend.avatar} />
              <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <OnlineStatusIndicator userId={friend.id} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate">{friend.name}</p>
              {pinned && <Pin className="w-3 h-3 text-primary" />}
            </div>
            {lastMessage && (
              <p className="text-sm text-muted-foreground truncate">{lastMessage}</p>
            )}
          </div>
          {unreadCount && unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2 rounded-full min-w-[20px] h-5">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handlePin}>
          {pinned ? (
            <>
              <PinOff className="w-4 h-4 mr-2" />
              Unpin Chat
            </>
          ) : (
            <>
              <Pin className="w-4 h-4 mr-2" />
              Pin Chat
            </>
          )}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleMute('8 hours')}>
          <BellOff className="w-4 h-4 mr-2" />
          Mute for 8 hours
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleMute('1 day')}>
          <BellOff className="w-4 h-4 mr-2" />
          Mute for 1 day
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleMute('1 week')}>
          <BellOff className="w-4 h-4 mr-2" />
          Mute for 1 week
        </ContextMenuItem>
        <ContextMenuItem onClick={handleArchive}>
          <Archive className="w-4 h-4 mr-2" />
          Archive Chat
        </ContextMenuItem>
        <ContextMenuItem onClick={handleReport}>
          <AlertTriangle className="w-4 h-4 mr-2" />
          Report User
        </ContextMenuItem>
        <ContextMenuItem onClick={handleBlock} className="text-destructive">
          <Ban className="w-4 h-4 mr-2" />
          Block User
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Chat
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ChatListItem;
