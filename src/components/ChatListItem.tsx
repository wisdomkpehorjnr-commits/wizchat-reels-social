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
import { localMessageService, LocalMessage } from '@/services/localMessageService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChatListItemProps {
  friend: User;
  isPinned?: boolean;
  onClick: () => void;
  isWizAi?: boolean;
  onPinToggle?: () => void;
  onDelete?: (userId: string) => void;
}

const ChatListItem = ({ friend, isPinned, onClick, isWizAi, onPinToggle, onDelete }: ChatListItemProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [pinned, setPinned] = useState(isPinned || false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
    
    const fetchChatData = async () => {
      console.debug('[ChatListItem] fetchChatData start for friend:', friend.id);
      try {
        // Find existing one-on-one chat between users by intersecting chat_participants
        let foundChatId: string | null = null;
        try {
          console.debug('[ChatListItem] searching for chat intersection');
          const { data: myChats, error: myChatsError } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', user?.id);

          if (myChatsError) throw myChatsError;
          const chatIds = (myChats || []).map((c: any) => c.chat_id).filter(Boolean);

          if (chatIds.length === 0) {
            setLastMessage("");
            setLastMessageTime(null);
            setUnreadCount(0);
            return;
          }

          const { data: common, error: commonError } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', friend.id)
            .in('chat_id', chatIds)
            .limit(1);

          if (commonError) throw commonError;
          if (common && common.length > 0) {
            foundChatId = common[0].chat_id;
            console.debug('[ChatListItem] found chat id:', foundChatId);
          } else {
            console.debug('[ChatListItem] no common chat found for friend', friend.id);
            setLastMessage("");
            setLastMessageTime(null);
            setUnreadCount(0);
            return;
          }
        } catch (err) {
          console.error('Error finding chat between users:', err);
          setLastMessage("");
          setLastMessageTime(null);
          setUnreadCount(0);
          return;
        }
        
        // Load from local cache first (offline-first)
        const localMessages = await localMessageService.getMessages(foundChatId);
        const metadata = await localMessageService.getChatMetadata(foundChatId);
        console.debug('[ChatListItem] localMessages length, metadata:', localMessages.length, metadata);
        
        if (localMessages.length > 0) {
          const lastMsg = localMessages[localMessages.length - 1];
          const preview = lastMsg.type === 'image' 
            ? '📷 Photo'
            : lastMsg.type === 'video'
            ? '🎥 Video'
            : lastMsg.type === 'voice'
            ? '🎤 Voice message'
            : lastMsg.content && lastMsg.content.length > 30
            ? lastMsg.content.substring(0, 30) + '...'
            : lastMsg.content || 'Media';
          
          setLastMessage(preview);
          setLastMessageTime(lastMsg.timestamp);
        } else if (metadata) {
          setLastMessage(metadata.lastMessagePreview || '');
          setLastMessageTime(metadata.lastMessageTime || null);
        }
        
        // Calculate unread count from local messages
        const unread = localMessages.filter(
          m => m.userId !== user?.id && !m.seen
        ).length;
        console.debug('[ChatListItem] unread counted from localMessages:', unread);
        setUnreadCount(unread);
        
        // Also try to get from server if online (for sync)
        if (navigator.onLine) {
          try {
            const { data: messages, error: msgError } = await supabase
              .from('messages')
              .select('id, content, created_at, user_id, seen, type')
              .eq('chat_id', foundChatId)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (!msgError && messages && messages.length > 0) {
              const msg = messages[0];
              console.debug('[ChatListItem] latest message from server:', msg);
              const preview = msg.type === 'image'
                ? '📷 Photo'
                : msg.type === 'video'
                ? '🎥 Video'
                : msg.type === 'voice'
                ? '🎤 Voice message'
                : msg.content && msg.content.length > 30
                ? msg.content.substring(0, 30) + '...'
                : msg.content || 'Media';
              
              setLastMessage(preview);
              setLastMessageTime(new Date(msg.created_at));
              
              // Update metadata - get the full message first
              const { data: fullMessage } = await supabase
                .from('messages')
                .select('*')
                .eq('id', messages[0].id)
                .single();
              
              if (fullMessage) {
                const localMsg: LocalMessage = {
                  id: fullMessage.id,
                  chatId: fullMessage.chat_id,
                  userId: fullMessage.user_id,
                  user: friend,
                  content: fullMessage.content,
                  type: fullMessage.type as 'text' | 'voice' | 'image' | 'video',
                  mediaUrl: fullMessage.media_url,
                  duration: fullMessage.duration,
                  timestamp: new Date(fullMessage.created_at),
                  seen: fullMessage.seen,
                  status: fullMessage.seen ? 'read' : 'delivered',
                  synced: true
                };
                await localMessageService.updateChatMetadataFromMessage(foundChatId, localMsg);
              }
            }
            
            // Count unread from server
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_id', foundChatId)
              .eq('seen', false)
              .neq('user_id', user?.id);
            
            if (count !== null) {
              console.debug('[ChatListItem] unread count from server:', count);
              setUnreadCount(count);
              await localMessageService.updateUnreadCount(foundChatId, count);
            }
          } catch (error) {
            console.error('Error fetching from server:', error);
            // Continue with local data
          }
        }
      } catch (error) {
        console.error('Error fetching chat data:', error);
        setLastMessage("");
        setLastMessageTime(null);
        setUnreadCount(0);
      }
    };
    
    fetchChatData();
    
    // Subscribe to new messages (both local and server)
    const channel = supabase
      .channel(`chat_${friend.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, () => {
        fetchChatData();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages'
      }, () => {
        fetchChatData();
      })
      .subscribe();
    
    // Also listen for storage events (when local storage updates)
    const handleStorageChange = () => {
      fetchChatData();
    };
    
    window.addEventListener('storage', handleStorageChange);
    const handleIncomingMessage = (e: Event) => {
      try {
        console.debug('[ChatListItem] message:received event for friend:', friend.id, (e as CustomEvent).detail);
        // Trigger a refresh when any new message is received
        fetchChatData();
      } catch (err) {
        console.error('Error handling incoming message event:', err);
      }
    };
    window.addEventListener('message:received', handleIncomingMessage as EventListener);
    
    // Poll for local storage updates (since IndexedDB doesn't have events)
    const pollInterval = setInterval(fetchChatData, 2000);
    
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('message:received', handleIncomingMessage as EventListener);
      clearInterval(pollInterval);
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
    setShowMenu(false);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    // Hide user from chat list (not delete as friend)
    const hiddenUsers = JSON.parse(localStorage.getItem('hidden-chat-users') || '[]');
    if (!hiddenUsers.includes(friend.id)) {
      hiddenUsers.push(friend.id);
      localStorage.setItem('hidden-chat-users', JSON.stringify(hiddenUsers));
    }
    
    onDelete?.(friend.id);
    setShowDeleteDialog(false);
    
    toast({
      title: "Chat hidden",
      description: `${friend.name} has been removed from your chat list. They will reappear if they send you a message.`,
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-background border-2 border-primary/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Remove from Chat List?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will remove <span className="font-semibold text-foreground">{friend.name}</span> from your chat list. 
              They will reappear if they send you a message. This does not remove them as a friend.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-primary/30">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ChatListItem;
