
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users, Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { VoiceService } from '@/services/voiceService';
import { User, Chat as ChatType, Friend, Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const Chat = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatType[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (user) {
      loadChats();
      loadFriends();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
    }
  }, [selectedChat]);

  const loadChats = async () => {
    try {
      const userChats = await dataService.getUserChats();
      setChats(userChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const userFriends = await dataService.getUserFriends();
      setFriends(userFriends);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedChat) return;
    
    try {
      const chatMessages = await dataService.getMessages(selectedChat.id);
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const message = await dataService.sendMessage(selectedChat.id, newMessage);
      setMessages([...messages, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const startVoiceCall = async (receiverId: string) => {
    try {
      const call = await VoiceService.initiateCall(receiverId);
      setActiveCall(call);
    } catch (error) {
      console.error('Error starting voice call:', error);
    }
  };

  const endCall = async () => {
    if (activeCall) {
      try {
        await VoiceService.endCall(activeCall.id);
        setActiveCall(null);
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      try {
        await VoiceService.stopRecording();
        setIsRecording(false);
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    } else {
      try {
        await VoiceService.startRecording();
        setIsRecording(true);
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    }
  };

  const createNewChat = async (participantId: string) => {
    try {
      const newChat = await dataService.createChat({
        participants: [participantId],
        isGroup: false
      });
      setChats([newChat, ...chats]);
      setSelectedChat(newChat);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const mapProfileToUser = (profile: any): User => {
    return {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      email: profile.email,
      photoURL: profile.avatar || '',
      avatar: profile.avatar || '',
      bio: (profile as any).bio || undefined,
      location: (profile as any).location || undefined,
      website: (profile as any).website || undefined,
      birthday: (profile as any).birthday ? new Date((profile as any).birthday) : undefined,
      gender: (profile as any).gender || undefined,
      pronouns: (profile as any).pronouns || undefined,
      coverImage: (profile as any).cover_image || undefined,
      isPrivate: (profile as any).is_private || false,
      followerCount: (profile as any).follower_count || 0,
      followingCount: (profile as any).following_count || 0,
      profileViews: (profile as any).profile_views || 0,
      createdAt: new Date(profile.created_at)
    };
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Friends List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {friends.map((friend) => {
            const friendUser = friend.requester.id === user?.id ? friend.addressee : friend.requester;
            return (
              <div key={friend.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={friendUser.avatar} />
                    <AvatarFallback>{friendUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{friendUser.name}</p>
                    <p className="text-sm text-muted-foreground">@{friendUser.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createNewChat(friendUser.id)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startVoiceCall(friendUser.id)}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Chat List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedChat?.id === chat.id ? 'bg-primary/10' : 'hover:bg-accent'
              }`}
              onClick={() => setSelectedChat(chat)}
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={chat.participants[0]?.avatar} />
                  <AvatarFallback>{chat.participants[0]?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {chat.name || chat.participants.map(p => p.name).join(', ')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last active: {chat.lastActivity.toLocaleDateString()}
                  </p>
                </div>
                {chat.isGroup && <Badge variant="secondary">Group</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Chat Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {selectedChat?.name || selectedChat?.participants.map(p => p.name).join(', ') || 'Select a chat'}
            </span>
            {selectedChat && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedChat.participants[0] && startVoiceCall(selectedChat.participants[0].id)}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={isRecording ? "destructive" : "outline"}
                  onClick={toggleRecording}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedChat ? (
            <div className="space-y-4">
              {/* Active Call Banner */}
              {activeCall && (
                <div className="bg-green-100 p-4 rounded-lg flex items-center justify-between">
                  <span className="text-green-800">Voice call active</span>
                  <Button size="sm" variant="destructive" onClick={endCall}>
                    <PhoneOff className="h-4 w-4 mr-2" />
                    End Call
                  </Button>
                </div>
              )}

              {/* Messages */}
              <div className="h-96 overflow-y-auto space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.userId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs p-3 rounded-lg ${
                        message.userId === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button onClick={sendMessage}>Send</Button>
              </div>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center text-muted-foreground">
              Select a chat to start messaging
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Chat;
