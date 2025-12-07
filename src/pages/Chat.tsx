import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import ChatPopup from '@/components/ChatPopup';
import WizAiChat from '@/components/WizAiChat';
import ChatListItem from '@/components/ChatListItem';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, MessageCircle } from 'lucide-react';
import { Friend, User } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { offlineChatService, CachedChat } from '@/services/offlineChatService';
import { supabase } from '@/integrations/supabase/client';

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
  const [friends, setFriends] = useState<Friend[]>([]);
  const [cachedChats, setCachedChats] = useState<CachedChat[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false); // Start false - show cache immediately
  const [pinnedFriends, setPinnedFriends] = useState<Set<string>>(new Set());
  const [hiddenChats, setHiddenChats] = useState<Set<string>>(new Set());

  // Load cached data INSTANTLY on mount
  useEffect(() => {
    if (user) {
      loadCachedChatsInstantly();
    }
  }, [user]);

  // Load hidden chats from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('hidden-chats');
    if (stored) {
      try {
        setHiddenChats(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error('Error loading hidden chats:', e);
      }
    }
  }, []);

  // Listen for custom event to open chat with a specific user
  useEffect(() => {
    const handleOpenChatWithUser = async (event: CustomEvent) => {
      const { userId } = event.detail;
      if (!userId) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (profile) {
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
          
          // Unhide if hidden
          if (hiddenChats.has(userId)) {
            const newHidden = new Set(hiddenChats);
            newHidden.delete(userId);
            setHiddenChats(newHidden);
            localStorage.setItem('hidden-chats', JSON.stringify([...newHidden]));
          }
          
          setSelectedFriend(chatUser);
        }
      } catch (error) {
        console.error('Error opening chat:', error);
      }
    };
    
    window.addEventListener('openChatWithUser', handleOpenChatWithUser as EventListener);
    return () => window.removeEventListener('openChatWithUser', handleOpenChatWithUser as EventListener);
  }, [hiddenChats]);

  /**
   * INSTANT LOAD: Load from IndexedDB cache first (0.1s), no skeletons
   */
  const loadCachedChatsInstantly = async () => {
    if (!user) return;
    
    try {
      // 1. Load from local cache INSTANTLY
      const cached = await offlineChatService.getCachedChats(user.id);
      if (cached.length > 0) {
        setCachedChats(cached);
      }
      
      // 2. Also load friends for fallback
      const storedFriends = localStorage.getItem('cached-friends');
      if (storedFriends) {
        try {
          setFriends(JSON.parse(storedFriends));
        } catch (e) {}
      }
      
      // 3. Background sync with server (if online)
      if (navigator.onLine) {
        syncInBackground();
      }
    } catch (error) {
      console.error('Error loading cached chats:', error);
    }
  };

  /**
   * BACKGROUND SYNC: Silently update cache from server
   */
  const syncInBackground = useCallback(async () => {
    if (!user) return;
    
    try {
      // Sync chats
      const freshChats = await offlineChatService.syncChatsFromServer(user.id);
      if (freshChats.length > 0) {
        setCachedChats(freshChats);
      }
      
      // Also sync friends list
      const userFriends = await dataService.getFriends();
      setFriends(userFriends);
      localStorage.setItem('cached-friends', JSON.stringify(userFriends));
    } catch (error) {
      console.error('Background sync error:', error);
    }
  }, [user]);
      
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
        
        // Remove from hidden if opening their chat
        if (hiddenChats.has(userId)) {
          const newHidden = new Set(hiddenChats);
          newHidden.delete(userId);
          setHiddenChats(newHidden);
          localStorage.setItem('hidden-chats', JSON.stringify([...newHidden]));
        }
        
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
    };
  }, [user, toast, hiddenChats]);

  const openChat = (friend: User) => {
    if (hiddenChats.has(friend.id)) {
      const newHidden = new Set(hiddenChats);
      newHidden.delete(friend.id);
      setHiddenChats(newHidden);
      localStorage.setItem('hidden-chats', JSON.stringify([...newHidden]));
    }
    setSelectedFriend(friend);
  };

  const handleHideChat = async (userId: string) => {
    const newHidden = new Set(hiddenChats);
    newHidden.add(userId);
    setHiddenChats(newHidden);
    localStorage.setItem('hidden-chats', JSON.stringify([...newHidden]));
    
    // Also update in offline cache
    const chat = cachedChats.find(c => c.participantId === userId);
    if (chat) {
      await offlineChatService.hideChat(chat.id);
    }
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

  // Build the chat list from cached chats + friends (merged, deduplicated)
  const getChatListData = () => {
    const chatMap = new Map<string, { user: User; lastMessageTime?: Date }>();
    
    // Add cached chats first (they have message history)
    cachedChats.forEach(chat => {
      if (!hiddenChats.has(chat.participantId)) {
        chatMap.set(chat.participantId, {
          user: chat.participant,
          lastMessageTime: chat.lastMessageTime
        });
      }
    });
    
    // Add friends who might not have cached chats yet
    const acceptedFriends = friends.filter(f => f.status === 'accepted');
    acceptedFriends.forEach(friend => {
      const friendUser = friend.requester.id === user?.id ? friend.addressee : friend.requester;
      if (!hiddenChats.has(friendUser.id) && !chatMap.has(friendUser.id)) {
        chatMap.set(friendUser.id, { user: friendUser });
      }
    });
    
    // Convert to array and sort
    return Array.from(chatMap.values())
      .filter(item => item.user.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const aIsPinned = pinnedFriends.has(a.user.id);
        const bIsPinned = pinnedFriends.has(b.user.id);
        
        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;
        
        const aTime = a.lastMessageTime?.getTime() || 0;
        const bTime = b.lastMessageTime?.getTime() || 0;
        
        if (aTime && bTime) return bTime - aTime;
        if (aTime) return -1;
        if (bTime) return 1;
        
        return a.user.name.localeCompare(b.user.name);
      });
  };

  const sortedChatList = getChatListData();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 green-border mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-foreground">Chat</CardTitle>
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

          {/* Chat List - NO SKELETONS, instant load from cache */}
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
                
                {/* Chat list - sorted by recent activity */}
                {sortedChatList.map((item) => (
                  <ChatListItem
                    key={item.user.id}
                    friend={item.user}
                    onClick={() => openChat(item.user)}
                    isPinned={pinnedFriends.has(item.user.id)}
                    onPinToggle={() => handlePinToggle(item.user.id)}
                    onHideChat={handleHideChat}
                  />
                ))}
                
                {sortedChatList.length === 0 && (
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
        </div>
      </div>
    </Layout>
  );
};

export default Chat;