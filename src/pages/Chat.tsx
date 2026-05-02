import React, { useState, useEffect, useRef } from 'react';
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
import { Search, MessageCircle, Bot, WifiOff, Plus, Users } from 'lucide-react';
import { Friend, User } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchChatSummaries, getCachedSummaries, ChatSummary, markChatDelivered } from '@/services/chatRealtimeService';

const CHAT_LIST_CACHE_KEY = 'wizchat_chat_list_cache';

// =============================================
// PERSISTENT MODULE-LEVEL STORE (survives all remounts)
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

const CHAT_MIN_REFRESH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

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
  if (!currentUserId || summary.isGroup || !Array.isArray(summary.participants)) {
    return null;
  }

  const partner = summary.participants.find((participant: any) => participant?.id && participant.id !== currentUserId);
  return partner ? normalizeCachedUser(partner) : null;
};

const getSummarySortTime = (summary?: ChatSummary | null) => {
  const timestamp = summary?.lastMessageCreatedAt || summary?.updatedAt || summary?.createdAt;
  return timestamp ? new Date(timestamp).getTime() : 0;
};

// SYNCHRONOUS initialization from localStorage on module load
(() => {
  if (chatStore.isInitialized) return;
  
  try {
    const cached = localStorage.getItem(CHAT_LIST_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.data && Array.isArray(parsed.data)) {
        chatStore.chatUsers = parsed.data.map(normalizeCachedUser);
        chatStore.lastFetchTime = parsed.timestamp || 0;
        console.debug('[Chat] INSTANT hydration from localStorage:', parsed.data.length, 'chat users');
      }
    }
  } catch (e) {
    console.debug('[Chat] localStorage hydration failed:', e);
  }
  chatStore.isInitialized = true;
})();

const saveChatListToCache = (chatUsers: User[]) => {
  try {
    localStorage.setItem(CHAT_LIST_CACHE_KEY, JSON.stringify({
      data: chatUsers,
      timestamp: Date.now()
    }));
    chatStore.chatUsers = chatUsers;
    chatStore.lastFetchTime = Date.now();
  } catch (e) {
    console.debug('[Chat] Failed to cache chat list:', e);
  }
};

const WIZAI_USER: User = {
  id: 'wizai',
  name: 'WizAi',
  email: 'wizai@wizchat.app',
  username: 'wizai',
  avatar: 'data:image/svg+xml;utf8,<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" rx="100" fill="white"/><ellipse cx="100" cy="85" rx="55" ry="45" fill="black"/><ellipse cx="82" cy="80" rx="6" ry="6" fill="white"/><ellipse cx="118" cy="80" rx="6" ry="6" fill="white"/><rect x="70" y="124" width="60" height="19" rx="9.5" fill="black" stroke="white" stroke-width="4"/></svg>',
  bio: 'Your AI assistant',
  photoURL: '',
  followerCount: 0,
  followingCount: 0,
  profileViews: 0,
  createdAt: new Date(),
};

const GROUPS_CACHE_KEY = 'wizchat_groups_cache';

// Load cached groups synchronously for instant display
let _cachedGroups: any[] = [];
try {
  const cached = localStorage.getItem(GROUPS_CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed?.data && Array.isArray(parsed.data)) {
      _cachedGroups = parsed.data;
    }
  }
} catch (e) {
  console.debug('[Chat] groups localStorage hydration failed:', e);
}

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

