
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Phone, Video, MoreVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { voiceService } from '@/services/voiceService';
import { useToast } from '@/components/ui/use-toast';
import { Chat, Message, User } from '@/types';
import { supabase } from '@/integrations/supabase/client';

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<User[]>([]);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [activeCall, setActiveCall] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadChats();
      loadFriends();
      setupRealtimeSubscriptions();
    }
  }, [user]);

  const loadChats = async () => {
    try {
      const userChats = await dataService.getUserChats();
      setChats(userChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const userFriends = await dataService.getUserFriends();
      setFriends(userFriends.map(f => f.requester.id === user?.id ? f.addressee : f.requester));
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Listen for new messages
    const messagesChannel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        const newMessage = payload.new as any;
        if (selectedChat && newMessage.chat_id === selectedChat.id) {
          loadMessages(selectedChat.id);
        }
      })
      .subscribe();

    // Listen for voice calls
    const callsChannel = supabase
      .channel('voice_calls')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'voice_calls'
      }, (payload) => {
        const call = payload.new as any;
        if (call.receiver_id === user?.id && call.status === 'calling') {
          setActiveCall(call);
          toast({
            title: "Incoming Call",
            description: `Voice call from ${call.caller_id}`,
          });
        }
      })
      .subscribe();

    return () => {
      messagesChannel.unsubscribe();
      callsChannel.unsubscribe();
    };
  };

  const loadMessages = async (chatId: string) => {
    try {
      const chatMessages = await dataService.getMessages(chatId);
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    loadMessages(chat.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user) return;

    try {
      await dataService.sendMessage({
        chatId: selectedChat.id,
        content: newMessage,
        type: 'text'
      });
      setNewMessage('');
      loadMessages(selectedChat.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleStartChat = async (friendId: string) => {
    try {
      const chat = await dataService.createChat({
        participants: [friendId],
        isGroup: false
      });
      setChats(prev => [chat, ...prev]);
      setSelectedChat(chat);
      setShowNewChatDialog(false);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const handleVoiceCall = async () => {
    if (!selectedChat || !user) return;

    const otherParticipant = selectedChat.participants.find(p => p.id !== user.id);
    if (!otherParticipant) return;

    try {
      await voiceService.initiateCall(otherParticipant.id);
      toast({
        title: "Calling...",
        description: `Calling ${otherParticipant.name}`,
      });
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Error",
        description: "Failed to start call",
        variant: "destructive",
      });
    }
  };

  const handleAnswerCall = async () => {
    if (!activeCall) return;

    try {
      await voiceService.answerCall(activeCall.id);
      toast({
        title: "Call Connected",
        description: "Voice call connected",
      });
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  const handleRejectCall = async () => {
    if (!activeCall) return;

    try {
      await voiceService.endCall(activeCall.id);
      setActiveCall(null);
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  };

  if (loading) {
    return <div className="p-6">Loading chats...</div>;
  }

  return (
    <div className="h-screen flex">
      {/* Chat List */}
      <div className="w-1/3 border-r border-white/10">
        <div className="p-4 border-b border-white/10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Messages</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowNewChatDialog(true)}
              className="text-white"
            >
              New Chat
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto">
          {chats.map((chat) => {
            const otherParticipant = chat.participants.find(p => p.id !== user?.id);
            return (
              <div
                key={chat.id}
                onClick={() => handleChatSelect(chat)}
                className={`p-4 cursor-pointer hover:bg-white/5 border-b border-white/5 ${
                  selectedChat?.id === chat.id ? 'bg-white/10' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={otherParticipant?.avatar} />
                    <AvatarFallback>{otherParticipant?.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{otherParticipant?.name}</p>
                    <p className="text-sm text-white/60">@{otherParticipant?.username}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* New Chat Dialog */}
        {showNewChatDialog && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-96 backdrop-blur-md bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Start New Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      onClick={() => handleStartChat(friend.id)}
                      className="flex items-center space-x-3 p-2 cursor-pointer hover:bg-white/5 rounded"
                    >
                      <Avatar>
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-white">{friend.name}</p>
                        <p className="text-sm text-white/60">@{friend.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewChatDialog(false)}
                  className="mt-4 w-full"
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={selectedChat.participants.find(p => p.id !== user?.id)?.avatar} />
                  <AvatarFallback>
                    {selectedChat.participants.find(p => p.id !== user?.id)?.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-white">
                    {selectedChat.participants.find(p => p.id !== user?.id)?.name}
                  </p>
                  <p className="text-sm text-white/60">Online</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" onClick={handleVoiceCall}>
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.userId === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      message.userId === user?.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                />
                <Button onClick={handleSendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/60">Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {/* Incoming Call Modal */}
      {activeCall && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-96 backdrop-blur-md bg-white/10 border-white/20">
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-bold text-white mb-4">Incoming Call</h3>
              <Avatar className="w-20 h-20 mx-auto mb-4">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <p className="text-white mb-6">Voice call from user</p>
              <div className="flex space-x-4">
                <Button 
                  variant="destructive" 
                  onClick={handleRejectCall}
                  className="flex-1"
                >
                  Decline
                </Button>
                <Button 
                  onClick={handleAnswerCall}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Answer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
