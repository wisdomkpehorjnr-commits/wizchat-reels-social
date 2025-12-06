import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import ChatPopup from '@/components/ChatPopup';
import WizAiChat from '@/components/WizAiChat';
import ChatListItem from '@/components/ChatListItem';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MessageCircle, Bot } from 'lucide-react';
import { Friend, User } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCache } from '@/hooks/useCache';
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

interface ChatWithLastMessage {
  friendUser: User;
  lastMessageTime: Date | null;
  hasMessages: boolean;
}

const Chat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { cachedData: cachedFriends, setCache: setCachedFriends, isStale } = useCache<Friend[]>({ 
    key: 'chat-friends-list',
    ttl: 2 * 60 * 1000 // 2 minutes cache
  });
  
  const [friends, setFriends] = useState<Friend[]>(cachedFriends || []);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(!cachedFriends);
  const [pinnedFriends, setPinnedFriends] = useState<Set<string>>(new Set());
  const [hiddenChats, setHiddenChats] = useState<Set<string>>(new Set());
  const [chatOrder, setChatOrder] = useState<Map<string, Date>>(new Map());

  useEffect(() => {
    // Load hidden chats from localStorage
    const stored = localStorage.getItem('hidden-chats');
    if (stored) {
      try {
        setHiddenChats(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error('Error loading hidden chats:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
    
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

  const loadData = async () => {
    if (!user) return;
    
    try {
      // Show cached data immediately if available
      if (!isStale && cachedFriends) {
        setFriends(cachedFriends);
        setLoading(false);
      } else {
        setLoading(true);
      }
      
      const userFriends = await dataService.getFriends();
      setFriends(userFriends);
      setCachedFriends(userFriends); // Update cache
      
      // Fetch last message times for sorting
      await loadChatOrder(userFriends);
    } catch (error) {
      console.error('Error loading friends:', error);
      toast({
        title: "Error",
        description: "Failed to load friends",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadChatOrder = async (friendsList: Friend[]) => {
    if (!user) return;
    
    const orderMap = new Map<string, Date>();
    
    for (const friend of friendsList.filter(f => f.status === 'accepted')) {
      const friendUser = friend.requester.id === user.id ? friend.addressee : friend.requester;
      
      try {
        // Find chat between users
        const { data: chats } = await supabase
          .from('chats')
          .select('id')
          .eq('is_group', false)
          .limit(50);
        
        if (chats) {
          for (const chat of chats) {
            const { data: participants } = await supabase
              .from('chat_participants')
              .select('user_id')
              .eq('chat_id', chat.id);
            
            if (participants && participants.length === 2) {
              const userIds = participants.map(p => p.user_id);
              if (userIds.includes(user.id) && userIds.includes(friendUser.id)) {
                // Get last message time
                const { data: messages } = await supabase
                  .from('messages')
                  .select('created_at')
                  .eq('chat_id', chat.id)
                  .order('created_at', { ascending: false })
                  .limit(1);
                
                if (messages && messages.length > 0) {
                  orderMap.set(friendUser.id, new Date(messages[0].created_at));
                }
                break;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading chat order:', error);
      }
    }
    
    setChatOrder(orderMap);
  };

  const openChat = (friend: User) => {
    // Remove from hidden when opening chat
    if (hiddenChats.has(friend.id)) {
      const newHidden = new Set(hiddenChats);
      newHidden.delete(friend.id);
      setHiddenChats(newHidden);
      localStorage.setItem('hidden-chats', JSON.stringify([...newHidden]));
    }
    setSelectedFriend(friend);
  };

  const handleHideChat = (userId: string) => {
    const newHidden = new Set(hiddenChats);
    newHidden.add(userId);
    setHiddenChats(newHidden);
    localStorage.setItem('hidden-chats', JSON.stringify([...newHidden]));
  };

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  
  // Get friend user data
  const friendsData = acceptedFriends.map(friend => 
    friend.requester.id === user?.id ? friend.addressee : friend.requester
  );

  // Filter out hidden chats and apply search
  const filteredFriends = friendsData
    .filter(friend => !hiddenChats.has(friend.id))
    .filter(friend =>
      friend.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Sort friends: pinned first, then by most recent message, then alphabetically
  const sortedFriends = [...filteredFriends].sort((a, b) => {
    const aIsPinned = pinnedFriends.has(a.id);
    const bIsPinned = pinnedFriends.has(b.id);
    
    // Pinned first
    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;
    
    // Then by most recent message
    const aTime = chatOrder.get(a.id);
    const bTime = chatOrder.get(b.id);
    
    if (aTime && bTime) {
      return bTime.getTime() - aTime.getTime(); // Most recent first
    }
    if (aTime && !bTime) return -1;
    if (!aTime && bTime) return 1;
    
    // Finally alphabetically
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
                  
                  {/* Friends list for chatting - sorted by recent activity */}
                  {sortedFriends.map((friend) => (
                    <ChatListItem
                      key={friend.id}
                      friend={friend}
                      onClick={() => openChat(friend)}
                      isPinned={pinnedFriends.has(friend.id)}
                      onPinToggle={() => handlePinToggle(friend.id)}
                      onHideChat={handleHideChat}
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