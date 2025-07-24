
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
import { Chat as ChatType, Friend } from '@/types';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';

const Chat = () => {
  const [chats, setChats] = useState<ChatType[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userChats, userFriends] = await Promise.all([
        dataService.getChats(),
        dataService.getFriends()
      ]);
      setChats(userChats);
      setFriends(userFriends);
    } catch (error) {
      console.error('Error loading chat data:', error);
      toast({
        title: "Error",
        description: "Failed to load chats",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createDirectChat = async (friendId: string) => {
    try {
      // Check if chat already exists
      const existingChat = chats.find(chat => 
        !chat.isGroup && chat.participants.some(p => p.id === friendId)
      );
      
      if (existingChat) {
        setSelectedChat(existingChat);
        return;
      }

      // Create new direct chat
      const newChat = await dataService.createChat({
        participants: [friendId],
        isGroup: false
      });
      
      await loadData();
      setSelectedChat(newChat);
    } catch (error) {
      console.error('Error creating direct chat:', error);
      toast({
        title: "Error",
        description: "Failed to create chat",
        variant: "destructive"
      });
    }
  };

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const allItems = [
    ...chats,
    ...acceptedFriends.filter(friend => 
      !chats.some(chat => 
        !chat.isGroup && chat.participants.some(p => p.id === friend.addressee.id || p.id === friend.requester.id)
      )
    ).map(friend => ({
      ...friend,
      isFriend: true
    }))
  ];

  const filteredItems = allItems.filter(item => {
    if ('name' in item && item.name) {
      return item.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    if ('isFriend' in item) {
      const friendData = item.addressee || item.requester;
      return friendData.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    if ('participants' in item) {
      return item.participants.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return false;
  });

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
                  {filteredItems.map((item, index) => {
                    const isChat = 'participants' in item;
                    const isFriend = 'isFriend' in item;
                    
                    if (isChat) {
                      const chat = item as ChatType;
                      return (
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
                      );
                    }
                    
                    if (isFriend) {
                      const friend = item as Friend & { isFriend: boolean };
                      const friendData = friend.addressee.id !== friend.requester.id ? friend.addressee : friend.requester;
                      
                      return (
                        <div
                          key={`friend-${friend.id}`}
                          className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => createDirectChat(friendData.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={friendData.avatar} />
                              <AvatarFallback className="text-foreground bg-muted">
                                {friendData.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate text-foreground">
                                {friendData.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Start a conversation
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return null;
                  })}
                  
                  {filteredItems.length === 0 && (
                    <div className="p-8 text-center">
                      <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {searchTerm ? 'No chats found' : 'No conversations yet'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Start a new conversation or create a group chat
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
          onGroupCreated={loadData}
        />
      )}
    </Layout>
  );
};

export default Chat;
