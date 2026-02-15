import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
const OFFLINE_STORAGE_KEY = 'wizchat_message_previews';

// Load persisted offline previews from localStorage
const loadOfflinePreviewsFromStorage = () => {
  try {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (stored) {
      const previews = JSON.parse(stored);
      Object.entries(previews).forEach(([key, value]: any) => {
        if (value && typeof value === 'object') {
          chatMetadataCache.set(key, {
            ...value,
            lastMessageTime: value.lastMessageTime ? new Date(value.lastMessageTime) : null,
            timestamp: Date.now() - 1000 // Make them slightly stale so they refresh but show immediately
          });
        }
      });
    }
  } catch (e) {
    console.debug('[ChatListItem] Failed to load offline previews');
  }
};

// Initialize on load
loadOfflinePreviewsFromStorage();

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

    const cacheKey = `${user?.id}-${friend.id}`;
    
    // STEP 1: Always try localStorage first (offline-first)
    let loadedFromOfflineStorage = false;
    try {
      const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (stored) {
        const previews = JSON.parse(stored);
        const cached = previews[cacheKey];
        if (cached && cached.lastMessage) {
          setLastMessage(cached.lastMessage);
          setLastMessageTime(cached.lastMessageTime ? new Date(cached.lastMessageTime) : null);
          setUnreadCount(cached.unreadCount || 0);
          chatIdRef.current = cached.chatId || null;
          loadedFromOfflineStorage = true;
        }
      }
    } catch (e) {
      console.debug('[ChatListItem] Failed to load offline storage');
    }

    // If offline and we have data from localStorage, stop here
    if (!navigator.onLine && loadedFromOfflineStorage) {
      return;
    }

    // STEP 2: Check memory cache
    const cached = chatMetadataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setLastMessage(cached.lastMessage);
      setLastMessageTime(cached.lastMessageTime);
      setUnreadCount(cached.unreadCount);
      chatIdRef.current = cached.chatId;
      return;
    }
    
    // STEP 3: Fetch from server if online
    if (!navigator.onLine && loadedFromOfflineStorage) {
      return; // Already loaded from storage, don't try to fetch
    }

    const fetchData = async () => {
      if (!user?.id) return;

      try {
        const { data: chatId, error: rpcError } = await supabase.rpc('get_or_create_direct_chat', {
          p_other_user_id: friend.id
        });

        if (rpcError || !chatId) {
          // Fetch failed - keep showing offline data if available
          return;
        }

        chatIdRef.current = chatId;

        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id, content, created_at, user_id, type, media_url')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: false });

        if (messagesError || !messages) {
          // Fetch failed - keep showing offline data if available
          return;
        }

        let preview = '';
        let msgTime: Date | null = null;
        let unreadCount = 0;

        if (messages.length > 0) {
          const lastMsg = messages[0];
          const isMe = lastMsg.user_id === user.id;

          if (lastMsg.type === 'image') {
            preview = `${isMe ? 'You: ' : ''}📷 Photo`;
          } else if (lastMsg.type === 'video') {
            preview = `${isMe ? 'You: ' : ''}🎥 Video`;
          } else if (lastMsg.type === 'voice') {
            preview = `${isMe ? 'You: ' : ''}🎤 Voice message`;
          } else if (lastMsg.content) {
            const text = lastMsg.content.trim();
            if (text.length > 0) {
              const shortened = text.length > 60 ? text.substring(0, 60) + '...' : text;
              preview = `${isMe ? 'You: ' : ''}${shortened}`;
            }
          } else if (lastMsg.media_url) {
            preview = `${isMe ? 'You: ' : ''}📎 File`;
          }

          msgTime = new Date(lastMsg.created_at);
          unreadCount = messages.filter(m => m.user_id === friend.id).length || 0;
        }

        setLastMessage(preview);
        setLastMessageTime(msgTime);
        setUnreadCount(unreadCount);
        updateCache(cacheKey, preview, msgTime, unreadCount, chatId);

      } catch (error) {
        console.debug('[ChatListItem] Fetch error (keeping offline data):', error);
      }
    };

    fetchData();

    // Real-time subscription for new messages
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let subscribed = false;

    const subscriptionTimer = setTimeout(() => {
      if (chatIdRef.current && !subscribed && navigator.onLine) {
        subscribed = true;
        channel = supabase
          .channel(`chat_messages_${friend.id}_${user?.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `chat_id=eq.${chatIdRef.current}`,
            },
            (payload) => {
              const msg = payload.new as any;
              if (!msg) return;
              
              const isMe = msg.user_id === user?.id;
              let preview = '';
              
              if (msg.type === 'image') {
                preview = `${isMe ? 'You: ' : ''}📷 Photo`;
              } else if (msg.type === 'video') {
                preview = `${isMe ? 'You: ' : ''}🎥 Video`;
              } else if (msg.type === 'voice') {
                preview = `${isMe ? 'You: ' : ''}🎤 Voice message`;
              } else if (msg.content?.trim()) {
                const trimmed = msg.content.trim();
                const contentPreview = trimmed.length > 60 
                  ? `${trimmed.substring(0, 60)}...` 
                  : trimmed;
                preview = `${isMe ? 'You: ' : ''}${contentPreview}`;
              } else if (msg.media_url) {
                preview = `${isMe ? 'You: ' : ''}📎 Attachment`;
              }
              
              setLastMessage(preview);
              setLastMessageTime(new Date(msg.created_at));
              
              // Always save to localStorage when message changes
              updateCache(cacheKey, preview, new Date(msg.created_at), unreadCount, chatIdRef.current);
            }
          )
          .subscribe();
      }
    }, 300);

    return () => {
      clearTimeout(subscriptionTimer);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [friend.id, user?.id, isWizAi]);
  
  const updateCache = (key: string, message: string, time: Date | null, unread: number, chatId: string | null) => {
    const cacheEntry = {
      lastMessage: message,
      lastMessageTime: time,
      unreadCount: unread,
      chatId,
      timestamp: Date.now()
    };
    chatMetadataCache.set(key, cacheEntry);
    
    // Persist to localStorage for offline access
    try {
      const allPreviews: Record<string, any> = {};
      chatMetadataCache.forEach((value, cacheKey) => {
        allPreviews[cacheKey] = {
          lastMessage: value.lastMessage,
          lastMessageTime: value.lastMessageTime?.toISOString() || null,
          unreadCount: value.unreadCount,
          chatId: value.chatId
        };
      });
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(allPreviews));
    } catch (e) {
      console.debug('[ChatListItem] Failed to persist offline previews');
    }
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
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatMessageTime(lastMessageTime)}
              </span>
            )}
          </div>
          
          {/* Message Preview */}
          <p className="text-sm line-clamp-2 text-muted-foreground">
            {lastMessage || (isWizAi ? "Ask me anything — I'm here to help!" : '')}
          </p>
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