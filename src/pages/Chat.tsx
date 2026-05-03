import React, { useState, useEffect, useRef, useMemo } from 'react';
import Layout from '@/components/Layout';
import ChatPopup from '@/components/ChatPopup';
import GroupChatPopup from '@/components/GroupChatPopup';
import WizAiChat from '@/components/WizAiChat';
import ChatListItem from '@/components/ChatListItem';
import CreateGroupDialog from '@/components/CreateGroupDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageCircle, Bot, WifiOff, Plus, Users, Archive, Star } from 'lucide-react';
import { Friend, User } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchChatSummaries, getCachedSummaries, ChatSummary, markChatDelivered } from '@/services/chatRealtimeService';

const CHAT_LIST_CACHE_KEY = 'wizchat_chat_list_cache';
const ARCHIVED_CHATS_KEY = 'wizchat_archived_chats';
const FAVORITE_CHATS_KEY = 'wizchat_favorite_chats';

// =============================================
// PERSISTENT MODULE-LEVEL STORE
// =============================================
interface ChatStore {
  chatUsers: User[];
  lastFetchTime: number;
  isInitialized: boolean;
}

const chatStore: ChatStore = {
  chatUsers: [],
  lastFetchTime: 0,
  isInitialized: false,
};

const CHAT_MIN_REFRESH_INTERVAL_MS = 2 * 60 * 1000;

const normalizeCachedUser = (value: any): User => ({
  id: value?.id || '',
  name: value?.name || value?.username || 'Unknown user',
  username: value?.username || '',
  email: value?.email || '',
  photoURL: value?.photoURL || value?.avatar || '',
  avatar: value?.avatar || value?.photoURL || '',
  bio: value?.bio || '',
  location: typeof value?.location === 'string' ? value.location : undefined,
  website: value?.website || undefined,
  birthday: value?.birthday ? new Date(value.birthday) : undefined,
  gender: value?.gender || undefined,
  pronouns: value?.pronouns || undefined,
  coverImage: value?.coverImage || value?.cover_image || '',
  isPrivate: value?.isPrivate ?? value?.is_private ?? false,
  followerCount: value?.followerCount ?? value?.follower_count ?? 0,
  followingCount: value?.followingCount ?? value?.following_count ?? 0,
  profileViews: value?.profileViews ?? value?.profile_views ?? 0,
  createdAt: value?.createdAt ? new Date(value.createdAt) : value?.created_at ? new Date(value.created_at) : new Date(),
  is_verified: value?.is_verified ?? false,
});

const getChatPartnerFromSummary = (summary: ChatSummary, currentUserId?: string): User | null => {
  if (!currentUserId || summary.isGroup || !Array.isArray(summary.participants)) return null;
  const partner = summary.participants.find((p: any) => p?.id && p.id !== currentUserId);
  return partner ? normalizeCachedUser(partner) : null;
};

const getSummarySortTime = (summary?: ChatSummary | null) => {
  const timestamp = summary?.lastMessageCreatedAt || summary?.updatedAt || summary?.createdAt;
  return timestamp ? new Date(timestamp).getTime() : 0;
};

// SYNCHRONOUS initialization from localStorage
(() => {
  if (chatStore.isInitialized) return;
  try {
    const cached = localStorage.getItem(CHAT_LIST_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.data && Array.isArray(parsed.data)) {
        chatStore.chatUsers = parsed.data.map(normalizeCachedUser);
        chatStore.lastFetchTime = parsed.timestamp || 0;
      }
    }
  } catch (e) {}
  chatStore.isInitialized = true;
})();

const saveChatListToCache = (chatUsers: User[]) => {
  try {
    localStorage.setItem(CHAT_LIST_CACHE_KEY, JSON.stringify({ data: chatUsers, timestamp: Date.now() }));
    chatStore.chatUsers = chatUsers;
    chatStore.lastFetchTime = Date.now();
  } catch (e) {}
};

