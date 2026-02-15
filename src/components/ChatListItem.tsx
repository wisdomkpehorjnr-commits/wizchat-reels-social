import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Pin, PinOff, BellOff, Ban, AlertTriangle, Trash2, Archive } from 'lucide-react';
import { User } from '@/types';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

// Cache for chat metadata to prevent repeated fetches
const chatMetadataCache = new Map<string, {
  lastMessage: string;
  lastMessageTime: Date | null;
  unreadCount: number;
  chatId: string | null;
  timestamp: number;
}>();

const CACHE_TTL = 30000; // 30 seconds cache

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
  const hasFetchedRef = useRef(false);
  const chatIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isWizAi) {
      setLastMessage("Ask me anything — I'm here to help!");
      return;
    }

    // Check cache first
    const cacheKey = `${user?.id}-${friend.id}`;
    const cached = chatMetadataCache.get(cacheKey);
    
    // Use cache if available and fresh
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setLastMessage(cached.lastMessage);
      setLastMessageTime(cached.lastMessageTime);
      setUnreadCount(cached.unreadCount);
      chatIdRef.current = cached.chatId;
      return;
    }
    
    // Reset fetch flag for new friend
    hasFetchedRef.current = false;
    
    const fetchChatData = async () => {
      try {
        console.log(`[ChatListItem] Fetching data for friend: ${friend.name} (${friend.id})`);
        
        // Find existing chat between users - optimized single query
        const { data: myChats, error: myChatsError } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', user?.id || '');
        
        if (myChatsError) {
          console.error('[ChatListItem] Error fetching user chats:', myChatsError);
          setLastMessage('');
          setLastMessageTime(null);
          setUnreadCount(0);
          return;
        }
        
        console.log(`[ChatListItem] User has ${myChats?.length || 0} chats`);
        
        if (!myChats || myChats.length === 0) {
          console.log('[ChatListItem] User has no chats');
          setLastMessage('');
          setLastMessageTime(null);
          setUnreadCount(0);
          return;
        }
        
        const chatIds = myChats.map(c => c.chat_id);
        
        // Find chats where friend is also a participant
        const { data: friendChats, error: friendChatsError } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', friend.id)
          .in('chat_id', chatIds);
        
        if (friendChatsError) {
          console.error('[ChatListItem] Error fetching friend chats:', friendChatsError);
          setLastMessage('');
          setLastMessageTime(null);
          setUnreadCount(0);
          return;
        }
        
        console.log(`[ChatListItem] Friend ${friend.name} has ${friendChats?.length || 0} mutual chats`);
        
        if (!friendChats || friendChats.length === 0) {
          console.log(`[ChatListItem] No mutual chat found with ${friend.name}`);
          setLastMessage('');
          setLastMessageTime(null);
          setUnreadCount(0);
          return;
        }

        // Get the first matching chat (should be direct chat)
        const foundChatId = friendChats[0].chat_id;
        chatIdRef.current = foundChatId;
        console.log(`[ChatListItem] Found chat ID: ${foundChatId}`);
        
        // Get last message and unread count in a single query batch
        const [lastMsgResult, unreadResult] = await Promise.all([
          supabase
            .from('messages')
            .select('id, content, created_at, user_id, type')
            .eq('chat_id', foundChatId)
            .order('created_at', { ascending: false })
            .limit(1),
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', foundChatId)
            .eq('seen', false)
            .neq('user_id', user?.id)
        ]);
        
        if (lastMsgResult.error) {
          console.error('[ChatListItem] Error fetching last message:', lastMsgResult.error);
          setLastMessage('');
          setLastMessageTime(null);
          return;
        }
        
        if (unreadResult.error) {
          console.error('[ChatListItem] Error fetching unread count:', unreadResult.error);
        }
        
        console.log(`[ChatListItem] Found ${lastMsgResult.data?.length || 0} messages in chat`);
        
        let preview = '';
        let msgTime: Date | null = null;
        
        if (lastMsgResult.data && lastMsgResult.data.length > 0) {
          const msg = lastMsgResult.data[0];
          const isMe = msg.user_id === user?.id;
          
          console.log(`[ChatListItem] Last message content:`, msg.content?.substring(0, 50));
          
          // Generate preview with better formatting
          if (msg.type === 'image') {
            preview = `${isMe ? 'You: ' : ''}📷 Photo`;
          } else if (msg.type === 'video') {
            preview = `${isMe ? 'You: ' : ''}🎥 Video`;
          } else if (msg.type === 'voice') {
            preview = `${isMe ? 'You: ' : ''}🎤 Voice message`;
          } else if (msg.content) {
            // Limit text preview to 60 characters for better readability in list
            const contentPreview = msg.content.length > 60 
              ? `${msg.content.substring(0, 60)}...` 
              : msg.content;
            preview = `${isMe ? 'You: ' : ''}${contentPreview}`;
          } else {
            preview = `${isMe ? 'You: ' : ''}Media`;
          }
          
          msgTime = new Date(msg.created_at);
        } else {
          console.log('[ChatListItem] No messages found in this chat');
        }
        
        const unread = unreadResult.count || 0;
        console.log(`[ChatListItem] Setting preview: "${preview}", unread: ${unread}`);
        
        setLastMessage(preview);
        setLastMessageTime(msgTime);
        setUnreadCount(unread);
        updateCache(cacheKey, preview, msgTime, unread, foundChatId);
        
      } catch (error) {
        console.error('[ChatListItem] Error fetching chat data:', error);
        setLastMessage('');
        setLastMessageTime(null);
      }
    };
    
    fetchChatData();
    
    // Subscribe to new messages (lightweight - only for this specific chat)
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    const setupSubscription = () => {
      if (chatIdRef.current) {
        channel = supabase
          .channel(`chat_list_${friend.id}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatIdRef.current}`
          }, (payload) => {
            // Directly update from payload - no refetch needed
            const msg = payload.new as any;
            const isMe = msg.user_id === user?.id;
            
            // Generate preview with consistent formatting
            let preview = '';
            if (msg.type === 'image') {
              preview = `${isMe ? 'You: ' : ''}📷 Photo`;
            } else if (msg.type === 'video') {
              preview = `${isMe ? 'You: ' : ''}🎥 Video`;
            } else if (msg.type === 'voice') {
              preview = `${isMe ? 'You: ' : ''}🎤 Voice message`;
            } else if (msg.content) {
              const contentPreview = msg.content.length > 60 
                ? `${msg.content.substring(0, 60)}...` 
                : msg.content;
              preview = `${isMe ? 'You: ' : ''}${contentPreview}`;
            } else {
              preview = `${isMe ? 'You: ' : ''}Media`;
            }
            
            setLastMessage(preview);
            setLastMessageTime(new Date(msg.created_at));
            if (!isMe) {
              setUnreadCount(prev => prev + 1);
            }
            
            // Update cache
            const cacheKey = `${user?.id}-${friend.id}`;
            updateCache(cacheKey, preview, new Date(msg.created_at), 
              msg.user_id !== user?.id ? unreadCount + 1 : unreadCount, 
              chatIdRef.current
            );
          })
          .subscribe();
      }
    };
    
    // Setup subscription after initial fetch
    setTimeout(setupSubscription, 500);
    
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [friend.id, user?.id, isWizAi]);
  
  const updateCache = (key: string, message: string, time: Date | null, unread: number, chatId: string | null) => {
    chatMetadataCache.set(key, {
      lastMessage: message,
      lastMessageTime: time,
      unreadCount: unread,
      chatId,
      timestamp: Date.now()
    });
  };
  
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
          {/* Header: Name, Pin Icon, Time */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <p className={`font-semibold truncate ${isWizAi ? 'text-primary' : ''}`}>
                {friend.name}
              </p>
              {pinned && <Pin className="w-3 h-3 text-primary flex-shrink-0" />}
            </div>
            {lastMessageTime && (
              <span className={`text-xs flex-shrink-0 ${unreadCount > 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                {formatMessageTime(lastMessageTime)}
              </span>
            )}
          </div>
          
          {/* Message Preview */}
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm line-clamp-2 flex-1 ${
              unreadCount > 0 
                ? 'font-semibold text-foreground' 
                : 'text-muted-foreground'
            }`}>
              {lastMessage || (isWizAi ? "Ask me anything — I'm here to help!" : 'No messages yet')}
            </p>
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="rounded-full min-w-[24px] h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold border-2 border-green-500 bg-red-500 text-white"
              >
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