const Chat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // INSTANT display from module store - NO loading if we have cached data
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
  const [pinnedGroups, setPinnedGroups] = useState<Set<string>>(new Set());
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const hasLoadedRef = useRef(false);

  // Network status listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Silent refresh when coming back online
      loadData(true);
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      
      const now = Date.now();
      const timeSinceLastFetch = now - chatStore.lastFetchTime;
      const isCacheStale = timeSinceLastFetch > CHAT_MIN_REFRESH_INTERVAL_MS;
      
      if (hasCachedData && !isCacheStale) {
        console.debug('[Chat] Cache fresh, skipping network fetch');
        setLoading(false);
        return;
      }
      
      // Background refresh if we have cached data
      loadData(hasCachedData);
    }
    
    // Listen for chat list updates (when hidden users send messages)
    const handleChatListUpdate = () => {
      loadData(true); // silent refresh
    };
    window.addEventListener('chatListUpdate', handleChatListUpdate);
    
    // Listen for custom event to open chat with a specific user
    const handleOpenChatWithUser = async (event: CustomEvent) => {
      const { userId, chatId } = event.detail;
      
      if (!userId) return;
      
      try {
        // Fetch user profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (error || !profile) {
          toast({
            title: "Error",
            description: "User not found",
            variant: "destructive"
          });
          return;
        }
        
        const chatUser: User = {
          id: profile.id,
          name: profile.name,
          username: profile.username,
          email: profile.email,
          avatar: profile.avatar,
          photoURL: profile.avatar,
          bio: profile.bio,
          followerCount: profile.follower_count || 0,
          followingCount: profile.following_count || 0,
          profileViews: profile.profile_views || 0,
          createdAt: new Date(profile.created_at)
        };
        
        setSelectedFriend(chatUser);
      } catch (error) {
        console.error('Error opening chat with user:', error);
        toast({
          title: "Error",
          description: "Failed to open chat",
          variant: "destructive"
        });
      }
    };
    
    window.addEventListener('openChatWithUser', handleOpenChatWithUser as EventListener);
    
    // Realtime subscription for chat list updates — optimistic local update
    const chatListChannel = supabase
      .channel('chat_list_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as any;
          if (msg.user_id !== user?.id) {
            markChatDelivered(msg.chat_id).catch(() => {});
          }
          // Optimistic update: patch the local summaries instantly
          setChatSummaries(prev => {
            const idx = prev.findIndex(s => s.chatId === msg.chat_id);
            const now = msg.created_at || new Date().toISOString();
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                lastMessageId: msg.id,
                lastMessageContent: msg.content,
                lastMessageType: msg.type,
                lastMessageMediaUrl: msg.media_url,
                lastMessageCreatedAt: now,
                lastMessageUserId: msg.user_id,
                updatedAt: now,
                unreadCount: msg.user_id !== user?.id ? updated[idx].unreadCount + 1 : updated[idx].unreadCount,
              };
              return updated;
            }
            return prev;
          });
          // Debounced background refresh to get full data (new chats, participant info, etc.)
          clearTimeout((window as any).__chatListRefreshTimer);
          (window as any).__chatListRefreshTimer = setTimeout(() => loadData(true), 3000);
        }
      )
      .subscribe();

    // Listen for chatMessageReceived events from ChatPopup (for sent messages)
    const handleChatMsgReceived = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      setChatSummaries(prev => {
        const idx = prev.findIndex(s => s.chatId === detail.chatId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            lastMessageContent: detail.content,
            lastMessageType: detail.type,
            lastMessageCreatedAt: detail.createdAt || new Date().toISOString(),
            lastMessageUserId: detail.userId,
            updatedAt: detail.createdAt || new Date().toISOString(),
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
      // Only show loading if no cached data and not silent
      if (!silent && !hasCachedData) {
        setLoading(true);
      }

      const userFriends = await dataService.getFriends();
      setFriends(userFriends);
      const acceptedFriendUsers = userFriends
        .filter(friend => friend.status === 'accepted')
        .map(friend => normalizeCachedUser(friend.requester.id === user.id ? friend.addressee : friend.requester));

      let nextChatUsers = acceptedFriendUsers;

      // Load chat summaries (includes groups, DMs, unread counts, last message)
      try {
        const summaries = await fetchChatSummaries();
        setChatSummaries(summaries);

        const mergedUsers = new Map<string, User>();
        [...acceptedFriendUsers, ...summaries
          .map(summary => getChatPartnerFromSummary(summary, user.id))
          .filter((chatUser): chatUser is User => Boolean(chatUser))]
          .forEach(chatUser => {
            const existing = mergedUsers.get(chatUser.id);
            mergedUsers.set(chatUser.id, {
              ...existing,
              ...chatUser,
              photoURL: chatUser.photoURL || existing?.photoURL || chatUser.avatar,
              avatar: chatUser.avatar || existing?.avatar || chatUser.photoURL,
            });
          });

        nextChatUsers = Array.from(mergedUsers.values());

        const groupChats = summaries.filter(s => s.isGroup);
        const groupsForDisplay = groupChats.map(s => ({
          id: s.chatId,
          name: s.name || 'Group Chat',
          member_count: s.memberCount || 0,
          description: s.description,
          avatar: s.avatarUrl,
        }));
        setGroups(groupsForDisplay);
        try {
          localStorage.setItem(GROUPS_CACHE_KEY, JSON.stringify({ data: groupsForDisplay, timestamp: Date.now() }));
        } catch (e) {
          console.debug('[Chat] Failed to cache groups:', e);
        }
      } catch (error) {
        console.debug('[Chat] Error loading chat summaries:', error);
      }

      setChatUsers(nextChatUsers);
      saveChatListToCache(nextChatUsers);
    } catch (error) {
      console.error('Error loading friends:', error);
      if (!silent && navigator.onLine) {
        toast({
          title: "Error",
          description: "Failed to load friends",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const openChat = (friend: User) => {
    setSelectedFriend(friend);
  };

  const handleGroupCreated = async (groupId: string, groupName?: string) => {
    // Optimistically add a placeholder group (uses chat ID now)
    setGroups(prev => {
      if (prev.find(g => g.id === groupId)) return prev;
      const placeholder = { id: groupId, name: groupName || 'New Group', member_count: 0 };
      return [placeholder, ...prev];
    });

    // Open the group chat immediately
    setSelectedGroup(groupId);

    // Reload chat list in background to get full data
    loadData(true);
  };

  const handlePinToggle = (friendId: string) => {
    setPinnedFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        newSet.add(friendId);
      }
      return newSet;
    });
  };

  const handleGroupPinToggle = (groupId: string) => {
    setPinnedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const summaryByUserId = new Map<string, ChatSummary>();
  chatSummaries.forEach(summary => {
    const partner = getChatPartnerFromSummary(summary, user?.id);
    if (partner) {
      summaryByUserId.set(partner.id, summary);
    }
  });
  
  const friendsData = chatUsers;

  // Get hidden users from localStorage
  const hiddenUsers = JSON.parse(localStorage.getItem('hidden-chat-users') || '[]');
  
  // Filter out hidden users
  const visibleFriends = friendsData.filter(friend => !hiddenUsers.includes(friend.id));

  const filteredFriends = visibleFriends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter groups by search term
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle delete (hide) user from chat list
  const handleDeleteUser = (userId: string) => {
    // Already handled in ChatListItem, just refresh the list
    setFriends(prev => prev.filter(f => {
      const friendUser = f.requester.id === user?.id ? f.addressee : f.requester;
      return friendUser.id !== userId;
    }));
  };

  // Sort friends: pinned first, then alphabetically
  const sortedFriends = [...filteredFriends].sort((a, b) => {
    const aIsPinned = pinnedFriends.has(a.id);
    const bIsPinned = pinnedFriends.has(b.id);
    
    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;
    const activityDelta = getSummarySortTime(summaryByUserId.get(b.id)) - getSummarySortTime(summaryByUserId.get(a.id));
    if (activityDelta !== 0) return activityDelta;
    return a.name.localeCompare(b.name);
  });

  // Show group chat if selected
  if (selectedGroup) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        <GroupChatPopup 
          groupId={selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      </div>
    );
  }

  if (selectedFriend) {
    if (selectedFriend.id === 'wizai') {
      return <WizAiChat onClose={() => setSelectedFriend(null)} />;
    }
    
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        <ChatPopup 
          user={selectedFriend} 
          onClose={() => setSelectedFriend(null)} 
        />
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 green-border mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-foreground">Chat</CardTitle>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setIsCreateGroupOpen(true)}
                    size="sm"
                    className="gap-2 btn-primary"
                    title="Create a new group"
                  >
                    <Plus className="w-4 h-4" />
                    New Group
                  </Button>
                  {isOffline && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <WifiOff className="w-4 h-4" />
                      Offline
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-foreground border-2 green-border"
                />
              </div>
            </CardContent>
          </Card>

          {loading && !isOffline ? (
            <Card className="border-2 green-border">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="w-32 h-4" />
                        <Skeleton className="w-48 h-3" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 green-border">
              <CardContent className="p-0">
                <div>
                  {/* WizAi Chat - Always Pinned */}
                  <ChatListItem
                    friend={WIZAI_USER}
                    onClick={() => openChat(WIZAI_USER)}
                    isPinned
                    isWizAi
                  />
                  
                  {/* Groups */}
                  {filteredGroups.map((group) => {
                    // Get cached last message for group
                    const groupPreviewKey = `wizchat_group_preview_${group.id}`;
                    let groupPreview = '';
                    let groupPreviewTime: Date | null = null;
                    try {
                      const cached = localStorage.getItem(groupPreviewKey);
                      if (cached) {
                        const p = JSON.parse(cached);
                        groupPreview = p.message || '';
                        groupPreviewTime = p.time ? new Date(p.time) : null;
                      }
                    } catch {}

                    return (
                      <div
                        key={group.id}
                        onClick={() => setSelectedGroup(group.id)}
                        className="flex items-center justify-between p-4 hover:bg-accent cursor-pointer transition-colors"
                        style={{ borderBottom: '1px solid hsla(142, 60%, 49%, 0.2)' }}
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <Avatar className="h-12 w-12 flex-shrink-0">
                            <AvatarImage src={group.avatar || undefined} alt={`${group.name} avatar`} />
                            <AvatarFallback className="bg-primary/20">
                              <Users className="w-5 h-5 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="font-semibold text-foreground truncate">{group.name}</p>
                              {groupPreviewTime && (
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {formatGroupTime(groupPreviewTime)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {groupPreview || `${group.member_count || 0} members`}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Friends list for chatting */}
                   {sortedFriends.map((friend) => {
                     return (
                       <ChatListItem
                         key={friend.id}
                         friend={friend}
                         onClick={() => openChat(friend)}
                         isPinned={pinnedFriends.has(friend.id)}
                         onPinToggle={() => handlePinToggle(friend.id)}
                         onDelete={handleDeleteUser}
                          chatSummary={summaryByUserId.get(friend.id)}
                       />
                     );
                   })}
                  
                  {filteredFriends.length === 0 && filteredGroups.length === 0 && (
                    <div className="p-8 text-center">
                      <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {searchTerm ? 'No results found' : 'No chats to display'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Create a group or add friends to start conversations
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CreateGroupDialog
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        friends={acceptedFriends}
        onGroupCreated={handleGroupCreated}
      />
    </Layout>
  );
};

export default Chat;
