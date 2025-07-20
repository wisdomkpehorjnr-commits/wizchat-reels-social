import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { mockChats, mockMessages, mockCurrentUser } from '@/lib/mockData';
import { Message } from '@/types';
import { Send, ArrowLeft, Users } from 'lucide-react';

const ChatRoom = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>(mockMessages.filter(m => m.chatId === chatId));
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const chat = mockChats.find(c => c.id === chatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !chat) return;

    const message: Message = {
      id: Date.now().toString(),
      chatId: chat.id,
      userId: mockCurrentUser.id,
      user: mockCurrentUser,
      content: newMessage,
      type: 'text',
      timestamp: new Date(),
      seen: false,
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  if (!chat) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chat not found</p>
          <Link to="/chat" className="text-primary hover:underline">
            Back to chats
          </Link>
        </div>
      </Layout>
    );
  }

  const chatTitle = chat.isGroup 
    ? chat.name 
    : chat.participants.find(p => p.id !== mockCurrentUser.id)?.name;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
        {/* Chat Header */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <Link to="/chat">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              
              <div className="flex items-center space-x-3 flex-1">
                {chat.isGroup ? (
                  <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary-foreground" />
                  </div>
                ) : (
                  <Avatar>
                    <AvatarImage src={chat.participants.find(p => p.id !== mockCurrentUser.id)?.photoURL} />
                    <AvatarFallback>
                      {chat.participants.find(p => p.id !== mockCurrentUser.id)?.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div>
                  <h2 className="font-semibold">{chatTitle}</h2>
                  {chat.isGroup && (
                    <p className="text-sm text-muted-foreground">
                      {chat.participants.length} participants
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="flex-1 flex flex-col">
          <CardContent className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwn = message.userId === mockCurrentUser.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {!isOwn && (
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={message.user.photoURL} />
                          <AvatarFallback className="text-xs">
                            {message.user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {chat.isGroup && !isOwn && (
                          <p className="text-xs font-medium mb-1">
                            {message.user.name}
                          </p>
                        )}
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default ChatRoom;