import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import ChatInterface from '@/components/ChatInterface';
import CreateGroupChat from '@/components/CreateGroupChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Users, MessageCircle } from 'lucide-react';
import { Chat as ChatType, Friend, User } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Chat = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatType[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('Loading chat data...');
      
      // Load friends and chats in parallel
      const [userFriends, userChats] = await Promise.all([
        dataService.getFriends().catch(err => {
          console.error('Error loading friends:', err);
          return [];
        }),
        dataService.getChats().catch(err => {
          console.error('Error loading chats:', err);
          return [];
        })
      ]);
      
      console.log('Loaded friends:', userFriends.length);
      console.log('Loaded chats:', userChats.length);
      
      setFriends(userFriends);
      setChats(userChats);
    } catch (error) {
      console.error('Error loading chat data:', error);
      toast({
        title: "Error",
        description: "Failed to load chat data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createDirectChat = async (friendUser: User) => {
    if (!user) return;
    
    try {
      console.log('Creating direct chat with:', friendUser.name);
      
      // Check if chat already exists
      const existingChat = chats.find(chat => 
        !chat.isGroup && chat.participants.some(p => p.id === friendUser.id)
      );
      
      if (existingChat) {
        console.log('Chat already exists, opening:', existingChat.id);
        setSelectedChat(existingChat);
        return;
      }

      // Create new direct chat
      const newChat = await dataService.createChat([friendUser.id], false);
      
      console.log('Created new chat:', newChat.id);
      
      // Add current user and friend to participants for UI
      const chatWithParticipants: ChatType = {
        ...newChat,
        participants: [friendUser]
      };
      
      setChats(prev => [...prev, chatWithParticipants]);
      setSelectedChat(chatWithParticipants);
      
      toast({
        title: "Success",
        description: `Started chat with ${friendUser.name}`,
      });
    } catch (error) {
      console.error('Error creating direct chat:', error);
      toast({
        title: "Error",
        description: "Failed to create chat",
        variant: "destructive"
      });
    }
  };

  const handleGroupCreated = async () => {
    await loadData();
    setShowCreateGroup(false);
  };

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  
  // Get friend user data
  const friendsData = acceptedFriends.map(friend => 
    friend.requester.id === user?.id ? friend.addressee : friend.requester
  );

  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true;
    
    if (chat.isGroup && chat.name) {
      return chat.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    return chat.participants.some(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const filteredFriends = friendsData.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedChat) {
    return (
      <Layout>
        <div className="h-[calc(100vh-4rem)]">
          <ChatInterface 
            chat={selectedChat} 
            onClose={() => setSelectedChat(null)} 
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 green-border mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-foreground">Messages</CardTitle>
                <Button
                  onClick={() => setShowCreateGroup(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Group
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
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
                    <div key={i} className="flex items-center space-x-3 animate-pulse">
                      <div className="w-12 h-12 bg-muted rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="w-32 h-4 bg-muted rounded" />
                        <div className="w-48 h-3 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 green-border">
              <CardContent className="p-0">
                <div className="divide-y">
                  {/* Existing Chats */}
                  {filteredChats.map((chat) => (
                    <div
                      key={chat.id}
                      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedChat(chat)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={chat.isGroup ? chat.avatar : chat.participants[0]?.avatar} />
                            <AvatarFallback className="text-foreground bg-muted">
                              {chat.isGroup ? <Users className="w-6 h-6" /> : chat.participants[0]?.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {chat.unreadCount && chat.unreadCount > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                            >
                              {chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium truncate text-foreground">
                              {chat.isGroup ? chat.name : chat.participants[0]?.name}
                            </h3>
                            {chat.lastMessage && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-sm text-muted-foreground truncate">
                              {chat.lastMessage ? chat.lastMessage.content || 'Media message' : 'No messages yet'}
                            </p>
                            {chat.isGroup && (
                              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <Users className="w-3 h-3" />
                                <span>{chat.participants.length}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Friends (for starting new chats) */}
                  {filteredFriends.map((friend) => (
                    <div
                      key={`friend-${friend.id}`}
                      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => createDirectChat(friend)}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={friend.avatar} />
                          <AvatarFallback className="text-foreground bg-muted">
                            {friend.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate text-foreground">
                            {friend.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Start a conversation
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredChats.length === 0 && filteredFriends.length === 0 && (
                    <div className="p-8 text-center">
                      <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {searchTerm ? 'No chats found' : 'No conversations yet'}
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

      {showCreateGroup && (
        <CreateGroupChat 
          onClose={() => setShowCreateGroup(false)} 
          onGroupCreated={handleGroupCreated}
        />
      )}
    </Layout>
  );
};

export default Chat;
