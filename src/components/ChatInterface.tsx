
import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Users, Settings, Search, Plus, Crown, Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Chat, Message, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { MediaService } from '@/services/mediaService';
import VoiceRecorder from './VoiceRecorder';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface ChatInterfaceProps {
  chat: Chat;
  onClose: () => void;
}

interface GroupFormData {
  name: string;
  description: string;
  isPublic: boolean;
}

const ChatInterface = ({ chat, onClose }: ChatInterfaceProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [groupForm, setGroupForm] = useState<GroupFormData>({
    name: chat.name || '',
    description: chat.description || '',
    isPublic: chat.isPublic || false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOnline = useOnlineStatus(chat.isGroup ? '' : chat.participants[0]?.id || '');


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!chat.id) return;

    loadMessages();

    const channel = supabase
      .channel(`messages:chat_${chat.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` },
        async (payload) => {
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

          if (messageData) {
            const newMsg: Message = {
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
            setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` },
        (payload) => {
          const updated: any = payload.new;
          setMessages(prev =>
            prev.map(m =>
              m.id === updated.id
                ? {
                    ...m,
                    content: updated.content ?? m.content,
                    mediaUrl: updated.media_url ?? m.mediaUrl,
                    type: updated.type ?? m.type,
                    duration: updated.duration ?? m.duration,
                    seen: updated.seen ?? m.seen,
                  }
                : m
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` },
        (payload) => {
          const removed: any = payload.old;
          setMessages(prev => prev.filter(m => m.id !== removed.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chat.id]);

  useEffect(() => {
    if (searchTerm) {
      searchUsers();
    }
  }, [searchTerm]);

  const loadMessages = async () => {
    try {
      const chatMessages = await dataService.getMessages(chat.id);
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    }
  };

  const searchUsers = async () => {
    try {
      const users = await dataService.searchUsers(searchTerm);
      setAvailableUsers(users);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      await dataService.sendMessage(chat.id, content);
      
      toast({
        title: "Success",
        description: "Message sent"
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(content);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const handleVoiceMessage = async (audioBlob: Blob, duration: number) => {
    try {
      const audioUrl = await MediaService.uploadChatMedia(new File([audioBlob], 'voice.webm', { type: 'audio/webm' }));
      
      // Create voice message in database
      await dataService.createVoiceMessage(chat.id, audioUrl, duration);
      setIsRecording(false);
      
      toast({
        title: "Success",
        description: "Voice message sent successfully"
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
    if (!file) return;

    try {
      const mediaUrl = await MediaService.uploadChatMedia(file);
      const mediaType = MediaService.getMediaType(file);
      
      // Only handle image and video for media messages
      if (mediaType === 'image' || mediaType === 'video') {
        await dataService.createMediaMessage(chat.id, mediaUrl, mediaType);
        
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

  const isAdmin = (userId: string) => {
    return chat.participants.some(p => p.id === userId && p.role === 'admin');
  };

  const getMessageTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: Message) => {
    const isOwn = message.userId === user?.id;
    
    return (
      <div
        key={message.id}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2 max-w-[70%]`}>
          {!isOwn && (
            <Avatar className="w-8 h-8">
              <AvatarImage src={message.user.avatar} />
              <AvatarFallback>{message.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          )}
          
          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
            {!isOwn && (
              <span className="text-xs text-muted-foreground mb-1">{message.user.name}</span>
            )}
            
            <div
              className={`rounded-lg px-3 py-2 ${
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
                  <audio controls className="max-w-48">
                    <source src={message.mediaUrl} type="audio/webm" />
                  </audio>
                  <span className="text-xs text-muted-foreground">
                    {message.duration}s
                  </span>
                </div>
              )}
              
              {(message.type === 'image' || message.type === 'video') && (
                <div className="max-w-48">
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
            </div>
            
            <span className="text-xs text-muted-foreground mt-1">
              {getMessageTime(message.timestamp)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={chat.isGroup ? chat.avatar : chat.participants[0]?.avatar} />
            <AvatarFallback>
              {chat.isGroup ? <Users className="w-5 h-5" /> : chat.participants[0]?.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h3 className="font-semibold text-foreground">
              {chat.isGroup ? chat.name : chat.participants[0]?.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {chat.isGroup ? `${chat.participants.length} members` : (isOnline ? 'Active now' : '')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {chat.isGroup && (
            <Dialog open={showGroupSettings} onOpenChange={setShowGroupSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Group Settings</DialogTitle>
                </DialogHeader>
                {/* Group settings content */}
              </DialogContent>
            </Dialog>
          )}
          
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t p-4 bg-card">
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
          
          <div className="flex-1 flex items-center space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 bg-background text-foreground"
            />
            
            <VoiceRecorder
              onVoiceMessage={handleVoiceMessage}
              onCancel={() => setIsRecording(false)}
            />
          </div>
          
          <Button onClick={sendMessage} size="sm" disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
