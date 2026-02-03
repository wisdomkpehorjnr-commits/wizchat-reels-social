import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import ChatPopup from '@/components/ChatPopup';
import WizAiChat from '@/components/WizAiChat';
import ChatListItem from '@/components/ChatListItem';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MessageCircle, Bot, WifiOff } from 'lucide-react';
import { Friend, User } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CHAT_LIST_CACHE_KEY = 'wizchat_chat_list_cache';

// =============================================
// PERSISTENT MODULE-LEVEL STORE (survives all remounts)
// =============================================
interface ChatStore {
  friends: Friend[];
  lastFetchTime: number;
  isInitialized: boolean;
}

const chatStore: ChatStore = {
  friends: [],
  lastFetchTime: 0,
  isInitialized: false,
};

const CHAT_MIN_REFRESH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

// SYNCHRONOUS initialization from localStorage on module load
(() => {
  if (chatStore.isInitialized) return;
  
  try {
    const cached = localStorage.getItem(CHAT_LIST_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.data && Array.isArray(parsed.data)) {
        chatStore.friends = parsed.data;
        chatStore.lastFetchTime = parsed.timestamp || 0;
        console.debug('[Chat] INSTANT hydration from localStorage:', parsed.data.length, 'friends');
      }
    }
  } catch (e) {
    console.debug('[Chat] localStorage hydration failed:', e);
  }
  chatStore.isInitialized = true;
})();

const saveChatListToCache = (friends: Friend[]) => {
  try {
    localStorage.setItem(CHAT_LIST_CACHE_KEY, JSON.stringify({
      data: friends,
      timestamp: Date.now()
    }));
    chatStore.friends = friends;
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

const Chat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // INSTANT display from module store - NO loading if we have cached data
  const hasCachedData = chatStore.friends.length > 0;
  
  const [friends, setFriends] = useState<Friend[]>(chatStore.friends);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(!hasCachedData);
  const [pinnedFriends, setPinnedFriends] = useState<Set<string>>(new Set());
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
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
    
    return () => {
      window.removeEventListener('openChatWithUser', handleOpenChatWithUser as EventListener);
      window.removeEventListener('chatListUpdate', handleChatListUpdate);
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
      
      // Persist to localStorage for instant hydration next time
      saveChatListToCache(userFriends);
    } catch (error) {
      console.error('Error loading friends:', error);
      if (!silent) {
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

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  
  // Get friend user data
  const friendsData = acceptedFriends.map(friend => 
    friend.requester.id === user?.id ? friend.addressee : friend.requester
  );

  // Get hidden users from localStorage
  const hiddenUsers = JSON.parse(localStorage.getItem('hidden-chat-users') || '[]');
  
  // Filter out hidden users
  const visibleFriends = friendsData.filter(friend => !hiddenUsers.includes(friend.id));

  const filteredFriends = visibleFriends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase())
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
    return a.name.localeCompare(b.name);
  });

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
                {isOffline && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <WifiOff className="w-4 h-4" />
                    Offline
                  </div>
                )}
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

          {loading ? (
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
                  
                  {/* Friends list for chatting */}
                   {sortedFriends.map((friend) => (
                     <ChatListItem
                       key={friend.id}
                       friend={friend}
                       onClick={() => openChat(friend)}
                       isPinned={pinnedFriends.has(friend.id)}
                       onPinToggle={() => handlePinToggle(friend.id)}
                       onDelete={handleDeleteUser}
                     />
                   ))}
                  
                  {filteredFriends.length === 0 && (
                    <div className="p-8 text-center">
                      <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {searchTerm ? 'No friends found' : 'No friends to chat with'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Add friends to start conversations
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
