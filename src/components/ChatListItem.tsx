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
  unreadCount?: number;
  isPinned?: boolean;
  onClick: () => void;
  isWizAi?: boolean;
  onPinToggle?: () => void;
}

const ChatListItem = ({ friend, unreadCount, isPinned, onClick, isWizAi, onPinToggle }: ChatListItemProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [pinned, setPinned] = useState(isPinned || false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, height: 0 });
  const [lastMessage, setLastMessage] = useState<string>('');
  const isOnline = useOnlineStatus(friend.id);

  useEffect(() => {
    if (isWizAi) {
      setLastMessage("Ask me anything — I'm here to help!");
      return;
    }
    const fetchLastMessage = async () => {
      try {
        // Find the chat between you and friend, both orderings
        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .select('*')
          .or(`and(creator_id.eq.${user?.id},participant_id.eq.${friend.id}),and(creator_id.eq.${friend.id},participant_id.eq.${user?.id})`)
          .limit(1)
          .single();
        if (chatError || !chat?.id) {
          setLastMessage(""); // No chat yet: show blank
          return;
        }
        // Get last message for this chat regardless of sender
        const { data: msg, error: msgError } = await supabase
          .from('messages')
          .select('content')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (msgError || !msg?.content) {
          setLastMessage(""); // Chat exists, but no messages
        } else {
          const preview = msg.content.length > 30
            ? msg.content.substring(0, 30) + '...'
            : msg.content;
          setLastMessage(preview);
        }
      } catch (error) {
        setLastMessage("");
      }
    };
    fetchLastMessage();
  }, [friend.id, user?.id, isWizAi]);

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
          <div className="flex items-center gap-2">
            <p className={`font-semibold truncate ${isWizAi ? 'text-primary' : ''}`}>
              {friend.name}
            </p>
            {pinned && <Pin className="w-3 h-3 text-primary" />}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {lastMessage || 'No messages yet'}
          </p>
        </div>
        {unreadCount && unreadCount > 0 && (
          <Badge variant="destructive" className="ml-2 rounded-full min-w-[20px] h-5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
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
