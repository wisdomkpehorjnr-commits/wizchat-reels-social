
import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Mic, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { MediaService } from '@/services/mediaService';
import VoiceRecorder from './VoiceRecorder';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ChatPopupProps {
  user: User;
  onClose: () => void;
}

const ChatPopup = ({ user: chatUser, onClose }: ChatPopupProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!chatId) return;

    // Set up real-time message updates
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        async (payload) => {
          // Fetch the complete message with user data
          const { data: messageData } = await supabase
            .from('messages')
            .select(`
              *,
              user:profiles!messages_user_id_fkey (
                id,
                name,
                username,
                avatar
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (messageData && messageData.user_id !== user?.id) {
            const newMessage: Message = {
              id: messageData.id,
              chatId: messageData.chat_id,
              userId: messageData.user_id,
              user: messageData.user as User,
              content: messageData.content,
              type: messageData.type as 'text' | 'voice' | 'image' | 'video',
              mediaUrl: messageData.media_url,
              duration: messageData.duration,
              seen: messageData.seen,
              timestamp: new Date(messageData.created_at)
            };
            setMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Check if chat already exists
      const chats = await dataService.getChats();
      const existingChat = chats.find(chat => 
        !chat.isGroup && chat.participants.some(p => p.id === chatUser.id)
      );
      
      let currentChatId: string;
      
      if (existingChat) {
        currentChatId = existingChat.id;
      } else {
        // Create new chat
        const newChat = await dataService.createChat([chatUser.id], false);
        currentChatId = newChat.id;
      }
      
      setChatId(currentChatId);
      
      // Load messages
      const chatMessages = await dataService.getMessages(currentChatId);
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast({
        title: "Error",
        description: "Failed to initialize chat",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !user) return;

    try {
      const message = await dataService.sendMessage(chatId, newMessage.trim());
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const handleVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!chatId) return;
    
    try {
      const audioUrl = await MediaService.uploadChatMedia(new File([audioBlob], 'voice.webm', { type: 'audio/webm' }));
      const voiceMessage = await dataService.createVoiceMessage(chatId, audioUrl, duration);
      setMessages(prev => [...prev, voiceMessage]);
      
      toast({
        title: "Success",
        description: "Voice message sent"
      });
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({
        title: "Error",
        description: "Failed to send voice message",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !chatId) return;

    try {
      const mediaUrl = await MediaService.uploadChatMedia(file);
      const mediaType = MediaService.getMediaType(file);
      
      if (mediaType === 'image' || mediaType === 'video') {
        const mediaMessage = await dataService.createMediaMessage(chatId, mediaUrl, mediaType);
        setMessages(prev => [...prev, mediaMessage]);
        
        toast({
          title: "Success",
          description: "File uploaded successfully"
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-background border-2 green-border rounded-lg p-6 w-96 h-96">
          <div className="flex items-center justify-center h-full">
            <p className="text-foreground">Loading chat...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background border-2 green-border rounded-lg w-96 h-[500px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={chatUser.avatar} />
              <AvatarFallback>{chatUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-foreground">{chatUser.name}</h3>
              <p className="text-sm text-muted-foreground">@{chatUser.username}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.userId === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end space-x-2 max-w-xs ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {!isOwn && (
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={message.user.avatar} />
                        <AvatarFallback className="text-xs">
                          {message.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`px-3 py-2 rounded-lg ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {message.type === 'text' && (
                        <p className="text-sm">{message.content}</p>
                      )}
                      
                      {message.type === 'voice' && (
                        <div className="flex items-center space-x-2">
                          <audio controls className="max-w-32">
                            <source src={message.mediaUrl} type="audio/webm" />
                          </audio>
                          <span className="text-xs">{message.duration}s</span>
                        </div>
                      )}
                      
                      {(message.type === 'image' || message.type === 'video') && (
                        <div className="max-w-32">
                          {message.type === 'image' ? (
                            <img 
                              src={message.mediaUrl} 
                              alt="Shared image" 
                              className="rounded w-full h-auto"
                            />
                          ) : (
                            <video 
                              src={message.mediaUrl} 
                              controls 
                              className="rounded w-full h-auto"
                            />
                          )}
                        </div>
                      )}
                      
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
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 bg-background text-foreground"
            />
            
            <VoiceRecorder
              onVoiceMessage={handleVoiceMessage}
              onCancel={() => {}}
            />
            
            <Button onClick={sendMessage} size="sm" disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPopup;
