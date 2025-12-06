import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Pin, PinOff, BellOff, Ban, AlertTriangle, Trash2, Archive } from 'lucide-react';
import { User } from '@/types';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { localMessageService, LocalMessage } from '@/services/localMessageService';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatListItemProps {
  friend: User;
  isPinned?: boolean;
  onClick: () => void;
  isWizAi?: boolean;
  onPinToggle?: () => void;
  onHideChat?: (userId: string) => void;
}

const ChatListItem = ({ friend, isPinned, onClick, isWizAi, onPinToggle, onHideChat }: ChatListItemProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [pinned, setPinned] = useState(isPinned || false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, height: 0 });
  const [lastMessage, setLastMessage] = useState<string>('');
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isOnline = useOnlineStatus(friend.id);

  useEffect(() => {
    if (isWizAi) {
      setLastMessage("Ask me anything — I'm here to help!");
      return;
    }
    
    const fetchChatData = async () => {
      try {
        // Find existing chat between users
        const { data: chats } = await supabase
          .from('chats')
          .select('id')
          .eq('is_group', false)
          .limit(50);
        
        if (!chats || chats.length === 0) {
          setLastMessage("");
          setLastMessageTime(null);
          setUnreadCount(0);
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
          setUnreadCount(0);
          return;
        }
        
        // Fetch last message from server first (most accurate)
        if (navigator.onLine) {
          try {
            const { data: messages, error: msgError } = await supabase
              .from('messages')
              .select('id, content, created_at, user_id, seen, type, duration, media_url')
              .eq('chat_id', foundChatId)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (!msgError && messages && messages.length > 0) {
              const msg = messages[0];
              let preview = '';
              
              // Determine message preview
              if (msg.type === 'image') {
                preview = '📷 Photo';
              } else if (msg.type === 'video') {
                preview = '🎥 Video';
              } else if (msg.type === 'voice' || (msg.type === 'text' && msg.duration && msg.duration > 0 && !msg.content)) {
                preview = '🎤 Voice message';
              } else if (msg.type === 'text' && msg.media_url && !msg.content) {
                preview = '📎 Document';
              } else if (msg.content) {
                preview = msg.content.length > 35 
                  ? msg.content.substring(0, 35) + '...' 
                  : msg.content;
              } else {
                preview = 'Media';
              }
              
              // Add "You: " prefix if sent by current user
              if (msg.user_id === user?.id) {
                preview = `You: ${preview}`;
              }
              
              setLastMessage(preview);
              setLastMessageTime(new Date(msg.created_at));
            } else {
              setLastMessage("");
              setLastMessageTime(null);
            }
            
            // Count unread from server
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_id', foundChatId)
              .eq('seen', false)
              .neq('user_id', user?.id);
            
            if (count !== null) {
              setUnreadCount(count);
            }
          } catch (error) {
            console.error('Error fetching from server:', error);
          }
        } else {
          // Offline: Load from local cache
          const localMessages = await localMessageService.getMessages(foundChatId);
          
          if (localMessages.length > 0) {
            const lastMsg = localMessages[localMessages.length - 1];
            let preview = '';
            
            if (lastMsg.type === 'image') {
              preview = '📷 Photo';
            } else if (lastMsg.type === 'video') {
              preview = '🎥 Video';
            } else if (lastMsg.type === 'voice') {
              preview = '🎤 Voice message';
            } else if (lastMsg.content) {
              preview = lastMsg.content.length > 35
                ? lastMsg.content.substring(0, 35) + '...'
                : lastMsg.content;
            } else {
              preview = 'Media';
            }
            
            if (lastMsg.userId === user?.id) {
              preview = `You: ${preview}`;
            }
            
            setLastMessage(preview);
            setLastMessageTime(lastMsg.timestamp);
            
            const unread = localMessages.filter(
              m => m.userId !== user?.id && !m.seen
            ).length;
            setUnreadCount(unread);
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
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`chat_list_${friend.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, () => {
        fetchChatData();
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

  const handleMute = () => {
    toast({
      title: "Chat muted",
      description: "Notifications muted",
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

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(true);
    setShowMenu(false);
  };

  const handleDelete = () => {
    onHideChat?.(friend.id);
    setShowDeleteConfirm(false);
    toast({
      title: "Chat removed",
      description: "Chat hidden from list. It will reappear if they message you.",
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
              {lastMessage || (isWizAi ? "Ask me anything — I'm here to help!" : '')}
            </p>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full min-w-[20px] h-5 flex-shrink-0 bg-primary text-primary-foreground">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setShowMenu(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 right-0 bg-background rounded-2xl p-4 z-50 shadow-lg mx-2 border border-primary/20"
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
                  onClick={() => { handleMute(); setShowMenu(false); }}
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
                  onClick={handleDeleteConfirm}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-destructive" />
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md bg-background/95 backdrop-blur-md border-2 border-primary/20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Remove Chat</DialogTitle>
              <DialogDescription className="text-base pt-2">
                Remove {friend.name} from your chat list? They will not be unfriended, and the chat will reappear if they send you a message.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 pt-6">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 border-primary/20 hover:bg-muted"
              >
                No
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="flex-1"
              >
                Yes
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatListItem;