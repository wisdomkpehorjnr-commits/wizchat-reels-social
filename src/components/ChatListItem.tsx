import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pin, PinOff, BellOff, Ban, AlertTriangle, Trash2, Archive, ArchiveRestore, Star, StarOff, Eye } from 'lucide-react';
import { User } from '@/types';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChatSummary, formatMessagePreview } from '@/services/chatRealtimeService';
import { useImageCache } from '@/hooks/useImageCache';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChatListItemProps {
  friend: User;
  isPinned?: boolean;
  onClick: () => void;
  isWizAi?: boolean;
  onPinToggle?: () => void;
  onDelete?: (userId: string) => void;
  chatSummary?: ChatSummary;
  chatSummaries?: ChatSummary[];
  onArchive?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  isArchived?: boolean;
}

const chatMetadataCache = new Map<string, { lastMessage: string; lastMessageTime: Date | null; unreadCount: number; chatId: string | null; timestamp: number; }>();
const CACHE_TTL = 30000;
const OFFLINE_STORAGE_KEY = 'wizchat_message_previews';

const loadOfflinePreviewsFromStorage = () => {
  try {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (stored) {
      const previews = JSON.parse(stored);
      Object.entries(previews).forEach(([key, value]: any) => {
        if (value && typeof value === 'object') {
          chatMetadataCache.set(key, { ...value, lastMessageTime: value.lastMessageTime ? new Date(value.lastMessageTime) : null, timestamp: Date.now() - 1000 });
        }
      });
    }
  } catch {}
};
loadOfflinePreviewsFromStorage();