const WIZAI_USER: User = {
  id: 'wizai', name: 'WizAi', email: 'wizai@wizchat.app', username: 'wizai',
  avatar: 'data:image/svg+xml;utf8,<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" rx="100" fill="white"/><ellipse cx="100" cy="85" rx="55" ry="45" fill="black"/><ellipse cx="82" cy="80" rx="6" ry="6" fill="white"/><ellipse cx="118" cy="80" rx="6" ry="6" fill="white"/><rect x="70" y="124" width="60" height="19" rx="9.5" fill="black" stroke="white" stroke-width="4"/></svg>',
  bio: 'Your AI assistant', photoURL: '', followerCount: 0, followingCount: 0, profileViews: 0, createdAt: new Date(),
};

const GROUPS_CACHE_KEY = 'wizchat_groups_cache';
let _cachedGroups: any[] = [];
try {
  const cached = localStorage.getItem(GROUPS_CACHE_KEY);
  if (cached) { const parsed = JSON.parse(cached); if (parsed?.data) _cachedGroups = parsed.data; }
} catch (e) {}

const formatGroupTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  if (hrs < 24) return `${hrs}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

type ChatFilter = 'all' | 'unread' | 'favorites' | 'groups';

const Chat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const hasCachedData = chatStore.chatUsers.length > 0;

  const [friends, setFriends] = useState<Friend[]>([]);
  const [chatUsers, setChatUsers] = useState<User[]>(chatStore.chatUsers);
  const [groups, setGroups] = useState<any[]>(_cachedGroups);
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>(getCachedSummaries());
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(!hasCachedData);
  const [pinnedFriends, setPinnedFriends] = useState<Set<string>>(new Set());
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ChatFilter>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [archivedChats, setArchivedChats] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(ARCHIVED_CHATS_KEY) || '[]')); } catch { return new Set(); }
  });
  const [favoriteChats, setFavoriteChats] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(FAVORITE_CHATS_KEY) || '[]')); } catch { return new Set(); }
  });
  const hasLoadedRef = useRef(false);

  // Persist archive & favorites
  useEffect(() => {
    localStorage.setItem(ARCHIVED_CHATS_KEY, JSON.stringify([...archivedChats]));
  }, [archivedChats]);
  useEffect(() => {
    localStorage.setItem(FAVORITE_CHATS_KEY, JSON.stringify([...favoriteChats]));
  }, [favoriteChats]);

  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); loadData(true); };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      const isCacheStale = Date.now() - chatStore.lastFetchTime > CHAT_MIN_REFRESH_INTERVAL_MS;
      if (hasCachedData && !isCacheStale) { setLoading(false); return; }
      loadData(hasCachedData);
    }

    const handleChatListUpdate = () => loadData(true);
    window.addEventListener('chatListUpdate', handleChatListUpdate);

    const handleOpenChatWithUser = async (event: CustomEvent) => {
      const { userId } = event.detail;
      if (!userId) return;
      try {
        const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (error || !profile) return;
        setSelectedFriend({
          id: profile.id, name: profile.name, username: profile.username, email: profile.email,
          avatar: profile.avatar, photoURL: profile.avatar, bio: profile.bio,
          followerCount: profile.follower_count || 0, followingCount: profile.following_count || 0,
          profileViews: profile.profile_views || 0, createdAt: new Date(profile.created_at)
        });
      } catch {}
    };
    window.addEventListener('openChatWithUser', handleOpenChatWithUser as EventListener);

    // Realtime subscription for instant chat list updates
    const chatListChannel = supabase
      .channel('chat_list_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as any;
        if (msg.user_id !== user?.id) markChatDelivered(msg.chat_id).catch(() => {});
        
        // Auto-unarchive if archived chat gets a new message
        setArchivedChats(prev => {
          if (prev.has(msg.chat_id)) {
            const next = new Set(prev);
            next.delete(msg.chat_id);
            return next;
          }
          return prev;
        });

        setChatSummaries(prev => {
          const idx = prev.findIndex(s => s.chatId === msg.chat_id);
          const now = msg.created_at || new Date().toISOString();
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              lastMessageId: msg.id, lastMessageContent: msg.content,
              lastMessageType: msg.type, lastMessageMediaUrl: msg.media_url,
              lastMessageCreatedAt: now, lastMessageUserId: msg.user_id, updatedAt: now,
              unreadCount: msg.user_id !== user?.id ? updated[idx].unreadCount + 1 : updated[idx].unreadCount,
            };
            return updated;
          }
          return prev;
        });
        clearTimeout((window as any).__chatListRefreshTimer);
        (window as any).__chatListRefreshTimer = setTimeout(() => loadData(true), 3000);
      })
      .subscribe();

    const handleChatMsgReceived = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      setChatSummaries(prev => {
        const idx = prev.findIndex(s => s.chatId === detail.chatId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx], lastMessageContent: detail.content, lastMessageType: detail.type,
            lastMessageCreatedAt: detail.createdAt || new Date().toISOString(),
            lastMessageUserId: detail.userId, updatedAt: detail.createdAt || new Date().toISOString(),
          };
          return updated;
        }
        return prev;
      });
    };
    window.addEventListener('chatMessageReceived', handleChatMsgReceived);

    return () => {
      window.removeEventListener('openChatWithUser', handleOpenChatWithUser as EventListener);
      window.removeEventListener('chatListUpdate', handleChatListUpdate);
      window.removeEventListener('chatMessageReceived', handleChatMsgReceived);
      clearTimeout((window as any).__chatListRefreshTimer);
      supabase.removeChannel(chatListChannel);
    };
  }, [user, toast, hasCachedData]);

  const loadData = async (silent = false) => {
    if (!user) return;
    try {
      if (!silent && !hasCachedData) setLoading(true);
      const userFriends = await dataService.getFriends();
      setFriends(userFriends);
      const acceptedFriendUsers = userFriends.filter(f => f.status === 'accepted')
        .map(f => normalizeCachedUser(f.requester.id === user.id ? f.addressee : f.requester));
      let nextChatUsers = acceptedFriendUsers;
      try {
        const summaries = await fetchChatSummaries();
        setChatSummaries(summaries);
        const mergedUsers = new Map<string, User>();
        [...acceptedFriendUsers, ...summaries.map(s => getChatPartnerFromSummary(s, user.id)).filter(Boolean) as User[]]
          .forEach(u => mergedUsers.set(u.id, { ...mergedUsers.get(u.id), ...u, photoURL: u.photoURL || u.avatar, avatar: u.avatar || u.photoURL }));
        nextChatUsers = Array.from(mergedUsers.values());
        const groupChats = summaries.filter(s => s.isGroup);
        const groupsForDisplay = groupChats.map(s => ({ id: s.chatId, name: s.name || 'Group Chat', member_count: s.memberCount || 0, description: s.description, avatar: s.avatarUrl }));
        setGroups(groupsForDisplay);
        try { localStorage.setItem(GROUPS_CACHE_KEY, JSON.stringify({ data: groupsForDisplay, timestamp: Date.now() })); } catch {}
      } catch {}
      setChatUsers(nextChatUsers);
      saveChatListToCache(nextChatUsers);
    } catch (error) {
      if (!silent && navigator.onLine) toast({ title: "Error", description: "Failed to load friends", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleGroupCreated = async (groupId: string, groupName?: string) => {
    setGroups(prev => prev.find(g => g.id === groupId) ? prev : [{ id: groupId, name: groupName || 'New Group', member_count: 0 }, ...prev]);
    setSelectedGroup(groupId);
    loadData(true);
  };

  const handlePinToggle = (friendId: string) => {
    setPinnedFriends(prev => { const n = new Set(prev); n.has(friendId) ? n.delete(friendId) : n.add(friendId); return n; });
  };

  const handleArchiveChat = (chatId: string) => {
    setArchivedChats(prev => { const n = new Set(prev); n.add(chatId); return n; });
    toast({ title: "Chat archived" });
  };

  const handleUnarchiveChat = (chatId: string) => {
    setArchivedChats(prev => { const n = new Set(prev); n.delete(chatId); return n; });
    toast({ title: "Chat unarchived" });
  };

  const handleFavoriteToggle = (chatId: string) => {
    setFavoriteChats(prev => {
      const n = new Set(prev);
      if (n.has(chatId)) { n.delete(chatId); toast({ title: "Removed from favorites" }); }
      else { n.add(chatId); toast({ title: "Added to favorites" }); }
      return n;
    });
  };

  const handleDeleteUser = (userId: string) => {
    setFriends(prev => prev.filter(f => {
      const friendUser = f.requester.id === user?.id ? f.addressee : f.requester;
      return friendUser.id !== userId;
    }));
  };

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const summaryByUserId = new Map<string, ChatSummary>();
  chatSummaries.forEach(summary => {
    const partner = getChatPartnerFromSummary(summary, user?.id);
    if (partner) summaryByUserId.set(partner.id, summary);
  });

  const summaryByChatId = new Map<string, ChatSummary>();
  chatSummaries.forEach(s => summaryByChatId.set(s.chatId, s));

  const hiddenUsers = JSON.parse(localStorage.getItem('hidden-chat-users') || '[]');
  const visibleFriends = chatUsers.filter(f => !hiddenUsers.includes(f.id));

  // Apply filters
  const filteredFriends = useMemo(() => {
    let result = visibleFriends.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeFilter === 'unread') {
      result = result.filter(f => {
        const s = summaryByUserId.get(f.id);
        return s && s.unreadCount > 0;
      });
    } else if (activeFilter === 'favorites') {
      result = result.filter(f => {
        const s = summaryByUserId.get(f.id);
        return s && favoriteChats.has(s.chatId);
      });
    } else if (activeFilter === 'groups') {
      result = []; // groups shown separately
    }

    // Filter out archived
    if (!showArchived) {
      result = result.filter(f => {
        const s = summaryByUserId.get(f.id);
        return !s || !archivedChats.has(s.chatId);
      });
    }

    return result;
  }, [visibleFriends, searchTerm, activeFilter, archivedChats, showArchived, favoriteChats]);

  const filteredGroups = useMemo(() => {
    let result = groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (activeFilter === 'unread') {
      result = result.filter(g => { const s = summaryByChatId.get(g.id); return s && s.unreadCount > 0; });
    } else if (activeFilter === 'favorites') {
      result = result.filter(g => favoriteChats.has(g.id));
    }
    if (!showArchived) result = result.filter(g => !archivedChats.has(g.id));
    else result = result.filter(g => archivedChats.has(g.id));
    return result;
  }, [groups, searchTerm, activeFilter, archivedChats, showArchived, favoriteChats]);

  const sortedFriends = [...filteredFriends].sort((a, b) => {
    const aP = pinnedFriends.has(a.id); const bP = pinnedFriends.has(b.id);
    if (aP && !bP) return -1; if (!aP && bP) return 1;
    return getSummarySortTime(summaryByUserId.get(b.id)) - getSummarySortTime(summaryByUserId.get(a.id)) || a.name.localeCompare(b.name);
  });

  const archivedCount = archivedChats.size;

  if (selectedGroup) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        <GroupChatPopup groupId={selectedGroup} onClose={() => setSelectedGroup(null)} />
      </div>
    );
  }

  if (selectedFriend) {
    if (selectedFriend.id === 'wizai') return <WizAiChat onClose={() => setSelectedFriend(null)} />;
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        <ChatPopup user={selectedFriend} onClose={() => setSelectedFriend(null)} />
      </div>
    );
  }

  const filterChips: { key: ChatFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'groups', label: 'Groups' },
  ];

  return (
    <Layout>
      {/* PART E: Fixed header + scrollable chat list */}
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* FIXED HEADER: Search + WizAi + Filters */}
        <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-background border-b border-border">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-bold text-foreground">Chat</h1>
              <div className="flex items-center gap-2">
                <Button onClick={() => setIsCreateGroupOpen(true)} size="sm" className="gap-1 btn-primary">
                  <Plus className="w-4 h-4" /> New Group
                </Button>
                {isOffline && (
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <WifiOff className="w-3 h-3" /> Offline
                  </div>
                )}
              </div>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search chats..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 text-foreground border border-border rounded-full" />
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {filterChips.map(chip => (
                <button
                  key={chip.key}
                  onClick={() => { setActiveFilter(chip.key); setShowArchived(false); }}
                  className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeFilter === chip.key && !showArchived
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SCROLLABLE CHAT LIST */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Archived button */}
            {archivedCount > 0 && !showArchived && (
              <button
                onClick={() => setShowArchived(true)}
                className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors border-b border-border"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Archive className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-foreground">Archived ({archivedCount})</span>
              </button>
            )}

            {showArchived && (
              <button onClick={() => setShowArchived(false)} className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors border-b border-border">
                <span className="text-sm text-primary font-medium">← Back to chats</span>
              </button>
            )}

            {loading && !isOffline ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2"><Skeleton className="w-32 h-4" /><Skeleton className="w-48 h-3" /></div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {/* WizAi - always at top, not in archived view */}
                {!showArchived && activeFilter !== 'groups' && (
                  <ChatListItem friend={WIZAI_USER} onClick={() => setSelectedFriend(WIZAI_USER)} isPinned isWizAi />
                )}

                {/* Groups */}
                {(activeFilter === 'all' || activeFilter === 'groups' || activeFilter === 'unread' || activeFilter === 'favorites') && filteredGroups.map((group) => {
                  const groupSummary = summaryByChatId.get(group.id);
                  let groupPreview = '';
                  let groupPreviewTime: Date | null = null;
                  const unread = groupSummary?.unreadCount || 0;

                  if (groupSummary) {
                    groupPreview = groupSummary.lastMessageContent || '';
                    if (groupSummary.lastMessageType === 'image') groupPreview = '📷 Photo';
                    else if (groupSummary.lastMessageType === 'video') groupPreview = '🎥 Video';
                    if (groupPreview.length > 60) groupPreview = groupPreview.substring(0, 60) + '...';
                    groupPreviewTime = groupSummary.lastMessageCreatedAt ? new Date(groupSummary.lastMessageCreatedAt) : null;
                  } else {
                    try {
                      const cached = localStorage.getItem(`wizchat_group_preview_${group.id}`);
                      if (cached) { const p = JSON.parse(cached); groupPreview = p.message || ''; groupPreviewTime = p.time ? new Date(p.time) : null; }
                    } catch {}
                  }

                  return (
                    <div
                      key={group.id}
                      onClick={() => setSelectedGroup(group.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        // Group context menu handled inline
                      }}
                      className="flex items-center justify-between p-4 hover:bg-accent cursor-pointer transition-colors relative group"
                      style={{ borderBottom: '1px solid hsla(142, 60%, 49%, 0.2)' }}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={group.avatar || undefined} />
                          <AvatarFallback className="bg-primary/20"><Users className="w-5 h-5 text-primary" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-foreground truncate">{group.name}</p>
                              {favoriteChats.has(group.id) && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                            </div>
                            {groupPreviewTime && <span className="text-xs text-muted-foreground flex-shrink-0">{formatGroupTime(groupPreviewTime)}</span>}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm truncate ${unread > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                              {groupPreview || `${group.member_count || 0} members`}
                            </p>
                            {unread > 0 && (
                              <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-[11px] font-bold rounded-full flex items-center justify-center">
                                {unread > 99 ? '99+' : unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Friends list */}
                {activeFilter !== 'groups' && sortedFriends.map((friend) => (
                  <ChatListItem
                    key={friend.id}
                    friend={friend}
                    onClick={() => setSelectedFriend(friend)}
                    isPinned={pinnedFriends.has(friend.id)}
                    onPinToggle={() => handlePinToggle(friend.id)}
                    onDelete={handleDeleteUser}
                    chatSummary={summaryByUserId.get(friend.id)}
                    onArchive={() => {
                      const s = summaryByUserId.get(friend.id);
                      if (s) {
                        if (showArchived) handleUnarchiveChat(s.chatId);
                        else handleArchiveChat(s.chatId);
                      }
                    }}
                    onFavorite={() => {
                      const s = summaryByUserId.get(friend.id);
                      if (s) handleFavoriteToggle(s.chatId);
                    }}
                    isFavorite={(() => { const s = summaryByUserId.get(friend.id); return s ? favoriteChats.has(s.chatId) : false; })()}
                    isArchived={showArchived}
                  />
                ))}

                {filteredFriends.length === 0 && filteredGroups.length === 0 && (
                  <div className="p-8 text-center">
                    <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{searchTerm ? 'No results found' : showArchived ? 'No archived chats' : 'No chats to display'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateGroupDialog isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} friends={acceptedFriends} onGroupCreated={handleGroupCreated} />
    </Layout>
  );
};

export default Chat;
