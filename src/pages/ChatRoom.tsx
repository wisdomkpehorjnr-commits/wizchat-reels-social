import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { dataService } from '@/services/dataService';
import { Message, Chat } from '@/types';
import { Send, ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ChatRoom = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Load chat and messages once we have the chatId and authenticated user
    const loadChatData = async () => {
      if (!chatId || !user?.id) return;

      try {
        const chats = await dataService.getChats();
        const currentChat = chats.find(c => c.id === chatId);
        setChat(currentChat || null);

        if (currentChat) {
          const chatMessages = await dataService.getMessages(chatId);
          setMessages(chatMessages);
        }
      } catch (error) {
        console.error('Error loading chat data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChatData();
  }, [chatId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to realtime message inserts for this chat so incoming messages appear immediately
  useEffect(() => {
    if (!chatId) return;
    // Remove existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`messages:${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, async (payload) => {
        try {
          // Fetch the inserted message with user relation to ensure we have user info
          const newMsgId = payload.new.id;
          const { data: fetched } = await supabase
            .from('messages')
            .select(`
              *,
              user:profiles!messages_user_id_fkey (id, name, username, avatar)
            `)
            .eq('id', newMsgId)
            .maybeSingle();

          if (fetched) {
            const mapped: Message = {
              id: fetched.id,
              chatId: fetched.chat_id,
              userId: fetched.user_id,
              user: fetched.user || null,
              content: fetched.content,
              type: fetched.type as any,
              mediaUrl: fetched.media_url,
              duration: fetched.duration,
              seen: fetched.seen,
              timestamp: new Date(fetched.created_at),
              replyTo: null
            };

            setMessages(prev => {
              // avoid duplicates
              if (prev.some(m => m.id === mapped.id)) return prev;
              return [...prev, mapped];
            });
          }
        } catch (err) {
          console.warn('Realtime message fetch failed, refetching all messages', err);
          try { const all = await dataService.getMessages(chatId); setMessages(all); } catch(e){}
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [chatId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chat) return;
    setSending(true);

    try {
      const message = await dataService.sendMessage(chat.id, newMessage);
      // Append the returned message (if realtime hasn't already added it)
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading chat...</p>
          </div>
        </div>
      </Layout>
    );
  }

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

  const currentUserId = user?.id;
  const chatTitle = chat.isGroup 
    ? chat.name 
    : chat.participants?.[0]?.name || chat.name || 'Chat';

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
                    <AvatarImage src={chat.participants?.[0]?.photoURL} />
                    <AvatarFallback>
                      {chat.participants?.[0]?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div>
                  <h2 className="font-semibold">{chatTitle}</h2>
                  {chat.isGroup && (
                    <p className="text-sm text-muted-foreground">
                      {chat.participants?.length || 0} participants
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
                const isOwn = message.userId === currentUserId;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {!isOwn && (
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={message.user?.photoURL} />
                          <AvatarFallback className="text-xs">
                            {message.user?.name?.charAt(0) || '?'}
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
                            {message.user?.name}
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
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
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