const ChatListItem = ({ friend, isPinned, onClick, isWizAi, onPinToggle, onDelete, chatSummary, chatSummaries, onArchive, onFavorite, isFavorite, isArchived }: ChatListItemProps) => {
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
  const chatIdRef = useRef<string | null>(null);
  const { cachedUrl: cachedAvatarUrl } = useImageCache(friend.avatar);
  const activeSummary = chatSummary ?? chatSummaries?.find(summary => !summary.isGroup && summary.participants?.some((p: any) => p?.id === friend.id));

  useEffect(() => {
    if (isWizAi) { setLastMessage("Ask me anything — I'm here to help!"); return; }
    const cacheKey = `${user?.id}-${friend.id}`;

    // Offline storage first
    let loadedFromOffline = false;
    try {
      const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (stored) {
        const previews = JSON.parse(stored);
        const cached = previews[cacheKey];
        if (cached?.lastMessage) {
          setLastMessage(cached.lastMessage);
          setLastMessageTime(cached.lastMessageTime ? new Date(cached.lastMessageTime) : null);
          setUnreadCount(cached.unreadCount || 0);
          chatIdRef.current = cached.chatId || null;
          loadedFromOffline = true;
        }
      }
    } catch {}

    if (!navigator.onLine && loadedFromOffline) return;

    if (activeSummary && user?.id) {
      const isMe = activeSummary.lastMessageUserId === user.id;
      const preview = formatMessagePreview(activeSummary.lastMessageContent, activeSummary.lastMessageType, activeSummary.lastMessageMediaUrl, isMe);
      const msgTime = activeSummary.lastMessageCreatedAt ? new Date(activeSummary.lastMessageCreatedAt) : activeSummary.updatedAt ? new Date(activeSummary.updatedAt) : null;
      setLastMessage(preview);
      setLastMessageTime(msgTime);
      setUnreadCount(activeSummary.unreadCount || 0);
      chatIdRef.current = activeSummary.chatId;
      updateCache(cacheKey, preview, msgTime, activeSummary.unreadCount || 0, activeSummary.chatId);
      return;
    }

    const cached = chatMetadataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setLastMessage(cached.lastMessage);
      setLastMessageTime(cached.lastMessageTime);
      setUnreadCount(cached.unreadCount);
      chatIdRef.current = cached.chatId;
      return;
    }
  }, [friend.id, user?.id, isWizAi, activeSummary]);

  const updateCache = (key: string, message: string, time: Date | null, unread: number, chatId: string | null) => {
    chatMetadataCache.set(key, { lastMessage: message, lastMessageTime: time, unreadCount: unread, chatId, timestamp: Date.now() });
    try {
      const allPreviews: Record<string, any> = {};
      chatMetadataCache.forEach((v, k) => { allPreviews[k] = { lastMessage: v.lastMessage, lastMessageTime: v.lastMessageTime?.toISOString() || null, unreadCount: v.unreadCount, chatId: v.chatId }; });
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(allPreviews));
    } catch {}
  };

  const formatMessageTime = (date: Date | null) => {
    if (!date) return '';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    if (hrs < 24) return `${hrs}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handlePin = () => { setPinned(!pinned); onPinToggle?.(); toast({ title: pinned ? "Chat unpinned" : "Chat pinned" }); };
  const handleMute = () => { toast({ title: "Chat muted" }); };
  const handleDelete = () => { setShowMenu(false); setShowDeleteDialog(true); };

  const confirmDelete = () => {
    const hiddenUsers = JSON.parse(localStorage.getItem('hidden-chat-users') || '[]');
    if (!hiddenUsers.includes(friend.id)) { hiddenUsers.push(friend.id); localStorage.setItem('hidden-chat-users', JSON.stringify(hiddenUsers)); }
    onDelete?.(friend.id);
    setShowDeleteDialog(false);
    toast({ title: "Chat hidden", description: `${friend.name} removed from chat list` });
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
        onContextMenu={(e) => { e.preventDefault(); handleLongPress(e); }}
        className="flex items-center gap-3 p-4 hover:bg-accent cursor-pointer transition-colors relative"
        style={{ borderBottom: '1px solid hsla(142, 60%, 49%, 0.2)' }}
      >
        <div className="relative">
          <Avatar className={`${isOnline && !isWizAi ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background' : ''}`}>
            <AvatarImage src={cachedAvatarUrl} />
            <AvatarFallback className={isWizAi ? 'bg-primary text-primary-foreground' : ''}>{friend.name.charAt(0)}</AvatarFallback>
          </Avatar>
          {!isWizAi && <OnlineStatusIndicator userId={friend.id} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <p className={`font-semibold truncate ${isWizAi ? 'text-primary' : ''}`}>{friend.name}</p>
              {pinned && <Pin className="w-3 h-3 text-primary flex-shrink-0" />}
              {isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
            </div>
            {lastMessageTime && <span className="text-xs text-muted-foreground flex-shrink-0">{formatMessageTime(lastMessageTime)}</span>}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm line-clamp-1 flex-1 ${unreadCount > 0 && !isWizAi ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              {lastMessage || (isWizAi ? "Ask me anything — I'm here to help!" : '')}
            </p>
            {unreadCount > 0 && !isWizAi && (
              <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-[11px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowMenu(false)} />
          <div className="fixed left-0 right-0 bg-background/95 backdrop-blur-xl rounded-2xl p-3 z-50 animate-fade-in shadow-xl mx-2 border border-border"
            style={{ top: `${Math.min(menuPosition.top + 8, window.innerHeight - 200)}px` }}>
            <div className="flex justify-around items-center gap-1 flex-wrap">
              <button onClick={() => { handlePin(); setShowMenu(false); }} className="flex flex-col items-center gap-1 p-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {pinned ? <PinOff className="w-5 h-5 text-primary" /> : <Pin className="w-5 h-5 text-primary" />}
                </div>
                <span className="text-[10px] text-muted-foreground">{pinned ? 'Unpin' : 'Pin'}</span>
              </button>
              <button onClick={() => { handleMute(); setShowMenu(false); }} className="flex flex-col items-center gap-1 p-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><BellOff className="w-5 h-5 text-primary" /></div>
                <span className="text-[10px] text-muted-foreground">Mute</span>
              </button>
              <button onClick={() => { onArchive?.(); setShowMenu(false); }} className="flex flex-col items-center gap-1 p-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {isArchived ? <ArchiveRestore className="w-5 h-5 text-primary" /> : <Archive className="w-5 h-5 text-primary" />}
                </div>
                <span className="text-[10px] text-muted-foreground">{isArchived ? 'Unarchive' : 'Archive'}</span>
              </button>
              <button onClick={() => { onFavorite?.(); setShowMenu(false); }} className="flex flex-col items-center gap-1 p-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {isFavorite ? <StarOff className="w-5 h-5 text-yellow-500" /> : <Star className="w-5 h-5 text-yellow-500" />}
                </div>
                <span className="text-[10px] text-muted-foreground">{isFavorite ? 'Unfav' : 'Favorite'}</span>
              </button>
              <button onClick={handleDelete} className="flex flex-col items-center gap-1 p-2">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center"><Trash2 className="w-5 h-5 text-destructive" /></div>
                <span className="text-[10px] text-destructive">Delete</span>
              </button>
            </div>
          </div>
        </>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>Remove {friend.name} from your chat list? They'll reappear if they message you.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ChatListItem;
