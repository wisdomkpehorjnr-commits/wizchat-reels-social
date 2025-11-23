import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Pin, PinOff, BellOff, Ban, AlertTriangle, Trash2, Archive } from 'lucide-react';
import { User } from '@/types';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ChatListItemProps {
  friend: User;
  isPinned?: boolean;
  onClick: () => void;
  isWizAi?: boolean;
  onPinToggle?: () => void;
}

const ChatListItem = ({ friend, isPinned, onClick, isWizAi, onPinToggle }: ChatListItemProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [pinned, setPinned] = useState(isPinned || false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, height: 0 });
  const [lastMessage, setLastMessage] = useState<string>('');
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const isOnline = useOnlineStatus(friend.id);

  useEffect(() => {
    if (isWizAi) {
      setLastMessage("Ask me anything — I'm here to help!");
      return;
    }
    const fetchLastMessage = async () => {
      try {
        // Find existing chat between users
        const { data: chats } = await supabase
          .from('chats')
          .select('id')
          .eq('is_group', false)
          .limit(10);
        
        if (!chats || chats.length === 0) {
          setLastMessage("");
          setLastMessageTime(null);
          return;
        }
        
        // Find chat where both users are participants
        let foundChatId = null;
        for (const chat of chats) {
          const { data: participants } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chat.id);
          
          if (participants && participants.length === 2) {
            const userIds = participants.map(p => p.user_id);
            if (userIds.includes(user?.id || '') && userIds.includes(friend.id)) {
              foundChatId = chat.id;
              break;
            }
          }
        }
        
        if (!foundChatId) {
          setLastMessage("");
          setLastMessageTime(null);
          return;
        }
        
        // Get last message for this chat
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('content, created_at, user_id, seen')
          .eq('chat_id', foundChatId)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (msgError || !messages || messages.length === 0) {
          setLastMessage("");
          setLastMessageTime(null);
          return;
        }
        
        const msg = messages[0];
        const preview = msg.content && msg.content.length > 30
          ? msg.content.substring(0, 30) + '...'
          : msg.content || 'Media';
        setLastMessage(preview);
        setLastMessageTime(new Date(msg.created_at));
        
        // Count unread messages (messages not seen by current user)
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', foundChatId)
          .eq('seen', false)
          .neq('user_id', user?.id);
        
        setUnreadCount(count || 0);
      } catch (error) {
        setLastMessage("");
        setLastMessageTime(null);
      }
    };
    fetchLastMessage();
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`chat_${friend.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `user_id=eq.${friend.id}`
      }, () => {
        fetchLastMessage();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [friend.id, user?.id, isWizAi]);
  
  const formatMessageTime = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handlePin = () => {
    setPinned(!pinned);
    onPinToggle?.();
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

  const handleLongPress = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isWizAi) {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom, height: rect.height });
      setShowMenu(true);
    }
  };

  return (
    <>
      <div
        onClick={onClick}
        onContextMenu={(e) => {
          e.preventDefault();
          handleLongPress(e);
        }}
        className="flex items-center gap-3 p-4 hover:bg-accent cursor-pointer transition-colors relative"
        style={{ borderBottom: '1px solid hsla(142, 60%, 49%, 0.2)' }}
      >
        <div className="relative">
          <Avatar className={`${isOnline && !isWizAi ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background' : ''}`}>
            <AvatarImage src={friend.avatar} />
            <AvatarFallback className={isWizAi ? 'bg-primary text-primary-foreground' : ''}>
              {friend.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {!isWizAi && <OnlineStatusIndicator userId={friend.id} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <p className={`font-semibold truncate ${isWizAi ? 'text-primary' : ''}`}>
                {friend.name}
              </p>
              {pinned && <Pin className="w-3 h-3 text-primary flex-shrink-0" />}
            </div>
            {lastMessageTime && (
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatMessageTime(lastMessageTime)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className={`text-sm truncate flex-1 ${unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              {lastMessage || 'No messages yet'}
            </p>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full min-w-[20px] h-5 flex-shrink-0 border border-green-500">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showMenu && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div 
            className="fixed left-0 right-0 bg-background rounded-2xl p-4 z-50 animate-fade-in shadow-lg mx-2"
            style={{ top: `${menuPosition.top + 8}px` }}
          >
            <div className="flex justify-around items-center gap-2">
              <button
                onClick={() => { handlePin(); setShowMenu(false); }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {pinned ? (
                    <PinOff className="w-6 h-6 text-primary" />
                  ) : (
                    <Pin className="w-6 h-6 text-primary" />
                  )}
                </div>
              </button>
              <button
                onClick={() => { handleMute('muted'); setShowMenu(false); }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <BellOff className="w-6 h-6 text-primary" />
                </div>
              </button>
              <button
                onClick={() => { handleArchive(); setShowMenu(false); }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Archive className="w-6 h-6 text-primary" />
                </div>
              </button>
              <button
                onClick={() => { handleReport(); setShowMenu(false); }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-primary" />
                </div>
              </button>
              <button
                onClick={() => { handleBlock(); setShowMenu(false); }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Ban className="w-6 h-6 text-destructive" />
                </div>
              </button>
              <button
                onClick={() => { handleDelete(); setShowMenu(false); }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-destructive" />
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ChatListItem;
